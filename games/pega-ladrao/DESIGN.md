# Pega Ladrão / Catch the Burglar

## Pitch
Dois salões, um ladrão escondido entre vocês. A cada noite cada salão manda alguém ao Terraço —
e quem dorme com o ladrão acorda mais pobre, sem saber.

## Players
7–12. Three physical rooms: **Salão Nobre** (big), **Salão Privé** (small) and, between them,
**o Terraço** (the exile room). Privé = max(3, round(n·3/8)), Nobre = the rest:
7→4/3, 8→5/3, 9→6/3, 10→6/4, 11→7/4, 12→7/5. Fewer than 7 leaves the Privé with one resident
after the exile, where the burglar could never steal. Estimated 40 minutes (10 rounds of 3 min).

Source: "Catch the Burglar", main match of The Genius: Rules of the Game, season 1, episode 6
(8 players, 5/3, 10 rounds, 10 minutes of day). See "Defaults chosen" for what we changed.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Who is the burglar | only the burglar | own phone, "segure para ver" (everyone has the same button) | final reveal |
| Each player's gold | nobody (the burglar included) | — | every 2 rounds as anonymous letters; by name at the final reveal |
| Each player's letter (A, B, C…, fixed all game) | nobody | — | final reveal |
| Whether a robbery happened tonight | nobody | — | only indirectly, through the counts |
| Votes in a salão (who voted for whom) | members of that salão | their phones | never on the TV |
| Which salão has already decided | everyone | TV ("decidido ✓") | live |
| The exiles | everyone (they walk to the Terraço) | TV | when the night starts |

Feedback that could leak: nothing on any screen says "you were robbed"; the burglar's phone looks
exactly like a resident's except inside the held role card; the TV never shows gold or letters
outside `contagem` / `final`. The public view carries no role, gold or letter map until `final`.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| `intro` (`tutorial`, on) | 5 min safety net | Host taps last "Próximo" / "Pular"; Host leaves | tutorial slide + live demo | Host: Anterior / Próximo / Pular | — |
| `papel` | 45 s | every connected player tapped "Pronto" | both salões' rosters, "vá para o seu salão" | hold to see role, "Pronto" | — |
| `dia` (×rounds) | `dayMinutes` (3) | both salões decided (unanimous vote of connected members) | round, clock, rosters, decided/voting per salão, counts so far | vote for a salão-mate (self allowed, changeable) | — |
| `noite` | `nightSeconds` (60) | — | the two exiles on the Terraço, "o ladrão age em silêncio" | exiles: "vá ao Terraço"; others: "fique no salão" | — |
| `troca` | 30 s | every connected exile tapped "Cheguei" | arrows: exile of Nobre → Privé and vice versa | exiles: "vá para o Salão X" + "Cheguei" | — |
| `contagem` (after even rounds but the last) | 15 s | — | letter → gold table, newest column highlighted | "olhe a TV" | — |
| `final` | 25 s | — | burglar revealed, letters → names, gold, winners/losers | own result | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{type:'intro', dir}` | Host | `intro` | slides / start |
| `{type:'tvRules', page\|null}` | Host | any | rules page on the TV |
| `{type:'ready'}` | anyone | `papel` | marks ready; all ready → `dia` |
| `{type:'vote', target}` | anyone | `dia`, own salão not decided, target in own salão | sets/changes vote; unanimity of connected members → salão decided |
| `{type:'arrived'}` | an exile | `troca` | marks arrival; all connected exiles → next |

## Scoring and end
Each night (unless the burglar is an exile) every resident left in the burglar's salão loses 1
gold and the burglar gains the same total. After the last `troca` the salão holding the burglar
loses. Winners: the resident(s) with most gold in the winning salão. Losers: the resident(s) with
least gold in the losing salão (the burglar does not count). The burglar co-wins only with
strictly more gold than every other player; otherwise co-loses. Ties share.
Points: winners 3, other members of the winning salão 1, the losing salão 0. `ctx.end` when the
`final` timer runs out.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| `tutorial` | boolean | true | tutorial + first-day hints |
| `rounds` | select | `10` | `6`, `8`, `10` |
| `dayMinutes` | select | `3` | `2`, `3`, `5`, `10` |
| `nightSeconds` | number | 60 | 30–180, step 15 |

## Dealer
Not used: the role is a held card on the phone, the same gesture for everyone.

## Disconnects
`onPlayerTimeout`: `papel` — no longer awaited. `dia` — their vote is dropped and they don't count
for unanimity (they can still be exiled). `noite` — nothing. `troca` — not awaited; an exiled
player moves salão anyway. Host during `intro` → the game starts.

## Tutorial and rules
Slides: 1 **Dois salões e um ladrão** (goal, gold, credits; demo: two salões + Terraço with
avatars) · 2 **O dia** (vote, unanimity, majority; demo: phone vote list) · 3 **A noite** (robbery
math; demo: Nobre 3 villagers −1, burglar +3) · 4 **A troca e a contagem** (swap, letter table;
demo: letter table) · 5 **Fim** (who wins/loses, burglar strictly richest).
Rules: Visão geral → Os salões → Seu papel e o ouro → O dia: exílio → A noite: roubo → A troca →
A contagem → Situações especiais → Pontuação e fim → Créditos.
Hints (round 1, `tutorial` on): `vote` until anyone has voted; `unanimous` once any vote exists.

## Credits
Rules of "Catch the Burglar" (The Genius: Rules of the Game, tvN / CJ E&M, 2013). Only the
mechanics are reused; names, text and art are our own. See `CREDITS.md`.

## Remote players
They belong to a salão and the group arranges one call per room. With the Host's **remote
screens** on, `playerSpace` tells each phone where to be: its salão; at night the two exiles go to
the Terrace; in the swap each exile is already sent to the other salão. Off, nothing changes.

## Edge cases
- Nobody votes → random member of the salão is exiled. Tie → random among the tied.
- A decided salão cannot change its vote.
- The burglar exiled → no robbery that night.
- A resident at 0 gold cannot lose more (cannot happen with 10 rounds, kept as a guard).
- Burglar ties for most gold → not a winner.
- Disconnected exiles: `troca` doesn't wait for them.

## Defaults chosen
7–12 players with proportional salões; 10 rounds of 3 min (Host: 6/8/10 rounds, 2/3/5/10 min);
night 60 s; swap 30 s; counts after rounds 2, 4, 6, 8 with fixed letters nobody knows; nobody sees
their own gold; role on the phone; points 3/1/0; theme names (Salão Nobre, Salão Privé, Terraço).
