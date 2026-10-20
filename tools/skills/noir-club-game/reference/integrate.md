# Handing off the game

The game folder runs on its own (tests, playground, bundle). Its source is identical to what the
platform repository expects, so publishing is: copy it into the repo, check, commit, push. Every
push to `master` of the platform repo runs a GitHub Action that tests, builds every game in
`games/` as its own bundle and deploys the site — the new game is live a few minutes later.

## Into the Noir Club repository

1. **Find the repo.** Ask the user where the platform repository is, unless the conversation
   already says; it is a folder whose `package.json` is named `multiplayer-plataform` and that has
   `games/`, `apps/web/` and `.github/workflows/deploy.yml`.
2. **Copy** `manifest.json`, `src/`, `test/`, `DESIGN.md` and any other game content folders
   (`assets/`, word lists…) into `games/<id>/`. Leave `.noir/`, `node_modules/`, `dist/`,
   `.claude/` and the config files behind — the repo provides its own. Updating a game that is
   already there: replace those same files and **bump `version`** in `manifest.json`.
3. **Package file** — create `games/<id>/package.json` for a new game:
   ```json
   {
     "name": "@mp/game-<id>",
     "private": true,
     "type": "module",
     "dependencies": { "@mp/game-sdk": "*" },
     "devDependencies": { "@mp/engine": "*" }
   }
   ```
4. **Check** from the repo root: `npm install`, `npm test`, `npm run typecheck`,
   `npm run build:games`. All must pass — the deploy runs the same checks and stops on any failure.
5. **Try it on the real platform** (optional but recommended): `npm run dev:relay` +
   `npm run dev:web`; the game appears in the Host's game list on its own.
6. **Publish.** With the user's go-ahead, commit only the game folder
   (`git add games/<id>` → `git commit -m "Add <Name>, <one-line pitch>"`) and `git push`.
   Then point the user to the repository's **Actions** tab to watch the deploy; when it is
   green the game is on the public site.

## Versioning

Bump `version` in `manifest.json` for every change after a release: devices load bundles by
`id@version`, so a new version is what makes TVs and phones pick up the change.

## Report to the user

What the game is (pitch, players, minutes), how a round plays on each device, the defaults you
chose from the design sheet, test results, how to try it (`npm run play`), and whether it was
pushed (and so is publishing) or what is left to publish it.
