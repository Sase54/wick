// Pooled pixel particles. Positions are on the ground plane; z is height above it.
import { Pool } from './pool.js';

function createParticle() {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, gravity: 0, drag: 0, life: 0, max: 1, size: 1, color: '#fff', shrink: false, bounce: 0 };
}

export class Particles {
  constructor() {
    this.pool = new Pool(createParticle, 256);
  }

  spawn(x, y, opts) {
    const p = this.pool.spawn();
    p.x = x; p.y = y;
    p.z = opts.z ?? 0;
    p.vx = opts.vx ?? 0; p.vy = opts.vy ?? 0; p.vz = opts.vz ?? 0;
    p.gravity = opts.gravity ?? 0;
    p.drag = opts.drag ?? 0;
    p.life = p.max = opts.life ?? 0.5;
    p.size = opts.size ?? 1;
    p.color = opts.color ?? '#fff';
    p.shrink = opts.shrink ?? false;
    p.bounce = opts.bounce ?? 0.3;
    return p;
  }

  // Radial burst: count particles from (x, y, z) in random directions.
  burst(x, y, count, { colors, speed = 60, speedVar = 0.6, z = 4, vz = 40, vzVar = 30, gravity = 260, life = 0.45, lifeVar = 0.3, size = 1, sizeVar = 1, drag = 2, dirX = 0, dirY = 0, spread = Math.PI * 2 } = {}) {
    const baseAngle = dirX || dirY ? Math.atan2(dirY, dirX) : 0;
    for (let i = 0; i < count; i++) {
      const a = dirX || dirY ? baseAngle + (Math.random() - 0.5) * spread : Math.random() * Math.PI * 2;
      const s = speed * (1 - speedVar / 2 + Math.random() * speedVar);
      this.spawn(x, y, {
        z,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        vz: vz + (Math.random() - 0.5) * vzVar,
        gravity,
        drag,
        life: life * (1 - lifeVar / 2 + Math.random() * lifeVar),
        size: size + Math.floor(Math.random() * (sizeVar + 1)),
        color: colors[Math.floor(Math.random() * colors.length)],
        shrink: true,
      });
    }
  }

  update(dt) {
    this.pool.sweep((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k; p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) {
        p.vz -= p.gravity * dt;
        p.z += p.vz * dt;
        if (p.z < 0) {
          p.z = 0;
          p.vz = -p.vz * p.bounce;
          p.vx *= 0.5; p.vy *= 0.5;
        }
      } else {
        p.z += p.vz * dt;
      }
      return true;
    });
  }

  render(ctx, ox, oy) {
    for (const p of this.pool.live) {
      let s = p.size;
      if (p.shrink && p.life < p.max * 0.5) s = Math.max(1, Math.round(s * (p.life / (p.max * 0.5))));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - s / 2 + ox), Math.round(p.y - p.z - s / 2 + oy), s, s);
    }
  }

  clear() { this.pool.clear(); }
}
