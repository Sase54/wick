// Exits that appear after a boss:
//   'hatch' - a wooden trapdoor down to the next floor
//   'light' - after the final boss, a beam of daylight leading out of the cellar
import { PixelGrid, ramp } from '../engine/pixelgrid.js';
import { RAMP as R } from '../data/packArt.js';
import { TUNING } from '../data/tuning.js';

export class Trapdoor {
  constructor(x, y, kind = 'hatch') {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.r = 8;
    this.t = 0;
    this.open = 0; // 0..1
  }

  // Returns true on the frame the flaps finish opening (the game puffs dust and thuds).
  update(dt) {
    this.t += dt;
    const F = TUNING.flow, was = this.open;
    if (this.t > F.trapdoorDelay) this.open = Math.min(1, this.open + dt / F.trapdoorOpen);
    return was < 1 && this.open >= 1;
  }

  get ready() { return this.open >= 1; }

  // Drawn as part of the floor, under everything else.
  renderFloor(ctx, ox, oy) {
    if (this.kind === 'light') return this.renderLight(ctx, ox, oy);
    const hole = holeArt();
    const x = Math.round(this.x - hole.width / 2 + ox), y = Math.round(this.y - hole.height / 2 + oy);
    ctx.drawImage(hole, x, y);
    // two iron-banded flaps folding open to the sides
    const flap = flapArt(), w = Math.round(11 * (1 - this.open));
    if (w > 0) {
      ctx.drawImage(flap, 0, 0, w, flap.height, x + 4, y + 4, w, flap.height);
      ctx.save(); ctx.translate(x + hole.width - 4, 0); ctx.scale(-1, 1);
      ctx.drawImage(flap, 0, 0, w, flap.height, 0, y + 4, w, flap.height);
      ctx.restore();
    }
  }

  renderLight(ctx, ox, oy) {
    const k = this.open;
    if (k <= 0) return;
    const x = Math.round(this.x + ox), y = Math.round(this.y + oy);
    const pulse = 0.85 + Math.sin(this.t * 3) * 0.15;
    ctx.globalCompositeOperation = 'lighter';
    // the beam, falling from the ceiling
    for (let i = 0; i < 14; i++) {
      const w = 10 + i * 1.4;
      ctx.fillStyle = `rgba(255,236,180,${0.05 * k * pulse})`;
      ctx.fillRect(Math.round(x - w / 2), 0, Math.round(w), y + 4);
    }
    // the bright spot on the floor
    for (let r = 16; r > 0; r -= 2) {
      ctx.fillStyle = `rgba(255,240,200,${0.08 * k * pulse})`;
      for (let dy = -r * 0.45; dy <= r * 0.45; dy++) {
        const half = Math.round(r * Math.sqrt(Math.max(0, 1 - (dy / (r * 0.45)) ** 2)));
        ctx.fillRect(x - half, Math.round(y + dy), half * 2, 1);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // floating motes
    ctx.fillStyle = '#fff6d8';
    for (let i = 0; i < 6; i++) {
      const mx = x + Math.sin(this.t * 0.8 + i * 1.7) * 8;
      const my = y - ((this.t * 14 + i * 13) % 60);
      ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
  }
}

// The hole: a rim of stones, a wooden frame, a ladder fading into the dark. Cached.
let HOLE = null, FLAP = null;
function holeArt() {
  if (HOLE) return HOLE;
  const g = new PixelGrid(30, 22);
  for (let y = 0; y < 22; y++) for (let x = 0; x < 30; x++) {
    const nx = (x - 14.5) / 15, ny = (y - 10.5) / 11, d = nx * nx + ny * ny;
    if (d > 1) continue;
    g.set(x, y, ramp(R.stone, 0.62 - ny * 0.3 + ((x * 7 + y * 3) % 4) * 0.04 - (x % 6 === 0 || y % 5 === 0 ? 0.25 : 0), x, y));
  }
  for (let y = 3; y < 19; y++) for (let x = 3; x < 27; x++) g.set(x, y, ramp(R.wood, 0.55 - (y === 3 || x === 3 ? -0.2 : 0) - (x % 5 === 0 ? 0.2 : 0), x, y));
  for (let y = 5; y < 17; y++) for (let x = 5; x < 25; x++) g.set(x, y, ramp(R.void, 0.35 - (y - 5) / 14, x, y));
  for (const lx of [10, 19]) for (let y = 5; y < 17; y++) g.set(lx, y, ramp(R.wood, 0.7 - (y - 5) / 12, lx, y));
  for (let y = 7; y < 17; y += 3) for (let x = 11; x < 19; x++) g.set(x, y, ramp(R.wood, 0.55 - (y - 5) / 14, x, y));
  for (const [x, y] of [[4, 4], [25, 4], [4, 17], [25, 17]]) g.set(x, y, R.iron[4]);
  HOLE = g.outline('#0a0606').toCanvas();
  return HOLE;
}
function flapArt() {
  if (FLAP) return FLAP;
  const g = new PixelGrid(11, 14);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 11; x++) g.set(x, y, ramp(R.wood, 0.6 - (x % 4 === 0 ? 0.25 : 0) - y / 40, x, y));
  for (const y of [3, 10]) for (let x = 0; x < 11; x++) g.set(x, y, R.iron[x % 3 ? 3 : 4]);
  g.set(9, 7, R.iron[5]);
  FLAP = g.toCanvas();
  return FLAP;
}
