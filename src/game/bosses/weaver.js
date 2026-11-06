// THE WEAVER (chapter 1): a fat cellar spider with a pale spiral on its back.
// Skitters around, rears up and lunges at you, spits slow web, hatches mites.
// Tells: it shakes before a lunge; lunges are short, so stepping sideways dodges them.
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { ROOM_X, ROOM_Y, ROOM_R, ROOM_B } from '../constants.js';
import { Boss, TAU } from './base.js';

const BODY = ['#120c10', '#221820', '#33242e', '#46323e', '#5a4450'];
const LEG = '#1a1218';

function makeFrame(step) {
  const W = 56, H = 42, cx = 28;
  const g = new PixelGrid(W, H);
  // eight legs: hip -> knee (up and out) -> foot
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const lift = (i + step) % 2 === 0 ? -2 : 1;
      const hy = 24 + i * 2;
      const kx = cx + side * (12 + i * 3), ky = 10 + i * 4 + lift;
      const fx = cx + side * (20 + i * 2), fy = 26 + i * 4 + lift;
      g.line(cx + side * 4, hy, kx, ky, LEG);
      g.line(cx + side * 4, hy + 1, kx, ky + 1, LEG);
      g.line(kx, ky, fx, fy, LEG);
    }
  }
  // abdomen with a pale spiral
  g.ellipse(cx, 16, 13, 11, (nx, ny, x, y) => ramp(BODY, light(nx, ny), x, y));
  let a = 0;
  for (let r = 1; r < 8; r += 0.35) {
    g.set(cx + Math.cos(a) * r, 16 + Math.sin(a) * r * 0.8, '#c8c0b0');
    a += 0.55;
  }
  // head
  g.ellipse(cx, 29, 7, 5.5, (nx, ny, x, y) => ramp(BODY, light(nx, ny) + 0.1, x, y));
  for (const [ex, ey] of [[-3, 27], [3, 27], [-1, 26], [1, 26], [-4, 29], [4, 29]]) g.set(cx + ex, ey, '#ff3a2a');
  // fangs
  g.line(cx - 2, 33, cx - 3, 36, '#c8c0b0');
  g.line(cx + 2, 33, cx + 3, 36, '#c8c0b0');
  return g.outline('#06030a').toCanvas();
}

let ART = null;
function art() {
  if (!ART) ART = [0, 1].map(makeFrame);
  return ART;
}

export class WeaverBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#33242e', '#5a4450', '#c8c0b0', '#120c10'];
    this.def.glowColor = 'rgba(200,60,60,0.35)';
    this.skitter = 0;
  }

  frames() { return art(); }

  idle(dt, g) {
    // short scuttles in random directions, drifting toward Wick
    this.skitter -= dt;
    if (this.skitter <= 0) {
      this.skitter = 0.35 + Math.random() * 0.4;
      const p = g.player;
      const a = Math.atan2(p.y - this.y, p.x - this.x) + (Math.random() - 0.5) * 2.4;
      const s = this.def.speed[this.phase - 1] * (0.6 + Math.random());
      this.vx = Math.cos(a) * s;
      this.vy = Math.sin(a) * s;
    }
    // stay off the walls
    if (this.x < ROOM_X + 30) this.vx = Math.abs(this.vx);
    if (this.x > ROOM_R - 30) this.vx = -Math.abs(this.vx);
    if (this.y < ROOM_Y + 24) this.vy = Math.abs(this.vy);
    if (this.y > ROOM_B - 24) this.vy = -Math.abs(this.vy);
  }

  canUse(name, g) {
    return name !== 'brood' || g.enemies.length < 4;
  }

  attacks() {
    const p2 = this.phase >= 2;
    const t = this.tier;
    return {
      lunge: (g) => this.chargeAttack(g, { telegraph: 0.55, speed: 215, stun: 0.6, maxTime: 0.45, times: p2 ? 2 : 1 }),
      brood: (g) => {
        let time = 0;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.shake = 1;
            if (time < 0.5) return false;
            const n = 2 + (p2 ? 1 : 0);
            for (let i = 0; i < n; i++) {
              const a = (i / n) * TAU + Math.random();
              g.spawnEnemy('mite', this.x + Math.cos(a) * 16, this.y + Math.sin(a) * 12, { delay: 0.3 });
            }
            g.particles.burst(this.x, this.y, 12, { colors: ['#c8c0b0', '#9a8a74'], speed: 50, z: 6 });
            sfx('enemyDeath');
            return true;
          },
        };
      },
      web: (g) => {
        let time = 0, fired = 0;
        const volleys = p2 ? 2 : 1;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time >= 0.45 + fired * 0.5 && fired < volleys) {
              this.spread(g, 3 + t, 0.3, 55, 'ghost');
              sfx('enemyShoot');
              fired++;
            }
            return fired >= volleys && time >= 0.6 + volleys * 0.5;
          },
        };
      },
    };
  }
}
