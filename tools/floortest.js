// Dev tool: generates thousands of floors and checks every generation rule (not part of the game).
// Open tools/floortest.html, or in the browser console:
//   const T = await import('/tools/floortest.js'); await T.run(10000);
// Each floor gets a random seed, floor number, curse and special room list, is built with the
// real Floor class (plan + doors), and is checked against the rules in DESIGN.md "Floor
// generation". Every 50th floor also builds every room and checks its doorways and spawn spots.
import { RNG, randomSeedString } from '../src/engine/rng.js';
import { FLOORS } from '../src/data/floors.js';
import { VARIANTS, variantsFor } from '../src/data/variants.js';
import { Floor, doorKind } from '../src/game/floor.js';
import { GRID_W, GRID_H, START, ukey, roomCount, minDeadEnds, SECRET_TYPES } from '../src/game/floorgen.js';
import { DIRS, DIR_LIST, T } from '../src/game/constants.js';
import { shapeSlots, doorwayTiles } from '../src/game/shapes.js';
import { validateTemplate } from '../src/game/room.js';

const EXTRA = ['planetarium', 'sacrifice', 'dice', 'library', 'curse', 'miniboss', 'challenge', 'bosschallenge', 'arcade', 'vault', 'nursery', 'sickroom'];

// A random but realistic setup for one floor.
function randomSetup(r) {
  const n = r.int(1, FLOORS.length);
  const def = FLOORS[n - 1];
  const next = FLOORS[n];
  const labyrinthOk = n >= 2 && !def.final && next && next.chapter === def.chapter && !next.final;
  const labyrinth = labyrinthOk && r.chance(0.3);
  const lost = n >= 2 && !def.final && !labyrinth && r.chance(0.15);
  let specials;
  if (def.specials) specials = [...def.specials];
  else {
    specials = [];
    if (def.chapter <= 3 || r.chance(0.66)) specials.push('shop');
    if (def.chapter <= 3 || r.chance(0.5)) { specials.push('treasure'); if (labyrinth) specials.push('treasure'); }
    for (const t of EXTRA) if (r.chance(0.3)) specials.push(t);
  }
  const variant = VARIANTS[r.pick(variantsFor(def.chapter))];
  return { n, floorDef: { ...def, floorNum: n, labyrinth, lost, specials, name: 'TEST' }, variant };
}

function neighborsOf(floor, c) {
  const out = new Set();
  for (const [x, y] of c.units) {
    for (const d of DIR_LIST) {
      const o = floor.cellAt(x + DIRS[d][0], y + DIRS[d][1]);
      if (o && o !== c) out.add(o);
    }
  }
  return [...out];
}

// Every rule for one floor. Returns a list of problems.
export function checkFloor(floor, setup) {
  const P = [];
  const fail = (m) => P.push(m);
  const { floorDef: def } = setup;
  const cells = [...floor.cells.values()];
  const start = floor.start;
  const plain = (c) => c.type === 'normal' || c.type === 'start';

  // grid and start
  for (const c of cells) for (const [x, y] of c.units) if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) fail(`room outside the 13x13 grid at ${x},${y}`);
  if (start.x !== START[0] || start.y !== START[1] || start.type !== 'start') fail('start room is not the middle cell');

  // room count (the second boss room of a labyrinth floor and the hidden rooms come on top)
  const counted = cells.filter((c) => !SECRET_TYPES.has(c.type) || c.type === 'supersecret').length - (def.labyrinth ? 1 : 0);
  if (counted !== floor.plan.target) fail(`${counted} rooms, wanted ${floor.plan.target}`);
  const base = def.fixedRooms ? null : Math.min(20, 5 + Math.floor((def.floorNum * 10) / 3));
  if (base) {
    let lo = base, hi = Math.min(20, base + 1);
    if (def.labyrinth) { lo = Math.min(45, Math.floor(lo * 1.8)); hi = Math.min(45, Math.floor(hi * 1.8)); }
    if (def.lost) { lo += 4; hi += 4; }
    if (floor.plan.target < lo || floor.plan.target > hi) fail(`room count ${floor.plan.target} outside ${lo}-${hi}`);
  }

  // doors: every two touching rooms share one door (both sides), in the middle of the shared wall
  for (const c of cells) {
    for (const s of shapeSlots(c.shape)) {
      const tx = c.x + s.ux + DIRS[s.dir][0], ty = c.y + s.uy + DIRS[s.dir][1];
      const o = floor.cellAt(tx, ty);
      const l = c.links[s.key];
      if (!o || o === c) { if (l) fail(`${c.type} has a door to nothing`); continue; }
      if (!l || l.cell !== o) { fail(`${c.type}@${c.x},${c.y} and ${o.type}@${o.x},${o.y} touch with no door`); continue; }
      const back = o.links[l.slotKey];
      if (!back || back.cell !== c || o.doors[l.slotKey] !== c.doors[s.key]) fail(`door ${c.type}->${o.type} is one-sided`);
      const hidden = SECRET_TYPES.has(c.type) || SECRET_TYPES.has(o.type);
      const door = c.doors[s.key];
      if (hidden !== (door.lock === 'bomb')) fail(`door ${c.type}->${o.type} should ${hidden ? '' : 'not '}be a bombable wall`);
      if (door.kind !== doorKind(c, o)) fail(`door ${c.type}->${o.type} has the wrong look (${door.kind})`);
    }
    // touching on a side with no slot at all (an L's corner, beside a narrow room)
    const own = new Set(c.units.map(([x, y]) => ukey(x, y)));
    for (const [x, y] of c.units) {
      for (const d of DIR_LIST) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        const o = floor.cellAt(nx, ny);
        if (!o || own.has(ukey(nx, ny))) continue;
        if (!shapeSlots(c.shape).some((s) => s.dir === d && c.x + s.ux === x && c.y + s.uy === y)) fail(`${o.type} touches ${c.shape} ${c.type} where it can have no door`);
      }
    }
  }

  // reachability: only ordinary doors (no bombable walls) from the start reach every room but the hidden ones
  const seen = new Set([start]);
  const q = [start];
  while (q.length) {
    const c = q.shift();
    for (const [k, l] of Object.entries(c.links)) if (c.doors[k].lock !== 'bomb' && !seen.has(l.cell)) { seen.add(l.cell); q.push(l.cell); }
  }
  for (const c of cells) if (!SECRET_TYPES.has(c.type) && !seen.has(c)) fail(`${c.type}@${c.x},${c.y} can't be reached through ordinary doors`);

  // the start room
  if (neighborsOf(floor, start).filter((o) => !SECRET_TYPES.has(o.type)).length < 2) fail('start room has fewer than 2 neighbors');

  // dead ends
  const ordinaryNeighbors = (c) => neighborsOf(floor, c).filter((o) => !SECRET_TYPES.has(o.type));
  const deadEnds = cells.filter((c) => c.deadEnd);
  if (deadEnds.length < minDeadEnds(def)) fail(`${deadEnds.length} dead ends, needs ${minDeadEnds(def)}`);

  // boss rooms
  const bosses = cells.filter((c) => c.type === 'boss');
  if (bosses.length !== (def.labyrinth ? 2 : 1)) fail(`${bosses.length} boss rooms`);
  for (const b of bosses) if (neighborsOf(floor, b).includes(start)) fail('boss room next to the start');
  const farBoss = bosses.find((b) => !b.firstBoss);
  const firstBoss = bosses.find((b) => b.firstBoss) || farBoss;
  if (def.labyrinth) {
    if (!farBoss || !bosses.some((b) => b.firstBoss)) fail('labyrinth boss rooms not set up');
    else if (!neighborsOf(floor, farBoss).includes(firstBoss) || ordinaryNeighbors(farBoss).length !== 1) fail('labyrinth boss rooms are not back to back');
  }
  // the (first) boss room is the farthest dead end
  const treeDist = (c) => c.treeDist ?? c.dist;
  for (const c of deadEnds) if (c !== firstBoss && c !== farBoss && treeDist(c) > firstBoss.dist) fail(`a dead end (${c.type}) is farther than the boss room`);

  // super secret: replaces a dead end, hangs off exactly one plain room
  const sups = cells.filter((c) => c.type === 'supersecret');
  if (sups.length !== 1) fail(`${sups.length} super secret rooms`);
  for (const s of sups) {
    const n = neighborsOf(floor, s);
    if (n.length !== 1 || !plain(n[0])) fail(`super secret room touches ${n.map((o) => o.type).join('+')}`);
    if (!s.deadEnd) fail('super secret room is not on a dead end');
  }

  // secret room: an empty cell, not part of the tree, never needed
  const secrets = cells.filter((c) => c.type === 'secret');
  if (secrets.length !== 1) fail(`${secrets.length} secret rooms`);
  for (const s of secrets) {
    if (s.deadEnd) fail('secret room took a dead end');
    const n = neighborsOf(floor, s);
    if (!n.length) fail('secret room touches nothing');
    for (const o of n) {
      if (o.type === 'boss' || SECRET_TYPES.has(o.type)) fail(`secret room next to ${o.type}`);
    }
    // every neighbor's wall facing it is a bombable wall
    for (const [k, l] of Object.entries(s.links)) if (s.doors[k].lock !== 'bomb') fail('secret room wall is not bombable');
    if (Object.keys(s.links).length !== n.length) fail('secret room is missing a bombable wall');
  }

  // special rooms: one-screen dead ends, handed out farthest first in the floor's order
  const specials = def.specials || [];
  const placed = [];
  const pool = cells.filter((c) => !plain(c) && c.type !== 'secret' && c.type !== 'boss' && c.type !== 'supersecret');
  for (const c of pool) if (c.shape !== '1x1' || ordinaryNeighbors(c).length !== 1) fail(`${c.type} is not a dead end`);
  // in list order each one is no closer than the next
  const used = new Set();
  for (const t of specials) {
    const c = pool.filter((p) => p.type === t && !used.has(p)).sort((a, b) => b.dist - a.dist)[0];
    if (!c) break;
    used.add(c);
    placed.push(c);
  }
  for (let i = 1; i < placed.length; i++) if (placed[i].dist > placed[i - 1].dist) fail(`${placed[i].type} is farther than ${placed[i - 1].type}, which came first`);
  if (placed.length !== pool.length) fail(`special rooms not in the floor's list: ${pool.filter((c) => !used.has(c)).map((c) => c.type)}`);
  const leftover = deadEnds.filter((c) => c.type === 'normal');
  if (placed.length < specials.length && leftover.length) fail(`${specials[placed.length]} left out with ${leftover.length} dead ends free`);
  // the super secret room took the farthest dead end (after the boss) that hangs off a plain room
  if (sups[0]) for (const c of [...placed, ...leftover]) if (c.dist > treeDist(sups[0]) && ordinaryNeighbors(c).length === 1 && plain(ordinaryNeighbors(c)[0])) fail('a farther dead end could have been the super secret room');
  if (placed.length && leftover.some((c) => c.dist > placed[placed.length - 1].dist)) fail('a free dead end is farther than a special room');

  // a layout for every room
  for (const c of cells) if (!c.template) fail(`no layout for ${c.type} (${c.shape})`);
  return P;
}

// Build every room of the floor and check doorways and spawn spots.
export function checkRooms(floor, rng) {
  const P = [];
  for (const c of floor.cells.values()) {
    const room = floor.roomFor(c);
    const doors = room.slots.filter((s) => s.door);
    for (const s of room.slots) {
      for (const [col, row] of doorwayTiles(s, room.shape)) {
        if (room.get(col, row) !== T.FLOOR) P.push(`${c.type}: doorway ${s.key} not clear`);
      }
    }
    // a walkable path between all doors
    if (!room.doorsConnected(room.blockedTiles(), -1, doors.map((s) => s.cell))) P.push(`${c.type}: doors not connected`);
    // spawn spots: aimed anywhere (doorways too), always land somewhere safe
    for (let i = 0; i < 12; i++) {
      const wx = i < 4 ? doors[i % Math.max(1, doors.length)]?.x ?? room.centerX : room.x0 + rng.next() * room.W;
      const wy = i < 4 ? doors[i % Math.max(1, doors.length)]?.y ?? room.centerY : room.y0 + rng.next() * room.H;
      const s = room.findFreeSpot(wx, wy);
      const col = room.colAt(s.x), row = room.rowAt(s.y);
      if (room.get(col, row) !== T.FLOOR) { P.push(`${c.type}: spawn spot on a solid tile`); continue; }
      const near = room.doorTiles().some(([dc, dr]) => Math.max(Math.abs(dc - col), Math.abs(dr - row)) <= 2);
      if (near) P.push(`${c.type} (${room.shape}): spawn spot within 2 tiles of a door`);
      if (!room.doorsConnected(room.blockedTiles(), row * room.cols + col, doors.map((d) => d.cell))) P.push(`${c.type}: spawn spot cuts the doors off`);
    }
  }
  return P;
}

// Every room layout of every variant: right size, every door slot reachable from the others.
export function checkTemplates() {
  const P = [];
  for (const v of Object.values(VARIANTS)) {
    for (const t of v.rooms) for (const p of validateTemplate(t)) P.push(`${v.id}/${t.id}: ${p}`);
  }
  return P;
}

// Generate `count` floors and report. `from` lets a long run go in batches.
export async function run(count = 10000, { roomsEvery = 50, from = 0, log = console.log } = {}) {
  const t0 = performance.now();
  const problems = new Map();
  let bad = 0, attempts = 0, maxAttempts = 0, loops = 0;
  const examples = [];
  const tpl = from === 0 ? checkTemplates() : [];
  for (const p of tpl) problems.set(p, 1);
  for (let i = from; i < from + count; i++) {
    const seed = randomSeedString();
    const r = new RNG(seed + ':setup');
    const setup = randomSetup(r);
    let floor, P;
    try {
      floor = new Floor(new RNG(seed).fork('floor:' + setup.n), setup.floorDef, setup.variant);
      P = checkFloor(floor, setup);
      if (roomsEvery && i % roomsEvery === 0) P.push(...checkRooms(floor, r));
    } catch (e) {
      P = [`crash: ${e.message}`];
    }
    if (floor) {
      attempts += floor.plan.attempts;
      maxAttempts = Math.max(maxAttempts, floor.plan.attempts);
      // loops (only big rooms can make one): doors - rooms + 1 on the ordinary part
      const ord = [...floor.cells.values()].filter((c) => !SECRET_TYPES.has(c.type));
      const doors = ord.reduce((s, c) => s + Object.values(c.links).filter((l) => !SECRET_TYPES.has(l.cell.type)).length, 0) / 2;
      if (doors - ord.length + 1 > 0) { loops++; P.push('the floor has a loop'); }
    }
    if (P.length) {
      bad++;
      for (const p of P) problems.set(p, (problems.get(p) || 0) + 1);
      if (examples.length < 5) examples.push({ seed, floor: setup.n, labyrinth: setup.floorDef.labyrinth, lost: setup.floorDef.lost, problems: P });
    }
    if (i % 500 === 499) await new Promise((res) => setTimeout(res, 0));
  }
  const report = {
    floors: count, bad,
    seconds: +((performance.now() - t0) / 1000).toFixed(1),
    avgAttempts: +(attempts / count).toFixed(1), maxAttempts,
    floorsWithLoops: loops,
    problems: Object.fromEntries([...problems.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)),
    examples,
  };
  log(report);
  return report;
}
