// THE GROTTO MAW (chapter 2, fits The Grotto): a boulder-sized head made of stone, all jaw and
// crystal teeth. It lives in the rock. Every attack has a tell:
//   burrow   sinks into the floor, a mound chases you, stops and flashes red, it bursts up there
//            (a ring of stones)
//   gnash    jaw opens wide and the crystals glow, then a fan of crystal shards (twice in phase 2)
//   quake    rears back shaking, slams its chin down: rocks fall from the ceiling around you (their
//            shadows show where) plus a ring of stones
//   roll     (phase 2) tucks in, the line it will take shows, rolls across the room bouncing off
//            the walls three times, dizzy after
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';
import { rockRain } from '../hazards.js';

const STONE = ['#1e1a16', '#332d26', '#4a4238', '#62584b', '#7c705f', '#968a76'];
const CRYS = ['#1e4a7a', '#3a86c0', '#7ac4f0', '#d8f4ff'];

function makeFrame(open, glow, f) {
  const W = 60, H = 50, cx = 30;
  const g = new PixelGrid(W, H);
  // the skull of rock: a big lumpy dome
  g.ellipse(cx, 22, 25, 19, (nx, ny, x, y) => ramp(STONE, light(nx, ny) + ((x * 7 + y * 3) % 11 === 0 ? -0.2 : 0), x, y));
  // brow ridge and deep-set glowing eyes
  g.rect(cx - 18, 15, 36, 3, STONE[1]);
  for (const s of [-1, 1]) {
    g.ellipse(cx + s * 9, 19, 4.5, 3, '#0a0806');
    const eye = glow ? '#ffffff' : '#ffd25a';
    g.rect(cx + s * 9 - 1, 18 + (f % 2), 3, 2, eye);
  }
  // crystals growing out of its back
  for (const [x, y, h] of [[-16, 8, 9], [-9, 3, 12], [0, 1, 14], [9, 3, 11], [16, 7, 8]]) {
    for (let k = 0; k < h; k++) {
      const w = Math.max(1, Math.round((h - k) / 3));
      g.rect(cx + x - Math.floor(w / 2), y - k + 6, w, 1, glow ? CRYS[Math.min(3, 2 + (k > h / 2))] : CRYS[k > h * 0.6 ? 2 : 1]);
    }
  }
  // the jaw: hinged open more or less
  const jy = 30 + open * 8;
  g.ellipse(cx, jy + 6, 21, 9, (nx, ny, x, y) => ramp(STONE, light(nx, ny) - 0.1, x, y));
  if (open > 0) {
    g.rect(cx - 16, 30, 32, jy - 28, '#120806');
    g.rect(cx - 14, 31, 28, Math.max(1, jy - 31), '#3a1410');
    if (glow) g.ellipse(cx, 31 + (jy - 30) / 2, 8, Math.max(1, (jy - 31) / 2), '#7ac4f0');
  }
  // crystal teeth, upper and lower
  for (let i = -3; i <= 3; i++) {
    const tx = cx + i * 4;
    for (let k = 0; k < 4; k++) g.rect(tx - (k < 2 ? 1 : 0), 29 + k, k < 2 ? 3 : 1, 1, CRYS[3 - Math.min(2, k)]);
    for (let k = 0; k < 3; k++) g.rect(tx + 1 - (k < 1 ? 1 : 0), jy - k, k < 1 ? 3 : 1, 1, CRYS[3 - k]);
  }
  return g.outline('#0a0806').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    idle: [0, 1].map((f) => makeFrame(0, false, f)),
    open: [makeFrame(1, false, 0)],
    glow: [0, 1].map((f) => makeFrame(1, true, f)),
    rage: [0, 1].map((f) => makeFrame(0.4, true, f)),
  };
  return ART;
}

export class GrottoMawBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#4a4238', '#7c705f', '#7ac4f0', '#1e1a16'];
    this.def.glowColor = 'rgba(90,170,255,0.5)';
    this.def.moundColor = '#3a332b';
    this.pose = null;
  }

  frames() {
    if (this.pose) return art()[this.pose];
    return this.phase >= 2 ? art().rage : art().idle;
  }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      burrow: (g) => this.burrowAttack(g, {
        track: p2 ? 1 : 1.3, speed: p2 ? 130 : 110,
        onRise: () => this.ring(g, 10 + t * 2, 64, Math.random() * TAU, 'dust'),
      }),
      gnash: (g) => {
        let time = 0, fired = 0;
        const volleys = p2 ? 2 : 1;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.pose = 'glow';
            this.shake = time < 0.7 ? 1 : 0;
            if (time > 0.05 && time - dt <= 0.05) sfx('chime');
            if (fired < volleys && time >= 0.7 + fired * 0.45) {
              this.spread(g, 7 + t, 0.2, 80, 'ice');
              sfx('enemyShoot');
              fired++;
            }
            if (time >= 0.7 + volleys * 0.45) { this.pose = null; return true; }
            return false;
          },
        };
      },
      quake: (g) => {
        let time = 0, done = false;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            if (time < 0.8) { this.shake = 3; this.lift = Math.min(10, time * 16); this.pose = 'open'; return false; }
            if (!done) {
              done = true;
              this.lift = 0;
              this.pose = null;
              this.land(g, 7);
              rockRain(g, 6 + t + (p2 ? 2 : 0), 90, 0.85);
              this.ring(g, 8, 58, Math.random() * TAU, 'dust');
            }
            return time > 1.4;
          },
        };
      },
      roll: (g) => {
        let time = 0, phase = 'wind', dx = 0, dy = 0, bounces = 3;
        return {
          update: (dt) => {
            time += dt;
            if (phase === 'wind') {
              this.vx = this.vy = 0;
              this.shake = 2;
              this.pose = 'rage';
              const p = g.player, d = Math.hypot(p.x - this.x, p.y - this.y) || 1;
              dx = (p.x - this.x) / d; dy = (p.y - this.y) / d;
              if (Math.random() < dt * 30) {
                const k = 20 + Math.random() * 100;
                g.particles.spawn(this.x + dx * k, this.y + dy * k, { z: 1, vz: 15, life: 0.3, color: '#ff4a2a', size: 1 });
              }
              if (time >= 0.75) { phase = 'roll'; time = 0; sfx('rumble'); }
              return false;
            }
            if (phase === 'roll') {
              this.vx = dx * 175; this.vy = dy * 175;
              if (Math.random() < dt * 30) g.particles.spawn(this.x - dx * this.r, this.y + 8, { z: 2, vz: 20, life: 0.4, color: '#4a4238', size: 2 });
              if (this.lastHit && time > 0.05) {
                if (this.lastHit & 1) dx = -dx;
                if (this.lastHit & 2) dy = -dy;
                time = 0;
                g.shake(5);
                sfx('slam');
                rockRain(g, 2, 70);
                if (--bounces < 0) { phase = 'dizzy'; this.vx = this.vy = 0; }
              }
              return false;
            }
            this.vx = this.vy = 0;
            this.pose = 'open';
            if (Math.random() < dt * 6) g.particles.spawn(this.x + (Math.random() - 0.5) * 20, this.y - 40, { z: 30, vz: 0, life: 0.5, color: '#ffd25a', size: 2 });
            if (time >= 1.3) { this.pose = null; return true; }
            return false;
          },
        };
      },
    };
  }
}
