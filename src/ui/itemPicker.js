// Debug item picker (I with ?debug): every item in a grid on the left, the chosen one's
// details on the right. Arrows / WASD move, Enter / Space takes it (the picker stays open so you
// can take several), Esc closes. On a phone: tap an item to see it, tap it again to take it.
import { VIEW_W, VIEW_H } from '../engine/canvas.js';
import { ITEMS } from '../data/items.js';
import { itemIcon, describeItem } from '../game/items.js';
import { drawWaxPanel, INK } from './wax.js';
import { drawText, wrapText } from './text.js';

const POOL_NAMES = {
  treasure: 'TREASURE', shop: 'SHOP', boss: 'BOSS', secret: 'SECRET', library: 'LIBRARY',
  planetarium: 'ORRERY', devil: 'BARGAIN', angel: 'VIGIL',
};
export const Q_COLORS = ['#8a8580', '#9a8462', '#5a2410', '#2a4aa0', '#a02810'];

const P = { x: 8, y: 8, w: VIEW_W - 16, h: VIEW_H - 16 };
const COLS = 6, ROWS = 6, CELL = 26;
const GX = P.x + 10, GY = P.y + 20;          // top-left of the grid
const DX = GX + COLS * CELL + 10;             // left edge of the details

export class ItemPicker {
  constructor(game) {
    this.game = game;
    this.custom = true;          // drawn by itself (game.renderDebugMenu)
    this.ids = Object.keys(ITEMS);
    this.sel = 0;
    this.scroll = 0;
    this.t = 0;
    this.flash = 0;
  }

  move(dx, dy) {
    const n = this.ids.length;
    this.sel = Math.max(0, Math.min(n - 1, this.sel + dx + dy * COLS));
    const row = Math.floor(this.sel / COLS);
    if (row < this.scroll) this.scroll = row;
    if (row >= this.scroll + ROWS) this.scroll = row - ROWS + 1;
  }

  take() {
    const id = this.ids[this.sel];
    this.game.itemPools.taken.add(id);
    this.game.giveItem(id);
    this.flash = 0.4;
  }

  update(dt, input) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (input.consume('left')) this.move(-1, 0);
    if (input.consume('right')) this.move(1, 0);
    if (input.consume('up')) this.move(0, -1);
    if (input.consume('down')) this.move(0, 1);
    if (input.consume('confirm') || input.consume('active')) this.take();
  }

  tap(x, y) {
    const c = Math.floor((x - GX) / CELL), r = Math.floor((y - GY) / CELL);
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
      const i = (r + this.scroll) * COLS + c;
      if (i >= this.ids.length) return;
      if (i === this.sel) this.take();
      else this.sel = i;
      return;
    }
    // the little arrows to scroll, and the close cross
    if (x >= GX && x < GX + COLS * CELL && y < GY) this.move(0, -ROWS);
    else if (x >= GX && x < GX + COLS * CELL && y >= GY + ROWS * CELL) this.move(0, ROWS);
    else if (x > P.x + P.w - 18 && y < P.y + 16) this.game.debugMenu = null;
  }

  render(ctx) {
    drawWaxPanel(ctx, P.x, P.y, P.w, P.h, 1, 23);
    drawText(ctx, 'DEBUG: TAKE AN ITEM', P.x + 10, P.y + 6, { color: INK.title, shadow: false });
    drawText(ctx, 'X', P.x + P.w - 12, P.y + 6, { color: INK.dim, shadow: false });

    // the grid
    const rows = Math.ceil(this.ids.length / COLS);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = (r + this.scroll) * COLS + c;
        if (i >= this.ids.length) continue;
        const id = this.ids[i], x = GX + c * CELL, y = GY + r * CELL;
        const sel = i === this.sel;
        ctx.fillStyle = sel ? 'rgba(160,40,16,0.35)' : 'rgba(58,36,24,0.12)';
        ctx.fillRect(x, y, CELL - 2, CELL - 2);
        if (sel) {
          ctx.fillStyle = Math.floor(this.t * 4) % 2 ? INK.sel : '#d05a20';
          ctx.fillRect(x, y, CELL - 2, 1); ctx.fillRect(x, y + CELL - 3, CELL - 2, 1);
          ctx.fillRect(x, y, 1, CELL - 2); ctx.fillRect(x + CELL - 3, y, 1, CELL - 2);
        }
        if (this.game.player.items.includes(id) || this.game.player.active?.id === id) {
          ctx.fillStyle = '#5a8a34'; ctx.fillRect(x + CELL - 6, y + 1, 3, 3);   // already held
        }
        const icon = itemIcon(id);
        ctx.drawImage(icon, Math.round(x + (CELL - 2 - icon.width) / 2), Math.round(y + (CELL - 2 - icon.height) / 2));
      }
    }
    // scroll marks
    if (this.scroll > 0) drawText(ctx, '^', GX + (COLS * CELL) / 2, GY - 9, { align: 'center', color: INK.dim, shadow: false });
    if (this.scroll + ROWS < rows) drawText(ctx, 'V', GX + (COLS * CELL) / 2, GY + ROWS * CELL, { align: 'center', color: INK.dim, shadow: false });

    // the details
    const id = this.ids[this.sel], d = ITEMS[id];
    const icon = itemIcon(id);
    const bob = Math.round(Math.sin(this.t * 3) * 1.5);
    ctx.drawImage(icon, DX, P.y + 20 + bob, icon.width * 2, icon.height * 2);
    const tx = DX + icon.width * 2 + 8, tw = P.x + P.w - 10 - tx;
    const nameLines = wrapText(d.name.toUpperCase(), tw);
    nameLines.slice(0, 2).forEach((l, i) => drawText(ctx, l, tx, P.y + 22 + i * 9, { color: INK.title, shadow: false }));
    const qy = P.y + 22 + Math.min(2, nameLines.length) * 9 + 2;
    drawText(ctx, `QUALITY ${d.quality}`, tx, qy, { color: Q_COLORS[d.quality], shadow: false });
    drawText(ctx, d.type === 'active' ? 'ACTIVE' : 'PASSIVE', tx + 60, qy, { color: INK.dim, shadow: false });
    const pools = Object.keys(d.pools).map((k) => POOL_NAMES[k] || k.toUpperCase()).join(', ') || (d.starter ? 'CHARACTER STARTER' : '-');
    wrapText(pools, tw).slice(0, 2).forEach((l, i) => drawText(ctx, l, tx, qy + 10 + i * 9, { color: INK.dim, shadow: false }));

    let y = P.y + 74;
    const w = P.x + P.w - 10 - DX;
    for (const l of wrapText(`"${d.desc.toUpperCase()}"`, w)) { drawText(ctx, l, DX, y, { color: INK.sel, shadow: false }); y += 9; }
    y += 4;
    for (const line of describeItem(id)) {
      ctx.fillStyle = INK.dim; ctx.fillRect(DX + 1, y + 2, 2, 2);
      for (const l of wrapText(line, w - 6)) {
        if (y > P.y + P.h - 22) break;
        drawText(ctx, l, DX + 6, y, { color: INK.text, shadow: false });
        y += 9;
      }
    }

    const hint = this.game.touch.enabled ? 'TAP TO SEE, TAP AGAIN TO TAKE' : 'ARROWS: CHOOSE   ENTER: TAKE   ESC: CLOSE';
    drawText(ctx, hint, P.x + P.w / 2, P.y + P.h - 12, { align: 'center', color: INK.dim, shadow: false });
    if (this.flash > 0) drawText(ctx, 'TAKEN!', DX + icon.width, P.y + 64, { align: 'center', color: '#5a8a34', shadow: false });
  }
}
