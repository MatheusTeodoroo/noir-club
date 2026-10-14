# Game UI (`src/ui.tsx`)

Worked examples: the starter `src/ui.tsx` (no Dealer) and `<skill>/examples/demo-secret/src/ui.tsx`
(Dealer, staged card reveal).

## Module rules

- `export default defineGameUI({ Display, Player, Dealer? })` — `Dealer` is required when
  `usesDealer` is true.
- Import only `react` and `@mp/game-sdk`, plus assets and `import type { … } from './logic.ts'`.
  A *value* import from the logic would ship the rules and their secrets (word banks, answers)
  to every phone and TV; put constants both sides need (length limits, option lists without
  secrets) in `src/shared.ts` and import that from both. `npm run build` rejects anything else.
  The platform's components arrive through the `kit` prop.
- Components render only their `view` prop and `platform`; they never compute game rules.
- Text: every visible string lives in one `L` map of `{ 'pt-BR': '…', en: '…' }` objects and is
  rendered with `t(L.key)`. Player names come from `platform.players`.
- Styles: one CSS string with every class prefixed by the game's prefix (the scaffold printed it,
  e.g. `teg-`), injected with `<style>{CSS}</style>` inside each component that uses it.

## Props

| Component | Props |
|---|---|
| `Display` | `view` (your PublicView), `platform`, `kit`, `t`, `lang` |
| `Player` | `view` (this player's PlayerView), `you` (platform status: `you`, `isAdmin`, `remote`, `dealer` status), `send(action)`, `platform`, `kit`, `t`, `lang` |
| `Dealer` | `view` (DealerView), `playerName`, `platform`, `kit`, `t`, `lang` |

`platform` (PublicPlatformView) gives `players` (`id`, `name`, `avatar` emoji, `connected`,
`spectator`, `remote`, `isAdmin`, room `score`), `gameConfig`, `paused` (null or who/until),
`dealer` (`current`, `verified`, `queue`) and `lang`. Filter `players` by `!p.spectator` for
the people in the match.

## kit

Prop types are in `.noir/sdk/game-sdk/index.ts` (`KitButtonProps`, …).

| Member | Use |
|---|---|
| `kit.Button` | `variant` gold (primary) / crimson (decisive) / ghost (secondary), `block`, `small`, `disabled`, `onClick` |
| `kit.Avatar` | player sigil: `emoji`, `size` (px on phones, `"6em"`-style on TV), `active` (gold glow: acted, winner), `crimson` (accused, at the Dealer), `offline`, `badge` (✓, ♛, …) |
| `kit.TextInput` | phone text entry with a submit button: `onSubmit(text)` (trimmed), `placeholder`, `maxLength`, `oneWord` (strips spaces while typing), `submitLabel`, `disabled`; Enter submits, the field clears after, autocorrect/capitalisation are off |
| `kit.Countdown` | ring timer: `deadline` and `total` (both from your view: `ctx.timerDeadline` / `ctx.timerTotal`), `size` (`"7em"` on TV, px on phones), `paused={!!platform.paused}` |
| `kit.Panel` | gold-hairline card with ornamented corners |
| `kit.RiveView` | a `.riv` animation (see rive.md) |
| `kit.useRoomNow()` | room-clock now, for custom countdown displays |
| `kit.playSound(name)` | local one-off cue; synced TV cues go through `ctx.emit` in logic |

## Visual identity

Luxury casino: deep black, gold, a touch of crimson, elegant serif display type, playing cards,
suits, chips, dice, candlelight, velvet. Calm motion — fades, rises, card flips, a gold glow on
the important thing. No demonic or occult imagery (horns, pentagrams, devils, skulls, hellfire).

CSS variables available everywhere:

- Surfaces `--ink-0` (page) `--ink-1` `--ink-2` `--ink-3`; hairlines `--line`, `--line-strong`
- Gold `--gold`, `--gold-hi`, `--gold-lo`; crimson `--crimson`, `--crimson-hi`, `--crimson-lo`
- Text `--text`, `--text-dim`, `--text-mute`; states `--ok`, `--warn`
- Type `--font-display` (Cinzel: titles, numbers), `--font-serif` (Cormorant italic: flavour
  lines), `--font-ui` (Inter: everything else)
- `--radius`, `--radius-lg`, `--ease-out`

Global classes you may use: `mp-title` (gold gradient display type), `mp-subtitle` (italic
serif), `mp-eyebrow` (small spaced caps), `mp-panel`, `mp-chip` (+ `mp-chip--crimson`,
`mp-chip--ok`), `mp-enter` (rise-in animation; re-key an element to replay it), `mp-spinner`,
`stack` (vertical grid), `row` (flex row) + `wrap`, `screen-center`.

## Display (TV)

- Rendered full-screen on a TV-sized page (16:9, any resolution). The page sets a **stage unit**:
  `1em` = 24 px at 1080p, 16 px at 720p; the screen is **80em × 45em**. Size everything in `em`
  (and `100vh` / `100%` for the outer box) so it fits every TV; px only for hairlines.
- Must fit 80×45em with `maxPlayers` players — check it in the playground at the maximum count.
- Readable from across the room: body text ≥ 1.2em, phase titles 4–5em, key numbers 3em+.
- Layout per phase: eyebrow (round x/y), a big phase title, one line saying what to do now,
  a countdown top-right (`size="7em"`), then the board (seats, cards, results).
- Uppercase display titles carry accents (Ã, Ç, É): give gradient-text headings
  `line-height: 1.15; padding-top: .05em` so `background-clip: text` doesn't cut the marks.
- The platform overlays the bottom-left corner (Dealer queue) and bottom-right corner (room
  code) during play; keep the bottom corners free.
- Stage reveals: start the reveal animation after the `drumroll` cue (e.g. CSS `animation-delay`
  ≈ 2–2.5 s) and emit `reveal` in logic at the same delay so sound and picture land together.
- No input. Never rely on hover or focus.

## Player (phone)

- Portrait phone, ~360–430 px wide, 16 px base: size in px/rem here, not em.
- The platform already renders, above your component, the header (avatar, name, points) and the
  Dealer controls; below, the Host's controls. Render only the game's controls and status.
- One decision per screen; buttons ≥ 48 px tall; a short status line saying what happens next
  ("Voto registrado…", "Olhe para a TV!").
- Optimistic feedback: highlight the tapped choice immediately (local state), reset it whenever
  the view changes — as the starter does.
- Show the player only their own information; when nothing is asked of them, point them to the TV.
- Typed answers: use `kit.TextInput` (it already handles Enter, trimming, no autocorrect). Check
  limits on the phone for instant feedback (the engine ignores invalid actions silently) and
  show what was sent ("Sua pista: PINTOR").
- Give buttons whose content is not plain text an `aria-label` (e.g. an avatar + name candidate:
  `aria-label={c.name}`) — screen readers and test tooling find them by name.

## Dealer screen

- Rendered on a TV-like stage (same `em` stage unit as Display). The platform shows the
  visitor's name top-left and the visit timer top-right; centre your content.
- One player's private information, huge and unmistakable, plus one line of guidance
  ("Memorize. Não conte a ninguém.").
- The same component also renders inside a phone panel for remote players, so size by the space
  it gets, not by the page: make your wrapper a size container (`container-type: inline-size`)
  and size big elements with `min(<em size>, <cqw size>)`, e.g. `font-size: min(18em, 45cqw)`.
  For words, also shrink by length: `font-size: min(12em, ${66 / word.length}cqw)`. Give the
  wrapper `min-height: 100vh` only under `.tv` (`.tv .xx-dealer { min-height: 100vh }`), as the
  demo does.

## Play checklist (step 6)

- Every phase reads at a glance on the TV: title, instruction line, countdown, who has acted.
- At `maxPlayers` the TV board fits with nothing clipped; at `minPlayers` it does not look empty.
- Phones: every action reachable with a thumb, the current choice clearly highlighted, nothing
  secret about other players.
- The Dealer screen (if used) shows exactly the visitor's secret, large; a remote visit works.
- Countdowns freeze while a player is disconnected (toggle a phone's 🟢 in the playground).
- The reveal is a moment: cue, animation, winner highlighted, points shown.
- Titles with Ã / Ç / É show their accents intact on the TV.
- Nothing of yours sits under the platform's overlays: TV bottom corners during play, Dealer
  screen top corners during a visit (the playground draws them).
- Switch the playground language to EN: no Portuguese left on any screen.
- No red crash boxes on any device during a full match.
