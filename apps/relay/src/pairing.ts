import { DurableObject } from 'cloudflare:workers';
import { ROOM_CODE_ALPHABET, type PairToTv } from '@mp/protocol';

type TvRole = 'display' | 'dealer';

/**
 * TV pairing. A TV opens /ws/pair and gets a short code; the room's admin "claims" that code
 * from their phone, and this object pushes the room + grant down to the waiting TV.
 * A TV opened at /display or /dealer declares its role (?role=), which wins over the Host's pick.
 */
export class PairingObject extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/claim' && request.method === 'POST') {
      const { pairCode, room, role, grant } = (await request.json()) as {
        pairCode: string;
        room: string;
        role: 'display' | 'dealer';
        grant: string;
      };
      const sockets = this.ctx.getWebSockets(pairCode.toUpperCase());
      if (sockets.length === 0) return new Response('unknown code', { status: 404 });
      const msg: PairToTv = { t: 'paired', room, role: this.declaredRole(sockets) ?? role, grant };
      for (const ws of sockets) {
        ws.send(JSON.stringify(msg));
        ws.close(1000, 'paired');
      }
      return Response.json({ role: msg.role });
    }

    // The Host's phone asks which role a code's TV declared, to offer the matching button.
    if (url.pathname === '/role') {
      const sockets = this.ctx.getWebSockets((url.searchParams.get('code') ?? '').toUpperCase());
      if (sockets.length === 0) return Response.json({ found: false }, { status: 404 });
      return Response.json({ found: true, role: this.declaredRole(sockets) });
    }

    if (request.headers.get('upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });

    const pair = new WebSocketPair();
    // A reconnecting TV keeps its code when nobody else took it meanwhile.
    const wanted = (url.searchParams.get('code') ?? '').toUpperCase();
    const code = /^[A-Z]{4}$/.test(wanted) && this.ctx.getWebSockets(wanted).length === 0 ? wanted : this.freeCode();
    this.ctx.acceptWebSocket(pair[1], [code]);
    const role = url.searchParams.get('role');
    pair[1].serializeAttachment({ role: role === 'display' || role === 'dealer' ? role : null });
    const msg: PairToTv = { t: 'pairCode', code };
    pair[1].send(JSON.stringify(msg));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  private declaredRole(sockets: WebSocket[]): TvRole | null {
    for (const ws of sockets) {
      const role = (ws.deserializeAttachment() as { role?: TvRole | null } | null)?.role;
      if (role) return role;
    }
    return null;
  }

  private freeCode(): string {
    for (;;) {
      const bytes = crypto.getRandomValues(new Uint8Array(4));
      const code = Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
      if (this.ctx.getWebSockets(code).length === 0) return code;
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // TVs only send keepalives.
    if (message === 'ping') ws.send('pong');
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 ? 1000 : code);
    } catch {
      /* already closed */
    }
  }
}
