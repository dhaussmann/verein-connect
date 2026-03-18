import { DurableObject } from 'cloudflare:workers';

interface StatsPayload {
  total_registered: number;
  checked_in: number;
  absent: number;
  pending: number;
}

export class EventStatsDO extends DurableObject {
  private sessions: Set<WebSocket> = new Set();
  private stats: StatsPayload = { total_registered: 0, checked_in: 0, absent: 0, pending: 0 };

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);
      this.sessions.add(server);

      // Send current stats immediately
      server.send(JSON.stringify(this.stats));

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/update' && request.method === 'POST') {
      const body = await request.json() as StatsPayload;
      this.stats = body;

      // Broadcast to all connected clients
      const message = JSON.stringify(this.stats);
      for (const ws of this.sessions) {
        try {
          ws.send(message);
        } catch {
          this.sessions.delete(ws);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/stats') {
      return new Response(JSON.stringify(this.stats), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.sessions.delete(ws);
  }
}
