// Title screen: a dark cellar, a big flickering Wick, and a wax slab with the menu.
import { VIEW_W, VIEW_H, UI_X, UI_Y } from '../engine/canvas.js';
import { RNG, normalizeSeed } from '../engine/rng.js';
import { makeCanvas, makeGlow } from '../engine/sprites.js';
import { hasStore, clearStore, loadStore } from '../engine/storage.js';
import { Room } from '../game/room.js';
import { Player } from '../game/player.js';
import { progress } from '../game/progress.js';
import { SPECIAL_ROOMS } from '../data/rooms.js';
import { drawText } from './text.js';
import { Menu } from './menu.js';
import { drawWaxPanel, inkAlpha } from './wax.js';
import { SettingsPanel } from './settingsPanel.js';
import { popups } from './unlockPopup.js';
import { CharSelect } from './charSelect.js';

const PANEL = { x: 214 + UI_X, y: 80 + UI_Y, w: 140, h: 76 };
const GLOW = makeGlow(70, 'rgba(255,150,60,0.5)');

export class TitleScreen {
  // onStart(seed?, character?) starts a new run; onContinue() resumes the saved one
  constructor({ settings, touch, onStart, onContinue }) {
    this.settings = settings;
    this.touch = touch;
    this.onStart = onStart;
    this.onContinue = onContinue;
    this.t = 0;
    this.k = 0;
    this.pageK = 1;
    this.page = 'main';
    this.room = new Room({ template: SPECIAL_ROOMS.start, rng: new RNG('title-room'), type: 'start' });
    this.wick = new Player(20, 40);
    [this.wc, this.wctx] = makeCanvas(40, 48);
    this.settingsPanel = new SettingsPanel(settings, {
      onChange: () => touch.applySettings(),
      onBack: () => this.goto('main'),
      onReset: () => {
        progress.reset();
        clearStore('run');
        popups.clear();
        this.buildMenu();
      },
    });
    this.charSelect = new CharSelect({
      onStart: (character, seed) => this.onStart(seed || undefined, character),
      onBack: () => this.goto('main'),
    });
    this.buildMenu();
  }

  // The menu changes when there's a run to continue.
  buildMenu() {
    const items = [];
    this.saved = hasStore('run') ? loadStore('run') : null;
    if (this.saved) items.push({ label: 'CONTINUE', action: () => this.onContinue() });
    items.push(
      { label: 'NEW RUN', action: () => this.pickCharacter(null) },
      { label: 'SEEDED RUN', action: () => this.askSeed() },
      { label: 'SETTINGS', action: () => this.goto('settings') },
    );
    this.menu = new Menu(items, { rowH: 14 });
  }

  enter() {
    this.t = 0;
    this.k = 0;
    this.page = 'main';
    this.buildMenu();
    this.touch.setMenuMode(true);
    document.body.classList.add('in-title');
  }

  // Replay a run: seeds are shown on the pause and game-over screens.
  askSeed() {
    const raw = window.prompt('Enter a seed (like K3PX 9QWE):', '');
    if (!raw) return;
    const seed = normalizeSeed(raw);
    if (seed.replace(' ', '').length >= 4) this.pickCharacter(seed);
  }

  leave() {
    document.body.classList.remove('in-title');
  }

  goto(page) {
    this.page = page;
    this.pageK = 0;
    if (page === 'settings') this.settingsPanel.open();
  }

  update(dt, input) {
    this.t += dt;
    if (this.t > 0.5) this.k = Math.min(1, this.k + dt * 1.6);
    this.pageK = Math.min(1, this.pageK + dt * 2.6);
    this.wick.time = this.t;
    if (this.k < 0.6) { input.pending.clear(); return; }
    if (this.page === 'main') this.menu.update(dt, input);
    else if (this.page === 'chars') this.charSelect.update(dt, input);
    else this.settingsPanel.update(dt, input);
  }

  tap(vx, vy) {
    if (this.k < 0.6) return;
    if (this.page === 'main') this.menu.tap(vx, vy);
    else if (this.page === 'settings') this.settingsPanel.tap(vx, vy);
  }

  // Finger/mouse lifted (the character select acts on release, so it can tell swipes from taps).
  release(vx, vy, dx, dy) {
    if (this.k < 0.6 || this.page !== 'chars') return;
    this.charSelect.release(vx, vy, dx, dy);
  }

  pickCharacter(seed) {
    this.charSelect.open(seed);
    this.goto('chars');
  }

  // Lifetime records under the menu.
  renderRecords(ctx) {
    const s = progress.data.stats;
    if (!s.runs) return;
    const best = progress.data.best[0];
    const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
    const parts = [`RUNS ${s.runs}`, `ESCAPES ${s.wins}`];
    if (best) parts.push(`BEST ${fmt(best.time)}`);
    drawText(ctx, parts.join('   '), PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h + 24, { align: 'center', color: '#c9b48a' });
  }

  render(ctx) {
    ctx.fillStyle = '#060404';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(this.room.bg, 0, 0);
    if (this.page === 'chars') {
      ctx.globalAlpha = 1;
      this.charSelect.render(ctx);
      return;
    }
    ctx.globalAlpha = 1;

    // Big Wick with a flickering glow
    const flick = 0.8 + Math.sin(this.t * 11) * 0.06 + Math.sin(this.t * 27) * 0.05;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45 * flick;
    ctx.drawImage(GLOW, 100 - 70 + UI_X, 104 - 70 + UI_Y);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.wctx.clearRect(0, 0, 40, 48);
    this.wick.render(this.wctx, 0, 0);
    ctx.drawImage(this.wc, 100 - 40 + UI_X, 70 + UI_Y, 80, 96);

    // Title
    const bob = Math.round(Math.sin(this.t * 1.5) * 1.5);
    drawText(ctx, 'WICK', VIEW_W / 2, 12 + UI_Y + bob, { align: 'center', scale: 5, color: '#f08a24', shadow: '#2a0e04' });
    drawText(ctx, 'DOWN THE CELLAR', VIEW_W / 2, 52 + UI_Y, { align: 'center', scale: 2, color: '#e8d9b0', shadow: '#0b0807' });

    if (this.page === 'main') {
      const k = this.k * this.pageK;
      const h = 14 + this.menu.items.length * 14;
      drawWaxPanel(ctx, PANEL.x, PANEL.y, PANEL.w, h, k, 5);
      const a = inkAlpha(k);
      this.menu.t = this.t;
      this.menu.layout(PANEL.x + 14, PANEL.y + 10, PANEL.w - 24);
      this.menu.render(ctx, a);
      if (this.saved && a > 0) {
        const name = this.saved.floorName || `FLOOR ${this.saved.floorNum || 1}`;
        drawText(ctx, name, PANEL.x + PANEL.w / 2, PANEL.y + h + 4, { align: 'center', color: '#8a7a62' });
      }
      const hint = this.touch.enabled ? 'TAP TO CHOOSE' : 'ARROWS + ENTER';
      drawText(ctx, hint, PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h + 12, { align: 'center', color: '#8a7a62' });
      this.renderRecords(ctx);
    } else {
      ctx.fillStyle = 'rgba(6,4,4,0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      this.settingsPanel.render(ctx, 1);
    }
    drawText(ctx, 'V1.1', VIEW_W - 4, VIEW_H - 10, { align: 'right', color: '#4d3c30' });
  }
}
