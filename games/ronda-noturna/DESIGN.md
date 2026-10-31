# Ronda Noturna / Night Watch

## Pitch
Dois ladrões invisíveis roubam estrelas pela cidade; três equipes de polícia os caçam — e duas
delas escondem um policial corrupto.

## Players
10–14. Two thieves, the rest police split as evenly as possible into red, blue and green
(3/3/2 up to 4/4/4); two corrupt cops, never two in the same team. Needs five spaces: a hall
and four isolated rooms (thieves, red, blue, green). Estimated 60–120 minutes (15 rounds).

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Star locations | thieves | Dealer (always); thieves' phones during the thieves' turn | never (stars are taken) |
| Thieves' positions | thieves | Dealer (always); thieves' phones during their turn or while holding "segure" | arrest (that thief) / end of match |
| Thieves' paths each round | thieves | Dealer; thieves' phones inside "segure" (secret log) | end (positions) |
| Where each thief starts / ends each move (the stop only) | corrupt cops | corrupt phones inside "segure" (secret log) — nowhere else | end (positions) |
| Stars held | thieves | Dealer; thieves' phones inside "segure" | every `revealEvery` rounds (count only); end |
| Who is corrupt | corrupt cops (both), thieves | briefing (phone inside "segure", or Dealer visit); phones inside "segure"; thieves' Dealer board | end of match |
| Investigation result | the investigating cop | their phone inside "segure" | never |
| Votes | each voter | their phone | end (only each team's decision) |
| Cop positions, teams, who is a thief, turn order | everyone | TV, phones | always |

Refusals that could leak: a corrupt cop's arrest is logged exactly like a miss; a thief's
refused start on a star cannot happen on the phone (stars aren't selectable); the corrupt's
public log is identical to an honest cop's (test: "honest cops see only public moves").

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| intro (only with `tutorial`) | 5 min safety net | the Host taps Start on the last slide, or Skip; or the Host leaves | tutorial slide with a live demo | Host: Back / Next / Skip; others: slide title | nothing |
| briefing | `briefingSeconds`, 60 (Dealer mode: at least 40 s per player) | every connected player tapped Ready / visited the Dealer | teams, turn orders, who is done (no map yet) | own team and order; role behind "segure" + Ready (phone mode), or "go to the Dealer" (Dealer mode) | Dealer mode: the visitor's role card; otherwise waiting |
| placing | none (user's choice) | everyone placed | who is placing, cops' pawns | place pawn on the map (cops by rank across squads: Red 1, Blue 1, Green 1, Red 2…; then the thieves) | stars, gang |
| intermission | 10 s (14 s after a reveal) | — | "Up next: X — X to your room" (+ star-count reveal) | who is next | idem |
| thieves | `thiefMinutes`, 3 | both moved | "Thieves move" | thief taps up to 2 stops / stays | stars, gang, log |
| cops (×3 per round, order rotates R-B-G / B-G-R / G-R-B) | `copMinutes`, 5 per team | every member acted or passed | team, actor, actions left, log | 2 actions: move 0–1 + investigate or arrest; pass | cops' moves |
| vote (after `maxRounds`) | 3 min | every connected cop voted | teams with ✓ | vote a teammate or "nobody" | — |
| over | 16 s | — | winner, thieves' stops, corrupt cops, verdicts | "look at the TV" | final board |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `{type:'intro', dir}` | Host | intro | previous / next slide; next on the last or `'skip'` → briefing |
| `{type:'tvRules', page}` | Host | any phase; `page` a real rules page or null | shows that rules page over the TV, or clears it |
| `{type:'ready'}` | anyone | briefing in phone mode, once | marks them done; all done → placing |
| `{type:'place', node}` | placer | placing, own turn; thieves not on a star | pawn placed; thieves mark the trail |
| `{type:'move', path}` | thief | thieves' phase, own turn; 0–2 adjacent steps | trail marked, stars on the path collected, 15 → thieves win |
| `{type:'act', kind, node}` | cop | own turn, actions left, node = own or adjacent | move, then investigate (private yes/no: has a thief ever stepped here) or arrest |
| `{type:'pass'}` | cop | own turn | ends their turn |
| `{type:'vote', target}` | cop | vote phase; teammate (not self) or 'none' | records / changes the vote |

## Scoring and end
- Thieves reach `starGoal` (15) → thieves + corrupt win at once.
- Both thieves arrested → honest cops win at once. An arrest catches every free thief on the
  stop; the arrested thief's stars are lost and hidden again on free stops (not on a star or a
  free thief); the team still needs the full goal.
- `maxRounds` reached → each team votes. A name needs a strict plurality; "nobody" only counts if
  every counted voter chose it; ties / no votes are wrong. The corrupt cop's own vote is shown and
  accepted but **not counted** (otherwise a corrupt in a two-cop team always forces a tie). All
  three teams right → honest cops win; otherwise thieves + corrupt win.
- Winners get 3 points each, losers 0.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|
| tutorial | boolean | true | tutorial slides before the briefing + first-round hints |
| briefing | select | phone | phone (hold to see + Ready) / dealer (one visit each) |
| briefingSeconds | number | 60 | 20–300 (Dealer mode: at least 40 s × players) |
| maxRounds | select | 15 | none, 10, 15, 20, 25 |
| thiefMinutes | number | 3 | 1–5 |
| copMinutes | number | 5 | 2–8 |
| totalStars | number | 28 | 15–40 |
| starGoal | number | 15 | 5–30 (capped at totalStars) |
| revealEvery | number | 5 | 2–10 |
| map | select | random fixed | 5 fixed maps (150/170/190/210/230 stops) or "generate a new map" |
| genSize | number | 190 | 150–230, step 10 |

## Tutorial and rules
Texts in `src/texts.ts` (PT-BR and EN). Tutorial slides, before the role briefing:
1. **How to play** — two thieves vs three squads, two crooked cops; how each side wins. Demo: the
   sides drawn as map pawns.
2. **Each side in its own room** — rooms, hall, the Dealer in the thieves' room. Demo: floor plan.
3. **The map** — numbered stops, one step per line, public police pawns, hidden thieves and stars.
   Demo: a crop of a sample map (never the match's) with pawns and a star.
4. **The round** — thieves up to 2 stops, then each squad, 2 actions per cop; Investigate vs Arrest.
   Demo: the turn order with pawns.
5. **Secrets and the end** — hold to see, crooked arrests fail, the final vote. Demo: the hold
   button, a failed arrest line, a vote.

Rules outline (11 pages): Overview → Roles → Rooms and screens → Setup → The thieves' turn → The
police turn → Arrests and stars → The round and the reveals → The final vote → End, points and
dropouts → Credits. Hints during round 1 (tutorial on): placing, intermission, thieves, cops. Credits: inspired by Crooked Cops — line on the first slide, last rules page, CREDITS.md.

## Dealer
Briefing (when the Host picks "Dealer"): before the board appears, every player queues once
(code ritual) and reads their role card — side, order, corrupt or not, the corrupt names for the
corrupt and the thieves, the partner for thieves. The thieves' board is hidden from the Dealer
during the briefing, since anyone may walk in. The briefing ends when everyone visited.

Standing Dealer (`dealerIdleView`, a platform extension added for this game): the Dealer screen
sits in the thieves' room and shows their board the whole match — stars, both thieves, stars
held, corrupt cops, the gang's log, the current turn. Nobody ever queues (`canVisitDealer` false).

## Disconnects
Placing: the missing player is placed on a random stop (thieves: not on a star). Thieves' turn:
they stay put. Cops' turn: they lose their turn. Vote: their vote is missing; the vote ends early
once every connected cop voted. Disconnected players are skipped when their turn comes.

## Remote players
Built for one house with separate rooms. Fully remote, each space becomes a voice call (Discord,
TeamSpeak…) and the Host turns on **remote screens**:
- `playerSpace`: every phone says which space to be in — the side whose turn it is (placing,
  thieves, a squad, or the one called in the intermission) goes to its room, everyone else to the
  hall; in the vote every side is in its own room.
- `dealerAudience`: the thieves, who may open the standing Dealer board (`dealerIdleView`) on their
  own screens at /dealer. Everyone may open the public TV at /display.
In person (option off) nothing changes.

## Edge cases
Both thieves on one stop → one arrest catches both. A team with every member offline is skipped.
No round cap → no vote; the match ends by stars or arrests. Minimum (10): teams 3/3/2.
Maximum (14): teams 4/4/4.

## Defaults chosen
- 10 s intermission between turns so teams can walk to their rooms (14 s after a star reveal).
- Corrupt votes not counted (see Scoring).
- Thieves' phones show the stars only during the thieves' turn; outside it, their own position
  is behind "segure para ver".
- Phones keep every secret (role, corrupt names, investigation results, secret log) behind a
  hold-to-see button, so honest and corrupt screens look the same.
- Line colours and dashed links on the map are decorative: every link is one step.
