// A single room: tile grid, art, door slots, and queries used by collision.
//
// Rooms come in shapes (src/game/shapes.js): one screen, big rooms of 2 or 4 screens, L-shapes
// and narrow halls/shafts. Coordinates are "room space": the top-left of the floor is always at
// (ROOM_X, ROOM_Y) and the walls wrap around it; big rooms simply extend right and down, and the
// game's camera scrolls to follow the player.
import { makeCanvas } from '../engine/sprites.js';
import { PAL } from '../data/palette.js';
import { TILE, COLS, ROWS, ROOM_X, ROOM_Y, ROOM_YB, T, TILE_CHARS, DOOR_GAP } from './constants.js';
import { shapeOf, shapeSlots, shapeWall, slotCell, doorwayTiles } from './shapes.js';
import { generateRoomBase, composeRoom, potDebris } from './roomart.js';
import { decorateRoom } from './roomdecor.js';
import { sfx } from '../engine/audio.js';
import { TUNING } from '../data/tuning.js';

const WALK_SOLID = new Set([T.ROCK, T.PIT, T.POT, T.BLOCK, T.TINTED, T.WALL, T.BIGROCK, T.HEAP, T.KEG]);
const SHOT_SOLID = new Set([T.ROCK, T.POT, T.BLOCK, T.TINTED, T.WALL, T.BIGROCK, T.HEAP, T.KEG]);
// fliers cross pits and low wax heaps
const FLY_SOLID = new Set([T.ROCK, T.POT, T.BLOCK, T.TINTED, T.WALL, T.BIGROCK, T.KEG]);
// tiles shots wear down: how many hits each takes (TUNING.obstacles)
const HEAP_DEBRIS = ['#c9b48a', '#a8906a', '#e8d9b0'];
const KEG_DEBRIS = ['#6a4428', '#3a2416', '#8a2a1c'];
const HITS_TO_BREAK = () => {
  const O = TUNING.obstacles;
  return { [T.POT]: O.potHits, [T.HEAP]: O.heapHits, [T.KEG]: O.kegHits };
};

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
    this.worldH = this.H + ROOM_Y + ROOM_YB;

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
    // every doorway stays clear (a door or a bombable wall can be on any slot), whatever the layout
    for (const sl of this.slots) {
      for (const [c, r] of doorwayTiles(sl, this.shape)) {
        const i = r * this.cols + c;
        if (this.inBounds(c, r) && this.grid[i] !== T.WALL) this.grid[i] = T.FLOOR;
      }
    }
    if (type === 'normal') this.varyObstacles(rng.fork('obstacles'));
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

  // A shot hit tile (c, r). Jars crack and then break, wax heaps shrink a stage per hit, powder
  // kegs take a few hits and blow up. Returns true if something broke.
  hitTile(c, r, game) {
    const t = this.get(c, r);
    const need = HITS_TO_BREAK()[t];
    if (!need) return false;
    const i = r * this.cols + c;
    this.hits[i]++;
    this.dirty = true;
    const { x, y } = this.tileCenter(c, r);
    if (this.hits[i] < need) {
      const colors = t === T.HEAP ? HEAP_DEBRIS : t === T.KEG ? KEG_DEBRIS : ['#7a5034', '#9a6a44'];
      game.particles.burst(x, y, t === T.HEAP ? 6 : 3, { colors, speed: 30, z: 8 });
      if (t === T.KEG) sfx('clink');
      return false;
    }
    this.breakTile(c, r, game);
    return true;
  }

  // The 2x2 boulders: the top-left tile of each one, found by scanning the grid (so they need no
  // saving: they're always laid out on whole 2x2 squares in scan order).
  bigRockAnchors() {
    if (this._anchorsV === this.version && this._anchors) return this._anchors;
    const out = new Set(), used = new Set(), at = (c, r) => this.inBounds(c, r) && this.get(c, r) === T.BIGROCK;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        if (used.has(i) || !at(c, r)) continue;
        if (!(at(c + 1, r) && at(c, r + 1) && at(c + 1, r + 1))) continue;
        out.add(i);
        for (const k of [i, i + 1, i + this.cols, i + this.cols + 1]) used.add(k);
      }
    }
    this._anchors = out;
    this._anchorsV = this.version;
    return out;
  }

  // In normal rooms some of the layout's plain rocks become other obstacles: 2x2 squares of rocks
  // into big boulders, single rocks into wax heaps or powder kegs (TUNING.obstacles). Every one
  // of them blocks walking like the rock it replaces, so paths through the room stay the same.
  varyObstacles(rng) {
    const O = TUNING.obstacles, rock = (c, r) => this.inBounds(c, r) && this.get(c, r) === T.ROCK;
    // a boulder fills a 2x2 square of rocks, or 3 rocks and a floor tile that nothing needs: not a
    // spawn marker, not near a doorway, and every doorway can still reach every other one
    const slotCells = this.slots.map((s) => s.cell);
    const spawnAt = new Set(this.spawns.map((s) => s.r * this.cols + s.c));
    const freeOk = (c, r) => {
      const i = r * this.cols + c;
      if (this.get(c, r) !== T.FLOOR || spawnAt.has(i)) return false;
      if (slotCells.some(([sc, sr]) => Math.max(Math.abs(sc - c), Math.abs(sr - r)) <= 2)) return false;
      const blocked = new Set();
      for (let k = 0; k < this.grid.length; k++) if (WALK_SOLID.has(this.grid[k])) blocked.add(k);
      return this.doorsConnected(blocked, i, slotCells);
    };
    for (let r = 0; r < this.rows - 1; r++) {
      for (let c = 0; c < this.cols - 1; c++) {
        const sq = [[0, 0], [1, 0], [0, 1], [1, 1]];
        const rocks = sq.filter(([dc, dr]) => rock(c + dc, r + dr)).length;
        if (rocks < 3) continue;
        const gap = sq.find(([dc, dr]) => !rock(c + dc, r + dr));
        if (gap && !freeOk(c + gap[0], r + gap[1])) continue;
        if (!rng.chance(O.bigRockChance)) continue;
        for (const [dc, dr] of sq) this.grid[(r + dr) * this.cols + c + dc] = T.BIGROCK;
      }
    }
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] !== T.ROCK) continue;
      const roll = rng.next();
      if (roll < O.kegChance) this.grid[i] = T.KEG;
      else if (roll < O.kegChance + O.heapChance) this.grid[i] = T.HEAP;
    }
  }

  // ---- safe spawn spots: the one place everything that appears at runtime gets its spot
  // (beggars, machines, chests, pickups, item pedestals, trapdoors, enemies from cards/items).
  //
  // A tile is safe when it is floor (no wall, rock, pit, spikes, fire or other hazard), at least
  // 3 tiles from every door (or bombable wall), not under something already there (a pedestal,
  // machine, chest, trapdoor, pickup, enemy, the shopkeeper), and putting something solid on it
  // still leaves a way between all the doors.
  doorTiles(all = false) {
    // boss rooms count every wall middle: a deal door may open there later
    return this.slots.filter((s) => all || this.type === 'boss' || s.door).map((s) => s.cell);
  }

  occupiedTiles() {
    const out = new Set();
    const mark = (e) => { if (e && Number.isFinite(e.x)) out.add(this.rowAt(e.y) * this.cols + this.colAt(e.x)); };
    for (const p of this.pedestals) mark(p);
    for (const p of this.props || []) mark(p);
    for (const p of this.pickups) if (!p.collected) mark(p);
    for (const e of this.enemies) if (!e.dead) mark(e);
    mark(this.trapdoor);
    mark(this.keeper);
    return out;
  }

  // Tiles under a hazard (fires, webs, traps...): never a spawn spot.
  hazardTiles() {
    const out = new Set();
    for (const h of this.hazards) if (Number.isFinite(h.x) && Number.isFinite(h.y)) out.add(this.rowAt(h.y) * this.cols + this.colAt(h.x));
    return out;
  }

  // Tiles that stand in the way of walking (rocks and pits, plus pedestals, machines and chests).
  blockedTiles() {
    const out = new Set();
    for (let i = 0; i < this.grid.length; i++) if (WALK_SOLID.has(this.grid[i])) out.add(i);
    const mark = (e) => { if (e && Number.isFinite(e.x)) out.add(this.rowAt(e.y) * this.cols + this.colAt(e.x)); };
    for (const p of this.pedestals) mark(p);
    for (const p of this.props || []) mark(p);
    mark(this.keeper);
    return out;
  }

  // Can every door still reach every other one with `extra` (a tile index) blocked too?
  doorsConnected(blocked, extra, doors) {
    if (doors.length < 2) return true;
    const ok = (i) => i !== extra && !blocked.has(i);
    const [c0, r0] = doors[0];
    const seen = new Set([r0 * this.cols + c0]);
    const stack = [[c0, r0]];
    while (stack.length) {
      const [c, r] = stack.pop();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr, k = nr * this.cols + nc;
        if (!this.inBounds(nc, nr) || seen.has(k) || !ok(k)) continue;
        seen.add(k);
        stack.push([nc, nr]);
      }
    }
    return doors.every(([c, r]) => seen.has(r * this.cols + c));
  }

  // The safe spot nearest to (x, y): the wanted spot itself if it's safe, else spiralling out
  // ring by ring (nearest first in each ring). If nothing in the room is fully safe the rules
  // relax step by step (things may share a tile, then doors only keep 1 tile clear, then any floor).
  // share: things that may pile up (pickups, enemies) can share a tile.
  findFreeSpot(x, y, { doorGap = 2, share = false } = {}) {
    const c0 = Math.max(0, Math.min(this.cols - 1, this.colAt(x)));
    const r0 = Math.max(0, Math.min(this.rows - 1, this.rowAt(y)));
    const doors = this.doorTiles();
    const walkDoors = this.slots.filter((s) => s.door).map((s) => s.cell);
    const blocked = this.blockedTiles(), haz = this.hazardTiles();
    const levels = [
      { gap: doorGap, taken: this.occupiedTiles(), path: true },
      { gap: doorGap, taken: null, path: true },
      { gap: 1, taken: null, path: true },
      { gap: -1, taken: null, path: false },
    ];
    for (const L of share ? levels.slice(1) : levels) {
      const safe = (c, r) => {
        if (!this.inBounds(c, r)) return false;
        const i = r * this.cols + c;
        if (this.grid[i] !== T.FLOOR) return false;
        if (doors.some(([dc, dr]) => Math.max(Math.abs(dc - c), Math.abs(dr - r)) <= L.gap)) return false;
        if (L.gap >= 0 && haz.has(i)) return false;
        if (L.taken?.has(i)) return false;
        return !L.path || this.doorsConnected(blocked, i, walkDoors);
      };
      if (safe(c0, r0)) return { x, y };
      const fx = (x - this.x0) / TILE - 0.5, fy = (y - this.y0) / TILE - 0.5;
      for (let d = 1; d < Math.max(this.cols, this.rows); d++) {
        const ring = [];
        for (let dr = -d; dr <= d; dr++) {
          for (let dc = -d; dc <= d; dc++) {
            if (Math.max(Math.abs(dc), Math.abs(dr)) === d) ring.push([c0 + dc, r0 + dr]);
          }
        }
        ring.sort((a, b) => Math.hypot(a[0] - fx, a[1] - fy) - Math.hypot(b[0] - fx, b[1] - fy));
        for (const [c, r] of ring) if (safe(c, r)) return this.tileCenter(c, r);
      }
    }
    return { x, y };
  }

  // A random safe spot (spawning things in big rooms, placing hazards).
  randomFreeSpot(rng, margin = 1) {
    const taken = this.occupiedTiles(), haz = this.hazardTiles(), doors = this.doorTiles();
    const blocked = this.blockedTiles(), walkDoors = this.slots.filter((s) => s.door).map((s) => s.cell);
    for (let i = 0; i < 60; i++) {
      const c = rng.int(margin, this.cols - 1 - margin), r = rng.int(margin, this.rows - 1 - margin);
      const k = r * this.cols + c;
      if (this.grid[k] !== T.FLOOR || taken.has(k) || haz.has(k)) continue;
      if (doors.some(([dc, dr]) => Math.max(Math.abs(dc - c), Math.abs(dr - r)) <= 2)) continue;
      if (!this.doorsConnected(blocked, k, walkDoors)) continue;
      return this.tileCenter(c, r);
    }
    return this.findFreeSpot(this.centerX, this.centerY);
  }

  breakTile(c, r, game) {
    const t = this.get(c, r);
    if (t === T.FLOOR || t === T.PIT || t === T.BLOCK || t === T.SPIKES || t === T.WALL) return;
    // a boulder goes all at once: find its 2x2 square and break the whole thing
    if (t === T.BIGROCK) {
      const anchors = this.bigRockAnchors(), i = r * this.cols + c;
      const a = [i, i - 1, i - this.cols, i - this.cols - 1].find((k) => anchors.has(k));
      const ac = a === undefined ? c : a % this.cols, ar = a === undefined ? r : Math.floor(a / this.cols);
      for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (this.get(ac + dc, ar + dr) === T.BIGROCK) this.set(ac + dc, ar + dr, T.FLOOR);
      const x = this.x0 + (ac + 1) * TILE, y = this.y0 + (ar + 1) * TILE;
      const colors = (this.style.look?.rock || PAL.rock).slice(1);
      sfx('rockBreak');
      game.shake?.(4);
      game.particles.burst(x, y, 30, { colors, speed: 100, z: 10, vz: 90, size: 2, sizeVar: 2, life: 0.8 });
      this.paintDecal((g) => {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x - 18, y - 6, 36, 13);
        for (let k = 0; k < 20; k++) {
          g.fillStyle = colors[k % colors.length];
          g.fillRect(Math.round(x + (Math.random() - 0.5) * 44), Math.round(y + (Math.random() - 0.5) * 28), 2, 1);
        }
      });
      game.onTileBroken?.(t, x, y);
      return;
    }
    const { x, y } = this.tileCenter(c, r);
    this.set(c, r, T.FLOOR);
    sfx(t === T.POT ? 'jarBreak' : t === T.HEAP ? 'squish' : 'rockBreak');
    const colors = t === T.POT ? potDebris(this.style.look?.pot) : t === T.HEAP ? HEAP_DEBRIS : t === T.KEG ? KEG_DEBRIS
      : (this.style.look?.rock || PAL.rock).slice(1);
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
  // A box entity (the player's feet) uses its half-width across and half-height up/down.
  clampToWalls(e) {
    const rx = e.box ? e.box.hw : e.r, ry = e.box ? e.box.hh : e.r;
    const limX = DOOR_GAP - rx, limY = DOOR_GAP - ry;   // room to move sideways inside a doorway
    const open = (dir, along) => e.usesDoors && this.slots.some((s) => s.dir === dir && s.door && s.door.isOpen
      && Math.abs(along - (dir === 'up' || dir === 'down' ? s.x : s.y)) <= (dir === 'up' || dir === 'down' ? limX : limY) + 0.01);

    // Already inside a doorway: stay within its sides.
    const inSlot = this.slotAt(e);
    if (inSlot) {
      if (inSlot.dir === 'up' || inSlot.dir === 'down') e.x = Math.max(inSlot.x - limX, Math.min(inSlot.x + limX, e.x));
      else e.y = Math.max(inSlot.y - limY, Math.min(inSlot.y + limY, e.y));
    }
    if (e.y - ry < this.y0 && !open('up', e.x)) e.y = this.y0 + ry;
    if (e.y + ry > this.B && !open('down', e.x)) e.y = this.B - ry;
    if (e.x - rx < this.x0 && !open('left', e.y)) e.x = this.x0 + rx;
    if (e.x + rx > this.R && !open('right', e.y)) e.x = this.R - rx;
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
