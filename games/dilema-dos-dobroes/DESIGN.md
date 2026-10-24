# O Dilema dos Dobrões / The Doubloon Dilemma

## Pitch
Dois times, dez dobrões cada um, um pote que tudo engole: ajude seu time a vencer sem esvaziar o
próprio bolso. / Two teams, ten doubloons each, a pot that swallows everything: help your team win
without emptying your own pocket.

## Players
4–12, even counts only (`playerStep: 2`): two teams of equal size. ~40 minutes (up to 5 counted
rounds of up to 15 minutes each; rounds usually end early when everyone has deposited).

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Each player's balance | only that player | Dealer view (during their visit) | final reveal |
| Each player's deposit this round | only that player | Dealer view (draft + confirm), their phone during the visit | never per player; folded into team totals |
| Losing team's total for a round | — | — | that round's reveal (TV) |
| Winning team's total for a round | — | — | final reveal |
| Tied total | — | — | never (deposits are refunded) |

Teams are public (drawn and shown on the TV). Who has already deposited (✓) is public — not the amount.
A refused deposit (above balance) is never explained on the phone: the phone's stepper simply stops at the balance during the visit.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | safety net 5 min | Host finishes/skips | tutorial slide + demo | Host: Back/Next/Skip | idle |
| teams | 10 s | — | the two teams being drawn | "Você é do time Ouro" | idle |
| deposit | `roundMinutes`, 15 min | every player has deposited (or lost their chance) | round, wins, countdown, ✓ per player, history | "Ir ao Dealer"; at the Dealer: − / + stepper and Confirm | balance, chosen deposit, what's left, visit countdown (`visitSeconds`, 30 s) |
| reveal | 12 s | — | winner of the round + losing team total (or "Empate!") | "Olhe para a TV" | idle |
| final | 25 s | — | winning team, every balance, every hidden total, placements and points | own placement | idle |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{ type: 'draft', amount }` | phone at the Dealer | deposit phase, sender is at the Dealer, not deposited, 0 ≤ amount ≤ balance | Dealer screen mirrors the choice |
| `{ type: 'deposit', amount }` | phone at the Dealer | same | final: coins leave the balance into the pot; visit ends |
| `{ type: 'intro', dir }` | Host | intro | slides / start |
| `{ type: 'tvRules', page }` | Host | any | rules page on the TV |

## Scoring and end
- Round: the team with the larger total wins. The TV shows the loser's total; the winner's stays hidden.
- Tie: TV says only "Empate!", every deposit of that round goes back to its owner, the round is replayed (doesn't count).
- The match ends when a team reaches 3 wins (at most 5 counted rounds).
- It also ends right after a reveal when both teams have 0 doubloons: more round wins wins; equal → draw.
- Safety net (default): after 3 ties in a row the match ends the same way.
- Ranking: winning team by balance (desc), then losing team by balance. Equal balance shares the place
  (competition ranking 1, 1, 3). Points = N − place + 1. Draw: everyone scores 0.
- `ctx.end` after the 25 s final reveal.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | |
| roundMinutes | number | 15 | 5–20 |
| visitSeconds | number | 30 | 15–60, step 5 |

## Dealer
Used. During the deposit phase every player who hasn't deposited may queue, once per round. Inside,
the Dealer shows their balance and the amount chosen on their phone. The visit lasts `visitSeconds`
(the game sends them out); leaving without confirming — or running out of time — counts as a deposit
of 0 and closes their turn for the round. The Dealer closes when the deposit phase ends.

## Disconnects
- intro: Host gone → teams phase starts.
- deposit: a player gone deposits 0 for this round; at the start of later rounds a player who is
  still gone deposits 0 immediately.
- Other phases: nothing waits on players.

## Tutorial and rules
Slides:
1. How to play — two teams, 10 doubloons, the pot; credit line. Demo: two team rows of coins.
2. The deposit — go to the Dealer, choose 0–10, confirm. Demo: coins sliding into the pot.
3. The reveal — larger total wins; loser's total shown, winner's hidden; tie refunds. Demo: reveal card.
4. Who wins — first to 3; final ranking by balance inside each team. Demo: ranking ladder.
5. Hurry — 30 s at the Dealer, no visit = 0. Demo: visit countdown.

Rules pages: Overview → Teams and doubloons → The Dealer and deposits → The round → Ties and special
endings → No stalling → Scoring and end → Credits.

## Credits
Inspired by a Main Match from episode 8 of *The Genius: Rules of the Game* (Korean TV show). Game
mechanics only; names, texts and art are original. See CREDITS.md.

## Remote players
They see the Dealer view on their own phone, with the stepper under it.

## Edge cases
- Ties → refund + replay; repeated ties capped (safety net).
- Nobody deposits → 0 × 0 tie → refund (nothing) → replay.
- One team broke, other not → round continues normally; 1 doubloon wins it.
- Player at the Dealer when the round timer ends → sent out; unconfirmed = 0.
- A player who queues and doesn't show up loses their place in line (platform: 60 s to arrive) and
  may queue again while the round lasts.

## Defaults chosen
- Unit: dobrões / doubloons; teams **Ouro** (gold) and **Carmesim** (crimson).
- Teams phase of 10 s before round 1.
- Phone shows no balance; during the visit its stepper stops at the balance.
- Leaving the Dealer without confirming = deposit 0.
- After 3 ties in a row the match ends (like everyone broke).
- Reveal 12 s, final reveal 25 s.
