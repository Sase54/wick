// Circle-vs-tile collision with sliding. Entities are { x, y, r }.
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
      resolve(e, room, mode);
      if (Math.abs(e.x - want) > 0.001) hit |= HIT_X;
    }
    if (sy) {
      const want = e.y + sy;
      e.y = want;
      resolve(e, room, mode);
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

export function resolve(e, room, mode = 'walk') {
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

// Is a ground point inside a tile that stops shots?
export function shotBlocked(room, x, y) {
  return room.blocksShots(room.colAt(x), room.rowAt(y));
}

export function circlesOverlap(a, b, extra = 0) {
  const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r + extra;
  return dx * dx + dy * dy < rr * rr;
}
