// THE TALLOW HEART (chapter 4, floor 2 only): the heart of everything down here, a huge organ of
// meat and old candle wax rooted to the floor by its veins. It never moves. Every attack has a tell:
//   beat     it swells (0.6 s), then beats: a ring of blood (two beats in phase 2)
//   veins    six veins along the floor glow red (0.8 s), then burst open spot by spot
//   bleed    it shudders and blood rains down on marked spots around you
//   clots    it tears open and three clotlings crawl out
//   harden   wax creeps over it (0.5 s): hard as stone for 3 s (shots do 10%) while it sputters
//            a slow spiral
//   frenzy   (phase 3) it races: fast beats in a turning spiral
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const MEAT = ['#2a060a', '#4a0e14', '#6a1820', '#8a2830', '#aa4044', '#c86058', '#e08a7a'];
const WAX = ['#6a5a44', '#8a7a5e', '#aa9a78', '#c9b48a', '#e8d4a8'];

function makeFrame(swell, waxed, f) {
  const W = 76, H = 70, cx = 38, cy = 38;
  const g = new PixelGrid(W, H);
  // veins and roots spreading into the floor
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.15 + i * 0.12);
    g.line(cx, cy + 14, cx + Math.cos(a) * 34 * (i % 2 ? 1 : -1), cy + 22 + Math.sin(a) * 8, MEAT[1]);
  }
  // the two lobes and the body of the heart
  const s = swell * 3;
  const body = waxed ? WAX : MEAT;
  g.ellipse(cx - 10, cy - 8, 15 + s, 14 + s, (nx, ny, x, y) => ramp(body, light(nx, ny) + 0.1, x, y));
  g.ellipse(cx + 10, cy - 8, 15 + s, 14 + s, (nx, ny, x, y) => ramp(body, light(nx, ny) + 0.05, x, y));
  g.poly([[cx - 24 - s, cy - 4], [cx + 24 + s, cy - 4], [cx + 4, cy + 26 + s], [cx - 4, cy + 26 + s]], (x, y) => ramp(body, 0.7 - (y - cy) / 40 - Math.abs(x - cx) / 80, x, y));
  // great vessels on top, dripping wax
  for (const [x, w, h] of [[-8, 6, 12], [4, 7, 15], [14, 5, 9]]) {
    g.rect(cx + x, cy - 26 - h + 6, w, h, MEAT[2]);
    g.ellipse(cx + x + w / 2, cy - 26 - h + 6, w / 2, 2, MEAT[0]);
    g.rect(cx + x + 1, cy - 26 - h + 8, 1, h - 3, WAX[3]);
  }
  // wax dripping down the outside, veins across
  for (const [x, y, l] of [[-18, -12, 10], [-6, -16, 14], [9, -14, 12], [19, -8, 8]]) for (let k = 0; k < l; k++) g.set(cx + x, cy + y + k, WAX[k === l - 1 ? 2 : 4]);
  if (!waxed) {
    const vc = swell > 0.5 ? '#ff4a2a' : MEAT[0];
    for (const pts of [[[-18, -2], [-10, 4], [-4, 2], [2, 10]], [[16, -6], [10, 2], [12, 10], [4, 16]]]) {
      for (let i = 0; i + 1 < pts.length; i++) g.line(cx + pts[i][0], cy + pts[i][1], cx + pts[i + 1][0], cy + pts[i + 1][1], vc);
    }
  } else {
    for (let i = 0; i < 8; i++) g.line(cx - 20 + i * 5, cy - 14 + (i % 3), cx - 18 + i * 5, cy + 10 - (i % 2) * 4, WAX[1]);   // hardened cracks
  }
  // a candle wick on top, burning
  g.rect(cx - 1, cy - 34, 2, 6, '#2a1a10');
  const fl = 4 + (f % 2);
  g.ellipse(cx, cy - 36 - fl / 2, 2, fl / 2 + 1, '#f08a24');
  g.ellipse(cx, cy - 35 - fl / 4, 1, fl / 4 + 1, '#ffd25a');
  return g.outline('#0a0204').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    idle: [0, 1].map((f) => makeFrame(0, false, f)),
    swell: [0, 1].map((f) => makeFrame(1, false, f)),
    waxed: [0, 1].map((f) => makeFrame(0, true, f)),
  };
  return ART;
}

export class TallowHeartBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#8a2830', '#c86058', '#e8d4a8', '#2a060a'];
    this.def.glowColor = 'rgba(255,60,40,0.55)';
    this.def.alwaysGlow = true;
    this.pose = null;
    this.armor = 0;
    this.veins = null;
    this.pulse = 0;
  }

  frames() { return art()[this.pose || (Math.sin(this.t * (this.phase >= 2 ? 9 : 6)) > 0.6 ? 'swell' : 'idle')]; }

  canUse(name, g) { return name !== 'clots' || g.enemies.length < 4; }

  takeHit(damage, g) {
    if (this.armor > 0) {
      sfx('clink');
      g.particles.burst(this.x, this.y - 20, 3, { colors: ['#e8d4a8', '#c9b48a'], speed: 50, z: 10 });
    }
    super.takeHit(damage * (1 - this.armor), g);
  }

  update(dt, g) {
    super.update(dt, g);
    this.pulse = Math.max(0, this.pulse - dt);
  }

  beat(g, n, speed, style = 'blood') {
    this.ring(g, n, speed, Math.random() * TAU, style);
    this.pulse = 0.4;
    g.shake(5);
    sfx('thump');
  }

  attacks() {
    const p2 = this.phase >= 2, p3 = this.phase >= 3, t = this.tier;
    return {
      beat: (g) => {
        let time = 0, n = 0;
        const beats = p2 ? 2 : 1;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.pose = time < 0.6 ? 'swell' : null;
            this.shake = time < 0.6 ? 1 : 0;
            if (time - dt <= 0) sfx('inhale');
            while (n < beats && time >= 0.6 + n * 0.45) { this.beat(g, 14 + t * 2, 62 + n * 10); n++; }
            return time >= 0.6 + beats * 0.45 + 0.2;
          },
        };
      },
      veins: (g) => {
        let time = 0, step = -1;
        const base = Math.random() * TAU, lines = p2 ? 8 : 6;
        this.veins = { base, lines, k: 0 };
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.8) { this.veins.k = time / 0.8; if (time - dt <= 0) sfx('gurgle'); return false; }
            if (step < 0) { step = 0; sfx('slam'); g.shake(4); }
            while (step < 9 && time >= 0.8 + step * 0.06) {
              for (let i = 0; i < lines; i++) {
                const a = base + (i / lines) * TAU, d = 34 + step * 16;
                const x = this.x + Math.cos(a) * d, y = this.y + Math.sin(a) * d * 0.75;
                const room = g.room;
                if (x < room.x0 || x > room.R || y < room.y0 || y > room.B) continue;
                g.particles.burst(x, y, 5, { colors: ['#c0262c', '#6a1216', '#e8d4a8'], speed: 40, z: 2, vz: 70 });
                if (g.playerBodies().some((b) => Math.hypot(b.x - x, b.y - y) < 10 + b.r)) g.player.hurt(1, this.name, g, x, y);
              }
              step++;
            }
            if (time >= 0.8 + 9 * 0.06 + 0.3) { this.veins = null; return true; }
            return false;
          },
        };
      },
      bleed: (g) => this.simple(g, {
        wind: 0.6, after: 1.3, pose: 'swell', sound: 'gurgle', shake: 2,
        fire: () => {
          const p = g.player, n = 7 + t + (p2 ? 3 : 0);
          for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU, r = i === 0 ? 0 : 20 + Math.random() * 70;
            const tx = Math.max(g.room.x0 + 10, Math.min(g.room.R - 10, p.x + Math.cos(a) * r));
            const ty = Math.max(g.room.y0 + 10, Math.min(g.room.B - 10, p.y + Math.sin(a) * r));
            this.lob(g, tx, ty, { flight: 0.9 + i * 0.06, burst: 4, speed: 50, style: 'blood', from: { x: this.x, y: this.y - 40 } });
          }
        },
      }),
      clots: (g) => this.simple(g, {
        wind: 0.8, after: 0.5, pose: 'swell', sound: 'squish', shake: 2,
        fire: () => {
          for (let i = 0; i < 3; i++) {
            const a = Math.PI / 2 + (i - 1) * 0.8;
            const e = g.spawnEnemy('clotling', this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 24, { delay: 0.2 });
            e.kx = Math.cos(a) * 100; e.ky = Math.sin(a) * 100;
          }
        },
      }),
      harden: (g) => {
        let time = 0, shotT = 0, a = Math.random() * TAU;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.5) { this.shake = 1; if (time - dt <= 0) sfx('crackle'); if (Math.random() < dt * 30) g.particles.spawn(this.x + (Math.random() - 0.5) * 50, this.y - 20, { z: 20, vz: -10, life: 0.4, color: '#e8d4a8', size: 2 }); return false; }
            this.pose = 'waxed';
            this.armor = 0.9;
            a += dt * 1.8;
            shotT -= dt;
            if (shotT <= 0) { shotT = p2 ? 0.22 : 0.32; for (const off of [0, Math.PI]) g.enemyShoot(this, a + off, 52, 'ember'); }
            if (time >= 3.5) { this.pose = null; this.armor = 0; g.particles.burst(this.x, this.y - 20, 20, { colors: ['#e8d4a8', '#c9b48a'], speed: 80, z: 14, vz: 60 }); sfx('rockBreak'); return true; }
            return false;
          },
        };
      },
      frenzy: (g) => {
        let time = 0, shotT = 0, a = Math.random() * TAU;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.6) { this.pose = 'swell'; this.shake = 2; if (time - dt <= 0) sfx('bossRoar'); return false; }
            this.pose = null;
            shotT -= dt;
            if (shotT <= 0) {
              shotT = 0.3;
              a += 0.35;
              for (let i = 0; i < 6; i++) g.enemyShoot(this, a + (i / 6) * TAU, 66, 'blood');
              this.pulse = 0.2;
              sfx('thump');
            }
            return time >= 3;
          },
        };
      },
    };
  }

  renderShadow(ctx, ox, oy) {
    super.renderShadow(ctx, ox, oy);
    // the veins about to burst: glowing lines on the floor
    const v = this.veins;
    if (v) {
      ctx.globalAlpha = 0.3 + 0.5 * v.k;
      ctx.fillStyle = Math.floor(this.t * 16) % 2 ? '#ff4a2a' : '#c0262c';
      for (let i = 0; i < v.lines; i++) {
        const a = v.base + (i / v.lines) * TAU;
        for (let d = 34; d < 34 + 9 * 16; d += 5) ctx.fillRect(Math.round(this.x + Math.cos(a) * d + ox), Math.round(this.y + Math.sin(a) * d * 0.75 + oy), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  render(ctx, ox, oy) {
    // a pulse of light on every beat
    if (this.pulse > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.pulse;
      ctx.drawImage(this.glow, Math.round(this.x - 44 + ox), Math.round(this.y - 70 + oy), 88, 88);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    super.render(ctx, ox, oy);
  }
}
