import { useEffect, useRef, useState } from 'react';
import Terminal from './terminal';
import WebTerminalClient from './WebTerminalClient';

const normalizeOutput = (data: string) => data.replace(/\r?\n/g, '\r\n');

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const clientRef = useRef<WebTerminalClient | null>(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    const terminal = new Terminal();
    const client = new WebTerminalClient();
    let fitTimer: number | undefined;
    terminalRef.current = terminal;
    clientRef.current = client;

    if (containerRef.current) {
      terminal.open(containerRef.current);
      terminal.fit();
      terminal.focus();
      fitTimer = window.setTimeout(() => {
        terminal.fit();
        terminal.focus();
        terminal.reportSize();
      }, 100);
    }

    terminal.onInput((data) => client.sendInput(data));
    terminal.onResize((cols, rows) => client.resize(cols, rows));

    terminal.write('\x1b[36mconnecting to local shell...\x1b[0m\r\n');
    client.onOutput((data) => terminal.write(normalizeOutput(data)));
    client.onConnect(() => {
      setStatus('connected');
      terminal.write('\r\n\x1b[32mconnected to local zsh\x1b[0m\r\n');
      terminal.focus();
      terminal.reportSize();
    });
    client.onConnectError((error) => {
      setStatus('connection failed');
      terminal.write(`\r\n\x1b[31mconnection failed: ${error.message}\x1b[0m\r\n`);
    });
    client.onDisconnect(() => {
      setStatus('disconnected');
      terminal.write('\r\n\x1b[31mdisconnected\x1b[0m\r\n');
    });
    client.connect();

      const handleResize = () => {
      terminal.fit();
      terminal.focus();
      terminal.reportSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (fitTimer !== undefined) {
        window.clearTimeout(fitTimer);
      }
      client.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      clientRef.current = null;
    };
  }, []);

  const focusTerminal = () => {
    terminalRef.current?.focus();
  };

  return (
    <main
      className="app-shell"
      tabIndex={0}
      onPointerDown={focusTerminal}
    >
      <header className="top-bar">
        <span className="title">finn teminal</span>
        <span className={`status status-${status.replace(' ', '-')}`}>{status}</span>
      </header>
      <div className="terminal-container" ref={containerRef} />
    </main>
  );
}

export default App;
