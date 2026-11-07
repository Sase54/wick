// Room shapes. A room is built from "units": one unit is one screen (13 x 7 tiles).
// Big rooms span several units (the camera scrolls), L-shapes leave one unit out, and narrow
// rooms are one unit with thick walls squeezing the floor into a hall or a shaft.
//
// Doors sit in the middle of a unit's edge, and only on the outside of the room's bounding box
// (L-shapes have no doors facing their missing corner; halls only left/right, shafts only up/down).
import { COLS, ROWS } from './constants.js';

export const SHAPES = {
  '1x1': { w: 1, h: 1 },
  '2x1': { w: 2, h: 1 },
  '1x2': { w: 1, h: 2 },
  '2x2': { w: 2, h: 2 },
  L1: { w: 2, h: 2, missing: [1, 0] },   // top-right corner missing
  L2: { w: 2, h: 2, missing: [0, 0] },   // top-left
  L3: { w: 2, h: 2, missing: [1, 1] },   // bottom-right
  L4: { w: 2, h: 2, missing: [0, 1] },   // bottom-left
  hall: { w: 1, h: 1, narrow: 'h' },     // only rows 2-4 are floor
  shaft: { w: 1, h: 1, narrow: 'v' },    // only columns 4-8 are floor
};

// Mirroring a layout turns one L into another.
export const FLIP_X = { L1: 'L2', L2: 'L1', L3: 'L4', L4: 'L3' };
export const FLIP_Y = { L1: 'L3', L3: 'L1', L2: 'L4', L4: 'L2' };

export function shapeOf(name) { return SHAPES[name] || SHAPES['1x1']; }

// Units the room covers, relative to its top-left unit.
export function shapeUnits(name) {
  const s = shapeOf(name);
  const out = [];
  for (let uy = 0; uy < s.h; uy++) {
    for (let ux = 0; ux < s.w; ux++) {
      if (s.missing && s.missing[0] === ux && s.missing[1] === uy) continue;
      out.push([ux, uy]);
    }
  }
  return out;
}

// Door slots: { dir, ux, uy, key }.
export function shapeSlots(name) {
  const s = shapeOf(name);
  const out = [];
  for (const [ux, uy] of shapeUnits(name)) {
    const add = (dir) => out.push({ dir, ux, uy, key: `${dir}:${ux}:${uy}` });
    if (s.narrow !== 'h' && uy === 0) add('up');
    if (s.narrow !== 'h' && uy === s.h - 1) add('down');
    if (s.narrow !== 'v' && ux === 0) add('left');
    if (s.narrow !== 'v' && ux === s.w - 1) add('right');
  }
  return out;
}

// Is tile (c, r) solid wall because of the shape (missing corner, narrow sides)?
export function shapeWall(name, c, r) {
  const s = shapeOf(name);
  if (s.missing) {
    const ux = Math.floor(c / COLS), uy = Math.floor(r / ROWS);
    if (ux === s.missing[0] && uy === s.missing[1]) return true;
  }
  if (s.narrow === 'h') return r < 2 || r > 4;
  if (s.narrow === 'v') return c < 4 || c > 8;
  return false;
}

// The tile in front of a door slot (must be walkable).
export function slotCell(slot, name) {
  const s = shapeOf(name);
  const cols = s.w * COLS, rows = s.h * ROWS;
  switch (slot.dir) {
    case 'up': return [slot.ux * COLS + 6, 0];
    case 'down': return [slot.ux * COLS + 6, rows - 1];
    case 'left': return [0, slot.uy * ROWS + 3];
    default: return [cols - 1, slot.uy * ROWS + 3];
  }
}

// The doorway of a slot: the tile in the doorway and the one in front of it. Rooms keep these
// clear of rocks, pits, spikes and jars (src/game/room.js), so every door can be walked through.
export function doorwayTiles(slot, name) {
  const [c, r] = slotCell(slot, name);
  const [dc, dr] = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[slot.dir];
  return [[c, r], [c + dc, r + dr]];
}
