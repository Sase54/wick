// THE SHRIEKING MOTHER (chapter 2, fits The Grotto): a huge pale bat that roosts in the cave roof.
// It flies around the room, and every attack has a tell:
//   shriek   wings spread, mouth opens, ears glow (0.7 s): two rings of sound, one after the other
//   dive     it rises, the line it will take shows, it dives straight through, then sits dazed
//   roost    shrieks at the ceiling: rocks drop (shadows first) and shriekbats wake up
//   echo     (phase 2) mouth open, shaking: three rings in a row, each one turned a little and
//            a little faster
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';
import { rockRain } from '../hazards.js';

const FUR = ['#2a2220', '#463a36', '#64554e', '#84746a', '#a8968a'];
const WING = ['#1a1214', '#2e2226', '#45343a', '#5e4850'];

function makeFrame(flap, open) {
  const W = 72, H = 44, cx = 36;
  const g = new PixelGrid(W, H);
  // wings: finger bones fanning out, skin between them; flap moves the tips up or down
  const tipY = [6, 14, 24][flap];
  for (const s of [-1, 1]) {
    const pts = [[cx + s * 6, 18], [cx + s * 20, tipY - 2], [cx + s * 33, tipY + 4], [cx + s * 34, tipY + 14], [cx + s * 26, 28], [cx + s * 18, 24], [cx + s * 10, 30]];
    g.poly(pts, (x, y) => ramp(WING, 0.6 + (y - tipY) / 60 - Math.abs(x - cx) / 120, x, y));
    for (const [fx, fy] of [[20, tipY - 2], [33, tipY + 4], [34, tipY + 14]]) g.line(cx + s * 7, 18, cx + s * fx, fy, WING[3]);
  }
  // body and head
  g.ellipse(cx, 24, 9, 11, (nx, ny, x, y) => ramp(FUR, light(nx, ny), x, y));
  g.ellipse(cx, 13, 8, 7, (nx, ny, x, y) => ramp(FUR, light(nx, ny) + 0.15, x, y));
  // tall ears
  for (const s of [-1, 1]) {
    g.poly([[cx + s * 3, 8], [cx + s * 9, -1 + 1], [cx + s * 8, 10]], open ? '#ff6a5a' : FUR[3]);
    g.line(cx + s * 5, 7, cx + s * 8, 2, open ? '#ffd0c0' : '#c89a8a');
  }
  // eyes and mouth
  for (const s of [-1, 1]) g.rect(cx + s * 3 - (s < 0 ? 1 : 0), 11, 2, 2, open ? '#ffffff' : '#ff4a2a');
  if (open) {
    g.ellipse(cx, 17, 3.5, 3, '#2a0808');
    g.set(cx - 2, 15, '#f0e8d8'); g.set(cx + 2, 15, '#f0e8d8');
  } else {
    g.rect(cx - 2, 16, 5, 1, '#2a0808');
    g.set(cx - 1, 17, '#f0e8d8'); g.set(cx + 1, 17, '#f0e8d8');
  }
  // little feet tucked under
  g.rect(cx - 4, 34, 2, 2, FUR[1]); g.rect(cx + 3, 34, 2, 2, FUR[1]);
  return g.outline('#0a0606').toCanvas();
}

let ART = null;
function art() {
  ART ??= { fly: [0, 1, 2, 1].map((f) => makeFrame(f, false)), shriek: [makeFrame(0, true)], dazed: [makeFrame(2, false)] };
  return ART;
}

export class ShriekMotherBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#84746a', '#45343a', '#ff6a5a', '#2a2220'];
    this.def.glowColor = 'rgba(255,90,80,0.45)';
    this.lift = 16;
    this.pose = null;
  }

  frames() { return this.pose ? art()[this.pose] : art().fly; }

  canUse(name, g) { return name !== 'roost' || g.enemies.length < 3; }

  // flutters around the player in a wide circle
  idle(dt, g) {
    const p = g.player, s = this.def.speed[this.phase - 1] ?? this.def.speed[0];
    this.lift = 16 + Math.sin(this.t * 4) * 4;
    const a = Math.atan2(this.y - p.y, this.x - p.x) + 0.7;
    const tx = p.x + Math.cos(a) * 90, ty = p.y + Math.sin(a) * 60;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    this.vx = (dx / d) * s;
    this.vy = (dy / d) * s;
  }

  // a wind-up pose with sound, then `fire` once
  shout(g, wind, fire, after = 0.4) {
    let time = 0, done = false;
    return {
      update: (dt) => {
        time += dt;
        this.vx = this.vy = 0;
        this.pose = 'shriek';
        this.shake = time < wind ? 2 : 0;
        if (time - dt <= 0) sfx('screech');
        if (!done && time >= wind) { done = true; fire(); }
        if (time >= wind + after) { this.pose = null; return true; }
        return false;
      },
    };
  }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    return {
      shriek: (g) => {
        let second = false;
        const a0 = Math.random() * TAU, n = 10 + t * 2;
        const a = this.shout(g, 0.7, () => { this.ring(g, n, 62, a0, 'ghost'); sfx('screech'); }, 0.75);
        return {
          update: (dt) => {
            const done = a.update(dt);
            if (!second && done) {
              second = true;
              this.ring(g, n, 62, a0 + Math.PI / n, 'ghost');
            }
            return done;
          },
        };
      },
      dive: (g) => {
        let time = 0, phase = 'rise', dx = 0, dy = 0;
        return {
          update: (dt) => {
            time += dt;
            if (phase === 'rise') {
              this.vx = this.vy = 0;
              this.lift = 16 + Math.min(1, time / 0.7) * 14;
              this.shake = 1;
              const p = g.player, d = Math.hypot(p.x - this.x, p.y - this.y) || 1;
              dx = (p.x - this.x) / d; dy = (p.y - this.y) / d;
              if (Math.random() < dt * 30) {
                const k = 20 + Math.random() * 140;
                g.particles.spawn(this.x + dx * k, this.y + dy * k, { z: 1, vz: 10, life: 0.3, color: '#ff4a2a', size: 1 });
              }
              if (time >= 0.75) { phase = 'dive'; time = 0; sfx('dash'); }
              return false;
            }
            if (phase === 'dive') {
              this.lift = Math.max(4, 30 - time * 120);
              this.vx = dx * 210; this.vy = dy * 210;
              if (this.lastHit || time > 1.1) {
                phase = 'dazed'; time = 0; this.vx = this.vy = 0;
                if (this.lastHit) { g.shake(4); sfx('slam'); }
              }
              return false;
            }
            this.vx = this.vy = 0;
            this.lift = 4;
            this.pose = 'dazed';
            if (time >= (p2 ? 0.7 : 1)) { this.pose = null; return true; }
            return false;
          },
        };
      },
      roost: (g) => this.shout(g, 0.8, () => {
        g.shake(4);
        rockRain(g, 4 + t, 100, 0.9);
        for (const s of [-1, 1]) {
          const spot = g.room.findFreeSpot(this.x + s * 34, this.y);
          g.spawnEnemy('shriekbat', spot.x, spot.y, { delay: 0.3 });
        }
      }, 0.5),
      echo: (g) => {
        let time = 0, n = 0;
        const a0 = Math.random() * TAU;
        return {
          update: (dt) => {
            time += dt;
            this.vx = this.vy = 0;
            this.pose = 'shriek';
            this.shake = time < 0.6 ? 2 : 0;
            if (time - dt <= 0) sfx('screech');
            while (n < 3 && time >= 0.6 + n * 0.35) {
              this.ring(g, 8 + t, 54 + n * 8, a0 + n * 0.25, 'ghost');
              n++;
            }
            if (time >= 0.6 + 3 * 0.35 + 0.3) { this.pose = null; return true; }
            return false;
          },
        };
      },
    };
  }
}
