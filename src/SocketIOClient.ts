import { io, Socket } from 'socket.io-client';

class SocketIOClient<
  ListenEvents extends Record<string, any> = Record<string, any>,
  EmitEvents extends Record<string, any> = ListenEvents,
> {
  readonly client: Socket<ListenEvents, EmitEvents>;

  constructor(namespace = '') {
    const host = window.location.hostname || '127.0.0.1';
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') ?? window.localStorage.getItem('terminalToken') ?? undefined;
    const serverUrl = import.meta.env.VITE_TERMINAL_SERVER_URL
      ?? (import.meta.env.PROD ? window.location.origin : `http://${host}:8081`);

    if (token) {
      window.localStorage.setItem('terminalToken', token);
    }

    this.client = io(`${serverUrl}${namespace}`, {
      auth: { token },
      autoConnect: false,
      reconnectionAttempts: 5,
    });
  }
}

export default SocketIOClient;
