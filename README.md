# WICK: Down the Cellar

A dark little roguelike shooter in the browser. You are **Wick**, a living candle stub who fell
into a flooded cellar. Shoot molten wax, find strange items, and fight your way down four
floors to put out **The Snuffer** before it puts out you.

Plain JavaScript (ES modules) and HTML5 Canvas. No engine, no build step, no installs.
Pixel art drawn in code plus free CC0 asset packs (recolored to fit, see CREDITS.md); sound effects
are generated live, music is free CC0 tracks with heavy generated music as the fallback. Works on PC
and phones from the same link, and can be installed to a phone's
home screen as a fullscreen app.

---

## Play it locally

The game is a static website, but browsers only load ES modules from a web server (not by
double-clicking `index.html`). Pick any one of these, run it **inside the project folder**,
then open the address it prints.

**Windows, nothing to install** (uses the included script):

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open <http://localhost:8080>.

**If you have Python:**

```bash
python -m http.server 8080
```

**If you have Node.js:**

```bash
npx serve .
```

### Try it on your phone over Wi-Fi (optional)
The quickest way to play on a phone is GitHub Pages (below). If you want to test locally,
run `npx serve .` or `python -m http.server 8080` on your PC, then on the phone (same Wi-Fi)
open `http://YOUR-PC-IP:8080`. The included `serve.ps1` only listens on `localhost`.

---

## Put it on GitHub Pages (play on your phone anywhere)

1. Create a free account at <https://github.com> if you don't have one.
2. Click **New repository**. Name it, for example, `wick`. Make it **Public**. Create it.
3. On the new repository page click **uploading an existing file**, then drag in **everything
   inside** the project folder (`index.html`, `style.css`, `manifest.webmanifest`, `sw.js`,
   and the `src`, `icons` and `tools` folders). Click **Commit changes**.
   - Or with git:
     ```bash
     git init
     git add .
     git commit -m "WICK"
     git branch -M main
     git remote add origin https://github.com/YOUR-NAME/wick.git
     git push -u origin main
     ```
4. In the repository go to **Settings → Pages**. Under **Build and deployment** choose
   **Deploy from a branch**, branch **main**, folder **/ (root)**, and **Save**.
5. Wait a minute. Your game is live at `https://YOUR-NAME.github.io/wick/`.

All paths in the game are relative, so it works from a sub-folder like `/wick/` as-is.

**Netlify instead?** Go to <https://app.netlify.com/drop> and drag the whole project folder
onto the page. Done.

### Add it to your phone's home screen
- **Android (Chrome):** open the game, tap the **⋮** menu → **Install app** (or
  **Add to Home screen**). It opens fullscreen, in landscape, and works offline.
- **iPhone (Safari):** open the game, tap **Share** → **Add to Home Screen**. Launch it from
  the new icon for fullscreen play. (Safari in a normal tab can't go fullscreen; the
  home-screen app can.)

Sound starts after your first tap or key press. Browsers require that.

---

## Controls

| | PC | Phone |
|---|---|---|
| Move | **WASD** | Left thumb anywhere on the left half (a stick appears where you touch; any push is full speed) |
| Shoot | **Arrow keys** (4 directions) | The 4-button pad bottom-right (slide between buttons; 8-way in Settings) |
| Bomb | **E** | **B** button |
| Use active item | **Space** | **USE** button |
| Use pocket item (pill, card, rune, stone, or a character's pocket item) | **Q** | **PKT** button (shows when the pocket isn't empty) |
| Switch pocket item | **F** | **SWAP** button (shows with two or more) |
| Big map (hold) | **Tab** | Hold a finger on the minimap |
| Pause | **Esc** / **P** | **II** button |
| Menus | Arrows + **Enter**, **Esc** to go back | Tap |

A gamepad works too: left stick moves, right stick or face buttons shoot, bumpers or
triggers for bomb, item and pocket item (left trigger), a stick click switches the pocket item,
hold Back for the big map, Start pauses.

**Settings** (pause menu or title screen): music and sound volume, screen shake,
tear highlight (enemy shots glow), Found HUD (stats on the left), item info
(name / name + text / detailed effects near pedestals), touch aim, stick size and opacity,
FPS counter. Everything is saved on the device.

---

## What's in the game

- **9 floors in 4 chapters plus a finale:** The Cellar → The Caves → The Depths → The Womb, two
  floors each, then THE WICK'S END (a short last floor with only a treasure room) and The Snuffer.
  Every floor picks one of its chapter's variants; deeper floors have more rooms and tougher
  enemies.
- **Curses:** from floor 2 a floor is sometimes cursed (its name shows on the floor card): the
  Guttered Flame (darkness), the Torn Map (no minimap), the Sprawl (two floors in one), the Blank
  Heart (hidden health), the Wandering Doors, the Veiled Altars (hidden items), the Restless (the
  dead come back to cleared rooms) and the Short Wick (less range).
- **Double bosses and boss champions:** from chapter 3 a floor's boss is sometimes a pair, and
  from floor 3 it's sometimes a Crimson, Swift or Hollow champion.
- **Save & quit / Continue**: the run saves on every room change and when the app is hidden or
  closed. Unlocks and lifetime stats are saved separately.
- **Unlocks**: achievements unlock new items (with a popup). Settings has "Unlock all" for
  testing and "Reset progress".
- **32 characters**: 16 candles with their own looks, hearts, stats, starting items and
  often a unique rule (dice rerolls, beams, a shovel, twins, a revive, a heat meter, echo shots,
  planted candles...), plus a harder **twisted** version of each. Only Wick is unlocked at first;
  the character select shows locked ones as silhouettes with how to unlock them.
- **8 heart types**: blood, ash, soot, vigil, brass, ribcage, moldy and melted hearts, with the
  original damage order.
- **DESIGN.md** lists every character, item, boss, floor, room type and unlock.
- **Floors are generated from a seed:** rooms spread out from the start room; the boss sits at the
  farthest dead end; there's a treasure room, a locked shop (bring a key) and a hidden secret
  room (bomb the right wall). The seed is shown on the pause screen. Use **Seeded run** on the
  title screen to replay it.
- **Room shapes:** one-screen rooms, big rooms (2x1, 1x2, 2x2, L-shaped) that scroll, and narrow
  halls and shafts. Chapter 1 has 35 hand-made layouts, chapters 2, 3 and 4 have 37 each (hand-made
  plus generated in the chapter's style), with rocks, pits, spikes, breakables, iron blocks and
  marked rocks that drop loot when bombed.
- **Floor variants:** every chapter has three variants with their own tileset, decorations, light,
  particles, music, hazards and enemies. Done: The Undercroft, The Weeping Hollow, The Smolder
  (chapter 1), The Grotto, The Ossuary, The Sunken Caves (chapter 2) and The Underhall, The Wax
  Tombs, The Mire (chapter 3) and The Fleshworks, The Black Womb, The Scarred Womb (chapter 4).
- **Bigger enemies with 4-direction art and clear wind-ups** before every attack, 14 champion
  types, and minibosses (see DESIGN.md for every enemy).
- **Bosses drawn per chapter, never repeating in a run, favoring the ones that fit the floor:**
  seven for chapter 1 (The Soggy Lump, The Weaver, The Hive Belly, The Twin Grubs, The Doll's
  Head, The Gurgler, The Tallow Pyre), six for chapter 2 (The Grotto Maw, The Shrieking Mother,
  The Gravedigger, The Bone Choir, The Bloated Drowner, The Deep Angler), six for chapter 3
  (The Chained Warden, The Twin Gargoyles, The Shrouded King, The Candle Saint, The Blighted
  Toad, The Muck Knot) and four heavyweights for chapter 4 (The Old Boiler, Mother Mildew,
  The Moth Queen, The Rat King).
- **The Chandler:** the giant boss of chapter 3's second floor. Too big for the room: her hands
  slam down, her arm thrusts in through a doorway, her eye stares in and fires.
- **The Tallow Heart:** the giant boss of chapter 4's second floor: a huge heart of meat and wax
  rooted to the floor that beats rings of blood, bursts its veins, rains blood and hardens into wax.
- **Special rooms** (each with its own door, minimap icon and name): The Nook (super secret), The
  Underneath (ultra secret, reached through red rooms made with the Crimson Key), The Thorned
  Room, The Offering Room, The Parlor (placeholder machines), The Gauntlet and The Great Gauntlet
  (waves, full health only), The Reading Room, The Strongroom, The Gambler's Den, The Nursery and
  The Sickroom, The Lair (miniboss), The Orrery (planetarium), crawlspaces under rocks with The
  Back Room (black market), the rare Misprint room, and The Procession (boss rush after a quick
  Chandler).
- **Deals:** after a floor's boss a door may open to **The Bargain** (items for heart containers)
  or **The Vigil** (free items, statues that wake up and guard key halves). Not losing red hearts
  makes a deal likelier.
- **Final boss: The Snuffer.** Three phases; in the last one the lights go out.
- **257 items**: 41 in the starting pool, 206 more unlocked by achievements, plus character starters,
  built like Isaac's. **Weapons** change how you attack (wax shots, a wide charged beam with no
  range limit, thin lasers, a thrown knife that comes back, a sword, bomb shots, charged barrages,
  lobbed shots) and **every modifier works with every weapon** (homing, piercing, splitting,
  spectral, bouncing, multishot, size, statuses...). **39 familiars** (shooters, orbitals, blockers,
  collectors, ones that level up), **43 actives** (room, timed, shooting and one-use charges,
  batteries), costumes that stack, and **15 transformations** (3 items with the same tag). Qualities 0–4 with strict rules (see
  DESIGN.md), pools per room type, Q4 items rare and never in the shop. Status effects (poison,
  burn, slow, freeze, fear, charm) and crits are a chance per shot that grows with **luck**; luck
  also improves chests, room drops and machines.
- **61 trinkets** (one held at a time, swap by walking over another; golden ones are twice as
  strong; the Melting Pot and THE KILN melt one into you for good).
- **Pocket things** (carry 2, Q / PKT uses, F / SWAP switches): **29 pills** with colors shuffled
  every run and unknown until taken (big pills do double), **31 cards** (our own tarot and playing
  cards: teleports, pickups, buffs, a deal room...), **11 runes** and **16 character stones** (a bit
  of each character's power).
- **7 chests**: wooden, golden (key), red (risky devil things), stone (bomb it), spiked (bites),
  eternal (may close again) and the big mega chest.
- **Beggars and machines**: coin, key, bomb, battery, devil and rotting beggars (every one pays out
  its item after enough donations), slots, fortune teller, blood chair, shell game, crane,
  confessional and the shop's restock box. Bombs break them all.
- Coins, bombs, keys, batteries and all the heart types; a shop; room-clear rewards.
- Pause screen with stats and every item held (pick one, or tap it on a phone, to read it), game-over and victory screens, saved run records.

---

## Project layout

```
index.html, style.css      page, letterboxed canvas, touch buttons
manifest.webmanifest, sw.js  home-screen app + offline cache
icons/                     app icons (regenerate with tools/make-icons.ps1)
serve.ps1                  tiny local web server for Windows
src/
  main.js                  boot: title screen <-> game, debug keys
  engine/                  loop, canvas scaling, input, touch stick and shooting pad, audio, music,
                           sprites (incl. Scale2x), pixel painter, RNG, pools, particles, storage
  game/                    game (rooms, combat, floors), player, health, character mechanics,
                           enemies, projectiles,
                           room + room art, floor generation, doors, items, pickups, bombs,
                           shop, followers, active items, trapdoor, machines, chests,
                           trinkets and pocket things (consumables.js, trinketfx.js),
                           weapons (weapons.js), familiars (familiars.js)
  game/bosses/             one file per boss + shared base class + registry
  ui/                      HUD, minimap, text (bitmap font), menus, wax panels, pause, title
  data/                    everything you'd want to tweak or extend (see below)
```

## Adding content

Everything content-related is data. You can add to the game without touching the engine.

- **Characters:** add an entry to `src/data/characters.js`, a look to
  `src/data/characterSprites.js` (body shape, colors, flame, costumes), an unlock in
  `src/data/unlocks.js`, and the id to `CHARACTER_ORDER`. Unique rules go in
  `src/game/mechanics.js`.
- **Items:** add an entry to one of the batch files in `src/data/items/` (name, pickup line, lore,
  quality, pools, tags, unlock, stats, shot effects, weapon, follower, active...) with its pixel icon
  (and costume, if it changes the look) in the same file. Transformations are in
  `src/data/transformations.js`.
- **Enemies:** add a definition to `src/data/enemies.js` (pick a behavior, give it stats),
  pixel art to `src/data/enemySprites.js`, and add it to a spawn pool.
- **Rooms:** copy a layout in `src/data/rooms.js` and edit the 13×7 grid. Open the game
  with `?debug` in the address and the console warns about any blocked doorways.
- **Bosses:** tuning in `src/data/bosses.js`; behavior and art as a class in
  `src/game/bosses/` (see `ratking.js` for a short one); register it in
  `src/game/bosses/index.js`; add its id to `BOSS_POOL`.
- **Floors:** `src/data/floors.js` (name, size, colors, difficulty, music key).
- **Pickups and drop rates:** `src/data/pickups.js`.
- **Trinkets:** an entry in `src/data/trinkets.js` (stats, shot traits, or `fx` effects from
  `src/game/trinketfx.js`) with an `icon: [shape, color ramp]`; shapes are in
  `src/game/consumables.js`.
- **Pills, cards, runes, character stones:** `src/data/consumables.js`; each names an `fx` effect
  (in `CONSUMABLE_FX`, `src/game/consumables.js`) or an active item effect (`active:<name>`).
- **Chests:** `src/data/chests.js` (how it opens, its art, weighted contents).
- **Machines and beggars:** `src/data/machines.js` (cost, payout table, `guarantee` for beggars).

If you add a new **file**, also add its path to the `ASSETS` list in `sw.js` and bump
`VERSION` there, so the offline cache picks it up.

## Debug mode

Open the game with `?debug` in the address (for example
`http://localhost:8080/?debug`), and add `&play` to skip the title screen (`&char=kiln` picks the
character, e.g. `?debug&play&char=prism_t`; `&floor=2&variant=undercroft` starts on that floor
and variant). In a run:

| Key | Does |
|---|---|
| M | Reveal the map |
| O | Open secret doors next to you |
| K | Kill every enemy in the room |
| I | Item picker: every item with its details; Enter takes one (stays open), Esc closes |
| G | +10 coins |
| C | Fully charge the active and pocket items |
| J | Drop a pill, card, rune, character stone, trinket and battery, and a random chest |
| B | Jump to this floor's boss room |
| V | Debug floor picker: jump to any chapter variant (first or second floor of the chapter); its **SPECIAL ROOMS** page opens any special room (deal rooms, boss rush, crawlspace...) behind a free wall of the room you're in |
| N | Skip to the next floor |
| F3 | Toggle the FPS counter |

In the browser console, `WICK.game.giveItem('magnet')` gives a specific item.
