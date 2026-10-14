# Handing off the game

The game folder runs on its own (tests, playground, bundle). The game's source is identical to
what the platform repository expects, so integrating is a copy.

## Into the Noir Club repository

1. Copy `manifest.json`, `src/`, `test/`, `DESIGN.md` and `assets/` (if any) into
   `games/<id>/` of the platform repo. Leave `.noir/`, `node_modules/`, `dist/` and the config
   files behind — the repo provides its own.
2. Create `games/<id>/package.json`:
   ```json
   {
     "name": "@mp/game-<id>",
     "private": true,
     "type": "module",
     "dependencies": { "@mp/game-sdk": "*" },
     "devDependencies": { "@mp/engine": "*" }
   }
   ```
3. From the repo root: `npm install`, `npm test`, `npm run typecheck`, `npm run build:games`.
4. `npm run dev:relay` + `npm run dev:web`: the game appears in the Host's game list (lobby) on
   its own — manifests are discovered automatically; each game ships as its own bundle under
   `/games/<id>@<version>/`.

## Versioning

Bump `version` in `manifest.json` for every change after a release: devices load bundles by
`id@version`, so a new version is what makes TVs and phones pick up the change.

## Report to the user

What the game is (pitch, players, minutes), how a round plays on each device, the defaults you
chose from the design sheet, test results, how to try it (`npm run play`), and the integration
steps above.
