// Menus are slabs of candle wax: they drip down from the top, set into a panel,
// and keep a few frozen drips hanging off the bottom edge.
export const WAX = {
  body: '#e8d9b0',
  streak: '#e2d1a6',
  shade: '#c9b48a',
  dark: '#9a8462',
  hi: '#fff4d6',
  outline: '#2a1a10',
};

// Ink colors for text written on wax.
export const INK = { text: '#3a2418', sel: '#a02810', dim: '#8a6a48', title: '#5a2410' };

function hash(i, seed) {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// k: 0 = nothing, 1 = fully formed. seed changes the drip pattern.
export function drawWaxPanel(ctx, x, y, w, h, k, seed = 1) {
  if (k <= 0) return;
  const kk = Math.min(1, k);
  const e = 1 - Math.pow(1 - kk, 3);
  const fill = h * e;
  const colW = 2;
  x = Math.round(x);
  y = Math.round(y);

  for (let cx = 0; cx < w; cx += colW) {
    const i = cx / colW;
    const n = hash(i, seed), n2 = hash(i + 91, seed);
    // While forming, drips run ahead of the slab; once set, a few stay hanging.
    const lead = Math.round(n * 16 * (1 - e));
    const hang = n2 > 0.78 ? Math.round((n2 - 0.78) * 40 * e) : 0;
    // Rounded top corners
    const edge = Math.min(cx, w - 1 - cx);
    const inset = edge < 2 ? 2 - edge : 0;
    const len = Math.max(0, Math.round(fill + lead + hang) - inset);
    if (len <= 0) continue;
    const cw = Math.min(colW, w - cx);
    ctx.fillStyle = WAX.outline;
    ctx.fillRect(x + cx, y + inset - 1, cw, len + 2);
    ctx.fillStyle = cx < 3 ? WAX.hi : cx >= w - 4 ? WAX.shade : n > 0.86 ? WAX.streak : WAX.body;
    ctx.fillRect(x + cx, y + inset, cw, len);
    // darker rounded tip
    ctx.fillStyle = WAX.dark;
    ctx.fillRect(x + cx, y + inset + len - 1, cw, 1);
  }
  // side outlines
  ctx.fillStyle = WAX.outline;
  ctx.fillRect(x - 1, y + 2, 1, Math.max(0, Math.round(fill) - 2));
  ctx.fillRect(x + w, y + 2, 1, Math.max(0, Math.round(fill) - 2));
  // glossy top lip
  if (fill > 4) {
    ctx.fillStyle = WAX.hi;
    ctx.fillRect(x + 3, y + 1, w - 6, 1);
  }
}

// How visible the text on a panel should be at formation level k.
export function inkAlpha(k) {
  return Math.max(0, Math.min(1, (k - 0.75) / 0.25));
}

// Little candle flame used as the menu cursor.
export function drawFlameCursor(ctx, x, y, t) {
  const f = Math.floor(t * 10) % 3;
  ctx.fillStyle = '#c2461c';
  ctx.fillRect(x, y + 2, 5, 4);
  ctx.fillRect(x + 1, y + 1, 3, 1);
  ctx.fillRect(x + 1 + (f === 1 ? -1 : f === 2 ? 1 : 0), y, 2, 1);
  ctx.fillStyle = '#ffd25a';
  ctx.fillRect(x + 1, y + 3, 3, 3);
  ctx.fillStyle = '#fff3c0';
  ctx.fillRect(x + 2, y + 4, 1, 2);
}
