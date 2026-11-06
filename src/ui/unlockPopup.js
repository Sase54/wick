// "Unlocked!" popups: a wax tablet drips down from the top with the picture and name of
// whatever was unlocked, holds for a moment, then melts away. Several queue up in order.
import { VIEW_W } from '../engine/canvas.js';
import { sfx } from '../engine/audio.js';
import { drawText, measureText } from './text.js';
import { drawWaxPanel, inkAlpha, INK } from './wax.js';
import { itemIcon } from '../game/items.js';
import { characterPortrait } from '../game/player.js';
import { contentIcon } from '../game/consumables.js';
import { contentName } from '../data/registry.js';

const W = 236, H = 44, DUR = 3.6;

function iconFor(type, id) {
  if (type === 'item') return itemIcon(id);
  if (type === 'character') return characterPortrait(id);
  return contentIcon(type, id);   // trinkets, pills, cards, runes, stones (null for anything else)
}

class UnlockPopups {
  constructor() {
    this.queue = [];
    this.cur = null;
  }

  // Called by progress when an achievement is earned.
  push(achievement) {
    const u = achievement.unlocks[0];
    this.queue.push({
      title: u ? 'UNLOCKED!' : 'ACHIEVEMENT!',
      name: u ? contentName(u.type, u.id) : achievement.name,
      name2: achievement.name,
      how: achievement.how,
      icon: u ? iconFor(u.type, u.id) : null,
      t: 0,
    });
  }

  clear() {
    this.queue.length = 0;
    this.cur = null;
  }

  update(dt) {
    if (!this.cur && this.queue.length) {
      this.cur = this.queue.shift();
      sfx('secret');
    }
    if (this.cur) {
      this.cur.t += dt;
      if (this.cur.t >= DUR) this.cur = null;
    }
  }

  render(ctx) {
    const p = this.cur;
    if (!p) return;
    // forms like the menus, then melts back up at the end
    const k = Math.min(1, p.t / 0.5, (DUR - p.t) / 0.4);
    const x = Math.round(VIEW_W / 2 - W / 2), y = 4;
    drawWaxPanel(ctx, x, y, W, H, k, 31);
    const a = inkAlpha(k);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    let tx = x + 10;
    if (p.icon) {
      ctx.drawImage(p.icon, x + 20 - Math.floor(p.icon.width / 2), y + H / 2 - Math.floor(p.icon.height / 2));
      tx = x + 40;
    }
    drawText(ctx, p.title, tx, y + 5, { color: INK.sel, shadow: false });
    drawText(ctx, p.name, tx, y + 16, { color: INK.title, shadow: false, scale: 2 });
    // "ACHIEVEMENT: how you got it", or just how if that won't fit (cut short as a last resort)
    const room = x + W - 6 - tx;
    let sub = p.name !== p.name2 ? `${p.name2}: ${p.how}` : p.how;
    if (measureText(sub.toUpperCase()) > room) sub = p.how;
    while (measureText(sub.toUpperCase()) > room && sub.length > 4) sub = sub.slice(0, -2) + '.';
    drawText(ctx, sub, tx, y + 33, { color: INK.dim, shadow: false });
    ctx.globalAlpha = 1;
  }
}

export const popups = new UnlockPopups();
