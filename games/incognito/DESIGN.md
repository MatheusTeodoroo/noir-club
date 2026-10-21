# Incógnito / Incognito

## Pitch
Inocentes, Impostores e Neutros com poderes secretos. Discuta de dia, vote à tarde e sobreviva à noite.

## Players
5–16. Social deduction needs at least one Impostor, one Neutral and three Innocents; 16 is the
reference document's top. 20–40 minutes depending on timers and player count.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| Each player's class | that player (+ fellow Impostors for Impostors) | phone, behind "hold to see" | end screen; Sniper hit/miss and Exorcist hit reveal one class |
| Forced / banned classes, which classes were dealt | Host only, during setup | Host's phone (setup) | never (only the counts are public) |
| Night picks (kills, abilities, decoys) | the actor (Impostors see each other's kill picks) | phone | never directly; outcomes via deaths, reports, announcements |
| Night results (Investigator, Tracker, Cartographer, Curator, Journalist, Sentinel trap) | the actor | phone report at end of night | when the player says so out loud |
| Barricaded / entangled / cured notice | the target | phone report | never |
| Psychologist result | Psychologist | phone at dawn | never |
| Spokesperson / Historian event offers | that player | phone at dawn | when they announce/reveal one (TV shows at most the victim, never the actor) — this can name a poisoned, locked or vote-manipulated player, by design |
| Coroner result (dead player's side) | Coroner | phone | never |
| Votes (who voted for whom) | the voter | phone | never — TV shows only totals per candidate |
| Maestro / Trickster manipulation | the manipulator | — | never (the victim's phone keeps showing their own choice) |
| Twin pair, Bounty target class, Journalist hits, Prophecy, Cultist picks | the player | phone | never (outcomes are) |
| Lawyer's appeal | Lawyer | phone | TV says "annulled", never by whom |
| Telepath link | both linked players | phone (report, class card) | never |
| Potion (kind, holder) | Alchemist and the receiver (who is told the kind, not the giver) | phone | never |
| Thief's stolen class/side | the Thief only (a Thief who becomes an Impostor is unknown to the team and vice versa) | phone | end screen ("Thief → class"); class guesses still read "Thief" |
| Phantom lingering, Pacifist penalty | that player | phone | the death itself |
| Shapeshifter imitation | Shapeshifter | phone | if the imitated player is expelled, the TV reveals the Shapeshifter |
| Parasite host / stolen count | Parasite | phone | never (the tally shows votes moved to the Parasite, by design) |
| Everything | dead players when the Host picked "omniscient spectator" | phone | — |

Feedback leaks: invalid actions are silently ignored. The phone only offers valid targets, so the
Maestro's list (non-Impostors) only reveals what the Maestro already knows.

## Phases
| Phase | Ends by timer (default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|
| setup | none (Host starts) | Host taps Start with a valid setup | counts, rules, class guide carousel | Host: counters, Auto/Force/Ban per class, modes, timers; everyone: guide | — |
| reveal | 25 s | every living connected player tapped "Got it" | "check your class" + who confirmed | hold to see class, team, partners | — |
| night | setup.night (45 s) | every living connected player made their pick(s) | night, who is done | ability / decoy / kill pickers | — |
| report | 10 s | — | "dawn is breaking" | night report (empty for most) | — |
| dawn (Manhã Cedo) | setup.dawn (20 s) | — | night deaths, Sentinel suspect, "someone is poisoned", announcements | Psychologist result, Spokesperson announce, Historian store, Coroner | — |
| day (Manhã) | setup.day (3 min) | every living player asked to skip (each request cuts an equal share) | debate, deaths, announcements | Coroner, Historian reveal | — |
| vote (Tarde) | setup.vote (60 s) | every living connected player voted | who voted, live Sniper/Exorcist results | vote (can change), Sniper / Exorcist, Historian reveal | — |
| verdict | 10 s | — | tally, condemned (appeal window) | Lawyer: annul | — |
| dusk | 6 s | — | expelled / annulled / nobody | look at the TV | — |
| end | none | Host: Play again / Finish | winning side, winners × losers, every class | Host buttons | — |

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|
| `setup {patch}` | Host | setup | updates the in-game setup (clamped) |
| `start` | Host | setup, no validation errors | deals classes → reveal |
| `ack` | living seat | reveal; night when entangled | confirms |
| `ability {targets, guess?}` | living seat, not entangled | night | ability pick, decoy pick, or `[]` = skip |
| `kill {target\|null}` | living Impostor, not entangled | night | team vote or own kill |
| `kill2 {target\|null}` | Twin with an extra kill tonight | night | extra kill |
| `spokes {index\|null, signed}` | Spokesperson | dawn, once | announce on TV or stay silent |
| `histStore {index\|null, replace?}` | Historian | dawn, once | store an event (swap when 2 stored) |
| `histReveal {index}` | Historian | day/vote, 2 per match | reveal a stored event |
| `autopsy {target}` | Coroner | dawn/day, 2 per match | learn a dead player's side |
| `skip` | Host | day | goes to the vote |
| `vote {target\|'skip'}` | living seat | vote | sets/changes the vote |
| `snipe {target, guess}` | Sniper | vote, once per vote | live hit or miss |
| `exorcise {target}` | Exorcist | vote, once per vote | live reveal or double death |
| `appeal` | Lawyer | verdict with a condemned, 2 per match | annuls the expulsion |
| `again` / `finish` | Host | end | back to setup with the same choices / `ctx.end` with zero points |

## Scoring and end
No points: `ctx.end` gives everyone 0 (the room scoreboard does not move). The game's own end
screen separates winners from losers and reveals every class.
- A Neutral win ends the match at once (they alone win): Journalist 3 different hits, Prophet's
  target dies in time, Bounty Hunter hits, Cultist's 3 vote for them, Drama Addict dies to an
  action after 4+ votes.
- Innocents win when no Impostor and no Neutral is alive; Impostors win when living Impostors ≥
  living Innocents. Nobody of either side alive → draw.
- Checked after every death (night resolution, live Sniper/Exorcist, expulsion, a player leaving).

## Config (Host settings)
The lobby form is empty; the whole configuration happens in the game's setup phase so players can
read the guide meanwhile.
| key | type | default | range/options |
|---|---|---|---|
| impostors | number | by scale table | 1 – (fewer than innocents) |
| neutrals | number | by scale table | 0–5 |
| picks[class] | auto/force/ban | auto | every non-common class |
| killMode | select | team | team (one shared kill, majority) / each |
| abilityMode | select | or | or / and (only with killMode each) |
| spectator | select | blind | blind / omniscient |
| oratorVotes | select | 2 | 2 / 3 |
| revealDead | boolean | false | show the class of every dead/expelled player on the TV |
| times.dawn/day/vote/night | seconds | 20/180/60/45 | 10–60 / 30–600 / 20–180 / 20–120 |

## Dealer
Not used: classes live on the phone behind "hold to see"; everyone taps something at night so
nobody can tell who acts.

## Disconnects
After the platform's 20 s grace, `onPlayerTimeout` removes the player: TV shows they left, they
count as dead for the win check, their class stays hidden, no ability gets credit (Prophecy on
them is void, Bounty Hunter is retargeted, Drama Addict does not win). Their pending vote/picks are
dropped, and the phase ends early if everyone remaining has acted.

## Remote players
Nothing differs.

## Edge cases
- Vote tie or "Skip" on top → nobody is expelled (verdict still shows the tally).
- Team kill tie → random among the tied options (including "no kill"); all kill voters blocked → no kill.
- Everyone abstains at night → nothing happens; the night ends on its timer.
- A Sniper/Exorcist death mid-vote discards the dead player's vote and frees votes cast on them.
- Classes never repeat; leftover seats become plain Innocent / Impostor. Neutrals have no common
  class, so the setup refuses more Neutrals than non-banned Neutral classes.
- Twin is dealt only with 2+ Impostors; Bounty Hunter needs at least one Impostor (always true).

## Defaults chosen
- v0.3.2: Early Morning opens with a staged reveal on the TV: a heartbeat lead-in (tick cues), a drumroll, then each death one by one (reveal cue + fx), or "Everyone woke up". The dawn timer is stretched to fit the reveal plus 6 s.
- v0.3: the TV shows no checkmarks at night. Any living player may ask to skip the debate once; each request cuts the remaining time by 1/(players who have not asked yet), so with 4 players one request removes 25% and all four end it. The Host may reveal the class of every dead or expelled player (a Thief reads as "Thief").
- v0.2 classes (decided with the user): Nomad wins alongside whoever wins when alive at the end (Innocents must eliminate them); Thief steals class and side in secret (as an Impostor they kill alone every night and know no partners); Parasite wins at once at 5 stolen votes, half the host's votes rounded down, and the stolen votes count for the Parasite in the tally; Shapeshifter swaps the votes the two receive and casts both ballots (the imitated ballot is void).
- Telepath: one link per match; night/day deaths, blocks and protection carry over, expulsion does not. Saboteur: a silent block (Tracker sees "blocked"). Persistent: two attacks the same night (poison kills normally). Alchemist: brew on the first night they act, hand over on a later night (self allowed), receiver uses it from the following night; a Death potion cannot target its holder. Pacifist Tracker: dies at the end of the night after voting for an Innocent who got expelled. Phantom: a night death is delayed to the end of the next night; day deaths are immediate. Nomad swap chosen on night n redirects actions on night n+1.
- Public death list is sorted by day, cause and id (resolution order would hint at actors); a vote on a player killed mid-vote turns into Skip so no voter loses their check on the TV; the Maestro only redirects a ballot that was actually cast.
- Night order: entangled → Sentinel traps → Locksmith/Builder blocks (simultaneous) → Protector /
  Guard → attacks → poison and cures → investigations → marks.
- Sentinel cancels the first action (by submission order) against the trapped player; its author
  becomes the public "Suspect".
- Sheriff dies for shooting a non-Impostor even if the target was protected.
- Bounty Hunter miss: hunter dies, victim lives; hit on a protected/guarded target: no win.
- Poison kills at the end of the next night; the Curator cures it any time before; protection that
  night also saves.
- Team kill executor (for Guard / Tracker / Sentinel) is a random Impostor among those who picked
  the target.
- Tracker sees one kind, by priority attack > block > protect > investigate > mark; decoys = nothing.
- Cartographer counts distinct actors that targeted the player (including trapped attempts).
- Prophet: prophecy at night n must come true by the end of night n+1.
- Cultist attempt applies to the very next vote, counted on final (manipulated) ballots.
- Maestro beats Trickster when both hit the same voter.
- Exorcist and Sniper: once per vote phase each, no match limit.
- Coroner may act at dawn and during the day.
- Host = p1 while connected, else the first connected player.
