// All bosses. Tuning lives here; behavior and art are in src/game/bosses/.
//
// Fields:
//   name      shown on the intro card and health bar
//   hp        health on floor 1 (deeper floors multiply it, see src/data/floors.js)
//   radius    hit circle
//   contact   half hearts dealt on touch
//   flying    crosses pits, only walls stop it
//   phases    health fractions where a new phase starts (e.g. [0.5] = phase 2 at half)
//   attacks   per phase: [[attackName, weight], ...]
//   cooldown  per phase: [min, max] seconds between attacks
//   speed     per phase: drift speed between attacks
//   style     enemy shot look

// ---------------------------------------------------------------- The Old Boiler sprite
const g = [
  '.bbbbb.',
  'beeeenb',
  'beeeneb',
  'beekeeb',
  'beeeeeb',
  '.bbbbb.',
].map((r) => r.replace(/\./g, 'I'));
const plain = 'Jj' + 'I'.repeat(20) + 'iiii';
const mouth = [
  'kkkkkkkkkkkkkk',
  'kfkFkykykFkfkk',
  'kFkykykykykFkk',
  'kykykykykykykk',
  'kFkykykykykFkk',
  'kfkFkFkFkFkfkk',
  'kkkkkkkkkkkkkk',
];
const body = (inner) => '....k' + inner + 'k....';
export const BOILER_ROWS = [
  '..............kkkkkkkk..............',
  '..............kjJJjjik..............',
  '...............kIjjIk...............',
  '...............kIjjIk...............',
  '...............kIjjrk...............',
  '.......kkkkkkkkkkkkkkkkkkkkkk.......',
  '.....kk' + 'jJJjjj' + 'I'.repeat(13) + 'jjj' + 'kk.....',
  body(plain),
  ...g.map((row) => body('Jj' + row + 'I'.repeat(13) + 'iiii')),
  body(plain),
  body('j' + 'i'.repeat(25)),
  body('J' + 'jIIjIIjIIjIIjIIjIIjIIjII' + 'i'),
  body(plain),
  body(plain),
  ...mouth.map((m) => body('Jj' + 'IIII' + m + 'II' + 'iiii')),
  body(plain),
  body('R' + 'r'.repeat(25)),
  '.....kk' + 'r'.repeat(22) + 'kk.....',
  '......kIIk..kIIk....kIIk..kIIk......',
  '......kkkk..kkkk....kkkk..kkkk......',
];
export const BOILER_COLORS = {
  k: '#160f0c', i: '#2a2a30', I: '#44444e', j: '#6a6a74', J: '#9a9aa4',
  r: '#6a3420', R: '#8a4a2a', f: '#f08a24', F: '#ffd25a', y: '#fff3c0',
  b: '#b08a30', e: '#e8e0c8', n: '#c0262c',
};

// ---------------------------------------------------------------- tuning
//   chapter   which chapter's pool the boss belongs to (informational; pools are below)
//   static    never moves
//   variants  only appears on floors of these variants (a boss that belongs to one place)
export const BOSSES = {
  // ============ Chapter 1-3: learnable bosses. Single phase that speeds up at low health.
  lump: {
    name: 'THE SOGGY LUMP', chapter: 1,
    hp: 170, radius: 15, contact: 1, style: 'blood',
    phases: [0.35],
    speed: [0, 0],
    cooldown: [[1.3, 2.0], [0.9, 1.4]],
    attacks: [
      [['hops', 3], ['slam', 2], ['spit', 2]],
      [['hops', 2], ['slam', 3], ['spit', 2]],
    ],
  },
  weaver: {
    name: 'THE WEAVER', chapter: 1,
    hp: 180, radius: 14, contact: 1, style: 'ghost',
    phases: [0.4],
    speed: [26, 34],
    cooldown: [[1.2, 1.9], [0.9, 1.4]],
    attacks: [
      [['lunge', 3], ['brood', 1], ['web', 2]],
      [['lunge', 3], ['brood', 1], ['web', 2]],
    ],
  },
  hive: {
    name: 'THE HIVE BELLY', chapter: 1,
    hp: 160, radius: 15, contact: 1, style: 'dust', flying: true,
    phases: [0.4],
    speed: [14, 18],
    cooldown: [[1.4, 2.0], [1.0, 1.6]],
    attacks: [
      [['swarm', 2], ['launch', 2], ['burp', 2]],
      [['swarm', 2], ['launch', 3], ['burp', 2]],
    ],
  },
  grubs: {
    name: 'THE TWIN GRUBS', chapter: 1,
    hp: 150, radius: 9, contact: 1, style: 'blood',
    phases: [0.5],
    speed: [0, 0],
    cooldown: [[0.4, 0.8], [0.4, 0.7]],
    attacks: [
      [['pop', 1]],
      [['pop', 1], ['both', 2]],
    ],
  },
  dollhead: {
    name: "THE DOLL'S HEAD", chapter: 1,
    hp: 190, radius: 15, contact: 1, style: 'blood',
    phases: [0.4],
    speed: [0, 0],
    cooldown: [[1.2, 1.8], [0.9, 1.4]],
    attacks: [
      [['roll', 3], ['cry', 2], ['stare', 1]],
      [['roll', 3], ['cry', 2], ['stare', 1]],
    ],
  },
  gurgler: {
    name: 'THE GURGLER', chapter: 1,
    hp: 190, radius: 16, contact: 1, style: 'green', static: true,
    phases: [0.4],
    speed: [0, 0],
    cooldown: [[1.3, 2.0], [1.0, 1.5]],
    attacks: [
      [['inhale', 2], ['spit', 2], ['exhale', 2]],
      [['inhale', 2], ['spit', 2], ['exhale', 2]],
    ],
  },

  // The Tallow Pyre: fits The Smolder (it shows up there far more often). Phase 2 at 40%.
  pyre: {
    name: 'THE TALLOW PYRE', chapter: 1, variants: ['smolder'],
    hp: 200, radius: 17, contact: 1, style: 'ember',
    phases: [0.4],
    speed: [12, 16],
    cooldown: [[1.3, 2.0], [0.9, 1.4]],
    attacks: [
      [['fireline', 3], ['spit', 2], ['leap', 2], ['kindle', 1]],
      [['fireline', 3], ['spit', 2], ['leap', 2], ['kindle', 1], ['eruption', 2]],
    ],
  },

  // ============ Chapter 2: the caves. Two bosses fit each variant (they show up there more often).
  grottomaw: {
    name: 'THE GROTTO MAW', chapter: 2,
    hp: 180, radius: 17, contact: 1, style: 'dust',
    phases: [0.45],
    speed: [10, 14],
    cooldown: [[1.2, 1.9], [0.9, 1.4]],
    attacks: [
      [['burrow', 3], ['gnash', 2], ['quake', 2]],
      [['burrow', 2], ['gnash', 2], ['quake', 2], ['roll', 3]],
    ],
  },
  shriekmother: {
    name: 'THE SHRIEKING MOTHER', chapter: 2,
    hp: 165, radius: 15, contact: 1, style: 'ghost', flying: true,
    phases: [0.45],
    speed: [46, 56],
    cooldown: [[1.1, 1.7], [0.8, 1.3]],
    attacks: [
      [['shriek', 3], ['dive', 3], ['roost', 1]],
      [['shriek', 2], ['dive', 3], ['roost', 1], ['echo', 3]],
    ],
  },
  gravedigger: {
    name: 'THE GRAVEDIGGER', chapter: 2,
    hp: 175, radius: 15, contact: 1, style: 'bone',
    phases: [0.45],
    speed: [26, 34],
    cooldown: [[1.1, 1.8], [0.8, 1.3]],
    attacks: [
      [['fling', 3], ['cleave', 3], ['graves', 1], ['leap', 2]],
      [['fling', 2], ['cleave', 3], ['graves', 1], ['leap', 2], ['bury', 3]],
    ],
  },
  bonechoir: {
    name: 'THE BONE CHOIR', chapter: 2,
    hp: 170, radius: 26, contact: 1, style: 'ghost', flying: true,
    phases: [0.45],
    speed: [18, 24],
    cooldown: [[1.1, 1.7], [0.8, 1.3]],
    attacks: [
      [['harmony', 3], ['chorus', 3], ['scatter', 2]],
      [['harmony', 2], ['chorus', 3], ['scatter', 2], ['wail', 3]],
    ],
  },
  drowner: {
    name: 'THE BLOATED DROWNER', chapter: 2,
    hp: 190, radius: 18, contact: 1, style: 'ice',
    phases: [0.45],
    speed: [12, 16],
    cooldown: [[1.2, 1.9], [0.9, 1.4]],
    attacks: [
      [['gush', 3], ['burst', 2], ['retch', 1], ['flop', 2]],
      [['gush', 3], ['burst', 3], ['retch', 1], ['flop', 2]],
    ],
  },
  angler: {
    name: 'THE DEEP ANGLER', chapter: 2,
    hp: 175, radius: 17, contact: 1, style: 'ice',
    phases: [0.45],
    speed: [18, 24],
    cooldown: [[1.1, 1.8], [0.8, 1.3]],
    attacks: [
      [['lure', 3], ['lunge', 3], ['submerge', 2]],
      [['lure', 2], ['lunge', 3], ['submerge', 2], ['gulp', 3]],
    ],
  },

  // ============ Chapter 3: the depths. Two fit each variant; the second floor always has The Chandler.
  warden: {
    name: 'THE CHAINED WARDEN', chapter: 3,
    hp: 185, radius: 17, contact: 1, style: 'dust',
    phases: [0.45],
    speed: [16, 22],
    cooldown: [[1.2, 1.9], [0.9, 1.4]],
    attacks: [
      [['sweep', 3], ['hurl', 3], ['pound', 2]],
      [['sweep', 2], ['hurl', 3], ['pound', 2], ['charge', 3]],
    ],
  },
  gargoyles: {
    name: 'THE TWIN GARGOYLES', chapter: 3,
    hp: 180, radius: 13, contact: 1, style: 'ember', flying: true,
    phases: [0.45],
    speed: [44, 54],
    cooldown: [[1.0, 1.6], [0.7, 1.2]],
    attacks: [
      [['swoop', 3], ['spit', 3], ['swap', 2]],
      [['swoop', 3], ['spit', 2], ['swap', 2], ['both', 3]],
    ],
  },
  shroudking: {
    name: 'THE SHROUDED KING', chapter: 3,
    hp: 190, radius: 15, contact: 1, style: 'violet',
    phases: [0.45],
    speed: [14, 18],
    cooldown: [[1.2, 1.8], [0.9, 1.3]],
    attacks: [
      [['lash', 3], ['raise', 1], ['curse', 3]],
      [['lash', 3], ['raise', 1], ['curse', 2], ['unwind', 3]],
    ],
  },
  saint: {
    name: 'THE CANDLE SAINT', chapter: 3,
    hp: 180, radius: 13, contact: 1, style: 'violet',
    phases: [0.45],
    speed: [0, 0],
    cooldown: [[1.1, 1.7], [0.8, 1.3]],
    attacks: [
      [['halo', 3], ['vanish', 2], ['weep', 3]],
      [['halo', 3], ['vanish', 2], ['weep', 2], ['melt', 3]],
    ],
  },
  blighttoad: {
    name: 'THE BLIGHTED TOAD', chapter: 3,
    hp: 195, radius: 20, contact: 1, style: 'green',
    phases: [0.45],
    speed: [10, 14],
    cooldown: [[1.2, 1.9], [0.9, 1.4]],
    attacks: [
      [['leap', 3], ['tongue', 3], ['belch', 2], ['spawn', 1]],
      [['leap', 2], ['tongue', 3], ['belch', 2], ['spawn', 1], ['hops', 3]],
    ],
  },
  muckknot: {
    name: 'THE MUCK KNOT', chapter: 3,
    hp: 190, radius: 18, contact: 1, style: 'tar', static: true,
    phases: [0.45],
    speed: [0, 0],
    cooldown: [[1.0, 1.6], [0.8, 1.2]],
    attacks: [
      [['grasp', 3], ['spew', 2], ['lash', 3]],
      [['grasp', 3], ['spew', 2], ['lash', 2], ['flood', 3]],
    ],
  },
  // The Chandler: the giant on chapter 3's second floor (only her there). Hands, arm and eye.
  chandler: {
    name: 'THE CHANDLER', chapter: 3, giant: true,
    hp: 270, radius: 20, contact: 2, style: 'ember', static: true,
    phases: [0.5],
    speed: [0, 0],
    cooldown: [[0.9, 1.4], [0.6, 1.0]],
    attacks: [
      [['hand', 4], ['eye', 3], ['arm', 3], ['pour', 2], ['call', 1]],
      [['hands', 4], ['hand', 1], ['eye', 3], ['arm', 3], ['pour', 2], ['call', 1]],
    ],
  },

  // ============ The Tallow Heart: the giant on chapter 4's second floor (only it there).
  tallowheart: {
    name: 'THE TALLOW HEART', chapter: 4, giant: true,
    hp: 1100, radius: 24, contact: 2, style: 'blood', static: true,
    phases: [0.6, 0.3],
    speed: [0, 0, 0],
    cooldown: [[1.0, 1.5], [0.7, 1.1], [0.5, 0.9]],
    attacks: [
      [['beat', 3], ['veins', 3], ['bleed', 2], ['clots', 1], ['harden', 1]],
      [['beat', 3], ['veins', 3], ['bleed', 2], ['clots', 1], ['harden', 2]],
      [['beat', 2], ['veins', 3], ['bleed', 2], ['clots', 1], ['harden', 1], ['frenzy', 3]],
    ],
  },

  // ============ The statues of The Vigil (bomb one to wake it). Never in a boss pool.
  sentinel1: {
    name: 'THE PALE SENTINEL', chapter: 0, look: 'pale', drops: 'keyhalf1',
    hp: 160, radius: 13, contact: 1, style: 'ghost', flying: true,
    phases: [0.5],
    speed: [24, 30],
    cooldown: [[1.1, 1.6], [0.8, 1.2]],
    attacks: [
      [['beam', 3], ['feathers', 3], ['halo', 2], ['glide', 2]],
      [['beam', 3], ['feathers', 2], ['halo', 3], ['glide', 2]],
    ],
  },
  sentinel2: {
    name: 'THE GILDED SENTINEL', chapter: 0, look: 'gilded', drops: 'keyhalf2',
    hp: 180, radius: 13, contact: 1, style: 'spark', flying: true,
    phases: [0.5],
    speed: [28, 34],
    cooldown: [[1.0, 1.5], [0.7, 1.1]],
    attacks: [
      [['beam', 3], ['feathers', 3], ['halo', 2], ['glide', 2]],
      [['beam', 4], ['feathers', 2], ['halo', 3], ['glide', 2]],
    ],
  },

  // ============ Chapter 4: the heavyweights, tuned for a full late-game build.
  boiler: {
    name: 'THE OLD BOILER', chapter: 4,
    hp: 700, radius: 15, contact: 2, style: 'blood',
    phases: [0.5],
    speed: [16, 24],
    cooldown: [[1.1, 1.8], [0.6, 1.1]],
    attacks: [
      [['ring', 2], ['lob', 2], ['charge', 2]],
      [['ring', 2], ['lob', 2], ['charge', 2], ['spiral', 2], ['summon', 1]],
    ],
  },
  mildew: {
    name: 'MOTHER MILDEW', chapter: 4,
    hp: 740, radius: 17, contact: 2, style: 'green',
    phases: [0.5],
    speed: [14, 20],
    cooldown: [[1.0, 1.6], [0.6, 1.0]],
    attacks: [
      [['leap', 3], ['spores', 2], ['birth', 1]],
      [['leap', 3], ['spores', 2], ['birth', 1], ['sporeRing', 2]],
    ],
  },
  moth: {
    name: 'THE MOTH QUEEN', chapter: 4,
    hp: 620, radius: 14, contact: 2, style: 'dust', flying: true,
    phases: [0.5],
    speed: [40, 55],
    cooldown: [[0.9, 1.5], [0.5, 0.9]],
    attacks: [
      [['dust', 2], ['dive', 2], ['swarm', 1]],
      [['dust', 2], ['dive', 3], ['swarm', 1], ['spiral', 2]],
    ],
  },
  ratking: {
    name: 'THE RAT KING', chapter: 4,
    hp: 780, radius: 16, contact: 2, style: 'blood',
    phases: [0.5],
    speed: [22, 30],
    cooldown: [[1.0, 1.6], [0.5, 1.0]],
    attacks: [
      [['charge', 3], ['whip', 2], ['pups', 1]],
      [['charge', 3], ['whip', 2], ['pups', 1], ['squeal', 2]],
    ],
  },

  // The final boss: three phases, the last one puts out the lights.
  snuffer: {
    name: 'THE SNUFFER', chapter: 4,
    hp: 1500, radius: 18, contact: 2, style: 'violet', flying: true,
    phases: [0.66, 0.33],
    speed: [18, 24, 30],
    cooldown: [[1.0, 1.5], [0.7, 1.2], [0.5, 0.9]],
    attacks: [
      [['slam', 2], ['hands', 2], ['waxRain', 2], ['rings', 1]],
      [['slam', 2], ['hands', 2], ['waxRain', 2], ['rings', 2], ['summon', 1]],
      [['slam', 2], ['hands', 2], ['waxRain', 1], ['rings', 2], ['spiral', 3]],
    ],
    darkness: 3, // phase where the room goes dark
  },
};

// Which bosses can appear in each chapter. A run never repeats a boss while others remain.
const EARLY = ['lump', 'weaver', 'hive', 'grubs', 'dollhead', 'gurgler'];
export const BOSS_POOLS = {
  1: [...EARLY, 'pyre'],
  2: ['grottomaw', 'shriekmother', 'gravedigger', 'bonechoir', 'drowner', 'angler'],
  3: ['warden', 'gargoyles', 'shroudking', 'saint', 'blighttoad', 'muckknot'],
  4: ['boiler', 'mildew', 'moth', 'ratking'],
};
// The last floor always ends with this one.
export const FINAL_BOSS = 'snuffer';

// Boss champions: from floor 3 a floor's boss (never a giant or the final boss) is sometimes a
// champion: tinted, renamed ("THE CRIMSON WEAVER") and tougher in one way. They drop extra loot.
//   hpMul        more health          cooldownMul  attacks come faster   speedMul  moves faster
//   attackRing   a ring of this many shots after every attack
//   deathRing    a ring of this many shots when it dies
export const BOSS_CHAMPIONS = {
  crimson: { name: 'CRIMSON', color: '#ff3a2a', hpMul: 1.4 },
  swift: { name: 'SWIFT', color: '#ffd25a', hpMul: 1.1, cooldownMul: 0.65, speedMul: 1.3 },
  hollow: { name: 'HOLLOW', color: '#9a6ad8', hpMul: 1.15, attackRing: 6, deathRing: 14 },
};
