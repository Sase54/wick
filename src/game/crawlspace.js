// Crawlspaces: a ladder hidden under a rock leads down into a little side-view hole in the
// ground. Walk left and right, climb ladders (no jumping). Usually there's an item on a ledge;
// sometimes a passage at the far end leads to the black market. Climb the entry ladder all the
// way up to get out.
import { VIEW_W, VIEW_H } from '../engine/canvas.js';
import { RNG } from '../engine/rng.js';
import { itemIcon } from './items.js';
import { drawText } from '../ui/text.js';
import { sfx } from '../engine/audio.js';
import { packSprite } from '../engine/packart.js';
import { PixelGrid, ramp } from '../engine/pixelgrid.js';
import { RAMP as R } from '../data/packArt.js';
import { pickupIcon } from './pickups.js';

const T = 24;
// # rock   = wooden ledge (solid)   H ladder   D the black market passage (only if there is one)
const LAYOUT = [
  '################',
  '#H##############',
  '#H######H.......',
  '#H......H====..#',
  '#H......H......#',
  '#H......H......D',
  '#H......H......D',
  '################',
  '################',
];
const COLS = 16, ROWS = 9;
const GRAVITY = 700, WALK = 92, CLIMB = 72, W = 5, H = 16;

export class Crawlspace {
  // state: the floor's crawl record { item, taken, market, coins }; from: 'left' (down the
  // ladder) or 'right' (back from the black market)
  constructor(game, state, from = 'left') {
    this.g = game;
    this.s = state;
    this.t = 0;
    this.climbing = from === 'left';
    this.x = from === 'left' ? 1.5 * T : 14 * T;
    this.y = from === 'left' ? 2 * T : 7 * T;
    this.vy = 0;
    this.facing = from === 'left' ? 'down' : 'left';
    state.coins ??= [{ x: 4.5 * T, got: false }, { x: 6.5 * T, got: false }];
    this.art = makeBackdrop(state.market);
  }

  tile(c, r) {
    const ch = (LAYOUT[r] || '')[c];
    if (ch === 'D' && !this.s.market) return '#';
    return ch ?? '#';
  }
  solid(c, r) { const ch = this.tile(c, r); return ch === '#' || ch === '='; }
  ladderAt(x, yTop, yBot) {
    const c = Math.floor(x / T);
    for (let r = Math.floor(yTop / T); r <= Math.floor(yBot / T); r++) if (this.tile(c, r) === 'H') return c;
    return -1;
  }

  update(dt, input) {
    const g = this.g, p = g.player, mv = input.move;
    this.t += dt;
    p.time += dt;
    // climbing: on a ladder and pushing up/down (or already on it)
    const lad = this.ladderAt(this.x, this.y - H, this.y + 1);
    if (lad >= 0 && Math.abs(mv.y) > 0.4) this.climbing = true;
    if (lad < 0) this.climbing = false;
    if (this.climbing) {
      this.x += ((lad + 0.5) * T - this.x) * Math.min(1, dt * 12);
      this.vy = mv.y * CLIMB;
      this.y += this.vy * dt;
      // the rock above stops your head
      const headRow = Math.floor((this.y - H) / T);
      if (this.vy < 0 && this.solid(Math.floor(this.x / T), headRow)) this.y = (headRow + 1) * T + H;
      // standing on the ground at the foot of a ladder
      if (this.solid(Math.floor(this.x / T), Math.floor(this.y / T))) { this.y = Math.floor(this.y / T) * T; this.climbing = Math.abs(mv.y) > 0.4 && mv.y < 0; }
      // the top of a ledge ladder: step off onto it
      if (Math.abs(mv.x) > 0.4) {
        const side = Math.floor((this.x + Math.sign(mv.x) * T * 0.6) / T), base = Math.floor((this.y + 1) / T);
        // a ledge whose top is near your feet (a little above or below)
        for (const row of [base, base + 1]) {
          const d = this.y - row * T;
          if (this.solid(side, row) && !this.solid(side, row - 1) && d < 16 && d > -12) {
            this.climbing = false;
            this.y = row * T;
            this.x = side * T + (mv.x > 0 ? W + 1 : T - W - 1);   // onto the ledge's edge
            break;
          }
        }
      }
      this.facing = 'up';
    } else {
      this.vy = Math.min(300, this.vy + GRAVITY * dt);
      let ny = this.y + this.vy * dt;
      if (this.solid(Math.floor((this.x - W) / T), Math.floor(ny / T)) || this.solid(Math.floor((this.x + W) / T), Math.floor(ny / T))) {
        ny = Math.floor(ny / T) * T;
        this.vy = 0;
      }
      this.y = ny;
      const speed = WALK * (p.stats.speed || 1);
      const nx = this.x + mv.x * speed * dt;
      const blocked = (x) => this.solid(Math.floor(x / T), Math.floor((this.y - 2) / T)) || this.solid(Math.floor(x / T), Math.floor((this.y - H) / T));
      if (!blocked(nx + Math.sign(mv.x) * W)) this.x = nx;
      if (Math.abs(mv.x) > 0.2) this.facing = mv.x > 0 ? 'right' : 'left';
    }
    p.head = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } }[this.facing];
    this.x = Math.max(T + W, Math.min(COLS * T - W, this.x));

    // out: up the entry ladder; or through the far passage to the black market
    if (this.y < 1.8 * T && this.x < 2 * T) { sfx('trapdoor'); g.leaveCrawlspace(); return; }
    if (this.s.market && this.x > 15 * T - 8 && this.y > 5 * T) { g.enterBlackMarket(); return; }

    // the item on the ledge, and a couple of coins on the floor
    if (this.s.item && !this.s.taken && Math.hypot(this.x - 11.5 * T, this.y - 3 * T) < 12) {
      const id = this.s.item;
      this.s.taken = true;
      this.s.item = null;
      g.giveItem(id);
    }
    for (const c of this.s.coins) {
      if (!c.got && Math.abs(this.x - c.x) < 10 && this.y > 6 * T) { c.got = true; p.coins = Math.min(99, p.coins + 1); sfx('coin'); }
    }
    if (g.banner) g.banner.t += dt;
  }

  render(ctx) {
    const g = this.g, p = g.player;
    const ox = Math.round((VIEW_W - COLS * T) / 2), oy = Math.round((VIEW_H - ROWS * T) / 2);
    ctx.drawImage(this.art, ox, oy);
    // the item on the ledge
    if (this.s.item && !this.s.taken) {
      const icon = itemIcon(this.s.item), bob = Math.round(Math.sin(this.t * 2.5) * 1.5);
      ctx.drawImage(icon, ox + 11.5 * T - icon.width / 2, oy + 3 * T - icon.height - 2 + bob);
    }
    for (const c of this.s.coins) {
      if (c.got) continue;
      const x = Math.round(ox + c.x), y = oy + 7 * T, icon = pickupIcon('coin');
      ctx.drawImage(icon, x - Math.floor(icon.width / 2), y - icon.height + Math.round(Math.sin(this.t * 3 + c.x) * 1));
    }
    p.renderCopy(ctx, this.x, this.y - 2, ox, oy, 1);
    if (this.s.market) drawText(ctx, '>', ox + 15 * T - 2, oy + 5 * T + 6, { color: '#c0262c' });
    drawText(ctx, 'CRAWLSPACE', VIEW_W / 2, oy + 8 * T + 6, { align: 'center', color: '#8a7a62' });
  }
}

// The hole itself, painted once: lumpy earth (pack texture) round a dark dirt hollow, wooden
// ledges and ladders, roots and bones, the black market's arch, a dim glow down the shaft.
function makeBackdrop(market) {
  const c = document.createElement('canvas');
  c.width = COLS * T; c.height = ROWS * T;
  const ctx = c.getContext('2d');
  const rng = new RNG('crawlspace');
  const at = (r, col) => {
    const ch = LAYOUT[r]?.[col];
    return ch === 'D' && !market ? '#' : ch;
  };
  // the hollow: dark dirt, or a flat fill if the pack art is missing
  const back = [packSprite('darkDirt:0'), packSprite('darkDirt:1')];
  ctx.fillStyle = '#0c0806'; ctx.fillRect(0, 0, c.width, c.height);
  if (back[0]) for (let y = 0; y < c.height; y += back[0].height) for (let x = 0; x < c.width; x += back[0].width) ctx.drawImage(rng.pick(back), x, y);
  const earth = [0, 1, 2].map((i) => packSprite(`earth:${i}`)).filter(Boolean);
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      const ch = at(r, col), x = col * T, y = r * T;
      if (ch === '#') {
        // a 24px window into a 32px earth tile
        if (earth.length) ctx.drawImage(rng.pick(earth), rng.int(0, 8), rng.int(0, 8), T, T, x, y, T, T);
        else { ctx.fillStyle = '#2a1e16'; ctx.fillRect(x, y, T, T); }
        // the edges facing the hollow: a dark rim and a lit lip on top
        if (at(r - 1, col) !== '#' && r > 0) { ctx.fillStyle = '#7a5e3c'; ctx.fillRect(x, y, T, 1); ctx.fillStyle = '#5a4229'; ctx.fillRect(x, y + 1, T, 1); }
        if (at(r + 1, col) && at(r + 1, col) !== '#') { ctx.fillStyle = '#0a0604'; ctx.fillRect(x, y + T - 2, T, 2); }
        if (at(r, col - 1) && at(r, col - 1) !== '#') { ctx.fillStyle = '#0a0604'; ctx.fillRect(x, y, 1, T); }
        if (at(r, col + 1) && at(r, col + 1) !== '#') { ctx.fillStyle = '#0a0604'; ctx.fillRect(x + T - 1, y, 1, T); }
      } else if (ch === '=') {
        // a ledge of planks on two posts
        const g = new PixelGrid(T, 18);
        for (let i = 0; i < T; i++) for (let j = 0; j < 6; j++) g.set(i, j, ramp(R.wood, 0.75 - j / 8 - (i % 8 === 0 ? 0.3 : 0), i, j));
        for (const px of [3, T - 6]) for (let j = 6; j < 18; j++) for (let k = 0; k < 3; k++) g.set(px + k, j, ramp(R.wood, 0.5 - k * 0.15, px + k, j));
        g.set(1, 2, R.iron[4]); g.set(T - 2, 2, R.iron[4]);
        ctx.drawImage(g.outline('#0a0606').toCanvas(), x, y);
      } else if (ch === 'H') {
        // a ladder: two rails and rungs, lit from the left
        const g = new PixelGrid(T, T);
        for (let j = 0; j < T; j++) { g.set(5, j, R.wood[4]); g.set(6, j, R.wood[2]); g.set(T - 7, j, R.wood[4]); g.set(T - 6, j, R.wood[2]); }
        for (let k = 3; k < T; k += 6) for (let i = 7; i < T - 7; i++) { g.set(i, k, R.wood[3]); g.set(i, k + 1, R.wood[1]); }
        ctx.drawImage(g.outline('#0a0606').toCanvas(), x, y);
      } else if (ch === 'D') {
        // the way to the black market: a black arch with a red lantern beside it
        ctx.fillStyle = '#030202'; ctx.fillRect(x, y, T, T);
        if (r > 0 && at(r - 1, col) !== 'D') {
          for (let i = 0; i < T; i++) { const h = Math.round(Math.sqrt(Math.max(0, 1 - ((i - T) / T) ** 2)) * 8); ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + i, y, 1, 8 - h); }
          const lantern = packSprite('skullLantern');
          if (lantern) ctx.drawImage(lantern, x - 14, y - 4, 16, 16);
        }
      }
    }
  }
  // roots hanging from the ceiling, bones in the dirt along the floor
  for (let i = 0; i < 9; i++) {
    const col = rng.int(2, COLS - 2), r = [...Array(ROWS).keys()].find((rr) => at(rr, col) !== '#' && at(rr - 1, col) === '#');
    if (r === undefined) continue;
    let x = col * T + rng.int(2, T - 2);
    for (let y = r * T, l = rng.int(5, 14); l > 0; l--, y++) { ctx.fillStyle = l > 3 ? '#3a2a18' : '#2a1e12'; ctx.fillRect(x, y, 1, 1); if (rng.chance(0.25)) x += rng.pick([-1, 1]); }
  }
  for (let i = 0; i < 6; i++) {
    const x = rng.int(3 * T, 14 * T), y = 7 * T + rng.int(4, 18);
    ctx.fillStyle = rng.pick(R.bone.slice(2, 5)); ctx.fillRect(x, y, rng.int(3, 6), 1);
    if (rng.chance(0.3)) { ctx.fillStyle = R.bone[4]; ctx.fillRect(x, y - 2, 3, 3); ctx.fillStyle = '#0a0606'; ctx.fillRect(x + 1, y - 1, 1, 1); }
  }
  // a little light falls down the entry shaft
  const grd = ctx.createRadialGradient(1.5 * T, 1 * T, 4, 1.5 * T, 3 * T, 110);
  grd.addColorStop(0, 'rgba(255,220,160,0.18)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}
