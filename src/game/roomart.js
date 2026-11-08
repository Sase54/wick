// Procedural pixel art for rooms: floor, walls, decorations and tiles, painted from a variant's
// "look" (src/data/variants.js). Generated once per room into offscreen canvases, so drawing a
// room each frame is one drawImage. Works for any room shape (big, L-shaped, narrow).
import { makeCanvas } from '../engine/sprites.js';
import { RNG } from '../engine/rng.js';
import { PAL } from '../data/palette.js';
import { TILE, T } from './constants.js';
import { TUNING } from '../data/tuning.js';
const RT = TUNING.room;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgb = (arr) => arr.map(hexToRgb);
const css = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// The look used when a room has none (the original cellar).
export const DEFAULT_LOOK = {
  id: 'default',
  floor: PAL.floor, wall: PAL.wall, mortar: PAL.mortar, stain: PAL.mildew, rock: PAL.rock,
  floorPattern: 'flagstone', wallPattern: 'brick', pot: 'jar',
  stains: [3, 7], stainMildew: 0.45, cracks: [2, 5], pebbles: [6, 16], cobwebs: 0.45,
  wallProps: [], floorProps: [],
};

// Smooth value noise over a lattice of `cell` pixels.
function valueNoise(rng, cell, w, h) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = rng.next();
  return (x, y) => {
    const fx = x / cell, fy = y / cell;
    const ix = fx | 0, iy = fy | 0;
    let tx = fx - ix, ty = fy - iy;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const i = iy * gw + ix;
    const a = g[i] + (g[i + 1] - g[i]) * tx;
    const b = g[i + gw] + (g[i + gw + 1] - g[i + gw]) * tx;
    return a + (b - a) * ty;
  };
}

const hash2 = (a, b) => ((Math.imul(a * 73856093 ^ b * 19349663, 2654435761) >>> 0) % 1000) / 1000;

// ---- floor patterns: value 0..1 for a floor pixel (lx, ly are floor-local) ----------------
const FLOOR_PATTERNS = {
  // big stone slabs with dark seams (one per tile)
  flagstone(ctx, lx, ly) {
    let v = ctx.big * 0.55 + ctx.small * 0.3 + ctx.rnd * 0.15 + ctx.slab;
    if ((lx % TILE === 0 || ly % TILE === 0) && ctx.seam > 0.35) v -= 0.2;
    return v;
  },
  // wooden planks running sideways, with staggered joints and grain
  planks(ctx, lx, ly) {
    const row = Math.floor(ly / 8);
    const off = hash2(row, 7) * 40;
    let v = 0.45 + hash2(row, 3) * 0.25 + Math.sin((lx + off) * 0.7 + row) * 0.05 + ctx.small * 0.25 + ctx.rnd * 0.1;
    if (ly % 8 === 0) v -= 0.35;
    if (Math.floor(lx + off) % 52 === 0) v -= 0.3;
    if ((lx + ly * 3) % 17 === 0) v -= 0.08;
    return v;
  },
  // packed dirt with clumps
  dirt(ctx) {
    return ctx.big * 0.45 + ctx.small * 0.35 + ctx.rnd * 0.25;
  },
  // small rounded cobbles
  cobble(ctx, lx, ly) {
    const cx = Math.floor(lx / 8), cy = Math.floor((ly + (cx & 1) * 4) / 8);
    const fx = (lx % 8) - 3.5, fy = ((ly + (cx & 1) * 4) % 8) - 3.5;
    const d = Math.hypot(fx, fy) / 4.5;
    return 0.35 + hash2(cx, cy) * 0.35 - d * 0.35 + ctx.small * 0.2 + ctx.rnd * 0.1;
  },
  // bare cave rock: lumpy, with ridges where the big noise crosses its middle
  cave(ctx) {
    const ridge = Math.abs(ctx.big - 0.5) < 0.012 ? -0.12 : 0;
    return ctx.big * 0.6 + ctx.small * 0.3 + ctx.rnd * 0.15 + ridge;
  },
  // small square grave tiles, some cracked or sunken
  ossuary(ctx, lx, ly) {
    const cx = Math.floor(lx / 12), cy = Math.floor(ly / 12);
    const h = hash2(cx, cy);
    let v = 0.42 + h * 0.3 + ctx.small * 0.2 + ctx.rnd * 0.1 - (h > 0.92 ? 0.25 : 0);
    if (lx % 12 === 0 || ly % 12 === 0) v -= 0.3;
    else if (lx % 12 === 1 || ly % 12 === 1) v += 0.08;
    return v;
  },
  // huge square slabs, two tiles across, with worn edges
  slab(ctx, lx, ly) {
    const cx = Math.floor(lx / 48), cy = Math.floor(ly / 48);
    const fx = lx % 48, fy = ly % 48;
    let v = 0.42 + hash2(cx, cy + 9) * 0.22 + ctx.big * 0.2 + ctx.small * 0.18 + ctx.rnd * 0.1;
    if (fx === 0 || fy === 0) v -= 0.35;
    else if (fx === 1 || fy === 1) v += 0.1;
    else if (fx === 47 || fy === 47) v -= 0.12;
    return v;
  },
  // polished marble: big diamonds with veins running through
  marble(ctx, lx, ly) {
    const u = lx + ly, w = lx - ly;
    const cell = (Math.floor(u / 24) + Math.floor(w / 24)) & 1;
    let v = 0.45 + cell * 0.18 + ctx.small * 0.12 + ctx.rnd * 0.06;
    if (u % 24 === 0 || ((w % 24) + 24) % 24 === 0) v -= 0.25;
    if (Math.abs(Math.sin(lx * 0.09 + ctx.big * 9) * 12 - ((ly + lx * 0.3) % 24 - 12)) < 0.6) v -= 0.18;   // veins
    return v;
  },
  // sucking black mud, glossy where it's wet
  mud(ctx) {
    const wet = ctx.big > 0.62 ? 0.22 : 0;
    return 0.3 + ctx.big * 0.35 + ctx.small * 0.25 + ctx.rnd * 0.18 + wet * (ctx.small > 0.6 ? 1 : -0.4);
  },
  // living flesh: wavy muscle fibers with darker folds
  flesh(ctx, lx, ly) {
    const fiber = Math.sin(lx * 0.35 + Math.sin(ly * 0.12) * 3 + ctx.big * 4) * 0.12;
    const fold = Math.abs(ctx.big - 0.5) < 0.03 ? -0.28 : 0;
    return 0.42 + fiber + ctx.big * 0.25 + ctx.small * 0.18 + ctx.rnd * 0.08 + fold;
  },
  // scar tissue: pale, smooth patches with hard ridged seams
  scar(ctx, lx, ly) {
    const seam = Math.abs(ctx.big - 0.45) < 0.02 || Math.abs(ctx.big - 0.65) < 0.015;
    return 0.5 + ctx.small * 0.25 + ctx.rnd * 0.06 + (seam ? (((lx + ly) & 3) === 0 ? -0.4 : 0.25) : 0);
  },
  // smooth wet stone worn down by water: long soft bands
  wetstone(ctx, lx, ly) {
    return 0.38 + Math.sin(ly * 0.22 + ctx.big * 6) * 0.08 + ctx.big * 0.35 + ctx.small * 0.2 + ctx.rnd * 0.08;
  },
};

// ---------------------------------------------------------------------------
// Floor + walls
// ---------------------------------------------------------------------------
export function generateRoomBase(rng, style = {}, room) {
  const look = style.look || DEFAULT_LOOK;
  const W = room.worldW, H = room.worldH;
  const X0 = room.x0, Y0 = room.y0, X1 = room.R, Y1 = room.B;
  const [canvas, ctx] = makeCanvas(W, H);
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const put = (x, y, c, a = 255) => {
    const i = (y * W + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a;
  };

  const FL = rgb(look.floor), WL = rgb(look.wall), MD = hexToRgb(look.stain), MORTAR = hexToRgb(look.mortar);
  const tintFloor = style.floorTint ? hexToRgb(style.floorTint) : null;
  const big = valueNoise(rng, 28, W, H);
  const small = valueNoise(rng, 7, W + 128, H);
  const seamGaps = valueNoise(rng, 10, W, H);
  const slab = new Float32Array(room.cols * room.rows).map(() => rng.float(-0.07, 0.07));
  const pattern = FLOOR_PATTERNS[look.floorPattern] || FLOOR_PATTERNS.flagstone;

  // Which pixels are floor (inside the room and not a wall tile)?
  const floorAt = (x, y) => x >= X0 && x < X1 && y >= Y0 && y < Y1 && !room.isWall(Math.floor((x - X0) / TILE), Math.floor((y - Y0) / TILE));

  // Distance (in pixels) from every wall pixel to the nearest floor (wall shading), and from
  // every floor pixel to the nearest wall (floor darkening along the edges).
  const isFloor = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (floorAt(x, y)) isFloor[y * W + x] = 1;
  const dist = chamfer(W, H, (i) => isFloor[i] === 1);
  const edgeDist = chamfer(W, H, (i) => isFloor[i] === 0);

  // Stains (wet patches and mildew), painted into two fields only inside each stain's box.
  const area = (room.W * room.H) / (312 * 168);
  const stainCount = Math.round(rng.int(look.stains[0], look.stains[1]) * area);
  const wetF = new Float32Array(W * H), mildewF = new Float32Array(W * H);
  for (let i = 0; i < stainCount; i++) {
    const s = { x: rng.float(X0, X1), y: rng.float(Y0, Y1), rx: rng.float(10, 34), ry: rng.float(7, 22), mildew: rng.chance(look.stainMildew) };
    const field = s.mildew ? mildewF : wetF;
    const x0 = Math.max(0, Math.floor(s.x - s.rx * 1.3)), x1 = Math.min(W - 1, Math.ceil(s.x + s.rx * 1.3));
    const y0 = Math.max(0, Math.floor(s.y - s.ry * 1.3)), y1 = Math.min(H - 1, Math.ceil(s.y + s.ry * 1.3));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - s.x) / s.rx, dy = (y - s.y) / s.ry;
        const r = dx * dx + dy * dy + (small(x + 100, y) - 0.5) * 0.6;
        if (r < 1 && 1 - r > field[y * W + x]) field[y * W + x] = 1 - r;
      }
    }
  }

  const pc = { big: 0, small: 0, rnd: 0, slab: 0, seam: 0 };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const b = BAYER[(y & 3) * 4 + (x & 3)];
      const dd = dist[y * W + x];
      if (dd === 0) {
        // ---- floor
        const lx = x - X0, ly = y - Y0;
        pc.big = big(x, y); pc.small = small(x, y); pc.rnd = rng.next();
        pc.slab = slab[Math.floor(ly / TILE) * room.cols + Math.floor(lx / TILE)] || 0;
        pc.seam = seamGaps(x, y);
        let v = pattern(pc, lx, ly);
        // shade near walls (including the walls of narrow and L-shaped rooms)
        const edge = edgeDist[y * W + x] - 1;
        if (edge < 12) v -= (12 - edge) * 0.022;
        // the tall top wall casts a short shadow onto the floor below it
        for (let k = 1; k <= 8; k++) if (y - k >= 0 && !isFloor[(y - k) * W + x]) { v -= (9 - k) * 0.04; break; }
        const wet = wetF[y * W + x], mildew = mildewF[y * W + x];
        v -= wet * 0.25;
        const shade = Math.max(0, Math.min(4, Math.floor(v * 5 + b - 0.5)));
        let c = FL[shade];
        if (mildew > 0) c = mix(c, MD, Math.min(0.7, mildew * 1.2 + (b - 0.5) * 0.3));
        if (tintFloor) c = mix(c, tintFloor, 0.18);
        put(x, y, c);
        continue;
      }
      // ---- wall. The fake 3/4 view: each wall shows a lit face of its own height (the top wall's
      // is the tallest, the bottom wall's the shortest), then a lip, then the dark top of the wall.
      const ex = x < X0 ? (X0 - x) / X0 : x >= X1 ? (x - X1 + 1) / (W - X1) : 0;
      const ey = y < Y0 ? (Y0 - y) / Y0 : y >= Y1 ? (y - Y1 + 1) / (H - Y1) : 0;
      let face, lift;
      if (ex === 0 && ey === 0) { face = RT.faceSide * 0.6; lift = 0; }   // a wall inside the box (L-shaped, narrow)
      else if (ey >= ex) [face, lift] = y < Y0 ? [RT.faceTop, 0.35] : [RT.faceBottom, -0.45];
      else [face, lift] = [RT.faceSide, -0.1];
      const wallAdj = dd <= face ? lift - (dd / face) * 0.7 : lift - 1.3 - Math.min(1, (dd - face) / 26) * 1.6;
      let c;
      if (dd <= 1.5) c = WL[4];
      else if (dd <= 2.5) c = WL[3];
      else if (dd > face && dd <= face + 1.5) c = WL[lift < 0 ? 2 : 3];   // the lip where the face meets the wall top
      else if (look.wallPattern === 'cave') {
        // raw rock: no courses, just lumps and dark fissures
        const v = 1.6 + (big(x, y) - 0.5) * 2.4 + (small(x, y) - 0.5) * 1.2 + wallAdj + (b - 0.5) * 0.6;
        const fissure = Math.abs(small(x * 2, y) - 0.5) < 0.03;
        c = fissure ? MORTAR : WL[Math.max(0, Math.min(3, Math.floor(v)))];
      } else if (look.wallPattern === 'skulls') {
        // an ossuary wall: rows of skulls packed in between courses of long bones
        const row = Math.floor(y / 10), off = (row & 1) * 5;
        const lx = (x + off) % 10, ly = y % 10;
        let v;
        if (row % 3 === 2) v = ly === 0 || ly === 9 ? -1 : 2.2 + ((x >> 1) % 7 === 0 ? -1 : 0);          // bones
        else {
          const dx = lx - 4.5, dy = ly - 4;
          const skull = dx * dx / 16 + dy * dy / 14 < 1;
          const socket = ly === 4 && (lx === 3 || lx === 6);
          v = skull ? (socket ? -1 : 2.6 - dy * 0.25) : -1;
        }
        v += (small(x, y) - 0.5) * 0.6 + wallAdj + (b - 0.5) * 0.4;
        c = v < 0 ? MORTAR : WL[Math.max(0, Math.min(3, Math.floor(v)))];
      } else if (look.wallPattern === 'flesh') {
        // ribbed muscle: rounded bands running along the wall, with veins
        const band = Math.sin((y + Math.sin(x * 0.08) * 4) * 0.45);
        const vein = Math.abs(small(x * 1.5, y) - 0.5) < 0.025;
        const v = 1.8 + band * 0.9 + (big(x, y) - 0.5) * 0.8 + wallAdj + (b - 0.5) * 0.4;
        c = vein ? MORTAR : WL[Math.max(0, Math.min(3, Math.floor(v)))];
      } else if (look.wallPattern === 'blocks') {
        // massive ashlar blocks, three courses high
        const row = Math.floor(y / 14), off = (row % 3) * 11;
        const col = Math.floor((x + off) / 30);
        const isMortar = y % 14 === 0 || (x + off) % 30 === 0;
        const v = 1.4 + hash2(col, row) * 1.4 + (small(x, y) - 0.5) * 0.7 + wallAdj + (b - 0.5) * 0.5 + (y % 14 === 1 ? 0.6 : 0);
        c = isMortar ? MORTAR : WL[Math.max(0, Math.min(3, Math.floor(v)))];
      } else if (look.wallPattern === 'marble') {
        // smooth marble panels framed by thin pilasters
        const px = x % 40, panelEdge = px < 2 || px > 37, rail = y % 26 < 2;
        const v = 2 + (small(x, y) - 0.5) * 0.6 + wallAdj + (b - 0.5) * 0.4 + (panelEdge || rail ? 0.9 : 0) - (px === 2 || px === 37 ? 0.8 : 0);
        c = WL[Math.max(0, Math.min(3, Math.floor(v)))];
      } else if (look.wallPattern === 'stone') {
        const row = Math.floor(y / 11), off = (row & 1) * 9;
        const col = Math.floor((x + off) / 18);
        const isMortar = y % 11 === 0 || (x + off) % 18 === 0;
        const v = 1.2 + hash2(col, row) * 1.8 + (small(x, y) - 0.5) * 1.0 + wallAdj + (b - 0.5) * 0.6;
        c = isMortar ? MORTAR : WL[Math.max(0, Math.min(3, Math.floor(v)))];
      } else {
        const row = Math.floor(y / 8), off = (row & 1) * 8;
        const col = Math.floor((x + off) / 16);
        const isMortar = y % 8 === 0 || (x + off) % 16 === 0;
        const v = 1.3 + hash2(col, row) * 1.9 + (small(x, y) - 0.5) * 0.8 + wallAdj + (b - 0.5) * 0.6;
        c = isMortar ? MORTAR : WL[Math.max(0, Math.min(3, Math.floor(v)))];
      }
      put(x, y, c);
    }
  }
  ctx.putImageData(img, 0, 0);

  // Corner seams where the outer walls meet (from each screen corner to the floor's corner)
  ctx.fillStyle = css(MORTAR);
  for (const [ax, ay, bx, by] of [[0, 0, X0, Y0], [W - 1, 0, X1 - 1, Y0], [0, H - 1, X0, Y1 - 1], [W - 1, H - 1, X1 - 1, Y1 - 1]]) {
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let i = 0; i < n; i++) ctx.fillRect(Math.round(ax + (bx - ax) * (i / n)), Math.round(ay + (by - ay) * (i / n)), 1, 1);
  }

  const floorPx = (x, y) => floorAt(Math.round(x), Math.round(y));
  // Cracks
  ctx.fillStyle = look.floor[0];
  const cracks = Math.round(rng.int(look.cracks[0], look.cracks[1]) * area);
  for (let i = 0; i < cracks; i++) crackWalk(ctx, rng, rng.int(X0 + 4, X1 - 4), rng.int(Y0 + 4, Y1 - 4), rng.int(8, 26), 1, floorPx);

  // Pebbles
  const pebbles = Math.round(rng.int(look.pebbles[0], look.pebbles[1]) * area);
  for (let i = 0; i < pebbles; i++) {
    const x = rng.int(X0 + 2, X1 - 4), y = rng.int(Y0 + 2, Y1 - 4);
    if (!floorPx(x, y)) continue;
    ctx.fillStyle = look.rock[0];
    ctx.fillRect(x, y + 1, 2, 1);
    ctx.fillStyle = look.rock[rng.int(2, 3)];
    ctx.fillRect(x, y, rng.int(1, 2), 1);
  }

  // Cobwebs in some corners of the room's box
  const corners = [[X0, Y0, 1, 1], [X1 - 1, Y0, -1, 1], [X0, Y1 - 1, 1, -1], [X1 - 1, Y1 - 1, -1, -1]];
  for (const [cx, cy, sx, sy] of corners) if (floorPx(cx, cy) && rng.chance(look.cobwebs)) cobweb(ctx, rng, cx, cy, sx, sy);

  // Props: things on the walls (only above real floor) and things lying on the floor.
  room.lights = [];
  const props = { ctx, rng, room, look, floorPx };
  for (let x = X0 + 20; x < X1 - 20; x += rng.int(40, 70)) {
    if (!floorPx(x, Y0) || !look.wallProps.length || rng.chance(0.35)) continue;
    // keep away from door openings
    if (room.slots.some((s) => s.dir === 'up' && Math.abs(s.x - x) < 26)) continue;
    WALL_PROPS[rng.pick(look.wallProps)]?.(props, x, Y0);
  }
  const floorProps = Math.round((look.floorProps.length ? rng.int(1, 3) : 0) * area);
  for (let i = 0; i < floorProps; i++) {
    const p = room.randomFreeSpot ? room.tileCenter(rng.int(0, room.cols - 1), rng.int(0, room.rows - 1)) : null;
    if (!p || !floorPx(p.x, p.y)) continue;
    FLOOR_PROPS[rng.pick(look.floorProps)]?.(props, p.x + rng.int(-6, 6), p.y + rng.int(-6, 6));
  }
  return canvas;
}

// Two-pass chamfer distance: for every pixel, roughly how far the nearest `source` pixel is.
function chamfer(W, H, source) {
  const dist = new Float32Array(W * H).fill(1e4);
  for (let i = 0; i < W * H; i++) if (source(i)) dist[i] = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
      if (y > 0) dist[i] = Math.min(dist[i], dist[i - W] + 1);
      if (x > 0 && y > 0) dist[i] = Math.min(dist[i], dist[i - W - 1] + 1.4);
      if (x < W - 1 && y > 0) dist[i] = Math.min(dist[i], dist[i - W + 1] + 1.4);
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (x < W - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
      if (y < H - 1) dist[i] = Math.min(dist[i], dist[i + W] + 1);
      if (x < W - 1 && y < H - 1) dist[i] = Math.min(dist[i], dist[i + W + 1] + 1.4);
      if (x > 0 && y < H - 1) dist[i] = Math.min(dist[i], dist[i + W - 1] + 1.4);
    }
  }
  return dist;
}

function crackWalk(ctx, rng, x, y, len, depth, floorPx) {
  let a = rng.float(0, Math.PI * 2);
  for (let i = 0; i < len; i++) {
    if (!floorPx(x, y)) return;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    a += rng.float(-0.7, 0.7);
    x += Math.cos(a);
    y += Math.sin(a);
    if (depth > 0 && rng.chance(0.08)) crackWalk(ctx, rng, x, y, len >> 1, depth - 1, floorPx);
  }
}

export function pixelLine(ctx, x0, y0, x1, y1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), 1, 1);
  }
}

function cobweb(ctx, rng, cx, cy, sx, sy) {
  const r = rng.int(14, 24);
  ctx.fillStyle = 'rgba(190,180,165,0.22)';
  const spokes = [0, 0.33, 0.66, 1].map((t) => (t * Math.PI) / 2);
  const ends = spokes.map((a) => [cx + Math.cos(a) * r * sx, cy + Math.sin(a) * r * sy]);
  for (const [ex, ey] of ends) pixelLine(ctx, cx, cy, ex, ey);
  for (const k of [0.4, 0.7, 0.95]) {
    for (let i = 0; i < ends.length - 1; i++) {
      const a = [cx + (ends[i][0] - cx) * k, cy + (ends[i][1] - cy) * k];
      const b = [cx + (ends[i + 1][0] - cx) * k, cy + (ends[i + 1][1] - cy) * k];
      pixelLine(ctx, a[0], a[1], b[0], b[1]);
    }
  }
}

// ---- wall props: painted into the top wall, just above the floor edge (y0) -------------------
const WALL_PROPS = {
  // a candle burning in a little alcove (also a light source, see room.lights)
  sconce({ ctx, room }, x, y0) {
    ctx.fillStyle = '#0a0706';
    ctx.fillRect(x - 4, y0 - 14, 9, 11);
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(x - 3, y0 - 13, 7, 10);
    ctx.fillStyle = '#c9b48a';
    ctx.fillRect(x - 1, y0 - 8, 3, 5);
    ctx.fillStyle = '#e8d9b0';
    ctx.fillRect(x - 1, y0 - 8, 1, 5);
    ctx.fillStyle = '#ffd25a';
    ctx.fillRect(x, y0 - 11, 1, 3);
    ctx.fillStyle = '#f08a24';
    ctx.fillRect(x, y0 - 10, 1, 1);
    room.lights.push({ x: x + 0.5, y: y0 - 9, r: 26, color: 'rgba(255,170,80,0.5)' });
  },
  // a rusty pipe running along the wall with a dripping joint
  pipe({ ctx, rng }, x, y0) {
    const len = rng.int(24, 46), y = y0 - rng.int(9, 15);
    ctx.fillStyle = '#1a1412';
    ctx.fillRect(x - len / 2, y - 1, len, 5);
    ctx.fillStyle = '#5a3a26';
    ctx.fillRect(x - len / 2, y, len, 3);
    ctx.fillStyle = '#8a5a3a';
    ctx.fillRect(x - len / 2, y, len, 1);
    ctx.fillStyle = '#3a2416';
    ctx.fillRect(x - 2, y - 2, 5, 7);
    ctx.fillStyle = '#6a7a8a';
    ctx.fillRect(x, y + 5, 1, 2);
  },
  // a sagging shelf with bottles and jars
  shelf({ ctx, rng }, x, y0) {
    const y = y0 - 8;
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(x - 13, y, 27, 3);
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(x - 13, y, 27, 1);
    ctx.fillStyle = '#160f0c';
    ctx.fillRect(x - 11, y + 3, 1, 3);
    ctx.fillRect(x + 11, y + 3, 1, 3);
    for (let bx = x - 11; bx < x + 11; bx += rng.int(4, 7)) {
      const h = rng.int(4, 8);
      ctx.fillStyle = rng.pick(['#3a5a3a', '#5a3a2a', '#4a4a6a', '#6a5a3a']);
      ctx.fillRect(bx, y - h, 3, h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(bx, y - h + 1, 1, h - 2);
      ctx.fillStyle = '#160f0c';
      ctx.fillRect(bx + 1, y - h - 1, 1, 1);
    }
  },
  // roots pushing out of the wall and hanging down
  roots({ ctx, rng }, x, y0) {
    for (let i = 0; i < rng.int(2, 4); i++) {
      let rx = x + rng.int(-8, 8), ry = y0 - rng.int(10, 20);
      const len = rng.int(8, 18);
      for (let k = 0; k < len; k++) {
        ctx.fillStyle = k % 3 ? '#4a3420' : '#2e2014';
        ctx.fillRect(Math.round(rx), Math.round(ry), k < 4 ? 2 : 1, 1);
        rx += rng.float(-0.6, 0.6);
        ry += 1;
      }
    }
  },
  // a curtain of moss hanging over the wall's edge
  mossdrape({ ctx, rng }, x, y0) {
    const w = rng.int(14, 26);
    for (let i = 0; i < w; i++) {
      const len = rng.int(2, 9);
      for (let k = 0; k < len; k++) {
        ctx.fillStyle = k === len - 1 ? '#2a3a18' : rng.chance(0.3) ? '#5e7c3a' : '#3e5626';
        ctx.fillRect(x - w / 2 + i, y0 - 4 + k, 1, 1);
      }
    }
  },
  // pale glowing mushrooms growing from a crack (a cold light source)
  glowcap({ ctx, rng, room }, x, y0) {
    for (let i = 0; i < 3; i++) {
      const mx = x - 4 + i * 4, my = y0 - 4 - (i % 2) * 3;
      ctx.fillStyle = '#c8d8b8';
      ctx.fillRect(mx, my, 1, 3);
      ctx.fillStyle = '#6ae0c0';
      ctx.fillRect(mx - 1, my - 1, 3, 1);
      ctx.fillStyle = '#c0fff0';
      ctx.fillRect(mx, my - 2, 1, 1);
    }
    room.lights.push({ x, y: y0 - 6, r: 24, color: 'rgba(80,220,190,0.45)' });
  },
  // a dark water stain streaking down the wall
  seep({ ctx, rng }, x, y0) {
    const len = rng.int(10, 20);
    for (let k = 0; k < len; k++) {
      ctx.fillStyle = 'rgba(10,20,20,0.35)';
      ctx.fillRect(x + Math.round(Math.sin(k * 0.6) * 1), y0 - 22 + k, 2 + (k > len - 4 ? 1 : 0), 1);
    }
  },
  // a burning torch in an iron bracket (a warm, flickering light)
  torch({ ctx, room }, x, y0) {
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(x - 2, y0 - 6, 5, 2);
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(x, y0 - 13, 2, 8);
    ctx.fillStyle = '#e04a18';
    ctx.fillRect(x - 1, y0 - 18, 4, 5);
    ctx.fillStyle = '#ffd25a';
    ctx.fillRect(x, y0 - 17, 2, 3);
    room.lights.push({ x: x + 1, y: y0 - 15, r: 30, color: 'rgba(255,120,40,0.55)' });
  },
  // a black soot streak above a crack in the wall
  soot({ ctx, rng }, x, y0) {
    for (let k = 0; k < 18; k++) {
      ctx.fillStyle = `rgba(0,0,0,${0.35 - k * 0.015})`;
      ctx.fillRect(x - 3 + Math.round(Math.sin(k * 0.5) * 2), y0 - 2 - k, 6 - Math.floor(k / 5), 1);
    }
  },
  // a crack in the bricks glowing with heat
  embercrack({ ctx, rng, room }, x, y0) {
    let cx = x, cy = y0 - 2;
    for (let k = 0; k < 14; k++) {
      ctx.fillStyle = k % 3 ? '#e04a18' : '#ffd25a';
      ctx.fillRect(Math.round(cx), Math.round(cy), 1, 1);
      cx += rng.int(-1, 1);
      cy -= 1;
    }
    room.lights.push({ x, y: y0 - 8, r: 18, color: 'rgba(255,80,20,0.4)' });
  },
  // a hanging chain with a hook
  chain({ ctx, rng }, x, y0) {
    const len = rng.int(8, 16);
    for (let i = 0; i < len; i += 2) {
      ctx.fillStyle = i % 4 ? '#4a4a52' : '#6a6a74';
      ctx.fillRect(x, y0 - 22 + i, 1, 2);
    }
    ctx.fillStyle = '#6a6a74';
    ctx.fillRect(x - 1, y0 - 22 + len, 3, 1);
    ctx.fillRect(x + 1, y0 - 23 + len, 1, 1);
  },
  // stone icicles hanging off the cave wall
  stalactite({ ctx, rng, look }, x, y0) {
    for (let i = 0; i < rng.int(2, 4); i++) {
      const sx = x + rng.int(-10, 10), len = rng.int(5, 12), w = rng.int(2, 4);
      for (let k = 0; k < len; k++) {
        const ww = Math.max(1, Math.round(w * (1 - k / len)));
        ctx.fillStyle = k === len - 1 ? look.rock[1] : look.rock[k < 2 ? 2 : 3];
        ctx.fillRect(sx - Math.floor(ww / 2), y0 - 3 + k, ww, 1);
        ctx.fillStyle = look.rock[4];
        if (ww > 1) ctx.fillRect(sx - Math.floor(ww / 2), y0 - 3 + k, 1, 1);
      }
    }
  },
  // blue crystals growing out of a crack (a cold light)
  crystals({ ctx, rng, room }, x, y0) {
    for (let i = 0; i < 4; i++) {
      const cx = x - 6 + i * 4 + rng.int(-1, 1), h = rng.int(4, 9);
      for (let k = 0; k < h; k++) {
        ctx.fillStyle = k === 0 ? '#d8f4ff' : k < h / 2 ? '#7ac4f0' : '#3a86c0';
        ctx.fillRect(cx, y0 - 2 - k, k < 2 ? 1 : 2, 1);
      }
    }
    room.lights.push({ x, y: y0 - 6, r: 26, color: 'rgba(90,170,255,0.45)' });
  },
  // a miner's lantern hanging from a nail (warm light)
  lantern({ ctx, room }, x, y0) {
    ctx.fillStyle = '#4a4a52';
    ctx.fillRect(x, y0 - 20, 1, 5);
    ctx.fillStyle = '#160f0c';
    ctx.fillRect(x - 3, y0 - 15, 7, 9);
    ctx.fillStyle = '#ffd25a';
    ctx.fillRect(x - 2, y0 - 13, 5, 5);
    ctx.fillStyle = '#fff3c0';
    ctx.fillRect(x - 1, y0 - 12, 2, 3);
    ctx.fillStyle = '#4a4a52';
    ctx.fillRect(x - 3, y0 - 15, 7, 1);
    room.lights.push({ x: x + 0.5, y: y0 - 10, r: 30, color: 'rgba(255,190,90,0.5)' });
  },
  // a niche in the wall with a skull in it
  skullniche({ ctx }, x, y0) {
    ctx.fillStyle = '#0a0706';
    ctx.fillRect(x - 6, y0 - 15, 13, 12);
    ctx.fillStyle = '#d8d0b8';
    ctx.fillRect(x - 3, y0 - 12, 7, 5);
    ctx.fillRect(x - 2, y0 - 7, 5, 2);
    ctx.fillStyle = '#9a927e';
    ctx.fillRect(x - 3, y0 - 8, 7, 1);
    ctx.fillStyle = '#160f0c';
    ctx.fillRect(x - 2, y0 - 10, 2, 2);
    ctx.fillRect(x + 1, y0 - 10, 2, 2);
    ctx.fillRect(x, y0 - 6, 1, 1);
  },
  // a cluster of melted candles on a ledge (warm light)
  candles({ ctx, rng, room }, x, y0) {
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(x - 8, y0 - 3, 17, 2);
    for (let i = 0; i < 4; i++) {
      const cx = x - 6 + i * 4, h = rng.int(3, 7);
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(cx, y0 - 3 - h, 2, h);
      ctx.fillStyle = '#ffd25a';
      ctx.fillRect(cx, y0 - 5 - h, 1, 2);
    }
    room.lights.push({ x, y: y0 - 8, r: 28, color: 'rgba(255,190,110,0.5)' });
  },
  // long bones stacked like firewood
  bonestack({ ctx, rng }, x, y0) {
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 3; i++) {
        const bx = x - 10 + i * 7 + (r & 1) * 3, by = y0 - 4 - r * 3;
        ctx.fillStyle = '#9a927e';
        ctx.fillRect(bx, by, 6, 2);
        ctx.fillStyle = '#d8d0b8';
        ctx.fillRect(bx, by, 6, 1);
        ctx.fillRect(bx - 1, by - 1, 1, 3);
        ctx.fillRect(bx + 6, by - 1, 1, 3);
      }
    }
  },
  // barnacles and shells crusted on the wet wall
  barnacles({ ctx, rng }, x, y0) {
    for (let i = 0; i < 10; i++) {
      const bx = x + rng.int(-12, 12), by = y0 - rng.int(2, 14);
      ctx.fillStyle = '#4a5a5a';
      ctx.fillRect(bx - 1, by - 1, 3, 3);
      ctx.fillStyle = '#b8c4b8';
      ctx.fillRect(bx, by - 1, 1, 1);
      ctx.fillStyle = '#1a2224';
      ctx.fillRect(bx, by, 1, 1);
    }
  },
  // an iron brazier on a bracket, burning (warm light)
  brazier({ ctx, room }, x, y0) {
    ctx.fillStyle = '#16181c'; ctx.fillRect(x - 6, y0 - 10, 13, 5);
    ctx.fillStyle = '#4c525e'; ctx.fillRect(x - 5, y0 - 9, 11, 3);
    ctx.fillStyle = '#24272e'; ctx.fillRect(x, y0 - 5, 1, 5);
    ctx.fillStyle = '#e04a18'; ctx.fillRect(x - 4, y0 - 15, 9, 5);
    ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x - 3, y0 - 17, 7, 5);
    ctx.fillStyle = '#ffd25a'; ctx.fillRect(x - 1, y0 - 18, 3, 4);
    room.lights.push({ x: x + 0.5, y: y0 - 14, r: 34, color: 'rgba(255,130,50,0.55)' });
  },
  // an empty hanging cage
  cage({ ctx, rng }, x, y0) {
    ctx.fillStyle = '#4c525e';
    ctx.fillRect(x, y0 - 26, 1, 6);
    for (let i = 0; i < 5; i++) ctx.fillRect(x - 4 + i * 2, y0 - 20, 1, 12);
    ctx.fillRect(x - 5, y0 - 20, 11, 1); ctx.fillRect(x - 5, y0 - 9, 11, 1);
    if (rng.chance(0.5)) { ctx.fillStyle = '#c8c0a8'; ctx.fillRect(x - 2, y0 - 12, 4, 2); }
  },
  // a tattered banner
  banner({ ctx, rng }, x, y0) {
    const col = rng.pick(['#5a1a1a', '#2a2a5a', '#3a3a24']);
    ctx.fillStyle = '#2a1c12'; ctx.fillRect(x - 7, y0 - 24, 15, 2);
    for (let i = 0; i < 12; i++) {
      const len = 14 - Math.abs(i - 6) + rng.int(-2, 2);
      ctx.fillStyle = i % 4 === 0 ? '#c8a848' : col;
      ctx.fillRect(x - 6 + i, y0 - 22, 1, len);
    }
  },
  // a niche with a mourning statue
  statue({ ctx }, x, y0) {
    ctx.fillStyle = '#0a080c'; ctx.fillRect(x - 6, y0 - 22, 13, 20);
    ctx.fillStyle = '#88848e'; ctx.fillRect(x - 3, y0 - 15, 7, 13);
    ctx.fillStyle = '#aaa6ae'; ctx.fillRect(x - 2, y0 - 19, 5, 5); ctx.fillRect(x - 3, y0 - 15, 2, 9);
    ctx.fillStyle = '#68646e'; ctx.fillRect(x + 2, y0 - 13, 2, 11);
  },
  // a row of violet candles on a ledge (cold violet light)
  violetcandles({ ctx, rng, room }, x, y0) {
    ctx.fillStyle = '#68646e'; ctx.fillRect(x - 9, y0 - 4, 19, 2);
    for (let i = 0; i < 4; i++) {
      const cx = x - 7 + i * 5, h = rng.int(3, 7);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(cx, y0 - 4 - h, 2, h);
      ctx.fillStyle = '#b48ae8'; ctx.fillRect(cx, y0 - 6 - h, 1, 2);
    }
    room.lights.push({ x, y: y0 - 9, r: 30, color: 'rgba(170,110,255,0.5)' });
  },
  // black ooze running down the wall
  oozestreak({ ctx, rng }, x, y0) {
    for (let s = 0; s < 3; s++) {
      const sx = x - 6 + s * 5 + rng.int(-1, 1), len = rng.int(8, 22);
      for (let k = 0; k < len; k++) {
        ctx.fillStyle = k === len - 1 ? '#2a2236' : '#0a080c';
        ctx.fillRect(sx, y0 - 24 + k, k > len - 3 ? 2 : 1, 1);
      }
    }
  },
  // sickly green glowing fungus (a sick green light)
  sickglow({ ctx, rng, room }, x, y0) {
    for (let i = 0; i < 6; i++) {
      const mx = x + rng.int(-7, 7), my = y0 - rng.int(2, 10);
      ctx.fillStyle = '#4a6e22'; ctx.fillRect(mx, my, 2, 2);
      ctx.fillStyle = '#c0e040'; ctx.fillRect(mx, my, 1, 1);
    }
    room.lights.push({ x, y: y0 - 6, r: 26, color: 'rgba(160,220,60,0.4)' });
  },
  // veins branching down the wall
  veins({ ctx, rng, look }, x, y0) {
    for (let b = 0; b < 3; b++) {
      let vx = x + rng.int(-6, 6), vy = y0 - 22;
      for (let k = 0; k < 22; k++) {
        ctx.fillStyle = k % 4 ? '#5a1018' : '#8a2028';
        ctx.fillRect(Math.round(vx), Math.round(vy), k < 10 ? 2 : 1, 1);
        vx += rng.float(-0.8, 0.8); vy += 1;
      }
    }
  },
  // a swollen growth bulging from the wall, sometimes with an eye in it
  tumor({ ctx, rng }, x, y0) {
    const r = rng.int(5, 8);
    for (let yy = -r; yy <= r; yy++) {
      const half = Math.round(r * Math.sqrt(1 - (yy / (r + 0.5)) ** 2));
      ctx.fillStyle = yy < -r / 2 ? '#b86a70' : yy < r / 3 ? '#9a4a50' : '#6a2a30';
      ctx.fillRect(x - half, y0 - r - 4 + yy, half * 2, 1);
    }
    if (rng.chance(0.5)) {
      ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x - 2, y0 - r - 6, 5, 3);
      ctx.fillStyle = '#1a0a08'; ctx.fillRect(x, y0 - r - 6, 2, 3);
    }
  },
  // a big eye open in the wall, watching (a dim red light)
  walleye({ ctx, room }, x, y0) {
    ctx.fillStyle = '#3a0a10'; ctx.fillRect(x - 8, y0 - 14, 17, 9);
    ctx.fillStyle = '#e8dcd0'; ctx.fillRect(x - 6, y0 - 13, 13, 7);
    ctx.fillStyle = '#c03a3a'; ctx.fillRect(x - 5, y0 - 12, 1, 1); ctx.fillRect(x + 4, y0 - 8, 2, 1);
    ctx.fillStyle = '#5a1a2a'; ctx.fillRect(x - 2, y0 - 12, 5, 5);
    ctx.fillStyle = '#0a0406'; ctx.fillRect(x - 1, y0 - 11, 3, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y0 - 11, 1, 1);
    room.lights.push({ x, y: y0 - 10, r: 20, color: 'rgba(255,60,60,0.35)' });
  },
  // a long row of stitches closing an old wound in the wall
  stitches({ ctx, rng }, x, y0) {
    const len = rng.int(16, 28);
    ctx.fillStyle = '#4a2a28'; ctx.fillRect(x - len / 2, y0 - 10, len, 2);
    ctx.fillStyle = '#1a1a20';
    for (let i = 0; i < len; i += 3) { ctx.fillRect(x - len / 2 + i, y0 - 12, 1, 6); }
  },
  // a thin stream of water running down the wall into the room
  trickle({ ctx, rng }, x, y0) {
    for (let k = 0; k < 24; k++) {
      ctx.fillStyle = k % 4 ? 'rgba(120,190,220,0.55)' : 'rgba(210,240,255,0.7)';
      ctx.fillRect(x + Math.round(Math.sin(k * 0.4) * 0.6), y0 - 24 + k, 2, 1);
    }
    ctx.fillStyle = 'rgba(160,220,240,0.4)';
    ctx.fillRect(x - 4, y0, 10, 2);
  },
};

// ---- floor props ---------------------------------------------------------------------------
const FLOOR_PROPS = {
  // an iron drain grate
  grate({ ctx }, x, y) {
    ctx.fillStyle = '#0a0706';
    ctx.fillRect(x - 6, y - 4, 13, 9);
    ctx.fillStyle = '#3a3a42';
    for (let i = 0; i < 13; i += 3) ctx.fillRect(x - 6 + i, y - 4, 1, 9);
    ctx.fillRect(x - 6, y - 4, 13, 1);
    ctx.fillRect(x - 6, y + 4, 13, 1);
  },
  // scattered straw
  straw({ ctx, rng }, x, y) {
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = rng.pick(['#8a7a3a', '#a8964a', '#6a5a2a']);
      const sx = x + rng.int(-10, 10), sy = y + rng.int(-6, 6);
      const l = rng.int(2, 5);
      if (rng.chance(0.5)) ctx.fillRect(sx, sy, l, 1);
      else pixelLine(ctx, sx, sy, sx + l, sy + rng.int(-2, 2));
    }
  },
  // a broken board lying around
  board({ ctx, rng }, x, y) {
    const l = rng.int(12, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - l / 2 + 1, y + 2, l, 3);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(x - l / 2, y, l, 3);
    ctx.fillStyle = '#6a4630';
    ctx.fillRect(x - l / 2, y, l, 1);
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(x - l / 2 + 3, y + 1, 1, 1);
    ctx.fillRect(x + l / 2 - 4, y + 1, 1, 1);
  },
  // a grey pile of ash
  ashpile({ ctx, rng }, x, y) {
    for (let i = 0; i < 4; i++) {
      const rx = 6 - i, ry = 3 - i * 0.6;
      ctx.fillStyle = ['#2a2624', '#45403c', '#625a54', '#837a72'][i];
      for (let yy = -Math.ceil(ry); yy <= 0; yy++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / (ry + 0.5)) ** 2)));
        ctx.fillRect(x - half, y + yy - i, half * 2, 1);
      }
    }
  },
  // a black scorch mark
  scorch({ ctx, rng }, x, y) {
    for (let i = 0; i < 30; i++) {
      const a = rng.float(0, Math.PI * 2), r = rng.float(0, 12);
      ctx.fillStyle = `rgba(0,0,0,${0.5 - r * 0.03})`;
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.6), 2, 1);
    }
  },
  // a few coals still glowing (tiny light)
  coals({ ctx, rng, room }, x, y) {
    for (let i = 0; i < 5; i++) {
      const cx = x + rng.int(-6, 6), cy = y + rng.int(-3, 3);
      ctx.fillStyle = '#1a1210';
      ctx.fillRect(cx - 1, cy - 1, 3, 2);
      ctx.fillStyle = rng.chance(0.5) ? '#e04a18' : '#ff8a2a';
      ctx.fillRect(cx, cy - 1, 1, 1);
    }
    room.lights.push({ x, y, r: 14, color: 'rgba(255,80,20,0.35)' });
  },
  // a still puddle with a pale rim
  puddle({ ctx, rng }, x, y) {
    const rx = rng.int(8, 15), ry = Math.round(rx * 0.45);
    for (let yy = -ry; yy <= ry; yy++) {
      const half = Math.round(rx * Math.sqrt(1 - (yy / (ry + 0.5)) ** 2));
      ctx.fillStyle = yy === -ry ? 'rgba(160,190,200,0.25)' : 'rgba(8,14,18,0.55)';
      ctx.fillRect(x - half, y + yy, half * 2, 1);
    }
    ctx.fillStyle = 'rgba(200,230,240,0.35)';
    ctx.fillRect(x - Math.round(rx / 3), y - 1, 3, 1);
  },
  // a clump of little mushrooms
  mushrooms({ ctx, rng }, x, y) {
    for (let i = 0; i < rng.int(3, 6); i++) {
      const mx = x + rng.int(-7, 7), my = y + rng.int(-4, 4);
      ctx.fillStyle = '#d8c8a8';
      ctx.fillRect(mx, my, 1, 2);
      ctx.fillStyle = rng.pick(['#8a5a3a', '#a86a40', '#6a7a4a']);
      ctx.fillRect(mx - 1, my - 1, 3, 1);
    }
  },
  // an old torn web stuck to the floor (just decoration)
  oldweb({ ctx, rng }, x, y) {
    ctx.fillStyle = 'rgba(200,196,184,0.18)';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rng.next();
      pixelLine(ctx, x, y, Math.round(x + Math.cos(a) * 10), Math.round(y + Math.sin(a) * 6));
    }
  },
  // loose gravel and a few bigger stones
  gravel({ ctx, rng, look }, x, y) {
    for (let i = 0; i < 18; i++) {
      const gx = x + rng.int(-10, 10), gy = y + rng.int(-6, 6);
      ctx.fillStyle = look.rock[0];
      ctx.fillRect(gx, gy + 1, 2, 1);
      ctx.fillStyle = look.rock[rng.int(2, 4)];
      ctx.fillRect(gx, gy, rng.int(1, 2), 1);
    }
  },
  // a small crystal poking out of the floor (a faint blue light)
  crystalshard({ ctx, rng, room }, x, y) {
    for (let i = 0; i < 3; i++) {
      const cx = x - 3 + i * 3, h = rng.int(3, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(cx, y + 1, 3, 1);
      for (let k = 0; k < h; k++) {
        ctx.fillStyle = k === h - 1 ? '#d8f4ff' : k > h / 2 ? '#7ac4f0' : '#3a86c0';
        ctx.fillRect(cx, y - k, 2, 1);
      }
    }
    room.lights.push({ x, y: y - 3, r: 16, color: 'rgba(90,170,255,0.35)' });
  },
  // a stretch of old mine-cart rails
  rails({ ctx, rng }, x, y) {
    const l = rng.int(30, 50);
    for (let i = 0; i < l; i += 6) {
      ctx.fillStyle = '#3a2a1c';
      ctx.fillRect(x - l / 2 + i, y - 4, 3, 10);
    }
    ctx.fillStyle = '#5a5a62';
    ctx.fillRect(x - l / 2, y - 3, l, 1);
    ctx.fillRect(x - l / 2, y + 3, l, 1);
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(x - l / 2, y - 2, l, 1);
    ctx.fillRect(x - l / 2, y + 4, l, 1);
  },
  // a skull lying on the floor
  skull({ ctx }, x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - 3, y + 3, 8, 2);
    ctx.fillStyle = '#d8d0b8';
    ctx.fillRect(x - 3, y - 3, 7, 5);
    ctx.fillRect(x - 2, y + 2, 5, 2);
    ctx.fillStyle = '#160f0c';
    ctx.fillRect(x - 2, y - 1, 2, 2);
    ctx.fillRect(x + 1, y - 1, 2, 2);
  },
  // a puddle of wax with stubby candles (warm light)
  candlepile({ ctx, rng, room }, x, y) {
    ctx.fillStyle = '#c8bca0';
    ctx.fillRect(x - 7, y, 15, 3);
    for (let i = 0; i < 3; i++) {
      const cx = x - 5 + i * 5, h = rng.int(3, 6);
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(cx, y - h, 2, h);
      ctx.fillStyle = '#ffd25a';
      ctx.fillRect(cx, y - h - 2, 1, 2);
    }
    room.lights.push({ x, y: y - 4, r: 22, color: 'rgba(255,190,110,0.45)' });
  },
  // shells and pebbles washed up
  shells({ ctx, rng }, x, y) {
    for (let i = 0; i < 6; i++) {
      const sx = x + rng.int(-9, 9), sy = y + rng.int(-5, 5);
      ctx.fillStyle = rng.pick(['#d8c8c0', '#b8a8b8', '#c8b8a0']);
      ctx.fillRect(sx, sy, 3, 2);
      ctx.fillStyle = '#7a6a6a';
      ctx.fillRect(sx + 1, sy + 1, 1, 1);
    }
  },
  // pale reeds growing out of the wet floor
  reeds({ ctx, rng }, x, y) {
    for (let i = 0; i < 7; i++) {
      const rx = x + rng.int(-6, 6), h = rng.int(5, 11);
      ctx.fillStyle = rng.chance(0.5) ? '#5a7a5a' : '#4a6a5a';
      pixelLine(ctx, rx, y + 2, rx + rng.int(-2, 2), y + 2 - h);
    }
  },
  // broken stone and a dropped shackle
  rubble({ ctx, rng, look }, x, y) {
    for (let i = 0; i < 6; i++) {
      const rx = x + rng.int(-9, 9), ry = y + rng.int(-5, 5), s = rng.int(2, 4);
      ctx.fillStyle = look.rock[0]; ctx.fillRect(rx, ry + 1, s, s - 1);
      ctx.fillStyle = look.rock[rng.int(2, 3)]; ctx.fillRect(rx, ry, s, s - 1);
    }
    if (rng.chance(0.4)) { ctx.fillStyle = '#4c525e'; ctx.fillRect(x - 3, y + 6, 6, 1); ctx.fillRect(x - 3, y + 4, 1, 2); ctx.fillRect(x + 2, y + 4, 1, 2); }
  },
  // dead flowers left on a grave
  petals({ ctx, rng }, x, y) {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = rng.pick(['#6a3a5a', '#4a2a44', '#8a6a3a', '#3a4a2a']);
      ctx.fillRect(x + rng.int(-8, 8), y + rng.int(-4, 4), 2, 1);
    }
    ctx.fillStyle = '#3a4a2a'; pixelLine(ctx, x - 4, y + 3, x + 3, y - 2);
  },
  // melted violet candle stubs (faint violet light)
  waxstubs({ ctx, rng, room }, x, y) {
    ctx.fillStyle = '#c8bca0'; ctx.fillRect(x - 6, y + 1, 13, 2);
    for (let i = 0; i < 3; i++) {
      const cx = x - 4 + i * 4, h = rng.int(2, 4);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(cx, y + 1 - h, 2, h);
      ctx.fillStyle = '#b48ae8'; ctx.fillRect(cx, y - 1 - h, 1, 2);
    }
    room.lights.push({ x, y: y - 3, r: 18, color: 'rgba(170,110,255,0.35)' });
  },
  // bubbles rising out of the mud
  bubbles({ ctx, rng }, x, y) {
    for (let i = 0; i < 5; i++) {
      const bx = x + rng.int(-8, 8), by = y + rng.int(-4, 4), r = rng.int(1, 2);
      ctx.fillStyle = '#342a3c'; ctx.fillRect(bx - r, by - r, r * 2 + 1, r * 2 + 1);
      ctx.fillStyle = '#5e4668'; ctx.fillRect(bx - r, by - r, 1, 1);
    }
  },
  // a rotting log half sunk in the muck
  rottenlog({ ctx, rng }, x, y) {
    const l = rng.int(18, 28);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x - l / 2 + 1, y + 3, l, 3);
    ctx.fillStyle = '#3e2a1a'; ctx.fillRect(x - l / 2, y - 1, l, 5);
    ctx.fillStyle = '#563c26'; ctx.fillRect(x - l / 2, y - 1, l, 1);
    ctx.fillStyle = '#4a6e22'; for (let i = 0; i < 4; i++) ctx.fillRect(x - l / 2 + rng.int(1, l - 2), y - 1, 2, 1);
  },
  // a dried pool of blood
  bloodstain({ ctx, rng }, x, y) {
    const rx = rng.int(8, 14), ry = Math.round(rx * 0.5);
    for (let yy = -ry; yy <= ry; yy++) {
      const half = Math.round(rx * Math.sqrt(1 - (yy / (ry + 0.5)) ** 2)) + rng.int(-1, 1);
      ctx.fillStyle = 'rgba(70,6,10,0.55)';
      ctx.fillRect(x - half, y + yy, half * 2, 1);
    }
  },
  // a few loose teeth
  teeth({ ctx, rng }, x, y) {
    for (let i = 0; i < 5; i++) {
      const tx = x + rng.int(-8, 8), ty = y + rng.int(-4, 4);
      ctx.fillStyle = '#160f0c'; ctx.fillRect(tx - 1, ty - 1, 4, 4);
      ctx.fillStyle = '#e8e0c8'; ctx.fillRect(tx, ty, 2, 2);
      ctx.fillStyle = '#b8a888'; ctx.fillRect(tx, ty + 2, 2, 1);
    }
  },
  // a length of cord lying in a loop
  cord({ ctx, rng }, x, y) {
    let cx = x - 10, cy = y;
    for (let k = 0; k < 26; k++) {
      ctx.fillStyle = k % 3 ? '#9a3438' : '#5a141a';
      ctx.fillRect(Math.round(cx), Math.round(cy), 2, 2);
      cx += 0.8; cy += Math.sin(k * 0.5) * 0.9;
    }
  },
  // a long pale scar across the floor
  scarline({ ctx, rng }, x, y) {
    const l = rng.int(16, 30);
    ctx.fillStyle = '#e4d0c0'; ctx.fillRect(x - l / 2, y, l, 2);
    ctx.fillStyle = '#1a1a20'; for (let i = 0; i < l; i += 4) ctx.fillRect(x - l / 2 + i, y - 1, 1, 4);
  },
  // a few scattered bones
  bones({ ctx, rng }, x, y) {
    for (let i = 0; i < 3; i++) {
      const bx = x + rng.int(-8, 8), by = y + rng.int(-5, 5), l = rng.int(4, 7);
      ctx.fillStyle = '#c8c0a8';
      ctx.fillRect(bx, by, l, 1);
      ctx.fillRect(bx - 1, by - 1, 1, 3);
      ctx.fillRect(bx + l, by - 1, 1, 3);
    }
  },
};

// ---------------------------------------------------------------------------
// Tile sprites, generated once per look with a fixed seed so they look the same every run.
// ---------------------------------------------------------------------------
const tileArtCache = new Map();

function blobSprite(rng, palette, { size = TILE, rx = size * 0.43, ry = size * 0.38, cx = size / 2, cy = size / 2 + 1, wobble = 0.12, cracks = 1, moss = 0, mossColor = PAL.moss } = {}) {
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const edge = new Float32Array(17).map(() => 1 + rng.float(-wobble, wobble * 0.5));
  edge[16] = edge[0];
  const noise = valueNoise(rng, 4, size, size);

  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const ang = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
      const fi = ang * 16, i0 = fi | 0, t = fi - i0;
      const m = edge[i0] + (edge[i0 + 1] - edge[i0]) * t;
      if (dx * dx + dy * dy <= m * m) mask[y * size + x] = 1;
    }
  }
  const at = (x, y) => x >= 0 && y >= 0 && x < size && y < size && mask[y * size + x] === 1;
  const set = (x, y, col, a = 255) => {
    const i = (y * size + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!at(x, y)) {
        if (at(x - 1, y - 3) || at(x, y - 2)) set(x, y, [0, 0, 0], 110); // contact shadow
        continue;
      }
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) {
        set(x, y, palette[0]);
        continue;
      }
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      let v = 2.3 - nx * 0.9 - ny * 1.5 + (noise(x, y) - 0.5) * 1.1;
      if (!at(x, y + 2)) v -= 0.9; // dark underside
      v += BAYER[(y & 3) * 4 + (x & 3)] - 0.5;
      set(x, y, palette[Math.max(1, Math.min(palette.length - 1, Math.floor(v)))]);
    }
  }
  ctx.putImageData(img, 0, 0);

  ctx.fillStyle = css(palette[0]);
  const s = size / 32;
  for (let i = 0; i < cracks; i++) {
    let x = Math.round(rng.int(-6, 6) * s + cx), y = Math.round(rng.int(-6, 2) * s + cy);
    for (let k = 0; k < rng.int(3, 7); k++) {
      if (at(x, y)) ctx.fillRect(x, y, 1, 1);
      x += rng.int(-1, 1);
      y += rng.chance(0.7) ? 1 : 0;
    }
  }
  for (let i = 0; i < moss; i++) {
    const x = Math.round(cx + rng.int(-8, 8) * s), y = Math.round(cy + rng.int(-12, -6) * s);
    if (at(x, y) && at(x, y + 1)) {
      ctx.fillStyle = mossColor;
      ctx.fillRect(x, y, rng.int(1, 3), 1);
    }
  }
  return c;
}

function pixelsToCanvas(rows, colors) {
  const [c, ctx] = makeCanvas(rows[0].length, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = colors[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

// Breakable obstacles (shots crack them), one look per variant.
const POTS = {
  jar: {
    rows: [
      '....kkkkkk....',
      '...kCCCCCCk...',
      '....kNNNNk....',
      '....kcbbck....',
      '...kcbbbbck...',
      '..kcbbaabbck..',
      '.kcbbaaabbbck.',
      '.kcbaaabbbbck.',
      '.kcbaabbbbcck.',
      '.kcbabbbbbcck.',
      '.kcbbbbbbccck.',
      '..kcbbbbccck..',
      '..kccbbcccck..',
      '...kcccccck...',
      '....kkkkkk....',
    ],
    colors: { k: PAL.outline, C: '#b8865a', N: '#1a100a', a: '#b8865a', b: '#8a5c3a', c: '#5a3a26' },
    debris: ['#5a3a26', '#7a5034', '#9a6a44', '#b8865a'],
  },
  // an old wine barrel with iron hoops
  barrel: {
    rows: [
      '...kkkkkkkk...',
      '..kHHHHHHHHk..',
      '.kHaaaaaaaaHk.',
      '.kibbbbbbbbik.',
      '.kiiiiiiiiiik.',
      'kabbabbbbabbck',
      'kabbabbbbabbck',
      'kabbabbbbabbck',
      'kabbabbbbabbck',
      '.kiiiiiiiiiik.',
      '.kabbabbbbbck.',
      '.kabbabbbbbck.',
      '..kiiiiiiiik..',
      '...kkkkkkkk...',
    ],
    colors: { k: PAL.outline, H: '#7a5a3a', a: '#9a7048', b: '#6a4630', c: '#4a3020', i: '#3a3a42' },
    debris: ['#4a3020', '#6a4630', '#9a7048', '#3a3a42'],
  },
  // a dented bucket of glowing coals
  coalbucket: {
    rows: [
      '..............',
      '..kkkkkkkkkk..',
      '.kyFkfyFkfFyk.',
      '.kFfkFfkyfFfk.',
      'kkkkkkkkkkkkkk',
      'kSSsSSSSsSSSDk',
      '.kSsSSSSSsSDk.',
      '.kSsSSSSSsSDk.',
      '.kkkkkkkkkkkk.',
      '.kSsSSSSSsSDk.',
      '.kSsSSSSSsSDk.',
      '..kSSSSSSSDk..',
      '..kkkkkkkkkk..',
    ],
    colors: { k: PAL.outline, S: '#5a5a62', s: '#7a7a84', D: '#3a3a42', f: '#e04a18', F: '#ff8a2a', y: '#ffd25a' },
    debris: ['#5a5a62', '#3a3a42', '#e04a18', '#1a1210'],
  },
  // a bundle wrapped in old web (sometimes something is still alive inside)
  cocoon: {
    rows: [
      '.....kkkk.....',
      '....kWWwWk....',
      '...kWwWWwWk...',
      '..kWWwwWWwWk..',
      '..kwWWwWwWWk..',
      '.kWWwWWwWWwWk.',
      '.kWwWWwWWwWWk.',
      '.kWWwWwWWwWWk.',
      '.kwWWwWWwWwWk.',
      '..kWWwWWwWWk..',
      '..kWwWWwWWwk..',
      '...kWWwWWwk...',
      '....kwWWwk....',
      '.....kkkk.....',
    ],
    colors: { k: '#2a2820', W: '#c8c4b8', w: '#8a8678' },
    debris: ['#c8c4b8', '#8a8678', '#e8e4d8', '#4a3e32'],
  },
  // a lump of rock split open, full of blue crystals
  crystal: {
    rows: [
      '....kk..kk....',
      '...kLk.kLk....',
      '...kLMkkLMk...',
      '..kkLMkLLMk...',
      '..kLLMMkLMMk..',
      '.krkLMMkLMMkk.',
      '.krrkLMMkMMrk.',
      'krrrrkkkkkrrrk',
      'krRRrrrrrRRrrk',
      'krRrrrrrrrRrdk',
      '.krrrrrrrrrddk',
      '.kkrrrrrrrddk.',
      '...kkkkkkkkk..',
    ],
    colors: { k: PAL.outline, L: '#d8f4ff', M: '#3a86c0', r: '#4a4440', R: '#6a625a', d: '#2a2622' },
    debris: ['#4a4440', '#3a86c0', '#7ac4f0', '#d8f4ff'],
  },
  // a stone urn full of old bones
  boneurn: {
    rows: [
      '...kkkkkkkk...',
      '..kBbBkBbBBk..',
      '..kkkkkkkkkk..',
      '...kSSSSSsk...',
      '..kSSSSSSSsk..',
      '.kSSsSSSSSssk.',
      '.kSsSSSSSSSsk.',
      '.kSsSkkkkSSsk.',
      '.kSsSkddkSSsk.',
      '.kSsSkkkkSssk.',
      '..kSSSSSSssk..',
      '...kSSSSssk...',
      '..kkkkkkkkkk..',
    ],
    colors: { k: PAL.outline, B: '#e0d8c2', b: '#9a927e', S: '#8a8478', s: '#5a5650', d: '#2a2622' },
    debris: ['#8a8478', '#5a5650', '#e0d8c2', '#9a927e'],
  },
  // a clay jar crusted with barnacles, dripping
  barnaclejar: {
    rows: [
      '....kkkkkk....',
      '...kCCCCCCk...',
      '....kNNNNk....',
      '....kcbbck....',
      '...kcbwbbck...',
      '..kcbbaabwck..',
      '.kcwbaaabbbck.',
      '.kcbaaabbwbck.',
      '.kcbaawbbbcck.',
      '.kcwabbbbwcck.',
      '.kcbbbwbbccck.',
      '..kcbbbbccck..',
      '...kcccccck...',
      '....kkkkkk....',
    ],
    colors: { k: PAL.outline, C: '#6a8a8a', N: '#0a1214', a: '#6a8a8a', b: '#4a6668', c: '#2e4446', w: '#c8d0c4' },
    debris: ['#2e4446', '#4a6668', '#6a8a8a', '#c8d0c4'],
  },
  // a rusty iron lantern on the floor, its candle long dead
  ironlantern: {
    rows: [
      '.....kkkk.....',
      '....kIiiIk....',
      '...kkkkkkkk...',
      '..kIkggggkIk..',
      '..kIkgyygkIk..',
      '..kIkgyygkIk..',
      '..kIkggggkIk..',
      '..kIkggggkIk..',
      '..kIkggggkIk..',
      '..kkkkkkkkkk..',
      '..kIIiiiiIIk..',
      '.kkkkkkkkkkkk.',
    ],
    colors: { k: PAL.outline, I: '#6a7280', i: '#4c525e', g: '#2a2e36', y: '#5a5040' },
    debris: ['#4c525e', '#6a7280', '#2a2e36', '#8a5a3a'],
  },
  // a sealed marble urn with a violet wax seal
  waxurn: {
    rows: [
      '....kkkkkk....',
      '...kVvVVvVk...',
      '....kkkkkk....',
      '...kMMMMmmk...',
      '..kMMMMMMmmk..',
      '.kMMMMMMMMmmk.',
      '.kMMMMMMMMmmk.',
      '.kMMMVVMMMmmk.',
      '.kMMMVVMMMmmk.',
      '..kMMMMMMmmk..',
      '...kMMMMmmk...',
      '..kkkkkkkkkk..',
    ],
    colors: { k: PAL.outline, M: '#aaa6ae', m: '#68646e', V: '#7a44b0', v: '#b48ae8' },
    debris: ['#aaa6ae', '#68646e', '#7a44b0', '#d0ccd2'],
  },
  // a barrel overflowing with tar
  tarbarrel: {
    rows: [
      '..kkkkkkkkkk..',
      '.kTTtTTTTtTTk.',
      '.kTkkTTkTTTTk.',
      '.kibbbbbbbbik.',
      '.kiiiiiiiiiik.',
      'kabTbabbbabbck',
      'kabTbabbbabbck',
      'kabbbabbbabbck',
      '.kiiiiiiiiiik.',
      '.kabbabbbbbck.',
      '..kiiiiiiiik..',
      '...kkkkkkkk...',
    ],
    colors: { k: PAL.outline, a: '#6a5040', b: '#4a3828', c: '#2e2218', i: '#2a2a30', T: '#141018', t: '#4a3e54' },
    debris: ['#141018', '#4a3828', '#6a5040', '#2a2a30'],
  },
  // a swollen sac of flesh, veined, ready to burst
  pustule: {
    rows: [
      '....kkkkk.....',
      '...kPPpPPk....',
      '..kPPPPPppk...',
      '.kPpPPPPPppk..',
      '.kPPPvPPPPpk..',
      'kPPPPvvPPPppk.',
      'kPPpPPPvPPppk.',
      'kPPPPPPPPpppk.',
      '.kPPPPvPPppk..',
      '.kppPPPPpppk..',
      '..kkppppppk...',
      '....kkkkkk....',
    ],
    colors: { k: PAL.outline, P: '#b86a70', p: '#7a3a40', v: '#5a141a' },
    debris: ['#b86a70', '#7a3a40', '#c0262c', '#5a141a'],
  },
  // a hard black cyst
  cyst: {
    rows: [
      '....kkkkk.....',
      '...kddDddk....',
      '..kdDDDDddk...',
      '.kdDDgDDDddk..',
      '.kdDDDDDDddk..',
      'kdDDDDDDDdddk.',
      'kdDgDDDDDdddk.',
      'kdDDDDDDDdddk.',
      '.kdDDDDDDddk..',
      '..kddddddddk..',
      '...kkkkkkkk...',
    ],
    colors: { k: PAL.outline, D: '#2e2a2c', d: '#16141a', g: '#4a7a20' },
    debris: ['#2e2a2c', '#16141a', '#4a7a20', '#0a0a0c'],
  },
  // a lump wrapped in old stained bandages
  bandaged: {
    rows: [
      '....kkkkk.....',
      '...kWWwWWk....',
      '..kWWWWWwwk...',
      '.kwwwwwwwwwk..',
      '.kWWrWWWWwwk..',
      'kWWWWWWWWwwwk.',
      'kwwwwwwwwwwwk.',
      'kWWWWWrWWwwwk.',
      '.kWWWWWWWwwk..',
      '..kwwwwwwwwk..',
      '...kkkkkkkk...',
    ],
    colors: { k: PAL.outline, W: '#d8ccb8', w: '#a89a84', r: '#8a2a2a' },
    debris: ['#d8ccb8', '#a89a84', '#8a2a2a', '#5a4a3a'],
  },
};

const SPIKE = [
  '...k...',
  '..kLk..',
  '..kLMk.',
  '.kLlMk.',
  '.kLlMMk',
  'kLllMMk',
  'kkkkkkk',
];
const SPIKE_COLORS = { k: '#0e0b0a', L: '#b8b2a8', l: '#7a746c', M: '#4a4540' };

function makePotTile(kind) {
  const def = POTS[kind] || POTS.jar;
  const [c, ctx] = makeCanvas(TILE, TILE);
  const pot = pixelsToCanvas(def.rows, def.colors);
  const x = Math.floor((TILE - pot.width) / 2), y = TILE - pot.height - 2;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x + 1, TILE - 4, pot.width - 2, 3);
  ctx.fillRect(x - 1, TILE - 3, pot.width + 2, 1);
  ctx.drawImage(pot, x, y);
  return c;
}
export function potDebris(kind) { return (POTS[kind] || POTS.jar).debris; }

function makeSpikeTile() {
  const [c, ctx] = makeCanvas(TILE, TILE);
  const spike = pixelsToCanvas(SPIKE, SPIKE_COLORS);
  ctx.fillStyle = '#1a1310';
  ctx.fillRect(1, 1, TILE - 2, TILE - 2);
  ctx.fillStyle = '#2a1d16';
  ctx.fillRect(2, 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#3a271c';
  ctx.fillRect(2, 2, TILE - 4, 1);
  const span = TILE - 4 - spike.width;
  for (const [fx, fy] of [[0, 0], [1, 0], [0.5, 0.45], [0, 0.9], [1, 0.9]]) {
    const sx = 2 + Math.round(fx * span), sy = 1 + Math.round(fy * (TILE - 4 - spike.height));
    ctx.fillStyle = '#0b0807';
    ctx.fillRect(sx, sy + spike.height - 1, spike.width, 2);
    ctx.drawImage(spike, sx, sy);
  }
  return c;
}

function makeBlockTile() {
  const [c, ctx] = makeCanvas(TILE, TILE);
  const e = TILE - 2;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(3, 4, e, e);
  ctx.fillStyle = '#121216';
  ctx.fillRect(1, 1, e, e - 1);
  ctx.fillStyle = '#2c2c34';
  ctx.fillRect(2, 2, e - 2, e - 3);
  ctx.fillStyle = '#44444e';
  ctx.fillRect(2, 2, e - 2, 2);
  ctx.fillRect(2, 2, 2, e - 3);
  ctx.fillStyle = '#1a1a20';
  ctx.fillRect(2, e - 3, e - 2, 2);
  ctx.fillRect(e - 2, 2, 2, e - 3);
  const mid = Math.floor(TILE / 2) - 2;
  ctx.fillStyle = '#22222a';
  ctx.fillRect(2, mid, e - 2, 3);
  ctx.fillStyle = '#6a6a74';
  for (const [x, y] of [[5, 5], [e - 5, 5], [5, e - 6], [e - 5, e - 6], [5, mid + 1], [e - 5, mid + 1]]) ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = '#5a3020';
  ctx.fillRect(9, mid + 5, 3, 1);
  ctx.fillRect(14, 7, 2, 1);
  return c;
}

function makeMarkedRock(rng) {
  const warm = rgb(['#1e1612', '#3a2a20', '#55402e', '#6e553c', '#8a6e4c']);
  const c = blobSprite(rng, warm, { cracks: 0, moss: 0 });
  const ctx = c.getContext('2d');
  const cx = TILE / 2, cy = TILE / 2 - 1;
  ctx.fillStyle = '#c8782a';
  for (let i = -3; i <= 3; i++) {
    ctx.fillRect(cx + i, cy + i, 1, 1);
    ctx.fillRect(cx + i, cy - i, 1, 1);
  }
  ctx.fillStyle = '#ffd27a';
  ctx.fillRect(cx, cy, 1, 1);
  return c;
}

// A heap of old wax, knocked down a stage per hit (stage 0 = whole, 3 = a last lump).
// Lumpy mounds of melted candle ends with drips down the sides and a few burnt wicks sticking out.
function makeHeapStages(rng) {
  const OUT = '#2a1e14', W = ['#7a6448', '#a8906a', '#c9b48a', '#e8d9b0', '#fff6dc'];
  return [1, 0.8, 0.6, 0.42].map((k, stage) => {
    const [c, ctx] = makeCanvas(TILE, TILE);
    const lumps = [[0, 0, 0.5, 0.42], [-0.28, 0.12, 0.3, 0.26], [0.28, 0.14, 0.3, 0.24], [0.02, -0.22, 0.3, 0.26]]
      .slice(0, stage < 2 ? 4 : stage < 3 ? 3 : 1);
    const cx = TILE / 2, base = TILE - 4;
    const inside = (x, y) => lumps.some(([lx, ly, rx, ry]) => {
      const dx = (x - cx - lx * TILE * k) / (rx * TILE * k), dy = (y - (base - TILE * 0.32 * k) - ly * TILE * k) / (ry * TILE * k);
      return dx * dx + dy * dy <= 1 && y <= base;
    });
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (!inside(x, y)) {
          if (inside(x, y - 1) && y <= base + 1) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y, 1, 1); }
          continue;
        }
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        let v = 2.6 - (x - cx) / (TILE * 0.5) - (y - base + TILE * 0.3 * k) / (TILE * 0.25 * k) + rng.float(-0.4, 0.4);
        if (!inside(x, y + 2)) v -= 1;
        ctx.fillStyle = edge ? OUT : W[Math.max(0, Math.min(4, Math.round(v)))];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // drips down the side and burnt wicks standing up out of the top (never two at the same
    // height, so the heap can't look like a face)
    const tops = [];
    for (let i = 0; i < 3 - Math.min(2, stage); i++) {
      const x = Math.round(cx + rng.int(-6, 6) * k);
      if (tops.some((t) => Math.abs(t - x) < 3)) continue;
      let y = 0;
      while (y < base && !inside(x, y)) y++;
      if (y >= base) continue;
      tops.push(x);
      if (rng.chance(0.6)) { ctx.fillStyle = W[4]; ctx.fillRect(x, y, 1, rng.int(2, 4)); }
      if (stage < 2) {
        const h = 2 + tops.length;
        ctx.fillStyle = '#6a4c36'; ctx.fillRect(x, y - h, 1, h);
        ctx.fillStyle = '#e8702a'; ctx.fillRect(x, y - h, 1, 1);
      }
    }
    return c;
  });
}

// A powder keg: a squat barrel with red hoops and a big pale flame mark on the front.
function makeKegTile() {
  const [c, ctx] = makeCanvas(TILE, TILE);
  const top = 2, bot = TILE - 2, h = bot - top, cx = TILE / 2;
  const r = (x, y, ww, hh, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, ww, hh); };
  // the half-width of the barrel on each row: bulging in the middle
  const half = (y) => Math.round(TILE * 0.24 + TILE * 0.07 * Math.sin(Math.PI * (y - top) / h));
  r(cx - half(bot - 1), bot, half(bot - 1) * 2, 1, 'rgba(0,0,0,0.45)');   // contact shadow
  for (let y = top; y < bot; y++) {
    const hw = half(y), x0 = cx - hw, w = hw * 2;
    r(x0 - 1, y, w + 2, 1, '#1a100a');                               // outline
    if (y === top || y === bot - 1) continue;
    r(x0, y, w, 1, '#6a4428');
    r(x0 + 1, y, 2, 1, '#9a6a3e');                                   // light side
    r(x0 + w - 2, y, 2, 1, '#44291a');                               // dark side
    for (const sx of [-3, 2]) r(cx + sx, y, 1, 1, '#523420');        // staves
  }
  r(cx - half(top) + 1, top + 1, half(top) * 2 - 2, 2, '#3a2416');   // the lid
  r(cx - half(top) + 2, top + 1, half(top) * 2 - 4, 1, '#4e321e');
  for (const yy of [top + 3, bot - 4]) {                             // red hoops
    const hw = half(yy);
    r(cx - hw, yy, hw * 2, 2, '#8a1e14'); r(cx - hw, yy, hw * 2, 1, '#d0402e');
  }
  // the pale flame mark in the middle
  const fy = top + Math.floor(h / 2);
  for (const [dx, dy, ww] of [[0, -3, 1], [-1, -2, 2], [-1, -1, 3], [-2, 0, 4], [-2, 1, 4], [-1, 2, 2]]) r(cx + dx, fy + dy, ww, 1, '#f4e6b8');
  r(cx - 1, fy, 1, 2, '#e8702a'); r(cx, fy + 1, 1, 1, '#e8702a');
  return c;
}

export function getTileArt(look = DEFAULT_LOOK) {
  let art = tileArtCache.get(look.id);
  if (art) return art;
  const rng = new RNG('wick-tiles:' + look.id);
  const rock = rgb(look.rock);
  art = {
    rocks: [0, 1, 2, 3].map((i) => blobSprite(rng, rock, { cracks: 1 + (i & 1), moss: look.rockMoss === false ? 0 : rng.int(0, 4), mossColor: look.stain })),
    marked: makeMarkedRock(rng),
    pot: makePotTile(look.pot),
    spikes: makeSpikeTile(),
    block: makeBlockTile(),
    bigRock: blobSprite(rng, rock, { size: TILE * 2, rx: TILE * 0.92, ry: TILE * 0.8, cy: TILE + 2, cracks: 4, moss: look.rockMoss === false ? 0 : rng.int(1, 5), mossColor: look.stain }),
    heap: makeHeapStages(rng),
    keg: makeKegTile(),
  };
  tileArtCache.set(look.id, art);
  return art;
}

function drawPit(ctx, room, c, r, x, y, look) {
  const n = (dc, dr) => room.inBounds(c + dc, r + dr) && room.get(c + dc, r + dr) === T.PIT;
  const F = look.floor;
  ctx.fillStyle = PAL.void;
  ctx.fillRect(x, y, TILE, TILE);
  if (!n(0, -1)) {
    // The far wall of the hole, seen from above
    const bands = [F[4], F[2], F[1], F[0], '#140e0c', '#0d0908', '#090606'];
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(x, y + i, TILE, 1);
    });
  }
  if (!n(-1, 0)) { ctx.fillStyle = F[0]; ctx.fillRect(x, y, 2, TILE); }
  if (!n(1, 0)) { ctx.fillStyle = F[0]; ctx.fillRect(x + TILE - 2, y, 2, TILE); }
  if (!n(0, 1)) { ctx.fillStyle = F[3]; ctx.fillRect(x, y + TILE - 1, TILE, 1); }
}

// Draws every tile of the room on top of the base canvas into room.bg.
export function composeRoom(room) {
  const look = room.style.look || DEFAULT_LOOK;
  const art = getTileArt(look);
  const ctx = room.bgCtx;
  ctx.drawImage(room.base, 0, 0);
  const anchors = room.bigRockAnchors();
  for (let r = 0; r < room.rows; r++) {
    for (let c = 0; c < room.cols; c++) {
      if (room.get(c, r) === T.PIT) drawPit(ctx, room, c, r, room.x0 + c * TILE, room.y0 + r * TILE, look);
    }
  }
  for (let r = 0; r < room.rows; r++) {
    for (let c = 0; c < room.cols; c++) {
      const t = room.get(c, r);
      const x = room.x0 + c * TILE, y = room.y0 + r * TILE;
      const v = room.variant[r * room.cols + c];
      if (t === T.ROCK) ctx.drawImage(art.rocks[v % art.rocks.length], x, y);
      else if (t === T.TINTED) ctx.drawImage(art.marked, x, y);
      else if (t === T.SPIKES) ctx.drawImage(art.spikes, x, y);
      else if (t === T.BLOCK) ctx.drawImage(art.block, x, y);
      else if (t === T.BIGROCK) { if (anchors.has(r * room.cols + c)) ctx.drawImage(art.bigRock, x, y); }
      else if (t === T.HEAP) ctx.drawImage(art.heap[Math.min(3, room.hits[r * room.cols + c])], x, y);
      else if (t === T.KEG) {
        ctx.drawImage(art.keg, x, y);
        // cracks and a smoking fuse hole as it takes hits
        const hits = room.hits[r * room.cols + c];
        ctx.fillStyle = PAL.outline;
        if (hits > 0) { ctx.fillRect(x + 8, y + 7, 1, 4); ctx.fillRect(x + 9, y + 11, 1, 2); }
        if (hits > 1) { ctx.fillRect(x + 15, y + 9, 1, 3); ctx.fillRect(x + 14, y + 12, 1, 3); ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x + 11, y + 3, 2, 1); }
      }
      else if (t === T.POT) {
        ctx.drawImage(art.pot, x, y);
        if (room.hits[r * room.cols + c] > 0) {
          const jx = x + Math.floor((TILE - 14) / 2), jy = y + TILE - 17;
          ctx.fillStyle = PAL.outline;
          ctx.fillRect(jx + 5, jy + 6, 1, 3);
          ctx.fillRect(jx + 6, jy + 9, 1, 2);
          ctx.fillRect(jx + 7, jy + 11, 2, 1);
          ctx.fillRect(jx + 10, jy + 5, 1, 3);
        }
      }
    }
  }
}
