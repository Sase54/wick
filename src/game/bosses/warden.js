// THE CHAINED WARDEN (chapter 3, fits The Underhall): a giant jailer in rusted plate, an iron
// ball on a long chain. Every attack has a tell:
//   sweep   spins the ball faster and faster (a red ring shows its reach, 0.9 s), then swings it
//           round in a wide circle twice: get out of the ring or stay in close
//   hurl    raises the ball (the line shows, 0.8 s), hurls it: it smashes down in a ring of shots
//           and is dragged back
//   pound   both fists up (0.8 s), pounds: shockwave lines in a cross, then an x
//   charge  (phase 2) lowers its helmet and snorts, charges until a wall, dazed
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const PLATE = ['#1a1c20', '#2c2f36', '#40444e', '#585e6a', '#767e8c', '#9aa2b0'];
const RUST = ['#3a1e10', '#5a3018', '#7a4422'];

function makeFrame(pose, f) {
  const W = 56, H = 58, cx = 28;
  const g = new PixelGrid(W, H);
  const step = pose === 'walk' ? f : 0;
  for (const s of [-1, 1]) g.rect(cx + s * 7 - 3, 44, 7, 11 - (s === 1 ? step : 1 - step), PLATE[2]);
  g.ellipse(cx, 30, 17, 15, (nx, ny, x, y) => ramp(PLATE, light(nx, ny) + ((x + y * 3) % 9 === 0 ? -0.3 : 0), x, y));
  for (const [x, y] of [[-9, 24], [6, 34], [-2, 38], [11, 26]]) g.rect(cx + x, y, 2, 2, RUST[1 + ((x + y) & 1)]);
  g.rect(cx - 14, 38, 28, 3, '#2a1c12');                                  // belt
  g.rect(cx - 2, 38, 5, 3, PLATE[4]);
  // helmet: a bucket with a slit
  g.rect(cx - 9, 6, 18, 16, PLATE[3]);
  g.rect(cx - 9, 6, 18, 2, PLATE[5]);
  g.rect(cx - 9, 20, 18, 2, PLATE[1]);
  const lit = pose === 'wind' || pose === 'charge';
  g.rect(cx - 7, 12, 14, 2, '#0a0a0c');
  if (lit) { g.rect(cx - 5, 12, 3, 2, f % 2 ? '#ff4a2a' : '#ffd25a'); g.rect(cx + 2, 12, 3, 2, f % 2 ? '#ff4a2a' : '#ffd25a'); }
  else { g.set(cx - 4, 12, '#ffd25a'); g.set(cx + 4, 12, '#ffd25a'); }
  for (let i = 0; i < 4; i++) g.set(cx - 6 + i * 4, 17, '#0a0a0c');            // breathing holes
  // arms: up (wind), down (slam) or holding the chain
  for (const s of [-1, 1]) {
    const hy = pose === 'wind' ? 4 : pose === 'slam' ? 46 : 32;
    g.line(cx + s * 15, 22, cx + s * 22, hy, PLATE[3]);
    g.line(cx + s * 16, 23, cx + s * 23, hy, PLATE[2]);
    g.ellipse(cx + s * 22, hy, 4, 4, (nx, ny, x, y) => ramp(PLATE, light(nx, ny) + 0.1, x, y));
  }
  if (pose === 'charge') g.rect(cx - 9, 4, 18, 3, PLATE[5]);
  return g.outline('#060708').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    walk: [0, 1].map((f) => makeFrame('walk', f)),
    wind: [0, 1].map((f) => makeFrame('wind', f)),
    slam: [makeFrame('slam', 0)],
    charge: [0, 1].map((f) => makeFrame('charge', f)),
  };
  return ART;
}

export class WardenBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#585e6a', '#9aa2b0', '#7a4422', '#1a1c20'];
    this.def.glowColor = 'rgba(255,90,40,0.45)';
    this.pose = null;
    this.ball = { a: 0, r: 26, spin: 3, x: this.x, y: this.y, thrown: null };
  }

  frames() { return art()[this.pose || 'walk']; }

  update(dt, g) {
    super.update(dt, g);
    const b = this.ball;
    if (!b.thrown) {
      b.a += dt * b.spin;
      b.x = this.x + Math.cos(b.a) * b.r;
      b.y = this.y + Math.sin(b.a) * b.r * 0.7;
    }
    // the ball hurts on touch, unless the Warden is dying
    const p = g.player;
    if (!this.dying && !p.dead && Math.hypot(p.x - b.x, p.y - b.y) < 9 + p.r) p.hurt(1, this.name, g, b.x, b.y);
  }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier, b = this.ball;
    return {
      sweep: (g) => {
        let time = 0;
        return {
          ring: () => (time < 0.9 ? 74 : null),
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.9) {
              this.pose = 'wind';
              this.shake = 1;
              b.spin = 3 + time * 8;
              b.r = 26 + time * 20;
              if (time - dt <= 0) sfx('rattle');
              return false;
            }
            this.pose = null;
            b.r = Math.min(74, b.r + dt * 120);
            b.spin = p2 ? 8 : 6.5;
            if (Math.random() < dt * 20) g.particles.spawn(b.x, b.y, { z: 4, vz: 20, life: 0.3, color: '#585e6a', size: 2 });
            if (time < 0.9 + (TAU * 2) / b.spin) return false;
            b.r = 26; b.spin = 3;
            return true;
          },
        };
      },
      hurl: (g) => {
        let time = 0, dx = 0, dy = 0, phase = 'wind', dist = 0;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (phase === 'wind') {
              this.pose = 'wind';
              [dx, dy] = this.aimAt(g);
              this.sparkLine(g, dx, dy, dt, 150);
              b.spin = 7;
              if (time >= 0.8) { phase = 'out'; dist = b.r; b.thrown = true; sfx('swing'); }
              return false;
            }
            this.pose = null;
            const room = g.room;
            if (phase === 'out') {
              dist += 300 * dt;
              b.x = this.x + dx * dist; b.y = this.y + dy * dist;
              const wall = b.x < room.x0 + 6 || b.x > room.R - 6 || b.y < room.y0 + 6 || b.y > room.B - 6 || room.isFlySolid(room.colAt(b.x), room.rowAt(b.y));
              if (dist >= 170 || wall) {
                phase = 'back';
                g.shake(5);
                sfx('slam');
                g.particles.burst(b.x, b.y, 14, { colors: ['#5a5048', '#3a3430', '#9aa2b0'], speed: 80, z: 4, vz: 60 });
                const n = 8 + t * 2 + (p2 ? 2 : 0), off = Math.random() * TAU;
                for (let i = 0; i < n; i++) g.enemyShoot({ x: b.x, y: b.y, r: 4, z: 4, def: { name: this.name } }, off + (i / n) * TAU, 62, 'dust');
                time = 0;
              }
              return false;
            }
            if (time < 0.35) return false;
            dist -= 180 * dt;
            b.x = this.x + dx * dist; b.y = this.y + dy * dist;
            if (dist <= b.r) { b.thrown = null; b.spin = 3; b.a = Math.atan2(dy, dx); return true; }
            return false;
          },
        };
      },
      pound: (g) => {
        let n = 0;
        const rows = 3 + (p2 ? 1 : 0);
        const fire = () => {
          g.shake(6);
          sfx('slam');
          const off = n++ % 2 ? Math.PI / 4 : 0;
          for (let k = 0; k < 4; k++) for (let i = 0; i < rows; i++) g.enemyShoot(this, off + (k * Math.PI) / 2, 86 * (1 - i * 0.18), 'dust');
        };
        const first = this.simple(g, { wind: 0.8, after: 0.5, pose: 'wind', firePose: 'slam', sound: 'growl', fire });
        let second = null;
        return {
          update: (dt) => {
            if (!second) { if (first.update(dt)) second = this.simple(g, { wind: 0.5, after: 0.5, pose: 'wind', firePose: 'slam', fire }); return false; }
            return second.update(dt);
          },
        };
      },
      charge: (g) => {
        const c = this.chargeAttack(g, { telegraph: 0.75, speed: 200, stun: 1.1, times: 1, onWall: () => this.ring(g, 10 + t, 60, Math.random() * TAU, 'dust') });
        return { update: (dt) => { this.pose = 'charge'; if (c.update(dt)) { this.pose = null; return true; } return false; } };
      },
    };
  }

  renderShadow(ctx, ox, oy) {
    super.renderShadow(ctx, ox, oy);
    // the sweep's reach while it winds up
    const r = this.attack?.ring?.();
    if (r) {
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(this.t * 20);
      ctx.fillStyle = '#ff4a2a';
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * TAU;
        ctx.fillRect(Math.round(this.x + Math.cos(a) * r + ox), Math.round(this.y + Math.sin(a) * r * 0.7 + oy), 2, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  render(ctx, ox, oy) {
    const b = this.ball, front = b.y > this.y;
    if (!front) this.renderBall(ctx, ox, oy);
    super.render(ctx, ox, oy);
    if (front) this.renderBall(ctx, ox, oy);
  }

  renderBall(ctx, ox, oy) {
    const b = this.ball, hx = this.x, hy = this.y - 18;
    const d = Math.hypot(b.x - hx, b.y - 6 - hy), n = Math.max(2, Math.floor(d / 5));
    for (let i = 1; i < n; i++) {
      const cx = hx + ((b.x - hx) * i) / n, cy = hy + ((b.y - 6 - hy) * i) / n;
      ctx.fillStyle = '#0a0a0c'; ctx.fillRect(Math.round(cx - 1 + ox), Math.round(cy - 1 + oy), 4, 4);
      ctx.fillStyle = '#767e8c'; ctx.fillRect(Math.round(cx + ox), Math.round(cy + oy), 2, 2);
    }
    const bx = Math.round(b.x + ox), by = Math.round(b.y - 6 + oy);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(bx - 7, Math.round(b.y + 2 + oy), 14, 3);
    ctx.fillStyle = '#0a0a0c'; ctx.beginPath(); ctx.arc(bx, by, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#40444e'; ctx.beginPath(); ctx.arc(bx, by, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#767e8c'; ctx.fillRect(bx - 5, by - 5, 4, 4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + b.a;
      ctx.fillStyle = '#9aa2b0';
      ctx.fillRect(Math.round(bx + Math.cos(a) * 10), Math.round(by + Math.sin(a) * 10), 2, 2);
    }
  }
}
