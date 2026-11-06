// Art for the special rooms' props (src/game/specials.js): the spike altar, the die face, beds,
// chests, statues and the ladder hatch. Pack sprites (src/data/packArt.js) where a pack has the
// thing, painted with PixelGrid in our ramps where it doesn't; everything cached.
import { PixelGrid, ramp, light } from '../engine/pixelgrid.js';
import { packSprite } from '../engine/packart.js';
import { RAMP } from '../data/packArt.js';
import { CHESTS } from '../data/chests.js';
import { decorSprite } from './roomdecor.js';

const R = RAMP;
const OUT = '#0a0606';
const cache = new Map();
const cached = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

// The offering altar: a stone altar (pack), a tall iron spike, blood running down both;
// `level` 0..5 grows the stain as you bleed on it.
export function spikeAltar(level) {
  return cached(`spike:${level}`, () => {
    const g = new PixelGrid(34, 52);
    const base = packSprite('altarStone');
    // the spike: a tapering iron blade, bloodier further down
    const blood = 6 + level * 4;
    for (let i = 0; i < 34; i++) {
      const w = Math.max(1, Math.round(4.5 * (1 - i / 34)));
      const y = 38 - i;
      for (let k = -w; k <= w; k++) {
        const bloody = i < blood && (i < blood - 3 || Math.abs(k) < w - 1 || (k + i) % 3 === 0);
        g.set(17 + k, y, bloody ? ramp(R.blood, 0.55 - k / 8 + (i % 4 === 0 ? 0.1 : 0), 17 + k, y) : ramp(R.iron, 0.7 - k / 6, 17 + k, y));
      }
    }
    g.set(17, 4, R.pale[5]);
    g.outline(OUT);
    const c = g.toCanvas(), ctx = c.getContext('2d');
    if (base) ctx.drawImage(base, 17 - base.width / 2, 52 - base.height + 2);
    // blood running down the altar's front
    ctx.fillStyle = R.blood[3];
    for (let i = 0; i < Math.min(6, level + 1); i++) { const x = 9 + i * 3 + (i % 2); ctx.fillRect(x, 38, 2, 3 + ((i * 5) % 4) + level); }
    ctx.fillStyle = R.blood[4];
    ctx.fillRect(12, 37, 10, 2);
    return c;
  });
}

// A big die face carved into the floor stone (3 tiles across), its pips glowing until used.
export function dieFace(face, used) {
  return cached(`die:${face}:${used}`, () => {
    const S = 40, g = new PixelGrid(S, S);
    const stone = used ? R.stone : R.bone;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const edge = Math.min(x, y, S - 1 - x, S - 1 - y);
      if ((x < 3 && y < 3 && x + y < 3) || (x > S - 4 && y < 3 && (S - 1 - x) + y < 3) || (x < 3 && y > S - 4 && x + (S - 1 - y) < 3) || (x > S - 4 && y > S - 4 && (S - 1 - x) + (S - 1 - y) < 3)) continue;   // rounded corners
      const v = edge < 2 ? 0.25 : edge < 4 ? 0.85 : 0.62 + ((x * 7 + y * 13) % 5) * 0.02 - y / S * 0.15;
      g.set(x, y, ramp(stone, v, x, y));
    }
    const a = 10, m = 20, b = 30;
    const layout = { 1: [[m, m]], 2: [[a, a], [b, b]], 3: [[a, a], [m, m], [b, b]], 4: [[a, a], [b, a], [a, b], [b, b]], 5: [[a, a], [b, a], [m, m], [a, b], [b, b]], 6: [[a, a], [b, a], [a, m], [b, m], [a, b], [b, b]] };
    for (const [px, py] of layout[face]) {
      g.ellipse(px, py, 3.6, 3.6, used ? R.void[2] : R.blood[1]);
      g.ellipse(px - 0.5, py - 0.5, 2.4, 2.4, used ? R.void[3] : R.blood[3]);
      if (!used) g.set(px - 1, py - 1, R.blood[5]);
    }
    return g.outline(OUT).toCanvas();
  });
}

// A bed: the carved frame (decor builder), a pillow and a blanket; a sick one is stained.
export function bed(dirty, used) {
  return cached(`bed:${dirty}:${used}`, () => {
    const frame = decorSprite('bedFrame');
    const g = new PixelGrid(frame.width, frame.height);
    const sheet = dirty ? R.rot : R.flesh, pil = dirty ? R.wax : R.pale;
    g.ellipse(18, 8, 11, 4, (nx, ny, x, y) => ramp(pil, light(nx, ny) * 0.9 + 0.1, x, y));
    const top = used ? 15 : 12;
    for (let y = top; y < 27; y++) for (let x = 4; x < 32; x++) {
      const fold = Math.sin(x * 0.7 + y * 0.3) * 0.15;
      g.set(x, y, ramp(sheet, 0.62 + fold - (y - top) / 40 + (y === top ? 0.25 : 0), x, y));
    }
    for (let x = 4; x < 32; x += 4) g.set(x, top, sheet[5]);
    if (dirty) for (const [x, y, r] of [[10, 18, 2.5], [24, 22, 2], [17, 25, 1.5]]) g.ellipse(x, y, r, r * 0.8, R.rot[1]);
    const c = g.toCanvas(), ctx = c.getContext('2d');
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(frame, 0, 0);
    return c;
  });
}

// Chests (src/data/chests.js): each type in its own pack recolor, closed or open.
export function chest(type, open) {
  const art = (CHESTS[type] || CHESTS.wood).art;
  return cached(`chest:${type}:${open}`, () => packSprite(art[open ? 1 : 0]));
}

// The deal rooms' statues: a wax idol in The Bargain, a winged sentinel in The Vigil.
export function statue(type) {
  return cached(`statue:${type}`, () => packSprite(type === 'angel' ? 'statueAngel' : 'statueDevil'));
}

// A ladder down into the dark through a wooden hatch.
export function hatch() {
  return cached('hatch', () => {
    const g = new PixelGrid(24, 20);
    g.rect(0, 0, 24, 20, R.wood[2]);
    g.rect(1, 1, 22, 18, R.wood[3]); g.rect(1, 1, 22, 1, R.wood[4]);
    g.rect(3, 3, 18, 15, R.void[0]);
    for (let y = 3; y < 18; y++) g.set(3, y, R.void[2]);
    // the ladder fading into the dark
    for (const x of [7, 16]) for (let y = 3; y < 18; y++) g.set(x, y, ramp(R.wood, 0.75 - (y - 3) / 18, x, y));
    for (let y = 5; y < 18; y += 3) for (let x = 8; x < 16; x++) g.set(x, y, ramp(R.wood, 0.6 - (y - 3) / 20, x, y));
    for (const [x, y] of [[1, 1], [22, 1], [1, 18], [22, 18]]) g.set(x, y, R.iron[4]);
    return g.outline(OUT).toCanvas();
  });
}
