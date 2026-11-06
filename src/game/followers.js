// Helpers granted by items.
//   Orbital:  circles Wick, blocks enemy shots, hurts enemies it touches.
//   Familiar: trails behind Wick: buddy copies your aim, firefly hunts the nearest enemy with
//             sparks, rat chases enemies and bites them, twin mimics your exact shots.
import { makeShadow, makeGlow, buildSprite } from '../engine/sprites.js';
import { PixelGrid, ramp, light } from '../engine/pixelgrid.js';
import { RAMP as R } from '../data/packArt.js';
import { itemIcon } from './items.js';
import { SHOT_SPEED_PX } from './constants.js';

const SHADOW = makeShadow(10, 4, 0.4);
const FIREFLY_GLOW = makeGlow(10, 'rgba(220,255,120,0.7)');
const OUT = '#0a0606';

// Small sprites for the helpers (cached, two frames each).
const ART = {
  // a tooth spinning round you
  tooth: (f) => {
    const g = new PixelGrid(9, 10);
    g.ellipse(4, 3.5, 3.6, 3.2, (nx, ny, x, y) => ramp(R.bone, light(nx, ny) + 0.25, x, y));
    g.rect(1, 4, 3, 4, R.bone[4]); g.rect(5, 4, 3, 4 - f, R.bone[3]);
    g.set(2, 2, R.pale[5]);
    return g.outline(OUT).toCanvas();
  },
  // a pale moth, wings up and down
  moth: (f) => {
    const g = new PixelGrid(11, 8);
    const up = f === 0;
    g.poly(up ? [[5, 4], [0, 0], [1, 6]] : [[5, 4], [0, 5], [2, 7]], R.pale[4]);
    g.poly(up ? [[5, 4], [10, 0], [9, 6]] : [[5, 4], [10, 5], [8, 7]], R.pale[3]);
    g.rect(5, 2, 1, 5, R.bone[2]); g.set(5, 1, R.bone[1]);
    return g.outline(OUT).toCanvas();
  },
  // a stub of a candle with a little flame and a face
  buddy: (f) => {
    const g = new PixelGrid(10, 15);
    g.rect(2, 6, 6, 8, R.wax[4]); g.rect(7, 6, 1, 8, R.wax[3]); g.rect(2, 13, 6, 1, R.wax[2]);
    g.set(3, 6, R.wax[5]); g.rect(2, 7, 1, 2, R.wax[5]);
    g.set(3, 9, OUT); g.set(6, 9, OUT); g.rect(4, 11, 2, 1, OUT);
    g.set(5, 5, R.iron[1]);
    g.ellipse(5, 2.5 - f * 0.5, 1.6, 2.4, R.ember[4]); g.set(5, 3, R.ember[5]);
    return g.outline(OUT).toCanvas();
  },
  // a hungry brown rat, legs scurrying
  rat: (f) => {
    const g = new PixelGrid(15, 9);
    g.ellipse(7, 5, 5, 3, (nx, ny, x, y) => ramp(R.wood, light(nx, ny) + 0.2, x, y));
    g.ellipse(12, 4, 2.5, 2, R.wood[4]);
    g.set(13, 3, R.blood[5]); g.set(14, 5, R.bone[5]); g.set(11, 1, R.flesh[4]);
    g.line(2, 5, 0, 3 + f, R.flesh[3]);
    for (const [x, o] of [[4, f], [9, 1 - f]]) g.rect(x + o, 8, 1, 1, R.wood[1]);
    return g.outline(OUT).toCanvas();
  },
};
const artCache = new Map();
function art(kind, f) {
  const key = `${kind}:${f}`;
  if (!artCache.has(key)) artCache.set(key, ART[kind](f));
  return artCache.get(key);
}

export class Orbital {
  constructor(def, index) {
    this.def = def;
    this.angle = index * 2.4 + (def.phase || 0);
    this.x = 0;
    this.y = 0;
    this.r = 5;
    this.t = 0;
    this.hitTimes = new WeakMap();
  }

  update(dt, g) {
    const p = g.player;
    this.t += dt;
    this.angle += this.def.speed * dt;
    this.x = p.x + Math.cos(this.angle) * this.def.radius;
    this.y = p.y - 2 + Math.sin(this.angle) * this.def.radius * 0.75;
    for (const e of g.targets()) {
      const dx = e.x - this.x, dy = e.y - this.y, rr = e.r + this.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      const owner = e.boss || e;
      const last = this.hitTimes.get(owner) ?? -1;
      if (g.time - last < 0.25) continue;
      this.hitTimes.set(owner, g.time);
      const d = Math.hypot(dx, dy) || 1;
      const dmg = this.def.damage * (g.player.helperMul || 1);
      if (e.boss) e.boss.takeHit(dmg, g);
      else e.takeHit(dmg, dx / d, dy / d, 30, g);
    }
  }

  renderShadow(ctx, ox, oy) {
    ctx.drawImage(SHADOW, Math.round(this.x - 5 + ox), Math.round(this.y + 6 + oy));
  }

  render(ctx, ox, oy) {
    const icon = this.def.art ? art(this.def.art, Math.floor(this.t * 8) % 2) : itemIcon(this.def.sprite);
    ctx.drawImage(icon, Math.round(this.x - icon.width / 2 + ox), Math.round(this.y - icon.height / 2 - 2 + oy));
  }
}

export class Familiar {
  constructor(def, index) {
    this.def = def;
    this.index = index;
    this.x = 0;
    this.y = 0;
    this.r = 4;
    this.cooldown = 0.5;
    this.t = Math.random() * 5;
    this.face = 1;
  }

  place(x, y) {
    this.x = x;
    this.y = y;
  }

  update(dt, g) {
    this.t += dt;
    const p = g.player;
    const v = this.def.variant;
    this.cooldown -= dt;
    if (v === 'rat') return this.updateRat(dt, g);
    const trail = g.trail;
    const target = trail[Math.min(trail.length - 1, 10 + this.index * 10)] || p;
    const k = Math.min(1, dt * 8);
    this.x += (target.x - this.x) * k;
    this.y += (target.y - this.y) * k;

    if (v === 'buddy') {
      const sh = g.input.shoot;
      if ((sh.x || sh.y) && this.cooldown <= 0) {
        this.cooldown = 1 / this.def.fireRate;
        const len = Math.hypot(sh.x, sh.y) || 1;
        const speed = SHOT_SPEED_PX * 0.9;
        g.projectiles.spawn({
          x: this.x, y: this.y, z: 9, vx: (sh.x / len) * speed, vy: (sh.y / len) * speed,
          r: 3, damage: this.def.damage * (g.player.helperMul || 1), range: 110, team: 'player', knockback: 20,
        });
      }
    } else if (v === 'firefly') {
      if (this.cooldown <= 0) {
        let best = null, bd = 150 * 150;
        for (const e of g.targets()) {
          const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
          if (d2 < bd) { bd = d2; best = e; }
        }
        if (best) {
          this.cooldown = 1 / this.def.fireRate;
          const a = Math.atan2(best.y - this.y, best.x - this.x);
          g.projectiles.spawn({
            x: this.x, y: this.y, z: 12, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
            r: 2, damage: this.def.damage * (g.player.helperMul || 1), range: 160, team: 'player', style: 'spark', homing: true,
          });
        } else {
          this.cooldown = 0.2;
        }
      }
    }
  }

  // The rat: runs at the nearest enemy and bites (every 0.4 s); with none around, it trots after you.
  updateRat(dt, g) {
    const p = g.player;
    let best = null, bd = Infinity;
    for (const e of g.targets()) {
      const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
      if (d2 < bd) { bd = d2; best = e; }
    }
    const tx = best ? best.x : p.x - 12, ty = best ? best.y : p.y + 6;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    const speed = this.def.speed * (best ? 1 : Math.min(1, d / 30));
    if (d > 3) { this.x += (dx / d) * speed * dt; this.y += (dy / d) * speed * dt; }
    if (Math.abs(dx) > 1) this.face = Math.sign(dx);
    this.running = d > 3;
    if (best && this.cooldown <= 0 && d < best.r + 7) {
      this.cooldown = 0.4;
      const dmg = this.def.damage * (g.player.helperMul || 1);
      if (best.boss) best.boss.takeHit(dmg, g);
      else best.takeHit(dmg, dx / d, dy / d, 40, g);
      g.particles.burst(best.x, best.y - 4, 4, { colors: ['#c0262c', '#6a1216'], speed: 40, z: 6, vz: 30 });
    }
  }

  renderShadow(ctx, ox, oy) {
    if (this.def.variant === 'twin') return;
    ctx.drawImage(SHADOW, Math.round(this.x - 5 + ox), Math.round(this.y + 1 + oy));
  }

  render(ctx, ox, oy, g) {
    const v = this.def.variant;
    if (v === 'twin') {
      g.player.renderCopy(ctx, this.x, this.y, ox, oy, 0.6);
      return;
    }
    if (v === 'firefly') {
      const x = Math.round(this.x + ox), y = Math.round(this.y - 10 + Math.sin(this.t * 5) * 2 + oy);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(FIREFLY_GLOW, x - 10, y - 10);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = Math.floor(this.t * 16) % 2 ? '#c4bfb6' : '#8a8580';
      ctx.fillRect(x - 3, y - 2, 2, 1);
      ctx.fillRect(x + 2, y - 2, 2, 1);
      ctx.fillStyle = '#160f0c';
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = '#e8ff7a';
      ctx.fillRect(x, y, 2, 2);
      return;
    }
    if (v === 'rat') {
      const img = art('rat', this.running ? Math.floor(this.t * 12) % 2 : 0);
      ctx.save();
      ctx.translate(Math.round(this.x + ox), Math.round(this.y + oy));
      if (this.face < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -Math.floor(img.width / 2), -img.height + 2);
      ctx.restore();
      return;
    }
    const icon = art('buddy', Math.floor(this.t * 6) % 2);
    const bob = Math.floor(this.t * 6) % 2;
    ctx.drawImage(icon, Math.round(this.x - icon.width / 2 + ox), Math.round(this.y - icon.height + 2 + oy) - bob);
  }
}

// ---------------------------------------------------------------------------
// Gnat: a friendly fly born from a Moldy Heart when a room is cleared. It buzzes around
// the candle and dives into the nearest enemy, dying on impact.
const GNAT_GLOW = makeGlow(6, 'rgba(170,200,90,0.5)');
export class Gnat {
  constructor(x, y, kind = 'gnat') {
    this.kind = kind;   // 'gnat' (flies) or 'spider' (a spiderling that scuttles along the floor)
    this.x = x;
    this.y = y;
    this.r = 3;
    this.t = Math.random() * 6;
    this.target = null;
    this.dead = false;
  }

  update(dt, g) {
    this.t += dt;
    const p = g.player;
    if (!this.target || !(this.target.boss ? this.target.boss.hittable : this.target.hittable && !this.target.dead)) {
      this.target = null;
      let bd = 170 * 170;
      for (const e of g.targets()) {
        const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
        if (d2 < bd) { bd = d2; this.target = e; }
      }
    }
    let tx, ty, speed;
    if (this.target) {
      tx = this.target.x; ty = this.target.y; speed = 150;
    } else {
      const a = this.t * 2.6;
      tx = p.x + Math.cos(a) * 16; ty = p.y - 8 + Math.sin(a * 1.3) * 10; speed = 90;
    }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, speed * dt);
    this.x += (dx / d) * step + Math.sin(this.t * 31) * 0.4;
    this.y += (dy / d) * step + Math.cos(this.t * 27) * 0.4;
    if (this.target && d < this.target.r + this.r) {
      const dmg = Math.max(4, p.stats.damage * 2);
      if (this.target.boss) this.target.boss.takeHit(dmg, g);
      else this.target.takeHit(dmg, dx / d, dy / d, 60, g);
      g.particles.burst(this.x, this.y, 6, { colors: ['#8ab04a', '#4a2418'], speed: 50, z: 8 });
      this.dead = true;
    }
  }

  renderShadow() {}

  render(ctx, ox, oy) {
    if (this.kind === 'spider') {
      const x = Math.round(this.x + ox), y = Math.round(this.y + oy), f = Math.floor(this.t * 16) % 2;
      ctx.fillStyle = '#160f0c';
      ctx.fillRect(x - 3, y - 2 + f, 1, 2); ctx.fillRect(x + 3, y - 2 + (1 - f), 1, 2);
      ctx.fillRect(x - 2, y - 3 + (1 - f), 1, 2); ctx.fillRect(x + 2, y - 3 + f, 1, 2);
      ctx.fillStyle = '#4a3a40';
      ctx.fillRect(x - 1, y - 3, 3, 2);
      ctx.fillStyle = '#c8c4b8';
      ctx.fillRect(x, y - 3, 1, 1);
      return;
    }
    const x = Math.round(this.x + ox), y = Math.round(this.y - 8 + oy);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(GNAT_GLOW, x - 6, y - 6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = Math.floor(this.t * 20) % 2 ? '#d8e0c8' : '#9aa088';
    ctx.fillRect(x - 2, y - 2, 2, 1);
    ctx.fillRect(x + 1, y - 2, 2, 1);
    ctx.fillStyle = '#160f0c';
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = '#6a8a3a';
    ctx.fillRect(x, y, 1, 1);
  }
}

// Sentry: a little candle planted on the floor that shoots the nearest enemy (Beacon).
const SENTRY_ROWS = [
  '...ff...',
  '..fFFf..',
  '..fyyf..',
  '...kk...',
  '..kwwk..',
  '.kwwwWk.',
  '.kwwwWk.',
  '.kwwWWk.',
  'kkkkkkkk',
  'kgggggGk',
  '.kkkkkk.',
];
let SENTRY_ART = null;
export class Sentry {
  constructor(x, y, { damage = 3, life = 0, fireRate = 1.6 } = {}) {
    this.x = x;
    this.y = y;
    this.r = 5;
    this.damage = damage;
    this.life = life;          // seconds, 0 = until you leave the room
    this.fireRate = fireRate;
    this.cooldown = 0.4;
    this.t = 0;
    this.dead = false;
  }

  update(dt, g) {
    this.t += dt;
    if (this.life && this.t >= this.life) { this.dead = true; return; }
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    let best = null, bd = 190 * 190;
    for (const e of g.targets()) {
      const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
      if (d2 < bd) { bd = d2; best = e; }
    }
    if (!best) { this.cooldown = 0.2; return; }
    this.cooldown = 1 / this.fireRate;
    const a = Math.atan2(best.y - this.y, best.x - this.x);
    g.projectiles.spawn({
      x: this.x, y: this.y - 2, z: 14, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150,
      r: 3, damage: this.damage, range: 200, team: 'player', knockback: 20, style: 'wax',
    });
  }

  renderShadow(ctx, ox, oy) {
    ctx.drawImage(SHADOW, Math.round(this.x - 5 + ox), Math.round(this.y + 1 + oy));
  }

  render(ctx, ox, oy) {
    SENTRY_ART ??= buildSprite(SENTRY_ROWS, { k: '#160f0c', w: '#e8d9b0', W: '#c9b48a', g: '#6e665c', G: '#45403a', f: '#f08a24', F: '#ffd25a', y: '#fff3c0' });
    const fading = this.life && this.life - this.t < 2 && Math.floor(this.t * 8) % 2;
    if (fading) ctx.globalAlpha = 0.5;
    ctx.drawImage(SENTRY_ART, Math.round(this.x - 4 + ox), Math.round(this.y - 9 + oy));
    ctx.globalAlpha = 1;
  }
}

// Wisp: a temporary orbital flame (Unsung Hymnal). Blocks two shots, then gutters out.
export class WispOrbital extends Orbital {
  constructor(index, count) {
    super({ radius: 24, speed: 3.4, damage: 3 }, 0);
    this.angle = (index / count) * Math.PI * 2;
    this.temp = true;
    this.hp = 2;
    this.t = Math.random() * 4;
  }

  update(dt, g) {
    this.t += dt;
    super.update(dt, g);
  }

  // called by enemy shots that hit it
  block() {
    this.hp--;
    if (this.hp <= 0) this.dead = true;
  }

  render(ctx, ox, oy) {
    const x = Math.round(this.x + ox), y = Math.round(this.y - 4 + oy);
    const f = Math.floor(this.t * 10) % 2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(WISP_GLOW, x - 9, y - 9);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#6a2a8a';
    ctx.fillRect(x - 2, y - 2 - f, 4, 5 + f);
    ctx.fillStyle = '#c88af0';
    ctx.fillRect(x - 1, y - 1 - f, 2, 3 + f);
    ctx.fillStyle = '#ffffff';
    if (this.hp > 1) ctx.fillRect(x, y, 1, 1);
  }
}
const WISP_GLOW = makeGlow(9, 'rgba(170,110,255,0.6)');
