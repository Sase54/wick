// Short one-shot visual effects. Pooled like particles.
//   ring:  expanding pixel ring on the floor
//   disc:  filled flash (explosions)
//   float: a sprite that rises and fades (collected pickups)
//   bolt:  a flash of lightning between two points (chain lightning)
import { Pool } from '../engine/pool.js';

function create() {
  return { type: 'ring', x: 0, y: 0, t: 0, dur: 0.3, r0: 2, r1: 16, color: '#fff', img: null };
}

export class Effects {
  constructor() {
    this.pool = new Pool(create, 32);
  }

  add(type, x, y, dur) {
    const e = this.pool.spawn();
    e.type = type; e.x = x; e.y = y; e.t = 0; e.dur = dur; e.img = null;
    return e;
  }

  ring(x, y, r1, color, dur = 0.3, r0 = 2) {
    const e = this.add('ring', x, y, dur);
    e.r0 = r0; e.r1 = r1; e.color = color;
  }

  disc(x, y, r, color, dur = 0.15) {
    const e = this.add('disc', x, y, dur);
    e.r1 = r; e.color = color;
  }

  float(img, x, y, dur = 0.6) {
    const e = this.add('float', x, y, dur);
    e.img = img;
  }

  // a jagged bolt of lightning from (x, y) to (x2, y2)
  bolt(x, y, x2, y2, dur = 0.18) {
    const e = this.add('bolt', x, y, dur);
    e.r0 = x2; e.r1 = y2; e.seed = Math.random() * 100;
  }

  update(dt) {
    this.pool.sweep((e) => (e.t += dt) < e.dur);
  }

  render(ctx, ox, oy) {
    for (const e of this.pool.live) {
      const k = e.t / e.dur;
      ctx.globalAlpha = 1 - k;
      if (e.type === 'ring') {
        const r = e.r0 + (e.r1 - e.r0) * (1 - (1 - k) * (1 - k));
        ctx.fillStyle = e.color;
        // Pixel circle outline, squashed vertically to sit on the floor.
        const n = Math.max(8, Math.round(r * 4));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          ctx.fillRect(Math.round(e.x + Math.cos(a) * r + ox), Math.round(e.y + Math.sin(a) * r * 0.6 + oy), 1, 1);
        }
      } else if (e.type === 'disc') {
        ctx.fillStyle = e.color;
        const r = e.r1 * (0.7 + k * 0.3);
        for (let dy = -r; dy <= r; dy++) {
          const half = Math.round(Math.sqrt(r * r - dy * dy));
          ctx.fillRect(Math.round(e.x - half + ox), Math.round(e.y + dy * 0.7 + oy), half * 2, 1);
        }
      } else if (e.type === 'bolt') {
        // a few kinked segments, white core with a yellow edge
        const n = 6, x2 = e.r0, y2 = e.r1;
        let px = e.x, py = e.y;
        for (let i = 1; i <= n; i++) {
          const j = i === n ? 0 : Math.sin(e.seed + i * 2.3) * 6;
          const nx = e.x + ((x2 - e.x) * i) / n - ((y2 - e.y) / (Math.hypot(x2 - e.x, y2 - e.y) || 1)) * j;
          const ny = e.y + ((y2 - e.y) * i) / n + ((x2 - e.x) / (Math.hypot(x2 - e.x, y2 - e.y) || 1)) * j;
          const steps = Math.ceil(Math.hypot(nx - px, ny - py));
          for (let s = 0; s <= steps; s++) {
            const sx = Math.round(px + ((nx - px) * s) / steps + ox), sy = Math.round(py + ((ny - py) * s) / steps + oy);
            ctx.fillStyle = '#d0e040'; ctx.fillRect(sx - 1, sy, 3, 1);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 1, 1);
          }
          px = nx; py = ny;
        }
      } else if (e.type === 'float' && e.img) {
        ctx.drawImage(e.img, Math.round(e.x - e.img.width / 2 + ox), Math.round(e.y - e.img.height - 6 - k * 12 + oy));
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() { this.pool.clear(); }
}
