import {
  normalizeRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type IceServer,
  type IceServersResponse,
} from '@mp/protocol';
import { RoomObject } from './room.ts';
import { PairingObject } from './pairing.ts';

export { RoomObject, PairingObject };

export interface Env {
  ROOMS: DurableObjectNamespace<RoomObject>;
  PAIRING: DurableObjectNamespace<PairingObject>;
  TURN_KEY_ID?: string;
  TURN_KEY_API_TOKEN?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
}

async function iceServers(env: Env): Promise<IceServersResponse> {
  const stun: IceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return { iceServers: stun };
  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ttl: 6 * 3600 }),
      },
    );
    if (!res.ok) return { iceServers: stun };
    const body = (await res.json()) as IceServersResponse;
    return { iceServers: [...stun, ...body.iceServers] };
  } catch {
    return { iceServers: stun };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/rooms' && request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as { id?: string; secret?: string } | null;
      if (!body?.id || !body.secret) return json({ error: 'missing identity' }, 400);
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = randomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.fetch('https://room/init', {
          method: 'POST',
          body: JSON.stringify({ code, adminId: body.id, adminSecret: body.secret }),
        });
        if (res.status === 201) return json({ code }, 201);
      }
      return json({ error: 'no free code' }, 503);
    }

    const roomInfo = path.match(/^\/api\/rooms\/([A-Za-z]+)$/);
    if (roomInfo && request.method === 'GET') {
      const code = normalizeRoomCode(roomInfo[1]!);
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch('https://room/info');
    }

    if (path === '/api/ice') return json(await iceServers(env));

    const roomWs = path.match(/^\/ws\/room\/([A-Za-z]+)$/);
    if (roomWs) {
      const code = normalizeRoomCode(roomWs[1]!);
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
    }

    const pairRole = path.match(/^\/api\/pair\/([A-Za-z]{4})$/);
    if (pairRole) {
      const code = pairRole[1]!.toUpperCase();
      return env.PAIRING.get(env.PAIRING.idFromName('global')).fetch(`https://pair/role?code=${code}`);
    }

    if (path === '/ws/pair') {
      return env.PAIRING.get(env.PAIRING.idFromName('global')).fetch(request);
    }

    return new Response('not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
