import express from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import pty from 'node-pty';

const PORT = Number(process.env.PORT ?? 8081);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const terminalToken = process.env.TERMINAL_TOKEN;
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...(process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? []),
    ],
  },
});

const shellCandidates = os.platform() === 'win32'
  ? ['powershell.exe']
  : [process.env.SHELL, '/bin/zsh', '/bin/bash', '/bin/sh'];
const shell = shellCandidates.find((candidate): candidate is string => Boolean(candidate && fs.existsSync(candidate))) ?? '/bin/sh';
const cwd = process.env.TERMINAL_CWD ? path.resolve(process.env.TERMINAL_CWD) : os.homedir();
const shellConfigDirectory = path.resolve(process.cwd(), 'server/shell');
const staticDirectory = isProduction
  ? path.resolve(__dirname, '../dist')
  : path.resolve(process.cwd(), 'dist');

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

const finnArt = `\x1b[38;2;255;255;255m
       .-"""-.
     .'  . .  '.
    /     v     \\
   |   \\_____/   |
   |             |
    \\           /
     '.       .'
       '-._.-'
       hello
\x1b[0m\r\n`;

io.of('/terminal').use((socket, next) => {
  if (!terminalToken && isProduction) {
    next(new Error('TERMINAL_TOKEN is required in production'));
    return;
  }

  if (terminalToken && socket.handshake.auth.token !== terminalToken) {
    next(new Error('invalid terminal token'));
    return;
  }

  next();
});

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
  let inputBuffer = '';

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
    inputBuffer += data;

    if (data === '\r' || data === '\n') {
      const command = inputBuffer.replace(/\r|\n/g, '').trim();
      inputBuffer = '';

      if (command === '@finn') {
        term.write('\u0015');
        socket.emit('output', `\r\n${finnArt}`);
        term.write('\r');
        return;
      }
    }

    if (data === '\u007f') {
      inputBuffer = inputBuffer.slice(0, -2);
    }

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

if (isProduction) {
  app.use(express.static(staticDirectory));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDirectory, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`terminal server listening on http://localhost:${PORT}`);
});
