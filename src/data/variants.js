// Chapters and their floor variants. Every floor of a chapter picks one variant at random
// (from the ones that are ready and unlocked). A variant is its own place, not a recolor:
//
//   name        floor title ("THE UNDERCROFT I")
//   look        tileset for src/game/roomart.js: floor/wall/rock colors and patterns,
//               breakable obstacle (pot), wall props and floor props
//   light       ambient light: { dark: 0..1 overlay darkness, tint: css color laid over the room }
//   particles   ambient particles (src/game/ambience.js): dust | drips | embers | fog | spores...
//   music       track in src/engine/music.js, transpose in semitones
//   hazards     variant hazards placed in rooms (src/game/hazards.js)
//   exclusive   enemies that only live here (listed in DESIGN.md)
//   groups      enemy room templates: each room picks one group, then fills its spawn markers
//               from the matching list (e = walker, f = flyer, s = stationary). A list entry is
//               [enemy id, weight] or [enemy id, weight, group size].
//   minibosses  minibosses that can take over a room of this variant
//   bossBias    { boss id: weight multiplier } bosses that fit this variant show up more often
//   potSpawn    { type, chance } an enemy that sometimes hides in its breakables
//   rooms       room layouts (src/data/rooms/), special: special room layouts
//   ready       false = still being built (only reachable with the debug floor picker)
//   unlock      achievement that unlocks it (informational; the lock itself is in src/data/unlocks.js)
import { CHAPTER1_ROOMS } from './rooms/chapter1.js';
import { CHAPTER2_ROOMS } from './rooms/chapter2.js';
import { CHAPTER3_ROOMS } from './rooms/chapter3.js';
import { CHAPTER4_ROOMS } from './rooms/chapter4.js';
import { NORMAL_ROOMS, SPECIAL_ROOMS, ROOM_STYLES } from './rooms.js';

const LEGACY_GROUPS = [
  { weight: 3, e: [['blob', 3], ['ratram', 2], ['toad', 2], ['sludge', 1.5], ['mite', 1, 2], ['husk', 1]], f: [['moth', 3, 2], ['draft', 2]], s: [['eye', 3], ['sac', 2], ['husk', 1]] },
];

// ---------------------------------------------------------------------------------- chapter 1
const UNDERCROFT = {
  id: 'undercroft', chapter: 1, name: 'THE UNDERCROFT', ready: true,
  blurb: 'Old storage vaults: barrels, rat holes, candle alcoves and dust.',
  look: {
    id: 'undercroft',
    floor: ['#1c1510', '#241b14', '#2d2219', '#372a1f', '#433326'],
    wall: ['#0f0b09', '#1c1511', '#2a1f18', '#382a20', '#4a382a'],
    mortar: '#0b0806', stain: '#2a2a18',
    rock: ['#1c1815', '#2e2823', '#433b33', '#5a5045', '#73685a'],
    floorPattern: 'flagstone', wallPattern: 'brick', pot: 'barrel',
    stains: [2, 5], stainMildew: 0.25, cracks: [2, 5], pebbles: [8, 18], cobwebs: 0.55,
    wallProps: ['sconce', 'sconce', 'shelf', 'pipe', 'chain'],
    floorProps: ['straw', 'board', 'grate'],
  },
  light: { dark: 0.12, tint: 'rgba(60,30,10,0.10)' },
  particles: 'dust',
  music: 'undercroft', transpose: 0,
  hazards: [{ type: 'rathole', chance: 0.35, max: 2 }],
  exclusive: ['pestfly', 'divebuzzer', 'mudworm', 'bristleworm', 'gnawer', 'gawper'],
  groups: [
    { weight: 3, e: [['gawper', 3], ['blob', 1]], f: [['pestfly', 3, 2]], s: [['eye', 2]] },
    { weight: 3, e: [['gnawer', 3], ['ratram', 1]], f: [['pestfly', 2, 2]], s: [['sac', 2]] },
    { weight: 2, e: [['bristleworm', 2], ['gawper', 1]], f: [['moth', 2, 2]], s: [['eye', 2]] },
    { weight: 2, e: [['mudworm', 3]], f: [['divebuzzer', 2]], s: [['eye', 1]] },
    { weight: 2, e: [['blob', 3], ['toad', 1]], f: [['moth', 2, 2], ['pestfly', 1, 2]], s: [['eye', 2]] },
    { weight: 2, e: [['ratram', 2], ['gnawer', 1]], f: [['divebuzzer', 2]], s: [['sac', 1]] },
    { weight: 2, e: [['toad', 2], ['gawper', 1]], f: [['pestfly', 2, 2]], s: [['eye', 1], ['sac', 1]] },
    { weight: 1, e: [['mite', 1, 2], ['gnawer', 1]], f: [['divebuzzer', 1], ['moth', 1, 2]], s: [['sac', 3]] },
  ],
  minibosses: ['ratmatron'],
  rooms: CHAPTER1_ROOMS,
};

// The other two chapter-1 variants are built in the next milestones.
const WEEPING = {
  id: 'weeping', chapter: 1, name: 'THE WEEPING HOLLOW', ready: true,
  blurb: 'A damp cellar gone green: moss, roots, webs and spiders, water dripping everywhere.',
  look: {
    id: 'weeping',
    floor: ['#101710', '#162016', '#1d291c', '#253323', '#2e3e2a'],
    wall: ['#0a0e0a', '#141c14', '#1e281c', '#283426', '#344432'],
    mortar: '#070a07', stain: '#3a5a20',
    rock: ['#141a12', '#24301e', '#36442c', '#4a5a3a', '#62744c'],
    floorPattern: 'cobble', wallPattern: 'stone', pot: 'cocoon',
    stains: [4, 8], stainMildew: 0.85, cracks: [1, 3], pebbles: [4, 10], cobwebs: 0.95,
    wallProps: ['roots', 'mossdrape', 'mossdrape', 'glowcap', 'seep', 'roots'],
    floorProps: ['puddle', 'puddle', 'mushrooms', 'oldweb', 'bones'],
  },
  light: { dark: 0.2, tint: 'rgba(20,60,40,0.13)' },
  particles: ['drips', 'spores'],
  music: 'weeping', transpose: 0,
  hazards: [{ type: 'web', chance: 0.65, max: 4 }],
  potSpawn: { type: 'crawlspider', chance: 0.25 },
  exclusive: ['crawlspider', 'bigleg', 'broodnest', 'webspitter', 'mossback', 'mosslurker', 'hanger'],
  groups: [
    { weight: 3, e: [['crawlspider', 3, 2], ['bigleg', 1]], f: [['hanger', 2]], s: [['broodnest', 2]] },
    { weight: 3, e: [['webspitter', 2], ['crawlspider', 2, 2]], f: [['moth', 2, 2]], s: [['broodnest', 1], ['eye', 1]] },
    { weight: 2, e: [['mossback', 2], ['mosslurker', 2]], f: [['hanger', 1]], s: [['eye', 2]] },
    { weight: 2, e: [['bigleg', 2], ['blob', 1]], f: [['hanger', 2]], s: [['sac', 1]] },
    { weight: 2, e: [['mosslurker', 3], ['toad', 1]], f: [['moth', 2, 2]], s: [['eye', 1]] },
    { weight: 2, e: [['mossback', 1], ['webspitter', 2]], f: [['hanger', 1]], s: [['broodnest', 1]] },
    { weight: 1, e: [['ratram', 2], ['crawlspider', 1, 2]], f: [['moth', 2, 2]], s: [['sac', 1]] },
  ],
  minibosses: ['loommother'],
  bossBias: { weaver: 4 },
  rooms: CHAPTER1_ROOMS,
};
const SMOLDER = {
  id: 'smolder', chapter: 1, name: 'THE SMOLDER', ready: true, unlock: 'intoTheFire',
  blurb: 'A cellar that caught fire and never went out: charred boards, torches, embers, fire jets.',
  look: {
    id: 'smolder',
    floor: ['#140c0a', '#1e1210', '#2a1812', '#361f16', '#44281a'],
    wall: ['#0c0706', '#170e0b', '#22140f', '#2e1b14', '#3c241a'],
    mortar: '#060302', stain: '#3a1408',
    rock: ['#140c0a', '#2a1a14', '#3e2a20', '#54382a', '#6e4a36'],
    rockMoss: false,
    floorPattern: 'planks', wallPattern: 'brick', pot: 'coalbucket',
    stains: [3, 6], stainMildew: 0.6, cracks: [3, 6], pebbles: [4, 8], cobwebs: 0.1,
    wallProps: ['torch', 'torch', 'soot', 'embercrack', 'embercrack', 'chain'],
    floorProps: ['ashpile', 'scorch', 'scorch', 'coals'],
  },
  light: { dark: 0.08, tint: 'rgba(140,40,10,0.13)' },
  particles: ['embers', 'dust'],
  music: 'smolder', transpose: 0,
  hazards: [{ type: 'fireplace', chance: 0.55, max: 3 }, { type: 'firejet', chance: 0.45, max: 2 }],
  exclusive: ['cinderling', 'ashwalker', 'flickerwisp', 'kindler', 'smokebelly', 'scorchrat', 'clinker'],
  groups: [
    { weight: 3, e: [['cinderling', 3, 2], ['ashwalker', 1]], f: [['flickerwisp', 2]], s: [['eye', 1]] },
    { weight: 3, e: [['kindler', 2], ['clinker', 2]], f: [['flickerwisp', 1], ['moth', 1, 2]], s: [['sac', 1]] },
    { weight: 2, e: [['smokebelly', 2], ['cinderling', 2, 2]], f: [['moth', 2, 2]], s: [['eye', 1]] },
    { weight: 2, e: [['scorchrat', 2], ['ashwalker', 2]], f: [['flickerwisp', 1]], s: [['eye', 2]] },
    { weight: 2, e: [['ashwalker', 3], ['blob', 1]], f: [['flickerwisp', 2]], s: [['sac', 1]] },
    { weight: 2, e: [['clinker', 2], ['toad', 1]], f: [['moth', 2, 2]], s: [['eye', 1]] },
    { weight: 1, e: [['ratram', 2], ['kindler', 1]], f: [['flickerwisp', 1]], s: [['sac', 1]] },
  ],
  minibosses: ['emberhound'],
  bossBias: { pyre: 5 },
  rooms: CHAPTER1_ROOMS,
};

// ---------------------------------------------------------------------------------- chapter 2
const GROTTO = {
  id: 'grotto', chapter: 2, name: 'THE GROTTO', ready: true,
  blurb: 'Raw caves dug out by miners long gone: rails, lanterns, glowing crystals, falling rocks.',
  look: {
    id: 'grotto',
    floor: ['#191611', '#221e18', '#2d2820', '#383228', '#453d31'],
    wall: ['#0b0a08', '#171511', '#24201a', '#322c24', '#433a30'],
    mortar: '#050404', stain: '#1c2a38',
    rock: ['#1a1714', '#2e2924', '#443d35', '#5c5348', '#776c5e'],
    rockMoss: false,
    floorPattern: 'cave', wallPattern: 'cave', pot: 'crystal',
    stains: [2, 4], stainMildew: 0.2, cracks: [3, 6], pebbles: [16, 30], cobwebs: 0.2,
    wallProps: ['stalactite', 'stalactite', 'crystals', 'lantern', 'roots'],
    floorProps: ['gravel', 'gravel', 'crystalshard', 'rails'],
  },
  light: { dark: 0.14, tint: 'rgba(20,30,60,0.10)' },
  particles: ['dust', 'drips'],
  music: 'grotto', transpose: 0,
  hazards: [{ type: 'rockfall', chance: 0.4, max: 1 }],
  exclusive: ['shriekbat', 'pebbler', 'boulderback', 'pickghoul', 'geode', 'rockhopper'],
  groups: [
    { weight: 3, e: [['pickghoul', 3], ['rockhopper', 2]], f: [['shriekbat', 2]], s: [['geode', 2]] },
    { weight: 3, e: [['pebbler', 3], ['boulderback', 1]], f: [['shriekbat', 2, 2]], s: [['geode', 1]] },
    { weight: 2, e: [['boulderback', 2], ['pickghoul', 1]], f: [['moth', 2, 2]], s: [['pebbler', 2]] },
    { weight: 2, e: [['rockhopper', 3]], f: [['shriekbat', 2]], s: [['geode', 2], ['pebbler', 1]] },
    { weight: 2, e: [['mudworm', 2], ['pickghoul', 1]], f: [['divebuzzer', 1]], s: [['geode', 1]] },
    { weight: 1, e: [['ratram', 1], ['pebbler', 2]], f: [['shriekbat', 1]], s: [['eye', 1]] },
  ],
  minibosses: ['stonemaw'],
  bossBias: { grottomaw: 4, shriekmother: 4 },
  rooms: CHAPTER2_ROOMS,
};
const OSSUARY = {
  id: 'ossuary', chapter: 2, name: 'THE OSSUARY', ready: true,
  blurb: 'Catacombs walled with skulls: grave tiles, candles, bone urns, dart traps, restless dead.',
  look: {
    id: 'ossuary',
    floor: ['#17150f', '#201d16', '#2a261d', '#353025', '#423b2e'],
    wall: ['#0c0b08', '#2a261e', '#4a4436', '#6e6652', '#948a72'],
    mortar: '#070604', stain: '#2a2418',
    rock: ['#1c1a16', '#36322a', '#524c40', '#706858', '#8e8672'],
    rockMoss: false,
    floorPattern: 'ossuary', wallPattern: 'skulls', pot: 'boneurn',
    stains: [2, 4], stainMildew: 0.4, cracks: [2, 4], pebbles: [4, 8], cobwebs: 0.7,
    wallProps: ['skullniche', 'skullniche', 'candles', 'bonestack', 'chain'],
    floorProps: ['bones', 'bones', 'skull', 'candlepile', 'oldweb'],
  },
  light: { dark: 0.2, tint: 'rgba(60,50,30,0.12)' },
  particles: ['dust', 'fog'],
  music: 'ossuary', transpose: 0,
  hazards: [{ type: 'darttrap', chance: 0.45, max: 2 }],
  potSpawn: { type: 'rattleskull', chance: 0.15 },
  exclusive: ['bonewalker', 'shade', 'ossifier', 'rattleskull', 'lanternkeeper', 'cofferling'],
  groups: [
    { weight: 3, e: [['bonewalker', 3, 2], ['ossifier', 1]], f: [['rattleskull', 2]], s: [['cofferling', 2]] },
    { weight: 3, e: [['ossifier', 2], ['bonewalker', 1]], f: [['shade', 2]], s: [['cofferling', 1]] },
    { weight: 2, e: [['lanternkeeper', 2], ['bonewalker', 2]], f: [['rattleskull', 2, 2]], s: [['cofferling', 1]] },
    { weight: 2, e: [['bonewalker', 2]], f: [['shade', 2], ['draft', 1]], s: [['cofferling', 2]] },
    { weight: 2, e: [['gawper', 1], ['ossifier', 1]], f: [['rattleskull', 2]], s: [['eye', 1]] },
    { weight: 1, e: [['husk', 2], ['lanternkeeper', 1]], f: [['shade', 1]], s: [['cofferling', 1]] },
  ],
  minibosses: ['bonecolossus'],
  bossBias: { gravedigger: 4, bonechoir: 4 },
  rooms: CHAPTER2_ROOMS,
};
const SUNKEN = {
  id: 'sunken', chapter: 2, name: 'THE SUNKEN CAVES', ready: true, unlock: 'deeperStill',
  blurb: 'Flooded caves: wet stone, barnacles, reeds, strong currents and things in the water.',
  look: {
    id: 'sunken',
    floor: ['#0c1416', '#111c1e', '#172427', '#1d2d30', '#25383b'],
    wall: ['#060a0b', '#0e1617', '#162224', '#1f2f31', '#2a3e40'],
    mortar: '#030606', stain: '#1a4a5a',
    rock: ['#0f1718', '#1e2c2e', '#2e4042', '#425a5a', '#5a7472'],
    floorPattern: 'wetstone', wallPattern: 'cave', pot: 'barnaclejar',
    stains: [5, 9], stainMildew: 0.75, cracks: [1, 3], pebbles: [6, 12], cobwebs: 0,
    wallProps: ['barnacles', 'trickle', 'trickle', 'glowcap', 'seep'],
    floorProps: ['puddle', 'puddle', 'shells', 'reeds', 'reeds'],
  },
  light: { dark: 0.22, tint: 'rgba(10,60,80,0.16)' },
  particles: ['drips', 'fog'],
  music: 'sunken', transpose: 0,
  hazards: [{ type: 'current', chance: 0.45, max: 1 }],
  potSpawn: { type: 'leech', chance: 0.25 },
  exclusive: ['leech', 'snapjaw', 'bloatfish', 'drowned', 'eel', 'clam'],
  groups: [
    { weight: 3, e: [['leech', 3, 2], ['eel', 1]], f: [['bloatfish', 2]], s: [['clam', 2]] },
    { weight: 3, e: [['snapjaw', 2], ['leech', 2, 2]], f: [['bloatfish', 1]], s: [['clam', 1]] },
    { weight: 2, e: [['drowned', 2], ['snapjaw', 1]], f: [['moth', 2, 2]], s: [['clam', 2]] },
    { weight: 2, e: [['eel', 2]], f: [['bloatfish', 2]], s: [['clam', 1]] },
    { weight: 2, e: [['sludge', 2], ['leech', 1, 2]], f: [['bloatfish', 1]], s: [['clam', 1]] },
    { weight: 1, e: [['drowned', 2], ['toad', 1]], f: [['bloatfish', 2]], s: [['eye', 1]] },
  ],
  minibosses: ['undertow'],
  bossBias: { drowner: 4, angler: 4 },
  rooms: CHAPTER2_ROOMS,
};

// ---------------------------------------------------------------------------------- chapter 3
const UNDERHALL = {
  id: 'underhall', chapter: 3, name: 'THE UNDERHALL', ready: true,
  blurb: 'Vast halls of black stone under everything: iron, chains, braziers and spike traps.',
  look: {
    id: 'underhall',
    floor: ['#141518', '#1c1d21', '#25272b', '#2f3136', '#3a3c42'],
    wall: ['#08090a', '#141518', '#202226', '#2c2f34', '#3a3d44'],
    mortar: '#040405', stain: '#2a1414',
    rock: ['#16171a', '#2a2c30', '#40434a', '#585c64', '#747880'],
    rockMoss: false,
    floorPattern: 'slab', wallPattern: 'blocks', pot: 'ironlantern',
    stains: [2, 4], stainMildew: 0.15, cracks: [3, 6], pebbles: [6, 12], cobwebs: 0.4,
    wallProps: ['brazier', 'brazier', 'chain', 'cage', 'banner'],
    floorProps: ['rubble', 'rubble', 'bones', 'grate'],
  },
  light: { dark: 0.2, tint: 'rgba(40,30,30,0.12)' },
  particles: ['dust', 'embers'],
  music: 'underhall', transpose: 0,
  hazards: [{ type: 'spiketrap', chance: 0.5, max: 4 }],
  exclusive: ['chainling', 'gargoyle', 'brute', 'hookjaw', 'sentryeye', 'ironclad'],
  groups: [
    { weight: 3, e: [['chainling', 2], ['ironclad', 2]], f: [['sentryeye', 1]], s: [['gargoyle', 2]] },
    { weight: 3, e: [['brute', 1], ['hookjaw', 2]], f: [['sentryeye', 1]], s: [['gargoyle', 1]] },
    { weight: 2, e: [['ironclad', 3]], f: [['shade', 1]], s: [['gargoyle', 2]] },
    { weight: 2, e: [['hookjaw', 2], ['chainling', 1]], f: [['sentryeye', 2]], s: [['geode', 1]] },
    { weight: 2, e: [['brute', 2], ['bonewalker', 1]], f: [['shriekbat', 2]], s: [['gargoyle', 1]] },
    { weight: 1, e: [['pickghoul', 2], ['chainling', 1]], f: [['sentryeye', 1]], s: [['eye', 1]] },
  ],
  minibosses: ['jailer'],
  bossBias: { warden: 4, gargoyles: 4 },
  rooms: CHAPTER3_ROOMS,
};
const WAXTOMBS = {
  id: 'waxtombs', chapter: 3, name: 'THE WAX TOMBS', ready: true,
  blurb: 'The crypts of the old chandlers: marble, sealed urns, violet candles and restless wax dead.',
  look: {
    id: 'waxtombs',
    floor: ['#1c1a20', '#25222a', '#2f2c35', '#3a3641', '#47424f'],
    wall: ['#0c0a0e', '#1e1b22', '#2e2a34', '#403b48', '#565062'],
    mortar: '#060508', stain: '#3a2a4a',
    rock: ['#1e1c22', '#36333c', '#4e4a56', '#6a6672', '#8a8692'],
    rockMoss: false,
    floorPattern: 'marble', wallPattern: 'marble', pot: 'waxurn',
    stains: [2, 4], stainMildew: 0.5, cracks: [1, 3], pebbles: [2, 5], cobwebs: 0.6,
    wallProps: ['statue', 'violetcandles', 'violetcandles', 'skullniche', 'banner'],
    floorProps: ['petals', 'waxstubs', 'waxstubs', 'bones'],
  },
  light: { dark: 0.22, tint: 'rgba(60,30,90,0.14)' },
  particles: ['fog', 'dust'],
  music: 'waxtombs', transpose: 0,
  hazards: [{ type: 'soulbrazier', chance: 0.45, max: 2 }],
  potSpawn: { type: 'soulmoth', chance: 0.2 },
  exclusive: ['shroudling', 'mourner', 'candlewight', 'tombhand', 'reliquary', 'soulmoth', 'pallbearer'],
  groups: [
    { weight: 3, e: [['shroudling', 3], ['pallbearer', 1]], f: [['soulmoth', 2, 2]], s: [['reliquary', 1]] },
    { weight: 3, e: [['candlewight', 2], ['mourner', 1]], f: [['soulmoth', 2, 2]], s: [['tombhand', 2]] },
    { weight: 2, e: [['pallbearer', 2]], f: [['shade', 1]], s: [['tombhand', 2]] },
    { weight: 2, e: [['mourner', 2], ['shroudling', 1]], f: [['rattleskull', 1]], s: [['reliquary', 1]] },
    { weight: 2, e: [['candlewight', 2], ['bonewalker', 1]], f: [['soulmoth', 2, 2]], s: [['tombhand', 1]] },
    { weight: 1, e: [['husk', 2], ['shroudling', 1]], f: [['draft', 1]], s: [['reliquary', 1]] },
  ],
  minibosses: ['embalmer'],
  bossBias: { shroudking: 4, saint: 4 },
  rooms: CHAPTER3_ROOMS,
};
const MIRE = {
  id: 'mire', chapter: 3, name: 'THE MIRE', ready: true, unlock: 'blackWater',
  blurb: 'The depths gone rotten: black mud, tar pools, oozing ceilings and things that live in the muck.',
  look: {
    id: 'mire',
    floor: ['#0e100a', '#15180f', '#1d2114', '#262b1a', '#303721'],
    wall: ['#060705', '#0f110b', '#181b12', '#222619', '#2e3322'],
    mortar: '#030302', stain: '#2a3a14',
    rock: ['#12140e', '#22261a', '#343a28', '#4a5238', '#646e4c'],
    floorPattern: 'mud', wallPattern: 'cave', pot: 'tarbarrel',
    stains: [5, 9], stainMildew: 0.8, cracks: [1, 3], pebbles: [4, 8], cobwebs: 0.3,
    wallProps: ['oozestreak', 'oozestreak', 'sickglow', 'roots', 'mossdrape'],
    floorProps: ['bubbles', 'bubbles', 'rottenlog', 'mushrooms', 'bones'],
  },
  light: { dark: 0.24, tint: 'rgba(40,60,10,0.15)' },
  particles: ['spores', 'drips'],
  music: 'mire', transpose: 0,
  hazards: [{ type: 'tarpool', chance: 0.6, max: 3 }, { type: 'ooze', chance: 0.35, max: 1 }],
  potSpawn: { type: 'tarling', chance: 0.3 },
  exclusive: ['tarling', 'gulper', 'oozer', 'bloatfly', 'rotgut', 'murkworm'],
  groups: [
    { weight: 3, e: [['tarling', 3, 2], ['rotgut', 1]], f: [['bloatfly', 2]], s: [['oozer', 1]] },
    { weight: 3, e: [['gulper', 2], ['tarling', 2, 2]], f: [['bloatfly', 1]], s: [['oozer', 2]] },
    { weight: 2, e: [['murkworm', 1], ['rotgut', 1]], f: [['bloatfly', 2]], s: [['oozer', 1]] },
    { weight: 2, e: [['rotgut', 2], ['gulper', 1]], f: [['moth', 2, 2]], s: [['clam', 1]] },
    { weight: 2, e: [['sludge', 2], ['tarling', 1, 2]], f: [['bloatfly', 1]], s: [['oozer', 1]] },
    { weight: 1, e: [['leech', 2, 2], ['gulper', 1]], f: [['bloatfly', 2]], s: [['eye', 1]] },
  ],
  minibosses: ['bogmother'],
  bossBias: { blighttoad: 4, muckknot: 4 },
  rooms: CHAPTER3_ROOMS,
};

// ---------------------------------------------------------------------------------- chapter 4
const FLESHWORKS = {
  id: 'fleshworks', chapter: 4, name: 'THE FLESHWORKS', ready: true,
  blurb: 'Below the cellars, the wax turns to meat: pulsing walls, veins, growths, blood geysers.',
  look: {
    id: 'fleshworks',
    floor: ['#2a0c10', '#3a1216', '#4a181c', '#5c2026', '#702a30'],
    wall: ['#14040a', '#2a0a10', '#3e1218', '#561c22', '#70282e'],
    mortar: '#0a0204', stain: '#6a0a10',
    rock: ['#2a0a10', '#4a1a20', '#6a2a30', '#8a3a40', '#a85458'],
    rockMoss: false,
    floorPattern: 'flesh', wallPattern: 'flesh', pot: 'pustule',
    stains: [4, 8], stainMildew: 0.7, cracks: [1, 3], pebbles: [0, 2], cobwebs: 0,
    wallProps: ['veins', 'veins', 'tumor', 'walleye'],
    floorProps: ['bloodstain', 'bloodstain', 'cord', 'teeth'],
  },
  light: { dark: 0.16, tint: 'rgba(120,10,20,0.16)' },
  particles: ['drips', 'spores'],
  music: 'fleshworks', transpose: 0,
  hazards: [{ type: 'geyser', chance: 0.5, max: 3 }],
  potSpawn: { type: 'clotling', chance: 0.3 },
  exclusive: ['pulper', 'clotling', 'umbilic', 'gutworm', 'thumper', 'fetch'],
  groups: [
    { weight: 3, e: [['pulper', 2], ['umbilic', 1]], f: [['clotling', 3, 2]], s: [['thumper', 1]] },
    { weight: 3, e: [['gutworm', 2], ['pulper', 1]], f: [['fetch', 2]], s: [['thumper', 1]] },
    { weight: 2, e: [['umbilic', 2]], f: [['clotling', 2, 2], ['fetch', 1]], s: [['thumper', 1]] },
    { weight: 2, e: [['pulper', 2], ['mawling', 1]], f: [['clotling', 2, 2]], s: [['eyestalk', 1]] },
    { weight: 2, e: [['gutworm', 1], ['stitchling', 1]], f: [['fetch', 2]], s: [['thumper', 1]] },
    { weight: 1, e: [['ironclad', 1], ['pulper', 1]], f: [['clotling', 3, 2]], s: [['reliquary', 1]] },
  ],
  minibosses: ['clotmother'],
  rooms: CHAPTER4_ROOMS,
};
const BLACKWOMB = {
  id: 'blackwomb', chapter: 4, name: 'THE BLACK WOMB', ready: true,
  blurb: 'Dead flesh gone black: ash, smoke, pools of bile, and eyes in the dark.',
  look: {
    id: 'blackwomb',
    floor: ['#0c0a0c', '#141014', '#1c161a', '#261e22', '#32282c'],
    wall: ['#050405', '#0e0a0c', '#181214', '#221a1e', '#30262a'],
    mortar: '#020102', stain: '#1e3a1a',
    rock: ['#0e0a0c', '#1e181a', '#2e2628', '#423a3c', '#5a5052'],
    rockMoss: false,
    floorPattern: 'flesh', wallPattern: 'flesh', pot: 'cyst',
    stains: [3, 6], stainMildew: 0.5, cracks: [2, 4], pebbles: [2, 4], cobwebs: 0.2,
    wallProps: ['walleye', 'veins', 'soot', 'tumor'],
    floorProps: ['ashpile', 'bloodstain', 'teeth', 'bones'],
  },
  light: { dark: 0.45, tint: 'rgba(20,10,30,0.18)' },
  particles: ['dust', 'fog'],
  music: 'blackwomb', transpose: 0,
  hazards: [{ type: 'bilepool', chance: 0.55, max: 3 }],
  exclusive: ['gloom', 'blacktongue', 'weeper', 'mawling', 'eyestalk', 'nightfly'],
  groups: [
    { weight: 3, e: [['gloom', 2], ['blacktongue', 1]], f: [['nightfly', 2]], s: [['eyestalk', 1]] },
    { weight: 3, e: [['weeper', 2], ['mawling', 1]], f: [['nightfly', 1]], s: [['eyestalk', 1]] },
    { weight: 2, e: [['blacktongue', 2]], f: [['nightfly', 2]], s: [['eyestalk', 2]] },
    { weight: 2, e: [['mawling', 2], ['gloom', 1]], f: [['shade', 1]], s: [['eyestalk', 1]] },
    { weight: 2, e: [['weeper', 1], ['gloom', 2]], f: [['fetch', 1]], s: [['thumper', 1]] },
    { weight: 1, e: [['hookjaw', 1], ['weeper', 1]], f: [['nightfly', 2]], s: [['eyestalk', 1]] },
  ],
  minibosses: ['hollowmother'],
  rooms: CHAPTER4_ROOMS,
};
const SCARRED = {
  id: 'scarred', chapter: 4, name: 'THE SCARRED WOMB', ready: true, unlock: 'oldWounds',
  blurb: 'Old wounds, badly healed: pale scar tissue, stitches, scabs and barbed sutures.',
  look: {
    id: 'scarred',
    floor: ['#4a3430', '#5e4440', '#725650', '#886a62', '#a08078'],
    wall: ['#1e1210', '#34221e', '#4a322c', '#62443c', '#7a5850'],
    mortar: '#120a08', stain: '#5a2018',
    rock: ['#2a1810', '#4a2c20', '#6a4232', '#8a5a46', '#aa765e'],
    rockMoss: false,
    floorPattern: 'scar', wallPattern: 'flesh', pot: 'bandaged',
    stains: [2, 5], stainMildew: 0.6, cracks: [3, 5], pebbles: [0, 2], cobwebs: 0.1,
    wallProps: ['stitches', 'stitches', 'veins', 'tumor'],
    floorProps: ['scarline', 'scarline', 'bloodstain', 'teeth'],
  },
  light: { dark: 0.12, tint: 'rgba(90,40,30,0.12)' },
  particles: ['dust', 'drips'],
  music: 'scarred', transpose: 0,
  hazards: [{ type: 'suture', chance: 0.55, max: 3 }],
  potSpawn: { type: 'picker', chance: 0.3 },
  exclusive: ['stitchling', 'scab', 'suture', 'lancer', 'picker', 'bonecage'],
  groups: [
    { weight: 3, e: [['stitchling', 2], ['lancer', 1]], f: [['clotling', 2, 2]], s: [['bonecage', 1]] },
    { weight: 3, e: [['scab', 2], ['picker', 2, 2]], f: [['fetch', 1]], s: [['bonecage', 1]] },
    { weight: 2, e: [['suture', 1], ['picker', 1, 2]], f: [['clotling', 2, 2]], s: [['bonecage', 2]] },
    { weight: 2, e: [['lancer', 2], ['scab', 1]], f: [['nightfly', 1]], s: [['thumper', 1]] },
    { weight: 2, e: [['stitchling', 2], ['picker', 1, 2]], f: [['fetch', 1]], s: [['bonecage', 1]] },
    { weight: 1, e: [['pallbearer', 1], ['lancer', 1]], f: [['clotling', 2, 2]], s: [['eyestalk', 1]] },
  ],
  minibosses: ['surgeon'],
  rooms: CHAPTER4_ROOMS,
};

// ------------------------------------------------------------ retired placeholders
// The old looks from before each chapter was rebuilt, kept only so old saved runs still load.
const legacy = (id, chapter, name, look, transpose, light, particles) => ({
  id, chapter, name, ready: true, legacy: true,
  blurb: 'Placeholder: the old look until this chapter is rebuilt.',
  look: { ...UNDERCROFT.look, id, wallProps: [], floorProps: [], pot: 'jar', ...look },
  light, particles, music: 'cellar', transpose,
  hazards: [], exclusive: [], groups: LEGACY_GROUPS, minibosses: [], rooms: NORMAL_ROOMS,
});
const TUNNELS = legacy('tunnels', 2, 'THE ROOT TUNNELS', {
  floor: ['#161409', '#1e1b0e', '#272313', '#302b18', '#3a341e'], wall: ['#0c0b06', '#18160c', '#242012', '#302b18', '#3e3720'], stain: '#2c3a18',
}, -2, { dark: 0.15, tint: 'rgba(30,40,10,0.1)' }, 'spores');
const VAULTS = legacy('vaults', 3, 'THE COAL VAULTS', {
  floor: ['#121216', '#18181e', '#1f1f26', '#26262e', '#2f2f38'], wall: ['#09090c', '#131318', '#1c1c22', '#26262e', '#33333c'], stain: '#3a1c10',
}, -4, { dark: 0.2, tint: 'rgba(10,10,20,0.12)' }, 'dust');
const WELL = legacy('well', 4, 'THE DROWNED WELL', {
  floor: ['#0c1216', '#10181e', '#151f26', '#1a262e', '#203038'], wall: ['#06090c', '#0c1216', '#121a20', '#18232b', '#1f2d36'], stain: '#0f2a2a',
}, -5, { dark: 0.22, tint: 'rgba(10,30,40,0.12)' }, 'drips');

export const VARIANTS = {};
for (const v of [UNDERCROFT, WEEPING, SMOLDER, GROTTO, OSSUARY, SUNKEN, UNDERHALL, WAXTOMBS, MIRE, FLESHWORKS, BLACKWOMB, SCARRED, TUNNELS, VAULTS, WELL]) {
  v.special ??= SPECIAL_ROOMS;
  v.roomStyles ??= ROOM_STYLES;
  VARIANTS[v.id] = v;
}

export const CHAPTERS = {
  1: { name: 'THE CELLAR', variants: ['undercroft', 'weeping', 'smolder'] },
  2: { name: 'THE CAVES', variants: ['grotto', 'ossuary', 'sunken'] },
  3: { name: 'THE DEPTHS', variants: ['underhall', 'waxtombs', 'mire'] },
  4: { name: 'THE WOMB', variants: ['fleshworks', 'blackwomb', 'scarred'] },
};

// Variants a floor of `chapter` may use (`allowed(id)`: unlock check).
export function variantsFor(chapter, allowed = () => true) {
  const ids = (CHAPTERS[chapter]?.variants || []).filter((id) => VARIANTS[id].ready && allowed(id));
  return ids.length ? ids : [CHAPTERS[chapter].variants[0]];
}
