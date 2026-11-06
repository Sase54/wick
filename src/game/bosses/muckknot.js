// THE MUCK KNOT (chapter 3, fits The Mire): a knot of black tar tendrils with a mouth in the
// middle, rooted to the floor. It never moves; its tendrils come up through the mud anywhere.
// Hit the knot or any tendril that's up (one health bar). Every attack has a tell:
//   grasp   bubbling rings appear around you (0.8 s), then tendrils burst up there and stay up
//           for a moment, each spitting a small ring
//   spew    the knot swells (0.7 s) and spews three tar globs at you; they leave tar puddles
//   lash    three lines show (0.8 s), then fast lines of tar shots run along them
//   flood   (phase 2) the knot heaves (0.9 s): tar pours out around it, a ring of shots, and
//           five tendrils come up around you
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';
import { addTarPool } from '../hazards.js';

const TAR = ['#060508', '#100c14', '#1c1622', '#2a2232', '#3c3248', '#5a4c6a'];

function makeCore(open, f) {
  const W = 56, H = 46, cx = 28;
  const g = new PixelGrid(W, H);
  // roots spreading into the floor
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI + 0.2;
    g.line(cx, 34, cx + Math.cos(a) * 26 * (i % 2 ? 1 : -1), 38 + Math.sin(a) * 6, TAR[2]);
  }
  // a tangle of thick coils
  for (const [x, y, rx, ry] of [[-10, 26, 10, 9], [10, 26, 10, 9], [0, 18, 13, 12], [-6, 32, 9, 7], [7, 32, 9, 7]]) {
    g.ellipse(cx + x, y, rx, ry, (nx, ny, px, py) => ramp(TAR, light(nx, ny) + 0.1, px, py));
  }
  for (const [x0, y0, x1, y1] of [[-14, 20, -4, 30], [12, 16, 4, 28], [-6, 10, 8, 14]]) g.line(cx + x0, y0, cx + x1, y1, TAR[4]);   // glossy coils
  // tendrils waving on top
  for (const s of [-1, 1]) for (let k = 0; k < 12; k++) {
    g.set(cx + s * (8 + Math.sin(k * 0.6 + f) * 3), 10 - k, TAR[3]);
    g.set(cx + s * (8 + Math.sin(k * 0.6 + f) * 3) + 1, 10 - k, TAR[2]);
  }
  // the mouth and its ring of pale teeth
  g.ellipse(cx, 22, open ? 8 : 6, open ? 6 : 2.5, '#2a0a1c');
  if (open) for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.set(cx + Math.cos(a) * 7, 22 + Math.sin(a) * 5, '#d8d0c0'); }
  for (const [x, y] of [[-12, 14], [13, 18], [-2, 8]]) { g.ellipse(cx + x, y, 2, 2, '#e0d080'); g.set(cx + x, y, '#140c08'); }
  return g.outline('#020203').toCanvas();
}

function makeTendril(f) {
  const g = new PixelGrid(16, 34);
  for (let k = 0; k < 30; k++) {
    const w = Math.max(1, Math.round(4 - k / 9));
    const x = 8 + Math.sin(k * 0.3 + f * 1.5) * (k / 10);
    g.rect(Math.round(x - w), 31 - k, w * 2, 1, TAR[k % 5 === 0 ? 4 : 2 + (k > 20 ? 1 : 0)]);
  }
  g.ellipse(8, 32, 6, 2, TAR[1]);
  return g.outline('#020203').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    idle: [0, 1, 2].map((f) => makeCore(false, f)),
    open: [makeCore(true, 0)],
    tendril: [0, 1, 2].map((f) => makeTendril(f)),
  };
  return ART;
}

export class MuckKnotBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#2a2232', '#5a4c6a', '#100c14', '#e0d080'];
    this.def.glowColor = 'rgba(160,220,60,0.35)';
    this.tendrils = [];
    this.pose = null;
  }

  frames() { return this.pose === 'open' ? art().open : art().idle; }

  hitCircles() {
    if (!this.hittable) return [];
    return [this, ...this.tendrils.filter((t) => t.state === 'up').map((t) => ({ x: t.x, y: t.y - 6, r: 8 }))];
  }

  update(dt, g) {
    super.update(dt, g);
    const p = g.player;
    for (const t of this.tendrils) {
      t.t += dt;
      if (t.state === 'warn' && t.t >= 0.8) {
        t.state = 'up'; t.t = 0;
        sfx('squish');
        g.particles.burst(t.x, t.y, 10, { colors: ['#100c14', '#2a2232', '#5a4c6a'], speed: 60, z: 2, vz: 60 });
        if (!p.dead && Math.hypot(p.x - t.x, p.y - t.y) < 12 + p.r) p.hurt(1, this.name, g, t.x, t.y);
        const off = Math.random() * TAU;
        for (let i = 0; i < 4 + Math.min(2, this.tier); i++) g.enemyShoot({ x: t.x, y: t.y, r: 4, z: 10, def: { name: this.name } }, off + (i / (4 + Math.min(2, this.tier))) * TAU, 52, 'tar');
      } else if (t.state === 'up' && t.t >= 1.3) { t.state = 'sink'; t.t = 0; }
      else if (t.state === 'sink' && t.t >= 0.3) t.dead = true;
    }
    if (this.dying) this.tendrils.length = 0;
    this.tendrils = this.tendrils.filter((t) => !t.dead);
  }

  // tendrils come up at n spots around the player (one right under them)
  grasp(g, n) {
    const p = g.player, room = g.room;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = i === 0 ? 0 : 30 + Math.random() * 40;
      const x = Math.max(room.x0 + 10, Math.min(room.R - 10, p.x + Math.cos(a) * r));
      const y = Math.max(room.y0 + 10, Math.min(room.B - 10, p.y + Math.sin(a) * r * 0.8));
      if (room.isWalkSolid(room.colAt(x), room.rowAt(y))) continue;
      this.tendrils.push({ x, y, t: 0, state: 'warn', f: Math.floor(Math.random() * 3) });
    }
    sfx('gurgle');
  }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      grasp: (g) => this.simple(g, { wind: 0.05, after: 1.6, sound: null, shake: 0, fire: () => this.grasp(g, 3 + (p2 ? 1 : 0)) }),
      spew: (g) => this.simple(g, {
        wind: 0.7, after: 0.6, pose: 'open', firePose: 'open', sound: 'gurgle', shake: 2,
        fire: () => {
          const [dx, dy] = this.aimAt(g), base = Math.atan2(dy, dx);
          for (const off of [-0.3, 0, 0.3]) {
            g.projectiles.spawn({ x: this.x, y: this.y - 4, z: 14, vx: Math.cos(base + off) * 80, vy: Math.sin(base + off) * 80, r: 6, damage: 1, team: 'enemy', range: 150, source: this.name, style: 'tar', tar: true });
          }
          sfx('enemyShoot');
        },
      }),
      lash: (g) => {
        let base = 0;
        return this.simple(g, {
          wind: 0.8, after: 0.5, sound: 'hiss',
          onWind: (dt) => { const [dx, dy] = this.aimAt(g); base = Math.atan2(dy, dx); for (const off of [-0.45, 0, 0.45]) this.sparkLine(g, Math.cos(base + off), Math.sin(base + off), dt / 2, 150); },
          fire: () => { for (const off of [-0.45, 0, 0.45]) for (let i = 0; i < 4 + Math.min(1, t); i++) g.enemyShoot(this, base + off, 124 - i * 16, 'tar'); },
        });
      },
      flood: (g) => this.simple(g, {
        wind: 0.9, after: 1.4, pose: 'open', firePose: 'open', sound: 'gurgle', shake: 3,
        fire: () => {
          g.shake(5);
          for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; addTarPool(g, this.x + Math.cos(a) * 40, this.y + Math.sin(a) * 26, 18); }
          this.ring(g, 12 + t * 2, 56, Math.random() * TAU, 'tar');
          this.grasp(g, 5);
        },
      }),
    };
  }

  renderShadow(ctx, ox, oy) {
    super.renderShadow(ctx, ox, oy);
    // bubbling warning rings where tendrils are about to come up
    for (const t of this.tendrils) {
      if (t.state !== 'warn') continue;
      const k = t.t / 0.8;
      ctx.globalAlpha = 0.4 + 0.5 * k;
      ctx.fillStyle = '#0a080c';
      const r = 4 + k * 8;
      ctx.fillRect(Math.round(t.x - r + ox), Math.round(t.y - r * 0.4 + oy), Math.round(r * 2), Math.round(r * 0.8));
      ctx.fillStyle = k > 0.6 && Math.floor(this.t * 16) % 2 ? '#ff4a2a' : '#5a4c6a';
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        ctx.fillRect(Math.round(t.x + Math.cos(a) * (r + 2) + ox), Math.round(t.y + Math.sin(a) * (r + 2) * 0.45 + oy), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  render(ctx, ox, oy) {
    super.render(ctx, ox, oy);
    const A = art();
    for (const t of this.tendrils) {
      if (t.state === 'warn') continue;
      const img = A.tendril[(t.f + Math.floor(this.t * 6)) % 3];
      const k = t.state === 'sink' ? 1 - t.t / 0.3 : Math.min(1, t.t / 0.12);
      const h = Math.max(1, Math.round(img.height * k));
      ctx.drawImage(img, 0, 0, img.width, h, Math.round(t.x - img.width / 2 + ox), Math.round(t.y + 2 - h + oy), img.width, h);
    }
  }
}
