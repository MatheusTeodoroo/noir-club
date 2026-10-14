# Tests (`test/logic.test.ts`)

`createTestRoom` from `@mp/engine/testing` runs your game inside the real platform engine — lobby,
start, Dealer queue and codes, timers, pauses, views — with a fake clock. Worked examples: the
starter test and `<skill>/examples/demo-secret/test/logic.test.ts`.

## API

```ts
import { createTestRoom } from '@mp/engine/testing';
import game, { type State, type PublicView, type PlayerView } from '../src/logic.ts';

const room = createTestRoom<State>(game, {
  players: 4,              // ids p1..p4, p1 is the Host; default: minPlayers
  config: { rounds: 1 },   // overrides on top of manifest defaults
  remote: ['p4'],          // remote players (Dealer view on their phone)
  seed: 7,                 // reproducible ctx.rng
  start: true,             // default; false leaves the room in the lobby (call room.start())
});
```

| Call | Does |
|---|---|
| `room.ids` | `['p1', …]` |
| `room.act(id, action)` | a phone sends a game action |
| `room.advance(ms)` | moves the clock, firing every timer due on the way, in order |
| `room.enterDealer(id)` / `room.leaveDealer(id)` | full Dealer flow (queue, code, enter) / leave; `enterDealer` returns what that player sees |
| `room.visitDealer(id)` | enter + leave; returns what the Dealer showed |
| `room.disconnect(id)` / `room.reconnect(id)` | connection changes (pause, then `onPlayerTimeout` after `advance(20_001)`) |
| `room.platform(id, payload)` | raw platform action (`{ type: 'dealerRequest' }`, `{ type: 'backToLobby' }`, …) |
| `room.publicView()` | your public view as TVs get it |
| `room.publicJson()` | the whole public frame as JSON — for "no secret here" assertions |
| `room.publicPlatform()` | platform public data: `phase`, `players`, `paused`, `dealer` queue, `results` |
| `room.playerView(id)` / `room.playerFrame(id)` | your phone view / the full phone frame (`platform.dealer` status, `canRequestDealer`) |
| `room.dealerView(id?)` / `room.dealerFrame()` | what the Dealer screen shows / the full Dealer frame (current visitor, code, queue) |
| `room.snapshot()` | private state + every device's view as one string — `expect(room.snapshot()).toBe(before)` proves an action changed nothing |
| `room.state()` | your private state (assert on it, never treat it as what a device sees) |
| `room.phase()` / `room.results()` | platform phase (`playing`, `results`, …) / final ranking |

## Required cases

Write each as its own `it(...)`:

1. **Full match** from start to `room.phase() === 'results'`, through every phase and round, at
   `minPlayers`; and once more at `maxPlayers`.
2. **No leaks**: for every secret in the design's hidden-information table, assert it is absent
   from `room.publicJson()` before its reveal, and absent from every other player's
   `playerView`; and that each player's view shows them their own data.
3. **Timers drive progress**: with nobody acting, `advance` moves through every phase to the end.
4. **Early finish**: when all connected players act, the phase ends without waiting for the timer.
5. **Invalid actions are ignored**: wrong phase, wrong type, out-of-range values, acting on
   yourself where the rules forbid it, a second action where only one is allowed, `null` —
   `room.snapshot()` unchanged.
6. **Disconnect**: a player drops mid-phase → `publicPlatform().paused` is set; after
   `advance(20_001)` the game continues per the design's disconnect rules.
7. **Dealer** (if used): only allowed players can enter (`playerFrame(id).platform.canRequestDealer`),
   `enterDealer` returns exactly that player's secret, and a remote player gets it on their phone.
8. **Scoring**: a scripted round produces the exact points the design specifies, including a tie.
