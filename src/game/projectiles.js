// Pooled projectiles for both the player's wax shots and enemy shots.
import { addWeb, addTarPool } from './hazards.js';
// Shots travel on the ground plane at height z, then drop and splash when out of range.
// Player shots carry item effects (homing, piercing, bouncing, splitting, statuses...),
// and they all combine freely.
import { Pool } from '../engine/pool.js';
import { makeCanvas, makeShadow, makeGlow, silhouette, buildSprite } from '../engine/sprites.js';
import { PLACED_BOMB, PICKUP_COLORS } from '../data/pickupSprites.js';
import { PAL } from '../data/palette.js';
import { sfx } from '../engine/audio.js';

import { TUNING } from '../data/tuning.js';
const HB = TUNING.hitboxes;
const FALL_GRAVITY = TUNING.tears.fallGravity;
const HOMING_RANGE = 150;
const HOMING_TURN = 5; // radians per second

// Color schemes: [outline, dark, mid, light, highlight]
export const SHOT_STYLES = {
  wax: ['#5a3414', PAL.flame[1], PAL.flame[2], PAL.wax[3], '#fffbea'],
  blood: ['#1a0405', PAL.blood[0], PAL.blood[1], PAL.blood[2], '#e0605a'],
  blue: ['#0e1a3a', '#2a4aa0', '#3a6ad0', '#8ad0f0', '#e8f8ff'],
  ghost: ['#4a5a6a', '#8a96a4', '#b8c4d0', '#e0e8f0', '#ffffff'],
  green: ['#142008', '#3e5a1c', '#5a8a34', '#9ccf6a', '#e0ffc0'],
  ice: ['#1a3a4a', '#4a8aa8', '#8ad0f0', '#d0f0ff', '#ffffff'],
  ember: ['#3a0804', '#a01c18', '#f04a24', '#ffb05a', '#fff0c0'],
  red: ['#2a0404', '#7a1010', '#c0262c', '#ff6a5a', '#ffd0c0'],
  violet: ['#1a0a2a', '#4a2a6a', '#7a4a9a', '#c090e0', '#f8e8ff'],
  spark: ['#3a3a08', '#8a9a20', '#d0e040', '#f8ff9a', '#ffffff'],
  dust: ['#2a2018', '#5a4a3a', '#8a7a62', '#c8b8a0', '#f0e8d8'],
  web: ['#4a4840', '#8a8678', '#c8c4b8', '#e8e4d8', '#ffffff'],
  tar: ['#050407', '#141018', '#28202e', '#4a3e54', '#8a7aa0'],
  bone: ['#3a3428', '#9a927e', '#c8c0a8', '#ece4cc', '#ffffff'],
  pearl: ['#4a3a4a', '#b8a8b8', '#e0d4e0', '#f8f0f8', '#ffffff'],
  gold: ['#3a2404', '#a87c24', '#f0c040', '#fff0a0', '#ffffff'],   // critical hits
  charm: ['#3a0a24', '#a03a6a', '#e070a8', '#ffb0d0', '#fff0f8'],
};

let BOMB_ART = null;
const orbCache = new Map();
const shadowCache = new Map();

function makeOrb(r, cols) {
  const size = r * 2 + 1;
  const [c, ctx] = makeCanvas(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - r, dy = y - r;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r + 0.35) continue;
      let col;
      if (d > r - 0.75) col = cols[0];
      else {
        const light = (-dx - dy) / (r * 1.4) + (1 - d / r) * 0.6;
        col = light > 0.65 ? cols[3] : light > 0.05 ? cols[2] : cols[1];
      }
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = cols[4];
  const h = Math.max(1, Math.round(r * 0.35));
  ctx.fillRect(r - Math.ceil(r / 2), r - Math.ceil(r / 2), h, h);
  return c;
}

export function orbSprite(r, style = 'wax') {
  const key = style + r;
  let s = orbCache.get(key);
  if (!s) {
    s = makeOrb(r, SHOT_STYLES[style] || SHOT_STYLES.wax);
    orbCache.set(key, s);
  }
  return s;
}

const highlightCache = new Map();
function highlightSprites(r) {
  let h = highlightCache.get(r);
  if (!h) {
    h = {
      glow: makeGlow(r + 8, 'rgba(255,90,60,0.9)'),
      rim: silhouette(makeOrb(r + 1, ['#fff', '#fff', '#fff', '#fff', '#fff']), '#ffe0c8'),
    };
    highlightCache.set(r, h);
  }
  return h;
}

function shadowSprite(r) {
  let s = shadowCache.get(r);
  if (!s) {
    s = makeShadow(r * 2 + 2, Math.max(2, r), 0.35);
    shadowCache.set(r, s);
  }
  return s;
}

function createShot() {
  return {
    x: 0, y: 0, z: 0, px: 0, py: 0, vx: 0, vy: 0, vz: 0, r: 3, speed: 0,
    damage: 0, team: 'player', dist: 0, range: 0, style: 'wax',
    knockback: 0, age: 0, hits: new Set(), source: '',
    homing: false, pierce: false, spectral: false, bounce: 0, split: 0,
    poison: false, slow: false, burn: false, freeze: false, fear: false, charm: false, chain: false, explode: false,
    child: false, target: null, retarget: 0,
  };
}

// the statuses a shot can carry onto whatever it hits (see STATUS in src/data/items.js)
const STATUS_FLAGS = ['poison', 'burn', 'slow', 'freeze', 'fear', 'charm', 'execute'];
const SHOT_FLAGS = ['homing', 'pierce', 'spectral', ...STATUS_FLAGS, 'chain', 'explode', 'child', 'grow', 'pull', 'hover', 'wrap', 'eraser'];

export class Projectiles {
  constructor(game) {
    this.game = game;
    this.pool = new Pool(createShot, 128);
  }

  spawn(opts) {
    const p = this.pool.spawn();
    p.x = p.px = opts.x; p.y = p.py = opts.y; p.z = opts.z ?? 8;
    p.vx = opts.vx; p.vy = opts.vy; p.vz = 0;
    p.speed = Math.hypot(p.vx, p.vy) || 1;
    p.r = opts.r ?? 3;
    p.damage = opts.damage ?? 1;
    p.team = opts.team ?? 'player';
    p.range = opts.range ?? 200;
    p.style = opts.style ?? (p.team === 'player' ? 'wax' : 'blood');
    p.knockback = opts.knockback ?? 0;
    p.source = opts.source ?? '';
    for (const f of SHOT_FLAGS) p[f] = !!opts[f];
    p.bounce = opts.bounce ?? 0;
    p.split = opts.split ?? 0;
    p.web = !!opts.web;          // enemy web globs leave a sticky web where they land
    p.tar = !!opts.tar;          // tar globs leave a tar puddle
    p.seek = opts.seek || 0;     // enemy wisps turn slowly toward the player (radians per second)
    p.back = opts.back || null;  // thrown bones { owner, out, ... }: fly out, then come back
    p.wrapped = false;
    p.own = !!opts.own;          // fired by the candle itself (not helpers): on-hit item effects trigger
    p.orbit = opts.orbit ? { a: Math.atan2(opts.vy, opts.vx), r: 8, dir: Math.random() < 0.5 ? 1 : -1 } : null;
    p.lob = !!opts.lob;          // lobbed shots arc through the air and burst where they land
    p.bomb = opts.bomb || null;  // bomb shots { fuse, radius }: roll, slow down and burst
    if (p.lob) {
      const T = Math.max(0.2, p.range / p.speed);
      p.vz = (FALL_GRAVITY * T) / 2 - p.z / T;
    }
    // a shot flies level, then arcs down and splashes: the drop is part of its range, so it starts
    // early enough to land right at the end of it
    const lift = TUNING.tears.arcLift;
    const tFall = (lift + Math.sqrt(lift * lift + 2 * FALL_GRAVITY * Math.max(0, p.z))) / FALL_GRAVITY;
    p.fallAt = Math.max(p.range * 0.3, p.range - p.speed * tFall);
    p.falling = false;
    p.target = null;
    p.retarget = 0;
    p.removed = false;
    p.dist = 0;
    p.age = 0;
    p.hits.clear();
    return p;
  }

  update(dt) {
    const g = this.game;
    const room = g.room;
    const enemyScale = g.enemyTimeScale ?? 1;
    this.pool.sweep((p) => {
      if (p.removed) return false;
      const step = p.team === 'enemy' ? dt * enemyScale : dt;
      p.age += step;
      if (p.hover && p.team === 'player' && p.age < 2.5 && (g.input.shoot.x || g.input.shoot.y)) {
        // Floating Wax: the shot waits in the air while you keep shooting
        p.px = p.x; p.py = p.y;
        if (p.pull) this.pullEnemies(p, step);
        if (p.eraser) this.erase(p);
        return this.hitEnemies(p);
      }
      if (p.orbit) return this.orbitStep(p, step);
      if (p.homing) this.steer(p, step);
      if (p.pull) this.pullEnemies(p, step);
      if (p.eraser && this.erase(p)) return false;
      if (p.seek) this.seekPlayer(p, step);
      if (p.back && this.boomerang(p, step)) return false;
      p.px = p.x; p.py = p.y;
      if (p.bomb) {
        // a rolling bomb slows down; it bursts when the fuse runs out
        const k = Math.max(0, 1 - 2.4 * step);
        p.vx *= k; p.vy *= k;
        p.speed = Math.max(1, Math.hypot(p.vx, p.vy));
        p.z = Math.max(3, p.z - 40 * step);
        p.bomb.fuse -= step;
        if (p.bomb.fuse <= 0) { this.splash(p, true); return false; }
      }
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.dist += p.speed * step;

      if (p.lob) {
        p.vz -= FALL_GRAVITY * step;
        p.z += p.vz * step;
        if (p.z <= 0) { this.splash(p, true); return false; }
      } else if (p.bomb) {
        p.dist = 0;
      } else if (p.dist >= p.fallAt) {
        if (!p.falling) { p.falling = true; p.vz = TUNING.tears.arcLift; }
        p.vz -= FALL_GRAVITY * step;
        p.z += p.vz * step;
        if (p.z <= 0) {
          this.splash(p, false);
          return false;
        }
      }

      // Walls
      const rm = this.game.room;
      const outX = p.x < rm.x0 || p.x >= rm.R, outY = p.y < rm.y0 || p.y >= rm.B;
      if (outX || outY) {
        if (p.wrap && !p.wrapped) {
          // Looping Wick: out through one wall, in through the other
          p.wrapped = true;
          if (outX) p.x = p.x < rm.x0 ? rm.R - 2 : rm.x0 + 1;
          if (outY) p.y = p.y < rm.y0 ? rm.B - 2 : rm.y0 + 1;
          p.px = p.x; p.py = p.y;
        } else if (p.bounce > 0) {
          p.bounce--;
          if (outX) { p.vx = -p.vx; p.x = Math.max(rm.x0, Math.min(rm.R - 1, p.x)); }
          if (outY) { p.vy = -p.vy; p.y = Math.max(rm.y0, Math.min(rm.B - 1, p.y)); }
        } else if (p.bomb) {
          // a bomb just stops against the wall
          p.x = Math.max(rm.x0, Math.min(rm.R - 1, p.x)); p.y = Math.max(rm.y0, Math.min(rm.B - 1, p.y));
          p.vx = p.vy = 0;
        } else {
          this.splash(p, true);
          return false;
        }
      }

      // Rocks and other solid tiles (spectral shots fly over them)
      const c = room.colAt(p.x), r = room.rowAt(p.y);
      if (!p.spectral && !(p.lob && p.z > 10) && room.blocksShots(c, r)) {
        if (p.team === 'player' && !p.bomb) room.hitTile(c, r, g);
        if (p.bounce > 0) {
          p.bounce--;
          // Reflect on the axis we came in on.
          if (room.blocksShots(room.colAt(p.px), r)) p.vy = -p.vy;
          else p.vx = -p.vx;
          p.x = p.px; p.y = p.py;
        } else if (p.bomb) {
          p.x = p.px; p.y = p.py; p.vx = p.vy = 0;
        } else {
          this.splash(p, true);
          return false;
        }
      }
      return p.team === 'player' ? this.hitEnemies(p) : this.hitPlayer(p);
    });
  }

  // Enemy wisps: drift after the player, turning slowly.
  seekPlayer(p, dt) {
    const pl = this.game.player;
    const want = Math.atan2(pl.y - p.y, pl.x - p.x);
    const cur = Math.atan2(p.vy, p.vx);
    let diff = want - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const a = cur + Math.max(-p.seek * dt, Math.min(p.seek * dt, diff));
    p.vx = Math.cos(a) * p.speed;
    p.vy = Math.sin(a) * p.speed;
  }

  // Thrown bones: slow down on the way out, then fly back to whoever threw them (gone on arrival).
  // Returns true when the bone is caught.
  boomerang(p, dt) {
    const b = p.back;
    b.t += dt;
    p.dist = 0;
    if (b.t < b.out) {
      const k = 1 - b.t / b.out;
      p.vx = b.dx * b.speed * (0.2 + 0.8 * k);
      p.vy = b.dy * b.speed * (0.2 + 0.8 * k);
    } else {
      const o = b.owner, alive = o && !o.dead;
      const tx = alive ? o.x : b.x0, ty = alive ? o.y : b.y0;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(b.speed, b.speed * 0.2 + (b.t - b.out) * b.speed * 1.5);
      p.vx = (dx / d) * sp; p.vy = (dy / d) * sp;
      if (d < 8 || b.t > b.out * 4) return true;
    }
    p.speed = Math.hypot(p.vx, p.vy) || 1;
    return false;
  }

  steer(p, dt) {
    const g = this.game;
    p.retarget -= dt;
    if (p.retarget <= 0 || !p.target || !(p.target.boss ? p.target.boss.hittable : p.target.hittable)) {
      p.retarget = 0.15;
      p.target = null;
      let best = HOMING_RANGE * HOMING_RANGE;
      for (const e of g.targets()) {
        if (p.hits.has(e.boss || e)) continue;
        const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
        if (d2 < best) { best = d2; p.target = e; }
      }
    }
    if (!p.target) return;
    if (p.target.boss) { const c = p.target.boss.hitCircles()[0]; if (c) { p.target.x = c.x; p.target.y = c.y; } }
    const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
    const cur = Math.atan2(p.vy, p.vx);
    let diff = want - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.max(-HOMING_TURN * dt, Math.min(HOMING_TURN * dt, diff));
    const a = cur + turn;
    p.vx = Math.cos(a) * p.speed;
    p.vy = Math.sin(a) * p.speed;
  }

  // Little Planet: the shot circles the candle, drifting outward, then falls.
  orbitStep(p, dt) {
    const pl = this.game.player, o = p.orbit;
    o.r = Math.min(Math.max(30, p.range * 0.35), o.r + 70 * dt);
    o.a += (o.dir * p.speed * dt) / Math.max(20, o.r);
    p.px = p.x; p.py = p.y;
    p.x = pl.x + Math.cos(o.a) * o.r;
    p.y = pl.y - 2 + Math.sin(o.a) * o.r * 0.8;
    p.vx = (p.x - p.px) / Math.max(dt, 1e-4); p.vy = (p.y - p.py) / Math.max(dt, 1e-4);
    p.speed = Math.hypot(p.vx, p.vy) || 1;
    p.dist += Math.abs(o.dir * p.speed * dt);
    if (p.age > 2.4 + p.range / 400) { this.splash(p, false); return false; }
    return this.hitEnemies(p);
  }

  // Strange Lodestone: enemies near the shot are dragged toward it.
  pullEnemies(p, dt) {
    for (const e of this.game.enemies) {
      if (!e.hittable || e.def.boss) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
      if (d > 44 || d < 1) continue;
      const k = (1 - d / 44) * 260 * dt;
      e.x += (dx / d) * k * 0.35; e.y += (dy / d) * k * 0.35;
    }
  }

  // Cracked Monocle: the shot wipes out enemy shots it touches (and is used up doing it).
  erase(p) {
    for (const s of this.pool.live) {
      if (s.team !== 'enemy' || s.removed) continue;
      if (Math.hypot(s.x - p.x, s.y - p.y) > s.r + p.r) continue;
      s.removed = true;
      this.splash(s, true);
      if (!p.pierce) { this.splash(p, true); return true; }
    }
    return false;
  }

  // Returns false when the shot is used up.
  hitEnemies(p) {
    const g = this.game;
    for (const e of g.enemies) {
      if (!e.hittable || p.hits.has(e)) continue;
      const dx = e.x - p.x, dy = e.y - p.y, rr = e.r * HB.enemyHurtScale + p.r * HB.tearScale;
      if (dx * dx + dy * dy > rr * rr) continue;
      p.hits.add(e);
      // a bomb shot bursts on contact (a piercing one rolls on through)
      if (p.bomb) { if (p.pierce) continue; this.splash(p, true); return false; }
      const dmg = this.hitDamage(p);
      for (const k of STATUS_FLAGS) if (p[k]) e.applyStatus(k, dmg);
      e.takeHit(dmg, p.vx / p.speed, p.vy / p.speed, p.knockback, g);
      if (p.chain) this.chain(p, e);
      if (p.own) g.player.runMech('shotHit', g, e, dmg);
      if (p.pierce) continue;
      this.splash(p, true);
      return false;
    }
    for (const b of g.bosses) {
      if (p.hits.has(b)) continue;
      for (const c of b.hitCircles()) {
        const dx = c.x - p.x, dy = c.y - p.y, rr = c.r * HB.enemyHurtScale + p.r * HB.tearScale;
        if (dx * dx + dy * dy > rr * rr) continue;
        p.hits.add(b);
        if (p.bomb) { if (p.pierce) break; this.splash(p, true); return false; }
        const dmg = this.hitDamage(p);
        for (const k of STATUS_FLAGS) if (p[k]) b.applyStatus?.(k, dmg);
        b.takeHit(dmg, g);
        if (p.chain) this.chain(p, null, c);
        if (p.own) g.player.runMech('shotHit', g, { x: c.x, y: c.y, r: c.r, boss: b }, dmg);
        if (!p.pierce) { this.splash(p, true); return false; }
        break;
      }
    }
    return true;
  }

  // Soot Lump: a shot hits harder the farther it has flown.
  hitDamage(p) {
    return p.grow ? p.damage * (1 + Math.min(1.5, p.dist / 110)) : p.damage;
  }

  // Chain lightning: from the enemy a shot just hit, a bolt jumps on to the two nearest others
  // (half the shot's damage each).
  chain(p, from, at = from) {
    const g = this.game;
    let x = at.x, y = at.y - 6;
    const done = new Set([from]);
    for (let n = 0; n < 2; n++) {
      let best = null, bd = 110 * 110;
      for (const e of g.enemies) {
        if (!e.hittable || done.has(e)) continue;
        const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
        if (d2 < bd) { bd = d2; best = e; }
      }
      if (!best) break;
      done.add(best);
      g.effects.bolt(x, y, best.x, best.y - 6);
      best.takeHit(p.damage * 0.5, 0, 0, 0, g);
      x = best.x; y = best.y - 6;
    }
    if (done.size > 1) sfx('crackle');
  }

  hitPlayer(p) {
    const g = this.game;
    for (const o of g.orbitals) {
      const dx = o.x - p.x, dy = o.y - p.y, rr = o.r + p.r;
      if (dx * dx + dy * dy < rr * rr) {
        o.block?.();
        this.splash(p, true);
        return false;
      }
    }
    for (const f of g.familiars) {
      if (!f.blocks) continue;
      const dx = f.x - p.x, dy = f.y - p.y, rr = f.r + p.r;
      if (dx * dx + dy * dy < rr * rr) { this.splash(p, true); return false; }
    }
    const pl = g.player;
    if (pl.dead) return true;
    for (const body of g.playerBodies()) {
      const dx = body.x - p.x, dy = body.y - p.y, rr = body.r + p.r * TUNING.hitboxes.enemyShotScale;
      if (dx * dx + dy * dy > rr * rr) continue;
      pl.hurt(p.damage, p.source, g, p.x, p.y);
      this.splash(p, true);
      return false;
    }
    return true;
  }

  splash(p, hard) {
    if (hard && p.team === 'player') sfx('splash');
    if (p.team === 'player' && !p.child) this.game.player.runMech('shotLand', this.game, p);
    if (p.web) addWeb(this.game, p.x, p.y);
    if (p.tar) addTarPool(this.game, p.x, p.y, 14);
    // bomb shots, lobbed shots and Nitro Wax burst (never hurting you) and carry their statuses
    if (p.team === 'player' && !p.child && (p.bomb || p.explode)) {
      const st = STATUS_FLAGS.filter((k) => p[k]);
      const onHit = st.length ? (t) => { for (const k of st) t.applyStatus?.(k, p.damage); } : null;
      if (p.bomb) this.game.explode(p.x, p.y, p.bomb.radius, p.damage, { safe: true, onHit });
      else this.game.explode(p.x, p.y, p.lob ? 30 : 26, p.damage * 1.4, { safe: true, onHit });
    }
    const cols = SHOT_STYLES[p.style] || SHOT_STYLES.wax;
    this.game.particles.burst(p.x, p.y, hard ? 7 : 5, {
      colors: [cols[2], cols[3], cols[1]],
      z: p.z,
      speed: hard ? 55 : 35,
      vz: 50,
      gravity: 300,
      life: 0.35,
      size: 1,
      sizeVar: p.r > 3 ? 1 : 0,
      dirX: hard ? -p.vx : 0,
      dirY: hard ? -p.vy : 0,
      spread: Math.PI * 1.2,
    });
    if (p.split > 0 && !p.child && p.team === 'player') this.splitShot(p);
  }

  // Cracked Egg: a shot bursts into smaller shots where it lands.
  splitShot(p) {
    const n = p.split;
    const base = Math.atan2(p.vy, p.vx) + Math.PI / n;
    const speed = p.speed * 0.8;
    const ox = p.x - (p.vx / p.speed) * 3, oy = p.y - (p.vy / p.speed) * 3;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      const child = this.spawn({
        x: ox, y: oy, z: Math.max(4, p.z), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r: Math.max(2, p.r - 1), damage: p.damage * 0.5, range: 48, style: p.style, team: 'player',
        knockback: p.knockback * 0.5, homing: p.homing, pierce: p.pierce, spectral: p.spectral,
        poison: p.poison, slow: p.slow, burn: p.burn, freeze: p.freeze, fear: p.fear, charm: p.charm, child: true,
      });
      for (const e of p.hits) child.hits.add(e);
    }
  }

  // Remove every shot of a team (gusts, boss phase change). Shots are only marked here,
  // because this can be called while the shot list is being updated.
  clearTeam(team) {
    for (const p of this.pool.live) {
      if (p.team !== team || p.removed) continue;
      p.removed = true;
      this.splash(p, false);
    }
  }

  clear() { this.pool.clear(); }

  renderShadows(ctx, ox, oy) {
    for (const p of this.pool.live) {
      if (p.removed) continue;
      const s = shadowSprite(p.r);
      ctx.drawImage(s, Math.round(p.x - s.width / 2 + ox), Math.round(p.y - s.height / 2 + oy));
    }
  }

  render(ctx, ox, oy) {
    const highlight = this.game.settings.tearHighlight;
    for (const p of this.pool.live) {
      if (p.removed) continue;
      ctx.globalAlpha = 1;
      const s = orbSprite(p.r, p.style);
      const x = Math.round(p.x - p.r + ox), y = Math.round(p.y - p.z - p.r + oy);
      if (highlight && p.team === 'enemy') {
        // Tear highlight: a pulsing glow and a bright rim so enemy shots stand out.
        const h = highlightSprites(p.r);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 + Math.sin(p.age * 14) * 0.15;
        ctx.drawImage(h.glow, x + p.r - h.glow.width / 2, y + p.r - h.glow.height / 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(h.rim, x - 1, y - 1);
      }
      if (p.style === 'ghost') ctx.globalAlpha = 0.75;
      else if (p.team === 'player') ctx.globalAlpha = TUNING.tears.alpha;   // see-through droplets
      if (p.bomb) {
        // a little rolling bomb, flashing faster as the fuse runs out
        BOMB_ART ??= PLACED_BOMB.frames.map((f) => buildSprite(f, PICKUP_COLORS));
        const img = BOMB_ART[Math.floor(p.age * 10) % BOMB_ART.length];
        const sc = Math.max(0.7, Math.min(1.6, p.r / 5));
        const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
        if (p.bomb.fuse < 0.4 && Math.floor(p.age * 20) % 2) ctx.filter = 'brightness(2)';
        ctx.drawImage(img, Math.round(p.x - w / 2 + ox), Math.round(p.y - p.z + 4 - h + oy), w, h);
        ctx.filter = 'none';
        continue;
      }
      if (p.back) {
        // a spinning bone: a shaft with knobbly ends
        const a = p.age * 16, cx = p.x + ox, cy = p.y - p.z + oy;
        const dx = Math.cos(a) * 6, dy = Math.sin(a) * 6;
        ctx.strokeStyle = '#2a2418'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
        ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
        ctx.fillStyle = '#f4ecd8';
        for (const k of [-1, 1]) ctx.fillRect(Math.round(cx + dx * k - 2), Math.round(cy + dy * k - 2), 4, 4);
        ctx.lineCap = 'butt';
        continue;
      }
      ctx.drawImage(s, x, y);
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1;
  }
}
