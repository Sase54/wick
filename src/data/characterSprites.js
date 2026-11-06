// Character looks. Every character is a living candle, but each one has its own body shape,
// wax colors, flame, eyes and accessories. Bodies are 18 x 16 like Wick's and are generated
// from a small shape description (so the faces, feet and flame line up for everyone).
//
// Body color characters (overridable per character in `colors`):
//   k outline, r wick, d/W/w/l wax shadow..highlight, S/s stripe light/dark,
//   P/p/q base (cup, pot) mid/shade/rim, E glowing crack, e/h/m eyes, glint, mouth
import { COSTUMES, FLAME_COLORS } from './sprites.js';

// ---- the body generator ------------------------------------------------------
// shape: { top, half: [topHalfWidth, bottomHalfWidth], topStyle: round|flat|jagged|melted,
//          widen: {from, by}, wavy, pattern: {type, ...}, drips: [[x, len]], base: {from, kind},
//          cracks: [[x, y, ch]] }
export function makeBody(shape = {}) {
  const W = 18, H = 16;
  const top = shape.top ?? 2;
  const [h0, h1] = shape.half ?? [6, 7];
  const mask = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = top; y <= 14; y++) {
    const k = (y - top) / Math.max(1, 14 - top);
    let half = Math.round(h0 + (h1 - h0) * k);
    if (shape.widen && y >= shape.widen.from) half += shape.widen.by;
    for (let x = 9 - half; x <= 8 + half; x++) if (x >= 1 && x <= 16) mask[y][x] = true;
  }
  const L0 = 9 - h0, R0 = 8 + h0;
  const style = shape.topStyle ?? 'round';
  if (style === 'round') { mask[top][L0] = false; mask[top][R0] = false; }
  if (style === 'jagged') {
    const jag = shape.jag || [1, 0, 2, 1, 0, 0, 1, 2, 0, 1, 2, 0];
    for (let x = L0; x <= R0; x++) for (let i = 0; i < jag[(x - L0) % jag.length]; i++) mask[top + i][x] = false;
  }
  if (style === 'melted') {
    mask[top][L0] = mask[top][R0] = false;
    for (let x = L0 + 3; x <= R0 - 3; x++) mask[top][x] = false;
  }
  if (shape.wavy) for (let x = 0; x < W; x++) if (x % 3 === 1) mask[14][x] = false;

  const rows = Array.from({ length: H }, () => Array(W).fill('.'));
  const at = (x, y) => y >= 0 && y < H && x >= 0 && x < W && mask[y][x];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (mask[y][x]) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) rows[y][x] = 'k';
    }
  }
  const firstRow = (x) => { for (let y = 0; y < H; y++) if (mask[y][x]) return y; return 99; };
  const pat = shape.pattern;
  for (let y = 0; y < H; y++) {
    let L = 99, R = -1;
    for (let x = 0; x < W; x++) if (mask[y][x]) { L = Math.min(L, x); R = Math.max(R, x); }
    for (let x = L; x <= R; x++) {
      if (!mask[y][x]) continue;
      const u = (x - L) / Math.max(1, R - L);
      let ch = x === L + 1 ? 'l' : u > 0.85 ? 'd' : u > 0.68 ? 'W' : 'w';
      if (y >= 13 && u > 0.5) ch = 'd';
      if (y === firstRow(x) && (x === L || x === R)) ch = 'W';
      if (pat && stripeAt(pat, x, y, top)) ch = ch === 'w' || ch === 'l' ? 'S' : 's';
      if (shape.base && y >= shape.base.from) ch = y === shape.base.from ? 'q' : u < 0.25 ? 'q' : u > 0.72 ? 'p' : 'P';
      rows[y][x] = ch;
    }
  }
  for (const [x, len] of shape.drips || []) {
    const y0 = firstRow(x);
    for (let i = 0; i < len; i++) if (at(x, y0 + i)) rows[y0 + i][x] = i === len - 1 ? 'W' : 'l';
  }
  if (shape.base?.kind === 'pot') for (const [x, y] of [[5, shape.base.from + 2], [9, shape.base.from + 3], [12, shape.base.from + 2]]) if (at(x, y)) rows[y][x] = 'E';
  for (const [x, y, ch] of shape.cracks || []) if (at(x, y)) rows[y][x] = ch || 'k';
  const wickY = Math.min(firstRow(8), firstRow(9)) - 2;
  if (wickY >= 0) { rows[wickY][8] = 'r'; rows[wickY][9] = 'r'; }
  return { rows: rows.map((r) => r.join('')), wickY: Math.max(0, wickY) };
}

function stripeAt(p, x, y, top) {
  const ry = y - top;
  switch (p.type) {
    case 'bands': return ry % p.every < (p.width ?? 1);
    case 'spiral': return (x + y) % p.every < (p.width ?? 2);
    case 'brick': return ry % 4 === 3 || (x + (Math.floor(ry / 4) % 2) * 3) % 6 === 0;
    case 'diag': return (x - y + 40) % p.every === 0;
    case 'halves': return x >= 9;
    case 'rings': return ry % 3 === 1;
    case 'patch': return ((Math.floor(x / 4) * 7 + Math.floor(y / 4) * 3) % 3) === 1;
    default: return false;
  }
}

// ---- costumes worn by characters (merged into the item costumes) ----------------
// rows/x/y relative to the 18x16 body; `facings` side looks right, left is mirrored.
Object.assign(COSTUMES, {
  horns: {
    rows: ['ok..........ko', 'kok........kok', '.kok......kok.'],
    colors: { o: '#6a4038' }, x: 2, y: 0, facings: ['down', 'side', 'up'],
  },
  hornBroken: {
    rows: ['ok...........', 'kok..........', '.kok......kk.'],
    colors: { o: '#8a8078' }, x: 2, y: 0, facings: ['down', 'side', 'up'],
  },
  veil: {
    rows: [
      '....VVVVVV....',
      '..VVvVVVVvVV..',
      '.VVv......vVV.',
      '.Vv........vV.',
      'Vv..........vV',
      'V............V',
      'v............v',
    ],
    colors: { V: '#f4f0e8', v: '#bdb4a2' }, x: 2, y: 1, facings: ['down', 'side', 'up'],
  },
  veilDark: {
    rows: [
      '....VVVVVV....',
      '..VVvVVVVvVV..',
      '.VVv......vVV.',
      '.Vv........vV.',
      'Vv..........vV',
      'V............V',
      'v............v',
    ],
    colors: { V: '#6a5a7a', v: '#3a2e48' }, x: 2, y: 1, facings: ['down', 'side', 'up'],
  },
  mask: {
    rows: ['bbbbbbbbbbbb', 'bb..bbbb..bb', 'bb..bbbb..bb', 'bb..bbbb..bb', 'bbbbbbbbbbbb'],
    colors: { b: '#1c1a22' }, x: 3, y: 5, facings: ['down'],
  },
  maskSide: {
    rows: ['bbbbbbbbb', 'bb..bb.bb', 'bb..bb.bb', 'bb..bb.bb', 'bbbbbbbbb'],
    colors: { b: '#1c1a22' }, x: 7, y: 5, facings: ['side'],
  },
  maskBack: {
    rows: ['bbbbbbbbbbbb', 'bbbbbbbbbbbb', '.....bb.....', '....b..b....'],
    colors: { b: '#1c1a22' }, x: 3, y: 6, facings: ['up'],
  },
  sack: {
    rows: ['.kk..', 'kssk.', 'ksSsk', 'kssSk', '.kkk.'],
    colors: { s: '#8a6a48', S: '#b08a5e' }, x: -3, y: 4, facings: ['down', 'side', 'up'], behind: true,
  },
  lens: {
    rows: ['.gg.', 'g..g', 'g..g', 'g..g', '.gg.', '...g', '...g'],
    colors: { g: '#d8b048' }, x: 10, y: 5, facings: ['down'],
  },
  lensSide: {
    rows: ['.gg.', 'g..g', 'g..g', 'g..g', '.gg.'],
    colors: { g: '#d8b048' }, x: 8, y: 5, facings: ['side'],
  },
  cap: {
    rows: ['..kkkkkkkk....', '.kCCCCCCCCk...', 'kCcCCCCCCCCkkk', 'kkkkkkkkkkkkkk'],
    colors: { C: '#4a3a30', c: '#6a5444' }, x: 2, y: 1, facings: ['down', 'side', 'up'],
  },
  bell: {
    rows: ['.k.', 'kYk', 'kYk', 'YlY', '.k.'],
    colors: { Y: '#b08a30', l: '#fff0a0' }, x: 14, y: 7, facings: ['down', 'side'],
  },
  bellCracked: {
    rows: ['.k.', 'kYk', 'kkk', 'YkY', '.k.'],
    colors: { Y: '#6a5020' }, x: 14, y: 7, facings: ['down', 'side'],
  },
  lamp: {
    rows: ['..gggg..', '.g....g.', 'g......g', 'g......g', 'g......g', 'g......g', 'g......g', 'gggggggg'],
    colors: { g: '#9ab0b8' }, x: 5, y: -8, facings: ['down', 'side', 'up'],
  },
  lampBroken: {
    rows: ['..g.....', '.g......', 'g.......', 'g......g', '.......g', 'g......g', 'g......g', 'ggg..ggg'],
    colors: { g: '#5a6a70' }, x: 5, y: -8, facings: ['down', 'side', 'up'],
  },
  blindfold: {
    rows: ['bbbbbbbbbbbbbb', 'bbbbbbbbbbbbbb', 'BBBBBBBBBBBBBB', '............bb', '.............b'],
    colors: { b: '#e8e4dc', B: '#a8a49c' }, x: 2, y: 5, facings: ['down', 'side', 'up'],
  },
});

// ---- extra flame colors ----------------------------------------------------------
Object.assign(FLAME_COLORS, {
  pale: { f: '#8aa0c0', F: '#d0e0f0', y: '#ffffff' },
  hell: { f: '#5a0a10', F: '#d0201c', y: '#ff9a5a' },
  jade: { f: '#2a7a4a', F: '#5ad08a', y: '#d8ffe8' },
  ghost: { f: '#4a8aa0', F: '#9ae0f0', y: '#f0ffff' },
  dim: { f: '#7a4a2a', F: '#b07a4a', y: '#e0b88a' },
  violet: { f: '#6a3ab0', F: '#b88af0', y: '#f4e8ff' },
  hot: { f: '#3a8ad0', F: '#a0e0ff', y: '#ffffff' },
  bright: { f: '#e09a20', F: '#ffe060', y: '#ffffe8' },
  void: { f: '#2a0a3a', F: '#6a2a8a', y: '#c88af0' },
  rose: { f: '#a02a5a', F: '#f07aa8', y: '#ffe0ec' },
  gold: { f: '#a07a10', F: '#f0d050', y: '#fff8d0' },
  rot: { f: '#5a6a10', F: '#a8c03a', y: '#f0ffa0' },
});
export const FLAME_GLOWS = {
  blue: 'rgba(80,140,255,0.55)', ember: 'rgba(255,80,40,0.55)', white: 'rgba(255,240,210,0.6)',
  pale: 'rgba(170,200,255,0.5)', hell: 'rgba(220,30,30,0.55)', jade: 'rgba(80,220,140,0.5)',
  ghost: 'rgba(120,220,240,0.5)', dim: 'rgba(180,120,70,0.4)', violet: 'rgba(170,110,255,0.55)',
  hot: 'rgba(140,210,255,0.6)', bright: 'rgba(255,220,90,0.65)', void: 'rgba(120,40,170,0.45)',
  rose: 'rgba(255,110,170,0.5)', gold: 'rgba(255,210,80,0.6)', rot: 'rgba(170,200,60,0.45)',
};

// ---- palettes ------------------------------------------------------------------
const ramp = (d, W, w, l) => ({ d, W, w, l });
const GLOW_EYES = { e: '#ffd25a', h: '#fff3c0', m: '#ff5a24' };
const RED_EYES = { e: '#e0201c', h: '#ff9a7a' };
const HOLLOW_EYES = { e: '#050304', h: '#050304', m: '#050304' };

// ---- every character's look ----------------------------------------------------
// shape (see makeBody) or rows, colors, flame, costumes, alpha, noFeet, wickY
export const LOOKS = {
  // ============================================================== BASE
  wick: { rows: null, colors: {}, flame: null, costumes: [] },   // the classic sprite in sprites.js
  pip: {
    shape: { top: 4, half: [6, 7], base: { from: 11, kind: 'cup' }, topStyle: 'flat' },
    colors: { ...ramp('#b8aa90', '#d8ccb0', '#f0e8d4', '#ffffff'), P: '#a8a8b4', p: '#6a6a78', q: '#e0e0ea' },
    flame: 'bright', costumes: [],
  },
  brick: {
    shape: { top: 2, half: [8, 8], topStyle: 'flat', pattern: { type: 'brick' } },
    colors: { ...ramp('#5a2a1c', '#7a3a24', '#9a4a2e', '#b8664a'), S: '#9a4a2e', s: '#4a2216' },
    flame: 'ember', costumes: [],
  },
  vesper: {
    shape: { top: 2, half: [5, 6], drips: [[5, 4], [12, 2]] },
    colors: { ...ramp('#b0a898', '#d8d0c0', '#f2ece0', '#ffffff') },
    flame: 'pale', costumes: ['veil'],
  },
  cinder: {
    shape: { top: 3, half: [6, 7], topStyle: 'jagged', cracks: [[5, 11, 'E'], [6, 12, 'E'], [12, 9, 'E'], [11, 10, 'E'], [13, 13, 'E']] },
    colors: { ...ramp('#100c0e', '#1c1618', '#2a2226', '#4a3c42'), E: '#ff5a24', ...GLOW_EYES },
    flame: 'hell', costumes: ['horns'],
  },
  pilfer: {
    shape: { top: 2, half: [6, 7], drips: [[13, 3]] },
    colors: { ...ramp('#4a5a48', '#647662', '#80947c', '#a8bca2') },
    flame: 'jade', costumes: ['sack', 'mask', 'maskSide', 'maskBack'],
  },
  wisp: {
    shape: { top: 2, half: [6, 6], wavy: true },
    colors: { ...ramp('#6a7a96', '#8a9ab8', '#b0c0d8', '#e0ecff'), e: '#1a2a4a' },
    flame: 'ghost', costumes: [], alpha: 0.75, noFeet: true,
  },
  morrow: {
    shape: { top: 2, half: [6, 7], pattern: { type: 'spiral', every: 6, width: 2 } },
    colors: { ...ramp('#3e4a3a', '#566450', '#6e7e66', '#8e9e84'), S: '#d8d0bc', s: '#a8a08c' },
    flame: 'dim', costumes: [],
  },
  // Morrow after coming back: the cracks are sealed with gold.
  morrowRelit: {
    shape: { top: 2, half: [6, 7], cracks: [[5, 4, 'E'], [6, 5, 'E'], [6, 6, 'E'], [12, 8, 'E'], [11, 9, 'E'], [11, 10, 'E'], [7, 12, 'E'], [8, 13, 'E']] },
    colors: { ...ramp('#a88a5a', '#c8aa78', '#e8d0a0', '#fff0d0'), E: '#f0c040' },
    flame: 'white', costumes: [],
  },
  nib: {
    shape: { top: 4, half: [4, 5], pattern: { type: 'spiral', every: 5, width: 2 } },
    colors: { ...ramp('#c8b8b0', '#e8dcd4', '#fff4ee', '#ffffff'), S: '#f07aa8', s: '#b04a78' },
    flame: null, costumes: [],
  },
  nub: {
    shape: { top: 4, half: [4, 5], pattern: { type: 'spiral', every: 5, width: 2 } },
    colors: { ...ramp('#b8bcc8', '#d8dce8', '#f2f6ff', '#ffffff'), S: '#6aa0e8', s: '#3a6ab0' },
    flame: null, costumes: [],
  },
  prism: {
    shape: { top: 2, half: [6, 6], pattern: { type: 'diag', every: 5 } },
    colors: { ...ramp('#4a8a9a', '#6ab0c0', '#9ad8e4', '#e8ffff'), S: '#e8ffff', s: '#4a8a9a' },
    flame: 'violet', costumes: ['lens', 'lensSide'],
  },
  motley: {
    shape: { top: 2, half: [6, 7], pattern: { type: 'patch' } },
    colors: { ...ramp('#8a6a4a', '#aa8a62', '#caa87e', '#ead0a8'), S: '#6a9a5a', s: '#4a6a3a' },
    flame: null, costumes: [], randomColors: true,
  },
  sexton: {
    shape: { top: 3, half: [6, 7], drips: [[4, 5], [12, 3], [14, 6]] },
    colors: { ...ramp('#5a4632', '#7a6044', '#9a7c58', '#bca078') },
    flame: 'dim', costumes: ['cap'],
  },
  spill: {
    shape: { top: 3, half: [5, 6], topStyle: 'melted', widen: { from: 13, by: 2 }, drips: [[4, 8], [6, 5], [11, 7], [13, 9]] },
    colors: { ...ramp('#b0661c', '#d08a2a', '#eaae4a', '#ffd88a') },
    flame: null, costumes: [],
  },
  kiln: {
    shape: { top: 2, half: [6, 7], base: { from: 9, kind: 'pot' } },
    colors: { ...ramp('#c8b8a0', '#e0d4c0', '#f4ecdc', '#ffffff'), P: '#a85a34', p: '#6a3420', q: '#d08060', E: '#ffd25a' },
    flame: 'hot', costumes: [],
  },
  echo: {
    shape: { top: 2, half: [6, 6], pattern: { type: 'rings' } },
    colors: { ...ramp('#6a5a8a', '#8a7aaa', '#aa9aca', '#d4c8ec'), S: '#c4b4e4', s: '#5a4a7a' },
    flame: 'violet', costumes: ['bell'],
  },
  beacon: {
    shape: { top: 2, half: [6, 7], pattern: { type: 'bands', every: 4, width: 2 } },
    colors: { ...ramp('#b8b0a4', '#d8d0c4', '#f4eee4', '#ffffff'), S: '#d0302c', s: '#8a1a18' },
    flame: 'bright', costumes: ['lamp'],
  },

  // ============================================================== TWISTED
  wick_t: {
    shape: { top: 2, half: [6, 7], cracks: [[6, 4], [7, 5], [7, 6], [12, 10], [11, 11], [11, 12]] },
    colors: { ...ramp('#3a4048', '#525a66', '#6a7480', '#8a94a0'), ...HOLLOW_EYES },
    flame: 'void', costumes: [],
  },
  pip_t: {
    shape: { top: 4, half: [6, 7], base: { from: 11, kind: 'cup' }, topStyle: 'jagged', jag: [0, 1, 0, 0, 2, 0, 1] },
    colors: { ...ramp('#6a7a4a', '#8a9a60', '#a8b87a', '#d0e0a0'), P: '#8a4a2a', p: '#5a2a18', q: '#b8704a', ...RED_EYES },
    flame: 'jade', costumes: [],
  },
  brick_t: {
    shape: { top: 3, half: [8, 8], topStyle: 'jagged', pattern: { type: 'brick' }, cracks: [[6, 8], [7, 9], [7, 10], [8, 11]] },
    colors: { ...ramp('#3a2a28', '#4a3632', '#5e4640', '#7a5e56'), S: '#5e4640', s: '#2a1c1a', ...RED_EYES },
    flame: 'dim', costumes: [],
  },
  vesper_t: {
    shape: { top: 2, half: [5, 6], drips: [[5, 6], [12, 4]] },
    colors: { ...ramp('#2a2430', '#3a3242', '#4a4054', '#6a5e76'), ...GLOW_EYES },
    flame: 'void', costumes: ['veilDark'],
  },
  cinder_t: {
    shape: { top: 4, half: [6, 7], topStyle: 'jagged', jag: [2, 0, 1, 2, 0, 1], cracks: [[5, 8, 'E'], [6, 9, 'E'], [6, 10, 'E'], [12, 7, 'E'], [12, 8, 'E'], [11, 11, 'E'], [10, 12, 'E'], [8, 13, 'E']] },
    colors: { ...ramp('#0a0809', '#141012', '#1e181a', '#2e2428'), E: '#ff9a3a', e: '#ffffff', h: '#ffffff', m: '#ff9a3a' },
    flame: 'hell', costumes: ['hornBroken'],
  },
  pilfer_t: {
    shape: { top: 2, half: [6, 7], pattern: { type: 'bands', every: 5, width: 1 } },
    colors: { ...ramp('#8a6a20', '#b08a30', '#d8b048', '#fff0a0'), S: '#d8b048', s: '#6a5018', ...RED_EYES },
    flame: 'gold', costumes: ['sack', 'mask', 'maskSide', 'maskBack'],
  },
  wisp_t: {
    shape: { top: 2, half: [6, 6], wavy: true },
    colors: { ...ramp('#3a3a4a', '#4a4a5e', '#5e5e74', '#7a7a92') },
    flame: 'void', costumes: ['blindfold'], alpha: 0.6, noFeet: true,
  },
  morrow_t: {
    shape: { top: 2, half: [6, 7], pattern: { type: 'halves' } },
    colors: { ...ramp('#3e4a3a', '#566450', '#6e7e66', '#8e9e84'), S: '#e8d0a0', s: '#a88a5a' },
    flame: 'dim', costumes: [],
  },
  morrow_t2: {   // the dusk form
    shape: { top: 2, half: [6, 7], pattern: { type: 'halves' } },
    colors: { ...ramp('#a88a5a', '#c8aa78', '#e8d0a0', '#fff0d0'), S: '#6e7e66', s: '#3e4a3a', ...RED_EYES },
    flame: 'hell', costumes: [],
  },
  nib_t: {
    shape: { top: 4, half: [4, 5], pattern: { type: 'spiral', every: 5, width: 2 }, cracks: [[6, 9], [7, 10]] },
    colors: { ...ramp('#5a5250', '#7a706c', '#9a908a', '#bab0aa'), S: '#2a1a1e', s: '#140c0e', ...RED_EYES },
    flame: 'void', costumes: [],
  },
  // the shadow of Nub that hunts Nib, Alone
  nub_shadow: {
    shape: { top: 4, half: [4, 5], wavy: true },
    colors: { ...ramp('#08060a', '#100c12', '#18121a', '#241c28'), e: '#ff3020', h: '#ff8060', m: '#ff3020' },
    flame: 'void', costumes: [], alpha: 0.85, noFeet: true,
  },
  prism_t: {
    shape: { top: 2, half: [6, 6], pattern: { type: 'diag', every: 4 }, cracks: [[5, 3], [6, 4], [6, 5], [7, 6], [12, 9], [13, 10]] },
    colors: { ...ramp('#8a3a4a', '#b05a6a', '#d88a98', '#ffd8e0'), S: '#ffd8e0', s: '#8a3a4a' },
    flame: 'rose', costumes: ['lens', 'lensSide'],
  },
  motley_t: {
    shape: { top: 2, half: [6, 7], pattern: { type: 'patch' }, cracks: [[8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13]] },
    colors: { ...ramp('#5a4a3a', '#7a6650', '#9a8468', '#baa486'), S: '#5a3a6a', s: '#3a2448', ...RED_EYES },
    flame: 'rot', costumes: [], randomColors: true,
  },
  sexton_t: {
    shape: { top: 3, half: [6, 7], drips: [[5, 6], [12, 7]], cracks: [[6, 10], [7, 11], [11, 5], [12, 6]] },
    colors: { ...ramp('#a8a08c', '#c8c0aa', '#e4dcc6', '#fff8e8'), ...HOLLOW_EYES },
    flame: 'ghost', costumes: [],
  },
  spill_t: {
    shape: { top: 4, half: [5, 6], topStyle: 'melted', widen: { from: 12, by: 3 }, drips: [[4, 9], [7, 6], [10, 8], [13, 10]] },
    colors: { ...ramp('#2a4a7a', '#3a6a9a', '#5a8aba', '#9ac0e8') },
    flame: 'pale', costumes: [],
  },
  kiln_t: {
    shape: { top: 2, half: [6, 7], base: { from: 8, kind: 'pot' }, cracks: [[6, 10, 'E'], [7, 11, 'E'], [7, 12, 'E'], [11, 9, 'E'], [12, 10, 'E'], [10, 13, 'E']] },
    colors: { ...ramp('#8a7a6a', '#a8988a', '#c8b8a8', '#e8d8c8'), P: '#5a2a1a', p: '#3a1a10', q: '#8a4a30', E: '#ff6a2a', ...RED_EYES },
    flame: 'hell', costumes: [],
  },
  echo_t: {
    shape: { top: 2, half: [6, 6], pattern: { type: 'rings' }, wavy: true },
    colors: { ...ramp('#3a3050', '#4e4268', '#625480', '#8270a0'), S: '#8270a0', s: '#241c34', ...GLOW_EYES },
    flame: 'violet', costumes: ['bellCracked'],
  },
  beacon_t: {
    shape: { top: 2, half: [6, 7], pattern: { type: 'bands', every: 4, width: 2 }, cracks: [[7, 4], [7, 5], [8, 6]] },
    colors: { ...ramp('#4a4440', '#5e5854', '#76706a', '#948e88'), S: '#5a1210', s: '#2a0806', ...HOLLOW_EYES },
    flame: 'dim', costumes: ['lampBroken'],
  },
};

// Motley's patchwork: new colors each run, picked from the run's seed.
export const MOTLEY_SWATCHES = [
  ['#6a9a5a', '#4a6a3a'], ['#c0503a', '#80301e'], ['#5a7ac0', '#34508a'], ['#d8b048', '#8a6a20'],
  ['#a05ab0', '#6a3478'], ['#e8e0c8', '#a8a08a'], ['#3aa0a0', '#206a6a'], ['#e07a9a', '#a04a64'],
];
export const MOTLEY_RAMPS = [
  ramp('#8a6a4a', '#aa8a62', '#caa87e', '#ead0a8'), ramp('#5a6a8a', '#7a8aaa', '#9aaac8', '#c8d4ea'),
  ramp('#7a5a6a', '#9a7a8a', '#ba9aaa', '#e0c4d0'), ramp('#5a7a4a', '#7a9a62', '#9aba80', '#c8e0aa'),
];
