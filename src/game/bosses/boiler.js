// THE OLD BOILER: a furnace that crawled up out of the cellar floor.
// Phase 1: steam rings, lobbed coals, charges. Phase 2: cracks open, spirals and summons.
import { buildSprite, tint } from '../../engine/sprites.js';
import { sfx } from '../../engine/audio.js';
import { BOILER_ROWS, BOILER_COLORS } from '../../data/bosses.js';
import { ROOM_X, ROOM_Y, ROOM_R, ROOM_B } from '../constants.js';
import { Boss, TAU } from './base.js';

let ART = null;
function art() {
  if (ART) return ART;
  const a = buildSprite(BOILER_ROWS, BOILER_COLORS);
  const b = buildSprite(BOILER_ROWS.map((r) => r.replace(/F/g, '#').replace(/y/g, 'F').replace(/#/g, 'y')), BOILER_COLORS);
  const cracked = [a, b].map((f) => {
    const c = tint(f, '#c0281a', 0.28);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffb03a';
    for (const [x, y, len, dx] of [[9, 7, 6, 1], [27, 9, 7, -1], [6, 17, 5, 1], [29, 18, 6, -1], [17, 6, 3, 0]]) {
      let cx = x;
      for (let i = 0; i < len; i++) {
        ctx.fillRect(cx, y + i, 1, 1);
        if (i % 2) cx += dx;
      }
    }
    return c;
  });
  ART = { normal: [a, b], cracked };
  return ART;
}

export class BoilerBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#9a9aa4', '#6a6a74', '#2a2a30', '#f08a24', '#ffd25a'];
  }

  frames() { return this.phase >= 2 ? art().cracked : art().normal; }

  ambient(dt, g) {
    if (Math.random() < dt * (this.phase === 2 ? 14 : 6)) {
      g.particles.spawn(this.x + (Math.random() - 0.5) * 4, this.y, {
        z: 34, vz: 25 + Math.random() * 15, vx: (Math.random() - 0.5) * 10, gravity: -10, life: 1, size: 2,
        color: this.phase === 2 ? (Math.random() < 0.5 ? '#3a3430' : '#f08a24') : (Math.random() < 0.5 ? '#c4bfb6' : '#8a8580'),
      });
    }
  }

  canUse(name, g) {
    return name !== 'summon' || g.enemies.length < 4;
  }

  attacks() {
    const p2 = this.phase >= 2;
    return {
      ring: (g) => {
        let t = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            this.shake = 1;
            if (t >= 0.7) {
              const n = p2 ? 16 : 12, off = Math.random() * TAU;
              this.ring(g, n, 70, off);
              if (p2) this.ring(g, n, 50, off + Math.PI / n);
              sfx('steam');
              g.effects.ring(this.x, this.y, 40, 'rgba(220,220,230,0.8)', 0.4, 8);
              g.particles.burst(this.x, this.y - 8, 16, { colors: ['#e8e8f0', '#c4bfb6'], speed: 90, z: 16, vz: 30, gravity: -20, life: 0.6, size: 2 });
              g.shake(3);
              return true;
            }
            return false;
          },
        };
      },
      lob: (g) => {
        let t = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            if (t < 0.5) return false;
            const p = g.player, n = p2 ? 5 : 3;
            for (let i = 0; i < n; i++) {
              const tx = Math.max(ROOM_X + 10, Math.min(ROOM_R - 10, p.x + (i ? (Math.random() - 0.5) * 90 : 0)));
              const ty = Math.max(ROOM_Y + 10, Math.min(ROOM_B - 10, p.y + (i ? (Math.random() - 0.5) * 70 : 0)));
              this.lob(g, tx, ty, { flight: 1 + i * 0.12 });
            }
            sfx('lob');
            g.particles.burst(this.x, this.y - 24, 10, { colors: ['#f08a24', '#3a3430'], speed: 40, z: 30, vz: 80 });
            return true;
          },
        };
      },
      charge: (g) => this.chargeAttack(g, {
        speed: p2 ? 215 : 175, stun: 0.9,
        onWall: () => { if (p2) this.ring(g, 8, 75); },
      }),
      spiral: (g) => {
        let t = 0, fire = 0, a = Math.random() * TAU;
        return {
          update: (dt) => {
            t += dt;
            fire -= dt;
            this.vx = this.vy = 0;
            if (fire <= 0) {
              fire = 0.09;
              a += 0.33;
              g.enemyShoot(this, a, 70);
              g.enemyShoot(this, a + Math.PI, 70);
            }
            return t >= 2.4;
          },
        };
      },
      summon: (g) => {
        let t = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            this.shake = 1;
            if (t < 0.6) return false;
            for (let i = 0; i < 3; i++) {
              const a = (i / 3) * TAU + Math.random();
              const e = g.spawnEnemy('mite', this.x + Math.cos(a) * 22, this.y + Math.sin(a) * 16, { delay: 0.3 });
              e.kx = Math.cos(a) * 80;
              e.ky = Math.sin(a) * 80;
            }
            g.particles.burst(this.x, this.y + 4, 16, { colors: ['#3a3430', '#5a524a', '#f08a24'], speed: 60, z: 6, vz: 50 });
            return true;
          },
        };
      },
    };
  }
}
