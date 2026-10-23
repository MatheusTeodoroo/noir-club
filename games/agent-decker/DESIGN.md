# Agent Decker / Agent Decker

Digital adaptation of **Agent Decker**, a solo deckbuilding game by Manuel Correia
(gamesbymanuel.com), licensed CC BY-NC 4.0. See `CREDITS.md`.

## Pitch
Agente secreto recém-formado: monte seu baralho, passe por guardas e câmeras sem disparar o
alarme e complete as 5 missões da campanha. Jogo solo de construção de baralho.

## Players
Exactly 1 (`minPlayers = maxPlayers = 1`): the original is solo. Anyone else in the house watches
the TV (late joiners become spectators). ~20 minutes per mission, 1–5 missions per match.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Order of the agent's deck | nobody | never (only the count) | never |
| Order of the obstacle deck | nobody | never (only the count) | never |
| Top cards seen with Plan Ahead / Foresight, the deck searched by Just the Thing | the agent | phone (`playerView.pending`) | never (the TV shows that the agent is looking) |
| Identity of knocked-out cards | — | shown as card backs | when flipped back up (Inspector) or reshuffled |

The hand, discard, play area, equip area, pool, line and alarm are public (it is a solo game;
spectators watch the TV).

## Phases
| Phase | Ends by timer | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| `intro` | none | agent taps Começar / Pular | credits, then the "Como jogar" slides, then the Mission One briefing | next / previous / skip | — |
| `play` (one turn) | `turnSeconds` (0 = off, default) → ends the turn | agent taps Fim do turno | line, alarm, mission goal, hand, piles, equip area, hints | play cards, interact, equip, resolve choices, undo, end turn | — |
| `mission` | none | agent taps Continuar | mission complete, alarm, reward, next goal | continue | — |
| `over` | `end` 60 s | agent taps Ver placar | won / lost, alarm per mission, total | finish | — |

The end of the turn runs in one step, as the rulebook orders it: Mission Check → Line Scroll →
Card Refresh.

## Actions
| Action payload | Valid when | Effect |
|---|---|---|
| `intro` `{dir: 1 \| -1 \| 'skip'}` | `intro` | change slide / start |
| `play` `{uid, opt?: 'fight' \| 'draw'}` | `play`, no pending choice, card in hand, card has a top effect or resource | resource to the pool and/or effect; card to Play Area (Bazooka / Optic Camouflage to the obstacles discard) |
| `equip` `{uid}` | `play`, no pending, KEEP item in hand | moves it to the Equip Area |
| `interact` `{slot, mode: 'disarm' \| 'knock' \| 'adjacent', target?, equip?, stealth?, item?}` | `play`, no pending, interactions left, face-up card, not blocked (Hawk, Sniper), cost affordable (or matching item) | pay, then disarm (Play Area or Equip) / knock out / Clumsy Guard's adjacent knock-out; Flammable Barrel knocks out neighbours |
| `resolve` `{uids?, slot?, order?, keep?}` | a pending choice exists | resolves Bin, Burn, Recall, Plan Ahead, Foresight, Just the Thing, Distraction, Save Bullets, Misdirect |
| `undo` | undo stack not empty | returns the last resource-only card to the hand |
| `endTurn` | `play` | mission check, scroll, refresh |
| `continue` | `mission` | next mission turn |
| `finish` | `over` | `ctx.end` |
| `tvRules` `{page: number \| null}` | any | show / hide a rules page on the TV |

## Scoring and end
Each completed mission scores `50 − alarm when it was completed` (0–50). The match ends when the
configured number of missions is completed (victory), or with Game Over when the alarm reaches 50
or the obstacles can't refill the line. Points of missions already completed are kept. The final
screen also shows the original's "total alarm" high score.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| `missions` | number | 5 | 1–5 |
| `tutorial` | boolean | true | "Como jogar" slides + guided hints in Mission One's first turns |
| `turnSeconds` | number | 0 | 0–300, step 30 (0 = no limit) |

## Dealer
Not used.

## Disconnects
The platform pauses the game; if the agent doesn't come back, `onPlayerTimeout` ends the match
with the points of the missions already completed.

## Remote players
Nothing differs.

## Edge cases
- Deck empty when drawing: shuffle the discard into the deck (also for obstacles). Line can't be
  refilled after that: Game Over (out of time).
- Plan Ahead / Foresight with fewer cards in the deck: look at what is there.
- Turn timer runs out with a pending choice: the choice is dropped (as "choose nothing").

## Defaults chosen (rules always follow the printed rulebook and cards)
- TV is the board, phone holds the hand and a compact line; no Dealer.
- Line Scroll: the rightmost card present leaves (alarm if face up), the rest slide right closing
  gaps, new cards come in from the left. Inspector acts first; Patrolling Guard then swaps with
  the card to its right; Dormitory keeps face-down cards in place.
- Guard Dog slides towards the nearest face-up person (to its right first, as in the rulebook
  example) until adjacent. Radio Tower gathers every face-up person next to it.
- Mission goals are paid with resources left in the pool at the Mission Check; item requirements
  mean the item is equipped; this is not an interaction.
- Equipped resource items (Map, Guard Uniform, Prisoner) add their resource at the start of every
  turn. Keycard / Chloroform / E.M.P. are tapped in the Equip Area to interact for free (counts as
  an interaction) and go to the agent's discard.
- When a mission is completed the hand also returns to the deck before the new shuffle.
- Undo: resource-only plays can be undone until something is spent.
- Card names are translated in PT rooms and printed as in the original in EN rooms.
- Gear Up! counts every card in the Equip Area with the KEEP stamp (items, Map, Mission Two's
  New Rule).
