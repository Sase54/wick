// The settings screen (a wax slab with the settings list) plus its "reset progress?"
// confirmation. Used by both the title screen and the pause menu.
import { drawText } from './text.js';
import { Menu } from './menu.js';
import { drawWaxPanel, inkAlpha, INK } from './wax.js';
import { createSettingsMenu, SETTING_HINTS } from './settingsMenu.js';
import { sfx } from '../engine/audio.js';
import { VIEW_W, VIEW_H, UI_X, UI_Y } from '../engine/canvas.js';

const LIST = { x: 42 + UI_X, y: 6 + UI_Y, w: 300, h: 202 };
const CONFIRM = { x: 82 + UI_X, y: 56 + UI_Y, w: 220, h: 100 };

export class SettingsPanel {
  // onBack: leave settings. onReset: erase progress (after the player confirms).
  constructor(settings, { onChange, onBack, onReset }) {
    this.page = 'list';
    this.k = 0;
    this.t = 0;
    this.note = 0; // "progress erased" message timer
    this.list = createSettingsMenu(settings, { onChange, onBack, onReset: () => this.goto('confirm') });
    this.confirm = new Menu([
      { label: 'NO, KEEP IT', action: () => this.goto('list') },
      {
        label: 'YES, ERASE IT',
        action: () => {
          onReset();
          sfx('playerDeath');
          this.note = 2.5;
          this.goto('list');
        },
      },
    ], { rowH: 14 });
    this.onBack = onBack;
  }

  open() {
    this.goto('list');
    this.list.sel = 0;
  }

  goto(page) {
    this.page = page;
    this.k = 0;
    if (page === 'confirm') this.confirm.sel = 0;
  }

  update(dt, input) {
    this.t += dt;
    this.k = Math.min(1, this.k + dt * 2.6);
    this.note = Math.max(0, this.note - dt);
    const back = input.consume('back') | input.consume('pause');
    if (this.page === 'confirm') {
      if (back) return this.goto('list');
      this.confirm.update(dt, input);
    } else {
      if (back) return this.onBack();
      this.list.update(dt, input);
    }
  }

  tap(vx, vy) {
    if (this.page === 'confirm') this.confirm.tap(vx, vy);
    else this.list.tap(vx, vy);
  }

  render(ctx, outerK = 1) {
    if (this.page === 'confirm') return this.renderConfirm(ctx, outerK * this.k);
    const S = LIST, k = outerK * this.k;
    drawWaxPanel(ctx, S.x, S.y, S.w, S.h, k, 11);
    const a = inkAlpha(k);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    drawText(ctx, 'SETTINGS', S.x + S.w / 2, S.y + 7, { align: 'center', scale: 2, color: INK.title, shadow: false });
    this.list.t = this.t;
    this.list.layout(S.x + 14, S.y + 28, S.w - 28);
    this.list.render(ctx, a);
    ctx.globalAlpha = a;
    const hint = this.note > 0 ? 'ALL PROGRESS ERASED.' : SETTING_HINTS[this.list.items[this.list.sel].label];
    if (hint) drawText(ctx, hint, S.x + S.w / 2, S.y + S.h - 16, { align: 'center', color: this.note > 0 ? INK.sel : INK.dim, shadow: false });
    ctx.globalAlpha = 1;
  }

  renderConfirm(ctx, k) {
    const C = CONFIRM;
    ctx.fillStyle = 'rgba(6,4,4,0.5)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawWaxPanel(ctx, C.x, C.y, C.w, C.h, k, 17);
    const a = inkAlpha(k);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    drawText(ctx, 'RESET ALL PROGRESS?', C.x + C.w / 2, C.y + 9, { align: 'center', color: INK.sel, shadow: false });
    drawText(ctx, 'UNLOCKS, STATS, MARKS AND', C.x + C.w / 2, C.y + 24, { align: 'center', color: INK.text, shadow: false });
    drawText(ctx, 'RECORDS WILL BE GONE FOREVER.', C.x + C.w / 2, C.y + 34, { align: 'center', color: INK.text, shadow: false });
    this.confirm.t = this.t;
    this.confirm.layout(C.x + 50, C.y + 56, C.w - 100);
    this.confirm.render(ctx, a);
    ctx.globalAlpha = 1;
  }
}
