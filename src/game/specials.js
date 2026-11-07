// Special rooms beyond treasure/shop/boss/secret: what's inside each one, the things you can
// touch in them (props), challenge and boss waves, deals, red rooms and the rare error room.
// Room types, names, doors and layouts are data: src/data/specialRooms.js.
import { SPECIAL_TYPES, SPECIAL_ODDS, SACRIFICE_TABLE, DICE_FACES } from '../data/specialRooms.js';
import { ARCADE_MACHINES } from '../data/machines.js';
import { Machine } from './machines.js';
import { spikeAltar, dieFace, bed, chest, statue, hatch } from './propart.js';
import { BOSS_POOLS, BOSSES } from '../data/bosses.js';
import { ITEMS } from '../data/items.js';
import { Pedestal, itemDef, heldSources } from './items.js';
import { Shopkeeper } from './shop.js';
import { createBoss } from './bosses/index.js';
import { makeShadow } from '../engine/sprites.js';
import { drawText } from '../ui/text.js';
import { sfx } from '../engine/audio.js';
import { DIRS } from './constants.js';
import { progress } from './progress.js';
import { FLOORS } from '../data/floors.js';
import { CHESTS, CHEST_ROLL, CHEST_LUCK } from '../data/chests.js';
import { CONSUMABLE_DROP } from '../data/consumables.js';
import { Bomb } from './bombs.js';

const TAU = Math.PI * 2;
export const DEAL_COINS_PER_HEART = 15;

// ---------------------------------------------------------------------------
// Pools for 'P' pedestals by room type (rooms where several items mean "take one" get a group)
const P_POOL = {
  supersecret: 'secret', ultrasecret: ['secret', 'devil'], curse: 'curse', challenge: 'treasure',
  bosschallenge: 'boss', library: 'library', planetarium: 'planetarium', angel: 'angel',
  error: ['treasure', 'shop', 'boss', 'secret', 'devil', 'angel', 'library', 'planetarium'],
};
const CHOOSE_ONE = new Set(['library', 'planetarium', 'angel', 'error']);

// ---------------------------------------------------------------------------
// Small rewards (sacrifice payouts, chests, beggars...)
function pop(g, type, x, y, n = 1) { for (let i = 0; i < n; i++) g.spawnPickup(type, x, y); }

const REWARDS = {
  coins2: (g, x, y) => pop(g, 'coin', x, y, 2),
  coins3bomb: (g, x, y) => { pop(g, 'coin', x, y, 3); pop(g, 'bomb', x, y); },
  key: (g, x, y) => pop(g, 'key', x, y),
  ash: (g, x, y) => pop(g, 'ash', x, y),
  brass: (g, x, y) => pop(g, 'brass', x, y),
  chest: (g, x, y) => { const s = g.room.findFreeSpot(x, y + 26); addProp(g.room, new Chest(s.x, s.y, { type: 'wood' })); },
  // a free item of The Vigil, unless you've made a deal with the other side
  angelItem: (g, x, y) => {
    if (g.devilTaken) { pop(g, 'soot', x, y); return; }
    const s = g.room.findFreeSpot(x, y + 30);
    g.room.pedestals.push(new Pedestal(s.x, s.y, g.itemPools.draw('angel')));
  },
  devilItem: (g, x, y) => { const s = g.room.findFreeSpot(x, y + 30); g.room.pedestals.push(new Pedestal(s.x, s.y, g.itemPools.draw('devil'))); },
  // something wakes up: the variant's miniboss
  lair: (g, x, y) => {
    const mb = g.variant.minibosses?.[0];
    if (!mb) { pop(g, 'soot', x, y); return; }
    const spot = g.room.findFreeSpot(g.room.centerX, g.room.y0 + 40);
    g.spawnEnemy(mb, spot.x, spot.y, { delay: 0.8 });
    g.room.cleared = false;
    for (const d of Object.values(g.cell.doors)) d.closed = true;
    sfx('bossRoar');
  },
};

// A random kind of chest (CHEST_ROLL): room-clear drops and THE GRAVE card.
export function rollChest(g) { return g.lootRng.weighted(CHEST_ROLL).type; }

// A random pickup for chests, beggars and dice.
export function randomPickup(g) {
  return g.lootRng.weighted([
    { id: 'coin', weight: 5 }, { id: 'silver', weight: 0.6 }, { id: 'heart', weight: 2 }, { id: 'heartHalf', weight: 2 },
    { id: 'bomb', weight: 2 }, { id: 'key', weight: 2 }, { id: 'ash', weight: 1 }, { id: 'soot', weight: 0.3 },
  ]).id;
}

// ---------------------------------------------------------------------------
// Props: things in special rooms you can touch. Each has kind, x, y, state (saved as is),
// update(dt, g), render / renderShadow, and optionally blast(g) for bombs.
const SHADOW = makeShadow(22, 7, 0.45);
const touching = (g, o, r) => !g.player.dead && Math.hypot(g.player.x - o.x, g.player.y - o.y) < r + g.player.r;

class Prop {
  constructor(kind, x, y, state = {}) { Object.assign(this, { kind, x, y, state, t: Math.random() * 5, cd: 0.6 }); }
  update(dt) { this.t += dt; this.cd = Math.max(0, this.cd - dt); }
  renderShadow(ctx, ox, oy) { ctx.drawImage(SHADOW, Math.round(this.x - 11 + ox), Math.round(this.y + 2 + oy)); }
  save() { return { kind: this.kind, x: this.x, y: this.y, state: this.state }; }
}

// The Offering Room: a big spike. Bleed on it; every few bleeds it pays out (SACRIFICE_TABLE).
export class SacrificeSpike extends Prop {
  constructor(x, y, state = { n: 0 }) { super('spike', x, y, state); }
  update(dt, g) {
    super.update(dt);
    const p = g.player;
    if (this.cd > 0 || !touching(g, this, 7)) return;
    if (!p.hurt(1, 'THE OFFERING', g, this.x, this.y - 10, true)) return;
    this.cd = 0.6;
    this.state.n++;
    const row = SACRIFICE_TABLE[Math.min(this.state.n, SACRIFICE_TABLE.length - 1)];
    g.particles.burst(this.x, this.y - 10, 10, { colors: ['#c0262c', '#6a1216'], speed: 60, z: 10, vz: 50 });
    if (row && g.lootRng.chance(row.chance)) {
      sfx('secret');
      REWARDS[row.give](g, this.x, this.y);
    }
  }
  render(ctx, ox, oy) {
    // a stone altar with a tall iron spike that gets bloodier the more you give it
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy), img = spikeAltar(Math.min(5, this.state.n));
    ctx.drawImage(img, x - 17, y - img.height + 8);
    if (this.state.n) drawText(ctx, String(this.state.n), x, y + 9, { align: 'center', color: '#ff6a5a' });
  }
}

// The Gambler's Den: a die face set into the floor. Step on it once.
export class DiceFace extends Prop {
  constructor(x, y, state = { face: 1, used: false }) { super('die', x, y, state); }
  update(dt, g) {
    super.update(dt);
    if (this.state.used || !touching(g, this, 12)) return;
    this.state.used = true;
    sfx('reroll');
    g.shake(4);
    g.banner = { text: DICE_FACES[this.state.face].name, sub: DICE_FACES[this.state.face].desc, t: 0, dur: 2.4 };
    rollDice(g, this.state.face, this);
  }
  renderShadow() {}
  render(ctx, ox, oy) {
    // a big die face carved into the floor; its pips glow red until it's used
    const img = dieFace(this.state.face, !!this.state.used);
    ctx.drawImage(img, Math.round(this.x - img.width / 2 + ox), Math.round(this.y - img.height / 2 + oy));
  }
}

function rollDice(g, face, die) {
  const p = g.player;
  const rerollItems = () => {
    p.items = p.items.map((id) => (ITEMS[id]?.starter ? id : g.itemPools.draw(g.lootRng.pick(['treasure', 'treasure', 'boss', 'shop', 'secret']))));
    p.recompute();
    g.syncFollowers();
  };
  if (face === 1) rerollItems();
  else if (face === 2) {
    for (const it of g.pickups) if (!it.price && !it.collected) it.setType(randomPickup(g));
  } else if (face === 3) for (let i = 0; i < 4; i++) g.spawnPickup(randomPickup(g), die.x, die.y);
  else if (face === 4) {
    rerollItems();
    const stat = g.lootRng.pick(['damage', 'fireRate', 'speed', 'range', 'luck']);
    p.charStats = { ...p.charStats, [stat]: (p.charStats?.[stat] || 0) + (stat === 'speed' ? 0.1 : stat === 'luck' ? 1 : 0.4) };
    p.recompute();
  } else if (face === 5) {
    // the whole floor rearranges itself (same floor, new rooms)
    g.forcedVariants[g.floorNum] = g.variant.id;
    g.rebuildFloor = true;
  } else if (face === 6) { const s = g.room.findFreeSpot(die.x, die.y - 36); g.room.pedestals.push(new Pedestal(s.x, s.y, g.itemPools.draw('treasure'))); }
}

// The Nursery / The Sickroom: a bed you can lie down in once.
export class Bed extends Prop {
  constructor(x, y, state = { dirty: false, used: false }) { super('bed', x, y, state); }
  update(dt, g) {
    super.update(dt);
    if (this.state.used || !touching(g, this, 14)) return;
    const h = g.player.health;
    this.state.used = true;
    g.flashT = 0.6;
    sfx('heart');
    if (this.state.dirty) {
      // a sick bed: ash, and something crawls out of the sheets
      h.addSoul(4, 'soul');
      for (let i = 0; i < 2; i++) { const e = g.spawnEnemy('crawlspider', this.x + (i ? 16 : -16), this.y + 10, { delay: 0.4, safe: true }); e.minion = true; }
      g.room.cleared = false;
      g.banner = { text: 'A FITFUL SLEEP', sub: 'SOMETHING WAS IN THE SHEETS', t: 0, dur: 2.4 };
    } else {
      if (h.red >= h.containers * 2) h.addEternal();
      h.healRed(99);
      g.banner = { text: 'A GOOD REST', sub: 'YOU WAKE UP WHOLE', t: 0, dur: 2.4 };
    }
  }
  render(ctx, ox, oy) {
    // a carved bed: clean sheets in the nursery, stained ones in the sickroom
    const img = bed(!!this.state.dirty, !!this.state.used);
    ctx.drawImage(img, Math.round(this.x - img.width / 2 + ox), Math.round(this.y - img.height + 6 + oy));
  }
}

// A chest (types and contents: src/data/chests.js). Touch it to open; a golden, eternal or mega
// one takes a key, a stone one only opens to a bomb, a spiked one bites. Old saves have
// { locked } instead of a type: locked ones are golden.
export class Chest extends Prop {
  constructor(x, y, state = { type: 'wood', open: false }) {
    super('chest', x, y, state);
    if (!state.type) state.type = state.locked ? 'gold' : 'wood';
    this.popT = 0;
  }
  get def() { return CHESTS[this.state.type] || CHESTS.wood; }
  update(dt, g) {
    super.update(dt);
    this.popT = Math.max(0, this.popT - dt);
    const p = g.player, s = this.state, d = this.def;
    // an eternal chest that shut itself again
    if (s.closeT) { s.closeT -= dt; if (s.closeT <= 0) { s.closeT = 0; s.open = false; this.popT = 0.2; sfx('doorClose'); } return; }
    if (s.open || this.cd > 0 || !touching(g, this, 9)) return;
    this.cd = 0.4;
    if (d.needs === 'bomb') return;
    if (d.needs === 'key') {
      if (p.keys < 1) return;
      p.keys--;
      sfx('unlock');
    }
    if (d.hurts) p.hurt(1, 'A SPIKED CHEST', g, this.x, this.y);
    this.open(g);
  }
  blast(g) { if (!this.state.open && this.def.needs === 'bomb') this.open(g); }
  open(g) {
    const s = this.state, d = this.def, r = g.lootRng, p = g.player;
    s.open = true;
    this.popT = 0.35;
    sfx('secret');
    progress.event('chestOpened');
    g.particles.burst(this.x, this.y - 8, 10, { colors: ['#fff3c0', '#d8b048'], speed: 50, z: 8, vz: 50 });
    // luck: an item outcome gets likelier, and +1 pickup every 3 luck
    const luck = Math.max(0, p.stats.luck);
    const o = r.weighted(d.contents.map((c) => ({ c, weight: c.weight * (c.item ? 1 + luck * CHEST_LUCK : 1) }))).c;
    const at = (dx = 0) => g.room.findFreeSpot(this.x + dx, this.y + 28);
    if (o.item) {
      const ped = (pool, dx) => { const q = at(dx); g.room.pedestals.push(new Pedestal(q.x, q.y, g.itemPools.draw(pool))); };
      if (o.item2) { ped(o.item, -16); ped(o.item2, 16); } else ped(o.item, 0);
    }
    const n = o.pickups ? r.int(o.pickups[0], o.pickups[1]) + Math.min(2, Math.floor(luck / 3)) : 0;
    for (let i = 0; i < n; i++) g.spawnPickup(randomPickup(g), this.x, this.y + 4);
    for (let i = 0; i < (o.cons || 0); i++) g.spawnPickup(o.consKind || r.weighted(CONSUMABLE_DROP).kind, this.x, this.y + 4);
    for (let i = 0; i < (o.trinket || 0); i++) g.spawnPickup('trinket', this.x, this.y + 4);
    for (let i = 0; i < (o.soot || 0); i++) g.spawnPickup('soot', this.x, this.y + 4);
    for (let i = 0; i < (o.litBombs || 0); i++) {
      const a = (i / o.litBombs) * TAU, b = new Bomb(this.x + Math.cos(a) * 10, this.y + 6 + Math.sin(a) * 6);
      b.fuse *= 0.9 + i * 0.15;
      g.bombs.push(b);
    }
    if (o.enemies) {
      const [type, k] = o.enemies;
      for (let i = 0; i < k; i++) g.spawnEnemy(type, this.x + r.int(-10, 10), this.y + 10, { safe: true });
      sfx('hiss');
    }
    if (o.deal && !openDealRoom(g)) g.spawnPickup('soot', this.x, this.y + 4);
    // an eternal chest may shut again, ready for another key (three times at most)
    if (d.reclose && (s.closes || 0) < 3 && r.chance(d.reclose)) { s.closes = (s.closes || 0) + 1; s.closeT = 1.4; }
  }
  render(ctx, ox, oy) {
    const s = this.state, img = chest(s.type, !!s.open);
    const bump = this.popT > 0 ? -Math.round(Math.sin((this.popT / 0.35) * Math.PI) * 3) : 0;
    if (img) { ctx.drawImage(img, Math.round(this.x - img.width / 2 + ox), Math.round(this.y - img.height + 8 + oy) + bump); return; }
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    ctx.fillStyle = '#160f0c'; ctx.fillRect(x - 10, y - 13, 20, 17);
    ctx.fillStyle = s.type === 'gold' ? '#d8b048' : '#6a4628'; ctx.fillRect(x - 9, y - 12, 18, 15);
  }
}

// A statue: in The Bargain a black wax figure covered in eyes; in The Vigil a pale figure with too
// many wings. Bomb the pale one and it wakes up (and drops a key half when beaten).
export class Statue extends Prop {
  constructor(x, y, state = { type: 'devil', woke: false }) { super('statue', x, y, state); }
  blast(g) {
    if (this.state.type !== 'angel' || this.state.woke) return;
    this.state.woke = true;
    const has1 = g.player.items.includes('keyhalf1') || g.bosses.some((o) => o.id === 'sentinel1') || g.room.pedestals.some((pd) => pd.item === 'keyhalf1');
    const id = has1 ? 'sentinel2' : 'sentinel1';
    const b = createBoss(id, this.x, this.y + 6, { hpMul: Math.max(1, (g.floorDef.bossHp || 1) * 0.7), tier: g.floorDef.bossTier || 0 });
    b.onDefeat = (gg, boss) => {
      const reward = gg.player.items.includes(boss.def.drops) ? gg.itemPools.draw('angel') : boss.def.drops;
      const s = gg.room.findFreeSpot(boss.x, boss.y);
      gg.room.pedestals.push(new Pedestal(s.x, s.y, reward));
      if (gg.bosses.length) return;   // the other statue is still fighting
      gg.room.cleared = true;
      for (const d of Object.values(gg.cell.doors)) d.closed = false;
      sfx('doorOpen');
    };
    if (g.room.boss) (g.room.extraBosses ??= []).push(b); else g.room.boss = b;
    g.room.cleared = false;
    for (const d of Object.values(g.cell.doors)) d.closed = true;
    g.bossIntro = { t: 0, dur: 2.2 };
    sfx('bossRoar');
  }
  render(ctx, ox, oy) {
    if (this.state.woke) return;
    // a black wax idol (The Bargain) or a winged sentinel (The Vigil); the devil's eyes glint
    const img = statue(this.state.type);
    if (!img) return;
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    ctx.drawImage(img, x - Math.floor(img.width / 2), y - img.height + 6);
    if (this.state.type === 'devil' && Math.floor(this.t * 1.3) % 5 === 0) { ctx.fillStyle = '#ff3a2a'; ctx.fillRect(x - 3, y - 25, 1, 1); ctx.fillRect(x + 2, y - 25, 1, 1); }
  }
}

// A ladder hatch: down into a crawlspace (or back up out of the black market).
export class Hatch extends Prop {
  constructor(x, y, state = { to: 'crawl' }) { super('hatch', x, y, state); }
  update(dt, g) {
    super.update(dt);
    if (this.cd > 0 || !touching(g, this, 6)) return;
    this.cd = 1;
    if (this.state.to === 'crawl') g.enterCrawlspace(this);
    else g.leaveBlackMarket();
  }
  renderShadow() {}
  render(ctx, ox, oy) {
    const img = hatch();
    ctx.drawImage(img, Math.round(this.x - img.width / 2 + ox), Math.round(this.y - img.height / 2 + oy));
  }
}

const PROP_CLASSES = { spike: SacrificeSpike, die: DiceFace, bed: Bed, machine: Machine, chest: Chest, statue: Statue, hatch: Hatch };
export function loadProp(s) { const C = PROP_CLASSES[s.kind]; return C ? new C(s.x, s.y, s.state) : null; }
export function addProp(room, prop) { (room.props ??= []).push(prop); return prop; }

// ---------------------------------------------------------------------------
// Filling a special room the first time you walk in.
export function populateSpecialRoom(g, cell) {
  const room = g.room, type = cell.type, r = g.lootRng;
  room.props ??= [];
  const pool = () => {
    const p = P_POOL[type];
    return Array.isArray(p) ? r.pick(p) : p || 'treasure';
  };
  const group = CHOOSE_ONE.has(type) ? `${type}:${cell.key}` : null;
  const at = (ch) => room.spawns.filter((s) => s.ch === ch).sort((a, b) => a.x - b.x);

  // item pedestals (a super secret room sometimes has pickups instead)
  const ps = at('P');
  const items = type === 'supersecret' && r.chance(0.5) ? [] : ps;
  for (const s of items) room.pedestals.push(new Pedestal(s.x, s.y, g.itemPools.draw(pool()), { group, deal: type === 'angel' ? 'angel' : null }));
  for (const s of at('G')) for (let i = 0; i < (type === 'supersecret' && !items.length ? 3 : 1); i++) g.spawnPickup(type === 'supersecret' ? r.pick(['heart', 'soot', 'ash', 'silver']) : randomPickup(g), s.x, s.y, false);

  // deal items with a price (The Bargain) and the black market (paid in hearts too)
  for (const s of at('Q')) {
    const id = g.itemPools.draw(type === 'devil' ? 'devil' : r.pick(['treasure', 'shop', 'boss']));
    room.pedestals.push(new Pedestal(s.x, s.y, id, { cost: dealCost(g, id), bare: type === 'blackmarket', deal: type === 'devil' ? 'devil' : null }));
  }
  for (const s of at('K')) room.keeper = new Shopkeeper(s.x, s.y);
  for (const s of at('Y')) addProp(room, new SacrificeSpike(s.x, s.y));
  for (const s of at('D')) addProp(room, new DiceFace(s.x, s.y, { face: r.int(1, 6), used: false }));
  for (const s of at('N')) addProp(room, new Bed(s.x, s.y, { dirty: type === 'sickroom', used: false }));
  // the parlor: four machines (and maybe a beggar), shuffled from the arcade list, no three alike
  const kinds = r.shuffle([...ARCADE_MACHINES]);
  at('M').forEach((s, i) => { const m = addProp(room, new Machine(s.x, s.y + 6, { type: kinds[i % kinds.length] })); m.setup(g); });
  // C: a chest (red in the curse room, now and then something better elsewhere); L: a golden one
  for (const s of at('C')) addProp(room, new Chest(s.x, s.y, { type: type === 'curse' ? 'red' : r.chance(0.15) ? rollChest(g) : 'wood', open: false }));
  for (const s of at('L')) addProp(room, new Chest(s.x, s.y, { type: 'gold', open: false }));
  for (const s of at('R')) addProp(room, new Statue(s.x, s.y, { type: type === 'angel' ? 'angel' : 'devil', woke: false }));
  if (type === 'blackmarket') addProp(room, new Hatch(room.centerX, room.B - 22, { to: 'up' }));

  // the curse room: half the time chests instead of an item
  if (type === 'curse' && r.chance(0.4)) {
    const ped = room.pedestals.pop();
    if (ped) { g.itemPools.taken.delete(ped.item); for (const dx of [-20, 20]) { const s = room.findFreeSpot(ped.x + dx, ped.y); addProp(room, new Chest(s.x, s.y, { type: 'red', open: false })); } }
  }
  // the lair: the variant's miniboss waits here
  for (const s of at('m')) {
    const mb = g.variant.minibosses?.length ? r.pick(g.variant.minibosses) : null;
    if (!mb) continue;
    g.spawnEnemy(mb, s.x, s.y, { delay: 0.6 });
    room.cleared = false;
    room.lairReward = true;
  }
  // challenge rooms: taking the item starts the waves
  if (type === 'challenge' || type === 'bosschallenge') room.ambush = type;
  // boss rush: the waves start as soon as you walk in
  if (type === 'bossrush') {
    room.waitWaves = 'bossrush';
    room.cleared = false;
  }
  if (type === 'planetarium') g.runFlags.planetVisited = true;
}

// ---------------------------------------------------------------------------
// Waves: challenge rooms (enemies), boss challenge rooms and boss rush (bosses).
export function startWaves(g, kind) {
  const room = g.room;
  room.waves = { kind, idx: -1, delay: 0.9, list: buildWaves(g, kind) };
  room.cleared = false;
  room.ambush = null;
  room.waitWaves = null;
  for (const d of Object.values(g.cell.doors)) { d.closed = true; d.anim = 1; }
  sfx('doorClose');
  g.banner = { text: kind === 'bossrush' ? 'THE PROCESSION BEGINS' : 'AMBUSH!', sub: kind === 'bossrush' ? `${room.waves.list.length} WAVES` : '', t: 0, dur: 2 };
}

function buildWaves(g, kind) {
  const r = g.lootRng, fd = g.floorDef;
  if (kind === 'challenge') {
    const n = 3;
    return Array.from({ length: n }, (_, i) => {
      const grp = r.weighted(g.variant.groups);
      const types = [...(grp.e || []), ...(grp.f || [])].map(([t]) => t);
      return { enemies: Array.from({ length: 3 + Math.floor(g.floorNum / 2) + (i === n - 1 ? 1 : 0) }, () => r.pick(types)) };
    });
  }
  const pool = (ch) => (BOSS_POOLS[ch] || []).filter((b) => !BOSSES[b].giant && !BOSSES[b].variants);
  if (kind === 'bosschallenge') {
    const ch = Math.max(1, (fd.chapter || 1) - 1);
    const list = r.shuffle([...pool(ch)]);
    return [{ bosses: [list[0]], hp: 0.6 }, { bosses: [list[1]], hp: 0.6 }];
  }
  // boss rush: six waves of two, from all the early chapters
  const all = r.shuffle([...pool(1), ...pool(2), ...pool(3)]);
  return Array.from({ length: 6 }, (_, i) => ({ bosses: [all[i * 2 % all.length], all[(i * 2 + 1) % all.length]], hp: 0.45 }));
}

function spawnWave(g, w) {
  const room = g.room, p = g.player;
  if (w.enemies) {
    for (const t of w.enemies) {
      let spot = null;
      for (let i = 0; i < 10 && !spot; i++) {
        const s = room.randomFreeSpot(g.lootRng, 1);
        if (Math.hypot(s.x - p.x, s.y - p.y) > 70) spot = s;
      }
      spot ??= room.findFreeSpot(room.centerX, room.y0 + 30);
      g.spawnEnemy(t, spot.x, spot.y, { delay: 0.6 });
    }
    return;
  }
  const fd = g.floorDef;
  w.bosses.forEach((id, i) => {
    const x = room.centerX + (w.bosses.length > 1 ? (i ? 70 : -70) : 0), y = room.y0 + 50;
    const b = createBoss(id, x, y, { hpMul: Math.max(0.5, (fd.bossHp || 1) * w.hp), tier: fd.bossTier || 0 });
    b.state = 'idle';
    b.cooldown = 1.2 + i * 0.4;
    b.onDefeat = () => {};
    if (!room.boss) room.boss = b; else (room.extraBosses ??= []).push(b);
    g.particles.burst(x, y, 20, { colors: ['#f0c040', '#ffd25a', '#3a2a10'], speed: 80, z: 10, vz: 60 });
  });
  sfx('bossRoar');
}

export function updateWaves(g, dt) {
  const room = g.room;
  if (room.waitWaves && !g.transition) startWaves(g, room.waitWaves);
  const w = room.waves;
  if (!w) return;
  if (g.enemies.length || g.bosses.length) return;
  w.delay -= dt;
  if (w.delay > 0) return;
  w.idx++;
  if (w.idx >= w.list.length) {
    room.waves = null;
    finishWaves(g, w.kind);
    return;
  }
  spawnWave(g, w.list[w.idx]);
  w.delay = 1.2;
  if (w.idx > 0) g.banner = { text: `WAVE ${w.idx + 1}`, sub: '', t: 0, dur: 1.2 };
}

function finishWaves(g, kind) {
  const room = g.room;
  if (kind === 'bossrush') {
    for (const dx of [-30, 30]) { const s = room.findFreeSpot(room.centerX + dx, room.centerY); room.pedestals.push(new Pedestal(s.x, s.y, g.itemPools.draw('boss'))); }
    progress.event('bossRush');
    g.banner = { text: 'THE PROCESSION ENDS', sub: '', t: 0, dur: 2.5 };
  } else if (kind === 'bosschallenge') {
    g.spawnPickup('heart', room.centerX, room.centerY);
  }
  sfx('roomClear');
}

// ---------------------------------------------------------------------------
// Deals. Prices: an item of quality 3+ costs two heart containers, others one. Without
// containers you pay three Ash Hearts. Some characters pay differently (dealPay).
export function dealCost(g, id) {
  const p = g.player, n = itemDef(id).quality >= 3 ? 2 : 1;
  if (p.health.oneHit) return null;                                   // nothing to give: free
  if (p.charDef?.dealPay === 'coins') return { coins: n * DEAL_COINS_PER_HEART };
  if (p.health.containers === 0) return { soul: 6 };
  return { hearts: n };
}

// Can the player pay this price? (Never with the last of their health.)
export function canPay(g, cost) {
  if (!cost) return true;
  const p = g.player, h = p.health;
  if (cost.coins) return p.coins >= cost.coins;
  if (cost.soul) return h.soulTotal >= cost.soul;
  return h.containers > cost.hearts || (h.containers === cost.hearts && h.extra.length > 0);
}

export function pay(g, cost) {
  if (!cost) return;
  const p = g.player, h = p.health;
  if (cost.coins) { p.coins -= cost.coins; return; }
  if (cost.soul) {
    let left = cost.soul;
    for (let i = h.extra.length - 1; i >= 0 && left > 0; i--) {
      const e = h.extra[i];
      if (e.t === 'bone') continue;
      const take = Math.min(e.v, left);
      e.v -= take; left -= take;
      if (e.v <= 0) h.extra.splice(i, 1);
    }
    return;
  }
  h.addContainers(-cost.hearts);
  g.flashT = 0.3;
}

// The chance of a deal door after this floor's boss.
export function dealChance(g) {
  if (g.floorNum <= 1 || g.floorDef.final) return 0;
  let c = 0.2;
  if (!g.floorRedHit) c += 0.35;           // no red heart lost on the whole floor
  if (!g.bossRedHit) c += 0.15;            // ...and especially not to the boss
  for (const { d } of heldSources(g.player)) c += d.dealChance || 0;   // items and trinkets
  if (g.runFlags.dealLastFloor) c *= 0.5;  // a deal on the floor before makes one less likely
  return Math.min(1, c);
}

// Right after the floor's boss: maybe a door to The Bargain or The Vigil opens in the wall.
// The odds right now that this floor's boss opens The Bargain / The Vigil (the stats sidebar
// shows them). The Vigil is only possible if you've never made a bargain and have passed one up;
// then it's a coin flip which of the two comes.
export function dealOdds(g) {
  const chance = dealChance(g);
  const vigil = !g.devilTaken && g.runFlags.devilPassed;
  return { devil: vigil ? chance / 2 : chance, angel: vigil ? chance / 2 : 0 };
}

export function maybeOpenDeal(g) {
  const chance = dealChance(g);
  const roll = g.rng.fork('deal:' + g.floorNum).next();
  g.runFlags.dealLastFloor = false;
  if (roll >= chance) return;
  // The Vigil only if you've never made a bargain, and only after passing one up (see dealOdds)
  const angel = !g.devilTaken && g.runFlags.devilPassed && g.rng.fork('dealtype:' + g.floorNum).chance(0.5);
  const c = openSideRoom(g, angel ? 'angel' : 'devil');
  if (!c) return;
  g.runFlags.dealLastFloor = true;
  g.banner = { text: angel ? 'A PALE DOOR OPENS' : 'A DARK DOOR OPENS', sub: angel ? 'SOMETHING IS WATCHING OVER YOU' : 'SOMETHING WANTS TO MAKE A DEAL', t: 0, dur: 3 };
}

// A new room behind one of the current room's empty walls (deal rooms, boss rush).
export function openSideRoom(g, type) {
  const cell = g.cell, floor = g.floor;
  for (const s of g.room.slots) {
    if (cell.links[s.key]) continue;
    const x = cell.x + s.ux + DIRS[s.dir][0], y = cell.y + s.uy + DIRS[s.dir][1];
    if (!floor.free(x, y)) continue;
    const c = floor.addCell(type, x, y, [cell]);
    if (!c) continue;
    const door = cell.doors[s.key];
    if (door) { door.anim = 0; door.closed = false; }
    sfx('secret');
    g.shake(4);
    floor.visit(cell);
    return c;
  }
  return null;
}

// THE JESTER card and the red chest's jackpot: a deal room right behind a wall (this room's, or
// the nearest room with a free wall), and you're taken straight in. Its door leads back out.
export function openDealRoom(g) {
  const angel = !g.devilTaken && g.runFlags.devilPassed && g.lootRng.chance(0.5);
  const type = angel ? 'angel' : 'devil';
  const here = g.cell, floor = g.floor;
  const order = [here, ...[...floor.cells.values()].filter((c) => c !== here && !c.offGrid && c.visited).sort((a, b) => a.dist - b.dist)];
  for (const cell of order) {
    for (const s of floor.roomFor(cell).slots) {
      if (cell.links[s.key]) continue;
      const x = cell.x + s.ux + DIRS[s.dir][0], y = cell.y + s.uy + DIRS[s.dir][1];
      if (!floor.free(x, y)) continue;
      const c = floor.addCell(type, x, y, [cell]);
      if (!c) continue;
      g.banner = { text: 'SOMETHING CALLS YOU', sub: '', t: 0, dur: 1.8 };
      g.teleportTo(c);
      return true;
    }
  }
  return false;
}

// The Crimson Key: a red room appears behind the wall closest to you (and if it touches the
// hidden ultra secret room, that one opens too).
export function useRedKey(g) {
  const cell = g.cell, floor = g.floor, p = g.player;
  if (cell.offGrid) return false;
  const free = g.room.slots
    .filter((s) => !cell.links[s.key] && floor.free(cell.x + s.ux + DIRS[s.dir][0], cell.y + s.uy + DIRS[s.dir][1]))
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  if (!free.length) return false;
  const s = free[0];
  const x = cell.x + s.ux + DIRS[s.dir][0], y = cell.y + s.uy + DIRS[s.dir][1];
  const red = floor.addCell('red', x, y, 'all');
  if (!red) return false;
  for (const d of Object.values(red.doors)) { d.closed = false; d.snap(); }
  if (floor.ultra && Math.abs(floor.ultra[0] - x) + Math.abs(floor.ultra[1] - y) === 1) {
    floor.addCell('ultrasecret', floor.ultra[0], floor.ultra[1], [red]);
    floor.ultra = null;
  }
  floor.visit(cell);
  sfx('secret');
  g.shake(4);
  g.particles.burst(s.x, s.y, 20, { colors: ['#c0262c', '#6a1216', '#ff6a5a'], speed: 80, z: 8, vz: 80 });
  return true;
}

// ---------------------------------------------------------------------------
// Which special rooms a floor gets, in the order they take the dead ends (farthest first, after
// the boss and super secret rooms, which the generator always places). A room that fails its
// roll simply isn't in the list, so the next one takes its dead end. What doesn't fit in the
// dead ends doesn't appear. The chances live in src/data/specialRooms.js (SPECIAL_ODDS).
export function chooseSpecials(g, n, def, { labyrinth = false } = {}) {
  if (def.specials) return [...def.specials];          // a floor with a fixed set (the finale)
  const r = g.rng.fork('specials:' + n);
  const O = SPECIAL_ODDS;
  const p = g.player, h = p.health;
  const full = h.red >= h.containers * 2;
  const low = h.total <= 2;
  const early = def.chapter <= 3;
  const second = FLOORS[n - 2]?.chapter === def.chapter;     // the chapter's second floor
  const ok = (id) => {
    const s = SPECIAL_TYPES[id];
    if (!s) return !!id;
    if (s.minFloor && n < s.minFloor) return false;
    if (s.maxFloor && n > s.maxFloor) return false;
    return progress.isUnlocked('room', id);
  };
  const out = [];
  const add = (id) => { if (ok(id)) out.push(id); };
  // the shop and the treasure room: always in chapters 1-3
  if (early || r.chance(O.lateShop)) add('shop');
  if (early || r.chance(O.lateTreasure)) { add('treasure'); if (labyrinth) add('treasure'); }
  // the planetarium: rare, likelier for every treasure room you've skipped
  if (early && r.chance(g.runFlags.planetVisited ? O.planetarium : Math.min(O.planetariumMax, O.planetarium + O.planetariumSkip * (g.runFlags.treasureSkipped || 0)))) add('planetarium');
  // the offering room or the gambler's den
  if (r.chance(O.sacrifice + (full ? O.sacrificeFull : 0))) add(p.keys >= 2 && r.chance(O.diceWithKeys) ? 'dice' : r.chance(O.dice) ? 'dice' : 'sacrifice');
  if (r.chance(O.library)) add('library');
  if (r.chance(O.curse)) add('curse');
  if (r.chance(O.miniboss + (n === 1 ? O.minibossFirst : 0))) add('miniboss');
  // the gauntlet: only at full health, never on the first floor; the great one on a chapter's second floor
  if (full && n > 1 && r.chance(O.challenge)) add(second ? 'bosschallenge' : 'challenge');
  // the parlor or the strongroom: a chapter's second floor, with 5+ coins
  if (second && p.coins >= 5 && r.chance(O.arcade)) add(r.chance(p.keys >= 2 ? O.vaultWithKeys : O.vault) ? 'vault' : 'arcade');
  // a bedroom: rare, likelier when you're nearly out
  if (early && r.chance(O.bedroom + (low ? O.bedroomLow : 0))) add(r.chance(0.5) ? 'nursery' : 'sickroom');
  return out;
}

// ---------------------------------------------------------------------------
// The error room: very rarely, walking out of a room takes you somewhere that shouldn't exist.
export function maybeErrorRoom(g, fromCell, toCell) {
  if (g.floorNum < 2 || g.runFlags.errorFloor === g.floorNum) return null;
  if (fromCell.type !== 'normal' || toCell.type !== 'normal') return null;
  if (!g.lootRng.chance(0.006)) return null;
  g.runFlags.errorFloor = g.floorNum;
  return g.floor.addCell('error', null, null);
}
