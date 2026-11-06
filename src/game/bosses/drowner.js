// THE BLOATED DROWNER (chapter 2, fits The Sunken Caves): a huge swollen body that has been in
// the water far too long, still wearing a rotten rope around its waist. Every attack has a tell:
//   gush    its cheeks bulge (the line shows, 0.7 s), then it sprays a jet of water that sweeps
//           across (two jets in phase 2)
//   burst   it swells up bigger and bigger (0.8 s), then bursts a ring of bile and leaves
//           poison puddles around itself
//   retch   doubles over gagging, coughs up leeches
//   flop    the big jump: belly-flops down with a ring of water
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';
import { addCreep } from '../hazards.js';

const SKIN = ['#2a3a30', '#3e5446', '#5a7262', '#7a927e', '#9ab09a', '#bcd0b8'];
const ROPE = ['#3a2a1a', '#5a4428', '#7a6038'];

function makeFrame(pose, f) {
  const W = 58, H = 56, cx = 29;
  const g = new PixelGrid(W, H);
  const swell = pose === 'puff' ? 4 : 0;
  // stubby legs
  for (const s of [-1, 1]) g.ellipse(cx + s * 10, 49, 6, 4, (nx, ny, x, y) => ramp(SKIN, light(nx, ny) - 0.2, x, y));
  // the bloated belly, mottled
  g.ellipse(cx, 34, 20 + swell, 16 + swell * 0.7, (nx, ny, x, y) => {
    const blot = ((x * 13 + y * 7) % 17 === 0) ? -0.35 : 0;
    return ramp(SKIN, light(nx, ny) + blot, x, y);
  });
  // veins
  for (const [x0, y0, x1, y1] of [[-10, 28, -4, 38], [8, 26, 12, 36], [-2, 40, 4, 46]]) g.line(cx + x0, y0, cx + x1, y1, '#4a3a5a');
  // rope belt
  for (let x = -18 - swell; x <= 18 + swell; x++) g.set(cx + x, 38 + Math.round(Math.abs(x) / 9), ROPE[(x + 40) % 3]);
  // arms hanging
  const armUp = pose === 'retch' ? -6 : 0;
  for (const s of [-1, 1]) {
    g.ellipse(cx + s * (22 + swell), 34 + armUp, 5, 8, (nx, ny, x, y) => ramp(SKIN, light(nx, ny) - 0.1, x, y));
    g.ellipse(cx + s * (23 + swell), 42 + armUp, 3.5, 3, SKIN[3]);
  }
  // the head, sunk into the shoulders
  const hy = pose === 'retch' ? 18 : 14;
  g.ellipse(cx, hy, 11, 10, (nx, ny, x, y) => ramp(SKIN, light(nx, ny) + 0.1, x, y));
  // a few strands of wet hair
  for (const x of [-6, -3, 1, 5]) g.line(cx + x, hy - 9, cx + x - 1, hy - 2 + (x % 2), '#1a2420');
  // milky eyes
  for (const s of [-1, 1]) {
    g.ellipse(cx + s * 4, hy - 1, 2.4, 2, '#e8ecd8');
    g.set(cx + s * 4, hy - 1, pose === 'idle' ? '#7a8a7a' : '#ff4a2a');
  }
  // cheeks and mouth
  if (pose === 'cheeks') {
    for (const s of [-1, 1]) g.ellipse(cx + s * 8, hy + 4, 4, 3.5, SKIN[4]);
    g.ellipse(cx, hy + 5, 2, 1.5, '#1a1410');
  } else if (pose === 'retch' || pose === 'spray') {
    g.ellipse(cx, hy + 5, 4, 3, '#1a1410');
    g.rect(cx - 2, hy + 4, 5, 1, '#4a7a5a');
  } else {
    g.rect(cx - 3, hy + 5 + (f % 2), 7, 1, '#1a1410');
  }
  // drips
  for (const [x, y] of [[-14, 44], [12, 46], [3, 50]]) g.set(cx + x, y + (f % 2), '#8ad0f0');
  return g.outline('#0a0c0a').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    idle: [0, 1].map((f) => makeFrame('idle', f)),
    cheeks: [makeFrame('cheeks', 0)],
    spray: [makeFrame('spray', 0)],
    puff: [0, 1].map((f) => makeFrame('puff', f)),
    retch: [0, 1].map((f) => makeFrame('retch', f)),
  };
  return ART;
}

export class DrownerBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#7a927e', '#5a7262', '#8ad0f0', '#2a3a30'];
    this.def.glowColor = 'rgba(120,220,160,0.4)';
    this.pose = null;
  }

  frames() { return art()[this.pose || 'idle']; }

  canUse(name, g) { return name !== 'retch' || g.enemies.length < 4; }

  ambient(dt, g) {
    if (Math.random() < dt * 4) g.particles.spawn(this.x + (Math.random() - 0.5) * 30, this.y + 8, { z: 2, vz: -10, life: 0.5, color: '#8ad0f0', size: 1 });
  }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      gush: (g) => {
        let time = 0, n = 0, base = 0;
        const jets = p2 ? [-1, 1] : [1];
        const shots = 16 + t * 2;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.7) {
              this.pose = 'cheeks';
              this.shake = 1;
              base = Math.atan2(g.player.y - this.y, g.player.x - this.x);
              if (time - dt <= 0) sfx('gurgle');
              if (Math.random() < dt * 30) {
                const k = 20 + Math.random() * 140;
                g.particles.spawn(this.x + Math.cos(base) * k, this.y + Math.sin(base) * k, { z: 1, vz: 10, life: 0.3, color: '#ff4a2a', size: 1 });
              }
              return false;
            }
            this.pose = 'spray';
            // the jet sweeps from one side of the aimed line to the other
            while (n < shots && time >= 0.7 + n * 0.055) {
              const k = n / (shots - 1);
              for (const s of jets) this.spread0(g, base + s * (k - 0.5) * 1.2, 92);
              n++;
            }
            if (time >= 0.7 + shots * 0.055 + 0.25) { this.pose = null; return true; }
            return false;
          },
        };
      },
      burst: (g) => {
        let time = 0, done = false;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.8) { this.pose = 'puff'; this.shake = 1 + time * 3; if (time - dt <= 0) sfx('inhale'); return false; }
            if (!done) {
              done = true;
              this.pose = null;
              sfx('squish');
              g.shake(5);
              this.ring(g, 12 + t * 2, 66, Math.random() * TAU, 'green');
              if (p2) this.ring(g, 10 + t, 48, Math.random() * TAU, 'green');
              for (let i = 0; i < 6; i++) {
                const a = (i / 6) * TAU;
                addCreep(g, this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 20, 'poison');
              }
            }
            return time >= 1.3;
          },
        };
      },
      retch: (g) => {
        let time = 0, done = false;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.pose = 'retch';
            this.shake = 1;
            if (time - dt <= 0) sfx('gurgle');
            if (!done && time >= 0.9) {
              done = true;
              sfx('squish');
              for (let i = 0; i < 3; i++) {
                const a = Math.PI / 2 + (i - 1) * 0.7;
                const e = g.spawnEnemy('leech', this.x + Math.cos(a) * 18, this.y + Math.sin(a) * 18, { delay: 0.1 });
                e.kx = Math.cos(a) * 120; e.ky = Math.sin(a) * 120;
              }
            }
            if (time >= 1.3) { this.pose = null; return true; }
            return false;
          },
        };
      },
      flop: (g) => this.jumpAttack(g, {
        rise: 0.5, track: 0.75, lock: 0.6, fall: 0.35, height: 110,
        onLand: () => {
          sfx('splashBig');
          this.ring(g, 10 + t * 2, 60, Math.random() * TAU, 'ice');
          g.particles.burst(this.x, this.y, 20, { colors: ['#4a8aa8', '#8ad0f0', '#d0f0ff'], speed: 90, z: 2, vz: 70 });
        },
      }),
    };
  }

  spread0(g, angle, speed) { g.enemyShoot(this, angle, speed, 'ice'); }
}
