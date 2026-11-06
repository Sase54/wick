// THE SOGGY LUMP (chapter 1): a waterlogged heap of grey flesh with one droopy eye.
// Hops toward you, leaps up and slams down into a ring of shots, spits a fan of gunk.
// Tells: its shadow grows where it will land; its mouth gapes before it spits.
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { ROOM_X, ROOM_Y, ROOM_R, ROOM_B } from '../constants.js';
import { Boss } from './base.js';

const FLESH = ['#2a1e1e', '#4a3434', '#6a4a46', '#8a625a', '#a8807a', '#c8a098'];

function makeFrame(squash, mouthOpen) {
  const W = 46, H = 38, cx = 23;
  const g = new PixelGrid(W, H);
  const ry = 13 - squash, rx = 20 + squash;
  const cy = H - 2 - ry;
  g.ellipse(cx, cy, rx, ry, (nx, ny, x, y) => ramp(FLESH, light(nx, ny), x, y));
  // saggy bottom folds
  g.ellipse(cx - 9, cy + ry - 3, 8, 3, FLESH[1]);
  g.ellipse(cx + 10, cy + ry - 3, 7, 3, FLESH[1]);
  // the eye, with a heavy drooping lid
  const ey = cy - 4;
  g.ellipse(cx, ey, 6.5, 5.5, '#e8e0c8');
  g.ellipse(cx + 1, ey + 1, 3.5, 3.5, '#8a1c18');
  g.ellipse(cx + 1, ey + 1, 1.8, 1.8, '#0b0807');
  g.set(cx - 1, ey - 1, '#ffffff');
  g.ellipse(cx, ey - 4, 7.5, 3.2, FLESH[3]);
  g.line(cx - 7, ey - 2, cx + 7, ey - 2, FLESH[1]);
  // mouth
  const my = cy + 6;
  if (mouthOpen) {
    g.ellipse(cx, my, 9, 4.5, '#2a0808');
    g.ellipse(cx, my + 1, 6, 2.5, '#6a1a18');
    for (let x = cx - 7; x <= cx + 7; x += 3) g.set(x, my - 3, '#e8e0c8');
  } else {
    g.line(cx - 9, my, cx + 9, my, '#2a0808');
    g.line(cx - 9, my - 1, cx - 7, my, '#2a0808');
    g.line(cx + 7, my, cx + 9, my - 1, '#2a0808');
  }
  // sweat / damp drips
  for (const [x, y] of [[cx - 15, cy - 3], [cx + 16, cy], [cx - 11, cy - 8]]) {
    g.set(x, y, '#9ab0c8');
    g.set(x, y + 1, '#6a88a8');
  }
  return g.outline('#0b0807').toCanvas();
}

let ART = null;
function art() {
  if (!ART) ART = { idle: [makeFrame(0, false), makeFrame(1, false)], open: [makeFrame(-1, true)] };
  return ART;
}

export class LumpBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#6a4a46', '#a8807a', '#4a3434', '#9ab0c8'];
    this.def.glowColor = 'rgba(200,120,110,0.4)';
    this.mouth = 0;
  }

  frames() { return this.mouth > 0 ? art().open : art().idle; }

  attacks() {
    const p2 = this.phase >= 2;
    const t = this.tier;
    return {
      // Three short hops toward Wick. Each hop travels through the air (no teleporting),
      // its landing spot is marked from the start, and it rests a moment between hops.
      hops: (g) => {
        let left = 3, cur = null, rest = 0.35;
        const next = () => {
          const p = g.player, dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1, step = Math.min(d, 40);
          return this.hopAttack(g, {
            to: {
              x: Math.max(ROOM_X + 20, Math.min(ROOM_R - 20, this.x + (dx / d) * step)),
              y: Math.max(ROOM_Y + 18, Math.min(ROOM_B - 14, this.y + (dy / d) * step)),
            },
            time: 0.5, height: 24,
            onLand: () => { if (p2 || t >= 2) this.ring(g, 4, 55, Math.PI / 4); },
          });
        };
        return {
          marker: () => cur?.marker(),
          update: (dt) => {
            if (!cur) {
              rest -= dt;          // a little wobble before each hop
              this.shake = 1;
              if (rest <= 0) cur = next();
              return false;
            }
            if (cur.update(dt)) {
              left--;
              if (left <= 0) return true;
              cur = null;
              rest = 0.3;
            }
            return false;
          },
        };
      },
      // The big one: leaps up, its shadow follows Wick, then stops and flashes red
      // for over half a second before it comes down.
      slam: (g) => this.jumpAttack(g, {
        rise: 0.45, track: 0.8, lock: 0.6, fall: 0.35, height: 120,
        onLand: () => this.ring(g, 8 + t * 2 + (p2 ? 2 : 0), 60),
      }),
      spit: (g) => {
        let time = 0, fired = 0;
        const volleys = p2 ? 2 : 1;
        return {
          update: (dt) => {
            time += dt;
            this.mouth = 1;
            this.shake = time < 0.6 ? 1 : 0;
            if (time >= 0.6 + fired * 0.45 && fired < volleys) {
              this.spread(g, 5 + t, 0.22, 68);
              sfx('enemyShoot');
              fired++;
            }
            if (time >= 0.6 + volleys * 0.45) { this.mouth = 0; return true; }
            return false;
          },
        };
      },
    };
  }
}
