// Room layout generator. Builds symmetrical hand-made-looking layouts from a chapter "style"
// (which features it likes), always the same for the same name, and keeps only layouts whose
// doors are all reachable. Chapters mix these with their hand-made rooms (src/data/rooms/).
//
// style: {
//   features: [[name, weight], ...]   pits | rocks | pillars | spikes | pots | blocks | ring | lake | rubble
//   density:  how many features per screen [min, max]
//   enemies:  { e: [min, max], f: [min, max], s: [min, max] } markers per screen
// }
import { RNG } from '../../engine/rng.js';
import { validateTemplate } from '../../game/room.js';
import { shapeOf, shapeWall, shapeSlots, slotCell } from '../../game/shapes.js';

const COLS = 13, ROWS = 7;

// Each feature paints into the grid around (c, r).
const FEATURES = {
  rocks(g, rng, c, r) { for (let i = 0; i < rng.int(2, 4); i++) put(g, c + rng.int(-1, 1), r + rng.int(-1, 1), '#'); },
  pillars(g, rng, c, r) { put(g, c, r, '#'); put(g, c + 3, r, '#'); },
  spikes(g, rng, c, r) { const h = rng.chance(0.5); for (let i = 0; i < rng.int(2, 4); i++) put(g, c + (h ? i : 0), r + (h ? 0 : i), '^'); },
  pots(g, rng, c, r) { for (let i = 0; i < rng.int(1, 3); i++) put(g, c + rng.int(-1, 1), r + rng.int(-1, 1), 'u'); },
  blocks(g, rng, c, r) { const h = rng.chance(0.5); for (let i = 0; i < rng.int(2, 3); i++) put(g, c + (h ? i : 0), r + (h ? 0 : i), 'X'); },
  pits(g, rng, c, r) { for (let i = 0; i < rng.int(2, 5); i++) put(g, c + rng.int(-1, 1), r + rng.int(0, 1), 'o'); },
  lake(g, rng, c, r) { for (let y = -1; y <= 1; y++) for (let x = -2; x <= 2; x++) if (Math.abs(x) + Math.abs(y) < 3) put(g, c + x, r + y, 'o'); },
  ring(g, rng, c, r) { for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0]]) if (!(x === 0 && y === 1)) put(g, c + x, r + y, '#'); },
  rubble(g, rng, c, r) { put(g, c, r, rng.chance(0.3) ? 't' : '#'); put(g, c + 1, r + rng.int(-1, 1), '#'); },
};

function put(g, c, r, ch) {
  if (r >= 0 && r < g.length && c >= 0 && c < g[0].length && g[r][c] === '.') g[r][c] = ch;
}

// Keep a little space free in front of every door (and the middle of the room walkable).
function clearDoors(g, shape) {
  for (const s of shapeSlots(shape)) {
    const [c, r] = slotCell(s, shape);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const y = r + dy, x = c + dx;
      if (y >= 0 && y < g.length && x >= 0 && x < g[0].length && g[y][x] !== '=') g[y][x] = '.';
    }
  }
}

function makeOne(name, rng, shape, style) {
  const s = shapeOf(shape);
  const cols = s.w * COLS, rows = s.h * ROWS;
  const g = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (shapeWall(shape, c, r) ? '=' : '.')));
  const mirror = rng.pick(['x', 'x', 'xy', 'y', 'none']);
  const total = (s.missing ? 3 : s.w * s.h);
  const n = Math.round(rng.int(style.density[0], style.density[1]) * total * (s.narrow ? 0.5 : 1));
  for (let i = 0; i < n; i++) {
    const f = rng.weighted(style.features.map(([id, weight]) => ({ id, weight }))).id;
    const c = rng.int(1, Math.floor(cols / 2)), r = rng.int(1, rows - 2);
    FEATURES[f](g, rng, c, r);
  }
  // mirror the left half (and/or top half) onto the other side
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if ((mirror === 'x' || mirror === 'xy') && c >= cols / 2 && g[r][cols - 1 - c] !== '=' && g[r][c] !== '=') g[r][c] = g[r][cols - 1 - c];
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if ((mirror === 'y' || mirror === 'xy') && r >= rows / 2 && g[rows - 1 - r][c] !== '=' && g[r][c] !== '=') g[r][c] = g[rows - 1 - r][c];
  }
  clearDoors(g, shape);
  // spawn markers on free floor, away from doors
  const free = [];
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) if (g[r][c] === '.') free.push([c, r]);
  const marks = [];
  for (const [ch, [lo, hi]] of Object.entries(style.enemies)) {
    const k = Math.round(rng.int(lo, hi) * (s.missing ? 2.2 : s.w * s.h) * (s.narrow ? 0.6 : 1));
    for (let i = 0; i < k && free.length; i++) {
      const j = rng.int(0, free.length - 1);
      const [c, r] = free.splice(j, 1)[0];
      if (shapeSlots(shape).some((sl) => { const [dc, dr] = slotCell(sl, shape); return Math.abs(dc - c) + Math.abs(dr - r) < 3; })) continue;
      marks.push([c, r, ch]);
    }
  }
  for (const [c, r, ch] of marks) g[r][c] = ch;
  return { id: name, shape, layout: g.map((row) => row.join('')), generated: true };
}

// `count` layouts of `shape` for a chapter style. Deterministic: same name, same rooms.
export function generateRooms(prefix, shape, count, style) {
  const out = [];
  const rng = new RNG(`${prefix}:${shape}`);
  for (let tries = 0; out.length < count && tries < count * 20; tries++) {
    const t = makeOne(`${prefix}-${shape}-${out.length + 1}`, rng, shape, style);
    if (!validateTemplate(t).length && t.layout.join('').match(/[efs]/)) out.push(t);
  }
  return out;
}
