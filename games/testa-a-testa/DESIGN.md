# Testa a Testa / Browbeat

## Pitch
Um duelo de pôquer em que você vê a carta do rival, mas nunca a sua. Aposte, blefe — e não fuja com um 10 na testa.
/ A poker duel where you see your rival's card but never your own. Bet, bluff — and never fold with a 10 on your brow.

## Players
Exatamente 2 (duelo frente a frente, como no jogo tradicional de "carta na testa"). ~10 minutos.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| each player's card this round | only the rival | rival's `playerView` (`rivalCard`) | end of the round (showdown **or** fold) — TV reveals both |
| remaining deck order | nobody | — | never (the TV lists the cards already used) |

The TV never shows a card of the current round before the reveal. A phone never shows its own card
before the reveal. Refusals leak nothing: the raise limits depend only on public chip counts.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro | 5 min safety net | Host finishes/skips | tutorial slide + demo | Host: Back/Next/Skip | — |
| bet | `turnSeconds`, 30 s per turn → auto **Pagar** | a call or a fold | stacks, bets, pot, whose turn + countdown, action log, used cards | rival's card; on your turn Pagar / Aumentar (+stepper) / Desistir | — |
| reveal | 8 s | — | drumroll → both cards flip, winner, pot, 10-penalty, tie carry | both cards + outcome | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{ type: 'call' }` | player whose turn it is | bet | match the rival's bet (all-in if short) → reveal |
| `{ type: 'raise', by }` | player whose turn it is | bet; integer `1 ≤ by ≤ min(chips after matching, rival's chips)` | your bet = rival's bet + `by`; turn passes |
| `{ type: 'fold' }` | player whose turn it is | bet | rival takes the pot; folding with a 10 pays a 10-chip penalty (capped at your chips) → reveal |
| `{ type: 'intro', dir }` | Host | intro | tutorial navigation |
| `{ type: 'tvRules', page }` | Host | any | rules page on the TV |

## Scoring and end
Ante 1 each round. Higher card at the showdown takes the pot (bets + carried pot). Equal cards: the
pot carries to the next round; if that leaves someone with 0 chips, the carried pot is split back
evenly (bets are always equal at a showdown). The match ends when a player has 0 chips, or after
`rounds` rounds — unless a carried pot is pending or the stacks are equal, then sudden-death rounds
are played until neither is true. `ctx.end`: winner 1, loser 0.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | |
| chips | number | 20 | 5–100, step 5 |
| rounds | number | 10 | 3–30 |
| turnSeconds | number | 30 | 15–90, step 5 |

## Dealer
Not used: each card is seen on the rival's phone.

## Disconnects
A player gone past the grace period loses at once (any phase): `ctx.end` with the other as winner.

## Tutorial and rules
Slides: 1 *Como jogar* (duel, see the rival's card, never yours; demo: two phones, each showing the
other's card) · 2 *O que você vê* (TV board: chips, pot, used cards; demo: board) · 3 *Sua vez*
(Pagar / Aumentar / Desistir; demo: the three buttons) · 4 *A rodada* (ante → bets → reveal; tie
carries; fold with a 10 pays 10; demo: reveal with a carried pot).
Rules pages: Visão geral → O baralho → Ações → A rodada → Empates e multa do 10 → Fim e pontuação → Créditos.
No hints.

## Credits
Adaptation of the traditional folk game known as *Blind Man's Bluff* / "Indian Poker" (public
domain card game; rules are not copyrighted). See CREDITS.md.

## Remote players
Nothing differs: the rival's card is on their phone either way.

## Edge cases
- Starter calls the ante right away → immediate showdown (a "check").
- Raises are capped at what the rival can cover, so a call is never short (the code still clamps).
- A player with 0 chips after matching cannot raise (only Pagar / Desistir).
- Folding with a 10 and fewer than 10 chips: pays everything → may lose.
- Deck runs out after 10 rounds (20 cards): it is reshuffled and the used list clears; the TV says so.
- Last round tied (carried pot) or equal stacks → sudden death, announced on the TV.

## Defaults chosen
- Ante comes out of the stack; the carried pot is added to the next pot, no new money.
- Round 1 starter drawn at random, then alternates (sudden death included).
- Turn timeout = automatic **Pagar**.
- Reveal lasts 8 s.
- Raise payload is "by how much over the rival's bet".
