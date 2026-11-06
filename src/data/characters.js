// Playable characters. Each one is a starting loadout plus, sometimes, a unique mechanic.
//
//   name, desc     shown on the character select screen; `special` explains the twist
//   look           key in src/data/characterSprites.js (defaults to the character id)
//   health         starting hearts (see src/game/health.js):
//                  hearts (containers), red (blood halves, default full), ash, soot (halves),
//                  bones (Ribcage Hearts) + boneFill, rotten, eternal, golden, broken,
//                  soulOnly (containers become Ash Hearts), boneOnly (they become Ribcages),
//                  oneHit (no hearts at all)
//   coins, bombs, keys
//   items          passive items held from the start
//   active         active item (Space / USE), pocket: second active (Q / PKT)
//   stats          added to the base stats (keys ending in Mul multiply)
//   shot, flying   like items
//   mechanics      { name: params } unique rules, implemented in src/game/mechanics.js
//   dealPay        how this character pays in The Bargain: 'coins' (15 a heart); characters
//                  with no hearts at all (oneHit) take deals for free
//
// Every character except Wick is locked behind an achievement in src/data/unlocks.js.
// Each base character has a twisted version, `<id>_t`, harder and played differently.
export const CHARACTERS = {
  // ================================================================ BASE
  wick: {
    name: 'WICK', desc: 'A little candle stub with a big temper.',
    special: 'A GOOD PLACE TO START.',
    health: { hearts: 3 }, bombs: 1,
  },
  pip: {
    name: 'PIP', desc: 'A tea light in a tin cup. Plays dice with fate.',
    special: 'LOADED DIE: REROLLS THE ITEMS IN THE ROOM.',
    health: { hearts: 3 }, coins: 3, stats: { luck: 1 }, pocket: 'loadeddie',
  },
  brick: {
    name: 'BRICK', desc: 'A block candle. Slow to light, hard to put out.',
    special: 'SLOW, BIG HEALTH, HUGE HEAVY SHOTS.',
    health: { hearts: 5 }, bombs: 2,
    stats: { damage: 1.5, fireRate: -0.7, speed: -0.2, shotSpeed: -0.1 }, shot: { sizeMul: 1.4, knockbackMul: 1.6 },
  },
  vesper: {
    name: 'VESPER', desc: 'A chapel taper who sings to the dark.',
    special: 'ONLY ASH HEARTS. HER HYMNAL HURTS EVERYTHING.',
    health: { hearts: 0, ash: 6, eternal: 1, soulOnly: true },
    stats: { damage: -0.3, range: 1 }, active: 'hymnal',
  },
  cinder: {
    name: 'CINDER', desc: 'Burnt black. Smiles too wide.',
    special: 'SOOT HEARTS. HIS PACT MAKES HIM A FIEND.',
    health: { hearts: 1, soot: 4 }, stats: { damage: 1, speed: 0.05 }, active: 'pact',
  },
  pilfer: {
    name: 'PILFER', desc: 'Light fingers, lighter conscience.',
    special: 'LUCKY HANDS: ENEMIES SOMETIMES DROP COINS. PAYS DEALS IN COINS.',
    dealPay: 'coins',
    health: { hearts: 2, golden: 1 }, coins: 10, keys: 1,
    stats: { luck: 2, speed: 0.15, damage: -0.3 }, mechanics: { pickpocket: { chance: 0.12 } },
  },
  wisp: {
    name: 'WISP', desc: 'What is left when a candle goes out.',
    special: 'DIES IN ONE HIT. FLIES. A WARD BLOCKS ONE HIT EACH ROOM.',
    health: { oneHit: true }, flying: true, shot: { spectral: true, style: 'ghost' },
    stats: { speed: 0.1 }, mechanics: { ward: { perRoom: true } },
  },
  morrow: {
    name: 'MORROW', desc: 'Has been snuffed before. Got better.',
    special: 'COMES BACK ONCE AFTER DYING, STRONGER.',
    health: { hearts: 3 }, stats: { damage: -0.25 },
    mechanics: { revive: { name: 'MORROW, RELIT', look: 'morrowRelit', health: { hearts: 1, ash: 4 }, stats: { damage: 1.25, fireRate: 0.3 } } },
  },
  nib: {
    name: 'NIB & NUB', desc: 'Two birthday candles who never blow out alone.',
    special: 'TWO CANDLES MOVE AND SHOOT TOGETHER. SHARED HEARTS.',
    health: { hearts: 2, ash: 2 }, stats: { damageMul: 0.75 }, mechanics: { twin: { look: 'nub' } },
  },
  prism: {
    name: 'PRISM', desc: 'Glass wax. Bends the light into a blade.',
    special: 'HOLD TO CHARGE A PIERCING BEAM OF LIGHT.',
    health: { hearts: 2, ash: 2 }, stats: { fireRate: -0.3 }, shot: { weapon: 'beam', style: 'violet' },
  },
  motley: {
    name: 'MOTLEY', desc: 'Melted down from leftovers. Never the same twice.',
    special: 'RANDOM HEALTH, STATS, ITEMS AND COLORS EVERY RUN.',
    health: { hearts: 2 }, mechanics: { random: {} },
  },
  sexton: {
    name: 'SEXTON', desc: 'Digs the graves. Keeps the shovel.',
    special: "CAN'T SHOOT: SWINGS A SHOVEL. RIBCAGE HEARTS.",
    health: { hearts: 0, bones: 2, boneFill: 2, ash: 2, boneOnly: true },
    stats: { speed: -0.1, damage: 0.5 }, shot: { weapon: 'sword', weaponArt: 'shovel' },
  },
  spill: {
    name: 'SPILL', desc: 'Melts everywhere. Apologizes constantly.',
    special: 'LEAVES A TRAIL OF HOT WAX THAT BURNS ENEMIES.',
    health: { hearts: 3 }, stats: { fireRate: -0.4, speed: 0.1 }, mechanics: { trail: {} },
  },
  kiln: {
    name: 'KILN', desc: 'A candle baked in a clay pot.',
    special: 'HEATS UP WHILE SHOOTING: HOTTER HITS HARDER. TOO HOT AND HE ERUPTS.',
    health: { hearts: 3 }, stats: { damage: -0.5 }, mechanics: { heat: {} },
  },
  echo: {
    name: 'ECHO', desc: 'Rings like a bell. Hears things twice.',
    special: 'EVERY SHOT RINGS AGAIN A MOMENT LATER.',
    health: { hearts: 2, ash: 2 }, stats: { damage: -0.4 }, mechanics: { echo: { delay: 0.35, mul: 0.6 } },
  },
  beacon: {
    name: 'BEACON', desc: 'A lighthouse candle. Never lets anyone sit in the dark.',
    special: 'PLANTS LITTLE CANDLES THAT SHOOT FOR HER.',
    health: { hearts: 3 }, stats: { damage: -0.5 }, pocket: 'sparecandle',
  },

  // ================================================================ TWISTED
  wick_t: {
    name: 'WICK, HOLLOW', desc: 'The flame went out inside.',
    special: 'ONLY 6 ITEMS. A NEW ONE PUSHES THE OLDEST OUT.',
    health: { hearts: 3 }, mechanics: { slots: { max: 6 } },
  },
  pip_t: {
    name: 'PIP, LOADED', desc: 'The die is rigged. Against him.',
    special: 'EVERY ITEM FLICKERS BETWEEN TWO CHOICES. GRAB WISELY.',
    health: { hearts: 2, ash: 2 }, stats: { luck: 2 }, mechanics: { flicker: { every: 1.2 } },
  },
  brick_t: {
    name: 'BRICK, CRUMBLED', desc: 'Falling apart, one brick at a time.',
    special: 'CRUMBLES DURING FIGHTS. ENEMIES DROP FADING HEARTS.',
    health: { hearts: 8, red: 12 }, stats: { damage: 2, fireRate: -0.6, speed: -0.25 }, shot: { sizeMul: 1.5 },
    mechanics: { drain: { every: 12, drop: 0.25 } },
  },
  vesper_t: {
    name: 'VESPER, UNSUNG', desc: 'Her hymn went quiet. Something else sings now.',
    special: 'HER HYMNAL COSTS HALF AN ASH HEART AND CALLS WISPS.',
    health: { hearts: 0, ash: 8, soulOnly: true }, stats: { damage: -0.5 }, active: 'blackhymnal',
  },
  cinder_t: {
    name: 'CINDER, SMOTHERED', desc: 'More smoke than candle.',
    special: 'DASHES THROUGH ENEMIES AS SMOKE. TWO MELTED HEARTS.',
    health: { hearts: 0, soot: 4, broken: 2 }, stats: { damage: 1.5, speed: 0.1 }, pocket: 'shadowdash',
  },
  pilfer_t: {
    name: 'PILFER, PAWNED', desc: 'Sold everything. Kept the habit.',
    special: 'ITEMS BREAK INTO PICKUPS WHEN TOUCHED.',
    health: { hearts: 2, golden: 2 }, coins: 15, items: ['rabbitfoot'],
    stats: { luck: 3, speed: 0.2 }, mechanics: { pawn: {} },
  },
  wisp_t: {
    name: 'WISP, FADED', desc: 'Barely there at all.',
    special: 'ONE HIT. NO WINGS. A VEIL YOU HAVE TO EARN.',
    health: { oneHit: true }, shot: { spectral: true, pierce: true, style: 'ghost' },
    stats: { damage: -0.5, speed: 0.2, fireRate: 0.5 }, pocket: 'paleveil',
  },
  morrow_t: {
    name: 'MORROW, TWOFOLD', desc: 'Half alive, half not. Takes turns.',
    special: 'SWAPS BETWEEN DAWN AND DUSK EVERY CLEARED ROOM. EACH HAS ITS OWN HEARTS.',
    health: { hearts: 3 },
    mechanics: {
      forms: {
        dawn: { name: 'DAWN', look: 'morrow_t', stats: { fireRate: 0.8, damage: -0.6, speed: 0.1 } },
        dusk: { name: 'DUSK', look: 'morrow_t2', stats: { damage: 1.5, fireRate: -0.5 }, flying: true, health: { hearts: 1, soot: 4 } },
      },
    },
  },
  nib_t: {
    name: 'NIB, ALONE', desc: 'Nub went somewhere dark. Now Nub is the dark.',
    special: 'THE SHADOW OF NUB HUNTS YOU, AND ANYTHING IN ITS WAY.',
    health: { hearts: 3 }, stats: { damage: 0.5 }, mechanics: { stalker: {} },
  },
  prism_t: {
    name: 'PRISM, SPLINTERED', desc: 'Cracked glass. Light leaks out of everything.',
    special: 'A STEADY BEAM WHILE YOU HOLD SHOOT. SLOWER WHILE FIRING.',
    health: { hearts: 2, ash: 2 }, shot: { weapon: ['laser', 'steady'], style: 'charm' },
  },
  motley_t: {
    name: 'MOTLEY, UNSTITCHED', desc: 'The seams are coming loose.',
    special: 'EVERYTHING REROLLS EVERY TIME YOU GET HIT.',
    health: { hearts: 3 }, mechanics: { random: {}, rerollOnHit: {} },
  },
  sexton_t: {
    name: 'SEXTON, UNEARTHED', desc: 'Dug up again. Throws the shovel now.',
    special: 'THE SHOVEL FLIES OUT AND COMES BACK. WAIT FOR IT.',
    health: { hearts: 0, bones: 3, boneFill: 1, boneOnly: true }, stats: { speed: 0.05 }, shot: { weapon: 'knife', weaponArt: 'shovel' },
  },
  spill_t: {
    name: 'SPILL, FLOODED', desc: 'Melted all the way into the water.',
    special: 'SLIPPERY FEET. EVERY SHOT SPLASHES HOT WAX.',
    health: { hearts: 3, rotten: 2 }, mechanics: { slippery: {}, splash: {} },
  },
  kiln_t: {
    name: 'KILN, CRACKED', desc: 'The pot is cracked and the fire wants out.',
    special: 'HEAT RISES ON ITS OWN. SHOOT TO VENT IT OR ERUPT.',
    health: { hearts: 3 }, mechanics: { heat: { inverse: true } },
  },
  echo_t: {
    name: 'ECHO, ASTRAY', desc: 'Its echo stopped following orders.',
    special: 'YOUR ECHO WALKS BEHIND YOU AND SHOOTS. IF IT GETS HIT, SO DO YOU.',
    health: { hearts: 2, ash: 2 }, mechanics: { ghost: { delay: 1.1 } },
  },
  beacon_t: {
    name: 'BEACON, DIMMED', desc: 'The light is out. Only the little candles are left.',
    special: "CAN'T SHOOT. PLANTS CANDLES ON A TIMER.",
    health: { hearts: 3 }, pocket: 'tallowstub', mechanics: { noShoot: {} },
  },
};

// The select screen order. Twisted versions are `<id>_t`.
export const CHARACTER_ORDER = [
  'wick', 'pip', 'brick', 'vesper', 'cinder', 'pilfer', 'wisp', 'morrow',
  'nib', 'prism', 'motley', 'sexton', 'spill', 'kiln', 'echo', 'beacon',
];
export const twistedOf = (id) => `${id}_t`;

export const DEFAULT_CHARACTER = 'wick';
