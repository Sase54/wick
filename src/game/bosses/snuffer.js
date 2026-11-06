// THE SNUFFER: a hooded giant who carries a brass candle snuffer on a pole.
// It exists to put out flames like Wick's.
//   Phase 1: leaps up and slams down, walls of grasping shadow-shots, rains hot wax, rings.
//   Phase 2: its robe smoulders, it summons husks.
//   Phase 3: eyes burn red, spirals, and the room goes dark around Wick.
import { PixelGrid, ramp } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { ROOM_X, ROOM_Y, ROOM_R, ROOM_B } from '../constants.js';
import { Boss, TAU } from './base.js';

const ROBE = ['#120a16', '#1e1224', '#2a1a32', '#3a2442', '#4a3054'];
const BRASS = ['#5a4010', '#8a6a20', '#b08a30', '#d8b048', '#fff0a0'];
const BONE = '#c8c0b0';

function makeFrame(flutter, phase) {
  const W = 66, H = 78, cx = 30;
  const g = new PixelGrid(W, H);
  // robe: a widening trapezoid with a ragged hem
  const top = 26, bottom = 74;
  const pts = [[cx - 12, top], [cx + 12, top], [cx + 25, bottom - 4], [cx - 25, bottom - 4]];
  g.poly(pts, (x, y) => ramp(ROBE, 0.7 - Math.abs(x - cx) / 40 - (y - top) / 160 + ((x + Math.floor(y / 6)) % 7 === 0 ? -0.25 : 0), x, y));
  for (let x = cx - 25; x <= cx + 25; x++) {
    const len = 2 + Math.floor((Math.sin(x * 1.7 + flutter * 2.1) * 0.5 + 0.5) * 5);
    for (let k = 0; k < len; k++) g.set(x, bottom - 4 + k, ROBE[1]);
  }
  if (phase >= 3) for (const [x, y] of [[cx - 14, 66], [cx + 9, 60], [cx - 4, 70], [cx + 18, 68]]) g.ellipse(x, y, 2.5, 3, null);
  // sleeves and bony hands
  for (const side of [-1, 1]) {
    g.poly([[cx + side * 10, top + 4], [cx + side * 22, top + 14], [cx + side * 24, top + 22], [cx + side * 13, top + 16]], ROBE[2]);
    const hx = cx + side * 25, hy = top + 23;
    g.ellipse(hx, hy, 3, 2.5, BONE);
    for (let f = -1; f <= 1; f++) g.line(hx + f * 2, hy + 2, hx + f * 3, hy + 5, BONE);
  }
  // hood with a dark face
  g.ellipse(cx, 20, 13, 13, (nx, ny, x, y) => ramp(ROBE, 0.75 - nx * 0.3 - ny * 0.3, x, y));
  g.ellipse(cx, 23, 8, 8, '#06030a');
  const eye = phase >= 3 ? '#ff3a2a' : '#ffd25a';
  g.rect(cx - 5, 22, 3, 1, eye);
  g.rect(cx + 3, 22, 3, 1, eye);
  if (phase >= 2) { g.set(cx - 4, 21, eye); g.set(cx + 4, 21, eye); }
  // the snuffer: a long brass pole with a bell-shaped cone at the top
  const px = cx + 27;
  g.line(px, top + 22, px + 3, 8, BRASS[1]);
  g.line(px + 1, top + 22, px + 4, 8, BRASS[3]);
  g.poly([[px - 3, 10], [px + 10, 10], [px + 7, 1], [px, 1]], (x, y) => ramp(BRASS, 0.9 - (x - px) / 14 - (10 - y) / 30, x, y));
  g.rect(px - 3, 10, 14, 2, BRASS[0]);
  // smouldering embers on the robe
  if (phase >= 2) for (const [x, y] of [[cx - 9, 44], [cx + 7, 52], [cx - 15, 60], [cx + 14, 64], [cx, 36]]) { g.set(x, y, '#f08a24'); g.set(x + 1, y, '#ffd25a'); }
  return g.outline('#06030a').toCanvas();
}

let ART = null;
function art() {
  if (!ART) {
    ART = {};
    for (const p of [1, 2, 3]) ART[p] = [0, 1, 2, 3].map((f) => makeFrame(f, p));
  }
  return ART;
}

export class SnufferBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#2a1a32', '#4a3054', '#b08a30', '#c8c0b0'];
    this.def.glowColor = 'rgba(160,80,220,0.45)';
    this.def.alwaysGlow = true;
  }

  frames() { return art()[Math.min(3, this.phase)]; }

  canUse(name, g) {
    return name !== 'summon' || g.enemies.length < 3;
  }

  idle(dt, g) {
    // hovers, keeping a little distance from Wick
    const p = g.player, s = this.def.speed[this.phase - 1];
    const dx = p.x - this.x, dy = p.y - 30 - this.y, d = Math.hypot(dx, dy) || 1;
    const away = d < 60 ? -1 : 1;
    this.vx = (dx / d) * s * away + Math.sin(this.t * 1.3) * 12;
    this.vy = (dy / d) * s * away;
  }

  ambient(dt, g) {
    if (Math.random() < dt * (6 + this.phase * 4)) {
      g.particles.spawn(this.x + (Math.random() - 0.5) * 40, this.y + 6, {
        z: 6, vz: 18, gravity: -8, life: 1.3, size: 2, color: Math.random() < 0.6 ? '#1e1224' : this.phase >= 2 ? '#f08a24' : '#3a2442',
      });
    }
  }

  attacks() {
    const ph = this.phase;
    return {
      slam: (g) => this.jumpAttack(g, {
        rise: 0.5, track: ph >= 3 ? 0.55 : 0.8, lock: ph >= 3 ? 0.4 : 0.5, fall: 0.3, height: 170,
        onLand: () => {
          this.ring(g, ph >= 2 ? 20 : 16, 70);
          if (ph >= 3) this.ring(g, 12, 45, Math.PI / 12);
        },
      }),
      hands: (g) => {
        let t = 0, waves = 0;
        const total = ph >= 2 ? 3 : 2;
        return {
          update: (dt) => {
            t += dt;
            this.vx *= 0.9; this.vy *= 0.9;
            if (t >= 0.5 + waves * 0.9 && waves < total) {
              const fromLeft = waves % 2 === 0 ? Math.random() < 0.5 : !this.lastSide;
              this.lastSide = fromLeft;
              const rows = 8, gap = 1 + Math.floor(Math.random() * (rows - 2));
              const x = fromLeft ? ROOM_X + 4 : ROOM_R - 4;
              for (let i = 0; i < rows; i++) {
                if (i === gap || i === gap + 1) continue;
                const y = ROOM_Y + 10 + i * ((ROOM_B - ROOM_Y - 20) / (rows - 1));
                g.projectiles.spawn({ x, y, z: 6, vx: fromLeft ? 72 : -72, vy: 0, r: 4, damage: 1, team: 'enemy', range: 340, style: 'violet', source: this.name });
                g.particles.burst(x, y, 3, { colors: ['#4a3054', '#c8c0b0'], speed: 30, z: 6 });
              }
              sfx('steam');
              waves++;
            }
            return waves >= total && t >= 0.5 + total * 0.9;
          },
        };
      },
      waxRain: (g) => {
        let t = 0, dropped = 0;
        const n = ph >= 2 ? 12 : 9;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            this.shake = 1;
            while (dropped < n && t >= 0.3 + dropped * 0.1) {
              const near = dropped % 3 === 0;
              const tx = near ? g.player.x + (Math.random() - 0.5) * 30 : ROOM_X + 16 + Math.random() * (ROOM_R - ROOM_X - 32);
              const ty = near ? g.player.y + (Math.random() - 0.5) * 24 : ROOM_Y + 16 + Math.random() * (ROOM_B - ROOM_Y - 32);
              this.lob(g, Math.max(ROOM_X + 8, Math.min(ROOM_R - 8, tx)), Math.max(ROOM_Y + 8, Math.min(ROOM_B - 8, ty)), {
                flight: 1.1, burst: 4, speed: 55, style: 'ember', from: { x: tx, y: ROOM_Y - 40 },
              });
              dropped++;
            }
            return dropped >= n && t >= 0.3 + n * 0.1 + 0.3;
          },
        };
      },
      rings: (g) => {
        let t = 0, n = 0;
        const count = ph >= 2 ? 3 : 2;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            if (t >= 0.45 + n * 0.45 && n < count) {
              this.ring(g, 18, 65, n * 0.17);
              sfx('enemyShoot');
              n++;
            }
            return n >= count && t >= 0.45 + count * 0.45;
          },
        };
      },
      summon: (g) => {
        let t = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            this.shake = 2;
            if (t < 0.7) return false;
            for (let i = 0; i < 2; i++) {
              const a = (i / 2) * TAU + Math.random();
              g.spawnEnemy(ph >= 3 ? 'huskRotten' : 'husk', this.x + Math.cos(a) * 34, this.y + 10 + Math.sin(a) * 20, { delay: 0.4 });
            }
            g.particles.burst(this.x, this.y + 10, 24, { colors: this.def.debris, speed: 80, z: 6, vz: 50 });
            return true;
          },
        };
      },
      spiral: (g) => {
        let t = 0, fire = 0, a = Math.random() * TAU;
        return {
          update: (dt) => {
            t += dt;
            fire -= dt;
            this.vx = this.vy = 0;
            if (fire <= 0) {
              fire = 0.11;
              a += 0.3;
              for (let k = 0; k < 4; k++) g.enemyShoot(this, a + (k * TAU) / 4, 66);
            }
            return t >= 3;
          },
        };
      },
    };
  }
}
