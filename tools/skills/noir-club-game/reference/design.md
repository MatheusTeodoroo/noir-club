# Designing the game

## What makes a Noir Club game work

- **The room is the game board.** People sit together and talk; the best moments are
  accusations, bluffs and reveals said out loud. Design phases that give them something to argue
  about, then a reveal everyone watches on the TV.
- **The TV is the stage.** Every phase change, timer and reveal is visible on the TV with a big
  title and a clear "what happens now" line. A player glancing up for one second understands the
  state of play.
- **Phones are quick and private.** One decision per screen, large buttons, no reading. A phone
  never shows anything another player could use if they looked over a shoulder — except the
  player's own choices.
- **Hidden information is the engine of tension.** Decide exactly what each player knows, when
  they learn it, and when everyone learns it.
- **Everything is timed.** Every phase ends by a timer even if nobody acts; it may also end early
  when everyone has acted. Nobody waits on a slow or missing player.
- **Short rounds, rising stakes.** 5–15 minutes per match, 1–5 rounds, a reveal at the end of each.
- **Scales from min to max.** Check the rules at 3 players and at 12. Ties and "nobody acted"
  always resolve.

## The design sheet

Write this as `DESIGN.md`. Every section is required; write "none" where it does not apply.

```markdown
# <Name PT> / <Name EN>

## Pitch
One or two sentences, as they would appear on the TV lobby card.

## Players
min–max, and why. Estimated minutes.

## Hidden information
| What | Who knows it | Where it is shown | Becomes public when |
|---|---|---|---|
| e.g. each player's role | only that player | Dealer view | final reveal |

## Phases
| Phase | Ends by timer (config key, default) | Ends early when | TV shows | Phone does | Dealer shows |
|---|---|---|---|---|---|

## Actions
| Action payload | Sent from | Valid when | Effect |
|---|---|---|---|

## Scoring and end
How points are earned each round, how ties resolve, when `ctx.end` is called.

## Config (Host settings)
| key | type | default | range/options |
|---|---|---|---|

## Dealer
Used? Who may visit, when, how many times, what they see, when the Dealer closes.

## Disconnects
What `onPlayerTimeout` does in each phase. What happens to their pending choices.

## Remote players
Anything that differs for them (usually nothing beyond the Dealer view on their phone).

## Edge cases
Ties, everyone abstains, minimum players, maximum players, a player at the Dealer when the phase ends.

## Defaults chosen
Decisions you made without asking the user, so they can overrule them.
```

## Patterns that fit the platform

- **Secret assignment → Dealer visits → open discussion → vote → reveal** (the demo game).
- **Simultaneous secret choice → reveal → score** (the starter game): no Dealer, fast, scales well.
- **Rotating spotlight**: one player per round is "on stage" (TV shows them), others act on phones.
- **Bidding / betting** with chips shown on the TV; bids hidden until the reveal.
- **Traitor / impostor**: roles at the Dealer, a task phase, an accusation vote, a role reveal.
- **Word / clue impostor**: everyone but the impostor sees the secret word at the Dealer (the
  impostor sees only the category) → each types a one-word clue on the phone → the TV reveals all
  clues → vote → if caught, the impostor gets one guess at the word.

Phases may be conditional (the impostor's guess happens only when caught). Whenever a phase is
skipped or added, the TV's "what happens now" line says why ("Pegaram o mentiroso — ele ainda pode
adivinhar a palavra").

**Feedback can leak.** When the design refuses an action, ask whether telling the player *why*
reveals hidden information; list such cases in the hidden-information table.
