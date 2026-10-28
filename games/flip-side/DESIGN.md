# Frente e Verso / Flip Side

## Pitch
Cada carta tem duas faces: a frente todos veem, o verso só você. Escolha o lado, aposte — ou jure que os dois lados vencem.
/ Every card has two faces: everyone sees the front, only you see the back. Pick a side and bet — or swear both sides win.

## Players
Exatamente 2 (duelo; a comparação é sempre "o seu lado contra o lado do rival"). ~15 minutos.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| back of each player's card | only its owner | owner's `playerView` (`myCard.back`) | end of the round (showdown **or** fold) — TV flips both cards |
| front of each card | everyone | `publicView.fronts`, both phones | dealt face up |
| side each player bets on | everyone | TV zones FRENTE / VERSO / AMBOS, both phones | the moment the player picks it (first action) |
| shoe order | nobody | — | never (no used-card history) |

The TV never shows a back before the reveal; the rival's phone never shows it either. Refusals leak
nothing: raise caps and the "Ambos" option depend only on public chips, levels and sides.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | 5 min safety net | Host finishes/skips | tutorial slide + demo | Host: Back/Next/Skip | — |
| bet | `turnSeconds`, 30 s per turn → automatic **Desistir** | a call after both picked a side, or a fold | table with FRONT/BACK zones per player, fronts, chips per zone, pot, turn + countdown, action log | your card (front + back), rival's front; on your turn: side (first action), Pagar/Passar, Aumentar (+stepper), Desistir | — |
| reveal | 8 s | — | both cards flip, compared faces, winner, pot, +10 bonus, tie carry | both cards + outcome | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{ type: 'call', side? }` | player on turn | bet; `side` required (and only allowed) on your first action; `'both'` only if the rival is not on both and you can cover 2× | match the rival's level. If the rival has not picked a side yet it is a check: the turn passes. Otherwise → reveal |
| `{ type: 'raise', by, side? }` | player on turn | bet; integer `1 ≤ by ≤ cap` (cap: what you and the rival can cover at your/their multiplier) | your level = rival's level + `by`; turn passes |
| `{ type: 'fold' }` | player on turn | bet | rival takes the pot; +10 bonus if the rival is on both sides → reveal |
| `{ type: 'intro', dir }` | Host | intro | tutorial navigation |
| `{ type: 'tvRules', page }` | Host | any | rules page on the TV |

Betting is by **level** (chips per side). A player on one side stakes `level`; on both sides,
`2 × level`. Before picking a side the ante counts as level 1 on one side.

## Scoring and end
Ante 1 each round. Showdown:
- both on one side: higher chosen face takes the pot; equal faces carry the pot to the next round
  (if that leaves someone with 0 chips, the carried pot is split back evenly);
- one player on both sides: wins only if **front and back are both strictly greater** than the
  rival's chosen face, otherwise the rival wins (no tie possible). A win on both sides — also by the
  rival folding — takes the pot plus **10 chips** from the rival (capped at their chips).
The match ends when a player has 0 chips, or after `rounds` rounds — unless a carried pot is pending
or the stacks are equal, then sudden-death rounds follow. `ctx.end`: winner 1, loser 0.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | |
| chips | number | 30 | 5–100, step 5 |
| rounds | number | 15 | 3–40 |
| turnSeconds | number | 30 | 15–90, step 5 |

## Dealer
Not used: the back is on its owner's phone.

## Disconnects
A player gone past the grace period loses at once (any phase): `ctx.end` with the other as winner.

## Tutorial and rules
Slides: 1 *Duas faces* (front public, back secret; demo: a card flipping) · 2 *Escolha o lado*
(FRONT/BACK zones; demo: the table with chips in a zone) · 3 *Sua vez* (Passar/Pagar/Aumentar/
Desistir; time out = fold; demo: the phone buttons) · 4 *Aposta dupla* (2×, strictly greater on
both, +10; demo: both-sides win) · 5 *A revelação* (tie carries the pot; demo: reveal).
Rules pages: Visão geral → As cartas → Escolher o lado → Ações → Aposta dupla → Empates → Fim e
pontuação → Créditos. No hints.

## Credits
Free adaptation of the mechanics of "Double Sided Poker", a game from the TV show *The Genius*
(tvN). Game rules are not copyrightable; name, text and art are original. See CREDITS.md.

## Remote players
Nothing differs: everything private is on the player's own phone.

## Edge cases
- Starter checks (Passar) → the rival must still pick a side; their call ends the betting.
- Only one player per round on both sides: if the starter picked Ambos, the rival gets Frente/Verso only.
- Ambos needs `2 × rival level` covered; otherwise the option is disabled.
- Raises are capped at what the rival can cover at their multiplier (1 if no side yet), so a call is never short.
- Time out = fold — including on the very first action; folding against Ambos pays the +10 bonus.
- Shoe runs out (200 cards = 100 rounds): reshuffled, the TV says so.
- Last round tied (carried pot) or equal stacks → sudden death, announced on the TV.

## Defaults chosen
- Each 50-card set = the 45 distinct number pairs once + 5 random pairs; which number is the front is random.
- Ante comes out of the stack; the carried pot joins the next pot.
- Round 1 starter drawn at random, then alternates.
- The first player may check ("Passar") at the ante — the platform needs both sides picked before a showdown.
- Reveal lasts 8 s. Raise payload is "by how much, per side, over the rival's level".
