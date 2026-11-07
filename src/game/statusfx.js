// Status icons above enemies and bosses (art in src/data/statusIcons.js).
import { makeCanvas } from '../engine/sprites.js';
import { STATUS_ICONS, STATUS_ORDER } from '../data/statusIcons.js';
import { TUNING } from '../data/tuning.js';

const OUTLINE = '#140c0a';
const cache = new Map();
const TINT_ORDER = ['freeze', 'charm', 'fear', 'burn', 'poison', 'slow'];

function iconFor(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const def = STATUS_ICONS[kind];
  const rows = def.rows, h = rows.length, w = rows[0].length;
  const [c, ctx] = makeCanvas(w + 2, h + 2);
  const on = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
  ctx.fillStyle = OUTLINE;
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = ch === 'o' ? def.light : def.color;
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  cache.set(kind, c);
  return c;
}

// The statuses an enemy/boss has right now, in drawing order.
export function activeStatuses(status) {
  return STATUS_ORDER.filter((k) => (status[k] || 0) > 0);
}

// The color an enemy is washed with (the first status in order wins).
export function statusTint(status) {
  const k = TINT_ORDER.find((s) => (status[s] || 0) > 0);
  return k ? STATUS_ICONS[k].tint : null;
}

// A row of icons centered on cx, with their bottom at y, bobbing a little.
export function drawStatusIcons(ctx, status, cx, y, t) {
  if (!TUNING.enemies.statusIcons) return;
  const list = activeStatuses(status);
  if (!list.length) return;
  const gap = 10, x0 = Math.round(cx - (list.length * gap - 1) / 2);
  const bob = Math.floor(t * 3) % 2;
  list.forEach((k, i) => {
    const img = iconFor(k);
    ctx.drawImage(img, x0 + i * gap, Math.round(y - img.height - bob));
  });
}
