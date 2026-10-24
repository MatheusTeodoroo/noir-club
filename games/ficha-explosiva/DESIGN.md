# Ficha Explosiva / Loaded Chip

## Pitch
Duas famílias dividem o cassino em dois salões. A Família Ouro precisa manter o Chefão longe do
Assassino da Família Carmim — e, a cada rodada, os líderes trocam reféns entre os salões.

## Players
6–30 (as in the source game). Two physical rooms ("Salão A" and "Salão B") out of earshot of each
other. Estimated 10–20 minutes (3 rounds of 3/2/1 min, or 5 rounds of 5/4/3/2/1 with 11+).
Envoys (Embaixadores) do not count towards the player count used by the hostage table.

Source of the rules: the source game's rulebook, leader card and character guide; only what they
leave open is decided here (see "Defaults chosen"). All text, names and art are our own.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Each player's card (character, team, card colour) | that player | phone (tap to peek) or, in Dealer mode, the Dealer during the briefing and then the phone | final reveal; earlier to whoever it is shared/revealed with |
| Card shares (who shared with whom, and what they saw) | the two players | their phones ("Contatos") | final reveal (only the outcomes that matter) |
| Colour shares / colour reveals (11+ players) | the two players / the target | their phones | never as such |
| Private reveals (incl. Federal, Cobrador, Casamenteira, Intrigante, Leão-de-chácara powers) | the target(s) | their phones | never as such |
| Public reveals to a room (plain public reveal) | everyone in that room at that moment | their phones | final reveal |
| Permanent public reveals (Usurpador, Guarda, Vereador, Embaixador) | everyone | TV + phones | immediately |
| Conditions (apaixonado, odeia, tolo) | the holder (and the pair know each other) | own phone | final reveal |
| Usurp pointing in a room | that room | phones of that room | never on TV |
| Hostages chosen by a leader | that room (the leader announces them) | phones of that room | exchange (TV shows both rooms together) |
| Buried card | nobody | — | final reveal |
| Bêbado's set-aside ("sober") card | nobody, then whoever holds the Bêbado | that phone, at the start of the last round | final reveal |
| Who is infected / other conditions gained | the holder | own phone (with the card open) | final reveal |
| Pause announcements (Investigador, Apostador, Atirador) | everyone | TV | when announced |

Refusals that could leak: sharing is offered only with players in the same room, and the phone
never says *why* an offer failed beyond "recusou"/"expirou"; a Tirano accepts card shares
automatically (that is the rule — "tolo" — and the requester only sees "aceitou"). The TV shows
both rooms at once, so it never shows anything that only one room may know.

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| `intro` (`tutorial`, on) | 5 min safety net | Host taps the last "Próximo" or "Pular tutorial"; Host leaves | tutorial slide + live demo | Host: Anterior / Próximo / Pular; others: slide title | idle |
| `mesa` | none (Host-driven) | Host taps "Distribuir" | deck being built, player count, rounds, hostage table | Host toggles character groups / bury; others wait | idle |
| `briefing` | `briefingSeconds` (90) | everyone ready (phone mode) / everyone visited (Dealer mode) | rooms A/B rosters, Envoys, "vá para o seu salão e olhe sua carta" | peek card, "Pronto" (or "Ir ao Dealer") | the visitor's card |
| `round` (×3 or ×5) | round minutes (3/2/1 or 5/4/3/2/1; `timing`) | `timing = sem` only: both leaders locked | round x/y, clock, rooms, leaders, hostages to send, permanent reveals, whether each leader locked | nominate, point to usurp, abdicate, share / reveal, powers, leader picks + locks hostages | — |
| `exchange` | `exchangeSeconds` (30) | every connected hostage tapped "Cheguei" | both rooms' hostages, arrows, new rosters | hostages: "vá para o Salão B" + "Cheguei" | — |
| `pause` (steps 5 / 10 / 15) | 40 s per step | every chooser of the step chose | announcements in order | Investigador guesses the buried card; Apostador (and premature losers) predicts; Atirador shoots | — |
| `reveal` | 22 s | — | rooms side by side, cards flip, explosion, winners | own result | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{type:'toggleUnit', unit}` / `{type:'setBury', on}` / `{type:'preset', id}` / `{type:'deal'}` | Host | `mesa` | edits the deck / deals (only if valid) |
| `{type:'ready'}` | anyone | `briefing`, phone mode | marks ready |
| `{type:'nominate', target}` | room member | `round`, room has no leader, target in same room, not self | target becomes leader |
| `{type:'point', target\|null}` | room member | `round`, room has a leader | usurp pointing; > half the room (Vereador weight 2) on one player → new leader |
| `{type:'offerLead', target}` / `{type:'answerLead', accept}` | leader / target | `round`, same room, target ≠ the one who gave it this round | abdicate |
| `{type:'toggleHostage', target}` / `{type:'lockHostages'}` | leader | `round`, not locked, eligible target, exact count | choose / lock (final) |
| `{type:'request', to, kind:'card'\|'color'}` | anyone | `round`, same room, no open request, colour only 11+ | offer a share |
| `{type:'answer', id, accept}` / `{type:'cancel'}` | target / requester | open request | share happens (both see) / declined / withdrawn |
| `{type:'show', to, kind:'card'\|'color'}` | anyone | `round`, same room, colour only 11+ | one-way private reveal |
| `{type:'showRoom'}` | anyone | `round` | public reveal to the room |
| `{type:'power', ...}` | holder of a power | see character table | applies the power |
| `{type:'arrived'}` | hostage | `exchange` | ends exchange early when all arrived |
| `{type:'pauseChoice', value}` | Investigador / Apostador / Atirador | its pause step | locks the announcement |

## Characters
Basic: Chefão (Ouro, President), Assassino (Carmim, Bomber), Soldado Ouro, Soldado Carmim,
Apostador (Prata, Gambler). Advanced groups (each unit is toggled as a whole; "×2" = an Ouro and a
Carmim copy):

- **Reservas e fim de jogo:** Herdeiro (Ouro) + Braço Direito (Carmim) — backups when the Chefão /
  Assassino is buried; Investigador (Prata, Private Eye: guesses the buried card, pause 5);
  Atirador + Alvo + Isca (Prata, Sniper/Target/Decoy, pause 15); Enfermeira (Ouro) + Aprendiz
  (Carmim) — backups of Médico / Armeiro.
- **Objetivos por sala (Prata):** Afilhado / Devedor (with the Chefão / with the Assassino);
  Rival / Sobrevivente (away from the Chefão / from the Assassino); Duquesa / Abutre (away from
  both / with the Assassino but not the Chefão); Mordomo + Governanta (with each other and the
  Chefão); Bonnie + Clyde (with each other and the Assassino); Esposa + Amante (with the Chefão
  without the other); Credor + Caloteiro (the other with the Assassino, and you not); Habitué /
  Turista (never leave your first room / be a hostage in most rounds).
- **Poderes de compartilhar:** Médico (Ouro) + Armeiro (Carmim) — the Chefão / Assassino must
  card share with them or that team loses; Dinamite (Carmim) + Guarda-costas (Ouro) — card share
  with the Chefão / Assassino ends the game at once; Ficha Quente (Prata, Hot Potato: any share
  swaps cards; loses at the end); Federal ×2 (Agent: once per round force a card share); Cobrador
  ×2 (Enforcer: once per round make two others card share); Casamenteira (Carmim, Cupid) +
  Intrigante (Ouro, Eris) — once per game, two players fall in love / in hate; Infiltrado ×2
  (Spy: shows the other team's colour); Sombra + Sabotador (Prata, Clone/Robot); Corregedor
  (Prata, MI6: card share with the Chefão and the Assassino); Tirano (Prata, Nuclear Tyrant:
  "tolo", wins alone if the Chefão and the Assassino did not both card share with him);
  Boticário ×2 (Medic: card share clears conditions).
- **Liderança e sala:** Usurpador ×2 (permanent public reveal, become leader, not in the last
  round); Guarda ×2 (Security: permanent public reveal, a player of the room can't be a hostage
  this round); Vereador ×2 (Mayor: in an even room, public reveal → usurp vote counts 2 unless
  the other Vereador revealed too); Leão-de-chácara ×2 (Bouncer: in the bigger room, send a player
  to the other room; not in the last round); Mandachuva (Prata, Mastermind); Anarquista (Prata);
  Lacaio (Prata, Minion); Embaixador ×2 (Envoy: outside both rooms, immune, never leader,
  hostage, voter or target; announced on the TV).
- **Atuação (0.3.0, ×2 each):** Santo (Angel, starts "sincero"), Mentiroso (Demon, "mentiroso"),
  Vendado (Blind), Sorridente (Clown), Mudo (Mime), Fofoqueiro (Paparazzo).
- **Condições (0.3.0, ×2 each):** Tímido (Shy Guy, "tímido": no reveals at all), Recatado (Coy Boy,
  colour shares only), Paranoico (one voluntary card share per match), Terapeuta (Psychologist:
  shows its card; a player with a psych condition may accept a curing card share), Chantagista
  (Criminal → "tímido"), Trapaceiro (Dealer → "tolo"), Capanga (Thug → "recatado"), Mordaça (Mummy →
  "calado": no spoken powers), Golpista (Conman: an accepted colour share becomes mutual full
  reveals), Negociador ("esperto": card shares only), Intocável (Invincible/Immunologist: immune).
- **Caos (0.3.0):** Contagiado (Zombie, green: infection spreads through any share; the infected
  win if everyone standing is infected), Trevo da Sorte (Leprechaun, green, starts "tolo": any
  share swaps cards, never back to a former holder; the holder wins), Bêbado (Drunk: a card is set
  aside at the deal and swapped in at the start of the last round).

Condition rules: forced shares (Federal, Cobrador, Terapeuta) ignore conditions and don't use up
the paranoid's share; honest/liar and tolo vs tímido/recatado/paranoico cancel like love/hate; the
Boticário clears all; immune players never get any. The Contagiado can't be dealt with the
Intocável (mesa error).

Cross-cutting rules from the source: powers are mandatory; a share asked for and accepted must
happen (the app does it); a new card is a clean card (conditions cleared); "in love" + "in hate"
cancel; the backups only act when their character is buried; linked cards (Credor/Caloteiro,
Mordomo/Governanta, Bonnie/Clyde, Esposa/Amante, Atirador/Alvo/Isca) and Embaixadores are never
buried.

## Scoring and end
The game ends after the last exchange (or at once when Dinamite / Guarda-costas fire). Then the
pause steps (5 Investigador, 10 Apostador, 15 Atirador), then the reveal: everyone in the
Assassino's room (or the Dinamite's room / the Guarda-costas' room except the Chefão) is dead.
Ouro wins if the Chefão lives (and Médico shared, if in play); Carmim wins if the Chefão dies
(and Armeiro shared, if in play); both can lose. Each player who met their objective scores 1;
if the Tirano wins, only the Tirano scores. `ctx.end` after the reveal timer.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| `tutorial` | boolean | true | tutorial slides before the deck is built; first-round hints |
| `preset` | select | `classico` | `basico`, `classico`, `caos` (starting deck; refined in `mesa`) |
| `rounds` | select | `3` | `3`, `5` (5 only with 11+ players; otherwise 3) |
| `timing` | select | `padrao` | `padrao` (3/2/1 · 5/4/3/2/1), `tres` (all 3 min), `sem` (no clock) |
| `briefing` | select | `phone` | `phone`, `dealer` |
| `buryEven` | boolean | false | allow burying with an even count |
| `prematureLoss` | boolean | false | grey players already lost become Apostadores |
| `exchangeSeconds` | number | 30 | 15–90 |
| `briefingSeconds` | number | 90 | 30–300 |

Hostage table (leader card) — 3 rounds: 6–10: 1/1/1 · 11–13: 1/1/1 · 14–17: 2/1/1 ·
18–21: 2/1/1 · 22+: 3/2/1. 5 rounds: 11–13: 2/2/1/1/1 · 14–17: 3/2/2/1/1 · 18–21: 4/3/2/1/1 ·
22+: 5/4/3/2/1.

## Tutorial and rules
Tutorial (`src/texts.ts` `SLIDES`, in the `intro` phase before `mesa`; the Host advances it):
1. **Duas famílias** — the goal and how you lose; demo: the Chefão, Assassino, family and Apostador cards; credits line.
2. **Dois salões** — the halls, the hidden card on the phone, what the TV shows; demo: two halls with leaders.
3. **Converse e mostre** — card share with consent, appointing and pointing at leaders; demo: two players swapping cards.
4. **A rodada** — clock, leader locks hostages, exchange, reveal; demo: the four steps and the exploding hall.

Rules outline (`RULES`, 📖 on every phone, "Mostrar na TV" for the Host): Visão geral → Preparação →
As cartas → Líderes → Compartilhar e revelar → A rodada → A troca de reféns → Pausa e revelação →
Personagens (base, reservas, salões, compartilhar, liderança — generated from the card catalog, so
names match the cards) → Situações especiais → Pontuação e fim → Créditos.

Hints (round 1 while `tutorial` is on, in the TV's subtitle): `nominate` while a hall has no leader;
`share` otherwise; `lock` in the last minute while a hall has not locked.

## Credits
Mechanics of Two Rooms and a Boom (Alan Gerding & Sean McCoy, Tuesday Knight Games); no open
license, so only the rules are reused — see `CREDITS.md`. Credited on the first tutorial slide and
the last rules page.

## Dealer
Used only when `briefing = dealer`: during `briefing` each player may visit once to see their card
(then the card also lives on their phone). The Dealer closes when the briefing ends; remote
players see the card on their phone.

## Disconnects
A player who times out stays in the match as a "standing card": still in their room, still counted
at the end, may be picked as a hostage. Their open share requests and leadership offers are
cancelled; if they were leader the room's leadership becomes vacant (anyone may nominate). In
`mesa`, if the Host drops, deck building passes to the first connected player. In `briefing`,
`exchange` and `pause` they are skipped by the "everyone acted" checks.

## Remote players
Dealer view on their phone during the briefing. Nothing else differs (they must still be in one of
the two rooms through a call or screen share).

## Edge cases
- Round ends with no leader in a room → a random member becomes leader; unlocked hostages are
  completed at random among eligible players.
- A room with fewer eligible players than the count sends what it can.
- Leader bounced out or timing out → leadership vacant.
- Locked hostage tackled/bounced → impossible: Guarda can't target a locked hostage; a bounced
  hostage unlocks their old leader's choice.
- Usurp pointings are cleared after every leader change and every round.
- Clone ↔ Sabotador sharing first with each other → both lose; no share → lose.
- `timing = sem`: a round ends only when both leaders lock (a leader is always eventually present).

## Defaults chosen
- 3-round hostage table from the leader card (the rulebook's page 7 summary differs at 11–13).
- Odd count without burying → Apostador is added; if the Host already added the Apostador and one
  slot is left, a soldier of a random team fills it.
- Card shares are digital with consent, only within the same room (Embaixadores with anyone).
- Mayor's public reveal is permanent (shown on the TV) for simplicity.
- The card hides again whenever the phase changes (tap to peek); the power controls only show
  while the card is open.
- Dinamite / Guarda-costas still go through the pause steps before the reveal.
- Acting cards (Santo, Mentiroso, Vendado, Sorridente, Mudo, Fofoqueiro) only show their rule:
  the table enforces them. Recatado may not *show* its colour either (only colour share).
- The Bêbado's sober card is chosen among non-linked, non-Envoy cards, and swapped in by the app at
  the start of the last round (nothing to forget).
- Tolo auto-accepts card and colour shares the player's other conditions allow (the Tirano too).
- A refused share says only "recusou"; a player whose condition forbids accepting sees Accept
  disabled (in the physical game they would say so themselves).
