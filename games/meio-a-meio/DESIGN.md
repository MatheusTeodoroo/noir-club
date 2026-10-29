# Meio a Meio / Fifty-Fifty

## Pitch
Escreva um dilema com duas respostas e tente rachar a sala exatamente ao meio.
/ Write a dilemma with two answers and try to split the room right down the middle.

## Players
5–16. With fewer than 4 voters a split is trivial; with many voters it gets genuinely hard.
Each player is the Author exactly once, so a match has one round per player:
about 1.5 min per round → ~8 min at 5 players, ~24 min at 16. Lobby says 15.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| The question being written (and bank suggestions) | the Author | Author's playerView | the Author submits (voting starts) |
| Each player's vote | that player | their playerView | reveal (TV shows names on each side) |
| Running tally of votes | nobody | — | reveal (during voting the TV shows only *who* voted) |
| The prompt bank | the engine | logic module only | one suggestion at a time, to the Author |

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | `intro` safety net, 5 min | Host finishes / skips | tutorial slides | Host: Back/Next/Skip; others: follow the TV | — |
| writing | `writeSeconds`, 75 s | Author submits | "<Author> is writing", avatar, countdown, standings | Author: question + A + B, **Sugerir**, **Enviar**; others: wait | — |
| voting | `voteSeconds`, 25 s | every connected voter has voted | question, A vs B, level scale, "X of N voted", voter avatars ✓ | voters: two big buttons (can change); Author: "your question is live" | — |
| reveal | 10 s | — | drumroll → scale tips, counts, names on each side, Author's points, "Perfect split!" | own result; Author: points | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{ type: 'intro', dir: 1 \| -1 \| 'skip' }` | Host | intro | turn slides / start round 1 |
| `{ type: 'tvRules', page \| null }` | Host | any | rules page on the TV |
| `{ type: 'suggest' }` | Author | writing | a new bank prompt (not used yet this match) appears on the Author's phone, filling the form |
| `{ type: 'submit', question, a, b }` | Author | writing | strings, trimmed, question 1–140 chars, answers 1–40, A ≠ B (case/accent-insensitive) → voting |
| `{ type: 'vote', side: 'a' \| 'b' }` | any player but the Author | voting | records / replaces the vote; reveal when all connected voters voted |

## Scoring and end
Only the Author scores: `points = round(100 × minority ÷ majority)` over the votes cast
(4×4 = 100, 4×3 = 75, 6×1 = 17, 7×0 = 0, nobody voted = 0). Raw formula, no adjustment for an odd
number of voters. Voters score nothing. After every player has been Author once, `ctx.end` with
the totals; equal totals share the win (the platform ranks ties together).

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | |
| writeSeconds | number | 75 | 30–180, step 15 |
| voteSeconds | number | 25 | 10–60, step 5 |

## Dealer
Not used.

## Disconnects
- intro: the Host leaving starts the game.
- writing: the Author leaving → the house fills in a prompt (their last suggestion, else a fresh one) and voting starts; they still score it. An Author already gone when their turn comes is handled the same way at once.
- voting: a voter leaving keeps the vote they cast (if any); otherwise they abstain. If everyone left has voted, reveal.

## Tutorial and rules
Slides:
1. *Como jogar* — each round one player is the Author and writes a dilemma with two answers; goal: split the room. Demo: a prompt card.
2. *Todos votam* — the others pick a side in secret; the TV only shows who voted; the Author doesn't vote. Demo: avatars with ✓ and "3 of 5 voted".
3. *A balança* — reveal: the scale tips, counts and names on each side. Demo: the scale at 4 × 3.
4. *Pontos* — 100 × minority ÷ majority, examples; everyone is Author once; most points wins. Demo: score table.

Rules pages: Overview → The Author → Voting → The reveal → Scoring → Special situations → End.
No hints (one action per role, the TV instruction line covers it).

## Credits
Original game.

## Remote players
Nothing differs.

## Edge cases
- Nobody votes / everyone on one side: 0 points.
- Abstentions don't count for or against.
- 5 players → 4 voters; 16 players → 15 voters (best possible 8×7 = 88).
- Author submits A equal to B: refused on the phone (button disabled) and ignored by the engine.
- Prompt bank exhausted in one match: it reshuffles.
- Room language changes mid-round: bank prompts are bilingual; typed prompts stay as typed (a bank prompt submitted unedited stays bilingual).

## Defaults chosen
- Timers 75 s / 25 s / 10 s reveal; votes can be changed until the phase closes.
- Turn order shuffled at setup.
- No content filter beyond length limits.
- Visual motif: a golden balance scale; Answer A in gold, Answer B in crimson.
- ~40 original bilingual prompts in `src/prompts.ts`.
- No Rive (CSS/SVG only).
