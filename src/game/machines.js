// Machines and beggars: things you pay to gamble with. Costs and odds are data
// (src/data/machines.js); this file is how they look, move and pay out.
//
// Walk into one to use it (it's solid, you bump against it). A machine whirs, spins or shuffles,
// then pays out (or doesn't). A beggar perks up when paid, cheers when it gives you something,
// and when it gives you an item it waves goodbye and is gone. Bombs break machines (they drop a
// few coins) and blow beggars apart.
//
// Art: bodies are painted with PixelGrid in our palette ramps (src/data/packArt.js) and cached;
// the moving parts (reels, claws, shells, flames, arms) are drawn on top every frame.
import { PixelGrid, ramp, light } from '../engine/pixelgrid.js';
import { makeShadow } from '../engine/sprites.js';
import { packSprite } from '../engine/packart.js';
import { RAMP } from '../data/packArt.js';
import { MACHINES, FORTUNES } from '../data/machines.js';
import { SHOP_PICKUPS } from '../data/pickups.js';
import { fillPickup } from './consumables.js';
import { Pedestal, itemIcon, itemDef } from './items.js';
import { Chest, addProp, randomPickup } from './specials.js';
import { Gnat } from './followers.js';
import { sfx } from '../engine/audio.js';
import { drawText } from '../ui/text.js';

const R = RAMP;
const OUT = '#0a0606';
const TAU = Math.PI * 2;
const SHADOW = makeShadow(26, 8, 0.5);

// ---------------------------------------------------------------------------
// Paying
function canAfford(p, pay) {
  if (pay.coins) return p.coins >= pay.coins;
  if (pay.keys) return p.keys >= pay.keys;
  if (pay.bombs) return p.bombs >= pay.bombs;
  return true;
}
function takePayment(g, m, pay) {
  const p = g.player;
  if (pay.coins) { p.coins -= pay.coins; sfx('coin'); return true; }
  if (pay.keys) { p.keys -= pay.keys; sfx('unlock'); return true; }
  if (pay.bombs) { p.bombs -= pay.bombs; sfx('bombPlace'); return true; }
  if (pay.hearts) return p.hurt(pay.hearts, m.def.name, g, m.x, m.y - 10, true);
  return true;
}

// Pick an outcome, luck shifting the weights.
function roll(g, table) {
  const luck = g.player.stats.luck || 0;
  const list = table.map((o) => ({ o, weight: Math.max(0.05, o.weight + (o.luck || 0) * luck) }));
  return g.lootRng.weighted(list).o;
}

const count = (g, n) => (Array.isArray(n) ? g.lootRng.int(n[0], n[1]) : n || 1);

// What an outcome does. Returns 'item' when it gave an item (beggars leave after that).
const GIVE = {
  nothing: () => null,
  pickup: (g, m, o) => { for (let i = 0; i < count(g, o.n); i++) g.spawnPickup(o.type, m.x, m.y + 14); return 'pickup'; },
  random: (g, m, o) => { for (let i = 0; i < count(g, o.n); i++) g.spawnPickup(randomPickup(g), m.x, m.y + 14); return 'pickup'; },
  item: (g, m, o) => { { const s = g.room.findFreeSpot(m.x, m.y + 30); g.room.pedestals.push(new Pedestal(s.x, s.y, g.itemPools.draw(o.pool))); } return 'item'; },
  enemy: (g, m, o) => {
    for (let i = 0; i < count(g, o.n); i++) { const e = g.spawnEnemy(o.type, m.x + (i ? 12 : -12), m.y + 14, { delay: 0.3, safe: true }); e.minion = true; }
    g.room.cleared = false;
    return 'bad';
  },
  gnats: (g, m, o) => { for (let i = 0; i < count(g, o.n) && g.gnats.length < 12; i++) g.gnats.push(new Gnat(m.x, m.y)); sfx('gnat'); return 'pickup'; },
  chest: (g, m, o) => { const s = g.room.findFreeSpot(m.x + g.lootRng.int(-14, 14), m.y + 30); addProp(g.room, new Chest(s.x, s.y, { type: o.type || (o.locked ? 'gold' : 'wood'), open: false })); return 'pickup'; },
  fortune: (g) => { g.banner = { text: g.lootRng.pick(FORTUNES), sub: '', t: 0, dur: 3 }; return null; },
  charge: (g, m, o) => {
    // a jolt for your active item (or the pocket one); nothing to charge, a battery instead
    const p = g.player, slot = [p.active, p.pocket].find((s) => s && !itemDef(s.id).active?.costHealth && s.charge < itemDef(s.id).active.charge);
    if (!slot) { g.spawnPickup('battery', m.x, m.y + 14); return 'pickup'; }
    slot.charge = Math.min(itemDef(slot.id).active.charge, slot.charge + count(g, o.n));
    g.effects.bolt(m.x, m.y - 20, p.x, p.y - 8, 0.25);
    sfx('charge');
    return 'pickup';
  },
  prize: (g, m) => {
    if (!m.state.prize) return null;
    const s = g.room.findFreeSpot(m.x, m.y + 30);
    g.room.pedestals.push(new Pedestal(s.x, s.y, m.state.prize));
    m.state.prize = null;
    m.state.done = true;
    return 'item';
  },
  restock: (g, m) => {
    // the shop puts out new stock, and the next restock costs more
    for (const ped of g.room.pedestals) if (ped.price && ped.item) ped.item = g.itemPools.draw('shop');
    for (const it of g.pickups) if (it.price) { const e = g.lootRng.weighted(SHOP_PICKUPS); it.setType(e.type); it.price = e.price; fillPickup(g, it); }
    m.state.cost = (m.state.cost || m.def.pay.coins) + 1;
    return 'pickup';
  },
};

// ---------------------------------------------------------------------------
// Art helpers
const shade = (cols, v) => (nx, ny, x, y) => ramp(cols, light(nx, ny) * v + (1 - v) * 0.4, x, y);
const box = (g, x, y, w, h, cols, lit = 0.6) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = lit + (i === 0 || j === 0 ? 0.25 : 0) - (i === w - 1 ? 0.25 : 0) - j / h * 0.25;
    g.set(x + i, y + j, ramp(cols, v, x + i, y + j));
  }
};

// One cached canvas per (what, variant).
const cache = new Map();
function art(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

// ---- machine bodies (32 wide, about 40 tall; the bottom row sits on the floor)
const BODIES = {
  // a red cabinet with a grinning skull on top, a window for three reels and a lever
  slot(broken) {
    const g = new PixelGrid(34, 42), body = broken ? R.iron : R.blood;
    box(g, 4, 12, 24, 28, body, 0.55);
    box(g, 3, 38, 26, 4, R.wood, 0.5);
    g.rect(4, 12, 24, 2, R.gold[broken ? 1 : 3]);
    // the grinning skull crest
    g.ellipse(16, 8, 8, 7, shade(R.bone, 1));
    g.rect(11, 6, 3, 3, OUT); g.rect(18, 6, 3, 3, OUT);
    if (!broken) { g.set(12, 7, R.ember[4]); g.set(19, 7, R.ember[4]); }
    g.rect(11, 12, 10, 2, R.bone[4]); for (let x = 11; x < 21; x += 2) g.set(x, 13, OUT);
    // reel window, coin slot, tray
    g.rect(7, 17, 18, 10, OUT); g.rect(8, 18, 16, 8, broken ? R.void[2] : R.bone[5]);
    g.rect(14, 29, 4, 2, OUT); g.rect(15, 29, 2, 1, R.gold[2]);
    g.rect(8, 33, 16, 4, OUT); g.rect(9, 34, 14, 2, R.gold[broken ? 1 : 2]);
    // the lever's socket
    g.rect(28, 20, 3, 4, R.iron[3]);
    if (broken) { g.line(9, 18, 15, 25, R.pale[3]); g.line(15, 25, 22, 19, R.pale[2]); g.rect(4, 30, 3, 6, R.void[1]); }
    return g.outline(OUT).toCanvas();
  },
  // a tall violet booth: a glass dome with a crystal ball, a cloaked figure behind it
  fortune(broken) {
    const g = new PixelGrid(30, 44), body = broken ? R.iron : R.soul;
    box(g, 3, 20, 24, 20, body, 0.5);
    box(g, 2, 39, 26, 5, R.wood, 0.5);
    g.rect(3, 20, 24, 2, R.gold[broken ? 1 : 3]);
    // glass case with the seer inside
    g.rect(5, 2, 20, 19, OUT); g.rect(6, 3, 18, 17, broken ? R.void[1] : R.ink[1]);
    g.ellipse(15, 9, 5, 6, R.void[2]);                    // the hood
    g.rect(13, 9, 1, 1, broken ? R.void[0] : R.ember[5]); g.rect(17, 9, 1, 1, broken ? R.void[0] : R.ember[5]);
    g.poly([[8, 20], [11, 13], [19, 13], [22, 20]], R.void[3]);   // shoulders
    g.ellipse(15, 17, 4.5, 3.5, (nx, ny, x, y) => ramp(broken ? R.iron : R.soul, light(nx, ny) + 0.2, x, y));   // the crystal ball
    if (!broken) g.set(13, 16, R.pale[5]);
    if (!broken) for (let i = 0; i < 4; i++) g.set(7 + i * 5, 3, R.pale[4]);   // glints on the glass
    g.rect(4, 0, 22, 3, R.gold[broken ? 1 : 3]); g.rect(14, 0, 2, 1, R.gold[5]);
    // the ticket slot
    g.rect(10, 33, 10, 2, OUT);
    if (broken) { g.line(7, 4, 13, 12, R.pale[3]); g.line(13, 12, 9, 19, R.pale[2]); }
    return g.outline(OUT).toCanvas();
  },
  // a pale cabinet with a glass jar of blood, a tube and a needle on a hinged arm
  blood(broken) {
    const g = new PixelGrid(32, 40), body = broken ? R.iron : R.bone;
    box(g, 5, 12, 22, 24, body, 0.7);
    box(g, 4, 35, 24, 5, R.iron, 0.5);
    g.rect(5, 12, 22, 2, R.iron[3]);
    // the jar on top
    g.rect(9, 1, 14, 12, OUT); g.rect(10, 2, 12, 10, R.pale[1]);
    g.rect(9, 0, 14, 2, R.iron[3]);
    // a blood drop sign
    g.poly([[16, 18], [13, 24], [19, 24]], R.blood[3]); g.ellipse(16, 24, 3, 2.5, R.blood[3]); g.set(15, 23, R.blood[5]);
    // tube down to the needle arm
    g.line(23, 6, 28, 10, R.blood[2]); g.line(28, 10, 28, 22, R.blood[2]);
    g.rect(27, 22, 3, 3, R.iron[4]); g.line(28, 25, 28, 29, R.pale[5]);
    g.rect(9, 30, 14, 3, OUT); g.rect(10, 31, 12, 1, R.gold[2]);   // coin tray
    if (broken) { g.line(11, 3, 16, 10, R.pale[4]); g.line(16, 10, 20, 4, R.pale[3]); }
    return g.outline(OUT).toCanvas();
  },
  // a rickety table; the dealer behind it is drawn on top (he moves)
  shell() {
    const g = new PixelGrid(40, 22);
    g.rect(1, 6, 38, 5, R.wood[3]); g.rect(1, 6, 38, 1, R.wood[4]); g.rect(1, 10, 38, 1, R.wood[1]);
    for (const x of [3, 34]) g.rect(x, 11, 3, 11, R.wood[2]);
    g.rect(2, 3, 36, 4, R.blood[2]); g.rect(2, 3, 36, 1, R.blood[3]);   // a stained cloth
    for (let x = 3; x < 38; x += 4) g.set(x, 7, R.blood[1]);
    return g.outline(OUT).toCanvas();
  },
  // a glass box on a cabinet: a claw hangs inside over a pile of junk (and the prize)
  crane(broken) {
    const g = new PixelGrid(34, 46), body = broken ? R.iron : R.teal;
    box(g, 3, 26, 28, 16, body, 0.55);
    box(g, 2, 41, 30, 5, R.wood, 0.5);
    g.rect(3, 26, 28, 2, R.gold[broken ? 1 : 3]);
    g.rect(3, 2, 28, 25, OUT); g.rect(4, 3, 26, 23, broken ? R.void[1] : R.ink[0]);
    g.rect(2, 0, 30, 3, R.iron[3]); g.rect(4, 3, 26, 1, R.iron[2]);    // the rail
    // junk at the bottom of the case
    for (const [x, c] of [[6, R.bone[3]], [9, R.blood[3]], [24, R.gold[3]], [27, R.soul[3]], [11, R.rot[3]]]) g.ellipse(x, 23, 2.5, 2, c);
    // joystick and button
    g.rect(10, 31, 2, 4, R.iron[4]); g.ellipse(11, 30, 2, 1.5, R.blood[4]);
    g.ellipse(22, 33, 2, 1.5, broken ? R.iron[2] : R.ember[4]);
    if (!broken) for (let i = 0; i < 3; i++) g.set(6 + i * 9, 5 + i * 5, R.pale[3]);
    if (broken) { g.line(6, 6, 14, 18, R.pale[3]); g.line(14, 18, 26, 8, R.pale[2]); }
    return g.outline(OUT).toCanvas();
  },
  // a dark wooden booth: a pointed roof, a lattice window and a curtain
  confessional(broken) {
    const g = new PixelGrid(30, 46), wood = broken ? R.iron : R.wood;
    box(g, 3, 10, 24, 32, wood, 0.55);
    g.poly([[1, 11], [15, 0], [29, 11]], (x, y) => ramp(wood, 0.75 - y / 30 - (x > 15 ? 0.15 : 0), x, y));
    g.rect(13, 0, 4, 2, R.gold[3]);
    box(g, 2, 41, 26, 5, wood, 0.4);
    // the lattice window, dark inside
    g.rect(6, 14, 18, 12, OUT); g.rect(7, 15, 16, 10, R.void[1]);
    for (let x = 7; x < 23; x += 3) g.rect(x, 15, 1, 10, wood[3]);
    for (let y = 16; y < 25; y += 3) g.rect(7, y, 16, 1, wood[3]);
    // the curtain below it
    for (let x = 6; x < 24; x++) for (let y = 28; y < 40; y++) g.set(x, y, ramp(R.blood, 0.5 + Math.sin(x * 1.3) * 0.3 - (y - 28) / 30, x, y));
    g.rect(6, 27, 18, 1, R.gold[2]);
    return g.outline(OUT).toCanvas();
  },
  // a crate on legs with a crank and two arrows going round
  restock(broken) {
    const g = new PixelGrid(30, 32);
    box(g, 3, 6, 24, 22, broken ? R.iron : R.wood, 0.55);
    for (const y of [6, 16, 26]) g.rect(3, y, 24, 2, R.iron[3]);
    g.rect(5, 28, 3, 4, R.wood[1]); g.rect(22, 28, 3, 4, R.wood[1]);
    // the round-arrows sign
    for (let a = 0; a < TAU; a += 0.05) if ((a % Math.PI) < 2.4) g.set(15 + Math.cos(a) * 6, 16 + Math.sin(a) * 5, broken ? R.iron[2] : R.gold[4]);
    g.poly([[19, 10], [23, 12], [19, 14]], R.gold[4]); g.poly([[11, 22], [7, 20], [11, 18]], R.gold[4]);
    g.rect(27, 12, 3, 2, R.iron[4]); g.rect(29, 8, 2, 6, R.iron[3]);
    g.rect(6, 0, 18, 6, OUT); g.rect(7, 1, 16, 4, R.bone[4]);    // a little price board
    return g.outline(OUT).toCanvas();
  },
};

// ---- beggars: hunched, kneeling figures. pose: idle | happy | wave | sad; f: animation frame
const BEGGARS = {
  beggar: { cloak: R.wood, skin: R.wax, hood: true },
  keybeggar: { cloak: R.ink, skin: R.pale, hood: true, hat: true },
  bombbeggar: { cloak: R.void, skin: R.iron, hood: false, burnt: true },
  devilbeggar: { cloak: R.blood, skin: R.void, hood: true, horns: true },
  rotbeggar: { cloak: R.rot, skin: R.flesh, hood: false, rot: true },
  batterybeggar: { cloak: R.teal, skin: R.wax, hood: true, sparks: true },
  dealer: { cloak: R.stone, skin: R.pale, hood: true },   // the thimblerigger behind his table
};

function beggarArt(type, pose, f) {
  const b = BEGGARS[type];
  const g = new PixelGrid(30, 30);
  const bob = pose === 'idle' ? f : pose === 'happy' ? -2 * f : 0;
  const by = 8 + bob;
  // the body: a heap of cloth, kneeling
  g.ellipse(15, 22, 11, 8, (nx, ny, x, y) => ramp(b.cloak, light(nx, ny) * 0.9 + (Math.sin(x * 1.7 + y) > 0.85 ? -0.2 : 0), x, y));
  g.poly([[6, 24], [15, by + 6], [24, 24]], (x, y) => ramp(b.cloak, 0.65 - (y - by) / 30 - (x > 15 ? 0.15 : 0), x, y));
  // rags hanging at the hem
  for (let x = 5; x < 26; x += 3) g.rect(x, 28, 1, 1 + (x % 2), b.cloak[1]);
  // the head
  const hx = 15, hy = by + 2;
  if (b.hood) {
    g.ellipse(hx, hy, 6, 6, shade(b.cloak, 1));
    g.ellipse(hx, hy + 1, 3.5, 3.5, b.cloak[0]);
    g.set(hx - 1, hy + 1, R.ember[pose === 'sad' ? 2 : 4]); g.set(hx + 1, hy + 1, R.ember[pose === 'sad' ? 2 : 4]);
  } else {
    g.ellipse(hx, hy, 5, 5, shade(b.skin, 1));
    g.set(hx - 2, hy, OUT); g.set(hx + 2, hy, OUT);
    if (pose === 'happy') { g.rect(hx - 2, hy + 2, 5, 1, OUT); g.set(hx - 2, hy + 1, OUT); g.set(hx + 2, hy + 1, OUT); }
    else g.rect(hx - 1, hy + 3, 3, 1, OUT);
  }
  if (b.hat) { g.rect(hx - 6, hy - 5, 13, 2, R.ink[2]); g.rect(hx - 4, hy - 9, 9, 5, R.ink[2]); g.rect(hx - 4, hy - 6, 9, 1, R.gold[3]); }
  if (b.horns) { g.line(hx - 4, hy - 4, hx - 7, hy - 9, R.bone[3]); g.line(hx + 4, hy - 4, hx + 7, hy - 9, R.bone[3]); }
  if (b.burnt) for (const [x, y] of [[9, 20], [19, 23], [13, 26], [21, 18]]) g.rect(x, y, 2, 1, R.ember[1]);
  if (b.rot) for (const [x, y] of [[10, 18], [20, 22], [14, 25]]) g.ellipse(x, y, 1.5, 1.5, R.rot[4]);
  // the Spark-Eater: wires wound round it, little sparks crawling over the cloth
  if (b.sparks) { g.line(7, 21, 23, 19, R.iron[3]); g.line(8, 24, 22, 25, R.iron[3]); for (const [x, y] of [[11, 17 + f], [18, 22], [13, 26 - f]]) { g.set(x, y, R.gold[5]); g.set(x + 1, y - 1, R.teal[5]); } }
  // arms: holding out a hand (idle), both up (happy), one waving (wave), hanging (sad)
  const arm = (x0, y0, x1, y1) => { g.line(x0, y0, x1, y1, b.cloak[3]); g.rect(x1 - 1, y1 - 1, 2, 2, b.skin[4]); };
  if (pose === 'happy') { arm(9, by + 10, 5, by + 2); arm(21, by + 10, 25, by + 2); }
  else if (pose === 'wave') { arm(9, by + 12, 8, by + 18); arm(21, by + 10, 25 + f, by + 1); }
  else if (pose === 'sad') { arm(9, by + 12, 8, by + 19); arm(21, by + 12, 22, by + 19); }
  else { arm(9, by + 12, 8, by + 18); arm(21, by + 12, 24, by + 16); }
  return g.outline(OUT).toCanvas();
}

// What each beggar holds out (drawn next to its hand when idle).
function beggarHeld(ctx, type, x, y) {
  if (type === 'beggar') { ctx.fillStyle = OUT; ctx.fillRect(x - 3, y - 4, 7, 6); ctx.fillStyle = R.iron[4]; ctx.fillRect(x - 2, y - 3, 5, 4); ctx.fillStyle = R.iron[2]; ctx.fillRect(x - 2, y, 5, 1); }
  if (type === 'keybeggar') { const k = packSprite('key'); if (k) ctx.drawImage(k, x - 6, y - 8, 12, 12); }
  if (type === 'bombbeggar') { ctx.fillStyle = OUT; ctx.fillRect(x - 4, y - 5, 8, 8); ctx.fillStyle = R.iron[2]; ctx.fillRect(x - 3, y - 4, 6, 6); ctx.fillStyle = R.ember[4]; ctx.fillRect(x, y - 7, 1, 2); }
  if (type === 'devilbeggar') { ctx.fillStyle = R.blood[4]; ctx.fillRect(x - 1, y - 3, 3, 3); ctx.fillRect(x, y, 1, 2); }
  if (type === 'rotbeggar') { ctx.fillStyle = R.rot[4]; ctx.fillRect(x - 2, y - 3, 4, 3); }
  if (type === 'batterybeggar') { ctx.fillStyle = OUT; ctx.fillRect(x - 3, y - 6, 6, 9); ctx.fillStyle = R.teal[4]; ctx.fillRect(x - 2, y - 5, 4, 7); ctx.fillStyle = R.gold[5]; ctx.fillRect(x - 1, y - 7, 2, 1); ctx.fillRect(x - 1, y - 2, 2, 1); }
}

// ---------------------------------------------------------------------------
// A machine or a beggar in a room. state is saved: { type, broken, gone, uses, prize, cost, done }
export class Machine {
  constructor(x, y, state = { type: 'slot' }) {
    this.kind = 'machine';
    this.x = x; this.y = y;
    this.state = state;
    this.t = Math.random() * 5;
    this.cd = 0.6;
    this.anim = null;          // { kind, t, dur, then }
    this.r = 11;
    if (!MACHINES[state.type]) state.type = 'slot';
  }

  get def() { return MACHINES[this.state.type]; }
  get isBeggar() { return !!this.def.beggar; }
  save() { return { kind: this.kind, x: this.x, y: this.y, state: this.state }; }

  // The crane rolls its prize the first time its room is filled.
  setup(g) {
    if (this.state.type === 'crane' && this.state.prize === undefined) this.state.prize = g.itemPools.draw(this.def.prizePool);
  }

  get price() {
    const p = this.def.pay;
    return this.state.type === 'restock' ? { coins: this.state.cost || p.coins } : p;
  }

  update(dt, g) {
    this.t += dt;
    this.cd = Math.max(0, this.cd - dt);
    const s = this.state, p = g.player;
    if (s.gone) return;
    // solid: push the player out
    const dx = p.x - this.x, dy = p.y - (this.y - 2), d = Math.hypot(dx, dy), min = this.r + p.r;
    const touching = !p.dead && d < min + 1.5;
    if (!p.dead && d < min && d > 0.01) { p.x = this.x + (dx / d) * min; p.y = this.y - 2 + (dy / d) * min; }
    if (this.anim) {
      this.anim.t += dt;
      if (this.anim.t >= this.anim.dur) { const a = this.anim; this.anim = null; a.then?.(); }
      return;
    }
    if (s.broken || s.done || this.cd > 0 || !touching) return;
    this.cd = 0.5;
    const pay = this.price;
    if (!canAfford(p, pay)) { sfx('denied'); this.anim = { kind: 'no', t: 0, dur: 0.4 }; return; }
    if (!takePayment(g, this, pay)) return;
    s.uses = (s.uses || 0) + 1;
    const spin = { slot: 0.9, fortune: 1.1, blood: 0.7, shell: 1.3, crane: 1.8, confessional: 1.2, restock: 0.6 }[s.type] ?? 0.5;
    sfx(this.isBeggar ? 'coin' : 'reroll');
    this.anim = { kind: this.isBeggar ? 'paid' : 'spin', t: 0, dur: spin, then: () => this.payout(g) };
  }

  payout(g) {
    const s = this.state, def = this.def;
    // a beggar always pays out its item after enough donations (guarantee)
    const owed = def.guarantee && s.uses >= def.guarantee;
    const o = (owed && def.table.find((t) => t.give === 'item')) || roll(g, def.table);
    const got = GIVE[o.give]?.(g, this, o) ?? null;
    if (got === 'item' || got === 'pickup') sfx('secret');
    else if (got !== 'bad' && o.give !== 'fortune') sfx('denied');
    if (got === 'item') g.banner = { text: def.name, sub: def.beggar ? 'IT LOOKS PLEASED' : 'JACKPOT', t: 0, dur: 2.2 };
    if (this.isBeggar) {
      if (got === 'item' && def.leaves) this.anim = { kind: 'leave', t: 0, dur: 1.4, then: () => { s.gone = true; g.particles.burst(this.x, this.y - 10, 16, { colors: [R.bone[3], R.bone[1], R.void[3]], speed: 40, z: 8 }); sfx('secret'); } };
      else this.anim = { kind: got ? 'happy' : 'sad', t: 0, dur: 0.6 };
      return;
    }
    if (s.type === 'shell' && got === 'item' && def.leaves) { this.anim = { kind: 'leave', t: 0, dur: 1.2, then: () => { s.gone = true; } }; return; }
    this.anim = { kind: got ? 'win' : 'lose', t: 0, dur: got ? 0.8 : 0.3 };
    if (def.breakChance && g.lootRng.chance(def.breakChance)) this.breakDown(g, false);
  }

  breakDown(g, bombed) {
    const s = this.state;
    s.broken = true;
    this.anim = null;
    sfx('rockBreak');
    g.particles.burst(this.x, this.y - 18, 14, { colors: [R.iron[3], R.iron[1], R.pale[4]], speed: 70, z: 14, vz: 60 });
    if (bombed) {
      const b = this.def.blast || {};
      if (b.coins) for (let i = 0, n = g.lootRng.int(b.coins[0], b.coins[1]); i < n; i++) g.spawnPickup('coin', this.x, this.y + 10);
      if (b.pickup) g.spawnPickup(b.pickup, this.x, this.y + 10);
    }
  }

  blast(g) {
    const s = this.state;
    if (s.gone) return;
    if (this.isBeggar) {
      // a beggar bursts: blood and rags, and maybe whatever it was saving
      s.gone = true;
      g.particles.burst(this.x, this.y - 10, 30, { colors: [R.blood[3], R.blood[1], this.beggarCloak[2], R.bone[4]], speed: 120, z: 12, vz: 100, life: 1 });
      g.room.paintDecal?.((ctx) => { ctx.fillStyle = R.blood[1]; ctx.fillRect(Math.round(this.x - 8), Math.round(this.y - 2), 16, 5); ctx.fillRect(Math.round(this.x - 4), Math.round(this.y - 4), 9, 9); });
      if (g.lootRng.chance(0.5)) g.spawnPickup(randomPickup(g), this.x, this.y);
      sfx('squish');
      return;
    }
    if (!s.broken) this.breakDown(g, true);
  }

  get beggarCloak() { return BEGGARS[this.state.type]?.cloak || R.wood; }

  renderShadow(ctx, ox, oy) {
    if (this.state.gone) return;
    ctx.drawImage(SHADOW, Math.round(this.x - 13 + ox), Math.round(this.y - 2 + oy));
  }

  render(ctx, ox, oy) {
    const s = this.state;
    if (s.gone) return;
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy), a = this.anim;
    const shakeX = a && (a.kind === 'spin' || a.kind === 'no') ? Math.round(Math.sin(a.t * 60)) : 0;
    if (this.isBeggar) return this.renderBeggar(ctx, x, y, a);
    const type = s.type;
    if (type === 'shell') return this.renderShell(ctx, x, y, a);
    const body = art(`${type}:${!!s.broken}`, () => BODIES[type](!!s.broken));
    const bx = x - Math.floor(body.width / 2) + shakeX, by = y - body.height + 2;
    ctx.drawImage(body, bx, by);
    const blink = Math.floor(this.t * 3) % 2;
    if (type === 'slot') this.renderSlot(ctx, bx, by, a, blink);
    else if (type === 'fortune') this.renderFortune(ctx, bx, by, a);
    else if (type === 'blood') this.renderBlood(ctx, bx, by, a);
    else if (type === 'crane') this.renderCrane(ctx, bx, by, a);
    else if (type === 'confessional') this.renderConfessional(ctx, bx, by, a);
    else if (type === 'restock') drawText(ctx, String(this.price.coins), bx + 15, by + 2, { align: 'center', color: R.blood[3], shadow: false });
    if (s.broken && Math.random() < 0.05) ctx.globalAlpha = 1;
    // what it costs, under it
    if (!s.broken && !s.done) this.renderPrice(ctx, x, y + 4);
  }

  renderPrice(ctx, x, y) {
    const p = this.price;
    const n = p.coins || p.keys || p.bombs || p.hearts || 0;
    const icon = p.hearts ? '#c0262c' : p.keys ? '#c8c0a8' : p.bombs ? '#5a5a62' : '#f0c040';
    const label = p.hearts ? '' : String(n);
    ctx.fillStyle = OUT; ctx.fillRect(x - 6, y, 5, 5);
    ctx.fillStyle = icon; ctx.fillRect(x - 5, y + 1, 3, 3);
    if (label) drawText(ctx, label, x + 1, y, { color: '#e8d9b0' });
    else { ctx.fillStyle = icon; ctx.fillRect(x + 1, y + 1, 3, 3); }
  }

  renderSlot(ctx, bx, by, a, blink) {
    const s = this.state;
    if (s.broken) return;
    // three reels: a symbol each, blurring while they spin
    const syms = [R.blood[5], R.gold[5], R.soul[5], R.bone[5], R.rot[5]];
    for (let i = 0; i < 3; i++) {
      const spinning = a?.kind === 'spin' && a.t < 0.4 + i * 0.2;
      const idx = spinning ? Math.floor(this.t * 30 + i * 3) % syms.length : (s.uses || 0) * 7 % syms.length + i * (a?.kind === 'win' ? 0 : 1);
      ctx.fillStyle = syms[idx % syms.length];
      ctx.fillRect(bx + 9 + i * 5, by + 20 + (spinning ? Math.floor(this.t * 40) % 3 : 1), 4, 4);
    }
    // the lever: pulled down while spinning
    const pulled = a?.kind === 'spin' && a.t < 0.3;
    ctx.fillStyle = OUT; ctx.fillRect(bx + 30, by + (pulled ? 20 : 11), 3, pulled ? 5 : 11);
    ctx.fillStyle = R.iron[4]; ctx.fillRect(bx + 31, by + (pulled ? 21 : 12), 1, pulled ? 3 : 9);
    ctx.fillStyle = R.blood[4]; ctx.fillRect(bx + 30, by + (pulled ? 18 : 9), 3, 3);
    // the crest's eyes and lights flash on a win
    if (a?.kind === 'win' || blink) { ctx.fillStyle = a?.kind === 'win' ? R.gold[5] : R.ember[3]; ctx.fillRect(bx + 5, by + 15, 1, 1); ctx.fillRect(bx + 26, by + 15, 1, 1); }
  }

  renderFortune(ctx, bx, by, a) {
    if (this.state.broken) return;
    // the crystal ball glows in front of the seer; brighter while it thinks
    const k = a?.kind === 'spin' ? 0.6 + Math.sin(a.t * 20) * 0.4 : 0.35 + Math.sin(this.t * 3) * 0.15;
    ctx.globalAlpha = k;
    ctx.fillStyle = R.soul[5]; ctx.fillRect(bx + 12, by + 13, 6, 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = OUT; ctx.fillRect(bx + 11, by + 18, 8, 2);
    ctx.fillStyle = R.soul[4]; ctx.fillRect(bx + 13, by + 14, 2, 2);
    // a ticket slides out when it's done
    if (a?.kind === 'win' || a?.kind === 'lose') { ctx.fillStyle = R.bone[5]; ctx.fillRect(bx + 12, by + 34, 6, Math.min(5, Math.floor(a.t * 20))); }
  }

  renderBlood(ctx, bx, by, a) {
    // the jar: fuller the more you've given; it bubbles while it draws
    const full = Math.min(9, 2 + (this.state.uses || 0) * 2);
    ctx.fillStyle = R.blood[3]; ctx.fillRect(bx + 10, by + 11 - full, 12, full);
    ctx.fillStyle = R.blood[5]; ctx.fillRect(bx + 10, by + 11 - full, 12, 1);
    if (a?.kind === 'spin' && Math.floor(a.t * 12) % 2) { ctx.fillStyle = R.blood[5]; ctx.fillRect(bx + 13, by + 9, 1, 1); ctx.fillRect(bx + 18, by + 7, 1, 1); }
  }

  renderCrane(ctx, bx, by, a) {
    const s = this.state;
    // the prize waiting in the glass
    if (s.prize && !s.broken) { const ic = itemIcon(s.prize); ctx.drawImage(ic, bx + 17 - ic.width / 4, by + 12, ic.width / 2, ic.height / 2); }
    // the claw: drops and comes back up while it's playing
    let drop = 0, cx = bx + 17;
    if (a?.kind === 'spin') { const k = a.t / a.dur; drop = Math.round(Math.sin(k * Math.PI) * 12); cx += Math.round(Math.sin(k * 7) * 3); }
    ctx.fillStyle = R.iron[3]; ctx.fillRect(cx, by + 3, 1, 4 + drop);
    ctx.fillStyle = R.iron[4]; ctx.fillRect(cx - 2, by + 7 + drop, 5, 1);
    ctx.fillRect(cx - 3, by + 8 + drop, 1, 3); ctx.fillRect(cx + 3, by + 8 + drop, 1, 3);
    if (!s.broken && !s.done && Math.floor(this.t * 2) % 2) { ctx.fillStyle = R.ember[5]; ctx.fillRect(bx + 22, by + 32, 1, 1); }
  }

  renderConfessional(ctx, bx, by, a) {
    if (this.state.broken) return;
    // eyes behind the lattice; the curtain sways while someone listens
    const open = a?.kind === 'spin' ? 1 : Math.floor(this.t * 0.7) % 4 === 0 ? 0 : 1;
    if (open) { ctx.fillStyle = a?.kind === 'win' ? R.gold[5] : R.pale[4]; ctx.fillRect(bx + 12, by + 19, 1, 1); ctx.fillRect(bx + 17, by + 19, 1, 1); }
    if (a?.kind === 'spin') { ctx.fillStyle = R.blood[2]; ctx.fillRect(bx + 6 + Math.round(Math.sin(a.t * 14) * 2), by + 30, 18, 1); }
  }

  // the thimblerigger: a hooded dealer behind a table with three shells
  renderShell(ctx, x, y, a) {
    const table = art('shell', () => BODIES.shell());
    const dealer = art('dealer', () => beggarArt('dealer', 'happy', 0));
    ctx.drawImage(dealer, x - 15, y - 40 + (a?.kind === 'spin' ? Math.round(Math.sin(a.t * 16)) : 0));
    ctx.drawImage(table, x - 20, y - 22);
    // three shells (little skulls): they swap places while shuffling; the middle one lifts after
    const pos = [-12, 0, 12];
    for (let i = 0; i < 3; i++) {
      let sx = pos[i];
      if (a?.kind === 'spin') sx = pos[(i + Math.floor(a.t * 8)) % 3] + Math.round(Math.sin(a.t * 30 + i) * 2);
      const lift = (a?.kind === 'win' || a?.kind === 'lose') && i === 1 ? 4 : 0;
      ctx.fillStyle = OUT; ctx.fillRect(x + sx - 4, y - 25 - lift, 9, 7);
      ctx.fillStyle = R.bone[4]; ctx.fillRect(x + sx - 3, y - 24 - lift, 7, 5);
      ctx.fillStyle = R.bone[2]; ctx.fillRect(x + sx - 3, y - 20 - lift, 7, 1);
      ctx.fillStyle = OUT; ctx.fillRect(x + sx - 2, y - 23 - lift, 1, 1); ctx.fillRect(x + sx + 1, y - 23 - lift, 1, 1);
      if (lift && a.kind === 'win') { ctx.fillStyle = R.gold[5]; ctx.fillRect(x + sx - 1, y - 20, 3, 2); }
    }
    if (!this.state.done) this.renderPrice(ctx, x, y + 4);
  }

  renderBeggar(ctx, x, y, a) {
    const type = this.state.type;
    let pose = 'idle', f = Math.floor(this.t * 2) % 2, dy = 0, alpha = 1;
    if (a?.kind === 'paid' || a?.kind === 'happy') { pose = 'happy'; f = Math.floor(a.t * 10) % 2; }
    else if (a?.kind === 'sad' || a?.kind === 'no') pose = 'sad';
    else if (a?.kind === 'leave') {
      // waves, then sinks into the floor and is gone
      pose = 'wave'; f = Math.floor(a.t * 8) % 2;
      if (a.t > 0.8) { dy = Math.round((a.t - 0.8) * 30); alpha = Math.max(0, 1 - (a.t - 0.8) / 0.6); }
    }
    const img = art(`b:${type}:${pose}:${f}`, () => beggarArt(type, pose, f));
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 20, y - 40, 40, 42); ctx.clip();
    ctx.drawImage(img, x - 15, y - 28 + dy);
    ctx.restore();
    if (pose === 'idle') beggarHeld(ctx, type, x + 9, y - 10 + f);
    ctx.globalAlpha = 1;
    if (pose === 'happy') { ctx.fillStyle = R.gold[5]; for (let i = 0; i < 3; i++) ctx.fillRect(x - 8 + i * 8, y - 32 - Math.floor(((a?.t || 0) * 30 + i * 3) % 6), 1, 1); }
    if (!a) this.renderPrice(ctx, x, y + 4);
  }
}
