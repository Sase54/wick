// Enemy entities: shared physics, art, telegraphs and champions, plus one behavior per AI type.
// Stats and tuning come from src/data/enemies.js, art from src/data/enemyArt.js.
//
// Telegraphs: every attack starts with a wind-up (state 'wind'): the enemy stops and faces you,
// switches to its wind-up pose (glowing eyes), shakes, gets a pulsing red glow under it, plays
// its wind-up sound and flashes white right before it acts. Charges and dives also show the line
// they're about to take, hops show where they'll land. After an attack most enemies have a
// recovery window (stunned, dazed, sitting) to punish them in.
import { PixelGrid } from '../engine/pixelgrid.js';
import { flipX, silhouette, tint, makeShadow, makeGlow } from '../engine/sprites.js';
import { ENEMY_ART } from '../data/enemyArt.js';
import { enemyDef, BLOOD, threatOf, ROOM_MINION_CAP } from '../data/enemies.js';
import { CHAMPIONS, CHAMPION_WEIGHTS } from '../data/champions.js';
import { moveCircle } from './collision.js';
import { addCreep, addWeb, addLob, fireBurst, rockRain, addTarPool } from './hazards.js';
import '../data/art/chapter3.js';
import '../data/art/chapter4.js';
import '../data/art/chapter2.js';
import { sfx } from '../engine/audio.js';

export const SPAWN_TIME = 0.5;
const TAU = Math.PI * 2;
const OUTLINE = '#160f0c';
const WIND_GLOW = makeGlow(20, 'rgba(255,40,20,0.7)');

// ---------------------------------------------------------------------------
// Art: frames are painted on demand and cached (per art, state, direction, frame and tint).
// ---------------------------------------------------------------------------
const frameCache = new Map();
// A still picture of an enemy (the death screen shows what got you).
export function enemyPicture(artKey) { return paintFrame(artKey, 'idle', 'down', 0); }

function paintFrame(key, state, dir, f) {
  const k = `${key}|${state}|${dir}|${f}`;
  let c = frameCache.get(k);
  if (c) return c;
  const A = ENEMY_ART[key];
  const grid = new PixelGrid(A.w + 2, A.h + 2);
  // paint with a 1px margin so the outline never gets cut off
  const g = Object.create(grid);
  g.set = (x, y, col) => grid.set(x + 1, y + 1, col);
  g.get = (x, y) => grid.get(x + 1, y + 1);
  A.paint(g, { dir: dir === 'left' ? 'side' : dir, state, f });
  c = grid.outline(OUTLINE).toCanvas();
  if (dir === 'left') c = flipX(c);
  frameCache.set(k, c);
  return c;
}

const tintCache = new Map();
function tinted(img, color, amount) {
  let m = tintCache.get(img);
  if (!m) { m = new Map(); tintCache.set(img, m); }
  const k = color + amount;
  if (!m.has(k)) m.set(k, amount >= 1 ? silhouette(img, color) : tint(img, color, amount));
  return m.get(k);
}

const shadowCache = new Map();
function shadowFor(w, h) {
  const k = w * 100 + h;
  if (!shadowCache.has(k)) shadowCache.set(k, makeShadow(w, h, 0.4));
  return shadowCache.get(k);
}

// ---------------------------------------------------------------------------
// Pathing: a breadth-first distance map to the player's tile, rebuilt when the player
// changes tile. Walkers follow it around rocks and pits.
// ---------------------------------------------------------------------------
export function computeFlow(room, px, py) {
  const W = room.cols, H = room.rows;
  const dist = new Int16Array(W * H).fill(-1);
  const c0 = Math.max(0, Math.min(W - 1, room.colAt(px)));
  const r0 = Math.max(0, Math.min(H - 1, room.rowAt(py)));
  const queue = [c0, r0];
  dist[r0 * W + c0] = 0;
  for (let i = 0; i < queue.length; i += 2) {
    const c = queue[i], r = queue[i + 1];
    const d = dist[r * W + c];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= W || nr >= H) continue;
      const k = nr * W + nc;
      if (dist[k] >= 0 || room.isWalkSolid(nc, nr)) continue;
      dist[k] = d + 1;
      queue.push(nc, nr);
    }
  }
  return dist;
}

export function lineClear(room, x0, y0, x1, y1, rad = 0, mode = 'walk') {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1) return true;
  const steps = Math.ceil(len / 6);
  const nx = (-dy / len) * rad, ny = (dx / len) * rad;
  const solid = mode === 'fly' ? (c, r) => room.isFlySolid(c, r) : (c, r) => room.isWalkSolid(c, r);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    for (let o = -1; o <= 1; o++) {
      const x = x0 + dx * t + nx * o, y = y0 + dy * t + ny * o;
      if (solid(room.colAt(x), room.rowAt(y))) return false;
    }
  }
  return true;
}

const tmpDir = { x: 0, y: 0 };
function toward(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  tmpDir.x = dx / len;
  tmpDir.y = dy / len;
  return tmpDir;
}

// Unit direction a walking enemy should move to reach the player.
export function steer(e, g) {
  const p = g.player, room = g.room;
  if (lineClear(room, e.x, e.y, p.x, p.y, e.r * 0.9)) return toward(e.x, e.y, p.x, p.y);
  const flow = g.flow;
  const W = room.cols;
  const c = room.colAt(e.x), r = room.rowAt(e.y);
  const here = room.inBounds(c, r) ? flow[r * W + c] : -1;
  let best = -1, bestD = here >= 0 ? here : 9999;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dc && !dr) continue;
      const nc = c + dc, nr = r + dr;
      if (!room.inBounds(nc, nr)) continue;
      if (dc && dr && (room.isWalkSolid(c + dc, r) || room.isWalkSolid(c, r + dr))) continue;
      const d = flow[nr * W + nc];
      if (d >= 0 && d < bestD) { bestD = d; best = nr * W + nc; }
    }
  }
  if (best < 0) return toward(e.x, e.y, p.x, p.y);
  const t = room.tileCenter(best % W, Math.floor(best / W));
  return toward(e.x, e.y, t.x, t.y);
}

// ---------------------------------------------------------------------------
// Shared pieces of behavior
// ---------------------------------------------------------------------------
function face(e, dx, dy) {
  const l = Math.hypot(dx, dy);
  if (l > 0.01) { e.fx = dx / l; e.fy = dy / l; }
}
const faceP = (e, g) => face(e, g.player.x - e.x, g.player.y - e.y);

// Start a wind-up: stop, play the wind-up sound, show the pose. `next` runs when it ends.
function windUp(e, dur, next) {
  e.state = 'wind';
  e.stateT = dur;
  e.windDur = dur;
  e.next = next;
  e.anim = 'wind';
  if (e.def.windSfx) sfx(e.def.windSfx);
}
function tickWind(e, dt, g) {
  e.vx = e.vy = 0;
  e.stateT -= dt;
  if (e.stateT <= 0) { const n = e.next; e.next = null; n?.(); }
}

// One enemy shot (web globs are slower, bigger and leave a sticky web where they land).
function shootOne(e, g, angle, s) {
  if (s.web) {
    sfx('enemyShoot');
    const c = Math.cos(angle), sn = Math.sin(angle);
    g.projectiles.spawn({
      x: e.x + c * e.r * 0.6, y: e.y + sn * e.r * 0.6, z: e.z + 7, vx: c * s.speed, vy: sn * s.speed,
      r: 5, damage: 1, team: 'enemy', range: 150, source: e.def.name, style: 'web', web: true,
    });
    return;
  }
  if (s.tar) {
    // tar globs: slow, and leave a sticky puddle where they land
    sfx('enemyShoot');
    const c = Math.cos(angle), sn = Math.sin(angle);
    g.projectiles.spawn({
      x: e.x + c * e.r * 0.6, y: e.y + sn * e.r * 0.6, z: e.z + 7, vx: c * s.speed, vy: sn * s.speed,
      r: 5, damage: 1, team: 'enemy', range: 140, source: e.def.name, style: 'tar', tar: true,
    });
    return;
  }
  if (s.seek) {
    // lantern wisps: slow, and they turn after you
    sfx('enemyShoot');
    const c = Math.cos(angle), sn = Math.sin(angle);
    g.projectiles.spawn({
      x: e.x + c * e.r * 0.6, y: e.y + sn * e.r * 0.6, z: e.z + 9, vx: c * s.speed, vy: sn * s.speed,
      r: 4, damage: 1, team: 'enemy', range: 260, source: e.def.name, style: s.style || 'ghost', seek: 1.4,
    });
    return;
  }
  g.enemyShoot(e, angle, s.speed, s.style || 'blood');
}

// Aimed shots (with count/spread).
function fireAimed(e, g, s = e.def.shoot) {
  const base = Math.atan2(g.player.y - e.y, g.player.x - e.x);
  if (s.ring) { radial(e, g, { count: s.ring, speed: s.speed, style: s.style }, base); return; }
  if (s.stream) {
    // a jet: shots one behind the other along the same line
    const c = Math.cos(base), sn = Math.sin(base);
    for (let i = 0; i < s.stream; i++) {
      g.projectiles.spawn({
        x: e.x + c * (e.r * 0.6 - i * 7), y: e.y + sn * (e.r * 0.6 - i * 7), z: e.z + 7, vx: c * s.speed, vy: sn * s.speed,
        r: 4, damage: 1, team: 'enemy', range: 190 + i * 7, source: e.def.name, style: s.style || 'blood',
      });
    }
    sfx('enemyShoot');
    return;
  }
  const n = s.count || 1;
  for (let i = 0; i < n; i++) {
    const off = n > 1 ? (i - (n - 1) / 2) * (s.spread || 0.3) : 0;
    shootOne(e, g, base + off, s);
  }
}

// Fire breath (Smokebelly, Ember Hound): breathe in (pulls you a little), then a cone of fire.
// Returns true while busy.
function breathLogic(e, dt, g) {
  const b = e.def.breath, p = g.player;
  if (e.state === 'wind' && e.winding === 'breath') {
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < b.range * 1.6) { p.vx += (dx / d) * 90 * dt; p.vy += (dy / d) * 90 * dt; }
    e.anim = e.def.art === 'emberhound' ? 'breath' : 'wind';
    tickWind(e, dt, g);
    return true;
  }
  if (e.state === 'breath') {
    e.vx = e.vy = 0;
    e.anim = e.def.art === 'emberhound' ? 'breath' : 'attack';
    e.stateT -= dt;
    e.puffT = (e.puffT || 0) - dt;
    if (e.puffT <= 0) {
      e.puffT = 0.05;
      const a = Math.atan2(e.cdy, e.cdx) + (Math.random() - 0.5) * 2 * b.cone;
      const c = Math.cos(a), s = Math.sin(a);
      g.projectiles.spawn({
        x: e.x + c * e.r, y: e.y + s * e.r * 0.7, z: 8, vx: c * b.speed, vy: s * b.speed,
        r: 4, damage: 1, team: 'enemy', range: b.range, source: e.def.name, style: 'ember',
      });
    }
    if (e.stateT <= 0) { e.state = 'breathRest'; e.stateT = b.recover; }
    return true;
  }
  if (e.state === 'breathRest') {
    e.vx = e.vy = 0;
    e.anim = 'idle';
    e.stateT -= dt;
    if (e.stateT <= 0) { e.state = 'idle'; e.breathCd = 1.2; }
    return true;
  }
  e.breathCd = (e.breathCd ?? 0.8) - dt;
  const d = Math.hypot(p.x - e.x, p.y - e.y);
  if (e.breathCd <= 0 && d < b.range && lineClear(g.room, e.x, e.y, p.x, p.y, 4, 'fly')) {
    faceP(e, g);
    e.cdx = e.fx; e.cdy = e.fy;
    e.winding = 'breath';
    e.aim = { dx: e.fx, dy: e.fy, len: b.range };
    windUp(e, b.wind, () => { e.state = 'breath'; e.stateT = b.time; e.winding = null; e.aim = null; sfx('whoosh'); });
    return true;
  }
  return false;
}

// Leaping (Bigleg, Loom Mother): crouch with the landing spot shown, fly, land.
function startLeap(e, g, h, onLand) {
  const p = g.player, room = g.room;
  const a = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - 0.5) * 0.4;
  const want = Math.min(h.dist, Math.hypot(p.x - e.x, p.y - e.y) + 6);
  for (const f of [1, 0.7, 0.4]) {
    const tx = Math.max(room.x0 + e.r, Math.min(room.R - e.r, e.x + Math.cos(a) * want * f));
    const ty = Math.max(room.y0 + e.r, Math.min(room.B - e.r, e.y + Math.sin(a) * want * f));
    if (room.isWalkSolid(room.colAt(tx), room.rowAt(ty))) continue;
    face(e, tx - e.x, ty - e.y);
    e.landAt = { x: tx, y: ty };
    windUp(e, h.wind, () => {
      e.state = 'air'; e.stateT = 0; e.noMove = true;
      e.hx0 = e.x; e.hy0 = e.y; e.hx1 = tx; e.hy1 = ty;
      e.onLand = onLand;
    });
    return true;
  }
  return false;
}
function tickLeap(e, dt, g, h) {
  e.stateT += dt;
  const k = Math.min(1, e.stateT / h.air);
  e.x = e.hx0 + (e.hx1 - e.hx0) * k;
  e.y = e.hy0 + (e.hy1 - e.hy0) * k;
  e.z = Math.sin(k * Math.PI) * (h.dist > 100 ? 34 : 24);
  e.anim = 'air';
  if (k < 1) return false;
  e.z = 0;
  e.noMove = false;
  e.landAt = null;
  e.state = 'recover';
  e.stateT = h.recover;
  g.particles.burst(e.x, e.y + 4, 10, { colors: ['#4a3e32', '#2e241d'], speed: 50, z: 1, vz: 24 });
  g.effects.ring(e.x, e.y + 3, e.r + 6, 'rgba(160,140,110,0.6)', 0.25);
  if (e.def.landWeb) addWeb(g, e.x, e.y + 2);
  if (e.def.landTar) addTarPool(g, e.x, e.y + 2, 20);
  if (e.def.landCreep) landPuddle(g, e, e.def.landCreep);
  e.onLand?.();
  return true;
}

function radial(e, g, { count, speed, style }, offset = 0) {
  for (let i = 0; i < count; i++) g.enemyShoot(e, offset + (i / count) * TAU, speed, style || 'blood');
}

// Shooters: count down, wind up for `shoot.wind` seconds (stopping), then fire.
function shootCycle(e, dt, g, fire) {
  const s = e.def.shoot;
  if (e.state === 'wind') { tickWind(e, dt, g); return true; }
  e.shootT -= dt;
  if (e.shootT <= 0) {
    faceP(e, g);
    windUp(e, s.wind ?? 0.5, () => {
      fire();
      e.state = 'idle';
      e.atkT = 0.2;
      e.shootT = s.every * (0.85 + Math.random() * 0.3);
    });
    return true;
  }
  return false;
}

// Is the player lined up with this enemy along x or y (for chargers)? Returns the axis direction.
function lineUp(e, g, reach = 230) {
  const p = g.player, dx = p.x - e.x, dy = p.y - e.y, tol = e.r + 4;
  let cdx = 0, cdy = 0;
  if (Math.abs(dy) < tol && Math.abs(dx) < reach) cdx = Math.sign(dx);
  else if (Math.abs(dx) < tol && Math.abs(dy) < reach) cdy = Math.sign(dy);
  if ((cdx || cdy) && lineClear(g.room, e.x, e.y, p.x, p.y, e.r * 0.8)) return [cdx, cdy];
  return null;
}

// Charging (ratram, rat matron): wind up facing the player, run until a wall, get stunned.
function chargeLogic(e, dt, g, c) {
  switch (e.state) {
    case 'wind':
      tickWind(e, dt, g);
      return true;
    case 'charge': {
      e.anim = 'attack';
      e.animMul = 2.5;
      e.blur = true;
      e.chargeT += dt;
      const sp = c.speed * e.speedMul;
      e.vx = e.cdx * sp;
      e.vy = e.cdy * sp;
      if (Math.random() < dt * 40) g.particles.spawn(e.x - e.cdx * e.r, e.y + e.r * 0.5, { z: 2, vz: 25, vx: -e.cdx * 40 + (Math.random() - 0.5) * 20, vy: -e.cdy * 40, life: 0.45, color: Math.random() < 0.5 ? '#5a4c3e' : '#3a3028', size: 2 });
      if (e.lastHit && e.chargeT > 0.06) {
        // slammed into a wall: stunned, stars, dust: the window to hit it
        e.state = 'stun';
        e.stateT = c.stun;
        e.vx = e.vy = 0;
        e.blur = false;
        g.shake(3);
        sfx('slam');
        g.particles.burst(e.x + e.cdx * e.r, e.y + e.cdy * e.r, 14, { colors: ['#5a5048', '#3a3430', '#8a7a62'], speed: 70, z: 6, vz: 50 });
      } else if (e.chargeT > c.maxTime) {
        e.state = 'idle'; e.blur = false; e.wanderT = 0.4;
      }
      return true;
    }
    case 'stun':
      e.vx = e.vy = 0;
      e.anim = 'stun';
      e.animMul = 1;
      e.stateT -= dt;
      if (e.stateT <= 0) { e.state = 'idle'; e.wanderT = 0; }
      return true;
    default: {
      const line = lineUp(e, g);
      if (line) {
        e.cdx = line[0]; e.cdy = line[1];
        face(e, line[0], line[1]);
        windUp(e, c.wind, () => { e.state = 'charge'; e.chargeT = 0; sfx('charge'); });
        e.aim = { dx: line[0], dy: line[1], len: 60 };
        return true;
      }
      return false;
    }
  }
}

// Wander along the grid axes (chargers between charges).
function axisWander(e, dt, g, speed) {
  e.wanderT -= dt;
  if (e.wanderT <= 0 || e.lastHit) {
    e.wanderT = 0.8 + Math.random();
    const p = g.player;
    let dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
    if (Math.random() < 0.5) {
      const dx = p.x - e.x, dy = p.y - e.y;
      dir = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    }
    e.wx = dir[0]; e.wy = dir[1];
  }
  e.vx = e.wx * speed;
  e.vy = e.wy * speed;
  e.anim = 'move';
}

// ---------------------------------------------------------------------------
// Behaviors: set e.vx / e.vy (desired velocity), e.anim, and attack.
// ---------------------------------------------------------------------------
const BEHAVIORS = {
  chase(e, dt, g) {
    const d = steer(e, g);
    e.vx = d.x * e.speed;
    e.vy = d.y * e.speed;
    e.anim = 'move';
  },

  swarm(e, dt, g) {
    const d = e.def.flying ? toward(e.x, e.y, g.player.x, g.player.y) : steer(e, g);
    const w = Math.sin(e.t * 9 + e.seed * 6) * 0.6;
    e.vx = (d.x - d.y * w) * e.speed;
    e.vy = (d.y + d.x * w) * e.speed;
    e.anim = 'move';
    if (e.def.flying) e.z = 9 + Math.sin(e.t * 8 + e.seed * 5) * 2;
  },

  flutter(e, dt, g) {
    if (e.def.shoot && shootCycle(e, dt, g, () => fireAimed(e, g))) return;
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.wanderT = 0.15 + Math.random() * 0.3;
      const a = Math.atan2(g.player.y - e.y, g.player.x - e.x) + (Math.random() - 0.5) * 2.8;
      e.wx = Math.cos(a);
      e.wy = Math.sin(a);
    }
    const k = Math.min(1, dt * 5), s = e.speed;
    e.vx += (e.wx * s - e.vx) * k;
    e.vy += (e.wy * s - e.vy) * k;
    e.z = 9 + Math.sin(e.t * 7) * 2;
    e.anim = 'move';
  },

  turret(e, dt, g) {
    e.vx = e.vy = 0;
    faceP(e, g);
    if (!shootCycle(e, dt, g, () => fireAimed(e, g))) e.anim = 'idle';
  },

  charger(e, dt, g) {
    e.animMul = 1;
    e.blur = false;
    if (chargeLogic(e, dt, g, e.def.charge)) return;
    axisWander(e, dt, g, e.speed);
  },

  hopper(e, dt, g) {
    const h = e.def.hop;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'air') {
      e.stateT += dt;
      const k = Math.min(1, e.stateT / h.air);
      e.x = e.hx0 + (e.hx1 - e.hx0) * k;
      e.y = e.hy0 + (e.hy1 - e.hy0) * k;
      e.z = Math.sin(k * Math.PI) * (e.bigHop ? 40 : 24);
      e.anim = 'air';
      if (k >= 1) {
        e.z = 0;
        e.state = 'recover';
        e.stateT = h.recover;
        e.noMove = false;
        e.landAt = null;
        e.anim = 'idle';
        g.particles.burst(e.x, e.y + 4, 8, { colors: ['#4a3e32', '#2e241d'], speed: 45, z: 1, vz: 20 });
        g.effects.ring(e.x, e.y + 3, 14, 'rgba(160,140,110,0.6)', 0.25);
        if (e.def.landShots && (!h.bigEvery || e.bigHop)) radial(e, g, e.def.landShots, Math.PI / 4);
        if (e.bigHop) { g.shake(3); sfx('slam'); }
        if (e.def.landWeb) addWeb(g, e.x, e.y + 2);
        if (e.def.landCreep && (!h.bigEvery || e.bigHop)) landPuddle(g, e, e.def.landCreep);
      }
      return;
    }
    e.vx = e.vy = 0;
    e.anim = 'idle';
    e.stateT -= dt;
    if (e.stateT > 0) return;
    if (e.state === 'recover') { e.state = 'sit'; e.stateT = h.every * (0.7 + Math.random() * 0.6); return; }
    // pick where to land now and show it during the wind-up
    const p = g.player;
    const a = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - 0.5) * 0.6;
    // every few hops a big one (Rockhopper)
    e.hops = (e.hops || 0) + 1;
    e.bigHop = !!h.bigEvery && e.hops % h.bigEvery === 0;
    const want = Math.min(e.bigHop ? h.bigDist : h.dist, Math.hypot(p.x - e.x, p.y - e.y) + 10);
    const room = g.room;
    for (const f of [1, 0.65, 0.35]) {
      const tx = Math.max(room.x0 + e.r, Math.min(room.R - e.r, e.x + Math.cos(a) * want * f));
      const ty = Math.max(room.y0 + e.r, Math.min(room.B - e.r, e.y + Math.sin(a) * want * f));
      if (room.isWalkSolid(room.colAt(tx), room.rowAt(ty))) continue;
      face(e, tx - e.x, ty - e.y);
      e.landAt = { x: tx, y: ty };
      windUp(e, e.bigHop ? h.wind * 2 : h.wind, () => {
        e.state = 'air';
        e.stateT = 0;
        e.noMove = true;
        e.hx0 = e.x; e.hy0 = e.y; e.hx1 = tx; e.hy1 = ty;
      });
      return;
    }
    e.stateT = 0.3;
  },

  spawner(e, dt, g) {
    e.vx = e.vy = 0;
    const s = e.def.spawn;
    e.children = e.children.filter((c) => !c.dead);
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    e.anim = 'idle';
    e.spawnTimer -= dt;
    if (e.spawnTimer > 0) return;
    e.spawnTimer = s.every * (0.8 + Math.random() * 0.4);
    if (e.children.length >= s.max || g.enemies.filter((x) => x.minion && !x.dead).length >= ROOM_MINION_CAP) return;
    windUp(e, s.wind ?? 0.5, () => {
      e.state = 'idle';
      const c = g.spawnEnemy(s.type, e.x + (Math.random() - 0.5) * 8, e.y + e.r + 3, { delay: 0.25 });
      c.minion = true;
      e.children.push(c);
      e.flash = 0.06;
      g.particles.burst(e.x, e.y + e.r, 8, { colors: BLOOD.pale, speed: 45, z: 4 });
    });
  },

  drift(e, dt, g) {
    const d = toward(e.x, e.y, g.player.x, g.player.y);
    e.vx = d.x * e.speed;
    e.vy = d.y * e.speed;
    e.phase += dt;
    const cyc = e.phase % 5;
    e.intangible = cyc > 3.8;
    e.alpha = e.intangible ? 0.22 : cyc > 3.5 ? 0.45 : 0.75 + Math.sin(e.t * 3) * 0.15;
    e.z = 6 + Math.sin(e.t * 2) * 2;
    e.anim = 'move';
  },

  cross(e, dt, g) {
    const s = e.def.shoot;
    const fire = () => {
      const diag = s.alternate && e.shotCount++ % 2 === 1;
      radial(e, g, { count: 4, speed: s.speed }, diag ? Math.PI / 4 : 0);
    };
    if (shootCycle(e, dt, g, fire)) return;
    const d = steer(e, g);
    e.vx = d.x * e.speed;
    e.vy = d.y * e.speed;
    e.anim = 'move';
  },

  // Hovers at a distance, winds up (showing its line), dives, then is dazed for a moment.
  diver(e, dt, g) {
    const dv = e.def.dive, p = g.player;
    e.z = 10 + Math.sin(e.t * 6) * 2;
    e.blur = false;
    if (e.state === 'wind') { tickWind(e, dt, g); faceP(e, g); e.aim = { dx: e.fx, dy: e.fy, len: dv.speed * dv.time }; return; }
    if (e.state === 'attack') {
      e.anim = 'attack';
      e.blur = true;
      e.stateT -= dt;
      e.vx = e.cdx * dv.speed * e.speedMul;
      e.vy = e.cdy * dv.speed * e.speedMul;
      if (e.stateT <= 0 || e.lastHit) { e.state = 'stun'; e.stateT = dv.stun; e.vx = e.vy = 0; if (e.lastHit) g.shake(1); }
      return;
    }
    if (e.state === 'stun') {
      e.anim = 'stun';
      e.vx *= 0.9; e.vy *= 0.9;
      e.stateT -= dt;
      if (e.stateT <= 0) { e.state = 'idle'; e.diveT = dv.every[0] + Math.random() * (dv.every[1] - dv.every[0]); }
      return;
    }
    // hover around the player at a distance
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    const orbit = Math.atan2(dy, dx) + dt * 0.8;
    const tx = p.x + Math.cos(orbit) * dv.hover, ty = p.y + Math.sin(orbit) * dv.hover * 0.8;
    const m = toward(e.x, e.y, tx, ty);
    e.vx = m.x * e.speed;
    e.vy = m.y * e.speed;
    e.anim = 'move';
    faceP(e, g);
    e.diveT = (e.diveT ?? dv.every[0]) - dt;
    if (e.diveT <= 0 && d < dv.hover * 1.8) {
      windUp(e, dv.wind, () => {
        e.state = 'attack';
        e.stateT = dv.time;
        e.cdx = e.fx; e.cdy = e.fy;
        e.aim = null;
        sfx('dash');
      });
    }
  },

  // Under the floor as a mound, surfaces (mound shakes), shoots, sinks again.
  burrower(e, dt, g) {
    const b = e.def.burrow, p = g.player;
    switch (e.state) {
      case 'under': {
        e.intangible = true;
        e.anim = 'under';
        e.stateT -= dt;
        const tx = e.tx ?? p.x, ty = e.ty ?? p.y;
        const m = toward(e.x, e.y, tx, ty);
        const far = Math.hypot(tx - e.x, ty - e.y) > 6;
        e.vx = far ? m.x * b.speed : 0;
        e.vy = far ? m.y * b.speed : 0;
        if (Math.random() < dt * 8) g.particles.spawn(e.x + (Math.random() - 0.5) * 10, e.y + 6, { z: 1, vz: 20, life: 0.4, color: '#58402a', size: 1 });
        if (e.stateT <= 0) {
          e.state = 'surface';
          e.stateT = b.emerge;
          e.vx = e.vy = 0;
          sfx('rumble');
        }
        return;
      }
      case 'surface':
        e.vx = e.vy = 0;
        e.anim = 'under';
        e.jitter = (Math.random() - 0.5) * 3;
        e.stateT -= dt;
        e.surfacing = true;
        if (Math.random() < dt * 20) g.particles.spawn(e.x + (Math.random() - 0.5) * 14, e.y + 6, { z: 1, vz: 40, life: 0.5, color: '#72583a', size: 1 });
        if (e.stateT <= 0) { e.state = 'emerge'; e.stateT = 0.3; e.jitter = 0; e.surfacing = false; e.intangible = false; g.particles.burst(e.x, e.y + 4, 12, { colors: ['#58402a', '#3e2c1c', '#8e7250'], speed: 60, z: 2, vz: 60 }); }
        return;
      case 'emerge':
        e.anim = 'emerge';
        e.animFrame = Math.min(2, Math.floor((0.3 - e.stateT) / 0.1));
        e.stateT -= dt;
        if (e.stateT <= 0) { e.state = 'up'; e.stateT = b.stay; e.shot = false; e.animFrame = null; }
        return;
      case 'wind':
        tickWind(e, dt, g);
        return;
      case 'up':
        e.vx = e.vy = 0;
        e.anim = e.atkT > 0 ? 'attack' : 'idle';
        faceP(e, g);
        e.stateT -= dt;
        if (!e.shot && e.stateT < b.stay - 0.35) {
          e.shot = true;
          const keep = e.stateT;
          windUp(e, e.def.shoot.wind, () => { fireAimed(e, g); e.atkT = 0.25; e.state = 'up'; e.stateT = keep - e.def.shoot.wind; });
          return;
        }
        if (e.stateT <= 0) { e.state = 'sink'; e.stateT = 0.3; }
        return;
      case 'sink':
        e.anim = 'emerge';
        e.animFrame = Math.max(0, Math.floor(e.stateT / 0.1));
        e.stateT -= dt;
        if (e.stateT <= 0) {
          e.state = 'under';
          e.animFrame = null;
          e.stateT = b.time[0] + Math.random() * (b.time[1] - b.time[0]);
          // pop up somewhere near the player, but not on top of them
          const a = Math.random() * TAU, r = 45 + Math.random() * 40;
          const spot = g.room.findFreeSpot(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
          e.tx = spot.x; e.ty = spot.y;
        }
        return;
      default:
        e.state = 'under';
        e.stateT = 0.6 + Math.random();
        e.tx = null;
    }
  },

  // Crawlers move in straight lines and turn at walls; their body segments follow the trail.
  crawler(e, dt, g) {
    e.anim = 'move';
    e.turnT = (e.turnT ?? 0) - dt;
    if (e.turnT <= 0 || e.lastHit || !e.wx && !e.wy) {
      e.turnT = 1 + Math.random() * 1.2;
      const p = g.player, dx = p.x - e.x, dy = p.y - e.y;
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([x, y]) => !(x === -e.wx && y === -e.wy && (e.wx || e.wy)));
      let dir = opts[Math.floor(Math.random() * opts.length)];
      if (Math.random() < 0.6) {
        const want = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
        if (opts.some(([x, y]) => x === want[0] && y === want[1])) dir = want;
      }
      e.wx = dir[0]; e.wy = dir[1];
    }
    e.vx = e.wx * e.speed;
    e.vy = e.wy * e.speed;
    if (e.def.wavy) {
      // eels swim in waves
      const w = Math.sin(e.t * 7) * 0.8;
      e.vx += -e.wy * w * e.speed;
      e.vy += e.wx * w * e.speed;
    }
    e.trail.unshift({ x: e.x, y: e.y });
    if (e.trail.length > 80) e.trail.pop();
  },

  // A body segment: keeps its distance behind whatever it follows. If that dies, it becomes a head.
  segment(e, dt, g) {
    const L = e.leader;
    if (!L || L.dead) {
      e.leader = null;
      e.becomeHead();
      return;
    }
    const sp = e.def.segments?.spacing ?? 12;
    // follow the leader's trail
    let target = L;
    if (L.trail?.length) {
      let acc = 0, prev = L;
      for (const pt of L.trail) {
        acc += Math.hypot(pt.x - prev.x, pt.y - prev.y);
        prev = pt;
        if (acc >= sp) { target = pt; break; }
      }
    }
    const dx = target.x - e.x, dy = target.y - e.y, d = Math.hypot(dx, dy);
    const v = Math.min(d / Math.max(dt, 1e-3), L.speed * 2.5);
    e.vx = d > 0.5 ? (dx / d) * v : 0;
    e.vy = d > 0.5 ? (dy / d) * v : 0;
    e.anim = 'move';
    e.trail.unshift({ x: e.x, y: e.y });
    if (e.trail.length > 80) e.trail.pop();
  },

  // Scurries in short bursts; up close it rears up, then lunges.
  lunger(e, dt, g) {
    const l = e.def.lunge, p = g.player;
    if (e.state === 'wind') { tickWind(e, dt, g); faceP(e, g); return; }
    if (e.state === 'attack') {
      e.anim = 'attack';
      e.stateT -= dt;
      e.vx = e.cdx * l.speed * e.speedMul;
      e.vy = e.cdy * l.speed * e.speedMul;
      if (e.stateT <= 0 || e.lastHit) { e.state = 'recover'; e.stateT = l.recover; e.vx = e.vy = 0; }
      return;
    }
    if (e.state === 'recover') {
      e.anim = 'stun';
      e.vx *= 0.85; e.vy *= 0.85;
      e.stateT -= dt;
      if (e.stateT <= 0) { e.state = 'idle'; e.lungeCd = 0.6; }
      return;
    }
    e.lungeCd = (e.lungeCd ?? 0.8) - dt;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (e.lungeCd <= 0 && d < l.range && lineClear(g.room, e.x, e.y, p.x, p.y, e.r * 0.7)) {
      faceP(e, g);
      windUp(e, l.wind, () => { e.state = 'attack'; e.stateT = l.time; e.cdx = e.fx; e.cdy = e.fy; e.aim = null; });
      e.aim = { dx: e.fx, dy: e.fy, len: l.speed * l.time };
      return;
    }
    // scurry: short dashes in a rough direction, then a pause
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.moving = !e.moving;
      e.wanderT = e.moving ? 0.35 + Math.random() * 0.4 : 0.2 + Math.random() * 0.3;
      if (e.moving) {
        const s = steer(e, g);
        const a = Math.atan2(s.y, s.x) + (Math.random() - 0.5) * 2.2;
        e.wx = Math.cos(a); e.wy = Math.sin(a);
      }
    }
    e.vx = e.moving ? e.wx * e.speed : 0;
    e.vy = e.moving ? e.wy * e.speed : 0;
    e.anim = e.moving ? 'move' : 'idle';
  },

  // Shambles after you; once hurt enough it shakes with rage, then runs.
  shambler(e, dt, g) {
    const r = e.def.rage;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (!e.angry && e.hp < e.maxHp * r.below) {
      faceP(e, g);
      windUp(e, r.wind, () => {
        e.angry = true;
        e.state = 'idle';
        e.artKey = r.art || 'gawperRage';
        e.baseSpeed = r.speed;
        g.particles.burst(e.x, e.y - 12, 10, { colors: ['#dccca8', '#9a8a6a'], speed: 60, z: 14, vz: 40 });
      });
      e.artKey = r.art || 'gawperRage';
      return;
    }
    const d = steer(e, g);
    e.vx = d.x * e.speed;
    e.vy = d.y * e.speed;
    e.anim = 'move';
  },

  // Crawlspider: quick bursts toward you (slightly off to the side), little pauses.
  skitter(e, dt, g) {
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.moving = !e.moving;
      e.wanderT = e.moving ? 0.14 + Math.random() * 0.1 : 0.2 + Math.random() * 0.35;
      if (e.moving) {
        const s = steer(e, g);
        const a = Math.atan2(s.y, s.x) + (Math.random() - 0.5) * 1.6;
        e.wx = Math.cos(a); e.wy = Math.sin(a);
      }
    }
    e.vx = e.moving ? e.wx * e.speed : 0;
    e.vy = e.moving ? e.wy * e.speed : 0;
    e.anim = e.moving ? 'move' : 'idle';
  },

  // Webspitter: keeps 70-120 px away, strafes, and spits webs.
  spitter(e, dt, g) {
    if (shootCycle(e, dt, g, () => fireAimed(e, g))) return;
    const p = g.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    e.side ??= Math.random() < 0.5 ? 1 : -1;
    let mx = -dy / d * e.side, my = dx / d * e.side;     // strafe
    if (d < 70) { mx -= dx / d * 1.4; my -= dy / d * 1.4; } else if (d > 120) { const s = steer(e, g); mx += s.x * 1.4; my += s.y * 1.4; }
    const l = Math.hypot(mx, my) || 1;
    e.vx = (mx / l) * e.speed;
    e.vy = (my / l) * e.speed;
    if (e.lastHit) e.side = -e.side;
    e.anim = 'move';
    faceP(e, g);
  },

  // Mossback: plods at you face-first (its front is armored) and spits spores.
  tank(e, dt, g) {
    if (shootCycle(e, dt, g, () => { fireAimed(e, g); e.atkT = 0.3; })) return;
    const d = steer(e, g);
    e.vx = d.x * e.speed;
    e.vy = d.y * e.speed;
    e.anim = e.atkT > 0 ? 'attack' : 'move';
    faceP(e, g);
    turnShield(e, dt, g);
  },

  // Moss Lurker: hidden moss -> bulges -> bites -> exposed -> sinks and moves.
  lurker(e, dt, g) {
    const l = e.def.lurk, p = g.player;
    e.vx = e.vy = 0;
    switch (e.state) {
      case 'wind': tickWind(e, dt, g); return;
      case 'attack':
        e.anim = 'attack';
        e.stateT -= dt;
        e.vx = e.cdx * l.speed; e.vy = e.cdy * l.speed;
        if (e.stateT <= 0 || e.lastHit) { e.state = 'exposed'; e.stateT = l.exposed; }
        return;
      case 'exposed':
        e.anim = 'stun';
        faceP(e, g);
        e.stateT -= dt;
        if (e.stateT <= 0 && l.armored) {
          // a coffin just shuts again where it is
          e.state = 'hidden'; e.stateT = 1; sfx('clink');
          return;
        }
        if (e.stateT <= 0) {
          e.state = 'travel';
          e.stateT = l.travel;
          e.intangible = true;
          g.particles.burst(e.x, e.y + 4, 8, { colors: ['#30461e', '#44602a'], speed: 40, z: 2 });
          const a = Math.random() * TAU, r = 70 + Math.random() * 40;
          const spot = g.room.findFreeSpot(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
          e.tx = spot.x; e.ty = spot.y;
        }
        return;
      case 'travel': {
        e.anim = 'hidden';
        e.stateT -= dt;
        const m = toward(e.x, e.y, e.tx, e.ty);
        if (Math.hypot(e.tx - e.x, e.ty - e.y) > 4) { e.vx = m.x * 60; e.vy = m.y * 60; }
        if (e.stateT <= 0) { e.state = 'hidden'; e.stateT = 0.6; }
        return;
      }
      default:
        // hidden: can't be hit or hurt anyone until it pounces (a closed coffin can be hit,
        // but shots barely scratch it)
        e.intangible = !l.armored;
        e.harmless = true;
        e.armor = l.armored || 0;
        e.anim = 'hidden';
        e.stateT -= dt;
        if (e.stateT <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < l.trigger) {
          faceP(e, g);
          e.intangible = false;
          e.harmless = false;
          e.armor = 0;
          windUp(e, l.wind, () => { e.state = 'attack'; e.stateT = l.time; e.cdx = e.fx; e.cdy = e.fy; e.aim = null; });
          e.aim = { dx: e.fx, dy: e.fy, len: l.speed * l.time };
        }
    }
  },

  // Hanger: on the ceiling (only its shadow shows) -> shadow grows -> drops -> walks -> climbs.
  dropper(e, dt, g) {
    const d = e.def.drop, p = g.player;
    switch (e.state) {
      case 'wind':
        tickWind(e, dt, g);
        e.anim = 'idle';
        return;
      case 'fall': {
        e.stateT -= dt;
        e.z = Math.max(0, 90 * (e.stateT / d.fall));
        e.vx = e.vy = 0;
        if (e.stateT <= 0) {
          e.z = 0;
          e.state = 'ground';
          e.stateT = d.ground;
          e.intangible = false;
          g.shake(2);
          g.particles.burst(e.x, e.y + 3, 8, { colors: ['#4a3e32', '#2e241d'], speed: 40, z: 1, vz: 20 });
        }
        return;
      }
      case 'ground': {
        e.stateT -= dt;
        const s = steer(e, g);
        e.vx = s.x * e.speed; e.vy = s.y * e.speed;
        e.anim = 'move';
        if (e.stateT <= 0) { e.state = 'climb'; e.stateT = d.climb; e.vx = e.vy = 0; }
        return;
      }
      case 'climb':
        e.stateT -= dt;
        e.vx = e.vy = 0;
        e.z = 90 * (1 - e.stateT / d.climb);
        if (e.stateT <= 0) { e.state = 'ceiling'; e.stateT = 1.4; e.intangible = true; }
        return;
      default: {
        // on the ceiling: creep toward the player; drop when right above them
        e.state = 'ceiling';
        e.intangible = true;
        e.z = 90;
        e.stateT -= dt;
        const m = toward(e.x, e.y, p.x, p.y), dist = Math.hypot(p.x - e.x, p.y - e.y);
        e.vx = dist > 3 ? m.x * d.creep : 0;
        e.vy = dist > 3 ? m.y * d.creep : 0;
        if (e.stateT <= 0 && dist < 10) {
          windUp(e, d.wind, () => { e.state = 'fall'; e.stateT = d.fall; });
        }
      }
    }
  },

  // Loom Mother: leaps, spits a fan of webs, calls crawlspiders; slow walk in between.
  loom(e, dt, g) {
    const h = e.def.hop;
    if (e.state === 'wind') { tickWind(e, dt, g); if (e.winding === 'summon') e.anim = 'summon'; return; }
    if (e.state === 'air') { tickLeap(e, dt, g, h); return; }
    if (e.state === 'recover') { e.vx = e.vy = 0; e.anim = 'idle'; e.stateT -= dt; if (e.stateT <= 0) e.state = 'idle'; return; }
    e.winding = null;
    const s = steer(e, g);
    e.vx = s.x * e.speed; e.vy = s.y * e.speed;
    e.anim = 'move';
    e.moveT = (e.moveT ?? 1.5) - dt;
    if (e.moveT > 0) return;
    e.moveT = 1.6 + Math.random() * 0.8;
    e.children = (e.children || []).filter((c) => !c.dead);
    const moves = ['leap', 'spit', 'leap', 'spit'];
    if (e.children.length < e.def.summon.max) moves.push('summon');
    const pick = moves[Math.floor(Math.random() * moves.length)];
    if (pick === 'leap') {
      startLeap(e, g, h, () => { radial(e, g, e.def.landShots, Math.random() * TAU); g.shake(4); });
    } else if (pick === 'spit') {
      faceP(e, g);
      windUp(e, e.def.shoot.wind, () => { fireAimed(e, g); e.state = 'idle'; e.atkT = 0.3; });
    } else {
      faceP(e, g);
      e.winding = 'summon';
      windUp(e, e.def.summon.wind, () => {
        e.state = 'idle';
        for (let i = 0; i < e.def.summon.count; i++) {
          const a = Math.random() * TAU;
          const spot = g.room.findFreeSpot(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 24);
          const c = g.spawnEnemy(e.def.summon.type, spot.x, spot.y, { delay: 0.3 });
          c.minion = true;
          e.children.push(c);
        }
      });
      e.anim = 'summon';
    }
  },

  // Flickerwisp: its flame shows up where it's going, it blinks there, then shoots.
  blinker(e, dt, g) {
    const b = e.def.blink;
    e.z = 9 + Math.sin(e.t * 5) * 2;
    e.vx = e.vy = 0;
    if (e.state === 'wind') {
      if (e.winding === 'blink') e.alpha = Math.max(0.15, e.stateT / b.wind);
      tickWind(e, dt, g);
      return;
    }
    e.anim = 'idle';
    e.blinkT = (e.blinkT ?? b.every[0]) - dt;
    if (e.blinkT > 0) return;
    const p = g.player, a = Math.random() * TAU, r = b.range[0] + Math.random() * (b.range[1] - b.range[0]);
    const dest = g.room.findFreeSpot(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.8);
    e.blinkTo = dest;
    e.winding = 'blink';
    windUp(e, b.wind, () => {
      g.particles.burst(e.x, e.y - 8, 8, { colors: ['#ff8a2a', '#ffd25a'], speed: 40, z: 8 });
      e.x = dest.x; e.y = dest.y;
      e.alpha = 1;
      e.blinkTo = null;
      e.winding = null;
      g.particles.burst(e.x, e.y - 8, 10, { colors: ['#ff8a2a', '#ffd25a', '#fff3c0'], speed: 50, z: 8 });
      faceP(e, g);
      windUp(e, e.def.shoot.wind, () => {
        fireAimed(e, g);
        e.state = 'idle';
        e.atkT = 0.2;
        e.blinkT = b.every[0] + Math.random() * (b.every[1] - b.every[0]);
      });
    });
  },

  // Kindler: keeps its distance, lights a coal and lobs it where you stand.
  lobber(e, dt, g) {
    const l = e.def.lob, p = g.player;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    let mx = 0, my = 0;
    if (d < 80) { mx = -dx / d; my = -dy / d; } else if (d > 140) { const s = steer(e, g); mx = s.x; my = s.y; }
    e.vx = mx * e.speed; e.vy = my * e.speed;
    e.anim = mx || my ? 'move' : e.atkT > 0 ? 'attack' : 'idle';
    faceP(e, g);
    e.lobT = (e.lobT ?? l.every * 0.6) - dt;
    if (e.lobT > 0) return;
    e.lobT = l.every * (0.85 + Math.random() * 0.3);
    windUp(e, l.wind, () => {
      e.state = 'idle';
      e.atkT = 0.3;
      sfx('lob');
      const tx = p.x, ty = p.y;
      addLob(g, e.x, e.y - 12, tx, ty, { flight: l.flight, onLand: (gg, x, y) => { sfx('coalLand'); fireBurst(gg, x, y, l.fires); } });
    });
  },

  // Smokebelly: up close it breathes in (pulling you a little), then breathes a cone of fire.
  breather(e, dt, g) {
    if (breathLogic(e, dt, g)) return;
    const s = steer(e, g);
    e.vx = s.x * e.speed; e.vy = s.y * e.speed;
    e.anim = 'move';
  },

  // Ember Hound: charges trailing fire and breathes fire up close.
  hound(e, dt, g) {
    e.animMul = 1;
    e.blur = false;
    if (e.state !== 'charge' && e.state !== 'stun' && breathLogic(e, dt, g)) return;
    if (chargeLogic(e, dt, g, e.def.charge)) return;
    axisWander(e, dt, g, e.speed);
  },

  // Rat Matron: charges like a ratram and calls gnawers out of the walls.
  matron(e, dt, g) {
    const s = e.def.summon;
    e.animMul = 1;
    e.blur = false;
    if (e.state === 'idle' || e.state === undefined) {
      e.summonT = (e.summonT ?? 3) - dt;
      e.children = (e.children || []).filter((c) => !c.dead);
      if (e.summonT <= 0 && e.children.length < s.max) {
        e.summonT = 5 + Math.random() * 2;
        faceP(e, g);
        windUp(e, s.wind, () => {
          e.state = 'idle';
          for (let i = 0; i < s.count; i++) {
            const a = Math.random() * TAU;
            const spot = g.room.findFreeSpot(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 24);
            const c = g.spawnEnemy(s.type, spot.x, spot.y, { delay: 0.3 });
            e.children.push(c);
          }
          g.shake(3);
        });
        e.anim = 'summon';
        e.winding = 'summon';
        return;
      }
    }
    if (e.state === 'wind' && e.winding === 'summon') { e.anim = 'summon'; tickWind(e, dt, g); if (e.state !== 'wind') e.winding = null; return; }
    if (chargeLogic(e, dt, g, e.def.charge)) return;
    axisWander(e, dt, g, e.speed);
  },

  // ---- chapter 2 -------------------------------------------------------------------------

  // Pebbler: sits there looking like a rock; when you come close it uncurls and rolls at you,
  // bouncing off walls, then sits dizzy.
  roller(e, dt, g) {
    e.vx = e.vy = 0;
    if (rollLogic(e, dt, g, e.def.roll)) return;
    e.anim = 'idle';
    e.rollCd = (e.rollCd ?? 0.6) - dt;
    const p = g.player;
    if (e.rollCd <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < e.def.roll.trigger) startRoll(e, g, e.def.roll);
  },

  // Boulderback: plods after you and every few seconds slams the ground (a ring of stones).
  slammer(e, dt, g) {
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'attack') { e.vx = e.vy = 0; e.anim = 'attack'; e.stateT -= dt; if (e.stateT <= 0) e.state = 'idle'; return; }
    const d = steer(e, g);
    e.vx = d.x * e.speed; e.vy = d.y * e.speed;
    e.anim = 'move';
    e.slamT = (e.slamT ?? e.def.slam.every * 0.7) - dt;
    if (e.slamT <= 0) { e.slamT = e.def.slam.every * (0.85 + Math.random() * 0.3); slamAttack(e, g, e.def.slam); }
  },

  // Pick Ghoul: walks up to you, raises its pick and swings it in front of itself.
  swinger(e, dt, g) {
    const s = e.def.swing, p = g.player;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'attack') {
      e.vx = e.vy = 0;
      e.anim = 'attack';
      e.stateT -= dt;
      if (!e.swung) {
        e.swung = true;
        sfx('swing');
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
        const ang = Math.acos(Math.max(-1, Math.min(1, (dx * e.fx + dy * e.fy) / (d || 1))));
        if (d < s.reach + p.r && ang < s.arc / 2 + 0.2) p.hurt(1, e.def.name, g, e.x, e.y);
        // the swing's sweep, as dust
        for (let i = 0; i < 8; i++) {
          const a = Math.atan2(e.fy, e.fx) + (i / 7 - 0.5) * s.arc;
          g.particles.spawn(e.x + Math.cos(a) * s.reach, e.y + Math.sin(a) * s.reach, { z: 6, vz: 10, life: 0.25, color: '#d8d0c0', size: 2 });
        }
      }
      if (e.stateT <= 0) { e.state = 'recover'; e.stateT = s.recover; }
      return;
    }
    if (e.state === 'recover') { e.vx = e.vy = 0; e.anim = 'idle'; e.stateT -= dt; if (e.stateT <= 0) e.state = 'idle'; return; }
    const dd = Math.hypot(p.x - e.x, p.y - e.y);
    if (dd < s.reach + 6) {
      faceP(e, g);
      e.aim = { dx: e.fx, dy: e.fy, len: s.reach + 6 };
      windUp(e, s.wind, () => { e.state = 'attack'; e.stateT = 0.2; e.swung = false; });
      return;
    }
    const d = steer(e, g);
    e.vx = d.x * e.speed; e.vy = d.y * e.speed;
    e.anim = 'move';
  },

  // Shade: drifts at you through the rocks, mostly see-through; its face shows, it wails, then
  // dashes straight through where you were.
  phaser(e, dt, g) {
    const dv = e.def.dash, p = g.player;
    e.z = 7 + Math.sin(e.t * 3) * 2;
    e.blur = false;
    if (e.state === 'wind') { e.alpha = 0.95; tickWind(e, dt, g); faceP(e, g); e.aim = { dx: e.fx, dy: e.fy, len: dv.speed * dv.time }; return; }
    if (e.state === 'attack') {
      e.anim = 'attack';
      e.blur = true;
      e.alpha = 0.9;
      e.stateT -= dt;
      e.vx = e.cdx * dv.speed * e.speedMul; e.vy = e.cdy * dv.speed * e.speedMul;
      if (e.stateT <= 0) { e.state = 'idle'; e.dashT = dv.every[0] + Math.random() * (dv.every[1] - dv.every[0]); }
      return;
    }
    e.alpha = 0.45 + Math.sin(e.t * 4) * 0.1;
    const m = toward(e.x, e.y, p.x, p.y);
    e.vx = m.x * e.speed; e.vy = m.y * e.speed;
    e.anim = 'move';
    e.dashT = (e.dashT ?? dv.every[0]) - dt;
    if (e.dashT <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < 150) {
      faceP(e, g);
      windUp(e, dv.wind, () => { e.state = 'attack'; e.stateT = dv.time; e.cdx = e.fx; e.cdy = e.fy; e.aim = null; sfx('dash'); });
    }
  },

  // Ossifier: keeps its distance and throws bones that fly out and come back.
  thrower(e, dt, g) {
    const t = e.def.throw, p = g.player;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    let mx = 0, my = 0;
    if (d < 70) { mx = -dx / d; my = -dy / d; } else if (d > 130) { const s = steer(e, g); mx = s.x; my = s.y; }
    e.vx = mx * e.speed; e.vy = my * e.speed;
    e.anim = e.atkT > 0 ? 'attack' : mx || my ? 'move' : 'idle';
    faceP(e, g);
    e.throwT = (e.throwT ?? t.every * 0.6) - dt;
    if (e.throwT > 0) return;
    e.throwT = t.every * (0.85 + Math.random() * 0.3);
    e.aim = { dx: e.fx, dy: e.fy, len: t.range };
    windUp(e, t.wind, () => { e.state = 'idle'; throwBones(e, g, t); });
  },

  // Rattleskull: bobs toward you; chatters, spits teeth, then lunges a short way.
  skull(e, dt, g) {
    const l = e.def.lunge, p = g.player;
    e.z = 8 + Math.sin(e.t * 6) * 2;
    e.blur = false;
    if (e.state === 'wind') { tickWind(e, dt, g); faceP(e, g); return; }
    if (e.state === 'attack') {
      e.anim = 'attack';
      e.blur = true;
      e.stateT -= dt;
      e.vx = e.cdx * l.speed * e.speedMul; e.vy = e.cdy * l.speed * e.speedMul;
      if (e.stateT <= 0 || e.lastHit) { e.state = 'idle'; e.vx = e.vy = 0; }
      return;
    }
    const s = e.def.shoot;
    e.shootT -= dt;
    if (e.shootT <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < 170) {
      e.shootT = s.every * (0.85 + Math.random() * 0.3);
      faceP(e, g);
      windUp(e, s.wind, () => {
        fireAimed(e, g);
        faceP(e, g);
        e.state = 'attack'; e.stateT = l.time; e.cdx = e.fx; e.cdy = e.fy;
      });
      return;
    }
    const m = toward(e.x, e.y, p.x, p.y), w = Math.sin(e.t * 3 + e.seed * 6);
    e.vx = (m.x - m.y * w) * e.speed; e.vy = (m.y + m.x * w) * e.speed;
    e.anim = 'idle';
  },

  // Snapjaw / The Undertow: only a fin above the water, circling; bubbles rise where it will
  // come up, it leaps out to bite (landing spot shown), sits a moment, then dives again.
  submerger(e, dt, g) {
    const h = e.def.hop, sw = e.def.swim, p = g.player;
    if (e.state === 'wind') { e.intangible = false; tickWind(e, dt, g); if (e.winding !== 'spit') e.anim = 'wind'; bubbles(e, g, dt); return; }
    if (e.state === 'air') { tickLeap(e, dt, g, h); if (e.state !== 'air') e.anim = 'idle'; return; }
    if (e.state === 'recover') {
      e.vx = e.vy = 0;
      e.anim = e.atkT > 0 ? 'attack' : 'idle';
      faceP(e, g);
      e.stateT -= dt;
      if (e.stateT > 0) return;
      // the Undertow spits a fan of water before diving again
      if (e.def.shoot && !e.spat) {
        e.spat = true;
        e.winding = 'spit';
        windUp(e, 0.55, () => { fireAimed(e, g); e.atkT = 0.3; e.state = 'recover'; e.stateT = 0.35; e.winding = null; });
        e.anim = 'attack';
        return;
      }
      e.spat = false;
      e.state = 'under';
      e.stateT = sw.under[0] + Math.random() * (sw.under[1] - sw.under[0]);
      sfx('splash');
      g.particles.burst(e.x, e.y + 2, 10, { colors: ['#4a8aa8', '#8ad0f0', '#d0f0ff'], speed: 45, z: 2, vz: 40 });
      return;
    }
    // under the water: circle the player at a distance
    e.state = 'under';
    e.intangible = true;
    e.anim = 'under';
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    e.orbit ??= Math.random() < 0.5 ? 1 : -1;
    const a = Math.atan2(dy, dx) + e.orbit * 0.9;
    const want = 75;
    const tx = p.x + Math.cos(a) * want, ty = p.y + Math.sin(a) * want;
    const m = toward(e.x, e.y, tx, ty);
    e.vx = m.x * sw.speed; e.vy = m.y * sw.speed;
    if (e.lastHit) e.orbit = -e.orbit;
    if (Math.random() < dt * 6) g.particles.spawn(e.x - e.fx * e.r, e.y + 4, { z: 1, vz: 6, life: 0.4, color: '#8ad0f0', size: 1 });
    e.stateT -= dt;
    if (e.stateT <= 0 && d < 170) {
      if (startLeap(e, g, h, () => {
        sfx('splashBig');
        g.particles.burst(e.x, e.y + 2, 14, { colors: ['#4a8aa8', '#8ad0f0', '#d0f0ff'], speed: 60, z: 2, vz: 60 });
        if (e.def.landShots) radial(e, g, e.def.landShots, Math.random() * TAU);
        if (e.def.mini) g.shake(4);
      })) e.winding = null;
      else e.stateT = 0.4;
    }
  },

  // Bloatfish: drifts at you; up close it swells up, shoots its spikes all around, goes limp.
  puffer(e, dt, g) {
    const pf = e.def.puff, p = g.player;
    e.z = 6 + Math.sin(e.t * 2.5) * 2;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'stun') { e.vx *= 0.9; e.vy *= 0.9; e.anim = 'stun'; e.stateT -= dt; if (e.stateT <= 0) { e.state = 'idle'; e.puffCd = 1; } return; }
    const m = toward(e.x, e.y, p.x, p.y);
    e.vx = m.x * e.speed; e.vy = m.y * e.speed;
    e.anim = 'move';
    e.puffCd = (e.puffCd ?? 0.5) - dt;
    if (e.puffCd <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < pf.trigger) {
      windUp(e, pf.wind, () => {
        radial(e, g, { count: pf.count, speed: pf.speed, style: 'green' }, Math.random() * TAU);
        e.state = 'stun'; e.stateT = pf.rest;
        sfx('squish');
      });
    }
  },

  // Giant Clam: shut tight (shots barely scratch it); opens with its pearl glowing, fires
  // pearls, stays open for a moment (hit it now!), shuts again.
  clam(e, dt, g) {
    const s = e.def.shell;
    e.vx = e.vy = 0;
    faceP(e, g);
    if (e.state === 'wind') { e.armor = 0.4; tickWind(e, dt, g); return; }
    if (e.state === 'open') {
      e.armor = 0;
      e.anim = e.stateT > s.open - 0.3 ? 'attack' : 'stun';
      e.stateT -= dt;
      if (e.stateT <= 0) { e.state = 'idle'; e.stateT = s.closed * (0.8 + Math.random() * 0.4); sfx('clink'); }
      return;
    }
    e.armor = s.armor;
    e.anim = 'hidden';
    e.stateT -= dt;
    if (e.stateT <= 0 && Math.hypot(g.player.x - e.x, g.player.y - e.y) < 200) {
      windUp(e, s.wind, () => { fireAimed(e, g); e.state = 'open'; e.stateT = s.open; });
    }
  },

  // Stonemaw: rolls across the room bouncing off the walls, slams the ground, shakes rocks
  // loose from the ceiling.
  stonemaw(e, dt, g) {
    if (rollLogic(e, dt, g, e.def.roll)) return;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'attack') { e.vx = e.vy = 0; e.anim = 'attack'; e.stateT -= dt; if (e.stateT <= 0) e.state = 'idle'; return; }
    const d = steer(e, g);
    e.vx = d.x * 18; e.vy = d.y * 18;
    e.anim = 'move';
    e.moveT = (e.moveT ?? 1.4) - dt;
    if (e.moveT > 0) return;
    e.moveT = 1.4 + Math.random() * 0.8;
    const pick = ['roll', 'roll', 'slam', 'rocks'][Math.floor(Math.random() * 4)];
    if (pick === 'roll') startRoll(e, g, e.def.roll);
    else if (pick === 'slam') slamAttack(e, g, e.def.slam);
    else {
      faceP(e, g);
      e.anim = 'wind';
      windUp(e, 0.6, () => { e.state = 'attack'; e.stateT = 0.4; g.shake(5); sfx('slam'); rockRain(g, 5, 80); });
    }
  },

  // Bone Colossus: stomps a shockwave and throws three bones that come back.
  colossus(e, dt, g) {
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'attack') { e.vx = e.vy = 0; e.anim = 'attack'; e.stateT -= dt; if (e.stateT <= 0) e.state = 'idle'; return; }
    const d = steer(e, g);
    e.vx = d.x * e.speed; e.vy = d.y * e.speed;
    e.anim = 'move';
    faceP(e, g);
    e.moveT = (e.moveT ?? 1.6) - dt;
    if (e.moveT > 0) return;
    e.moveT = 1.8 + Math.random() * 0.8;
    if (Math.random() < 0.5) slamAttack(e, g, e.def.slam);
    else {
      const t = e.def.throw;
      e.aim = { dx: e.fx, dy: e.fy, len: t.range };
      windUp(e, t.wind, () => { e.state = 'attack'; e.stateT = 0.3; throwBones(e, g, t); });
    }
  },

  // ---- chapter 3 -------------------------------------------------------------------------

  // Chainling: walks at you swinging its ball around; winds up and hurls it on the chain.
  flail(e, dt, g) {
    if (flailLogic(e, dt, g)) return;
    const d = steer(e, g);
    e.vx = d.x * e.speed; e.vy = d.y * e.speed;
    e.anim = 'move';
    e.throwT = (e.throwT ?? e.def.flail.every * 0.7) - dt;
    if (e.throwT <= 0 && Math.hypot(g.player.x - e.x, g.player.y - e.y) < e.def.flail.reach + 20) {
      e.throwT = e.def.flail.every * (0.85 + Math.random() * 0.3);
      startFlailThrow(e, g);
    }
  },

  // Gargoyle: stone (armored, harmless) until you line up with it; then it charges at you,
  // crashes, sits dazed and turns back to stone.
  statue(e, dt, g) {
    const stone = e.state === 'idle' || e.state === undefined;
    e.z = e.state === 'charge' ? 6 : 0;
    e.blur = false;
    e.animMul = 1;
    if (stone) {
      e.vx = e.vy = 0;
      e.anim = 'idle';
      e.armor = e.def.stoneArmor;
      e.harmless = true;
      e.wakeCd = (e.wakeCd ?? 0.8) - dt;
      if (e.wakeCd > 0) return;
    } else {
      e.armor = 0;
      e.harmless = false;
    }
    if (chargeLogic(e, dt, g, e.def.charge)) {
      e.armor = 0;
      e.harmless = false;
      if (e.state === 'idle') e.wakeCd = 1.2;   // back to stone for a moment
      return;
    }
    if (!stone) e.state = 'idle';
  },

  // Brute: plods after you; raises its fists and pounds: shockwave lines in a cross (or an x).
  pounder(e, dt, g) {
    const pd = e.def.pound;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'attack') { e.vx = e.vy = 0; e.anim = 'attack'; e.stateT -= dt; if (e.stateT <= 0) e.state = 'idle'; return; }
    const d = steer(e, g);
    e.vx = d.x * e.speed; e.vy = d.y * e.speed;
    e.anim = 'move';
    e.poundT = (e.poundT ?? pd.every * 0.6) - dt;
    if (e.poundT <= 0) { e.poundT = pd.every * (0.85 + Math.random() * 0.3); poundAttack(e, g, pd); }
  },

  // Hookjaw: throws a hook on a chain; if it catches you, it reels you in.
  hooker(e, dt, g) {
    const hk = e.def.hook, p = g.player;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.hook) { e.vx = e.vy = 0; e.anim = 'attack'; tickHook(e, dt, g, hk); return; }
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    let mx = 0, my = 0;
    if (d < 70) { mx = -dx / d; my = -dy / d; } else if (d > 120) { const s = steer(e, g); mx = s.x; my = s.y; }
    e.vx = mx * e.speed; e.vy = my * e.speed;
    e.anim = mx || my ? 'move' : 'idle';
    faceP(e, g);
    e.hookT = (e.hookT ?? hk.every * 0.6) - dt;
    if (e.hookT <= 0 && d < hk.reach + 10) {
      e.hookT = hk.every * (0.85 + Math.random() * 0.3);
      e.aim = { dx: e.fx, dy: e.fy, len: hk.reach };
      windUp(e, hk.wind, () => {
        e.state = 'idle';
        e.hook = { x: e.x, y: e.y - 6, dx: e.fx, dy: e.fy, dist: 0, phase: 'out' };
        sfx('swing');
      });
    }
  },

  // Sentry Eye: drifts at a distance; a thin red line shows where it's looking (the line is set
  // when the wind-up starts, so stepping off it is safe), then it burns a beam along it.
  lasereye(e, dt, g) {
    const lz = e.def.laser, p = g.player;
    e.z = 10 + Math.sin(e.t * 2) * 2;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'attack') {
      e.vx = e.vy = 0;
      e.anim = 'attack';
      e.stateT -= dt;
      const end = beamEnd(e, g, e.beamDx, e.beamDy, lz.len);
      e.beam = end;
      g.shake(1);
      if (!p.dead && distToSegment(p.x, p.y, e.x, e.y, end.x, end.y) < p.r + 4) p.hurt(1, e.def.name, g, e.x, e.y);
      if (Math.random() < dt * 40) {
        const k = Math.random();
        g.particles.spawn(e.x + (end.x - e.x) * k, e.y + (end.y - e.y) * k, { z: 6, vz: 30, life: 0.3, color: Math.random() < 0.5 ? '#ff4a2a' : '#ffd25a', size: 1 });
      }
      if (e.stateT <= 0) { e.state = 'idle'; e.beam = null; }
      return;
    }
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    const want = d < 90 ? -1 : d > 140 ? 1 : 0;
    e.vx = (dx / d) * e.speed * want + (-dy / d) * e.speed * 0.5;
    e.vy = (dy / d) * e.speed * want + (dx / d) * e.speed * 0.5;
    e.anim = 'idle';
    e.laserT = (e.laserT ?? lz.every * 0.6) - dt;
    if (e.laserT <= 0) {
      e.laserT = lz.every * (0.85 + Math.random() * 0.3);
      faceP(e, g);
      e.beamDx = e.fx; e.beamDy = e.fy;
      const end = beamEnd(e, g, e.fx, e.fy, lz.len);
      e.aim = { dx: e.fx, dy: e.fy, len: Math.hypot(end.x - e.x, end.y - e.y) };
      windUp(e, lz.wind, () => { e.state = 'attack'; e.stateT = lz.time; sfx('beam'); });
    }
  },

  // Ironclad: walks at you behind its shield (which turns slowly); up close it sets its spear and lunges.
  knight(e, dt, g) {
    const l = e.def.lunge, p = g.player;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'attack') {
      e.anim = 'attack';
      e.stateT -= dt;
      e.vx = e.cdx * l.speed * e.speedMul; e.vy = e.cdy * l.speed * e.speedMul;
      if (e.stateT <= 0 || e.lastHit) { e.state = 'recover'; e.stateT = l.recover; e.vx = e.vy = 0; }
      return;
    }
    if (e.state === 'recover') { e.vx *= 0.85; e.vy *= 0.85; e.anim = 'idle'; e.stateT -= dt; if (e.stateT <= 0) e.state = 'idle'; return; }
    const d = steer(e, g);
    e.vx = d.x * e.speed; e.vy = d.y * e.speed;
    e.anim = 'move';
    turnShield(e, dt, g);
    e.lungeCd = (e.lungeCd ?? 1) - dt;
    if (e.lungeCd <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < l.range && lineClear(g.room, e.x, e.y, p.x, p.y, e.r * 0.7)) {
      e.lungeCd = 1.6;
      faceP(e, g);
      e.sa = Math.atan2(e.fy, e.fx);
      e.aim = { dx: e.fx, dy: e.fy, len: l.speed * l.time };
      windUp(e, l.wind, () => { e.state = 'attack'; e.stateT = l.time; e.cdx = e.fx; e.cdy = e.fy; e.aim = null; sfx('dash'); });
    }
  },

  // Tomb Hand: cracks creep after you under the floor, stop and glow, then a hand bursts up.
  grabber(e, dt, g) {
    const gr = e.def.grab, p = g.player;
    if (e.state === 'wind') { e.anim = 'wind'; tickWind(e, dt, g); return; }
    if (e.state === 'up') {
      e.vx = e.vy = 0;
      e.anim = 'attack';
      e.stateT -= dt;
      if (e.stateT <= 0) { e.state = 'under'; e.stateT = gr.track[0] + Math.random() * (gr.track[1] - gr.track[0]); sfx('rumble'); }
      return;
    }
    // under the floor
    e.state = 'under';
    e.intangible = true;
    e.anim = 'hidden';
    const m = toward(e.x, e.y, p.x, p.y), d = Math.hypot(p.x - e.x, p.y - e.y);
    e.vx = d > 4 ? m.x * gr.speed : 0; e.vy = d > 4 ? m.y * gr.speed : 0;
    e.stateT = (e.stateT || 1) - dt;
    if (e.stateT <= 0) {
      e.vx = e.vy = 0;
      windUp(e, gr.wind, () => {
        e.state = 'up'; e.stateT = gr.up; e.intangible = false;
        sfx('rockBreak');
        g.particles.burst(e.x, e.y + 4, 12, { colors: ['#4a4652', '#68646e', '#2a2430'], speed: 60, z: 2, vz: 60 });
        if (!p.dead && Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 4) p.hurt(1, e.def.name, g, e.x, e.y);
      });
    }
  },

  // Gulper: its throat swells, the line shows, its tongue lashes out and snaps back.
  tongue(e, dt, g) {
    const tg = e.def.tongue, p = g.player;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'attack') {
      e.vx = e.vy = 0;
      e.anim = 'attack';
      e.tongueT += dt;
      const t = e.tongueT, total = tg.out * 2 + tg.hold;
      const k = t < tg.out ? t / tg.out : t < tg.out + tg.hold ? 1 : Math.max(0, 1 - (t - tg.out - tg.hold) / tg.out);
      e.tongueLen = k * tg.reach;
      const tx = e.x + e.cdx * e.tongueLen, ty = e.y + e.cdy * e.tongueLen;
      if (!p.dead && distToSegment(p.x, p.y, e.x, e.y, tx, ty) < p.r + 3) p.hurt(1, e.def.name, g, tx, ty);
      if (t >= total) { e.state = 'idle'; e.tongueLen = 0; }
      return;
    }
    const d = steer(e, g);
    e.vx = d.x * e.speed; e.vy = d.y * e.speed;
    e.anim = 'move';
    e.lickT = (e.lickT ?? tg.every * 0.6) - dt;
    if (e.lickT <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < tg.reach + 10 && lineClear(g.room, e.x, e.y, p.x, p.y, 2, 'fly')) {
      e.lickT = tg.every * (0.85 + Math.random() * 0.3);
      faceP(e, g);
      e.cdx = e.fx; e.cdy = e.fy;
      e.aim = { dx: e.fx, dy: e.fy, len: tg.reach };
      windUp(e, tg.wind, () => { e.state = 'attack'; e.tongueT = 0; sfx('squish'); });
    }
  },

  // ---- chapter 4 -------------------------------------------------------------------------

  // Umbilic: tied to the spot it started on by a fleshy cord; strains toward you, rears up and
  // lunges as far as the cord lets it, then is pulled back.
  tethered(e, dt, g) {
    const tt = e.def.tether, p = g.player;
    e.anchor ??= { x: e.x, y: e.y };
    const a = e.anchor;
    if (e.state === 'wind') { tickWind(e, dt, g); return; }
    if (e.state === 'attack') {
      e.anim = 'attack';
      e.stateT -= dt;
      e.vx = e.cdx * tt.speed; e.vy = e.cdy * tt.speed;
      if (Math.hypot(e.x - a.x, e.y - a.y) >= tt.length || e.stateT <= 0 || e.lastHit) { e.state = 'back'; e.vx = e.vy = 0; g.shake(1); }
      return;
    }
    // drawn back toward the anchor, or straining at the end of the cord
    const dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 1;
    const want = e.state === 'back' ? 0 : Math.min(tt.length * 0.4, d);
    const tx = a.x + (dx / d) * want, ty = a.y + (dy / d) * want;
    const m = toward(e.x, e.y, tx, ty), far = Math.hypot(tx - e.x, ty - e.y);
    const sp = e.state === 'back' ? 90 : 30;
    e.vx = far > 2 ? m.x * sp : 0; e.vy = far > 2 ? m.y * sp : 0;
    if (e.state === 'back' && far < 4) e.state = 'idle';
    e.anim = 'idle';
    faceP(e, g);
    e.lungeT = (e.lungeT ?? tt.every * 0.6) - dt;
    if (e.state !== 'back' && e.lungeT <= 0 && Math.hypot(p.x - a.x, p.y - a.y) < tt.length + 30) {
      e.lungeT = tt.every * (0.85 + Math.random() * 0.3);
      faceP(e, g);
      e.aim = { dx: e.fx, dy: e.fy, len: tt.length };
      windUp(e, tt.wind, () => { e.state = 'attack'; e.stateT = 0.6; e.cdx = e.fx; e.cdy = e.fy; e.aim = null; sfx('dash'); });
    }
  },

  // The Jailer: swings its ball around, hurls it, pounds shockwaves, calls chainlings.
  jailer(e, dt, g) {
    if (flailLogic(e, dt, g)) return;
    if (e.state === 'attack') { e.vx = e.vy = 0; e.anim = 'attack'; e.stateT -= dt; if (e.stateT <= 0) e.state = 'idle'; return; }
    const d = steer(e, g);
    e.vx = d.x * e.speed; e.vy = d.y * e.speed;
    e.anim = 'move';
    e.moveT = (e.moveT ?? 1.5) - dt;
    if (e.moveT > 0) return;
    e.moveT = 1.6 + Math.random() * 0.8;
    e.children = (e.children || []).filter((c) => !c.dead);
    const moves = ['throw', 'throw', 'pound', 'pound'];
    if (e.children.length < e.def.summon.max) moves.push('summon');
    const pick = moves[Math.floor(Math.random() * moves.length)];
    if (pick === 'throw') startFlailThrow(e, g);
    else if (pick === 'pound') poundAttack(e, g, e.def.pound);
    else {
      faceP(e, g);
      windUp(e, e.def.summon.wind, () => {
        e.state = 'idle';
        for (let i = 0; i < e.def.summon.count; i++) {
          const a = Math.random() * TAU;
          const spot = g.room.findFreeSpot(e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 26);
          const c = g.spawnEnemy(e.def.summon.type, spot.x, spot.y, { delay: 0.3 });
          c.minion = true;
          e.children.push(c);
        }
      });
    }
  },
};

// ---- flails (Chainling, Jailer) ------------------------------------------------------------
// The ball circles its owner (touching it hurts); a throw sends it out along a line and back.
function flailLogic(e, dt, g) {
  const f = e.def.flail, p = g.player;
  e.ball ??= { x: e.x, y: e.y, a: 0, phase: 'spin', d: 0 };
  const b = e.ball;
  if (b.phase === 'spin') {
    b.a += dt * f.spin * (e.state === 'wind' ? 2.2 : 1);
    b.x = e.x + Math.cos(b.a) * f.orbit;
    b.y = e.y + Math.sin(b.a) * f.orbit * 0.7;
  } else {
    // thrown: out along the line, then back
    const sp = 260;
    if (b.phase === 'out') { b.d += sp * dt; if (b.d >= f.reach) b.phase = 'back'; }
    else { b.d -= sp * 0.8 * dt; if (b.d <= f.orbit) { b.phase = 'spin'; b.a = Math.atan2(b.dy, b.dx); } }
    b.x = e.x + b.dx * b.d;
    b.y = e.y + b.dy * b.d;
    const room = g.room;
    if (b.phase === 'out' && (room.isFlySolid(room.colAt(b.x), room.rowAt(b.y)) || b.x < room.x0 || b.x > room.R || b.y < room.y0 || b.y > room.B)) {
      b.phase = 'back';
      g.shake(2);
      sfx('slam');
      g.particles.burst(b.x, b.y, 8, { colors: ['#5a5048', '#3a3430'], speed: 50, z: 4 });
    }
  }
  if (!p.dead && Math.hypot(p.x - b.x, p.y - b.y) < f.ball + p.r) p.hurt(1, e.def.name, g, b.x, b.y);
  if (e.state === 'wind') { tickWind(e, dt, g); return true; }
  if (b.phase !== 'spin') { e.vx = e.vy = 0; e.anim = 'attack'; return true; }
  return false;
}

function startFlailThrow(e, g) {
  faceP(e, g);
  e.aim = { dx: e.fx, dy: e.fy, len: e.def.flail.reach };
  windUp(e, e.def.flail.wind, () => {
    e.state = 'idle';
    Object.assign(e.ball, { phase: 'out', dx: e.fx, dy: e.fy, d: e.def.flail.orbit });
    sfx('swing');
  });
}

// Fists up, then a pound: lines of shockwave shots in a cross, alternating with an x.
function poundAttack(e, g, pd) {
  faceP(e, g);
  windUp(e, pd.wind, () => {
    e.state = 'attack';
    e.stateT = 0.4;
    g.shake(e.def.mini ? 5 : 3);
    sfx('slam');
    const off = (e.poundN = (e.poundN || 0) + 1) % 2 ? 0 : Math.PI / 4;
    for (let k = 0; k < 4; k++) {
      const a = off + (k * Math.PI) / 2;
      for (let i = 0; i < pd.rows; i++) g.enemyShoot(e, a, pd.speed * (1 - i * 0.2), 'dust');
    }
    g.particles.burst(e.x, e.y + 4, 14, { colors: ['#5a5048', '#3a3430', '#8a7a62'], speed: 70, z: 2, vz: 40 });
    g.effects.ring(e.x, e.y + 3, e.r + 14, 'rgba(160,140,110,0.7)', 0.3);
  });
}

// A thrown hook: flies out; if it catches the player it hurts and reels them in; else it comes back.
function tickHook(e, dt, g, hk) {
  const h = e.hook, p = g.player, room = g.room;
  if (h.phase === 'out') {
    h.dist += hk.speed * dt;
    h.x = e.x + h.dx * h.dist; h.y = e.y - 6 + h.dy * h.dist;
    if (!p.dead && Math.hypot(p.x - h.x, p.y - h.y) < p.r + 5) {
      h.phase = 'pull'; h.t = 0;
      p.hurt(1, e.def.name, g, h.x, h.y);
      sfx('clink');
    } else if (h.dist >= hk.reach || room.isFlySolid(room.colAt(h.x), room.rowAt(h.y))) h.phase = 'back';
    return;
  }
  if (h.phase === 'pull') {
    // reel the player in (walls still stop them)
    h.t += dt;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d > e.r + p.r + 6 && !p.dead) moveCircle(p, (dx / d) * 220 * dt, (dy / d) * 220 * dt, room, p.flying ? 'fly' : 'walk');
    h.x = p.x; h.y = p.y;
    if (h.t >= hk.pull || d <= e.r + p.r + 6) { h.phase = 'back'; h.dist = Math.hypot(h.x - e.x, h.y - e.y); }
    return;
  }
  h.dist -= hk.speed * 1.2 * dt;
  const a = Math.atan2(h.y - e.y, h.x - e.x);
  h.x = e.x + Math.cos(a) * Math.max(0, h.dist); h.y = e.y + Math.sin(a) * Math.max(0, h.dist);
  if (h.dist <= 6) e.hook = null;
}

// Where a beam from the enemy along (dx, dy) stops (walls and rocks).
function beamEnd(e, g, dx, dy, len) {
  const room = g.room;
  let x = e.x, y = e.y;
  for (let d = 0; d < len; d += 4) {
    const nx = e.x + dx * d, ny = e.y + dy * d;
    if (nx < room.x0 || nx > room.R || ny < room.y0 || ny > room.B || room.isWall(room.colAt(nx), room.rowAt(ny))) break;
    x = nx; y = ny;
  }
  return { x, y };
}

function distToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

// A splash of something nasty where a jumper lands (Pulper, the Mother of Clots).
function landPuddle(g, e, kind) {
  addCreep(g, e.x, e.y + 2, kind);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4, x = e.x + Math.cos(a) * 14, y = e.y + 2 + Math.sin(a) * 9;
    if (!g.room.isWalkSolid(g.room.colAt(x), g.room.rowAt(y))) addCreep(g, x, y, kind);
  }
}

// An armored front (Mossback) turns toward you slowly, so you can circle round it. The sprite
// faces the shield, not the player.
function turnShield(e, dt, g) {
  const rate = e.def.turnRate;
  if (!rate) return;
  e.sa ??= Math.atan2(e.fy, e.fx);
  let diff = Math.atan2(g.player.y - e.y, g.player.x - e.x) - e.sa;
  while (diff > Math.PI) diff -= TAU;
  while (diff < -Math.PI) diff += TAU;
  e.sa += Math.max(-rate * dt, Math.min(rate * dt, diff));
  e.fx = Math.cos(e.sa);
  e.fy = Math.sin(e.sa);
  e.keepFacing = true;
}

// Start a roll (Pebbler, Stonemaw): uncurl facing you, the line shown, then roll.
function startRoll(e, g, r) {
  faceP(e, g);
  e.aim = { dx: e.fx, dy: e.fy, len: 80 };
  windUp(e, r.wind, () => {
    e.state = 'roll';
    e.cdx = e.fx; e.cdy = e.fy;
    e.bounces = r.bounces;
    e.rollT = 0;
    sfx('rumble');
  });
}

// Rolling: straight lines, bouncing off walls and rocks; out of bounces it sits dizzy.
// Shots mostly glance off a rolling Pebbler. Returns true while busy.
function rollLogic(e, dt, g, r) {
  if (e.state === 'roll') {
    e.anim = 'attack';
    e.animMul = 2;
    e.blur = true;
    e.armor = e.def.mini ? 0.3 : 0.75;
    e.rollT += dt;
    if (e.lastHit && e.rollT > 0.05) {
      if (e.lastHit & 1) e.cdx = -e.cdx;
      if (e.lastHit & 2) e.cdy = -e.cdy;
      e.rollT = 0;
      e.bounces--;
      g.shake(e.def.mini ? 4 : 2);
      sfx('slam');
      g.particles.burst(e.x, e.y + 4, 8, { colors: ['#6a6058', '#4a423c'], speed: 50, z: 3, vz: 30 });
      if (e.def.mini) rockRain(g, 2, 70);
      if (e.bounces < 0) {
        e.state = 'dizzy'; e.stateT = r.dizzy; e.blur = false; e.armor = 0; e.animMul = 1;
        e.vx = e.vy = 0;
        return true;
      }
    }
    e.vx = e.cdx * r.speed * e.speedMul;
    e.vy = e.cdy * r.speed * e.speedMul;
    if (Math.random() < dt * 30) g.particles.spawn(e.x - e.cdx * e.r, e.y + e.r * 0.5, { z: 2, vz: 20, life: 0.4, color: '#5a524a', size: 2 });
    return true;
  }
  if (e.state === 'dizzy') {
    e.vx = e.vy = 0;
    e.anim = 'stun';
    e.stateT -= dt;
    if (e.stateT <= 0) { e.state = 'idle'; e.rollCd = 1.2; }
    return true;
  }
  if (e.state === 'wind') { tickWind(e, dt, g); return true; }
  e.armor = 0;
  e.blur = false;
  e.animMul = 1;
  return false;
}

// Raise up, then slam the ground: a ring of stones (Boulderback, Stonemaw, Bone Colossus).
function slamAttack(e, g, s) {
  faceP(e, g);
  windUp(e, s.wind, () => {
    e.state = 'attack';
    e.stateT = 0.4;
    g.shake(e.def.mini ? 5 : 3);
    sfx('slam');
    radial(e, g, { count: s.count, speed: s.speed, style: e.def.blood === 'bone' ? 'bone' : 'dust' }, Math.random() * TAU);
    g.effects.ring(e.x, e.y + 3, e.r + 14, 'rgba(160,140,110,0.7)', 0.3);
    g.particles.burst(e.x, e.y + 4, 14, { colors: ['#5a5048', '#3a3430', '#8a7a62'], speed: 70, z: 2, vz: 40 });
  });
}

// Bones that fly out, slow down and come back to the thrower.
function throwBones(e, g, t) {
  sfx('swing');
  e.atkT = 0.6;
  const n = t.count || 1, base = Math.atan2(g.player.y - e.y, g.player.x - e.x);
  for (let i = 0; i < n; i++) {
    const a = base + (n > 1 ? (i - (n - 1) / 2) * 0.45 : 0);
    const dx = Math.cos(a), dy = Math.sin(a);
    g.projectiles.spawn({
      x: e.x + dx * e.r, y: e.y + dy * e.r, z: e.z + 9, vx: dx * t.speed, vy: dy * t.speed,
      r: 5, damage: 1, team: 'enemy', range: 9999, source: e.def.name, style: 'bone', spectral: true,
      back: { owner: e, out: t.range / t.speed * 1.6, speed: t.speed, dx, dy, x0: e.x, y0: e.y, t: 0 },
    });
  }
}

// Bubbles rising where a snapjaw is about to come up.
function bubbles(e, g, dt) {
  if (Math.random() < dt * 25) g.particles.spawn(e.x + (Math.random() - 0.5) * e.r * 2, e.y + 2, { z: 1, vz: 30, life: 0.4, color: Math.random() < 0.5 ? '#8ad0f0' : '#d0f0ff', size: 1 });
}

// ---------------------------------------------------------------------------
export class Enemy {
  constructor(type, x, y, { delay = SPAWN_TIME, hpMul = 1, champion = null } = {}) {
    const def = enemyDef(type);
    this.def = def;
    this.type = type;
    this.artKey = def.art;
    this.champ = champion ? CHAMPIONS[champion] : null;
    this.champion = champion;
    const ch = this.champ || {};
    this.scale = ch.scale || 1;
    this.speedMul = ch.speedMul || 1;
    this.baseSpeed = def.speed || 0;
    this.contact = (def.contact || 1) + (ch.contact || 0);
    this.x = x;
    this.y = y;
    this.r = def.radius * this.scale;
    this.hp = this.maxHp = Math.round(def.hp * hpMul * (ch.hpMul || 1));
    this.vx = this.vy = 0;
    this.kx = this.ky = 0;
    this.z = def.flying ? 8 : 0;
    this.seed = Math.random();
    this.t = this.seed * 10;
    this.state = def.behavior === 'hopper' ? 'sit' : 'idle';
    this.stateT = def.behavior === 'hopper' ? 0.6 + Math.random() : 0;
    this.flash = 0;
    this.spawnT = delay;
    this.dead = false;
    this.fx = 0;
    this.fy = 1;
    this.lastHit = 0;
    this.wanderT = 0;
    this.wx = 0;
    this.wy = 0;
    this.jitter = 0;
    this.animMul = 1;
    this.anim = 'idle';
    this.alpha = 1;
    this.intangible = false;
    this.noMove = false;
    this.phase = Math.random() * 3;
    this.shotCount = 0;
    this.atkT = 0;
    this.shootT = def.shoot?.every ? def.shoot.every * (0.6 + Math.random() * 0.6) : 0;
    this.spawnTimer = def.spawn ? def.spawn.every * 0.6 : 0;
    this.children = [];
    this.trail = [];
    this.trailAcc = 0;
    this.status = { poison: 0, poisonDmg: 0, burn: 0, burnDmg: 0, slow: 0, tick: 0 };
    // lurkers start hidden in the moss, droppers up on the ceiling
    if (def.behavior === 'lurker') { this.intangible = true; this.anim = 'hidden'; this.stateT = 0.8; }
    if (def.behavior === 'submerger') { this.state = 'under'; this.intangible = true; this.anim = 'under'; this.stateT = 1.2 + Math.random(); }
    if (def.behavior === 'grabber') { this.state = 'under'; this.intangible = true; this.anim = 'hidden'; this.stateT = 1.2 + Math.random(); }
    if (def.behavior === 'clam') { this.anim = 'hidden'; this.stateT = 1 + Math.random() * 1.5; }
    if (def.behavior === 'dropper') { this.state = 'ceiling'; this.intangible = true; this.z = 90; this.stateT = 1 + Math.random(); }
  }

  get speed() { return this.baseSpeed * this.speedMul; }

  // A body segment whose head died takes over as the new head.
  becomeHead() {
    this.behavior = 'crawler';
    this.artKey = this.def.headArt || this.artKey;
    this.wx = this.wy = 0;
  }

  // Lingering effects from item shots.
  //   freeze: stops it cold   fear: it runs from you   charm: it fights for you, can't hurt you
  // (minibosses shake off freeze, fear and charm twice as fast)
  applyStatus(kind, damage) {
    const s = this.status, k = this.def.mini ? 0.5 : 1;
    if (kind === 'poison') { s.poison = 3; s.poisonDmg = Math.max(1, damage * 0.3); }
    else if (kind === 'burn') { s.burn = 2.4; s.burnDmg = Math.max(1, damage * 0.25); }
    else if (kind === 'slow') s.slow = 2.5;
    else if (kind === 'freeze') s.freeze = Math.max(s.freeze || 0, 1.3 * k);
    else if (kind === 'fear') s.fear = Math.max(s.fear || 0, 2.5 * k);
    else if (kind === 'charm') s.charm = Math.max(s.charm || 0, 3 * k);
    // Needle of Mercy: a plain enemy just dies (a miniboss shrugs it off)
    else if (kind === 'execute' && !this.def.mini && !this.def.boss) this.hp = Math.min(this.hp, 0.001);
  }

  get frozen() { return this.status.freeze > 0; }
  get charmed() { return this.status.charm > 0; }

  updateStatus(dt, g) {
    const s = this.status;
    if (s.poison <= 0 && s.burn <= 0 && s.slow <= 0 && !(s.freeze > 0) && !(s.fear > 0) && !(s.charm > 0)) return;
    s.poison = Math.max(0, s.poison - dt);
    s.burn = Math.max(0, s.burn - dt);
    s.slow = Math.max(0, s.slow - dt);
    s.freeze = Math.max(0, (s.freeze || 0) - dt);
    s.fear = Math.max(0, (s.fear || 0) - dt);
    s.charm = Math.max(0, (s.charm || 0) - dt);
    s.tick -= dt;
    if (s.tick <= 0) {
      s.tick = 0.4;
      const dmg = (s.poison > 0 ? s.poisonDmg : 0) + (s.burn > 0 ? s.burnDmg : 0);
      if (dmg > 0) {
        this.hp -= dmg;
        this.flash = 0.05;
        if (this.hp <= 0) g.killEnemy(this);
      }
    }
    if (s.burn > 0 && Math.random() < dt * 12) {
      g.particles.spawn(this.x + (Math.random() - 0.5) * this.r * 2, this.y - this.z, {
        z: 4, vz: 30, life: 0.4, color: Math.random() < 0.5 ? '#f08a24' : '#ffd25a',
      });
    }
  }

  get tintColor() {
    const s = this.status;
    if (s.freeze > 0) return '#bfe8ff';
    if (s.charm > 0) return '#ff80c0';
    if (s.fear > 0) return '#7a4a9a';
    if (s.burn > 0) return '#f05a24';
    if (s.poison > 0) return '#6aba34';
    if (s.slow > 0) return '#9ad8f8';
    return null;
  }

  get active() { return this.spawnT <= 0 && !this.dead; }
  get hittable() { return this.active && !this.intangible; }
  get harmful() { return this.active && !this.intangible && !this.harmless && !this.piled && this.z < 14 && this.state !== 'surface' && !this.charmed; }

  update(dt, g) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.atkT = Math.max(0, this.atkT - dt);
    if (this.spawnT > 0) {
      this.spawnT -= dt;
      return;
    }
    this.updateStatus(dt, g);
    if (this.dead) return;
    const slow = this.status.slow > 0 ? 0.45 : 1;
    if (this.state !== 'wind') this.aim = null;
    const st = this.status;
    if (this.fusing) this.tickFuse(dt, g);
    else if (this.piled) this.tickPile(dt, g);
    else if (st.freeze > 0) { this.vx = this.vy = 0; this.aim = null; }   // frozen solid
    else if (st.fear > 0 || st.charm > 0) this.tickSway(dt, g);
    else BEHAVIORS[this.behavior || this.def.behavior](this, dt * slow, g);
    this.updateChampion(dt, g);
    // fire-trailing enemies (cinderlings, and scorch rats while charging)
    const trail = this.def.trail || (this.state === 'charge' ? this.def.chargeTrail : null);
    if (trail) {
      this.ownTrail = (this.ownTrail || 0) + Math.hypot(this.vx, this.vy) * dt;
      if (this.ownTrail > 12) { this.ownTrail = 0; addCreep(g, this.x, this.y + this.r * 0.4, trail); }
    }

    const k = Math.max(0, 1 - 9 * dt);
    this.kx *= k;
    this.ky *= k;
    if (!this.def.static && !this.noMove) {
      const mode = this.def.ghost ? 'ghost' : this.def.flying ? 'fly' : 'walk';
      this.lastHit = moveCircle(this, (this.vx * slow + this.kx) * dt, (this.vy * slow + this.ky) * dt, g.room, mode);
    }
    if (this.state !== 'wind' && !this.keepFacing && (Math.abs(this.vx) > 3 || Math.abs(this.vy) > 3)) face(this, this.vx, this.vy);
  }

  // Scared or charmed: no attacks. A scared enemy runs from you; a charmed one goes for the
  // nearest other enemy and bites it (contact damage every half second).
  tickSway(dt, g) {
    this.aim = null;
    const speed = Math.max(28, this.baseSpeed || 0) * 0.9;
    let tx, ty, away = false;
    if (this.status.charm > 0) {
      let best = null, bd = Infinity;
      for (const o of g.enemies) {
        if (o === this || !o.hittable || o.charmed) continue;
        const d2 = (o.x - this.x) ** 2 + (o.y - this.y) ** 2;
        if (d2 < bd) { bd = d2; best = o; }
      }
      if (best) {
        tx = best.x; ty = best.y;
        this.biteT = (this.biteT || 0) - dt;
        if (this.biteT <= 0 && bd < (this.r + best.r + 2) ** 2) {
          this.biteT = 0.5;
          const d = Math.sqrt(bd) || 1;
          best.takeHit(Math.max(3, (this.def.contact || 1) * 4), (best.x - this.x) / d, (best.y - this.y) / d, 60, g);
        }
      } else { tx = g.player.x; ty = g.player.y; }
      if (Math.random() < dt * 6) g.particles.spawn(this.x, this.y - this.r - 4, { z: 10, vz: 25, life: 0.5, color: '#ff80c0' });
    } else {
      tx = g.player.x; ty = g.player.y; away = true;
    }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    const dir = away ? -1 : 1;
    this.vx = (dx / d) * speed * dir;
    this.vy = (dy / d) * speed * dir;
  }

  // Ashwalkers don't just die: they glow white-hot for a moment, then burst into fire.
  // Returns true when the death is delayed (game.killEnemy asks first).
  beforeDeath(g) {
    // Bonewalkers fall into a pile of bones that has to be broken too (the Colossus only once)
    const ra = this.def.reassemble;
    if (ra && !this.piled && !(this.def.mini && this.reassembled)) {
      this.piled = true;
      this.hp = Math.round(ra.pileHp * (this.maxHp / this.def.hp));
      this.pileT = ra.time;
      this.state = 'pile';
      this.anim = 'pile';
      this.vx = this.vy = 0;
      this.z = 0;
      this.aim = null;
      sfx('boneBreak');
      g.particles.burst(this.x, this.y, 10, { colors: BLOOD.bone, speed: 60, z: 8, vz: 50 });
      return true;
    }
    const f = this.def.deathFuse;
    if (!f || this.fused) return false;
    if (!this.fusing) {
      this.fusing = true;
      this.fuseT = f.time;
      this.intangible = true;
      this.anim = 'fuse';
      sfx('crackle');
    }
    return true;
  }

  // A pile of bones: if it isn't broken in time it shakes, then pulls itself back together.
  tickPile(dt, g) {
    const ra = this.def.reassemble;
    this.vx = this.vy = 0;
    this.anim = 'pile';
    this.pileT -= dt;
    this.jitter = this.pileT < ra.wind ? (Math.random() - 0.5) * 3 : 0;
    if (this.pileT < ra.wind && !this.rattled) { this.rattled = true; sfx('rattle'); }
    if (this.pileT > 0) return;
    this.piled = false;
    this.rattled = false;
    this.jitter = 0;
    this.reassembled = true;
    this.hp = Math.round(this.maxHp * (this.def.mini ? 0.5 : 0.6));
    this.state = 'idle';
    this.anim = 'idle';
    g.particles.burst(this.x, this.y - 8, 8, { colors: BLOOD.bone, speed: 40, z: 10 });
  }

  tickFuse(dt, g) {
    this.vx = this.vy = 0;
    this.kx = this.ky = 0;
    this.anim = 'fuse';
    this.flash = Math.floor(this.t * 16) % 2 ? 0.05 : 0;
    this.fuseT -= dt;
    if (this.fuseT > 0) return;
    const f = this.def.deathFuse;
    this.fused = true;
    sfx('whoosh');
    g.shake(3);
    fireBurst(g, this.x, this.y + 2, f.fires, 18);
    if (f.shots) radial(this, g, { ...f.shots, style: 'ember' }, Math.random() * TAU);
    g.killEnemy(this);
  }

  updateChampion(dt, g) {
    const c = this.champ;
    if (!c) return;
    if (c.trail) {
      this.trailAcc += Math.hypot(this.vx, this.vy) * dt;
      if (this.trailAcc > 12) { this.trailAcc = 0; addCreep(g, this.x, this.y + this.r * 0.4, c.trail); }
    }
    if (c.pull) {
      const p = g.player, dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < 150) { p.vx += (dx / d) * c.pull * dt * 3; p.vy += (dy / d) * c.pull * dt * 3; }
    }
    if (c.fade) {
      const cyc = (this.t + this.seed * 4) % 4;
      this.intangible = cyc > 3.1;
      this.alpha = this.intangible ? 0.25 : cyc > 2.8 ? 0.55 : 1;
    }
  }

  // dx, dy: unit direction of the hit
  takeHit(damage, dx, dy, force, g) {
    if (!this.hittable) return false;
    const c = this.champ;
    let dmg = damage * (1 - (c?.armor || 0));
    // shells, rolling stones and closed coffins: shots barely scratch them
    if (this.armor > 0) {
      dmg *= 1 - this.armor;
      if (this.armor >= 0.5) {
        sfx('clink');
        g.particles.burst(this.x - dx * this.r, this.y - dy * this.r - 6, 4, { colors: ['#fff3c0', '#c8c0a8'], speed: 70, z: 8 });
      }
    }
    // armored front (Mossback): shots that hit it head-on mostly bounce off
    if (this.def.frontArmor && dx * this.fx + dy * this.fy < -0.45) {
      dmg *= 1 - this.def.frontArmor;
      sfx('clink');
      g.particles.burst(this.x - dx * this.r, this.y - dy * this.r - 6, 5, { colors: ['#fff3c0', '#c8c0a8'], speed: 70, z: 8 });
    }
    this.hp -= dmg;
    this.flash = 0.1;
    sfx('hit');
    if (!this.def.static && this.state !== 'charge' && !this.def.mini) {
      this.kx += dx * force;
      this.ky += dy * force;
    }
    g.particles.burst(this.x, this.y - this.z, 3, { colors: BLOOD[this.def.blood], speed: 45, z: 6, dirX: dx, dirY: dy, spread: 1.4 });
    if (c?.retaliate && this.t - (this.lastRetaliate || -9) > 1) {
      this.lastRetaliate = this.t;
      radial(this, g, c.retaliate, Math.random() * TAU);
    }
    if (this.hp <= 0) g.killEnemy(this);
    return true;
  }

  // Extra things that happen when it dies (champion tricks and drops).
  onKilled(g) {
    // Bloatflies pop into a puddle and a couple of tarlings
    const ds = this.def.deathSpawn;
    if (ds && !this.leader) {
      if (ds.creep) addCreep(g, this.x, this.y + 2, ds.creep);
      const minions = g.enemies.filter((e) => e.minion && !e.dead).length;
      for (let i = 0; i < Math.min(ds.count, ROOM_MINION_CAP - minions); i++) {
        const a = (i / ds.count) * TAU + Math.random();
        const m = g.spawnEnemy(ds.type, this.x + Math.cos(a) * 6, this.y + Math.sin(a) * 6, { delay: 0.1 });
        m.minion = true;
        m.kx = Math.cos(a) * 90; m.ky = Math.sin(a) * 90;
      }
    }
    const c = this.champ;
    if (!c) return;
    if (c.deathShots) radial(this, g, c.deathShots, Math.random() * TAU);
    if (c.split) {
      for (let i = 0; i < c.split; i++) {
        const a = (i / c.split) * TAU + Math.random();
        const e = g.spawnEnemy(this.type, this.x + Math.cos(a) * 6, this.y + Math.sin(a) * 6, { delay: 0, champion: 'runt' });
        e.kx = Math.cos(a) * 110;
        e.ky = Math.sin(a) * 110;
      }
    }
    if (c.drop) g.spawnPickup(c.drop, this.x, this.y);
  }

  // ---- drawing --------------------------------------------------------------
  // Things attached to an enemy: a ball and chain, a hook, a laser beam, a tongue. Parts behind
  // the enemy (above it on screen) are drawn first.
  renderGear(ctx, ox, oy, layer) {
    const behind = (y) => (layer === 'back') === (y < this.y);
    const chain = (x1, y1, col) => {
      const d = Math.hypot(x1 - this.x, y1 - (this.y - 6)), n = Math.max(1, Math.floor(d / 4));
      for (let i = 1; i < n; i++) {
        const cx = this.x + ((x1 - this.x) * i) / n, cy = this.y - 6 + ((y1 - this.y + 6) * i) / n;
        ctx.fillStyle = '#0e0c0c'; ctx.fillRect(Math.round(cx - 1 + ox), Math.round(cy - 1 + oy), 3, 3);
        ctx.fillStyle = col; ctx.fillRect(Math.round(cx + ox), Math.round(cy + oy), 1, 1);
      }
    };
    // the Umbilic's cord back to where it's rooted
    if (this.anchor && this.def.tether && layer === 'back') {
      const a = this.anchor;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3a0a10'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + 2 + oy); ctx.lineTo(this.x + ox, this.y - 2 + oy); ctx.stroke();
      ctx.strokeStyle = '#9a3438'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + 2 + oy); ctx.lineTo(this.x + ox, this.y - 2 + oy); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#5a141a'; ctx.fillRect(Math.round(a.x - 4 + ox), Math.round(a.y + oy), 8, 4);
    }
    const b = this.ball;
    if (b && behind(b.y)) {
      chain(b.x, b.y - 4, '#6a7280');
      const r = this.def.flail.ball, bx = Math.round(b.x + ox), by = Math.round(b.y - 4 + oy);
      ctx.fillStyle = '#0e0c0c'; ctx.beginPath(); ctx.arc(bx, by, r + 1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a3e46'; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6a7280'; ctx.fillRect(bx - Math.ceil(r / 2), by - Math.ceil(r / 2), Math.ceil(r / 2), Math.ceil(r / 2));
      for (const [sx, sy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { ctx.fillStyle = '#929aa8'; ctx.fillRect(bx + sx * (r + 1), by + sy * (r + 1), 1, 1); }
    }
    const h = this.hook;
    if (h && behind(h.y)) {
      chain(h.x, h.y, '#929aa8');
      ctx.fillStyle = '#0e0c0c'; ctx.fillRect(Math.round(h.x - 3 + ox), Math.round(h.y - 3 + oy), 6, 6);
      ctx.fillStyle = '#c8ccd8'; ctx.fillRect(Math.round(h.x - 2 + ox), Math.round(h.y - 2 + oy), 2, 4); ctx.fillRect(Math.round(h.x - 2 + ox), Math.round(h.y + 1 + oy), 4, 1);
    }
    if (this.beam && layer === 'front') {
      const e = this.beam, w = 3 + Math.round(Math.sin(this.t * 40));
      ctx.lineCap = 'round';
      for (const [col, lw] of [['rgba(255,60,30,0.5)', w + 4], ['#ff4a2a', w], ['#fff3c0', 1]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(this.x + ox, this.y - this.z - 4 + oy); ctx.lineTo(e.x + ox, e.y - 4 + oy); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    if (this.tongueLen > 0 && behind(this.y + this.cdy * this.tongueLen)) {
      const tx = this.x + this.cdx * this.tongueLen, ty = this.y + this.cdy * this.tongueLen - 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3a0a14'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(this.x + ox, this.y - 2 + oy); ctx.lineTo(tx + ox, ty + oy); ctx.stroke();
      ctx.strokeStyle = '#d0607a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(this.x + ox, this.y - 2 + oy); ctx.lineTo(tx + ox, ty + oy); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#e8809a'; ctx.beginPath(); ctx.arc(tx + ox, ty + oy, 3.5, 0, TAU); ctx.fill();
    }
  }

  get dirName() {
    const A = ENEMY_ART[this.artKey];
    if (A?.dirs === false) return 'down';
    if (Math.abs(this.fx) > Math.abs(this.fy)) return this.fx > 0 ? 'side' : 'left';
    return this.fy < 0 ? 'up' : 'down';
  }

  frame() {
    const A = ENEMY_ART[this.artKey];
    const state = A.frames[this.anim] ? this.anim : 'idle';
    const n = A.frames[state] || 1;
    const idx = this.animFrame != null ? Math.min(n - 1, this.animFrame) : Math.floor(this.t * (this.def.animSpeed || 4) * this.animMul) % n;
    let img = paintFrame(this.artKey, state, this.dirName, idx);
    if (this.def.rotten) img = tinted(img, '#4a7a10', 0.38);
    const c = this.champ;
    if (c) {
      const col = c.colors ? c.colors[Math.floor(this.t * 6) % c.colors.length] : c.color;
      img = tinted(img, col, 0.45);
    }
    return img;
  }

  renderShadow(ctx, ox, oy) {
    if (this.spawnT > 0.3) return;
    if (this.state === 'under' || this.state === 'surface') return;
    if (this.def.behavior === 'grabber' && this.state !== 'up') return;
    let sw = Math.max(6, Math.round(this.r * 2)), sh = Math.max(3, Math.round(this.r * 0.7));
    ctx.globalAlpha = this.def.ghost ? this.alpha * 0.6 : 1;
    // a dropper's shadow: small and faint while it's up high, growing as it's about to fall
    if (this.def.behavior === 'dropper' && this.z > 0) {
      const k = this.state === 'wind' ? 1 - this.stateT / (this.windDur || 0.7) : 0;
      const sc = this.state === 'fall' || this.state === 'climb' ? 1 - this.z / 140 : 0.55 + k * 0.6;
      sw = Math.round(sw * sc * 1.2); sh = Math.max(2, Math.round(sh * sc * 1.2));
      ctx.globalAlpha = this.state === 'wind' ? 0.6 + 0.4 * Math.sin(this.t * 24) : 0.5;
    }
    const s = shadowFor(sw, sh);
    ctx.drawImage(s, Math.round(this.x - sw / 2 + ox), Math.round(this.y + this.r * 0.6 - sh / 2 + oy));
    // where a flickerwisp is about to appear: a small flame flickering on the floor
    if (this.blinkTo) {
      const bx = Math.round(this.blinkTo.x + ox), by = Math.round(this.blinkTo.y + oy);
      const f = Math.floor(this.t * 14) % 2;
      ctx.globalAlpha = 0.5 + 0.5 * (1 - this.stateT / (this.windDur || 0.5));
      ctx.fillStyle = '#e04a18'; ctx.fillRect(bx - 2, by - 5 - f, 5, 6 + f);
      ctx.fillStyle = '#ffd25a'; ctx.fillRect(bx - 1, by - 3 - f, 3, 4);
      ctx.globalAlpha = 1;
    }
    // where a hopper is about to land
    if (this.landAt) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 20);
      ctx.drawImage(s, Math.round(this.landAt.x - sw / 2 + ox), Math.round(this.landAt.y + this.r * 0.6 - sh / 2 + oy));
    }
    ctx.globalAlpha = 1;
  }

  render(ctx, ox, oy) {
    // droppers on the ceiling are out of sight (only the shadow); while falling or climbing
    // they hang from a thread
    if (this.def.behavior === 'dropper' && this.z > 0) {
      const top = 0;
      if (this.state === 'wind' || this.state === 'fall' || this.state === 'climb') {
        ctx.fillStyle = 'rgba(200,196,184,0.7)';
        ctx.fillRect(Math.round(this.x + ox), top, 1, Math.max(0, Math.round(this.y - this.z - 8 + oy - top)));
      }
      if (this.z >= 85) return;
    }
    let img = this.frame();
    const winding = this.state === 'wind' || this.state === 'surface';
    const w = Math.round(img.width * this.scale), h = Math.round(img.height * this.scale);
    let alpha = this.alpha;
    if (this.spawnT > 0) alpha *= Math.max(0, 1 - this.spawnT / SPAWN_TIME);
    const jit = winding ? Math.round((Math.random() - 0.5) * 2) : Math.round(this.jitter);
    const x = Math.round(this.x - w / 2 + ox + jit);
    const y = Math.round(this.y + this.r * 0.6 + 2 - h - this.z + oy);

    // telegraph: a pulsing red glow under it and the line it's about to take
    if (winding && this.state === 'wind') {
      const k = 1 - this.stateT / (this.windDur || 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.35 + 0.35 * k) * (0.75 + 0.25 * Math.sin(this.t * 30));
      const gs = Math.round(20 + this.r);
      ctx.drawImage(WIND_GLOW, Math.round(this.x - gs + ox), Math.round(this.y - this.z - h * 0.4 - gs + oy), gs * 2, gs * 2);
      ctx.globalCompositeOperation = 'source-over';
      if (this.aim) {
        ctx.globalAlpha = 0.25 + 0.4 * k;
        ctx.fillStyle = '#ff5a3a';
        for (let d = this.r + 4; d < this.aim.len; d += 6) {
          ctx.fillRect(Math.round(this.x + this.aim.dx * d + ox), Math.round(this.y + this.aim.dy * d + oy), 2, 2);
        }
      }
      ctx.globalAlpha = 1;
      if (this.stateT < 0.12) img = tinted(img, '#ffffff', 1);
    }
    // motion blur while charging or diving
    if (this.blur) {
      for (const [dist, a] of [[10, 0.18], [5, 0.32]]) {
        ctx.globalAlpha = alpha * a;
        ctx.drawImage(img, Math.round(x - (this.cdx || 0) * dist), Math.round(y - (this.cdy || 0) * dist), w, h);
      }
    }
    if (this.flash > 0) img = tinted(img, '#ffffff', 1);
    this.renderGear(ctx, ox, oy, 'back');
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, w, h);
    this.renderGear(ctx, ox, oy, 'front');
    const tc = this.tintColor;
    if (tc && this.flash <= 0) {
      ctx.globalAlpha = alpha * (0.35 + Math.sin(this.t * 10) * 0.1);
      ctx.drawImage(tinted(this.frame(), tc, 1), x, y, w, h);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// Fill a room's spawn markers with enemies (once, the first time it is entered), using one of
// the variant's enemy groups so the mix makes sense together.
const ROTTEN_OF = { blob: 'blobRotten', moth: 'mothRotten', eye: 'eyeRotten', ratram: 'ratramRotten', toad: 'toadRotten', husk: 'huskRotten' };

export function populateRoom(game, cell) {
  const room = cell.room;
  if (room.populated) return;
  room.populated = true;
  room.enemies = [];
  const markers = room.spawns.filter((s) => s.ch === 'e' || s.ch === 'f' || s.ch === 's');
  if (!markers.length) return;

  const rng = game.rng.fork('enemies:' + cell.key);
  const v = game.variant;
  const fd = game.floorDef || {};
  const hpMul = fd.enemyHp || 1;
  const champChance = fd.championChance || 0;
  const pickChampion = () => rng.weighted(Object.entries(CHAMPION_WEIGHTS).map(([id, weight]) => ({ id, weight }))).id;
  const add = (type, x, y, opts = {}) => {
    const def = enemyDef(type);
    const champion = opts.champion !== undefined ? opts.champion : !def.noChampion && rng.chance(champChance) ? pickChampion() : null;
    const e = new Enemy(type, x, y, { hpMul, champion });
    room.enemies.push(e);
    if (def.segments) {
      // a crawler brings its body along, trailing behind it
      let leader = e;
      const chain = e;
      e.chain = chain;
      for (let i = 0; i < def.segments.count; i++) {
        const s = new Enemy(type, x, y, { hpMul, champion });
        Object.assign(s, { behavior: 'segment', artKey: def.segments.art, leader, chain, r: def.segments.radius * s.scale });
        s.hp = s.maxHp = Math.round(def.segments.hp * hpMul);
        s.def = { ...def, headArt: def.art };
        room.enemies.push(s);
        leader = s;
      }
    }
    return e;
  };

  // a miniboss sometimes takes over a room on its own
  if (v.minibosses?.length && cell.dist >= 2 && rng.chance(0.05 + game.floorNum * 0.01)) {
    const spot = room.findFreeSpot(room.centerX, room.centerY);
    add(rng.pick(v.minibosses), spot.x, spot.y, { champion: null });
    room.cleared = false;
    return;
  }

  const group = rng.weighted(v.groups);
  // two candidates per marker letter, so a room is mostly one kind with a few of another
  const pick = {};
  for (const ch of ['e', 'f', 's']) {
    const list = (group[ch] || v.groups.find((gr) => gr[ch])?.[ch] || []).map(([type, weight, n]) => ({ type, weight, n: n || 1 }));
    pick[ch] = list.length ? [rng.weighted(list), rng.weighted(list)] : null;
  }
  const rottenChance = v.legacy ? 0.08 + cell.dist * 0.03 + game.floorNum * 0.02 : 0;

  // The room's enemy budget: bigger rooms get more, narrow rooms less. Markers are filled in a
  // random order until it runs out, so no room turns into a pile-up.
  const units = cell.units?.length || 1;
  const shapeMul = room.shape === 'hall' || room.shape === 'shaft' ? 0.8 : 1 + (units - 1) * 0.5;
  let budget = (fd.threat || 5) * shapeMul;
  let crawlers = 0, spawners = 0, placed = 0;
  for (const s of rng.shuffle([...markers])) {
    const opts = pick[s.ch];
    if (!opts) continue;
    let entry = rng.chance(0.25) ? opts[1] : opts[0];
    const limited = (o) => (enemyDef(o.type).segments && crawlers >= 2) || (enemyDef(o.type).spawn && spawners >= 2);
    // long crawlers and spawners fill a room fast: two of each at most
    if (limited(entry)) {
      entry = opts.find((o) => !limited(o));
      if (!entry) continue;
    }
    let type = entry.type;
    if (ROTTEN_OF[type] && rng.chance(rottenChance)) type = ROTTEN_OF[type];
    const n = entry.n + (rng.chance(fd.extraEnemies || 0) ? 1 : 0);
    const cost = threatOf(type) * n;
    if (cost > budget && placed >= 2) continue;
    budget -= cost;
    placed += n;
    if (enemyDef(type).segments) crawlers++;
    if (enemyDef(type).spawn) spawners++;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      const off = n > 1 ? 10 : 0;
      add(type, s.x + Math.cos(a) * off, s.y + Math.sin(a) * off);
    }
  }
  room.cleared = room.enemies.length === 0;
}

// Nothing may start right next to where the player walks in: move such enemies (and anything
// that hasn't appeared yet) to a free spot further away.
export function clearEntry(game, x, y, radius = 64) {
  const room = game.room;
  for (const e of room.enemies) {
    if (e.dead || e.leader) continue;
    if (Math.hypot(e.x - x, e.y - y) >= radius) continue;
    // look for a free spot far enough away, starting in the direction it already was
    const a0 = Math.atan2(e.y - y, e.x - x) || Math.random() * TAU;
    let spot = null;
    for (let i = 0; i < 24 && !spot; i++) {
      const a = a0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5;
      const d = radius + 24 + (i >> 3) * 30;
      const tx = Math.max(room.x0 + 12, Math.min(room.R - 12, x + Math.cos(a) * d));
      const ty = Math.max(room.y0 + 12, Math.min(room.B - 12, y + Math.sin(a) * d));
      const s = room.findFreeSpot(tx, ty);
      if (Math.hypot(s.x - x, s.y - y) >= radius) spot = s;
    }
    // cramped rooms: the nearest free tile that's far enough away
    if (!spot) {
      let best = Infinity;
      for (let r = 0; r < room.rows; r++) for (let c = 0; c < room.cols; c++) {
        if (room.isWalkSolid(c, r)) continue;
        const t = room.tileCenter(c, r);
        if (Math.hypot(t.x - x, t.y - y) < radius) continue;
        const d = Math.hypot(t.x - e.x, t.y - e.y);
        if (d < best) { best = d; spot = t; }
      }
    }
    spot ??= room.findFreeSpot(room.centerX, room.centerY);
    const dx = spot.x - e.x, dy = spot.y - e.y;
    e.x = spot.x;
    e.y = spot.y;
    // a crawler's body comes along
    for (const s of room.enemies) if (s.chain === e && s !== e) { s.x += dx; s.y += dy; }
  }
}
