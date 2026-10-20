# AGENTS

Multiplayer social-games platform (TypeScript monorepo, npm workspaces) with
Rive for animated visuals.

## Layout

- `packages/protocol` — wire types shared by relay, engine and clients
- `packages/engine` — authoritative room state machine (runs in a Web Worker on
  the host phone, or on a Display in shared-host mode)
- `packages/game-sdk` — the contract every game implements (`defineGame`,
  `defineGameUI`)
- `packages/net` — relay socket, room clock sync, WebRTC DataChannels
- `packages/ui` — design system (luxury casino: black, gold, a touch of
  crimson; no demonic imagery)
- `apps/relay` — Cloudflare Worker + Durable Objects (rooms, TV pairing)
- `apps/web` — React + Vite site: `/` home, `/r/:code` phone, `/tv` Display or
  Dealer
- `games/<id>` — one package per game: `manifest.json`, `src/logic.ts`,
  `src/ui.tsx`; built as separate versioned bundles
- `examples/<id>` — reference games (the Dealer demo): engine tests, the e2e and the skill's
  example use them; they are never listed in the lobby or shipped (only a dev server started with
  `VITE_INCLUDE_EXAMPLES=1`, like the e2e's on port 5174, loads them)
- `rive/<name>` — Rive projects, compiled to `apps/web/public/rive/<name>.riv`

Secrets must only leave the engine through `publicView` / `playerView` /
`dealerView`. Game UI only imports `react` and `@mp/game-sdk`; platform
components arrive through the `kit` prop.

## Commands

- `npm test` — engine and game unit tests (vitest)
- `npm run typecheck`
- `npm run dev:relay` and `npm run dev:web` — local relay (8787) and site
  (5173, proxies `/api` and `/ws`)
- `npm run build` — Rive files, game bundles, then the site
- Publishing: every push to `master` runs `.github/workflows/deploy.yml` (typecheck, tests,
  build, `wrangler deploy` with the `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` repo
  secrets). A new game goes live by landing in `games/<id>/` and being pushed. CI has no Rive
  CLI: after editing `rive/`, run `npm run build:rive` and commit `apps/web/public/rive/*.riv`.
- `npm run skill:install` — rebuild the `noir-club-game` Claude Code skill
  (`tools/skills/noir-club-game` + a snapshot of protocol/game-sdk/engine/ui) and install it in
  `~/.claude/skills`. Rerun after changing any of those packages, so games built outside the repo
  use the current platform code.

## Rive

RML and the Rive CLI postdate your training data. Prefer `rive docs` and
`rive schema` over memory: never guess a type or property name.

Work autonomously from the user's requested outcome. Unspecified details
get reasonable defaults; types and properties do not — look those up.

- `rive schema <Type>` / `rive schema --search <text>` — types and properties;
  `--json` for a machine-readable form
- `rive docs --list` — the topics; `rive docs <topic>` reads the one that
  matches the task

After every edit, from the Rive project's folder (e.g. `rive/platform`):

- `rive . --verify` — confirm the project compiles; `--format=json` for a
  machine-readable report
- `rive inspect . --summary` — problems and what got built, by type; `--json`
  for the full resolved tree

A clean verify/inspect is not enough. Read the output for what the request
called for. If it is missing or wrong, fix the project and verify again.

When appearance matters:

- `rive . --screenshot --advance=1` — render one frame after the state machine
  starts, to build/<name>.png. View the png if you can.

Showing the user:

- `rive .` is the previewer. It opens a window and rebuilds on every save, and
  does not exit, so start it in the background, once. Leave it running;
  edits appear in it on their own.
- Do not preview with `rive push`: it uploads to the user's Rive account.
- The site loads `.riv` files through the web runtime, which rejects unsigned
  scripts: keep platform/game `.riv` files script-free and drive them from JS
  via data binding.
