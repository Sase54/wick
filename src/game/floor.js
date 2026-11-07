// A floor: the plan from src/game/floorgen.js turned into rooms with doors, plus everything
// that changes while you're on it (rooms you've seen and visited, rooms added later).
//
// A "cell" is one room on the floor: { x, y (top-left unit), shape, units, type, template,
// doors: {slotKey: Door}, links: {slotKey: {cell, slotKey}}, dist, visited, seen, room }.
import { DIRS, OPPOSITE } from './constants.js';
import { shapeSlots, FLIP_X, FLIP_Y } from './shapes.js';
import { Door } from './door.js';
import { Room } from './room.js';
import { SPECIAL_TYPES } from '../data/specialRooms.js';
import { generatePlan, GRID_W, GRID_H, ukey, inGrid, slotAt, SECRET_TYPES } from './floorgen.js';

export { GRID_W, GRID_H };

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

// Doors come straight from the grid: every two rooms that touch get a door in the middle of
// the shared wall (one per touching unit side of a big room). Rooms behind a hidden wall
// (secret, super secret) get a bombable wall instead; the door's kind says which.
function linkCells(cells, occ) {
  for (const c of cells) { c.doors = {}; c.links = {}; }
  for (const c of cells) {
    for (const s of shapeSlots(c.shape)) {
      if (c.links[s.key]) continue;
      const tx = c.x + s.ux + DIRS[s.dir][0], ty = c.y + s.uy + DIRS[s.dir][1];
      const o = occ.get(ukey(tx, ty));
      if (!o || o === c) continue;
      const back = slotAt(o, tx, ty, OPPOSITE[s.dir]);
      if (!back) throw new Error(`rooms touch with no door slot at ${tx},${ty}`);
      const door = new Door(doorKind(c, o));
      c.doors[s.key] = door; o.doors[back.key] = door;
      c.links[s.key] = { cell: o, slotKey: back.key };
      o.links[back.key] = { cell: c, slotKey: s.key };
    }
  }
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
    // the plan (src/game/floorgen.js), then doors from the grid
    const plan = generatePlan(rng.fork('layout'), {
      floorNum: def.floorNum, chapter: def.chapter, labyrinth: !!def.labyrinth, lost: !!def.lost,
      rooms: def.fixedRooms || null, deadEnds: def.deadEnds ?? null,
      specials: def.specials || [], pools, bigChance: def.bigChance, narrowChance: def.narrowChance,
    });
    this.plan = plan;
    linkCells(plan.cells, plan.occ);
    const layout = { cells: plan.cells, occ: plan.occ, ultra: plan.ultra };

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
        dist: c.dist ?? 99,
        template: c.type === 'normal' ? nextTemplate(c.shape) : variant.special[c.type],
        visited: false,
        seen: false,
        room: null,
      });
      this.cells.set(key, c);
    }
    this.start = plan.start;
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
    // every room behind an ordinary door shows as an outline; rooms behind a hidden wall only
    // once the wall is open
    for (const [k, l] of Object.entries(cell.links)) {
      const door = cell.doors[k];
      if (door.hidden) continue;
      l.cell.seen = true;
    }
  }

  // Show every room on the map; hidden rooms only when `secrets` is set (an item that finds them).
  revealAll(secrets = false) {
    for (const c of this.cells.values()) if (secrets || !SECRET_TYPES.has(c.type)) c.seen = true;
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
