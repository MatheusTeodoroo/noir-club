---
name: noir-club-game
description: Builds a new game for Noir Club — the in-person social-games platform with a shared TV Display, players' phones and a private Dealer screen — from a game idea to a tested, playable, bundled game. Use when asked to create, design or prototype a Noir Club game, or to turn a party / social-deduction game idea into one.
---

# Noir Club game

You turn a game idea into a working Noir Club game package. This skill is self-contained: its
`kit/` carries the platform's SDK, engine, design system, a browser **playground** and the
bundler, so the platform repository is not needed. `<skill>` below means this skill's folder.

Noir Club in one breath: friends in a room, one or more **TVs** show the public board (no input),
everyone plays on their own **phone** (controller only), and a **Dealer** screen in a separate room
shows one player at a time their private information. A trusted platform engine runs the rules;
a game is a pure state machine plus three views. Read `reference/platform.md` before designing:
the platform already does lobby, joining, the Dealer queue and codes, pauses, sync and the final
scoreboard, and your game must lean on that rather than rebuild it.

## Steps

1. **Design.** Read [reference/platform.md](reference/platform.md) and
   [reference/design.md](reference/design.md), then draft the design sheet from `design.md`
   (step 2 saves it as `DESIGN.md` in the game folder).
   Settle open questions with the user only when the answer changes the game (rules, hidden
   information, scoring); pick sensible defaults for everything else and list them in the sheet.
   Done when every section of the sheet is filled and every piece of hidden information has an
   owner, a view that shows it, and a moment it becomes public (or never).

2. **Scaffold.** Pick a kebab-case id and run, from the folder that should contain the game:
   `node <skill>/scripts/new-game.mjs <id> --pt "Nome" --en "Name"`, then in the new folder
   `npm install` and `npm test`. Save the design sheet as `DESIGN.md` in the game folder.
   Done when the starter game's tests pass (they prove the kit works before you change anything).
   The CSS prefix the script prints is the game's; use it for every class in `src/ui.tsx`.

3. **Logic.** Rewrite `manifest.json` and `src/logic.ts` to the design, following
   [reference/sdk.md](reference/sdk.md). The starter game is a compact, correct example of the
   contract; for games that use the Dealer, also read `<skill>/examples/demo-secret/src/logic.ts`.
   Done when `npm run typecheck` reports no errors in `src/logic.ts` (errors in the starter's
   `src/ui.tsx` and `test/` are expected until steps 4–5 replace them).

4. **Tests.** Rewrite `test/logic.test.ts` with the room simulator, covering every required case
   in [reference/testing.md](reference/testing.md). Done when `npm test` is green and each
   required case has its own test.

5. **Views.** Rewrite `src/ui.tsx` — Display, Player and (if the game uses it) Dealer — following
   [reference/ui.md](reference/ui.md). Done when `npm run typecheck` is clean.

6. **Play.** The playground is the real engine driving a TV, the Dealer and one phone per player,
   with clock controls and an event log, at http://localhost:5180. Start it with your preview
   tool's `play` launch config (the scaffold wrote `.claude/launch.json`) or `npm run play` in a
   background shell. Play a full match at the minimum and at the maximum player count, then
   walk the checklist at the end of `ui.md`; fix and replay. Driving it:
   - **`window.pg` in the control room** (through your browser tool's JavaScript runner):
     `await pg.click('p2', 'Votar')`, `await pg.type('p3', 'pintor', true)`,
     `await pg.visit('p2')` (the whole Dealer flow), `await pg.leave('p2')`, `pg.text('display')`,
     `pg.next()` (jump to the next timer), `pg.state()`. After the scoreboard, the Host's phone
     (p1) has "Voltar ao lobby" and then "Começar nova partida" — check a second match starts
     cleanly. Accessibility snapshots do not enter the
     device iframes, so this is how to press phone buttons from the control room.
   - **Single devices in their own tabs** (they join the same engine): `/?device=display`,
     `/?device=dealer`, `/?device=player&id=p2` — keep the control room tab open. Bring a tab
     to the front before judging an animation (background tabs pause CSS animations).
   Done when a full match reaches the scoreboard with no red crash boxes on any device and every
   checklist item holds. Without a browser tool, say so and rely on the tests plus a careful read
   of `ui.tsx` against the checklist.

7. **Bundle.** `npm run build`. Done when it prints `built …/dist/<id>@<version>` and exits 0
   (it also rejects UI code that imports anything besides `react` and `@mp/game-sdk`, or that
   pulls the game logic into the UI bundle).

8. **Publish.** Follow [reference/integrate.md](reference/integrate.md): copy the game into the
   platform repository's `games/`, run its checks, and — with the user's go-ahead — commit and
   push; the repository's GitHub Action deploys the site with the new game. Done when the push
   went through (or the user chose to keep it local) and you told them what was built, how to try
   it (`npm run play`) and where to watch the deploy.

## Reference

- [reference/platform.md](reference/platform.md) — devices, room lifecycle, Dealer flow, clock and sync, disconnects, what the platform renders for you
- [reference/design.md](reference/design.md) — the design sheet and what makes a good in-person social game
- [reference/sdk.md](reference/sdk.md) — manifest, the `defineGame` contract, `ctx`, views, rules for logic code
- [reference/testing.md](reference/testing.md) — `createTestRoom` API and the required test cases
- [reference/ui.md](reference/ui.md) — `defineGameUI`, the `kit`, styling for TV and phone, visual identity, play checklist
- [reference/rive.md](reference/rive.md) — optional Rive animations
- [reference/integrate.md](reference/integrate.md) — moving the game into the platform repository, versioning

The exact types live in the game folder at `.noir/sdk/game-sdk/index.ts` (game contract and kit
props) and `.noir/sdk/protocol/index.ts` (platform views); read them when a reference doc and your
code disagree — the code is the source of truth.
