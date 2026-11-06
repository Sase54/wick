// Every special room type beyond the basics (treasure, shop, boss, secret), all in one place:
//
//   name     shown on a banner the first time you walk in
//   door     door kind (src/game/door.js): its look and what it takes to open
//   lock     'key' | 'coin' | 'health' (full health only) | 'bomb' (hidden wall)
//   icon     minimap icon (rows of a tiny sprite) and its colors
//   tint     floor tint for the room
//   chance   chance per floor to try to add one (the generator adds it as a dead end if
//            there's room); minFloor / maxFloor / chapters limit where it can show up;
//            unlock: achievement needed first (src/data/unlocks.js)
//   layout   the room (13x7). Extra letters, on top of src/data/rooms.js:
//            P item pedestal (the room's pool)  Q priced item (deal rooms, black market)
//            Y sacrifice spike  D dice face  M machine (in order: slot, blood, fortune, beggar)
//            C chest  L locked chest  N bed  R statue  m miniboss  G pickup
//
// What's inside each room is filled in by src/game/specials.js.

export const SPECIAL_TYPES = {
  supersecret: {
    name: 'THE NOOK', door: 'secret', lock: 'bomb', tint: '#14243a',
    icon: ['.##.', '#..#', '..#.', '..#.'], colors: { '#': '#c8d8ff' },
    layout: ['.............', '..#.......#..', '.............', '.....G.P.G...', '.............', '..#.......#..', '.............'],
  },
  ultrasecret: {
    name: 'THE UNDERNEATH', door: 'red', tint: '#3a0808',
    icon: ['#...#', '.#.#.', '.#.#.', '#...#'], colors: { '#': '#ff4a3a' },
    layout: ['.............', '.^.........^.', '.............', '....P...P....', '.............', '.^.........^.', '.............'],
  },
  red: {
    name: null, door: 'red', tint: '#4a0c0c',
    icon: null,
  },
  curse: {
    name: 'THE THORNED ROOM', door: 'curse', tint: '#2a0a2a', chance: 0.45, minFloor: 2,
    look: { wall: ['#0a0204', '#1a060a', '#2a0a10', '#3a1016', '#4e1a20'], mortar: '#050102' },
    icon: ['#.#.#', '.###.', '.###.', '#.#.#'], colors: { '#': '#b04ab0' },
    layout: ['.............', '.^^.......^^.', '.^.........^.', '......P......', '.^.........^.', '.^^.......^^.', '.............'],
  },
  sacrifice: {
    name: 'THE OFFERING ROOM', door: 'sacrifice', tint: '#3a1010', chance: 0.25, minFloor: 2,
    icon: ['..#..', '..#..', '.###.', '#####'], colors: { '#': '#e8e0d0' },
    layout: ['.............', '.#.........#.', '.............', '......Y......', '.............', '.#.........#.', '.............'],
  },
  arcade: {
    name: 'THE PARLOR', door: 'arcade', lock: 'coin', tint: '#3a2a10', chance: 0.4, evenFloors: true,
    icon: ['#####', '#k#k#', '#k#k#', '#####'], colors: { '#': '#f0c040', k: '#5a2010' },
    layout: ['.............', '..M..M..M..M.', '.............', '.............', '.............', '.............', '.............'],
  },
  challenge: {
    name: 'THE GAUNTLET', door: 'challenge', lock: 'health', tint: '#2a2a30', chance: 0.3, minFloor: 1,
    icon: ['#...#', '.#.#.', '.#.#.', '#...#'], colors: { '#': '#d8d8e8' },
    layout: ['.............', '.#.........#.', '.............', '......P......', '.............', '.#.........#.', '.............'],
  },
  bosschallenge: {
    name: 'THE GREAT GAUNTLET', door: 'bosschallenge', lock: 'health', tint: '#3a1418', chance: 0.25, minFloor: 3,
    icon: ['#...#', '.###.', '.###.', '#...#'], colors: { '#': '#ff6a5a' },
    layout: ['.............', '.............', '.............', '......P......', '.............', '.............', '.............'],
  },
  library: {
    name: 'THE READING ROOM', door: 'library', lock: 'key', tint: '#3a2814', chance: 0.2, minFloor: 2,
    icon: ['####.', '#kk#.', '#kk#.', '####.'], colors: { '#': '#d8a868', k: '#5a3418' },
    layout: ['.............', '.XX.......XX.', '.............', '....P...P....', '.............', '.XX.......XX.', '.............'],
  },
  vault: {
    name: 'THE STRONGROOM', door: 'vault', lock: 'key', tint: '#2a2620', chance: 0.2, minFloor: 2,
    icon: ['#####', '#kkk#', '##k##', '#####'], colors: { '#': '#c8a048', k: '#3a2a10' },
    layout: ['.............', '.............', '...C.L.L.C...', '.............', '...C.....C...', '.............', '.............'],
  },
  dice: {
    name: "THE GAMBLER'S DEN", door: 'dice', lock: 'key', tint: '#14301c', chance: 0.15, minFloor: 2,
    icon: ['#####', '#k#k#', '##k##', '#####'], colors: { '#': '#f0f0e8', k: '#1a3a1a' },
    layout: ['.............', '.............', '.............', '......D......', '.............', '.............', '.............'],
  },
  nursery: {
    name: 'THE NURSERY', door: 'bedroom', tint: '#3a2a30', chance: 0.12, minFloor: 3,
    icon: ['#....', '#####', '#####', '#...#'], colors: { '#': '#e8b8c8' },
    layout: ['.............', '.............', '.....N.......', '.............', '...G.....G...', '.............', '.............'],
  },
  sickroom: {
    name: 'THE SICKROOM', door: 'bedroom', tint: '#24281a', chance: 0.12, minFloor: 3,
    icon: ['#....', '#####', '#####', '#...#'], colors: { '#': '#8a9a5a' },
    layout: ['.............', '.u.........u.', '.....N.......', '.............', '...G.....G...', '.u.........u.', '.............'],
  },
  miniboss: {
    name: 'THE LAIR', door: 'miniboss', tint: '#2a1414', chance: 0.3, minFloor: 2,
    icon: ['.###.', '#k#k#', '.###.', '.#.#.'], colors: { '#': '#d0c0b0', k: '#3a0c0c' },
    layout: ['.............', '.#.........#.', '.............', '......m......', '.............', '.#.........#.', '.............'],
  },
  planetarium: {
    name: 'THE ORRERY', door: 'planetarium', lock: 'key', tint: '#0c0c2a', minFloor: 2, maxFloor: 6,
    icon: ['.#.#.', '#####', '.###.', '..#..'], colors: { '#': '#a0b8ff' },
    layout: ['.............', '.............', '.............', '...P..P..P...', '.............', '.............', '.............'],
  },
  // reached from inside a crawlspace (not on the map grid)
  blackmarket: {
    name: 'THE BACK ROOM', tint: '#1a1414',
    icon: null,
    layout: ['.............', '......K......', '.............', '.Q..Q..Q..Q..', '.............', '.............', '.............'],
  },
  // rare: you leave a room the wrong way and end up here
  error: {
    name: 'MISPRINT', door: 'error', tint: '#202020',
    icon: ['#.#.#', '.#.#.', '#.#.#', '.#.#.'], colors: { '#': '#ff40ff' },
    look: {
      floor: ['#101014', '#1a1a20', '#26262e', '#ff40ff', '#40ffff'], wall: ['#000000', '#101010', '#202020', '#303030', '#ff40ff'],
      mortar: '#40ffff', stain: '#ff40ff', floorPattern: 'ossuary', wallPattern: 'blocks', wallProps: [], floorProps: [], cobwebs: 0, stains: [6, 9],
    },
    layout: ['.............', '.............', '.............', '....P...P....', '.............', '.............', '.............'],
  },
  // deal rooms: a door appears in the boss room after the floor's boss. They look the same on
  // every floor (their `look` replaces the variant's tiles).
  devil: {
    name: 'THE BARGAIN', door: 'devil', tint: '#2a0404',
    icon: ['#...#', '##.##', '.#k#.', '..#..'], colors: { '#': '#c02020', k: '#000000' },
    look: {
      floor: ['#0a0404', '#140606', '#1e0a0a', '#2a0e0e', '#381414'], wall: ['#000000', '#0a0404', '#140808', '#200c0c', '#2e1212'],
      mortar: '#000000', stain: '#3a0606', rock: ['#0a0606', '#1a0c0c', '#2a1414', '#3a1c1c', '#4a2626'], rockMoss: false,
      floorPattern: 'slab', wallPattern: 'blocks', wallProps: ['oozestreak', 'soot', 'chain'], floorProps: ['scorch', 'bones'],
      stains: [3, 6], stainMildew: 0.6, cobwebs: 0.3, pot: 'jar',
    },
    layout: ['.............', '.R.........R.', '.............', '...Q..Q..Q...', '.............', '.............', '.............'],
  },
  angel: {
    name: 'THE VIGIL', door: 'angel', tint: '#3a3a44',
    icon: ['#.#.#', '.###.', '..#..', '.#.#.'], colors: { '#': '#f0f0ff' },
    look: {
      floor: ['#5a5a64', '#6e6e7a', '#82828e', '#9696a2', '#acacb8'], wall: ['#2a2a32', '#3e3e48', '#54545e', '#6a6a76', '#82828e'],
      mortar: '#22222a', stain: '#c8c8d4', rock: ['#3a3a44', '#5a5a66', '#7a7a88', '#9a9aa8', '#c0c0cc'], rockMoss: false,
      floorPattern: 'marble', wallPattern: 'marble', wallProps: ['statue', 'statue'], floorProps: ['petals'],
      stains: [1, 3], stainMildew: 0.2, cobwebs: 0.6, pot: 'jar',
    },
    layout: ['.............', '.R.........R.', '.............', '....P...P....', '.............', '.............', '.............'],
  },
  // after The Chandler, if she fell quickly enough
  bossrush: {
    name: 'THE PROCESSION', door: 'bossrush', tint: '#4a3a10',
    icon: ['#.#.#', '#####', '#k#k#', '#####'], colors: { '#': '#f0c040', k: '#5a2010' },
    look: {
      floor: ['#1a1408', '#2a200c', '#3a2c12', '#4a3818', '#5c4620'], wall: ['#0a0804', '#1a1408', '#2a200c', '#3a2c12', '#6a5020'],
      mortar: '#050402', stain: '#6a1010', floorPattern: 'slab', wallPattern: 'blocks', wallProps: ['brazier', 'banner', 'brazier'], floorProps: [],
    },
    layout: ['.............', '.............', '.............', '.............', '.............', '.............', '.............'],
  },
};

// Sacrifice room payouts, by how many times you've bled on the spike this floor:
// { chance, give } where give is a reward id (src/game/specials.js REWARDS).
export const SACRIFICE_TABLE = [
  null,
  { chance: 0.5, give: 'coins2' },        // 1
  { chance: 0.5, give: 'key' },           // 2
  { chance: 0.66, give: 'ash' },          // 3
  { chance: 0.5, give: 'chest' },         // 4
  { chance: 0.33, give: 'angelItem' },    // 5
  { chance: 0.5, give: 'coins3bomb' },    // 6
  { chance: 0.33, give: 'angelItem' },    // 7
  { chance: 0.5, give: 'brass' },         // 8
  { chance: 1, give: 'lair' },            // 9: something wakes up
  { chance: 0.5, give: 'devilItem' },     // 10
];

// The six faces of the gambler's die (stepping on it rolls the effect once).
export const DICE_FACES = {
  1: { name: 'ONE', desc: 'YOUR ITEMS CHANGE' },
  2: { name: 'TWO', desc: 'THE PICKUPS HERE CHANGE' },
  3: { name: 'THREE', desc: 'A HANDFUL OF PICKUPS' },
  4: { name: 'FOUR', desc: 'YOUR ITEMS CHANGE, YOU GROW STRONGER' },
  5: { name: 'FIVE', desc: 'THE FLOOR REARRANGES ITSELF' },
  6: { name: 'SIX', desc: 'A GIFT' },
};

// Placeholder machines for The Parlor (the real ones arrive in part 5).
export const MACHINES = ['slot', 'blood', 'fortune', 'beggar'];
