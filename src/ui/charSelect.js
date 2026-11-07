// Character select: a carousel of candles, like the original's. Locked characters are dark
// silhouettes that tell you how to unlock them.
//   keys/pad: left/right to browse, up/down to flip to the twisted versions, confirm to start
//   touch:    swipe or tap the arrows to browse, tap the middle candle (or START) to start,
//             TWISTED to flip, BACK to leave
import { VIEW_W, VIEW_H, UI_X, UI_Y } from '../engine/canvas.js';
import { silhouette, makeCanvas, makeGlow } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { CHARACTERS, CHARACTER_ORDER, twistedOf } from '../data/characters.js';
import { LOCKED_BY, ACHIEVEMENTS } from '../data/unlocks.js';
import { Player, characterPortrait } from '../game/player.js';
import { Health } from '../game/health.js';
import { progress } from '../game/progress.js';
import { itemIcon } from '../game/items.js';
import { drawHearts } from './hud.js';
import { drawText, wrapText } from './text.js';
import { drawWaxPanel, INK } from './wax.js';

const N = CHARACTER_ORDER.length;
const mod = (i) => ((i % N) + N) % N;
const GLOW = makeGlow(46, 'rgba(255,150,60,0.45)');
const GLOW_T = makeGlow(46, 'rgba(150,60,200,0.45)');
const BASE_Y = 104 + UI_Y;          // where the middle candle stands
const PANEL = { x: 60 + UI_X, y: 108 + UI_Y, w: 264, h: 86 };
const BTN = {
  back: { x: 4, y: 4, w: 40, h: 14, label: 'BACK' },
  twisted: { x: 4, y: VIEW_H - 18, w: 64, h: 14, label: 'TWISTED' },
  start: { x: VIEW_W - 68, y: VIEW_H - 18, w: 64, h: 14, label: 'START' },
  left: { x: 0, y: 30 + UI_Y, w: 70, h: 76 },
  right: { x: VIEW_W - 70, y: 30 + UI_Y, w: 70, h: 76 },
  center: { x: VIEW_W / 2 - 42, y: 14 + UI_Y, w: 84, h: 94 },
};
const inside = (b, x, y) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

const STAT_SHORT = { damage: 'DMG', fireRate: 'RATE', range: 'RANGE', shotSpeed: 'SHOT SPD', speed: 'SPEED', luck: 'LUCK' };
function statLine(stats = {}) {
  return Object.entries(stats).map(([k, v]) => {
    if (k.endsWith('Mul')) return `${STAT_SHORT[k.slice(0, -3)]} X${v}`;
    return `${STAT_SHORT[k]} ${v > 0 ? '+' : ''}${v}`;
  }).join('  ');
}

export class CharSelect {
  constructor({ onStart, onBack }) {
    this.onStart = onStart;   // (characterId, seed) => void
    this.onBack = onBack;
    this.sel = 0;
    this.view = 0;
    this.twisted = false;
    this.flipT = 1;
    this.shakeT = 0;
    this.t = 0;
    this.seed = null;
    this.live = new Map();    // animated candles for the middle spot
    this.dark = new Map();    // silhouettes of locked characters
    this.healths = new Map();
    [this.canvas, this.cctx] = makeCanvas(24, 34);
  }

  open(seed = null) {
    this.seed = seed;
    const last = progress.data.lastCharacter || 'wick';
    const base = last.replace(/_t$/, '');
    this.sel = Math.max(0, CHARACTER_ORDER.indexOf(base));
    this.view = this.sel;
    this.twisted = last.endsWith('_t') && this.unlocked(last);
    this.t = 0;
    this.flipT = 1;
  }

  idAt(i) {
    const base = CHARACTER_ORDER[mod(i)];
    return this.twisted ? twistedOf(base) : base;
  }

  unlocked(id) { return progress.isUnlocked('character', id); }

  move(d) {
    this.sel += d;
    sfx('menuMove');
  }

  flip() {
    this.twisted = !this.twisted;
    this.flipT = 0;
    sfx('waxDrip');
  }

  start() {
    const id = this.idAt(this.sel);
    if (!this.unlocked(id)) { sfx('denied'); this.shakeT = 0.3; return; }
    sfx('menuSelect');
    this.onStart(id, this.seed);
  }

  update(dt, input) {
    this.t += dt;
    this.flipT = Math.min(1, this.flipT + dt * 3);
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.view += (this.sel - this.view) * Math.min(1, dt * 12);
    if (Math.abs(this.sel - this.view) < 0.002) this.view = this.sel;
    if (input.consume('left')) this.move(-1);
    if (input.consume('right')) this.move(1);
    if (input.consume('up') || input.consume('down')) this.flip();
    if (input.consume('confirm')) this.start();
    else if (input.consume('back')) { sfx('menuMove'); this.onBack(); }
  }

  // Touch and mouse act when the finger lifts, so a swipe never starts a run by accident.
  release(x, y, dx, dy) {
    if (Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy)) { this.move(dx < 0 ? 1 : -1); return; }
    if (Math.hypot(dx, dy) > 10) return;
    if (inside(BTN.back, x, y)) { sfx('menuMove'); this.onBack(); } else if (inside(BTN.twisted, x, y)) this.flip();
    else if (inside(BTN.start, x, y) || inside(BTN.center, x, y)) this.start();
    else if (inside(BTN.left, x, y)) this.move(-1);
    else if (inside(BTN.right, x, y)) this.move(1);
  }

  // ---- drawing ------------------------------------------------------------------
  liveCandle(id) {
    let p = this.live.get(id);
    if (!p) {
      p = new Player(12, 30, CHARACTERS[id], id);
      this.live.set(id, p);
    }
    p.time = this.t;
    this.cctx.clearRect(0, 0, 24, 34);
    p.drawCandle(this.cctx, p.look, 12, 30, 0, 0, { flare: false });
    return this.canvas;
  }

  darkCandle(id) {
    let c = this.dark.get(id);
    if (!c) {
      c = silhouette(characterPortrait(id), '#3a2c24');
      this.dark.set(id, c);
    }
    return c;
  }

  healthOf(id) {
    let h = this.healths.get(id);
    if (!h) {
      h = new Health(CHARACTERS[id].health || { hearts: 3 });
      this.healths.set(id, h);
    }
    return h;
  }

  render(ctx) {
    ctx.fillStyle = this.twisted ? 'rgba(14,4,18,0.78)' : 'rgba(6,4,4,0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const title = this.twisted ? 'TWISTED CANDLES' : 'CHOOSE YOUR CANDLE';
    drawText(ctx, title, VIEW_W / 2, 4, { align: 'center', color: this.twisted ? '#c88af0' : '#f08a24' });
    drawText(ctx, `${mod(this.sel) + 1}/${N}`, VIEW_W - 6, 6, { align: 'right', color: '#8a7a62' });
    this.button(ctx, BTN.back);

    // the carousel: the middle candle is big and alive, the others shrink and fade
    const shake = this.shakeT > 0 ? Math.round(Math.sin(this.t * 60) * 2) : 0;
    const base = Math.round(this.view);
    const order = [-3, 3, -2, 2, -1, 1, 0];
    for (const k of order) {
      const i = base + k;
      const off = i - this.view;
      if (Math.abs(off) > 3.2) continue;
      const id = this.idAt(i);
      const mid = Math.abs(off) < 0.5;
      const s = mid ? 3 : Math.abs(off) < 1.5 ? 2 : 1;
      const x = Math.round(VIEW_W / 2 + off * 70 + (mid ? shake : 0));
      const open = this.unlocked(id);
      const img = open ? (mid ? this.liveCandle(id) : characterPortrait(id)) : this.darkCandle(id);
      if (mid) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = open ? 0.6 : 0.2;
        ctx.drawImage(this.twisted ? GLOW_T : GLOW, x - 46, BASE_Y - 70);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = Math.max(0.15, 1 - Math.abs(off) * 0.32) * (mid ? 1 : 0.85);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 7 * s, BASE_Y - 2, 14 * s, 2 * s);
      // twins stand together
      const twin = CHARACTERS[id].mechanics?.twin;
      if (twin && s > 1) {
        const t = s - 1, tx = x + 13 * s;
        const timg = open ? characterPortrait(twin.look) : this.darkCandle(twin.look);
        ctx.drawImage(timg, tx - 12 * t, BASE_Y - 30 * t, 24 * t, 34 * t);
      }
      ctx.drawImage(img, x - 12 * s, BASE_Y - 30 * s, 24 * s, 34 * s);
      if (!open) drawText(ctx, '?', x, BASE_Y - 15 * s, { align: 'center', scale: s, color: '#c9b48a' });
      ctx.globalAlpha = 1;
    }
    drawText(ctx, '<', 14, 60 + UI_Y, { scale: 3, color: '#c9b48a' });
    drawText(ctx, '>', VIEW_W - 26, 60 + UI_Y, { scale: 3, color: '#c9b48a' });

    this.renderInfo(ctx);
    this.button(ctx, BTN.twisted, this.twisted);
    this.button(ctx, BTN.start, false, !this.unlocked(this.idAt(this.sel)));
    drawText(ctx, 'ARROWS: CHOOSE   UP: TWISTED', VIEW_W / 2, VIEW_H - 14, { align: 'center', color: '#5a4a3a' });
  }

  renderInfo(ctx) {
    const id = this.idAt(this.sel);
    const def = CHARACTERS[id];
    const P = PANEL;
    const k = this.flipT;
    drawWaxPanel(ctx, P.x, P.y, P.w, P.h, 0.75 + k * 0.25, this.twisted ? 13 : 7);
    if (k < 0.5) return;
    const open = this.unlocked(id);
    const mid = P.x + P.w / 2;
    if (!open) {
      const ach = ACHIEVEMENTS.find((a) => a.id === LOCKED_BY[`character:${id}`]);
      drawText(ctx, '???', mid, P.y + 8, { align: 'center', scale: 2, color: INK.title, shadow: false });
      drawText(ctx, 'LOCKED', mid, P.y + 28, { align: 'center', color: INK.sel, shadow: false });
      const lines = wrapText(ach ? ach.how : 'KEEP PLAYING.', P.w - 30);
      lines.slice(0, 3).forEach((l, i) => drawText(ctx, l, mid, P.y + 42 + i * 10, { align: 'center', color: INK.text, shadow: false }));
      if (ach?.placeholder) drawText(ctx, '(A HIDDEN SECRET WILL REPLACE THIS)', mid, P.y + 70, { align: 'center', color: INK.dim, shadow: false });
      return;
    }
    drawText(ctx, def.name, mid, P.y + 6, { align: 'center', scale: 2, color: INK.title, shadow: false });
    drawText(ctx, def.desc, mid, P.y + 24, { align: 'center', color: INK.dim, shadow: false });
    // hearts (Motley rolls new ones every run)
    if (def.mechanics?.random) drawText(ctx, 'HEARTS: ???', P.x + 12, P.y + 34, { color: INK.text, shadow: false });
    else drawHearts(ctx, this.healthOf(id), P.x + 12, P.y + 32, this.t);
    // starting items on the right
    const items = [def.active, def.pocket, ...(def.items || [])].filter(Boolean);
    items.slice(0, 3).forEach((it, i) => {
      const icon = itemIcon(it);
      ctx.drawImage(icon, P.x + P.w - 22 - i * 26 - Math.floor(icon.width / 2), P.y + 44 - Math.floor(icon.height / 2));
    });
    const lines = wrapText(def.special, P.w - 24);
    lines.slice(0, 2).forEach((l, i) => drawText(ctx, l, P.x + 12, P.y + 56 + i * 9, { color: INK.sel, shadow: false }));
    const st = def.mechanics?.random ? 'STATS: ???' : statLine(def.stats);
    if (st) drawText(ctx, st, P.x + 12, P.y + 57 + Math.min(2, lines.length) * 9, { color: INK.text, shadow: false });
  }

  button(ctx, b, on = false, dim = false) {
    ctx.fillStyle = on ? 'rgba(120,50,150,0.8)' : 'rgba(30,20,14,0.85)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = on ? '#c88af0' : '#5a4a3a';
    ctx.fillRect(b.x, b.y, b.w, 1);
    ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
    drawText(ctx, b.label, b.x + b.w / 2, b.y + 4, { align: 'center', color: dim ? '#5a4a3a' : '#e8d9b0' });
  }
}
