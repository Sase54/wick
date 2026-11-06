// THE HIVE BELLY (chapter 1): a bloated, pale, buzzing sac riddled with holes.
// Moths crawl out of it; it flings them at you and burps rings of dust.
// Tells: it puffs up before a burp; moths it flings fly in straight lines.
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const SAC = ['#3a3424', '#5a5238', '#7a7050', '#9a9068', '#bab088', '#d8d0a8'];

function makeFrame(flap, puff) {
  const W = 52, H = 48, cx = 26;
  const g = new PixelGrid(W, H);
  // little wings, buzzing
  const wy = flap ? 12 : 16;
  for (const side of [-1, 1]) g.ellipse(cx + side * 17, wy, 8, flap ? 5 : 6, '#8a96a4');
  // the sac
  const r = 16 + puff;
  g.ellipse(cx, 27, r, r - 1, (nx, ny, x, y) => ramp(SAC, light(nx, ny), x, y));
  // veins
  g.line(cx - 8, 18, cx - 13, 30, '#8a3a2a');
  g.line(cx + 6, 20, cx + 12, 34, '#8a3a2a');
  g.line(cx - 2, 36, cx + 4, 41, '#8a3a2a');
  // holes the moths crawl out of
  for (const [hx, hy] of [[-9, 24], [8, 27], [-3, 33], [11, 18], [-12, 34]]) {
    g.ellipse(cx + hx, hy, 2.2, 1.8, '#120c08');
  }
  // tiny head with beady eyes and a drooping mouth-hole
  g.ellipse(cx, 11 - puff, 6, 5, (nx, ny, x, y) => ramp(SAC, light(nx, ny) - 0.1, x, y));
  g.set(cx - 2, 10 - puff, '#c0262c');
  g.set(cx + 2, 10 - puff, '#c0262c');
  g.ellipse(cx, 14 - puff, 1.5, 1.2, '#2a1208');
  return g.outline('#0b0807').toCanvas();
}

let ART = null;
function art() {
  if (!ART) ART = { idle: [makeFrame(0, 0), makeFrame(1, 0)], puff: [makeFrame(0, 2), makeFrame(1, 2)] };
  return ART;
}

export class HiveBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#9a9068', '#d8d0a8', '#8a3a2a', '#5a5238'];
    this.def.glowColor = 'rgba(220,210,140,0.35)';
    this.puff = 0;
    this.lift = 8;
  }

  frames() { return this.puff > 0 ? art().puff : art().idle; }

  render(ctx, ox, oy) {
    this.lift = 8 + Math.sin(this.t * 3) * 3;
    super.render(ctx, ox, oy);
  }

  idle(dt, g) {
    // drifts, keeping a little distance
    const p = g.player, s = this.def.speed[this.phase - 1];
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    const dir = d < 70 ? -1 : 1;
    this.vx = (dx / d) * s * dir + Math.sin(this.t * 1.7) * 10;
    this.vy = (dy / d) * s * dir;
  }

  ambient(dt, g) {
    if (Math.random() < dt * 5) {
      g.particles.spawn(this.x + (Math.random() - 0.5) * 30, this.y - 10, { z: 14, vz: 10, gravity: 10, life: 1, color: '#8a7a62' });
    }
  }

  canUse(name, g) {
    return name !== 'swarm' || g.enemies.length < 5;
  }

  moths(g) {
    return g.enemies.filter((e) => !e.dead && e.type.startsWith('moth'));
  }

  attacks() {
    const p2 = this.phase >= 2;
    const t = this.tier;
    return {
      swarm: (g) => {
        let time = 0;
        return {
          update: (dt) => {
            time += dt;
            this.vx *= 0.9; this.vy *= 0.9;
            if (time < 0.5) return false;
            for (let i = 0; i < 3; i++) {
              const a = (i / 3) * TAU + Math.random();
              g.spawnEnemy('moth', this.x + Math.cos(a) * 14, this.y + Math.sin(a) * 12, { delay: 0.2 });
            }
            g.particles.burst(this.x, this.y, 12, { colors: this.def.debris, speed: 60, z: 10 });
            sfx('enemyShoot');
            return true;
          },
        };
      },
      // Fling its moths at you. If it has none, it makes two first.
      launch: (g) => {
        let time = 0, made = false, flung = false;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.shake = 1;
            if (!made && this.moths(g).length < 2) {
              made = true;
              for (let i = 0; i < 2; i++) g.spawnEnemy('moth', this.x + (i ? 10 : -10), this.y, { delay: 0.1 });
            }
            if (!flung && time >= 0.7) {
              flung = true;
              const p = g.player;
              this.moths(g).slice(0, 3 + (p2 ? 1 : 0) + t).forEach((m, i) => {
                const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
                m.kx = (dx / d) * 330;
                m.ky = (dy / d) * 330;
                m.wanderT = 0.5 + i * 0.1;
              });
              sfx('charge');
            }
            return time >= 1.1;
          },
        };
      },
      burp: (g) => {
        let time = 0, fired = 0;
        const volleys = p2 ? 2 : 1;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.puff = time < 0.6 + fired * 0.4 ? 1 : 0;
            if (time >= 0.6 + fired * 0.4 && fired < volleys) {
              this.ring(g, 6 + t * 2, 55, fired * 0.5);
              g.particles.burst(this.x, this.y, 10, { colors: ['#8a7a62', '#c8b8a0'], speed: 50, z: 10 });
              sfx('steam');
              fired++;
            }
            if (fired >= volleys && time >= 0.8 + volleys * 0.4) { this.puff = 0; return true; }
            return false;
          },
        };
      },
    };
  }
}
