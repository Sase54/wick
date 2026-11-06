// A tiny pixel-art painter for sprites that are drawn with shapes in code
// (big bosses). Paint shapes onto a grid of colors, add an outline, turn it into a canvas.
import { makeCanvas } from './sprites.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);

export class PixelGrid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null);
  }

  set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x];
  }

  clear(x, y) { this.set(x, y, null); }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  // Filled ellipse. `shade` can be a function (nx, ny, x, y) -> color for lighting.
  ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        this.set(x, y, typeof color === 'function' ? color(nx, ny, x, y) : color);
      }
    }
  }

  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }

  // Polygon fill (even-odd), points as [[x, y], ...]
  poly(points, color) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i], [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y + 0.5 && y1 > y + 0.5) || (y1 <= y + 0.5 && y0 > y + 0.5)) {
          xs.push(x0 + ((y + 0.5 - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) {
          this.set(x, y, typeof color === 'function' ? color(x, y) : color);
        }
      }
    }
  }

  // Dark outline around every painted pixel (outside only).
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }

  toCanvas() {
    const [c, ctx] = makeCanvas(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const col = this.px[y * this.w + x];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }
}

// Pick a color from a ramp (dark -> light) for a lighting value 0..1 with ordered dithering.
export function ramp(colors, v, x, y) {
  const b = BAYER[(y & 3) * 4 + (x & 3)] - 0.5;
  const i = Math.max(0, Math.min(colors.length - 1, Math.floor(v * colors.length + b * 0.9)));
  return colors[i];
}

// Simple top-left lighting for a sphere-ish shape: nx, ny in -1..1.
export function light(nx, ny) {
  return Math.max(0, Math.min(1, 0.62 - nx * 0.28 - ny * 0.42));
}
