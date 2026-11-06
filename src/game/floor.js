// Floor generation. Rooms spread out on a grid of screen-sized units from the start room as a
// tree; special rooms go on dead ends (boss farthest away). Then some normal rooms grow into
// big rooms (2x1, 1x2, 2x2, L-shapes) or get squeezed into narrow halls/shafts, and a secret
// room is tucked into an empty unit touching several rooms.
//
// A "cell" is one room on the floor: { x, y (top-left unit), shape, units, type, template,
// doors: {slotKey: Door}, links: {slotKey: {cell, slotKey}}, dist, visited, seen, room }.
import { DIRS, DIR_LIST, OPPOSITE } from './constants.js';
import { shapeUnits, shapeSlots, FLIP_X, FLIP_Y } from './shapes.js';
import { Door } from './door.js';
import { Room } from './room.js';
import { SPECIAL_TYPES } from '../data/specialRooms.js';

export const GRID_W = 15;
export const GRID_H = 11;
const START = [7, 5];
const ukey = (x, y) => y * GRID_W + x;
const inGrid = (x, y) => x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
const BIG_SHAPES = ['2x1', '1x2', '2x2', 'L1', 'L2', 'L3', 'L4'];

// Mirror a layout (and its shape) so one hand-made room gives up to four.
function flipTemplate(t, fx, fy) {
  if (!fx && !fy) return t;
  let layout = t.layout;
  if (fx) layout = layout.map((r) => [...r].reverse().join(''));
  if (fy) layout = [...layout].reverse();
  let shape = t.shape || '1x1';
  if (fx) shape = FLIP_X[shape] || shape;
  if (fy) shape = FLIP_Y[shape] || shape;
  return { ...t, layout, shape, id: `${t.id}${fx ? '-fx' : ''}${fy ? '-fy' : ''}` };
}

// The 1x1 tree: same growth as the original floors.
function treeLayout(rng, [minRooms, maxRooms]) {
  const target = rng.int(minRooms, maxRooms);
  const filled = new Map();
  const has = (x, y) => filled.has(ukey(x, y));
  const neighbors = (x, y) => DIR_LIST.filter((d) => has(x + DIRS[d][0], y + DIRS[d][1])).length;
  filled.set(ukey(...START), { x: START[0], y: START[1] });
  const queue = [START];
  let guard = 0;
  while (filled.size < target && guard++ < 600) {
    if (!queue.length) {
      const c = rng.pick([...filled.values()]);
      queue.push([c.x, c.y]);
    }
    const [cx, cy] = queue.shift();
    for (const d of rng.shuffle([...DIR_LIST])) {
      if (filled.size >= target) break;
      const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
      if (!inGrid(nx, ny) || has(nx, ny)) continue;
      if (neighbors(nx, ny) > 1) continue; // never make loops
      if (rng.chance(0.5)) continue;
      filled.set(ukey(nx, ny), { x: nx, y: ny });
      queue.push([nx, ny]);
    }
  }
  if (filled.size < target) return null;
  return [...filled.values()];
}

function tryLayout(rng, def, pools) {
  const units = treeLayout(rng, def.rooms);
  if (!units) return null;
  // distances on the tree (for picking special rooms)
  const at = new Map(units.map((u) => [ukey(u.x, u.y), u]));
  const tdist = new Map([[ukey(...START), 0]]);
  const bfs = [START];
  while (bfs.length) {
    const [x, y] = bfs.shift();
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (at.has(ukey(nx, ny)) && !tdist.has(ukey(nx, ny))) { tdist.set(ukey(nx, ny), tdist.get(ukey(x, y)) + 1); bfs.push([nx, ny]); }
    }
  }
  const deg = (u) => DIR_LIST.filter((d) => at.has(ukey(u.x + DIRS[d][0], u.y + DIRS[d][1]))).length;
  const deadEnds = units.filter((u) => !(u.x === START[0] && u.y === START[1]) && deg(u) === 1);
  const specials = def.specials || ['treasure', 'shop'];
  if (deadEnds.length < specials.length + 1) return null;
  rng.shuffle(deadEnds);
  deadEnds.sort((a, b) => tdist.get(ukey(b.x, b.y)) - tdist.get(ukey(a.x, a.y)));
  if (tdist.get(ukey(deadEnds[0].x, deadEnds[0].y)) < 3) return null;
  const types = new Map([[ukey(...START), 'start'], [ukey(deadEnds[0].x, deadEnds[0].y), 'boss']]);
  const rest = rng.shuffle(deadEnds.slice(1));
  specials.forEach((t, i) => types.set(ukey(rest[i].x, rest[i].y), t));

  // ---- rooms (all 1x1 for now)
  const cells = units.map((u) => ({ x: u.x, y: u.y, shape: '1x1', type: types.get(ukey(u.x, u.y)) || 'normal' }));
  const occ = new Map();
  const place = (c) => { c.units = shapeUnits(c.shape).map(([ux, uy]) => [c.x + ux, c.y + uy]); for (const [x, y] of c.units) occ.set(ukey(x, y), c); };
  cells.forEach(place);
  const special = (c) => c && c.type !== 'normal' && c.type !== 'start';

  // ---- narrow halls and shafts: only where every neighbor is along the corridor
  for (const c of rng.shuffle(cells.filter((c) => c.type === 'normal'))) {
    if (!rng.chance(def.narrowChance ?? 0.12)) continue;
    const near = DIR_LIST.filter((d) => occ.has(ukey(c.x + DIRS[d][0], c.y + DIRS[d][1])));
    const horizontal = near.every((d) => d === 'left' || d === 'right');
    const vertical = near.every((d) => d === 'up' || d === 'down');
    const shape = horizontal && pools.has('hall') ? 'hall' : vertical && pools.has('shaft') ? 'shaft' : null;
    if (shape && near.length) c.shape = shape;
  }

  // ---- big rooms: grow a normal room into empty units around it
  for (const c of rng.shuffle(cells.filter((c) => c.type === 'normal' && c.shape === '1x1'))) {
    if (!rng.chance(def.bigChance ?? 0.25)) continue;
    let done = false;
    for (const shape of rng.shuffle(BIG_SHAPES.filter((s) => pools.has(s)))) {
      for (const [ax, ay] of rng.shuffle(shapeUnits(shape))) {
        const ox = c.x - ax, oy = c.y - ay;
        const us = shapeUnits(shape).map(([ux, uy]) => [ox + ux, oy + uy]);
        const ok = us.every(([x, y]) => inGrid(x, y) && (!occ.has(ukey(x, y)) || occ.get(ukey(x, y)) === c)
          && DIR_LIST.every((d) => !special(occ.get(ukey(x + DIRS[d][0], y + DIRS[d][1])))));
        if (!ok) continue;
        for (const [x, y] of c.units) occ.delete(ukey(x, y));
        c.x = ox; c.y = oy; c.shape = shape;
        place(c);
        done = true;
        break;
      }
      if (done) break;
    }
  }

  // Does `c` have a door slot at absolute unit (x, y) facing `dir`?
  const slotAt = (c, x, y, dir) => shapeSlots(c.shape).find((s) => s.dir === dir && c.x + s.ux === x && c.y + s.uy === y) || null;

  // Empty units touching exactly one room (which must be an ordinary room with a door slot
  // facing the unit): a new dead end can go there.
  const leafSpots = (okNeighbor) => {
    const out = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (occ.has(ukey(x, y))) continue;
        const near = DIR_LIST.map((d) => [d, occ.get(ukey(x + DIRS[d][0], y + DIRS[d][1]))]).filter(([, o]) => o);
        if (near.length !== 1) continue;
        const [d, o] = near[0];
        if (!okNeighbor(o) || !slotAt(o, x + DIRS[d][0], y + DIRS[d][1], OPPOSITE[d])) continue;
        out.push([x, y]);
      }
    }
    return out;
  };
  const ordinary = (o) => o.type === 'normal' || o.type === 'start';

  // ---- the floor's extra special rooms (curse room, arcade, library...), as new dead ends
  for (const type of def.extras || []) {
    const spots = leafSpots((o) => o.type === 'normal');
    if (!spots.length) continue;
    const [x, y] = rng.pick(spots);
    const c = { x, y, shape: '1x1', type };
    place(c);
    cells.push(c);
  }

  // ---- secret room: an empty unit that touches as many rooms (with a door slot facing it) as possible
  let best = [], bestCount = 1;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (occ.has(ukey(x, y))) continue;
      let n = 0, bad = false;
      for (const d of DIR_LIST) {
        const o = occ.get(ukey(x + DIRS[d][0], y + DIRS[d][1]));
        if (!o) continue;
        if (o.type === 'boss') { bad = true; break; }
        if (slotAt(o, x + DIRS[d][0], y + DIRS[d][1], OPPOSITE[d])) n++;
      }
      if (bad) continue;
      if (n > bestCount) { best = [[x, y]]; bestCount = n; } else if (n === bestCount) best.push([x, y]);
    }
  }
  if (!best.length) return null;
  const [sx, sy] = rng.pick(best);
  const secret = { x: sx, y: sy, shape: '1x1', type: 'secret' };
  place(secret);
  cells.push(secret);

  // ---- super secret room: hidden behind a wall of exactly one ordinary room
  const sup = leafSpots(ordinary);
  if (sup.length) {
    const [x, y] = rng.pick(sup);
    const c = { x, y, shape: '1x1', type: 'supersecret' };
    place(c);
    cells.push(c);
  }

  // ---- ultra secret room: not connected at all. Its spot is two steps from an ordinary room,
  // through an empty unit: only a red room (Crimson Key) made there leads to it.
  let ultra = null;
  const ultraSpots = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (occ.has(ukey(x, y))) continue;
      if (DIR_LIST.some((d) => occ.has(ukey(x + DIRS[d][0], y + DIRS[d][1])))) continue;
      for (const d of DIR_LIST) {
        const ex = x + DIRS[d][0], ey = y + DIRS[d][1];
        if (!inGrid(ex, ey) || occ.has(ukey(ex, ey))) continue;
        const touches = DIR_LIST.some((d2) => {
          const o = occ.get(ukey(ex + DIRS[d2][0], ey + DIRS[d2][1]));
          return o && ordinary(o) && slotAt(o, ex + DIRS[d2][0], ey + DIRS[d2][1], OPPOSITE[d2]);
        });
        if (touches) { ultraSpots.push([x, y]); break; }
      }
    }
  }
  if (ultraSpots.length) ultra = rng.pick(ultraSpots);

  // ---- doors and links
  for (const c of cells) { c.doors = {}; c.links = {}; }
  for (const c of cells) {
    for (const s of shapeSlots(c.shape)) {
      if (c.links[s.key]) continue;
      const tx = c.x + s.ux + DIRS[s.dir][0], ty = c.y + s.uy + DIRS[s.dir][1];
      const o = occ.get(ukey(tx, ty));
      if (!o || o === c) continue;
      const back = slotAt(o, tx, ty, OPPOSITE[s.dir]);
      if (!back) continue;
      const door = new Door(doorKind(c, o));
      c.doors[s.key] = door; o.doors[back.key] = door;
      c.links[s.key] = { cell: o, slotKey: back.key };
      o.links[back.key] = { cell: c, slotKey: s.key };
    }
  }
  // Everything must be reachable from the start, and special rooms must stay dead ends.
  const startCell = occ.get(ukey(...START));
  const dist = new Map([[startCell, 0]]);
  const q = [startCell];
  while (q.length) {
    const c = q.shift();
    for (const l of Object.values(c.links)) {
      if (dist.has(l.cell)) continue;
      dist.set(l.cell, dist.get(c) + 1);
      q.push(l.cell);
    }
  }
  if (cells.some((c) => !dist.has(c))) return null;
  if (cells.some((c) => special(c) && c.type !== 'secret' && Object.values(c.links).filter((l) => l.cell.type !== 'secret').length !== 1)) return null;
  for (const c of cells) c.dist = dist.get(c);
  return { cells, occ, ultra };
}

// The door between two rooms takes the look of the more special of the two.
export function doorKind(a, b) {
  const t = [a.type, b.type];
  if (t.includes('supersecret')) return 'secret';
  // rooms that open off the boss room keep their own door
  for (const k of ['devil', 'angel', 'bossrush']) if (t.includes(k)) return k;
  for (const k of ['boss', 'secret', 'treasure', 'shop']) if (t.includes(k)) return k;
  for (const ty of t) if (SPECIAL_TYPES[ty]?.door) return SPECIAL_TYPES[ty].door;
  return 'normal';
}

export class Floor {
  // def: floor data (rooms, bigChance, narrowChance...), variant: its look and room layouts
  constructor(rng, def, variant) {
    this.rng = rng;
    this.def = def;
    this.variant = variant;
    this.name = def.name;
    const normal = variant.rooms;
    // which shapes have layouts available (mirroring turns one L into the other three)
    const pools = new Set();
    for (const t of normal) {
      const s = t.shape || '1x1';
      pools.add(s);
      if (FLIP_X[s]) pools.add(FLIP_X[s]);
      if (FLIP_Y[s]) { pools.add(FLIP_Y[s]); pools.add(FLIP_X[FLIP_Y[s]]); }
    }
    let layout = null;
    const layoutRng = rng.fork('layout');
    for (let i = 0; i < 800 && !layout; i++) layout = tryLayout(layoutRng, def, pools);
    if (!layout) throw new Error('Floor generation failed');

    // Shuffle-bags of normal templates per shape so rooms rarely repeat.
    const templateRng = rng.fork('templates');
    const bags = {};
    const nextTemplate = (shape) => {
      if (!bags[shape]?.length) {
        const list = [];
        for (const t of normal) {
          for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
            const f = flipTemplate(t, fx, fy);
            if ((f.shape || '1x1') === shape) list.push(f);
          }
        }
        bags[shape] = templateRng.shuffle(list);
      }
      return bags[shape].pop();
    };

    this.cells = new Map();
    this.occ = layout.occ;
    for (const c of layout.cells) {
      // keyed by a unit the room really covers (an L's bounding-box corner may be its missing one)
      const key = ukey(...c.units[0]);
      Object.assign(c, {
        key,
        template: c.type === 'normal' ? nextTemplate(c.shape) : variant.special[c.type],
        visited: false,
        seen: false,
        room: null,
      });
      this.cells.set(key, c);
    }
    this.start = this.occ.get(ukey(...START));
    this.ultra = layout.ultra;      // [x, y] of the hidden ultra secret room, or null
    this.nextTemplate = nextTemplate;
    this.added = [];                // cells added during the floor (saved as a list of steps)
    this.offGrid = 0;
  }

  // Add a room during the floor (red rooms, deal rooms, the ultra secret room...). It links to
  // the neighbors given (or to every neighbor with a facing door slot when `to` is 'all').
  // Off-grid rooms (x = null) aren't on the map at all (error room, black market).
  addCell(type, x, y, to = 'all') {
    let key;
    const c = { x, y, shape: '1x1', type, visited: false, seen: false, room: null, doors: {}, links: {}, dist: 99 };
    if (x === null) {
      key = 10000 + this.offGrid++;
      c.units = [];
      c.offGrid = true;
    } else {
      key = ukey(x, y);
      if (this.occ.has(key) || !inGrid(x, y)) return null;
      c.units = [[x, y]];
      this.occ.set(key, c);
    }
    c.key = key;
    c.template = type === 'red' ? this.nextTemplate('1x1') : this.variant.special[type];
    this.cells.set(key, c);
    this.added.push({ type, x, y, to: to === 'all' ? 'all' : to.map((o) => o.key) });
    if (x === null) {
      // the error room has a door in every wall; they all lead somewhere random
      if (type === 'error') for (const s of shapeSlots('1x1')) c.doors[s.key] = new Door('error');
      return c;
    }
    for (const s of shapeSlots('1x1')) {
      const tx = x + DIRS[s.dir][0], ty = y + DIRS[s.dir][1];
      const o = this.occ.get(ukey(tx, ty));
      if (!o || (to !== 'all' && !to.includes(o))) continue;
      const back = shapeSlots(o.shape).find((b) => b.dir === OPPOSITE[s.dir] && o.x + b.ux === tx && o.y + b.uy === ty);
      if (!back || o.links[back.key]) continue;
      const door = new Door(doorKind(c, o));
      c.doors[s.key] = door; o.doors[back.key] = door;
      c.links[s.key] = { cell: o, slotKey: back.key };
      o.links[back.key] = { cell: c, slotKey: s.key };
      // an already-built room needs to know about its new door
      if (o.room) for (const sl of o.room.slots) if (sl.key === back.key) sl.door = door;
      if (o.room) o.room.redraw?.();
    }
    return c;
  }

  // Replay rooms added during the floor (for continuing a saved run).
  replayAdded(list) {
    for (const a of list) this.addCell(a.type, a.x, a.y, a.to === 'all' ? 'all' : a.to.map((k) => this.cells.get(k)).filter(Boolean));
  }

  // Is grid unit (x, y) free for a new room?
  free(x, y) { return inGrid(x, y) && !this.occ.has(ukey(x, y)); }

  // The room covering grid unit (x, y).
  cellAt(x, y) { return this.occ.get(ukey(x, y)) || null; }

  // The room on the other side of a door slot.
  link(cell, slotKey) { return cell.links[slotKey] || null; }

  roomFor(cell) {
    if (!cell.room) {
      cell.room = new Room({
        template: cell.template,
        rng: this.rng.fork('room:' + cell.key),
        style: { ...(this.variant.roomStyles?.[cell.type] || {}), look: roomLook(this.variant.look, cell.type) },
        type: cell.type,
      });
      cell.room.cell = cell;
      cell.room.doors = cell.doors;
      for (const s of cell.room.slots) s.door = cell.doors[s.key] || null;
      cell.room.decorate();
    }
    return cell.room;
  }

  // Mark a room visited and its visible neighbors as seen (for the minimap).
  visit(cell) {
    cell.visited = true;
    cell.seen = true;
    for (const [k, l] of Object.entries(cell.links)) {
      if (!cell.doors[k].hidden) l.cell.seen = true;
    }
  }

  revealAll() {
    for (const c of this.cells.values()) c.seen = true;
  }
}

// Some special rooms have their own palette whatever the floor (deal rooms, the error room...):
// their `look` in src/data/specialRooms.js is laid over the variant's.
const lookCache = new Map();
function roomLook(base, type) {
  const own = SPECIAL_TYPES[type]?.look;
  if (!own) return base;
  const id = `${base.id}:${type}`;
  if (!lookCache.has(id)) lookCache.set(id, { ...base, ...own, id });
  return lookCache.get(id);
}
