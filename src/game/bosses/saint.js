// THE CANDLE SAINT (chapter 3, fits The Wax Tombs): a marble statue of a saint, weeping wax,
// with a halo of six violet candles that floats behind its head. It never walks. Every attack
// has a tell:
//   halo     the halo spins faster and faster (0.7 s), then each candle spits violet fire as it
//            turns: a spiral
//   vanish   it fades out; a ring of violet light shows on the floor where it'll appear (0.8 s);
//            it appears there with a ring of shots
//   weep     it bows its head, wax tears well up (0.7 s), then it weeps hot wax: blobs arc up and
//            land on marked spots, bursting
//   melt     (phase 2) it melts a little: three lines of burning wax run out from its feet
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';
import { addCreep } from '../hazards.js';

const MARBLE = ['#3e3a46', '#5a5664', '#7a7686', '#9c98a8', '#c0bccc', '#e6e2f0'];
const VIOLET = ['#2a1240', '#4a2270', '#7a44b0', '#b48ae8', '#ecdcff'];

function makeFrame(pose, f) {
  const W = 44, H = 56, cx = 22;
  const g = new PixelGrid(W, H);
  // plinth
  g.rect(cx - 12, 46, 24, 8, MARBLE[2]); g.rect(cx - 12, 46, 24, 2, MARBLE[4]); g.rect(cx - 12, 52, 24, 2, MARBLE[1]);
  // robed body
  g.poly([[cx - 8, 18], [cx + 8, 18], [cx + 11, 46], [cx - 11, 46]], (x, y) => ramp(MARBLE, 0.85 - Math.abs(x - cx) / 25 - (y - 18) / 80, x, y));
  for (const x of [-6, -2, 3, 7]) g.line(cx + x, 22, cx + x - 1, 45, MARBLE[1]);
  // hands pressed together in prayer, or opened
  if (pose === 'weep') { g.line(cx - 7, 24, cx - 3, 18, MARBLE[3]); g.line(cx + 7, 24, cx + 3, 18, MARBLE[3]); }
  else g.poly([[cx - 2, 24], [cx + 2, 24], [cx + 1, 31], [cx - 1, 31]], MARBLE[4]);
  // head (bowed when weeping)
  const hy = pose === 'weep' ? 14 : 11;
  g.ellipse(cx, hy, 6, 7, (nx, ny, x, y) => ramp(MARBLE, light(nx, ny) + 0.15, x, y));
  g.poly([[cx - 7, hy - 6], [cx + 7, hy - 6], [cx + 8, hy + 8], [cx - 8, hy + 8]], (x, y) => ramp(MARBLE, 0.5, x, y));   // veil
  g.ellipse(cx, hy + 1, 4.5, 5.5, (nx, ny, x, y) => ramp(MARBLE, light(nx, ny) + 0.2, x, y));
  const shut = pose !== 'glare';
  if (shut) { g.rect(cx - 3, hy, 2, 1, MARBLE[1]); g.rect(cx + 2, hy, 2, 1, MARBLE[1]); }
  else { g.rect(cx - 3, hy, 2, 2, VIOLET[4]); g.rect(cx + 2, hy, 2, 2, VIOLET[4]); }
  // wax tears running down
  const tear = pose === 'weep' ? 3 + f : 1;
  for (const s of [-1, 1]) for (let k = 0; k < tear; k++) g.set(cx + s * 3, hy + 2 + k, '#f0e4c8');
  return g.outline('#08060a').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    idle: [makeFrame('idle', 0)],
    weep: [0, 1].map((f) => makeFrame('weep', f)),
    glare: [makeFrame('glare', 0)],
  };
  return ART;
}

export class SaintBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#9c98a8', '#e6e2f0', '#b48ae8', '#3e3a46'];
    this.def.glowColor = 'rgba(170,110,255,0.55)';
    this.def.alwaysGlow = true;
    this.halo = 0;
    this.haloSpeed = 0.8;
    this.alpha = 1;
    this.pose = null;
    this.mark = null;
  }

  frames() { return art()[this.pose || 'idle']; }

  update(dt, g) {
    super.update(dt, g);
    this.halo += dt * this.haloSpeed * (this.phase >= 2 ? 1.4 : 1);
  }

  // where the six halo candles are right now
  candles() {
    return [0, 1, 2, 3, 4, 5].map((i) => {
      const a = this.halo + (i / 6) * TAU;
      return { x: this.x + Math.cos(a) * 18, y: this.y - 40 + Math.sin(a) * 7, a };
    });
  }

  get hittable() { return super.hittable && this.alpha > 0.5; }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      halo: (g) => {
        let time = 0, shotT = 0;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.7) { this.haloSpeed = 0.8 + time * 6; this.pose = 'glare'; this.shake = 1; if (time - dt <= 0) sfx('chime'); return false; }
            this.haloSpeed = 4.2;
            shotT -= dt;
            if (shotT <= 0) {
              shotT = p2 ? 0.16 : 0.22;
              for (const c of this.candles().filter((_, i) => i % 2 === Math.floor(time * 5) % 2)) {
                g.enemyShoot({ x: c.x, y: c.y + 30, r: 2, z: 30, def: { name: this.name } }, c.a, 60 + t * 6, 'violet');
              }
            }
            if (time >= 2.2) { this.haloSpeed = 0.8; this.pose = null; return true; }
            return false;
          },
        };
      },
      vanish: (g) => {
        let time = 0, done = false;
        const room = g.room, p = g.player;
        let spot = null;
        for (let i = 0; i < 12 && !spot; i++) {
          const a = Math.random() * TAU, d = 80 + Math.random() * 40;
          const s = room.findFreeSpot(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7);
          if (Math.hypot(s.x - p.x, s.y - p.y) > 60) spot = s;
        }
        spot ??= room.findFreeSpot(room.centerX, room.centerY - 20);
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.4) { this.alpha = 1 - time / 0.4; if (time - dt <= 0) sfx('wail'); return false; }
            if (time < 1.2) { this.alpha = 0; this.mark = { x: spot.x, y: spot.y, k: (time - 0.4) / 0.8 }; return false; }
            if (!done) {
              done = true;
              this.x = spot.x; this.y = spot.y; this.mark = null;
              sfx('whoosh');
              this.ring(g, 10 + t * 2, 58, Math.random() * TAU, 'violet');
            }
            this.alpha = Math.min(1, (time - 1.2) / 0.25);
            return time >= 1.6;
          },
        };
      },
      weep: (g) => this.simple(g, {
        wind: 0.7, after: 0.9, pose: 'weep', sound: 'wail',
        fire: () => {
          const p = g.player, n = 4 + t + (p2 ? 1 : 0);
          for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU, r = i === 0 ? 0 : 20 + Math.random() * 50;
            const tx = Math.max(g.room.x0 + 10, Math.min(g.room.R - 10, p.x + Math.cos(a) * r));
            const ty = Math.max(g.room.y0 + 10, Math.min(g.room.B - 10, p.y + Math.sin(a) * r));
            this.lob(g, tx, ty, { flight: 1 + i * 0.08, burst: 4, speed: 50, style: 'violet', from: { x: this.x, y: this.y - 34 } });
          }
        },
      }),
      melt: (g) => {
        let base = 0, step = -1, time = 0;
        const s = this.simple(g, {
          wind: 0.75, after: 0.9, pose: 'weep', sound: 'crackle', shake: 2,
          onWind: (dt) => { const [dx, dy] = this.aimAt(g); base = Math.atan2(dy, dx); for (const off of [-0.6, 0, 0.6]) this.sparkLine(g, Math.cos(base + off), Math.sin(base + off), dt / 2, 130); },
          fire: () => { step = 0; time = 0; sfx('whoosh'); },
        });
        return {
          update: (dt) => {
            const done = s.update(dt);
            if (step >= 0) {
              time += dt;
              while (step < 9 && time >= step * 0.06) {
                for (const off of [-0.6, 0, 0.6]) {
                  const k = 18 + step * 14, x = this.x + Math.cos(base + off) * k, y = this.y + Math.sin(base + off) * k;
                  if (!g.room.isWalkSolid(g.room.colAt(x), g.room.rowAt(y)) && x > g.room.x0 && x < g.room.R && y > g.room.y0 && y < g.room.B) addCreep(g, x, y, 'fire');
                }
                step++;
              }
            }
            return done;
          },
        };
      },
    };
  }

  renderShadow(ctx, ox, oy) {
    if (this.mark) {
      const { x, y, k } = this.mark;
      ctx.globalAlpha = 0.4 + 0.5 * k;
      ctx.fillStyle = '#b48ae8';
      const r = 10 + k * 8;
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * TAU;
        ctx.fillRect(Math.round(x + Math.cos(a) * r + ox), Math.round(y + 8 + Math.sin(a) * r * 0.45 + oy), 2, 1);
      }
      ctx.globalAlpha = 1;
    }
    if (this.alpha > 0.3) super.renderShadow(ctx, ox, oy);
  }

  render(ctx, ox, oy) {
    if (this.alpha <= 0) return;
    ctx.globalAlpha = this.alpha;
    const cs = this.candles();
    const drawCandle = (c) => {
      const x = Math.round(c.x + ox), y = Math.round(c.y + oy), f = Math.floor(this.t * 10 + c.a) % 2;
      ctx.fillStyle = '#160f0c'; ctx.fillRect(x - 2, y - 1, 4, 7);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 1, y, 2, 5);
      ctx.fillStyle = '#7a44b0'; ctx.fillRect(x - 1, y - 4 - f, 3, 4);
      ctx.fillStyle = '#ecdcff'; ctx.fillRect(x, y - 3 - f, 1, 2);
    };
    // the back half of the halo, the saint, then the front half
    for (const c of cs) if (Math.sin(c.a) < 0) drawCandle(c);
    if (this.alpha < 1) {
      // fading in or out (the base render would draw at full strength)
      const img = this.frames()[0];
      ctx.drawImage(img, Math.round(this.x - img.width / 2 + ox), Math.round(this.y + this.r * 0.55 - img.height + oy));
    } else super.render(ctx, ox, oy);
    ctx.globalAlpha = this.alpha;
    for (const c of cs) if (Math.sin(c.a) >= 0) drawCandle(c);
    ctx.globalAlpha = 1;
  }
}
