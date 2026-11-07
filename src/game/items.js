// Item engine: turns the data in src/data/items.js into stats, shot behavior, looks and helpers.
import { ITEMS, DEFAULT_PRICE, FALLBACK_ITEM, SHOT_STYLE_PRIORITY, QUALITY_WEIGHT, ACTIVE_TEXT, STATUS, POOLS, greedPool } from '../data/items.js';
import { STAT_LABELS } from './stats.js';
import { ITEM_ICONS, ITEM_COLORS } from '../data/itemSprites.js';
import { BASE_STATS, clampStats, tearDelay } from './stats.js';
import { TUNING } from '../data/tuning.js';
import { buildSprite, makeShadow, makeGlow, makeCanvas, scale2x } from '../engine/sprites.js';
import { drawText } from '../ui/text.js';
import { LOOKS } from '../data/characterSprites.js';
import { TRINKETS } from '../data/trinkets.js';
import { FORM_PRIORITY, WEAPON_TEXT } from './weapons.js';
import { TRANSFORMATIONS, TRANSFORM_NEED } from '../data/transformations.js';

export function itemDef(id) {
  return ITEMS[id];
}

// Item icons are drawn small in data and enlarged with Scale2x for display.
const smallCache = new Map();
const iconCache = new Map();
export function itemIconSmall(id) {
  let c = smallCache.get(id);
  if (!c) {
    c = buildSprite(ITEM_ICONS[id] || ITEM_ICONS[FALLBACK_ITEM], ITEM_COLORS);
    smallCache.set(id, c);
  }
  return c;
}
export function itemIcon(id) {
  let c = iconCache.get(id);
  if (!c) {
    c = scale2x(itemIconSmall(id));
    iconCache.set(id, c);
  }
  return c;
}

export function itemPrice(id) {
  return ITEMS[id]?.price ?? DEFAULT_PRICE;
}

// ---------------------------------------------------------------------------
// Item pools: each item can appear only once per run. A pool that has nothing left falls back
// to the next one (POOLS in src/data/items.js); greed mode reads the greed weights.
export class ItemPools {
  // allowed(id): false for items that are still locked (see src/game/progress.js)
  constructor(rng, allowed = () => true) {
    this.rng = rng;
    this.allowed = allowed;
    this.taken = new Set();
    this.greed = false;
  }

  entries(pool) {
    const gp = greedPool(pool);
    const out = [];
    for (const [id, d] of Object.entries(ITEMS)) {
      const w = this.greed ? (d.pools[gp] ?? d.pools[pool]) : d.pools[pool];
      // quality 4 never shows up in a shop
      if (!w || this.taken.has(id) || !this.allowed(id) || (pool === 'shop' && d.quality >= 4)) continue;
      out.push({ id, weight: w * (QUALITY_WEIGHT[d.quality] ?? 1) });
    }
    return out;
  }

  draw(pool) {
    let entries = [];
    for (let p = pool, n = 0; p && !entries.length && n < 6; p = POOLS[p]?.fallback, n++) entries = this.entries(p);
    if (!entries.length) {
      entries = Object.keys(ITEMS).filter((id) => !ITEMS[id].starter && !this.taken.has(id) && this.allowed(id)).map((id) => ({ id, weight: 1 }));
    }
    const id = entries.length ? this.rng.weighted(entries).id : FALLBACK_ITEM;
    this.taken.add(id);
    return id;
  }
}

// ---------------------------------------------------------------------------
// Everything the candle holds that changes it: items, then the held trinket and the ones
// melted in for good (a golden trinket counts double: gold 2).
export function heldSources(p) {
  const out = [];
  for (const id of p.items) if (ITEMS[id]) out.push({ id, d: ITEMS[id], gold: 1 });
  for (const t of [p.trinket, ...(p.gulped || [])]) if (t && TRINKETS[t.id]) out.push({ id: t.id, d: TRINKETS[t.id], gold: t.golden ? 2 : 1 });
  // buffs from actives that last until you leave the room (Psalter of Feathers, Wobble Cap...)
  for (const b of p.roomBuffs || []) out.push({ id: 'roomBuff', d: b, gold: 1 });
  for (const t of p.transforms || []) if (TRANSFORMATIONS[t]) out.push({ id: `tf:${t}`, d: TRANSFORMATIONS[t].bonus, gold: 1 });
  return out;
}


// Transformations (src/data/transformations.js): count the tags of the different items held (the
// active and pocket items too); 3 of a tag and that transformation is gained for good.
// Newly gained ones wait in player.newTransforms for the game to announce.
export function updateTransforms(p) {
  p.transforms ??= [];
  const ids = new Set(p.items);
  for (const s of [p.active, p.pocket]) if (s) ids.add(s.id);
  const count = {};
  for (const id of ids) for (const t of ITEMS[id]?.tags || []) count[t] = (count[t] || 0) + 1;
  for (const [tid, t] of Object.entries(TRANSFORMATIONS)) {
    if (p.transforms.includes(tid) || (count[t.tag] || 0) < TRANSFORM_NEED) continue;
    p.transforms.push(tid);
    (p.newTransforms ??= []).push(tid);
  }
  p.tagCounts = count;
}

// Recompute everything that depends on held items. Called whenever items change.
export function computeLoadout(player) {
  updateTransforms(player);
  const add = {}, mul = {};
  const shot = {
    homing: false, pierce: false, spectral: false, bounce: 0, split: 0, sizeMul: 1,
    multishot: 0, charged: false, backShot: false, explode: false, knockbackMul: 1, style: 'wax',
    // the weapon form and delivery traits (src/game/weapons.js), filled in below
    form: 'tears', barrage: false, lobbed: false, steady: false, beamLevel: 0, weaponArt: null,
    // chances per shot (0..1) before luck, see STATUS in src/data/items.js
    poison: 0, burn: 0, slow: 0, freeze: 0, fear: 0, charm: 0, crit: 0, chain: 0, blast: 0, execute: 0,
    grow: false, pull: false, hover: false, wrap: false, orbit: false, eraser: false,
  };
  const styles = new Set();
  const forms = new Map();   // weapon form -> how many sources give it
  const addShot = (k, v, g = 1) => {
    if (k === 'weapon') { for (const f of [].concat(v)) forms.set(f, (forms.get(f) || 0) + g); return true; }
    if (k === 'weaponArt') { shot.weaponArt = v; return true; }
    return false;
  };
  const charLook = LOOKS[player.lookId] || LOOKS.wick;
  const look = {
    id: player.lookId, costumes: [...(charLook.costumes || [])], flame: charLook.flame || null, bodyTint: null,
    alpha: charLook.alpha, noFeet: charLook.noFeet, colors: player.lookColors, colorKey: player.lookColors ? JSON.stringify(player.lookColors) : '',
  };
  const followers = [];
  const mechanics = {};
  const bombMods = { radiusMul: 1, damageMul: 1 };
  let flying = !!player.charFlying;
  let helperMul = 1;

  // the character's own stat changes and shot traits come first
  // ...then what pills did (they stack for the run)
  for (const [k, v] of [...Object.entries(player.charStats || {}), ...Object.entries(player.pillStats || {})]) {
    if (k.endsWith('Mul')) mul[k.slice(0, -3)] = (mul[k.slice(0, -3)] ?? 1) * v;
    else add[k] = (add[k] ?? 0) + v;
  }
  for (const [k, v] of Object.entries(player.charShot || {})) {
    if (addShot(k, v)) continue;
    if (k === 'style') styles.add(v);
    else if (typeof v === 'boolean') shot[k] = shot[k] || v;
    else if (k === 'sizeMul' || k === 'knockbackMul') shot[k] *= v;
    else shot[k] += v;
  }

  // items, then held and melted-in trinkets (a golden one counts double: `gold` 2)
  for (const { id, d, gold } of heldSources(player)) {
    const g = (v) => v * gold, gm = (v) => 1 + (v - 1) * gold;
    for (const [k, v] of Object.entries(d.stats || {})) {
      if (k.endsWith('Mul')) {
        const base = k.slice(0, -3);
        mul[base] = (mul[base] ?? 1) * gm(v);
      } else {
        add[k] = (add[k] ?? 0) + g(v);
      }
    }
    for (const [k, v] of Object.entries(d.shot || {})) {
      if (addShot(k, v, gold)) continue;
      if (k === 'style') styles.add(v);
      else if (typeof v === 'boolean') shot[k] = shot[k] || v;
      else if (k === 'sizeMul' || k === 'knockbackMul') shot[k] *= gm(v);
      else if (k === 'split') shot.split = Math.max(shot.split, g(v));
      else shot[k] += g(v);
    }
    for (const [name, params] of Object.entries(d.fx || {})) mechanics[name] ??= { ...params, gold };
    if (d.look?.costume) {
      look.costumes.push(...[].concat(d.look.costume));   // one costume or a list of them
      if (d.look.costume === 'glasses') look.costumes.push('glassesSide');
    }
    if (d.look?.flame) look.flame = d.look.flame;
    if (d.look?.bodyTint) look.bodyTint = d.look.bodyTint;
    if (d.flying) flying = true;
    if (d.bombs) {
      bombMods.radiusMul *= d.bombs.radiusMul ?? 1;
      bombMods.damageMul *= d.bombs.damageMul ?? 1;
    }
    if (d.helperMul) helperMul *= d.helperMul;
    if (d.follower) followers.push({ ...d.follower, item: id });
    for (const f of d.followers || []) followers.push({ ...f, item: id });
    for (const [name, params] of Object.entries(d.mechanics || {})) mechanics[name] ??= params;
  }

  const stats = {};
  for (const k of Object.keys(BASE_STATS)) stats[k] = (BASE_STATS[k] + (add[k] ?? 0)) * (mul[k] ?? 1);
  // fire rate: "+fire rate" adds to the tears stat T, which goes through Isaac's formula
  stats.tears = add.fireRate ?? 0;
  stats.tearDelay = tearDelay(stats.tears) + (add.tearDelay ?? 0);
  stats.fireRate = (TUNING.tears.framesPerSecond / (Math.max(0, stats.tearDelay) + 1)) * (mul.fireRate ?? 1);
  // damage, Isaac's formula: "+damage" on items counts as damage ups, each one worth a bit less
  // than the last; flatDamage adds after that; every multiplier (the character's, items') last
  const DM = TUNING.damage;
  stats.damageUps = add.damage ?? 0;
  // damage downs (a negative total) come off flat, as in Isaac, so stacking them never hits 0
  const ups = Math.max(0, stats.damageUps), downs = Math.min(0, stats.damageUps);
  stats.damage = (DM.base * Math.sqrt(1 + ups * DM.upFactor) + downs + (add.flatDamage ?? 0)) * (mul.damage ?? 1);
  clampStats(stats);
  shot.style = SHOT_STYLE_PRIORITY.find((s) => styles.has(s)) || 'wax';
  // the first form in FORM_PRIORITY wins; barrage and lobbed change whatever form it is
  shot.form = FORM_PRIORITY.find((f) => forms.has(f)) || 'tears';
  shot.barrage = forms.has('barrage');
  shot.lobbed = forms.has('lobbed');
  shot.steady = forms.has('steady');
  if (shot.steady && !forms.has('laser') && shot.form === 'tears') shot.form = 'laser';
  shot.beamLevel = forms.get('beam') || 0;

  player.stats = stats;
  player.shot = shot;
  player.look = look;
  player.baseFlying = flying;
  player.flying = flying || player.fiendT > 0;
  player.followerDefs = followers;
  player.helperMul = helperMul;
  player.itemMechanics = mechanics;
  player.bombMods = bombMods;
}

// Heart changes from data: { containers (whole), heal, ash, soot (halves), bone, eternal,
// golden, rotten, broken (counts) }. Shared by items and characters.
export function applyHearts(health, h) {
  if (h.containers) health.addContainers(h.containers, true);
  if (h.heal) health.healRed(h.heal);
  if (h.ash) health.addSoul(h.ash, 'soul');
  if (h.soot) health.addSoul(h.soot, 'black');
  for (let i = 0; i < (h.bone || 0); i++) health.addBone(0);
  for (let i = 0; i < (h.eternal || 0); i++) health.addEternal();
  if (h.golden) health.addGolden(h.golden);
  if (h.rotten) health.addRotten(h.rotten);
  if (h.broken) health.addBroken(h.broken);
}

// One-time effects when an item is picked up (health, coins, bombs, keys).
export function applyItemPickup(id, player) {
  const d = ITEMS[id];
  const h = d.hearts;
  if (h) applyHearts(player.health, h);
  const g = d.gives;
  if (g) {
    if (g.coins) player.coins = Math.min(99, player.coins + g.coins);
    if (g.bombs) player.bombs = Math.min(99, player.bombs + g.bombs);
    if (g.keys) player.keys = Math.min(99, player.keys + g.keys);
  }
}

// Plain-language list of what an item does, generated from its data
// (used by the "Detailed" item info setting).
const SHOT_TEXT = {
  weapon: (v) => [].concat(v).map((f) => WEAPON_TEXT[f] || '').filter(Boolean).join(', '),
  weaponArt: () => '',
  homing: () => 'HOMING SHOTS',
  pierce: () => 'SHOTS PIERCE ENEMIES',
  spectral: () => 'SHOTS FLY OVER ROCKS',
  bounce: (v) => `SHOTS BOUNCE ${v} TIMES`,
  split: (v) => `SHOTS SPLIT INTO ${v}`,
  sizeMul: () => 'BIGGER SHOTS',
  multishot: (v) => `+${v} SHOT${v > 1 ? 'S' : ''} PER VOLLEY`,
  charged: () => 'HOLD TO CHARGE A BIG SHOT',
  backShot: () => 'ALSO SHOOTS BACKWARDS',
  knockbackMul: () => 'MUCH STRONGER KNOCKBACK',
  grow: () => 'SHOTS HIT HARDER THE FARTHER THEY FLY',
  pull: () => 'SHOTS DRAG NEARBY ENEMIES ALONG',
  hover: () => 'SHOTS WAIT IN THE AIR WHILE YOU KEEP SHOOTING',
  wrap: () => 'SHOTS GO THROUGH ONE WALL AND COME OUT THE OTHER SIDE',
  orbit: () => 'SHOTS CIRCLE AROUND YOU',
  eraser: () => 'SHOTS WIPE OUT ENEMY SHOTS',
  steady: () => '',
  explode: () => 'SHOTS EXPLODE (NEVER HURT YOU)',
};
// a chance per shot: "25% CHANCE TO POISON, +5% PER LUCK (UP TO 80%)"
const chanceText = (k, v) => `${Math.round(v * 100)}% CHANCE: ${STATUS[k].text}, +${Math.round(STATUS[k].luck * 100)}% PER LUCK (MAX ${Math.round(STATUS[k].cap * 100)}%)`;
const STAT_WORDS = { ...STAT_LABELS, damage: 'DAMAGE', fireRate: 'FIRE RATE', speed: 'SPEED', range: 'RANGE', shotSpeed: 'SHOT SPEED', luck: 'LUCK' };

// how an active is paid for: "ACTIVE, 3 ROOMS", "ACTIVE, 4 SECONDS", "ONE USE"...
export function activeCost(a) {
  if (a.single) return 'ONE USE';
  if (a.costHealth) return `ACTIVE, COSTS ${a.costHealth === 1 ? 'HALF A HEART' : `${a.costHealth / 2} HEARTS`}`;
  if (a.costCoins) return `ACTIVE, COSTS ${a.costCoins} COIN${a.costCoins > 1 ? 'S' : ''}`;
  if (a.timed) return `ACTIVE, ${a.timed} SECONDS`;
  if (a.byShooting) return `ACTIVE, FILLS AS YOU SHOOT`;
  return `ACTIVE, ${a.charge} ROOM${a.charge === 1 ? '' : 'S'}`;
}

// What borrowed trinket effects (`fx`, src/game/trinketfx.js) and item mechanics
// (src/game/mechanics.js) do, in the same plain words as the rest of the item info.
const pct = (c) => `${Math.round(Math.min(1, c) * 100)}%`;
const PICKUP_WORD = { heartHalf: 'HALF A HEART', heart: 'A HEART', coin: 'A COIN', key: 'A KEY', bomb: 'A BOMB', any: 'A PICKUP' };
const FX_TEXT = {
  tHurtBurst: (m) => `WHEN HURT: ${m.count} SHOTS BURST OUT AROUND YOU`,
  tHurtDrop: (m) => `WHEN HURT: ${m.chance >= 1 ? 'DROPS' : `${pct(m.chance)} CHANCE TO DROP`} ${PICKUP_WORD[m.type] || 'A PICKUP'}`,
  tHurtRage: (m) => `WHEN HURT: +${m.damage} DAMAGE FOR ${m.time} SECONDS`,
  tHurtCharge: (m) => `WHEN HURT: +${m.amount} CHARGE TO YOUR ACTIVE ITEM`,
  tHurtTeleport: (m) => `WHEN HURT: ${pct(m.chance)} CHANCE TO TELEPORT AWAY`,
  tLowHealth: (m) => `ON YOUR LAST HEART: X${m.damageMul} DAMAGE`,
  tFullHealth: (m) => `WITH FULL RED HEARTS: X${m.damageMul} DAMAGE`,
  tFightSpeed: () => 'FASTER WHILE ENEMIES ARE AROUND',
  tEnterFreeze: (m) => `NEW ROOMS: ${pct(m.chance)} CHANCE TO FREEZE EVERY ENEMY`,
  tEnterFear: (m) => `NEW ROOMS: ${pct(m.chance)} CHANCE TO SCARE EVERY ENEMY`,
  tEnterShield: (m) => `NEW ROOMS: ${pct(m.chance)} CHANCE OF A SHIELD FOR ${m.time} SECONDS`,
  tEnterWard: (m) => (m.chance >= 1 ? 'EVERY NEW ROOM: THE FIRST HIT IS BLOCKED' : `NEW ROOMS: ${pct(m.chance)} CHANCE TO BLOCK THE FIRST HIT`),
  tClearDrop: (m) => `CLEARING A ROOM: ${pct(m.chance)} CHANCE OF ${PICKUP_WORD[m.type] || 'A PICKUP'}`,
  tClearCharge: (m) => `CLEARING A ROOM: ${pct(m.chance)} CHANCE OF AN EXTRA CHARGE`,
  tClearHeal: (m) => `EVERY ${m.every} ROOMS CLEARED: HEALS A HEART`,
  tClearGnats: (m) => `CLEARING A ROOM: ${m.chance >= 1 ? '' : `${pct(m.chance)} CHANCE OF `}${m.n} ${m.kind === 'spider' ? 'SPIDERLING' : 'GNAT'}${m.n > 1 ? 'S' : ''} THAT FIGHT FOR YOU`,
  tKillDrop: (m) => `KILLS: ${pct(m.chance)} CHANCE TO DROP ${PICKUP_WORD[m.type] || 'A PICKUP'}`,
  tKillHeal: (m) => `EVERY ${m.every} KILLS: HEALS A HEART`,
  tKillExplode: (m) => `KILLS: ${pct(m.chance)} CHANCE THE ENEMY EXPLODES`,
  tKillStack: (m) => `EVERY KILL: +${Math.round(m.per * 100)}% DAMAGE UNTIL YOU LEAVE THE ROOM (MAX +${Math.round(m.cap * 100)}%)`,
  tMagnet: () => 'PULLS NEARBY PICKUPS TO YOU',
  tAura: (m) => `ENEMIES CLOSE TO YOU TAKE ${m.damage} DAMAGE TWICE A SECOND`,
  tShotBurst: (m) => `EVERY ${m.every} ATTACKS: ${m.count} SHOTS BURST OUT AROUND YOU`,
};
const MECH_TEXT = {
  catLives: (m) => `COME BACK WITH ONE HEART WHEN YOU WOULD DIE (${m.lives} TIMES)`,
  gnatHit: (m) => `HITS: ${pct(m.chance)} CHANCE TO HATCH A GNAT`,
  smite: (m) => `HITS: ${pct(m.chance)} CHANCE OF A PILLAR OF LIGHT`,
  pencil: () => 'EVERY 15TH ATTACK ALSO SPRAYS A FISTFUL OF SHOTS',
  stye: () => 'ATTACKS SOMETIMES THROW STRAY SHOTS',
  chili: (m) => `ATTACKS: ${pct(m.chance)} CHANCE TO BREATHE A BURNING FLAME`,
  deadeye: () => 'HITS IN A ROW ADD DAMAGE (UP TO DOUBLE); A MISS LOSES IT',
  loosewire: (m) => `ATTACKS: ${pct(m.chance)} CHANCE OF A THIN LASER TOO`,
  splash: () => 'SHOTS LEAVE PUDDLES THAT HURT AND SLOW ENEMIES (NOT FLYING ONES)',
};

export function describeItem(id) {
  const d = ITEMS[id];
  const lines = [];
  if (d.active) lines.push(`${activeCost(d.active)}: ${ACTIVE_TEXT[d.active.effect]?.(d.active) ?? ''}`);
  for (const [k, v] of Object.entries(d.stats || {})) {
    if (k.endsWith('Mul')) lines.push(`X${v} ${STAT_WORDS[k.slice(0, -3)]}`);
    else lines.push(`${v > 0 ? '+' : ''}${v} ${STAT_WORDS[k]}`);
  }
  if (d.hearts?.containers) lines.push(`${d.hearts.containers > 0 ? '+' : ''}${d.hearts.containers} HEART CONTAINER`);
  if (d.hearts?.heal) lines.push('HEALS');
  if (d.hearts?.ash) lines.push(`+${d.hearts.ash / 2} ASH HEARTS`);
  if (d.hearts?.soot) lines.push(`+${d.hearts.soot / 2} SOOT HEARTS`);
  if (d.hearts?.bone) lines.push(`+${d.hearts.bone} RIBCAGE HEART`);
  if (d.hearts?.eternal) lines.push('+1 VIGIL HEART');
  if (d.hearts?.golden) lines.push(`+${d.hearts.golden} BRASS HEART`);
  if (d.hearts?.rotten) lines.push(`+${d.hearts.rotten} MOLDY HEART`);
  if (d.hearts?.broken) lines.push(`${d.hearts.broken} MELTED HEART`);
  for (const [k, v] of Object.entries(d.gives || {})) lines.push(`+${v} ${k.toUpperCase()}`);
  for (const [k, v] of Object.entries(d.shot || {})) {
    if (STATUS[k]) lines.push(chanceText(k, v));
    else if (SHOT_TEXT[k]) { const t = SHOT_TEXT[k](v); if (t) lines.push(t); }
  }
  if (d.flying) lines.push('FLIGHT: CROSS PITS, IGNORE SPIKES');
  if (d.bombs) lines.push('BIGGER, STRONGER BOMBS');
  const fs = [d.follower, ...(d.followers || [])].filter(Boolean);
  if (fs.some((f) => f.kind === 'orbital')) lines.push(`${fs.length > 1 ? `${fs.length} ORBIT` : 'ORBITS'} YOU, BLOCKS SHOTS`);
  if (d.follower?.variant === 'buddy') lines.push('A BUDDY THAT SHOOTS WHERE YOU SHOOT');
  if (d.follower?.variant === 'rat') lines.push('A RAT THAT CHASES AND BITES ENEMIES');
  if (d.follower?.variant === 'firefly') lines.push('A BUDDY THAT SHOOTS HOMING SPARKS');
  for (const f of fs) if (f.say) lines.push(f.say);
  if (d.helperMul) lines.push('HELPERS HIT TWICE AS HARD AND GROW');
  if (d.mechanics?.echo) lines.push('EVERY VOLLEY ECHOES A MOMENT LATER');
  if (d.mechanics?.pickpocket) lines.push('ENEMIES SOMETIMES DROP COINS (LUCK HELPS)');
  if (d.map) lines.push({ rooms: 'THE MAP SHOWS EVERY ROOM', icons: 'THE MAP SHOWS EVERY SPECIAL ROOM', secrets: 'THE MAP SHOWS THE SECRET ROOMS' }[d.map]);
  for (const [k, m] of Object.entries(d.fx || {})) if (FX_TEXT[k]) lines.push(FX_TEXT[k](m));
  for (const [k, m] of Object.entries(d.mechanics || {})) if (MECH_TEXT[k]) lines.push(MECH_TEXT[k](m));
  if (d.dealChance) lines.push('DEAL ROOMS SHOW UP MORE OFTEN AFTER BOSSES');
  if (d.say) lines.push(d.say);   // an item's own line, for what the data can't say (or a joke)
  // an item with no effect at all says so (the junk items)
  const EFFECT_KEYS = ['stats', 'shot', 'hearts', 'gives', 'flying', 'map', 'bombs', 'dealChance', 'fx', 'mechanics', 'follower', 'followers', 'helperMul', 'active'];
  if (!lines.length && !EFFECT_KEYS.some((k) => d[k])) lines.push('DOES NOTHING. NOTHING AT ALL.');
  return lines;
}

// ---------------------------------------------------------------------------
// Pedestals hold an item. In the shop they have a price.
// A carved stone pedestal, 24 x 16.
const PEDESTAL = [
  '.kkkkkkkkkkkkkkkkkkkkkk.',
  'kLLLLLLLLLLLLLLLLLLLLLLk',
  'kSSSSSSSSSSSSSSSSSSSSSDk',
  'kDDDDDDDDDDDDDDDDDDDDDDk',
  '.kkkkkkkkkkkkkkkkkkkkkk.',
  '...kSLSSSSSSSSSSSSSDk...',
  '...kSLSSDSSSSSSDSSSDk...',
  '...kSLSSDSSSSSSDSSSDk...',
  '...kSLSSSSSSSSSSSSDDk...',
  '...kSLSSSSSSSSSSSSDDk...',
  '...kSSSSSSSSSSSSSSDDk...',
  '..kkkkkkkkkkkkkkkkkkkk..',
  '.kLLLLLLLLLLLLLLLLLLLLk.',
  'kSSSSSSSSSSSSSSSSSSSSSDk',
  'kDDDDDDDDDDDDDDDDDDDDDDk',
  '.kkkkkkkkkkkkkkkkkkkkkk.',
];
const PED_COLORS = { k: '#160f0c', L: '#a89e92', S: '#6e665c', D: '#45403a' };

let PED_ART = null;
function pedArt() {
  if (PED_ART) return PED_ART;
  PED_ART = {
    base: buildSprite(PEDESTAL, PED_COLORS),
    shadow: makeShadow(26, 7, 0.45),
    glow: makeGlow(24, 'rgba(255,220,150,0.5)'),
  };
  return PED_ART;
}

export class Pedestal {
  constructor(x, y, item, { price = 0, bare = false, cost = null, group = null, deal = null } = {}) {
    this.x = x;
    this.y = y;
    this.item = item;
    this.price = price;
    this.bare = bare;      // shop items sit on the floor without a stone base
    this.cost = cost;      // paid in health instead: { hearts: n } containers or { soul: n } halves
    this.group = group;    // take one item of a group and the others vanish
    this.deal = deal;      // 'devil' | 'angel': taking it is a deal
    this.r = 10;
    this.t = Math.random() * 6;
    this.cooldown = 0.6;   // a swapped-out item can't be grabbed back instantly
  }

  update(dt) {
    this.t += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  renderShadow(ctx, ox, oy) {
    const a = pedArt();
    ctx.drawImage(a.shadow, Math.round(this.x - 13 + ox), Math.round(this.y + 3 + oy));
  }

  render(ctx, ox, oy) {
    const a = pedArt();
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    let top = y + 4;
    if (!this.bare) {
      ctx.drawImage(a.base, x - 12, y - 10);
      top = y - 10;
    }
    if (this.item) {
      // the Veiled Altars curse: every item hides behind a question mark
      const icon = Pedestal.veiled ? veiledIcon() : itemIcon(this.item);
      const bob = Math.round(Math.sin(this.t * 2.5) * 1.5);
      const iy = top - 2 - icon.height + bob;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.drawImage(a.glow, x - 24, iy + icon.height / 2 - 24);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(icon, x - Math.floor(icon.width / 2), iy);
    }
    if (this.price && this.item) drawPrice(ctx, this.price, x, y + 7);
    if (this.cost && this.item) drawHeartCost(ctx, this.cost, x, y + 8);
  }
}

// A price in hearts under an item: red hearts for containers, grey ones for Ash Hearts.
export function drawHeartCost(ctx, cost, x, y) {
  const n = cost.hearts || Math.ceil((cost.soul || 0) / 2);
  const col = cost.hearts ? ['#c0262c', '#ff6a5a'] : ['#8a8580', '#c4bfb6'];
  const w = n * 8 - 1;
  for (let i = 0; i < n; i++) {
    const hx = Math.round(x - w / 2 + i * 8), hy = y;
    ctx.fillStyle = '#160f0c';
    ctx.fillRect(hx, hy + 1, 7, 4); ctx.fillRect(hx + 1, hy, 2, 6); ctx.fillRect(hx + 4, hy, 2, 6); ctx.fillRect(hx + 2, hy + 5, 3, 2);
    ctx.fillStyle = col[0];
    ctx.fillRect(hx + 1, hy + 1, 5, 3); ctx.fillRect(hx + 2, hy + 4, 3, 1); ctx.fillRect(hx + 3, hy + 5, 1, 1);
    ctx.fillStyle = col[1];
    ctx.fillRect(hx + 1, hy + 1, 1, 1);
  }
}

export function drawPrice(ctx, price, x, y) {
  drawText(ctx, `${price}C`, x, y, { align: 'center', color: '#f0c040' });
}

// Set while the Veiled Altars curse is on the floor (src/data/curses.js).
Pedestal.veiled = false;

// The hidden-item icon: a dark lump with a question mark on it.
let VEILED = null;
function veiledIcon() {
  if (!VEILED) {
    const [c, ctx] = makeCanvas(24, 24);
    ctx.fillStyle = '#0e0a08';
    ctx.beginPath(); ctx.ellipse(12, 13, 10, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2e26';
    ctx.beginPath(); ctx.ellipse(12, 12, 9, 9, 0, 0, Math.PI * 2); ctx.fill();
    drawText(ctx, '?', 12, 6, { align: 'center', scale: 2, color: '#e8d9b0' });
    VEILED = c;
  }
  return VEILED;
}
