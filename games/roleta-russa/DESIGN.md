# Roleta Russa / Russian Roulette

## Pitch
Um revólver no centro da mesa, uma câmara para cada cadeira e balas escondidas. Gaste seus créditos
investigando, girando e trocando câmaras — quando o tambor disparar, não esteja na mira.

## Players
3–10. One chamber per player, so the table always has a chamber facing every seat. ~20 minutes
(16 credits each, at least 1 spent per turn).

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Which chambers hold bullets | nobody (engine) | never on the TV during play; investigation results flash on phones for 8 s | each shot during the firing; the whole cylinder at the end |
| Public investigation result | every player, for 8 s | every phone (`flash`), then gone | never kept anywhere |
| Each player's credits | only that player | own phone | never (the firing trigger reveals only that enough are broke) |
| Each player's manipulation charge | only that player | own phone | never |
| Private investigation result | only the investigator, for 8 s | own phone (`flash`), then gone; the notebook keeps only the pair | never (they may tell or lie) |
| Which pair a manipulation swapped | only the manipulator | own phone | never |
| Whether a "private action" was a private investigation, a load, a swap or a pass | only that player | own phone | never |

Feedback that could leak: the "Pass" button only appears at 0 credits on the player's own phone; the
TV shows every private action — including passes — as the same "ação privada" line.

## Phases
| Phase | Ends by timer | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | `intro` safety net 5 min | Host finishes or skips | tutorial slide + live demo | Host: Back/Next/Skip | — |
| play | none (user choice: no turn timer); `flash` 8 s clears an investigation result | ⌈n/2⌉ players at 0 credits, right after that turn | table, cylinder (chamber order and aim only — no bullet hints), whose turn, recent turns (public investigations without result) | current player picks an action; everyone sees credits, charge, notebook and any live investigation result | — |
| firing | `shot` every 3.4 s (4 s before the first) | last bullet fired | chamber A at the seat in the sights, then B, C… clockwise: drumroll, then click / bang | "Look at the TV" | — |
| end | `end` 10 s | — | whole cylinder, hit and surviving players | "You survived" / "You were hit" | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{type:'investigate', pair, secret:false}` | current player | credits ≥ 1 | −1; result on every phone for 8 s; TV shows who and which pair |
| `{type:'investigate', pair, secret:true}` | current player | credits ≥ 2 | −2; result on own phone for 8 s; TV "private action" |
| `{type:'spin', steps:1}` | current player | credits ≥ 3 | −3; rot += 1; public |
| `{type:'spin', steps:2}` | current player | credits ≥ 4 | −4; rot += 2; public |
| `{type:'charge', amount:1..3}` | current player | credits ≥ amount | charge += amount; =6 → same turn waits for `manipulate`; >6 → charge lost, reset to 0; TV "private action" |
| `{type:'manipulate', pair}` | current player | charge just reached 6 | swap the two chambers' contents; TV "private action" |
| `{type:'pass'}` | current player | credits = 0 | TV "private action" |
| `{type:'intro', dir}` | Host | intro | slides |
| `{type:'tvRules', page}` | Host | any | rules page on the TV |

Geometry: barrel and cylinder are one piece. Chambers A… clockwise, the barrel at chamber A.
Spins turn the whole gun clockwise; the barrel aims at seat `rot` (seat 0, ball 1, at the start).
Chamber facing seat s = (s − rot) mod n. The firing always goes A, B, C…: chamber k fires at seat
(rot + k) mod n. Spins change who the shots start with; only manipulations move bullets.
Pair k = chambers k and k+1 (mod n).
Round r starts at seat (r − 1) mod n and goes clockwise.

## Scoring and end
One roulette per match. Survivors +1, hit players 0. `ctx.end` after the end phase.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | — |
| bullets | number | 2 | 1–9, capped at players − 1 |

Costs (1/2/3/4/6), 16 credits and the max load of 3 are fixed (user choice).

## Dealer
Not used — private results live on each phone.

## Disconnects
After the 20 s grace: the player stays seated (still a target), their credits become 0 (they count
toward the trigger), and their turns pass on their own as "private action". A manipulation waiting
for its pair is lost. If the Host leaves during the tutorial, play starts.

## Tutorial and rules
Slides: 1 Como jogar (table demo) · 2 Investigar (investigation demo) · 3 Girar (spinning cylinder)
· 4 Manipular (charge meter + swap) · 5 A vez e o disparo (firing demo).
Rules: Visão geral → A mesa → Investigações → Giros → Manipulação → A vez e a rodada → O disparo →
Situações especiais → Pontuação e fim → Créditos. No hints.

## Credits
Adapted from "Russian Roulette", The Devil's Plan (O Jogo do Diabo), season 3, episode 5. See CREDITS.md.

## Remote players
Nothing differs.

## Edge cases
- 3 players: trigger 2, bullets capped at 2.
- Bullets = players − 1 with a single survivor possible.
- Loading past 6 loses the whole charge; exactly 6 swaps in the same turn.
- A player at 0 credits can only pass; a player with credits cannot pass.
- The trigger can be reached by a timeout outside the dropped player's turn: the firing starts at once.

## Defaults chosen
- Seat order random (the "ball draw"); chamber A faces seat 1 at the start.
- Investigation shows which chamber of the pair holds a bullet (user choice), only on phones and only
  for 8 s (user choice: temporary, nothing on the TV). A new investigation replaces the one on screen.
- Both spins public (user choice).
- Firing stops after the last bullet; remaining chambers are shown in the final reveal.
- No turn timer (user choice).
