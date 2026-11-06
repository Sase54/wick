// THE GRAVEDIGGER (chapter 2, fits The Ossuary): a hunched keeper of the catacombs in a rotten
// hood, dragging a huge shovel. Every attack has a tell:
//   fling   digs in (dirt sprays, 0.7 s), then flings a fan of bones and grave dirt
//   cleave  raises the shovel high (the line shows, 0.75 s), slams it: the ground bursts open
//           along that line, one spot after another
//   graves  stabs the shovel down: three mounds of dirt rise around the room (1 s), bonewalkers
//           climb out of them
//   leap    the big jump: lands with a ring of bones
//   bury    (phase 2) digs itself into the floor, the mound chases you, flashes red, it bursts up
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const CLOTH = ['#1a1612', '#2a241c', '#3c3428', '#504636', '#665a46'];
const SKIN = ['#5a5a4a', '#7a7a66', '#9a9a84', '#bcbca4'];
const IRON = ['#2a2a30', '#4a4a52', '#6a6a74', '#9a9aa4'];

function makeFrame(pose, step) {
  const W = 56, H = 54, cx = 26;
  const g = new PixelGrid(W, H);
  // the shovel: a long handle and a wide iron blade
  const shovel = {
    walk: [[cx + 14, 18], [cx + 20, 48]],
    dig: [[cx + 18, 4], [cx + 22, 30]],
    slam: [[cx + 10, 28], [cx + 26, 46]],
  }[pose];
  const [[hx, hy], [bx, by]] = shovel;
  g.line(hx, hy, bx, by, '#4a3020');
  g.line(hx + 1, hy, bx + 1, by, '#6a4630');
  const blade = pose === 'dig' ? [[bx - 4, by - 2], [bx + 5, by - 2], [bx + 4, by + 8], [bx - 3, by + 8]] : [[bx - 5, by - 3], [bx + 5, by - 3], [bx + 4, by + 5], [bx - 4, by + 5]];
  g.poly(blade, (x, y) => ramp(IRON, 0.7 - (y - by) / 14, x, y));
  // legs (stepping)
  const l = step ? 2 : -2;
  g.rect(cx - 7 + l, 40, 4, 10, CLOTH[1]);
  g.rect(cx + 3 - l, 40, 4, 10, CLOTH[1]);
  g.rect(cx - 8 + l, 49, 6, 2, '#1a1410');
  g.rect(cx + 2 - l, 49, 6, 2, '#1a1410');
  // the long ragged coat, hunched forward
  g.poly([[cx - 12, 18], [cx + 10, 16], [cx + 14, 42], [cx + 8, 45], [cx - 2, 43], [cx - 9, 46], [cx - 15, 42]], (x, y) => ramp(CLOTH, 0.8 - (y - 16) / 40 - (x - cx) / 60, x, y));
  for (let x = cx - 14; x < cx + 13; x += 3) g.rect(x, 43 + ((x * 7) % 3), 2, 2, CLOTH[0]);
  // arms reaching for the handle
  const hand = pose === 'dig' ? [hx - 1, hy + 8] : pose === 'slam' ? [hx + 2, hy + 3] : [hx - 1, hy + 6];
  g.line(cx + 6, 22, hand[0], hand[1], CLOTH[3]);
  g.line(cx + 6, 23, hand[0], hand[1] + 1, CLOTH[2]);
  g.ellipse(hand[0], hand[1], 2, 2, SKIN[2]);
  // hood with a pale, sunken face
  g.ellipse(cx - 2, 13, 10, 10, (nx, ny, x, y) => ramp(CLOTH, light(nx, ny) + 0.2, x, y));
  g.ellipse(cx, 15, 6, 6, (nx, ny, x, y) => ramp(SKIN, light(nx, ny) - 0.1, x, y));
  g.rect(cx - 3, 13, 2, 2, pose === 'walk' ? '#1a0a06' : '#ff4a2a');
  g.rect(cx + 2, 13, 2, 2, pose === 'walk' ? '#1a0a06' : '#ff4a2a');
  if (pose === 'walk') { g.set(cx - 2, 13, '#ffd25a'); g.set(cx + 3, 13, '#ffd25a'); }
  g.rect(cx - 2, 18, 5, 1, '#1a0a06');
  for (let i = 0; i < 3; i++) g.set(cx - 1 + i * 1, 19, SKIN[3]);
  return g.outline('#0a0806').toCanvas();
}

let ART = null;
function art() {
  ART ??= { walk: [0, 1].map((s) => makeFrame('walk', s)), dig: [makeFrame('dig', 0)], slam: [makeFrame('slam', 0)] };
  return ART;
}

export class GravediggerBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#504636', '#bcbca4', '#6a6a74', '#3c3428'];
    this.def.glowColor = 'rgba(255,80,40,0.45)';
    this.def.moundColor = '#3a2e22';
    this.pose = null;
  }

  frames() { return this.pose ? art()[this.pose] : art().walk; }

  canUse(name, g) { return name !== 'graves' || g.enemies.length < 2; }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      fling: (g) => {
        let time = 0, fired = false;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.pose = time < 0.7 ? 'slam' : 'dig';
            if (time < 0.7) {
              this.shake = 1;
              if (Math.random() < dt * 30) g.particles.spawn(this.x + 18, this.y + 4, { z: 2, vz: 50, vx: (Math.random() - 0.5) * 40, life: 0.5, color: '#4a3a2a', size: 2 });
            } else if (!fired) {
              fired = true;
              sfx('swing');
              this.spread(g, 6 + t, 0.22, 74, 'bone');
              if (p2) this.spread(g, 5 + t, 0.22, 58, 'dust');
            }
            if (time >= 1.1) { this.pose = null; return true; }
            return false;
          },
        };
      },
      cleave: (g) => {
        let time = 0, step = -1, dx = 0, dy = 0;
        const lines = p2 ? [-0.4, 0, 0.4] : [0];
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.75) {
              this.pose = 'dig';
              this.shake = 1;
              const p = g.player, d = Math.hypot(p.x - this.x, p.y - this.y) || 1;
              dx = (p.x - this.x) / d; dy = (p.y - this.y) / d;
              if (Math.random() < dt * 30) {
                const k = 20 + Math.random() * 170;
                g.particles.spawn(this.x + dx * k, this.y + dy * k, { z: 1, vz: 10, life: 0.3, color: '#ff4a2a', size: 1 });
              }
              return false;
            }
            this.pose = 'slam';
            if (step < 0) { step = 0; g.shake(5); sfx('slam'); }
            // the ground bursts open along the line, one spot every 0.06 s
            while (step < 11 && time >= 0.75 + step * 0.06) {
              for (const off of lines) {
                const a = Math.atan2(dy, dx) + off, k = 24 + step * 16;
                const x = this.x + Math.cos(a) * k, y = this.y + Math.sin(a) * k;
                if (x < g.room.x0 || x > g.room.R || y < g.room.y0 || y > g.room.B) continue;
                g.particles.burst(x, y, 6, { colors: ['#4a3a2a', '#6a5a48', '#c8c0a8'], speed: 40, z: 2, vz: 70 });
                g.effects.ring(x, y, 10, 'rgba(200,180,150,0.6)', 0.2);
                if (g.playerBodies().some((b) => Math.hypot(b.x - x, b.y - y) < 10 + b.r)) g.player.hurt(1, this.name, g, x, y);
              }
              if (step % 3 === 0) sfx('rockFall');
              step++;
            }
            if (time >= 0.75 + 11 * 0.06 + 0.35) { this.pose = null; return true; }
            return false;
          },
        };
      },
      graves: (g) => {
        let time = 0, spots = null;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.pose = 'slam';
            if (!spots) {
              sfx('rumble');
              g.shake(3);
              spots = [0, 1, 2].map(() => {
                const a = Math.random() * TAU, r = 50 + Math.random() * 60;
                return g.room.findFreeSpot(g.player.x + Math.cos(a) * r, g.player.y + Math.sin(a) * r * 0.7);
              });
            }
            for (const s of spots) if (Math.random() < dt * 14) g.particles.spawn(s.x + (Math.random() - 0.5) * 12, s.y + 2, { z: 1, vz: 40, life: 0.45, color: '#4a3a2a', size: 2 });
            if (time >= 1) {
              for (const s of spots.slice(0, p2 ? 3 : 2)) {
                g.spawnEnemy('bonewalker', s.x, s.y, { delay: 0.3 });
                g.particles.burst(s.x, s.y, 10, { colors: ['#4a3a2a', '#c8c0a8'], speed: 50, z: 2, vz: 60 });
              }
              this.pose = null;
              return true;
            }
            return false;
          },
        };
      },
      leap: (g) => this.jumpAttack(g, {
        rise: 0.45, track: 0.75, lock: 0.6, fall: 0.35, height: 120,
        onLand: () => this.ring(g, 10 + t * 2, 62, Math.random() * TAU, 'bone'),
      }),
      bury: (g) => this.burrowAttack(g, {
        track: 1.1, speed: 120,
        onRise: () => { this.ring(g, 12 + t * 2, 60, Math.random() * TAU, 'bone'); },
      }),
    };
  }
}
