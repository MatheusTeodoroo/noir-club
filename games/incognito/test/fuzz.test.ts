import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createTestRoom } from '@mp/engine/testing';
import type { UIKit } from '@mp/game-sdk';
import game, { type PlayerView, type PublicView, type State } from '../src/logic.ts';
import ui from '../src/ui.tsx';
import { PICKABLE, POTIONS, ROLE_IDS, suggested } from '../src/shared.ts';

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

function render(room: ReturnType<typeof createTestRoom<State>>) {
  const platform = room.publicPlatform();
  const t = (x: { 'pt-BR': string }) => x['pt-BR'];
  renderToString(createElement(ui.Display, { view: room.publicView(), kit, t, lang: 'pt-BR', platform }));
  for (const id of room.ids) {
    const frame = room.playerFrame(id);
    if (!frame) continue; // offline phones get no frame
    renderToString(
      createElement(ui.Player, { view: room.playerView(id), kit, t, lang: 'pt-BR', platform, you: frame.platform as never, send: () => {} }),
    );
  }
}

function randomActions(r: () => number, view: PlayerView, id: string, ids: string[]) {
  const pick = <T,>(xs: readonly T[]): T | undefined => xs[Math.floor(r() * xs.length)];
  const out: unknown[] = [];
  const n = view.night;
  if (n) {
    if (n.entangled) out.push({ type: 'ack' });
    if (n.kill) out.push({ type: 'kill', target: r() < 0.2 ? null : (pick(n.kill.candidates) ?? null) });
    if (n.kill2) out.push({ type: 'kill2', target: pick(n.kill2.candidates) ?? null });
    if (n.potion) out.push({ type: 'potion', target: r() < 0.5 ? null : (pick(n.potion.candidates) ?? null) });
    if (n.brew) out.push({ type: 'ability', targets: [], potion: pick(POTIONS) });
    else if (n.ability) {
      const targets: string[] = [];
      for (const slot of n.ability.slots) {
        const t = pick(slot.filter((x) => !targets.includes(x)));
        if (t) targets.push(t);
      }
      out.push({ type: 'ability', targets: r() < 0.15 ? [] : targets, guess: pick(ROLE_IDS) });
    } else if (n.decoy) out.push({ type: 'ability', targets: [pick(n.decoy)].filter(Boolean) });
  }
  if (view.spokes && !view.spokes.done) out.push({ type: 'spokes', index: r() < 0.3 ? null : 0, signed: r() < 0.5 });
  if (view.hist?.offer) out.push({ type: 'histStore', index: 0, replace: 0 });
  if (view.hist?.canReveal) out.push({ type: 'histReveal', index: 0 });
  if (view.autopsy?.canUse && view.autopsy.candidates.length) out.push({ type: 'autopsy', target: pick(view.autopsy.candidates) });
  if (view.skip && r() < 0.5) out.push({ type: 'skip' });
  if (view.vote) {
    out.push({ type: 'vote', target: r() < 0.25 ? 'skip' : (pick(view.vote.candidates) ?? 'skip') });
    if (view.vote.special && r() < 0.3) {
      const target = pick(view.vote.candidates);
      out.push({ type: view.vote.special === 'sniper' ? 'snipe' : view.vote.special === 'exorcist' ? 'exorcise' : 'shift', target, guess: pick(ROLE_IDS) });
    }
  }
  if (view.appeal && r() < 0.5) out.push({ type: 'appeal' });
  if (view.phase === 'reveal') out.push({ type: 'ack' });
  // Junk now and then: the engine must shrug it off.
  if (r() < 0.05) out.push({ type: pick(['kill', 'vote', 'ability', 'potion', 'shift']), target: pick(ids), targets: [id, id] });
  return out;
}

describe('Incógnito — fuzz', () => {
  it('random matches never throw and always end', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const r = rng(seed);
      const players = 5 + Math.floor(r() * 12);
      const room = createTestRoom<State>(game, { players, seed });
      const base = suggested(players);
      const picks = Object.fromEntries(PICKABLE.filter(() => r() < 0.25).map((id) => [id, 'force']));
      room.act('p1', {
        type: 'setup',
        patch: {
          ...base,
          neutrals: Math.min(base.neutrals + Math.floor(r() * 2), 3),
          killMode: r() < 0.5 ? 'team' : 'each',
          abilityMode: r() < 0.5 ? 'or' : 'and',
          spectator: r() < 0.5 ? 'blind' : 'omniscient',
          revealDead: r() < 0.5,
        },
      });
      room.act('p1', { type: 'setup', patch: { picks } });
      room.act('p1', { type: 'start' });
      if ((room.publicView() as PublicView).phase === 'setup') {
        room.act('p1', { type: 'setup', patch: { picks: Object.fromEntries(PICKABLE.map((id) => [id, 'auto'])) } });
        room.act('p1', { type: 'start' });
      }
      expect((room.publicView() as PublicView).phase, `seed ${seed}`).toBe('reveal');

      let steps = 0;
      while ((room.publicView() as PublicView).phase !== 'end' && steps < 400) {
        steps++;
        for (const id of room.ids) {
          const view = room.playerView(id) as PlayerView | null;
          if (!view || r() < 0.1) continue;
          for (const a of randomActions(r, view, id, room.ids)) room.act(id, a);
        }
        if (r() < 0.04) {
          const victim = room.ids[Math.floor(r() * room.ids.length)]!;
          room.disconnect(victim);
          if (r() < 0.5) room.advance(20_001);
          else room.reconnect(victim);
        }
        render(room);
        const pv = room.publicView() as PublicView;
        if (pv.deadline !== null) room.advance(Math.max(1, pv.deadline - room.now));
      }
      expect((room.publicView() as PublicView).phase, `seed ${seed} after ${steps} steps`).toBe('end');
      render(room);
    }
  }, 300_000);
});
