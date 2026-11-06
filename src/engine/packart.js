// Sprites built from the free asset packs (see CREDITS.md): the PNGs in assets/sprites/ are
// loaded once at startup and turned into the game's look: every pixel is sorted by its hue into a
// color group, and each group is repainted with one of our dark palette ramps by brightness. Then
// the pack's soft drop shadows are dropped and a dark outline is added, like the rest of the game.
//
// What is built from what lives in src/data/packArt.js. Code asks for a finished sprite with
// packSprite(key) and gets a canvas, or null when that file is missing (callers then fall back to
// their hand-drawn art), so the game still runs without the assets folder.
import { makeCanvas } from './sprites.js';
import { PACK_ART } from '../data/packArt.js';

const images = new Map();     // file -> HTMLImageElement (or null when it failed to load)
const built = new Map();      // key -> canvas | null

function loadImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = new URL(`../../assets/sprites/${file}`, import.meta.url).href;
  });
}

// Load every file the registry uses. Resolves even when files are missing.
export async function loadPackArt() {
  const files = new Set();
  for (const def of Object.values(PACK_ART)) for (const l of layersOf(def)) if (l.src) files.add(l.src);
  await Promise.all([...files].map(async (f) => images.set(f, await loadImage(f))));
}

const layersOf = (def) => def.layers || [def];

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Which color group a pixel belongs to.
function groupOf(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 510, d = (max - min) / 255;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1) + 1e-6);
  if (s < 0.2 || d < 0.08) return 'gray';
  let h;
  if (max === r) h = ((g - b) / (max - min) + 6) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  h *= 60;
  if (h < 15 || h >= 330) return 'red';
  if (h < 42) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 165) return 'green';
  if (h < 200) return 'cyan';
  if (h < 260) return 'blue';
  return 'purple';
}

const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// One layer: crop, scale, recolor. Returns a canvas.
function buildLayer(l) {
  const img = l.src ? images.get(l.src) : null;
  if (l.src && !img) return null;
  const [sx, sy, sw, sh] = l.crop || [0, 0, img.width, img.height];
  const sc = l.scale || 1;
  const w = Math.max(1, Math.round(sw * sc)), h = Math.max(1, Math.round(sh * sc));
  const [c, ctx] = makeCanvas(w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  // drop the packs' soft shadows (translucent dark pixels)
  if (l.shadow !== true) for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 200) d[i + 3] = 0;
  if (l.erase) for (const [ex, ey, ew, eh] of l.erase) for (let y = ey; y < ey + eh; y++) for (let x = ex; x < ex + ew; x++) if (x >= 0 && y >= 0 && x < w && y < h) d[(y * w + x) * 4 + 3] = 0;
  if (l.map) recolor(d, l);
  if (l.fill) {
    const [r, g, b] = hexRgb(l.fill);
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

// Repaint each color group with its ramp (dark -> light), spreading the group's own range of
// brightness over the whole ramp so the result keeps its shading.
//   map: { gray: RAMP, red: RAMP, ..., other: RAMP }   a group without a ramp uses `other`, or
//        keeps its color (darkened by `dim`) when there's no `other` either
//   gamma: < 1 brightens, > 1 darkens the spread
function recolor(d, l) {
  const groups = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const g = groupOf(d[i], d[i + 1], d[i + 2]);
    let s = groups.get(g);
    if (!s) groups.set(g, (s = { lo: 1, hi: 0, px: [] }));
    const v = lum(d[i], d[i + 1], d[i + 2]);
    s.lo = Math.min(s.lo, v); s.hi = Math.max(s.hi, v);
    s.px.push(i, v);
  }
  const gamma = l.gamma || 1;
  for (const [g, s] of groups) {
    const ramp = l.map[g] || l.map.other;
    if (!ramp) {
      const k = l.dim ?? 0.75;
      for (let j = 0; j < s.px.length; j += 2) { const i = s.px[j]; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
      continue;
    }
    const rgb = ramp.map(hexRgb), n = rgb.length;
    const span = Math.max(0.08, s.hi - s.lo);
    for (let j = 0; j < s.px.length; j += 2) {
      const i = s.px[j];
      let t = Math.max(0, Math.min(1, (s.px[j + 1] - s.lo) / span));
      t = Math.pow(t, gamma);
      const c = rgb[Math.min(n - 1, Math.floor(t * n))];
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
  }
}

// A dark 1px outline around everything opaque (on a canvas 2px bigger), like our own sprites.
function outline(src, color) {
  const w = src.width + 2, h = src.height + 2;
  const [c, ctx] = makeCanvas(w, h);
  ctx.drawImage(src, 1, 1);
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const [r, g, b] = hexRgb(color);
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (solid(x, y)) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) add.push((y * w + x) * 4);
  }
  for (const i of add) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
  ctx.putImageData(id, 0, 0);
  return c;
}

function build(key) {
  const def = PACK_ART[key];
  if (!def) return null;
  const layers = layersOf(def).map((l) => ({ l, c: buildLayer(l) }));
  if (layers.some((x) => x.l.src && !x.c)) return null;
  const w = def.w || layers[0].c.width, h = def.h || layers[0].c.height;
  let [c, ctx] = makeCanvas(w, h);
  for (const { l, c: lc } of layers) {
    ctx.save();
    if (l.flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    if (l.alpha) ctx.globalAlpha = l.alpha;
    ctx.drawImage(lc, l.x || 0, l.y || 0);
    ctx.restore();
  }
  if (def.paint) def.paint(ctx, w, h);
  if (def.outline !== false) c = outline(c, def.outline || '#0a0606');
  return c;
}

// The finished sprite for a registry key (a canvas), or null if its files are missing.
export function packSprite(key) {
  if (!built.has(key)) built.set(key, build(key));
  return built.get(key);
}

// All frames of an animated entry: keys `${key}:0`, `${key}:1`... (see `frames` in packArt.js).
export function packFrames(key) {
  const out = [];
  for (let i = 0; packSprite(`${key}:${i}`); i++) out.push(packSprite(`${key}:${i}`));
  return out;
}
