# __NAME_PT__ — a Noir Club game

Built with the `noir-club-game` Claude Code skill; `DESIGN.md` holds the rules and decisions.

| Command | Does |
|---|---|
| `npm test` | logic tests in the real platform engine (`test/`) |
| `npm run typecheck` | types for logic, UI and tests |
| `npm run play` | playground at http://localhost:5180 — TV, Dealer and phones driven by the engine |
| `npm run build` | platform bundle in `dist/<id>@<version>/` |

Game code: `manifest.json`, `src/logic.ts` (rules), `src/ui.tsx` (TV / phone / Dealer views).
`.noir/` is the platform kit (SDK, engine, design system, playground) — not part of the game.
