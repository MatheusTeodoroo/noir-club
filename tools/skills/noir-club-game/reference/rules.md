# Rules and tutorial (required in every game)

Every Noir Club game teaches itself. A group that has never seen the game must be able to learn
it from the TV in a minute or two, and anyone must be able to look a rule up mid-match without
asking. Three pieces, all required unless noted:

1. **Tutorial** — short slides on the TV before the first round, advanced by the Host.
2. **Rules reader** — the full rules on any phone, any phase; the Host can show a page on the TV.
3. **Hints** (recommended for games with several kinds of action) — a one-line "what to do now"
   on the TV during the first turns while the tutorial option is on.

**The model is Agent Decker** — `<skill>/examples/agent-decker/`: texts in `src/texts.ts`
(`SLIDES`, `RULES`), flow in `src/logic.ts` (`intro` phase, `tvRules`, `hint`), screens in
`src/ui.tsx` (`TutorialSlide`-style intro, `RulesPanel` on the TV, `RulesReader` on the phone).
The starter game the scaffold creates already implements pieces 1 and 2 in the same shape —
keep that structure and replace the content.

## Where the text lives

`src/texts.ts`, imported by both `logic.ts` (page counts) and `ui.tsx` (content). No secrets in it:
it ships to every phone.

```ts
export const SLIDES: { title: I18nText; body: I18nText[]; demo: '…' }[]; // tutorial
export const RULES:  { title: I18nText; body: I18nText[] }[];            // full rules
export const CREDITS: I18nText | null;                                   // adaptations only
```

Every string in PT-BR **and** EN. Inline markup: `**bold**` for the terms a player must spot;
`{token}` for icons the UI swaps in (Agent Decker: `{stealth}`, `{fight}`, `{alarm}`…) — so a rule
shows the same symbol the board shows. `rich()` in the UI turns both into elements.

## 1 · Tutorial (the `intro` phase)

- **Config:** a `tutorial` boolean, first in `manifest.config`, default `true`. Off → the match
  starts at round 1 (Agent Decker keeps two slides even then: credits and the mission briefing).
- **Flow:** `setup` puts the game in `phase: 'intro'`, `slide: 0`. Action
  `{ type: 'intro', dir: 1 | -1 | 'skip' }`, **Host only** (`ctx.players[i].isHost`); "next" on the
  last slide or "skip" starts round 1. Safety nets: an `intro` timer (a few minutes) and
  `onPlayerTimeout` for the Host both start the game, so a Host who leaves never strands the room.
- **TV:** one slide at a time, big — eyebrow "Tutorial · n/N", title, 2–4 short sentences, progress
  dots, "the Host moves on from their phone", and a **live demo** beside the text drawn with the
  game's real pieces (Agent Decker: `overview`, `anatomy`, `interact`, `turn` demos built from its
  actual cards and line). Show, don't describe.
- **Phones:** the Host gets Back / Next (Start on the last) / Skip tutorial; everyone else sees the
  slide title and "follow the tutorial on the TV". Everyone has the 📖 Rules button.
- **Content — 3 to 6 slides, in this order:**
  1. *How to play* — who you are, what you are trying to do, how you lose (the theme in one breath).
  2. *What you see* — the pieces on the board and how to read them (Agent Decker: anatomy of a card).
  3. *What you do* — the actions, each with its consequence.
  4. *The round / turn* — numbered steps, as they will happen.
  5. *Briefing* (optional) — the first objective, so play starts with a goal.
  Credits (adaptations) go on the first slide.

## 2 · Rules reader (piece of every phase)

- **Phone:** a 📖 Rules button in **every** phase (intro, play, between rounds, end). It opens a
  full-screen sheet: "Rules · n/N", title, paragraphs, Back / Next, Close. Pages are local — each
  player reads at their own pace.
- **TV:** the Host's sheet also has **📺 Show on TV**: action `{ type: 'tvRules', page | null }`
  (Host only, page validated against `RULES.length`); the public view carries `tvRules`; the TV
  draws that page as an overlay over whatever phase is running, and follows as the Host turns
  pages. Closing the sheet clears it. Settle a rules argument for the whole room in one tap.
- **Content — complete, so nobody needs another source. Page order:**
  1. *Overview* — goal, theme, number of players, what's in the game.
  2. *Pieces / card types / roles* — one bold term per paragraph.
  3. *Actions* — every action, cost and consequence, including the rare cases.
  4. *The round / turn* — numbered steps (Agent Decker: 1 · Use cards, 2 · Mission check,
     3 · Line Scroll, 4 · Card Refresh), one page per step when steps are long.
  5. *Progression / special situations* — new rounds, eliminations, ties, disconnects.
  6. *Scoring and end* — how points work on the platform and when the game ends.
  7. *Credits* — for adaptations: original author, link, license, "not an official version".

## 3 · Hints (recommended)

Agent Decker computes `hint: 'play' | 'interact' | 'goal' | 'end' | null` in its public view for the
first turns of the first mission while `tutorial` is on, and the TV shows the matching one-liner
("Play cards from your hand", "You can afford an obstacle — interact!") in its status bar. Derive
hints from state (what the player could do right now), never from a script.

## Writing the texts

- Second person, present tense, short sentences: "You pick a number in secret."
- The tutorial teaches the **first round only**; the rules cover **everything**.
- Use the exact names the screens use (if the button says "Desarmar", the rule says **Desarmar**).
- Numbers, limits and timers in the rules match the code and the default config; when the Host
  can change them, say so ("30 s by default; the Host can change it").
- A rule a group could argue about gets an explicit sentence (ties, simultaneous actions, a
  player who doesn't act in time).

## Adaptations of existing games

If the game adapts someone else's game (rules, cards, art), it must say so: credit line on the
first tutorial slide, a Credits page at the end of the rules, and a `CREDITS.md` in the game
folder with the original author, link, license and the changes made — Agent Decker's
`CREDITS.md` is the model. Only adapt games whose license allows it (e.g. CC BY-NC for a free,
non-commercial platform); otherwise ask the user before going further.

## Tests

See the "Tutorial and rules" cases in [testing.md](testing.md); the starter's
`test/logic.test.ts` has them ready to adapt.
