# CLAUDE.md: rules for working on WICK

WICK: Down the Cellar is a browser roguelike shooter that copies the *mechanics* of
The Binding of Isaac (Rebirth + Afterbirth+ + Repentance) with entirely original content.

## Rules (follow in every session)

1. **Original content only.** Copy Isaac's mechanics, but every name, character, item,
   trinket, pill, card, boss, enemy, sprite and sound must be original. Never use names or
   designs from The Binding of Isaac. Invent fitting dark, creepy names and designs
   (the theme: a living candle in a flooded, rotting cellar).
2. **PC and mobile.** Everything must work with keyboard/gamepad and with the touch
   joysticks/buttons, have UI readable on a small landscape phone screen, and run at 60 fps on
   a mid-range phone. Test mobile with a phone-sized viewport (e.g. 844x390) and real
   pointer/touch events, not only the keyboard.
3. **Data-driven content.** All content (characters, items, trinkets, pills, cards, enemies,
   bosses, rooms, floors, unlocks/achievements) lives in `src/data/` and is registered through
   central registries (`src/data/registry.js`, `src/data/unlocks.js`). Engine and game code read
   the data; they never hardcode content.
4. **Keep DESIGN.md updated.** Every character, item, boss, floor, room type and unlock must be
   listed there with its effect and how it is unlocked. Update it at the end of every task.
5. **Milestones.** Work in milestones, make sure each one runs (no console errors, smoke-test the
   flows touched), and finish by telling the user what changed and how to test it.

## Project facts

- Plain JavaScript ES modules + HTML5 Canvas, no build step, no dependencies.
  Internal resolution 480x270, scaled with crisp pixels. Feel numbers (screen, walls, camera,
  light, and later movement, tears, damage...) live in `src/data/tuning.js`.
- Run locally: `powershell -ExecutionPolicy Bypass -File serve.ps1`, then open
  `http://localhost:8080`. (No Python/Node on the dev machine.)
- Debug: `?debug` (debug keys, FPS, room-layout validation), `&play` skips the title screen.
  Debug keys and the `WICK` console object are listed in README.md.
- Testing in the Claude browser pane: requestAnimationFrame is throttled and the game auto-pauses
  when the pane is hidden, so drive tests by stepping `WICK.game.update(1/60)` manually and
  close the pause screen with `WICK.game.pause.closeNow()`.
- Saves: versioned localStorage stores in `src/engine/storage.js` (settings, progress, run).
  When a save shape changes, bump its version and add a migration; never break old saves.
- Offline cache: when adding a file, add it to `ASSETS` in `sw.js` and bump `VERSION`.
- Visual preference: big, clearly defined icons and sprites; body text stays at normal size.

## Where things live

- `src/engine/`: loop, canvas, input, touch, audio/music, sprites (Scale2x), pixel painter, RNG, storage
- `src/game/`: game flow, player, enemies, bosses (`bosses/`), rooms, floors, items, saves, progress
- `src/ui/`: HUD, menus, wax panels, pause, title, popups
- `src/data/`: all content and registries
