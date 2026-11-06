// THE RAT KING: six horned rats knotted together at the tails, wearing a paper crown.
// Charges, whips its tails in a sweeping fan of shots, calls rat pups.
// Phase 2: chained charges and a shrieking ring.
import { buildSprite, flipX, makeCanvas, tint, scale2x } from '../../engine/sprites.js';
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { sfx } from '../../engine/audio.js';
import { ENEMY_SPRITES } from '../../data/enemySprites.js';
import { ITEM_ICONS, ITEM_COLORS } from '../../data/itemSprites.js';
import { Boss, TAU } from './base.js';

const FUR = ['#241c18', '#3a2e28', '#4e3e36', '#5a4a42', '#6e5c52'];

function makeFrame(step, angry) {
  const spr = ENEMY_SPRITES.ratram;
  const frames = spr.anims.idle.map((f) => buildSprite(f, spr.colors));
  const [c, ctx] = makeCanvas(58, 52);
  const cx = 29, cy = 32;
  // one heaving mass of fur that the rats grow out of
  const mass = new PixelGrid(58, 52);
  mass.ellipse(cx, cy, 21, 14, (nx, ny, x, y) => ramp(FUR, light(nx, ny) + ((x * 3 + y * 5) % 7 === 0 ? -0.2 : 0), x, y));
  // knotted tails looping over the top
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + step * 0.2;
    for (let k = 0; k < 14; k++) mass.set(cx + Math.cos(a + k * 0.45) * (3 + k * 0.5), cy - 2 + Math.sin(a + k * 0.45) * (2 + k * 0.35), '#c08a80');
  }
  ctx.drawImage(mass.outline('#160f0c').toCanvas(), 0, 0);
  // rats packed around the knot, facing outward
  const spots = [[-12, -6, 0], [12, -6, 1], [-16, 4, 0], [16, 4, 1], [-7, 11, 0], [7, 11, 1]];
  spots.forEach(([dx, dy, right], i) => {
    const f = frames[(step + i) % 2];
    const img = right ? f : flipX(f);
    ctx.drawImage(img, Math.round(cx + dx - img.width / 2), Math.round(cy + dy - img.height / 2));
  });
  // a big paper crown on top of the pile
  const crown = scale2x(buildSprite(ITEM_ICONS.crown, ITEM_COLORS));
  ctx.drawImage(crown, cx - Math.floor(crown.width / 2), cy - 30);
  return angry ? tint(c, '#c0281a', 0.25) : c;
}

let ART = null;
function art() {
  if (!ART) ART = { normal: [makeFrame(0, false), makeFrame(1, false)], angry: [makeFrame(0, true), makeFrame(1, true)] };
  return ART;
}

export class RatKingBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#5a4a42', '#3a2e28', '#c08a80', '#9a1c20'];
    this.def.glowColor = 'rgba(200,60,40,0.5)';
  }

  frames() { return this.phase >= 2 ? art().angry : art().normal; }

  canUse(name, g) {
    return name !== 'pups' || g.enemies.length < 3;
  }

  attacks() {
    const p2 = this.phase >= 2;
    return {
      charge: (g) => this.chargeAttack(g, { telegraph: 0.5, speed: p2 ? 230 : 190, stun: 0.6, times: p2 ? 2 : 1 }),
      whip: (g) => {
        let t = 0, fired = 0;
        const n = p2 ? 14 : 10, sweep = 2.4, dur = 0.7;
        const base = Math.atan2(g.player.y - this.y, g.player.x - this.x);
        const dir = Math.random() < 0.5 ? 1 : -1;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            this.shake = 1;
            if (t < 0.35) return false;
            const want = Math.min(n, Math.floor(((t - 0.35) / dur) * n) + 1);
            while (fired < want) {
              const a = base + dir * (-sweep / 2 + (fired / (n - 1)) * sweep);
              g.enemyShoot(this, a, 85);
              fired++;
            }
            return fired >= n && t >= 0.35 + dur + 0.2;
          },
        };
      },
      pups: (g) => {
        let t = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            if (t < 0.5) return false;
            for (let i = 0; i < 2; i++) {
              const a = Math.random() * TAU;
              g.spawnEnemy('ratram', this.x + Math.cos(a) * 24, this.y + Math.sin(a) * 18, { delay: 0.3 });
            }
            sfx('enemyShoot');
            return true;
          },
        };
      },
      squeal: (g) => {
        let t = 0;
        return {
          update: (dt) => {
            t += dt;
            this.vx = this.vy = 0;
            this.shake = 3;
            if (t >= 0.6) {
              this.ring(g, 16, 80);
              this.ring(g, 16, 55, Math.PI / 16);
              g.shake(5);
              sfx('bossRoar');
              return true;
            }
            return false;
          },
        };
      },
    };
  }
}
