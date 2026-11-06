// THE TWIN GARGOYLES (chapter 3, fits The Underhall): two stone gargoyles perched on plinths.
// One wakes up and fights while the other stays stone (shots just chip it); then they swap.
// One shared health bar. Every attack has a tell:
//   swoop   the awake one rises, the line shows (0.75 s), it dives straight through and skids
//   spit    its jaws glow (0.6 s), a fan of burning spit
//   swap    it flies back to its plinth and turns to stone; the other one cracks awake with a
//           shower of grit and a ring of stones
//   both    (phase 2) both wake: each spits at you from where it sits, then they swap
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { makeShadow } from '../../engine/sprites.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const STONE = ['#22242a', '#363840', '#4c5058', '#666a74', '#868a94', '#a6aab4'];
const LIVE = ['#2a2224', '#403436', '#5a4a4a', '#766060', '#947a78', '#b49a96'];

function makeFrame(awake, flap, open) {
  const W = 46, H = 40, cx = 23;
  const g = new PixelGrid(W, H);
  const body = awake ? LIVE : STONE;
  for (const s of [-1, 1]) {
    if (awake) g.poly([[cx + s * 6, 14], [cx + s * 22, 4 + flap * 6], [cx + s * 21, 20], [cx + s * 9, 22]], (x, y) => ramp(body, 0.5 - Math.abs(x - cx) / 50, x, y));
    else g.poly([[cx + s * 6, 12], [cx + s * 14, 2], [cx + s * 15, 22], [cx + s * 9, 28]], (x, y) => ramp(body, 0.4, x, y));
  }
  g.ellipse(cx, 24, 10, 11, (nx, ny, x, y) => ramp(body, light(nx, ny), x, y));
  g.ellipse(cx, 11, 8, 7, (nx, ny, x, y) => ramp(body, light(nx, ny) + 0.1, x, y));
  for (const s of [-1, 1]) { g.line(cx + s * 5, 6, cx + s * 9, 0, body[4]); g.line(cx + s * 5, 7, cx + s * 8, 1, body[3]); }   // horns
  if (!awake) { g.rect(cx - 9, 32, 7, 5, body[1]); g.rect(cx + 3, 32, 7, 5, body[1]); }
  else { g.line(cx - 6, 33, cx - 8, 38, body[2]); g.line(cx + 6, 33, cx + 8, 38, body[2]); }
  const eye = awake ? (open ? '#ffffff' : '#ff7a2a') : body[1];
  g.rect(cx - 5, 9, 3, 2, eye); g.rect(cx + 3, 9, 3, 2, eye);
  if (open) { g.ellipse(cx, 15, 4, 2.5, '#2a0806'); g.rect(cx - 2, 14, 5, 1, '#ff8a2a'); }
  else g.rect(cx - 3, 15, 7, 1, '#0a0808');
  if (!awake) for (const [x0, y0, x1, y1] of [[cx - 4, 18, cx - 1, 26], [cx + 5, 20, cx + 3, 30]]) g.line(x0, y0, x1, y1, body[1]);
  return g.outline('#060608').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    stone: makeFrame(false, 0, false),
    fly: [0, 1].map((f) => makeFrame(true, f, false)),
    open: makeFrame(true, 0, true),
    plinth: (() => {
      const g = new PixelGrid(34, 12);
      g.rect(1, 1, 32, 10, STONE[2]); g.rect(1, 1, 32, 2, STONE[4]); g.rect(1, 9, 32, 2, STONE[1]);
      return g.outline('#060608').toCanvas();
    })(),
    shadow: makeShadow(26, 8, 0.45),
  };
  return ART;
}

export class GargoylesBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#666a74', '#a6aab4', '#947a78', '#22242a'];
    const x0 = this.x, y0 = this.y;
    this.twins = [-1, 1].map((s) => ({ s, homeX: x0 + s * 70, homeY: y0, x: x0 + s * 70, y: y0, lift: 0, awake: false, open: 0 }));
    this.cur = 0;
    this.twins[0].awake = true;
  }

  frames() { return [art().stone]; }
  portrait() { return art().open; }

  get active() { return this.twins[this.cur]; }

  hitCircles() {
    if (!this.hittable) return [];
    return this.twins.filter((t) => t.awake && t.lift < 30).map((t) => ({ x: t.x, y: t.y, r: 13 }));
  }

  // only the awake one(s) take full damage; stone ones aren't in hitCircles at all
  update(dt, g) {
    super.update(dt, g);
    for (const t of this.twins) t.open = Math.max(0, t.open - dt);
    // the boss's own position follows the awake twin (health bar, status effects)
    const a = this.active;
    this.x = a.x; this.y = a.y;
    this.lift = a.lift;
  }

  idle(dt, g) {
    // the awake one hovers around near the player; the other sits still
    const a = this.active, p = g.player, s = this.def.speed[this.phase - 1] ?? this.def.speed[0];
    a.lift = 12 + Math.sin(this.t * 3) * 3;
    const ang = Math.atan2(a.y - p.y, a.x - p.x) + 0.5;
    const tx = p.x + Math.cos(ang) * 80, ty = p.y + Math.sin(ang) * 56;
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1;
    this.moveTwin(g, a, (dx / d) * s * dt, (dy / d) * s * dt);
    this.vx = this.vy = 0;
  }

  moveTwin(g, t, dx, dy) {
    const room = g.room;
    t.x = Math.max(room.x0 + 14, Math.min(room.R - 14, t.x + dx));
    t.y = Math.max(room.y0 + 14, Math.min(room.B - 14, t.y + dy));
  }

  spit(g, t, n) {
    const p = g.player, base = Math.atan2(p.y - t.y, p.x - t.x);
    for (let i = 0; i < n; i++) g.enemyShoot({ x: t.x, y: t.y, r: 10, z: 12, def: { name: this.name } }, base + (i - (n - 1) / 2) * 0.24, 76, 'ember');
    sfx('enemyShoot');
  }

  attacks() {
    const p2 = this.phase >= 2, tier = this.tier;
    return {
      swoop: (g) => {
        let time = 0, phase = 'rise', dx = 0, dy = 0;
        const a = this.active;
        return {
          update: (dt) => {
            time += dt;
            if (phase === 'rise') {
              a.lift = 12 + Math.min(1, time / 0.75) * 18;
              this.shake = 1;
              [dx, dy] = this.aimAt(g, a);
              this.sparkLine(g, dx, dy, dt, 170, a);
              if (time >= 0.75) { phase = 'dive'; time = 0; sfx('dash'); }
              return false;
            }
            if (phase === 'dive') {
              a.lift = Math.max(2, 30 - time * 140);
              const ox = a.x, oy = a.y;
              this.moveTwin(g, a, dx * 230 * dt, dy * 230 * dt);
              if (Math.random() < dt * 30) g.particles.spawn(a.x, a.y + 4, { z: 2, vz: 10, life: 0.3, color: '#4c5058', size: 2 });
              if ((Math.abs(a.x - ox) < 0.5 && Math.abs(a.y - oy) < 0.5) || time > 1) { phase = 'skid'; time = 0; g.shake(3); sfx('slam'); }
              return false;
            }
            a.lift = 2;
            if (time >= (p2 ? 0.5 : 0.8)) return true;
            return false;
          },
        };
      },
      spit: (g) => this.simple(g, {
        wind: 0.6, after: 0.4, sound: 'crackle',
        onWind: () => { this.active.open = 0.1; },
        fire: () => { this.active.open = 0.3; this.spit(g, this.active, 5 + tier); },
      }),
      swap: (g) => {
        let time = 0, phase = 'home';
        const a = this.active, b = this.twins[1 - this.cur];
        return {
          update: (dt) => {
            time += dt;
            if (phase === 'home') {
              // fly back to its plinth and settle into stone
              const dx = a.homeX - a.x, dy = a.homeY - a.y, d = Math.hypot(dx, dy);
              if (d > 2) this.moveTwin(g, a, (dx / d) * Math.min(d, 160 * dt), (dy / d) * Math.min(d, 160 * dt));
              a.lift = Math.max(0, a.lift - dt * 30);
              if (d <= 2 && a.lift <= 0) { a.awake = false; phase = 'crack'; time = 0; this.cur = this.twins.indexOf(b); sfx('rumble'); }
              return false;
            }
            // the other one cracks awake (0.7 s of grit falling off it)
            this.shake = 2;
            if (Math.random() < dt * 30) g.particles.spawn(b.x + (Math.random() - 0.5) * 20, b.y - 20, { z: 20, vz: 10, life: 0.5, color: '#868a94', size: 2 });
            if (time >= 0.7) {
              g.shake(4);
              sfx('growl');
              this.ring(g, 8 + tier * 2, 60, Math.random() * TAU, 'dust');
              return true;
            }
            b.awake = time > 0.35;
            return false;
          },
        };
      },
      both: (g) => {
        let time = 0, fired = false;
        const other = this.twins[1 - this.cur];
        return {
          update: (dt) => {
            time += dt;
            other.awake = true;
            for (const t of this.twins) t.open = time < 0.7 ? 0.1 : 0.3;
            this.shake = time < 0.7 ? 1 : 0;
            if (time - dt <= 0) sfx('crackle');
            if (!fired && time >= 0.7) { fired = true; for (const t of this.twins) this.spit(g, t, 4 + tier); }
            if (time >= 1.3) { other.awake = false; return true; }
            return false;
          },
        };
      },
    };
  }

  renderShadow(ctx, ox, oy) {
    const a = art();
    for (const t of this.twins) {
      ctx.drawImage(a.plinth, Math.round(t.homeX - 17 + ox), Math.round(t.homeY + 4 + oy));
      ctx.globalAlpha = 1 - Math.min(0.6, t.lift / 60);
      ctx.drawImage(a.shadow, Math.round(t.x - 13 + ox), Math.round(t.y + 6 + oy));
      ctx.globalAlpha = 1;
    }
  }

  render(ctx, ox, oy) {
    const A = art();
    for (const t of [...this.twins].sort((p, q) => p.y - q.y)) {
      let img = !t.awake ? A.stone : t.open > 0 ? A.open : A.fly[Math.floor(this.t * 8) % 2];
      const sx = this.shake && t === this.active ? Math.round((Math.random() - 0.5) * this.shake * 2) : 0;
      const x = Math.round(t.x - img.width / 2 + ox + sx), y = Math.round(t.y + 8 - img.height - t.lift + oy);
      ctx.drawImage(img, x, y);
      if (this.flash > 0 && t.awake) {
        ctx.globalAlpha = 0.6; ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(img, x, y);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
    }
  }
}
