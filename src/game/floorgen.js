// The floor plan: which grid cells are rooms, what kind each one is, and the hidden extras.
// Pure data (no art, no doors), so it can be generated and checked thousands of times by
// tools/floortest.js. src/game/floor.js turns a plan into rooms and doors.
//
// How a floor is laid out (DESIGN.md "Floor generation" has the full rules):
//   1. A tree of rooms grows breadth-first from the start room in the middle of a 13x13 grid.
//      A new cell is skipped if it would touch more than one room (no loops, no 2x2 blocks),
//      if the floor is full, or on a coin flip. Sometimes a big room (2x1, 1x2, 2x2, L) grows
//      there instead; it counts as one room.
//   2. Special rooms take the dead ends, farthest first: boss, super secret, then the list the
//      game rolled for this floor (shop, treasure...). Out of dead ends, the rest don't appear.
//   3. Some plain rooms become narrow halls/shafts (only where all their neighbors line up).
//   4. The secret room goes in an empty cell wedged between rooms (never needed to reach anything).
//   5. The whole floor is checked; anything off and it is thrown away and grown again.
//
// A plan cell: { x, y (top-left unit), shape, units: [[x, y]...], type, dist, deadEnd }.
import { DIRS, DIR_LIST, OPPOSITE } from './constants.js';
import { shapeUnits, shapeSlots } from './shapes.js';

export const GRID_W = 13;
export const GRID_H = 13;
export const START = [6, 6];
export const ukey = (x, y) => y * GRID_W + x;
export const inGrid = (x, y) => x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
const BIG_SHAPES = ['2x1', '1x2', '2x2', 'L1', 'L2', 'L3', 'L4'];
// rooms that hide behind bombable walls instead of doors
export const SECRET_TYPES = new Set(['secret', 'supersecret', 'ultrasecret']);

// How many rooms floor n has (start and special rooms included, the secret room not).
export function roomCount(rng, { floorNum, labyrinth = false, lost = false, hard = false, rooms = null }) {
  let n;
  if (rooms) n = rng.int(rooms[0], rooms[1]);   // a floor with its own size (the finale)
  else n = Math.min(20, rng.int(0, 1) + 5 + Math.floor((floorNum * 10) / 3));
  if (labyrinth) n = Math.min(45, Math.floor(n * 1.8));
  if (lost) n += 4;
  if (hard) n += rng.int(2, 3);
  return n;
}

// The fewest one-screen dead ends a floor needs.
export function minDeadEnds({ floorNum, labyrinth = false, deadEnds = null }) {
  if (deadEnds != null) return deadEnds;
  return 5 + (floorNum > 1 ? 1 : 0) + (labyrinth ? 1 : 0);
}

// Does a room of `shape` at (ox, oy) have a door slot on unit (x, y) facing `dir`?
export function slotAt(cell, x, y, dir) {
  return shapeSlots(cell.shape).find((s) => s.dir === dir && cell.x + s.ux === x && cell.y + s.uy === y) || null;
}

// The cells around a room's units that may never hold a room: an L's missing corner, and the
// blocked sides of a narrow hall/shaft (a room there would touch it with no door possible).
function blockedAround(cell) {
  const out = [];
  const own = new Set(cell.units.map(([x, y]) => ukey(x, y)));
  for (const [x, y] of cell.units) {
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (!inGrid(nx, ny) || own.has(ukey(nx, ny))) continue;
      if (!slotAt(cell, x, y, d)) out.push([nx, ny]);
    }
  }
  return out;
}

// opts:
//   floorNum, chapter, labyrinth, lost, hard   what decides the size
//   rooms / deadEnds                            fixed size / dead-end minimum (the finale)
//   specials      the special rooms the game rolled for this floor, in priority order
//                 (boss and super secret come first on their own)
//   pools         Set of room shapes that have layouts (big shapes and narrow rooms need them)
//   bigChance     chance that a new room tries to be a big room instead
//   narrowChance  chance that a plain room whose neighbors line up becomes a hall/shaft
//   secret        false: no secret room (default true)
export function generatePlan(rng, opts) {
  for (let attempt = 1; attempt <= 5000; attempt++) {
    const plan = tryPlan(rng, opts);
    if (plan) { plan.attempts = attempt; return plan; }
  }
  throw new Error('Floor generation failed');
}

function tryPlan(rng, opts) {
  const pools = opts.pools || new Set(['1x1']);
  const target = roomCount(rng, opts);
  const cells = [];
  const occ = new Map();          // unit key -> cell
  const reserved = new Set();     // unit keys that must stay empty
  const filled = (x, y) => occ.has(ukey(x, y));
  const free = (x, y) => inGrid(x, y) && !filled(x, y) && !reserved.has(ukey(x, y));
  const filledNeighbors = (x, y) => DIR_LIST.filter((d) => filled(x + DIRS[d][0], y + DIRS[d][1])).length;
  const place = (c) => {
    c.units = shapeUnits(c.shape).map(([ux, uy]) => [c.x + ux, c.y + uy]);
    for (const [x, y] of c.units) occ.set(ukey(x, y), c);
    for (const [x, y] of blockedAround(c)) reserved.add(ukey(x, y));
    cells.push(c);
    return c;
  };

  // ---- 1. the tree
  const start = place({ x: START[0], y: START[1], shape: '1x1', type: 'start' });
  const queue = [start];
  const bigShapes = BIG_SHAPES.filter((s) => pools.has(s));
  // a big room whose unit `[nx, ny]` touches `from` (all of it on empty, unreserved cells)
  const tryBig = (from, nx, ny, dir) => {
    for (const shape of rng.shuffle([...bigShapes])) {
      for (const [ax, ay] of rng.shuffle(shapeUnits(shape))) {
        const c = { x: nx - ax, y: ny - ay, shape, type: 'normal' };
        const us = shapeUnits(shape).map(([ux, uy]) => [c.x + ux, c.y + uy]);
        if (!us.every(([x, y]) => free(x, y))) continue;
        c.units = us;
        if (!slotAt(c, nx, ny, OPPOSITE[dir])) continue;
        // its blocked cells (an L's corner) must be empty too
        if (blockedAround(c).some(([x, y]) => filled(x, y))) continue;
        // and it touches no room but the one it grows from (the floor stays a tree: no loops)
        const own = new Set(us.map(([x, y]) => ukey(x, y)));
        const touches = us.some(([x, y]) => DIR_LIST.some((d2) => {
          const ox = x + DIRS[d2][0], oy = y + DIRS[d2][1];
          const o = occ.get(ukey(ox, oy));
          return o && !own.has(ukey(ox, oy)) && !(o === from && x === nx && y === ny);
        }));
        if (touches) continue;
        return c;
      }
    }
    return null;
  };
  while (queue.length && cells.length < target) {
    const cur = queue.shift();
    for (const [ux, uy] of cur.units) {
      for (const d of DIR_LIST) {
        if (cells.length >= target) break;
        if (!slotAt(cur, ux, uy, d)) continue;
        const nx = ux + DIRS[d][0], ny = uy + DIRS[d][1];
        if (!free(nx, ny)) continue;
        if (filledNeighbors(nx, ny) > 1) continue;
        if (rng.chance(0.5)) continue;
        let c = null;
        if (bigShapes.length && cur !== start && rng.chance(opts.bigChance ?? 0.15)) c = tryBig(cur, nx, ny, d);
        c ??= { x: nx, y: ny, shape: '1x1', type: 'normal' };
        queue.push(place(c));
      }
    }
  }
  if (cells.length !== target) return null;

  // ---- distances (rooms walked through from the start; a big room is one step)
  const links = (c) => {
    const out = new Set();
    for (const [x, y] of c.units) {
      for (const d of DIR_LIST) {
        const o = occ.get(ukey(x + DIRS[d][0], y + DIRS[d][1]));
        if (o && o !== c && !SECRET_TYPES.has(o.type)) out.add(o);
      }
    }
    return [...out];
  };
  const measure = () => {
    for (const c of cells) c.dist = Infinity;
    start.dist = 0;
    const q = [start];
    while (q.length) {
      const c = q.shift();
      for (const o of links(c)) if (o.dist === Infinity) { o.dist = c.dist + 1; q.push(o); }
    }
  };
  measure();
  if (links(start).length < 2) return null;

  // dead ends: one-screen rooms with a single neighbor (never the start)
  const deadEnds = cells.filter((c) => c !== start && c.shape === '1x1' && links(c).length === 1);
  if (deadEnds.length < minDeadEnds(opts)) return null;
  for (const c of deadEnds) c.deadEnd = true;
  // farthest first, ties in random order
  rng.shuffle(deadEnds);
  deadEnds.sort((a, b) => b.dist - a.dist);

  // ---- 2. special rooms on the dead ends
  const boss = deadEnds.shift();
  boss.type = 'boss';
  if (opts.labyrinth) {
    // two boss rooms back to back: a second one grows off the far side of the first
    const spots = DIR_LIST.map((d) => [boss.x + DIRS[d][0], boss.y + DIRS[d][1]])
      .filter(([x, y]) => free(x, y) && filledNeighbors(x, y) === 1);
    if (!spots.length) return null;
    const [x, y] = rng.pick(spots);
    boss.type = 'boss';
    boss.firstBoss = true;
    boss.deadEnd = false;
    const last = place({ x, y, shape: '1x1', type: 'boss', deadEnd: true });
    last.dist = boss.dist + 1;
  }
  if (cells.some((c) => c.type === 'boss' && links(c).includes(start))) return null;

  // the super secret room: a dead end hanging off a plain room
  const plainNeighbor = (c) => { const n = links(c); return n.length === 1 && (n[0].type === 'normal' || n[0].type === 'start'); };
  const ssIdx = deadEnds.findIndex(plainNeighbor);
  if (ssIdx < 0) return null;
  const sup = deadEnds.splice(ssIdx, 1)[0];
  sup.type = 'supersecret';
  sup.treeDist = sup.dist;   // where it sits in the tree (it's only reached through a hidden wall)

  // the floor's own list: a room that can't find a dead end just doesn't appear
  for (const type of opts.specials || []) {
    if (!deadEnds.length) break;
    deadEnds.shift().type = type;
  }

  // ---- 3. narrow halls and shafts (only plain rooms whose neighbors all line up)
  const narrowOk = { hall: pools.has('hall'), shaft: pools.has('shaft') };
  if (narrowOk.hall || narrowOk.shaft) {
    for (const c of rng.shuffle(cells.filter((c) => c.type === 'normal' && c.shape === '1x1'))) {
      if (!rng.chance(opts.narrowChance ?? 0.12)) continue;
      const near = DIR_LIST.filter((d) => filled(c.x + DIRS[d][0], c.y + DIRS[d][1]));
      if (!near.length) continue;
      const shape = narrowOk.hall && near.every((d) => d === 'left' || d === 'right') ? 'hall'
        : narrowOk.shaft && near.every((d) => d === 'up' || d === 'down') ? 'shaft' : null;
      if (!shape) continue;
      c.shape = shape;
      for (const [x, y] of blockedAround(c)) reserved.add(ukey(x, y));
    }
  }

  // ---- 4. the secret room: the empty cell that touches the most rooms
  let secret = null;
  if (opts.secret !== false) {
    let best = -Infinity, bestSpot = null;
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (!free(x, y)) continue;
        const near = [];
        let ok = true;
        for (const d of DIR_LIST) {
          const o = occ.get(ukey(x + DIRS[d][0], y + DIRS[d][1]));
          if (!o) continue;
          // never next to the boss or another hidden room, and every wall facing it must be bombable
          if (o.type === 'boss' || SECRET_TYPES.has(o.type) || !slotAt(o, x + DIRS[d][0], y + DIRS[d][1], OPPOSITE[d])) { ok = false; break; }
          near.push(o);
        }
        if (!ok || !near.length) continue;
        const score = rng.float(10, 14) - (near.length === 2 ? 3 : near.length === 1 ? 6 : 0);
        if (score > best) { best = score; bestSpot = [x, y]; }
      }
    }
    if (!bestSpot) return null;
    secret = place({ x: bestSpot[0], y: bestSpot[1], shape: '1x1', type: 'secret' });
  }

  // ---- the ultra secret room's spot: not on the map at all. Two steps from a plain room through
  // an empty cell, so only a red room made there leads to it.
  const ultraSpots = [];
  const plain = (o) => o && (o.type === 'normal' || o.type === 'start');
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (!free(x, y) || DIR_LIST.some((d) => filled(x + DIRS[d][0], y + DIRS[d][1]))) continue;
      const reach = DIR_LIST.some((d) => {
        const ex = x + DIRS[d][0], ey = y + DIRS[d][1];
        if (!free(ex, ey)) return false;
        return DIR_LIST.some((d2) => {
          const o = occ.get(ukey(ex + DIRS[d2][0], ey + DIRS[d2][1]));
          return plain(o) && slotAt(o, ex + DIRS[d2][0], ey + DIRS[d2][1], OPPOSITE[d2]);
        });
      });
      if (reach) ultraSpots.push([x, y]);
    }
  }
  const ultra = ultraSpots.length ? rng.pick(ultraSpots) : null;

  measure();
  // hidden rooms aren't reached through doors (the super secret room keeps where it sat in the tree)
  for (const c of [sup, secret]) if (c) c.dist = null;
  const plan = { cells, start, occ, reserved, ultra, target };
  if (validatePlan(plan, opts).length) return null;
  return plan;
}

// Every rule a finished plan must keep. Returns a list of problems (empty = good).
// Used by the generator (a bad plan is thrown away) and by tools/floortest.js.
export function validatePlan(plan, opts = {}) {
  const problems = [];
  const { cells, start, occ } = plan;
  const at = (x, y) => occ.get(ukey(x, y));
  // 1. adjacent rooms: two ordinary rooms always share a door slot on both sides; a hidden
  //    room needs a bombable slot in every neighbor
  for (const c of cells) {
    for (const [x, y] of c.units) {
      for (const d of DIR_LIST) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        const o = at(nx, ny);
        if (!o || o === c) continue;
        const mine = slotAt(c, x, y, d), theirs = slotAt(o, nx, ny, OPPOSITE[d]);
        if (!mine || !theirs) problems.push(`${c.type}@${x},${y} touches ${o.type}@${nx},${ny} with no door slot`);
      }
    }
  }
  // 2. walking through ordinary doors from the start reaches every ordinary room
  const seen = new Set([start]);
  const q = [start];
  while (q.length) {
    const c = q.shift();
    for (const [x, y] of c.units) {
      for (const d of DIR_LIST) {
        const o = at(x + DIRS[d][0], y + DIRS[d][1]);
        if (o && !seen.has(o) && !SECRET_TYPES.has(o.type)) { seen.add(o); q.push(o); }
      }
    }
  }
  for (const c of cells) if (!SECRET_TYPES.has(c.type) && !seen.has(c)) problems.push(`${c.type}@${c.x},${c.y} can't be reached without a secret room`);
  // 3. the start room in the middle with two or more ways out
  if (start.x !== START[0] || start.y !== START[1]) problems.push('start room is not in the middle');
  const neighborsOf = (c) => {
    const out = new Set();
    for (const [x, y] of c.units) for (const d of DIR_LIST) { const o = at(x + DIRS[d][0], y + DIRS[d][1]); if (o && o !== c) out.add(o); }
    return [...out];
  };
  if (neighborsOf(start).filter((o) => !SECRET_TYPES.has(o.type)).length < 2) problems.push('start room has fewer than 2 neighbors');
  // 4. boss rooms: a dead end far from the start (two back to back on a labyrinth floor)
  const bosses = cells.filter((c) => c.type === 'boss');
  if (bosses.length !== (opts.labyrinth ? 2 : 1)) problems.push(`${bosses.length} boss rooms`);
  for (const b of bosses) if (neighborsOf(b).includes(start)) problems.push('boss room next to the start');
  // 5. hidden rooms
  const secrets = cells.filter((c) => c.type === 'secret');
  const supers = cells.filter((c) => c.type === 'supersecret');
  if (opts.secret !== false && secrets.length !== 1) problems.push(`${secrets.length} secret rooms`);
  if (supers.length !== 1) problems.push(`${supers.length} super secret rooms`);
  for (const s of secrets) {
    for (const o of neighborsOf(s)) if (o.type === 'boss' || SECRET_TYPES.has(o.type)) problems.push(`secret room next to ${o.type}`);
  }
  for (const s of supers) {
    const n = neighborsOf(s);
    if (n.length !== 1 || !(n[0].type === 'normal' || n[0].type === 'start')) problems.push(`super secret room touches ${n.map((o) => o.type).join('+') || 'nothing'}`);
  }
  // 6. special rooms sit on one-screen dead ends
  for (const c of cells) {
    if (c.type === 'normal' || c.type === 'start' || c.type === 'secret') continue;
    if (c.firstBoss) continue;
    const n = neighborsOf(c).filter((o) => o.type !== 'secret');
    if (c.shape !== '1x1' || n.length !== 1) problems.push(`${c.type}@${c.x},${c.y} is not a dead end`);
  }
  // 7. nothing in a reserved cell (an L's corner, beside a narrow room)
  for (const k of plan.reserved) if (occ.has(k)) problems.push(`room in a blocked cell ${k}`);
  return problems;
}
