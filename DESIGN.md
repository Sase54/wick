# WICK: Down the Cellar: design document

The single source of truth for what is in the game. Every character, item, boss, floor,
room type and unlock is listed here with its effect and how it's unlocked.
**Keep this file updated at the end of every task** (see CLAUDE.md).

WICK copies the *mechanics* of The Binding of Isaac (Rebirth / Afterbirth+ / Repentance) with
entirely original names, characters and art: a living candle fights down through a flooded,
rotting cellar.

---

## FEEL AND TUNING

Every number that decides how the game looks, moves, shoots and hits lives in one file,
**`src/data/tuning.js`** (`TUNING`), grouped by the sections of the feel pass. Change a number
there and the game follows; nothing else needs editing. Sections are added as the pass goes on.

### 1. Screen, rooms and perspective (`TUNING.screen`, `.room`, `.camera`, `.lighting`)

- **Screen**: the game draws at **480x270** game pixels (16:9) and is scaled up with crisp, square
  pixels and black bars around it (inside the phone's safe area). When a whole-number scale costs
  at most 12% of the screen it snaps to it, so every game pixel is the same size (a 1080p monitor
  gets exactly 4x). A phone in landscape (like 844x390) can't fit 480x270 twice, so it uses the
  largest crisp fit instead.
- **Rooms**: a one-screen room is 13x7 floor tiles of 24 px (312x168) inside thick walls, and
  together they fill the whole screen: side walls **84 px** (3.5 tiles), top wall **62 px**,
  bottom wall **40 px**. Big rooms (2x1, 1x2, 2x2, L) are the same with more floor, and the
  camera scrolls to follow you (catching up at speed 9, sitting 12 px above you so you see more
  floor ahead); it stops at the room's edges.
- **Fake 3/4 view**: the top wall is the tallest and shows a lit brick face **34 px** high, the
  side walls show **18 px**, the bottom wall **9 px**; past each face there's a lighter lip and
  then the dark top of the wall, fading toward the screen edge. The top wall's face is lit a bit
  more, the bottom wall's less. The top wall casts a short shadow (8 px) on the floor below it,
  and the floor darkens along every wall. Corner seams run from each screen corner to the floor's
  corner. Everything in the room is drawn in order of its feet (lower on screen = in front).
- **Doors** sit in the exact middle of each wall, in every state (open, shut during a fight,
  locked, coin, bombable/hidden, boss, treasure, shop...; see THE MAP and Special rooms).
  Walking through one slides the old room out and the new one in over **0.3 s**.
- **Light**: a soft vignette darkens the corners (0.55); every open door spills a warm light
  (0.16, reaching 70 px) into the room from the room beyond, fading in as the door opens; wall
  candles and props glow; darkness (the final boss's last phase: 78 px light around Wick; the
  Curse of the Guttered Flame and the dark pill: 96 px) hides everything else.
- **Menus** are still laid out for the old 384x216 screen and sit centered in the new one, with
  the corner buttons (character select BACK/TWISTED/START) in the real corners; the paper-look
  menu pass redoes them.

### 2. The player (`TUNING.player`)

- **Look**: every character is a **big candle head on a little wax body**, drawn separately. The
  head is the character's own candle (face, flame, costumes), 18 px wide; the body is 10 px wide
  with two stubby legs and arms, in the character's wax colors. Ghostly characters (no feet) keep
  floating without a body. Small icons (pause screen forms, the transformation banner) still show
  the head alone.
- **The body faces where you walk** (front, back, left, right: legs step, arms swing); **the head
  faces where you shoot**, or where you walk when you aren't shooting, and after 0.35 s standing
  still it looks back down at you. Walking backwards while shooting forwards shows the body's
  back under a face looking at you.
- **Shooting**: the head squashes for 0.08 s with every shot; shots alternate between the left and
  right eye (3 px from the middle), and the eye that fires squints while the mouth opens. Shots
  leave 16 px above the feet.
- **Movement**: 8 directions on keys (diagonals as fast as straight lines), analog on the stick.
  Full speed in **0.1 s**, a short slide of **0.15 s** after letting go. Speed 1.0 = 125 px/s,
  crossing a room's floor in about 2.5 s; the speed stat stays between **0.1 and 2.0**.
- **Getting hurt**: the hurt face, the head knocked back for a moment, a red flash (0.18 s),
  a push away from what hit you (150 px/s), a screen shake and the hurt sound, then **1 s** of
  blinking invincibility (**1.33 s** after a hit of a full heart or more). Nothing hurts you
  while it lasts.
- **Low health** (1 heart or less, every kind of heart counted): a soft lub-dub heartbeat every
  0.85 s and the screen edges pulse red with each beat. Characters who die in one hit don't get it.
- **Death**: the body sinks into a puddle and the head melts after it as the flame goes out
  (1.4 s), a 0.8 s pause, then the death screen: **what got you, with its picture** (the enemy or
  boss; a ? for hazards), the floor, time, rooms, kills, damage taken, the seed, and **every item
  you carried**.

### 3. Shooting (`TUNING.tears`)

- **Fire rate** uses Isaac's formula. Every "+fire rate" (items, characters, pills) adds to the
  **tears stat T** (0 at the start), and the delay between shots in frames (30 per second) is:
  `16 - 6·sqrt(1 + 1.3·T)` for T ≥ 0 (never below **5** from T alone), `16 - 6·sqrt(1 + 1.3·T) - 6·T`
  for -0.77 < T < 0, and `16 - 6·T` for T ≤ -0.77. Shots per second = `30 / (delay + 1)`: **2.73**
  at the start, 3.23 at T 0.5, 3.80 at T 1, and the cap of **5.00** from T 2 up; T -0.5 gives 1.82,
  T -1 gives 1.30. Fire rate multipliers (`fireRateMul`) multiply the result and an item stat
  `tearDelay` changes the delay directly; both can go past the cap. The sidebar shows shots per
  second with 2 decimals. Every other weapon (beams, bombs, charge shots...) times itself from this
  number as before.
- **Holding** a direction fires over and over at that rate; **tapping** fires at once if the delay
  has passed since the last shot.
- **Shot speed** 1.0 = **180 px/s** (7.5 tiles a second), scaling linearly.
- **Range** starts at **6.5 tiles**. A shot flies level at eye height (16 px) above its shadow,
  then near the end of its range bumps up a little (28 px/s) and drops to the floor and splashes,
  landing right at the end of its range (the drop is part of it). More range = longer level flight.
- Shots keep **35%** of Wick's own movement, so strafing while shooting bends them that way.
- Every shot has a **shadow** on the floor; player shots are slightly see-through wax droplets
  (88%) with a highlight, radius 4 px at 3.5 damage, +0.3 px per point of damage (3–14 px).
- Shots splash on walls and on rocks and other solid tiles (spectral shots fly over).
- **Hitting an enemy**: it flashes white (0.06 s) then red (0.1 s), is pushed in the shot's direction
  (48 px/s × shot speed × size/4, so faster and bigger shots push harder), and the shot splashes.
- **Touch**: the shooting pad shoots in **4 directions** like Isaac by default; Settings > TOUCH AIM
  > 8-WAY allows diagonals.

### 4. Stats and damage (`TUNING.damage`, `TUNING.hud`)

- **Damage** uses Isaac's formula: `damage = (3.5 · sqrt(1 + damageUps · 1.2) + flatDamage) · multipliers`.
  Every "+damage" on items, pills and trinkets is a **damage up** and adds to `damageUps`, so each
  one is worth a bit less than the last: 3.50 at the start, 5.19 with one up, 6.45 with two.
  A negative total (damage downs) comes off **flat** after the square root, so stacking downs can't
  reach 0 (the floor is 0.5). Item stat `flatDamage` adds after the root; every `damageMul`
  (the character's, items') multiplies the result.
- **Characters** never add damage, they only multiply it: most are x1.0, the rest are between
  **x0.75** (Nib & Nub) and **x1.35** (Brick). The character table above lists each one.
- **Luck** starts at 0 and raises chances everywhere, always capped: shot effects
  (`base + luck · per-luck`, up to the effect's cap), room clear rewards, which items chests give,
  machine and beggar payouts, and pickup rolls.
- **Stats sidebar** (Settings > FOUND HUD, on by default): speed, fire rate (shots per second,
  2 decimals), damage (2 decimals), range, shot speed and luck, then this floor's devil and angel
  chances. When a stat changes, a small bobbing **green up arrow** or **red down arrow** shows next to
  it with the change (`+0.57`) for **3 s** (`TUNING.hud.statArrowTime`), fading out at the end.

### 5. Health and damage rules (`TUNING.health`)

- Damage is counted in **half hearts**. In **chapters 1-3** almost every enemy, contact and shot
  deals **half a heart**; minibosses, the biggest bosses, champions with extra contact damage (Sooty,
  Hulking), your own bombs and a few hazards (the sentinel beams, the giant's hands) deal a full heart.
- From **chapter 4** (the womb, `fullHeartChapter`) on, **every hit is at least a full heart**:
  enemies, shots, spikes, hazards, the thorned curse door and damage you choose to take (blood
  machines, the sacrifice spike, a bad pill). A full-heart hit gives the longer invincibility (1.33 s).
- **Damage order** is the same for every source: a Brass Heart cracks first, then the extra hearts
  from the right (Ash, Soot, Ribcage), then the Vigil heart, then Moldy Hearts, then blood.
- **No carry-over** (`carryOver: false`, Isaac's rule): a hit stops when it empties a whole extra
  heart or the Vigil heart. A full-heart hit on a last half Ash Heart takes only that half, not
  half a blood heart as well. Inside blood hearts a full hit still takes two halves.
- **Invincible means untouchable**: any damage during the blinking time after a hit (or a shield,
  ward, dash...) is ignored completely, with no knockback, no effects and no deal-chance penalty.
- Rotten Ratram now deals half a heart like other normal enemies.

### 6. Hitboxes (`TUNING.hitboxes`)

Everything is tested on the **floor plane**: a thing's position is its feet / its shadow, and the
sprite (Wick's big head, a shot's height above its shadow) is drawn above that. So a shot passing
over the top of Wick's head on screen is really behind him on the floor and misses.

- **Wick's hurtbox**: a small circle of radius **4** (8 px across, about 60% of his body with arms)
  at his lower body / feet. The head is never part of it: a shot that clips the hair or the top of
  the head misses. Twins and echoes (Nib & Nub, Echo) use the same size.
- **Wick vs walls, rocks and pits**: a **10x6 box around the feet**, so he can walk right up to
  rocks (his head overlaps them, they're behind him) and right up under the top wall. Doorways let
  him in up to 6 px (up/down doors) or 8 px (side doors) off the middle.
- **Reaching things** (pickups, pedestals, buttons, chests, machines, pushing bombs) uses a
  slightly bigger circle of radius **6** (`touch`), so grabbing things isn't fiddly.
- **Enemy shots** hit with **70%** of their visible radius (`enemyShotScale`): forgiving near-misses.
- **Wick's shots** hit with their full size against enemies' **full body circles** (`tearScale`,
  `enemyHurtScale`): it's easy to hit what you aim at.
- **Enemy touch**: only when the enemy's body circle overlaps the hurtbox (by 1 px, `contactInset`).
- **Pits**: flying enemies, flying Wick and every shot cross them; walking things can't.
- **Debug view**: Settings > **SHOW HITBOXES** (or **H** with `?debug`) draws them all: red =
  Wick's hurtbox, yellow = his feet box, green = enemy and boss bodies (faded while they can't hurt
  you, `F` = flying), cyan = Wick's shots, orange = enemy shots (the faint ring is their visible
  size), grey = tiles that stop walking, purple = pits.

### 7. Enemies and combat feel (`TUNING.enemies`)

- **Walking in**: the doors slam shut with a sound, enemies fade in (0.5 s) and then stand still for
  **0.5-1 s** (random each; `graceMin`/`graceMax`), counted from the moment you enter. Meanwhile
  they can't hurt you (touch or shots) but you can already shoot them. Coming back into a room you
  left uncleared gives the same wait. Enemies that spawn mid-fight (splits, nests) don't wait.
- **Telegraphs and recovery**: unchanged from the ENEMIES section (wind-up pose, red glow, shake,
  sound, white flash, dotted path, landing marks; stun after charges and jumps).
- **Deaths**: the body squashes flat and fades (**0.14 s**) while a burst of blood and
  **gibs** fly out (3 chunks + 0.45 per px of body radius; bigger enemies throw bigger chunks). Gibs
  bounce once and stay on the floor as specks. The floor stain is **1.3x the body radius**, and
  enemies of radius 12+ (minibosses, big ones) leave extra blotches around it. Every stain stays for
  the rest of the room; the colors come from the enemy's blood (red, green goo, dust, wax, tar...).
  Ghostly enemies leave nothing.
- **Enemy shots** are dark red **blood drops**: a darker red ball with two smaller drops trailing
  behind it (`shotTail`), a shadow on the floor, and the same flight as Wick's shots (level, then
  a little lift and an arc down to a splash at the end of their range). Themed shots (embers, goo,
  ghost fire, ice...) keep their color but get the same drop shape.
- **Status effects** wash the enemy in a pulsing color and show a small outlined **icon** over its
  head, one per status, side by side: **poison** green drop, **burn** orange flame, **slow** grey
  hourglass, **fear** purple skull, **charm** pink heart, **freeze** blue snowflake (art:
  `src/data/statusIcons.js`). Bosses show poison, burn and chill (freeze) the same way.
- **Bosses**: the VS screen when you walk in (Wick's portrait and name vs the boss, twice as big,
  with its name), the health bar along the bottom, and on death the shaking explosions, then a big
  burst of the boss's own blood (from its shot color: ember bosses bleed fire, ghosts pale wisps),
  **40 gibs**, a huge stain with splatters around it and **0.8 s of slow motion** (everything at
  30% speed, `bossSlowmo`/`bossSlowmoScale`).

---

## HEARTS

Health is counted in half hearts (`src/game/health.js`). At most **12 heart slots** in total.
The HUD shows them left to right in 2 rows of 6: containers, then the extra hearts in the order
they were gained, then Melted Hearts.

| Heart | Kind | What it does |
|---|---|---|
| **Blood Heart** | container + fill | red heart containers (empty or full); healed by Blood Heart pickups |
| **Ash Heart** | extra (soul-type) | temporary grey heart, lost before blood |
| **Soot Heart** | extra (black-type) | like an Ash Heart, but when one is lost it blasts every enemy in the room for 30 damage |
| **Vigil Heart** | overlay | a white half heart (white flame on the last container). Two make a new full container; one carried to the next floor becomes a container |
| **Brass Heart** | overlay | gilds a heart (brass rim). Cracks first when you're hit, scattering 3 coins |
| **Ribcage Heart** | extra container | holds 0-2 halves of blood; when hit while empty it breaks. An empty Ribcage still keeps you alive |
| **Moldy Heart** | replaces blood | a whole rotten heart in a container; lost before other blood (a whole heart per hit). Each one hatches a **gnat** (friendly fly that dives into the nearest enemy) when a room is cleared. Blood healing turns one back into blood |
| **Melted Heart** | dead slot | permanently blocks a heart slot (takes away a container, or the last extra heart) |

**Damage order** (like the original): a Brass Heart cracks first, then hearts are lost from the
right: Ash/Soot halves, Ribcage blood then the Ribcage itself, then the Vigil heart, then Moldy
Hearts, then blood. A hit never carries over from an extra heart or the Vigil heart into the
next kind, and from chapter 4 every hit is a full heart (FEEL AND TUNING section 5). **Healing**: blood fills containers, then Ribcages, then cures a Moldy Heart.
Gaining a container when all 12 slots are full pushes the rightmost extra heart off.
You die when nothing is left (no blood, no extra hearts, no Vigil heart).

---

## CHARACTERS

Base stats (`src/game/stats.js`): damage 3.50, fire rate 2.73 shots/s (tears stat 0), range 6.5
tiles, shot speed 1.00, speed 1.00, luck 0. Characters add to these (`x` multiplies); a character
or item's "fire rate +n" adds n to the **tears stat**, see FEEL AND TUNING section 3. Character damage is only ever a multiplier (x0.75 to x1.35, section 4).
Data: `src/data/characters.js`; looks: `src/data/characterSprites.js`; unique rules:
`src/game/mechanics.js`. Only Wick is unlocked at first. Pick on the **character select**
screen (NEW RUN / SEEDED RUN): left/right or swipe to browse, up/down or the TWISTED tab for the
twisted versions, confirm or tap the middle candle to start. Locked ones are dark silhouettes
that show how to unlock them.

The **pocket slot** is a second active item (Q / gamepad LT / PKT button, bottom-right of the HUD).
Some actives recharge over time (*timed*) or cost health instead of charge.

### Base characters (16)

| Character | Look | Hearts | Start | Stats | Special | Unlock |
|---|---|---|---|---|---|---|
| **WICK** (`wick`) | cream stub, orange flame | 3 blood | 1 bomb | base | a good place to start | from the start |
| **PIP** (`pip`) | tea light in a tin cup | 3 blood | 3 coins, pocket **Loaded Die** | luck +1 | Loaded Die (3 rooms) rerolls every item in the room | LUCK OF THE DRAW: use active items 15 times |
| **BRICK** (`brick`) | wide brick-patterned block | 5 blood | 2 bombs | dmg x1.35, rate -0.7, speed -0.2, shot spd -0.1; x1.4 shot size, x1.6 knockback | slow tank, huge shots | HEAVY HITTER: defeat 5 bosses |
| **VESPER** (`vesper`) | thin chapel taper in a lace veil, pale flame | 3 ash + 1 vigil | **Ashen Hymnal** | dmg x0.9, range +1 | only Ash Hearts (containers become Ash). Hymnal (3 rooms): 18+dmg to every enemy, +half Ash Heart | EVENSONG: reach chapter 3 |
| **CINDER** (`cinder`) | charred, jagged, ember cracks, horns, red flame | 1 blood + 2 soot | **Cinder Pact** | dmg x1.25, speed +0.05 | Pact (3 rooms): fiend form 10 s: +2 dmg, burning shots, flight | INTO THE FURNACE: reach chapter 4 |
| **PILFER** (`pilfer`) | grey-green, bandit mask, loot sack | 2 blood (1 brass) | 10 coins, 1 key | luck +2, speed +0.15, dmg x0.9 | enemies drop a coin 12% (+1%/luck) of the time | BIG SPENDER: buy 15 things in shops |
| **WISP** (`wisp`) | see-through blue ghost, no feet | none (one hit) | | speed +0.1; flight, spectral shots | dies in one hit; a ward blocks the first hit in every room | UNTOUCHED: finish a floor without taking damage |
| **MORROW** (`morrow`) | grey-green with bandage stripes | 3 blood | | dmg x0.93 | dies once and comes back as **MORROW, RELIT** (gold-sealed cracks, 1 blood + 2 ash, dmg x1.35, rate +0.3) | RELIT AGAIN: die 10 times |
| **NIB & NUB** (`nib`) | two striped birthday candles | 2 blood + 1 ash | | dmg x0.75 each | two candles move and shoot together; both can be hit; shared hearts | ENCORE: escape the cellar twice |
| **PRISM** (`prism`) | glass-cyan with facets and a monocle, violet flame | 2 blood + 1 ash | | rate -0.3 | can't shoot wax: hold to charge, release a piercing beam (5 ticks of 0.75x dmg) | WAX MASSACRE: snuff out 500 enemies |
| **MOTLEY** (`motley`) | patchwork, new colors each run | random | random: 2 passives, maybe an active | random | random health, stats, items and colors, all from the seed | PATCHWORK: escape with 3 different characters |
| **SEXTON** (`sexton`) | drippy tallow, gravedigger cap | 2 full ribcages + 1 ash | | speed -0.1, dmg x1.15 | can't shoot: swings a shovel (3x dmg in an arc, knocks away enemy shots). Containers become Ribcages | GRAVEDIGGER: break 10 marked rocks |
| **SPILL** (`spill`) | very melted, wax puddle at the base | 3 blood | | rate -0.4, speed +0.1 | leaves a trail of hot wax that burns and slows enemies standing in it | STILL MELTING: start 15 runs |
| **KILN** (`kiln`) | candle in a terracotta pot with glowing vents, hot blue flame | 3 blood | | dmg x0.85 | shooting builds heat (up to +90% dmg); at full heat he erupts (12 burning shots) and must cool 1.2 s | FIRED CLAY: defeat The Old Boiler |
| **ECHO** (`echo`) | lavender with ring marks and a bell | 2 blood + 1 ash | | dmg x0.9 | every volley rings again 0.35 s later from where you stood (60% dmg) | THE MOTH'S BELL: defeat the Moth Queen |
| **BEACON** (`beacon`) | red/white lighthouse bands, glass lamp | 3 blood | pocket **Spare Candle** | dmg x0.85 | Spare Candle (1 room): plant a candle that shoots enemies this room (max 3) | LIGHT KEEPER: pick up 40 different items |

### Twisted characters (16)

Harder and played differently. Each is unlocked by finding a secret with its base character;
that secret arrives in part 7. **Placeholder until then: reach chapter 3 with that character.**

| Character | Look | Hearts | Start / stats | Twist |
|---|---|---|---|---|
| **WICK, HOLLOW** (`wick_t`) | grey-blue, cracked, hollow eyes, void flame | 3 blood | | only 6 items: a 7th pushes the oldest back onto the pedestal |
| **PIP, LOADED** (`pip_t`) | sickly wax, rusted cup, red eyes | 2 blood + 1 ash | luck +2 | every free item pedestal flickers between two items; you get whichever is showing |
| **BRICK, CRUMBLED** (`brick_t`) | dark, broken top, cracks | 8 containers, 6 full | dmg x1.35, rate -0.6, speed -0.25, x1.5 shot size | loses half a heart every 12 s in fights; enemies drop half hearts that fade after 4 s (25%) |
| **VESPER, UNSUNG** (`vesper_t`) | dark taper, purple veil, void flame | 4 ash | **Unsung Hymnal**, dmg x0.85 | Hymnal costs half a heart (never the last): 3 wisps orbit you and block 2 shots each |
| **CINDER, SMOTHERED** (`cinder_t`) | blacker, one broken horn | 2 soot + 2 melted | pocket **Smother Step**, dmg x1.35, speed +0.1 | Smother Step (timed 2.5 s): dash as smoke, untouchable, 3x dmg to everything passed |
| **PILFER, PAWNED** (`pilfer_t`) | gold wax, mask, sack | 2 blood, both brass | 15 coins, Gnawed Rabbit's Foot, luck +3, speed +0.2 | touching an item breaks it into 2 + 2x quality pickups |
| **WISP, FADED** (`wisp_t`) | dark ghost, blindfold | none (one hit) | pocket **Pale Veil**; dmg x0.85, speed +0.2, rate +0.5; spectral + piercing | one hit, no flight; Pale Veil (2 rooms) blocks the next hit |
| **MORROW, TWOFOLD** (`morrow_t`) | half dead / half alive | Dawn: 3 blood; Dusk: 1 blood + 2 soot | | swaps form every cleared room, each with its own hearts. Dawn: rate +0.8, dmg x0.8, speed +0.1. Dusk: dmg x1.35, rate -0.5, flight |
| **NIB, ALONE** (`nib_t`) | grey with black stripes | 3 blood | dmg x1.15 | the Shadow of Nub hunts you in every fight: can't be hurt, charges every few seconds (telegraphed), hurts you for a full heart and tramples enemies too |
| **PRISM, SPLINTERED** (`prism_t`) | cracked rose glass | 2 blood + 1 ash | | a steady beam while you hold shoot; 60% move speed while firing |
| **MOTLEY, UNSTITCHED** (`motley_t`) | darker patchwork with a seam | random | random | random start, and every hit rerolls all your items and stats |
| **SEXTON, UNEARTHED** (`sexton_t`) | bone-white, cracked, hollow eyes | 3 ribcages (half full) | speed +0.05 | throws the shovel; it flies out and back (2.5x dmg each way). One at a time |
| **SPILL, FLOODED** (`spill_t`) | blue, melted into a big puddle | 3 blood (2 moldy) | | slippery movement; every shot splashes a puddle of hot wax |
| **KILN, CRACKED** (`kiln_t`) | dark cracked pot | 3 blood | | heat rises by itself in fights; shooting vents it; at full heat you erupt and take half a heart |
| **ECHO, ASTRAY** (`echo_t`) | dark violet, cracked bell | 2 blood + 1 ash | | an echo body walks your path 1.1 s behind and repeats your shots at full damage. If it gets hit, so do you |
| **BEACON, DIMMED** (`beacon_t`) | grey with dark bands, broken lamp, hollow eyes | 3 blood | pocket **Tallow Stub** | can't shoot. Tallow Stub (timed 3 s): plant a candle (1.2x dmg, 14 s, max 4) |

---

## RUN STRUCTURE: FLOORS & CHAPTERS

A run is 9 floors: 4 chapters of two floors each, like Isaac (chapter 5+ comes in part 7), plus
a short **finale**, THE WICK'S END, below chapter 4:
chapter 1 the cellar, 2 the caves, 3 the depths, 4 the womb. Every floor picks one of its
chapter's **variants** at random from the seed (unlockable ones only once unlocked). Floors grow
bigger and harder deeper down. Data: `src/data/floors.js` (difficulty), `src/data/variants.js`
(variants). Between floors a **title card** shows the floor's name and chapter (and its curse, if
it has one; it also builds the floor's rooms in the background).

| # | Chapter | Rooms | Big-room chance | Enemy HP | Extra enemies | Champions | Boss pool (HP x) |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 8–9 | 15% | x1.00 | 0% | 2% | early bosses (x1.00) |
| 2 | 1 | 11–12 | 18% | x1.10 | 5% | 4% | early bosses (x1.15) |
| 3 | 2 | 15–16 | 20% | x1.30 | 10% | 6% | chapter-2 bosses (x1.60, +1 shot tier) |
| 4 | 2 | 18–19 | 22% | x1.45 | 15% | 8% | chapter-2 bosses (x1.85, +1 tier) |
| 5 | 3 | 20 | 25% | x1.65 | 20% | 10% | chapter-3 bosses (x2.30, +1 tier) |
| 6 | 3 | 20 | 25% | x1.80 | 25% | 12% | **The Chandler** (giant, always; x2.60) |
| 7 | 4 | 20 | 30% | x2.00 | 30% | 14% | chapter-4 heavyweights (their own HP) |
| 8 | 4 | 20 | 30% | x2.20 | 35% | 16% | **The Tallow Heart** (giant, always, only here) |
| 9 | finale: THE WICK'S END | 6–8 | 15% | x2.30 | 35% | 18% | **The Snuffer** (final). Only a treasure room: no shop, no extra special rooms, no crawlspace |

(Rooms counts the start and special rooms, not the hidden ones; big-room chance is the chance a
new room tries to be a big room, about 0.2 big rooms on floor 1 up to ~4 in chapter 4. See
**Floor generation** under ROOM TYPES for every rule.) Bosses are drawn per floor from the chapter's
pool and never repeat in a run while others remain. Beating a floor's boss opens a **trapdoor** to
the next floor (on the final floor, a **beam of light** leads out = victory). Items, health, coins,
bombs and keys carry over.

### Double bosses and boss champions

- **Double bosses**: from chapter 3 on, a floor's boss is a **pair** 25% of the time (two
  different bosses from the chapter's pool, side by side, each at 65% health). The intro card
  names both, the health bar shows both, and the reward only drops when the second one falls.
  Never on a giant's floor or the finale. (`DOUBLE_BOSS_*` in `src/game/game.js`.)
- **Boss champions**: from floor 3, a floor's boss is a **champion** 10% of the time (+3% per
  floor deeper). It's tinted, renamed and pays out an extra heart and 3 coins. Never giants or the
  final boss. Data: `BOSS_CHAMPIONS` in `src/data/bosses.js`.

| Champion | Look | Trick |
|---|---|---|
| THE CRIMSON … | red | 1.4x health |
| THE SWIFT … | gold | 1.1x health, moves 30% faster, 35% less rest between attacks |
| THE HOLLOW … | violet | 1.15x health, a ring of 6 violet shots after every attack, bursts into 14 when it dies |

### Curses

From floor 2 (never the finale), a floor is **cursed** 28% of the time. The curse's name shows
on the floor card in red. Picked from the seed, so a seed always has the same curses.
Data: `src/data/curses.js`; effects: look for `this.curse` in `src/game/game.js`.

| Curse | id | Effect |
|---|---|---|
| **CURSE OF THE GUTTERED FLAME** | `darkness` | the whole floor is dark except a small circle of light around Wick |
| **CURSE OF THE TORN MAP** | `lost` | the minimap shows only the room you're in, the big map is torn, and the floor has 4 more rooms |
| **CURSE OF THE SPRAWL** | `labyrinth` | (only on the first floor of a chapter) the floor swallows the next one: 1.8x the rooms (max 45), named "… XL", two treasure rooms and **two boss rooms back to back**: the first holds the floor's own boss (an item when it falls, no trapdoor), the second the next floor's boss (a giant included) and the trapdoor, which skips a floor |
| **CURSE OF THE BLANK HEART** | `unknown` | your health shows as "???" |
| **CURSE OF THE WANDERING DOORS** | `maze` | going through a door between two plain rooms sometimes (15%) drops you in another visited plain room instead |
| **CURSE OF THE VEILED ALTARS** | `blind` | every item on a pedestal (shops too) is a "?" until you pick it up, and item info is hidden |
| **CURSE OF THE RESTLESS** (ours) | `restless` | walking back into a plain room you cleared: 30% chance 2–3 of the floor's enemies rise again. The doors shut; clearing them gives no reward |
| **CURSE OF THE SHORT WICK** (ours) | `shortwick` | your range is cut to 70% for the floor |

## FLOOR VARIANTS

Each variant is its own place: its own tileset (floor pattern, walls, rocks, breakable obstacle),
decorations, lighting, ambient particles, music, hazards and exclusive enemies, plus enemy room
templates ("groups") so every room's mix makes sense. Status: ✅ done, 🚧 being built (only
reachable with the debug floor picker), 🕰 placeholder (the old look until its chapter is rebuilt).

| Chapter | Variant | Status | Identity |
|---|---|---|---|
| 1 | **THE UNDERCROFT** (`undercroft`) | ✅ | old storage vaults. Warm flagstones, brick walls with candle alcoves (they glow and flicker), sagging bottle shelves, rusty pipes and chains; straw, broken boards and drain grates on the floor; wine **barrels** as the breakable obstacle; drifting dust; music: *undercroft* (a slow, creaky 3/4 waltz). Hazard: **rat holes** in the walls that let a gnawer out every few seconds while the room's own enemies live (eyes glint red and it squeaks first; max 2 rats per hole). Miniboss: Rat Matron |
| 1 | **THE WEEPING HOLLOW** (`weeping`) | ✅ | a damp cellar gone green. Mossy cobblestones and stone walls, hanging roots, moss curtains, glowing teal fungus (cold light sources), water seeping down the walls; puddles, mushrooms, bones and old webs on the floor; cobwebs in nearly every corner; web-wrapped **cocoons** as the breakable obstacle (a quarter of them hold a crawlspider); dripping water and floating spores; darker, green light; music: *weeping* (slow, sparse echoing notes over a cold drone, water dripping). Hazard: **sticky webs** (1–4 per room, more from enemies): walking through one slows you to 45% speed (flying is immune); 3 shots tear it, burning shots and bombs destroy it. Miniboss: Loom Mother. Boss: The Weaver shows up here more often |
| 1 | **THE SMOLDER** (`smolder`) | ✅ 🔒 | a cellar that caught fire and never went out. **Unlocked by** INTO THE FIRE (defeat 2 bosses). Charred plank floor, blackened brick, burning torches and glowing ember cracks on the walls (warm flickering lights), ash piles, scorch marks and glowing coals on the floor; dented **coal buckets** as the breakable obstacle; rising embers; orange light; music: *smolder* (a restless D-Phrygian pulse with crackling hats). Hazards: **fireplaces** (burning junk: touching hurts, 4 shots or a bomb put them out) and wall **fire jets** (the nozzle glows and hisses for 0.9 s while the danger zone shows, then 1 s of flame 3 tiles long). Miniboss: Ember Hound. Boss: **The Tallow Pyre** (only here) |
| 2 | **THE GROTTO** (`grotto`) | ✅ | raw caves dug by miners long gone. Lumpy bare-rock floor, raw cave walls with stone icicles, glowing blue **crystals** (cold lights) and hanging miner's lanterns (warm lights); gravel, crystal shards and old mine-cart rails on the floor; split rocks full of crystals as the breakable obstacle; dust and drips; music: *grotto* (a heavy 7/8 trudge in C minor, bell notes ringing off the walls). Hazard: **cracked ceilings**: during a fight a rock falls near you every few seconds (its shadow grows for 1 s first; it hurts enemies too). Miniboss: Stonemaw. Bosses: The Grotto Maw and The Shrieking Mother show up here more often |
| 2 | **THE OSSUARY** (`ossuary`) | ✅ | catacombs. Small square grave tiles, walls built of **packed skulls** between courses of long bones, skulls in wall niches, candle ledges (warm lights), stacked bones and chains; scattered bones, skulls and wax puddles with candles on the floor; stone **bone urns** as the breakable obstacle (some hold a rattleskull); dust and low fog; music: *ossuary* (a slow funeral organ in G minor, a tolling bell and a faint heartbeat). Hazard: **dart traps**: carved skulls in the walls whose eyes light up (0.7 s, the line shows) before they spit a dart across the room. Miniboss: Bone Colossus. Bosses: The Gravedigger and The Bone Choir show up here more often |
| 2 | **THE SUNKEN CAVES** (`sunken`) | ✅ 🔒 | flooded caves. **Unlocked by** DEEPER STILL (reach chapter 3). Smooth wet stone with pools of standing water, barnacle-crusted walls with streams trickling down, glowing fungus; puddles, shells and reeds on the floor; barnacled jars as the breakable obstacle (a quarter hold a leech); drips and fog; teal light; music: *sunken* (a floating Fmaj7 pad with echoing arpeggios and bubbling drips). Hazard: **currents**: a band of fast water across the room (ripples show which way) that carries you along (flying is immune). Miniboss: The Undertow. Bosses: The Bloated Drowner and The Deep Angler show up here more often |
| 2 | THE ROOT TUNNELS (`tunnels`) | 🕰 | retired placeholder (kept only so old saves still load) |
| 3 | **THE UNDERHALL** (`underhall`) | ✅ | vast halls of black stone under everything. Huge two-tile slabs, massive ashlar walls with burning iron braziers (warm lights), hanging chains, empty cages and tattered banners; rubble, dropped shackles, bones and grates on the floor; rusty iron lanterns as the breakable obstacle; dust and embers; music: *underhall* (a grim D-minor march, boots-on-stone drums, organ and brass stabs). Hazard: **spike traps** (iron plates, often in short rows: during a fight they click and their holes glow red for 0.6 s, then spikes stand up for 1 s; flying is safe). Miniboss: The Jailer. Bosses: The Chained Warden and The Twin Gargoyles show up here more often |
| 3 | **THE WAX TOMBS** (`waxtombs`) | ✅ | the crypts of the old chandlers. Polished marble floor in big diamonds with veins, marble panel walls, mourning statues in niches, ledges of violet candles (cold violet lights), skulls and banners; dead flowers and violet candle stubs on the floor; sealed marble **urns** as the breakable obstacle (some hold a soul moth); fog and dust; violet light; music: *waxtombs* (a slow 6/8 lament in B minor, bells over a choir-like pad). Hazard: **soul braziers** (stone bowls of violet fire: during a fight they flare for 0.8 s, then let out a slow ring of 6 soul-fire shots; 6 shots or a bomb put one out). Miniboss: The Embalmer. Bosses: The Shrouded King and The Candle Saint show up here more often |
| 3 | **THE MIRE** (`mire`) | ✅ 🔒 | the depths gone rotten. **Unlocked by** BLACK WATER (defeat 10 bosses). Black sucking mud, raw cave walls streaked with ooze, sickly green glowing fungus (green lights), roots and moss; bubbles, rotting logs and mushrooms on the floor; tar-filled barrels as the breakable obstacle (some hold a tarling); spores and drips; murky green light; music: *mire* (a sluggish E-Phrygian bass, slurpy plucks, drips). Hazards: **tar pools** (glossy black puddles: you wade through at under half speed; oozers, the Bog Mother and the Muck Knot add more that dry up after 9 s) and **oozing ceilings** (during a fight, drops of ooze fall near you, their shadows growing for 0.9 s, and splat into poison puddles). Miniboss: The Bog Mother. Bosses: The Blighted Toad and The Muck Knot show up here more often |
| 3 | THE COAL VAULTS (`vaults`) | 🕰 | retired placeholder (kept only so old saves still load) |
| 4 | **THE FLESHWORKS** (`fleshworks`) | ✅ | below the cellars the wax turns to meat. Pulsing flesh floor and walls, veins, tumors and eyes in the walls; blood stains, teeth and umbilical cords on the floor; **pustules** as the breakable obstacle (some hold a clotling); drips and spores; deep red light; music: *fleshworks* (a slow wet heartbeat under a low groaning drone). Hazard: **blood geysers** (a puckered vent: during a fight it swells and glows for 0.8 s, then sprays a column of blood that hurts and a ring of drops). Miniboss: The Mother of Clots |
| 4 | **THE BLACK WOMB** (`blackwomb`) | ✅ | dead flesh gone black. Near-black flesh, soot and eyes in the walls, ash piles, bones and teeth; **cysts** as the breakable obstacle; dust and fog; very dark violet light; music: *blackwomb*. Hazard: **bile pools** (still black pools that burn while you stand in them; flying is safe). Miniboss: The Hollow Mother |
| 4 | **THE SCARRED WOMB** (`scarred`) | ✅ 🔒 | old wounds badly healed. **Unlocked by** OLD WOUNDS (beat The Tallow Heart). Pale pink scar-tissue floor crossed with scar lines, stitched walls; **bandaged lumps** as the breakable obstacle (some hold a picker); dust and drips; music: *scarred*. Hazard: **sutures** (lines of barbed thread stitched out from a wall: touching hurts; 3 shots cut one, burning shots and bombs at once). Miniboss: The Surgeon |
| 4 | THE DROWNED WELL (`well`) | 🕰 | retired placeholder (kept only so old saves still load) |

## ROOM TYPES

Rooms are built from screen-sized **units** (13x7 tiles). Shapes (`src/game/shapes.js`):
**1x1**, big rooms **2x1**, **1x2**, **2x2** and **L-shapes** (2x2 with one corner missing; the
camera scrolls to follow you), and narrow **halls** (only the middle 3 rows) and **shafts** (only
the middle 5 columns). Doors sit in the middle of each outer edge of each unit (none facing an L's
missing corner; halls only left/right, shafts only up/down), and rooms only ever touch where both
have a door spot, so every two rooms that touch share a door. Each chapter has its own layouts
(`src/data/rooms/`), mirrored for variety: chapter 1 has **35** (22 one-screen, 2 halls, 2 shafts,
3 2x1, 2 1x2, 2 2x2, 2 L); chapter 2 has **37**: 6 hand-made (a chasm with a bridge,
stalagmites, a cave-in, a pool, a long chasm, a 2x2 cavern) plus 31 made by the **layout
generator** (`src/data/rooms/generate.js`) in the chapter's style (more pits, pools, rubble and
rock rings): 20 one-screen, 2 halls, 2 shafts, 2 2x1, 2 1x2, 1 2x2, 2 L. Chapter 3 has **37** too:
6 hand-made (a colonnade, rows of sarcophagi, a throne dais ringed with spikes, a sunken floor, a
long gallery, a 2x2 great hall) plus 31 generated in its style (pillars, rows of iron blocks, spike
runs). The generator is
deterministic (same layouts every time), mirrors what it paints, keeps the space in front of every
door clear, and only keeps layouts where every door is reachable. Special rooms are always one screen.

| Room | Where | What's in it |
|---|---|---|
| Start | middle of each floor | empty; control hints on floor 1 |
| Normal | everywhere | a hand-made layout with rocks, pits, spikes, breakables, iron blocks, marked rocks and enemy spawns, filled from one of the variant's enemy groups (sometimes a miniboss instead). Doors lock until all enemies are dead; clearing it has a 45% (+4%/luck) chance to drop a pickup |
| Treasure | a dead end, gold door | one item from the **treasure pool** on a pedestal |
| Shop | a dead end, padlocked (costs 1 key) | the mole shopkeeper sells 2 items (15c, some 10c) and 2 pickups (3–8c) |
| Boss | the farthest dead end (never next to the start), red toothed door | the floor's boss; afterwards a **boss pool** item, a heart and the trapdoor. A Sprawl floor has two, back to back |
| Secret | an empty cell wedged between rooms, usually 3–4 (never next to a boss room or The Nook; never needed to reach any room) | hidden; bomb a shared wall to open it (every neighbor has one). Holds a **secret pool** item |

Tiles: rock (bombs break), pit (blocks walking; fliers cross), spikes (half a heart, unless flying),
jar (2 shots break it; 30% drop chance), iron block (indestructible), marked rock (glowing X;
bombing it drops 2–3 pickups).

### Floor generation

Code: `src/game/floorgen.js` (the plan: pure data, no art), `src/game/floor.js` (rooms and doors
from the plan), checked by `tools/floortest.js`. Everything comes from the seed, so a seed always
gives the same floors. A floor is grown again from scratch whenever a rule below fails (on average
~8 tries, a few milliseconds).

1. **The room tree.** A 13x13 grid; the start room is always the middle cell (6, 6).
   - Rooms on floor *n*: `min(20, (0 or 1) + 5 + floor(n * 10 / 3))`, so 8–9 on floor 1, 11–12 on
     floor 2, 15–16 on floor 3, 18–19 on floor 4 and 20 from floor 5. Curse of the Sprawl: x1.8 (max
     45). Curse of the Torn Map: +4. The finale has its own size (6–8 rooms, 3 dead ends). There is
     no hard mode yet (it would add 2–3).
   - Rooms grow **breadth-first** from the start room: each room in the queue tries its 4 sides. A
     neighbor cell is skipped if it is already a room, if it would touch **more than one** room
     (so the floor stays a **tree**: no loops, no 2x2 blocks of rooms), if the floor is full, or on a
     **50% coin flip**. Otherwise it becomes a room and joins the queue.
   - **Big rooms** (2x1, 1x2, 2x2, L): a new room (not right next to the start) sometimes tries to
     be a big room instead (floor data `bigChance`, 15% on floor 1 up to 30% in chapter 4). The
     one-neighbor rule applies to the cell next to the door; all its cells must be empty, it must not
     touch any other room (no loops), and an L's missing corner is kept empty for good. A big room
     counts as one room, and as one step for distances.
   - A room with exactly one neighbor is a **dead end**; only one-screen dead ends take special rooms.
     A floor needs at least **5** (+1 on every floor but the first, +1 on a Sprawl floor).
   - Thrown away and grown again if: the room count isn't reached, there are too few dead ends,
     the start room has fewer than 2 neighbors, or a boss room ends up next to the start room.
2. **Special rooms.** Distance = rooms walked through from the start. The dead ends are sorted
   farthest first and handed out in this order (a room that fails its roll gives its dead end to
   the next one; when the dead ends run out, the rest don't appear):
   1. **Boss room**: the farthest dead end, always. A Sprawl floor gets **two boss rooms back to
      back**: a second one grows off the far side of the first (the first holds the floor's own
      boss and an item, the second the next floor's boss and the trapdoor).
   2. **The Nook** (super secret), always: the next dead end that hangs off a **plain** room (never
      a special room); it sits behind a bombable wall.
   3. Then the list the game rolls on arrival (`chooseSpecials` in `src/game/specials.js`, odds in
      `SPECIAL_ODDS`): **shop** (always in chapters 1–3, 66% in chapter 4), **treasure room** (always
      in chapters 1–3, two on a Sprawl floor, 50% in chapter 4), **The Orrery** (chapters 1–3: 1% +
      20% per treasure room you skipped, max 60%), **The Offering Room or The Gambler's Den** (15%,
      +15% at full red hearts; the den 20% of the time, 50% with 2+ keys), **The Reading Room** (10%),
      **The Thorned Room** (40%), **The Lair** (25%, +15% on floor 1), **The Gauntlet** (50%, only at
      full red hearts and never on floor 1; **The Great Gauntlet** on a chapter's second floor),
      **The Parlor or The Strongroom** (60% on a chapter's second floor with 5+ coins; the strongroom
      20% of the time, 50% with 2+ keys), a **bedroom** (Nursery or Sickroom; 5%, +25% on your last
      heart, chapters 1–3). Each also needs its unlock and its floor range.
   A continued run reuses the saved list, so its floor comes out the same.
3. **Narrow rooms.** Some plain one-screen rooms whose neighbors all line up become a **hall**
   (neighbors only left/right) or a **shaft** (only up/down); the cells on their blocked sides are
   kept empty for good.
4. **The secret room** (placed last) goes in an **empty cell that isn't part of the tree**, so it
   never replaces a room and is never needed to reach one. Every empty cell next to at least one
   room is scored: a random 10–14, −3 if it touches only 2 rooms, −6 if only 1; the best wins, so
   it is usually wedged between 3 or 4 rooms. Never next to a boss room, The Nook or another hidden
   room, and only where every neighbor has a wall it can open into. **The Underneath**'s spot is an
   empty cell two steps from a plain room (through another empty cell), touching nothing.
5. **Doors** come from the grid: every two rooms that touch get a door in the exact middle of the
   shared wall (a big room gets one per touching side of each screen). Rooms can only touch where
   both have a wall middle (never an L's missing corner or a narrow room's blocked side). Hidden
   rooms get **bombable walls** instead, on every neighbor that touches them. A door takes the look of
   the room behind it (`doorKind`: boss, treasure, shop, Thorned Room...).
6. **Doorways.** Every room keeps the tile in each doorway and the tile in front of it clear
   (rocks, pits, spikes and jars there are removed when the room is built, whatever the layout), so
   every door and bombable wall can be walked through, and the layouts themselves are checked so
   every door can reach every other one.
7. **Checks** after every floor: walking only through ordinary doors from the start reaches every
   room except the hidden ones; every two touching rooms share a door on both sides; one (two)
   boss rooms on the farthest dead end, not next to the start; the start has 2+ neighbors; exactly
   one secret room and one Nook in the right places; special rooms on one-screen dead ends.
   `tools/floortest.js` (open `tools/floortest.html` with the dev server running) generates 10,000
   floors with random seeds, floor numbers, curses and special-room lists and checks every rule
   above, plus the counts, the farthest-first order, the door looks and (every 50th floor) every
   room's doorways and spawn spots. Last run: **10,000 / 10,000 passed**.

**Safe spawn spots.** Everything that appears during play (beggars and machines from cards,
chests, pickups, item pedestals, the trapdoor, enemies from cards, items and machines, hazards)
gets its spot from one function, `room.findFreeSpot(x, y)` in `src/game/room.js`: it tries the wanted
spot first (next to you, for a card), then spirals outward ring by ring. A tile is free only if it
is floor (no wall, rock, pit, spikes, fire or other hazard), **more than 2 tiles from every door**
(in a boss room, from every wall middle, since a deal door may open there), not under something
already there (pedestal, machine, chest, trapdoor, pickup, enemy, shopkeeper), and putting
something solid on it still leaves a walkable path between all the doors. Pickups and enemies may
share a tile. If nothing in the room is that safe, the rules loosen step by step.

**Debug floor map** (`?debug`, key **L**, or `WICK.game.toggleDebugFloorMap()`): the whole plan
with every room colored by kind (secret rooms too), the steps from the start in each room, dead
ends rimmed in yellow, blocked cells as dots, the ultra secret spot as a red U, the two boss rooms
of a Sprawl floor as B1/B2, and the seed, room count, dead ends and how many tries the floor took.
L, Esc or a tap closes it.

### Special rooms

Data: `src/data/specialRooms.js` (names, doors, minimap icons, layouts, odds in `SPECIAL_ODDS`),
logic: `src/game/specials.js`. Each floor rolls its special rooms as you arrive (`chooseSpecials`)
and they take the dead ends farthest first, in a fixed order (see **Floor generation** above);
the chances in the table depend on your hearts, keys and coins.
Every special room shows its name on a banner the first time you walk in and has its own minimap
icon and door.

| Room (id) | Door / how in | Chance, where | What's in it |
|---|---|---|---|
| **The Nook** (`supersecret`) | hidden wall of exactly **one** plain room (bomb it); it takes the farthest dead end after the boss's | every floor | a **secret pool** item, or (half the time) a pile of hearts and silver |
| **The Underneath** (`ultrasecret`) | not connected at all: only a **red room** made next to it leads in | every floor has its spot (2 steps from an ordinary room) | 2 items (secret or bargain pool); spiky red room |
| **Crimson rooms** (`red`) | made by the **Crimson Key** behind the wall nearest you (raw red doorframe) | anywhere there's an empty unit | an ordinary room of the floor, in red; links to every neighbor it touches |
| **The Thorned Room** (`curse`) | thorned purple door: **half a heart every time you pass through** (flying is safe) | 40%, floor 2+ | spikes around the edge; a treasure item, or (40%) a chest and a locked chest |
| **The Offering Room** (`sacrifice`) | normal | 15% (+15% at full red hearts), floor 2+ | a tall iron spike on an altar. Touch it to bleed half a heart (doesn't count against deals); payouts by count (below) |
| **The Parlor** (`arcade`) | violet door ringed with bulbs, a **coin slot** (1 coin) | 60% on a chapter's second floor with 5+ coins (80% of the time; else The Strongroom) | 4 machines picked from the arcade list (slots, the booth, the drawing chair, the thimblerigger, the claw, the penitent box, a beggar; see **Machines and beggars**) |
| **The Gauntlet** (`challenge`) | steel door with crossed blades, **barred unless your red hearts are full** | 50%, only at full red hearts, floor 2+ (first floor of a chapter) | a treasure item. Taking it springs an **ambush**: the doors shut, 3 waves of the variant's enemies |
| **The Great Gauntlet** (`bosschallenge`) | barred unless full, teeth over the door | instead of The Gauntlet on a chapter's second floor | a boss item; taking it brings 2 waves of a boss each from the chapter before, at 60% health; a heart after |
| **The Reading Room** (`library`) | book-spine lintel, **costs a key** | 10%, floor 2+ | 2 **books**: take one, the other crumbles |
| **The Strongroom** (`vault`) | riveted iron, **costs a key** | in place of The Parlor (20% of the time, 50% with 2+ keys), floor 2+ | 4 chests (2–4 pickups each) and 2 **locked chests** (a key each: 30% an item, else 4–6 pickups) |
| **The Gambler's Den** (`dice`) | green felt door with pips, **costs a key** | in place of The Offering Room (20% of the time, 50% with 2+ keys), floor 2+ | a big die face in the floor (1–6 pips, rolled per floor). Step on it once (below) |
| **The Nursery** (`nursery`) | pink door | 5% (+25% on your last heart) for a bedroom, chapters 1–3; half the time this one | a clean bed: lie down to heal all red hearts (+ a Vigil half heart if already full); 2 pickups |
| **The Sickroom** (`sickroom`) | pink door | the other half of the bedrooms | a dirty bed: 2 Ash Hearts, but 2 crawlspiders come out of the sheets; 2 pickups |
| **The Lair** (`miniboss`) | small skull keystone | 25% (+15% on floor 1) | one of the variant's minibosses; a chest when it's dead |
| **The Orrery** (`planetarium`) | starry blue door, **costs a key** | floors 2–6: 1% + **20% for every treasure room you left unopened** (max 60%; 1% once you've found one) | 3 **star items**: take one, the others fade |
| **Crawlspace** | a ladder under **one rock** of an ordinary room (45% of floors from 2 on): bomb the right rock | | a side-view hole (`src/game/crawlspace.js`): walk, climb ladders, no jumping. An item on a ledge and a couple of coins; or (25%) a passage at the far end to **The Back Room** |
| **The Back Room** (`blackmarket`) | through a crawlspace | | the mole sells 4 items (treasure/shop/boss pools) **for heart containers** (1 or 2); a ladder back up |
| **Misprint** (`error`) | very rarely (0.6%, once per floor, floor 2+) walking between two ordinary rooms takes you here instead | | a glitched room with 2 items from any pool (take one). Every door leads to a random room you've been in |
| **The Bargain** / **The Vigil** | after the floor's boss (see Deals) | | |
| **The Procession** (`bossrush`) | a gilded door in The Chandler's room if you beat her **within 22 minutes** of the run and own the unlock THE PROCESSION | | **boss rush**: 6 waves of 2 bosses from chapters 1–3 (at 45% of the floor's boss health); 2 boss items at the end |

**Sacrifice payouts** (per floor, by number of bleeds): 1: 50% 2 coins · 2: 50% a key ·
3: 66% an Ash Heart · 4: 50% a chest · 5: 33% a free item of The Vigil (a Soot Heart if you've
made a bargain) · 6: 50% 3 coins and a bomb · 7: 33% Vigil item · 8: 50% a Brass Heart ·
9: the variant's miniboss wakes up · 10+: 50% a free item of The Bargain.

**Die faces** (`DICE_FACES`): 1 your passive items change into others · 2 the pickups in the room
change · 3 four random pickups · 4 your items change and a random stat goes up · 5 the whole floor
rearranges itself (same variant, new rooms) · 6 a free treasure item.

**Multiple bosses.** A room can hold several bosses at once (`room.boss` + `room.extraBosses`):
shared health bar, all of them hit and hittable; the reward comes when the last one falls. Used by
the boss challenge room, the boss rush and The Vigil's statues; double bosses use it too.

### How special rooms look

Every special room has its own look besides its palette, so you know where you are at a glance
(data: `src/data/roomDecor.js`, painted by `src/game/roomdecor.js`; props: `src/game/propart.js`).
Sprites come from free CC0 asset packs (Dungeon Crawl Stone Soup tiles, the 80s Arcade set; see
CREDITS.md), recolored into our palette ramps and outlined at load time (`src/engine/packart.js`,
registry `src/data/packArt.js`). Things no pack has (bookshelves, beds, the telescope, rugs,
candles, counters, cages, machines, beggars) are drawn in code in the same style.

| Room | Inside |
|---|---|
| Treasure | small red-and-gold rug under the pedestal, gold coins in the corners, candles |
| Shop | long rug, the mole behind a brass-edged counter, crates, a heap of gold, skull lanterns; sometimes a restock box |
| Secret / Nook | skull piles, chains on the walls |
| The Underneath | walls full of red eyes, a pool of blood, gargoyles, skulls |
| The Thorned Room | dark red walls full of eyes, a blood pentagram, blade traps, chains, a red skull lantern |
| The Offering Room | a big pool of blood round the spike altar (a stone altar with a tall bloody iron spike that gets bloodier), bones in the walls, chains, candles |
| The Parlor | a garish carpet, strings of blinking bulbs, a mirror ball |
| The Gauntlets | a chalk ring of sigils on the floor, blade traps, banners, torches (the great one: bone walls, a blood ring) |
| The Reading Room | bookshelves along the wall, candles, a long rug |
| The Strongroom | gold-inlaid flagstones, heaps of gold, hanging cages, chests |
| The Gambler's Den | green baize with a gold edge, a stone die face set in the floor (pips glow red until used), dice, a deck of cards |
| The Nursery / Sickroom | a carved bed, a rug (clean pink / rotten green with stains), a cradle / buckets |
| The Lair | bone walls, blood, skulls, cages |
| The Orrery | a floor of stars with a swirl in the middle, a brass telescope, an orb on a stand |
| The Bargain | a blood pentagram, fire burning on black altars, wax idols and demon busts, chains |
| The Vigil | pale marble checker floor, wax pillars, glowing fountains, a pale hand altar |
| The Procession | a gold ring, gold statues, sarcophagi, torches |
| The crawlspace | lumpy earth, dark dirt, shaded ledges and ladders, roots, bones, a red lantern by the black market's arch |

**Doors** tell you what's behind them: plain stone (normal), planks with a coin sign (shop), gold
with a red gem (treasure), a jaw of teeth and horns (boss), a hole in the bricks (secret), barbed
thorns in dark red flesh (Thorned Room), bones and blood (Offering Room), bulbs and a coin slot
(Parlor), crossed swords and chains (Gauntlets), book spines and candles (Reading Room), an iron
frame with **chains across** while locked (Strongroom), a die keystone (Gambler's Den), curtains
(bedrooms), claw marks and a skull (Lair), stars and a moon (Orrery), raw flesh (red rooms), black
with eyes and tar (Bargain), pale wings and a halo (Vigil), a gold crown (Procession).

### Machines and beggars

Walk into one to use it (they're solid). The price shows under it. Odds are close to Isaac's and
**luck** moves them: every point of luck shrinks the "nothing" outcomes and grows the good ones
(data: `src/data/machines.js`; art and behavior: `src/game/machines.js`). Bombs break machines
(a few coins fall out) and blow beggars apart (sometimes dropping a pickup).

| Machine | Cost | Pays out (at luck 0) | Animation |
|---|---|---|---|
| **The Grinning Reels** (slot) | 1 coin | nothing 57%, 2 coins 13%, 3–5 coins 3%, bomb, key, half heart, heart, a pill 3%, 2 flies (5%), an item 1.2% (shop pool). 2% to break | lever pulls, three reels spin and stop one by one, the skull's eyes flash on a win; broken: cracked glass |
| **The Murmuring Booth** (fortune) | 1 coin | a fortune 64%, half Ash Heart, Ash Heart, a random pickup, a card 6%, a trinket 2%, a rune 1%, a Vigil Heart, an item 1.5% (library pool) | the crystal ball glows, a ticket slides out |
| **The Drawing Chair** (blood) | half a heart | 1 coin 51%, 2 coins 36%, 3 coins 10%, half a heart, an item 0.8% (devil pool). 4% to break | the jar fills up and bubbles |
| **The Thimblerigger** (shell game) | 1 coin | nothing 67%, double coins/bombs/keys/hearts, an item 1% (then he packs up and leaves) | three skull shells shuffle, the middle one lifts |
| **The Grasping Claw** (crane) | 5 coins | nothing 70%, two pickups 18%, **the item in the glass** 12% (then it shuts down) | the claw drops and swings back up; the prize sits in the glass |
| **The Penitent Box** (confessional) | half a heart | silence 55%, a Vigil Heart 24%, an Ash Heart 18%, an item 3.3% (angel pool). 3% to break | eyes behind the lattice, the curtain sways |
| **The Restocker** (shops only, 30%) | 3 coins, +1 each use | the shop puts out new items and pickups. 8% to break | |

| Beggar | Takes | Gives (at luck 0) | Leaves when |
|---|---|---|---|
| **The Tin-Cup Wretch** (hooded, rags, tin cup) | 1 coin | a random pickup 26%, an item 5% (shop pool) | it gives an item (by the 14th coin at the latest) |
| **The Locksmith** (tall hat, holds a key) | 1 key | a wooden chest 31%, a golden chest 14%, an eternal chest 1.5%, an item 7% (treasure pool) | it gives an item (by the 7th key at the latest) |
| **The Sootling** (burnt, holds a bomb) | 1 bomb | 2–4 coins, two bombs, a Soot Heart, an item 6% (boss pool) | it gives an item (by the 8th bomb) |
| **The Supplicant** (red, horned) | half a heart | a Soot Heart, 2–3 coins, an item 9% (devil pool) | it gives an item (by the 6th half heart) |
| **The Rotting Wretch** (green, rotten) | 1 coin | 1–3 gnats 31%, a Moldy Heart, a Ribcage Heart, an item 4% (treasure pool) | it gives an item (by the 12th coin) |
| **The Spark-Eater** (teal, hooded, wrapped in wires, holds a battery) | 1 coin | a jolt of charge for your active item 18% (a battery if nothing needs it), a battery 15%, a full battery 3%, an item 5% (shop pool) | it gives an item (by the 10th coin) |

**Every beggar pays out its item after enough donations** (`guarantee` in the data: the number in
brackets above), so feeding one is never wasted. Beggars perk up and wave their arms when paid, cheer (sparkles) when they give you something,
slump when they don't, and when they pay out an item they wave goodbye and sink into the floor.
**Where:** the Parlor's four spots; the shop's restock box; and on half of all floors one plain
room has a wandering beggar or machine (beggars, slots, the chair, the booth, the box from floor 3,
the Supplicant from floor 2). THE BEGGAR card calls one up (coin, key, bomb, battery or rotting),
THE WHEEL OF WAX a slot, booth or shell game.

### Deals: The Bargain and The Vigil

After a floor's boss (not floor 1, not the last floor) a door may open in the boss room's wall.

- **Chance** (`dealChance`): 20%, +35% if you lost **no red heart** on the whole floor, +15% if
  the boss never took one, + items with `dealChance` (none since part 4.5's new items), halved if
  the floor before already had a deal. Always 0 on floor 1. The **Found HUD** shows the odds live
  (`dealOdds`): the whole chance for The Bargain, or half for each once The Vigil is possible.
  Damage you chose (sacrifice spike, thorned door, blood machine) doesn't count.
- **Which**: The Vigil only if you've **never** made a bargain and have already **seen and passed
  up** a Bargain; then 50/50. Otherwise The Bargain.
- **The Bargain** (`devil`): a black-red room with eyed wax statues in the corners and 3 items
  from its own pool, each with its **price in hearts** under it: quality 3+ costs **2 heart
  containers**, others 1. With no containers you pay **3 Ash Hearts**. You can never pay with the
  last of your health. **Pilfer** pays in coins (15 a heart); **Wisp** (no hearts) takes them free.
  Taking any one locks you out of The Vigil for the rest of the run.
- **The Vigil** (`angel`): a pale marble room, 2 free items from its own pool (take one) and two
  faceless winged statues. **Bomb a statue** and it wakes up as a boss: **The Pale Sentinel**
  drops the **Rusted Key Half**, **The Gilded Sentinel** (once you have the first) the **Gilded
  Key Half** (needed in part 7); after both, a Vigil item.

## THE MAP

Code: `src/ui/minimap.js`. Icons: the big map uses icons from Kenney's 1-Bit Pack (CC0, see
CREDITS.md), each in one flat color with an outline (`MAP_ICONS` in `src/data/packArt.js`); the
minimap uses small hand-drawn copies of the same shapes, since halving the pack icons smudges them.

- **Minimap** (top right): a 7x5 window of the floor around the screen you're in. Rooms are drawn
  in their real shape: big rooms and L-shapes join into one piece, narrow halls and shafts are thin.
  The room you're in is bright and pulses gold; rooms you've been to are filled with a lit top
  edge; rooms you've only seen through a door are dark with a light outline. Red rooms are reddish.
- **Icons** for boss (skull), treasure (crown), shop (money bag), secret / super secret / ultra
  secret (question marks, the last one red), Thorned Room (crossed thorns), Offering Room (a spike),
  Parlor ($), Gauntlets (a sword, red for the great one), Reading Room (book), Strongroom (chest),
  Gambler's Den (die), Nursery / Sickroom (a bed, pink / green), Lair (horned helm), Orrery (a star),
  The Bargain (a flame), The Vigil (wings), The Procession (a trophy), Misprint (!).
- **What's left behind**: rooms you've been to show small marks for an item still on a pedestal,
  hearts, coins, keys, bombs and unopened chests.
- **Big map**: hold **Tab** (PC), **Back** (gamepad) or **a finger on the minimap** (phone) to
  lay a big, see-through map of every room you know over the game; let go to close it. The game
  keeps running. It shows the floor's name and the pack's 16px icons.
- **Map items** (field `map` on an item): **Cellar Blueprints** shows every room's shape,
  **Grave Compass** shows every special room's icon (where it is, even unseen), **Mole's Notes**
  reveals the secret and super secret rooms.
- **What shows**: walking into a room shows every room behind its ordinary doors as an outline
  (special rooms with their icon). Secret rooms and The Nook never show until their wall is
  opened (or an item or the Rune of the Wax Gate reveals them); a map card shows every room but
  the hidden ones.
- **Curse of the Torn Map**: the minimap shows only the room you're in; the big map only says THE MAP IS TORN.

## PICKUPS

Coin (1), silver coin (5), bomb, two bombs, key, half/whole Blood Heart, half/whole Ash Heart,
Soot Heart, Vigil Heart, Brass Heart, Ribcage Heart, Moldy Heart (see HEARTS). Shops can also
stock Brass (7c) and Ribcage (6c) hearts. **Batteries**: a Little Battery gives your active item 2
charges, a Full Battery fills it (only picked up when an active item needs charge; teal-and-gold
cell icons). Also trinkets, pocket things (see TRINKETS, POCKET THINGS) and chests (CHESTS). Shops
also stock cards (5c), pills (4c), runes (8c), Little Batteries (6c) and trinkets (8c). Room-clear drops, jar and marked-rock drops are tuned
in `src/data/pickups.js`. A pickup you can't use right now (full health...) is nudged aside. A key is guaranteed by the 3rd room
cleared on a floor if none has appeared (so the shop is always reachable).

---

## BOSSES

Bosses have a health bar, an intro card, and a second phase at a set health fraction (they roar,
clear the screen of shots and pause briefly). Early bosses deal half a heart; chapter-4 bosses a
full heart. Tuning: `src/data/bosses.js`; behavior/art: `src/game/bosses/`.

### Chapters 1–3 (learnable bosses)

| Boss | id | HP (ch.1) | Attacks | Phase 2 |
|---|---|---|---|---|
| **The Soggy Lump**, a waterlogged heap of flesh with one droopy eye | `lump` | 170 | 3 short arcing hops toward you (landing spot marked, a short wobble between hops); big leap: its shadow follows you, then stops and flashes red for 0.6s before it falls, slamming into a ring of 8 shots; mouth gapes then spits a 5-shot fan | at 35%: more slams, double spit, hops land with 4 shots |
| **The Weaver**, a fat cellar spider with a pale spiral on its back | `weaver` | 180 | skitters; shakes then lunges a short distance; spits a slow 3-web fan; hatches 2 mites | at 40%: double lunges, 3 mites, two web volleys |
| **The Hive Belly**, a bloated, holey, buzzing sac | `hive` | 160 | releases 3 moths; flings its moths straight at you; puffs up and burps a ring of 6 dust shots | at 40%: flings more moths, double burp |
| **The Twin Grubs**, two blind worms sharing one life | `grubs` | 150 | a dirt mound marks where one surfaces; it spits a 3-shot fan, then sinks. Only a surfaced grub can be hit | at 50%: both surface together, 5-shot fans |
| **The Doll's Head**, a giant cracked porcelain doll head with one glass eye | `dollhead` | 190 | rattles then rolls in a straight line along a row/column until a wall; cries tears in a + then x; stares and fires 3 aimed shots | at 40%: rolls twice, cries on wall hits, 3 cry volleys |
| **The Gurgler**, the cellar's main drain grown teeth (never moves) | `gurgler` | 190 | mouth stretches into an O then inhales, pulling you in (slower than you walk); lobs gobs of sludge that burst; exhales a gust and a ring of 8 shots | at 40%: stronger pull, more gobs and shots |
| **The Tallow Pyre**, a heap of melted candles on fire with a face pressed into the wax (**only in The Smolder**) | `pyre` | 200 | shakes while sparks trace a line toward you (0.75 s), then fire marches along it; mouth glows, fan of 5 embers; the big leap (shadow follows, locks red, falls) into a ring of embers and a ring of fire; flames rise off its back and 2 cinderlings drop off | at 40%: burns red-hot, three lines of fire at once, double spit, **eruption**: coals rain down on marked spots around you |

Bosses tied to a variant only appear there; others get more likely where they fit (`bossBias`: The Weaver in The Weeping Hollow). Each chapter has its own pool now; `bossTier` adds a few extra shots on deeper floors.

### Chapter 2 (the caves)

Each fits one variant (4x more likely there) but can show up in any chapter-2 variant. HP is
multiplied by 1.6 / 1.85 on floors 3 / 4, and they fire one tier of extra shots. Phase 2 at 45%.

| Boss | id | HP | Attacks | Phase 2 |
|---|---|---|---|---|
| **The Grotto Maw**, a boulder-sized stone head, all jaw and crystal teeth (fits The Grotto) | `grottomaw` | 180 | **burrow**: sinks, a mound chases you, stops and flashes red (0.6 s), bursts up with a ring of stones; **gnash**: jaw opens and the crystals glow (0.7 s), fan of crystal shards; **quake**: rears back shaking (0.8 s), slams: 6+ rocks fall around you (shadows first) plus a ring | **roll**: tucks in, the line shows (0.75 s), rolls bouncing off 3 walls (rocks fall at each), then sits dizzy; double gnash |
| **The Shrieking Mother**, a huge pale bat (flies) (fits The Grotto) | `shriekmother` | 165 | circles you; **shriek**: wings spread, ears glow (0.7 s), two offset rings of sound; **dive**: rises, the line shows (0.75 s), dives straight through, sits dazed; **roost**: shrieks at the ceiling: rocks fall and 2 shriekbats wake | **echo**: three rings in a row, each turned a little and faster |
| **The Gravedigger**, a hunched catacomb keeper with a huge shovel (fits The Ossuary) | `gravedigger` | 175 | **fling**: digs in (dirt sprays, 0.7 s), fan of bones; **cleave**: raises the shovel (line shows, 0.75 s), slams: the ground bursts open spot by spot along the line; **graves**: dirt mounds rise for 1 s, bonewalkers climb out; **leap**: big jump into a ring of bones | three cleave lines at once, double fling, **bury**: digs under, the mound chases you, bursts up in a ring of bones |
| **The Bone Choir**, three skulls with candles on their crowns, circling and singing; one health bar, hit any skull (fits The Ossuary) | `bonechoir` | 170 | **harmony**: skulls glow one by one (0.5 s each) and sing a ring; **chorus**: all glow (0.8 s), each sings a fan at you; **scatter**: they spin up (0.7 s), fly out wide firing outward, come back | spin faster, bigger rings and fans, **wail**: one skull wails (0.7 s), slow wisps drift after you |
| **The Bloated Drowner**, a huge swollen body with a rope round its waist (fits The Sunken Caves) | `drowner` | 190 | **gush**: cheeks bulge (line shows, 0.7 s), a jet of water sweeps across the line; **burst**: swells up (0.8 s), ring of bile and 6 poison puddles; **retch**: gags, coughs up 3 leeches; **flop**: big jump, belly-flops into a ring of water | two jets sweeping opposite ways, double burst ring |
| **The Deep Angler**, a blind deep-sea fish walking on its fins with a glowing lure (fits The Sunken Caves) | `angler` | 175 | **lure**: the lure flares and pulls you in a little (0.8 s), then lets go of seeking wisps; **lunge**: jaws open, line shows (0.7 s), throws itself along it, lies gasping; **submerge**: sinks, a ripple chases you, flashes red, bursts up with a ring of water | double lunge, more wisps, **gulp**: mouth wide, water rushes in and pulls you hard (1.3 s), snaps shut with a ring of teeth |

### Chapter 3 (the depths)

The first floor draws from these six (each fits one variant); the **second floor always has The
Chandler**. HP is multiplied by 2.3 (floor 5) / 2.6 (floor 6), one tier of extra shots. Phase 2 at 45% (50% for The Chandler).

| Boss | id | HP | Attacks | Phase 2 |
|---|---|---|---|---|
| **The Chained Warden**, a giant jailer in rusted plate with a bucket helm, an iron ball on a long chain that always circles it (fits The Underhall) | `warden` | 185 | **sweep**: spins the ball faster (0.9 s, a red ring shows its reach), then swings it round twice at full reach: get out, or step in close; **hurl**: raises the ball (line shows, 0.8 s), hurls it: it smashes into a ring of shots and is dragged back; **pound**: fists up (0.8 s), shockwave lines in a cross, then an x | **charge**: helmet down, snorts, charges to a wall (ring of shots on impact), dazed |
| **The Twin Gargoyles**, two stone gargoyles on plinths; one fights while the other is stone and can't be hurt; one health bar (fits The Underhall) | `gargoyles` | 180 | **swoop**: rises, line shows (0.75 s), dives straight through, skids; **spit**: jaws glow (0.6 s), a fan of burning spit; **swap**: flies back to its plinth and turns to stone, the other cracks awake (grit falls for 0.7 s) with a ring of stones | **both**: both wake and spit at you at once |
| **The Shrouded King**, a mummified king in waxed linen with a dented crown (fits The Wax Tombs) | `shroudking` | 190 | **lash**: wrappings rise, 3 lines show (0.8 s), bandages whip out along them; **raise**: arms up, the floor cracks, 2 shroudlings climb out; **curse**: crown glows (0.7 s), a ring of violet shots, then a second ring turned half a step | 5 lash lines, **unwind**: spins unwinding, a two-armed spiral of shots for 2 s |
| **The Candle Saint**, a marble saint weeping wax, a halo of six violet candles behind its head; never walks (fits The Wax Tombs) | `saint` | 180 | **halo**: the halo spins faster (0.7 s), then the candles spit violet fire as they turn (a spiral); **vanish**: fades out, a violet ring marks where it'll appear (0.8 s), appears with a ring of shots; **weep**: bows its head, tears well up (0.7 s), hot wax blobs land on marked spots and burst | faster halo, **melt**: three lines of burning wax run out from its feet (lines shown first) |
| **The Blighted Toad**, an enormous bog toad covered in black boils (fits The Mire) | `blighttoad` | 195 | **leap**: big jump (shadow follows, locks red) into a ring of bile and 3 tar pools; **tongue**: throat swells, line shows (0.75 s), tongue lashes 170 px across the room; **belch**: cheeks puff (0.6 s), a wide fan of bile; **spawn**: boils burst, 3 tarlings | **hops**: three quick hops at you (each landing marked), a small ring each time |
| **The Muck Knot**, a knot of tar tendrils with a mouth, rooted to the floor; hit the knot or any tendril that's up (fits The Mire) | `muckknot` | 190 | **grasp**: bubbling rings appear around you (0.8 s), tendrils burst up there (stay up 1.3 s, each spits a small ring); **spew**: swells (0.7 s), 3 tar globs that leave puddles; **lash**: 3 lines show (0.8 s), fast lines of tar shots | **flood**: heaves (0.9 s), tar pours out around it, a ring of shots, 5 tendrils at once |
| **The Chandler** (giant, **chapter 3 floor 2 only**), the giant who made the candles; far too big for the room, only her hands, arm and eye reach in. Hit whatever part is in the room | `chandler` | 270 | **hand**: her hand's shadow slides after you (1 s), stops and flashes red (0.55 s), the hand slams down (full heart if you're under it, a ring of hot wax), stays 1.4 s, lifts; **eye**: a huge eye opens in a doorway (0.6 s) and fires 3 fans; **arm**: a doorway glows and the strip in front of it is marked (0.9 s), her arm thrusts straight across the room, stays 1 s, pulls back; **pour**: hot wax blobs fall on marked spots and burst; **call**: two of the chapter's creatures are pushed in through the doors | at 50%: **hands** (both hands, one after the other), the eye fires 4 wider fans, hands stay down for less time |

### The Vigil's statues

Never in a boss pool: bomb a statue in The Vigil to wake one. Both fly, never touch the ground.

| Boss | id | HP | Attacks | Phase 2 |
|---|---|---|---|---|
| **The Pale Sentinel**, a tall faceless figure with six long wings and a slit where its face should be | `sentinel1` | 160 | **beam**: the slit opens, a thin red line shows where it's looking (set early, 0.9 s), then a beam burns along it; **feathers**: wings spread (0.7 s), a fan of pale feathers; **halo**: glows (0.7 s), two rings of light half a step apart; **glide**: the line shows (0.75 s), it glides straight through | longer beams, more feathers. Drops the **Rusted Key Half** |
| **The Gilded Sentinel**, the same in tarnished gold | `sentinel2` | 180 | the same, faster, golden sparks | drops the **Gilded Key Half** |

### Chapter 4 (the heavyweights)

| Boss | id | HP | Attacks | Later phases |
|---|---|---|---|---|
| **The Old Boiler**, a furnace that crawled out of the floor | `boiler` | 700 | steam ring; lobbed coals with landing shadows; charges until a wall | at 50%: cracks open, double rings, 5 coals, spray on wall hits, flame spiral, summons mites |
| **Mother Mildew**, a six-eyed mound of mold | `mildew` | 740 | leaps onto you (shadow follows you, locks red for 0.45s, then it falls; ring on landing); spore spreads; births blobs | at 50%: rots purple, double leaps, spore rings, rotten blobs |
| **The Moth Queen**, a huge dusty moth with eye-spot wings (flies) | `moth` | 620 | rings of dust; dive-bombs; calls moths | at 50%: torn wings, double dives, dust spirals |
| **The Rat King**, six rats knotted at the tails, wearing a paper crown | `ratking` | 780 | charges; tail whip (sweeping fan); calls rats | at 50%: chained charges, shrieking double ring |
| **The Tallow Heart** (giant, chapter 4 floor 2 only), a huge heart of meat and old candle wax rooted to the floor, a wick burning on top. Never moves | `tallowheart` | 1100 | **beat**: swells (0.6 s), then beats out a ring of blood; **veins**: six veins along the floor glow red (0.8 s), then burst open spot by spot outward; **bleed**: shudders, blood rains down on marked spots around you; **clots**: tears open, 3 clotlings crawl out; **harden**: wax creeps over it (0.5 s), then for 3 s it's hard as stone (shots do 10%) while it sputters a slow two-armed spiral | 60%: double beats, 8 veins, more blood rain, faster spiral. 30%: **frenzy**: races, fast beats in a turning 6-way spiral |
| **The Snuffer** (final boss, floor 9: THE WICK'S END), a hooded giant with a brass candle-snuffer staff | `snuffer` | 1500 | leaps off-screen, its shadow follows you, then locks red (0.5s, 0.4s in phase 3) before it slams down; walls of shadow shots from the sides with a gap; hot wax rain; double rings | 66%: smoulders, summons husks, triple rings. 33%: red eyes, 4-arm spirals, **the room goes dark** except around Wick |

---

## ITEMS

**257 items** since part 6 (see "Part 6: 257 items" below). The 40 from part 4.5 (33 passive, 7 active; quality 1: 8, 2: 19, 3: 9, 4: 4), which replaced the old set, are the starting pool. An item appears at most once per run; each room type draws from its own pool. Shot
effects stack and combine freely. Active items recharge one notch per cleared room. Picking one up
shows its name and a funny line at the top of the screen; with the item info setting on "detailed",
pedestals also show exactly what an item does. Data: `src/data/items.js`, icons:
`src/data/itemSprites.js`.

### Quality rules (for every item, now and later)

| Q | Means | Pool weight |
|---|---|---|
| 0 | bad or joke items, or a downside bigger than the upside | x1.3 |
| 1 | weak or very situational | x1.2 |
| 2 | decent: solid stat ups and simple helpful effects | x1 |
| 3 | strong: clearly changes a run (homing, splitting, piercing + more, good familiars) | x0.6 |
| 4 | run-defining: huge damage multipliers, game-changing weapons and effects | x0.25 |

- A simple stat-up item is never Q4. A strong effect like homing shots is Q3 or higher.
- Q4 items are rare: they come from treasure, devil, angel and secret rooms, **never the shop**
  (the shop pool refuses them). Every pool weighs its items by quality (table above) times the
  item's own weight in that pool.

### Luck and chance effects

Status effects are a **chance per shot**, not every shot. Each item gives a base chance; every
point of **luck** adds a little more, up to a cap. Several items with the same effect add up.
A shot that rolls an effect takes its color (green poison, orange burn, pale blue slow / freeze,
violet fear, pink charm, gold crit, yellow-green lightning). Item descriptions (detailed info) say
"25% CHANCE: POISON, +5% PER LUCK (MAX 80%)".

| Effect | + per luck | Cap | On an enemy | On a boss |
|---|---|---|---|---|
| poison | 5% | 80% | 3 s, hurts every 0.4 s | same |
| burn | 5% | 80% | 2.4 s, hurts every 0.4 s, flames | same |
| slow | 5% | 80% | moves at 45% for 2.5 s | slowed a little for 0.6 s |
| freeze | 4% | 50% | frozen solid for 1.3 s (no moving, no attacking) | slowed for 1 s |
| fear | 4% | 60% | runs away from you, no attacks, 2.5 s | nothing |
| charm | 3% | 40% | can't hurt you, attacks the nearest enemy (bites every 0.5 s), 3 s | nothing |
| crit | 2.5% | 50% | x3 damage, bigger, gold shot | same |
| chain lightning | 4% | 60% | a bolt jumps to the 2 nearest enemies (110 px) for half damage each | same |

Minibosses shake off freeze, fear and charm twice as fast. Luck also makes **chests** richer (a
locked chest's item chance 30% +3% per luck up to 60%; +1 pickup per 3 luck, up to +2), raises
**room clear drops**, improves every **machine and beggar** (see Machines and beggars), and makes
the Penny Jar's coins likelier.

### The items (40 from part 4.5, plus the Melting Pot)

| Item | id | Type | Q | Pools | Effect | Pickup line |
|---|---|---|---|---|---|---|
| **Jar of One Eye** | `cyclopsjar` | passive | 4 | treasure, secret | x2 damage, +0.5 damage, x0.55 fire rate, huge shots, strong knockback | It's looking at you. With your eye. |
| **Searing Strand** | `searingstrand` | passive | 4 | devil, treasure (0.6) | no more shots: hold to charge a **beam** that burns through the room; +0.5 damage; hellish flame | Hold it in. Then let it all out. |
| **Lodestone Tooth** | `lodestone` | passive | 3 | treasure, planetarium | **homing** shots (violet) | Your shots can smell fear. |
| **Forked Tongue** | `forkedtongue` | passive | 3 | treasure | **three shots** per volley, x0.75 fire rate | Say it three times. Out loud. |
| **Rubber Molar** | `rubbermolar` | passive | 2 | treasure | shots **bounce** twice off walls and rocks, +1 range | Chewed. Bouncy. Gross. |
| **Spider Egg Sac** | `eggsac` | passive | 3 | treasure | shots **split** into 4 where they land | Every shot hatches. |
| **Coffin Nail** | `coffinnail` | passive | 2 | treasure, boss (0.5) | **piercing** shots, +0.5 damage | Goes in one side. Keeps going. |
| **Jar of Mildew** | `mildewjar` | passive | 2 | treasure | 25% chance: **poison** | Smells like the walls. Hurts like them too. |
| **Frostbitten Finger** | `frostfinger` | passive | 2 | treasure | 15% chance: **freeze** | Point at things. They stop. |
| **Scarecrow's Button** | `scarebutton` | passive | 2 | treasure | 20% chance: **fear** | Even the crows left. |
| **Love Letter, Sealed in Wax** | `loveletter` | passive | 2 | treasure, angel (0.5) | 15% chance: **charm** | They'll come around. |
| **Live Coal** | `livecoal` | passive | 2 | treasure, devil (0.5) | 30% chance: **burn**, +0.3 damage, ember flame | Hot potato. Hot everything. |
| **Four-Leaf Fishhook** | `fourleaf` | passive | 3 | treasure, secret (0.8) | +1 luck, 10% chance: **critical hit** (x3) | Lucky for you. Unlucky for the fish. |
| **Wandering Tooth** | `wanderingtooth` | passive | 2 | treasure | an **orbital** tooth: blocks shots, 3 damage on touch | It never settled down. |
| **Two Pale Moths** | `palemoths` | passive | 2 | treasure, angel (0.6) | **two orbital** moths circling wide the other way, 2.5 damage each | Drawn to your flame. Forever. |
| **Stub Buddy** | `stubbuddy` | passive | 2 | treasure | a little candle **familiar** that shoots where you shoot (3.5 damage, 2 shots/s) | A mini-you. Just as moody. |
| **Hungry Rat** | `hungryrat` | passive | 2 | treasure, boss (0.5) | a rat **familiar** that chases the nearest enemy and bites (4 damage, every 0.4 s) | Bites first. Asks never. |
| **Nitro Wax** | `nitrowax` | passive | 3 | devil, treasure (0.6), secret (0.6) | shots **explode** where they land (never hurt you; break rocks), +1.5 damage, x0.6 fire rate | Shake well before using. |
| **Copper Wick** | `copperwick` | passive | 2 | treasure, planetarium | 25% chance: **chain lightning** | Conducts rage beautifully. |
| **Echoing Bell** | `echobell` | passive | 3 | treasure, planetarium | every volley **echoes** 0.25 s later from where you stood (60% damage) | Everything you do happens twice. Once quieter. |
| **Melting Pot** (part 5, 🔒 TRINKET COLLECTOR) | `meltingpot` | active, 2 rooms | 1 | treasure, shop | melts your held trinket into you for good (no trinket: no charge used) | Your trinket goes in. It never comes out. |
| **Sand Timer** | `sandtimer` | active, 3 rooms | 2 | treasure, library | everything else slows down for 6 s | Everyone else gets sleepy. |
| **Book of Hoarfrost** | `frostbook` | active, 3 rooms | 2 | library, treasure (0.6) | **freezes every enemy** for 3 s (bosses slow down) | Read it aloud. Everything stops listening. |
| **Matchbook of Spite** | `matchbook` | active, 2 rooms | 1 | treasure, devil (0.6) | +2.5 damage for 8 s | Strike one. Lose your temper. |
| **Storm in a Jar** | `stormjar` | active, 4 rooms | 3 | library, angel, treasure (0.5) | **lightning strikes every enemy** (20 + your damage) | Don't shake it. Okay, shake it. |
| **Squeaky Boots** | `squeakyboots` | passive | 1 | shop | +0.3 speed | Squeak. Squeak. Squeak. |
| **Cold Coffee** | `coldcoffee` | passive | 2 | shop, boss | +0.7 fire rate | Brewed sometime last decade. |
| **Cellar Blueprints** | `blueprints` | passive | 1 | shop, treasure (0.8) | the map shows every room (see THE MAP) | Someone drew this place. Badly. |
| **Grave Compass** | `gravecompass` | passive | 1 | shop, treasure (0.8) | the map shows every special room's icon | It always points somewhere worse. |
| **Mole's Notes** | `molenotes` | passive | 1 | shop, secret | the map shows the secret rooms | He knew where all the holes were. |
| **Bell Jar** | `belljar` | active, 3 rooms | 2 | shop, angel | invincible for 5 s | Look, but don't touch. |
| **Penny Jar** | `pennyjar` | passive | 2 | shop (10 coins) | +1 luck; enemies drop a coin 15% of the time (+1% per luck) | Rattles when they die. |
| **Gnawed Rabbit's Foot** | `rabbitfoot` | passive | 1 | shop, secret | +2 luck | Lucky for somebody. Not the rabbit. |
| **Rusty Shovel** | `rustyshovel` | active, 3 rooms | 1 | shop | digs up 2 pickups | Dig! Something's down there. |
| **Scalding Drip** | `scaldingdrip` | passive | 2 | boss | +1 damage | Drippier. Angrier. |
| **Mystery Meat** | `mysterymeat` | passive | 1 | boss, shop (0.6) | +1 heart container, heals 1 heart | Best before... yes. |
| **Bloody Bandage** | `bandage` | passive | 2 | boss | +1 heart container, heals 3 hearts, +0.15 speed | Still warm. Not yours. |
| **Moth Wings** | `mothwings` | passive | 3 | secret, angel | **flight**, spectral shots (over rocks), +0.1 speed, wings | Flutter mode: unlocked. |
| **Hollow Crown** | `hollowcrown` | passive | 4 | devil, secret (0.5) | **x1.5 damage**, piercing red shots, an iron crown | Heavy is the head. Heavier the hits. |
| **Sacred Wick** | `sacredwick` | passive | 4 | angel, treasure (0.2) | **x1.6 damage**, homing blue shots, x0.85 fire rate, -0.2 shot speed, white flame | It burns for something bigger than you. |
| **Crimson Key** | `crimsonkey` | active, 4 rooms | 3 | secret (0.7), treasure (0.25) | opens a **red room** behind the empty wall nearest you | Opens doors that were never there. |

**By pool:** treasure 28 (the core: shot changers, chances, helpers, actives); shop 10 (maps,
luck, utility, small stat ups; no Q4); boss 6; secret 8; library 3 (the books); planetarium 3;
The Bargain 5; The Vigil 6. A pool that runs dry draws from all items.

**Unlocked by achievements** (locked until earned, see UNLOCKS): Bloody Bandage, Cold Coffee,
Nitro Wax, Penny Jar, Live Coal, Four-Leaf Fishhook, Sacred Wick.

**Old saves:** a run saved before part 4.5 swaps each old item for its nearest new one
(`OLD_ITEMS` in `src/data/items.js`; run save v4).

**Rusted Key Half / Gilded Key Half** (`keyhalf1`, `keyhalf2`): dropped by The Vigil's statues,
+1 luck each; the two halves open something in part 7. Not in any pool.

### Part 6: 257 items

The 40 items above (plus the Melting Pot) are the **starting pool**; part 6 brings the game to
**257 items** (6 Q0, 42 Q1, 122 Q2, 76 Q3, 11 Q4; 10 character starters, 2 key halves). **41 are in
the pools from the start**, the other 206 each unlock with an achievement (their `unlock`, see
UNLOCKS; the game refuses to load an item whose unlock doesn't exist). Data lives in batch files,
each with its items, icons and costumes, merged by `ITEM_BATCHES` in `src/data/items.js`:

| Batch | File | Items | What |
|---|---|---|---|
| originals | `src/data/items/originals.js` | (the 40) | adds tags, unlocks and lore to the starting pool |
| SHOTS | `src/data/items/shots.js` | 50 | weapons and shot modifiers |
| FAMILIARS | `src/data/items/familiars.js` | 35 | followers (`src/game/familiars.js`) |
| ACTIVES | `src/data/items/actives.js` | 35 | active items (`src/game/actives.js`) |
| PASSIVES | `src/data/items/passives.js` | 42 | health, stats, mushrooms, cats, hurt items, bombs |
| ODDITIES | `src/data/items/oddities.js` | 45 | deal gear, stars, ghosts, bugs, bones, fire, wires, junk (Q0) |

**Every item has:** an original name, a sprite (icon about 13 px wide, `ITEM_COLORS` palette),
a short funny pickup line (`desc`), a longer description for the collection page and the pause
screen (`lore`), a quality 0–4, its pools (with weights), tags (transformations) and its unlock.
Items that change Wick's look have a `look.costume` (one name or a list); costumes **stack**, each
item its own idea (no re-skins), drawn behind or in front of the body and per facing.

**Item pools** (`POOLS` in `src/data/items.js`; a dry pool falls back to the next one):
treasure 158, shop 48, boss 24, The Bargain (devil) 39, The Vigil (angel) 33, secret 29, The
Reading Room (library, books) 13, curse 6, The Orrery (planetarium) 17, brass (golden) chest 6,
red chest 7, the beggars (Tin-Cup Wretch 24, Locksmith 8, Sootling 13, Supplicant 4, Spark-Eater
9, Rotting Wretch 27), the Grasping Claw (crane game) 12. **Greed mode** uses an item's
`greed<Pool>` weight where it has one (greedTreasure 126, greedShop 34, greedBoss 20, greedDevil
25, greedAngel 25, greedSecret 8) and its normal weight otherwise.

**Effects with no stat** read in plain words in the detailed item info and the pause screen: the
trinket-style effects items borrow (`fx`: when hurt, on entering or clearing a room, on kills,
magnet, aura) and the item mechanics (`mechanics`: Ninth Life, pillar of light, pencil spray,
stray shots, flame breath, steady hand, loose wire, puddles). An item with no effect at all says
DOES NOTHING. NOTHING AT ALL.

### Weapons (`src/game/weapons.js`)

An item picks HOW Wick attacks with `shot.weapon`. **Every shot modifier works with every
weapon** (homing, pierce, spectral, bounce, split, multishot, size, back shot, knockback,
explode and every chance: poison, burn, slow, freeze, fear, charm, crit, chain), so synergies
stack like in Isaac. Several weapons held: the first in sword > knife > beam > laser > bombs >
tears wins; the rest are kept for when it's lost.

| Weapon | Items | How it attacks |
|---|---|---|
| tears | (default) | wax shots on a cooldown; Pot of Cocoa makes them charged shots |
| **beam** | Searing Strand (Q4), Hellfire Larynx (Q4) | hold to charge, let go: a **thick beam to the wall** (no range limit) that follows Wick with a little lag; every extra copy makes it **wider and stronger** |
| **laser** | Copper Filament (Q3) | every shot is a thin laser that pierces everything (not charged) |
| steady laser | Humming Coil (Q2) | a thin laser that stays on while you shoot |
| **knife** | Carving Knife (Q4) | hold to draw it back, let go to throw it; it comes back |
| **sword** | Wax-Forged Blade (Q3) | swing in an arc; keep swinging to charge a spin and a slash wave |
| **bombs** | Little Powder Keg (Q3) | every attack is a little bomb (never hurts you) |
| barrage (delivery) | Bellows Lung (Q3) | charge up, then everything fires at once: a spray of shots, a fan of beams... |
| lobbed (delivery) | Jar of Bile, Clotted Wax (Q3) | shots arc and explode where they land; other weapons' hits burst |

How each modifier reads per weapon (homing bends the beam, bounce reflects rays and the slash
wave, multishot adds rays / knives / a wider arc, size widens rays and lengthens the blade...) is
in the table at the top of `src/game/weapons.js`.

### Familiars (`src/game/familiars.js`)

39 items give followers. One `Helper` class runs them all from data: **how they move** (trail
behind you in a queue, orbit, chase, hover, mirror, guard, fetch, roam, stay), **how they
attack** (shoot where you aim, at the nearest enemy, charged beam or spray, touch, thrown and
recalled, stomp, hunt enemy shots, bombs, a damaging aura that can pull and eat shots) and extras
(**block** enemy shots, **collect** pickups, drop pickups every few rooms, hatch gnats or
spiderlings, wake when you are hurt, copy your weapon). Some **level up**: Lump of Tallow grows
at 5, 12 and 22 rooms; Dust Bunny grows with kills each floor (progress is saved: `helperXp`).
Best Friend Locket doubles every helper's damage and grows them. Shadow Self (Q4) is a dark copy
of Wick that attacks with your own weapon.

Shooters: Soot Sister, Shadow Self, Little Horned One, Tin Tinker, Little Hellmouth, Two-Faced
Jester, Oil-Slick Child, Lantern Ghost, Mirror Kin, Four-Way Imp, Little Gutbucket, Wax Cherub.
Orbitals and blockers: Altar Dagger, Guardian Feather, Lonely Fly, Mindful Fly, Brass Doorstop.
Fighters: Cellar Leech, Chubby Grub, Crow Skull, Long-Legged Lodger, Fuse Mouse, Lantern Moth.
Growers: Lump of Tallow, Dust Bunny. Droppers: Coin Purse, Satchel of Fuses, Little Heart Jar,
Static Child, Gnat Mother, Spider Mama. Collectors: Beggar Pal, Grim Pal, Magpie. Plus Swarm
Ring (three orbiting flies) and the Broodparent's heads.

### Active items

43 actives. **Charges:** rooms (1–6 rooms cleared), **timed** (fills over seconds: Bent
Boomerang 3 s, Bad Bean 4 s, Thrown Torch 5 s), **fills as you shoot** (Weeping Censer), **costs**
(Pocket Slot Machine: 1 coin; Wax Donor Kit: half a heart) and **one use** (Twin Mirror, Sealed
Coffer, Wrapped Parcel, Grandmother's Powder: gone once used). **Batteries** (pickups, the
Spark-Eater beggar, Car Battery, Jumper Cables) recharge them. A use that can't do anything gives
the charge back.

Books (The Reading Room): Fuse Recipe Book, Psalter of Feathers, Book of Embers, Primer of
Seeking, Torn Bestiary Page. Fights: Rusted Iron Nail, Wobble Cap, Sour Rag, Sobbing Skull,
Weeping Censer, Hollering Jaw, Horned Mask, Powder Heart, Rubber Eraser, Bent Boomerang, Cracked
Skylight, Rocking Horse. Placed: Spilled Vinegar, Thrown Torch, Sinkhole Marble. Supplies: Jar of
Lard, Prayer Slip, Rotten Head, Box of Spiderlings, Fortune Deck, Pill Tin, Janitor's Key Ring,
Bone Dice, Pocket Slot Machine, Wax Donor Kit, Bad Bean.

### Transformations (`src/data/transformations.js`)

Hold **3 different items with the same tag** (the active and pocket items count) and Wick
transforms **for the rest of the run**, even if the items go: a new look (stacking with the
costumes), a strong bonus, sometimes a one-time gift. A wax banner shows the new look with its
name, Wick does a little dance to a jingle, and it counts for the TRANSFORMED achievements.

| Transformation | Tag | Look | Bonus | Once |
|---|---|---|---|---|
| **HORNBEARER** | horned | big curled horns, red wax, hell flame | flight, +1 damage | 2 Soot Hearts |
| **SERAPHIC** | seraph | white wings and a halo, white flame | flight, +1 luck | 3 Ash Hearts |
| **SPORELING** | moldering | spotted mushroom cap, green wax | poison shots, +0.5 damage | +1 heart container |
| **BROODPARENT** | brood | two little heads beside you | the heads shoot diagonally (3.5 damage), faster fire | |
| **BOOKWORM** | scholar | thick glasses, a worm in the hair | +1 shot per volley, fire rate | |
| **THE JITTERS** | wired | big bulging eyes | +2 damage, speed, shot speed | 2 pills |
| **PYROMANIAC** | bonfire | singed hair, ember flame | burning shots, huge bombs | 5 bombs |
| **WRAITH** | spectre | a wispy ghost tail, grey wax | flight, spectral piercing ghost shots | |
| **BONEWALKER** | ossuary | skull face paint | piercing bone shots, knockback, +0.5 damage | 2 Ribcage Hearts |
| **FELINE** | ninelives | tall cat ears, whiskers | flight, hits hatch gnats | |
| **GLUTTON** | bloated | puffed-out cheeks | huge sticky shots, +1 damage, a little slower | +1 heart container |
| **STARBORN** | stargazer | stars around the head, blue flame | homing shots, +2 luck | |
| **LIVEWIRE** | livewire | lightning bolts at both sides | chain lightning, fire rate | |
| **SPIDERKIN** | spiderkin | eight red eyes, spindly legs | sticky shots, +1 shot, spiderlings from every room | |
| **LORD OF MOTHS** | mothkin | big dusty moth wings, antennae | flight, 3 gnats from every room | |

### The pause screen's items

Every item held is in a grid on the pause screen (the active and pocket items first, then the
passives, trinkets and transformations, which show as a little Wick wearing their look); more
than 21 scroll (arrows at the side). **Keys / pad:** Right moves into the grid, arrows move, Esc
goes back to the options. **Phone:** tap an item; tap it again (or anywhere else) to close.
The chosen item's page slides over the left slab: big icon, name, quality (colored), active or
passive and its charge, the pickup line, the longer description and what it does in plain words.

### All part 6 items (name, id, quality, unlocked by)

**SHOTS:** Copper Filament (`copperfilament`) Q3, WAX WORKS · Humming Coil (`hummingcoil`) Q2,
BUTTON MASHER · Carving Knife (`carvingknife`) Q4, TROPHY ROOM · Wax-Forged Blade (`waxblade`) Q3,
GOOD COMPANY · Little Powder Keg (`powderkeg`) Q3, BIG GAME · Bellows Lung (`bellowslung`) Q3,
TALLOW TIDE · Jar of Bile (`bilejar`) Q3, BOSS HUNTER · Pot of Cocoa (`cocoapot`) Q3, ALWAYS
RELIT · Twin Pupils (`twinpupils`) Q3, HOARDER · Eightfold Gaze (`eightfold`) Q3, TALLOW TIDE ·
Bent Hatpin (`hatpin`) Q2, CANDLE SNUFFER · Seance Board (`seanceboard`) Q2, CELLAR CARTOGRAPHER ·
Clotted Wax (`clottedwax`) Q3, BAD COMPANY · Thin Broth (`thinbroth`) Q1, DRIP, DRIP · Bulging
Eye (`bulgingeye`) Q3, BIG GAME · Cracked Shinbone (`crackedbone`) Q2, SEXTON ESCAPES · Wax Worm
(`waxworm`) Q2, WAX WORKS · Leaky Wick (`leakywick`) Q1, CANDLE SNUFFER · Ink Blot (`inkblot`)
Q3, WALL KNOCKER · Tar Lens (`tarlens`) Q2, WAX WORKS · Needle of Mercy (`mercyneedle`) Q3, A
THOUSAND WICKS · Grub Skull (`grubskull`) Q3, TALLOW KING · Grave Mushroom (`gravemushroom`) Q4,
CURATOR · Chalk Circle (`chalkcircle`) Q3, BAD COMPANY · Sooty Thumbprint (`sootthumb`) Q2, THE
LONG CONTRACT · Saint's Cinder (`saintcinder`) Q4, THE CHOIR · Lantern Prayer (`lanternprayer`)
Q3, GOOD COMPANY · Archer's Star (`archerstar`) Q3, BEACON ESCAPES · Lunar Wax (`lunarwax`) Q2,
CELLAR CARTOGRAPHER · Sun Medallion (`sunmedallion`) Q3, TROPHY ROOM · Molar Sling (`molarsling`)
Q2, WAX WORKS · Lump of Soot (`sootlump`) Q2, CINDER ESCAPES · Strange Lodestone (`strangelode`)
Q2, HOARDER · Floating Wax (`floatingwax`) Q2, BUTTON MASHER · Looping Wick (`loopingwick`) Q3,
WALL KNOCKER · Chewed Pencil (`chewedpencil`) Q2, HOARDER · Kindling Brain (`kindlingbrain`) Q3,
KILN ESCAPES · Reaper's Sickle (`reaperscythe`) Q3, MORROW ESCAPES · Toothpicks (`toothpicks`) Q1,
CANDLE SNUFFER · Scorpion Sign (`scorpionsign`) Q2, SPILL ESCAPES · Chiming Shard
(`chimingshard`) Q3, VESPER ESCAPES · Little Planet (`littleplanet`) Q2, ECHO ESCAPES · Weeping
Stye (`weepingstye`) Q2, DRIP, DRIP · Cracked Monocle (`crackedmonocle`) Q2, DODGER · Wide Squint
(`widesquint`) Q1, CANDLE SNUFFER · Tallow Drip (`tallowdrip`) Q2, SPILL ESCAPES · Ash Pepper
(`ashpepper`) Q2, BOSS HUNTER · Steady Hand (`steadyhand`) Q2, UNTOUCHABLE · Hellfire Larynx
(`hellfirelarynx`) Q4, PRISM ESCAPES · Loose Wire (`loosewire`) Q2, WELL USED.

**FAMILIARS:** Soot Sister (`sootsister`) Q2, CANDLE SNUFFER · Shadow Self (`shadowself`) Q4, THE
LONG CONTRACT · Little Horned One (`tinyhorns`) Q1, BOSS HUNTER · Tin Tinker (`tintinker`) Q2,
BUTTON MASHER · Little Hellmouth (`hellmouth`) Q3, BAD COMPANY · Two-Faced Jester (`jester`) Q2,
HOARDER · Oil-Slick Child (`oilslick`) Q2, FULL DECK · Lantern Ghost (`lanternghost`) Q2, CELLAR
CARTOGRAPHER · Mirror Kin (`mirrorkin`) Q1, DODGER · Four-Way Imp (`fourwayimp`) Q2, BRICK
ESCAPES · Little Gutbucket (`gutbucket`) Q3, VESPER ESCAPES · Wax Cherub (`waxcherub`) Q3, BEACON
ESCAPES · Altar Dagger (`altardagger`) Q3, THE CHOIR · Guardian Feather (`guardianfeather`) Q2,
GOOD COMPANY · Lonely Fly (`lonelyfly`) Q1, CANDLE SNUFFER · Mindful Fly (`mindfulfly`) Q3,
UNTOUCHABLE · Brass Doorstop (`brassdoorstop`) Q2, GOOD FOR BUSINESS · Cellar Leech
(`cellarleech`) Q2, DRIP, DRIP · Chubby Grub (`chubbygrub`) Q2, BOSS HUNTER · Crow Skull
(`crowskull`) Q1, DRIP, DRIP · Long-Legged Lodger (`lodger`) Q3, WALL KNOCKER · Fuse Mouse
(`fusemouse`) Q2, LOCKPICK · Lantern Moth (`lanternmoth`) Q3, PIP ESCAPES · Lump of Tallow
(`tallowlump`) Q2, BIG GAME · Dust Bunny (`dustbunny`) Q3, TALLOW TIDE · Coin Purse (`coinpurse`)
Q1, GOOD FOR BUSINESS · Satchel of Fuses (`fusesatchel`) Q1, LOCKPICK · Little Heart Jar
(`heartjar`) Q1, DODGER · Static Child (`staticchild`) Q2, WELL USED · Gnat Mother (`gnatmother`)
Q2, WAX WORKS · Spider Mama (`spidermama`) Q2, WICK ESCAPES · Beggar Pal (`beggarpal`) Q2, ALWAYS
RELIT · Grim Pal (`grimpal`) Q3, BAD COMPANY · Magpie (`magpie`) Q2, CURATOR · Best Friend Locket
(`bestfriendlocket`) Q3, CINDER ESCAPES.

**ACTIVES:** Twin Mirror (`twinmirror`) Q3 one use, WALL KNOCKER · Sealed Coffer
(`sealedcoffer`) Q2 one use, LOCKPICK · Wrapped Parcel (`wrappedparcel`) Q2 one use, GOOD FOR
BUSINESS · Grandmother's Powder (`grandmapowder`) Q3 one use, TROPHY ROOM · Fuse Recipe Book
(`fusebook`) Q2 3 rooms, WAX WORKS · Psalter of Feathers (`psalter`) Q2 3 rooms, GOOD COMPANY ·
Book of Embers (`emberbook`) Q2 4 rooms, HOARDER · Primer of Seeking (`seekingprimer`) Q1 2
rooms, CANDLE SNUFFER · Torn Bestiary Page (`bestiary`) Q2 3 rooms, CURATOR · Rusted Iron Nail
(`ironnail`) Q2 6 rooms, BAD COMPANY · Wobble Cap (`wobblecap`) Q2 2 rooms, IRON STOMACH · Sour
Rag (`sourrag`) Q1 3 rooms, DRIP, DRIP · Sobbing Skull (`sobbingskull`) Q2 1 room, BOSS HUNTER ·
Weeping Censer (`weepingcenser`) Q3 fills as you shoot, THE CHOIR · Hollering Jaw (`hollerjaw`)
Q3 2 rooms, TALLOW TIDE · Horned Mask (`hornedmask`) Q3 6 rooms, THE LONG CONTRACT · Powder Heart
(`powderheart`) Q1 1 room, LOCKPICK · Rubber Eraser (`rubbereraser`) Q3 3 rooms, A THOUSAND
WICKS · Bent Boomerang (`boomerang`) Q2 3 s, DODGER · Cracked Skylight (`skylight`) Q3 4 rooms,
MORROW ESCAPES · Rocking Horse (`rockinghorse`) Q3 6 rooms, SPILL ESCAPES · Spilled Vinegar
(`vinegar`) Q1 2 rooms, FULL DECK · Thrown Torch (`torchstub`) Q2 5 s, KILN ESCAPES · Sinkhole
Marble (`sinkhole`) Q3 4 rooms, ECHO ESCAPES · Jar of Lard (`lardjar`) Q2 4 rooms, BIG GAME ·
Prayer Slip (`prayerslip`) Q3 6 rooms, WISP ESCAPES · Rotten Head (`rottenhead`) Q1 1 room, WAX
WORKS · Box of Spiderlings (`spiderbox`) Q2 3 rooms, NIB & NUB ESCAPES · Fortune Deck
(`fortunedeck`) Q2 6 rooms, FULL DECK · Pill Tin (`pilltin`) Q2 6 rooms, IRON STOMACH · Janitor's
Key Ring (`keyring`) Q2 2 rooms, CELLAR CARTOGRAPHER · Bone Dice (`bonedice`) Q3 6 rooms, PILFER
ESCAPES · Pocket Slot Machine (`pocketslot`) Q1 1 coin, GOOD FOR BUSINESS · Wax Donor Kit
(`donorkit`) Q1 half a heart, DRIP, DRIP · Bad Bean (`badbean`) Q1 4 s, BRICK ESCAPES.

**PASSIVES:** Spare Heart (`spareheart`) Q1, CANDLE SNUFFER · Pickled Liver (`pickledliver`) Q2,
BOSS HUNTER · Mummy Wrap (`mummywrap`) Q2, BIG GAME · Cold Supper (`coldsupper`) Q1, ALWAYS RELIT
· Bucket of Lard (`lardbucket`) Q2, BRICK ESCAPES · Throbbing Sac (`throbbingsac`) Q2, DRIP, DRIP
· Black Lily (`blacklily`) Q3, WALL KNOCKER · Sprout Jar (`sproutjar`) Q1, HOARDER · Weeping
Palms (`weepingpalms`) Q2, GOOD COMPANY · Bead Rosary (`rosary`) Q2, THE CHOIR · Growth Tonic
(`growthtonic`) Q2, BOSS HUNTER · Rattling Vial (`rattlingvial`) Q2, WAX WORKS · Sharp Syringe
(`sharpsyringe`) Q1, IRON STOMACH · Weeping Onion (`weepingonion`) Q2, CANDLE SNUFFER · Bent Coat
Hanger (`bentcoathanger`) Q2, CURATOR · Tin Halo (`tinhalo`) Q3, WICK ESCAPES · Lip Rouge
(`liprouge`) Q1, GOOD FOR BUSINESS · Stilt Shoes (`stiltshoes`) Q1, ALWAYS RELIT · Wooden Spoon
(`woodenspoon`) Q1, HOARDER · Brass Knuckles (`brassknuckles`) Q3, TALLOW KING · Gilded Heart
(`gildedheart`) Q4, THE CHOIR · Moonlit Toadstool (`moontoadstool`) Q3, CELLAR CARTOGRAPHER ·
Pinch of Spores (`sporepinch`) Q1, CANDLE SNUFFER · Thin Mushroom (`thinmushroom`) Q2, IRON
STOMACH · Fat Mushroom (`fatmushroom`) Q2, BIG GAME · Bluecap (`bluecap`) Q2, HOARDER ·
Nine-Tailed Whip (`ninetails`) Q2, TALLOW TIDE · Tabby's Tail (`tabbytail`) Q2, LOCKPICK · Bell
Collar (`bellcollar`) Q1, GOOD FOR BUSINESS · Ninth Life (`ninthlife`) Q3, DRIP, DRIP · Nun's
Habit (`nunshabit`) Q2, BUTTON MASHER · Clay Piggy Bank (`piggybank`) Q1, GOOD FOR BUSINESS ·
Blood Rush (`bloodrush`) Q2, BAD COMPANY · Leather Mask (`leathermask`) Q2, DODGER · Scarlet Veil
(`scarletveil`) Q2, THE LONG CONTRACT · Iron Cross (`ironcross`) Q2, VESPER ESCAPES · Blessed
Shawl (`blessedshawl`) Q4, BEACON ESCAPES · Skeleton Key (`skeletonkey`) Q3, LOCKPICK · Powder
Barrel (`powderbarrel`) Q3, TROPHY ROOM · Silver Dollar (`silverdollar`) Q3, GOOD FOR BUSINESS ·
Big Bertha Bombs (`bertha`) Q2, WAX WORKS · Goat Skull (`goatskull`) Q3, THE LONG CONTRACT.

**ODDITIES:** Devil's Mark (`devilsmark`) Q2, BAD COMPANY · Signed Pact (`signedpact`) Q2, BAD
COMPANY · Black Robes (`blackrobes`) Q3, THE LONG CONTRACT · Crown of Cinders (`ashencrown`) Q3,
CINDER ESCAPES · Hollow Wings (`hollowwings`) Q3, TROPHY ROOM · Ink Matter (`inkmatter`) Q3, WALL
KNOCKER · Two-Way Pact (`twowaypact`) Q2, GOOD COMPANY · Pentacle Charm (`pentaclecharm`) Q2, BIG
GAME · Paper Wings (`paperwings`) Q3, THE CHOIR · Grey Dove (`greydove`) Q3, WISP ESCAPES · Holy
Water Vial (`holywater`) Q2, DODGER · Choir Robes (`choirrobes`) Q2, ECHO ESCAPES · Warm Halo
(`warmhalo`) Q3, KILN ESCAPES · Comet Shard (`cometshard`) Q3, MORROW ESCAPES · Telescope Lens
(`telescopelens`) Q2, CELLAR CARTOGRAPHER · Star Chart (`starchart`) Q2, CELLAR CARTOGRAPHER ·
Eclipse Pendant (`eclipsependant`) Q2, TALLOW TIDE · Orrery Gear (`orrerygear`) Q2, MUSEUM OF WAX
· Night Shroud (`nightshroud`) Q3, WALL KNOCKER · Ectoplasm Jar (`ectoplasm`) Q2, WAX WORKS · Moth
Larva (`mothlarva`) Q1, CANDLE SNUFFER · Swarm Ring (`swarmring`) Q2, PIP ESCAPES · Silk Spool
(`silkspool`) Q2, NIB & NUB ESCAPES · Widow's Fang (`widowfang`) Q2, PILFER ESCAPES · Egg Bundle
(`eggbundle`) Q2, SPILL ESCAPES · Firestarter Kit (`firestarter`) Q2, BOSS HUNTER · Scorched
Gloves (`scorchedgloves`) Q3, A THOUSAND WICKS · Spare Ribs (`spareribs`) Q2, MORROW ESCAPES ·
Femur (`femur`) Q2, TALLOW KING · Ball of Tar (`balloftar`) Q1, FULL DECK · Car Battery
(`carbattery`) Q2, WELL USED · Jumper Cables (`jumpercables`) Q2, PRISM ESCAPES · Reading Glasses
(`readingglasses`) Q1, HOARDER · Ink Quill (`inkquill`) Q2, MUSEUM OF WAX · Lucky Penny
(`luckypenny`) Q1, GOOD FOR BUSINESS · Magnet Horseshoe (`magnethorseshoe`) Q2, CURATOR · Mouldy
Grimoire (`grimoire`) Q2, VESPER ESCAPES · Prism Shard (`prismshard`) Q3, PRISM ESCAPES.
**Junk (Q0):** An Empty Jar (`emptyjar`, does nothing), ALWAYS RELIT · Lead Boots (`leadboots`,
-0.4 speed +0.3 damage), DRIP, DRIP · Black Cat Hair (`blackcathair`, 7 coins, -2 luck),
LOCKPICK · Wet Match (`wetmatch`, weaker slower shots, more range), WAX WORKS · Dunce Cap
(`duncecap`, -1 luck, counts as a book), CELLAR CARTOGRAPHER · Spoiled Milk (`spoiledmilk`,
faster weak shots, a little poison), IRON STOMACH.

### Picking an item up

Wick raises the item over the flame with two little wax arms (facing you, a warm glow and sparks
behind it) for a second, with the pickup chime. At the top of the screen a strip of wax unrolls with
the item's name in big letters and its line under it, the icon at its side, and drips away after
about three seconds (item info set to "name only" hides the line).

**Quality 4 items** get more: Wick does a happy little dance for 1.2 seconds (hops, sways and turns
from side to side while gold sparks rise) to its own jingle. Wick can't be hurt, move or shoot
while dancing.

**Debug:** with `?debug`, **I** opens the item picker: every item in a grid, the chosen one's
details next to it (icon, quality, type, pools, its line and everything it does). Enter takes it
(the picker stays open, held items get a green dot), Esc closes. On a phone: tap to see, tap again
to take.

### Character starters (8)

Only characters start with these; they are in no pool.

| Item | Slot | Charge | Effect | Who |
|---|---|---|---|---|
| **Loaded Die** (`loadeddie`) | pocket | 3 rooms | rerolls every item in the room | Pip |
| **Ashen Hymnal** (`hymnal`) | active | 3 rooms | 18 + damage to every enemy, +half Ash Heart | Vesper |
| **Unsung Hymnal** (`blackhymnal`) | active | half a heart | 3 wisps orbit you, each blocks 2 shots | Vesper, Unsung |
| **Cinder Pact** (`pact`) | active | 3 rooms | fiend form 10 s: +2 dmg, burning shots, flight | Cinder |
| **Smother Step** (`shadowdash`) | pocket | timed 2.5 s | dash as smoke, 3x dmg to everything passed | Cinder, Smothered |
| **Pale Veil** (`paleveil`) | pocket | 2 rooms | blocks the next hit | Wisp, Faded |
| **Spare Candle** (`sparecandle`) | pocket | 1 room | plants a shooting candle for the room (max 3) | Beacon |
| **Tallow Stub** (`tallowstub`) | pocket | timed 3 s | plants a stronger shooting candle for 14 s (max 4) | Beacon, Dimmed |

### Challenges and modes

The challenge registry exists (`src/data/challenges.js`) and plugs into the unlock system, but has
no content yet. Modes: **Normal** (available). Trinkets and pocket things have their own sections
below.

---

## TRINKETS

Small things you carry, one at a time, each with a passive effect (data:
`src/data/trinkets.js`; effects that aren't plain stats or shot traits: `src/game/trinketfx.js`).
Walk over one to pick it up; the one you held drops where you stand (it can't be picked straight
back up for a moment). The held trinket shows in the **bottom-left** corner and in the pause
screen. They drop from room clears (1.5 in ~93 of the drop weight), marked rocks, chests, the
fortune booth and the shop (8c). A trinket you've already seen this run won't drop again.

**Golden trinkets** (from floor 2, 6% + 0.5% per luck): the same trinket, twice as strong: stats
doubled, shot chances doubled, chances and amounts of its effect doubled. Gold icon that glints.

**Melting in for good:** the **Melting Pot** (active item, 2 rooms, treasure/shop; unlocked by
TRINKET COLLECTOR) and **THE KILN** card melt the held trinket into you: its effect stays for the
rest of the run and the trinket slot is free again. Melted trinkets show in the pause screen.

| Trinket | Q | What it does (golden: twice as much) |
|---|---|---|
| Chipped Tooth | 1 | +0.3 damage |
| Bent Pin | 1 | +0.3 fire rate |
| Worn Sole | 1 | +0.15 speed |
| Cracked Lens | 1 | +1.2 range |
| Loose Thread | 1 | +0.2 shot speed, +0.5 range |
| Dry Wishbone | 1 | +1 luck |
| Greasy Rag | 1 | +0.1 speed, +0.15 shot speed |
| Lump of Tallow | 1 | +0.15 damage, bigger shots, more knockback |
| Rusty Tack | 2 | shots pierce, -0.2 damage |
| Glass Marble | 2 | shots bounce off walls once |
| Moldy Spore | 1 | 10% poison shots |
| Ember Chip | 1 | 10% burning shots |
| Frozen Molar | 1 | 15% slowing shots |
| Lucky Horseshoe Nail | 2 | +0.5 luck, 6% critical shots |
| Bent Copper Penny | 2 | 10% chain-lightning shots |
| Owl Feather | 2 | homing shots, -0.3 fire rate |
| Ghost Thread | 2 | spectral shots (fly over rocks) |
| Wisdom Tooth | 1 | also shoots backwards, -0.1 damage |
| Eggshell Shard | 2 | shots split in two when they hit |
| Prickly Burr | 1 | 8% fear shots |
| Pink Ribbon | 1 | 6% charm shots |
| Frost Bead | 2 | 6% freezing shots |
| Thorn Ring | 2 | when hit: a ring of 8 thorns (5 damage) |
| Torn Coin Pouch | 1 | when hit: 60% a coin falls out |
| Angry Birthday Candle | 2 | when hit: +1.2 damage for 4 s |
| Leaky Battery | 2 | when hit: +1 charge |
| Broken Doorkey | 0 | when hit: 25% teleported to a random room |
| Hollow Bone | 1 | when hit: 12% half an Ash Heart |
| Last Ember | 2 | x1.3 damage at one heart or less |
| Brimming Cup | 2 | x1.15 damage at full blood hearts |
| Frayed Bell Rope | 2 | entering a fight: 25% everything freezes for 1.2 s |
| Scarecrow Rag | 1 | entering a fight: 25% everything is scared for 2 s |
| Wax Halo | 2 | entering a fight: 15% shield for 2.5 s |
| Ward Pebble | 2 | entering a fight: 25% a ward |
| Hare Charm | 1 | +0.15 speed while enemies are in the room |
| Chipped Saucer | 1 | room clear: 30% a coin |
| Vial of Old Blood | 2 | room clear: 18% half a heart |
| Keyhole Cut-Out | 1 | room clear: 12% a key |
| Damp Fuse | 1 | room clear: 12% a bomb |
| Tiny Ash Urn | 2 | room clear: 12% half an Ash Heart |
| Torn Tarot Corner | 1 | room clear: 10% a card |
| Rattling Pillbox | 1 | room clear: 10% a pill |
| Old Spark Plug | 2 | room clear: 30% an extra charge |
| Stitched Heart | 2 | heals half a heart every 4 rooms cleared |
| Gnat Nest | 1 | room clear: 35% a gnat |
| Fang Necklace | 2 | half a heart every 25 kills |
| Powder Horn | 2 | 12% of kills explode (doesn't hurt you) |
| Smear of War Paint | 2 | +0.04 damage per kill this room (up to +0.4) |
| Pickpocket Glove | 1 | 8% of hits knock a coin out |
| Bottomless Sack | 1 | 4% of kills drop a random pickup |
| Lodestone Chip | 1 | coins slide to you from 70 px |
| Pocket Coal | 2 | burns enemies next to you (2 damage, 26 px) |
| Dripping Wax Can | 2 | leaves a burning wax trail |
| Whispering Shell | 3 | every volley is repeated 0.3 s later at 40% damage |
| Crown Cork | 2 | every 5th volley also bursts 8 shots all around |
| Crow Quill | 3 | flight, -0.05 speed |
| Ink-Blotted Map | 1 | the floor's room layout on the map |
| Sewing-Needle Compass | 1 | special room icons on the map |
| Goat Horn Shard | 1 | +15% deal chance |
| Heart-Shaped Stone | 3 | +0.5 damage, +1 luck, x1.1 damage at full health (rare) |
| The First Wick 🔒 | 3 | +0.4 damage, +0.3 fire rate, +0.1 speed, +0.5 range (rare; TREASURE HUNTER) |

## POCKET THINGS: PILLS, CARDS, RUNES, CHARACTER STONES

One-time things you carry in your **pocket**: up to **2**, next to a character's own pocket item
(data: `src/data/consumables.js`; effects: `CONSUMABLE_FX` in `src/game/consumables.js`).
- **Use** the chosen one: **Q** / left trigger / the **PKT** button. **Switch** to the next:
  **F** / a stick click / the **SWAP** button (phones: PKT shows whenever something is in the pocket,
  SWAP only when there are two or more).
- The pocket sits in the **bottom-right** corner: the chosen thing big with its name above it
  (Q under it on a keyboard), the others smaller to the left (F next to them).
- Picking one up with a full pocket drops the chosen one where you stand.
- Picking up or using one shows its name (and what it does) on a wax strip at the top.
- Drops: room clears (cards 3, pills 3, runes 0.5, stones 0.15), jars (pills), chests, the fortune
  booth (cards, runes), the slot machine (pills), shops (cards 5c, pills 4c, runes 8c).
  A random "pocket thing" is a card or pill 5:5, a rune 1, a stone 0.35.

### Pills

Each run gives **13 of the pill effects a color** (from the seed, so the same seed has the same
colors). A pill shows as **??? PILL** until you take one of that color; then that color is known
for the rest of the run (name in the pocket, and the effect is described the first time). Pill
stat changes last the whole run. **Big pills** (6%) are longer and fatter and do everything twice
(twice the stat, twice the time, twice as many). Pills marked 🔒 only exist once unlocked.

| Pill | Kind | Effect |
|---|---|---|
| FULL PINT | good | heals all blood hearts |
| ASH DRAUGHT | good | +1 Ash Heart |
| MEAN STREAK | good | +0.4 damage |
| QUICK WICK | good | +0.35 fire rate |
| RUN DOWN | good | +0.12 speed |
| LONG SIGHT | good | +1.5 range |
| CLOVER TEA | good | +1 luck |
| SLING SHOT | good | +0.2 shot speed |
| FULL CHARGE | good | charges your active items |
| IRON SKIN | good | invincible 5 s |
| CLEAR SIGHT | good | maps the floor |
| BUZZ BUZZ | good | 4 gnats |
| SPORE CLOUD 🔒 | good | poisons everything close (PILL POPPER) |
| HEAVY HEART 🔒 | good | +1 heart container (PILL POPPER) |
| LIMP WICK | bad | -0.25 damage |
| DRAG FOOT | bad | -0.1 speed |
| SHORT FUSE | bad | -1 range |
| BUTTERFINGERS | bad | -0.25 fire rate |
| BLACK CAT | bad | -1 luck |
| BITTER PILL | bad | half a heart of damage (never your last) |
| WRONG WAY | bad | controls reversed for 6 s |
| LEAD BOOTS | bad | 40% slower for 8 s |
| LIGHTS OUT | bad | darkness for 12 s |
| FORGETFUL | bad | forget the map of unvisited rooms |
| WANDERLUST | neutral | teleport to a random room |
| SWAPSIES | neutral | swaps bombs and keys |
| LOOSE CHANGE 🔒 | neutral | every pickup in the room becomes a coin (TREASURE HUNTER) |
| HOT POCKETS 🔒 | neutral | three lit bombs drop at your feet (BAD MEDICINE) |
| SUGAR PILL | neutral | nothing |

### Cards

Tarot cards are our own arcana (a dark frame and a picture); playing cards have our suits
(coins, keys, bombs, hearts, ash, candles, the jester).

| Card | Effect |
|---|---|
| THE CANDLEMAKER | teleport to the start room |
| THE MOTH | teleport to the treasure room |
| THE MERCHANT | teleport to the shop |
| THE CROWN | teleport to the boss room |
| THE LANTERN | maps the floor |
| THE GRAVEDIGGER | opens every hidden door of this room |
| THE HANGED WICK | +1.5 damage for this room |
| THE DROWNED | freezes everything for 4 s |
| THE TOWER OF WAX | 6 explosions around the room (not on top of you) |
| THE TWO FLAMES | a wax twin for this room |
| THE PYRE | a ring of 18 fire shots |
| THE VIGIL | invincible 8 s |
| THE BEGGAR | a beggar appears (coin, key, bomb, battery or rotting) |
| THE WHEEL OF WAX | a slot machine, fortune booth or shell game appears |
| THE FEAST | heals all blood hearts and drops 2 hearts |
| THE GRAVE | a random chest appears |
| THE DEVIL'S DUE | +2.5 damage for this room |
| THE CRIMSON DOOR | opens a red room (like the Crimson Key) |
| THE KILN | melts your trinket into you for good |
| ACE OF COINS / KEYS / BOMBS / HEARTS | every pickup in the room turns into that |
| TWO OF COINS / KEYS / BOMBS | doubles that count |
| TWO OF HEARTS | doubles your blood hearts |
| QUEEN OF ASH | 3 Ash Hearts |
| KING OF CANDLES | an item from the treasure pool (rare card) |
| THE JESTER | a deal room opens behind a wall and takes you in (the door leads back) |
| BLANK CARD 🔒 | a random other card (CARD SHARP) |

### Runes

Rarer than cards, and stronger.

| Rune | Effect |
|---|---|
| RUNE OF THE PYRE | 40 + your damage to everything, and sets it burning |
| RUNE OF CHAINS | freezes everything for 7 s |
| RUNE OF THE WAX GATE | every secret room on the floor shown, every hidden door open |
| RUNE OF CHANGE | rerolls every item in the room |
| RUNE OF PLENTY | duplicates every pickup in the room |
| RUNE OF THE DEEP | teleport to a room you haven't been to (special ones first) |
| RUNE OF HUNGER | breaks every rock, pot and tinted rock in the room |
| RUNE OF THE WALL | invincible 12 s |
| RUNE OF ASH | 3 Ash Hearts and a Vigil Heart |
| RUNE OF THE SWARM | 8 gnats |
| HOLLOW RUNE 🔒 | a random other rune (RUNE READER) |

### Character stones

One stone per character (twisted characters share their base character's); a small taste of
that character's thing. Your own character's stone turns up more often (25% of stone drops).
A smooth stone in the character's colors with a little flame carved in it.

| Stone | Effect |
|---|---|
| STONE OF WICK | +2 damage for 8 s and a ring of 12 fire shots |
| STONE OF PIP | rerolls every item in the room |
| STONE OF BRICK | shield 6 s and a gust that pushes everything away |
| STONE OF VESPER | a hymn: 18 damage to everything, half an Ash Heart |
| STONE OF CINDER | fiend form for 6 s |
| STONE OF PILFER | 7 coins |
| STONE OF WISP | 3 wards |
| STONE OF MORROW | come back once if you die on this floor (2 hearts) |
| STONE OF NIB & NUB | a twin for this room |
| STONE OF PRISM | beams in four directions (25 + your damage) |
| STONE OF MOTLEY | a random other stone |
| STONE OF SEXTON | digs up 4 pickups |
| STONE OF SPILL | burning wax trail for this room |
| STONE OF KILN | a ring of 24 fire shots |
| STONE OF ECHO | every volley repeats (80%) for this room |
| STONE OF BEACON | 3 shooting candles for 20 s |

## CHESTS

Data: `src/data/chests.js` (each type's art, how it opens and a weighted list of what's inside);
behavior: `Chest` in `src/game/specials.js`. Chests pop open with a little bounce and sparkle.
Luck: +1 pickup every 3 luck, and the outcomes with an item get likelier (+8% weight per luck).
Room clears drop a chest 4 in ~93 of the drop weight; the kind is rolled from CHEST_ROLL
(wood 50, gold 22, spiked 8, red 8, stone 7, eternal 3, mega 1).

| Chest | Opens | Inside |
|---|---|---|
| **Wooden** (brown) | touch | 1–3 pickups (64%), 1–2 pickups + a pocket thing (18%), a trinket (10%), 2–4 pickups (8%) |
| **Golden** | a key | 2–5 pickups (42%), pickups + a pocket thing (20%), pickups + a trinket (12%), a treasure item (26%) |
| **Red** | touch | 2 Soot Hearts (22%), 2 pills (18%), a trinket (10%), a devil item (12%), a deal room opens and takes you in (4%), **3 lit bombs** (16%), **3 spiders** (18%) |
| **Stone** (grey) | **only a bomb** | 3–5 pickups (40%), pickups + a rune (25%), pickups + a character stone (10%), a trinket (15%), a secret-room item (10%) |
| **Spiked** (dark, nails on the lid) | touch, **costs half a heart** | 2–5 pickups (48%), pickups + a pocket thing (20%), a trinket (14%), a treasure item (18%) |
| **Eternal** (pale) | a key | 2–4 pickups (45%), a card (20%), an angel item (35%). Half the time it shuts again after a moment, ready for another key (3 times at most) |
| **Mega** (big, gold) | a key | 7–11 pickups + 2 pocket things + a trinket (55%), or **two treasure items** + 2–4 pickups (45%) |

Where else: the curse room's two chests are red; a 'C' spot in a special room is a wooden chest
(15%: a random kind), 'L' a golden one; the Locksmith pays out wooden, golden and (rarely) eternal
chests; THE GRAVE card makes a random one.

---

## ENEMIES

Spawned from layout markers (`e` walker, `f` flyer, `s` stationary). Each room picks one of its
variant's **enemy groups** (e.g. gnawers + pestflies + egg sacs) so the mix fits together.

**Fairness rules.** Every room has an enemy **budget** (`threat` in `src/data/floors.js`: 5 on
floor 1 up to 10 on floor 8; x1.5 for 2-screen rooms, x2 for L-shapes, x2.5 for 2x2, x0.8 for
narrow rooms). Each enemy costs its threat (`THREAT` in `src/data/enemies.js`: a pestfly 0.5, a
blob 1, a ratram 1.6, an egg sac 2.5...) and markers are filled in random order until the budget
runs out. At most 2 spawners and 2 crawlers per room; spawners, nests and rat holes share a cap
of 4 live minions per room. Nothing ever starts within 64 px of the door you walk in through
(anything there is moved away), and rat holes wait while you stand next to them. On average
that's about 4 enemies in a one-screen room and 7–11 in big rooms on chapter 1.
Data: `src/data/enemies.js`; art: `src/data/enemyArt.js` (painted in code, front/back/side views
plus wind-up, attack, stunned and other poses). Sizes: most enemies are about as big as the
player or a bit bigger, small ones (flies, mites) a bit smaller, minibosses clearly bigger;
hitboxes match the sprites.

**Telegraphs.** Every attack has a wind-up the player can react to: the enemy stops and turns to
face you, switches to a wind-up pose (eyes glow red), shakes, gets a pulsing red glow under it,
plays a sound (snort, squeak, croak, buzz, rumble, chirp, squish, growl) and flashes white right
before it acts. Charges, lunges and dives also show a dotted line along the path they're about
to take; hops show where they'll land. Afterwards most have a recovery window. **Chargers**: stop,
face you, shake with glowing eyes and snort for ~0.5 s, then run with a dust trail, motion blur and
a faster run cycle; hitting a wall stuns them for ~1 s (small screen shake, dust, stars circling
their head).

**Walking in, deaths, shots and statuses**: see FEEL AND TUNING section 7 (a short wait before
enemies act, squash + gibs + stains, blood-drop shots, status icons).

| Enemy | id | Where | HP | Behavior |
|---|---|---|---|---|
| Mildew Blob | `blob` | chapter 1 (all variants) | 10 | walks straight at you around rocks |
| Dustmoth | `moth` | chapter 1 | 5 | flies, flutters erratically toward you |
| Drain Eye | `eye` | chapter 1 | 12 | stationary; opens wide and glows (0.55 s) then fires |
| Ratram | `ratram` | chapter 1 | 14 | charger: wanders on the grid axes, lines up, winds up 0.5 s, charges until a wall, stunned 1 s |
| Jar Toad | `toad` | chapter 1 | 12 | hopper: crouches and croaks (0.35 s) with its landing spot shown, hops, sits a moment |
| Egg Sac | `sac` | chapter 1 | 20 | stationary; swells and squishes (0.75 s) then hatches a mite every 5.5 s (max 2 each) |
| Mite | `mite` | chapter 1 | 3 | small, fast, swarms |
| Pestfly | `pestfly` | **Undercroft only** | 4 | small fly, comes in clouds of 2–3, drifts at you in wobbly paths |
| Divebuzzer | `divebuzzer` | **Undercroft only** | 9 | big bluebottle: circles you at a distance, buzzes with red eyes (0.6 s) showing its line, dives, then is dazed (stars) |
| Mudworm | `mudworm` | **Undercroft only** | 14 | moves under the floor as a mound (can't be hit), rumbles and shakes 0.7 s, bursts out, winds up (glowing mouth) and spits 3 shots, sinks again |
| Bristleworm | `bristleworm` | **Undercroft only** | 12 + 4×8 | a head and 4 body segments crawling in straight lines, turning at walls; every part can be hit; kill the head and the next segment becomes the new head (cut it in the middle and you get two worms). Max 2 per room |
| Gnawer | `gnawer` | **Undercroft only** (also from rat holes) | 8 | scurries in short bursts; up close it rears up and squeaks (0.45 s) showing its line, lunges, then recovers |
| Gawper | `gawper` | **Undercroft only** | 16 | slow shambling wax figure; below half health its face cracks: it shakes and growls (0.7 s), then runs at you |
| Rat Matron | `ratmatron` | Undercroft **miniboss** | 120 | huge rat in a wax crown: charges like a ratram (0.65 s wind-up, long stun) and squeals (0.8 s) to call 2 gnawers (max 4). Health bar at the bottom. Can take over a room 2+ rooms from the start |
| Crawlspider | `crawlspider` | **Weeping Hollow only** (also from nests and cocoons) | 5 | small black spider; skitters at you in quick jerky bursts with short pauses |
| Bigleg | `bigleg` | **Weeping Hollow only** | 14 | long-legged spider: crouches with burning eyes (0.55 s) while its landing spot shows, leaps up to 120 px, leaves a web where it lands |
| Brood Nest | `broodnest` | **Weeping Hollow only** | 22 | stationary web cocoon: swells (0.8 s), a crawlspider crawls out (2 at a time) |
| Webspitter | `webspitter` | **Weeping Hollow only** | 10 | keeps 70–120 px away and strafes; its belly glows (0.6 s), then it spits a web glob that leaves a sticky web where it lands |
| Mossback | `mossback` | **Weeping Hollow only** | 16 | slow mossy beetle with an armored front: shots from the front do half (they clink off). It turns toward you slowly, so circling round it hits its soft back; rears up with glowing eyes (0.65 s) and spits 3 spores |
| Moss Lurker | `mosslurker` | **Weeping Hollow only** | 14 | hides as a patch of moss (can't be hit). Get close and it bulges with glowing eyes (0.55 s) showing its line, bursts up and bites, then stays exposed for 1.3 s before sinking and moving somewhere else |
| Hanger | `hanger` | **Weeping Hollow only** | 9 | waits on the ceiling: only its faint shadow creeps after you. Right above you the shadow grows and a thread appears (0.7 s), it drops, walks for a bit (can be hit), then climbs back up |
| Loom Mother | `loommother` | Weeping Hollow **miniboss** | 130 | huge old spider with a ruff of web: leaps across the room (crouch 0.7 s, landing spot shown; a ring of 8 shots and a web where she lands), spits a fan of 3 web globs (0.7 s wind-up), calls 2 crawlspiders (0.8 s, max 4) |
| Cinderling | `cinderling` | **Smolder only** (also from the Pyre) | 6 | a scurrying lump of burning tallow; leaves a trail of fire |
| Ashwalker | `ashwalker` | **Smolder only** | 14 | charred walker; when killed it glows white-hot and flashes for 0.7 s, then bursts into a ring of fire and 6 embers (back off!) |
| Flickerwisp | `flickerwisp` | **Smolder only** | 8 | floating flame: a small flame flickers on the floor where it's going (0.55 s) while it fades, it blinks there, glows (0.45 s) and shoots a fireball |
| Kindler | `kindler` | **Smolder only** | 11 | keeps its distance; holds up a glowing coal (0.6 s) and lobs it at you; a red ring marks where it lands; a patch of fire where it does |
| Smokebelly | `smokebelly` | **Smolder only** | 20 | slow bellows-creature; up close it breathes in (0.8 s: puffs up, eyes glow, pulls you a little, its line shows), then breathes a cone of fire for 1 s, then rests |
| Scorch Rat | `scorchrat` | **Smolder only** | 12 | burning charger (0.5 s wind-up), leaves a line of fire behind its charge, stunned at the wall |
| Clinker / Coal Bit | `clinker`, `coalbit` | **Smolder only** | 20 / 4 | a slow, tough lump of coal that breaks into two fast burning bits |
| Ember Hound | `emberhound` | Smolder **miniboss** | 140 | huge coal dog: charges trailing fire (0.65 s wind-up, long stun) and breathes fire up close (0.8 s wind-up) |
| Shriekbat | `shriekbat` | **Grotto only** (also from the Shrieking Mother) | 10 | flutters erratically; spreads its wings and shrieks (0.6 s), sending out a ring of 8 sound shots |
| Pebbler | `pebbler` | **Grotto only** | 16 | looks like a rock with sleepy eyes. Come within ~95 px and it uncurls (0.5 s, its line shows) and rolls at you, bouncing off walls twice; shots mostly glance off while it rolls (75% less); then it sits dizzy for 1.3 s |
| Boulderback | `boulderback` | **Grotto only** | 30 | slow stone golem; raises its fists (0.8 s) and slams the ground: a ring of 10 stones |
| Pick Ghoul | `pickghoul` | **Grotto only** | 18 | dead miner; walks up to you, raises its pick (0.6 s, its reach shows), swings in front of itself (hurts if you're in the arc), then recovers 0.7 s |
| Geode | `geode` | **Grotto only** | 18 | stationary crystal rock; glows brighter (0.9 s), bursts a ring of 8 crystal shards |
| Rockhopper | `rockhopper` | **Grotto only** | 12 | stone frog: two small hops (landing spot shown), then a big one (twice the wind-up, twice the distance) that slams a ring of 6 stones |
| Stonemaw | `stonemaw` | Grotto **miniboss** | 150 | a huge rolling boulder with a mouth: rolls bouncing off 3 walls (rocks fall at each hit), slams a ring of 12 stones, shakes 5 rocks down around you; dizzy after rolling |
| Bonewalker | `bonewalker` | **Ossuary only** (also from the Gravedigger) | 14 | skeleton; when "killed" it falls into a **pile of bones** (7 hp). Break the pile, or 4 s later it rattles and shakes (0.8 s) and gets back up with 60% health |
| Shade | `shade` | **Ossuary only** | 12 | see-through ghost that drifts through rocks; its face shows and it wails (0.6 s, its line shows), then dashes straight through |
| Ossifier | `ossifier` | **Ossuary only** | 14 | keeps 70–130 px away; raises a bone (0.6 s, its line shows) and throws it: it flies out, slows down and **comes back** to the thrower (passes over rocks) |
| Rattleskull | `rattleskull` | **Ossuary only** (also from urns) | 9 | floating skull; chatters (0.5 s), spits 3 teeth, then lunges a short way |
| Lanternkeeper | `lanternkeeper` | **Ossuary only** | 18 | slow keeper with a lantern; it flares (0.7 s) and 2 slow wisps drift after you, turning toward you |
| Cofferling | `cofferling` | **Ossuary only** | 18 | a closed coffin (shots do 10%; touching it is safe). Get close: it rattles (0.6 s, its line shows), bursts open lunging, then sits open 1.6 s (hit it now!) and shuts again |
| Bone Colossus | `bonecolossus` | Ossuary **miniboss** | 150 | giant skeleton: stomps a ring of 10 bones, throws 3 bones that come back; falls into a pile once (30 hp) and gets up at half health if it isn't broken in 3 s |
| Leech | `leech` | **Sunken only** (also from jars and the Drowner) | 5 | fast wriggling worm |
| Snapjaw | `snapjaw` | **Sunken only** | 14 | only its fin shows as it circles you under the water (can't be hit). Bubbles rise and it surfaces (0.6 s, landing spot shown), leaps out to bite, sits 0.5 s (hit it), dives again |
| Bloatfish | `bloatfish` | **Sunken only** | 12 | drifts at you; up close it swells up (0.6 s), shoots 8 spikes all around, then goes limp for 1.6 s |
| Drowned | `drowned` | **Sunken only** | 18 | shuffles after you; cheeks bulge (0.7 s), spits a jet of 5 water shots in a line |
| Eel | `eel` | **Sunken only** | 10 + 5×6 | a head and 5 body segments swimming in waves; segments become heads when cut off |
| Giant Clam | `clam` | **Sunken only** | 16 | stationary; shut, shots do 10%. Opens (0.7 s, its pearl glows), fires 3 pearls, stays open 1.3 s, shuts |
| The Undertow | `undertow` | Sunken **miniboss** | 150 | a huge snapjaw: circles under the water, leaps across the room (landing spot shown) into a ring of 10 water shots, then spits a fan of 5 before diving |
| Chainling | `chainling` | **Underhall only** (also from the Jailer and the Chandler) | 18 | shackled ghoul swinging an iron ball around itself (touching the ball hurts); winds up (0.7 s, line shown) and hurls the ball 110 px on its chain, then reels it in |
| Gargoyle | `gargoyle` | **Underhall only** | 22 | a statue: shots do 15% and touching it is safe. Line up with it and its eyes and cracks light up (0.6 s, snort), it charges at you, crashes and sits dazed (1.2 s), then turns back to stone for a moment |
| Brute | `brute` | **Underhall only** | 34 | hulking jailer; fists up (0.8 s), pounds: shockwave lines of 3 shots in a cross, alternating with an x |
| Hookjaw | `hookjaw` | **Underhall only** | 16 | keeps 70–120 px away; raises its hook (0.7 s, line shown), throws it 150 px on a chain. If it catches you it hurts and reels you in toward it |
| Sentry Eye | `sentryeye` | **Underhall only** | 20 | a floating eye in an iron frame; its pupil narrows and a thin red line shows where it's looking for 0.9 s (the line is fixed when the wind-up starts: step off it), then it burns a beam along it for 0.6 s (walls stop it) |
| Ironclad | `ironclad` | **Underhall only** | 18 | small knight behind a big shield: shots from the front do 20%, and the shield turns slowly, so circle it. Up close it sets its spear (0.5 s, line shown) and lunges |
| The Jailer | `jailer` | Underhall **miniboss** | 180 | giant jailer: swings a huge ball and chain around itself, hurls it (0.75 s, line shown), pounds shockwave crosses (4 shots per line), calls 2 chainlings |
| Shroudling | `shroudling` | **Wax Tombs only** (also from the Shrouded King and the Embalmer) | 20 | a wrapped body shuffling with arms out; below half health it tears its wrappings off (0.6 s) and runs at you |
| Mourner | `mourner` | **Wax Tombs only** | 22 | a weeping marble statue walking slowly; covers her face (0.8 s) and cries a ring of 8 tears |
| Candlewight | `candlewight` | **Wax Tombs only** | 14 | waxy corpse with a violet candle on its head; strafes at a distance, its candle flares (0.55 s), flicks 3 violet flames |
| Tomb Hand | `tombhand` | **Wax Tombs only** | 14 | under the floor (can't be hit): cracks creep after you, stop and glow violet (0.7 s), a huge hand bursts up (hurts if you're on it) and stays up 1.2 s (hit it now), then sinks |
| Reliquary | `reliquary` | **Wax Tombs only** | 24 | stationary golden box: creaks open (0.6 s), lets out a soul moth (2 at a time) |
| Soul Moth | `soulmoth` | **Wax Tombs only** (also from reliquaries and urns) | 4 | a little glowing violet moth that flutters at you |
| Pallbearer | `pallbearer` | **Wax Tombs only** | 24 | ghoul carrying a coffin over its head: lines up with you, tilts the coffin back (0.6 s, snort), charges, dazed 1.4 s at the wall |
| The Embalmer | `embalmer` | Wax Tombs **miniboss** | 170 | tall gaunt figure with needle fingers: leaps (landing shown) into a ring of 10 violet shots, throws a fan of 5 needles (0.65 s), calls 2 shroudlings |
| Tarling | `tarling` | **Mire only** (also from barrels, bloatflies, the Bog Mother and the Toad) | 6 | fast little blob of tar; leaves a sticky trail that slows you (doesn't hurt) |
| Gulper | `gulper` | **Mire only** | 20 | bog toad; its throat swells (0.6 s, line shown) and its tongue lashes out 92 px and snaps back |
| Oozer | `oozer` | **Mire only** | 16 | black slug; rears up (0.6 s) and spits a tar glob that leaves a tar puddle where it lands |
| Bloatfly | `bloatfly` | **Mire only** | 12 | a big swollen fly; when it pops it leaves a poison puddle and 2 tarlings (within the room's minion cap) |
| Rotgut | `rotgut` | **Mire only** | 24 | swollen bog corpse; heaves (0.7 s) and vomits a fan of 5 bile shots |
| Murkworm | `murkworm` | **Mire only** | 12 + 4×7 | a long black worm (head + 4 segments) swimming in waves, leaving a tar trail |
| The Bog Mother | `bogmother` | Mire **miniboss** | 180 | a mound of tar with five eyes: leaps (landing shown) into a ring of shots and a tar pool, spits 3 tar globs, births 3 tarlings |
| Pulper | `pulper` | **Fleshworks only** | 14 | a lump of meat: two short hops, then a big one that splatters a ring of 8 blood shots and a blood puddle |
| Clotling | `clotling` | **Fleshworks** (also from pustules, the Mother of Clots and the Tallow Heart) | 5 | a fast little fly of clotted blood |
| Umbilic | `umbilic` | **Fleshworks only** | 18 | tied to the floor by a cord (drawn); rears up (0.6 s, line shown) and lunges as far as the cord lets it |
| Gutworm | `gutworm` | **Fleshworks only** | 18 | moves under the floor (a ripple), surfaces with a shudder (0.5 s), spits a fan of 5, sinks |
| Thumper | `thumper` | **Fleshworks** (some Black Womb / Scarred rooms) | 26 | an organ rooted in the floor; swells (0.6 s) and beats out a ring of 10 blood shots |
| Fetch | `fetch` | **Fleshworks** (some other ch.4 rooms) | 14 | a pale unborn ghost drifting through rocks; cries (0.7 s) three slow tears that follow you |
| Gloom | `gloom` | **Black Womb only** | 18 | a shadow flat on the floor (can't be hit). Get close: it rises (0.6 s, line shown), swipes, then stands dazed 1.4 s |
| Blacktongue | `blacktongue` | **Black Womb only** | 20 | its mouth gapes (0.6 s, line shown), then a 104 px tongue lashes out |
| Weeper | `weeper` | **Black Womb only** | 22 | eyeless, crying black bile: leaves a poison trail, spits a fan of 3 (0.6 s) |
| Mawling | `mawling` | **Black Womb** (some Fleshworks rooms) | 22 | almost all mouth: lines up, snorts (0.5 s), charges, dazed at walls |
| Eyestalk | `eyestalk` | **Black Womb** (some other ch.4 rooms) | 20 | an eye on a stalk: a thin red line shows (0.9 s), then it burns a beam |
| Nightfly | `nightfly` | **Black Womb** (also from the Hollow Mother) | 12 | hovers at a distance, eyes light up (0.6 s, line shown), dives; dazed after |
| Stitchling | `stitchling` | **Scarred Womb** (some Fleshworks rooms) | 16 (+2×7) | a doll of scar tissue; when it dies it splits into its two halves |
| Scab | `scab` | **Scarred Womb only** | 22 | a crusted beetle: its front is hard (shots do 25%) and it turns slowly; rears (0.6 s), flicks 3 shards |
| Suture | `suture` | **Scarred Womb only** | 12 + 5×7 | a long worm of thread (head + 5 segments) |
| Lancer | `lancer` | **Scarred Womb only** | 18 | sets its sharpened rib (0.5 s, line shown) and lunges |
| Picker | `picker` | **Scarred Womb** (also from bandaged lumps) | 6 | small skittering thing with long fingers |
| Bonecage | `bonecage` | **Scarred Womb only** | 20 | a ribcage curled up: uncurls (0.5 s), rolls at you bouncing off walls twice, sits dizzy |
| The Mother of Clots | `clotmother` | Fleshworks **miniboss** | 200 | a quivering mass of blood: leaps (landing shown) into a ring of 12 and a blood puddle, spits 5 clots, births clotlings |
| The Hollow Mother | `hollowmother` | Black Womb **miniboss** | 190 | a tall veiled shadow (flies): glides at you into a ring of 10, throws 4 dark wisps that follow you, calls nightflies |
| The Surgeon | `surgeon` | Scarred Womb **miniboss** | 200 | a stitched giant with scalpel fingers: slams a shockwave of 12, throws 3 scalpels that come back |
| Sludge / Sludgeling | `sludge`, `sludgeling` | Sunken and Mire groups | 16 / 6 | walks at you; splits in two |
| Draft | `draft` | Ossuary and Wax Tombs groups | 10 | ghost: flies through rocks, sometimes fades out (can't be hit) |
| Wax Husk | `husk` | Ossuary and Wax Tombs groups | 14 | walks, stops and glows (0.55 s), fires 4 shots in a + |
| Rotten versions | `blobRotten`, `mothRotten`, `eyeRotten`, `ratramRotten`, `toadRotten`, `huskRotten` | 🕰 old placeholder floors only | ×1.5–1.7 | tougher, with an extra trick (death shots, shooting, 3-shot spread, faster charge, landing shots, alternating cross) |

### Champions

Any enemy (except tiny ones and minibosses) can be a **champion**: recolored, stronger, with a
trick and a drop. Chance per enemy goes from 2% on floor 1 to 16% on floor 8.
Data: `src/data/champions.js`.

| Champion | Look | Trick | Drops |
|---|---|---|---|
| Crimson | red | double health | blood heart |
| Amber | yellow | 45% faster | key |
| Bilious | green | leaves a trail of poison slime (half a heart if you stand in it) | coin |
| Frost | pale blue | bursts into 8 shots when it dies | bomb |
| Sooty | black | 1.5x health, hits for an extra half heart | soot heart |
| Pale | white | fades out (can't be hit) for a moment every few seconds | ash heart |
| Violet | purple | pulls you toward it | coin |
| Stone | grey | ignores half of all damage, slower | bomb |
| Bloated | pink | splits into two runt copies when it dies | half blood heart |
| Ember | orange | leaves a trail of fire | coin |
| Thorned | dark green | shoots 4 shots back when hit (once a second) | silver coin |
| Prismatic | cycling rainbow | triple health | brass heart |
| Runt | small, sandy | 70% size, 40% faster, 60% health | coin |
| Hulking | big, brown | 140% size, triple health, slower, hits harder | blood heart |

---

## MUSIC

Creepy and heavy, like Isaac's: real music files first, generated music for everything else.
Data: `src/data/music.js`; engine: `src/engine/music.js`; the game picks the track in
`game.updateMusic()` (every frame; asking for the same track again changes nothing).

- **Files** (CC0, credited in CREDITS.md) in `assets/music/`: one per chapter, the boss, the final
  boss, the shop, the secret rooms, The Bargain and The Vigil. They load the first time they're
  needed (not at startup) and are cached for offline play after that. While a file loads, or if
  the browser can't play it (some iPhones can't play .ogg), or if it's deleted, the generated track
  plays instead.
- **Which track:** a boss fight (after its intro card): *boss*, or *final* on the last floor;
  the shop and black market: *shop*; secret, super secret, ultra secret and red rooms and the
  crawlspace: *secret*; The Bargain: *devil*; The Vigil: *angel*; everywhere else: the chapter's
  track (chapter 1–4; the finale counts as 4). The title screen plays chapter 1.
- **Crossfades:** every change fades the old track out and the new one in over 1.5 s.
- **Generated music** (the fallback): every floor variant has its own track (see FLOOR VARIANTS),
  and a **chapter layer** goes on top that gets heavier the deeper you go:
  - chapter 1: slow and creepy: a choir every other bar, an organ drone, one heavy knock a bar
  - chapter 2: plus a fuzzed, distorted bass pulse and toms
  - chapter 3: driving: kick on every beat, snare, an eighth-note distorted bass, tom fills
  - chapter 4: aggressive: double kicks, a sixteenth-note fuzz bass, a fuzzed lead, a choir with a
    sour note in it
  - the boss tracks are always intense (fuzzed double kicks once the boss gets angry, distorted
    bass, choir, stabs, a screaming lead in later phases); the final boss adds an organ, a bell and
    a choir that build over its three phases
  - the special rooms: *shop* is a music box waltz winding down with a heartbeat; *secret* is wind,
    a drone and far bells; *devil* is a deep distorted drone a tritone apart, a moaning choir and a
    slow heavy drum; *angel* is a choir on suspended chords that never resolve, with bells
  - instruments: detuned pads, a pipe organ (with a sparkle stop), a formant **choir** ("aah"),
    a soft-clipping **fuzz** for the bass, kicks and leads, kicks, snares, toms, hats, bells, drips,
    wind

## UNLOCKS & ACHIEVEMENTS

Defined in `src/data/unlocks.js`. Anything an achievement unlocks is locked until it's earned and
never appears in a run before then. Earning one shows a wax "UNLOCKED!" popup with the thing's
picture and name. Settings has **Unlock all** (testing) and **Reset progress** (with confirmation).

| Achievement | How to earn it | Unlocks |
|---|---|---|
| FIRST LIGHT | Defeat any boss | item: Bloody Bandage |
| DEEPER | Reach The Caves (chapter 2) | item: Cold Coffee |
| HIDDEN THINGS | Find 3 secret rooms | item: Nitro Wax |
| REGULAR CUSTOMER | Buy 5 things in shops | item: Penny Jar |
| SNUFFED OUT | Die 5 times | item: Live Coal |
| PACK RAT | Pick up 20 different items | item: Four-Leaf Fishhook |
| ESCAPE THE CELLAR | Defeat The Snuffer | item: Sacred Wick |
| LUCK OF THE DRAW | Use active items 15 times | character: Pip |
| HEAVY HITTER | Defeat 5 bosses | character: Brick |
| EVENSONG | Reach chapter 3 | character: Vesper |
| INTO THE FURNACE | Reach chapter 4 | character: Cinder |
| BIG SPENDER | Buy 15 things in shops | character: Pilfer |
| UNTOUCHED | Finish a floor without taking damage | character: Wisp |
| RELIT AGAIN | Die 10 times | character: Morrow |
| ENCORE | Escape the cellar twice | character: Nib & Nub |
| WAX MASSACRE | Snuff out 500 enemies | character: Prism |
| PATCHWORK | Escape with 3 different characters | character: Motley |
| GRAVEDIGGER | Break 10 marked rocks | character: Sexton |
| STILL MELTING | Start 15 runs | character: Spill |
| FIRED CLAY | Defeat The Old Boiler | character: Kiln |
| THE MOTH'S BELL | Defeat the Moth Queen | character: Echo |
| LIGHT KEEPER | Pick up 40 different items | character: Beacon |
| INTO THE FIRE | Defeat 2 bosses | floor variant: The Smolder |
| DEEPER STILL | Reach chapter 3 | floor variant: The Sunken Caves |
| BLACK WATER | Defeat 10 bosses | floor variant: The Mire |
| THE PROCESSION | Defeat The Chandler | room: The Procession (boss rush) |
| OLD WOUNDS | Defeat The Tallow Heart | floor variant: The Scarred Womb |
| PILL POPPER | Take 10 pills | pills: Spore Cloud, Heavy Heart |
| BAD MEDICINE | Take 25 pills | pill: Hot Pockets |
| TREASURE HUNTER | Open 15 chests | pill: Loose Change, trinket: The First Wick |
| CARD SHARP | Use 10 cards | card: Blank Card |
| RUNE READER | Use 5 runes | rune: Hollow Rune |
| TRINKET COLLECTOR | Pick up 20 trinkets | item: Melting Pot |
| *(16 twisted)* | Placeholder: reach chapter 3 as the base character (a secret replaces this in part 7) | character: each twisted version |

Tracked lifetime stats (`progress.stats`): runs, wins, deaths, enemies killed, bosses killed
(total and per boss), deepest floor/chapter, secret rooms found, shop purchases, marked rocks
broken, different items collected, active items used, pills taken, cards and runes used, chests
opened, trinkets picked up, floors without damage, characters that escaped, and per character: runs, wins, deepest chapter. Also: completion marks per character (which final bosses
they've beaten), the item collection, the 5 fastest wins and the last 10 runs.

## SAVES

Three versioned localStorage stores (`src/engine/storage.js`), each `{ v, data, savedAt }` with
migrations, so updates never break old saves:
- **settings**: options.
- **progress** (v2): unlocks, stats, per-character stats, last picked character, marks,
  collection, records.
- **run**: the run in progress. Saved on every room change, on floor change, on Save & Quit, and
  when the app is hidden or closed. **Continue** on the title screen restores it; uncleared rooms
  refill with fresh enemies and an undefeated boss comes back at full health. Deleted on death or
  victory. v2 stores the character, the full heart state, the pocket item, character stats and
  colors, mechanic state (Morrow's revive, Twofold's other form) and gnats; v1 saves are converted.
  Since part 4 it also stores (all optional, so older v3 saves still load): rooms added during the
  floor (red rooms, deal doors, the boss rush, error room, black market) as a list of steps that is
  replayed, each room's props (spike count, used die, beds, machines, chests, statues, hatches),
  item prices in hearts and "take one" groups, the deal flags and the crawlspace. A boss rush left
  half-way starts over. v5 (part 5) adds the pocket (pills, cards, runes, stones and which one
  is chosen), the held trinket and the melted ones, pill stat changes, this run's pill colors and
  which are known, trinkets already seen, and what each pocket thing / trinket lying on the floor
  is. A v4 run is converted with an empty pocket and no trinket (its pill colors come from the seed).
  v6 (part 6) adds how far each growing familiar has come (`helperXp`) and the transformations
  gained (`transforms`, kept for good); a v5 run is converted with none (a transformation its
  items already earn is given quietly when it loads, without the banner).
  v7 (new floor generator) stores the floor's rolled special rooms and how often the die
  reshuffled it (`floorPlan`), so the same floor is rebuilt on continue. A v6 run can't rebuild its
  old map: it keeps everything you carry and starts the same floor again from the start room, on a
  fresh map.

## SETTINGS

Music / sound volume, screen shake, tear highlight, Found HUD (stats on the left, and under them the
floor's live **deal chances**: a red horned icon with the chance of The Bargain and a pale haloed one
with the chance of The Vigil after this floor's boss, from the same odds the door uses; see Deals),
item info
(name / name + text / detailed), touch aim (4-way / 8-way on the shooting pad), move-stick size and control opacity, FPS counter,
show hitboxes (testing, see FEEL AND TUNING section 6), unlock all, reset progress. Sliders and choices: tap left of the middle of `< value >` to go down, right of it to go up.

**Phone layout (844x390):** the shooting pad is 3x60 px buttons in a cross, 40 px above the bottom-right corner;
the action buttons (SWAP, PKT, USE, B) sit in a row above it, just under the minimap.

**Updates:** the service worker fetches every file with `cache: no-cache` (it asks the server each time, so a new push shows up on the next load instead of after the browser's 10-minute cache). The game checks for a new version whenever it comes back to the front; when one takes over it reloads at once on the title screen, or on the next launch if a run is going.
