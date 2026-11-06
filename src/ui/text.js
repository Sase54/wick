// Original 5x7 bitmap font, drawn from cached per-color atlases.
import { makeCanvas, scale2x } from '../engine/sprites.js';

const GLYPHS = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  1: '.#.|##.|.#.|.#.|.#.|.#.|###',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '..##.|.#...|#....|####.|#...#|#...#|.###.',
  7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '.': '.|.|.|.|.|.|#',
  ',': '..|..|..|..|..|.#|#.',
  '!': '#|#|#|#|#|.|#',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  ':': '.|#|.|.|.|#|.',
  ';': '..|.#|..|..|..|.#|#.',
  "'": '#|#|.|.|.|.|.',
  '"': '#.#|#.#|...|...|...|...|...',
  '-': '...|...|...|###|...|...|...',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '=': '....|....|####|....|####|....|....',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  '(': '.#|#.|#.|#.|#.|#.|.#',
  ')': '#.|.#|.#|.#|.#|.#|#.',
  '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##',
  '<': '...#|..#.|.#..|#...|.#..|..#.|...#',
  '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
  '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
  '#': '.#.#.|#####|.#.#.|.#.#.|.#.#.|#####|.#.#.',
  '_': '.....|.....|.....|.....|.....|.....|#####',
  '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
  '^': '..#..|.#.#.|#...#|.....|.....|.....|.....',
};
const GLYPH_H = 7;
const SPACE_W = 3;
export const LINE_H = 9;

let layout = null;   // char -> { x, w }
let base = null;     // white atlas
const atlases = new Map();

function buildBase() {
  layout = {};
  const entries = Object.entries(GLYPHS).map(([ch, s]) => [ch, s.split('|')]);
  let x = 0;
  for (const [ch, rows] of entries) {
    const w = rows[0].length;
    layout[ch] = { x, w };
    x += w + 1;
  }
  const [c, ctx] = makeCanvas(x, GLYPH_H);
  ctx.fillStyle = '#fff';
  for (const [ch, rows] of entries) {
    const gx = layout[ch].x;
    rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(gx + i, y, 1, 1);
    });
  }
  base = c;
}

function atlasFor(color) {
  if (!base) buildBase();
  let a = atlases.get(color);
  if (!a) {
    const [c, ctx] = makeCanvas(base.width, base.height);
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
    atlases.set(color, c);
    a = c;
  }
  return a;
}

// Double-size text uses a Scale2x-smoothed atlas so big letters have rounded edges.
const smoothAtlases = new Map();
function smoothAtlasFor(color) {
  let a = smoothAtlases.get(color);
  if (!a) {
    a = scale2x(atlasFor(color));
    smoothAtlases.set(color, a);
  }
  return a;
}

function glyph(ch) {
  if (!layout) buildBase();
  return layout[ch] || layout['?'];
}

export function measureText(str, scale = 1) {
  if (!layout) buildBase();
  let w = 0;
  const s = String(str).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    w += (s[i] === ' ' ? SPACE_W : glyph(s[i]).w) + 1;
  }
  return Math.max(0, w - 1) * scale;
}

// opts: { color, align: 'left'|'center'|'right', scale, shadow: color|false }
export function drawText(ctx, str, x, y, opts = {}) {
  const { color = '#e8d9b0', align = 'left', scale = 1, shadow = '#0b0807' } = opts;
  const s = String(str).toUpperCase();
  const w = measureText(s, scale);
  let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  const cy = Math.round(y);
  const pick = scale === 2 ? smoothAtlasFor : atlasFor;
  if (shadow) drawRun(ctx, s, cx + (scale === 2 ? 1 : scale), cy + (scale === 2 ? 1 : scale), pick(shadow), scale);
  drawRun(ctx, s, cx, cy, pick(color), scale);
  return w;
}

function drawRun(ctx, s, x, y, atlas, scale) {
  const smooth = scale === 2; // atlas is already doubled
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === ' ') { x += (SPACE_W + 1) * scale; continue; }
    const g = glyph(ch);
    if (smooth) ctx.drawImage(atlas, g.x * 2, 0, g.w * 2, GLYPH_H * 2, x, y, g.w * 2, GLYPH_H * 2);
    else ctx.drawImage(atlas, g.x, 0, g.w, GLYPH_H, x, y, g.w * scale, GLYPH_H * scale);
    x += (g.w + 1) * scale;
  }
}

// Greedy word wrap to a pixel width.
export function wrapText(str, maxWidth, scale = 1) {
  const words = String(str).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (measureText(test, scale) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
