# Corte da Minoria / Minority Court

## Pitch
Uma cor secreta, dois salões e um trono que passa por todos: pontue sendo a minoria do salão
para onde o rei te mandar. / One secret colour, two halls and a throne everyone takes a turn on:
score by being the minority of the hall the king sends you to.

## Players
5–15. Five is the least that still leaves the king a real split (2/3) with secrets to guess; 15
still fits the TV board. Rounds = players (everyone reigns once), ~1.5 min per round: 8–25 min.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| each player's colour (Azul/Verde) | only that player | phone (hold to see) — or, in Dealer mode, only the Dealer screen during their visit | final reveal |
| each player's vote for the first king | only the voter | their phone | never (the TV shows the tally per candidate, not who voted whom) |
| each player's points | only that player | their phone (own total, "you scored" at each reveal) | final reveal |
| who scored in a round | each player for themselves | their phone | final reveal (the TV only shows the colour counts per hall) |

Feedback leaks: none — no action is refused for a reason tied to a secret.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | `intro` 5 min safety | Host finishes/skips | tutorial slide + live demo | Host: Back/Next/Skip | — |
| election | `electionSeconds` 45 s | every active player voted | candidates, who voted ✓ | secret vote, self allowed | — |
| runoff | `electionSeconds` | every active player voted | tied candidates + first tally | vote among the tied | — |
| crown | 6 s | — | the new king (♛) and how (vote, draw, heir) | "you are king" / wait | — |
| color (round 1, 3, 5…) | `colorSeconds` 30 s (phone) / `dealerColorSeconds` 300 s (Dealer) | every active player chose | who has chosen ✓ | phone: Azul/Verde (round 1) or Manter/Trocar; Dealer mode: visit, then pick | the visitor's current colour |
| divide | `divideSeconds` 120 s | king confirms (all placed, ≥2 per hall) | the king's split, live | king: A/B per player + Confirmar; others: where they stand | — |
| pass | `passSeconds` 20 s (skipped if no active player holds a pass) | every active pass holder tapped Pronto | live moves, who used a pass | Usar Passe Real / Pronto | — |
| reveal | `revealSeconds` 8 s (+2.5 s drumroll) | — | counts per hall, minority colour or "empate" | "you scored +1" or not, own total | — |
| successor | `successorSeconds` 30 s (skipped in the last round) | king picks | who may still reign | king: pick an heir | — |
| final | 25 s | — | every player × round: colour, hall, point; totals | own total | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{type:'intro', dir}` | Host | intro | slide ±1, start, skip |
| `{type:'tvRules', page}` | Host | any | rules page on the TV / clear |
| `{type:'vote', target}` | active player | election/runoff, target an active candidate | sets (or changes) their vote |
| `{type:'color', color}` | active player | color; phone mode, or Dealer mode while inside the Dealer | sets their colour, marks them done (Dealer: releases them) |
| `{type:'place', target, space}` | king | divide, target active, space `A`/`B`/null | moves target in the draft split |
| `{type:'confirm'}` | king | divide, all active placed, ≥2 in each hall | ends the split |
| `{type:'pass'}` | active player | pass, own pass unused | flips their hall, pass spent (public) |
| `{type:'ready'}` | active player | pass | marks them ready |
| `{type:'heir', target}` | king | successor, target active and never reigned | crowns target |

## Scoring and end
Per hall, after the passes: if both colours are present and their counts differ, every player of
the smaller colour scores +1. Ties, a single colour, a lone player or an empty hall → nobody in
that hall scores. After the last king's round (or as soon as fewer than 4 players remain) the
final phase shows the full history, then `ctx.end({ scores })` with each player's points;
equal totals share a place (platform ranking).

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | |
| colorMode | select | phone | phone / dealer |
| electionSeconds | number | 45 | 20–120 step 5 |
| colorSeconds | number | 30 | 10–120 step 5 |
| dealerColorSeconds | number | 300 | 60–900 step 30 |
| divideSeconds | number | 120 | 30–300 step 10 |
| passSeconds | number | 20 | 10–60 step 5 |
| revealSeconds | number | 8 | 5–30 |
| successorSeconds | number | 30 | 10–120 step 5 |

## Dealer
Used only with `colorMode: dealer`. During every color phase each active player who hasn't chosen
may queue (visits are mandatory: the phase only ends early when everyone has been). Inside, the
Dealer screen shows the visitor's current colour (or "none yet") and the phone shows Azul / Verde;
one tap sets the colour and releases them. Leaving without choosing: keep the colour (random in
round 1). The Dealer closes when the phase ends. Phone mode: never visited.

## Disconnects
A timed-out player leaves the match: removed from both halls, from the throne line and from every
"everyone acted" check; their votes (and votes for them) vanish; their points stay for the
ranking. If they were king, the timers finish their job at random (split completed at random,
heir drawn at random). Fewer than 4 active players → straight to the final phase.

## Tutorial and rules
Slides: 1 Como jogar (goal, credits; demo `court`: two halls of hidden colours) · 2 Sua cor
secreta (demo `colors`) · 3 O rei divide (demo `divide`: king placing players) · 4 Passe Real
(demo `pass`: one player crossing) · 5 Quem pontua (demo `score`: 4 Azul × 3 Verde → Verde +1).
Rules: Visão geral → Peças → Eleição → A rodada → Passe Real → Pontuação → Situações especiais →
Fim da partida (+ credits). Hints: none (the TV instruction line already says what to do now).

## Credits
Adapted from "King Game", The Genius: Rule Breaker (season 2), episode 3 (tvN, 2014). Unofficial version; rules
re-written; see CREDITS.md.

## Remote players
Nothing beyond the platform default (Dealer view on their phone in Dealer mode).

## Edge cases
- Election tie → runoff among the tied (everyone votes); tie again (or no votes) → random among them.
- Divide timeout → the unplaced go to random halls; if a hall still has fewer than 2, random
  players move from the other hall until both have 2.
- Passes may leave a hall with fewer than 2 (or empty); such a hall scores nobody.
- Nobody holds a pass → pass phase skipped.
- Colour window timeout → keep (round 1: random).
- A player at the Dealer when the colour phase ends → released, the phase resolves as above.
- 15 players → the final grid shrinks its rows to fit.

## Defaults chosen
Names (Corte da Minoria, Passe Real), the crown phase between kings, timings above, reveal shows
the minority colour next to the counts, departed players removed from the throne line, early end
under 4 players, no Rive animation in 0.1.0.
