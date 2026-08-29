import SocketIOClient from './SocketIOClient';

interface ListenEvents {
  output: (data: string) => void;
  connect: () => void;
  disconnect: () => void;
  connect_error: (error: Error) => void;
}

interface EmitEvents {
  input: (data: string) => void;
  resize: (size: { cols: number; rows: number }) => void;
}

class WebTerminalClient extends SocketIOClient<ListenEvents, EmitEvents> {
  constructor() {
    super('/terminal');
    this.client.io.on('reconnect_failed', () => {
      console.error('reconnect_failed');
    });
  }

  onOutput(handler: (data: string) => void) {
    this.client.on('output', handler);
  }

  onConnect(handler: () => void) {
    this.client.on('connect', handler);
  }

  onDisconnect(handler: () => void) {
    this.client.on('disconnect', handler);
  }

  onConnectError(handler: (error: Error) => void) {
    this.client.on('connect_error', handler);
  }

  sendInput(data: string) {
    this.client.emit('input', data);
  }

  resize(cols: number, rows: number) {
    this.client.emit('resize', { cols, rows });
  }

  disconnect() {
    this.client.disconnect();
  }

  connect() {
    this.client.connect();
  }
}

export default WebTerminalClient;
