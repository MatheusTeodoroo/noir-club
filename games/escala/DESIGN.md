# Escala / Scale

## Pitch
Cartas secretas de 1 a 100 e um tema na mesa. Descreva seus números com palavras e coloque tudo em
ordem, juntos ou um contra o outro.

## Players
2–16. Two is enough for both modes (in versus, each orders the other's cards plus their own).
16 is the platform's usual ceiling; the TV switches to a dense layout above 40 cards.
About 3–4 minutes per round, 15–25 minutes for the default 5 rounds.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Value of each card | its owner | owner's phone (`playerView.mine`) | reveal (`publicView.result.values`) |
| Clues while being written | their author | author's phone | start of the sort phase (TV shows only "x/n written" before) |
| Each player's own row (versus) | that player | their phone (`playerView.order`) | reveal (`result.versus.orders`) |
| Theme options (draw) | everyone | TV and the master's phone | — (not secret) |

Card ids follow a shuffled deal order, so neither ids nor the TV's list order hint at values.
Feedback leaks: invalid actions are silently ignored; nothing about another player's cards is ever
refused or explained.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro (only with `tutorial`) | 5 min (safety net) | Host taps Start on the last slide or Skip; or the Host leaves | tutorial slide with a live demo beside it | Host: Back / Next / Skip; others: slide title | — |
| theme | none (no limit, as requested) | master picks/writes | master, the 3 drawn options (draw) | master: pick 1 of 3 or write title + optional extremes; others wait | — |
| clues | `clueSeconds` 60, **started only once at least half the connected players have clued all their cards** | every connected player clued all cards | theme + scale, seats with x/n progress | one clue per card (≤ 30 chars), editable until the phase ends | — |
| sort | `sortSeconds` 180 | every connected player is Ready | coop: the shared row live; versus: all cards grouped by owner; ready avatars | reorder (tap-then-tap, ↑↓, drag handle), Ready toggle | — |
| reveal | 2.5 s + one card per step (≤ 1.2 s, faster with many cards) + 7 s (coop) / 10 s (versus) | — | cards flip lowest→highest; coop: hit/miss + accuracy %; versus: correct order, then each player's row with hits and points | after the flips: own result | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `intro {dir: 1 | -1 | skip}` | Host | intro | turns the slide; Next on the last slide or Skip starts round 1 |
| `tvRules {page | null}` | Host | any phase, page < RULES.length | shows a rules page over the TV, or clears it |
| `pickTheme {index}` | master | theme, draw mode, 0–2 | sets theme, deals cards → clues |
| `writeTheme {title, low?, high?}` | master | theme, write mode, title 1–60, extremes ≤ 24 | sets theme, deals cards → clues |
| `clue {cardId, text}` | card owner | clues, 1–30 chars | sets/edits the clue; may start the half-table timer or end the phase |
| `move {cardId, to}` | anyone | sort | coop: moves on the shared row and clears everyone's Ready; versus: moves on own row and clears own Ready |
| `ready {value}` | anyone | sort | toggles Ready; all connected Ready → reveal |

## Scoring and end
- **Coop:** accuracy = % of cards in their exact position. Each player's match score is the average
  accuracy of all rounds (0–100), the same for everyone.
- **Versus:** per round, 1 pt per card in its exact position, +5 for a perfect row, and the owner of
  each card gets +1 for every *other* player who placed it exactly right. Ties stay ties (the
  platform ranks equal scores together).
- `ctx.end` runs when the last round's reveal timer ends.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | slides before round 1 + "what to do now" hints in round 1 |
| mode | select | coop | coop, versus |
| themeSource | select | draw | draw (master picks 1 of 3), write (master writes it) |
| cardsPerPlayer | number | 1 | 1–50; capped at floor(100 / players), the TV says so |
| rounds | number | 5 | 1–25 |
| clueSeconds | number | 60 | 15–300 step 15 |
| sortSeconds | number | 180 | 30–900 step 30 |

## Tutorial and rules
Texts in `src/texts.ts` (PT-BR + EN). Tutorial, 5 slides with a live demo drawn from the real board
pieces: How to play (theme bar + three secret numbers) → The round (master + three theme options) →
The clues (spider 4 / dog 40 / whale 97) → Sorting (an unsorted row + ready avatars) → Reveal and
points (green/red cards + accuracy). Rules, 9 pages: Overview → The theme and the master → Cards and
clues → Sorting · Cooperative → Sorting · Competitive → The reveal → Scoring and end → Special
situations → Credits. 📖 Rules on every phone screen; the Host can show a page over any TV phase.
Round-1 hints (tutorial on), derived from state: `theme`, `clues`, `hurry` (half-table timer
running), `sort` (mode-specific line), `ready` (someone is ready). Credits: inspired by the card
game ito — line on the first slide, last rules page, `CREDITS.md`.

## Dealer
Not used: numbers live on the phone.

## Disconnects
- theme: if the master times out, a theme is drawn automatically.
- clues: their missing clues stay "—"; the half-table and everyone-done checks recount connected players.
- sort: they no longer count for "everyone Ready"; their versus row stays as it was and still scores.
- The next master is the next *connected* player in seat order.

## Remote players
Nothing differs.

## Edge cases
- Nobody writes clues: the phase waits (no timer until half are done) — by design; a dropped player is
  handled by the platform timeout.
- Nobody sorts: the sort timer reveals the current order.
- 2 players: half = 1 player, so the timer starts as soon as one finishes.
- 16 players × 6 cards = 96 cards: dense TV layout, versus rows without numbers (hit/miss only).

## Defaults chosen
- "Half" means at least 50 % of connected players (so 1 of 2 starts the timer).
- Theme bank: ~127 original themes in PT and EN; the bank reshuffles when every theme has been used.
- Clue max 30 characters; written theme max 60, extremes max 24.
- Versus TV groups the cards by owner during sorting so players can find each other's clues.
- No Rive; CSS animations in the same style as Middle Race and Incógnito.
