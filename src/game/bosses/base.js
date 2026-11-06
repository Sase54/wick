// Shared boss machinery: health and phases, an attack picker, lobbed projectiles,
// status effects, the death sequence and drawing. Each boss subclass provides
// its art (frames()) and its attacks (attacks()).
import { silhouette, tint, makeShadow, makeGlow, makeCanvas } from '../../engine/sprites.js';
import { BOSS_CHAMPIONS } from '../../data/bosses.js';
import { audio, sfx } from '../../engine/audio.js';
import { moveCircle } from '../collision.js';
import { ROOM_X, ROOM_Y, ROOM_R, ROOM_B } from '../constants.js';

export const TAU = Math.PI * 2;

let COAL = null;
function coalSprite() {
  if (COAL) return COAL;
  const [c, ctx] = makeCanvas(7, 7);
  ctx.fillStyle = '#160f0c';
  ctx.fillRect(1, 0, 5, 7);
  ctx.fillRect(0, 1, 7, 5);
  ctx.fillStyle = '#3a3430';
  ctx.fillRect(1, 1, 5, 5);
  ctx.fillStyle = '#f04a24';
  ctx.fillRect(2, 2, 2, 2);
  ctx.fillRect(4, 4, 1, 1);
  ctx.fillStyle = '#ffd25a';
  ctx.fillRect(2, 2, 1, 1);
  COAL = c;
  return c;
}
const MARKER = makeShadow(16, 7, 0.55);
const flashCache = new WeakMap();
const flashOf = (img) => {
  let f = flashCache.get(img);
  if (!f) { f = silhouette(img, '#ffffff'); flashCache.set(img, f); }
  return f;
};
// a champion's tinted copy of a frame
const tintCache = new Map();
const tintOf = (img, color) => {
  let m = tintCache.get(color);
  if (!m) { m = new WeakMap(); tintCache.set(color, m); }
  let f = m.get(img);
  if (!f) { f = tint(img, color, 0.5); m.set(img, f); }
  return f;
};

export class Boss {
  constructor(id, def, x, y, { hpMul = 1, tier = 0, champion = null } = {}) {
    this.id = id;
    this.def = def;
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.r = def.radius;
    this.z = 10;            // shot height
    this.lift = 0;          // drawn height above the ground (jumps, flying)
    this.hp = this.maxHp = Math.round(def.hp * hpMul);
    this.tier = tier;       // early bosses reused deeper down fire a few more shots
    this.phase = 1;
    this.state = 'intro';
    this.stateT = 0;
    this.attack = null;
    this.cooldown = 1.2;
    this.lastAttack = null;
    this.t = 0;
    this.flash = 0;
    this.shake = 0;
    this.mortars = [];
    this.vx = 0;
    this.vy = 0;
    this.airborne = false;  // can't hurt or be hurt
    this.dead = false;
    this.dying = false;
    this.status = { poison: 0, burn: 0, tick: 0, dmg: 0 };
    this.glow = makeGlow(44, def.glowColor || 'rgba(255,120,40,0.6)');
    this.shadow = makeShadow(Math.round(this.r * 2.6), Math.round(this.r * 0.7), 0.5);
    // a champion boss (src/data/bosses.js BOSS_CHAMPIONS): tougher one way, tinted, renamed
    this.champ = champion ? BOSS_CHAMPIONS[champion] : null;
    this.champion = champion;
    if (this.champ) {
      this.hp = this.maxHp = Math.round(this.maxHp * (this.champ.hpMul || 1));
      this.name = /^THE /.test(this.name) ? this.name.replace(/^THE /, `THE ${this.champ.name} `) : `${this.champ.name} ${this.name}`;
    }
  }

  // ---- subclasses override --------------------------------------------------
  frames() { return [makeCanvas(1, 1)[0]]; }      // current animation frame list
  attacks() { return {}; }                          // name -> (g) => { update(dt) -> done }
  idle(dt, g) {
    const p = g.player, s = this.def.speed[this.phase - 1] ?? this.def.speed[0];
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    this.vx = (dx / d) * s * (this.champ?.speedMul || 1);
    this.vy = (dy / d) * s * (this.champ?.speedMul || 1);
  }
  ambient() {}
  onPhase() {}

  portrait() { return this.frames()[0]; }

  // ---- health ---------------------------------------------------------------
  get hittable() {
    return !this.dead && !this.dying && this.state !== 'intro' && this.state !== 'enrage' && !this.airborne;
  }

  get harmful() { return this.hittable; }

  // Circles that can be hit and that hurt on touch (bosses made of several parts override this).
  hitCircles() {
    return this.hittable ? [this] : [];
  }

  takeHit(damage, g) {
    if (!this.hittable) return;
    this.hp -= damage;
    this.flash = 0.06;
    sfx('hit');
    g.particles.burst(this.x, this.y - 6, 3, { colors: this.def.debris || ['#6a6a74', '#f08a24', '#2a2a30'], speed: 50, z: 10 });
    this.checkPhase(g);
    if (this.hp <= 0) this.startDying(g);
  }

  // Bosses take poison and burn; freeze and slow only slow them down a little for a moment;
  // fear and charm do nothing to them.
  applyStatus(kind, damage) {
    if (kind === 'freeze' || kind === 'slow') { this.chillT = Math.max(this.chillT || 0, kind === 'freeze' ? 1 : 0.6); return; }
    if (kind !== 'poison' && kind !== 'burn') return;
    if (kind === 'poison') this.status.poison = 3;
    if (kind === 'burn') this.status.burn = 2.4;
    this.status.dmg = Math.max(1, damage * 0.25);
  }

  checkPhase(g) {
    const th = this.def.phases || [];
    while (this.phase <= th.length && this.hp > 0 && this.hp <= this.maxHp * th[this.phase - 1]) this.enterPhase(this.phase + 1, g);
  }

  enterPhase(n, g) {
    this.phase = n;
    this.state = 'enrage';
    this.stateT = 1.4;
    this.attack = null;
    this.airborne = false;
    this.lift = 0;
    this.mortars.length = 0;
    this.under = 0;
    g.shake(8);
    g.effects.ring(this.x, this.y, 60, '#ff6a2a', 0.6, 10);
    g.particles.burst(this.x, this.y - 10, 30, { colors: this.def.debris || ['#9a9aa4', '#f08a24'], speed: 120, z: 14, vz: 90, sizeVar: 2, life: 0.8 });
    g.projectiles.clearTeam('enemy');
    sfx('bossRoar');
    audio.setIntensity(n);
    this.onPhase(n, g);
  }

  startDying(g) {
    this.dying = true;
    this.state = 'dying';
    this.stateT = 1.8;
    this.attack = null;
    this.airborne = false;
    this.lift = 0;
    this.mortars.length = 0;
    this.under = 0;
    const first = !this.burst;
    this.burst = true;
    g.projectiles.clearTeam('enemy');
    // a hollow champion bursts into one last ring of shots
    if (this.champ?.deathRing && first) this.ring(g, this.champ.deathRing, 64, Math.random() * TAU, 'violet');
  }

  toIdle() {
    this.state = 'idle';
    this.attack = null;
    const cd = this.def.cooldown[this.phase - 1] ?? this.def.cooldown[0];
    this.cooldown = (cd[0] + Math.random() * (cd[1] - cd[0])) * (this.champ?.cooldownMul || 1);
  }

  pickAttack(g) {
    const list = this.def.attacks[Math.min(this.phase, this.def.attacks.length) - 1];
    let pool = list.filter(([n]) => n !== this.lastAttack && (this.canUse?.(n, g) ?? true));
    if (!pool.length) pool = list;
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total, choice = pool[0][0];
    for (const [n, w] of pool) { r -= w; if (r < 0) { choice = n; break; } }
    this.lastAttack = choice;
    this.attack = this.attacks()[choice](g);
    this.state = 'attack';
  }

  // ---- update ---------------------------------------------------------------
  update(dt, g) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.shake = 0;
    this.updateMortars(dt, g);
    this.updateStatus(dt, g);

    if (this.dying) {
      this.stateT -= dt;
      this.shake = 2;
      if (Math.random() < dt * 9) {
        const ex = this.x + (Math.random() - 0.5) * this.r * 2.2, ey = this.y - 4 + (Math.random() - 0.5) * this.r * 1.6;
        g.effects.disc(ex, ey, 10, 'rgba(255,220,150,0.9)', 0.12);
        g.particles.burst(ex, ey, 10, { colors: this.def.debris || ['#ffd25a', '#f08a24'], speed: 90, z: 10, vz: 60 });
        g.shake(4);
        sfx('explosion');
      }
      if (this.stateT <= 0) {
        this.dead = true;
        g.onBossDefeated(this);
      }
      return;
    }
    this.ambient(dt, g);
    if (this.state === 'intro') return;
    this.stateT -= dt;

    if (this.state === 'enrage') {
      this.vx = this.vy = 0;
      this.shake = 3;
      if (this.stateT <= 0) this.toIdle();
    } else if (this.state === 'idle') {
      this.idle(dt, g);
      this.cooldown -= dt;
      if (this.cooldown <= 0) this.pickAttack(g);
    } else if (this.state === 'attack') {
      if (this.attack.update(dt)) {
        if (this.champ?.attackRing) this.ring(g, this.champ.attackRing, 58, Math.random() * TAU, 'violet');
        this.toIdle();
      }
    }

    this.lastHit = 0;
    if (this.vx || this.vy) {
      this.lastHit = moveCircle(this, this.vx * dt, this.vy * dt, g.room, this.def.flying ? 'fly' : 'walk');
    }
  }

  // ---- shot helpers ---------------------------------------------------------
  ring(g, n, speed, offset = Math.random() * TAU, style = this.def.style) {
    for (let i = 0; i < n; i++) g.enemyShoot(this, offset + (i / n) * TAU, speed, style);
  }

  spread(g, n, gap, speed, style = this.def.style) {
    const base = Math.atan2(g.player.y - this.y, g.player.x - this.x);
    for (let i = 0; i < n; i++) g.enemyShoot(this, base + (i - (n - 1) / 2) * gap, speed, style);
  }

  // Lob something that lands at (tx, ty) after `flight` seconds and bursts into shots.
  lob(g, tx, ty, { flight = 1, burst = 6, speed = 60, style = 'ember', radius = 12, from = null } = {}) {
    const src = from || { x: this.x, y: this.y - 20 };
    this.mortars.push({ x0: src.x, y0: src.y, x1: tx, y1: ty, t: 0, dur: flight, burst, speed, style, radius });
  }

  updateMortars(dt, g) {
    for (const m of this.mortars) {
      m.t += dt;
      if (m.t < m.dur) continue;
      m.done = true;
      sfx('coalLand');
      g.effects.ring(m.x1, m.y1, m.radius + 4, '#f08a24', 0.3);
      g.particles.burst(m.x1, m.y1, 10, { colors: ['#f08a24', '#ffd25a', '#3a3430'], speed: 70, z: 4, vz: 70 });
      const off = Math.random() * TAU;
      for (let i = 0; i < m.burst; i++) {
        const a = off + (i / m.burst) * TAU;
        g.projectiles.spawn({
          x: m.x1, y: m.y1, z: 4, vx: Math.cos(a) * m.speed, vy: Math.sin(a) * m.speed,
          r: 3, damage: 1, team: 'enemy', range: 70, style: m.style, source: this.name,
        });
      }
      const p = g.player;
      if (g.playerBodies().some((b) => Math.hypot(b.x - m.x1, b.y - m.y1) < m.radius + b.r)) p.hurt(this.def.contact, this.name, g, m.x1, m.y1);
    }
    if (this.mortars.some((m) => m.done)) this.mortars = this.mortars.filter((m) => !m.done);
  }

  updateStatus(dt, g) {
    const s = this.status;
    if (s.poison <= 0 && s.burn <= 0) return;
    s.poison = Math.max(0, s.poison - dt);
    s.burn = Math.max(0, s.burn - dt);
    s.tick -= dt;
    if (s.tick <= 0) {
      s.tick = 0.4;
      if (this.hittable) {
        this.hp -= s.dmg * ((s.poison > 0) + (s.burn > 0));
        this.checkPhase(g);
        if (this.hp <= 0 && !this.dying) this.startDying(g);
      }
    }
  }

  // Charge in a straight line until a wall: returns an attack object.
  //   axis: only charge along the x or y axis (rolling heads), maxTime: stop early (lunges)
  chargeAttack(g, { telegraph = 0.6, speed = 180, stun = 0.8, times = 1, onWall = null, axis = false, maxTime = 2.5, onStop = null } = {}) {
    let t = 0, phase = 'wind', left = times, dx = 0, dy = 0;
    return {
      update: (dt) => {
        t += dt;
        if (phase === 'wind') {
          this.vx = this.vy = 0;
          this.shake = 2;
          if (t >= telegraph) {
            const p = g.player, ddx = p.x - this.x, ddy = p.y - this.y, d = Math.hypot(ddx, ddy) || 1;
            dx = ddx / d; dy = ddy / d;
            if (axis) { if (Math.abs(ddx) > Math.abs(ddy)) { dx = Math.sign(ddx); dy = 0; } else { dx = 0; dy = Math.sign(ddy); } }
            phase = 'run'; t = 0;
            sfx('charge');
          }
        } else if (phase === 'run') {
          this.vx = dx * speed;
          this.vy = dy * speed;
          if (Math.random() < dt * 30) g.particles.spawn(this.x, this.y + 8, { z: 2, vz: 20, vx: -dx * 30, vy: -dy * 30, life: 0.4, color: '#4a3e32', size: 2 });
          const wall = this.lastHit && t > 0.08;
          if (wall || t > maxTime) {
            if (wall) {
              g.shake(6);
              sfx('slam');
              g.particles.burst(this.x + dx * this.r, this.y + dy * this.r * 0.7, 14, { colors: ['#5a5048', '#3a3430', '#f08a24'], speed: 80, z: 6, vz: 60 });
              onWall?.();
            }
            onStop?.();
            this.vx = this.vy = 0;
            phase = 'stun'; t = 0;
          }
        } else {
          this.vx = this.vy = 0;
          if (t >= stun) {
            left--;
            if (left <= 0) return true;
            phase = 'wind'; t = telegraph * 0.5;
          }
        }
        return false;
      },
    };
  }

  // Big jump (Isaac-style, always dodgeable):
  //   rise  - it leaps up out of reach
  //   track - its shadow on the floor follows Wick around
  //   lock  - the shadow STOPS and a red ring flashes: this is where it will land. Move!
  //   fall  - it drops visibly onto the ring
  // A full-speed Wick can walk ~100 px during lock + fall, more than enough to get clear.
  jumpAttack(g, { rise = 0.45, track = 0.7, lock = 0.55, fall = 0.35, height = 130, onLand } = {}) {
    let t = 0, phase = 'rise';
    let tx = this.x, ty = this.y;
    const clampX = (x) => Math.max(ROOM_X + this.r, Math.min(ROOM_R - this.r, x));
    const clampY = (y) => Math.max(ROOM_Y + this.r, Math.min(ROOM_B - this.r, y));
    this.vx = this.vy = 0;
    return {
      marker: () => {
        if (phase === 'track') return { x: tx, y: ty, k: Math.min(1, t / track) * 0.6, locked: false };
        if (phase === 'lock') return { x: tx, y: ty, k: 0.6 + 0.4 * Math.min(1, t / lock), locked: true };
        if (phase === 'fall') return { x: tx, y: ty, k: 1, locked: true };
        return null;
      },
      update: (dt) => {
        t += dt;
        this.vx = this.vy = 0;
        if (phase === 'rise') {
          this.lift = height * Math.min(1, t / rise) ** 2;
          if (this.lift > 20) this.airborne = true;
          if (t >= rise) { phase = 'track'; t = 0; }
        } else if (phase === 'track') {
          // the shadow (and the boss above it) glide toward Wick, a little slower than he walks
          const p = g.player, dx = p.x - tx, dy = p.y - ty, d = Math.hypot(dx, dy);
          const step = Math.min(d, 150 * dt);
          if (d > 0.01) { tx += (dx / d) * step; ty += (dy / d) * step; }
          tx = clampX(tx); ty = clampY(ty);
          this.x = tx; this.y = ty;
          if (t >= track) { phase = 'lock'; t = 0; sfx('charge'); }
        } else if (phase === 'lock') {
          if (t >= lock) { phase = 'fall'; t = 0; }
        } else if (phase === 'fall') {
          this.lift = height * (1 - Math.min(1, t / fall)) ** 1.5;
          if (t >= fall) {
            this.lift = 0;
            this.airborne = false;
            this.land(g, 7);
            onLand?.();
            return true;
          }
        }
        return false;
      },
    };
  }

  // A plain attack: a wind-up (pose, shaking, a sound, optional extra tells), one action, a pause.
  simple(g, { wind = 0.7, after = 0.4, pose = null, firePose = null, sound = null, shake = 1, onWind = null, fire }) {
    let time = 0, done = false;
    this.vx = this.vy = 0;
    return {
      update: (dt) => {
        time += dt;
        this.vx = this.vy = 0;
        if (time - dt <= 0 && sound) sfx(sound);
        if (!done) {
          this.pose = pose;
          this.shake = shake;
          onWind?.(dt, time);
          if (time >= wind) { done = true; this.pose = firePose; fire(); }
          return false;
        }
        if (time >= wind + after) { this.pose = null; return true; }
        return false;
      },
    };
  }

  // Red sparks along the line an attack is about to take (a wind-up tell).
  sparkLine(g, dx, dy, dt, len = 160, from = this) {
    if (Math.random() < dt * 30) {
      const k = 20 + Math.random() * len;
      g.particles.spawn(from.x + dx * k, from.y + dy * k, { z: 1, vz: 10, life: 0.3, color: '#ff4a2a', size: 1 });
    }
  }

  aimAt(g, from = this) {
    const p = g.player, d = Math.hypot(p.x - from.x, p.y - from.y) || 1;
    return [(p.x - from.x) / d, (p.y - from.y) / d];
  }

  // Under the floor or the water (Grotto Maw, Deep Angler): it sinks, a mound (or ripple) follows
  // Wick, stops and flashes red where it will come up, then it bursts out there.
  burrowAttack(g, { sink = 0.45, track = 1.2, lock = 0.6, rise = 0.3, speed = 115, onRise } = {}) {
    let t = 0, phase = 'sink', tx = this.x, ty = this.y;
    const room = g.room;
    this.vx = this.vy = 0;
    return {
      marker: () => (phase === 'lock' ? { x: tx, y: ty, k: 0.6 + 0.4 * Math.min(1, t / lock), locked: true } : null),
      update: (dt) => {
        t += dt;
        this.vx = this.vy = 0;
        if (phase === 'sink') {
          this.under = Math.min(1, t / sink);
          this.shake = 2;
          if (t >= sink) { phase = 'track'; t = 0; this.airborne = true; sfx('rumble'); }
        } else if (phase === 'track') {
          const p = g.player, dx = p.x - tx, dy = p.y - ty, d = Math.hypot(dx, dy);
          const step = Math.min(d, speed * dt);
          if (d > 0.01) { tx += (dx / d) * step; ty += (dy / d) * step; }
          tx = Math.max(room.x0 + this.r, Math.min(room.R - this.r, tx));
          ty = Math.max(room.y0 + this.r, Math.min(room.B - this.r, ty));
          this.x = tx; this.y = ty;
          if (Math.random() < dt * 20) g.particles.spawn(tx + (Math.random() - 0.5) * this.r * 2, ty + 4, { z: 1, vz: 30, life: 0.4, color: this.def.moundColor || '#58402a', size: 2 });
          if (t >= track) { phase = 'lock'; t = 0; sfx('charge'); }
        } else if (phase === 'lock') {
          if (Math.random() < dt * 30) g.particles.spawn(tx + (Math.random() - 0.5) * this.r * 2, ty + 4, { z: 1, vz: 50, life: 0.4, color: this.def.moundColor || '#58402a', size: 2 });
          if (t >= lock) { phase = 'rise'; t = 0; this.airborne = false; }
        } else {
          this.under = Math.max(0, 1 - t / rise);
          if (t >= rise) {
            this.under = 0;
            this.land(g, 6);
            onRise?.();
            return true;
          }
        }
        return false;
      },
    };
  }

  // Short hop along the ground to a spot chosen now (the landing spot is marked the whole time).
  hopAttack(g, { to, time = 0.5, height = 26, onLand } = {}) {
    let t = 0;
    const x0 = this.x, y0 = this.y;
    const x1 = Math.max(ROOM_X + this.r, Math.min(ROOM_R - this.r, to.x));
    const y1 = Math.max(ROOM_Y + this.r, Math.min(ROOM_B - this.r, to.y));
    this.vx = this.vy = 0;
    return {
      marker: () => ({ x: x1, y: y1, k: 0.5 + 0.5 * Math.min(1, t / time), locked: true, small: true }),
      update: (dt) => {
        t += dt;
        this.vx = this.vy = 0;
        const k = Math.min(1, t / time);
        this.x = x0 + (x1 - x0) * k;
        this.y = y0 + (y1 - y0) * k;
        this.lift = Math.sin(k * Math.PI) * height;
        this.airborne = this.lift > 8;
        if (k >= 1) {
          this.lift = 0;
          this.airborne = false;
          this.land(g, 3);
          onLand?.();
          return true;
        }
        return false;
      },
    };
  }

  // Shared landing: thud, dust, and damage only if Wick is right under it.
  land(g, shake) {
    g.shake(shake);
    sfx('slam');
    g.effects.ring(this.x, this.y, shake > 4 ? 40 : 22, 'rgba(220,200,170,0.8)', 0.4, 8);
    g.particles.burst(this.x, this.y + 6, shake > 4 ? 18 : 8, { colors: ['#4a3e32', '#2e241d', '#6a5a48'], speed: 90, z: 2, vz: 60 });
    const p = g.player;
    if (g.playerBodies().some((b) => Math.hypot(b.x - this.x, b.y - this.y) < this.r + b.r)) p.hurt(this.def.contact, this.name, g, this.x, this.y);
  }

  // ---- drawing ----------------------------------------------------------------
  renderShadow(ctx, ox, oy) {
    const s = this.shadow;
    const shrink = 1 - Math.min(0.6, this.lift / 200);
    const w = Math.round(s.width * shrink), h = Math.round(s.height * shrink);
    // static bosses sit flat in the floor and cast no shadow; buried ones show a moving mound
    if (this.under >= 1) {
      const mx = Math.round(this.x + ox), my = Math.round(this.y + this.r * 0.4 + oy), rw = Math.round(this.r * 1.1);
      ctx.fillStyle = this.def.moundColor || '#3e2c1c';
      for (let yy = -4; yy <= 2; yy++) {
        const half = Math.round(rw * Math.sqrt(Math.max(0, 1 - ((yy + 1) / 4) ** 2)));
        ctx.fillRect(mx - half, my + yy, half * 2, 1);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(mx - Math.round(rw / 2), my - 4, rw, 1);
    } else if (!this.def.static) ctx.drawImage(s, Math.round(this.x - w / 2 + ox), Math.round(this.y + this.r * 0.55 - h / 2 + oy), w, h);
    for (const m of this.mortars) {
      const k = m.t / m.dur;
      ctx.globalAlpha = 0.4 + k * 0.5;
      const mw = Math.round(6 + 10 * k), mh = Math.round(3 + 4 * k);
      ctx.drawImage(MARKER, Math.round(m.x1 - mw / 2 + ox), Math.round(m.y1 - mh / 2 + oy), mw, mh);
    }
    const mk = this.attack?.marker?.();
    if (mk) this.renderLandingMarker(ctx, mk, ox, oy);
    ctx.globalAlpha = 1;
  }

  // Where a jumping boss will come down: a dark shadow plus a bright ring.
  // Yellow while it's still following Wick, pulsing red once the spot is locked in.
  renderLandingMarker(ctx, mk, ox, oy) {
    const rx = (mk.small ? this.r * 1.1 : this.r * 1.5) * (0.6 + 0.4 * mk.k), ry = rx * 0.45;
    const cx = mk.x + ox, cy = mk.y + this.r * 0.55 + oy;
    ctx.globalAlpha = 0.25 + 0.35 * mk.k;
    ctx.drawImage(MARKER, Math.round(cx - rx), Math.round(cy - ry), Math.round(rx * 2), Math.round(ry * 2));
    const pulse = mk.locked ? 0.55 + 0.45 * Math.sin(this.t * 18) : 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = mk.locked ? '#ff4a2a' : '#ffd25a';
    const n = Math.max(16, Math.round(rx * 3.2));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
    }
    if (mk.locked && !mk.small) {
      // an inner ring too, so it reads even on busy floors
      for (let i = 0; i < n; i += 2) {
        const a = (i / n) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(a) * rx * 0.6), Math.round(cy + Math.sin(a) * ry * 0.6), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  render(ctx, ox, oy) {
    const frames = this.frames();
    let img = frames[Math.floor(this.t * (this.phase >= 2 ? 9 : 5)) % frames.length];
    if (this.flash > 0) img = flashOf(img);
    const sx = this.shake ? Math.round((Math.random() - 0.5) * this.shake * 2) : 0;
    const x = Math.round(this.x - img.width / 2 + ox + sx);
    const y = Math.round(this.y + this.r * 0.55 - img.height - this.lift + oy);
    if (this.phase >= 2 || this.def.alwaysGlow) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3 + Math.sin(this.t * 12) * 0.08;
      ctx.drawImage(this.glow, Math.round(this.x - 44 + ox), Math.round(this.y - 52 - this.lift + oy));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (this.under > 0) {
      // half sunk into the floor: only the top part shows, lower down
      const vis = Math.round(img.height * (1 - this.under));
      if (vis > 0) ctx.drawImage(img, 0, 0, img.width, vis, x, y + img.height - vis, img.width, vis);
    } else ctx.drawImage(img, x, y);
    // champions wear their color
    if (this.champ && !this.flash && !this.under) ctx.drawImage(tintOf(img, this.champ.color), x, y);
    const coal = coalSprite();
    for (const m of this.mortars) {
      const k = Math.min(1, m.t / m.dur);
      const cx = m.x0 + (m.x1 - m.x0) * k, cy = m.y0 + (m.y1 - m.y0) * k - Math.sin(k * Math.PI) * 60;
      ctx.drawImage(coal, Math.round(cx - 3 + ox), Math.round(cy - 3 + oy));
    }
  }
}
