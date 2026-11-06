// THE MOTH QUEEN: a huge dusty moth with staring eye-spots on her wings.
// Flutters around, sheds rings of dust, dives at you, calls her children.
// Phase 2: wings tear, dust spirals, double dives.
import { PixelGrid, ramp } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { ROOM_X, ROOM_Y, ROOM_R, ROOM_B } from '../constants.js';
import { Boss, TAU } from './base.js';

const WING = ['#3a2e24', '#5a4a3a', '#7a6a54', '#9a8a70', '#b8a888'];
const FUR = ['#6a645c', '#8a8580', '#aaa49c', '#c8c2b8'];

function makeFrame(flap, torn) {
  const W = 60, H = 44, cx = 30;
  const g = new PixelGrid(W, H);
  const lift = [-4, 0, 4][flap];       // wing tips up / level / down
  const span = [0.85, 1, 0.9][flap];
  // upper wings
  for (const side of [-1, 1]) {
    const wx = cx + side * 15 * span, wy = 16 + lift * 0.6;
    g.ellipse(wx, wy, 15 * span, 11, (nx, ny, x, y) => ramp(WING, 0.75 - Math.abs(nx) * 0.35 - ny * 0.25, x, y));
    // eye spot
    g.ellipse(wx + side * 2, wy, 4.5, 4.5, '#e8d9b0');
    g.ellipse(wx + side * 2, wy, 3, 3, '#c0262c');
    g.ellipse(wx + side * 2, wy, 1.5, 1.5, '#120c0a');
    g.set(wx + side * 2 - 1, wy - 2, '#ffffff');
    // lower wings
    g.ellipse(cx + side * 11, 31 - lift * 0.3, 9, 7, (nx, ny, x, y) => ramp(WING, 0.55 - ny * 0.3, x, y));
  }
  if (torn) {
    // ragged holes in the wings
    for (const [x, y, r] of [[10, 12, 3], [48, 20, 3], [16, 24, 2], [44, 10, 2], [20, 34, 2], [41, 33, 2]]) g.ellipse(x, y, r, r * 0.8, null);
  }
  // furry body
  g.ellipse(cx, 24, 5, 13, (nx, ny, x, y) => ramp(FUR, 0.7 - nx * 0.3 + (y % 4 === 0 ? -0.3 : 0), x, y));
  g.ellipse(cx, 10, 5, 4.5, (nx, ny, x, y) => ramp(FUR, 0.8 - nx * 0.3 - ny * 0.2, x, y));
  g.set(cx - 2, 10, '#ff3a2a');
  g.set(cx + 2, 10, '#ff3a2a');
  // feathery antennae
  for (const side of [-1, 1]) {
    g.line(cx + side * 2, 6, cx + side * 8, 1, '#3a2e24');
    g.line(cx + side * 8, 1, cx + side * 11, 2, '#3a2e24');
  }
  return g.outline('#0b0807').toCanvas();
}

let ART = null;
function art() {
  if (!ART) {
    ART = {
      normal: [0, 1, 2, 1].map((f) => makeFrame(f, false)),
      torn: [0, 1, 2, 1].map((f) => makeFrame(f, true)),
    };
  }
  return ART;
}

export class MothQueenBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#7a6a54', '#9a8a70', '#c8c2b8', '#3a2e24'];
    this.def.glowColor = 'rgba(220,200,160,0.4)';
    this.wanderT = 0;
    this.tx = this.x;
    this.ty = this.y;
    this.lift = 10;
  }

  frames() { return this.phase >= 2 ? art().torn : art().normal; }

  render(ctx, ox, oy) {
    // wings beat fast, body bobs
    this.lift = this.state === 'attack' && this.lastAttack === 'dive' ? 4 : 10 + Math.sin(this.t * 4) * 3;
    super.render(ctx, ox, oy);
  }

  idle(dt, g) {
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = 0.8 + Math.random() * 0.8;
      this.tx = ROOM_X + 40 + Math.random() * (ROOM_R - ROOM_X - 80);
      this.ty = ROOM_Y + 30 + Math.random() * (ROOM_B - ROOM_Y - 80);
    }
    const s = this.def.speed[this.phase - 1];
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy) || 1;
    this.vx = (dx / d) * s + Math.sin(this.t * 5) * 20;
    this.vy = (dy / d) * s + Math.cos(this.t * 4) * 12;
  }

  ambient(dt, g) {
    if (Math.random() < dt * 8) {
      g.particles.spawn(this.x + (Math.random() - 0.5) * 50, this.y - 4, {
        z: 14, vz: -5, gravity: 20, life: 1.4, color: Math.random() < 0.5 ? '#9a8a70' : '#c8c2b8',
      });
    }
  }

  canUse(name, g) {
    return name !== 'swarm' || g.enemies.length < 5;
  }

  attacks() {
    const p2 = this.phase >= 2;
    return {
      dust: (g) => {
        let t = 0, n = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx *= 0.9; this.vy *= 0.9;
            if (t >= 0.35 + n * 0.35 && n < 3) {
              n++;
              this.ring(g, 10, 55 + n * 8, n * 0.3);
              sfx('steam');
            }
            return t >= 1.3;
          },
        };
      },
      dive: (g) => this.chargeAttack(g, { telegraph: 0.55, speed: p2 ? 240 : 200, stun: 0.4, times: p2 ? 2 : 1 }),
      swarm: (g) => {
        let t = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            if (t < 0.5) return false;
            for (let i = 0; i < 3; i++) {
              const a = (i / 3) * TAU + Math.random();
              g.spawnEnemy(p2 ? 'mothRotten' : 'moth', this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 14, { delay: 0.2 });
            }
            g.particles.burst(this.x, this.y, 20, { colors: this.def.debris, speed: 70, z: 14 });
            return true;
          },
        };
      },
      spiral: (g) => {
        let t = 0, fire = 0, a = 0;
        return {
          update: (dt) => {
            t += dt;
            fire -= dt;
            this.vx = this.vy = 0;
            if (fire <= 0) {
              fire = 0.1;
              a += 0.42;
              for (let k = 0; k < 3; k++) g.enemyShoot(this, a + (k * TAU) / 3, 62, 'dust');
            }
            return t >= 2.4;
          },
        };
      },
    };
  }
}
