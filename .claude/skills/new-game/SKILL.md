---
name: new-game
description: Scaffold a new game package in games/<id> (manifest, pure logic, React views, unit test) that plugs into the platform's game SDK. Use when the user wants to create or start a new game for the platform.
disable-model-invocation: true
argument-hint: <game-id> [short description of the game]
---

# New game

Create `games/<id>/` for the game described in the arguments. `games/demo-secret/` is the
reference implementation; read it and `packages/game-sdk/src/index.ts` before writing.

## Files

- `package.json` — `{ "name": "@mp/game-<id>", "private": true, "type": "module", "dependencies": { "@mp/game-sdk": "*" } }`
- `manifest.json` — `id`, `version` (`1.0.0`), `name` / `description` in `pt-BR` and `en`,
  `minPlayers`, `maxPlayers`, `usesDealer`, `estimatedMinutes`, `accent` (hex) and `config`
  fields (number / boolean / select, each with a default).
- `src/logic.ts` — `export default defineGame<State, Config>({...})`. Pure: no DOM, no
  `Date.now()` (use `ctx.now`), no `Math.random()` (use `ctx.rng`). Timers via `ctx.setTimer`,
  sounds via `ctx.emit`, end with `ctx.end({ scores })`.
- `src/ui.tsx` — `export default defineGameUI({ Display, Player, Dealer? })`. Import only `react`
  and `@mp/game-sdk`; platform components come from the `kit` prop, text through `t(I18nText)`.
  Scope CSS with a short class prefix and inject it with a `<style>` element.
- `test/logic.test.ts` — vitest, driving `@mp/engine`'s `Engine` the way
  `packages/engine/test/engine.test.ts` does.

## Rules that matter

- Secrets live in `State` only. `publicView` goes to every TV and must never contain them;
  `playerView(state, id)` returns only that player's data; `dealerView` is what the isolated
  Dealer screen shows. Add a test asserting the public view leaks no secret.
- Displays have no input. Everything on them derives from `publicView` and the room clock.
- Phones are controllers: keep `Player` views small, thumb-sized, and readable at a glance.
- Visual style: the platform's luxury casino look (black, gold, a touch of crimson, Cinzel /
  Cormorant). No demonic imagery.
- Visual assets in Rive go in `rive/<id>/` as their own Rive project, driven from JS via data
  binding (no Rive scripts: the web runtime rejects unsigned scripts).

## Done when

1. `npm test` and `npm run typecheck` pass.
2. `npm run build:games` emits `apps/web/public/games/<id>@<version>/{logic,ui}.js`.
3. The game appears in the Host's game list in `npm run dev:web` and a round plays through on a
   Display, two phones and (if used) the Dealer.
