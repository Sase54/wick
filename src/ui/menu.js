// A list menu for wax panels. Works with keys/gamepad (up/down/left/right/confirm)
// and with taps/clicks (tap a row; on sliders and choices tap the left or right side).
//
// Item kinds:
//   { label, action() }
//   { label, toggle: [get, set] }
//   { label, choice: [get, set], options: [[value, text], ...] }
//   { label, slider: [get, set], min, max, step, fmt(v) }
import { drawText, measureText } from './text.js';
import { INK, drawFlameCursor } from './wax.js';
import { sfx } from '../engine/audio.js';

export class Menu {
  constructor(items, { rowH = 12 } = {}) {
    this.items = items;
    this.rowH = rowH;
    this.sel = 0;
    this.t = 0;
    this.x = 0;
    this.y = 0;
    this.w = 100;
  }

  layout(x, y, w) {
    this.x = x;
    this.y = y;
    this.w = w;
  }

  get height() { return this.items.length * this.rowH; }

  update(dt, input) {
    this.t += dt;
    if (input.consume('up')) { this.sel = (this.sel + this.items.length - 1) % this.items.length; sfx('menuMove'); }
    if (input.consume('down')) { this.sel = (this.sel + 1) % this.items.length; sfx('menuMove'); }
    if (input.consume('left')) this.adjust(-1);
    if (input.consume('right')) this.adjust(1);
    if (input.consume('confirm')) this.activate();
  }

  adjust(dir) {
    const it = this.items[this.sel];
    if (it.slider || it.choice || it.toggle) sfx('menuMove');
    if (it.slider) {
      const [get, set] = it.slider;
      const v = Math.max(it.min, Math.min(it.max, Math.round((get() + dir * it.step) / it.step) * it.step));
      set(+v.toFixed(3));
    } else if (it.choice) {
      const [get, set] = it.choice;
      const i = it.options.findIndex(([v]) => v === get());
      set(it.options[(i + dir + it.options.length) % it.options.length][0]);
    } else if (it.toggle) {
      const [get, set] = it.toggle;
      set(!get());
    }
  }

  activate() {
    const it = this.items[this.sel];
    if (it.action) sfx('menuSelect');
    if (it.action) it.action();
    else if (it.toggle || it.choice) this.adjust(1);
  }

  // Returns true if the tap landed on a row.
  tap(vx, vy) {
    if (vx < this.x || vx > this.x + this.w) return false;
    const row = Math.floor((vy - this.y + 2) / this.rowH);
    if (row < 0 || row >= this.items.length) return false;
    this.sel = row;
    const it = this.items[row];
    if (it.slider || (it.choice && vx > this.x + this.w * 0.45)) {
      // left of the middle of "< value >" goes down, right of it goes up
      const right = this.x + this.w - 4;
      const mid = right - measureText(`< ${this.valueText(it)} >`) / 2;
      this.adjust(vx < mid ? -1 : 1);
    } else {
      this.activate();
    }
    return true;
  }

  valueText(it) {
    if (it.toggle) return it.toggle[0]() ? 'ON' : 'OFF';
    if (it.choice) {
      const v = it.choice[0]();
      return (it.options.find(([o]) => o === v) || it.options[0])[1];
    }
    if (it.slider) {
      const v = it.slider[0]();
      return it.fmt ? it.fmt(v) : String(v);
    }
    return '';
  }

  render(ctx, alpha = 1) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    this.items.forEach((it, i) => {
      const y = this.y + i * this.rowH;
      const sel = i === this.sel;
      const color = sel ? INK.sel : INK.text;
      if (sel) drawFlameCursor(ctx, this.x + 2, y, this.t);
      drawText(ctx, it.label, this.x + 11, y, { color, shadow: false });
      const v = this.valueText(it);
      if (v) {
        const arrows = it.slider || it.choice;
        drawText(ctx, arrows ? `< ${v} >` : v, this.x + this.w - 4, y, { color, shadow: false, align: 'right' });
      }
    });
    ctx.globalAlpha = 1;
  }
}
