import { POTIONS, role, type ActionKind, type EventKind, type NightEvent, type Potion, type RoleId } from './shared.ts';
import {
  declareNeutralWin,
  killPlayer,
  living,
  roleOf,
  spend,
  teamOf,
  usesLeft,
  type Ctx,
  type LogEntry,
  type Report,
  type State,
} from './state.ts';

// Resolves one night, in a fixed order:
//  0. Nomad swaps redirect actions aimed at the Nomad to the swap partner.
//  1. Entangled players (Tentáculo, last night) cannot act; Sentinel traps cancel the first action
//     against their target.
//  2. Chaveiro / Construtor / Sabotador blocks (simultaneous: a blocked blocker still blocks).
//  3. Protetor, Guarda and Protection potions.
//  4. Attacks: Impostor kill(s), Twin's extra kill, Xerife, Caçador, Ladrão, Death potions.
//  5. Poison and cures; poison deaths due tonight.
//  6. Investigations: Investigador, Rastreadores, Cartógrafo, Jornalista, Insight potions
//     (Curador in step 5).
//  7. Marks for later: Maestro, Trapaceiro, Cultista, Profeta, Tentáculo, Telepata, Nômade,
//     Parasita, Alquimista.
// Telepath links carry blocks and protection across; Persistent needs two attacks; a Phantom
// killed tonight dies at the end of the next night instead.

type ActRole = RoleId | 'kill' | 'potion';

interface Act {
  actor: string;
  role: ActRole;
  kind: ActionKind;
  targets: string[];
  guess?: RoleId;
  potion?: Potion;
  seq: number;
}

const BLOCKERS: ActRole[] = ['locksmith', 'builder', 'saboteur'];
const KIND_ORDER: ActionKind[] = ['attack', 'block', 'protect', 'investigate', 'mark'];
const POTION_KIND: Record<Potion, ActionKind> = { kill: 'attack', protect: 'protect', investigate: 'investigate' };

/** Alchemist's step tonight: brew a potion, hand it over, or nothing left to do. */
export function alchemyStep(s: State, id: string): 'brew' | 'give' | null {
  if (roleOf(s, id) !== 'alchemist' || usesLeft(s, id) === 0) return null;
  const a = s.perks.alchemy[id];
  if (!a) return 'brew';
  return !a.given && a.night < s.nightNo ? 'give' : null;
}

export function resolveNight(s: State, ctx: Ctx) {
  const n = s.nightNo;
  s.day = n;
  const input = s.night;
  const start = new Set(living(s));
  const reports: Record<string, Report[]> = {};
  const report = (id: string, r: Report) => (reports[id] ??= []).push(r);
  const events: NightEvent[] = [];
  const event = (kind: EventKind, victim: string) => {
    if (!events.some((e) => e.kind === kind && e.victim === victim)) events.push({ kind, victim, night: n });
  };
  const lethal = new Set<string>();
  const dying: string[] = [];
  const die = (id: string) => {
    if (!dying.includes(id)) dying.push(id);
  };
  const linkOf = (id: string) => s.perks.link[id];

  // ---- Collect what everyone did ------------------------------------------------
  const acts: Act[] = [];
  const brews: { actor: string; potion: Potion }[] = [];
  for (const id of s.seats) {
    const sub = input.ability[id];
    if (!start.has(id) || !sub) continue;
    const rid = roleOf(s, id);
    const step = alchemyStep(s, id);
    if (step === 'brew') {
      if (sub.potion && POTIONS.includes(sub.potion)) brews.push({ actor: id, potion: sub.potion });
      continue;
    }
    const spec = role(rid).ability;
    if (sub.targets.length === 0 || !spec || spec.when !== 'night' || usesLeft(s, id) === 0) continue; // decoy / skip
    if (rid === 'alchemist' && step !== 'give') continue;
    if (!sub.targets.every((t) => start.has(t))) continue;
    if (role(rid).limit !== undefined) spend(s, id);
    acts.push({ actor: id, role: rid, kind: spec.kind, targets: sub.targets, guess: sub.guess, seq: sub.seq });
  }
  for (const [id, use] of Object.entries(input.potion)) {
    const held = s.perks.potion[id];
    if (!start.has(id) || !held || held.from > n || !use.target || !start.has(use.target)) continue;
    delete s.perks.potion[id];
    acts.push({ actor: id, role: 'potion', kind: POTION_KIND[held.kind], potion: held.kind, targets: [use.target], seq: use.seq });
  }

  const preBlocked = new Set([...start].filter((id) => s.perks.entangled[id] === n));
  const imps = [...start].filter((id) => teamOf(s, id) === 'impostor');
  // Thieves who became Impostors kill on their own: they do not know the team.
  const solo = (id: string) => s.setup.killMode === 'each' || !!s.perks.stolen[id];
  const voters = imps.filter((id) => !solo(id) && input.kill[id] && !preBlocked.has(id));
  if (voters.length) {
    const counts: Record<string, number> = {};
    for (const v of voters) {
      const key = input.kill[v]!.target ?? '-';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const max = Math.max(0, ...Object.values(counts));
    const tied = Object.keys(counts)
      .filter((k) => counts[k] === max)
      .sort();
    const choice = tied.length === 1 ? tied[0]! : ctx.rng.pick(tied);
    if (choice !== '-' && start.has(choice)) {
      const who = voters.filter((v) => input.kill[v]!.target === choice);
      acts.push({
        actor: ctx.rng.pick(who),
        role: 'kill',
        kind: 'attack',
        targets: [choice],
        seq: Math.min(...who.map((v) => input.kill[v]!.seq)),
      });
    }
  }
  for (const id of imps) {
    const k = input.kill[id];
    if (solo(id) && k?.target && start.has(k.target)) acts.push({ actor: id, role: 'kill', kind: 'attack', targets: [k.target], seq: k.seq });
    const k2 = input.kill2[id];
    if (s.perks.extraKill[id] === n && k2?.target && start.has(k2.target)) {
      acts.push({ actor: id, role: 'kill', kind: 'attack', targets: [k2.target], seq: k2.seq });
    }
  }
  acts.sort((a, b) => a.seq - b.seq);

  // ---- 0. Nomad swaps -----------------------------------------------------------
  for (const [nomad, swap] of Object.entries(s.perks.swap)) {
    if (swap.night !== n || !start.has(nomad) || !start.has(swap.with)) continue;
    for (const a of acts) if (a.actor !== nomad) a.targets = a.targets.map((t) => (t === nomad ? swap.with : t));
  }

  // ---- 1. Traps -----------------------------------------------------------------
  const cancelled = new Set<Act>();
  const suspects: string[] = [];
  for (const trap of acts.filter((a) => a.role === 'sentinel' && !preBlocked.has(a.actor))) {
    const target = trap.targets[0]!;
    const hit = acts.find(
      (a) => a !== trap && a.actor !== trap.actor && !preBlocked.has(a.actor) && !cancelled.has(a) && a.targets.includes(target),
    );
    if (hit) {
      cancelled.add(hit);
      if (!suspects.includes(hit.actor)) suspects.push(hit.actor);
      event('trapped', target);
    }
    report(trap.actor, { k: 'trap', target, triggered: !!hit });
  }

  // ---- 2. Blocks ----------------------------------------------------------------
  const blocked = new Set(preBlocked);
  for (const a of acts) {
    if (!BLOCKERS.includes(a.role) || preBlocked.has(a.actor) || cancelled.has(a)) continue;
    const target = a.targets[0]!;
    for (const t of [target, linkOf(target)]) if (t) blocked.add(t);
    event('blocked', target);
    if (a.role === 'builder') report(target, { k: 'barricaded' });
  }
  const resolvedEarly = (a: Act) => BLOCKERS.includes(a.role) || a.role === 'sentinel';
  const eff = acts.filter((a) => !cancelled.has(a) && !(resolvedEarly(a) ? preBlocked : blocked).has(a.actor));
  const by = (r: ActRole) => eff.filter((a) => a.role === r);
  for (const b of brews) if (!blocked.has(b.actor)) s.perks.alchemy[b.actor] = { potion: b.potion, night: n, given: false };

  // ---- 3. Protection ------------------------------------------------------------
  const shielded = new Set<string>();
  for (const a of [...by('protector'), ...by('potion').filter((x) => x.potion === 'protect')]) {
    const t = a.targets[0]!;
    shielded.add(t);
    const l = linkOf(t);
    if (l) shielded.add(l);
  }
  const guarded = new Set(by('guard').map((a) => a.targets[0]!));

  // ---- 4. Attacks ---------------------------------------------------------------
  let hunterWin: string | null = null;
  const marks: Record<string, number> = {};
  const thiefKills: { thief: string; victim: string }[] = [];
  const isAttack = (a: Act) =>
    a.role === 'kill' || a.role === 'sheriff' || a.role === 'bountyHunter' || a.role === 'thief' || (a.role === 'potion' && a.potion === 'kill');
  for (const a of eff.filter(isAttack)) {
    const target = a.targets[0]!;
    lethal.add(target);
    event('attacked', target);
    if (a.role === 'bountyHunter') {
      const want = s.perks.bounty[a.actor];
      if (!want || roleOf(s, target) !== want) {
        die(a.actor); // a miss: the hunter dies instead of the victim
        continue;
      }
    }
    if (guarded.has(target)) {
      die(a.actor);
      event('guarded', target);
    } else if (shielded.has(target)) {
      event('protected', target);
    } else {
      marks[target] = (marks[target] ?? 0) + 1;
      if (roleOf(s, target) !== 'persistent' || marks[target]! >= 2) {
        die(target);
        if (a.role === 'bountyHunter') hunterWin = a.actor;
        if (a.role === 'thief') thiefKills.push({ thief: a.actor, victim: target });
      }
    }
    if (a.role === 'sheriff' && teamOf(s, target) !== 'impostor') die(a.actor);
  }

  // ---- 5. Poison and cures ------------------------------------------------------
  for (const a of by('poisoner')) {
    const target = a.targets[0]!;
    lethal.add(target);
    event('poisoned', target);
    if (s.perks.poisoned[target] === undefined) s.perks.poisoned[target] = n + 1;
  }
  for (const a of by('curator')) {
    const target = a.targets[0]!;
    if (s.perks.poisoned[target] !== undefined) {
      delete s.perks.poisoned[target];
      report(a.actor, { k: 'curatorCured', target });
      report(target, { k: 'cured' });
      event('cured', target);
    } else {
      report(a.actor, { k: 'curator', target, team: teamOf(s, target) });
    }
  }
  for (const [target, at] of Object.entries(s.perks.poisoned)) {
    if (at > n) continue;
    delete s.perks.poisoned[target];
    if (!start.has(target)) continue;
    if (shielded.has(target)) event('protected', target);
    else die(target);
  }

  // ---- 6. Investigations --------------------------------------------------------
  const kindOf = (id: string): ActionKind => {
    const kinds = eff.filter((a) => a.actor === id).map((a) => a.kind);
    return KIND_ORDER.find((k) => kinds.includes(k)) ?? 'nothing';
  };
  let journalistWin: string | null = null;
  for (const a of eff) {
    const [t0, t1] = a.targets as [string, string | undefined];
    if (a.role === 'investigator' && t1) {
      report(a.actor, { k: 'investigator', a: t0, b: t1, same: teamOf(s, t0) === teamOf(s, t1) });
      event('investigated', t0);
      event('investigated', t1);
    } else if (a.role === 'tracker' || a.role === 'pacifistTracker') {
      report(a.actor, { k: 'tracker', target: t0, kind: kindOf(t0) });
      event('investigated', t0);
    } else if (a.role === 'cartographer') {
      const visitors = new Set(
        acts.filter((x) => x.actor !== a.actor && x.targets.includes(t0) && (eff.includes(x) || cancelled.has(x))).map((x) => x.actor),
      );
      report(a.actor, { k: 'cartographer', target: t0, count: visitors.size });
      event('investigated', t0);
    } else if (a.role === 'curator') {
      event('investigated', t0);
    } else if (a.role === 'potion' && a.potion === 'investigate') {
      report(a.actor, { k: 'potionInsight', target: t0, team: teamOf(s, t0) });
      event('investigated', t0);
    } else if (a.role === 'journalist' && a.guess) {
      const hits = (s.perks.journalist[a.actor] ??= []);
      const correct = (s.perks.stolen[t0] ? 'thief' : roleOf(s, t0)) === a.guess;
      if (correct && !hits.includes(a.guess)) hits.push(a.guess);
      report(a.actor, { k: 'journalist', target: t0, guess: a.guess, correct, hits: hits.length });
      event('investigated', t0);
      if (hits.length >= 3) journalistWin ??= a.actor;
    }
  }

  // ---- 7. Marks for later -------------------------------------------------------
  for (const a of eff) {
    const [t0, t1] = a.targets as [string, string | undefined];
    if (a.role === 'trickster') {
      if (!s.perks.trickster.includes(t0)) s.perks.trickster.push(t0);
      event('manipulated', t0);
    } else if (a.role === 'maestro' && t1) {
      s.perks.maestro = { controlled: t0, target: t1 };
      event('manipulated', t0);
    } else if (a.role === 'cultist') {
      s.perks.cultist[a.actor] = [...a.targets];
    } else if (a.role === 'prophet') {
      s.perks.prophecy[a.actor] = { target: t0, night: n };
    } else if (a.role === 'tentacle') {
      s.perks.entangled[t0] = n + 1;
      report(t0, { k: 'entangled' });
      event('entangled', t0);
    } else if (a.role === 'telepath' && !s.perks.link[a.actor] && !s.perks.link[t0]) {
      s.perks.link[a.actor] = t0;
      s.perks.link[t0] = a.actor;
      report(a.actor, { k: 'linked', other: t0 });
      report(t0, { k: 'linked', other: a.actor });
    } else if (a.role === 'nomad') {
      s.perks.swap[a.actor] = { with: t0, night: n + 1 };
    } else if (a.role === 'parasite') {
      s.perks.host[a.actor] = t0;
    } else if (a.role === 'alchemist') {
      const brew = s.perks.alchemy[a.actor];
      if (brew) {
        brew.given = true;
        s.perks.potion[t0] = { kind: brew.potion, from: n + 1 };
        report(t0, { k: 'potion', kind: brew.potion });
      }
    }
  }

  s.log = acts.map(
    (a): LogEntry => ({ actor: a.actor, role: a.role, targets: a.targets, guess: a.guess, effective: eff.includes(a) }),
  );

  // ---- Deaths and wins ----------------------------------------------------------
  // A Phantom killed tonight lingers until the end of the next night.
  for (const id of [...dying]) {
    if (roleOf(s, id) !== 'phantom' || s.perks.phantom[id] !== undefined) continue;
    s.perks.phantom[id] = n + 1;
    dying.splice(dying.indexOf(id), 1);
  }
  for (const [id, at] of Object.entries(s.perks.phantom)) if (at <= n) die(id);
  for (const [id, at] of Object.entries(s.perks.doomed)) {
    if (at > n) continue;
    delete s.perks.doomed[id];
    die(id);
  }

  if (hunterWin) declareNeutralWin(s, hunterWin);
  if (journalistWin) declareNeutralWin(s, journalistWin);
  const before = new Set(living(s));
  for (const id of dying) killPlayer(s, id, 'night', ctx);
  // A prophecy made last night whose target is still alive: the Prophet dies.
  for (const [prophet, p] of Object.entries(s.perks.prophecy)) {
    if (!p || p.night !== n - 1) continue;
    s.perks.prophecy[prophet] = null;
    if (s.alive[prophet] && s.alive[p.target]) killPlayer(s, prophet, 'night', ctx);
  }
  // Thieves take what they killed.
  for (const { thief, victim } of thiefKills) {
    if (!s.alive[thief] || s.alive[victim] || s.perks.stolen[thief] || roleOf(s, thief) !== 'thief') continue;
    steal(s, thief, victim);
    report(thief, { k: 'stole', role: roleOf(s, thief) });
  }

  for (const [id, at] of Object.entries(s.perks.entangled)) if (at <= n) delete s.perks.entangled[id];
  for (const [id, at] of Object.entries(s.perks.extraKill)) if (at <= n) delete s.perks.extraKill[id];
  for (const [id, sw] of Object.entries(s.perks.swap)) if (sw.night <= n) delete s.perks.swap[id];
  for (const [id, at] of Object.entries(s.perks.phantom)) if (at <= n) delete s.perks.phantom[id];

  const survivors = living(s);
  const pickEvents = (k: number) => ctx.rng.shuffle(events).slice(0, k);
  s.reports = reports;
  s.events = events;
  s.dawn = {
    deaths: [...before].filter((id) => !s.alive[id]),
    suspect: suspects[0] ?? null,
    poisoned: Object.keys(s.perks.poisoned).some((id) => s.alive[id]),
    psych: Object.fromEntries(survivors.filter((id) => roleOf(s, id) === 'psychologist').map((id) => [id, lethal.has(id)])),
    spokes: Object.fromEntries(survivors.filter((id) => roleOf(s, id) === 'spokesperson').map((id) => [id, pickEvents(3)])),
    spokesDone: {},
    hist: Object.fromEntries(survivors.filter((id) => roleOf(s, id) === 'historian').map((id) => [id, pickEvents(2)])),
    histDone: {},
  };
}

/** The Thief becomes the victim: class, side, uses and the class's own bookkeeping. */
function steal(s: State, thief: string, victim: string) {
  const rid = roleOf(s, victim);
  s.roles[thief] = rid;
  s.perks.stolen[thief] = true;
  s.uses[thief] = s.uses[victim] ?? 0;
  const p = s.perks;
  const move = <V>(rec: Record<string, V>) => {
    if (victim in rec) rec[thief] = rec[victim]!;
  };
  move(p.bounty);
  move(p.journalist);
  move(p.historian);
  move(p.host);
  move(p.leeched);
  move(p.alchemy);
  const partner = p.twinOf[victim];
  if (partner && partner !== thief) {
    p.twinOf[thief] = partner;
    p.twinOf[partner] = thief;
  }
}
