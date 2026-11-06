// The shop: an old mole sells items and pickups for coins.
import { buildSprite, makeShadow } from '../engine/sprites.js';
import { SHOPKEEPER } from '../data/sprites.js';
import { SHOP_PICKUPS } from '../data/pickups.js';
import { fillPickup } from './consumables.js';
import { Pedestal, itemPrice } from './items.js';
import { Pickup } from './pickups.js';
import { decorSprite } from './roomdecor.js';

let ART = null;
function art() {
  if (!ART) ART = { frames: SHOPKEEPER.frames.map((f) => buildSprite(f, SHOPKEEPER.colors)), shadow: makeShadow(18, 5, 0.45) };
  return ART;
}

export class Shopkeeper {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.t = 0;
  }

  update(dt) { this.t += dt; }

  renderShadow(ctx, ox, oy) {
    ctx.drawImage(art().shadow, Math.round(this.x - 9 + ox), Math.round(this.y + 4 + oy));
  }

  render(ctx, ox, oy) {
    const f = art().frames[Math.floor(this.t * 1.5) % 2];
    ctx.drawImage(f, Math.round(this.x - f.width / 2 + ox), Math.round(this.y - 2 - f.height + oy));
    // he stands behind his counter (a decor sprite, src/game/roomdecor.js)
    const counter = decorSprite('counter');
    if (counter) ctx.drawImage(counter, Math.round(this.x - counter.width / 2 + ox), Math.round(this.y + 10 - counter.height + oy));
  }
}

// Shop slots (S in the layout), left to right: pickup, item, item, pickup.
export function stockShop(game, room) {
  const slots = room.spawns.filter((s) => s.ch === 'S').sort((a, b) => a.x - b.x);
  const items = [...game.floorLoot.shop];
  slots.forEach((s, i) => {
    const edge = i === 0 || i === slots.length - 1;
    if (!edge && items.length) {
      const id = items.shift();
      room.pedestals.push(new Pedestal(s.x, s.y, id, { price: itemPrice(id), bare: true }));
    } else {
      const entry = game.lootRng.weighted(SHOP_PICKUPS);
      const p = fillPickup(game, new Pickup(entry.type, s.x, s.y));
      p.price = entry.price;
      room.pickups.push(p);
    }
  });
}
