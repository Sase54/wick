// Every item in the game. Icons live in src/data/itemSprites.js under the same id.
//
// Fields (all optional except name/desc/type/quality/pools):
//   desc     the short funny line shown when you pick it up
//   lore     the longer text for the collection page and the pause screen
//   tags     words that link items: 3 items sharing a transformation tag transform you
//            (src/data/transformations.js), and synergies read them
//   unlock   the achievement that unlocks it (src/data/unlocks.js ITEM_ACHIEVEMENTS); no unlock = always there
//   type     'passive' | 'active'
//   quality  0-4, see QUALITY RULES below. Higher quality items show up less often.
//   pools    which rooms / machines can offer it, with a weight (see POOLS below). Greed mode
//            uses the greed pool when one is given (greedTreasure...) and the normal one otherwise
//   price    coins in the shop (default 15)
//   stats    added to the player's stats. Keys ending in "Mul" multiply instead:
//            damage, damageMul, fireRate, fireRateMul, range, shotSpeed, speed, luck
//   shot     changes to every attack (they stack with other items, and work with every weapon):
//            weapon (a form: beam, laser, knife, sword, bombs, or a delivery: barrage, lobbed,
//            steady; see src/game/weapons.js), weaponArt,
//            homing, pierce, spectral (flies over rocks), bounce (count), split (pieces),
//            sizeMul, multishot (extra shots), charged, backShot, knockbackMul, explode
//            (bursts on impact, never hurts you), style (shot look)
//            and CHANCES per shot (0..1) that grow with luck, see STATUS below:
//            poison, burn, slow, freeze, fear, charm, crit (x3 damage), chain (lightning
//            jumps to two more enemies), blast (the shot explodes), execute (kills outright, not bosses)
//            and odd traits for shots: grow (more damage the farther it flies), pull (drags enemies
//            along), hover (waits in the air while you hold shoot), wrap (through one wall and out the
//            other side), orbit (circles you), eraser (wipes out enemy shots it touches)
//   hearts   { containers, heal, ash } in half hearts (containers in whole hearts)
//   gives    { coins, bombs, keys } once, on pickup
//   look     { costume, flame, bodyTint } visible changes to Wick
//   follower / followers  a helper (or several) that sticks with you:
//            { kind: 'orbital', art, radius, speed, damage } circles you, blocks shots
//            { kind: 'familiar', variant: 'buddy' | 'rat' | 'firefly', ... } follows you
//   mechanics  character mechanics the item grants (src/game/mechanics.js): beam, echo, pickpocket
//   flying   cross pits and ignore spikes
//   map      what it shows on the map: 'rooms' (every room), 'icons' (every special room's icon),
//            'secrets' (the secret rooms); see src/ui/minimap.js
//   active   { charge (rooms to recharge), effect, ...params } for active items (Space / USE)
//            timed: seconds to recharge instead of rooms, costHealth: half hearts per use,
//            single: used up after one use
//
// QUALITY RULES (for every item, now and later):
//   Q0  bad or joke items, or a downside bigger than the upside
//   Q1  weak or very situational
//   Q2  decent: solid stat ups and simple helpful effects
//   Q3  strong: clearly changes a run (homing, splitting, piercing + more, good familiars...)
//   Q4  run-defining: huge damage multipliers, game-changing weapons and effects
//   A simple stat-up item is never Q4. A strong effect like homing shots is Q3 or higher.
//   Q4 items are rare: they come from treasure, devil, angel and secret rooms, never the shop
//   (ItemPools refuses them there), and every pool weighs items by quality (QUALITY_WEIGHT).
//
// Item pools. Each room type has its own flavor:
//   treasure  shot effects, buddies and fun gadgets: the core of a run
//   shop      practical stuff: maps, luck, utility actives, small stat ups
//   boss      solid stat boosts and health, a reward for the fight
//   secret    strange and powerful things for those who bomb the right wall
//   library   books (The Reading Room), planetarium: star things (The Orrery)
//   devil     The Bargain (paid in hearts), angel: The Vigil (free)
//   dealChance  raises the chance of a deal door after a floor's boss

// How often each quality shows up compared to quality 2.
export const QUALITY_WEIGHT = [1.3, 1.2, 1, 0.6, 0.25];

// Shot chances and luck: every point of luck adds `luck` to an item's chance, up to `cap`.
// (Several items with the same chance add up first.) Statuses on enemies: poison and burn hurt
// over time, slow slows them, freeze stops them cold, fear makes them run away, charm makes
// them fight for you for a moment. Bosses only take poison, burn and a short slow from freeze.
export const STATUS = {
  poison: { luck: 0.05, cap: 0.8, style: 'green', text: 'POISON' },
  burn: { luck: 0.05, cap: 0.8, style: 'ember', text: 'BURN' },
  slow: { luck: 0.05, cap: 0.8, style: 'ice', text: 'SLOW' },
  freeze: { luck: 0.04, cap: 0.5, style: 'ice', text: 'FREEZE' },
  fear: { luck: 0.04, cap: 0.6, style: 'violet', text: 'SCARE' },
  charm: { luck: 0.03, cap: 0.4, style: 'charm', text: 'CHARM' },
  crit: { luck: 0.025, cap: 0.5, style: 'gold', text: 'CRIT (X3 DAMAGE)' },
  chain: { luck: 0.04, cap: 0.6, style: 'spark', text: 'CHAIN LIGHTNING' },
  blast: { luck: 0.03, cap: 0.5, style: 'ember', text: 'THE SHOT EXPLODES' },
  execute: { luck: 0.01, cap: 0.15, style: 'bone', text: 'INSTANT KILL (NOT BOSSES)' },
};

export const ITEMS = {
  // ================================================================ THE CORE: TREASURE ROOMS
  cyclopsjar: {
    name: 'Jar of One Eye', desc: "It's looking at you. With your eye.", type: 'passive', quality: 4, pools: { treasure: 1, secret: 1 },
    stats: { damageMul: 2, damage: 0.5, fireRateMul: 0.55 }, shot: { sizeMul: 1.8, knockbackMul: 1.6 },
  },
  searingstrand: {
    name: 'Searing Strand', desc: 'Hold it in. Then let it all out.', type: 'passive', quality: 4, pools: { treasure: 0.6, devil: 1 },
    shot: { weapon: 'beam' }, stats: { damage: 0.5 }, look: { flame: 'hell' },
  },
  lodestone: {
    name: 'Lodestone Tooth', desc: 'Your shots can smell fear.', type: 'passive', quality: 3, pools: { treasure: 1, planetarium: 1 },
    shot: { homing: true, style: 'violet' },
  },
  forkedtongue: {
    name: 'Forked Tongue', desc: 'Say it three times. Out loud.', type: 'passive', quality: 3, pools: { treasure: 1 },
    stats: { fireRateMul: 0.75 }, shot: { multishot: 2 },
  },
  rubbermolar: {
    name: 'Rubber Molar', desc: 'Chewed. Bouncy. Gross.', type: 'passive', quality: 2, pools: { treasure: 1 },
    stats: { range: 1 }, shot: { bounce: 2 },
  },
  eggsac: {
    name: 'Spider Egg Sac', desc: 'Every shot hatches.', type: 'passive', quality: 3, pools: { treasure: 1 },
    shot: { split: 4 },
  },
  coffinnail: {
    name: 'Coffin Nail', desc: 'Goes in one side. Keeps going.', type: 'passive', quality: 2, pools: { treasure: 1, boss: 0.5 },
    stats: { damage: 0.5 }, shot: { pierce: true },
  },
  mildewjar: {
    name: 'Jar of Mildew', desc: 'Smells like the walls. Hurts like them too.', type: 'passive', quality: 2, pools: { treasure: 1 },
    shot: { poison: 0.25 },
  },
  frostfinger: {
    name: 'Frostbitten Finger', desc: 'Point at things. They stop.', type: 'passive', quality: 2, pools: { treasure: 1 },
    shot: { freeze: 0.15 },
  },
  scarebutton: {
    name: "Scarecrow's Button", desc: 'Even the crows left.', type: 'passive', quality: 2, pools: { treasure: 1 },
    shot: { fear: 0.2 },
  },
  loveletter: {
    name: 'Love Letter, Sealed in Wax', desc: "They'll come around.", type: 'passive', quality: 2, pools: { treasure: 1, angel: 0.5 },
    shot: { charm: 0.15 },
  },
  livecoal: {
    name: 'Live Coal', desc: 'Hot potato. Hot everything.', type: 'passive', quality: 2, pools: { treasure: 1, devil: 0.5 },
    stats: { damage: 0.3 }, shot: { burn: 0.3 }, look: { flame: 'ember' },
  },
  fourleaf: {
    name: 'Four-Leaf Fishhook', desc: 'Lucky for you. Unlucky for the fish.', type: 'passive', quality: 3, pools: { treasure: 1, secret: 0.8 },
    stats: { luck: 1 }, shot: { crit: 0.1 },
  },
  wanderingtooth: {
    name: 'Wandering Tooth', desc: 'It never settled down.', type: 'passive', quality: 2, pools: { treasure: 1 },
    follower: { kind: 'orbital', art: 'tooth', radius: 22, speed: 3.2, damage: 3 },
  },
  palemoths: {
    name: 'Two Pale Moths', desc: 'Drawn to your flame. Forever.', type: 'passive', quality: 2, pools: { treasure: 1, angel: 0.6 },
    followers: [
      { kind: 'orbital', art: 'moth', radius: 30, speed: -2.4, damage: 2.5 },
      { kind: 'orbital', art: 'moth', radius: 30, speed: -2.4, damage: 2.5, phase: Math.PI },
    ],
  },
  stubbuddy: {
    name: 'Stub Buddy', desc: 'A mini-you. Just as moody.', type: 'passive', quality: 2, pools: { treasure: 1 },
    follower: { kind: 'familiar', variant: 'buddy', fireRate: 2, damage: 3.5 },
  },
  hungryrat: {
    name: 'Hungry Rat', desc: 'Bites first. Asks never.', type: 'passive', quality: 2, pools: { treasure: 1, boss: 0.5 },
    follower: { kind: 'familiar', variant: 'rat', damage: 4, speed: 95 },
  },
  nitrowax: {
    name: 'Nitro Wax', desc: 'Shake well before using.', type: 'passive', quality: 3, pools: { treasure: 0.6, devil: 1, secret: 0.6 },
    stats: { damage: 1.5, fireRateMul: 0.6 }, shot: { explode: true, style: 'ember' },
  },
  copperwick: {
    name: 'Copper Wick', desc: 'Conducts rage beautifully.', type: 'passive', quality: 2, pools: { treasure: 1, planetarium: 1 },
    shot: { chain: 0.25 },
  },
  echobell: {
    name: 'Echoing Bell', desc: 'Everything you do happens twice. Once quieter.', type: 'passive', quality: 3, pools: { treasure: 1, planetarium: 1 },
    mechanics: { echo: { delay: 0.25, mul: 0.6 } },
  },

  // ---------- actives ----------
  meltingpot: {
    name: 'Melting Pot', desc: 'Your trinket goes in. It never comes out.', type: 'active', quality: 1, pools: { treasure: 0.6, shop: 1 },
    active: { charge: 2, effect: 'absorbTrinket' },
  },
  sandtimer: {
    name: 'Sand Timer', desc: 'Everyone else gets sleepy.', type: 'active', quality: 2, pools: { treasure: 1, library: 1 },
    active: { charge: 3, effect: 'slowtime', time: 6 },
  },
  frostbook: {
    name: 'Book of Hoarfrost', desc: 'Read it aloud. Everything stops listening.', type: 'active', quality: 2, pools: { library: 1, treasure: 0.6 },
    active: { charge: 3, effect: 'freezeall', time: 3 },
  },
  matchbook: {
    name: 'Matchbook of Spite', desc: 'Strike one. Lose your temper.', type: 'active', quality: 1, pools: { treasure: 1, devil: 0.6 },
    active: { charge: 2, effect: 'rage', damage: 2.5, time: 8 },
  },
  stormjar: {
    name: 'Storm in a Jar', desc: "Don't shake it. Okay, shake it.", type: 'active', quality: 3, pools: { treasure: 0.5, library: 1, angel: 1 },
    active: { charge: 4, effect: 'storm', damage: 20 },
  },

  // ================================================================ SHOP
  squeakyboots: {
    name: 'Squeaky Boots', desc: 'Squeak. Squeak. Squeak.', type: 'passive', quality: 1, pools: { shop: 1 },
    stats: { speed: 0.3 },
  },
  coldcoffee: {
    name: 'Cold Coffee', desc: 'Brewed sometime last decade.', type: 'passive', quality: 2, pools: { shop: 1, boss: 1 },
    stats: { fireRate: 0.7 },
  },
  blueprints: { name: 'Cellar Blueprints', desc: 'Someone drew this place. Badly.', type: 'passive', quality: 1, pools: { treasure: 0.8, shop: 1 }, map: 'rooms' },
  gravecompass: { name: 'Grave Compass', desc: 'It always points somewhere worse.', type: 'passive', quality: 1, pools: { treasure: 0.8, shop: 1 }, map: 'icons' },
  molenotes: { name: "Mole's Notes", desc: 'He knew where all the holes were.', type: 'passive', quality: 1, pools: { shop: 1, secret: 1 }, map: 'secrets' },
  belljar: {
    name: 'Bell Jar', desc: "Look, but don't touch.", type: 'active', quality: 2, pools: { shop: 1, angel: 1 },
    active: { charge: 3, effect: 'shield', time: 5 },
  },
  pennyjar: {
    name: 'Penny Jar', desc: 'Rattles when they die.', type: 'passive', quality: 2, pools: { shop: 1 }, price: 10,
    stats: { luck: 1 }, mechanics: { pickpocket: { chance: 0.15 } },
  },
  rabbitfoot: {
    name: "Gnawed Rabbit's Foot", desc: 'Lucky for somebody. Not the rabbit.', type: 'passive', quality: 1, pools: { shop: 1, secret: 1 },
    stats: { luck: 2 },
  },
  rustyshovel: {
    name: 'Rusty Shovel', desc: "Dig! Something's down there.", type: 'active', quality: 1, pools: { shop: 1 },
    active: { charge: 3, effect: 'dig', count: 2 },
  },

  // ================================================================ BOSS
  scaldingdrip: {
    name: 'Scalding Drip', desc: 'Drippier. Angrier.', type: 'passive', quality: 2, pools: { boss: 1 },
    stats: { damage: 1 },
  },
  mysterymeat: {
    name: 'Mystery Meat', desc: 'Best before... yes.', type: 'passive', quality: 1, pools: { boss: 1, shop: 0.6 },
    hearts: { containers: 1, heal: 2 },
  },
  bandage: {
    name: 'Bloody Bandage', desc: 'Still warm. Not yours.', type: 'passive', quality: 2, pools: { boss: 1 },
    hearts: { containers: 1, heal: 6 }, stats: { speed: 0.15 },
  },

  // ================================================================ SECRET ROOMS AND DEALS
  mothwings: {
    name: 'Moth Wings', desc: 'Flutter mode: unlocked.', type: 'passive', quality: 3, pools: { secret: 1, angel: 1 },
    flying: true, stats: { speed: 0.1 }, shot: { spectral: true, style: 'ghost' }, look: { costume: 'wings' },
  },
  hollowcrown: {
    name: 'Hollow Crown', desc: 'Heavy is the head. Heavier the hits.', type: 'passive', quality: 4, pools: { devil: 1, secret: 0.5 },
    stats: { damageMul: 1.5 }, shot: { pierce: true, style: 'red' }, look: { costume: 'crown' },
  },
  sacredwick: {
    name: 'Sacred Wick', desc: 'It burns for something bigger than you.', type: 'passive', quality: 4, pools: { angel: 1, treasure: 0.2 },
    stats: { damageMul: 1.6, fireRateMul: 0.85, shotSpeed: -0.2 }, shot: { homing: true, style: 'blue' }, look: { flame: 'white' },
  },
  crimsonkey: {
    name: 'Crimson Key', desc: 'Opens doors that were never there.', type: 'active', quality: 3, pools: { secret: 0.7, treasure: 0.25 },
    active: { charge: 4, effect: 'redkey' },
  },

  // ================================================================ CHARACTER STARTERS
  // Only characters start with these (starter: true keeps them out of every pool).
  // active.timed: recharges over that many seconds instead of by clearing rooms.
  // active.costHealth: costs that many half hearts instead of charge.
  loadeddie: { name: 'Loaded Die', desc: 'Roll again. And again.', type: 'active', quality: 3, pools: {}, starter: true, active: { charge: 3, effect: 'reroll' } },
  hymnal: { name: 'Ashen Hymnal', desc: 'One verse and the room goes quiet.', type: 'active', quality: 3, pools: {}, starter: true, active: { charge: 3, effect: 'hymn', damage: 18, ash: 1 } },
  blackhymnal: { name: 'Unsung Hymnal', desc: 'Paid in ash. Answered by wisps.', type: 'active', quality: 3, pools: {}, starter: true, active: { charge: 0, costHealth: 1, effect: 'wisps', count: 3 } },
  pact: { name: 'Cinder Pact', desc: 'Sign here. In wax.', type: 'active', quality: 3, pools: {}, starter: true, active: { charge: 3, effect: 'fiend', damage: 2, time: 10 } },
  shadowdash: { name: 'Smother Step', desc: 'Become smoke for a heartbeat.', type: 'active', quality: 3, pools: {}, starter: true, active: { charge: 1, timed: 2.5, effect: 'dash', damageMul: 3 } },
  paleveil: { name: 'Pale Veil', desc: 'Hides you from one blow.', type: 'active', quality: 2, pools: {}, starter: true, active: { charge: 2, effect: 'ward' } },
  sparecandle: { name: 'Spare Candle', desc: 'Leave a light on for the dark.', type: 'active', quality: 2, pools: {}, starter: true, active: { charge: 1, effect: 'sentry', life: 0, max: 3, damageMul: 0.7 } },
  tallowstub: { name: 'Tallow Stub', desc: 'Short, angry, and on a timer.', type: 'active', quality: 2, pools: {}, starter: true, active: { charge: 1, timed: 3, effect: 'sentry', life: 14, max: 4, damageMul: 1.2 } },

  // dropped by the statues in The Vigil (they open something in part 7)
  keyhalf1: { name: 'Rusted Key Half', desc: 'The other half is somewhere bright.', type: 'passive', quality: 2, pools: {}, starter: true, stats: { luck: 1 } },
  keyhalf2: { name: 'Gilded Key Half', desc: 'The other half is somewhere dark.', type: 'passive', quality: 2, pools: {}, starter: true, stats: { luck: 1 } },
};

// Items from before part 4.5 and what a saved run gets instead (see the run save migration).
export const OLD_ITEMS = {
  trimmed: 'coldcoffee', onion: 'coldcoffee', redwax: 'hollowcrown', magnet: 'lodestone', needle: 'coffinnail',
  rubber: 'rubbermolar', splitwick: 'forkedtongue', fork: 'forkedtongue', egg: 'eggsac', lard: 'cyclopsjar',
  mildew: 'mildewjar', ice: 'frostfinger', coal: 'livecoal', backeye: 'forkedtongue', thimble: 'wanderingtooth',
  button: 'wanderingtooth', littlewick: 'stubbuddy', matchbox: 'matchbook', lantern: 'stormjar', hourglass: 'sandtimer',
  boots: 'squeakyboots', coffee: 'coldcoffee', glasses: 'blueprints', knuckles: 'scaldingdrip', slingshot: 'squeakyboots',
  locket: 'mysterymeat', piggy: 'pennyjar', fuses: 'nitrowax', keyring: 'rustyshovel',
  bellows: 'matchbook', shovel: 'rustyshovel', healwax: 'mysterymeat', compass: 'gravecompass', hotwax: 'scaldingdrip',
  bentnail: 'coffinnail', church: 'bandage', meat: 'mysterymeat', clock: 'scaldingdrip', antlers: 'bandage',
  ash: 'bandage', rabbit: 'rabbitfoot', crown: 'hollowcrown', doll: 'scaldingdrip', blueflame: 'livecoal',
  wings: 'mothwings', ghostwax: 'mothwings', cooker: 'cyclopsjar', firefly: 'hungryrat', megafuse: 'nitrowax',
  twin: 'stubbuddy', sparewick: 'bandage', rootbeer: 'coldcoffee', blastcap: 'nitrowax', coinpurse: 'pennyjar',
  burntmatch: 'livecoal', magpie: 'fourleaf', eternalflame: 'sacredwick', bookembers: 'stormjar', almanac: 'sandtimer',
  bookteeth: 'frostbook', fieldguide: 'belljar', ledger: 'stormjar', bestiary: 'frostbook', dyingstar: 'livecoal',
  moonwax: 'mothwings', comet: 'lodestone', blacksun: 'hollowcrown', starchart: 'blueprints', tarheart: 'hollowcrown',
  hornedstub: 'searingstrand', sevenbites: 'forkedtongue', pactcoin: 'fourleaf', tarwings: 'mothwings',
  blackflame: 'livecoal', stillwater: 'coldcoffee', stubring: 'lodestone', lidless: 'coffinnail',
  quietbell: 'bandage', pureflame: 'sacredwick', dustycontract: 'rabbitfoot', blackmatch: 'livecoal',
};

export const DEFAULT_PRICE = 15;
export const FALLBACK_ITEM = 'scaldingdrip';

// The first shot style found in this order wins when several items set one.
export const SHOT_STYLE_PRIORITY = ['ember', 'green', 'ice', 'violet', 'ghost', 'red', 'blue', 'charm', 'pearl', 'spark', 'bone', 'tar', 'blood', 'dust'];

// Plain-language text for each active effect, used by detailed item descriptions.
export const ACTIVE_TEXT = {
  rage: (a) => `+${a.damage} DAMAGE FOR ${a.time} SECONDS`,
  firering: (a) => `SHOOTS A RING OF ${a.count} ${a.burn === false ? '' : 'BURNING '}SHOTS${a.mul ? ` (X${a.mul} DAMAGE)` : ''}`,
  shield: (a) => `INVINCIBLE FOR ${a.time} SECONDS`,
  gust: () => 'PUSHES ENEMIES AWAY AND CLEARS ENEMY SHOTS',
  slowtime: (a) => `SLOWS ALL ENEMIES FOR ${a.time} SECONDS`,
  freezeall: (a) => `FREEZES EVERY ENEMY FOR ${a.time} SECONDS (BOSSES SLOW DOWN)`,
  storm: (a) => `LIGHTNING STRIKES EVERY ENEMY FOR ${a.damage} DAMAGE`,
  dig: (a) => `DIGS UP ${a.count} PICKUPS`,
  megabomb: () => 'DROPS A HUGE BOMB',
  heal: (a) => `HEALS ${a.amount / 2} HEART`,
  twin: () => 'A WAX COPY OF YOU SHOOTS ALONG FOR ONE ROOM',
  teleport: () => 'TELEPORTS YOU TO A RANDOM ROOM',
  reroll: () => 'REROLLS EVERY ITEM IN THE ROOM',
  hymn: (a) => `${a.damage} DAMAGE TO EVERY ENEMY, +HALF ASH HEART`,
  wisps: (a) => `COSTS HALF A HEART: ${a.count} WISPS ORBIT YOU AND BLOCK SHOTS`,
  fiend: (a) => `FIEND FORM FOR ${a.time} SECONDS: +${a.damage} DAMAGE, BURNING SHOTS, FLIGHT`,
  dash: () => 'DASH AS SMOKE, HURTING EVERYTHING YOU PASS',
  ward: () => 'A WARD BLOCKS THE NEXT HIT',
  sentry: (a) => `PLANTS A CANDLE THAT SHOOTS ENEMIES${a.life ? ` FOR ${a.life} SECONDS` : ' THIS ROOM'}`,
  redkey: () => 'OPENS A RED ROOM BEHIND THE NEAREST EMPTY WALL',
  absorbTrinket: () => 'MELTS YOUR TRINKET INTO YOU: ITS EFFECT STAYS FOREVER',
};

// ---------------------------------------------------------------------------------------------
// ITEM POOLS. Every place that hands out an item draws from one of these. A pool with nothing
// left falls back to the pool after it (`fallback`). Greed mode uses `greed<Name>` weights where
// an item gives them, and the normal weight otherwise.
export const POOLS = {
  treasure: { name: 'TREASURE ROOM' },
  shop: { name: 'SHOP', fallback: 'treasure' },
  boss: { name: 'BOSS', fallback: 'treasure' },
  devil: { name: 'THE BARGAIN', fallback: 'treasure' },
  angel: { name: 'THE VIGIL', fallback: 'treasure' },
  secret: { name: 'SECRET ROOM', fallback: 'treasure' },
  library: { name: 'THE READING ROOM', fallback: 'treasure' },
  curse: { name: 'CURSE ROOM', fallback: 'devil' },
  planetarium: { name: 'THE ORRERY', fallback: 'treasure' },
  goldenChest: { name: 'BRASS CHEST', fallback: 'treasure' },
  redChest: { name: 'RED CHEST', fallback: 'devil' },
  beggar: { name: 'TIN-CUP WRETCH', fallback: 'shop' },
  keyBeggar: { name: 'LOCKSMITH', fallback: 'treasure' },
  bombBeggar: { name: 'SOOTLING', fallback: 'treasure' },
  demonBeggar: { name: 'SUPPLICANT', fallback: 'devil' },
  batteryBeggar: { name: 'SPARK-EATER', fallback: 'shop' },
  rottenBeggar: { name: 'ROTTING WRETCH', fallback: 'treasure' },
  crane: { name: 'GRASPING CLAW', fallback: 'treasure' },
};
export const greedPool = (pool) => `greed${pool[0].toUpperCase()}${pool.slice(1)}`;

// The Part 6 items live in batch files (each with its items, icons and costumes).
import * as ORIGINALS from './items/originals.js';
import * as SHOTS from './items/shots.js';
import * as FAMILIARS from './items/familiars.js';
import * as ACTIVES from './items/actives.js';
import * as PASSIVES from './items/passives.js';
import * as ODDITIES from './items/oddities.js';
export const ITEM_BATCHES = [SHOTS, FAMILIARS, ACTIVES, PASSIVES, ODDITIES];
for (const [id, extra] of Object.entries(ORIGINALS.EXTRAS)) if (ITEMS[id]) Object.assign(ITEMS[id], extra);
for (const b of ITEM_BATCHES) Object.assign(ITEMS, b.ITEMS);
Object.assign(ACTIVE_TEXT, ...ITEM_BATCHES.map((b) => b.ACTIVE_TEXT || {}));
