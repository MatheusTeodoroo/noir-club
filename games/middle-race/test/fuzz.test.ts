import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createTestRoom } from '@mp/engine/testing';
import type { UIKit } from '@mp/game-sdk';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import ui from '../src/ui.tsx';

// Random matches: every phone sends random (mostly valid) actions taken from its own view, players
// drop out, and every view is rendered — nothing may throw, and every match must reach the end.

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const kit: UIKit = {
  Button: (p) => createElement('button', null, p.children),
  TextInput: () => null,
  Avatar: () => null,
  Countdown: () => null,
  Panel: (p) => createElement('div', null, p.children),
  RiveView: () => null,
  useRoomNow: () => 0,
  playSound: () => {},
};

type Room = ReturnType<typeof createTestRoom<State>>;

function render(room: Room) {
  const platform = room.publicPlatform();
  const t = (x: { 'pt-BR': string }) => x['pt-BR'];
  renderToString(createElement(ui.Display, { view: room.publicView(), kit, t, lang: 'pt-BR', platform }));
  for (const id of room.ids) {
    const frame = room.playerFrame(id);
    if (!frame) continue;
    renderToString(
      createElement(ui.Player, { view: room.playerView(id), kit, t, lang: 'pt-BR', platform, you: frame.platform as never, send: () => {} }),
    );
  }
}

function randomActions(r: () => number, view: PlayerView, ids: string[]) {
  const pick = <T,>(xs: readonly T[]): T | undefined => xs[Math.floor(r() * xs.length)];
  const out: unknown[] = [];
  if (['read', 'strategy', 'pause'].includes(view.phase) && r() < 0.6) out.push({ type: 'ready' });
  if (view.vote && !view.vote.myVote) out.push({ type: 'vote', target: pick(view.vote.cands) });
  if (view.pick?.myTurn && r() < 0.8) out.push({ type: 'pick', cls: pick(view.pick.free) });
  if (view.mustChooseFast) out.push({ type: 'fastBack', cards: r() < 0.1 ? [1, 1] : [1, 2, 3, 4].sort(() => r() - 0.5).slice(0, 2) });
  const race = view.race;
  if (race?.turn && r() < 0.8) {
    const o = race.turn;
    const leapReset = !!o.resetCards && r() < 0.5;
    const a: Record<string, unknown> = { type: 'turn', card: pick(leapReset ? o.resetCards! : o.cards) };
    if (leapReset) a.leapReset = true;
    if (o.canDouble && r() < 0.5) a.double = true;
    if (o.gravityTargets.length && r() < 0.5) a.gravity = pick(o.gravityTargets);
    if (o.silenceTargets.length && r() < 0.5) a.silence = pick(o.silenceTargets);
    out.push(a);
  }
  if (race?.prompt && r() < 0.8) out.push({ type: 'answer', value: pick(race.prompt.options) });
  if (view.isHost && r() < 0.02) out.push({ type: 'tvRules', page: r() < 0.5 ? null : Math.floor(r() * 16) });
  // Junk now and then: the engine must shrug it off.
  if (r() < 0.05) out.push({ type: pick(['turn', 'answer', 'vote', 'pick', 'ready']), card: 7, value: 99, target: pick(ids), cls: 0 });
  return out;
}

describe('Middle Race — fuzz', () => {
  it('random matches never throw and always end', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const r = rng(seed);
      const room = createTestRoom<State>(game, { players: 11, seed, config: { tutorial: seed % 2 === 0 } });
      for (let i = 0; i < 40 && (room.publicView() as PublicView).phase === 'intro'; i++) {
        room.act(room.ids[Math.floor(r() * 3)]!, { type: 'intro', dir: r() < 0.25 ? -1 : 1 });
        room.act('p1', { type: 'tvRules', page: r() < 0.5 ? null : Math.floor(r() * 20) });
        if (i % 4 === 0) render(room);
      }
      room.act('p1', { type: 'intro', dir: 'skip' });
      room.act('p1', {
        type: 'setup',
        patch: {
          columns: 16 + Math.floor(r() * 33),
          readOn: r() < 0.5,
          stratOn: r() < 0.5,
          pauseOn: r() < 0.5,
          pauseEvery: 1 + Math.floor(r() * 4),
        },
      });
      room.act('p1', { type: 'start' });

      let steps = 0;
      while (room.phase() !== 'results' && steps < 20_000) {
        steps++;
        for (const id of room.ids) {
          const view = room.playerView(id) as PlayerView | null;
          if (!view || r() < 0.1) continue;
          for (const a of randomActions(r, view, room.ids)) room.act(id, a);
        }
        if (r() < 0.01) {
          const victim = room.ids[Math.floor(r() * room.ids.length)]!;
          room.disconnect(victim);
          if (r() < 0.5) room.advance(20_001);
          else room.reconnect(victim);
        }
        if (steps % 5 === 0) render(room);
        const pv = room.publicView() as PublicView | null;
        if (pv?.deadline) room.advance(Math.max(1, pv.deadline - room.now));
        else room.advance(1_300);
      }
      expect(room.phase(), `seed ${seed} after ${steps} steps`).toBe('results');
    }
  }, 600_000);
});
