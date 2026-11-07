// Original pixel art, defined as strings. One character = one pixel; '.' is transparent.
import { PAL } from './palette.js';
import { ITEM_BATCHES } from './items.js';

// Shared color key for character sprites.
export const COLORS = {
  k: PAL.outline,
  r: '#3a2a20',          // wick
  d: PAL.wax[1],         // wax shadow
  W: PAL.wax[2],         // wax mid
  w: PAL.wax[3],         // wax light
  l: PAL.wax[4],         // wax highlight
  e: '#120c0a',          // eye
  h: '#f4ead2',          // eye glint
  m: '#4a2018',          // mouth
  o: PAL.flame[1],
  f: PAL.flame[2],
  F: PAL.flame[3],
  y: PAL.flame[4],
  // hearts
  R: PAL.heartHi,
  x: PAL.heartEmpty,
  H: PAL.heart,
  a: PAL.ash,
  A: PAL.ashHi,
};

// ---------- Wick, the living candle ----------
// Body without a face, 18 x 16. Feet and flame are drawn separately so they can animate.
export const WICK_BODY = [
  '........rr........',
  '......kkkkkk......',
  '....kkWwwwwWkk....',
  '...kWwwwwwwwWk...',
  '..kwlwwwwwwwwwWk..',
  '..kwlwwwwwwwwwWk..',
  '..kwlwwwwwwwwwWk..',
  '..kwlwwwwwwwwwWk..',
  '..kwlwwwwwwwwwWk..',
  '..kwlwwwwwwwwwWk..',
  '..kwwwwwwwwwwwWk..',
  '.kwwwwwwwwwwwwWdk.',
  '.kwlwwwwwwwwwwWdk.',
  '.kwlwwwdwwwwWWddk.',
  '.kdwWwddwWdWWdddk.',
  '..kkkkkkkkkkkkkk..',
];

// Faces are pixel overlays on the body: [x, y, colorChar]. Side faces look right; left is mirrored.
const eye = (x, y, glint = true) => [[x, y, glint ? 'h' : 'e'], [x + 1, y, 'e'], [x, y + 1, 'e'], [x + 1, y + 1, 'e'], [x, y + 2, 'e'], [x + 1, y + 2, 'e']];
export const WICK_FACES = {
  down: [...eye(5, 6), ...eye(11, 6), [8, 10, 'm'], [9, 10, 'm']],
  downShoot: [
    [5, 8, 'e'], [6, 8, 'e'], [11, 8, 'e'], [12, 8, 'e'],
    [8, 10, 'm'], [9, 10, 'm'], [8, 11, 'm'], [9, 11, 'm'],
  ],
  // shooting: the eye that fires squints, the other stays wide (shots alternate eyes)
  downShootL: [[5, 8, 'e'], [6, 8, 'e'], ...eye(11, 6), [8, 10, 'm'], [9, 10, 'm'], [8, 11, 'm'], [9, 11, 'm']],
  downShootR: [...eye(5, 6), [11, 8, 'e'], [12, 8, 'e'], [8, 10, 'm'], [9, 10, 'm'], [8, 11, 'm'], [9, 11, 'm']],
  side: [...eye(9, 6), [13, 6, 'e'], [13, 7, 'e'], [13, 8, 'e'], [12, 10, 'm']],
  sideShoot: [[9, 8, 'e'], [10, 8, 'e'], [13, 8, 'e'], [12, 10, 'm'], [12, 11, 'm']],
  up: [],
  upShoot: [],
  hurt: [
    [4, 6, 'e'], [6, 6, 'e'], [5, 7, 'e'], [4, 8, 'e'], [6, 8, 'e'],
    [11, 6, 'e'], [13, 6, 'e'], [12, 7, 'e'], [11, 8, 'e'], [13, 8, 'e'],
    [7, 11, 'm'], [8, 10, 'm'], [9, 11, 'm'], [10, 10, 'm'],
  ],
};

// Flame frames sit on top of the wick (a mirrored copy of frame 1 is added in code).
export const FLAME_FRAMES = [
  [
    '...ff...',
    '...ff...',
    '..fFFf..',
    '..fFFf..',
    '.fFFFFf.',
    '.fFyyFf.',
    'fFFyyFFf',
    'fFyyyyFf',
    'fFyyyyFf',
    '.fFyyFf.',
    '..ffff..',
  ],
  [
    '..f.....',
    '..ff....',
    '..fFf...',
    '.fFFf...',
    '.fFFFFf.',
    '.fFyyFf.',
    'fFFyyFFf',
    'fFyyyyFf',
    'fFyyyyFf',
    '.fFyyFf.',
    '..ffff..',
  ],
  [
    '...f....',
    '...ff...',
    '...ff...',
    '..fFFf..',
    '..fFFf..',
    '.fFFFFf.',
    '.fFyyFf.',
    'fFFyyFFf',
    'fFyyyyFf',
    '.fFyyFf.',
    '..ffff..',
  ],
];

// Bigger flare shown for a moment after each shot.
export const FLAME_FLARE = [
  '....ff....',
  '...fFf....',
  '...fFFf...',
  '..fFFFf...',
  '..fFFFFf..',
  '.fFFyyFFf.',
  '.fFyyyyFf.',
  'fFFyyyyFFf',
  'fFyyyyyyFf',
  'fFyyyyyyFf',
  '.fFyyyyFf.',
  '..fFFFFf..',
  '...ffff...',
];

// ---------- Costumes from items ----------
// Drawn over (or behind) Wick's 18x16 body. x/y are offsets from the body's top-left.
// `facings` limits which directions show it (side faces right; left is mirrored).
export const COSTUMES = {
  glasses: {
    rows: [
      'kkkk..kkkk',
      'k..kkkk..k',
      'k..k..k..k',
      'kkkk..kkkk',
    ],
    x: 4, y: 5, facings: ['down'],
  },
  glassesSide: {
    rows: ['kkkk.k', 'k..kkk', 'k..k.k', 'kkkk..'],
    x: 8, y: 5, facings: ['side'],
  },
  antlers: {
    rows: [
      'k.k........k.k',
      'kok........kok',
      '.kok......kok.',
      '..kk......kk..',
    ],
    colors: { o: '#7a5034' },
    x: 2, y: -2, facings: ['down', 'side', 'up'],
  },
  crown: {
    rows: [
      'Y..Y..Y.',
      'YY.YY.YY',
      'YrYYYYrY',
      'kkkkkkkk',
    ],
    colors: { Y: '#d8b048', r: '#c0262c' },
    x: 5, y: -1, facings: ['down', 'side', 'up'],
  },
  wings: {
    rows: [
      'kk................kk',
      'kGk..............kGk',
      'kGGk............kGGk',
      'kGgGk..........kGgGk',
      '.kGGk..........kGGk.',
      '..kk............kk..',
    ],
    colors: { G: '#c4bfb6', g: '#8a8580' },
    x: -1, y: 4, facings: ['down', 'side', 'up'], behind: true, flap: true,
  },
};

// Part 6 item batches bring their own costumes (src/data/items/*.js).
for (const b of ITEM_BATCHES) Object.assign(COSTUMES, b.COSTUMES || {});
import { COSTUMES as TF_COSTUMES } from './transformations.js';
Object.assign(COSTUMES, TF_COSTUMES);

// Flame recolors: replace the flame characters' colors.
export const FLAME_COLORS = {
  blue: { f: '#3a6ad0', F: '#8ad0f0', y: '#e8f8ff' },
  ember: { f: '#a01c18', F: '#f04a24', y: '#ffb05a' },
  white: { f: '#e8d9b0', F: '#fff4d6', y: '#ffffff' },
};

// ---------- Shopkeeper: an old mole in a moth-eaten coat ----------
export const SHOPKEEPER = {
  colors: { k: PAL.outline, m: '#3a2e28', M: '#5a4a40', S: '#c4bfb6', P: '#e090b0', O: '#4a3020', o: '#6a4630', Y: '#d8b048', h: '#fff4d6' },
  frames: [
    [
      '.....kkkkkk.....',
      '...kkmmmmmmkk...',
      '..kmmMmmmmMmmk..',
      '..kmkSkmmkSkmk..',
      '..kmkkkmmkkkmk..',
      '..kmmmmPPmmmmk..',
      '...kmmhmmhmmk...',
      '..kkoooooooookk.',
      '.koOOoOOOOoOOok.',
      '.koOkoOYOOokOok.',
      '.koOOoOOOOoOOok.',
      '.kkkOOOYOOOOkkk.',
      '..kmkOOOOOOkmk..',
      '..kkkOOOOOOkkk..',
      '....kkk..kkk....',
    ],
    [
      '................',
      '.....kkkkkk.....',
      '...kkmmmmmmkk...',
      '..kmmMmmmmMmmk..',
      '..kmkSkmmkSkmk..',
      '..kmkkkmmkkkmk..',
      '..kmmmmPPmmmmk..',
      '..kkmmhmmhmmkk..',
      '.koOOoooooooOok.',
      '.koOkoOYOOokOok.',
      '.koOOoOOOOoOOok.',
      '.kkkOOOYOOOOkkk.',
      '..kmkOOOOOOkmk..',
      '..kkkOOOOOOkkk..',
      '....kkk..kkk....',
    ],
  ],
};

// ---------- HUD ----------
export const HEART = [
  '.kkk.kkk.',
  'kRRHkHHHk',
  'kRHHHHHHk',
  'kHHHHHHHk',
  '.kHHHHHk.',
  '..kHHHk..',
  '...kHk...',
  '....k....',
];
