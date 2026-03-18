import { DurableObject } from 'cloudflare:workers';

interface ChatMessagePayload {
  type: 'message' | 'typing' | 'read';
  from?: { id: string; name: string; initials: string };
  content?: string;
  message_id?: string;
  timestamp?: string;
}

export class ChatRoomDO extends DurableObject {
  private sessions: Map<WebSocket, { userId: string; userName: string }> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const userId = url.searchParams.get('user_id') || 'anonymous';
      const userName = url.searchParams.get('user_name') || 'Anonym';

      this.ctx.acceptWebSocket(server);
      this.sessions.set(server, { userId, userName });

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/history') {
      const messages = await this.ctx.storage.get<ChatMessagePayload[]>('messages') || [];
      return new Response(JSON.stringify(messages.slice(-50)), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const session = this.sessions.get(ws);
    if (!session) return;

    try {
      const data = JSON.parse(message as string) as ChatMessagePayload;

      if (data.type === 'message' && data.content) {
        const payload: ChatMessagePayload = {
          type: 'message',
          from: {
            id: session.userId,
            name: session.userName,
            initials: session.userName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2),
          },
          content: data.content,
          timestamp: new Date().toISOString(),
        };

        // Persist message
        const messages = await this.ctx.storage.get<ChatMessagePayload[]>('messages') || [];
        messages.push(payload);
        if (messages.length > 500) messages.splice(0, messages.length - 500);
        await this.ctx.storage.put('messages', messages);

        // Broadcast to all connected clients
        this.broadcast(JSON.stringify(payload));
      } else if (data.type === 'typing') {
        const payload: ChatMessagePayload = {
          type: 'typing',
          from: {
            id: session.userId,
            name: session.userName,
            initials: session.userName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2),
          },
        };
        this.broadcast(JSON.stringify(payload), ws);
      } else if (data.type === 'read' && data.message_id) {
        const payload: ChatMessagePayload = {
          type: 'read',
          from: { id: session.userId, name: session.userName, initials: '' },
          message_id: data.message_id,
        };
        this.broadcast(JSON.stringify(payload), ws);
      }
    } catch {
      // Ignore malformed messages
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.sessions.delete(ws);
  }

  private broadcast(message: string, exclude?: WebSocket) {
    for (const [ws] of this.sessions) {
      if (ws !== exclude) {
        try {
          ws.send(message);
        } catch {
          this.sessions.delete(ws);
        }
      }
    }
  }
}
