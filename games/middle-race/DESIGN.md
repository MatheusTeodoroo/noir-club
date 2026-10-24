# Middle Race / Middle Race

## Pitch
Onze classes, uma corrida e um só objetivo: cruzar a chegada exatamente no meio. Empurre, puxe e
cale quem estiver no caminho.

## Players
Exactly 11 — one runner per class, and 6th is the middle. 30–60 minutes depending on timers.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Cards in each hand | that player | phone | never directly (discards are public; hand size is public) |
| Cards Delete removed (values) | that player | phone | never (count is public) |
| Card Delete let the target keep | Delete and the target | Delete's phone (prompt), target's phone (hand) | never directly |
| Swift's backward cards | Swift | Swift's phone | each one when played (TV narrates the direction) |
| Votes (who voted for whom) | the voter | phone | never — TV shows who voted and, at the tally, totals per candidate |
| Reaction choices in progress | the deciding player | phone prompt | the result, narrated on the TV |

Feedback leaks: invalid actions are silently ignored; phones only offer valid cards and targets,
which only use what that player already knows.

## Phases
| Phase | Ends by timer (setup key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | 5 min safety timer | Host taps through or skips; Host leaves | tutorial slide with a live demo | Host: Back / Next / Skip; others: follow the TV | — |
| setup | none | Host taps Start | rules + class guide | Host: settings; others: guide | — |
| read | readSec 90 (readOn) | every connected player tapped Ready | rules + class guide, ready count | guide + Ready | — |
| vote | voteSec 45 | every connected player voted | candidates (centre), voted ✓, picking order (bottom) | vote among candidates (self allowed) | — |
| voteResult | 6 s | — | totals, slots placed, ties | look at the TV | — |
| pick | pickSec 30 per pick | the chooser picked | classes with owners, order strip | chooser: free classes | — |
| strategy | stratSec 120 (stratOn) | everyone Ready and Swift chose | classes with owners | Ready; Swift picks 2 backward cards first | — |
| fast | pickSec (strategy off) | Swift chose | "Swift gets ready" | Swift picks 2 backward cards | — |
| race | turnSec 30 per turn, reactSec 15 per decision, 1.2 s per movement | — | top: name + rounds to break / round / timer; board; narration; live ranking | turn panel, reaction prompts, hand | — |
| pause | pauseSec 60, every pauseEvery 5 rounds (pauseOn) | everyone Ready | standings | Ready | — |
| final | 8 s | — | finishing order, points | look at the TV | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `intro {dir: 1 | -1 | "skip"}` | Host | intro | turns slides; past the last (or skip) → setup |
| `tvRules {page | null}` | Host | any phase; page < RULES.length | shows / hides a rules page on every TV |
| `setup {patch}` | Host | setup | changes settings (clamped) |
| `start` | Host | setup | read (or vote) |
| `ready` | anyone | read, strategy (Swift after choosing), pause | marks ready; all ready ends the phase |
| `vote {target}` | anyone, once per vote | vote; target is a candidate | ballot |
| `pick {cls}` | the chooser | pick; class free | takes the class; last player gets the leftover |
| `fastBack {cards}` | Swift | strategy/fast; 2 distinct of 1–4 | backward cards |
| `turn {card, double?, gravity?, silence?, leapReset?}` | turn's owner | awaiting the turn; checked by `validTurn` | plays the turn, runs reactions |
| `answer {value}` | prompt's owner | value in the prompt's options | resolves the reaction decision |

## Scoring and end
The race ends when at most one runner is left (it takes the last place). Points by race place:
6th 10; 5th/7th 7; 4th/8th 5; 3rd/9th 3; 2nd/10th 1; 1st/11th 0 (equal distance shares the rank).
`ctx.end` runs after the 8 s final screen.

## Config (Host settings)
Lobby (manifest): `tutorial` boolean, default on. Everything else in the in-game setup phase.

| key | type | default | range/options |
|---|---|---|---|
| columns | number | 32 | 16–48 |
| readOn / readSec | bool / number | on / 90 | 15–600 step 15 |
| voteSec | number | 45 | 15–180 step 5 |
| pickSec | number | 30 | 10–120 step 5 |
| stratOn / stratSec | bool / number | on / 120 | 30–900 step 30 |
| turnSec | number | 30 | 10–120 step 5 |
| reactSec | number | 15 | 5–60 step 5 |
| pauseOn / pauseEvery / pauseSec | bool / number / number | on / 5 / 60 | 1–20; 15–900 step 15 |

## Tutorial and rules
- **Tutorial** (lobby option `tutorial`, on by default): five slides before the Host's setup — how to play (ranking demo with 6th highlighted), the board (mini board), your turn (phone cards), chain reactions (A/B/C with the real classes), the match step by step. Host advances or skips; a 5-minute timer or the Host leaving moves on to the setup.
- **Rules reader**: 📖 Regras on every phone in every phase, 13 pages in `src/texts.ts` (overview, setup, vote, pick, cards, turn, reactions, start/finish/targets, classes 1–4/5–8/9–11, rounds/breaks/absences, scoring). The Host can show any page on the TV.
- **Hints**: during round 1 with the tutorial on, one line above the narration: whose turn, who is deciding, or the reaction order.

## Dealer
Not used: hands are casual private information kept on the phone.

## Disconnects
Platform pause first. After the grace period the player becomes automatic: their pick, Swift's
cards, turns (random card) and reaction decisions (random option) are made instantly; their votes
are simply missing and they no longer block Ready checks. If they reconnect they play again.

## Remote players
Nothing differs.

## Edge cases
- Votes repeat forever while a group stays fully tied (user decision); every connected player
  votes in every runoff; candidates only from the group.
- A turn timeout plays a random card, nothing else.
- Every movement is capped by the board (column 1 / last column). Reaching the last column
  leaves the race at once; no reactions run for a movement whose movers all finished.
- 50 movements per turn: the reaction system is cut and the TV narrates it.
- Non-consecutive rule (Gravity, Reset, Shove, Delete, Together, Mirror, Silence): if the only
  valid target is the last one picked, the activation is lost and the memory clears.

## Defaults chosen
- Round = one cycle of classes 1→11 still racing. Break when a round starting with number
  1 + k·pauseEvery begins (k ≥ 1).
- Every movement opens a nested reaction system (A: a "1" card discarded to move by a class other
  than One; B: movers that are Reset going back, or Delete/Mirror moved by another class, in class
  order; C: scan 1→11 for Shove, Together, Union). When a nested system ends, the outer one
  continues, and its C scan restarts from class 1. Reset/Delete/Mirror react only in B.
- "Moved by ability" = the cause is another class's ability (One's own move counts as an
  ability for others but not for itself).
- Mirror and Together use the distance actually travelled (after edge clamping).
- Leap: occupied columns do not count; the finish always counts. Card 0 = discard, no movement,
  no reactions.
- Delete picks the kept card among the target's hand only; a hand of 1 card loses nothing.
- Gravity and Silence are optional; Gravity chooses which card to discard. Silence's target is
  public; silence ends at Silence's next turn or when Silence finishes.
- One reacts everywhere, including the start column (user decision); from column 1 it can only go forward.
- Shove only offers directions that move the target (no backward push on column 1).
- Swift picks backward cards during strategy (or a short step of its own); timeout = random.
- Ties within the live ranking (same column) are broken by class number.
