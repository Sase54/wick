// Ambient particles that give each floor variant its air: drifting dust, dripping water,
// rising embers, rolling fog, floating spores... Purely visual, drawn over the room in world
// space (they stay put while the camera scrolls). Kinds are picked in src/data/variants.js.
import { VIEW_W, VIEW_H } from './constants.js';

const KINDS = {
  // slow motes of dust catching the candle light
  dust: {
    rate: 6, max: 40,
    spawn: (a, cx, cy) => ({ x: cx + Math.random() * VIEW_W, y: cy + Math.random() * VIEW_H, vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 3, life: 5 + Math.random() * 4, size: 1, color: '#c8b898', alpha: 0.35 }),
  },
  // drops falling from the ceiling, splashing on the floor
  drips: {
    rate: 3, max: 18,
    spawn: (a, cx, cy, g) => {
      const room = g.room;
      const x = room.x0 + Math.random() * room.W, y = room.y0 + Math.random() * room.H;
      return { x, y: y - 60, ty: y, vx: 0, vy: 140, life: 3, size: 1, color: '#8aa8c0', alpha: 0.7, drip: true };
    },
  },
  // sparks rising off burning things
  embers: {
    rate: 14, max: 60,
    spawn: (a, cx, cy) => ({ x: cx + Math.random() * VIEW_W, y: cy + VIEW_H + 4, vx: (Math.random() - 0.5) * 10, vy: -(14 + Math.random() * 22), life: 3 + Math.random() * 3, size: Math.random() < 0.2 ? 2 : 1, color: Math.random() < 0.5 ? '#f08a24' : '#ffd25a', alpha: 0.9, wobble: Math.random() * 6 }),
  },
  // big soft patches of fog drifting sideways
  fog: {
    rate: 0.8, max: 9,
    spawn: (a, cx, cy) => ({ x: cx - 60, y: cy + Math.random() * VIEW_H, vx: 6 + Math.random() * 6, vy: 0, life: 18, size: 30 + Math.random() * 30, color: '#a8b0b8', alpha: 0.07, fog: true }),
  },
  // spores floating up from mold
  spores: {
    rate: 5, max: 30,
    spawn: (a, cx, cy) => ({ x: cx + Math.random() * VIEW_W, y: cy + Math.random() * VIEW_H, vx: (Math.random() - 0.5) * 6, vy: -(2 + Math.random() * 4), life: 4 + Math.random() * 3, size: 1, color: '#a8c86a', alpha: 0.6, wobble: Math.random() * 6 }),
  },
};

export class Ambience {
  // kind: one name or a list of names (several kinds mix, e.g. drips + spores)
  constructor(kind) {
    this.kinds = [].concat(kind || []).map((k) => KINDS[k]).filter(Boolean).map((k) => ({ k, acc: 0, n: 0 }));
    this.list = [];
  }

  update(dt, g) {
    if (!this.kinds.length) return;
    const cx = g.cam?.x || 0, cy = g.cam?.y || 0;
    for (const s of this.kinds) {
      s.acc += dt * s.k.rate;
      while (s.acc >= 1) {
        s.acc -= 1;
        if (this.list.filter((p) => p.kind === s).length < s.k.max) this.list.push({ t: 0, kind: s, ...s.k.spawn(this, cx, cy, g) });
      }
    }
    for (const p of this.list) {
      p.t += dt;
      p.x += (p.vx + (p.wobble ? Math.sin(p.t * 2 + p.wobble) * 4 : 0)) * dt;
      p.y += p.vy * dt;
      if (p.drip && p.y >= p.ty) {
        p.drip = false;
        p.splash = 0.25;
        p.vy = 0;
        p.y = p.ty;
      }
      if (p.splash !== undefined && (p.splash -= dt) <= 0) p.t = p.life;
    }
    this.list = this.list.filter((p) => p.t < p.life);
  }

  render(ctx, ox, oy) {
    for (const p of this.list) {
      const fade = Math.min(1, p.t / 0.6, (p.life - p.t) / 0.8);
      ctx.globalAlpha = Math.max(0, p.alpha * fade);
      ctx.fillStyle = p.color;
      const x = Math.round(p.x + ox), y = Math.round(p.y + oy);
      if (p.fog) {
        const r = Math.round(p.size);
        for (let i = -3; i <= 3; i++) {
          const w = Math.round(r * Math.sqrt(1 - (i / 3.5) ** 2));
          ctx.fillRect(x - w, y + i * 3, w * 2, 3);
        }
      } else if (p.splash !== undefined) {
        const k = 1 - p.splash / 0.25;
        const w = 1 + Math.round(k * 4);
        ctx.fillRect(x - w, y, 1, 1);
        ctx.fillRect(x + w, y, 1, 1);
        ctx.fillRect(x - 1, y - Math.round(2 - k * 2), 2, 1);
      } else if (p.drip !== undefined) {
        ctx.fillRect(x, y, 1, 3);
      } else {
        ctx.fillRect(x, y, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }
}
