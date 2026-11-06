// THE BONE CHOIR (chapter 2, fits The Ossuary): three skulls with candles melted onto their
// crowns, circling each other and singing. One shared health bar; hit any of them.
// Every attack has a tell (the singing skulls glow and open their jaws first):
//   harmony  one skull after another glows and sings a ring of notes
//   chorus   all three glow together, then each sings a little fan at you
//   scatter  they spin up (faster and faster), fly out wide around the room firing outward, and
//            come back together
//   wail     (phase 2) one skull wails: three slow wisps drift after you
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { makeShadow, makeGlow } from '../../engine/sprites.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const BONE = ['#4a4436', '#7a705c', '#a89c84', '#cfc4aa', '#ece4cc'];

function makeSkull(open, tint) {
  const W = 26, H = 30, cx = 13;
  const g = new PixelGrid(W, H);
  // a melted candle on its crown
  g.rect(cx - 2, 2, 5, 8, '#e8dcc0');
  g.rect(cx - 2, 2, 1, 8, '#fff8e8');
  g.set(cx, 0, '#ffd25a'); g.set(cx, 1, '#ff8a2a');
  g.rect(cx - 4, 9, 9, 2, '#e8dcc0');
  // the skull
  g.ellipse(cx, 16, 10, 8, (nx, ny, x, y) => ramp(BONE, light(nx, ny) + 0.1, x, y));
  g.rect(cx - 6, 21, 13, 4, BONE[2]);
  // sockets that light up when it sings
  for (const s of [-1, 1]) {
    g.ellipse(cx + s * 4, 16, 2.6, 2.4, '#140c08');
    if (tint) g.set(cx + s * 4, 16, tint);
  }
  g.set(cx, 19, '#140c08'); g.set(cx, 20, '#140c08');
  // teeth and a jaw that drops open
  for (let i = -2; i <= 2; i++) g.rect(cx + i * 2, 23, 1, 2, BONE[4]);
  const jy = open ? 27 : 25;
  if (open) g.rect(cx - 5, 25, 11, 2, '#140c08');
  g.rect(cx - 5, jy, 11, 3, BONE[1]);
  for (let i = -2; i <= 2; i++) g.rect(cx + i * 2, jy - 1, 1, 1, BONE[4]);
  return g.outline('#0a0806').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    shut: makeSkull(false, '#ffd25a'),
    sing: makeSkull(true, '#ffffff'),
    glow: makeSkull(false, '#ff4a2a'),
    shadow: makeShadow(18, 6, 0.45),
    halo: makeGlow(22, 'rgba(255,200,120,0.6)'),
  };
  return ART;
}

export class BoneChoirBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#cfc4aa', '#7a705c', '#ffd25a', '#4a4436'];
    this.spin = 0;
    this.spinSpeed = 1.2;
    this.reach = 26;
    this.skulls = [0, 1, 2].map((i) => ({ i, x: this.x, y: this.y, glow: 0, sing: 0 }));
    this.placeSkulls(0);
  }

  frames() { return [art().shut]; }

  placeSkulls(dt) {
    this.spin += dt * this.spinSpeed * (this.phase >= 2 ? 1.4 : 1);
    for (const s of this.skulls) {
      const a = this.spin + (s.i / 3) * TAU;
      s.x = this.x + Math.cos(a) * this.reach;
      s.y = this.y + Math.sin(a) * this.reach * 0.7;
      s.glow = Math.max(0, s.glow - dt);
      s.sing = Math.max(0, s.sing - dt);
    }
  }

  hitCircles() {
    if (!this.hittable) return [];
    return this.skulls.map((s) => ({ x: s.x, y: s.y, r: 10 }));
  }

  update(dt, g) {
    super.update(dt, g);
    this.placeSkulls(dt);
    // keep the circle inside the room
    const room = g.room, m = this.reach + 12;
    this.x = Math.max(room.x0 + m, Math.min(room.R - m, this.x));
    this.y = Math.max(room.y0 + m * 0.7, Math.min(room.B - m * 0.7, this.y));
  }

  // a shot from one skull
  sing(g, s, angle, speed, style = 'ghost') {
    g.enemyShoot({ x: s.x, y: s.y, r: 8, z: 14, def: { name: this.name } }, angle, speed, style);
  }
  aimFrom(g, s) { return Math.atan2(g.player.y - s.y, g.player.x - s.x); }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      harmony: (g) => {
        let time = 0, n = 0;
        const order = [0, 1, 2].sort(() => Math.random() - 0.5);
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            // each skull glows for 0.5 s, then sings a ring
            const cur = Math.floor(time / 0.55);
            if (cur < 3 && this.skulls[order[cur]].glow < 0.05) { this.skulls[order[cur]].glow = 0.5; sfx('chime'); }
            while (n < 3 && time >= 0.5 + n * 0.55) {
              const s = this.skulls[order[n]];
              s.sing = 0.3;
              const k = 6 + t + (p2 ? 2 : 0), off = Math.random() * TAU;
              for (let i = 0; i < k; i++) this.sing(g, s, off + (i / k) * TAU, 58);
              n++;
            }
            return time >= 0.5 + 3 * 0.55;
          },
        };
      },
      chorus: (g) => {
        let time = 0, fired = false;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.8) {
              for (const s of this.skulls) s.glow = 0.1;
              this.shake = 1;
              if (time - dt <= 0) sfx('wail');
              return false;
            }
            if (!fired) {
              fired = true;
              for (const s of this.skulls) {
                s.sing = 0.4;
                const base = this.aimFrom(g, s), k = p2 ? 3 : 2;
                for (let i = 0; i < k; i++) this.sing(g, s, base + (i - (k - 1) / 2) * 0.28, 76);
              }
            }
            return time >= 1.2;
          },
        };
      },
      scatter: (g) => {
        let time = 0, shotT = 0;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.7) {
              // spinning up: the tell
              this.spinSpeed = 1.2 + time * 6;
              for (const s of this.skulls) s.glow = 0.1;
              if (time - dt <= 0) sfx('rattle');
              return false;
            }
            const out = time < 2.6;
            this.reach += ((out ? 78 : 26) - this.reach) * Math.min(1, dt * 3);
            this.spinSpeed = out ? 2.4 : 1.2;
            shotT -= dt;
            if (out && shotT <= 0) {
              shotT = p2 ? 0.28 : 0.4;
              for (const s of this.skulls) {
                s.sing = 0.15;
                this.sing(g, s, Math.atan2(s.y - this.y, s.x - this.x), 60);
              }
            }
            if (time >= 3.4) { this.reach = 26; this.spinSpeed = 1.2; return true; }
            return false;
          },
        };
      },
      wail: (g) => {
        let time = 0, fired = false;
        const s = this.skulls[Math.floor(Math.random() * 3)];
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.7) { s.glow = 0.1; s.sing = 0.1; if (time - dt <= 0) sfx('wail'); return false; }
            if (!fired) {
              fired = true;
              const base = this.aimFrom(g, s);
              for (let i = 0; i < 3 + t; i++) {
                const a = base + (i - 1) * 0.7;
                g.projectiles.spawn({
                  x: s.x, y: s.y, z: 14, vx: Math.cos(a) * 44, vy: Math.sin(a) * 44,
                  r: 4, damage: 1, team: 'enemy', range: 280, source: this.name, style: 'ghost', seek: 1.5,
                });
              }
              sfx('enemyShoot');
            }
            return time >= 1.1;
          },
        };
      },
    };
  }

  renderShadow(ctx, ox, oy) {
    const a = art();
    for (const s of this.skulls) ctx.drawImage(a.shadow, Math.round(s.x - 9 + ox), Math.round(s.y + 6 + oy));
  }

  render(ctx, ox, oy) {
    const a = art();
    // back skulls first
    for (const s of [...this.skulls].sort((p, q) => p.y - q.y)) {
      const bob = Math.round(Math.sin(this.t * 3 + s.i * 2) * 2);
      let img = s.sing > 0 ? a.sing : s.glow > 0 ? a.glow : a.shut;
      const x = Math.round(s.x - img.width / 2 + ox + (this.shake ? (Math.random() - 0.5) * 2 : 0));
      const y = Math.round(s.y - 22 - img.height / 2 + bob + oy);
      if (s.glow > 0 || s.sing > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 30);
        ctx.drawImage(a.halo, Math.round(s.x - 22 + ox), Math.round(s.y - 22 - 22 + bob + oy));
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(img, x, y);
      if (this.flash > 0) {
        ctx.globalAlpha = 0.6;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(img, x, y);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
  }
}
