// THE PALE SENTINEL / THE GILDED SENTINEL: the statues of The Vigil, woken by a bomb. A tall
// faceless figure with far too many wings and a single slit where a face should be. Each one
// guards half of a key. Every attack has a tell:
//   beam      the slit opens and a thin line shows where it's looking (0.9 s), then it burns a
//             beam along that line
//   feathers  its wings spread wide (0.7 s), a fan of pale feathers
//   halo      it rises and glows (0.7 s): a ring of light, then a second one turned half a step
//   glide     it leans, the line shows (0.75 s), it glides straight through the room
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const PALE = ['#5a5a66', '#7a7a88', '#a0a0ae', '#c8c8d4', '#ececf4', '#ffffff'];
const GILD = ['#5a4010', '#8a6a1c', '#b8902c', '#e0c060', '#f8e090', '#fffbd8'];

function makeFrame(cols, spread, open) {
  const W = 64, H = 56, cx = 32;
  const g = new PixelGrid(W, H);
  // three pairs of wings, long and thin, folded or spread
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      const tipX = cx + s * (spread ? 30 - i * 3 : 13 + i * 2), tipY = spread ? 4 + i * 12 : 6 + i * 6;
      g.poly([[cx + s * 4, 14 + i * 5], [tipX, tipY], [tipX - s * 3, tipY + (spread ? 10 : 30)], [cx + s * 6, 24 + i * 6]], (x, y) => ramp(cols, 0.7 - i * 0.12 - Math.abs(x - cx) / 90, x, y));
      for (let k = 0; k < 4; k++) g.line(cx + s * 5, 16 + i * 5, tipX - s * k, tipY + 3 + k * (spread ? 2 : 7), cols[1]);
    }
  }
  // a tall robed body
  g.poly([[cx - 5, 12], [cx + 5, 12], [cx + 8, 52], [cx - 8, 52]], (x, y) => ramp(cols, 0.9 - Math.abs(x - cx) / 20 - (y - 12) / 90, x, y));
  for (const x of [-4, 0, 4]) g.line(cx + x, 20, cx + x * 1.4, 51, cols[2]);
  // the head: smooth, no face, just a slit
  g.ellipse(cx, 8, 5, 7, (nx, ny, x, y) => ramp(cols, light(nx, ny) + 0.3, x, y));
  if (open) { g.rect(cx - 1, 4, 3, 9, '#1a0a0a'); g.rect(cx, 6, 1, 5, '#ff4a2a'); }
  else g.line(cx, 5, cx, 11, cols[0]);
  return g.outline('#0a0a0e').toCanvas();
}

const ART = {};
function art(kind) {
  ART[kind] ??= (() => {
    const cols = kind === 'gilded' ? GILD : PALE;
    return { idle: [makeFrame(cols, false, false)], spread: [makeFrame(cols, true, false)], open: [makeFrame(cols, false, true)] };
  })();
  return ART[kind];
}

export class SentinelBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.look = this.def.look || 'pale';
    this.def.debris = this.look === 'gilded' ? ['#e0c060', '#fffbd8', '#8a6a1c'] : ['#c8c8d4', '#ffffff', '#7a7a88'];
    this.def.glowColor = this.look === 'gilded' ? 'rgba(255,220,120,0.55)' : 'rgba(220,230,255,0.55)';
    this.def.alwaysGlow = true;
    this.lift = 10;
    this.pose = null;
    this.beam = null;
  }

  frames() { return art(this.look)[this.pose || 'idle']; }

  idle(dt, g) {
    super.idle(dt, g);
    this.lift = 10 + Math.sin(this.t * 2) * 3;
  }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier, style = this.look === 'gilded' ? 'spark' : 'ghost';
    return {
      beam: (g) => {
        let dx = 0, dy = 1;
        let time = 0;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.9) {
              this.pose = 'open';
              if (time < 0.2) [dx, dy] = this.aimAt(g);
              this.aimLine = { dx, dy };
              if (time - dt <= 0) sfx('hum');
              return false;
            }
            this.aimLine = null;
            const room = g.room;
            let ex = this.x, ey = this.y;
            for (let d = 0; d < 320; d += 4) {
              const x = this.x + dx * d, y = this.y + dy * d;
              if (x < room.x0 || x > room.R || y < room.y0 || y > room.B) break;
              ex = x; ey = y;
            }
            this.beam = { x: ex, y: ey };
            if (time - dt < 0.9) sfx('beam');
            const p = g.player, l2 = (ex - this.x) ** 2 + (ey - this.y) ** 2 || 1;
            const u = Math.max(0, Math.min(1, ((p.x - this.x) * (ex - this.x) + (p.y - this.y) * (ey - this.y)) / l2));
            if (!p.dead && Math.hypot(p.x - (this.x + (ex - this.x) * u), p.y - (this.y + (ey - this.y) * u)) < p.r + 5) p.hurt(2, this.name, g, this.x, this.y);
            if (time >= 0.9 + (p2 ? 0.9 : 0.6)) { this.beam = null; this.pose = null; return true; }
            return false;
          },
        };
      },
      feathers: (g) => this.simple(g, {
        wind: 0.7, after: 0.4, pose: 'spread', sound: 'whoosh',
        fire: () => { this.spread(g, 7 + t + (p2 ? 2 : 0), 0.17, 78, style); },
      }),
      halo: (g) => {
        let second = false, time = 0;
        const a0 = Math.random() * TAU, n = 12 + t * 2;
        const s = this.simple(g, { wind: 0.7, after: 0.7, pose: 'spread', sound: 'chime', fire: () => this.ring(g, n, 60, a0, style) });
        return { update: (dt) => { time += dt; const done = s.update(dt); if (!second && time >= 1.05) { second = true; this.ring(g, n, 60, a0 + Math.PI / n, style); } return done; } };
      },
      glide: (g) => {
        let time = 0, phase = 'wind', dx = 0, dy = 0;
        return {
          update: (dt) => {
            time += dt;
            if (phase === 'wind') {
              this.vx = this.vy = 0;
              [dx, dy] = this.aimAt(g);
              this.sparkLine(g, dx, dy, dt, 170);
              if (time >= 0.75) { phase = 'go'; time = 0; sfx('dash'); }
              return false;
            }
            this.vx = dx * 220; this.vy = dy * 220;
            if (this.lastHit || time > 1) { this.vx = this.vy = 0; return true; }
            return false;
          },
        };
      },
    };
  }

  render(ctx, ox, oy) {
    // the thin aiming line before the beam
    if (this.aimLine) {
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(this.t * 30);
      ctx.fillStyle = '#ff4a2a';
      for (let d = 14; d < 300; d += 5) ctx.fillRect(Math.round(this.x + this.aimLine.dx * d + ox), Math.round(this.y - 20 + this.aimLine.dy * d + oy), 2, 1);
      ctx.globalAlpha = 1;
    }
    super.render(ctx, ox, oy);
    if (this.beam) {
      const w = 4 + Math.round(Math.sin(this.t * 40));
      ctx.lineCap = 'round';
      for (const [col, lw] of [['rgba(255,240,200,0.4)', w + 6], [this.look === 'gilded' ? '#ffd25a' : '#e0e8ff', w], ['#ffffff', 2]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(this.x + ox, this.y - 20 - this.lift + oy); ctx.lineTo(this.beam.x + ox, this.beam.y + oy); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
  }
}
