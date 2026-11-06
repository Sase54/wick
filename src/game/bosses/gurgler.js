// THE GURGLER (chapter 1): the cellar's main drain grew teeth.
// It never moves. It sucks you toward its mouth, spits gobs of sludge, and blows you back out.
// Tells: its mouth stretches into an O before inhaling; walk away and you'll be fine.
import { PixelGrid, ramp } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { moveCircle } from '../collision.js';
import { Boss } from './base.js';

const IRON = ['#141418', '#24242a', '#36363e', '#4a4a54', '#62626c'];

function makeFrame(mouth) {
  // mouth: 0 closed (grate), 1 open, 2 inhaling (round O)
  const W = 54, H = 40, cx = 27, cy = 22;
  const g = new PixelGrid(W, H);
  // the iron rim, seen from above at an angle
  g.ellipse(cx, cy, 24, 16, (nx, ny, x, y) => ramp(IRON, 0.6 - nx * 0.25 - ny * 0.35, x, y));
  // fleshy lips
  g.ellipse(cx, cy, 18, 11.5, (nx, ny, x, y) => ramp(['#4a1a1e', '#7a2a2e', '#a04048', '#c06a70'], 0.7 - ny * 0.4, x, y));
  if (mouth === 0) {
    // closed: a grate of iron bars over a dark gullet
    g.ellipse(cx, cy, 14, 8, '#0b0505');
    for (let x = cx - 12; x <= cx + 12; x += 4) g.line(x, cy - 7, x, cy + 7, IRON[3]);
  } else {
    const rx = mouth === 2 ? 10 : 15, ry = mouth === 2 ? 9 : 8;
    g.ellipse(cx, cy + 1, rx, ry, '#120404');
    g.ellipse(cx, cy + 3, rx - 4, Math.max(2, ry - 5), '#3a0a0e');
    // teeth around the edge
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.set(cx + Math.cos(a) * (rx - 1), cy + 1 + Math.sin(a) * (ry - 1), '#e8e0c8');
    }
    if (mouth === 1) g.ellipse(cx + 3, cy + 5, 5, 2, '#c06a70'); // tongue
  }
  // a few rivets
  for (const [x, y] of [[cx - 21, cy], [cx + 21, cy], [cx, cy - 14], [cx - 15, cy - 10], [cx + 15, cy - 10]]) g.set(x, y, IRON[4]);
  return g.outline('#0b0807').toCanvas();
}

let ART = null;
function art() {
  if (!ART) ART = { closed: [makeFrame(0)], open: [makeFrame(1)], inhale: [makeFrame(2)] };
  return ART;
}

export class GurglerBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#4a4a54', '#a04048', '#c06a70', '#36363e'];
    this.def.glowColor = 'rgba(160,200,120,0.3)';
    this.mouth = 0;
  }

  frames() { return this.mouth === 2 ? art().inhale : this.mouth === 1 ? art().open : art().closed; }

  ambient(dt, g) {
    if (Math.random() < dt * 4) {
      g.particles.spawn(this.x + (Math.random() - 0.5) * 20, this.y - 2, { z: 2, vz: 25, gravity: 80, life: 0.5, color: '#5a8a34' });
    }
  }

  attacks() {
    const p2 = this.phase >= 2;
    const t = this.tier;
    return {
      inhale: (g) => {
        let time = 0, fired = false;
        const dur = 2.2 + t * 0.3, pull = p2 ? 62 : 52;
        return {
          update: (dt) => {
            time += dt;
            this.mouth = time < 0.5 ? 1 : 2;
            if (time < 0.5) return false;
            const p = g.player;
            if (time < dur && !p.dead) {
              // pull Wick (slower than he can walk, so walking away escapes)
              const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
              moveCircle(p, (dx / d) * pull * dt, (dy / d) * pull * dt, g.room, p.flying ? 'fly' : 'walk');
              // air rushing in
              if (Math.random() < dt * 30) {
                const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 60;
                g.particles.spawn(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r * 0.7, {
                  z: 4, vx: -Math.cos(a) * 140, vy: -Math.sin(a) * 100, life: 0.5, color: '#8a8580',
                });
              }
            }
            if (!fired && time >= dur) {
              fired = true;
              this.mouth = 1;
              this.spread(g, 3 + t, 0.3, 70);
              sfx('enemyShoot');
            }
            if (time >= dur + 0.5) { this.mouth = 0; return true; }
            return false;
          },
        };
      },
      spit: (g) => {
        let time = 0;
        return {
          update: (dt) => {
            time += dt;
            this.mouth = 1;
            if (time < 0.55) return false;
            const p = g.player, n = 3 + t + (p2 ? 1 : 0);
            for (let i = 0; i < n; i++) {
              const tx = p.x + (i ? (Math.random() - 0.5) * 80 : 0), ty = p.y + (i ? (Math.random() - 0.5) * 60 : 0);
              this.lob(g, tx, ty, { flight: 0.9 + i * 0.12, burst: 4, speed: 50, style: 'green' });
            }
            sfx('lob');
            this.mouth = 0;
            return true;
          },
        };
      },
      exhale: (g) => {
        let time = 0, fired = false;
        return {
          update: (dt) => {
            time += dt;
            this.mouth = 1;
            this.shake = time < 0.5 ? 2 : 0;
            if (!fired && time >= 0.5) {
              fired = true;
              this.ring(g, 8 + t * 2 + (p2 ? 2 : 0), 60);
              g.particles.burst(this.x, this.y, 20, { colors: ['#8a8580', '#c4bfb6', '#5a8a34'], speed: 130, z: 6, drag: 3 });
              sfx('steam');
            }
            if (fired && time < 0.9) {
              // a gust that pushes Wick away
              const p = g.player, dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
              if (d < 120) moveCircle(p, (dx / d) * 90 * dt, (dy / d) * 90 * dt, g.room, p.flying ? 'fly' : 'walk');
            }
            if (time >= 1.1) { this.mouth = 0; return true; }
            return false;
          },
        };
      },
    };
  }
}
