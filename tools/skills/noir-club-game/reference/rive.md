# Rive animations (optional)

CSS covers most game visuals. Reach for Rive when a moment deserves a crafted animation — a card
flip with lighting, a roulette, a mascot — and keep a CSS or emoji fallback for weak TV browsers.

- **Script-free files only.** The platform plays `.riv` files with the Rive web runtime, which
  refuses files carrying unsigned scripts. Animate with timelines, state machines and data
  binding; no Luau/AnimaScript.
- **Authoring.** Either the Rive editor (export `.riv`), or the Rive CLI if it is installed
  (`rive --help`; RML source files; `rive docs` and `rive schema` document the format — never
  guess element or property names; check with `rive . --verify` and `rive . --screenshot`).
- **State machine named `Main`** set as the artboard's default; `RiveView` plays it.
- **Driving it from the game:** bind a view model to the artboard. `RiveView`'s `values` writes
  string/number/boolean properties by name; `trigger={{ name, nonce }}` fires a trigger property
  each time `nonce` changes (use the round number or a reveal counter).
- **Shipping:** put the file in `assets/` and import its URL in `ui.tsx`:
  `import cardRiv from '../assets/card.riv?url';` then
  `<kit.RiveView src={cardRiv} artboard="Card" values={{ number: 42 }} fallback={<span>42</span>} />`.
  The bundler copies it next to `ui.js`.
- Keep files small (tens of KB) and artboards simple: TVs may be low-end Smart TV browsers.
- Same visual identity as everything else: black, gold, a touch of crimson; no demonic imagery.
