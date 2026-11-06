// MOTHER MILDEW: a heaving mound of mold with too many eyes.
// Leaps onto you, spits spores, gives birth to blobs. Phase 2: rots purple and adds spore rings.
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const GREEN = ['#1e2a12', '#2f4018', '#45581f', '#5f7430', '#7f9446', '#a2b562'];
const ROT = ['#1e1222', '#2e1a30', '#46284a', '#5e3a5a', '#7a5470', '#9a7a8a'];

function makeFrame(squash, rotten, blink) {
  const W = 52, H = 38;
  const g = new PixelGrid(W, H);
  const cols = rotten ? ROT : GREEN;
  const rx = 23 + squash, ry = 15 - squash;
  const cx = 26, cy = 37 - ry - 1;
  // lumpy body: a big ellipse plus a few bulges on top
  const body = (nx, ny, x, y) => ramp(cols, light(nx, ny), x, y);
  g.ellipse(cx, cy, rx, ry, body);
  for (const [bx, by, br] of [[cx - 12, cy - 9, 8], [cx + 3, cy - 12, 9], [cx + 14, cy - 7, 7]]) {
    g.ellipse(bx, by - squash, br, br * 0.8, body);
  }
  // spots
  for (const [sx, sy] of [[cx - 16, cy - 2], [cx + 15, cy + 2], [cx - 4, cy - 14], [cx + 9, cy - 4]]) {
    g.ellipse(sx, sy - squash, 2, 1.5, cols[cols.length - 1]);
  }
  // eyes
  const eyes = [[cx - 13, cy - 7], [cx - 3, cy - 11], [cx + 8, cy - 9], [cx - 8, cy - 1], [cx + 4, cy - 2], [cx + 15, cy - 3]];
  for (const [ex, ey] of eyes) {
    const y = ey - squash;
    if (blink) { g.rect(ex - 2, y, 4, 1, '#0b0807'); continue; }
    g.ellipse(ex, y, 2.6, 2.6, '#e8e0c8');
    g.rect(ex - 1, y - 1, 2, 2, rotten ? '#c0262c' : '#120c0a');
    g.set(ex - 2, y - 2, '#ffffff');
  }
  // mouth with teeth
  const my = cy + 6 - squash;
  g.ellipse(cx, my, 9, 3.2, '#0b0807');
  for (let x = cx - 7; x <= cx + 7; x += 3) { g.set(x, my - 2, '#e8e0c8'); g.set(x + 1, my + 2, '#e8e0c8'); }
  return g.outline('#0b0807').toCanvas();
}

let ART = null;
function art() {
  if (!ART) {
    ART = {
      normal: [makeFrame(0, false, false), makeFrame(1, false, false), makeFrame(0, false, false), makeFrame(-1, false, true)],
      rotten: [makeFrame(0, true, false), makeFrame(1, true, false), makeFrame(0, true, false), makeFrame(-1, true, true)],
    };
  }
  return ART;
}

export class MildewBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#45581f', '#7f9446', '#2f4018', '#e8e0c8'];
    this.def.glowColor = 'rgba(140,200,80,0.5)';
  }

  frames() { return this.phase >= 2 ? art().rotten : art().normal; }

  canUse(name, g) {
    return name !== 'birth' || g.enemies.length < 4;
  }

  ambient(dt, g) {
    if (Math.random() < dt * 3) {
      g.particles.spawn(this.x + (Math.random() - 0.5) * 40, this.y - 10, {
        z: 10, vz: 10, gravity: -5, life: 1.2, color: this.phase >= 2 ? '#7a5470' : '#7f9446',
      });
    }
  }

  attacks() {
    const p2 = this.phase >= 2;
    return {
      leap: (g) => {
        let jumps = p2 ? 2 : 1, cur = null;
        const next = () => this.jumpAttack(g, {
          rise: 0.35, track: 0.5, lock: 0.45, fall: 0.3, height: 100,
          onLand: () => this.ring(g, p2 ? 14 : 10, 75),
        });
        cur = next();
        return {
          marker: () => cur.marker(),
          update: (dt) => {
            if (cur.update(dt)) {
              jumps--;
              if (jumps <= 0) return true;
              cur = next();
            }
            return false;
          },
        };
      },
      spores: (g) => {
        let t = 0, shots = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            if (t >= 0.4 + shots * 0.3 && shots < 3) {
              shots++;
              this.spread(g, p2 ? 7 : 5, 0.2, 85);
              sfx('enemyShoot');
              this.shake = 2;
            }
            return t >= 1.4;
          },
        };
      },
      birth: (g) => {
        let t = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            this.shake = 1;
            if (t < 0.6) return false;
            const n = p2 ? 3 : 2;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * TAU + Math.random();
              const e = g.spawnEnemy(p2 ? 'blobRotten' : 'blob', this.x + Math.cos(a) * 26, this.y + Math.sin(a) * 18, { delay: 0.2 });
              e.kx = Math.cos(a) * 90;
              e.ky = Math.sin(a) * 90;
            }
            g.particles.burst(this.x, this.y, 18, { colors: this.def.debris, speed: 80, z: 6, vz: 60 });
            sfx('enemyDeath');
            return true;
          },
        };
      },
      sporeRing: (g) => {
        let t = 0, fired = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            if (t >= 0.5 && fired === 0) { fired = 1; this.ring(g, 14, 55); }
            if (t >= 0.9 && fired === 1) { fired = 2; this.ring(g, 14, 70, Math.PI / 14); }
            return t >= 1.2;
          },
        };
      },
    };
  }
}
