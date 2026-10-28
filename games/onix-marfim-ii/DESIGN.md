# Ônix & Marfim II / Onyx & Ivory II

## Pitch
99 pontos para nove rodadas. Aposte quanto quiser — o rival só vê se foi ônix (um dígito) ou marfim (dois) e a sua lâmpada se apagando.
/ 99 points for nine rounds. Bid what you like — your rival only sees onyx (one digit) or ivory (two) and your lamp dimming.

## Players
Exatamente 2 (duelo frente a frente). ~8 minutos (até 9 rodadas + revelação; desempates somam outros ~8).

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| exact points a player has left | only its owner | own `playerView.myPoints` | duel reveal (`reveal.left`) |
| the amount bid in a round | only who bid it | own `playerView.mine` (current) and `myBids` | duel reveal (TV and both phones) |
| the colour of a bid (0–9 onyx, 10–99 ivory) | everyone | `publicView.current` / `history`, rival's phone | the moment it is bid |
| lit lamp stages (0–5) | everyone | `publicView.lamps` | always; updated as soon as a bid is made, before the rival answers |

The TV never carries a number before the duel reveal; a phone never carries the rival's numbers
before it. Refusals leak nothing (invalid amounts are simply ignored; the phone cannot produce one).
A time-out bids 0 — a public rule, so the TV may say it was automatic. A player with 0 points
(lamp dark, already public) bids 0 automatically; the TV says so.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | 5 min safety net | Host finishes/skips | tutorial slide + demo | Host: Back/Next/Skip | — |
| play | `turnSeconds`, 45 s per bid → bid 0 | the player on turn bids | wins, duel/round, whose turn + countdown, bid colour(s), both lamps, round history | on your turn: amount stepper 0..points, lamp preview, confirm; rival's colour once shown; own history | — |
| result | 4 s | — | round winner (or tie), the two colours | who won | — |
| reveal | 2.2 s + 0.9 s × rounds + 4.2 s | — | drumroll → every round's bids flip in turn → points left, final wins, winner or "desempate" | the same sequence | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{ type: 'bid', amount }` | the player on turn | play; integer 0 ≤ amount ≤ points left | points spent; first bidder → turn passes (lamp already updated); second → round resolves (result) |
| `{ type: 'intro', dir }` | Host | intro | tutorial navigation |
| `{ type: 'tvRules', page }` | Host | any | rules page on the TV |

## Scoring and end
Higher bid wins the round (+1 win); equal bids → nobody wins and the same starter goes again. The
duel ends after round 9, as soon as someone reaches 5 wins, or when both players are at 0 points
(every remaining round could only tie). Then the duel reveal. Different wins → `ctx.end`:
winner 1, loser 0. Equal wins → a **tiebreak duel**: 99 points each, wins back to 0, round 1,
repeated until someone wins.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | |
| turnSeconds | number | 45 | 15–90, step 5 |

## Dealer
Not used: each player's points live on their own phone.

## Disconnects
A player gone past the grace period loses at once (any phase): `ctx.end` with the other as winner.

## Tutorial and rules
Slides: 1 *Como jogar* (2 players, 99 points, bid any amount, one digit = ônix, two = marfim; demo:
onyx 0/4/9 and ivory 10/42/99 stones) · 2 *A rodada* (starter bids, colour shows, rival answers,
higher wins, points are spent; demo: onyx meets ivory, winner glows) · 3 *A lâmpada* (five lights,
one out per 20 spent, dark at 0, changes before the answer; demo: a lamp counting 99 → 0) ·
4 *Fim* (5 wins or 9 rounds, reveal, tie → tiebreak; demo: a revealed round strip).
Rules pages: Visão geral → Pontos, cores e lâmpada → Sua vez → A rodada → Empates e desempate → Fim e pontuação → Créditos.
No hints.

## Credits
Original implementation of a classic hidden-bid duel (game mechanics are not copyrighted). See
CREDITS.md. Not an official version of any TV show.

## Remote players
Nothing differs.

## Edge cases
- Equal bids: no win, the same starter goes again.
- Five wins before round 9: the duel ends at once and the reveal shows only the rounds played.
- A player at 0 points: their bids are 0 at once (no waiting); both at 0 → the duel ends.
- Bidding everything in one round is allowed; the lamp goes dark immediately.
- Time-out: bid 0, marked "automático" on the TV.
- Wins equal at the end → tiebreak duel announced on the TV; starter = winner of the last round (or its starter if it tied).
- Disconnect in any phase, the tutorial included: the other player wins.

## Defaults chosen
- Round-result pause 4 s; duel reveal ~2.2 s drumroll + 0.9 s per round.
- Turn timer 45 s, Host-configurable 15–90 s.
- Platform score: winner 1, loser 0.
- Lamp: 80–99 → 5, 60–79 → 4, 40–59 → 3, 20–39 → 2, 1–19 → 1, 0 → off.
- Phone input: ±1/±10 stepper plus shortcuts 0, 9, 10 and "Tudo" (the colour boundary), with a
  preview of your lamp after the bid.
- Both players at 0 points ends the duel early (pure pacing: the rest could only tie).
