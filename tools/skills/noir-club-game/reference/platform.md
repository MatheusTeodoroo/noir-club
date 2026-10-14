# The platform

What exists around a game, so the game only does what is unique to it.

## Devices

| Device | Who / where | Input | Shows | Gets |
|---|---|---|---|---|
| **Display** | One or more TVs, every room of the house, all in sync | none | the public board | `publicView` |
| **Phone** | Each player's own phone | taps | that player's controls and private info | `playerView(state, ownId)` |
| **Dealer** | One screen in an isolated room; players visit it one at a time | none | one verified player's private info | `dealerView(state, visitorId)` |

- The **Host** is player `p1`: a normal player who also picks the game, sets its config, and can
  return the room to the lobby. Admin powers live in the platform UI, never in a game.
- Remote players (`ctx.players[i].remote`) are in another place; they watch a TV there or a
  screen share, and the Dealer view appears on their own phone instead of the Dealer screen.
- Phones are **controllers**: the drama, the board and every reveal belong on the TV.

## Room lifecycle

`lobby → loading → playing → results → lobby`

- **lobby** — the platform shows the join code, QR, players and the chosen game; the Host
  configures it. Not your code.
- **loading** — every device downloads your bundle; the match starts when all report ready
  (or after 15 s). The platform refuses to start outside `minPlayers..maxPlayers`.
- **playing** — your game. `setup(ctx)` runs once; `ctx.players` is the fixed list of
  participants for the whole match (late joiners become spectators and are not in it).
- **results** — after `ctx.end({ scores })` the platform shows the ranking on TVs and phones and
  adds the points to the room's running totals. Your views are not shown in this phase.

## Clock and sync

- Use `ctx.now` (room clock, ms). Every device shares it; every TV applies a frame at the same
  instant, so phase changes, countdowns and reveals land together across the house.
- Timers: `ctx.setTimer(key, ms)` → `onTimer(state, key)`. Put `ctx.timerDeadline(key)` in your
  views to draw countdowns.
- Cues: `ctx.emit('sound', name, delayMs?)` plays on every TV at the same instant. Built-in sounds:
  `round`, `phase`, `tick`, `drumroll` (~2.3 s), `reveal`; the platform itself plays `start` and
  `dealerCall`. `ctx.emit('fx', name, delayMs?)` flashes a gold burst over the TVs (any name).

## The Dealer (when `manifest.usesDealer` is true)

The platform owns the whole ritual; the game only says *who may visit* and *what they see*.

1. Whenever `canVisitDealer(state, id)` is true, that player's phone shows **"Ir ao Dealer"**.
2. Tapping it joins a first-come queue. The TV shows the queue in a corner strip.
3. At their turn the Dealer screen shows the player's name and a **3-digit code**; they walk to
   the isolated room and type it on their phone (60 s to arrive, 3 attempts, then a new code).
4. Verified → `onDealerEnter(state, id)`; `ctx.atDealer === id`; the Dealer screen shows
   `dealerView(state, id)` for up to 90 s.
5. The player taps **"Sair do Dealer"** (or the game calls `ctx.releaseDealer()`, or time runs
   out) → `onDealerLeave(state, id)`; the next in line is called.

Queued or called players for whom `canVisitDealer` turns false are dropped from the queue after
each game step, so close the Dealer simply by making `canVisitDealer` false (e.g. on a phase change).
Remote players skip the code and see `dealerView` on their phone.

Timing rules that bite:

- Mark a visit as done in `onDealerEnter` (so the player can't queue again), but run any
  "everyone has visited → next phase" check in **`onDealerLeave`**. Checking in `onDealerEnter`
  ends the phase and releases the last visitor while they are still reading.
- Inside `onDealerLeave`, `ctx.atDealer` is already `null`.
- Dealer timers belong to the platform: a visit can still time out (and `onDealerLeave` run)
  while the game is paused for a disconnect.

The Dealer suits information that must be seen **privately and deliberately** — a role, a hand,
a secret number, a clue — where a glance at a phone in a crowded room would leak it, or where
the walk to the Dealer is itself part of the tension. Information a player can keep to themselves
casually belongs in `playerView`.

## Disconnects

A participant who drops mid-match pauses the game: game timers freeze, game actions and Dealer
requests are refused, and every screen shows a 20 s countdown. If they come back, everything
resumes exactly where it was. If not, `onPlayerTimeout(state, id)` runs and the game continues.
`ctx.players[i].connected` turns false the moment they drop and true again if they return; since
no game handler runs during the pause (except the Dealer hooks above), in practice your
"everyone acted" checks first see it false in `onPlayerTimeout`. Decide in the design what a missing
player means (skip their turn, auto-play, ignore their vote) and never wait on a disconnected
player.

If the device running the engine dies, a Display takes over from the last snapshot. Your state
therefore must be **plain JSON** (objects, arrays, strings, numbers, booleans, null).

## Screen areas the platform overlays

- **TV during play:** bottom-left — the Dealer queue strip (when the game uses the Dealer);
  bottom-right — the room code. Keep both bottom corners free; the top of the screen is yours.
- **Dealer screen during a visit:** top-left — the visitor's avatar and name; top-right — the
  visit timer. Keep both top corners free; centre your content.
- **Phone:** above your Player component, the header and the Dealer controls; below it, the Host's
  controls (on p1's phone).

## What the platform renders for you

Lobby, join code and QR, TV pairing, game selection and config form, loading screens, the phone
header (avatar, name, points), the Dealer button / queue / code entry / "leave" control, the
Dealer screen's call and code, the TV's Dealer strip, pause overlays, reconnection, the final
scoreboard, sound playback, language selection. A game renders only its own board, controls and
Dealer content.
