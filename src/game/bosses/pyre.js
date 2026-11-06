// THE TALLOW PYRE (chapter 1, fits The Smolder): a heap of melted candles that caught fire and
// grew a face in the wax. Every attack has a wind-up:
//   fireline  shakes with glowing eyes while sparks trace a line toward you, then fire marches along it
//   spit      its mouth glows, then a fan of embers
//   leap      the big jump (shadow follows you, locks red, falls): a ring of shots and a ring of fire
//   kindle    flames rise from its back, two cinderlings drop off
//   eruption  (phase 2) the heap shudders, coals rain down where the floor marks show
import { PixelGrid, ramp } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';
import { addCreep } from '../hazards.js';

const WAX = ['#4a3424', '#6a4c34', '#8a6a4a', '#aa8a62', '#caa87e', '#e8cca0'];
const HOT = ['#5a1a0c', '#8a2a10', '#b84a1c', '#d8742a', '#f0a040', '#ffd25a'];
const FIRE = ['#a01c10', '#e04a18', '#ff8a2a', '#ffd25a', '#fff3c0'];

function makeFrame(f, phase) {
  const W = 50, H = 46, cx = 25;
  const g = new PixelGrid(W, H);
  const body = phase >= 2 ? HOT : WAX;
  // the puddle of melted wax it sits in
  g.ellipse(cx, 41, 22, 4.5, (nx, ny, x, y) => ramp(body, 0.45 - ny * 0.2, x, y));
  // a heap of candle stumps, melted together
  const stumps = [[cx - 13, 30, 6, 14], [cx + 12, 31, 6, 12], [cx - 5, 22, 7, 20], [cx + 5, 25, 6, 17], [cx, 32, 13, 9]];
  for (const [x, y, rx, h] of stumps) {
    g.rect(x - rx, y - h / 2, rx * 2, h, (px, py) => ramp(body, 0.75 - Math.abs(px - x) / (rx * 2.2) - (py - y + h / 2) / 60, px, py));
    g.ellipse(x, y - h / 2, rx, 2, body[5]);
  }
  // drips running down
  for (const [x, y, l] of [[cx - 16, 26, 9], [cx - 8, 18, 12], [cx + 3, 20, 10], [cx + 14, 28, 8], [cx + 8, 26, 9]]) {
    for (let k = 0; k < l; k++) g.set(x, y + k, body[k === l - 1 ? 3 : 5]);
  }
  // flames on each wick
  const flicker = (x, top, s) => {
    const h = Math.round((5 + ((f + x) % 3)) * s);
    for (let i = 0; i < h; i++) {
      const w = Math.max(1, Math.round((h - i) * 0.5 * s));
      const col = FIRE[Math.min(4, Math.floor((i / h) * 4) + (phase >= 2 ? 0 : 1))];
      g.rect(x - Math.floor(w / 2) + (i > h / 2 ? ((f + i) % 2 ? 1 : -1) : 0), top - i, w, 1, col);
    }
  };
  const big = phase >= 2 ? 1.5 : 1;
  flicker(cx - 13, 22, big); flicker(cx + 12, 24, big); flicker(cx - 5, 11, 1.2 * big); flicker(cx + 5, 16, big);
  // the face pressed into the wax
  const eye = phase >= 2 ? '#ffffff' : '#ffd25a';
  g.ellipse(cx - 5, 31, 2.5, 2, '#1a0a06'); g.ellipse(cx + 5, 31, 2.5, 2, '#1a0a06');
  g.set(cx - 5, 31, eye); g.set(cx + 5, 31, eye);
  g.ellipse(cx, 36, 5, 2, '#1a0a06');
  return g.outline('#0b0706').toCanvas();
}

let ART = null;
function art() {
  if (!ART) {
    ART = {};
    for (const p of [1, 2]) ART[p] = [0, 1, 2].map((f) => makeFrame(f, p));
    ART.open = [1, 2].map((p) => {
      const c = makeFrame(1, p);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffd25a';
      ctx.fillRect(22, 35, 7, 3);
      return c;
    });
  }
  return ART;
}

export class PyreBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#8a6a4a', '#caa87e', '#f08a24', '#3a2a20'];
    this.def.glowColor = 'rgba(255,110,30,0.55)';
    this.def.alwaysGlow = true;
    this.mouth = 0;
  }

  frames() {
    if (this.mouth > 0) return [art().open[this.phase >= 2 ? 1 : 0]];
    return art()[Math.min(2, this.phase)];
  }

  canUse(name, g) {
    return name !== 'kindle' || g.enemies.length < 3;
  }

  ambient(dt, g) {
    if (Math.random() < dt * (10 + this.phase * 8)) {
      g.particles.spawn(this.x + (Math.random() - 0.5) * 36, this.y - 20, { z: 20, vz: 30, gravity: -30, life: 0.8, size: 1, color: Math.random() < 0.5 ? '#f08a24' : '#ffd25a' });
    }
  }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      fireline: (g) => {
        let time = 0, step = 0, dx = 0, dy = 0;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.75) {
              // wind-up: shake, and sparks trace the line the fire will take
              this.shake = 2;
              const p = g.player, d = Math.hypot(p.x - this.x, p.y - this.y) || 1;
              dx = (p.x - this.x) / d; dy = (p.y - this.y) / d;
              if (Math.random() < dt * 30) {
                const k = 20 + Math.random() * 160;
                g.particles.spawn(this.x + dx * k, this.y + dy * k, { z: 2, vz: 25, life: 0.35, color: '#ff4a2a', size: 1 });
              }
              if (time - dt < 0.01) sfx('crackle');
              return false;
            }
            // fire marches out along the line
            const lines = p2 ? [-0.35, 0, 0.35] : [0];
            while (step < 12 && time >= 0.75 + step * 0.05) {
              for (const off of lines) {
                const a = Math.atan2(dy, dx) + off, k = 22 + step * 15;
                const x = this.x + Math.cos(a) * k, y = this.y + Math.sin(a) * k;
                if (!g.room.isWalkSolid(g.room.colAt(x), g.room.rowAt(y)) && x > g.room.x0 && x < g.room.R && y > g.room.y0 && y < g.room.B) addCreep(g, x, y, 'fire');
              }
              if (step === 0) sfx('whoosh');
              step++;
            }
            return time >= 0.75 + 12 * 0.05 + 0.3;
          },
        };
      },
      spit: (g) => {
        let time = 0, fired = 0;
        const volleys = p2 ? 2 : 1;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.mouth = 1;
            this.shake = time < 0.6 ? 1 : 0;
            if (time >= 0.6 + fired * 0.4 && fired < volleys) {
              this.spread(g, 5 + t, 0.24, 72, 'ember');
              sfx('enemyShoot');
              fired++;
            }
            if (time >= 0.6 + volleys * 0.4) { this.mouth = 0; return true; }
            return false;
          },
        };
      },
      leap: (g) => this.jumpAttack(g, {
        rise: 0.5, track: 0.8, lock: 0.6, fall: 0.35, height: 130,
        onLand: () => {
          this.ring(g, 8 + t * 2 + (p2 ? 2 : 0), 62, Math.random() * TAU, 'ember');
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            addCreep(g, this.x + Math.cos(a) * 26, this.y + Math.sin(a) * 18, 'fire');
          }
        },
      }),
      kindle: (g) => {
        let time = 0;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.shake = 1;
            if (Math.random() < dt * 40) g.particles.spawn(this.x + (Math.random() - 0.5) * 30, this.y - 24, { z: 20, vz: 60, life: 0.5, color: '#ffd25a', size: 2 });
            if (time < 0.8) return false;
            for (const side of [-1, 1]) {
              const spot = g.room.findFreeSpot(this.x + side * 30, this.y + 10);
              g.spawnEnemy('cinderling', spot.x, spot.y, { delay: 0.2 });
            }
            sfx('crackle');
            return true;
          },
        };
      },
      eruption: (g) => {
        let time = 0, n = 0;
        const count = 6 + t;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.shake = 2;
            while (n < count && time >= 0.5 + n * 0.12) {
              const p = g.player, a = Math.random() * TAU, r = n % 2 ? 0 : 20 + Math.random() * 50;
              const tx = Math.max(g.room.x0 + 10, Math.min(g.room.R - 10, p.x + Math.cos(a) * r));
              const ty = Math.max(g.room.y0 + 10, Math.min(g.room.B - 10, p.y + Math.sin(a) * r));
              this.lob(g, tx, ty, { flight: 1.1, burst: 4, speed: 52, style: 'ember', from: { x: this.x, y: this.y - 30 } });
              n++;
            }
            return n >= count && time >= 0.5 + count * 0.12 + 0.3;
          },
        };
      },
    };
  }
}
