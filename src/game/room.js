// A single room: tile grid, art, door slots, and queries used by collision.
//
// Rooms come in shapes (src/game/shapes.js): one screen, big rooms of 2 or 4 screens, L-shapes
// and narrow halls/shafts. Coordinates are "room space": the top-left of the floor is always at
// (ROOM_X, ROOM_Y) and the walls wrap around it; big rooms simply extend right and down, and the
// game's camera scrolls to follow the player.
import { makeCanvas } from '../engine/sprites.js';
import { PAL } from '../data/palette.js';
import { TILE, COLS, ROWS, ROOM_X, ROOM_Y, T, TILE_CHARS, DOOR_GAP } from './constants.js';
import { shapeOf, shapeSlots, shapeWall, slotCell } from './shapes.js';
import { generateRoomBase, composeRoom, potDebris } from './roomart.js';
import { decorateRoom } from './roomdecor.js';
import { sfx } from '../engine/audio.js';

const WALK_SOLID = new Set([T.ROCK, T.PIT, T.POT, T.BLOCK, T.TINTED, T.WALL]);
const SHOT_SOLID = new Set([T.ROCK, T.POT, T.BLOCK, T.TINTED, T.WALL]);
const FLY_SOLID = new Set([T.ROCK, T.POT, T.BLOCK, T.TINTED, T.WALL]); // fliers cross pits
const POT_HITS = 2;

export class Room {
  constructor({ template, rng, style = {}, type = 'normal' }) {
    this.template = template;
    this.type = type;
    this.shape = template.shape || '1x1';
    const s = shapeOf(this.shape);
    this.cols = s.w * COLS;
    this.rows = s.h * ROWS;
    this.x0 = ROOM_X;
    this.y0 = ROOM_Y;
    this.W = this.cols * TILE;
    this.H = this.rows * TILE;
    this.R = this.x0 + this.W;
    this.B = this.y0 + this.H;
    this.worldW = this.W + ROOM_X * 2;
    this.worldH = this.H + ROOM_Y * 2;

    const n = this.cols * this.rows;
    this.grid = new Uint8Array(n);
    this.variant = new Uint8Array(n);
    this.hits = new Uint8Array(n);
    this.spawns = [];
    for (let r = 0; r < this.rows; r++) {
      const row = template.layout[r] || '';
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        this.variant[i] = rng.int(0, 255);
        if (shapeWall(this.shape, c, r)) { this.grid[i] = T.WALL; continue; }
        const ch = row[c] || '.';
        const tile = TILE_CHARS[ch];
        this.grid[i] = tile ?? T.FLOOR;
        if (tile === undefined) this.spawns.push({ c, r, ch, ...this.tileCenter(c, r) });
      }
    }
    // Door slots, with their position in room space. The floor sets slot.door and doors[key].
    this.slots = shapeSlots(this.shape).map((sl) => {
      const unitX = this.x0 + sl.ux * COLS * TILE, unitY = this.y0 + sl.uy * ROWS * TILE;
      const pos = {
        up: [unitX + (COLS * TILE) / 2, this.y0],
        down: [unitX + (COLS * TILE) / 2, this.B],
        left: [this.x0, unitY + (ROWS * TILE) / 2],
        right: [this.R, unitY + (ROWS * TILE) / 2],
      }[sl.dir];
      return { ...sl, x: pos[0], y: pos[1], cell: slotCell(sl, this.shape), door: null };
    });
    this.doors = {};          // slot key -> Door, filled in by the floor
    this.cleared = true;      // set to false when enemies are placed
    this.enemies = [];
    this.pickups = [];
    this.bombs = [];
    this.pedestals = [];
    this.hazards = [];        // variant hazards (webs, fire jets...), see src/game/hazards.js
    this.keeper = null;
    this.populated = false;
    this.version = 0;         // bumps whenever a tile changes (enemy paths rebuild)
    this.style = style;
    this.base = generateRoomBase(rng.fork('art'), style, this);
    [this.bg, this.bgCtx] = makeCanvas(this.worldW, this.worldH);
    this.dirty = true;
    this.redraw();
  }

  // Slots that have a door.
  get doorSlots() { return this.slots.filter((s) => s.door); }

  inBounds(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }

  // Outside the grid counts as floor for tile queries; walls are handled by clampToWalls.
  get(c, r) {
    return this.inBounds(c, r) ? this.grid[r * this.cols + c] : T.FLOOR;
  }

  set(c, r, t) {
    if (!this.inBounds(c, r)) return;
    this.grid[r * this.cols + c] = t;
    this.hits[r * this.cols + c] = 0;
    this.dirty = true;
    this.version++;
  }

  isWalkSolid(c, r) { return WALK_SOLID.has(this.get(c, r)); }
  isFlySolid(c, r) { return FLY_SOLID.has(this.get(c, r)); }
  isWall(c, r) { return this.get(c, r) === T.WALL; }
  blocksShots(c, r) { return !this.inBounds(c, r) || SHOT_SOLID.has(this.get(c, r)); }

  colAt(x) { return Math.floor((x - this.x0) / TILE); }
  rowAt(y) { return Math.floor((y - this.y0) / TILE); }
  tileCenter(c, r) { return { x: this.x0 + c * TILE + TILE / 2, y: this.y0 + r * TILE + TILE / 2 }; }
  get centerX() { return this.x0 + this.W / 2; }
  get centerY() { return this.y0 + this.H / 2; }

  // A shot hit tile (c, r). Jars crack and then break. Returns true if something broke.
  hitTile(c, r, game) {
    if (this.get(c, r) !== T.POT) return false;
    const i = r * this.cols + c;
    this.hits[i]++;
    this.dirty = true;
    const { x, y } = this.tileCenter(c, r);
    if (this.hits[i] < POT_HITS) {
      game.particles.burst(x, y, 3, { colors: ['#7a5034', '#9a6a44'], speed: 30, z: 8 });
      return false;
    }
    this.breakTile(c, r, game);
    return true;
  }

  // Nearest walkable tile center to (x, y), searching outward tile by tile.
  findFreeSpot(x, y) {
    const c0 = Math.max(0, Math.min(this.cols - 1, this.colAt(x)));
    const r0 = Math.max(0, Math.min(this.rows - 1, this.rowAt(y)));
    if (!this.isWalkSolid(c0, r0)) return { x, y };
    for (let d = 1; d < Math.max(this.cols, this.rows); d++) {
      for (let dr = -d; dr <= d; dr++) {
        for (let dc = -d; dc <= d; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue;
          const c = c0 + dc, r = r0 + dr;
          if (this.inBounds(c, r) && !this.isWalkSolid(c, r)) return this.tileCenter(c, r);
        }
      }
    }
    return { x, y };
  }

  // A random walkable spot (spawning things in big rooms).
  randomFreeSpot(rng, margin = 1) {
    for (let i = 0; i < 60; i++) {
      const c = rng.int(margin, this.cols - 1 - margin), r = rng.int(margin, this.rows - 1 - margin);
      if (!this.isWalkSolid(c, r)) return this.tileCenter(c, r);
    }
    return this.findFreeSpot(this.centerX, this.centerY);
  }

  breakTile(c, r, game) {
    const t = this.get(c, r);
    if (t === T.FLOOR || t === T.PIT || t === T.BLOCK || t === T.SPIKES || t === T.WALL) return;
    const { x, y } = this.tileCenter(c, r);
    this.set(c, r, T.FLOOR);
    sfx(t === T.POT ? 'jarBreak' : 'rockBreak');
    const colors = t === T.POT ? potDebris(this.style.look?.pot) : (this.style.look?.rock || PAL.rock).slice(1);
    game.particles.burst(x, y, 14, { colors, speed: 70, z: 8, vz: 70, size: 1, sizeVar: 2, life: 0.6 });
    this.paintDecal((g) => {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x - 8, y - 3, 16, 7);
      for (let k = 0; k < 8; k++) {
        g.fillStyle = colors[k % colors.length];
        g.fillRect(Math.round(x + (Math.random() - 0.5) * 22), Math.round(y + (Math.random() - 0.5) * 14), 2, 1);
      }
    });
    game.onTileBroken?.(t, x, y);
  }

  // The door slot an entity is standing in (outside the floor area), if any.
  slotAt(e) {
    const lim = DOOR_GAP + 2;
    if (e.y < this.y0) return this.slots.find((s) => s.dir === 'up' && Math.abs(e.x - s.x) <= lim) || null;
    if (e.y > this.B) return this.slots.find((s) => s.dir === 'down' && Math.abs(e.x - s.x) <= lim) || null;
    if (e.x < this.x0) return this.slots.find((s) => s.dir === 'left' && Math.abs(e.y - s.y) <= lim) || null;
    if (e.x > this.R) return this.slots.find((s) => s.dir === 'right' && Math.abs(e.y - s.y) <= lim) || null;
    return null;
  }

  // Keep an entity inside the walls, except through open doorways (player only).
  clampToWalls(e) {
    const r = e.r;
    const lim = DOOR_GAP - r;
    const open = (dir, along) => e.usesDoors && this.slots.some((s) => s.dir === dir && s.door && s.door.isOpen
      && Math.abs(along - (dir === 'up' || dir === 'down' ? s.x : s.y)) <= lim + 0.01);

    // Already inside a doorway: stay within its sides.
    const inSlot = this.slotAt(e);
    if (inSlot) {
      if (inSlot.dir === 'up' || inSlot.dir === 'down') e.x = Math.max(inSlot.x - lim, Math.min(inSlot.x + lim, e.x));
      else e.y = Math.max(inSlot.y - lim, Math.min(inSlot.y + lim, e.y));
    }
    if (e.y - r < this.y0 && !open('up', e.x)) e.y = this.y0 + r;
    if (e.y + r > this.B && !open('down', e.x)) e.y = this.B - r;
    if (e.x - r < this.x0 && !open('left', e.y)) e.x = this.x0 + r;
    if (e.x + r > this.R && !open('right', e.y)) e.x = this.R - r;
  }

  redraw() {
    if (!this.dirty) return;
    composeRoom(this);
    this.dirty = false;
  }

  // Paint the room type's decor (src/data/roomDecor.js). Called by the floor once the doors are
  // known, so nothing gets painted in front of a doorway.
  decorate() {
    decorateRoom(this.base.getContext('2d'), this, this.type);
    this.dirty = true;
    this.redraw();
  }

  // Paint something permanent on the floor (splats, scorch marks).
  paintDecal(fn) {
    fn(this.base.getContext('2d'));
    fn(this.bgCtx);
  }
}

// Checks a template's size and that every door slot can reach every other one.
export function validateTemplate(t) {
  const problems = [];
  const shape = t.shape || '1x1';
  const s = shapeOf(shape);
  const cols = s.w * COLS, rows = s.h * ROWS;
  if (t.layout.length !== rows) problems.push(`has ${t.layout.length} rows (needs ${rows})`);
  t.layout.forEach((row, i) => {
    if (row.length !== cols) problems.push(`row ${i} has ${row.length} columns (needs ${cols})`);
  });
  const walkable = (c, r) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows || shapeWall(shape, c, r)) return false;
    const ch = (t.layout[r] || '')[c];
    if (ch === undefined) return false;
    const tile = TILE_CHARS[ch];
    return tile === undefined || !WALK_SOLID.has(tile);
  };
  const slots = shapeSlots(shape).map((sl) => [sl.key, slotCell(sl, shape)]);
  for (const [k, [c, r]] of slots) if (!walkable(c, r)) problems.push(`door ${k} is blocked`);
  if (!slots.length) return problems;
  const [sc, sr] = slots[0][1];
  const seen = new Set([sr * cols + sc]);
  const stack = [[sc, sr]];
  while (stack.length) {
    const [c, r] = stack.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      const k = nr * cols + nc;
      if (seen.has(k) || !walkable(nc, nr)) continue;
      seen.add(k);
      stack.push([nc, nr]);
    }
  }
  for (const [k, [c, r]] of slots) if (!seen.has(r * cols + c)) problems.push(`door ${k} can't be reached`);
  return problems;
}
