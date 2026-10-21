# Game logic (`manifest.json` + `src/logic.ts`)

Types: `.noir/sdk/game-sdk/index.ts`. Worked examples: the starter `src/logic.ts` and
`<skill>/examples/demo-secret/src/logic.ts`.

## manifest.json

| Field | Meaning |
|---|---|
| `id` | kebab-case, unique on the platform; equals the folder name |
| `version` | semver; bump on every change once released (bundles are cached per version) |
| `name`, `description` | `{ "pt-BR": "...", "en": "..." }`; the description is the TV lobby pitch |
| `minPlayers`, `maxPlayers` | enforced by the platform at start; the starter's `2` suits duels and races — bluffing and deduction games usually need at least 3, and check the TV board still fits at the maximum |
| `usesDealer` | enables the Dealer queue and `dealerView` |
| `estimatedMinutes` | shown in the lobby |
| `accent` | hex colour for the lobby card glow; stay within gold / crimson / deep jewel tones |
| `config` | Host settings: `number` (`min`, `max`, `step`, `default`), `boolean` (`default`), `select` (`options: [{ value, label }]`, `default`); each with a bilingual `label`. Values arrive clamped in `ctx.config` |

Import it in logic with `import manifestJson from '../manifest.json'` and pass it as `manifest`.

## The contract

```ts
export default defineGame<State, Config>({
  manifest,
  setup(ctx): State,                                   // required — initial state, start timers
  onAction(state, playerId, action, ctx),              // required — a phone sent `action`
  onTimer?(state, key, ctx),                           // a ctx.setTimer(key) fired
  onPlayerTimeout?(state, playerId, ctx),              // player gone past the 20 s grace period
  canVisitDealer?(state, playerId, ctx): boolean,      // Dealer games: may this player queue now?
  onDealerEnter?(state, playerId, ctx),                // verified at the Dealer
  onDealerLeave?(state, playerId, ctx),                // left the Dealer (or timed out)
  publicView(state, ctx): PublicView,                  // required — every TV
  playerView(state, playerId, ctx): PlayerView,        // required — one phone
  dealerView?(state, playerId, ctx): DealerView,       // Dealer screen while playerId is inside
  dealerIdleView?(state, ctx): DealerView,             // Dealer screen while nobody visits (platform.md)
});
```

Handlers receive a private **copy** of the state: mutate it and return nothing, or return a new
state. Export your `State`, view and `Action` types: the UI and tests import them.

## ctx

| Member | Use |
|---|---|
| `ctx.now` | room-clock time in ms (the only clock) |
| `ctx.rng` | seeded RNG: `next()`, `int(min, max)`, `pick(list)`, `shuffle(list)` (the only randomness) |
| `ctx.players` | participants: `{ id, name, avatar, connected, remote }`, fixed for the match |
| `ctx.config` | Host settings from the manifest, typed by your `Config` |
| `ctx.atDealer` | id of the player verified at the Dealer, or null |
| `ctx.setTimer(key, ms)` / `ctx.clearTimer(key)` | one timer per key; setting a key again replaces it |
| `ctx.timerDeadline(key)` | room-clock deadline of a running timer, for views |
| `ctx.timerTotal(key)` | the duration that timer was set with — send both in views (`deadline`, `total`) so countdown rings need no config in the UI |
| `ctx.emit('sound' \| 'fx', name, delayMs?)` | synced cue on every TV (see platform.md) |
| `ctx.end({ scores })` | finish the match; `scores` = points per player id this match |
| `ctx.releaseDealer()` | send the current visitor out of the Dealer |

## Rules for logic code

- **Pure and deterministic.** Time from `ctx.now`, randomness from `ctx.rng`, waiting via
  `ctx.setTimer`. No `Date.now`, `Math.random`, `setTimeout`, network, DOM or module-level
  mutable state — the engine may be replayed from a snapshot on another device.
- **State is plain JSON.** Records keyed by player id instead of `Map`/`Set`; timestamps as numbers.
- **Every action is untrusted.** Validate type, phase, sender and values; silently ignore anything
  invalid (return without changes). Players can send any payload at any time.
- **Validate on the phone too, for feedback** (disable the button, show the limit), because the
  engine answers invalid actions with silence. If a player must learn *why* something was refused,
  put the reason in their `playerView` — but first check it against the design's hidden-information
  table: a rejection can leak a secret (refusing a clue "because it is the secret word" tells the
  impostor the word). When in doubt, accept the action.
- **Never wait on one player.** Each phase has a timer; "everyone acted" checks count only
  `ctx.players.filter((p) => p.connected)`.
- **Phases are explicit.** A `phase` field in state, one function per transition (start timer,
  emit a cue, release the Dealer if needed), as in the starter game.
- **Scores are per match.** Keep a running total in state if rounds matter, and pass the match
  totals to `ctx.end`; the platform adds them to the room's scoreboard.

## Content in two languages

Rooms play in PT-BR or EN and the room language is a display setting (the engine accepts a change
at any moment), so the logic stays language-free and `ctx` deliberately has no language:

- Store content (words, questions, categories, prompts) as `I18nText` (`{ 'pt-BR': '…', en: '…' }`)
  and put those objects in views; the UI renders them with `t()`.
- Pick content with `ctx.rng` from the bilingual list, so both languages describe the same item.
- Compare player-typed text against **both** languages, normalised (lowercase, accents and spaces
  stripped): `normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()`.
- Keep large content banks in the logic module (they are secret: the UI bundle must not include them).

## Views — the only data that leaves the engine

- `publicView` goes to every TV in the house: **no secrets**, ever, until the phase that reveals
  them. Expose *that* someone acted (`picked: ['p1']`), not *what* they chose.
- `playerView(state, id)` contains only what player `id` may know: their own choices, their own
  secrets if the design lets the phone hold them, and public facts their controls need
  (candidates to vote for, deadline). Return the same shape for everyone.
- `dealerView(state, id)` contains only what the visiting player `id` should see at the Dealer.
- Views are recomputed after every event and diffed as JSON: keep them small, derived only from
  `state` and `ctx` (no `ctx.rng` in views), and include `deadline: ctx.timerDeadline(key)` and
  `total: ctx.timerTotal(key)` for countdowns.
- Spectators and devices outside the match receive the public view only.
