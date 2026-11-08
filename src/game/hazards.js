// Variant hazards: things built into a room that make each floor variant play differently
// (rat holes, webs, fire jets, currents...). Which ones appear is set per variant in
// src/data/variants.js as { type, chance, max }. Each hazard has update(dt, g) and draws
// itself on the floor (renderFloor) or the wall.
import { sfx } from '../engine/audio.js';
import { TILE } from './constants.js';
import { ROOM_MINION_CAP } from '../data/enemies.js';
import { TUNING } from '../data/tuning.js';

// ---- Rat hole (The Undercroft) ------------------------------------------------------------
// A hole at the foot of a wall. While the room's own enemies are alive, a gnawer squeezes out
// every several seconds (its eyes glint and it squeaks first). One of its rats alive at a time.
class RatHole {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.dir = dir;     // which wall: 'up' | 'left' | 'right'
    this.t = 2 + Math.random() * 2;
    this.warn = 0;
    this.rats = [];
  }

  update(dt, g) {
    this.rats = this.rats.filter((r) => !r.dead);
    const others = g.enemies.some((e) => !this.rats.includes(e) && !e.fromHole);
    const minions = g.enemies.filter((e) => e.minion && !e.dead).length;
    if (!others || this.rats.length >= 1 || minions >= ROOM_MINION_CAP) { this.warn = 0; return; }
    if (this.warn > 0) {
      this.warn -= dt;
      if (this.warn <= 0 && Math.hypot(g.player.x - this.x, g.player.y - this.y) < 50) { this.warn = 0; this.t = 1.5; return; }
      if (this.warn <= 0) {
        const [dx, dy] = { up: [0, 1], left: [1, 0], right: [-1, 0] }[this.dir];
        const rat = g.spawnEnemy('gnawer', this.x + dx * 10, this.y + dy * 10, { delay: 0.1 });
        rat.fromHole = true;
        rat.minion = true;
        rat.kx = dx * 60;
        rat.ky = dy * 60;
        this.rats.push(rat);
        g.particles.burst(this.x, this.y, 6, { colors: ['#4a3e32', '#2e241d'], speed: 40, z: 3 });
        this.t = 7 + Math.random() * 4;
      }
      return;
    }
    this.t -= dt;
    if (this.t <= 0) { this.warn = 0.7; sfx('squeak'); }
  }

  renderFloor(ctx, ox, oy, g) {
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    const horiz = this.dir === 'up';
    const w = horiz ? 12 : 7, h = horiz ? 7 : 11;
    ctx.fillStyle = '#060404';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = '#120c0a';
    ctx.fillRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2);
    // glinting eyes when something is about to come out
    const blink = this.warn > 0 ? Math.floor(g.time * 12) % 2 === 0 : Math.floor(g.time * 0.7 + this.x) % 5 === 0;
    if (blink) {
      ctx.fillStyle = this.warn > 0 ? '#ff4a2a' : '#c8a060';
      ctx.fillRect(x - 2, y - 1, 1, 1);
      ctx.fillRect(x + 1, y - 1, 1, 1);
    }
  }
}

function placeRatHoles(g, room, rng, spec) {
  const n = rng.int(1, spec.max);
  const out = [];
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const dir = rng.pick(['up', 'left', 'right']);
    let x, y, c, r;
    if (dir === 'up') { c = rng.int(1, room.cols - 2); r = 0; x = room.x0 + c * TILE + TILE / 2; y = room.y0 + 2; }
    else { r = rng.int(1, room.rows - 2); c = dir === 'left' ? 0 : room.cols - 1; x = dir === 'left' ? room.x0 + 3 : room.R - 3; y = room.y0 + r * TILE + TILE / 2; }
    if (room.isWalkSolid(c, r)) continue;
    // not in front of a door, not on top of another hole
    if (room.slots.some((s) => Math.hypot(s.x - x, s.y - y) < 30)) continue;
    if (out.some((h) => Math.hypot(h.x - x, h.y - y) < 40)) continue;
    out.push(new RatHole(x, y, dir));
  }
  return out;
}

// ---- Sticky web (The Weeping Hollow) -------------------------------------------------------
// A web on the floor. Walking through it slows you to under half speed (flying is fine).
// Your shots tear it (three hits), burning shots and bombs destroy it at once.
// Webspitters and Biglegs leave new ones.
class Web {
  constructor(x, y, r = 13) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.hp = 3;
    this.t = 0;
    this.hitBy = new WeakSet();
    this.seed = Math.random() * 6;
  }

  update(dt, g) {
    this.t += dt;
    const p = g.player;
    if (!p.flying && ((p.x - this.x) / this.r) ** 2 + ((p.y - this.y) / (this.r * 0.7)) ** 2 < 1) p.webT = 0.12;
    for (const s of g.projectiles.pool.live) {
      if (s.team !== 'player' || s.removed || this.hitBy.has(s)) continue;
      if (Math.hypot(s.x - this.x, s.y - this.y) > this.r) continue;
      this.hitBy.add(s);
      this.hp -= s.burn ? 3 : 1;
      sfx('webTear');
      g.particles.burst(this.x, this.y, 4, { colors: ['#c8c4b8', '#e8e4d8'], speed: 30, z: 2 });
    }
    if (this.hp <= 0) this.dead = true;
  }

  // bombs clear webs
  blast() { this.dead = true; }

  renderFloor(ctx, ox, oy) {
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    const a = Math.min(1, this.t * 4) * (0.35 + this.hp * 0.15);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#d8d4c8';
    const n = 8;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + this.seed;
      const ex = Math.cos(ang) * this.r, ey = Math.sin(ang) * this.r * 0.7;
      for (let k = 2; k <= this.r; k += 2) ctx.fillRect(Math.round(x + (ex * k) / this.r), Math.round(y + (ey * k) / this.r), 1, 1);
    }
    for (const k of [0.35, 0.65, 0.95]) {
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2 + this.seed;
        ctx.fillRect(Math.round(x + Math.cos(ang) * this.r * k), Math.round(y + Math.sin(ang) * this.r * 0.7 * k), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Leave a web somewhere (web globs, landing Biglegs). Rooms keep at most 14.
export function addWeb(g, x, y) {
  const room = g.room;
  if (!room) return;
  const webs = room.hazards.filter((h) => h instanceof Web && !h.dead);
  if (webs.some((w) => Math.hypot(w.x - x, w.y - y) < 10)) return;
  if (webs.length >= 14) webs[0].dead = true;
  room.hazards.push(new Web(x, y));
}

function placeWebs(g, room, rng, spec) {
  const out = [];
  const n = rng.int(1, spec.max);
  for (let i = 0; i < n * 5 && out.length < n; i++) {
    const p = room.randomFreeSpot(rng, 1);
    if (room.slots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 50)) continue;
    if (out.some((w) => Math.hypot(w.x - p.x, w.y - p.y) < 30)) continue;
    out.push(new Web(p.x + rng.int(-5, 5), p.y + rng.int(-5, 5), rng.int(11, 16)));
  }
  return out;
}

// ---- Lobbed things (Kindler coals...) -----------------------------------------------------
// Flies in an arc to a spot chosen at the throw; a marker on the floor shows where it will land.
class Lob {
  constructor(x0, y0, x1, y1, { flight = 0.9, onLand, color = '#f08a24' } = {}) {
    Object.assign(this, { x0, y0, x1, y1, flight, onLand, color, t: 0 });
    this.x = x1; this.y = y1;
  }

  update(dt, g) {
    this.t += dt;
    if (this.t >= this.flight) { this.dead = true; this.onLand?.(g, this.x1, this.y1); }
  }

  renderFloor(ctx, ox, oy, g) {
    const k = Math.min(1, this.t / this.flight);
    const r = 4 + k * 7;
    ctx.globalAlpha = 0.35 + 0.4 * k + 0.15 * Math.sin(g.time * 25);
    ctx.fillStyle = '#ff4a2a';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.fillRect(Math.round(this.x1 + Math.cos(a) * r + ox), Math.round(this.y1 + Math.sin(a) * r * 0.55 + oy), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // drawn with the entities: the coal itself, high in the air
  renderShadow() {}
  render(ctx, ox, oy, g) {
    const k = Math.min(1, this.t / this.flight);
    const x = this.x0 + (this.x1 - this.x0) * k, y = this.y0 + (this.y1 - this.y0) * k - Math.sin(k * Math.PI) * 50;
    ctx.fillStyle = '#160f0c';
    ctx.fillRect(Math.round(x - 3 + ox), Math.round(y - 3 + oy), 6, 6);
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(x - 2 + ox), Math.round(y - 2 + oy), 4, 4);
    ctx.fillStyle = '#ffd25a';
    ctx.fillRect(Math.round(x - 1 + ox), Math.round(y - 1 + oy), 2, 1);
    if (Math.random() < 0.5) g.particles.spawn(x, y + 10, { z: 10, vz: 10, life: 0.3, color: '#f08a24', size: 1 });
  }
}

export function addLob(g, x0, y0, x1, y1, opts) {
  g.room.hazards.push(new Lob(x0, y0, x1, y1, opts));
}

// A ring of fire patches (landing coals, bursting ashwalkers, the Tallow Pyre).
export function fireBurst(g, x, y, n, r = 14) {
  addCreep(g, x, y, 'fire');
  for (let i = 0; i < n - 1; i++) {
    const a = (i / Math.max(1, n - 1)) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.7;
    if (!g.room.isWalkSolid(g.room.colAt(px), g.room.rowAt(py))) addCreep(g, px, py, 'fire');
  }
}

// ---- Fireplace (The Smolder) ----------------------------------------------------------------
// A pile of burning junk. Touching it hurts; four shots put it out (a bomb too).
class Fireplace {
  constructor(x, y) {
    this.x = x; this.y = y; this.r = 9; this.hp = this.maxHp = TUNING.obstacles.fireHits; this.t = Math.random() * 3;
    this.hitBy = new WeakSet();
  }

  update(dt, g) {
    this.t += dt;
    if (this.out) return;
    const p = g.player;
    if (!p.flying && Math.hypot(p.x - this.x, p.y - this.y) < this.r + p.r - 2) p.hurt(1, 'A Fireplace', g, this.x, this.y);
    for (const s of g.projectiles.pool.live) {
      if (s.team !== 'player' || s.removed || this.hitBy.has(s) || Math.hypot(s.x - this.x, s.y - this.y) > this.r + s.r) continue;
      this.hitBy.add(s);
      s.removed = true;
      g.projectiles.splash?.(s, true);
      this.hp--;
      sfx('steam');
      if (this.hp <= 0) this.snuff(g);
    }
    if (Math.random() < dt * 8) g.particles.spawn(this.x + (Math.random() - 0.5) * 10, this.y - 6, { z: 8, vz: 30, gravity: -20, life: 0.6, color: Math.random() < 0.5 ? '#f08a24' : '#ffd25a', size: 1 });
  }

  snuff(g) {
    this.out = true;
    g.rollDrops('fireplace', this.x, this.y);   // the ashes sometimes hold something
    g.particles.burst(this.x, this.y - 6, 12, { colors: ['#5a524a', '#3a3430', '#8a8078'], speed: 40, z: 8, vz: 50, life: 0.8 });
  }

  blast(g) { if (!this.out) this.snuff(g); }

  renderFloor(ctx, ox, oy, g) {
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(x - 9, y + 1, 18, 4);
    ctx.fillStyle = '#3a2a20';
    for (const [dx, dy, w] of [[-8, 0, 7], [1, -1, 8], [-4, 2, 9]]) ctx.fillRect(x + dx, y + dy, w, 2);
    if (this.out) {
      ctx.fillStyle = '#4a4440';
      ctx.fillRect(x - 5, y - 2, 10, 2);
      return;
    }
    const k = this.hp / this.maxHp, f = Math.floor(this.t * 10) % 2;
    const h = Math.round((8 + f * 2) * (0.5 + k * 0.5));
    for (const [col, w, hh] of [['#e04a18', 7, h], ['#ff8a2a', 5, h - 2], ['#ffd25a', 3, h - 5]]) {
      if (hh <= 0) continue;
      ctx.fillStyle = col;
      for (let i = 0; i < hh; i++) {
        const ww = Math.max(1, Math.round(w * (1 - i / hh)));
        ctx.fillRect(x - Math.floor(ww / 2) + (i > hh / 2 ? (f ? 1 : -1) : 0), y - i, ww, 1);
      }
    }
  }
}

function placeFireplaces(g, room, rng, spec) {
  const out = [];
  const n = rng.int(1, spec.max);
  for (let i = 0; i < n * 5 && out.length < n; i++) {
    const p = room.randomFreeSpot(rng, 1);
    if (room.slots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 56)) continue;
    if (out.some((f) => Math.hypot(f.x - p.x, f.y - p.y) < 40)) continue;
    out.push(new Fireplace(p.x, p.y));
  }
  return out;
}

// ---- Fire jet (The Smolder) -----------------------------------------------------------------
// A brass nozzle in the wall. It glows and hisses (0.9 s, the danger zone shows), then blasts a
// stream of fire 3 tiles into the room for a second.
class FireJet {
  constructor(x, y, dx, dy) {
    Object.assign(this, { x, y, dx, dy, t: 1.5 + Math.random() * 2, state: 'idle', len: TILE * 3 });
  }

  update(dt, g) {
    const fighting = g.enemies.length > 0;
    this.t -= dt;
    if (this.state === 'idle') {
      if (this.t <= 0 && fighting) { this.state = 'warn'; this.t = 0.9; sfx('steam'); }
    } else if (this.state === 'warn') {
      if (this.t <= 0) { this.state = 'fire'; this.t = 1; sfx('whoosh'); }
    } else {
      // the stream hurts you if you stand in it
      const p = g.player;
      const along = (p.x - this.x) * this.dx + (p.y - this.y) * this.dy;
      const across = Math.abs((p.x - this.x) * this.dy - (p.y - this.y) * this.dx);
      if (!p.dead && along > 0 && along < this.len && across < 9) p.hurt(1, 'A Fire Jet', g, this.x, this.y);
      if (Math.random() < dt * 40) {
        const d = Math.random() * this.len;
        g.particles.spawn(this.x + this.dx * d, this.y + this.dy * d, { z: 6, vz: 20, vx: this.dx * 60, vy: this.dy * 60, life: 0.3, color: Math.random() < 0.5 ? '#ff8a2a' : '#ffd25a', size: 2 });
      }
      if (this.t <= 0) { this.state = 'idle'; this.t = 2.5 + Math.random() * 2; }
    }
  }

  renderFloor(ctx, ox, oy, g) {
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    // the nozzle
    ctx.fillStyle = '#160f0c';
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = this.state === 'warn' ? (Math.floor(g.time * 16) % 2 ? '#ff4a2a' : '#ffd25a') : '#8a6a20';
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#0a0706';
    ctx.fillRect(x - 1, y - 1, 2, 2);
    if (this.state === 'warn') {
      ctx.globalAlpha = 0.25 + 0.25 * (1 - this.t / 0.9);
      ctx.fillStyle = '#ff4a2a';
      for (let d = 8; d < this.len; d += 5) ctx.fillRect(Math.round(x + this.dx * d - 1), Math.round(y + this.dy * d - 1), 2, 2);
      ctx.globalAlpha = 1;
    } else if (this.state === 'fire') {
      for (let d = 4; d < this.len; d += 2) {
        const w = 3 + Math.round(Math.sin(d * 0.4 + g.time * 30) * 1.5) + Math.round(d / 18);
        ctx.fillStyle = d < 18 ? '#fff3c0' : Math.random() < 0.5 ? '#ff8a2a' : '#e04a18';
        ctx.fillRect(Math.round(x + this.dx * d - (this.dy ? w : 1)), Math.round(y + this.dy * d - (this.dx ? w : 1)), this.dy ? w * 2 : 2, this.dx ? w * 2 : 2);
      }
    }
  }
}

function placeFireJets(g, room, rng, spec) {
  const out = [];
  const n = rng.int(1, spec.max);
  for (let i = 0; i < n * 6 && out.length < n; i++) {
    const dir = rng.pick(['up', 'left', 'right', 'down']);
    let c, r, x, y, dx = 0, dy = 0;
    if (dir === 'up' || dir === 'down') {
      c = rng.int(1, room.cols - 2); r = dir === 'up' ? 0 : room.rows - 1;
      x = room.x0 + c * TILE + TILE / 2; y = dir === 'up' ? room.y0 + 1 : room.B - 1; dy = dir === 'up' ? 1 : -1;
    } else {
      r = rng.int(1, room.rows - 2); c = dir === 'left' ? 0 : room.cols - 1;
      x = dir === 'left' ? room.x0 + 1 : room.R - 1; y = room.y0 + r * TILE + TILE / 2; dx = dir === 'left' ? 1 : -1;
    }
    if (room.isWalkSolid(c, r)) continue;
    if (room.slots.some((s) => Math.hypot(s.x - x, s.y - y) < 40)) continue;
    if (out.some((j) => Math.hypot(j.x - x, j.y - y) < 50)) continue;
    out.push(new FireJet(x, y, dx, dy));
  }
  return out;
}

// ---- Falling rocks (The Grotto) -------------------------------------------------------------
// A rock drops from the ceiling: its shadow shows up and grows (0.9 s) before it lands. Getting
// hit hurts, it shatters into gravel. Cracked ceilings drop them now and then during a fight;
// the Stonemaw and the Grotto bosses shake them loose too.
class FallingRock {
  constructor(x, y, delay = 0.9) {
    Object.assign(this, { x, y, t: 0, delay, size: 5 + Math.floor(Math.random() * 3) });
  }

  update(dt, g) {
    this.t += dt;
    if (this.t < this.delay) return;
    this.dead = true;
    sfx('rockFall');
    const p = g.player;
    if (!p.dead && Math.hypot(p.x - this.x, p.y - this.y) < 11 + p.r) p.hurt(1, 'A Falling Rock', g, this.x, this.y);
    for (const e of g.enemies) if (e.hittable && !e.def.mini && Math.hypot(e.x - this.x, e.y - this.y) < 10 + e.r) e.takeHit(6, 0, 1, 40, g);
    g.particles.burst(this.x, this.y, 10, { colors: ['#6a6058', '#4a423c', '#8a8278'], speed: 60, z: 2, vz: 40 });
    g.effects?.ring(this.x, this.y, 12, 'rgba(160,150,140,0.6)', 0.2);
  }

  renderFloor(ctx, ox, oy, g) {
    const k = Math.min(1, this.t / this.delay);
    const rx = Math.round(4 + k * 7), ry = Math.max(2, Math.round(rx * 0.5));
    ctx.globalAlpha = 0.25 + 0.4 * k;
    ctx.fillStyle = '#000';
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(1 - (y / (ry + 0.01)) ** 2));
      ctx.fillRect(Math.round(this.x - half + ox), Math.round(this.y + y + oy), half * 2, 1);
    }
    ctx.globalAlpha = 1;
  }

  renderShadow() {}
  // the rock itself, falling in the last part of the wait
  render(ctx, ox, oy) {
    const k = this.t / this.delay;
    if (k < 0.55) return;
    const h = (1 - (k - 0.55) / 0.45) * 90, s = this.size;
    const x = Math.round(this.x - s + ox), y = Math.round(this.y - h - s * 2 + oy);
    ctx.fillStyle = '#160f0c'; ctx.fillRect(x - 1, y - 1, s * 2 + 2, s * 2 + 2);
    ctx.fillStyle = '#6a6058'; ctx.fillRect(x, y, s * 2, s * 2);
    ctx.fillStyle = '#8a8278'; ctx.fillRect(x + 1, y + 1, s, s - 1);
    ctx.fillStyle = '#4a423c'; ctx.fillRect(x + s, y + s, s - 1, s - 1);
  }
}

export function addRockfall(g, x, y, delay) {
  const room = g.room;
  const c = room.colAt(x), r = room.rowAt(y);
  if (!room.inBounds(c, r) || room.isWalkSolid(c, r)) return;
  room.hazards.push(new FallingRock(x, y, delay));
}

// Rocks rain down on random spots around the player.
export function rockRain(g, n, spread = 90, delay = 0.9) {
  const p = g.player;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = 16 + Math.random() * spread;
    addRockfall(g, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.8, delay + Math.random() * 0.4);
  }
}

// A cracked ceiling: while there's fighting, every few seconds a rock comes down near you.
class CrackedCeiling {
  constructor() { this.t = 3 + Math.random() * 2; }
  update(dt, g) {
    if (!g.enemies.length) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 3.5 + Math.random() * 2.5;
    const p = g.player, a = Math.random() * Math.PI * 2, d = Math.random() * 40;
    addRockfall(g, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7, 1);
    g.particles.spawn(p.x + Math.cos(a) * d, p.y - 70, { z: 0, vz: -10, life: 0.8, color: '#5a524a', size: 1 });
  }
}

function placeRockfall() { return [new CrackedCeiling()]; }

// ---- Dart trap (The Ossuary) ----------------------------------------------------------------
// A carved skull in the wall. During a fight its eyes light up (0.7 s, its line shows) and it
// spits a dart straight across the room.
class DartTrap {
  constructor(x, y, dx, dy) {
    Object.assign(this, { x, y, dx, dy, t: 1.5 + Math.random() * 2.5, warn: 0 });
  }

  update(dt, g) {
    if (!g.enemies.length) { this.warn = 0; return; }
    if (this.warn > 0) {
      this.warn -= dt;
      if (this.warn <= 0) {
        sfx('dart');
        g.projectiles.spawn({
          x: this.x + this.dx * 6, y: this.y + this.dy * 6, z: 6, vx: this.dx * 150, vy: this.dy * 150,
          r: 3, damage: 1, team: 'enemy', range: 400, source: 'A Dart Trap', style: 'bone',
        });
        this.t = 3 + Math.random() * 2;
      }
      return;
    }
    this.t -= dt;
    if (this.t <= 0) { this.warn = 0.7; sfx('clink'); }
  }

  renderFloor(ctx, ox, oy, g) {
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    ctx.fillStyle = '#160f0c'; ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.fillStyle = '#b8b09a'; ctx.fillRect(x - 4, y - 4, 8, 7);
    ctx.fillStyle = '#d8d0b8'; ctx.fillRect(x - 3, y - 4, 5, 2);
    ctx.fillStyle = '#8a8270'; ctx.fillRect(x - 3, y + 3, 6, 2);
    const lit = this.warn > 0 && Math.floor(g.time * 16) % 2;
    ctx.fillStyle = lit ? '#ff4a2a' : '#1a1410';
    ctx.fillRect(x - 3, y - 1, 2, 2); ctx.fillRect(x + 1, y - 1, 2, 2);
    ctx.fillStyle = '#1a1410'; ctx.fillRect(x - 1, y + 2, 2, 2);
    if (this.warn > 0) {
      ctx.globalAlpha = 0.2 + 0.3 * (1 - this.warn / 0.7);
      ctx.fillStyle = '#ff5a3a';
      for (let d = 10; d < 140; d += 6) ctx.fillRect(Math.round(x + this.dx * d), Math.round(y + this.dy * d), 2, 2);
      ctx.globalAlpha = 1;
    }
  }
}

function placeDartTraps(g, room, rng, spec) {
  const out = [];
  const n = rng.int(1, spec.max);
  for (let i = 0; i < n * 6 && out.length < n; i++) {
    const dir = rng.pick(['left', 'right', 'up']);
    let c, r, x, y, dx = 0, dy = 0;
    if (dir === 'up') { c = rng.int(1, room.cols - 2); r = 0; x = room.x0 + c * TILE + TILE / 2; y = room.y0 + 1; dy = 1; }
    else { r = rng.int(1, room.rows - 2); c = dir === 'left' ? 0 : room.cols - 1; x = dir === 'left' ? room.x0 + 1 : room.R - 1; y = room.y0 + r * TILE + TILE / 2; dx = dir === 'left' ? 1 : -1; }
    if (room.isWalkSolid(c, r)) continue;
    if (room.slots.some((s) => Math.hypot(s.x - x, s.y - y) < 40)) continue;
    if (out.some((j) => Math.hypot(j.x - x, j.y - y) < 50)) continue;
    out.push(new DartTrap(x, y, dx, dy));
  }
  return out;
}

// ---- Current (The Sunken Caves) -------------------------------------------------------------
// A band of fast water running across the room: it carries you (and your shots don't care).
// Ripples show which way it flows.
class Current {
  constructor(x, y, w, h, dx, dy) {
    Object.assign(this, { x, y, w, h, dx, dy, t: Math.random() * 10 });
  }

  inside(px, py) { return px > this.x && px < this.x + this.w && py > this.y && py < this.y + this.h; }

  update(dt, g) {
    this.t += dt;
    const p = g.player;
    if (!p.flying && !p.dead && this.inside(p.x, p.y)) {
      // nudge the player directly; still escapable by walking against it, just slowly
      p.x += this.dx * 52 * dt; p.y += this.dy * 52 * dt;
      const room = g.room;
      p.x = Math.max(room.x0 + p.r, Math.min(room.R - p.r, p.x));
      p.y = Math.max(room.y0 + p.r, Math.min(room.B - p.r, p.y));
      if (room.isWalkSolid(room.colAt(p.x), room.rowAt(p.y))) { p.x -= this.dx * 52 * dt; p.y -= this.dy * 52 * dt; }
    }
  }

  renderFloor(ctx, ox, oy) {
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    ctx.fillStyle = 'rgba(40,90,120,0.28)';
    ctx.fillRect(x, y, this.w, this.h);
    ctx.fillStyle = 'rgba(170,220,240,0.45)';
    const along = this.dx ? this.w : this.h, across = this.dx ? this.h : this.w;
    for (let lane = 4; lane < across - 2; lane += 7) {
      for (let k = 0; k < 3; k++) {
        const s = ((this.t * 60 + k * along / 3 + lane * 13) % along);
        const pos = this.dx > 0 || this.dy > 0 ? s : along - s;
        if (this.dx) ctx.fillRect(x + Math.round(pos), y + lane, 5, 1);
        else ctx.fillRect(x + lane, y + Math.round(pos), 1, 5);
      }
    }
  }
}

function placeCurrents(g, room, rng, spec) {
  // one band right through the middle of the room, away from the doors' lanes
  const horiz = room.W >= room.H ? rng.chance(0.7) : rng.chance(0.3);
  if (horiz) {
    const r = rng.int(1, room.rows - 3);
    const y = room.y0 + r * TILE + 4;
    if (Math.abs(y + TILE - (room.y0 + room.H / 2)) < 12) return [];
    return [new Current(room.x0, y, room.W, TILE * 2 - 8, rng.chance(0.5) ? 1 : -1, 0)];
  }
  const c = rng.int(1, room.cols - 3);
  const x = room.x0 + c * TILE + 4;
  if (Math.abs(x + TILE - (room.x0 + room.W / 2)) < 12) return [];
  return [new Current(x, room.y0, TILE * 2 - 8, room.H, 0, rng.chance(0.5) ? 1 : -1)];
}

// ---- Spike trap (The Underhall) -------------------------------------------------------------
// An iron plate in the floor. During a fight it clicks and its holes glow red (0.6 s), then
// spikes shoot up for a second. Flying characters are safe.
class SpikeTrap {
  constructor(x, y, offset) {
    Object.assign(this, { x, y, state: 'down', t: 2 + offset });
  }

  update(dt, g) {
    if (!g.enemies.length && this.state === 'down') return;
    this.t -= dt;
    if (this.state === 'down' && this.t <= 0) { this.state = 'warn'; this.t = 0.6; sfx('clink'); }
    else if (this.state === 'warn' && this.t <= 0) { this.state = 'up'; this.t = 1; sfx('swing'); }
    else if (this.state === 'up') {
      const p = g.player;
      if (!p.flying && !p.dead && Math.abs(p.x - this.x) < TILE / 2 + 2 && Math.abs(p.y - this.y) < TILE / 2 + 2) p.hurt(1, 'A Spike Trap', g, this.x, this.y);
      if (this.t <= 0) { this.state = 'down'; this.t = 2.6; }
    }
  }

  renderFloor(ctx, ox, oy, g) {
    const x = Math.round(this.x - TILE / 2 + 2 + ox), y = Math.round(this.y - TILE / 2 + 2 + oy), s = TILE - 4;
    ctx.fillStyle = '#121418'; ctx.fillRect(x, y, s, s);
    ctx.fillStyle = '#3a3e46'; ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = '#4c525e'; ctx.fillRect(x + 1, y + 1, s - 2, 1);
    const warn = this.state === 'warn' && Math.floor(g.time * 16) % 2;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const hx = x + 4 + i * 6, hy = y + 4 + j * 6;
      ctx.fillStyle = warn ? '#ff4a2a' : '#0a0a0c';
      ctx.fillRect(hx, hy, 2, 2);
    }
  }

  renderShadow() {}
  // the spikes stick up, so they're drawn with the entities
  render(ctx, ox, oy) {
    if (this.state !== 'up') return;
    const x = Math.round(this.x - TILE / 2 + 2 + ox), y = Math.round(this.y - TILE / 2 + 2 + oy);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const hx = x + 4 + i * 6, hy = y + 5 + j * 6;
      ctx.fillStyle = '#0e0b0a'; ctx.fillRect(hx - 1, hy - 7, 4, 8);
      ctx.fillStyle = '#b8b2a8'; ctx.fillRect(hx, hy - 6, 2, 6);
      ctx.fillStyle = '#e8e4dc'; ctx.fillRect(hx, hy - 6, 1, 2);
    }
  }
}

function placeSpikeTraps(g, room, rng, spec) {
  const out = [];
  const n = rng.int(2, spec.max);
  for (let i = 0; i < n * 6 && out.length < n; i++) {
    const c = rng.int(1, room.cols - 2), r = rng.int(1, room.rows - 2);
    if (room.isWalkSolid(c, r)) continue;
    const p = room.tileCenter(c, r);
    if (room.slots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 60)) continue;
    if (out.some((t) => t.x === p.x && t.y === p.y)) continue;
    out.push(new SpikeTrap(p.x, p.y, rng.float(0, 1.5)));
    // traps come in short rows
    const [dc, dr] = rng.pick([[1, 0], [0, 1]]);
    for (let k = 1; k <= rng.int(0, 2); k++) {
      if (room.isWalkSolid(c + dc * k, r + dr * k)) break;
      const q = room.tileCenter(c + dc * k, r + dr * k);
      if (room.slots.some((s) => Math.hypot(s.x - q.x, s.y - q.y) < 60)) break;
      out.push(new SpikeTrap(q.x, q.y, out[out.length - 1].t - 2 + 0.15));
    }
  }
  return out;
}

// ---- Soul brazier (The Wax Tombs) -----------------------------------------------------------
// A stone bowl of violet fire. During a fight it flares (0.8 s) and lets out a slow ring of soul
// fire. Six shots or a bomb put it out.
class SoulBrazier {
  constructor(x, y) {
    Object.assign(this, { x, y, r: 9, t: 2 + Math.random() * 2, warn: 0, hp: 6, hitBy: new WeakSet() });
  }

  update(dt, g) {
    if (this.out) return;
    for (const s of g.projectiles.pool.live) {
      if (s.team !== 'player' || s.removed || this.hitBy.has(s) || Math.hypot(s.x - this.x, s.y - (this.y - 6)) > this.r + s.r) continue;
      this.hitBy.add(s);
      s.removed = true;
      g.projectiles.splash?.(s, true);
      if (--this.hp <= 0) this.snuff(g);
    }
    if (this.out || !g.enemies.length) { this.warn = 0; return; }
    if (Math.random() < dt * 6) g.particles.spawn(this.x + (Math.random() - 0.5) * 8, this.y - 12, { z: 10, vz: 25, gravity: -20, life: 0.6, color: Math.random() < 0.5 ? '#7a44b0' : '#b48ae8', size: 1 });
    if (this.warn > 0) {
      this.warn -= dt;
      if (this.warn <= 0) {
        const off = Math.random() * Math.PI * 2;
        for (let i = 0; i < 6; i++) {
          const a = off + (i / 6) * Math.PI * 2;
          g.projectiles.spawn({ x: this.x, y: this.y - 4, z: 10, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, r: 4, damage: 1, team: 'enemy', range: 160, source: 'A Soul Brazier', style: 'violet' });
        }
        sfx('whoosh');
        this.t = 4 + Math.random() * 1.5;
      }
      return;
    }
    this.t -= dt;
    if (this.t <= 0) { this.warn = 0.8; sfx('crackle'); }
  }

  snuff(g) {
    this.out = true;
    g.particles.burst(this.x, this.y - 10, 12, { colors: ['#4a4652', '#68646e', '#b48ae8'], speed: 40, z: 10, vz: 40 });
  }
  blast(g) { if (!this.out) this.snuff(g); }

  renderFloor(ctx, ox, oy) {
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x - 8, y + 1, 16, 3);
  }

  renderShadow() {}
  render(ctx, ox, oy, g) {
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    ctx.fillStyle = '#160f0c'; ctx.fillRect(x - 8, y - 9, 16, 11);
    ctx.fillStyle = '#68646e'; ctx.fillRect(x - 7, y - 8, 14, 4);
    ctx.fillStyle = '#4a4652'; ctx.fillRect(x - 3, y - 4, 6, 5);
    ctx.fillStyle = '#88848e'; ctx.fillRect(x - 7, y - 8, 14, 1);
    if (this.out) return;
    const big = this.warn > 0 ? 1.6 : 1, f = Math.floor(g.time * 10) % 2;
    const h = Math.round((7 + f) * big);
    for (const [col, w, hh] of [['#4a2270', 6, h], ['#7a44b0', 4, h - 2], ['#ecdcff', 2, h - 5]]) {
      ctx.fillStyle = col;
      for (let i = 0; i < hh; i++) {
        const ww = Math.max(1, Math.round(w * big * (1 - i / hh)));
        ctx.fillRect(x - Math.floor(ww / 2) + (i > hh / 2 ? (f ? 1 : -1) : 0), y - 9 - i, ww, 1);
      }
    }
  }
}

function placeSoulBraziers(g, room, rng, spec) {
  const out = [];
  const n = rng.int(1, spec.max);
  for (let i = 0; i < n * 6 && out.length < n; i++) {
    const p = room.randomFreeSpot(rng, 1);
    if (room.slots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 60)) continue;
    if (out.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 60)) continue;
    out.push(new SoulBrazier(p.x, p.y));
  }
  return out;
}

// ---- Tar pools and ooze (The Mire) ----------------------------------------------------------
// A glossy black puddle: you wade through it at under half speed (flying is fine). The mire has
// some from the start; oozers and the Bog Mother spit more (those dry up after a while).
class TarPool {
  constructor(x, y, r, life = Infinity) {
    Object.assign(this, { x, y, r, life, t: 0, seed: Math.random() * 6 });
  }

  update(dt, g) {
    this.t += dt;
    if (this.t > this.life) { this.dead = true; return; }
    const p = g.player;
    if (!p.flying && ((p.x - this.x) / this.r) ** 2 + ((p.y - this.y) / (this.r * 0.6)) ** 2 < 1) p.webT = 0.12;
  }

  renderFloor(ctx, ox, oy, g) {
    const a = Math.min(1, this.t * 5, (this.life - this.t) / 1.5);
    const rx = this.r, ry = this.r * 0.6;
    for (const [col, s] of [['#08060a', 1], ['#141018', 0.8], ['#221c28', 0.45]]) {
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = col;
      const ex = rx * s, ey = ry * s;
      for (let y = -Math.ceil(ey); y <= Math.ceil(ey); y++) {
        const wob = Math.round(Math.sin(y * 1.7 + this.seed) * 1.2);
        const half = Math.round(ex * Math.sqrt(Math.max(0, 1 - (y / (ey + 0.01)) ** 2))) + wob;
        ctx.fillRect(Math.round(this.x - half + ox), Math.round(this.y + y + oy), half * 2, 1);
      }
    }
    // a slow bubble and a glossy highlight
    ctx.fillStyle = '#5e4668';
    ctx.fillRect(Math.round(this.x - rx * 0.4 + ox), Math.round(this.y - ry * 0.5 + oy), 4, 1);
    if (Math.floor(g.time * 0.8 + this.seed) % 3 === 0) {
      ctx.fillStyle = '#4a3e54';
      ctx.fillRect(Math.round(this.x + rx * 0.3 + ox), Math.round(this.y + oy) - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}

export function addTarPool(g, x, y, r = 14) {
  const room = g.room;
  if (!room || room.isWalkSolid(room.colAt(x), room.rowAt(y))) return;
  const pools = room.hazards.filter((h) => h instanceof TarPool && h.life !== Infinity);
  if (pools.length >= 10) pools[0].dead = true;
  room.hazards.push(new TarPool(x, y, r, 9));
}

function placeTarPools(g, room, rng, spec) {
  const out = [];
  const n = rng.int(1, spec.max);
  for (let i = 0; i < n * 5 && out.length < n; i++) {
    const p = room.randomFreeSpot(rng, 1);
    if (room.slots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 56)) continue;
    if (out.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 44)) continue;
    out.push(new TarPool(p.x, p.y, rng.int(16, 24)));
  }
  return out;
}

// Ooze dripping from the ceiling: a drop's shadow grows (0.9 s), it splats into a poison puddle.
class OozeDrop {
  constructor(x, y, delay = 0.9) { Object.assign(this, { x, y, t: 0, delay }); }
  update(dt, g) {
    this.t += dt;
    if (this.t < this.delay) return;
    this.dead = true;
    sfx('squish');
    addCreep(g, this.x, this.y, 'poison');
    g.particles.burst(this.x, this.y, 8, { colors: ['#2a4a14', '#4a7a20', '#7ab030'], speed: 40, z: 2, vz: 30 });
  }
  renderFloor(ctx, ox, oy) {
    const k = Math.min(1, this.t / this.delay);
    ctx.globalAlpha = 0.25 + 0.45 * k;
    ctx.fillStyle = '#0a1404';
    const rx = Math.round(2 + k * 5);
    ctx.fillRect(Math.round(this.x - rx + ox), Math.round(this.y - 1 + oy), rx * 2, 3);
    ctx.globalAlpha = 1;
  }
  renderShadow() {}
  render(ctx, ox, oy) {
    const k = this.t / this.delay;
    if (k < 0.5) return;
    const h = (1 - (k - 0.5) / 0.5) * 90;
    ctx.fillStyle = '#4a7a20';
    ctx.fillRect(Math.round(this.x - 1 + ox), Math.round(this.y - h - 4 + oy), 3, 4);
    ctx.fillStyle = '#7ab030';
    ctx.fillRect(Math.round(this.x + ox), Math.round(this.y - h - 4 + oy), 1, 2);
  }
}

class OozingCeiling {
  constructor() { this.t = 2.5 + Math.random() * 2; }
  update(dt, g) {
    if (!g.enemies.length) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 3 + Math.random() * 2;
    const p = g.player, room = g.room;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 50;
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.7;
      if (room.inBounds(room.colAt(x), room.rowAt(y)) && !room.isWalkSolid(room.colAt(x), room.rowAt(y))) room.hazards.push(new OozeDrop(x, y, 0.9 + i * 0.3));
    }
  }
}

function placeOoze() { return [new OozingCeiling()]; }

// ---- Blood geyser (The Fleshworks) ----------------------------------------------------------
// A puckered vent in the fleshy floor. During a fight it swells and glows (0.8 s), then sprays a
// column of blood (hurts on top of it) and a ring of drops.
class Geyser {
  constructor(x, y) { Object.assign(this, { x, y, t: 2 + Math.random() * 2.5, state: 'idle', k: 0 }); }

  update(dt, g) {
    if (!g.enemies.length && this.state === 'idle') return;
    this.t -= dt;
    if (this.state === 'idle' && this.t <= 0) { this.state = 'warn'; this.t = 0.8; sfx('gurgle'); }
    else if (this.state === 'warn' && this.t <= 0) {
      this.state = 'spray'; this.t = 0.6;
      sfx('splashBig');
      const off = Math.random() * Math.PI * 2;
      for (let i = 0; i < 6; i++) {
        const a = off + (i / 6) * Math.PI * 2;
        g.projectiles.spawn({ x: this.x, y: this.y, z: 16, vx: Math.cos(a) * 58, vy: Math.sin(a) * 58, r: 4, damage: 1, team: 'enemy', range: 110, source: 'A Blood Geyser', style: 'blood' });
      }
    } else if (this.state === 'spray') {
      const p = g.player;
      if (!p.dead && Math.hypot(p.x - this.x, p.y - this.y) < 11 + p.r) p.hurt(1, 'A Blood Geyser', g, this.x, this.y);
      if (Math.random() < dt * 60) g.particles.spawn(this.x + (Math.random() - 0.5) * 6, this.y, { z: 2, vz: 120 + Math.random() * 60, vx: (Math.random() - 0.5) * 30, life: 0.6, color: Math.random() < 0.5 ? '#c0262c' : '#7a1418', size: 2 });
      if (this.t <= 0) { this.state = 'idle'; this.t = 4 + Math.random() * 2; }
    }
  }

  renderFloor(ctx, ox, oy, g) {
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    const swell = this.state === 'warn' ? 1 + (1 - this.t / 0.8) * 2 : this.state === 'spray' ? 3 : 0;
    ctx.fillStyle = '#3a0a10'; ctx.fillRect(x - 8 - swell, y - 4 - swell / 2, 16 + swell * 2, 8 + swell);
    ctx.fillStyle = '#7a2028'; ctx.fillRect(x - 6 - swell, y - 3 - swell / 2, 12 + swell * 2, 6 + swell);
    ctx.fillStyle = this.state === 'warn' && Math.floor(g.time * 16) % 2 ? '#ff4a2a' : '#1a0406';
    ctx.fillRect(x - 2, y - 1, 4, 2);
    // puckered folds
    ctx.fillStyle = '#5a141a';
    for (const [dx, dy] of [[-5, -2], [4, -2], [-5, 1], [4, 1]]) ctx.fillRect(x + dx, y + dy, 2, 1);
  }
}

function placeGeysers(g, room, rng, spec) {
  const out = [];
  const n = rng.int(1, spec.max);
  for (let i = 0; i < n * 6 && out.length < n; i++) {
    const p = room.randomFreeSpot(rng, 1);
    if (room.slots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 60)) continue;
    if (out.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 50)) continue;
    out.push(new Geyser(p.x, p.y));
  }
  return out;
}

// ---- Bile pool (The Black Womb) -------------------------------------------------------------
// A still black pool that never dries up. Standing in it burns (flying is fine).
class BilePool {
  constructor(x, y, r) { Object.assign(this, { x, y, r, t: Math.random() * 6 }); }
  update(dt, g) {
    this.t += dt;
    const p = g.player;
    if (!p.flying && !p.dead && ((p.x - this.x) / this.r) ** 2 + ((p.y - this.y) / (this.r * 0.6)) ** 2 < 0.8) p.hurt(1, 'A Pool of Bile', g, this.x, this.y);
  }
  renderFloor(ctx, ox, oy) {
    const rx = this.r, ry = this.r * 0.6;
    for (const [col, s] of [['#050806', 1], ['#0e1a10', 0.75], ['#1e3a1a', 0.35]]) {
      ctx.fillStyle = col;
      const ex = rx * s, ey = ry * s;
      for (let y = -Math.ceil(ey); y <= Math.ceil(ey); y++) {
        const half = Math.round(ex * Math.sqrt(Math.max(0, 1 - (y / (ey + 0.01)) ** 2))) + Math.round(Math.sin(y + this.x) * 1);
        ctx.fillRect(Math.round(this.x - half + ox), Math.round(this.y + y + oy), half * 2, 1);
      }
    }
    // a bubble now and then
    if (Math.floor(this.t * 1.3) % 3 === 0) { ctx.fillStyle = '#4a7a20'; ctx.fillRect(Math.round(this.x + rx * 0.3 + ox), Math.round(this.y - 1 + oy), 2, 2); }
  }
}

function placeBilePools(g, room, rng, spec) {
  const out = [];
  const n = rng.int(1, spec.max);
  for (let i = 0; i < n * 5 && out.length < n; i++) {
    const p = room.randomFreeSpot(rng, 1);
    if (room.slots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 64)) continue;
    if (out.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 50)) continue;
    out.push(new BilePool(p.x, p.y, rng.int(14, 20)));
  }
  return out;
}

// ---- Suture (The Scarred Womb) --------------------------------------------------------------
// A line of barbed thread stitched out from a wall. Touching it hurts; three shots cut it
// (burning shots and bombs at once).
class Suture {
  constructor(x0, y0, x1, y1) { Object.assign(this, { x0, y0, x1, y1, hp: 3, hitBy: new WeakSet(), x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: 0 }); }
  dist(px, py) {
    const dx = this.x1 - this.x0, dy = this.y1 - this.y0, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - this.x0) * dx + (py - this.y0) * dy) / l2));
    return Math.hypot(px - (this.x0 + dx * t), py - (this.y0 + dy * t));
  }
  update(dt, g) {
    const p = g.player;
    if (!p.dead && this.dist(p.x, p.y) < p.r + 1) p.hurt(1, 'A Barbed Suture', g, p.x, p.y);
    for (const s of g.projectiles.pool.live) {
      if (s.team !== 'player' || s.removed || this.hitBy.has(s) || this.dist(s.x, s.y) > s.r + 2) continue;
      this.hitBy.add(s);
      this.hp -= s.burn ? 3 : 1;
      sfx('webTear');
      g.particles.burst(s.x, s.y, 4, { colors: ['#2a2a30', '#c8c0b0'], speed: 40, z: 4 });
    }
    if (this.hp <= 0) this.dead = true;
  }
  blast() { this.dead = true; }
  renderFloor(ctx, ox, oy) {
    const n = Math.max(2, Math.round(Math.hypot(this.x1 - this.x0, this.y1 - this.y0) / 4));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(this.x0 + ((this.x1 - this.x0) * i) / n + ox), y = Math.round(this.y0 + ((this.y1 - this.y0) * i) / n + oy);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + 3, 2, 1);
      ctx.fillStyle = this.hp < 3 ? '#4a4a50' : '#2a2a30'; ctx.fillRect(x, y - 1, 2, 2);
      if (i % 2) { ctx.fillStyle = '#c8c0b0'; ctx.fillRect(x - 1, y - 2, 1, 1); ctx.fillRect(x + 2, y + 1, 1, 1); }
    }
  }
}

function placeSutures(g, room, rng, spec) {
  const out = [];
  const n = rng.int(1, spec.max);
  for (let i = 0; i < n * 8 && out.length < n; i++) {
    const horiz = rng.chance(0.5), len = rng.int(3, 5) * TILE;
    let x0, y0, x1, y1;
    if (horiz) {
      const r = rng.int(1, room.rows - 2), left = rng.chance(0.5);
      y0 = y1 = room.y0 + r * TILE + TILE / 2;
      x0 = left ? room.x0 : room.R; x1 = left ? room.x0 + len : room.R - len;
    } else {
      const c = rng.int(1, room.cols - 2), top = rng.chance(0.5);
      x0 = x1 = room.x0 + c * TILE + TILE / 2;
      y0 = top ? room.y0 : room.B; y1 = top ? room.y0 + len : room.B - len;
    }
    const s = new Suture(x0, y0, x1, y1);
    // keep the doorways and the middle of every doorway's path clear
    if (room.slots.some((sl) => s.dist(sl.x, sl.y) < 56)) continue;
    if (out.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < 40)) continue;
    out.push(s);
  }
  return out;
}

const PLACERS = {
  geyser: placeGeysers,
  bilepool: placeBilePools,
  suture: placeSutures,
  spiketrap: placeSpikeTraps,
  soulbrazier: placeSoulBraziers,
  tarpool: placeTarPools,
  ooze: placeOoze,
  rockfall: placeRockfall,
  darttrap: placeDartTraps,
  current: placeCurrents,
  fireplace: placeFireplaces,
  firejet: placeFireJets,
  web: placeWebs,
  rathole: placeRatHoles,
};

// Put a variant's hazards into a room the first time it's entered (normal rooms that have enemies).
export function placeHazards(g, cell) {
  const room = cell.room;
  if (room.hazardsPlaced) return;
  room.hazardsPlaced = true;
  if (cell.type !== 'normal' || room.cleared) return;
  const rng = g.rng.fork('hazards:' + cell.key);
  for (const spec of g.variant?.hazards || []) {
    if (!rng.chance(spec.chance)) continue;
    room.hazards.push(...(PLACERS[spec.type]?.(g, room, rng, spec) || []));
  }
}

// ---------------------------------------------------------------------------
// Hostile creep: puddles and flames left on the floor (champion trails, later variants).
// Standing in it hurts half a heart (flying characters are safe from it).
const CREEP = {
  poison: { colors: ['#2a4a14', '#4a7a20', '#7ab030'], life: 4, r: 8, source: 'Bilious Slime' },
  fire: { colors: ['#8a2410', '#f06020', '#ffd25a'], life: 2.5, r: 7, source: 'A Trail of Fire', flame: true },
  // sticky, doesn't hurt: slows you like a web
  tar: { colors: ['#08060a', '#141018', '#28202e'], life: 3, r: 8, slow: true },
  blood: { colors: ['#3a0a0c', '#7a1418', '#c0262c'], life: 4, r: 9, source: 'A Pool of Blood' },
};

export function addCreep(g, x, y, kind) {
  const k = CREEP[kind];
  if (!k) return;
  const list = (g.room.creep ??= []);
  list.push({ x, y, kind, t: 0, life: k.life, r: k.r });
  if (list.length > 60) list.shift();
}

export function updateCreep(g, dt) {
  const list = g.room.creep;
  if (!list?.length) return;
  for (const c of list) c.t += dt;
  g.room.creep = list.filter((c) => c.t < c.life);
  const p = g.player;
  if (p.flying || p.dead) return;
  for (const c of g.room.creep) {
    if (c.t < 0.3) continue;
    if (((p.x - c.x) / c.r) ** 2 + ((p.y - c.y) / (c.r * 0.6)) ** 2 < 1) {
      if (CREEP[c.kind].slow) { p.webT = 0.12; continue; }
      p.hurt(1, CREEP[c.kind].source, g, c.x, c.y);
      break;
    }
  }
}

export function renderCreep(ctx, ox, oy, g) {
  for (const c of g.room.creep || []) {
    const k = CREEP[c.kind];
    const a = Math.min(1, c.t / 0.2, (c.life - c.t) / 0.6);
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = a * [0.6, 0.7, 0.8][i];
      ctx.fillStyle = k.colors[i];
      const s = [1, 0.7, 0.35][i];
      const rx = c.r * s, ry = c.r * 0.55 * s;
      const flick = k.flame ? Math.round(Math.sin(g.time * 20 + c.x) * 1) : 0;
      for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.01)) ** 2)));
        ctx.fillRect(Math.round(c.x - half + ox), Math.round(c.y + y + oy - (k.flame ? i * 2 + flick : 0)), half * 2, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}
