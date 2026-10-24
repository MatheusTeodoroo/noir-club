# Duvido! / I Doubt It!

## Pitch
Uma pergunta com resposta em número e palpites cada vez maiores. Quando alguém exagerar, grite DUVIDO! —
quem errar leva a carta, e quem juntar mais cartas perde.

## Players
3–16. Three is the smallest table where a turn order and a doubt make sense; at 16 a lap is still quick
because each turn is one number. About 1 minute per round, ~15 minutes for the default 10 rounds.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| The round's answer | nobody | private state only (`question` indexes the logic-only bank) | reveal (`publicView.result.answer`) |
| Questions not yet played | nobody | logic-only bank (`src/questions/`) | never (only the drawn one, without its answer) |

Feedback leaks: none. Invalid actions are ignored silently; refusing a guess never depends on the answer.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro (only with `tutorial`) | 5 min safety net | the Host taps Start on the last slide, or Skip; or the Host leaves | tutorial slide with a live demo drawn from the game's pieces | Host: Back / Next / Skip; others: slide title | — |
| category | `turnSeconds` 0 = none; if set, a category is drawn for the starter | the starter picks | the drawn categories, who picks | starter: pick 1 of up to `categoryChoices`; others wait | — |
| guess | `turnSeconds` 0 = none; if set: opening guess becomes 1, later turns doubt | someone doubts | question, "answer in {unit}", the last guess huge, the turn tape | player on turn: keypad + Guess, or DUVIDO!; others see the last guess | — |
| reveal | `revealSeconds` 7 + 2.3 s drumroll | — | the answer after the drumroll, who takes the card, Dobrei chips | after the drumroll: the answer and own result | — |

Skipped phase: with only one category with unused questions left, it is picked automatically.

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `category {index}` | starter | category phase, index in options | draws an unused question from it → guess |
| `guess {value}` | player on turn | guess phase, integer 0…999 999 999 999, above the last guess | records it (Dobrei flag), turn passes to the next connected seat |
| `doubt` | player on turn | guess phase, at least one guess | reveal: guess > answer → guesser takes the card, else the doubter |
| `intro {dir: 1 \| -1 \| 'skip'}` | Host | intro phase | next / previous slide; next on the last slide or skip starts round 1 |
| `tvRules {page \| null}` | Host | any phase, page within `RULES` | shows that rules page over the TV, or clears it |

## Scoring and end
- Each card is −1 point; with Dobrei! each chip cancels one card (score never above 0). Ties stay ties.
- Dobrei!: a guess ≥ 2× the previous one (previous > 0) earns a chip at the reveal, unless that very guess
  was doubted and was over the answer.
- The doubter opens the next round.
- `endMode` "rounds": `ctx.end` after round `rounds`. `endMode` "cards": after the reveal in which someone
  reaches `cardLimit` cards. Either way the match also ends if the question bank runs out.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | tutorial slides before round 1 + first-round hints |
| endMode | select | rounds | rounds, cards |
| cardLimit | number | 3 | 1–20 (cards mode) |
| rounds | number | 10 | 1–30 (rounds mode) |
| categoryChoices | number | 5 | 2–8 |
| turnSeconds | number | 0 | 0–120 step 5; 0 = no limit |
| dobrei | boolean | false | |
| revealSeconds | number | 7 | 4–20 |

## Tutorial and rules
Texts in `src/texts.ts` (PT-BR + EN). Tutorial, 5 slides, each with a live demo: How to play
(question + "?") → The category (drawn categories, one picked) → Guesses (turn strip with rising
guesses, looping) → I DOUBT IT! (answer, verdict, who takes the card) → Who loses (card counts).
Rules, 7 pages: Overview → Order and category → Guess → I DOUBT IT! → Doubled! (optional) → Time
and absences → Scoring and end, plus credits. 📖 Rules on every phone screen; the Host can show a
page on the TV over any phase. Hints during round 1 (tutorial on), derived from state: category,
open, raise. Credits: inspired by Nem a Pato! (Rodrigo Rego, Grok Games) — line on the first slide,
the last rules page, CREDITS.md.

## Dealer
Not used: nothing is private to one player.

## Disconnects
- Intro: if the Host times out, round 1 starts; an opener who dropped hands the opening to the next seat.
- A dropped player keeps their cards and is skipped in the turn order (seat order checks `connected`).
- If it was their turn: the next connected seat takes it; if no guess had been made yet, that player
  becomes the starter.
- A doubter who dropped before the next round: the next connected seat after them opens.
- Fewer than 2 connected players: the match ends.

## Remote players
Nothing differs.

## Edge cases
- Nobody acts with no turn limit: the game waits (by request); the Host can set `turnSeconds`.
- A guess equal to the answer survives a doubt.
- The opener cannot be doubted before they guess; a player never doubts their own guess (turn moves on).
- 16 players: the TV turn tape shows 9 seats centred on the player on turn, edges fading out.

## Defaults chosen
- Opening guess may be 0; a timed-out opener guesses 1.
- Category choice and the turn share `turnSeconds`.
- Questions never repeat within a match; the bank is chosen per match (not tracked across matches).
- Without "Quer apostar?" and "Na mosca!" (left out by request).
