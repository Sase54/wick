// The map. The minimap sits in the top-right corner; holding Tab (or Back on a pad, or a finger
// on the minimap) lays a big, see-through map of the whole floor over the game.
//
// Rooms are drawn in their real shape (big rooms and L-shapes join into one piece), the room
// you're in pulses, rooms you've been to are filled, rooms you've only seen through a door are
// outlines. Special rooms carry an icon (the 1-bit pack's icons on the big map, small hand-drawn
// copies on the minimap), and rooms you've been to show what's still lying in them.
//
// Map items (field `map` in src/data/items.js): 'rooms' shows every room's shape, 'icons' shows
// every special room's icon, 'secrets' reveals the secret rooms. The Torn Map curse hides it all.
import { buildSprite } from '../engine/sprites.js';
import { VIEW_W, VIEW_H } from '../engine/canvas.js';
import { packSprite } from '../engine/packart.js';
import { heldSources } from '../game/items.js';
import { HEART_KINDS, PICKUPS } from '../data/pickups.js';
import { drawText } from './text.js';

const OUT = '#0a0606';

// ---------------------------------------------------------------------------
// Small icons for the minimap: about 7x7, '#' the icon's color, 'k' dark detail; outlined when
// built. They copy the shapes of the big map's pack icons.
const SMALL = {
  boss: ['.#####.', '##k#k##', '##k#k##', '#######', '.##k##.', '.#.#.#.'],
  treasure: ['#..#..#', '##.#.##', '#######', '#k#k#k#', '#######'],
  shop: ['..###..', '...#...', '.#####.', '##k####', '###k###', '####k##', '.#####.'],
  secret: ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'],
  supersecret: ['#.###.#', '.#...#.', '....#..', '...#...', '.......', '...#...'],
  ultrasecret: ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'],
  curse: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  sacrifice: ['...#...', '...#...', '..###..', '..###..', '..###..', '.#####.', '#######'],
  arcade: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  challenge: ['......#', '.....#.', '....#..', '#..#...', '.##....', '.##....', '#..#...'],
  bosschallenge: ['......#', '.....#.', '....#..', '#..#...', '.##....', '.##....', '#..#...'],
  library: ['######.', '#kkkk##', '#.##.##', '#kkkk##', '#.##.##', '#kkkk##', '######.'],
  vault: ['.#####.', '#######', '###k###', '#######', '#######'],
  dice: ['#######', '#k###k#', '#######', '###k###', '#######', '#k###k#', '#######'],
  nursery: ['#......', '#......', '##.....', '#######', '#######', '#.....#'],
  sickroom: ['#......', '#......', '##.....', '#######', '#######', '#.....#'],
  miniboss: ['#.....#', '#.###.#', '.#####.', '##k#k##', '#######', '.##.##.'],
  planetarium: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '#.....#'],
  devil: ['...#...', '..##...', '..###..', '.####.#', '.#####.', '###k###', '.#####.'],
  angel: ['#.....#', '##...##', '###.###', '#######', '.#####.', '..#.#..'],
  bossrush: ['#######', '#.###.#', '.#####.', '..###..', '...#...', '..###..', '.#####.'],
  error: ['##', '##', '##', '##', '..', '##'],
};
// What's left lying in a room: 3x3 marks
const MARKS = {
  item: ['.#.', '###', '.#.'], heart: ['#.#', '###', '.#.'], coin: ['.#.', '#k#', '.#.'],
  key: ['#..', '###', '#.#'], bomb: ['.#.', '###', '###'], chest: ['###', '#k#', '###'],
};

const ICON_COLOR = {
  boss: '#e8e0d0', treasure: '#f0c040', shop: '#f0c040', secret: '#9ab0e0', supersecret: '#9ab0e0',
  ultrasecret: '#ff4a3a', curse: '#c060c0', sacrifice: '#d84a3a', arcade: '#f0c040', challenge: '#c4baa8',
  bosschallenge: '#ff6a5a', library: '#d8a868', vault: '#c8a048', dice: '#e8dcbc', nursery: '#e8b8c8',
  sickroom: '#9ccf6a', miniboss: '#d0c0b0', planetarium: '#a0b8ff', devil: '#ff5a2a', angel: '#f4f4fc',
  bossrush: '#f0c040', error: '#ff40ff',
  item: '#fff3c0', heart: '#e0303a', coin: '#f0c040', key: '#c4bfb6', bomb: '#9a948c', chest: '#b8865a',
};

// A character-grid icon with a dark outline round it.
function outlined(rows, color) {
  const w = Math.max(...rows.map((r) => r.length)) + 2;
  const grid = ['.'.repeat(w), ...rows.map((r) => `.${r.padEnd(w - 2, '.')}.`), '.'.repeat(w)];
  const solid = (x, y) => { const ch = grid[y]?.[x]; return ch === '#' || ch === 'k'; };
  const out = grid.map((r, y) => [...r].map((ch, x) => (ch === '.' && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ? 'k' : ch)).join(''));
  return buildSprite(out, { '#': color, k: OUT });
}
const small = new Map();
function smallIcon(name, set = SMALL) {
  if (!small.has(name)) small.set(name, set[name] ? outlined(set[name], ICON_COLOR[name]) : null);
  return small.get(name);
}

// ---------------------------------------------------------------------------
// What the player knows about the floor
function knowledge(game) {
  const k = { rooms: false, icons: false, secrets: false };
  for (const { d } of heldSources(game.player)) if (d.map) k[d.map] = true;   // items and trinkets
  return k;
}
const SECRET_TYPES = new Set(['secret', 'supersecret', 'ultrasecret', 'red']);
function shown(c, k) {
  if (c.offGrid) return false;
  if (c.seen) return true;
  if (k.secrets && (c.type === 'secret' || c.type === 'supersecret')) return true;
  return k.rooms && !SECRET_TYPES.has(c.type);
}
const hasIcon = (c) => c.type !== 'normal' && c.type !== 'start' && !!ICON_COLOR[c.type];

// What's still lying in a room you've been to (kinds, at most four).
function leftovers(c) {
  const r = c.room;
  if (!r || !c.visited) return [];
  const kinds = new Set();
  if (r.pedestals.some((p) => p.item)) kinds.add('item');
  for (const p of r.pickups) {
    if (p.collected) continue;
    const kind = PICKUPS[p.type]?.kind;
    if (HEART_KINDS.has(kind)) kinds.add('heart');
    else if (kind === 'coin' || kind === 'key' || kind === 'bomb') kinds.add(kind);
  }
  if (r.props?.some((pr) => pr.kind === 'chest' && !pr.state.open)) kinds.add('chest');
  return [...kinds].slice(0, 4);
}

// ---------------------------------------------------------------------------
// Draw the floor's rooms into a window of the grid.
//   v: { left, top, cols, rows, x0, y0 (grid unit at the window's top-left), sx, sy (stride),
//        big (the pack's 16px icons) }
function drawRooms(ctx, game, v, t) {
  const { floor, cell: current } = game;
  const k = knowledge(game);
  const W = v.sx - 2, H = v.sy - 2;
  const unitRect = (gx, gy) => [v.left + (gx - v.x0) * v.sx + 1, v.top + (gy - v.y0) * v.sy + 1];
  const inWin = (gx, gy) => gx >= v.x0 && gy >= v.y0 && gx < v.x0 + v.cols && gy < v.y0 + v.rows;
  const pulse = 0.5 + Math.sin(t * 5) * 0.5;

  // a room's pieces: a rect per unit, plus bridges over the gaps between its own units
  const pieces = (c) => {
    const units = new Set(c.units.map(([x, y]) => `${x},${y}`));
    const has = (x, y) => units.has(`${x},${y}`);
    const out = [];
    for (const [gx, gy] of c.units) {
      if (!inWin(gx, gy)) continue;
      const [x, y] = unitRect(gx, gy);
      if (c.shape === 'hall') { out.push([x, y + Math.floor(H / 4), W, Math.ceil(H / 2)]); continue; }
      if (c.shape === 'shaft') { out.push([x + Math.floor(W / 4), y, Math.ceil(W / 2), H]); continue; }
      out.push([x, y, W, H]);
      if (has(gx + 1, gy)) out.push([x + W, y, 2, H]);
      if (has(gx, gy + 1)) out.push([x, y + H, W, 2]);
      if (has(gx + 1, gy) && has(gx, gy + 1) && has(gx + 1, gy + 1)) out.push([x + W, y + H, 2, 2]);
    }
    return out;
  };

  const cells = [...floor.cells.values()].filter((c) => shown(c, k));
  // all the outlines first, so no neighbor's outline covers a room
  for (const c of cells) for (const [x, y, w, h] of pieces(c)) { ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); }
  for (const c of cells) {
    const red = c.type === 'red' || c.type === 'ultrasecret';
    const here = c === current, ps = pieces(c);
    for (const [x, y, w, h] of ps) {
      if (here) { ctx.fillStyle = '#e8d9b0'; ctx.fillRect(x, y, w, h); }
      else if (c.visited) { ctx.fillStyle = red ? '#8a3a34' : '#7a6c5c'; ctx.fillRect(x, y, w, h); }
      else { ctx.fillStyle = red ? '#2a0e0c' : '#1c1612'; ctx.fillRect(x, y, w, h); }
    }
    // the rim, traced round the whole shape: a lit top and a shaded bottom on rooms you've been
    // in, a light outline on rooms you've only seen
    const inside = (px, py) => ps.some(([x, y, w, h]) => px >= x && px < x + w && py >= y && py < y + h);
    const rim = here ? ['#fff6d8', '#c9b48a', null] : c.visited ? [red ? '#a8524a' : '#948470', red ? '#5a2420' : '#5a4e42', null]
      : [red ? '#7a2a24' : '#6a5a4a', red ? '#7a2a24' : '#6a5a4a', red ? '#7a2a24' : '#6a5a4a'];
    for (const [x, y, w, h] of ps) for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
      const col = !inside(px, py - 1) ? rim[0] : !inside(px, py + 1) ? rim[1] : (!inside(px - 1, py) || !inside(px + 1, py)) ? rim[2] : null;
      if (col) { ctx.fillStyle = col; ctx.fillRect(px, py, 1, 1); }
    }
    if (here) {
      ctx.globalAlpha = 0.25 + pulse * 0.5; ctx.fillStyle = '#ffd25a';
      for (const [x, y, w, h] of ps) ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }
  // icons (also for unseen special rooms when you know where they are) and leftovers
  for (const c of floor.cells.values()) {
    if (c.offGrid) continue;
    const vis = shown(c, k);
    if (!vis && !(k.icons && hasIcon(c) && !SECRET_TYPES.has(c.type))) continue;
    const us = c.units.filter(([gx, gy]) => inWin(gx, gy));
    if (!us.length) continue;
    const [ax, ay] = unitRect(...us[0]);
    if (hasIcon(c)) {
      const icon = (v.big && packSprite(`map:${c.type}`)) || smallIcon(c.type);
      if (icon) ctx.drawImage(icon, ax + Math.floor((W - icon.width) / 2), ay + Math.floor((H - icon.height) / 2));
    }
    leftovers(c).forEach((kind, i) => {
      const m = smallIcon(kind, MARKS);
      if (v.big) ctx.drawImage(m, ax + 1 + i * 6, ay + H - m.height);
      else ctx.drawImage(m, ax + W - m.width + 1 - i * 4, ay + H - m.height + 1);
    });
  }
}

// ---------------------------------------------------------------------------
// The minimap: a 7x5 window of the grid around the screen you're in.
const MINI = { cols: 7, rows: 5, sx: 14, sy: 11 };
const MINI_W = MINI.cols * MINI.sx + 4, MINI_H = MINI.rows * MINI.sy + 4;

function minimapRect(right = VIEW_W - 3, top = 3) {
  return { x: right - MINI_W, y: top, w: MINI_W, h: MINI_H };
}

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(8,5,4,${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = OUT;
  ctx.fillRect(x - 1, y - 1, w + 2, 1); ctx.fillRect(x - 1, y + h, w + 2, 1); ctx.fillRect(x - 1, y, 1, h); ctx.fillRect(x + w, y, 1, h);
  ctx.fillStyle = 'rgba(232,217,176,0.22)';
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  // a bolt in each corner
  ctx.fillStyle = 'rgba(232,217,176,0.5)';
  for (const [cx, cy] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]]) ctx.fillRect(cx, cy, 1, 1);
}

export function drawMinimap(ctx, game, right = VIEW_W - 3, top = 3) {
  const r = minimapRect(right, top);
  panel(ctx, r.x, r.y, r.w, r.h, 0.62);
  // centered on the screen-sized unit the player is standing in (big rooms span several)
  const room = game.room, p = game.player, current = game.cell;
  const ux = Math.max(0, Math.min(Math.floor(room.cols / 13) - 1, Math.floor((p.x - room.x0) / (13 * 24))));
  const uy = Math.max(0, Math.min(Math.floor(room.rows / 7) - 1, Math.floor((p.y - room.y0) / (7 * 24))));
  const x0 = (current.offGrid ? 7 : current.x + ux) - (MINI.cols >> 1);
  const y0 = (current.offGrid ? 5 : current.y + uy) - (MINI.rows >> 1);
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); ctx.clip();
  drawRooms(ctx, game, { left: r.x + 2, top: r.y + 2, ...MINI, x0, y0, big: false }, game.time);
  ctx.restore();
}

// The big map: every room you know, as large as fits, over the dimmed game.
export function drawBigMap(ctx, game) {
  ctx.fillStyle = 'rgba(4,3,2,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (game.curse === 'lost') {
    drawText(ctx, 'THE MAP IS TORN', VIEW_W / 2, VIEW_H / 2 - 6, { align: 'center', scale: 2, color: '#c0262c' });
    return;
  }
  const k = knowledge(game);
  const cells = [...game.floor.cells.values()].filter((c) => !c.offGrid && (shown(c, k) || (k.icons && hasIcon(c) && !SECRET_TYPES.has(c.type))));
  if (!cells.length) return;
  const xs = cells.flatMap((c) => c.units.map((u) => u[0])), ys = cells.flatMap((c) => c.units.map((u) => u[1]));
  const x0 = Math.min(...xs), y0 = Math.min(...ys), cols = Math.max(...xs) - x0 + 1, rows = Math.max(...ys) - y0 + 1;
  const sx = Math.max(10, Math.min(26, Math.floor(330 / cols), Math.floor((176 / rows) * 4 / 3)));
  const sy = Math.round(sx * 0.75);
  const w = cols * sx + 8, h = rows * sy + 8;
  const left = Math.round((VIEW_W - w) / 2), top = Math.round((VIEW_H - h) / 2) + 6;
  panel(ctx, left, top, w, h, 0.5);
  ctx.globalAlpha = 0.92;
  drawRooms(ctx, game, { left: left + 4, top: top + 4, cols, rows, x0, y0, sx, sy, big: sx >= 20 }, game.time);
  ctx.globalAlpha = 1;
  drawText(ctx, game.floorDef?.name || '', VIEW_W / 2, top - 11, { align: 'center', color: '#e8d9b0' });
}

// Is a point (view pixels) on the minimap? Touch: holding a finger there opens the big map.
export function onMinimap(x, y) {
  const r = minimapRect();
  return x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 6;
}
