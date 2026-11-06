// Floor pickups: coins, bombs, keys, hearts. They pop out, bounce, slide and get collected on touch.
import { buildSprite, makeShadow } from '../engine/sprites.js';
import { PICKUP_SPRITES, PICKUP_COLORS } from '../data/pickupSprites.js';
import { PICKUPS, HEART_KINDS } from '../data/pickups.js';
import { moveCircle, HIT_X, HIT_Y } from './collision.js';
import { drawText } from '../ui/text.js';
import { consumableIcon, trinketIcon, batteryIcon } from './consumables.js';
import { itemDef } from './items.js';

const chargeMax = (s) => itemDef(s.id).active?.charge ?? 0;
const needsCharge = (p) => [p.active, p.pocket].find((s) => s && !itemDef(s.id).active?.costHealth && s.charge < chargeMax(s));

const GRAVITY = 420;
let ART = null;
function art() {
  if (ART) return ART;
  ART = { shadow: makeShadow(13, 5, 0.4) };
  for (const [k, frames] of Object.entries(PICKUP_SPRITES)) ART[k] = frames.map((f) => buildSprite(f, PICKUP_COLORS));
  return ART;
}

export function pickupIcon(type, it = null) {
  if (it?.cons) return consumableIcon(it.cons);
  if (it?.trinket) return trinketIcon(it.trinket);
  if (PICKUPS[type].kind === 'battery') return batteryIcon(type === 'batteryFull');
  return art()[PICKUPS[type].sprite][0];
}

export class Pickup {
  constructor(type, x, y, { vx = 0, vy = 0, vz = 0, z = 0 } = {}) {
    this.type = type;
    this.def = PICKUPS[type];
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.r = 6;
    this.t = Math.random() * 3;
    this.age = 0;
    this.collected = false;
    this.price = 0; // shop items set this (M5)
    this.cons = null;     // a pill, card, rune or stone (src/game/consumables.js)
    this.trinket = null;  // { id, golden }
  }

  setType(type) {
    this.type = type;
    this.def = PICKUPS[type];
    this.cons = null;
    this.trinket = null;
  }

  update(dt, g) {
    this.age += dt;
    this.t += dt;
    if (this.price) return; // shop stock stays put
    if (this.def.fades && this.age > this.def.fades) { this.collected = true; return; }
    if (this.z > 0 || this.vz !== 0) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = Math.abs(this.vz) > 50 ? -this.vz * 0.35 : 0;
      }
    }
    const k = Math.max(0, 1 - (this.z > 0 ? 0.8 : 5) * dt);
    this.vx *= k;
    this.vy *= k;
    if (Math.abs(this.vx) + Math.abs(this.vy) > 0.5) {
      const hit = moveCircle(this, this.vx * dt, this.vy * dt, g.room, 'walk');
      if (hit & HIT_X) this.vx = -this.vx * 0.5;
      if (hit & HIT_Y) this.vy = -this.vy * 0.5;
    }
  }

  canCollect(p) {
    const h = p.health;
    switch (this.def.kind) {
      case 'heart': return h.canHealRed();
      case 'ash': case 'soot': return h.canAddSoul();
      case 'vigil': return h.canAddEternal();
      case 'brass': return h.canAddGolden();
      case 'rib': return h.canAddBone();
      case 'moldy': return h.canAddRotten();
      case 'coin': return p.coins < 99;
      case 'bomb': return p.bombs < 99;
      case 'key': return p.keys < 99;
      case 'battery': return !!needsCharge(p);
      default: return true;
    }
  }

  apply(p) {
    const v = this.def.value, h = p.health;
    switch (this.def.kind) {
      case 'heart': h.healRed(v); break;
      case 'ash': h.addSoul(v, 'soul'); break;
      case 'soot': h.addSoul(v, 'black'); break;
      case 'vigil': h.addEternal(); break;
      case 'brass': h.addGolden(v); break;
      case 'rib': h.addBone(0); break;
      case 'moldy': h.addRotten(v); break;
      case 'coin': p.coins = Math.min(99, p.coins + v); break;
      case 'bomb': p.bombs = Math.min(99, p.bombs + v); break;
      case 'key': p.keys = Math.min(99, p.keys + v); break;
      case 'battery': { const s = needsCharge(p); s.charge = Math.min(chargeMax(s), s.charge + v); break; }
    }
  }

  get image() {
    if (!this.def.sprite) return pickupIcon(this.type, this);
    const frames = art()[this.def.sprite];
    return frames[Math.floor(this.t * 9) % frames.length];
  }

  renderShadow(ctx, ox, oy) {
    const s = art().shadow;
    ctx.drawImage(s, Math.round(this.x - 6 + ox), Math.round(this.y + 2 + oy));
  }

  render(ctx, ox, oy) {
    if (this.def.fades && this.age > this.def.fades - 1.5 && Math.floor(this.age * 10) % 2) return;
    const img = this.image;
    const bob = HEART_KINDS.has(this.def.kind) ? Math.round(Math.sin(this.t * 4)) : 0;
    const x = Math.round(this.x - img.width / 2 + ox);
    const y = Math.round(this.y + 4 - img.height - this.z + oy) + bob;
    if (this.def.double) ctx.drawImage(img, x - 3, y - 2);
    ctx.drawImage(img, x, y);
    // occasional glint
    if (Math.floor(this.t * 3) % 7 === 0 && this.z === 0) {
      ctx.fillStyle = '#fffbea';
      ctx.fillRect(x + 3, y + 2, 1, 1);
      ctx.fillRect(x + 2, y + 3, 3, 1);
      ctx.fillRect(x + 3, y + 4, 1, 1);
    }
    if (this.price) drawText(ctx, `${this.price}C`, Math.round(this.x + ox), Math.round(this.y + 8 + oy), { align: 'center', color: '#f0c040' });
  }
}
