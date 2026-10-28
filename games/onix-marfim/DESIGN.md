# Ônix & Marfim / Onyx & Ivory

## Pitch
Nove pedras, de 0 a 8. Você só vê a cor da pedra do rival — nunca o número. Nove rodadas para ler o duelo.
/ Nine stones, 0 to 8. You only see the colour of your rival's stone — never its number. Nine rounds to read the duel.

## Players
Exatamente 2 (duelo frente a frente). ~6 minutos (9 rodadas + revelação; desempates somam outros ~6).

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| the number on each stone a player still holds | only its owner | own `playerView.hand` | never directly; all played numbers at the duel reveal |
| the number played in a round | only who played it | own `playerView.mine` (current) and `myHistory` | duel reveal (TV and both phones) |
| the colour played in a round | everyone | `publicView.current` / `history`, rival's phone | the moment it is presented |
| which colours each player still holds | everyone (derivable) | `publicView.remaining` — blacks first, then whites, never in number order | always |

The TV never carries a number before the duel reveal; a phone never carries the rival's numbers
before it. The remaining-stones row is sorted by colour so its order cannot hint at numbers.
Refusals leak nothing (only "not your turn" or "you no longer have that stone"). A time-out plays
the lowest stone left — a public rule, so the TV may say it was automatic.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | 5 min safety net | Host finishes/skips | tutorial slide + demo | Host: Back/Next/Skip | — |
| play | `turnSeconds`, 45 s per move → lowest stone played | the player on turn presents | score, duel/round, whose turn + countdown, presented colour(s), both remaining rows (colours only), round history | on your turn: your stones as buttons; rival's colour once shown; own history | — |
| result | 4 s | — | round winner (or tie), the two colours | who won | — |
| reveal | 14.5 s | — | drumroll → every round's numbers flip in turn → final score, winner or "desempate" | the same sequence | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{ type: 'present', tile }` | the player on turn | play; `tile` still in their hand | stone leaves the hand; first player → turn passes; second → round resolves (result) |
| `{ type: 'intro', dir }` | Host | intro | tutorial navigation |
| `{ type: 'tvRules', page }` | Host | any | rules page on the TV |

## Scoring and end
Higher number wins the round (+1 point); equal numbers → nobody scores. Always 9 rounds. Then the
duel reveal. Different points → `ctx.end`: winner 1, loser 0. Equal points → a **tiebreak duel**:
fresh 0–8 stones, points back to 0, round 1, repeated until someone wins.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | |
| turnSeconds | number | 45 | 15–90, step 5 |

## Dealer
Not used: each player's stones live on their own phone.

## Disconnects
A player gone past the grace period loses at once (any phase): `ctx.end` with the other as winner.

## Tutorial and rules
Slides: 1 *Como jogar* (2 players, 9 stones 0–8, even = ônix, odd = marfim; demo: the nine stones)
· 2 *A rodada* (first presents, colour shows, second answers, higher wins; demo: an onyx stone
face-down meets an ivory one, winner glows) · 3 *O que a TV mostra* (score, remaining rows by
colour, history; demo: the rows) · 4 *Fim* (9 rounds, reveal, tie → tiebreak; demo: a revealed
round strip).
Rules pages: Visão geral → As pedras → Sua vez → A rodada → Empates e desempate → Fim e pontuação → Créditos.
No hints.

## Credits
Original implementation of a classic hidden-number duel (game mechanics are not copyrighted). See
CREDITS.md. Not an official version of any TV show.

## Remote players
Nothing differs.

## Edge cases
- Equal numbers (only possible with the same number, e.g. 4 vs 4): no point, the same starter goes again.
- Round 9: each player holds one stone; they still present it (the phone shows the single button).
- Time-out: lowest stone left is presented, marked "automático" on the TV.
- Points equal after round 9 → tiebreak duel announced on the TV; starter = winner of the last round (or its starter if it tied).
- Disconnect in any phase, the tutorial included: the other player wins.

## Defaults chosen
- Round-result pause 4 s; duel reveal ~14.5 s (one round flips every 0.9 s after a 2.2 s drumroll).
- Turn timer 45 s, Host-configurable 15–90 s.
- Platform score: winner 1, loser 0.
- Remaining rows on the TV sorted onyx first, then ivory.
