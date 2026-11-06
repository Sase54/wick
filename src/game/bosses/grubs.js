// THE TWIN GRUBS (chapter 1): two blind cellar worms that share one life.
// They burrow, a dirt mound shows where one will pop up, it spits at you, then sinks.
// In phase 2 they surface together. Only a surfaced grub can be hit.
import { PixelGrid, ramp } from '../../engine/pixelgrid.js';
import { makeShadow } from '../../engine/sprites.js';
import { sfx } from '../../engine/audio.js';
import { ROOM_X, ROOM_Y, ROOM_R, ROOM_B } from '../constants.js';
import { Boss } from './base.js';

const SKINS = [
  ['#3a1e1a', '#6a3a30', '#9a5a48', '#c07a64', '#e0a08a'],
  ['#2a2a16', '#4a4a26', '#6a6a3a', '#8a8a52', '#aaaa70'],
];

function makeWorm(skin, open) {
  const W = 22, H = 36, cx = 11;
  const g = new PixelGrid(W, H);
  const cols = SKINS[skin];
  // stacked, slightly swaying segments
  for (let i = 0; i < 6; i++) {
    const y = H - 4 - i * 5;
    const sway = Math.round(Math.sin(i * 0.9) * 1.5);
    const r = 7 - i * 0.35;
    g.ellipse(cx + sway, y, r, 3.6, (nx, ny, x, yy) => ramp(cols, 0.65 - nx * 0.35 - ny * 0.3, x, yy));
  }
  // head with pincers and tiny dead eyes
  const hy = 7;
  g.ellipse(cx, hy, 6.5, 5.5, (nx, ny, x, y) => ramp(cols, 0.75 - nx * 0.3 - ny * 0.3, x, y));
  g.set(cx - 3, hy - 2, '#120c0a');
  g.set(cx + 3, hy - 2, '#120c0a');
  const spread = open ? 4 : 2;
  g.line(cx - 2, hy + 3, cx - spread - 1, hy + 7, '#2a1208');
  g.line(cx + 2, hy + 3, cx + spread + 1, hy + 7, '#2a1208');
  if (open) g.ellipse(cx, hy + 3, 2, 1.5, '#5a0e0e');
  return g.outline('#0b0807').toCanvas();
}

function makeMound() {
  const g = new PixelGrid(26, 10);
  g.ellipse(13, 6, 12, 4, (nx, ny, x, y) => ramp(['#1a1410', '#2e241d', '#4a3e32', '#6a5a48'], 0.6 - ny * 0.5, x, y));
  g.ellipse(13, 6, 5, 2, '#0b0807');
  return g.outline('#0b0807').toCanvas();
}

let ART = null;
function art() {
  if (!ART) {
    ART = {
      worms: [0, 1].map((s) => ({ closed: makeWorm(s, false), open: makeWorm(s, true) })),
      mound: makeMound(),
      shadow: makeShadow(18, 6, 0.4),
    };
  }
  return ART;
}

// A grub's state: under -> mound (telegraph) -> rise -> up -> sink -> under
export class GrubsBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#9a5a48', '#e0a08a', '#6a6a3a', '#4a3e32'];
    this.def.glowColor = 'rgba(200,140,110,0.3)';
    this.worms = [0, 1].map((i) => ({ skin: i, x: this.x + (i ? 40 : -40), y: this.y, state: 'up', t: 0, open: false }));
    this.next = 0;
  }

  frames() { return [art().worms[0].closed]; }
  portrait() { return art().worms[0].open; }

  get surfaced() {
    return this.worms.filter((w) => w.state === 'up' || (w.state === 'rise' && w.t > 0.15));
  }

  get hittable() {
    return !this.dead && !this.dying && this.state !== 'intro' && this.state !== 'enrage' && this.surfaced.length > 0;
  }

  hitCircles() {
    if (!this.hittable) return [];
    return this.surfaced.map((w) => ({ x: w.x, y: w.y - 10, r: this.r + 3 }));
  }

  // After the intro (and between attacks) any grub still above ground goes back under.
  toIdle() {
    super.toIdle();
    for (const w of this.worms) if (w.state === 'up' || w.state === 'rise') { w.state = 'sink'; w.t = 0; w.open = false; }
  }

  enterPhase(n, g) {
    super.enterPhase(n, g);
    for (const w of this.worms) { w.state = 'sink'; w.t = 0; }
  }

  startDying(g) {
    super.startDying(g);
    for (const w of this.worms) { w.state = 'up'; w.t = 0; }
  }

  // Pick a spot for a grub to surface: not too close to Wick or the other grub.
  spot(g, other) {
    const p = g.player;
    for (let i = 0; i < 20; i++) {
      const x = ROOM_X + 30 + Math.random() * (ROOM_R - ROOM_X - 60);
      const y = ROOM_Y + 34 + Math.random() * (ROOM_B - ROOM_Y - 54);
      if (Math.hypot(x - p.x, y - p.y) < 60) continue;
      if (other && Math.hypot(x - other.x, y - other.y) < 50) continue;
      return { x, y };
    }
    return { x: (ROOM_X + ROOM_R) / 2, y: ROOM_Y + 40 };
  }

  update(dt, g) {
    // worms that aren't part of the current attack sink back down
    for (const w of this.worms) {
      if (w.state === 'sink') {
        w.t += dt;
        if (w.t >= 0.3) { w.state = 'under'; w.t = 0; }
      }
    }
    super.update(dt, g);
  }

  // One grub (or both, in phase 2) surfaces, spits, and sinks again.
  popAttack(g, worms) {
    const p2 = this.phase >= 2;
    const t = this.tier;
    let taken = null;
    for (const w of worms) {
      const s = this.spot(g, taken);
      taken = s;
      w.x = s.x; w.y = s.y; w.state = 'mound'; w.t = 0; w.fired = false;
    }
    return {
      update: (dt) => {
        this.vx = this.vy = 0;
        let done = true;
        for (const w of worms) {
          w.t += dt;
          if (w.state === 'mound') {
            if (Math.random() < dt * 20) g.particles.spawn(w.x + (Math.random() - 0.5) * 14, w.y, { z: 1, vz: 40, gravity: 200, life: 0.5, color: '#4a3e32' });
            if (w.t >= 0.75) { w.state = 'rise'; w.t = 0; sfx('rockBreak'); }
          } else if (w.state === 'rise') {
            if (w.t >= 0.25) { w.state = 'up'; w.t = 0; }
          } else if (w.state === 'up') {
            w.open = w.t > 0.25 && w.t < 0.7;
            if (!w.fired && w.t >= 0.45) {
              w.fired = true;
              this.x = w.x; this.y = w.y;
              const base = Math.atan2(g.player.y - (w.y - 10), g.player.x - w.x);
              const n = (p2 ? 5 : 3) + t;
              for (let i = 0; i < n; i++) {
                g.projectiles.spawn({
                  x: w.x, y: w.y - 4, z: 12, vx: Math.cos(base + (i - (n - 1) / 2) * 0.24) * 70, vy: Math.sin(base + (i - (n - 1) / 2) * 0.24) * 70,
                  r: 4, damage: 1, team: 'enemy', range: 220, style: 'blood', source: this.name,
                });
              }
              sfx('enemyShoot');
            }
            if (w.t >= 2.0) { w.state = 'sink'; w.t = 0; }
          }
          if (w.state !== 'sink' && w.state !== 'under') done = false;
        }
        return done;
      },
    };
  }

  attacks() {
    return {
      pop: (g) => {
        const w = this.worms[this.next];
        this.next = 1 - this.next;
        return this.popAttack(g, [w]);
      },
      both: (g) => this.popAttack(g, this.worms),
    };
  }

  renderShadow(ctx, ox, oy) {
    const a = art();
    for (const w of this.worms) {
      if (w.state === 'under') continue;
      ctx.drawImage(a.mound, Math.round(w.x - 13 + ox), Math.round(w.y - 4 + oy));
    }
  }

  render(ctx, ox, oy) {
    const a = art();
    for (const w of this.worms) {
      let k = 0;
      if (w.state === 'rise') k = w.t / 0.25;
      else if (w.state === 'up') k = 1;
      else if (w.state === 'sink') k = 1 - w.t / 0.3;
      if (k <= 0) continue;
      const img = this.flash > 0 ? a.worms[w.skin].open : w.open ? a.worms[w.skin].open : a.worms[w.skin].closed;
      const h = Math.max(1, Math.round(img.height * k));
      const sx = this.shake ? Math.round((Math.random() - 0.5) * this.shake * 2) : 0;
      // draw only the part above the ground
      ctx.drawImage(img, 0, 0, img.width, h, Math.round(w.x - img.width / 2 + ox + sx), Math.round(w.y + 2 - h + oy), img.width, h);
      if (this.flash > 0) {
        ctx.globalAlpha = 0.6;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(img, 0, 0, img.width, h, Math.round(w.x - img.width / 2 + ox), Math.round(w.y + 2 - h + oy), img.width, h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
  }
}

