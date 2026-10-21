import { describe, expect, it } from 'vitest';
import type { ClientInfo, DealerFrame, PlayerFrame } from '@mp/protocol';
import { TIMING } from '@mp/protocol';
import demo, { type State as DemoState } from '../../../examples/demo-secret/src/logic.ts';
import { Engine, initialState } from '../src/engine.ts';

const GAME = { id: demo.manifest.id, version: demo.manifest.version };

function client(id: string, role: ClientInfo['role'], extra: Partial<ClientInfo> = {}): ClientInfo {
  return { id, role, name: id, avatar: '🎩', connected: true, isAdmin: false, ...extra };
}

function setup(logic: typeof demo = demo) {
  let now = 1_000_000;
  const e = new Engine(initialState(42));
  const clients = [
    client('host', 'player', { isAdmin: true }),
    client('ana', 'player'),
    client('bia', 'player'),
    client('tv1', 'display'),
    client('dealer', 'dealer'),
  ];
  e.presence(clients, now);
  e.action('host', { type: 'selectGame', game: GAME }, now);
  e.setLogic(logic, now);
  e.action('host', { type: 'start' }, now);
  for (const c of clients) e.action(c.id, { type: 'ready', game: GAME }, now);
  return {
    e,
    clients,
    get now() {
      return now;
    },
    advance(ms: number) {
      now += ms;
      e.tick(now);
    },
    frames: () => e.frames(now),
    act: (from: string, payload: unknown) => e.action(from, payload, now),
    presence: (cs: ClientInfo[]) => e.presence(cs, now),
  };
}

const dealerFrame = (t: ReturnType<typeof setup>) => t.frames().privates.get('dealer') as DealerFrame;
const playerFrame = (t: ReturnType<typeof setup>, id: string) => t.frames().privates.get(id) as PlayerFrame;

describe('platform lifecycle', () => {
  it('starts the match once everyone has loaded', () => {
    const t = setup();
    expect(t.e.state.phase).toBe('playing');
    expect(t.e.state.match?.participants).toEqual(['host', 'ana', 'bia']);
  });

  it('refuses to start outside the game player limits', () => {
    const e = new Engine(initialState(1));
    e.presence([client('host', 'player', { isAdmin: true })], 0);
    e.action('host', { type: 'selectGame', game: GAME }, 0);
    e.setLogic(demo, 0);
    e.action('host', { type: 'start' }, 0);
    expect(e.state.phase).toBe('lobby');
  });

  it('only the admin can configure and start', () => {
    const e = new Engine(initialState(1));
    e.presence([client('host', 'player', { isAdmin: true }), client('ana', 'player')], 0);
    e.action('ana', { type: 'selectGame', game: GAME }, 0);
    expect(e.state.game).toBeNull();
  });

  it('late joiners become spectators until the next match', () => {
    const t = setup();
    t.presence([...t.clients, client('caio', 'player')]);
    expect(t.e.state.players['caio']?.spectator).toBe(true);
    t.act('host', { type: 'backToLobby' });
    expect(t.e.state.players['caio']?.spectator).toBe(false);
  });
});

describe('secrets', () => {
  it('never puts secret numbers in the public frame or other phones', () => {
    const t = setup();
    const numbers = (t.e.state.match!.state as DemoState).numbers;
    const pub = JSON.stringify(t.frames().public);
    expect(pub).not.toContain('"numbers"');
    const anaView = JSON.stringify(playerFrame(t, 'ana').game);
    expect(anaView).not.toContain(String(numbers['bia']));
  });
});

describe('dealer queue', () => {
  it('calls the player, verifies the 3-digit code and shows the private view', () => {
    const t = setup();
    t.act('ana', { type: 'dealerRequest' });
    t.act('bia', { type: 'dealerRequest' });

    const d = dealerFrame(t);
    expect(d.current?.playerId).toBe('ana');
    expect(d.current?.code).toMatch(/^\d{3}$/);
    expect(d.queue.map((q) => q.id)).toEqual(['bia']);
    expect(d.game).toBeNull();
    expect(playerFrame(t, 'bia').platform.dealer).toEqual({ status: 'queued', position: 1 });

    t.act('ana', { type: 'dealerCode', code: d.current!.code === '000' ? '001' : '000' });
    expect(playerFrame(t, 'ana').platform.dealer).toEqual({ status: 'called', attemptsLeft: 2 });

    t.act('ana', { type: 'dealerCode', code: d.current!.code });
    const inside = dealerFrame(t);
    expect(inside.current?.verified).toBe(true);
    expect(inside.current?.code).toBeNull();
    const numbers = (t.e.state.match!.state as DemoState).numbers;
    expect(inside.game).toEqual({ number: numbers['ana'], round: 1 });

    t.act('ana', { type: 'dealerLeave' });
    expect(dealerFrame(t).current?.playerId).toBe('bia');
  });

  it('rotates the code after 3 wrong attempts', () => {
    const t = setup();
    t.act('ana', { type: 'dealerRequest' });
    const first = t.e.state.dealer.current!.code;
    const wrong = first === '999' ? '998' : '999';
    for (let i = 0; i < 3; i++) t.act('ana', { type: 'dealerCode', code: wrong });
    expect(t.e.state.dealer.current!.attemptsLeft).toBe(3);
    expect(t.e.state.dealer.current!.verified).toBe(false);
  });

  it('remote players skip the code and see the dealer view on their phone', () => {
    const t = setup();
    t.act('ana', { type: 'setRemote', remote: true });
    t.act('ana', { type: 'dealerRequest' });
    expect(dealerFrame(t).current?.code).toBeNull();
    expect(dealerFrame(t).game).toBeNull();
    expect(playerFrame(t, 'ana').dealerGame).toMatchObject({ round: 1 });
  });

  it('cannot visit twice in the same round', () => {
    const t = setup();
    t.act('ana', { type: 'dealerRequest' });
    t.act('ana', { type: 'dealerCode', code: t.e.state.dealer.current!.code });
    t.act('ana', { type: 'dealerLeave' });
    expect(playerFrame(t, 'ana').platform.canRequestDealer).toBe(false);
  });

  it("shows the game's idle view while nobody is called or inside", () => {
    const t = setup({ ...demo, dealerIdleView: (s: DemoState) => ({ idle: true, round: s.round }) });
    expect(dealerFrame(t).game).toEqual({ idle: true, round: 1 });
    t.act('ana', { type: 'dealerRequest' });
    expect(dealerFrame(t).game).toBeNull();
    t.act('ana', { type: 'dealerCode', code: t.e.state.dealer.current!.code });
    expect(dealerFrame(t).game).not.toHaveProperty('idle');
    t.act('ana', { type: 'dealerLeave' });
    expect(dealerFrame(t).game).toEqual({ idle: true, round: 1 });
  });
});

describe('disconnects', () => {
  it('pauses game timers while a player is away and resumes them after', () => {
    const t = setup();
    const deadline = t.e.state.timers.find((x) => x.scope === 'game')!.at;
    t.presence(t.clients.map((c) => (c.id === 'bia' ? { ...c, connected: false } : c)));
    expect(t.frames().public.platform.paused?.playerId).toBe('bia');
    t.advance(5_000);
    t.presence(t.clients);
    expect(t.frames().public.platform.paused).toBeNull();
    expect(t.e.state.timers.find((x) => x.scope === 'game')!.at).toBe(deadline + 5_000);
  });

  it('lets the game decide once the grace period ends', () => {
    const t = setup();
    t.presence(t.clients.map((c) => (c.id === 'bia' ? { ...c, connected: false } : c)));
    t.advance(TIMING.playerGraceMs + 1);
    expect((t.e.state.match!.state as DemoState).visited).toContain('bia');
    expect(t.e.state.pausedAt).toBeNull();
  });
});

describe('full demo match', () => {
  it('plays a round to the reveal and ends with scores', () => {
    const t = setup();
    t.act('host', { type: 'setConfig', config: {} });
    for (const id of ['host', 'ana', 'bia']) {
      t.act(id, { type: 'dealerRequest' });
      t.act(id, { type: 'dealerCode', code: t.e.state.dealer.current!.code });
      t.act(id, { type: 'dealerLeave' });
    }
    expect((t.e.state.match!.state as DemoState).phase).toBe('discuss');
    t.advance(60_000);
    expect((t.e.state.match!.state as DemoState).phase).toBe('vote');
    t.act('host', { type: 'game', action: { type: 'vote', target: 'ana' } });
    t.act('ana', { type: 'game', action: { type: 'vote', target: 'bia' } });
    t.act('bia', { type: 'game', action: { type: 'vote', target: 'ana' } });
    expect((t.e.state.match!.state as DemoState).phase).toBe('reveal');
    expect(t.frames().public.game).toMatchObject({ phase: 'reveal' });
    // Round 2 then end.
    t.advance(12_000);
    t.advance(180_000);
    t.advance(60_000);
    t.advance(30_000);
    t.advance(12_000);
    expect(t.e.state.phase).toBe('results');
    expect(t.e.state.results?.length).toBe(3);
  });
});
