// Part 6 helpers ("familiars"). One class, driven by data: an item's follower
// `{ kind: 'helper', move, attack, ... }` (see src/data/items/familiars.js) says how the helper
// moves and what it does. The older Orbital / Familiar classes in followers.js still drive the
// first few helpers; everything new goes through here.
//
//   move     trail (follows your footsteps), orbit (circles you), chase (runs at enemies),
//            hover (floats at your shoulder), mirror (stands opposite you in the room),
//            guard (steps between you and the nearest danger), fetch (runs to pickups and
//            gives them to you), collect (eats pickups for itself), roam (drifts around you)
//   attack   aim (shoots where you shoot), target (shoots the nearest enemy), charge (fills
//            while you shoot, lets go when you stop), contact (hurts what it touches), throw
//            (flung where you shoot, comes back), stomp (drops on an enemy from above), hunt
//            (eats enemy shots), bomb (runs in and explodes), aura (hurts what is near it)
//   shot     { style, r, speed, range, count, spread, dirs: 'cross' | 'back', laser, random,
//            homing, pierce, spectral, burn, poison, slow, freeze, fear, charm }
//   blocks   stops enemy shots that touch it
//   every    { rooms, drop: [pickup types] }  drops something every few cleared rooms
//   gnats    { clear: n } hatches gnats when a room is cleared; lay: { every, kind } lays them
//   collect  { kinds, need, reward } eats pickups of those kinds; enough of them pay out
//   heal     { kill: n } heals n half hearts when it kills
//   wake     'hurt': asleep each room until you are hurt
//   levels   { by: 'rooms' | 'kills', per: 'run' | 'floor', at: [0, ...], stages: [{...}, ...] }
//            grows through stages; each stage's fields override the base def
import { makeShadow } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { itemIconSmall } from './items.js';
import { trace, drawRay } from './weapons.js';
import { Gnat } from './followers.js';
import { SHOT_SPEED_PX } from './constants.js';

const SHADOW = makeShadow(10, 4, 0.4);
const STATUS_KINDS = ['burn', 'poison', 'slow', 'freeze', 'fear', 'charm'];
const STATUS_STYLE = { burn: 'ember', poison: 'green', slow: 'web', freeze: 'ice', fear: 'tar', charm: 'pearl' };
const owner = (t) => t.boss || t;

function nearest(list, x, y, max = Infinity) {
  let best = null, bd = max * max;
  for (const e of list) {
    const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d2 < bd) { bd = d2; best = e; }
  }
  return best;
}

export class Helper {
  constructor(def, index) {
    this.base = def;
    this.def = def;
    this.index = index;
    this.x = 0; this.y = 0;
    this.t = Math.random() * 5;
    this.angle = index * 2.4 + (def.phase || 0);
    this.cd = 0.6;
    this.face = 1;
    this.hitTimes = new WeakMap();
    this.chargeT = 0;
    this.bank = 0;
    this.stage = -1;
  }

  get mimic() { return !!this.def.mimic && !this.hidden; }
  get blocks() { return !!this.def.blocks && !this.hidden; }
  get r() { return (this.def.r || 5) * this.sc; }
  // size: its stage or growth, and a little bigger with the Best Friend Locket
  get sc() { return (this.def.scale || 1) * (this.boost ? 1.25 : 1); }
  get walksBehind() { return !['orbit', 'chase', 'hover', 'mirror', 'guard', 'roam'].includes(this.def.move); }
  get hidden() { return (this.def.wake && !this.awake) || this.gone > 0; }

  // a new room: back to your side, asleep again if it sleeps
  place(x, y) {
    this.x = x; this.y = y;
    this.awake = false;
    this.ray = null; this.fling = null; this.stomp = null; this.zap = null;
    this.chargeT = 0;
    this.gone = 0;
  }

  // ------------------------------------------------------------------ levels
  xpKey() { return this.base.item; }
  xp(g) {
    const s = g.player.helperXp?.[this.xpKey()];
    if (!s) return 0;
    return this.base.levels.per === 'floor' && s.floor !== g.floorNum ? 0 : s.n;
  }
  gainXp(g, n = 1) {
    const L = this.base.levels;
    if (!L) return;
    const p = g.player, key = this.xpKey();
    p.helperXp ??= {};
    const cur = this.xp(g);
    p.helperXp[key] = { n: cur + n, floor: g.floorNum };
    this.refreshStage(g, true);
  }
  refreshStage(g, show = false) {
    const L = this.base.levels;
    if (!L) return;
    const xp = this.xp(g);
    let st = 0;
    L.at.forEach((need, i) => { if (xp >= need) st = i; });
    if (L.grow) {
      // smooth growth (Dust Bunny): size and damage climb with every point
      const k = Math.min(L.grow.max, xp);
      this.def = { ...this.base, scale: 1 + k * L.grow.scale, damage: this.base.damage + k * L.grow.damage };
      return;
    }
    if (st === this.stage) return;
    const up = this.stage >= 0 && st > this.stage;
    this.stage = st;
    this.def = { ...this.base, ...(L.stages[st] || {}) };
    if (up && show) {
      sfx('chime');
      g.effects.ring(this.x, this.y - 4, 20, '#fff3c0', 0.4, 4);
      g.particles.burst(this.x, this.y - 4, 12, { colors: ['#fff3c0', '#ffd25a'], speed: 60, z: 8, life: 0.5 });
    }
  }

  dmg(g, base = this.def.damage) { return (base || 0) * (g.player.helperMul || 1); }

  // hurt one target; true if that killed it
  hit(g, t, dmg, dx = 0, dy = 0, force = 30, status = null) {
    if (t.boss) { t.boss.takeHit(dmg, g); if (status) t.boss.applyStatus?.(status, dmg); return false; }
    t.takeHit(dmg, dx, dy, force, g);
    if (status) t.applyStatus?.(status, dmg);
    const killed = t.dead || t.hp <= 0;
    if (killed) this.killed(g, t);
    return killed;
  }
  killed(g) {
    const d = this.def;
    if (d.heal?.kill && g.player.health.canHealRed()) {
      g.player.health.healRed(d.heal.kill);
      sfx('heart');
      g.particles.burst(g.player.x, g.player.y - 10, 6, { colors: ['#ff6a5a', '#c0262c'], speed: 30, z: 10, life: 0.4 });
    }
    if (this.base.levels?.by === 'kills') this.gainXp(g);
  }
  // touch damage with a short gap per target
  touch(g, gap = 0.25, dmg = this.dmg(g), r = this.r) {
    for (const e of g.targets()) {
      const dx = e.x - this.x, dy = e.y - this.y, rr = e.r + r;
      if (dx * dx + dy * dy > rr * rr) continue;
      const o = owner(e), last = this.hitTimes.get(o) ?? -9;
      if (g.time - last < gap) continue;
      this.hitTimes.set(o, g.time);
      const d = Math.hypot(dx, dy) || 1;
      this.hit(g, e, dmg, dx / d, dy / d, 30);
    }
  }

  // ------------------------------------------------------------------ update
  update(dt, g) {
    this.boost = (g.player.helperMul || 1) > 1;
    this.t += dt;
    if (this.stage < 0 || this.base.levels?.grow) this.refreshStage(g);
    const p = g.player, d = this.def;
    if (d.wake === 'hurt' && !this.awake && p.hurtTime > 0) {
      this.awake = true;
      this.x = p.x; this.y = p.y - 10;
      sfx('screech');
    }
    if (this.hidden) {
      if (this.gone > 0) {
        this.gone -= dt;
        this.x = p.x; this.y = p.y;
        if (this.gone <= 0) g.particles.burst(p.x, p.y - 6, 8, { colors: ['#e8d9b0', '#fff3c0'], speed: 40, z: 6 });
      }
      return;
    }
    if (d.life) { this.life = (this.life ?? d.life) - dt; if (this.life <= 0) { this.dead = true; return; } }
    this.cd -= dt;
    this.move(dt, g);
    this.attack(dt, g);
    if (d.lay && g.targets().length) {
      this.layT = (this.layT ?? d.lay.every) - dt;
      if (this.layT <= 0 && g.gnats.length < 14) {
        this.layT = d.lay.every;
        g.gnats.push(new Gnat(this.x, this.y, d.lay.kind));
        sfx('squish');
      }
    }
    if (this.ray) this.updateRay(dt, g);
    if (this.zap) { this.zap.t += dt; if (this.zap.t > 0.15) this.zap = null; }
  }

  aimDir(g) {
    const sh = g.input.shoot;
    if (!(sh.x || sh.y)) return null;
    return Math.atan2(sh.y, sh.x);
  }

  move(dt, g) {
    const p = g.player, d = this.def;
    if (this.fling) return this.updateFling(dt, g);
    // a Fuse Mouse runs its own course while it has a target
    if (d.attack === 'bomb' && this.cd <= 0 && g.targets().length) return;
    const follow = (tx, ty, k = 8) => {
      const f = Math.min(1, dt * k);
      if (Math.abs(tx - this.x) > 0.5) this.face = Math.sign(tx - this.x);
      this.x += (tx - this.x) * f;
      this.y += (ty - this.y) * f;
    };
    const run = (tx, ty, speed) => {
      const dx = tx - this.x, dy = ty - this.y, dist = Math.hypot(dx, dy) || 1;
      const step = Math.min(dist, speed * dt);
      this.x += (dx / dist) * step; this.y += (dy / dist) * step;
      if (Math.abs(dx) > 1) this.face = Math.sign(dx);
      this.running = dist > 3;
      return dist;
    };
    const trailSpot = () => g.trail[Math.min(g.trail.length - 1, 8 + this.index * 8)] || p;
    switch (d.move) {
      case 'orbit': {
        this.angle += (d.speed || 3) * dt;
        const rad = d.radius || 24;
        this.x = p.x + Math.cos(this.angle) * rad;
        this.y = p.y - 2 + Math.sin(this.angle) * rad * 0.75;
        break;
      }
      case 'chase': {
        const e = nearest(g.targets(), this.x, this.y);
        if (e) run(e.x, e.y, d.speed || 90);
        else { const s = trailSpot(); run(s.x, s.y + 4, Math.min(d.speed || 90, Math.hypot(s.x - this.x, s.y - this.y) * 3)); }
        break;
      }
      case 'hover': {
        const side = this.index % 2 ? 1 : -1;
        follow(p.x + side * 14, p.y - 8 + Math.sin(this.t * 3) * 2, 6);
        break;
      }
      case 'mirror': {
        const rm = g.room;
        follow(rm.x0 + rm.R - p.x, rm.y0 + rm.B - p.y, 6);
        break;
      }
      case 'guard': {
        // between you and whatever is most dangerous: the nearest enemy shot, else enemy
        let threat = null, bd = 90 * 90;
        for (const s of g.projectiles.pool.live) {
          if (s.team !== 'enemy' || s.removed) continue;
          const d2 = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
          if (d2 < bd) { bd = d2; threat = s; }
        }
        threat ??= nearest(g.targets(), p.x, p.y);
        if (threat) {
          const a = Math.atan2(threat.y - p.y, threat.x - p.x);
          follow(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 12, 10);
        } else follow(p.x + 14, p.y + 2, 6);
        break;
      }
      case 'fetch':
      case 'collect': {
        const want = this.wanted(g);
        if (want) {
          if (run(want.x, want.y, d.speed || 80) < want.r + 6) this.grab(g, want);
        } else { const s = trailSpot(); follow(s.x, s.y, 6); }
        break;
      }
      case 'stay': break;
      case 'self': this.x = p.x; this.y = p.y; break;
      case 'roam': {
        if (!this.goal || this.t > this.goalT) {
          const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 40;
          this.goal = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.7 };
          this.goalT = this.t + 1.5 + Math.random();
        }
        run(this.goal.x, this.goal.y, d.speed || 30);
        break;
      }
      default: { const s = trailSpot(); follow(s.x, s.y); }
    }
  }

  // ------------------------------------------------------------------ pickups
  wanted(g) {
    const d = this.def, p = g.player;
    let best = null, bd = Infinity;
    for (const it of g.room.pickups) {
      if (it.collected || it.price || it.age < 0.4 || it.z > 4) continue;
      if (d.move === 'fetch' ? !it.canCollect(p) : !d.collect.kinds.includes(it.def.kind)) continue;
      const d2 = (it.x - this.x) ** 2 + (it.y - this.y) ** 2;
      if (d2 < bd) { bd = d2; best = it; }
    }
    return best;
  }
  grab(g, it) {
    const d = this.def;
    if (d.move === 'fetch') { g.collectPickup(it); return; }
    it.collected = true;
    g.room.pickups = g.room.pickups.filter((q) => !q.collected);
    sfx('coin');
    this.bank += it.def.value || 1;
    g.particles.burst(it.x, it.y, 5, { colors: ['#ffd25a', '#fff3c0'], speed: 30, z: 4, life: 0.3 });
    while (this.bank >= d.collect.need) {
      this.bank -= d.collect.need;
      const type = d.collect.reward[Math.floor(Math.random() * d.collect.reward.length)];
      g.spawnPickup(type, this.x, this.y);
      sfx('chirp');
    }
  }

  // ------------------------------------------------------------------ attacks
  attack(dt, g) {
    const d = this.def, p = g.player;
    const aim = this.aimDir(g);
    switch (d.attack) {
      case 'aim':
        if (aim != null && this.cd <= 0) {
          this.cd = 1 / d.fireRate;
          const a = d.move === 'mirror' ? aim + Math.PI : aim;
          this.shoot(g, a);
        }
        break;
      case 'target':
        if (this.cd <= 0) {
          const e = nearest(g.targets(), this.x, this.y, d.reach || 110);
          if (e) { this.cd = 1 / d.fireRate; this.shoot(g, Math.atan2(e.y - this.y, e.x - this.x)); } else this.cd = 0.15;
        }
        break;
      case 'charge': {
        if (aim != null) { this.lastAim = aim; this.chargeT = Math.min(d.charge.time, this.chargeT + dt); }
        else if (this.chargeT > 0) {
          if (this.chargeT >= d.charge.time) this.discharge(g, this.lastAim);
          this.chargeT = 0;
        }
        break;
      }
      case 'contact': this.touch(g, d.gap || 0.25); break;
      case 'throw':
        if (aim != null && !this.fling && this.cd <= 0) {
          this.fling = { ang: aim, out: true, dist: 0 };
          sfx('whoosh');
        }
        break;
      case 'stomp': this.updateStomp(dt, g); break;
      case 'hunt': {
        this.touch(g, 0.3);
        let best = null, bd = (d.reach || 70) ** 2;
        for (const s of g.projectiles.pool.live) {
          if (s.team !== 'enemy' || s.removed) continue;
          const d2 = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
          if (d2 < bd) { bd = d2; best = s; }
        }
        if (best) {
          const dx = best.x - this.x, dy = best.y - this.y, dist = Math.hypot(dx, dy) || 1;
          const step = Math.min(dist, 260 * dt);
          this.x += (dx / dist) * step; this.y += (dy / dist) * step;
          this.angle = Math.atan2(this.y - p.y + 2, this.x - p.x);
          if (dist < best.r + 5) { best.removed = true; g.projectiles.splash(best, true); }
        }
        break;
      }
      case 'bomb': {
        const e = nearest(g.targets(), this.x, this.y);
        if (e && this.cd <= 0) {
          const dx = e.x - this.x, dy = e.y - this.y, dist = Math.hypot(dx, dy) || 1;
          this.x += (dx / dist) * (d.speed || 110) * dt; this.y += (dy / dist) * (d.speed || 110) * dt;
          this.face = Math.sign(dx) || this.face;
          if (dist < e.r + this.r + 2) {
            g.explode(this.x, this.y, d.radius || 30, this.dmg(g), { safe: true });
            this.gone = d.respawn || 6;
            this.cd = 0.5;
          }
        }
        break;
      }
      case 'aura': {
        this.auraT = (this.auraT || 0) - dt;
        if (this.auraT <= 0) {
          this.auraT = 0.25;
          const rad = d.aura.radius * this.sc;
          for (const e of g.targets()) {
            if ((e.x - this.x) ** 2 + ((e.y - this.y) / 0.7) ** 2 > (rad + e.r) ** 2) continue;
            this.hit(g, e, this.dmg(g) * 0.25, 0, 0, 0, d.aura.status || null);
          }
          if (d.aura.pull) {
            // Sinkhole Marble: drags enemies in and swallows enemy shots
            for (const e of g.enemies) {
              if (!e.hittable) continue;
              const dx = this.x - e.x, dy = this.y - e.y, dist = Math.hypot(dx, dy) || 1;
              if (dist < rad * 1.6) { e.kx += (dx / dist) * 70; e.ky += (dy / dist) * 70; }
            }
            for (const s of g.projectiles.pool.live) if (s.team === 'enemy' && !s.removed && Math.hypot(s.x - this.x, s.y - this.y) < 16) { s.removed = true; g.projectiles.splash(s, true); }
          }
        }
        break;
      }
    }
    if (d.touch) this.touch(g, 0.3, this.dmg(g, d.touch));
  }

  // one volley in direction a
  shoot(g, a) {
    const d = this.def, s = d.shot || {};
    a += s.offset || 0;   // turned off the aim (the Broodparent heads shoot diagonally)
    let dirs = [a];
    const n = s.count || 1;
    if (n > 1) dirs = Array.from({ length: n }, (_, i) => a + (i - (n - 1) / 2) * (s.spread || 0.25));
    if (s.dirs === 'cross') dirs = [0, 1, 2, 3].map((i) => a + i * Math.PI / 2);
    if (s.dirs === 'back') dirs.push(a + Math.PI);
    const dmg = this.dmg(g);
    for (const ang of dirs) {
      if (s.laser) { this.fireZap(g, ang, dmg, s); continue; }
      let status = null;
      if (s.random) status = STATUS_KINDS[Math.floor(Math.random() * STATUS_KINDS.length)];
      const speed = (s.speed || 0.9) * SHOT_SPEED_PX;
      const opts = {
        x: this.x + Math.cos(ang) * 4, y: this.y + Math.sin(ang) * 3, z: 9,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        r: (s.r || 3) * this.sc, damage: dmg, range: s.range || 120, team: 'player', knockback: 20,
        style: status ? STATUS_STYLE[status] : s.style || 'wax',
        homing: s.homing, pierce: s.pierce, spectral: s.spectral,
      };
      for (const k of STATUS_KINDS) if (s[k] && Math.random() < s[k]) opts[k] = true;
      if (status) opts[status] = true;
      g.projectiles.spawn(opts);
    }
    if (!s.quiet) sfx('shoot');
  }

  // a thin instant laser (Tin Tinker)
  fireZap(g, ang, dmg, s) {
    const tr = trace(g, this.x, this.y + 2, ang, 400, { width: 3, pierce: true, passRocks: false });
    for (const h of tr.hits) this.hit(g, h.t, dmg, h.dx, h.dy, 20);
    this.zap = { pts: tr.pts, t: 0, style: s.style || 'red' };
    sfx('dart');
  }

  // a held charge lets go
  discharge(g, ang) {
    const c = this.def.charge;
    if (c.kind === 'beam') {
      this.ray = { ang, t: 0, tick: 0, life: c.life || 0.6, pts: null };
      sfx('beam');
    } else {
      const dmg = this.dmg(g);
      for (let i = 0; i < c.n; i++) {
        const a = ang + (Math.random() - 0.5) * 0.8, sp = SHOT_SPEED_PX * (0.6 + Math.random() * 0.5);
        g.projectiles.spawn({
          x: this.x, y: this.y, z: 9, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: 3, damage: dmg, range: 70 + Math.random() * 60, team: 'player', knockback: 25, style: c.style || 'wax',
        });
      }
      sfx('splashBig');
      g.shake(2);
    }
  }
  updateRay(dt, g) {
    const r = this.ray, c = this.def.charge;
    r.t += dt;
    r.tick -= dt;
    const tr = trace(g, this.x, this.y + 2, r.ang, 1600, { width: c.width || 8, pierce: true, passRocks: true });
    r.pts = tr.pts;
    if (r.tick <= 0) {
      r.tick = 0.1;
      for (const h of tr.hits) this.hit(g, h.t, this.dmg(g), h.dx, h.dy, 15);
    }
    if (r.t >= r.life) this.ray = null;
  }

  // flung forward, chews through enemies, crawls back
  updateFling(dt, g) {
    const f = this.fling, p = g.player, rm = g.room;
    this.touch(g, 0.15, this.dmg(g) * 1.5);
    if (f.out) {
      const sp = 230;
      const nx = this.x + Math.cos(f.ang) * sp * dt, ny = this.y + Math.sin(f.ang) * sp * dt;
      f.dist += sp * dt;
      const wall = nx < rm.x0 + 4 || nx > rm.R - 4 || ny < rm.y0 + 4 || ny > rm.B - 4 || rm.blocksShots(rm.colAt(nx), rm.rowAt(ny));
      if (wall || f.dist > (this.def.reach || 150)) f.out = false;
      else { this.x = nx; this.y = ny; }
      this.face = Math.cos(f.ang) >= 0 ? 1 : -1;
    } else {
      const dx = p.x - this.x, dy = p.y - this.y, dist = Math.hypot(dx, dy) || 1;
      const step = Math.min(dist, 120 * dt);
      this.x += (dx / dist) * step; this.y += (dy / dist) * step;
      if (dist < 10) { this.fling = null; this.cd = 0.4; }
    }
  }

  // picks an enemy, its shadow follows it, then it drops (Long-Legged Lodger)
  updateStomp(dt, g) {
    const d = this.def, p = g.player;
    if (!this.stomp) {
      // waits at your side between stomps
      const s = g.trail[Math.min(g.trail.length - 1, 8 + this.index * 8)] || p;
      this.x += (s.x - this.x) * Math.min(1, dt * 6); this.y += (s.y - this.y) * Math.min(1, dt * 6);
      if (this.cd <= 0) {
        const list = g.targets();
        if (list.length) { this.stomp = { target: list[Math.floor(Math.random() * list.length)], t: 0, x: this.x, y: this.y }; }
        else this.cd = 0.3;
      }
      return;
    }
    const st = this.stomp;
    st.t += dt;
    if (st.t < 0.7 && st.target && (st.target.boss ? st.target.boss.hittable : !st.target.dead)) {
      st.x += (st.target.x - st.x) * Math.min(1, dt * 10); st.y += (st.target.y - st.y) * Math.min(1, dt * 10);
    }
    if (st.t >= 0.9 && !st.done) {
      st.done = true;
      g.shake(3);
      sfx('thump');
      g.effects.ring(st.x, st.y, 22, '#9a8462', 0.3, 4);
      g.particles.burst(st.x, st.y, 12, { colors: ['#4a4540', '#8a8580'], speed: 70, z: 2, vz: 40, life: 0.5 });
      for (const e of g.targets()) {
        if (Math.hypot(e.x - st.x, e.y - st.y) < 18 + e.r) this.hit(g, e, this.dmg(g), 0, 0, 0);
      }
    }
    if (st.t >= 1.25) { this.stomp = null; this.cd = d.every || 2.5; }
  }

  // ------------------------------------------------------------------ room events
  roomCleared(g) {
    const d = this.def;
    if (this.base.levels?.by === 'rooms') this.gainXp(g);
    if (d.every) {
      this.rooms = (this.rooms || 0) + 1;
      if (this.rooms >= d.every.rooms) {
        this.rooms = 0;
        const type = d.every.drop[Math.floor(Math.random() * d.every.drop.length)];
        g.spawnPickup(type, this.x, this.y);
        sfx('chirp');
      }
    }
    if (d.gnats?.clear) {
      for (let i = 0; i < d.gnats.clear && g.gnats.length < 14; i++) g.gnats.push(new Gnat(this.x, this.y - 4, d.gnats.kind));
      sfx('gnat');
    }
  }

  // ------------------------------------------------------------------ drawing
  renderShadow(ctx, ox, oy) {
    if (this.hidden || this.def.noShadow) return;
    const x = this.stomp ? this.stomp.x : this.x, y = this.stomp ? this.stomp.y : this.y;
    if (this.stomp) {
      const k = Math.min(1, this.stomp.t / 0.9);
      ctx.globalAlpha = 0.3 + k * 0.5;
      ctx.drawImage(SHADOW, Math.round(x - 5 + ox), Math.round(y + 1 + oy), 10 + k * 6, 4 + k * 2);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.drawImage(SHADOW, Math.round(x - 5 + ox), Math.round(y + 1 + oy));
  }

  render(ctx, ox, oy, g) {
    const d = this.def;
    if (d.copy && !this.hidden) {
      // a dim, dark copy of the candle itself
      ctx.save();
      ctx.filter = 'brightness(0.1) saturate(0)';
      g.player.renderCopy(ctx, this.x, this.y, ox, oy, 0.85);
      ctx.restore();
      return;
    }
    if (this.ray?.pts) drawRay(ctx, this.ray.pts, ox, oy, (d.charge.width || 8) * (1 - this.ray.t / this.ray.life * 0.5), 1, d.charge.style || 'red');
    if (this.zap) drawRay(ctx, this.zap.pts, ox, oy, 2, 1 - this.zap.t / 0.15, this.zap.style);
    if (this.hidden) return;
    if (d.attack === 'aura') {
      const rad = d.aura.radius * this.sc;
      ctx.save();
      ctx.globalAlpha = 0.14 + Math.sin(this.t * 4) * 0.04;
      ctx.fillStyle = d.aura.color || '#ffd25a';
      ctx.beginPath();
      ctx.ellipse(Math.round(this.x + ox), Math.round(this.y + oy), rad, rad * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (d.noIcon) return;
    const img = itemIconSmall(d.art || this.base.item);
    const sc = this.sc;
    const flying = d.move === 'orbit' || d.move === 'hover' || d.attack === 'hunt' || d.fly;
    let x = this.x, y = this.y - (flying ? 8 : 2) - (flying ? Math.sin(this.t * 5) * 1.5 : (this.running ? Math.abs(Math.sin(this.t * 14)) * 1.5 : 0));
    if (this.stomp) {
      // legs come down from above the screen
      const k = Math.min(1, this.stomp.t / 0.9);
      x = this.stomp.x;
      y = this.stomp.y - 90 * (1 - k * k);
      if (this.stomp.done) y = this.stomp.y - (this.stomp.t - 0.9) * 200;
    }
    ctx.save();
    ctx.translate(Math.round(x + ox), Math.round(y + oy));
    if (this.face < 0 && d.flip !== false) ctx.scale(-sc, sc); else ctx.scale(sc, sc);
    if (this.chargeT > 0 && this.chargeT >= (d.charge?.time || 1) && Math.floor(this.t * 12) % 2) ctx.filter = 'brightness(1.8)';
    ctx.drawImage(img, -Math.floor(img.width / 2), -img.height + 4);
    ctx.restore();
    if (this.chargeT > 0 && d.charge && this.chargeT < d.charge.time) {
      // a little charge bar under it
      const w = 10, k = this.chargeT / d.charge.time;
      ctx.fillStyle = '#160f0c';
      ctx.fillRect(Math.round(x - w / 2 + ox), Math.round(this.y + 4 + oy), w, 2);
      ctx.fillStyle = '#ff6a5a';
      ctx.fillRect(Math.round(x - w / 2 + ox), Math.round(this.y + 4 + oy), Math.round(w * k), 2);
    }
    if (this.bank && d.collect) {
      ctx.fillStyle = '#ffd25a';
      for (let i = 0; i < this.bank; i++) ctx.fillRect(Math.round(x - this.bank + i * 2 + ox), Math.round(this.y - 14 + oy), 1, 1);
    }
  }
}
