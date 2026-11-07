// Pause screen: two wax slabs drip down and set. Left: options and seed.
// Right: Wick's stats and every item collected, in a grid: pick one (arrows, or tap it on a phone)
// and its page slides over the left slab: name, quality, its line and the longer story.
// Settings get their own slab.
import { VIEW_W, VIEW_H, UI_X, UI_Y } from '../engine/canvas.js';
import { drawText, wrapText } from './text.js';
import { Menu } from './menu.js';
import { drawWaxPanel, inkAlpha, INK } from './wax.js';
import { SettingsPanel } from './settingsPanel.js';
import { progress } from '../game/progress.js';
import { popups } from './unlockPopup.js';
import { clearStore } from '../engine/storage.js';
import { statIcon, formatStat, STAT_ORDER } from './statIcons.js';
import { STAT_LABELS } from '../game/stats.js';
import { itemIcon, activeCost, describeItem } from '../game/items.js';
import { ITEMS } from '../data/items.js';
import { TRINKETS } from '../data/trinkets.js';
import { TRANSFORMATIONS } from '../data/transformations.js';
import { makeCanvas } from '../engine/sprites.js';
import { Player } from '../game/player.js';
import { Q_COLORS } from './itemPicker.js';
import { trinketIcon } from '../game/consumables.js';
import { sfx } from '../engine/audio.js';

const LEFT = { x: 18 + UI_X, y: 14 + UI_Y, w: 152, h: 126 };
const RIGHT = { x: 184 + UI_X, y: 14 + UI_Y, w: 182, h: 186 };
const INFO = { x: 18 + UI_X, y: 14 + UI_Y, w: 152, h: 186 };   // the page of the item looked at (over LEFT)
// the item grid in RIGHT; more rows than fit scroll
const COLS = 7, ROWS = 3, CELL_W = 25, CELL_H = 26;
const GRID = { x: RIGHT.x + 4, y: RIGHT.y + 82 };
const SCROLL_X = RIGHT.x + RIGHT.w - 10;

export class PauseScreen {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.k = 0;          // panel formation 0..1
    this.pageK = 1;      // formation of the current page's panel
    this.page = 'main';
    this.t = 0;
    this.focus = null;   // index of the grid entry looked at (null: the options have the keys)
    this.shown = null;   // the entry whose page is showing (stays while it slides away)
    this.infoK = 0;
    this.scroll = 0;     // first grid row shown

    this.main = new Menu([
      { label: 'RESUME', action: () => this.close() },
      { label: 'RESTART', action: () => { this.closeNow(); clearStore('run'); game.newRun(); } },
      { label: 'SETTINGS', action: () => this.goto('settings') },
      { label: 'SAVE & QUIT', action: () => { this.closeNow(); game.saveAndQuit(); } },
    ], { rowH: 13 });
    this.settings = new SettingsPanel(game.settings, {
      onChange: () => game.touch.applySettings(),
      onBack: () => this.goto('main'),
      onReset: () => { progress.reset(); popups.clear(); },
    });
  }

  get visible() { return this.isOpen || this.k > 0; }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.page = 'main';
    this.main.sel = 0;
    this.focus = null;
    this.infoK = 0;
    this.scroll = 0;
    this.pageK = 1;
    this.game.touch.setMenuMode(true);
    document.body.classList.add('in-pause');
    sfx('waxDrip');
  }

  close() {
    this.isOpen = false;
    this.game.touch.setMenuMode(false);
    document.body.classList.remove('in-pause');
  }

  closeNow() {
    this.close();
    this.k = 0;
  }

  goto(page) {
    this.page = page;
    this.pageK = 0;
    if (page === 'settings') this.settings.open();
  }

  update(dt, input) {
    this.t += dt;
    this.k = this.isOpen ? Math.min(1, this.k + dt * 2.2) : Math.max(0, this.k - dt * 4.5);
    this.pageK = Math.min(1, this.pageK + dt * 2.6);
    this.infoK = this.focus != null ? Math.min(1, this.infoK + dt * 4) : Math.max(0, this.infoK - dt * 6);
    if (!this.isOpen) return;
    if (this.page === 'main') {
      if (this.updateGrid(input)) return;
      if (input.consume('back') | input.consume('pause')) return this.close();
      this.main.update(dt, input);
    } else {
      this.settings.update(dt, input);
    }
  }

  tap(vx, vy) {
    if (!this.isOpen) return;
    if (this.page !== 'main') return this.settings.tap(vx, vy);
    const hit = this.gridHit(vx, vy);
    if (hit === 'up' || hit === 'down') { this.scroll += hit === 'up' ? -1 : 1; sfx('menuMove'); return; }
    if (hit != null) { this.setFocus(hit === this.focus ? null : hit); sfx('menuMove'); return; }
    // tapping anywhere else closes an open page first
    if (this.focus != null) { this.focus = null; return; }
    this.main.tap(vx, vy);
  }

  render(ctx) {
    if (!this.visible) return;
    const k = this.k;
    ctx.fillStyle = `rgba(6,4,4,${0.6 * Math.min(1, k)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.page === 'settings') this.settings.render(ctx, k);
    else this.renderMain(ctx, k * this.pageK);
  }

  renderMain(ctx, k) {
    const L = LEFT, R = RIGHT, g = this.game;
    drawWaxPanel(ctx, L.x, L.y, L.w, L.h, k, 3);
    const k2 = Math.max(0, (k - 0.15) / 0.85);
    drawWaxPanel(ctx, R.x, R.y, R.w, R.h, k2, 7);

    // Left: options
    let a = inkAlpha(k);
    if (a > 0) {
      ctx.globalAlpha = a;
      drawText(ctx, 'PAUSED', L.x + L.w / 2, L.y + 10, { align: 'center', scale: 2, color: INK.title, shadow: false });
      this.main.t = this.t;
      this.main.layout(L.x + 8, L.y + 38, L.w - 16);
      this.main.render(ctx, a);
      ctx.globalAlpha = a;
      drawText(ctx, 'SEED', L.x + L.w / 2, L.y + L.h - 26, { align: 'center', color: INK.dim, shadow: false });
      drawText(ctx, g.seed, L.x + L.w / 2, L.y + L.h - 15, { align: 'center', color: INK.text, shadow: false });
      ctx.globalAlpha = 1;
    }

    // Right: stats and items
    a = inkAlpha(k2);
    if (a > 0) {
      ctx.globalAlpha = a;
      const p = g.player;
      drawText(ctx, p.charName, R.x + 10, R.y + 8, { color: INK.title, shadow: false });
      drawText(ctx, g.floor.name, R.x + R.w - 10, R.y + 8, { color: INK.dim, shadow: false, align: 'right' });
      STAT_ORDER.forEach((key, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = R.x + 6 + col * 88, y = R.y + 20 + row * 16;
        const icon = statIcon(key);
        ctx.drawImage(icon, x, y + Math.floor((14 - icon.height) / 2));
        drawText(ctx, STAT_LABELS[key], x + 16, y + 4, { color: INK.dim, shadow: false });
        drawText(ctx, formatStat(key, p.stats[key]), x + 86, y + 4, { color: INK.text, shadow: false, align: 'right' });
      });
      const list = this.entries();
      const nItems = list.filter((e) => e.kind === 'item').length, nTr = list.filter((e) => e.kind === 'trinket').length;
      drawText(ctx, `ITEMS (${nItems})${nTr ? `   TRINKETS (${nTr})` : ''}`, R.x + 10, R.y + 72, { color: INK.title, shadow: false });
      if (!list.length) drawText(ctx, 'NOTHING YET...', R.x + 10, R.y + 88, { color: INK.dim, shadow: false });
      const rows = Math.ceil(list.length / COLS);
      this.scroll = Math.max(0, Math.min(this.scroll, rows - ROWS));
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const i = (this.scroll + r) * COLS + c, e = list[i];
          if (!e) continue;
          const cx = GRID.x + c * CELL_W + CELL_W / 2, cy = GRID.y + r * CELL_H + CELL_H / 2;
          if (i === this.focus) {
            ctx.fillStyle = 'rgba(160,40,16,0.16)';
            ctx.fillRect(cx - CELL_W / 2 + 1, cy - CELL_H / 2 + 1, CELL_W - 2, CELL_H - 2);
            ctx.strokeStyle = Math.floor(this.t * 3) % 2 ? INK.sel : INK.title;
            ctx.strokeRect(cx - CELL_W / 2 + 1.5, cy - CELL_H / 2 + 1.5, CELL_W - 3, CELL_H - 3);
          }
          const icon = e.icon();
          ctx.drawImage(icon, Math.round(cx - icon.width / 2), Math.round(cy - icon.height / 2));
        }
      }
      // more rows than fit: little arrows (tap them to scroll)
      if (this.scroll > 0) drawText(ctx, '^', SCROLL_X, R.y + 72, { align: 'center', color: INK.sel, shadow: false });
      if (this.scroll + ROWS < rows) drawText(ctx, 'V', SCROLL_X, GRID.y + ROWS * CELL_H, { align: 'center', color: INK.sel, shadow: false });
      const touch = g.touch?.enabled;
      const hint = !list.length ? '' : this.focus != null ? (touch ? 'TAP IT AGAIN TO CLOSE' : 'ARROWS: LOOK   ESC: BACK') : touch ? 'TAP AN ITEM TO READ IT' : 'RIGHT: LOOK AT YOUR ITEMS';
      drawText(ctx, hint, R.x + R.w / 2, R.y + R.h - 12, { align: 'center', color: INK.dim, shadow: false });
      ctx.globalAlpha = 1;
    }

    // the item looked at: its page slides over the options on the left
    if (this.infoK > 0 && this.shown) this.renderInfo(ctx, this.shown, k * this.infoK);
  }

  // Everything held, in the order the grid shows it: the active and pocket items, the passive
  // items, the trinkets (the held one and any melted in) and last the transformations.
  entries() {
    const p = this.game.player;
    const out = [];
    const ids = [...(p.active ? [p.active.id] : []), ...(p.pocket ? [p.pocket.id] : []), ...p.items];
    for (const id of ids) if (ITEMS[id]) out.push({ kind: 'item', id, icon: () => itemIcon(id) });
    for (const t of [...(p.trinket ? [p.trinket] : []), ...(p.gulped || [])]) if (TRINKETS[t.id]) out.push({ kind: 'trinket', id: t.id, golden: t.golden, icon: () => trinketIcon(t) });
    for (const tid of p.transforms || []) if (TRANSFORMATIONS[tid]) out.push({ kind: 'form', id: tid, icon: () => formIcon(tid) });
    return out;
  }

  setFocus(i) {
    const list = this.entries();
    if (i == null || !list.length) { this.focus = null; return; }
    this.focus = Math.max(0, Math.min(list.length - 1, i));
    this.shown = list[this.focus];
    const row = Math.floor(this.focus / COLS);
    if (row < this.scroll) this.scroll = row;
    if (row >= this.scroll + ROWS) this.scroll = row - ROWS + 1;
  }

  // Keys and pad while looking at the grid. Returns true when it used the input.
  updateGrid(input) {
    const n = this.entries().length;
    if (this.focus == null) {
      if (n && input.consume('right')) { this.setFocus(this.scroll * COLS); sfx('menuMove'); }
      return false;
    }
    if (this.focus >= n) this.setFocus(n - 1);
    const f = this.focus, col = f % COLS;
    if (input.consume('back') | input.consume('pause')) { this.focus = null; sfx('menuMove'); return true; }
    let to = f;
    if (input.consume('left')) to = col === 0 ? -1 : f - 1;
    if (input.consume('right')) to = Math.min(n - 1, f + 1);
    if (input.consume('up') && f - COLS >= 0) to = f - COLS;
    if (input.consume('down') && Math.floor(f / COLS) < Math.floor((n - 1) / COLS)) to = Math.min(n - 1, f + COLS);
    input.consume('confirm');
    if (to !== f) { if (to < 0) this.focus = null; else this.setFocus(to); sfx('menuMove'); }
    return true;
  }

  // Which grid cell (or scroll arrow) a tap landed on.
  gridHit(vx, vy) {
    const n = this.entries().length, rows = Math.ceil(n / COLS);
    if (Math.abs(vx - SCROLL_X) < 10) {
      if (this.scroll > 0 && Math.abs(vy - (RIGHT.y + 75)) < 9) return 'up';
      if (this.scroll + ROWS < rows && Math.abs(vy - (GRID.y + ROWS * CELL_H + 3)) < 9) return 'down';
    }
    const c = Math.floor((vx - GRID.x) / CELL_W), r = Math.floor((vy - GRID.y) / CELL_H);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    const i = (this.scroll + r) * COLS + c;
    return i < n ? i : null;
  }

  renderInfo(ctx, e, k) {
    const P = INFO;
    drawWaxPanel(ctx, P.x, P.y, P.w, P.h, k, 13);
    const a = inkAlpha(k);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    const p = this.game.player;
    let name, sub, subColor = INK.dim, quote = '', body = '';
    if (e.kind === 'item') {
      const d = ITEMS[e.id];
      name = d.name; quote = d.desc; body = d.lore || '';
      sub = `QUALITY ${d.quality}`; subColor = Q_COLORS[d.quality] || INK.dim;
      if (d.type === 'active') body = `${activeCost(d.active)}. ${body}`;
    } else if (e.kind === 'trinket') {
      const d = TRINKETS[e.id];
      name = (e.golden ? 'GOLDEN ' : '') + d.name; quote = d.desc; sub = e.golden ? 'GOLDEN TRINKET' : 'TRINKET';
      body = describeTrinket(e.id);
    } else {
      const t = TRANSFORMATIONS[e.id];
      name = t.name; sub = 'TRANSFORMATION'; quote = t.desc;
      body = '3 ITEMS OF A KIND CHANGED YOU. THIS STAYS FOR THE WHOLE RUN, EVEN IF THE ITEMS GO.';
    }
    const icon = e.kind === 'form' ? formIcon(e.id) : e.icon();
    const scale = icon.width <= 16 ? 2 : 1;
    const bob = Math.round(Math.sin(this.t * 3) * 1.5);
    ctx.drawImage(icon, P.x + 10, P.y + 12 + bob, icon.width * scale, icon.height * scale);
    const tx = P.x + 16 + icon.width * scale, tw = P.x + P.w - 8 - tx;
    const nameLines = wrapText(name.toUpperCase(), tw);
    nameLines.slice(0, 2).forEach((l, i) => drawText(ctx, l, tx, P.y + 12 + i * 9, { color: INK.title, shadow: false }));
    const sy = P.y + 12 + Math.min(2, nameLines.length) * 9 + 2;
    drawText(ctx, sub, tx, sy, { color: subColor, shadow: false });
    if (e.kind === 'item') drawText(ctx, ITEMS[e.id].type === 'active' ? 'ACTIVE' : 'PASSIVE', tx, sy + 10, { color: INK.dim, shadow: false });
    let y = Math.max(P.y + 14 + icon.height * scale, sy + 22) + 4;
    const w = P.w - 18, bottom = P.y + P.h - 10;
    for (const l of wrapText(`"${quote.toUpperCase()}"`, w)) { if (y > bottom - 9) break; drawText(ctx, l, P.x + 9, y, { color: INK.sel, shadow: false }); y += 9; }
    y += 4;
    for (const l of wrapText(body.toUpperCase(), w)) { if (y > bottom - 9) break; drawText(ctx, l, P.x + 9, y, { color: INK.text, shadow: false }); y += 9; }
    // and what it does, in plain words, while there is room
    if (e.kind === 'item') {
      y += 4;
      for (const line of describeItem(e.id)) {
        const ls = wrapText(line, w - 6);
        if (y + ls.length * 9 > bottom) break;
        ctx.fillStyle = INK.dim; ctx.fillRect(P.x + 10, y + 2, 2, 2);
        for (const l of ls) { drawText(ctx, l, P.x + 15, y, { color: INK.dim, shadow: false }); y += 9; }
      }
    }
    ctx.globalAlpha = 1;
  }
}

// A transformation in the grid: a little Wick wearing its look.
const FORM_ICONS = new Map();
function formIcon(tid) {
  let c = FORM_ICONS.get(tid);
  if (!c) {
    const b = TRANSFORMATIONS[tid].bonus.look || {};
    const look = { id: 'wick', costumes: [].concat(b.costume || []), flame: b.flame || null, bodyTint: b.bodyTint || null, colorKey: '' };
    let ctx;
    [c, ctx] = makeCanvas(30, 27);
    new Player(15, 23).drawCandle(ctx, look, 15, 23, 0, 0, { flare: false, body: false });   // a stand-in, standing still
    FORM_ICONS.set(tid, c);
  }
  return c;
}

// A trinket's effects in a line, from its stats.
function describeTrinket(id) {
  const d = TRINKETS[id];
  return Object.entries(d.stats || {}).map(([k, v]) => `${STAT_LABELS[k.replace(/Mul$/, '')] || k} ${k.endsWith('Mul') ? 'X' + v : (v > 0 ? '+' : '') + v}`).join(', ');
}
