// THE DOLL'S HEAD (chapter 1): a giant cracked porcelain doll head, one glass eye left.
// Rolls across the room in straight lines, cries tears in a cross, stares and spits.
// Tells: it rattles before rolling and only rolls straight along a row or column.
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss } from './base.js';

const PORCELAIN = ['#6a6460', '#9a948c', '#c8c0b4', '#e8e0d4', '#f8f4ec'];

function makeFrame(roll, crying) {
  const W = 42, H = 42, cx = 21, cy = 22;
  const g = new PixelGrid(W, H);
  g.ellipse(cx, cy, 17, 18, (nx, ny, x, y) => ramp(PORCELAIN, light(nx, ny) + 0.1, x, y));
  const fx = cx + roll * 3; // the face slides around as it rolls
  // a few curls of hair on top
  for (let i = -3; i <= 3; i++) {
    const hx = cx + i * 4 + roll * 2;
    g.line(hx, 5, hx + (i % 2 ? 2 : -2), 10, '#3a2416');
    g.line(hx + 1, 4, hx + (i % 2 ? 3 : -1), 9, '#5a3a22');
  }
  // the glass eye (left) and the empty socket (right)
  g.ellipse(fx - 6, cy - 2, 4, 3.5, '#f8f4ec');
  g.ellipse(fx - 6, cy - 2, 2.5, 2.5, '#3a6ad0');
  g.ellipse(fx - 6, cy - 2, 1.2, 1.2, '#0b0807');
  g.set(fx - 7, cy - 4, '#ffffff');
  for (let i = -4; i <= 3; i += 2) g.set(fx - 6 + i, cy - 6, '#2a1a10');
  g.ellipse(fx + 6, cy - 2, 3.5, 3.5, '#0b0807');
  // rosy cheeks and small red lips
  g.ellipse(fx - 10, cy + 4, 2.5, 1.5, '#e090a0');
  g.ellipse(fx + 10, cy + 4, 2.5, 1.5, '#e090a0');
  g.ellipse(fx, cy + 7, 3, 1.6, '#a01c28');
  // cracks
  g.line(cx + 4, cy - 15, cx + 9, cy - 6, '#5a5450');
  g.line(cx + 9, cy - 6, cx + 6, cy + 2, '#5a5450');
  g.line(cx - 12, cy + 8, cx - 6, cy + 14, '#5a5450');
  // tears streaming from the socket
  if (crying) {
    g.line(fx + 6, cy + 1, fx + 7, cy + 10, '#8ad0f0');
    g.line(fx + 5, cy + 1, fx + 4, cy + 8, '#8ad0f0');
  }
  return g.outline('#0b0807').toCanvas();
}

let ART = null;
function art() {
  if (!ART) {
    ART = {
      idle: [makeFrame(0, false)],
      roll: [makeFrame(-1, false), makeFrame(0, false), makeFrame(1, false), makeFrame(0, false)],
      cry: [makeFrame(0, true)],
    };
  }
  return ART;
}

export class DollHeadBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#c8c0b4', '#f8f4ec', '#9a948c', '#3a2416'];
    this.def.glowColor = 'rgba(200,220,255,0.35)';
    this.crying = 0;
  }

  frames() {
    if (this.crying > 0) return art().cry;
    if (this.vx || this.vy) return art().roll;
    return art().idle;
  }

  attacks() {
    const p2 = this.phase >= 2;
    const t = this.tier;
    const cry = (g, diagonal) => {
      for (let i = 0; i < 4; i++) g.enemyShoot(this, (i * Math.PI) / 2 + (diagonal ? Math.PI / 4 : 0), 60, 'ice');
    };
    return {
      roll: (g) => this.chargeAttack(g, {
        axis: true, telegraph: 0.5, speed: 165, stun: 0.5, times: p2 ? 2 : 1,
        onWall: () => { if (p2 || t >= 1) cry(g, false); },
      }),
      cry: (g) => {
        let time = 0, fired = 0;
        const volleys = 2 + (p2 ? 1 : 0);
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.crying = 1;
            if (time >= 0.5 + fired * 0.5 && fired < volleys) {
              cry(g, fired % 2 === 1);
              if (t >= 2) cry(g, fired % 2 === 0);
              sfx('enemyShoot');
              fired++;
            }
            if (fired >= volleys && time >= 0.7 + volleys * 0.5) { this.crying = 0; return true; }
            return false;
          },
        };
      },
      stare: (g) => {
        let time = 0, fired = 0;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.shake = time < 0.4 ? 1 : 0;
            if (time >= 0.4 + fired * 0.3 && fired < 3) {
              this.spread(g, 1 + (t >= 1 ? 2 : 0), 0.25, 85);
              sfx('enemyShoot');
              fired++;
            }
            return fired >= 3 && time >= 1.5;
          },
        };
      },
    };
  }
}
