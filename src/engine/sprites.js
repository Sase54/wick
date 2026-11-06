// Turns pixel strings into offscreen canvases, plus helpers for flipped and flash variants.
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

// rows: array of equal-length strings. colors: { char: '#rrggbb' }. '.' and ' ' are transparent.
// overlay: optional [[x, y, char], ...] pixels drawn on top (faces, details).
export function buildSprite(rows, colors, overlay = null) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const [c, ctx] = makeCanvas(w, h);
  const put = (x, y, ch) => {
    const col = colors[ch];
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) put(x, y, row[x]);
  }
  if (overlay) for (const [x, y, ch] of overlay) put(x, y, ch);
  return c;
}

export function flipX(src) {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

// Solid-color silhouette, used for hit flashes.
export function silhouette(src, color = '#ffffff') {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, src.width, src.height);
  return c;
}

// Recolor: draw src, then multiply-tint it (keeps shading).
export function tint(src, color, amount = 1) {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = amount;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, src.width, src.height);
  return c;
}

// Swap palette characters in pixel rows (e.g. 'r'->'a' for an ash heart).
export function swapChars(rows, map) {
  return rows.map((r) => r.replace(/./g, (ch) => (ch in map ? map[ch] : ch)));
}

// Soft radial glow, used for light around flames and explosions.
export function makeGlow(radius, color) {
  const size = radius * 2;
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

// Pixel ellipse shadow.
export function makeShadow(w, h, alpha = 0.4) {
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  const rx = w / 2, ry = h / 2;
  for (let y = 0; y < h; y++) {
    const dy = (y + 0.5 - ry) / ry;
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - dy * dy)));
    if (half > 0) ctx.fillRect(Math.round(rx - half), y, half * 2, 1);
  }
  return c;
}

// Scale2x (EPX): doubles a pixel-art canvas while rounding off diagonal edges,
// so enlarged icons look drawn at the bigger size instead of blocky.
export function scale2x(src) {
  const w = src.width, h = src.height;
  const sctx = src.getContext('2d');
  const s = new Uint32Array(sctx.getImageData(0, 0, w, h).data.buffer);
  const [c, ctx] = makeCanvas(w * 2, h * 2);
  const out = ctx.createImageData(w * 2, h * 2);
  const d = new Uint32Array(out.data.buffer);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : s[y * w + x]);
  const W2 = w * 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = s[y * w + x];
      const A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let p1 = P, p2 = P, p3 = P, p4 = P;
      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;
      const o = y * 2 * W2 + x * 2;
      d[o] = p1; d[o + 1] = p2; d[o + W2] = p3; d[o + W2 + 1] = p4;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

export function drawSprite(ctx, img, x, y) {
  ctx.drawImage(img, Math.round(x), Math.round(y));
}
