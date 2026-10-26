# Cadeia Alimentar / Food Chain

## Pitch
Treze animais, quatro áreas, quatro rodadas: devore, esconda-se e cumpra o objetivo secreto do seu bicho.

## Players
Exactly 13 (one per animal; the Snake's goal of 10 dead and the quartet only work with the full
cast). About 20 minutes: opening ~1.5 min, then 4 × (90 s talk + 20 s move + 45 s hunt + 12 s dusk).

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Each player's animal | only that player | phone (tap-to-see card) | at their death (TV dusk), or the final reveal |
| Chameleon's disguise | the Chameleon | its phone card | never (peekers see it as if real) |
| Peek results | the peeker | their phone card | never |
| That someone was peeked at | nobody | — | never |
| Winner guesses (only the Crow's counts) | each guesser | their phone card | Crow's guess at the final reveal |
| Area choices in the move phase | the chooser | phone | start of the hunt (TV board) |
| Who ate whom during the hunt | living players in that area at that moment (attacker and victim included) | phone feed + card | never (TV shows victim, animal, area only) |
| A kill during the hunt | witnesses in that area | phone | dusk (TV); the TV board keeps showing the victim until then |
| Failed attacks (same/higher level, protected quartet) | nobody — not even the attacker | — | never |
| Death on the Snake | witnesses see "X attacked Y and died" | phone | TV shows it as a plain "eaten" |
| Hunger count | that predator | phone card | starvation death (TV dusk) |

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | 5 min safety | Host finishes/skips | tutorial slide + live demo | Host: Back/Next/Skip | — |
| role | setupSeconds, 30 s | everyone Ready (Chameleon by picking a disguise) | pyramid + seats with ✓ | card; Ready / disguise grid | — |
| peek | setupSeconds, 30 s | everyone peeked | pyramid + ✓ | pick 1 (or 2) players → Peek | — |
| guess | setupSeconds, 30 s | everyone guessed | pyramid + ✓ | pick a player (changeable) | — |
| talk | talkSeconds, 90 s | — | pyramid + seats, dead with animal | card | — |
| move | moveSeconds, 20 s | every living, active player chose | pyramid + ✓ (living) | 4 area buttons (disallowed greyed with reason) | — |
| hunt | attackSeconds, 45 s | — | 4 areas with everyone who started the hunt | targets in my area → Attack; live feed | — |
| dusk | 12 s | — | the round's dead: name, animal, area, eaten/starved | "look at the TV" | — |
| final | 40 s | Host taps "See scoreboard" | every animal, won/lost, Crow's bet | won/lost | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{type:'intro',dir}` | Host | intro | slide ±1 / start / skip |
| `{type:'tvRules',page}` | Host | any | rules page on the TV / clear |
| `{type:'ready'}` | non-Chameleon | role | marks ready |
| `{type:'disguise',animal}` | Chameleon | role, animal ≠ chameleon | sets disguise + ready |
| `{type:'peek',targets}` | anyone | peek, once, exactly 1 (Crow/Plover/Rat 2) distinct others | stores what they saw |
| `{type:'guess',target}` | anyone | guess, target ≠ self | stores guess (changeable) |
| `{type:'move',area}` | living player | move, area in options | stores choice (changeable) |
| `{type:'attack',target}` | living player | hunt, target alive in same area | Snake → attacker dies; lower level and not a protected quartet → target eaten, attacker fed; else nothing |
| `{type:'finish'}` | Host | final | ends the match now |

## Scoring and end
After round 4's dusk: survive-goals need the player alive; Hyena = Lion dead; Rat = Lion alive;
Plover = Crocodile alive; Snake = 10+ dead; Crow = its guess is among the other winners (checked
last). Dependants win even dead. Winner = 1 point, everyone else 0; ties are normal (many winners).
`ctx.end` after the final reveal (40 s or Host).

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | — |
| setupSeconds | number | 30 | 15–90 |
| talkSeconds | number | 90 | 30–300 |
| moveSeconds | number | 20 | 10–60 |
| attackSeconds | number | 45 | 20–120 |

## Dealer
Not used: every secret fits on the player's own phone behind a tap-to-see card.

## Disconnects
`onPlayerTimeout`: the player becomes **passive** — always in their habitat, never attacks, can be
eaten and still starves. Pending choices: no peek; the Chameleon's disguise is drawn at random at
the end of the role step; no guess (a passive Crow loses). "Everyone acted" checks skip passive
players. If they come back and act, they play normally again. Host leaving during the tutorial
starts the game.

## Tutorial and rules
Slides: 1 How to play (pyramid demo, credits) · 2 The opening (peek/disguise demo) · 3 The areas
(4 areas with home animals) · 4 The hunt (eats / nothing / attacker dies) · 5 Hunger and victory
(goal examples). Rules: Overview → The pyramid → The predators → The bottom of the pyramid → The
opening → Talk and move → The hunt → Dusk → Special situations → Scoring and end → Credits.
No hints (the TV instruction line covers each phase).

## Credits
Inspired by "Food Chain" from The Genius: Rule Breaker (tvN, 2014). Unofficial adaptation; art and
texts are original. See CREDITS.md.

## Remote players
Nothing differs (no Dealer). They need a TV or screen share to see the board.

## Edge cases
- Nobody acts: defaults move everyone home; predators starve on schedule (Lion R1, Croc/Eagle R2, Hyena R3).
- Several attacks: first come, first served; an eaten player can no longer attack.
- Lion's only death routes are the Snake and hunger, so its "eaten" death hints at the Snake — inherent.
- Quartet protection needs 2+ survivors, all in one area; a lone survivor is never protected.
- Chameleon peeked: peeker sees the disguise; the Chameleon is not told.
- Crow guessing a dead dependant who still wins: counts.

## Defaults chosen
- Round 1 move is free (asked: forcing home with a public board would reveal habitats).
- Secret card is tap-to-see and hides itself after 8 s (instead of press-and-hold).
- Everyone gives a "guess" so the Crow can't be spotted; only the Crow's counts.
- Talk phase ends only by timer; final reveal ends by 40 s timer or the Host.
- Dead players' phones show how they died and whether they can still win.
- Attack needs two taps (select target, then Attack) to avoid accidental Snake deaths.
- TV keeps eaten players on the hunt board until dusk so the TV never leaks a kill early.
