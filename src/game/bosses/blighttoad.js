// THE BLIGHTED TOAD (chapter 3, fits The Mire): an enormous bog toad covered in black boils.
// Every attack has a tell:
//   leap     the big jump (shadow follows you, locks red, falls): a ring of bile and tar puddles
//   tongue   its throat swells and the line shows (0.75 s), then the tongue lashes out across
//            the room and snaps back
//   belch    cheeks puff up (0.6 s), a wide fan of bile
//   spawn    croaks, its back boils burst: three tarlings
//   hops     (phase 2) three quick hops at you, each landing marked, a small ring each time
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';
import { addTarPool } from '../hazards.js';

const SKIN = ['#141a0e', '#222c16', '#34421f', '#4a5a2c', '#64763c', '#82944e'];
const BELLY = ['#4a4a24', '#6a6a34', '#8a8a48', '#aaa660'];

function makeFrame(pose, f) {
  const W = 60, H = 44, cx = 30, cy = 26;
  const g = new PixelGrid(W, H);
  const squat = pose === 'wind' ? 2 : 0;
  for (const s of [-1, 1]) {
    g.ellipse(cx + s * 21, cy + 12, 8, 4, SKIN[1]);           // back legs
    g.ellipse(cx + s * 12, cy + 14, 4, 3, SKIN[2]);           // front feet
  }
  g.ellipse(cx, cy + squat, 24, 15 - squat, (nx, ny, x, y) => ramp(SKIN, light(nx, ny), x, y));
  for (const [x, y, r] of [[-14, -6, 3], [-4, -11, 2.5], [9, -9, 3], [17, -2, 2], [-18, 2, 2]]) {
    g.ellipse(cx + x, cy + y + squat, r, r * 0.8, '#1a1018');
    g.set(cx + x - 1, cy + y + squat - 1, '#5e4668');
  }
  const puff = pose === 'belch' || pose === 'wind' ? 3 : 0;
  g.ellipse(cx, cy + 7 + squat, 13 + puff, 6 + puff, (nx, ny, x, y) => ramp(BELLY, light(nx, ny) + 0.2, x, y));
  // eyes on top
  for (const s of [-1, 1]) {
    g.ellipse(cx + s * 10, cy - 12 + squat, 5, 4.5, (nx, ny, x, y) => ramp(SKIN, light(nx, ny) + 0.2, x, y));
    const e = pose === 'wind' ? (f % 2 ? '#ff4a2a' : '#ffd25a') : '#e0d040';
    g.rect(cx + s * 10 - 2, cy - 13 + squat, 4, 3, e);
    g.rect(cx + s * 10 - 1, cy - 13 + squat, 2, 3, '#140c08');
  }
  // mouth
  if (pose === 'tongue') g.ellipse(cx, cy + 1, 9, 3, '#3a0a14');
  else g.line(cx - 12, cy + 1 + squat, cx + 12, cy + 1 + squat, '#0e1208');
  return g.outline('#060804').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    idle: [0, 1].map((f) => makeFrame('idle', f)),
    wind: [0, 1].map((f) => makeFrame('wind', f)),
    belch: [makeFrame('belch', 0)],
    tongue: [makeFrame('tongue', 0)],
  };
  return ART;
}

export class BlightToadBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#4a5a2c', '#82944e', '#1a1018', '#aaa660'];
    this.def.glowColor = 'rgba(160,220,60,0.4)';
    this.pose = null;
    this.tongueLen = 0;
  }

  frames() { return art()[this.pose || 'idle']; }

  canUse(name, g) { return name !== 'spawn' || g.enemies.length < 4; }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      leap: (g) => this.jumpAttack(g, {
        rise: 0.45, track: 0.8, lock: 0.6, fall: 0.35, height: 120,
        onLand: () => {
          sfx('squish');
          this.ring(g, 10 + t * 2, 60, Math.random() * TAU, 'green');
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * TAU + Math.random();
            addTarPool(g, this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 20, 16);
          }
        },
      }),
      tongue: (g) => {
        let time = 0, dx = 0, dy = 0;
        const reach = 170, out = 0.2, hold = 0.25;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.75) {
              this.pose = 'wind';
              this.shake = 1;
              [dx, dy] = this.aimAt(g);
              this.sparkLine(g, dx, dy, dt, reach - 20);
              if (time - dt <= 0) sfx('croak');
              return false;
            }
            this.pose = 'tongue';
            const k2 = time - 0.75;
            const k = k2 < out ? k2 / out : k2 < out + hold ? 1 : Math.max(0, 1 - (k2 - out - hold) / out);
            this.tongueLen = k * reach;
            this.tongueDir = [dx, dy];
            const p = g.player, tx = this.x + dx * this.tongueLen, ty = this.y + dy * this.tongueLen;
            const l2 = this.tongueLen ** 2 || 1, u = Math.max(0, Math.min(1, ((p.x - this.x) * (tx - this.x) + (p.y - this.y) * (ty - this.y)) / l2));
            if (!p.dead && this.tongueLen > 10 && Math.hypot(p.x - (this.x + (tx - this.x) * u), p.y - (this.y + (ty - this.y) * u)) < p.r + 4) p.hurt(1, this.name, g, tx, ty);
            if (k2 >= out * 2 + hold) { this.tongueLen = 0; this.pose = null; return true; }
            return false;
          },
        };
      },
      belch: (g) => this.simple(g, {
        wind: 0.6, after: 0.5, pose: 'belch', sound: 'gurgle',
        fire: () => { this.spread(g, 7 + t + (p2 ? 2 : 0), 0.18, 74, 'green'); sfx('squish'); },
      }),
      spawn: (g) => this.simple(g, {
        wind: 0.8, after: 0.4, pose: 'wind', sound: 'croak', shake: 2,
        fire: () => {
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * TAU + Math.random();
            const e = g.spawnEnemy('tarling', this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 14, { delay: 0.1 });
            e.kx = Math.cos(a) * 120; e.ky = Math.sin(a) * 120;
          }
          g.particles.burst(this.x, this.y - 14, 14, { colors: ['#1a1018', '#5e4668', '#82944e'], speed: 70, z: 16, vz: 50 });
        },
      }),
      hops: (g) => {
        let n = 0, cur = null;
        const next = () => {
          const p = g.player, d = Math.hypot(p.x - this.x, p.y - this.y) || 1, k = Math.min(1, 80 / d);
          return this.hopAttack(g, { to: { x: this.x + (p.x - this.x) * k, y: this.y + (p.y - this.y) * k }, time: 0.45, height: 30, onLand: () => this.ring(g, 6 + t, 56, Math.random() * TAU, 'green') });
        };
        let pause = 0;
        return {
          marker: () => cur?.marker?.(),
          update: (dt) => {
            if (pause > 0) { pause -= dt; this.vx = this.vy = 0; return false; }
            cur ??= next();
            if (cur.update(dt)) { n++; cur = null; pause = 0.3; if (n >= 3) return true; }
            return false;
          },
        };
      },
    };
  }

  render(ctx, ox, oy) {
    super.render(ctx, ox, oy);
    if (this.tongueLen > 0) {
      const [dx, dy] = this.tongueDir, sx = this.x, sy = this.y - 2;
      const tx = sx + dx * this.tongueLen, ty = sy + dy * this.tongueLen;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3a0a14'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(sx + ox, sy + oy); ctx.lineTo(tx + ox, ty + oy); ctx.stroke();
      ctx.strokeStyle = '#c0506a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx + ox, sy + oy); ctx.lineTo(tx + ox, ty + oy); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#e07a92'; ctx.beginPath(); ctx.arc(tx + ox, ty + oy, 5, 0, TAU); ctx.fill();
    }
  }
}
