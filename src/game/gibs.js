// Enemy deaths: the body squashes flat for a moment while chunks (gibs) fly out, bounce once and
// stay on the floor as little stains. Numbers in TUNING.enemies.
import { TUNING } from '../data/tuning.js';

const GRAVITY = 420;

export class Gibs {
  constructor() {
    this.list = [];      // flying chunks
    this.corpses = [];   // squashing bodies
  }

  clear() {
    this.list.length = 0;
    this.corpses.length = 0;
  }

  // `count` chunks of `colors` from (x, y) at height z; size 1 (small enemy) to 3 (a boss).
  burst(x, y, z, colors, count, size = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 70 * (0.7 + size * 0.3);
      this.list.push({
        x, y, z: z + Math.random() * 6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7,
        vz: 70 + Math.random() * 90,
        s: Math.max(2, Math.round(1 + Math.random() * (1 + size))),   // chunk size in px
        c: colors[Math.floor(Math.random() * colors.length)],
        bounced: false,
      });
    }
  }

  // The enemy's last frame, drawn squashing flat and fading (anchored at its feet).
  corpse(img, x, y, z, scale = 1) {
    this.corpses.push({ img, x, y, z, scale, t: 0 });
  }

  update(dt, room) {
    for (const g of this.list) {
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vz -= GRAVITY * dt;
      g.z += g.vz * dt;
      if (g.z <= 0) {
        if (!g.bounced) {
          // first landing: a small hop, slowed down
          g.z = 0; g.vz = Math.abs(g.vz) * 0.3; g.vx *= 0.45; g.vy *= 0.45; g.bounced = true;
        } else {
          g.done = true;
          // stays on the floor for the rest of the room
          const { x, y, s, c } = g;
          room.paintDecal((ctx) => {
            ctx.fillStyle = c;
            ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, Math.max(1, s - 1));
          });
        }
      }
    }
    if (this.list.some((g) => g.done)) this.list = this.list.filter((g) => !g.done);
    const T = TUNING.enemies.deathSquish;
    for (const c of this.corpses) c.t += dt;
    if (this.corpses.some((c) => c.t >= T)) this.corpses = this.corpses.filter((c) => c.t < T);
  }

  render(ctx, ox, oy) {
    const T = TUNING.enemies.deathSquish;
    for (const c of this.corpses) {
      const k = Math.min(1, c.t / T);
      const w = Math.round(c.img.width * c.scale * (1 + k * 0.6)), h = Math.max(1, Math.round(c.img.height * c.scale * (1 - k * 0.7)));
      ctx.globalAlpha = 1 - k * 0.6;
      ctx.drawImage(c.img, Math.round(c.x - w / 2 + ox), Math.round(c.y - h - c.z + oy), w, h);
    }
    ctx.globalAlpha = 1;
    for (const g of this.list) {
      const x = Math.round(g.x - g.s / 2 + ox), y = Math.round(g.y - g.z - g.s / 2 + oy);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(Math.round(g.x - g.s / 2 + ox), Math.round(g.y + oy), g.s, 1);   // tiny shadow
      ctx.fillStyle = '#120806';
      ctx.fillRect(x - 1, y, g.s + 2, g.s);
      ctx.fillRect(x, y - 1, g.s, g.s + 2);
      ctx.fillStyle = g.c;
      ctx.fillRect(x, y, g.s, g.s);
    }
  }
}
