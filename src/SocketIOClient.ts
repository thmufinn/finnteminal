import { io, Socket } from 'socket.io-client';

class SocketIOClient<
  ListenEvents extends Record<string, any> = Record<string, any>,
  EmitEvents extends Record<string, any> = ListenEvents,
> {
  readonly client: Socket<ListenEvents, EmitEvents>;

  constructor(namespace = '') {
    const host = window.location.hostname || '127.0.0.1';

    this.client = io(`http://${host}:8081${namespace}`, {
      autoConnect: false,
      reconnectionAttempts: 5,
    });
  }
}

export default SocketIOClient;
