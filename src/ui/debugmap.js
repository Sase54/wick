// Debug: the whole floor plan at a glance (L with ?debug, or WICK.game.debugFloorMap = true).
// Every room in its real shape and colored by kind, hidden rooms included; the number in each
// room is how many rooms you walk through from the start; dead ends have a yellow rim; cells
// that can never hold a room (an L's corner, beside a narrow room) show a dot; the ultra secret
// room's spot is a red U. The seed, the room counts and how many tries the floor took are on top.
import { VIEW_W, VIEW_H } from '../engine/canvas.js';
import { drawText } from './text.js';
import { GRID_W, GRID_H, ukey } from '../game/floorgen.js';
import { SPECIAL_TYPES } from '../data/specialRooms.js';

const COLORS = {
  start: '#e8d9b0', normal: '#6a5a4a', boss: '#c0262c', treasure: '#f0c040', shop: '#5ac060',
  secret: '#5a7ad0', supersecret: '#8a5ae0', ultrasecret: '#ff4a3a', red: '#8a2a24',
};
const OTHER = '#d07ac0';   // every other special room
const color = (type) => COLORS[type] || OTHER;
const LEGEND = [['start', 'START'], ['normal', 'ROOM'], ['boss', 'BOSS'], ['treasure', 'TREASURE'], ['shop', 'SHOP'],
  ['secret', 'SECRET'], ['supersecret', 'SUPER SECRET'], ['other', 'OTHER SPECIAL']];

export function drawDebugFloorMap(ctx, game) {
  const floor = game.floor;
  if (!floor) return;
  ctx.fillStyle = 'rgba(6,4,3,0.92)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const cw = 20, ch = 14;
  const left = 6, top = 22;
  // the grid
  ctx.fillStyle = '#1a1410';
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) ctx.fillRect(left + x * cw, top + y * ch, cw - 1, ch - 1);
  const reserved = floor.plan?.reserved || new Set();
  ctx.fillStyle = '#4a3a2a';
  for (const k of reserved) ctx.fillRect(left + (k % GRID_W) * cw + cw / 2 - 1, top + Math.floor(k / GRID_W) * ch + ch / 2 - 1, 2, 2);
  // rooms
  for (const c of floor.cells.values()) {
    if (c.offGrid) continue;
    const own = new Set(c.units.map(([x, y]) => ukey(x, y)));
    ctx.fillStyle = color(c.type);
    for (const [x, y] of c.units) {
      const px = left + x * cw, py = top + y * ch;
      // join a big room's screens into one piece
      const w = own.has(ukey(x + 1, y)) ? cw : cw - 1, h = own.has(ukey(x, y + 1)) ? ch : ch - 1;
      if (c.shape === 'hall') ctx.fillRect(px, py + 3, w, h - 6);
      else if (c.shape === 'shaft') ctx.fillRect(px + 5, py, w - 10, h);
      else ctx.fillRect(px, py, w, h);
    }
    const [ux, uy] = c.units[0];
    const px = left + ux * cw, py = top + uy * ch;
    if (c.deadEnd) {
      ctx.strokeStyle = '#ffe04a';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, cw - 2, ch - 2);
    }
    if (c === game.cell) {
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(px + 1.5, py + 1.5, cw - 4, ch - 4);
    }
    const label = c.firstBoss ? 'B1' : c.type === 'boss' && floor.def.labyrinth ? 'B2' : c.dist >= 99 || c.dist == null ? '-' : String(c.dist);
    drawText(ctx, label, px + cw / 2, py + 3, { align: 'center', color: c.type === 'start' || c.type === 'treasure' ? '#1a1008' : '#ffffff', shadow: false });
  }
  if (floor.ultra) {
    const [x, y] = floor.ultra;
    ctx.strokeStyle = '#ff4a3a';
    ctx.strokeRect(left + x * cw + 0.5, top + y * ch + 0.5, cw - 2, ch - 2);
    drawText(ctx, 'U', left + x * cw + cw / 2, top + y * ch + 3, { align: 'center', color: '#ff4a3a', shadow: false });
  }

  // what's on the floor
  const cells = [...floor.cells.values()].filter((c) => !c.offGrid);
  const deadEnds = cells.filter((c) => c.deadEnd).length;
  drawText(ctx, `SEED ${game.seed}   FLOOR ${game.floorNum}: ${floor.def.name || ''}${game.curse ? '   CURSE: ' + game.curse.toUpperCase() : ''}`, 6, 4, { color: '#e8d9b0' });
  drawText(ctx, `${floor.plan?.target ?? '?'} ROOMS + HIDDEN, ${deadEnds} DEAD ENDS, ${floor.plan?.attempts ?? '?'} TRIES`, 6, 12, { color: '#9a8a74' });
  // legend and the special rooms on this floor
  const lx = left + GRID_W * cw + 8;
  let ly = top;
  for (const [type, name] of LEGEND) {
    ctx.fillStyle = type === 'other' ? OTHER : color(type);
    ctx.fillRect(lx, ly + 1, 7, 6);
    drawText(ctx, name, lx + 10, ly, { color: '#c9b48a', shadow: false });
    ly += 9;
  }
  ctx.strokeStyle = '#ffe04a';
  ctx.strokeRect(lx + 0.5, ly + 1.5, 6, 5);
  drawText(ctx, 'DEAD END', lx + 10, ly, { color: '#c9b48a', shadow: false });
  ly += 9;
  drawText(ctx, 'NUMBER: STEPS', lx, ly, { color: '#9a8a74', shadow: false });
  ly += 12;
  const specials = cells.filter((c) => SPECIAL_TYPES[c.type] && !['supersecret'].includes(c.type));
  for (const c of specials.slice(0, 8)) {
    drawText(ctx, `${(SPECIAL_TYPES[c.type].name || c.type).replace(/^THE /, '')} ${c.dist < 99 ? c.dist : ''}`, lx, ly, { color: OTHER, shadow: false });
    ly += 9;
  }
  drawText(ctx, 'L / TAP: CLOSE', VIEW_W - 6, VIEW_H - 10, { align: 'right', color: '#9a8a74' });
}
