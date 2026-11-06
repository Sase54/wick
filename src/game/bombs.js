// Placed bombs: fuse, flashing, pushable. The explosion itself is resolved by the game
// (it touches tiles, enemies, the player, pickups and secret doors).
import { buildSprite, silhouette, makeShadow } from '../engine/sprites.js';
import { PLACED_BOMB, PICKUP_COLORS } from '../data/pickupSprites.js';
import { moveCircle, HIT_X, HIT_Y } from './collision.js';

export const BOMB_FUSE = 1.6;
export const BOMB_RADIUS = 34;
export const BOMB_DAMAGE = 40;

let ART = null;
function art() {
  if (ART) return ART;
  const frames = PLACED_BOMB.frames.map((f) => buildSprite(f, PICKUP_COLORS));
  ART = { frames, flash: frames.map((f) => silhouette(f, '#ff5a3a')), shadow: makeShadow(12, 4, 0.45) };
  return ART;
}

export class Bomb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 5;
    this.vx = 0;
    this.vy = 0;
    this.fuse = BOMB_FUSE;
    this.age = 0;
    this.done = false;
  }

  update(dt, g) {
    this.age += dt;
    this.fuse -= dt;
    const k = Math.max(0, 1 - 6 * dt);
    this.vx *= k;
    this.vy *= k;
    if (Math.abs(this.vx) + Math.abs(this.vy) > 0.5) {
      const hit = moveCircle(this, this.vx * dt, this.vy * dt, g.room, 'walk');
      if (hit & HIT_X) this.vx = -this.vx * 0.4;
      if (hit & HIT_Y) this.vy = -this.vy * 0.4;
    }
    // Sparks from the fuse
    if (Math.random() < dt * 20) {
      g.particles.spawn(this.x + 1, this.y, { z: 14, vx: (Math.random() - 0.5) * 30, vz: 30, gravity: 120, life: 0.25, color: Math.random() < 0.5 ? '#ffd25a' : '#f08a24' });
    }
    if (this.fuse <= 0 && !this.done) {
      this.done = true;
      g.explode(this.x, this.y, this.radius ?? BOMB_RADIUS, this.damage ?? BOMB_DAMAGE);
    }
  }

  renderShadow(ctx, ox, oy) {
    ctx.drawImage(art().shadow, Math.round(this.x - 6 + ox), Math.round(this.y + 2 + oy));
  }

  render(ctx, ox, oy) {
    const a = art();
    const i = Math.floor(this.age * 10) % a.frames.length;
    const rate = this.fuse < 0.5 ? 20 : this.fuse < 1 ? 10 : 5;
    const flashing = Math.floor(this.age * rate) % 2 === 0;
    const img = flashing ? a.flash[i] : a.frames[i];
    const swell = (this.big ? 1.7 : 1) + Math.max(0, 0.6 - this.fuse) * 0.4;
    const w = Math.round(img.width * swell), h = Math.round(img.height * swell);
    ctx.drawImage(img, Math.round(this.x - w / 2 + ox), Math.round(this.y + 4 - h + oy), w, h);
  }
}
