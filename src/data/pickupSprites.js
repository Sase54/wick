// Original pixel art for floor pickups and placed bombs. '.' is transparent.
import { PAL } from './palette.js';

export const PICKUP_COLORS = {
  k: PAL.outline,
  // gold
  Y: '#d8b048', l: '#fff0a0', d: '#8a6a20', e: '#a8802a',
  // silver
  S: '#b8b8c0', L: '#f8f8ff', D: '#6a6a78', E: '#8a8a96',
  // bomb
  g: '#34343e', G: '#7a7a88', b: '#1a1a22', f: '#ffd25a', F: '#f08a24',
  // hearts
  R: PAL.heartHi, H: PAL.heart, h: '#7a1418',
  a: PAL.ash, A: PAL.ashHi, n: '#5a5650',
  x: PAL.heartEmpty, X: '#3a2220',
  // soot heart: charcoal with ember sparks
  B: '#3a3038', q: '#1c1418', Q: '#7a6a76', T: '#ff7a3a',
  // moldy heart: brown rot with green fuzz
  M: '#8a4a30', m: '#c08a5e', j: '#4a2418', v: '#8ab04a',
  // vigil heart: pale holy wax
  V: '#efe6cc', U: '#ffffff', u: '#b8aa88',
  // ribcage heart: bone
  O: '#e8e0c8', o: '#9a907a',
  // melted heart: dead grey wax
  z: '#4a4440', Z: '#7a706a',
};

// A coin with a little flame stamped on it.
const COIN = [
  '...kkkkk...',
  '..kYYYYYk..',
  '.kYlYYYYdk.',
  'kYlYYeYYYdk',
  'kYlYeYeYYdk',
  'kYYYeYeYYdk',
  'kYYYYeYYYdk',
  'kYYYYYYYddk',
  '.kYYYYYddk.',
  '..kdddddk..',
  '...kkkkk...',
];
const COIN_MID = [
  '..kkk..',
  '.kYYYk.',
  'kYlYYdk',
  'kYlYYdk',
  'kYlYYdk',
  'kYYYYdk',
  'kYYYYdk',
  'kYYYddk',
  'kYYYddk',
  '.kdddk.',
  '..kkk..',
];
const COIN_EDGE = ['.k.', 'kYk', 'kYk', 'kYk', 'kYk', 'kYk', 'kYk', 'kdk', 'kdk', 'kdk', '.k.'];
const toSilver = (rows) => rows.map((r) => r.replace(/Y/g, 'S').replace(/l/g, 'L').replace(/d/g, 'D').replace(/e/g, 'E'));
const spin = (face, mid, edge) => [...Array(12).fill(face), mid, edge, mid].map((f) => f);

const BOMB_BODY = [
  '.......k.....',
  '......k......',
  '.....kkk.....',
  '...kkkkkkk...',
  '..kgGGgggbk..',
  '.kgGGggggbbk.',
  '.kgGgggggbbk.',
  '.kggggggbbbk.',
  '.kgggggbbbbk.',
  '..kgggbbbbk..',
  '...kkkkkkk...',
];
const BOMB_A = ['........f.F..', ...BOMB_BODY];
const BOMB_B = ['.......F..f..', ...BOMB_BODY];

const KEY = [
  '.kkkk........',
  'kYllYk.......',
  'kl..Ykkkkkkkk',
  'kY..YYYYYYYYk',
  'kYYYYkkkYkYdk',
  '.kkkk..kdkdk.',
  '........k.k..',
];

export const HEART_ROWS = [
  '.kkk...kkk.',
  'kRRHk.kHHHk',
  'kRHHHkHHHHk',
  'kRHHHHHHHHk',
  'kHHHHHHHHhk',
  '.kHHHHHHhk.',
  '..kHHHHhk..',
  '...kHHhk...',
  '....khk....',
  '.....k.....',
];
// Left half of a heart, closed off with an outline.
export const HALF_HEART_ROWS = HEART_ROWS.map((r) => {
  const left = r.slice(0, 6);
  return left[5] === '.' ? left : left.slice(0, 5) + 'k';
});
export const halfOf = (rows) => rows.map((r) => {
  const left = r.slice(0, 6);
  return left[5] === '.' ? left : left.slice(0, 5) + 'k';
});
export const ASH_HEART = HEART_ROWS.map((r) => r.replace(/H/g, 'a').replace(/R/g, 'A').replace(/h/g, 'n'));

// ---- the other heart types (all 11 x 10, same outline so the HUD lines up) ----
// Soot Heart: charcoal with ember sparks.
export const SOOT_HEART = [
  '.kkk...kkk.',
  'kQQBk.kBBBk',
  'kQBBBkBBTBk',
  'kQBBBBBBBBk',
  'kBBTBBBBBqk',
  '.kBBBBBBqk.',
  '..kBBBTqk..',
  '...kBBqk...',
  '....kqk....',
  '.....k.....',
];
// Moldy Heart: a rotten red heart with green fuzz.
export const MOLDY_HEART = [
  '.kkk...kkk.',
  'kmmMk.kMvMk',
  'kmMMMkMvvMk',
  'kmMvMMMMMMk',
  'kMMMMMMvMjk',
  '.kMMvMMMjk.',
  '..kMMMMjk..',
  '...kMvjk...',
  '....kjk....',
  '.....k.....',
];
// Vigil Heart (floor pickup): a pale half heart with a little candle flame on top.
const VIGIL_A = [
  '...f.......',
  '..fFf......',
  '..flf......',
  '.kkkkk.....',
  'kUUVVk.....',
  'kUVVVk.....',
  'kUVVVk.....',
  'kVVVVk.....',
  '.kVVVk.....',
  '..kVVk.....',
  '...kuk.....',
  '....kk.....',
];
const VIGIL_B = ['....f......', '..fFf......', '..fFlf.....', ...VIGIL_A.slice(3)];
// Brass Heart: solid gold.
export const BRASS_HEART = HEART_ROWS.map((r) => r.replace(/H/g, 'Y').replace(/R/g, 'l').replace(/h/g, 'd'));
// Ribcage Heart: bone bars with blood showing between them. '1'/'2' are the left/right gaps.
const RIB_HEART = [
  '.kkk...kkk.',
  'kOOOk.kOOOk',
  'kO11OkO22ok',
  'kOOOOOOOOok',
  'kO1111222ok',
  '.kOOOOOOok.',
  '..kO1122k..',
  '...kOOok...',
  '....kok....',
  '.....k.....',
];
export const ribHeart = (left, right) => RIB_HEART.map((r) => r.replace(/1/g, left).replace(/2/g, right));
// Melted Heart: a dead, dripping slot.
export const MELTED_HEART = [
  '.kkk...kkk.',
  'kZZzk.kzZzk',
  'kZzzzkzzzzk',
  'kzzzzkzzzzk',
  'kzzzzzkzzzk',
  '.kzzzzkzzk.',
  '..kzzkzzk..',
  '..kzk.kzk..',
  '...k...k...',
  '...........',
];
// HUD overlays: a brass rim for gilded hearts and a small white flame for the Vigil heart.
export const BRASS_RIM = HEART_ROWS.map((r) => r.replace(/k/g, 'Y').replace(/[RHh]/g, '.'));
export const VIGIL_MARK = [
  '.f.',
  'fFf',
  'klk',
  'kUk',
  'kkk',
];

// Each pickup sprite: list of animation frames.
export const PICKUP_SPRITES = {
  coin: spin(COIN, COIN_MID, COIN_EDGE),
  silver: spin(COIN, COIN_MID, COIN_EDGE).map(toSilver),
  bomb: [BOMB_A, BOMB_B],
  key: [KEY],
  heart: [HEART_ROWS],
  heartHalf: [HALF_HEART_ROWS],
  ash: [ASH_HEART],
  ashHalf: [halfOf(ASH_HEART)],
  soot: [SOOT_HEART],
  moldy: [MOLDY_HEART],
  vigil: [VIGIL_A, VIGIL_A, VIGIL_B, VIGIL_B],
  brass: [BRASS_HEART],
  rib: [ribHeart('H', 'H')],
};

// A bomb that has been placed (it swells and flashes in code).
export const PLACED_BOMB = { frames: [BOMB_A, BOMB_B] };
