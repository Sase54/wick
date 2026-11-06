// Pocket things and trinkets: rolling them, picking them up, using them, and their icons.
// Data: src/data/consumables.js (pills, cards, runes, character stones) and src/data/trinkets.js.
//
//   A consumable is { kind: 'pill' | 'card' | 'rune' | 'stone', id, color, big }.
//   Pills are known by their color: each run gives the colors its own effects (from the seed);
//   a color stays "???" until one of that color is taken.
//   A trinket is { id, golden }.
import { PILLS, PILL_COLORS, BIG_PILL_CHANCE, CARDS, RUNES, STONES, POCKET_SIZE, CONSUMABLE_DROP } from '../data/consumables.js';
import { TRINKETS, GOLDEN_CHANCE } from '../data/trinkets.js';
import { CHARACTERS } from '../data/characters.js';
import { RAMP } from '../data/packArt.js';
import { ACTIVE_EFFECTS } from './actives.js';
import { MECHANICS } from './mechanics.js';
import { Machine } from './machines.js';
import { Chest, addProp, openDealRoom } from './specials.js';
import { Pedestal } from './items.js';
import { Bomb } from './bombs.js';
import { Gnat } from './followers.js';
import { progress } from './progress.js';
import { buildSprite, scale2x } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { T } from './constants.js';
import './trinketfx.js';

const DATA = { pill: PILLS, card: CARDS, rune: RUNES, stone: STONES };
export const CONSUMABLE_KINDS = new Set(['pill', 'card', 'rune', 'stone']);

// ---------------------------------------------------------------------------
// Pills: this run's colors
export function setupPills(g, saved = null) {
  if (saved) { g.pillByColor = saved.byColor; g.pillKnown = new Set(saved.known); return; }
  const r = g.rng.fork('pills');
  const allowed = Object.keys(PILLS).filter((id) => progress.isUnlocked('pill', id));
  g.pillByColor = r.shuffle(allowed).slice(0, PILL_COLORS.length);
  g.pillKnown = new Set();
}
export const pillsSave = (g) => ({ byColor: g.pillByColor, known: [...(g.pillKnown || [])] });

// ---------------------------------------------------------------------------
// Rolling what drops
const allowedIds = (kind) => Object.keys(DATA[kind]).filter((id) => progress.isUnlocked(kind, id));

export function rollConsumable(g, kind = null) {
  const r = g.lootRng;
  kind ??= r.weighted(CONSUMABLE_DROP).kind;
  if (kind === 'pill') return { kind, color: r.int(0, (g.pillByColor?.length || PILL_COLORS.length) - 1), big: r.chance(BIG_PILL_CHANCE) };
  if (kind === 'stone') {
    // your own character's stone a bit more often
    const own = g.player.charId?.replace('_t', '');
    const id = own && STONES[own] && r.chance(0.25) ? own : r.pick(allowedIds('stone'));
    return { kind, id };
  }
  const ids = allowedIds(kind);
  return { kind, id: r.weighted(ids.map((id) => ({ id, weight: DATA[kind][id].weight ?? 1 }))).id };
}

// Decide what a pocket-thing or trinket pickup holds (shop stock, spawns).
export function fillPickup(g, it) {
  if (CONSUMABLE_KINDS.has(it.type)) it.cons = rollConsumable(g, it.type);
  else if (it.type === 'trinket') it.trinket = rollTrinket(g);
  return it;
}

export function rollTrinket(g) {
  const r = g.lootRng;
  const held = new Set([g.player.trinket?.id, ...g.player.gulped.map((t) => t.id)]);
  const ids = Object.keys(TRINKETS).filter((id) => !held.has(id) && !g.trinketsSeen?.has(id) && progress.isUnlocked('trinket', id));
  const pool = ids.length ? ids : Object.keys(TRINKETS);
  const id = r.weighted(pool.map((i) => ({ id: i, weight: TRINKETS[i].weight ?? 1 }))).id;
  (g.trinketsSeen ??= new Set()).add(id);
  const luck = Math.max(0, g.player.stats.luck);
  return { id, golden: g.floorNum >= 2 && r.chance(GOLDEN_CHANCE + luck * 0.005) };
}

// ---------------------------------------------------------------------------
// Names
export function consumableDef(c) {
  if (c.kind === 'pill') return PILLS[c.id] || null;
  return DATA[c.kind]?.[c.id] || null;
}
export function consumableName(g, c) {
  if (c.kind === 'pill') {
    const id = g.pillByColor?.[c.color];
    const known = id && g.pillKnown?.has(id);
    return `${c.big ? 'BIG ' : ''}${known ? PILLS[id].name : '??? PILL'}`;
  }
  return consumableDef(c)?.name || '?';
}
export const trinketName = (t) => `${t.golden ? 'GOLDEN ' : ''}${TRINKETS[t.id]?.name.toUpperCase() || '?'}`;

// ---------------------------------------------------------------------------
// The pocket: the character's own pocket item (if any) and up to POCKET_SIZE consumables.
export function pocketList(p) {
  return [...(p.pocket ? [{ kind: 'active' }] : []), ...p.consumables];
}
export function selectedPocket(p) {
  const list = pocketList(p);
  return list.length ? list[p.pocketSel % list.length] : null;
}

// Picking a consumable up. With a full pocket, the chosen one drops where you stand.
export function takeConsumable(g, c) {
  const p = g.player;
  if (p.consumables.length >= POCKET_SIZE) {
    const list = pocketList(p);
    let drop = list[p.pocketSel % list.length];
    if (!drop || drop.kind === 'active') drop = p.consumables[p.consumables.length - 1];
    p.consumables.splice(p.consumables.indexOf(drop), 1);
    const it = g.spawnPickup(drop.kind, p.x, p.y);
    it.cons = drop;
    it.age = -0.6;   // don't pick it straight back up
  }
  p.consumables.push(c);
  p.pocketSel = pocketList(p).indexOf(c);
  g.banner = { text: consumableName(g, c), sub: c.kind === 'pill' ? '' : consumableDef(c)?.desc || '', t: 0, dur: 2.2, top: true, icon: consumableIcon(c) };
}

export function switchPocket(g) {
  const p = g.player, n = pocketList(p).length;
  if (n < 2) return;
  p.pocketSel = (p.pocketSel + 1) % n;
  sfx('menuMove');
}

// Use whatever is chosen in the pocket (Q / PKT).
export function usePocket(g) {
  const p = g.player;
  const sel = selectedPocket(p);
  if (!sel || p.dead) return;
  if (sel.kind === 'active') { g.useActive('pocket'); return; }
  p.consumables.splice(p.consumables.indexOf(sel), 1);
  p.pocketSel = Math.min(p.pocketSel, Math.max(0, pocketList(p).length - 1));
  useConsumable(g, sel);
}

export function useConsumable(g, c) {
  const p = g.player;
  let d = consumableDef(c), mul = 1;
  if (c.kind === 'pill') {
    const id = g.pillByColor[c.color];
    d = PILLS[id];
    mul = c.big ? 2 : 1;
    const first = !g.pillKnown.has(id);
    g.pillKnown.add(id);
    progress.event('pillUsed');
    sfx(d.good === false ? 'hurt' : 'heart');
    g.banner = { text: `${c.big ? 'BIG ' : ''}${d.name}`, sub: first ? d.desc : '', t: 0, dur: 2.4, top: true, icon: consumableIcon(c) };
  } else {
    progress.event(c.kind === 'rune' ? 'runeUsed' : c.kind === 'card' ? 'cardUsed' : 'activeUsed');
    sfx(c.kind === 'rune' ? 'chime' : 'active');
    g.banner = { text: d.name, sub: d.desc, t: 0, dur: 2.2, top: true, icon: consumableIcon(c) };
  }
  g.particles.burst(p.x, p.y - 12, 12, { colors: c.kind === 'rune' ? ['#c4bfb6', '#8ad0f0'] : ['#fff3c0', '#e8d9b0'], speed: 60, z: 10, vz: 40 });
  runFx(g, d, mul);
}

// ---------------------------------------------------------------------------
// Trinkets
export function takeTrinket(g, t, x, y) {
  const p = g.player;
  if (p.trinket) {
    const it = g.spawnPickup('trinket', x, y);
    it.trinket = p.trinket;
    it.age = -0.8;
  }
  p.trinket = t;
  p.recompute();
  g.syncFollowers();
  progress.event('trinketFound');
  sfx('itemGet');
  g.banner = { text: trinketName(t), sub: TRINKETS[t.id].desc, t: 0, dur: 2.6, top: true, icon: trinketIcon(t) };
}

// The Melting Pot and THE KILN: the held trinket becomes part of you.
export function absorbTrinket(g) {
  const p = g.player;
  if (!p.trinket) return false;
  p.gulped.push(p.trinket);
  g.banner = { text: `${trinketName(p.trinket)} MELTS IN`, sub: 'IT WORKS FOREVER NOW', t: 0, dur: 2.4, top: true, icon: trinketIcon(p.trinket) };
  p.trinket = null;
  p.recompute();
  g.syncFollowers();
  sfx('steam');
  g.particles.burst(p.x, p.y - 10, 18, { colors: ['#f08a24', '#ffd25a', '#e8d9b0'], speed: 70, z: 10, vz: 50 });
  return true;
}

// ---------------------------------------------------------------------------
// Effects (`fx`), shared by pills, cards, runes and stones. (g, d, mul): mul 2 for a big pill.
const scaled = (d, mul) => {
  const out = { ...d };
  for (const k of ['time', 'count', 'damage', 'amount', 'n']) if (typeof out[k] === 'number') out[k] *= mul;
  return out;
};

function runFx(g, d, mul = 1) {
  if (!d) return;
  if (d.fx.startsWith('active:')) { ACTIVE_EFFECTS[d.fx.slice(7)](g, scaled(d, mul)); return; }
  CONSUMABLE_FX[d.fx]?.(g, scaled(d, mul), mul);
}

const free = (g, near = 30) => {
  const p = g.player;
  const a = Math.random() * Math.PI * 2;
  return g.room.findFreeSpot(p.x + Math.cos(a) * near, p.y + Math.sin(a) * near);
};
const living = (g) => g.enemies.filter((e) => e.hittable);

export const CONSUMABLE_FX = {
  heal(g, d) {
    g.player.health.healRed(d.amount);
    if (d.extra) for (let i = 0; i < 2; i++) g.spawnPickup(d.extra, g.player.x, g.player.y);
  },
  hearts(g, d) {
    const h = g.player.health;
    h.addSoul(2 * (d.n || 1), d.type === 'soot' ? 'black' : 'soul');
    if (d.plus === 'vigil') h.addEternal();
  },
  containers(g, d) { g.player.health.addContainers(d.amount, true); },
  stat(g, d) {
    const p = g.player;
    p.pillStats[d.stat] = (p.pillStats[d.stat] || 0) + d.amount;
    p.recompute();
  },
  charge(g) { for (const s of [g.player.active, g.player.pocket]) if (s) s.charge = 99; },
  map(g) { g.floor.revealAll(); },
  gnats(g, d) { for (let i = 0; i < d.n && g.gnats.length < 16; i++) g.gnats.push(new Gnat(g.player.x, g.player.y)); sfx('gnat'); },
  poisonCloud(g, d) {
    const p = g.player;
    for (const e of living(g)) if (Math.hypot(e.x - p.x, e.y - p.y) < 80) { e.applyStatus('poison', d.damage * 3); e.takeHit(d.damage, 0, 0, 20, g); }
    g.particles.burst(p.x, p.y - 6, 30, { colors: ['#6aba34', '#9ccf6a', '#3e5a1c'], speed: 70, z: 6, vz: 20, life: 1, drag: 2 });
  },
  hurt(g, d) {
    const p = g.player;
    if (p.health.total > d.amount) p.hurt(d.amount, 'A BITTER PILL', g, p.x, p.y, true);
  },
  confuse(g, d) { g.player.confuseT = d.time; },
  heavy(g, d) { g.player.heavyT = d.time; },
  dark(g, d) { g.pillDarkT = d.time; },
  amnesia(g) { for (const c of g.floor.cells.values()) if (!c.visited && c !== g.cell) c.seen = false; },
  teleport(g) { ACTIVE_EFFECTS.teleport(g); },
  swapBombsKeys(g) { const p = g.player; [p.bombs, p.keys] = [p.keys, p.bombs]; },
  turnInto(g, d) {
    for (const it of g.pickups) {
      if (it.price || it.collected || it.cons || it.trinket) continue;
      it.setType(d.type);
    }
  },
  dropBombs(g, d) {
    const p = g.player;
    for (let i = 0; i < d.n; i++) { const b = new Bomb(p.x + (i - 1) * 12, p.y + 4); b.fuse *= 1 + i * 0.25; g.bombs.push(b); }
  },
  nothing() {},
  goTo(g, d) {
    const cells = [...g.floor.cells.values()].filter((c) => !c.offGrid && c !== g.cell);
    let to;
    if (d.room === 'unvisited') {
      const un = cells.filter((c) => !c.visited && c.type !== 'boss');
      to = un.find((c) => c.type !== 'normal') || g.lootRng.pick(un.length ? un : cells);
    } else to = cells.find((c) => c.type === d.room);
    if (to) g.teleportTo(to);
    else sfx('denied');
  },
  openSecrets(g) {
    for (const door of Object.values(g.cell.doors)) { door.hidden = false; door.locked = false; }
    g.floor.visit(g.cell);
    sfx('secret');
  },
  secrets(g) {
    for (const c of g.floor.cells.values()) {
      if (c.type === 'secret' || c.type === 'supersecret') c.seen = true;
      for (const door of Object.values(c.doors)) door.hidden = false;
    }
    g.floor.revealAll();
    sfx('secret');
  },
  roomBuff(g, d) { g.player.roomDamage = (g.player.roomDamage || 0) + d.amount; },
  blasts(g, d) {
    const p = g.player, room = g.room;
    for (let i = 0; i < d.n; i++) {
      setTimeout(() => {
        let x, y, tries = 0;
        do { x = room.x0 + 20 + Math.random() * (room.R - room.x0 - 40); y = room.y0 + 20 + Math.random() * (room.B - room.y0 - 40); } while (Math.hypot(x - p.x, y - p.y) < 50 && ++tries < 10);
        g.explode(x, y);
      }, i * 220);
    }
  },
  spawnMachine(g, d) {
    const s = free(g, 40);
    const m = addProp(g.room, new Machine(s.x, s.y + 6, { type: g.lootRng.pick(d.pick) }));
    m.setup(g);
  },
  chest(g) { const s = free(g, 30); addProp(g.room, new Chest(s.x, s.y, { type: g.rollChest(), open: false })); sfx('secret'); },
  double(g, d) {
    const p = g.player;
    if (d.type === 'hearts') p.health.healRed(p.health.red);
    else p[d.type] = Math.min(99, p[d.type] * 2);
  },
  spawnItem(g, d) { const s = free(g, 36); g.room.pedestals.push(new Pedestal(s.x, s.y, g.itemPools.draw(d.pool))); },
  dealRoom(g) { if (!openDealRoom(g)) sfx('denied'); },
  spawn(g, d) { for (let i = 0; i < d.n; i++) g.spawnPickup(d.type, g.player.x, g.player.y); },
  randomCard(g, d, mul) { runFx(g, CARDS[g.lootRng.pick(Object.keys(CARDS).filter((k) => CARDS[k].fx !== 'randomCard'))], mul); },
  randomRune(g, d, mul) { runFx(g, RUNES[g.lootRng.pick(Object.keys(RUNES).filter((k) => RUNES[k].fx !== 'randomRune'))], mul); },
  randomStone(g, d, mul) { runFx(g, STONES[g.lootRng.pick(Object.keys(STONES).filter((k) => STONES[k].fx !== 'randomStone'))], mul); },
  absorbTrinket(g) { if (!absorbTrinket(g)) sfx('denied'); },
  smite(g, d) {
    const dmg = d.damage + g.player.stats.damage;
    for (const e of living(g)) { if (d.burn) e.applyStatus('burn', dmg); e.takeHit(dmg, 0, -1, 40, g); g.effects.bolt(e.x, e.y - 100, e.x, e.y - 4, 0.3); }
    for (const b of g.bosses) { if (d.burn) b.applyStatus?.('burn', dmg); b.takeHit(dmg, g); }
    g.flashT = 0.3; g.shake(5); sfx('explosion');
  },
  duplicate(g) {
    for (const it of [...g.pickups]) {
      if (it.price || it.collected) continue;
      const c = g.spawnPickup(it.type, it.x, it.y);
      if (it.cons) c.cons = { ...it.cons };
      if (it.trinket) c.trinket = { ...it.trinket };
    }
  },
  breakAll(g) {
    const room = g.room;
    for (let r = 0; r < room.rows; r++) for (let c = 0; c < room.cols; c++) {
      const t = room.get(c, r);
      if (t === T.ROCK || t === T.POT || t === T.TINTED) room.breakTile(c, r, g);
    }
    g.shake(5);
  },
  wards(g, d) { g.player.ward += d.n; sfx('ward'); },
  extraLife(g) { g.player.mech.stoneLife = { floor: g.floorNum }; },
  crossBeam(g, d) {
    const p = g.player, dmg = d.damage + p.stats.damage;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.effects.bolt(p.x, p.y - 6, p.x + dx * 300, p.y - 6 + dy * 300, 0.35);
    for (const e of living(g)) if (Math.abs(e.x - p.x) < e.r + 6 || Math.abs(e.y - p.y) < e.r + 6) e.takeHit(dmg, 0, 0, 40, g);
    for (const b of g.bosses) { const c = b.hitCircles()[0]; if (c && (Math.abs(c.x - p.x) < c.r + 6 || Math.abs(c.y - p.y) < c.r + 6)) b.takeHit(dmg, g); }
    g.flashT = 0.2; sfx('beam');
  },
  roomMech(g, d) { const p = g.player; if (!p.mech[d.mech]) p.mech[d.mech] = { ...(d.params || {}), puddles: [], queue: [], roomTemp: true }; },
  sentries(g, d) { for (let i = 0; i < d.n; i++) ACTIVE_EFFECTS.sentry(g, { life: 20, max: 6, damageMul: 1 }); },
  combo(g, d, mul) { for (const [fx, params] of d.steps) runFx(g, { fx, ...params }, mul); },
};

// The Stone of Morrow: come back once this floor.
MECHANICS.stoneLife = {
  preventDeath(g, p, m) {
    if (m.floor !== g.floorNum) return false;
    delete p.mech.stoneLife;
    p.health.healRed(4);
    if (p.health.total < 2) p.health.addSoul(4, 'soul');
    p.invuln = 2;
    g.flashT = 0.5;
    sfx('revive');
    return true;
  },
};

// ---------------------------------------------------------------------------
// Icons. Small grids drawn in our palette ramps ('1' dark, '2' mid, '3' light, '4' highlight,
// 'k' outline), built once.
const R = RAMP;
const RAMPS = {
  bone: R.bone, iron: R.iron, wood: R.wood, teal: R.teal, blood: R.blood, rot: R.rot, wax: R.wax, ember: R.ember,
  pale: R.pale, flesh: R.flesh, gold: R.gold, ink: R.ink, void: R.void, soul: R.soul, stone: R.stone,
};
const SHAPES = {
  tooth: ['.kkkkk.', 'k34432k', 'k32222k', 'k22221k', 'k2kk21k', 'k2k.k1k', '.k...k.'],
  pin: ['....kk', '...k3k', '..k32k', '.k22k.', 'k21k..', 'k1k...', '.k....'],
  sole: ['.kkkk.', 'k3322k', 'k3221k', 'k2221k', '.k221k', '.k221k', '.k111k', '..kkk.'],
  lens: ['.kkkkk.', 'k34333k', 'k32k22k', 'k22k22k', 'k2k221k', 'k22211k', '.kkkkk.'],
  thread: ['..kkk..', '.k343k.', 'k32k23k', 'k2k.k2k', '.k1k1k.', '..k.k..', '.k...k.'],
  wishbone: ['k.....k', 'k3k.k3k', '.k3k3k.', '..k3k..', '..k2k..', '..k2k..', '..k1k..', '...k...'],
  rag: ['kkkkkk.', 'k3332k.', 'k32221k', 'k2221k.', '.k211k.', 'k1k1k1k', '.k.k.k.'],
  lump: ['..kkk..', '.k343k.', 'k33322k', 'k32221k', 'k22211k', '.k111k.', '..kkk..'],
  orb: ['..kkk..', '.k443k.', 'k34332k', 'k33222k', 'k32221k', '.k211k.', '..kkk..'],
  spore: ['.k.k.k.', 'k3k3k2k', '.k333k.', 'k32222k', '.k221k.', 'k1k1k1k', '.k.k.k.'],
  horseshoe: ['.kkkkk.', 'k33322k', 'k3k.k2k', 'k3k.k2k', 'k2k.k1k', 'k2k.k1k', 'kkk.kkk'],
  coin: ['..kkk..', '.k443k.', 'k3k3k2k', 'k3k3k2k', 'k3k3k2k', '.k221k.', '..kkk..'],
  feather: ['.....kk', '....k3k', '...k32k', '..k32k.', '.k22k..', 'k21k...', 'kk.....'],
  shard: ['.kk....', 'k43k...', 'k332kk.', 'k3222k.', '.k2221k', '..k11k.', '...kk..'],
  bow: ['kk...kk', 'k3k.k3k', 'k32k23k', 'k22k22k', 'k1kkk1k', 'kk.k.kk', '...k...'],
  ring: ['..kkk..', '.k343k.', 'k3k.k2k', 'k3k.k2k', 'k2k.k1k', '.k211k.', '..kkk..'],
  pouch: ['..kkk..', '.kk2kk.', '.k343k.', 'k33222k', 'k32221k', 'k22211k', '.kkkkk.'],
  candle: ['...k...', '..k4k..', '...k...', '.kkkkk.', '.k332k.', '.k322k.', '.k221k.', '.k211k.', '.kkkkk.'],
  battery: ['..kkk..', '.k333k.', '.k3k2k.', '.k343k.', '.k2k2k.', '.k221k.', '.k211k.', '.kkkkk.'],
  key: ['.kkk...', 'k343k..', 'k3k2kkk', 'k232222', '.kkk1k1', '....k.k'],
  bone: ['kk...kk', 'k3k.k3k', '.k3k3k.', '..k3k..', '.k2k2k.', 'k1k.k1k', 'kk...kk'],
  flame: ['...k...', '..k4k..', '.k343k.', '.k333k.', 'k32223k', 'k22212k', '.k111k.', '..kkk..'],
  cup: ['kkkkkkk', 'k44332k', 'k33222k', '.k222k.', '..k1k..', '..k1k..', '.kkkkk.'],
  bell: ['...k...', '..k3k..', '.k332k.', '.k322k.', 'k33221k', 'k32211k', 'kkkkkkk', '...k...'],
  pebble: ['..kkk..', '.k343k.', 'k33322k', 'k32221k', '.k211k.', '..kkk..'],
  foot: ['.kk.kk.', 'k3kk3k.', 'k33333k', '.k3222k', '.k2221k', '.k221k.', '..kkk..'],
  vial: ['..kkk..', '..k4k..', '..k3k..', '.k333k.', 'k32222k', 'k22221k', 'k22211k', '.kkkkk.'],
  keyhole: ['.kkkkk.', 'k33332k', 'k3kk22k', 'k3kk22k', 'k22k21k', 'k2kkk1k', '.kkkkk.'],
  fuse: ['....k.4', '...k.k.', '..kkk..', '.k333k.', 'k32222k', 'k22221k', '.k111k.', '..kkk..'],
  urn: ['.kkkkk.', '..k3k..', '.k332k.', 'k33222k', 'k32221k', '.k221k.', '..kkk..'],
  card: ['kkkkk.', 'k443k.', 'k3k3k.', 'k333k.', 'k3k3k.', 'k322k.', 'kkkkk.'],
  box: ['kkkkkkk', 'k44333k', 'k33222k', 'kkkkkkk', 'k32221k', 'k22211k', 'kkkkkkk'],
  heart: ['.kk.kk.', 'k34k32k', 'k33322k', 'k32221k', '.k221k.', '..k1k..', '...k...'],
  nest: ['.k.k.k.', 'k3k2k2k', '.k3k2k.', 'k32221k', 'k22211k', '.k111k.', '..kkk..'],
  fang: ['kkkkkkk', 'k33322k', '.k322k.', '.k32k..', '..k2k..', '..kk...'],
  horn: ['k......', 'k3k....', '.k3k...', '.k32kk.', '..k221k', '...k11k', '....kk.'],
  smear: ['.kk....', 'k33kk..', 'k3322k.', '.k2222k', '..k221k', '...kk1k', '.....k.'],
  glove: ['.k.k.k.', 'k3k3k3k', 'k3k3k3k', 'k32222k', 'k22221k', '.k221k.', '.kkkkk.'],
  can: ['.kkkkk.', 'k44333k', 'k33322k', 'k32222k', 'k32221k', 'k22211k', '.kkkkk.', '..k.k..'],
  shell: ['...k...', '..k3k..', '.k3k2k.', 'k3k2k2k', 'k2k2k1k', '.kkkkk.'],
  cork: ['.kkkkk.', 'k3k3k2k', 'k33322k', 'k3k2k1k', 'k32221k', '.kkkkk.'],
  map: ['kkkkkkk', 'k3k33kk', 'k33kk3k', 'kk33k3k', 'k3k33kk', 'kkkkkkk'],
  compass: ['..kkk..', '.k333k.', 'k33k32k', 'k3k4k2k', 'k23k22k', '.k221k.', '..kkk..'],
};

const iconCache = new Map();
function grid(rows, ramp, golden) {
  const r = golden ? R.gold : ramp;
  return buildSprite(rows, { k: '#0a0606', 1: r[1], 2: r[2], 3: r[4], 4: r[5] });
}

export function trinketIcon(t) {
  const key = `t:${t.id}:${!!t.golden}`;
  if (!iconCache.has(key)) {
    const d = TRINKETS[t.id];
    const [shape, ramp] = d?.icon || ['pebble', 'stone'];
    iconCache.set(key, scale2x(grid(SHAPES[shape] || SHAPES.pebble, RAMPS[ramp] || R.stone, t.golden)));
  }
  return iconCache.get(key);
}

// a capsule in its two colors
export function pillIcon(color, big) {
  const key = `p:${color}:${!!big}`;
  if (!iconCache.has(key)) {
    const [a, b] = PILL_COLORS[color % PILL_COLORS.length];
    // a capsule, half one color and half the other; a big pill is longer and fatter
    const w = big ? 12 : 10, half = (w - 2) / 2;
    const row = (l, r) => 'k' + l.repeat(half) + r.repeat(half) + 'k';
    const rows = ['.' + 'k'.repeat(w - 2) + '.', 'kw' + 'A'.repeat(half - 1) + 'B'.repeat(half) + 'k', row('A', 'B'), ...(big ? [row('A', 'B')] : []), row('a', 'b'), '.' + 'k'.repeat(w - 2) + '.'];
    const shade = (c) => '#' + c.slice(1).match(/../g).map((h) => Math.round(parseInt(h, 16) * 0.65).toString(16).padStart(2, '0')).join('');
    iconCache.set(key, scale2x(buildSprite(rows, { k: '#0a0606', A: a, B: b, a: shade(a), b: shade(b), w: '#ffffff' })));
  }
  return iconCache.get(key);
}

// the little pictures on tarot faces and runes
const GLYPHS = {
  candle: ['.4.', '.3.', '333', '333', '333'], moth: ['3.3', '333', '.3.', '3.3'], coin: ['.3.', '343', '333', '.3.'],
  crown: ['3.3.3', '33333', '33333'], lantern: ['.3.', '343', '343', '333'], shovel: ['..3', '.3.', '3..', '33.'],
  noose: ['333', '3.3', '333', '.3.', '.3.'], drop: ['.3.', '333', '343', '.3.'], tower: ['3.3', '333', '333', '333'],
  twins: ['4.4', '3.3', '3.3', '3.3'], flame: ['.4.', '343', '333'], wings: ['3...3', '33.33', '.333.'],
  cup: ['333', '333', '.3.', '333'], wheel: ['.3.', '343', '.3.'], heart: ['3.3', '333', '.3.'], grave: ['.3.', '333', '333', '333'],
  horns: ['3...3', '.3.3.', '.333.'], door: ['333', '3.3', '3.3', '333'], kiln: ['.3.', '333', '343', '333'],
  fire: ['.3.', '343', '333', '3.3'], chain: ['33.', '3.3', '.33', '3.3', '33.'], gate: ['333', '3.3', '3.3'],
  change: ['33.', '..3', '3..', '.33'], plenty: ['3.3', '...', '3.3'], deep: ['3.3', '.3.', '...', '.3.'], hunger: ['3.3.3', '.3.3.', '3.3.3'],
  wall: ['333', '3.3', '333'], ash: ['.3.', '333', '.3.'], swarm: ['3.3', '.3.', '3.3'], hollow: ['333', '3.3', '333'],
};
const SUITS = { coin: ['.3.', '333', '.3.'], key: ['33.', '3.3', '.3.', '.3.'], bomb: ['..3', '33.', '33.'], heart: ['3.3', '333', '.3.'], ash: ['.3.', '3.3', '.3.'], candle: ['.4.', '.3.', '.3.'], jester: ['3.3', '.3.', '3.3'], blank: ['...'] };
const SUIT_RAMP = { coin: R.gold, key: R.iron, bomb: R.void, heart: R.blood, ash: R.stone, candle: R.ember, jester: R.soul, blank: R.bone };

function stamp(rows, x, y, ramp) {
  const out = [];
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) if (rows[j][i] !== '.') out.push([x + i, y + j, rows[j][i] === '4' ? ramp[5] : ramp[3]]);
  return out;
}

function cardIcon(id) {
  const d = CARDS[id];
  const W = 9, H = 12;
  const rows = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 'k' : 'f')).join(''));
  const c = buildSprite(rows, { k: '#0a0606', f: d.kind === 'tarot' ? R.wax[4] : R.pale[5] });
  const ctx = c.getContext('2d');
  // tarot: a dark frame and a picture; playing: a suit sign and a corner mark
  if (d.kind === 'tarot') {
    ctx.fillStyle = R.soul[2]; ctx.fillRect(1, 1, W - 2, 1); ctx.fillRect(1, H - 2, W - 2, 1); ctx.fillRect(1, 1, 1, H - 2); ctx.fillRect(W - 2, 1, 1, H - 2);
    const g = GLYPHS[d.art] || GLYPHS.candle, gx = Math.floor((W - g[0].length) / 2), gy = Math.floor((H - g.length) / 2);
    for (const [x, y, col] of stamp(g, gx, gy, R.soul)) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
  } else {
    const s = SUITS[d.suit] || SUITS.blank, ramp = SUIT_RAMP[d.suit] || R.bone;
    for (const [x, y, col] of stamp(s, 3, 4, ramp)) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
    ctx.fillStyle = ramp[2]; ctx.fillRect(1, 1, 2, 2); ctx.fillRect(W - 3, H - 3, 2, 2);
  }
  return c;
}

function runeIcon(id) {
  const g = GLYPHS[RUNES[id]?.glyph] || GLYPHS.hollow;
  const rows = ['.kkkkkk.', 'k443332k', 'k432221k', 'k322221k', 'k322221k', 'k322211k', 'k221111k', '.kkkkkk.'];
  const c = buildSprite(rows, { k: '#0a0606', 1: R.stone[1], 2: R.stone[2], 3: R.stone[3], 4: R.stone[4] });
  const ctx = c.getContext('2d');
  for (const [x, y, col] of stamp(g, Math.floor((8 - g[0].length) / 2), Math.floor((8 - g.length) / 2), R.teal)) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
  return c;
}

// a smooth river stone in the character's colors, a little flame carved in it
const STONE_COLORS = {
  wick: R.wax, pip: R.gold, brick: R.blood, vesper: R.pale, cinder: R.void, pilfer: R.gold, wisp: R.pale, morrow: R.flesh,
  nib: R.ember, prism: R.teal, motley: R.soul, sexton: R.wood, spill: R.wax, kiln: R.ember, echo: R.ink, beacon: R.gold,
};
function stoneIcon(id) {
  const ramp = STONE_COLORS[id] || R.stone;
  const rows = ['...kkkk...', '.kk4433kk.', 'k44333322k', 'k43332221k', 'k33222211k', '.k2221111k', '..kkkkkkk.'];
  const c = buildSprite(rows, { k: '#0a0606', 1: ramp[1], 2: ramp[2], 3: ramp[3], 4: ramp[5] });
  const ctx = c.getContext('2d');
  // a little flame carved in it
  ctx.fillStyle = '#f08a24'; ctx.fillRect(4, 2, 2, 3);
  ctx.fillStyle = '#ffd25a'; ctx.fillRect(5, 1, 1, 2);
  ctx.fillStyle = '#fff3c0'; ctx.fillRect(4, 3, 1, 1);
  return c;
}

export function consumableIcon(c) {
  if (c.kind === 'pill') return pillIcon(c.color, c.big);
  const key = `${c.kind}:${c.id}`;
  if (!iconCache.has(key)) {
    const make = { card: cardIcon, rune: runeIcon, stone: stoneIcon }[c.kind];
    iconCache.set(key, make ? scale2x(make(c.id)) : scale2x(grid(SHAPES.pebble, R.stone)));
  }
  return iconCache.get(key);
}

export function batteryIcon(big) {
  const key = `b:${big}`;
  if (!iconCache.has(key)) iconCache.set(key, scale2x(grid(SHAPES.battery, big ? R.teal : R.rot)));
  return iconCache.get(key);
}

// for the unlock popup and DESIGN tools
export function contentIcon(type, id) {
  if (type === 'trinket') return trinketIcon({ id });
  if (type === 'pill') return pillIcon(Object.keys(PILLS).indexOf(id) % PILL_COLORS.length, false);
  if (CONSUMABLE_KINDS.has(type)) return consumableIcon({ kind: type, id });
  return null;
}

// character -> its stone (twisted characters share their base character's)
export const stoneFor = (charId) => (STONES[charId?.replace(/_t$/, '')] ? charId.replace(/_t$/, '') : null);
export { CHARACTERS };
