// Decor of the special rooms: what makes a library look like a library and The Bargain like a
// place you shouldn't be. Each room type's decor is data (src/data/roomDecor.js); this file paints
// it. Still things are painted once into the room's background; things that move (fire, candle
// flames, blinking bulbs, fountains) go into room.decor and are drawn every frame right after
// the background, under everything else.
//
// Sprites come from the asset packs (src/data/packArt.js) where a pack has the thing, and from the
// builders below where none does (bookshelves, beds, rugs, a telescope...), drawn in the same
// style: shaded with our palette ramps and outlined.
import { PixelGrid, ramp } from '../engine/pixelgrid.js';
import { makeCanvas } from '../engine/sprites.js';
import { packSprite, packFrames } from '../engine/packart.js';
import { RAMP } from '../data/packArt.js';
import { ROOM_DECOR } from '../data/roomDecor.js';
import { RNG } from '../engine/rng.js';
import { TILE } from './constants.js';

const OUTLINE = '#0a0606';
const R = RAMP;

// ---------------------------------------------------------------------------
// Builders: sprites no pack has. Each returns a canvas (or an array of frames).
const BUILDERS = {
  // a tall bookcase packed with worn spines; the top shelf holds a skull and a candle stub
  bookshelf() {
    const W = 30, H = 30, g = new PixelGrid(W, H);
    const rng = new RNG('shelf');
    g.rect(0, 2, W, H - 2, R.wood[1]);
    g.rect(1, 3, W - 2, H - 4, R.wood[0]);
    for (const y of [10, 19, 28]) { g.rect(0, y, W, 2, R.wood[3]); g.rect(0, y + 1, W, 1, R.wood[2]); }
    g.rect(0, 2, 2, H - 2, R.wood[3]); g.rect(W - 2, 2, 2, H - 2, R.wood[2]);
    g.rect(0, 0, W, 3, R.wood[4]); g.rect(0, 2, W, 1, R.wood[2]);
    const spines = [R.blood, R.ink, R.rot, R.wood, R.soul, R.bone, R.flesh];
    for (const [top, bot] of [[12, 19], [21, 28]]) {
      for (let x = 2; x < W - 2;) {
        const w = rng.int(2, 3), h = rng.int(6, bot - top), col = rng.pick(spines);
        if (rng.chance(0.12)) { x += 2; continue; }   // a gap
        const lean = rng.chance(0.1) && x < W - 6;
        for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) g.set(x + i + (lean ? Math.floor(j / 4) : 0), bot - 1 - j, col[i === 0 ? 3 : 2]);
        g.set(x, bot - h + 1, col[4]);
        if (h > 6) g.rect(x, bot - h + 3, w, 1, R.gold[3]);
        x += w + (lean ? 2 : 0);
      }
    }
    // the top shelf: a few books lying flat, a skull, a stub of candle
    g.rect(3, 6, 9, 2, R.ink[3]); g.rect(4, 4, 8, 2, R.blood[3]); g.rect(3, 8, 10, 2, R.wood[3]);
    g.ellipse(19, 6, 3.5, 3.2, (nx, ny, x, y) => ramp(R.bone, 0.75 - ny * 0.3 - nx * 0.2, x, y));
    g.set(18, 6, R.void[0]); g.set(20, 6, R.void[0]); g.rect(18, 8, 3, 1, R.bone[2]);
    g.rect(25, 4, 2, 6, R.wax[4]); g.set(25, 4, R.wax[5]);
    return g.outline(OUTLINE).toCanvas();
  },
  // three candles of different heights on a little iron stand; two frames of flame
  candles() {
    return [0, 1].map((f) => {
      const g = new PixelGrid(16, 22);
      g.rect(2, 19, 12, 2, R.iron[2]); g.rect(3, 18, 10, 1, R.iron[3]); g.rect(7, 16, 2, 3, R.iron[2]);
      for (const [x, h] of [[3, 7], [7, 11], [11, 5]]) {
        g.rect(x, 18 - h, 2, h, R.wax[4]); g.set(x, 18 - h, R.wax[5]); g.set(x + 1, 18 - h + 2, R.wax[3]);
        g.set(x + 1, 17, R.wax[2]);
        const fl = (f + x) % 2;
        g.set(x, 16 - h - fl, R.ember[5]); g.set(x, 17 - h, R.ember[4]); g.set(x + 1, 17 - h, R.ember[3]);
        if (fl) g.set(x, 15 - h, R.ember[4]);
      }
      return g.outline(OUTLINE).toCanvas();
    });
  },
  // a heavy bed: carved posts, a pillow and a blanket (the Bed prop draws itself on top of this)
  bedFrame() {
    const g = new PixelGrid(34, 30);
    g.rect(1, 2, 32, 26, R.wood[2]); g.rect(2, 3, 30, 24, R.wood[1]);
    g.rect(0, 0, 4, 30, R.wood[3]); g.rect(30, 0, 4, 30, R.wood[3]);
    g.rect(1, 0, 2, 1, R.wood[5]); g.rect(31, 0, 2, 1, R.wood[5]);
    g.rect(4, 1, 26, 3, R.wood[4]); g.rect(4, 3, 26, 1, R.wood[2]);
    g.rect(4, 25, 26, 3, R.wood[3]);
    return g.outline(OUTLINE).toCanvas();
  },
  // a brass telescope on a tripod, pointed up at nothing
  telescope() {
    const g = new PixelGrid(26, 34);
    g.line(13, 18, 5, 33, R.wood[2]); g.line(13, 18, 21, 33, R.wood[2]); g.line(13, 18, 13, 33, R.wood[3]);
    g.line(14, 18, 6, 33, R.wood[1]);
    for (let i = 0; i < 18; i++) {
      const x = 4 + i, y = 18 - i * 0.85, r = 2 + (i < 5 ? 1 : 0);
      for (let k = -r; k <= r; k++) g.set(x + k * 0.3, y + k, ramp(R.gold, 0.7 - k * 0.15, x, y + k));
    }
    g.rect(2, 16, 4, 6, R.gold[2]); g.rect(20, 0, 5, 4, R.gold[4]); g.set(22, 1, R.soul[5]);
    return g.outline(OUTLINE).toCanvas();
  },
  // a shop counter: dark planks, a brass edge, a ledger and a bell
  counter() {
    const g = new PixelGrid(44, 16);
    g.rect(0, 3, 44, 13, R.wood[2]); g.rect(0, 2, 44, 2, R.gold[3]); g.rect(0, 2, 44, 1, R.gold[4]);
    for (let x = 4; x < 44; x += 8) g.rect(x, 5, 1, 11, R.wood[1]);
    g.rect(0, 14, 44, 2, R.wood[0]);
    g.rect(6, 0, 7, 2, R.bone[4]); g.rect(9, 0, 1, 2, R.blood[3]);
    g.ellipse(34, 1, 2.5, 2, R.gold[4]); g.set(34, -1, R.gold[5]);
    return g.outline(OUTLINE).toCanvas();
  },
  // a string of bulbs: two frames that blink in turn
  bulbs() {
    return [0, 1].map((f) => {
      const g = new PixelGrid(64, 8);
      for (let x = 0; x < 64; x++) g.set(x, 2 + Math.round(Math.sin((x / 64) * Math.PI) * 3), R.iron[1]);
      for (let i = 0; i < 8; i++) {
        const x = 4 + i * 8, y = 3 + Math.round(Math.sin((x / 64) * Math.PI) * 3);
        const on = (i + f) % 2 === 0, col = [R.ember, R.blood, R.soul, R.gold][i % 4];
        g.rect(x, y, 2, 3, on ? col[5] : col[1]);
        g.set(x, y, R.iron[3]);
      }
      return g.toCanvas();
    });
  },
  // a pile of skulls and bones
  skullPile() {
    const g = new PixelGrid(26, 16), rng = new RNG('skulls');
    for (let i = 0; i < 6; i++) g.line(rng.int(1, 24), rng.int(9, 15), rng.int(1, 24), rng.int(9, 15), R.bone[3]);
    for (const [x, y] of [[6, 10], [13, 8], [20, 11], [10, 12], [17, 13]]) {
      g.ellipse(x, y, 3.2, 3, (nx, ny, px, py) => ramp(R.bone, 0.75 - ny * 0.3 - nx * 0.2, px, py));
      g.set(x - 1, y, R.void[0]); g.set(x + 1, y, R.void[0]); g.set(x, y + 2, R.bone[1]);
    }
    return g.outline(OUTLINE).toCanvas();
  },
  // a cradle on rockers, the blanket pulled up
  cradle() {
    const g = new PixelGrid(26, 20);
    g.line(1, 17, 25, 17, R.wood[3]); g.line(2, 18, 24, 18, R.wood[2]);
    g.rect(3, 6, 20, 10, R.wood[2]); g.rect(4, 7, 18, 8, R.wood[1]);
    for (let x = 5; x < 22; x += 3) g.rect(x, 7, 1, 8, R.wood[3]);
    g.rect(3, 4, 20, 2, R.wood[4]);
    g.rect(5, 5, 16, 3, R.flesh[4]); g.rect(5, 5, 16, 1, R.flesh[5]);
    return g.outline(OUTLINE).toCanvas();
  },
  // a rusty bucket with something dark sloshing in it (the sickroom)
  bucket() {
    const g = new PixelGrid(12, 12);
    g.poly([[1, 3], [11, 3], [10, 11], [2, 11]], (x, y) => ramp(R.iron, 0.7 - x / 14, x, y));
    g.rect(2, 3, 8, 2, R.rot[2]); g.rect(3, 3, 3, 1, R.rot[4]);
    g.line(1, 3, 6, 0, R.iron[3]); g.line(6, 0, 11, 3, R.iron[3]);
    return g.outline(OUTLINE).toCanvas();
  },
  // iron chains hanging down a wall
  chains() {
    const g = new PixelGrid(10, 22);
    for (const x of [2, 7]) for (let y = 0; y < 20 - x; y += 3) { g.rect(x, y, 2, 2, R.iron[3]); g.set(x, y, R.iron[4]); g.set(x + 1, y + 2, R.iron[1]); }
    return g.outline(OUTLINE).toCanvas();
  },
  // a hanging iron cage (the strongroom, the lair)
  cage() {
    const g = new PixelGrid(16, 24);
    g.line(8, 0, 8, 4, R.iron[3]);
    g.ellipse(8, 6, 6, 2, R.iron[3]);
    for (let x = 2; x <= 14; x += 3) g.line(x, 6, x, 21, R.iron[x < 8 ? 4 : 2]);
    g.rect(2, 21, 13, 2, R.iron[2]);
    g.ellipse(7, 18, 2.5, 2, R.bone[3]); g.set(6, 18, R.void[0]);
    return g.outline(OUTLINE).toCanvas();
  },
  // stacked dice (the gambler's den)
  diceStack() {
    const g = new PixelGrid(18, 18);
    const die = (x, y, s, pips) => {
      g.rect(x, y, s, s, R.bone[4]); g.rect(x, y + s - 2, s, 2, R.bone[2]); g.rect(x, y, s, 1, R.bone[5]);
      for (const [px, py] of pips) g.set(x + px, y + py, R.blood[2]);
    };
    die(1, 8, 8, [[2, 2], [5, 5], [2, 5], [5, 2]]);
    die(9, 9, 8, [[4, 3]]);
    die(5, 1, 8, [[2, 2], [4, 3], [5, 5]]);
    return g.outline(OUTLINE).toCanvas();
  },
  // a tall wax pillar with drips (the vigil, the procession)
  pillar() {
    const g = new PixelGrid(14, 40);
    g.rect(1, 36, 12, 4, R.pale[2]); g.rect(0, 0, 14, 4, R.pale[3]);
    for (let y = 4; y < 36; y++) for (let x = 2; x < 12; x++) g.set(x, y, ramp(R.pale, 0.85 - (x - 2) / 12 + (x % 3 === 0 ? -0.1 : 0), x, y));
    for (const [x, l] of [[3, 6], [7, 10], [10, 4]]) g.rect(x, 4, 1, l, R.pale[5]);
    return g.outline(OUTLINE).toCanvas();
  },
};

const built = new Map();
// A decor sprite (or an array of frames): a builder above, else the pack sprite of that name.
export function decorSprite(key) {
  if (!built.has(key)) {
    let s = BUILDERS[key]?.() || null;
    if (!s) { const fr = packFrames(key); s = fr.length ? fr : packSprite(key); }
    built.set(key, s);
  }
  return built.get(key);
}

// ---------------------------------------------------------------------------
// Floor painters: (ctx, room, rng, opts) paint over the floor of the background.
const floorBox = (room) => ({ x0: room.x0, y0: room.y0, x1: room.R, y1: room.B, cx: room.centerX, cy: room.centerY });

function eachFloorPixel(room, fn) {
  const { x0, y0, x1, y1 } = floorBox(room);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (room.isWall(Math.floor((x - x0) / TILE), Math.floor((y - y0) / TILE))) continue;
    fn(x, y);
  }
}

const FLOORS = {
  // a woven rug with a border and fringe, centered (w, h in pixels)
  rug(ctx, room, rng, { w = 140, h = 80, col = R.blood, trim = R.gold }) {
    const { cx, cy } = floorBox(room);
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      let c;
      if (edge < 2) c = col[1];
      else if (edge < 4) c = trim[2 + ((x + y) % 2)];
      else if (edge < 6) c = col[2];
      else {
        // a diamond lattice in the middle
        const dx = Math.abs(x - w / 2), dy = Math.abs(y - h / 2);
        const d = (dx / (w / 2) + dy / (h / 2));
        c = (Math.floor((x + y) / 6) + Math.floor((x - y + 200) / 6)) % 2 ? col[3] : col[2];
        if (Math.abs(d - 0.55) < 0.04 || d < 0.12) c = trim[3];
      }
      ctx.fillStyle = c; ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
    ctx.fillStyle = trim[4];
    for (let x = 1; x < w; x += 3) { ctx.fillRect(x0 + x, y0 - 2, 1, 2); ctx.fillRect(x0 + x, y0 + h, 1, 2); }
  },
  // the arcade carpet: a pack tile repeated over the whole floor
  tiles(ctx, room, rng, { key = 'carpet', alpha = 0.9 }) {
    const t = packSprite(key);
    if (!t) return;
    const { x0, y0, x1, y1 } = floorBox(room);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    ctx.globalAlpha = alpha;
    for (let y = y0; y < y1; y += t.height) for (let x = x0; x < x1; x += t.width) ctx.drawImage(t, x, y);
    ctx.restore();
  },
  // night sky: deep blue with stars, a few bright ones with crosses, a band of dust
  stars(ctx, room, rng) {
    const { x0, y0, x1, y1 } = floorBox(room);
    eachFloorPixel(room, (x, y) => {
      const band = Math.exp(-(((y - y0) - (x - x0) * 0.35 - 30) ** 2) / 900);
      const v = 0.18 + band * 0.25 + rng.next() * 0.08;
      ctx.fillStyle = ramp(R.soul, v, x, y); ctx.fillRect(x, y, 1, 1);
    });
    for (let i = 0; i < 160; i++) {
      const x = rng.int(x0, x1 - 1), y = rng.int(y0, y1 - 1);
      ctx.fillStyle = rng.pick([R.pale[5], R.pale[4], R.soul[5], R.gold[5]]);
      ctx.fillRect(x, y, 1, 1);
      if (rng.chance(0.08)) { ctx.globalAlpha = 0.6; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); ctx.globalAlpha = 1; }
    }
    const sw = packSprite('starSwirl');
    if (sw) { ctx.globalAlpha = 0.85; ctx.drawImage(sw, room.centerX - sw.width, room.centerY - sw.height, sw.width * 2, sw.height * 2); ctx.globalAlpha = 1; }
  },
  // polished checkered tiles (col1 / col2 ramps), with a thin seam
  checker(ctx, room, rng, { a = R.pale, b = R.stone, size = 24, hi = 3, low = 0.45 }) {
    const { x0, y0 } = floorBox(room);
    eachFloorPixel(room, (x, y) => {
      const lx = x - x0, ly = y - y0;
      const odd = (Math.floor(lx / size) + Math.floor(ly / size)) % 2;
      const seam = lx % size === 0 || ly % size === 0;
      const v = (odd ? low : 0.75) + (rng.next() - 0.5) * 0.12 - (seam ? 0.3 : 0);
      ctx.fillStyle = ramp(odd ? b : a, v * (hi / 4), x, y); ctx.fillRect(x, y, 1, 1);
    });
  },
  // green baize with a worn gold border (the gambler's den)
  felt(ctx, room, rng) {
    const { x0, y0, x1, y1 } = floorBox(room);
    const felt = ['#08140c', '#0e2214', '#14301c', '#1c4026', '#265230'];
    eachFloorPixel(room, (x, y) => {
      const edge = Math.min(x - x0, y - y0, x1 - 1 - x, y1 - 1 - y);
      ctx.fillStyle = edge < 3 ? R.gold[1 + (edge % 2)] : ramp(felt, 0.45 + (rng.next() - 0.5) * 0.3 - Math.max(0, 8 - edge) * 0.03, x, y);
      ctx.fillRect(x, y, 1, 1);
    });
  },
  // a dark pool of old blood in the middle, splashes around it
  blood(ctx, room, rng, { r = 46 }) {
    const { cx, cy } = floorBox(room);
    for (let y = -r; y <= r; y++) for (let x = -r * 1.6; x <= r * 1.6; x++) {
      const d = Math.hypot(x / 1.6, y) / r + (rng.next() - 0.5) * 0.25;
      if (d > 1) continue;
      ctx.fillStyle = ramp(R.blood, 0.55 - d * 0.5, cx + x, cy + y);
      ctx.globalAlpha = Math.min(1, (1 - d) * 2.2);
      ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 26; i++) {
      const a = rng.next() * Math.PI * 2, d = r * (1.1 + rng.next() * 0.9);
      ctx.fillStyle = R.blood[rng.int(1, 3)];
      ctx.fillRect(Math.round(cx + Math.cos(a) * d * 1.6), Math.round(cy + Math.sin(a) * d), rng.int(1, 3), rng.int(1, 2));
    }
  },
  // a pack decal stamped in the middle, scaled up (pentagram, sigils)
  decal(ctx, room, rng, { key, scale = 2, alpha = 0.8, dy = 0 }) {
    const s = packSprite(key);
    if (!s) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(s, Math.round(room.centerX - (s.width * scale) / 2), Math.round(room.centerY - (s.height * scale) / 2 + dy), s.width * scale, s.height * scale);
    ctx.globalAlpha = 1;
  },
  // a ring of chalk sigils around the middle (the challenge rooms)
  ring(ctx, room, rng, { r = 54, col = R.bone, glyphs = 12 }) {
    const { cx, cy } = floorBox(room);
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      for (const rr of [r, r - 6]) { ctx.fillStyle = col[2]; ctx.fillRect(Math.round(cx + Math.cos(a) * rr * 1.5), Math.round(cy + Math.sin(a) * rr * 0.9), 1, 1); }
    }
    for (let i = 0; i < glyphs; i++) {
      const a = (i / glyphs) * Math.PI * 2, x = Math.round(cx + Math.cos(a) * (r - 3) * 1.5), y = Math.round(cy + Math.sin(a) * (r - 3) * 0.9);
      ctx.fillStyle = col[4];
      ctx.fillRect(x - 1, y - 1, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
    }
  },
  // a pentagram drawn on the floor in old blood: a double ring and a five-point star
  pentagram(ctx, room, rng, { r = 40, col = R.blood, alpha = 0.9 }) {
    const { cx, cy } = floorBox(room);
    const sy = 0.78;   // seen from above at a slant
    ctx.globalAlpha = alpha;
    const dot = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
    for (let a = 0; a < Math.PI * 2; a += 0.6 / r) {
      dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy, col[3]);
      dot(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4) * sy, col[2]);
      if (rng.chance(0.04)) dot(cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 2) * sy, col[1]);
    }
    const pts = [0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); return [cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4) * sy]; });
    for (let i = 0; i < 5; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 2) % 5];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let k = 0; k <= n; k++) dot(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, k % 7 === 0 ? col[4] : col[3]);
    }
    // a few candle-wax drips at the points
    for (const [x, y] of pts) { dot(x, y, R.wax[5]); dot(x + 1, y, R.wax[4]); }
    ctx.globalAlpha = 1;
  },
  // gold-inlaid flagstones (the strongroom)
  vaultTiles(ctx, room, rng) {
    const { x0, y0 } = floorBox(room);
    eachFloorPixel(room, (x, y) => {
      const lx = (x - x0) % 24, ly = (y - y0) % 24;
      if (lx === 0 || ly === 0) { ctx.fillStyle = R.gold[(lx + ly) % 4 === 0 ? 3 : 1]; ctx.fillRect(x, y, 1, 1); }
      else if ((lx === 12 && Math.abs(ly - 12) < 3) || (ly === 12 && Math.abs(lx - 12) < 3)) { ctx.fillStyle = R.gold[2]; ctx.fillRect(x, y, 1, 1); }
    });
  },
};

// ---------------------------------------------------------------------------
// Placing decor sprites
function drawAt(ctx, s, x, y, flip = false) {
  // (x, y) is the sprite's bottom middle
  ctx.save();
  if (flip) { ctx.translate(Math.round(x) * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height));
  ctx.restore();
}

// Where a placement goes: along the top wall at fractions of the width, or at named spots.
function spots(room, at) {
  const { x0, y0, x1, y1 } = floorBox(room);
  const W = x1 - x0;
  const named = {
    tl: [x0 + 18, y0 + 14], tr: [x1 - 18, y0 + 14], bl: [x0 + 18, y1 - 4], br: [x1 - 18, y1 - 4],
    tl2: [x0 + 50, y0 + 10], tr2: [x1 - 50, y0 + 10],
    center: [room.centerX, room.centerY], top: [room.centerX, y0 + 8],
  };
  return at.map((a) => (typeof a === 'number' ? [x0 + W * a, y0 + 6] : named[a] || [room.centerX, room.centerY]));
}

// near a door in the top wall?
const nearDoor = (room, x) => room.slots.some((s) => s.door && s.dir === 'up' && Math.abs(s.x - x) < 30);

// Paint a room type's decor (called once when the room is built).
export function decorateRoom(ctx, room, type) {
  const def = ROOM_DECOR[type];
  room.decor = [];
  if (!def) return;
  const rng = new RNG(`decor:${type}:${room.x0}:${room.cols}:${room.rows}`);
  // the top wall: a pack texture laid over its face
  if (def.wallTile) {
    const t = packSprite(def.wallTile);
    if (t) {
      ctx.save();
      ctx.globalAlpha = def.wallAlpha ?? 0.55;
      ctx.beginPath(); ctx.rect(room.x0, room.y0 - 22, room.R - room.x0, 20); ctx.clip();
      for (let x = room.x0; x < room.R; x += t.width) ctx.drawImage(t, x, room.y0 - 22 - (t.height - 20) / 2);
      ctx.restore();
    }
  }
  for (const [name, opts = {}] of def.floor || []) FLOORS[name]?.(ctx, room, rng, opts);
  for (const p of def.place || []) {
    const s = decorSprite(p.key);
    if (!s) continue;
    for (const [i, [x, y]] of spots(room, p.at).entries()) {
      if (typeof p.at[i] === 'number' && nearDoor(room, x)) continue;
      // things standing on the floor keep off rocks, spikes and pits
      if (typeof p.at[i] !== 'number' && room.get(room.colAt(x), room.rowAt(y - 2)) !== 0) continue;
      const px = x + (p.dx || 0), py = y + (p.dy || 0), flip = p.mirror && x > room.centerX;
      if (Array.isArray(s)) room.decor.push({ frames: s, x: px, y: py, fps: p.fps || 6, flip, t: rng.next() * 3 });
      else drawAt(ctx, s, px, py, flip);
      if (p.light) room.lights.push({ x: px, y: py - (p.lightY ?? s.height ?? 16) * 0.7, r: p.light[0], color: p.light[1] });
    }
  }
}

// The moving decor, drawn every frame just after the room's background.
export function drawRoomDecor(ctx, room, time, ox, oy) {
  for (const d of room.decor || []) {
    const f = d.frames[Math.floor((time + d.t) * d.fps) % d.frames.length];
    drawAt(ctx, f, d.x + ox, d.y + oy, d.flip);
  }
}
