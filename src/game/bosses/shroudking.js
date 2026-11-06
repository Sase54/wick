// THE SHROUDED KING (chapter 3, fits The Wax Tombs): a mummified king in waxed linen, a dented
// crown, trailing wrappings. Every attack has a tell:
//   lash    its wrappings rise and three lines show (0.8 s), then bandages whip out along them
//           (fast lines of shots)
//   raise   lifts its arms and the floor cracks: two shroudlings climb out
//   curse   its crown glows violet (0.7 s), a ring of violet shots, then a second one turned
//           half a step
//   unwind  (phase 2) spins in place, unwinding: a two-armed spiral of shots for 2 s
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const WRAP = ['#4a4236', '#6a604e', '#8a7e66', '#aa9e82', '#c8bea0', '#e4dcc0'];
const GOLD = ['#5a3e10', '#8a6a1c', '#b8902c', '#e0c060', '#fff0a0'];

function makeFrame(pose, f) {
  const W = 48, H = 54, cx = 24;
  const g = new PixelGrid(W, H);
  // trailing wrappings on the floor
  for (let i = 0; i < 5; i++) g.line(cx - 10 + i * 5, 44, cx - 14 + i * 7 + (f % 2) * 2, 52, WRAP[1 + (i % 2)]);
  // robe-like body
  g.poly([[cx - 9, 16], [cx + 9, 16], [cx + 14, 48], [cx - 14, 48]], (x, y) => ramp(WRAP, 0.8 - Math.abs(x - cx) / 30 - (y - 16) / 70, x, y));
  for (let y = 18; y < 47; y += 4) g.line(cx - 12 + (y % 8 ? 1 : 0), y, cx + 12, y + 2, WRAP[1]);
  // a violet sash
  g.line(cx - 10, 22, cx + 10, 34, '#4a2270'); g.line(cx - 10, 23, cx + 10, 35, '#7a44b0');
  // arms
  const up = pose === 'raise' || pose === 'wind';
  for (const s of [-1, 1]) {
    g.line(cx + s * 9, 20, cx + s * 16, up ? 6 : 34, WRAP[2]);
    g.line(cx + s * 10, 21, cx + s * 17, up ? 7 : 35, WRAP[3]);
    g.ellipse(cx + s * 16, up ? 5 : 35, 2.5, 2.5, WRAP[4]);
  }
  // head
  g.ellipse(cx, 11, 7, 8, (nx, ny, x, y) => ramp(WRAP, light(nx, ny) + 0.1, x, y));
  for (let y = 5; y < 18; y += 3) g.line(cx - 7, y, cx + 6, y + 1, WRAP[2]);
  // crown
  const glow = pose === 'curse';
  g.rect(cx - 7, 2, 15, 3, GOLD[2]);
  for (const x of [-6, -2, 2, 6]) g.rect(cx + x, 0, 1, 2, GOLD[3]);
  g.set(cx, 3, glow ? '#ecdcff' : '#7a44b0');
  // eyes
  const e = glow ? '#ecdcff' : pose === 'wind' ? (f % 2 ? '#ff4a2a' : '#ffd25a') : '#b48ae8';
  g.rect(cx - 4, 10, 2, 2, e); g.rect(cx + 3, 10, 2, 2, e);
  return g.outline('#0a080a').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    idle: [0, 1].map((f) => makeFrame('idle', f)),
    wind: [0, 1].map((f) => makeFrame('wind', f)),
    raise: [0, 1].map((f) => makeFrame('raise', f)),
    curse: [0, 1].map((f) => makeFrame('curse', f)),
  };
  return ART;
}

export class ShroudKingBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#aa9e82', '#e4dcc0', '#7a44b0', '#4a4236'];
    this.def.glowColor = 'rgba(170,110,255,0.5)';
    this.pose = null;
  }

  frames() { return art()[this.pose || 'idle']; }

  canUse(name, g) { return name !== 'raise' || g.enemies.length < 3; }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      lash: (g) => {
        let base = 0;
        const lines = p2 ? [-0.5, -0.25, 0, 0.25, 0.5] : [-0.35, 0, 0.35];
        return this.simple(g, {
          wind: 0.8, after: 0.5, pose: 'wind', sound: 'hiss',
          onWind: (dt) => {
            const [dx, dy] = this.aimAt(g);
            base = Math.atan2(dy, dx);
            for (const off of lines) this.sparkLine(g, Math.cos(base + off), Math.sin(base + off), dt / lines.length * 2, 150);
          },
          fire: () => {
            sfx('swing');
            for (const off of lines) for (let i = 0; i < 3 + Math.min(1, t); i++) g.enemyShoot(this, base + off, 120 - i * 18, 'bone');
          },
        });
      },
      raise: (g) => this.simple(g, {
        wind: 0.9, after: 0.4, pose: 'raise', sound: 'rumble', shake: 2,
        fire: () => {
          for (const s of [-1, 1]) {
            const spot = g.room.findFreeSpot(this.x + s * 46, this.y + 20);
            g.spawnEnemy('shroudling', spot.x, spot.y, { delay: 0.3 });
            g.particles.burst(spot.x, spot.y, 10, { colors: ['#4a4652', '#2a2430', '#aa9e82'], speed: 50, z: 2, vz: 60 });
          }
        },
      }),
      curse: (g) => {
        let second = false;
        const n = 12 + t * 2, a0 = Math.random() * TAU;
        const s = this.simple(g, {
          wind: 0.7, after: 0.6, pose: 'curse', sound: 'chime',
          fire: () => { this.ring(g, n, 58, a0, 'violet'); sfx('whoosh'); },
        });
        let time = 0;
        return {
          update: (dt) => {
            time += dt;
            const done = s.update(dt);
            if (!second && time >= 1.05) { second = true; this.ring(g, n, 58, a0 + Math.PI / n, 'violet'); }
            return done;
          },
        };
      },
      unwind: (g) => {
        let time = 0, shotT = 0, a = Math.random() * TAU;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.6) { this.pose = 'wind'; this.shake = 2; if (time - dt <= 0) sfx('hiss'); return false; }
            this.pose = 'raise';
            a += dt * 2.6;
            shotT -= dt;
            if (shotT <= 0) {
              shotT = 0.11;
              for (const off of [0, Math.PI]) g.enemyShoot(this, a + off, 70, 'bone');
            }
            if (time >= 2.6) { this.pose = null; return true; }
            return false;
          },
        };
      },
    };
  }
}
