// THE DEEP ANGLER (chapter 2, fits The Sunken Caves): a huge blind fish dragged up from the
// flooded depths, walking on its fins, a glowing lure dangling in front of its jaws.
// Every attack has a tell:
//   lure     the lure flares bright and pulls you in a little (0.8 s), then lets go of glowing
//            wisps that drift after you
//   lunge    it opens its jaws and the line shows (0.7 s), then it throws itself along it, jaws
//            snapping, and lies there gasping
//   submerge sinks into the water, a ripple chases you, stops and flashes red, it bursts up
//            with a ring of water
//   gulp     (phase 2) opens its mouth wide and sucks in (water rushes toward it, so do you),
//            then snaps shut with a ring of teeth
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const SKIN = ['#0e161c', '#1a2832', '#283c48', '#3a525e', '#506a76'];

function makeFrame(open, bright, f) {
  const W = 66, H = 50, cx = 30;
  const g = new PixelGrid(W, H);
  // tail and fins
  g.poly([[cx - 22, 28], [cx - 34, 18 + f], [cx - 32, 40 - f], [cx - 22, 34]], (x, y) => ramp(SKIN, 0.4 + (y - 28) / 40, x, y));
  for (const s of [-1, 1]) g.poly([[cx - 4, 40], [cx + 6, 40], [cx + 2 + s * 3, 48 - f], [cx - 6 + s * 2, 47]], SKIN[1]);
  // the body: a huge round head-and-belly
  g.ellipse(cx, 28, 24, 18, (nx, ny, x, y) => ramp(SKIN, light(nx, ny) + ((x * 5 + y * 11) % 13 === 0 ? 0.3 : 0), x, y));
  // pale belly
  g.ellipse(cx + 4, 36, 16, 7, (nx, ny, x, y) => ramp(['#3a4a50', '#56686e', '#71868a', '#8ea4a6'], light(nx, ny), x, y));
  // the jaw: an underbite full of needle teeth
  const jaw = open ? 10 : 2;
  g.poly([[cx + 6, 28], [cx + 26, 24], [cx + 28, 30 + jaw], [cx + 8, 34 + jaw / 2]], open ? '#2a0a10' : SKIN[2]);
  for (let i = 0; i < 6; i++) {
    const tx = cx + 10 + i * 3;
    g.line(tx, 27 - Math.round(i * 0.5), tx, 30 - Math.round(i * 0.5), '#e8ecf0');
    g.line(tx + 1, 31 + jaw - Math.round(i * 0.3), tx + 1, 28 + jaw - Math.round(i * 0.3), '#e8ecf0');
  }
  // a tiny blind eye
  g.ellipse(cx + 4, 18, 2.5, 2.5, '#b8c4c8');
  g.set(cx + 4, 18, '#5a6a70');
  // the stalk and its lure
  g.line(cx + 2, 10, cx + 14, 0 + 1, SKIN[3]);
  g.line(cx + 14, 1, cx + 26, 8, SKIN[3]);
  const lureCol = bright ? ['#ffffff', '#d8f8ff', '#7ae0f0'] : ['#d8f8ff', '#7ae0f0', '#3a9ab0'];
  g.ellipse(cx + 26, 11, 3.5, 3.5, lureCol[2]);
  g.ellipse(cx + 26, 11, 2.2, 2.2, lureCol[1]);
  g.set(cx + 25, 10, lureCol[0]);
  return g.outline('#04080a').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    idle: [0, 1].map((f) => makeFrame(false, false, f)),
    open: [0, 1].map((f) => makeFrame(true, false, f)),
    lure: [0, 1].map((f) => makeFrame(false, true, f)),
  };
  return ART;
}

export class AnglerBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#3a525e', '#71868a', '#7ae0f0', '#0e161c'];
    this.def.glowColor = 'rgba(120,230,255,0.45)';
    this.def.moundColor = '#1e4a5a';
    this.pose = null;
  }

  frames() { return art()[this.pose || 'idle']; }

  // the lure is a light in the dark
  ambient(dt, g) {
    if (Math.random() < dt * 3) g.particles.spawn(this.x + 22, this.y - 30, { z: 30, vz: 6, life: 0.6, color: '#7ae0f0', size: 1 });
  }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    const pull = (g, dt, power) => {
      const p = g.player, dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d > 20) { p.vx += (dx / d) * power * dt; p.vy += (dy / d) * power * dt; }
    };
    return {
      lure: (g) => {
        let time = 0, fired = false;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.pose = 'lure';
            if (time - dt <= 0) sfx('chime');
            if (time < 0.8) { pull(g, dt, 70); return false; }
            if (!fired) {
              fired = true;
              const base = Math.atan2(g.player.y - this.y, g.player.x - this.x), n = 4 + t + (p2 ? 1 : 0);
              for (let i = 0; i < n; i++) {
                const a = base + (i - (n - 1) / 2) * 0.5;
                g.projectiles.spawn({
                  x: this.x + 22, y: this.y - 6, z: 24, vx: Math.cos(a) * 46, vy: Math.sin(a) * 46,
                  r: 4, damage: 1, team: 'enemy', range: 280, source: this.name, style: 'blue', seek: 1.3,
                });
              }
              sfx('enemyShoot');
            }
            if (time >= 1.2) { this.pose = null; return true; }
            return false;
          },
        };
      },
      lunge: (g) => {
        let time = 0, phase = 'wind', dx = 0, dy = 0, left = p2 ? 2 : 1;
        return {
          update: (dt) => {
            time += dt;
            if (phase === 'wind') {
              this.vx = this.vy = 0;
              this.pose = 'open';
              this.shake = 2;
              const p = g.player, d = Math.hypot(p.x - this.x, p.y - this.y) || 1;
              dx = (p.x - this.x) / d; dy = (p.y - this.y) / d;
              if (Math.random() < dt * 30) {
                const k = 20 + Math.random() * 120;
                g.particles.spawn(this.x + dx * k, this.y + dy * k, { z: 1, vz: 10, life: 0.3, color: '#ff4a2a', size: 1 });
              }
              if (time >= 0.7) { phase = 'go'; time = 0; sfx('dash'); }
              return false;
            }
            if (phase === 'go') {
              this.vx = dx * 230; this.vy = dy * 230;
              if (this.lastHit || time > 0.6) { phase = 'gasp'; time = 0; this.vx = this.vy = 0; sfx('splash'); this.spread(g, 3, 0.4, 60, 'ice'); }
              return false;
            }
            this.vx = this.vy = 0;
            this.pose = 'idle';
            if (time >= 0.8) {
              if (--left > 0) { phase = 'wind'; time = 0.25; return false; }
              this.pose = null;
              return true;
            }
            return false;
          },
        };
      },
      submerge: (g) => this.burrowAttack(g, {
        track: 1.2, speed: 115,
        onRise: () => {
          sfx('splashBig');
          this.ring(g, 10 + t * 2, 64, Math.random() * TAU, 'ice');
          g.particles.burst(this.x, this.y, 20, { colors: ['#4a8aa8', '#8ad0f0', '#d0f0ff'], speed: 90, z: 2, vz: 70 });
        },
      }),
      gulp: (g) => {
        let time = 0, done = false;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 1.3) {
              this.pose = 'open';
              this.shake = 1;
              if (time - dt <= 0) sfx('inhale');
              pull(g, dt, 160);
              // water rushing in
              if (Math.random() < dt * 40) {
                const a = Math.random() * TAU, r = 60 + Math.random() * 60;
                g.particles.spawn(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r * 0.7, { z: 2, vx: -Math.cos(a) * 120, vy: -Math.sin(a) * 84, life: 0.5, color: '#8ad0f0', size: 1 });
              }
              return false;
            }
            if (!done) {
              done = true;
              this.pose = null;
              g.shake(5);
              sfx('slam');
              this.ring(g, 14 + t * 2, 70, Math.random() * TAU, 'ice');
            }
            return time >= 1.7;
          },
        };
      },
    };
  }
}
