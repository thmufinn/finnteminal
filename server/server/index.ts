import express from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Server } from 'socket.io';
import pty from 'node-pty';

const PORT = Number(process.env.PORT ?? 8081);
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  },
});

const fallbackShell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh';
const shell = process.env.SHELL && fs.existsSync(process.env.SHELL) ? process.env.SHELL : fallbackShell;
const cwd = process.env.TERMINAL_CWD ? path.resolve(process.env.TERMINAL_CWD) : os.homedir();
const shellConfigDirectory = path.resolve(process.cwd(), 'server/shell');

const hasAnsi = (value: string) => /\x1b\[[0-?]*[ -/]*[@-~]/.test(value);

const colorizePlainOutput = (value: string) => {
  if (hasAnsi(value)) {
    return value;
  }

  return value
    .split(/(\r?\n)/)
    .map((part) => {
      if (part === '\n' || part === '\r\n' || part.trim() === '') {
        return part;
      }

      const text = part.trim();

      if (/(error|failed|failure|denied|not found|not permitted|permission|eacces|enoent|exception|traceback|fatal)/i.test(text)) {
        return `\x1b[31m${part}\x1b[0m`;
      }

      if (/(warn|warning|deprecated|caution|notice)/i.test(text)) {
        return `\x1b[33m${part}\x1b[0m`;
      }

      if (/(success|succeeded|complete|completed|done|installed|added|updated|ok|passed)/i.test(text)) {
        return `\x1b[32m${part}\x1b[0m`;
      }

      if (/^(v?\d+(?:\.\d+){1,3}|\/[\w./ -]+|~(?:\/[\w./ -]+)?)$/.test(text)) {
        return `\x1b[36m${part}\x1b[0m`;
      }

      return part;
    })
    .join('');
};

io.of('/terminal').on('connection', (socket) => {
  const env = {
    ...process.env,
    CLICOLOR: '1',
    COLORTERM: 'truecolor',
    FORCE_COLOR: '1',
    LSCOLORS: 'ExGxBxDxCxEgEdxbxgxcxd',
    TERM: 'xterm-256color',
    ZDOTDIR: shellConfigDirectory,
  };

  let term: {
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    kill: () => void;
  };

  try {
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env,
    });

    ptyProcess.onData((data) => socket.emit('output', colorizePlainOutput(data)));
    ptyProcess.onExit(() => socket.disconnect(true));
    term = ptyProcess;
  } catch (error) {
    socket.emit('output', '\x1b[33mPTY unavailable; using shell pipe fallback.\x1b[0m\r\n');

    const child = spawn(shell, [], {
      cwd,
      env,
      stdio: 'pipe',
    });

    child.stdout.on('data', (data) => socket.emit('output', colorizePlainOutput(data.toString())));
    child.stderr.on('data', (data) => socket.emit('output', `\x1b[31m${data.toString()}\x1b[0m`));
    child.on('exit', () => socket.disconnect(true));

    term = {
      write: (data) => child.stdin.write(data),
      resize: () => undefined,
      kill: () => child.kill(),
    };
  }

  socket.on('input', (data) => {
    term.write(data);
  });

  socket.on('resize', ({ cols, rows }: { cols: number; rows: number }) => {
    if (Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0) {
      term.resize(Math.floor(cols), Math.floor(rows));
    }
  });

  socket.on('disconnect', () => {
    term.kill();
  });
});

httpServer.listen(PORT, () => {
  console.log(`terminal server listening on http://localhost:${PORT}`);
});
