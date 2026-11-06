// Doors between rooms: state (open/closed/locked/hidden) and their pixel art.
// Art is drawn for the top wall, then rotated for the other three walls.
import { makeCanvas } from '../engine/sprites.js';
import { RNG } from '../engine/rng.js';
import { PAL } from '../data/palette.js';
import { RAMP } from '../data/packArt.js';

// What it takes to get through a door of each kind:
//   key     a key unlocks it for good          coin   a coin unlocks it for good
//   health  only opens while your red hearts are full (challenge rooms)
//   bomb    hidden: blow the wall open
const LOCKS = {
  shop: 'key', library: 'key', vault: 'key', dice: 'key', planetarium: 'key',
  arcade: 'coin',
  challenge: 'health', bosschallenge: 'health',
  secret: 'bomb',
};

export class Door {
  // kind: 'normal' | 'treasure' | 'shop' | 'boss' | 'secret' | any door of src/data/specialRooms.js
  constructor(kind) {
    this.kind = kind;
    this.lock = LOCKS[kind] || null;
    this.locked = this.lock === 'key' || this.lock === 'coin';
    this.hidden = this.lock === 'bomb';
    this.gated = false;              // health doors: shut while you're hurt
    this.closed = false;             // shut while enemies are alive
    this.anim = this.isOpen ? 1 : 0; // 0 = shut, 1 = open
  }

  get isOpen() {
    return !this.locked && !this.hidden && !this.closed && !this.gated;
  }

  update(dt) {
    const target = this.isOpen ? 1 : 0;
    const step = dt * 7;
    this.anim = this.anim < target ? Math.min(target, this.anim + step) : Math.max(target, this.anim - step);
  }

  snap() {
    this.anim = this.isOpen ? 1 : 0;
  }
}

// ---------------------------------------------------------------------------
// Art. Canvas is 40x24; the bottom edge (y = 24) touches the floor.
// The opening is x 10..30, y 4..24.
// Every kind of door has its own frame (stone, gold, bone, iron, flesh...) shaded with our
// palette ramps, and its own decoration, so you know what's behind it before you go in.
// ---------------------------------------------------------------------------
const W = 40, H = 24;
const OX = 10, OY = 4, OW = 20, OH = 20;
const ANGLE = { up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
const R = RAMP;
const OUT = PAL.outline;

// frame: the ramp its stones are cut from; blocks: how they're cut ('stone' | 'smooth' | 'bone'
// | 'flesh' | 'planks'); door: the ramp of the shutters
const STYLE = {
  normal: { frame: ['#1a120e', '#2a1f18', '#3e3026', '#4a3a2f', '#5e4a3c', '#74604e'], blocks: 'stone', door: R.wood },
  shop: { frame: R.wood, blocks: 'planks', door: R.wood },
  treasure: { frame: R.gold, blocks: 'smooth', door: R.wood },
  boss: { frame: R.bone, blocks: 'bone', door: R.flesh },
  curse: { frame: R.blood, blocks: 'flesh', door: R.tar },
  sacrifice: { frame: R.bone, blocks: 'bone', door: R.blood },
  arcade: { frame: R.soul, blocks: 'smooth', door: R.blood },
  challenge: { frame: R.iron, blocks: 'stone', door: R.iron },
  bosschallenge: { frame: R.iron, blocks: 'stone', door: R.blood },
  library: { frame: R.wood, blocks: 'planks', door: R.wood },
  vault: { frame: R.iron, blocks: 'smooth', door: R.iron },
  dice: { frame: R.bone, blocks: 'smooth', door: R.wood },
  bedroom: { frame: R.flesh, blocks: 'planks', door: R.wood },
  miniboss: { frame: R.stone, blocks: 'stone', door: R.wood },
  planetarium: { frame: R.ink, blocks: 'smooth', door: R.ink },
  red: { frame: R.flesh, blocks: 'flesh', door: R.flesh },
  error: { frame: ['#000000', '#202020', '#404040', '#ff40ff', '#40ffff', '#ffffff'], blocks: 'stone', door: R.stone },
  devil: { frame: R.void, blocks: 'stone', door: R.tar },
  angel: { frame: R.pale, blocks: 'smooth', door: R.pale },
  bossrush: { frame: R.gold, blocks: 'stone', door: R.blood },
};

const px = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

// The frame: two pillars and a lintel, cut into blocks and lit from the top-left.
function paintFrame(ctx, st) {
  const f = st.frame;
  const inFrame = (x, y) => x >= 4 && x < 36 && y >= 0 && y < H && !(x >= OX && x < OX + OW && y >= OY);
  for (let y = 0; y < H; y++) for (let x = 4; x < 36; x++) {
    if (!inFrame(x, y)) continue;
    let v = 0.55, seam = false;
    if (st.blocks === 'stone') {
      const row = Math.floor(y / 6), off = (row % 2) * 3;
      seam = y % 6 === 0 || (x + off) % 7 === 0;
      v = 0.5 + (((x + off) * 13 + row * 7) % 5) * 0.05;
    } else if (st.blocks === 'planks') {
      seam = (x % 4 === 0 && y >= OY) || (y < OY && y % 2 === 0 && x % 6 === 0);
      v = 0.5 + ((x >> 2) % 3) * 0.06 + (y % 3 === 0 ? 0.04 : 0);
    } else if (st.blocks === 'bone') {
      const row = Math.floor(y / 4);
      seam = y % 4 === 0;
      v = 0.55 + Math.sin(x * 1.1 + row) * 0.12;
    } else if (st.blocks === 'flesh') {
      v = 0.5 + Math.sin(x * 0.7 + Math.sin(y * 0.5) * 2) * 0.18;
      seam = Math.abs(Math.sin(x * 0.4 + y * 0.9)) < 0.06;
    } else {
      v = 0.62 - y / 60;
    }
    // bevel: light on the outer top/left, dark toward the opening
    if (x === 4 || y === 0) v += 0.3;
    if (x === 35 || x === OX - 1 || (y === OY - 1 && x >= OX && x < OX + OW)) v -= 0.3;
    const i = Math.max(0, Math.min(f.length - 1, Math.floor(v * f.length) - (seam ? 2 : 0)));
    px(ctx, x, y, f[i]);
  }
  // outline round the outside and the opening
  rect(ctx, 3, 0, 1, H, OUT); rect(ctx, 36, 0, 1, H, OUT);
  rect(ctx, OX - 1, OY, 1, OH, OUT); rect(ctx, OX + OW, OY, 1, OH, OUT); rect(ctx, OX, OY - 1, OW, 1, OUT);
}

// Decoration on top of each kind's frame.
const DECOR = {
  normal(ctx) { rect(ctx, 17, 0, 6, 3, '#6a5442'); rect(ctx, 17, 3, 6, 1, OUT); },
  shop(ctx) {
    // a hanging sign with a coin on it
    rect(ctx, 14, 0, 12, 4, OUT); rect(ctx, 15, 0, 10, 3, R.wood[4]);
    rect(ctx, 18, 0, 4, 3, R.gold[4]); px(ctx, 19, 1, R.gold[2]); px(ctx, 20, 0, R.gold[5]);
  },
  treasure(ctx) {
    // a gold frame with a red gem in the keystone, rivets down the pillars, a glint
    rect(ctx, 16, 0, 8, 4, OUT); rect(ctx, 17, 0, 6, 3, R.gold[5]);
    rect(ctx, 18, 0, 4, 2, R.blood[4]); px(ctx, 18, 0, R.blood[5]);
    for (let y = 6; y < H; y += 5) { px(ctx, 6, y, R.gold[5]); px(ctx, 33, y, R.gold[5]); }
    px(ctx, 7, 2, '#fff8d0'); px(ctx, 31, 3, '#fff8d0');
  },
  boss(ctx) {
    // a jaw: teeth along the top of the doorway, horns on the corners, a skull keystone
    for (let x = OX + 1; x < OX + OW - 1; x += 3) { rect(ctx, x, OY, 2, 2, R.bone[5]); px(ctx, x, OY + 2, R.bone[3]); }
    for (const [x, d] of [[3, -1], [35, 1]]) { rect(ctx, x, 5, 2, 4, R.bone[4]); rect(ctx, x + d, 2, 2, 4, R.bone[3]); rect(ctx, x + d * 2, 0, 2, 3, R.bone[2]); }
    rect(ctx, 16, 0, 8, 4, OUT); rect(ctx, 17, 0, 6, 3, R.bone[4]); px(ctx, 18, 1, OUT); px(ctx, 21, 1, OUT);
  },
  curse(ctx) {
    // barbed thorns all round the frame and poking into the doorway (walking through hurts)
    for (let y = 1; y < H; y += 3) {
      rect(ctx, OX - 4, y, 3, 1, R.iron[4]); px(ctx, OX - 5, y, R.iron[5]);
      rect(ctx, OX + OW + 1, y + 1, 3, 1, R.iron[4]); px(ctx, OX + OW + 4, y + 1, R.iron[5]);
      px(ctx, OX, y + 1, R.iron[3]); px(ctx, OX + OW - 1, y, R.iron[3]);
    }
    for (let x = OX; x < OX + OW; x += 3) { rect(ctx, x, OY, 1, 3, R.iron[4]); px(ctx, x, OY + 3, R.blood[4]); }
    for (let x = 6; x < 34; x += 4) { rect(ctx, x, 0, 1, 2, R.iron[4]); px(ctx, x + 1, 1, R.blood[3]); }
  },
  sacrifice(ctx) {
    // bones stacked over the door, blood running down from the lintel
    for (let x = 6; x < 34; x += 5) { rect(ctx, x, 1, 4, 1, R.bone[5]); px(ctx, x, 0, R.bone[4]); px(ctx, x + 3, 2, R.bone[4]); }
    for (const [x, l] of [[OX + 2, 5], [OX + 8, 3], [OX + 14, 6], [6, 8], [33, 5]]) rect(ctx, x, OY, 1, l, R.blood[3]);
  },
  arcade(ctx) {
    // a row of bulbs round the frame, gold coin keystone
    const cols = [R.gold[5], R.blood[5], R.soul[5], R.ember[5]];
    let i = 0;
    for (let x = 5; x < 35; x += 3) px(ctx, x, 1, cols[i++ % 4]);
    for (let y = 4; y < H; y += 3) { px(ctx, 5, y, cols[i++ % 4]); px(ctx, 34, y, cols[i++ % 4]); }
    rect(ctx, 17, 0, 6, 4, OUT); rect(ctx, 18, 0, 4, 3, R.gold[4]); px(ctx, 19, 1, R.gold[2]);
  },
  challenge(ctx) {
    // crossed swords over the door, chains hanging down the pillars
    for (let i = 0; i < 7; i++) { px(ctx, 14 + i, i, R.iron[5]); px(ctx, 25 - i, i, R.iron[5]); }
    rect(ctx, 13, 0, 2, 2, R.wood[3]); rect(ctx, 25, 0, 2, 2, R.wood[3]);
    for (let y = 5; y < H; y += 3) { rect(ctx, 6, y, 2, 2, R.iron[3]); rect(ctx, 32, y + 1, 2, 2, R.iron[3]); }
  },
  bosschallenge(ctx) {
    DECOR.challenge(ctx);
    rect(ctx, 17, 0, 6, 4, OUT); rect(ctx, 18, 0, 4, 3, R.bone[4]); px(ctx, 18, 1, OUT); px(ctx, 21, 1, OUT);
    for (const [x, l] of [[OX + 3, 4], [OX + 12, 6]]) rect(ctx, x, OY, 1, l, R.blood[3]);
  },
  library(ctx) {
    // book spines along the lintel, a candle on each pillar
    const cols = [R.blood[3], R.ink[4], R.rot[3], R.wood[4], R.soul[3]];
    for (let x = 6, i = 0; x < 34; x += 3, i++) { rect(ctx, x, 0, 2, 4, cols[i % 5]); px(ctx, x, 1, R.gold[3]); }
    for (const x of [6, 33]) { rect(ctx, x, 8, 2, 5, R.wax[5]); px(ctx, x, 6, R.ember[5]); px(ctx, x, 7, R.ember[4]); }
  },
  vault(ctx) {
    // a heavy iron frame: rivets and a gold lock plate on the keystone
    for (const y of [3, 9, 15, 21]) for (const x of [5, 8, 31, 34]) px(ctx, x, y, R.iron[5]);
    rect(ctx, 16, 0, 8, 4, OUT); rect(ctx, 17, 0, 6, 3, R.gold[4]); rect(ctx, 19, 1, 2, 2, OUT);
  },
  dice(ctx) {
    // a die for a keystone, pips along the pillars
    rect(ctx, 15, 0, 10, 5, OUT); rect(ctx, 16, 0, 8, 4, R.bone[5]); rect(ctx, 16, 3, 8, 1, R.bone[3]);
    for (const [x, y] of [[17, 1], [19, 2], [21, 1], [22, 2]]) px(ctx, x, y, R.blood[2]);
    for (let y = 6; y < H; y += 6) { rect(ctx, 6, y, 2, 2, R.bone[5]); rect(ctx, 32, y + 3, 2, 2, R.bone[5]); }
  },
  bedroom(ctx) {
    // draped curtains on both sides, tied back
    for (let y = OY; y < H; y++) {
      const w = Math.round(y < 14 ? 3 : Math.max(1, 3 - (y - 14) / 3));
      rect(ctx, OX, y, w, 1, R.flesh[3 + (y % 2)]); rect(ctx, OX + OW - w, y, w, 1, R.flesh[3 + (y % 2)]);
    }
    rect(ctx, OX, 13, 3, 1, R.gold[4]); rect(ctx, OX + OW - 3, 13, 3, 1, R.gold[4]);
    for (let x = 6; x < 34; x += 4) px(ctx, x, 1, R.flesh[5]);
  },
  miniboss(ctx) {
    // claw marks gouged into the stone, a skull keystone
    for (const [x, y] of [[5, 8], [31, 12]]) for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++) px(ctx, x + k * 2 + (i >> 1), y + i, OUT);
    rect(ctx, 16, 0, 8, 4, OUT); rect(ctx, 17, 0, 6, 3, R.bone[4]); px(ctx, 18, 1, OUT); px(ctx, 21, 1, OUT);
  },
  planetarium(ctx) {
    // stars scattered over a night-blue frame, a crescent moon keystone
    for (const [x, y] of [[6, 2], [9, 7], [33, 4], [30, 11], [6, 17], [34, 20], [12, 1], [27, 2]]) px(ctx, x, y, R.pale[5]);
    rect(ctx, 16, 0, 8, 4, OUT); rect(ctx, 17, 0, 6, 3, R.ink[1]);
    rect(ctx, 18, 0, 3, 3, R.gold[5]); rect(ctx, 19, 0, 2, 2, R.ink[1]);
  },
  red(ctx) {
    // raw, wet edges
    for (let y = 1; y < H; y += 3) { rect(ctx, OX - 2, y, 2, 2, R.blood[4]); rect(ctx, OX + OW, y + 1, 2, 2, R.blood[4]); }
  },
  error(ctx) {
    const rng = new RNG('error-door');
    for (let i = 0; i < 40; i++) rect(ctx, rng.int(4, 35), rng.int(0, H - 1), rng.int(1, 4), 1, rng.pick(['#ff40ff', '#40ffff', '#ffff40', '#000000']));
  },
  devil(ctx) {
    // horns on the lintel, a row of small red eyes, tar dripping into the doorway
    for (const [x, d] of [[7, -1], [32, 1]]) { rect(ctx, x, 1, 2, 3, R.tar[4]); px(ctx, x + d, 0, R.tar[5]); }
    for (let x = 11; x < 30; x += 4) { rect(ctx, x, 1, 2, 1, R.blood[4]); px(ctx, x, 1, R.ember[5]); }
    for (const [x, l] of [[OX + 2, 4], [OX + 7, 7], [OX + 13, 3], [OX + 17, 5]]) rect(ctx, x, OY, 1, l, '#000000');
  },
  angel(ctx) {
    // feathered wings folded round the pillars, a halo over the keystone
    for (let i = 0; i < 5; i++) {
      rect(ctx, 4, 4 + i * 4, 4 - (i % 2), 2, R.pale[5]); px(ctx, 4, 5 + i * 4, R.pale[3]);
      rect(ctx, 33 + (i % 2), 4 + i * 4, 3 - (i % 2), 2, R.pale[5]); px(ctx, 35, 5 + i * 4, R.pale[3]);
    }
    for (let x = 16; x < 24; x++) px(ctx, x, 0, R.gold[5]);
    px(ctx, 15, 1, R.gold[4]); px(ctx, 24, 1, R.gold[4]);
  },
  bossrush(ctx) {
    // a crown over the door, gold teeth, horns
    DECOR.boss(ctx);
    rect(ctx, 15, 0, 10, 3, R.gold[4]);
    for (const x of [15, 19, 23]) rect(ctx, x, 0, 2, 1, R.gold[5]);
    px(ctx, 19, 1, R.blood[4]);
  },
};

let frames = null;
let scratch = null, sctx = null;

function makeFrame(kind) {
  const [c, ctx] = makeCanvas(W, H);
  if (kind === 'secret') {
    // A rough hole knocked through the bricks
    const rng = new RNG('secret-door');
    for (let y = OY - 3; y < H; y++) {
      for (let x = OX - 4; x < OX + OW + 4; x++) {
        const edge = Math.min(x - (OX - 4), OX + OW + 3 - x, y - (OY - 3));
        if (edge < 4 && rng.chance(0.75 - edge * 0.15)) {
          ctx.fillStyle = rng.pick([PAL.wall[1], PAL.wall[2], PAL.wall[3], PAL.mortar]);
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return c;
  }
  paintFrame(ctx, STYLE[kind] || STYLE.normal);
  ctx.clearRect(OX, OY, OW, OH);
  DECOR[kind]?.(ctx);
  return c;
}

function art() {
  if (frames) return frames;
  frames = {};
  for (const k of ['secret', ...Object.keys(STYLE)]) frames[k] = makeFrame(k);
  [scratch, sctx] = makeCanvas(W, H);
  return frames;
}

// The two shutters, sliding apart as the door opens; each kind has its own (iron plates on a
// vault, flesh on a boss door, pale stone in the vigil...).
function drawShutters(ctx, door) {
  const half = Math.round((OW / 2) * (1 - door.anim));
  if (half <= 0) return;
  const st = STYLE[door.kind] || STYLE.normal, w = st.door;
  for (const side of [0, 1]) {
    const x = side === 0 ? OX : OX + OW - half;
    rect(ctx, x, OY, half, OH, w[2]);
    for (let p = x + 1; p < x + half; p += 3) rect(ctx, p, OY, 1, OH, w[3]);
    if (w === R.iron) for (const y of [OY + 3, OY + 10, OY + 17]) for (let p = x + 1; p < x + half; p += 3) px(ctx, p, y, R.iron[5]);
    else { rect(ctx, x, OY + 5, half, 2, R.iron[2]); rect(ctx, x, OY + 14, half, 2, R.iron[2]); }
    rect(ctx, side === 0 ? x + half - 1 : x, OY, 1, OH, w[0]);
  }
}

// Chains across a locked vault door.
function drawChains(ctx) {
  for (let i = 0; i < OW + 4; i += 2) {
    const x = OX - 2 + i;
    const y1 = OY + 4 + Math.round(i * 0.55), y2 = OY + 15 - Math.round(i * 0.55);
    rect(ctx, x - 1, y1 - 1, 4, 4, OUT); rect(ctx, x, y1, 2, 2, i % 4 ? R.iron[5] : R.iron[3]);
    rect(ctx, x - 1, y2 - 1, 4, 4, OUT); rect(ctx, x, y2, 2, 2, i % 4 ? R.iron[5] : R.iron[3]);
  }
}

function drawLock(ctx) {
  const x = OX + OW / 2 - 3, y = OY + 7;
  ctx.fillStyle = PAL.outline;
  ctx.fillRect(x, y + 2, 7, 6);
  ctx.fillRect(x + 1, y, 5, 3);
  ctx.fillStyle = '#d8b048';
  ctx.fillRect(x + 1, y + 3, 5, 4);
  ctx.fillStyle = '#8a8a90';
  ctx.fillRect(x + 2, y + 1, 1, 2);
  ctx.fillRect(x + 4, y + 1, 1, 2);
  ctx.fillRect(x + 2, y, 3, 1);
  ctx.fillStyle = PAL.outline;
  ctx.fillRect(x + 3, y + 4, 1, 2);
}

// A coin slot: the door opens for a coin.
function drawCoinSlot(ctx) {
  const x = OX + OW / 2 - 4, y = OY + 6;
  ctx.fillStyle = PAL.outline; ctx.fillRect(x, y, 9, 9);
  ctx.fillStyle = '#f0c040'; ctx.fillRect(x + 1, y + 1, 7, 7);
  ctx.fillStyle = '#b08a30'; ctx.fillRect(x + 1, y + 6, 7, 2);
  ctx.fillStyle = PAL.outline; ctx.fillRect(x + 4, y + 2, 1, 4);
}

// Iron bars: a challenge door stays shut until your red hearts are full.
function drawBars(ctx) {
  ctx.fillStyle = PAL.outline;
  for (let x = OX + 1; x < OX + OW; x += 4) ctx.fillRect(x, OY, 3, OH);
  ctx.fillStyle = '#8a8a96';
  for (let x = OX + 2; x < OX + OW; x += 4) ctx.fillRect(x, OY, 1, OH);
  ctx.fillStyle = '#c0262c';
  ctx.fillRect(OX + OW / 2 - 2, OY + 7, 5, 4);   // a little heart sign: come back healthy
  ctx.fillRect(OX + OW / 2 - 1, OY + 11, 3, 1);
}

// slot: a room door slot { dir, x, y } (see src/game/room.js)
export function drawDoor(ctx, slot, door, ox, oy) {
  const dir = slot.dir;
  if (door.hidden) return;
  const f = art();
  sctx.clearRect(0, 0, W, H);
  // The dark passage
  sctx.fillStyle = PAL.void;
  sctx.fillRect(OX, OY, OW, OH);
  sctx.fillStyle = '#120c0a';
  sctx.fillRect(OX, OY + OH - 4, OW, 4);
  drawShutters(sctx, door);
  if (door.locked && door.kind === 'vault') drawChains(sctx);
  if (door.locked) (door.lock === 'coin' ? drawCoinSlot : drawLock)(sctx);
  if (door.gated) drawBars(sctx);
  sctx.drawImage(f[door.kind] || f.normal, 0, 0);

  const p = slot;
  ctx.save();
  ctx.translate(Math.round(p.x + ox), Math.round(p.y + oy));
  ctx.rotate(ANGLE[dir]);
  ctx.drawImage(scratch, -W / 2, -H);
  ctx.restore();
}
