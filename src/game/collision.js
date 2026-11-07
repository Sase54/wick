// Circle-vs-tile collision with sliding. Entities are { x, y, r }, or with `box: { hw, hh }` a box
// of half-width hw and half-height hh around (x, y) instead (the player's feet).
import { TILE } from './constants.js';

export const HIT_X = 1;
export const HIT_Y = 2;

// mode: 'walk' (rocks + pits), 'fly' (rocks only), 'ghost' (only the room's walls)
export function moveCircle(e, dx, dy, room, mode = 'walk') {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  const sx = dx / steps, sy = dy / steps;
  let hit = 0;
  for (let i = 0; i < steps; i++) {
    if (sx) {
      const want = e.x + sx;
      e.x = want;
      resolve(e, room, mode, 'x');
      if (Math.abs(e.x - want) > 0.001) hit |= HIT_X;
    }
    if (sy) {
      const want = e.y + sy;
      e.y = want;
      resolve(e, room, mode, 'y');
      if (Math.abs(e.y - want) > 0.001) hit |= HIT_Y;
    }
  }
  return hit;
}

function solidFor(room, mode) {
  if (mode === 'fly') return (c, r) => room.isFlySolid(c, r);
  if (mode === 'ghost') return (c, r) => room.isWall(c, r);
  return (c, r) => room.isWalkSolid(c, r);
}

// axis: the axis just moved along ('x' / 'y'), so a box is pushed back the way it came
export function resolve(e, room, mode = 'walk', axis = null) {
  if (e.box) return resolveBox(e, room, mode, axis);
  const r = e.r;
  room.clampToWalls(e);

  const solid = solidFor(room, mode);
  const c0 = Math.floor((e.x - r - room.x0) / TILE), c1 = Math.floor((e.x + r - room.x0) / TILE);
  const r0 = Math.floor((e.y - r - room.y0) / TILE), r1 = Math.floor((e.y + r - room.y0) / TILE);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (!solid(col, row)) continue;
      const tx = room.x0 + col * TILE, ty = room.y0 + row * TILE;
      const cx = Math.max(tx, Math.min(e.x, tx + TILE));
      const cy = Math.max(ty, Math.min(e.y, ty + TILE));
      const ddx = e.x - cx, ddy = e.y - cy;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 >= r * r) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = r - d;
        e.x += (ddx / d) * push;
        e.y += (ddy / d) * push;
      } else {
        // Center is inside the tile: push out along the shortest axis.
        const left = e.x - tx, right = tx + TILE - e.x, up = e.y - ty, down = ty + TILE - e.y;
        const m = Math.min(left, right, up, down);
        if (m === left) e.x = tx - r;
        else if (m === right) e.x = tx + TILE + r;
        else if (m === up) e.y = ty - r;
        else e.y = ty + TILE + r;
      }
    }
  }
}

// Box version: push out of every solid tile it overlaps, along the axis it moved on (or the
// shortest way out when it didn't move, e.g. a rock appearing under it).
function resolveBox(e, room, mode, axis) {
  room.clampToWalls(e);
  const { hw, hh } = e.box;
  const solid = solidFor(room, mode);
  const c0 = Math.floor((e.x - hw - room.x0) / TILE), c1 = Math.floor((e.x + hw - 0.001 - room.x0) / TILE);
  const r0 = Math.floor((e.y - hh - room.y0) / TILE), r1 = Math.floor((e.y + hh - 0.001 - room.y0) / TILE);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (!solid(col, row)) continue;
      const tx = room.x0 + col * TILE, ty = room.y0 + row * TILE;
      const left = e.x + hw - tx, right = tx + TILE - (e.x - hw);
      const up = e.y + hh - ty, down = ty + TILE - (e.y - hh);
      if (left <= 0 || right <= 0 || up <= 0 || down <= 0) continue;
      const ox = Math.min(left, right), oy = Math.min(up, down);
      if (axis === 'x' || (!axis && ox <= oy)) e.x += left < right ? -left : right;
      else e.y += up < down ? -up : down;
    }
  }
}

// Is a ground point inside a tile that stops shots?
export function shotBlocked(room, x, y) {
  return room.blocksShots(room.colAt(x), room.rowAt(y));
}

export function circlesOverlap(a, b, extra = 0) {
  const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r + extra;
  return dx * dx + dy * dy < rr * rr;
}
