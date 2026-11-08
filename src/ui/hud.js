// In-game HUD: active item, hearts, coin/bomb/key counters, Found HUD stats, minimap,
// item info, boss bar and banners.
import { buildSprite, swapChars } from '../engine/sprites.js';
import {
  PICKUP_COLORS, HEART_ROWS, PICKUP_SPRITES, ASH_HEART, SOOT_HEART, MOLDY_HEART, MELTED_HEART,
  BRASS_RIM, VIGIL_MARK, ribHeart, halfOf,
} from '../data/pickupSprites.js';
import { MECHANICS } from '../game/mechanics.js';
import { TUNING } from '../data/tuning.js';
import { drawText, wrapText, measureText } from './text.js';
import { drawMinimap, drawBigMap } from './minimap.js';
import { VIEW_W, VIEW_H } from '../engine/canvas.js';
import { itemDef, itemIcon, describeItem, Pedestal } from '../game/items.js';
import { statIcon, formatStat, STAT_ORDER } from './statIcons.js';
import { drawWaxPanel, INK } from './wax.js';
import { dealOdds } from '../game/specials.js';
import { pocketList, consumableIcon, consumableName, trinketIcon } from '../game/consumables.js';

const HUD_COLORS = PICKUP_COLORS;

let ART = null;
function art() {
  if (ART) return ART;
  const b = (rows) => buildSprite(rows, HUD_COLORS);
  // Half heart: left half filled, right half an empty container.
  const half = HEART_ROWS.map((row) => row.split('').map((ch, i) => (i >= 6 && /[RHh]/.test(ch) ? 'x' : ch)).join(''));
  ART = {
    full: b(HEART_ROWS),
    half: b(half),
    empty: b(swapChars(HEART_ROWS, { H: 'x', R: 'X', h: 'x' })),
    rotten: b(MOLDY_HEART),
    ashFull: b(ASH_HEART),
    ashHalf: b(halfOf(ASH_HEART)),
    sootFull: b(SOOT_HEART),
    sootHalf: b(halfOf(SOOT_HEART)),
    bone: [b(ribHeart('x', 'x')), b(ribHeart('H', 'x')), b(ribHeart('H', 'H'))],
    broken: b(MELTED_HEART),
    rim: b(BRASS_RIM),
    vigil: b(VIGIL_MARK),
    coin: b(PICKUP_SPRITES.coin[0]),
    bomb: b(PICKUP_SPRITES.bomb[0]),
    key: b(PICKUP_SPRITES.key[0]),
  };
  return ART;
}

const HEARTS_PER_ROW = 6;

// The hearts row, left to right like the original: containers, extra hearts, melted slots.
// Brass rims sit on the last hearts; the Vigil flame sits on the last container (or first heart).
export function drawHearts(ctx, health, x, y, t = 0) {
  const a = art();
  const h = health;
  if (h.oneHit) {
    drawText(ctx, 'ONE HIT', x, y + 2, { color: '#c8d8f0' });
    return;
  }
  const slots = [];
  const full = Math.floor(h.red / 2);
  for (let i = 0; i < h.containers; i++) {
    const filled = h.red - i * 2;
    const rotten = i < full && i >= full - h.rotten;
    slots.push(rotten ? a.rotten : filled >= 2 ? a.full : filled === 1 ? a.half : a.empty);
  }
  for (const e of h.extra) {
    if (e.t === 'bone') slots.push(a.bone[e.v]);
    else if (e.t === 'black') slots.push(e.v >= 2 ? a.sootFull : a.sootHalf);
    else slots.push(e.v >= 2 ? a.ashFull : a.ashHalf);
  }
  const hearts = slots.length;
  for (let i = 0; i < h.broken; i++) slots.push(a.broken);
  const pos = (i) => [x + (i % HEARTS_PER_ROW) * 12, y + Math.floor(i / HEARTS_PER_ROW) * 11];
  slots.forEach((img, i) => { const [px, py] = pos(i); ctx.drawImage(img, px, py); });
  for (let i = hearts - h.golden; i < hearts; i++) {
    if (i < 0) continue;
    const [px, py] = pos(i);
    ctx.globalAlpha = 0.85 + Math.sin(t * 5 + i) * 0.15;
    ctx.drawImage(a.rim, px, py);
    ctx.globalAlpha = 1;
  }
  if (h.eternal) {
    const [px, py] = pos(Math.max(0, h.containers - 1));
    ctx.drawImage(a.vigil, px + 7, py - 2 + Math.round(Math.sin(t * 4)));
  }
}

// Coins, bombs and keys. A counter that changes pops: the icon swells and the number flashes.
function drawCounters(ctx, game, x, y) {
  const a = art(), player = game.player;
  const rows = [['coins', a.coin, player.coins], ['bombs', a.bomb, player.bombs], ['keys', a.key, player.keys]];
  const pop = (player._pop ??= { last: { coins: player.coins, bombs: player.bombs, keys: player.keys }, t: {} });
  const T = TUNING.flow.counterPop;
  rows.forEach(([k, icon, n], i) => {
    if (n !== pop.last[k]) { pop.t[k] = { at: game.time, up: n > pop.last[k] }; pop.last[k] = n; }
    const age = pop.t[k] ? game.time - pop.t[k].at : 99;
    const kk = age < T ? 1 - age / T : 0;                     // 1 at the change, down to 0
    const ry = y + i * 16;
    const s = 1 + kk * 0.5;
    const w = Math.round(icon.width * s), h = Math.round(icon.height * s);
    const cx = x + 6, cy = ry + 7;
    ctx.drawImage(icon, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
    const col = kk > 0 ? (pop.t[k].up ? '#fff3b0' : '#ff8a7a') : undefined;
    drawText(ctx, String(n).padStart(2, '0'), x + 16, ry + 4 - Math.round(kk * 2), col ? { color: col } : undefined);
  });
}

// An active item with its charge bar (one notch per room). Used for the active slot in the
// top-left corner and the pocket slot in the bottom-right one.
function drawActive(ctx, game, act, x, y, barLeft = false) {
  const S = 26;
  ctx.fillStyle = 'rgba(8,5,4,0.6)';
  ctx.fillRect(x, y, S, S);
  if (!act) return;
  const a = itemDef(act.id).active;
  const icon = itemIcon(act.id);
  ctx.drawImage(icon, x + S / 2 - Math.floor(icon.width / 2), y + S / 2 - Math.floor(icon.height / 2));
  if (a.costHealth) return;   // paid in hearts: no charge bar
  const max = a.charge;
  const ready = act.charge >= max;
  const bx = barLeft ? x - 7 : x + S + 1, h = S;
  ctx.fillStyle = '#160f0c';
  ctx.fillRect(bx, y, 6, h);
  const fill = Math.round((h - 2) * Math.min(1, act.charge / max));
  ctx.fillStyle = ready ? (Math.floor(game.time * 4) % 2 ? '#ffd25a' : '#fff3c0') : '#f08a24';
  ctx.fillRect(bx + 1, y + h - 1 - fill, 4, fill);
  ctx.fillStyle = '#160f0c';
  if (!a.timed) for (let i = 1; i < max; i++) ctx.fillRect(bx + 1, y + 1 + Math.round(((h - 2) * i) / max), 4, 1);
}

// The pocket, bottom right: the chosen thing big (Q / PKT uses it), the rest small beside it
// (F / SWAP picks the next). A consumable shows its name above, "???" for a pill not yet taken.
function drawPocket(ctx, game) {
  const p = game.player, list = pocketList(p);
  if (!list.length) return;
  const sel = p.pocketSel % list.length, cur = list[sel];
  const S = 26, px = VIEW_W - 30, py = VIEW_H - 30;
  if (cur.kind === 'active') drawActive(ctx, game, p.pocket, px, py, true);
  else {
    ctx.fillStyle = 'rgba(8,5,4,0.6)';
    ctx.fillRect(px, py, S, S);
    const icon = consumableIcon(cur);
    ctx.drawImage(icon, px + S / 2 - Math.floor(icon.width / 2), py + S / 2 - Math.floor(icon.height / 2));
    drawText(ctx, consumableName(game, cur), VIEW_W - 4, py - 9, { align: 'right', color: '#d8c69a' });
  }
  const keys = !game.touch.enabled;
  if (keys) drawText(ctx, 'Q', px + 22, py + 18, { color: '#8a7a62' });
  // the others to the left, a little dimmer, in the order SWAP goes through them
  let x = px - (cur.kind === 'active' ? 9 : 2);
  for (let i = 1; i < list.length; i++) {
    const it = list[(sel + i) % list.length];
    const icon = it.kind === 'active' ? itemIcon(p.pocket.id) : consumableIcon(it);
    x -= 24;
    ctx.fillStyle = 'rgba(8,5,4,0.45)';
    ctx.fillRect(x, py + 3, 22, 23);
    ctx.globalAlpha = 0.7;
    ctx.drawImage(icon, x + 11 - Math.floor(icon.width / 2), py + 14 - Math.floor(icon.height / 2));
    ctx.globalAlpha = 1;
  }
  if (keys && list.length > 1) drawText(ctx, 'F', x - 7, py + 15, { color: '#8a7a62' });
}

// The held trinket, bottom left (golden ones shimmer).
function drawTrinket(ctx, game) {
  const t = game.player.trinket;
  if (!t) return;
  const icon = trinketIcon(t), x = 4, y = VIEW_H - icon.height - 4;
  ctx.fillStyle = 'rgba(8,5,4,0.45)';
  ctx.fillRect(x - 2, y - 2, icon.width + 4, icon.height + 4);
  ctx.drawImage(icon, x, y);
  if (t.golden && Math.floor(game.time * 3) % 5 === 0) {
    ctx.fillStyle = '#fff3c0';
    ctx.fillRect(x + 3 + Math.floor(game.time * 9) % (icon.width - 4), y + 2, 1, 1);
  }
}

// Character mechanics with something to show (heat, crumble timer, next form...).
function drawMechanics(ctx, game, x, y) {
  const p = game.player;
  let h = 0;
  for (const [name, m] of Object.entries(p.mech)) {
    const fn = MECHANICS[name].hud;
    if (fn) h += fn(ctx, game, x, y + h, p, m) + 2;
  }
  return h;
}

// A small arrow (7x6 plus an outline) pointing up or down, for stat changes.
function drawStatArrow(ctx, x, y, up, color) {
  const rows = up ? [1, 3, 5, 7, 3, 3] : [3, 3, 7, 5, 3, 1];
  const line = (i, w) => ctx.fillRect(x + 3 - (w >> 1), y + i, w, 1);
  ctx.fillStyle = '#160f0c';
  rows.forEach((w, i) => line(i, w + 2));
  line(-1, up ? 1 : 5);
  line(rows.length, up ? 5 : 1);
  ctx.fillStyle = color;
  rows.forEach((w, i) => line(i, w));
}

// Found HUD: stats down the left side, with a +/- flash when one changes.
function drawStats(ctx, game, x, y) {
  const p = game.player;
  const hud = (p._hud ??= { last: { ...p.stats }, deltas: {} });
  for (const k of STAT_ORDER) {
    const diff = p.stats[k] - hud.last[k];
    if (Math.abs(diff) > 0.001) hud.deltas[k] = { v: diff, t: game.time };
    hud.last[k] = p.stats[k];
  }
  STAT_ORDER.forEach((k, i) => {
    const ry = y + i * 16;
    const icon = statIcon(k);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(icon, x, ry + Math.floor((14 - icon.height) / 2));
    const w = drawText(ctx, formatStat(k, p.stats[k]), x + 16, ry + 4, { color: '#d8c69a' });
    ctx.globalAlpha = 1;
    const d = hud.deltas[k];
    const age = d ? game.time - d.t : 99, show = TUNING.hud.statArrowTime;
    if (age < show) {
      // a green arrow up or a red arrow down (bobbing), then how much it changed; fades at the end
      ctx.globalAlpha = Math.min(1, (show - age) / 0.5);
      const up = d.v > 0, col = up ? '#9ccf6a' : '#d6453a';
      const ax = x + 19 + w, ay = ry + 3 + (Math.floor(game.time * 4) % 2) * (up ? -1 : 1);
      drawStatArrow(ctx, ax, ay, up, col);
      drawText(ctx, `${up ? '+' : ''}${formatStat(k, d.v)}`, ax + 9, ry + 4, { color: col });
      ctx.globalAlpha = 1;
    }
  });
  // this floor's odds of a deal door after the boss, live (src/game/specials.js dealOdds)
  const odds = dealOdds(game), ry = y + STAT_ORDER.length * 16 + 2;
  [['devil', odds.devil, '#e05a4a'], ['angel', odds.angel, '#e8e8f4']].forEach(([k, v, col], i) => {
    const dx = x + i * 38, icon = statIcon(k);
    ctx.globalAlpha = v > 0 ? 0.9 : 0.4;
    ctx.drawImage(icon, dx, ry + Math.floor((14 - icon.height) / 2));
    drawText(ctx, `${Math.round(v * 100)}%`, dx + 16, ry + 4, { color: v > 0 ? col : '#8a7a62' });
    ctx.globalAlpha = 1;
  });
}

// Detailed item info: what the item on the nearest pedestal does, before you take it.
function drawItemInfo(ctx, game) {
  const p = game.player;
  let best = null, bd = 44;
  for (const ped of game.room.pedestals) {
    if (!ped.item) continue;
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (d < bd) { bd = d; best = ped; }
  }
  if (!best || Pedestal.veiled) return;   // the Veiled Altars curse hides what items do too
  const def = itemDef(best.item);
  const w = 236;
  const lines = describeItem(best.item).flatMap((l) => wrapText(l, w - 44));
  const h = Math.max(34, 22 + Math.min(4, lines.length) * 9);
  const x = Math.round(VIEW_W / 2 - w / 2), y = VIEW_H - h - 6;
  drawWaxPanel(ctx, x, y, w, h, 1, 13);
  const icon = itemIcon(best.item);
  ctx.drawImage(icon, x + 18 - Math.floor(icon.width / 2), y + Math.floor(h / 2) - Math.floor(icon.height / 2));
  drawText(ctx, def.name, x + 36, y + 5, { color: INK.title, shadow: false });
  // quality pips 0-4
  for (let q = 0; q < 4; q++) {
    ctx.fillStyle = q < def.quality ? INK.sel : '#c9b48a';
    ctx.fillRect(x + w - 34 + q * 7, y + 6, 5, 5);
  }
  lines.slice(0, 4).forEach((l, i) => drawText(ctx, l, x + 36, y + 16 + i * 9, { color: INK.text, shadow: false }));
}

// Boss health bar along the bottom of the screen.
function drawBossBar(ctx, boss, t) {
  const w = 180, h = 6;
  const x = Math.round(VIEW_W / 2 - w / 2), y = VIEW_H - 13;
  const k = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = '#160f0c';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#3a0c0c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = boss.phase === 2 ? (Math.floor(t * 6) % 2 ? '#f04a24' : '#c0262c') : '#c0262c';
  ctx.fillRect(x, y, Math.round(w * k), h);
  ctx.fillStyle = '#ff6a5a';
  ctx.fillRect(x, y, Math.round(w * k), 1);
  // half-health notch: where phase two starts
  ctx.fillStyle = '#160f0c';
  ctx.fillRect(x + w / 2, y, 1, h);
  drawText(ctx, boss.name, VIEW_W / 2, y - 10, { align: 'center', color: '#e8d9b0' });
}

export function drawHud(ctx, game) {
  const bosses = game.bosses.filter((b) => !b.dead);
  if (bosses.length === 1) drawBossBar(ctx, bosses[0], game.time);
  else if (bosses.length > 1) {
    // several bosses at once share one bar
    const hp = bosses.reduce((s, b) => s + Math.max(0, b.hp), 0), max = bosses.reduce((s, b) => s + b.maxHp, 0);
    drawBossBar(ctx, { hp, maxHp: max, phase: 1, name: bosses.map((b) => b.name.replace(/^THE /, '')).join(' + ') }, game.time);
  }
  else {
    // minibosses get a bar too
    const mini = game.enemies.find((e) => e.def.mini && !e.dead && e.spawnT <= 0);
    if (mini) drawBossBar(ctx, { hp: mini.hp, maxHp: mini.maxHp, phase: 1, name: mini.def.name.toUpperCase() }, game.time);
  }
  const p = game.player;
  const hasActive = !!p.active;
  if (hasActive) drawActive(ctx, game, p.active, 3, 3);
  // the Blank Heart curse hides your health
  if (game.curse === 'unknown') drawText(ctx, '???', hasActive ? 41 : 6, 6, { scale: 2, color: '#c0262c' });
  else drawHearts(ctx, p.health, hasActive ? 39 : 4, 3, game.time);
  drawPocket(ctx, game);
  drawTrinket(ctx, game);
  drawCounters(ctx, game, 3, 32);
  const mh = drawMechanics(ctx, game, 4, 82);
  if (game.settings.foundHud) drawStats(ctx, game, 3, 86 + mh);
  if (game.settings.itemInfo === 'detailed' && !game.transition) drawItemInfo(ctx, game);
  // the minimap (the Torn Map curse takes it away); held open (Tab), the big map over everything
  const bigMap = game.input?.map && !game.paused;
  if (!bigMap) drawMinimap(ctx, game);   // (the Torn Map curse shows only the room you're in)

  const b = game.banner;
  if (b && (b.item || b.icon) && b.t < b.dur && !bigMap) drawItemStrip(ctx, b);
  else if (b && b.t < b.dur && !bigMap) {
    const fade = Math.min(1, b.t / 0.4, (b.dur - b.t) / 0.6);
    const y = b.top ? 26 : 52;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = 'rgba(6,4,4,0.7)';
    ctx.fillRect(0, y, VIEW_W, 34);
    drawText(ctx, b.text, VIEW_W / 2, y + 6, { align: 'center', scale: 2, color: '#e8d9b0' });
    if (b.sub) drawText(ctx, b.sub, VIEW_W / 2, y + 24, { align: 'center', color: '#8a7a62' });
    ctx.globalAlpha = 1;
  }

  if (bigMap) drawBigMap(ctx, game);

  if (game.settings.showFps) {
    drawText(ctx, `${game.fps | 0} FPS`, VIEW_W - 4, VIEW_H - 10, { align: 'right', color: '#9ccf6a' });
  }
}

// A new item, Isaac style: a strip of wax unrolls across the top with the item's name in big
// letters and its line under it, the icon at the side; it drips away after a few seconds.
function drawItemStrip(ctx, b) {
  const k = Math.min(1, b.t / 0.35), out = Math.max(0, (b.t - (b.dur - 0.5)) / 0.5);
  const name = b.text.toUpperCase();
  const big = measureText(name, 2) <= 196;
  const w = Math.min(VIEW_W - 24, Math.max(150, (big ? measureText(name, 2) : measureText(name)) + 64, measureText((b.sub || '').toUpperCase()) + 44));
  const h = b.sub ? 34 : 24;
  const x = Math.round((VIEW_W - w) / 2), y = 6 - Math.round(out * 40);
  ctx.globalAlpha = 1 - out;
  drawWaxPanel(ctx, x, y, w, h, k, 41);
  if (k >= 1) {
    const icon = b.icon || itemIcon(b.item);
    ctx.drawImage(icon, x + 6, y + Math.round((h - icon.height) / 2));
    const tx = x + 28 + (w - 34) / 2;
    drawText(ctx, name, tx, y + 5, { align: 'center', scale: big ? 2 : 1, color: INK.title, shadow: false });
    if (b.sub) drawText(ctx, b.sub.toUpperCase(), tx, y + (big ? 22 : 16), { align: 'center', color: INK.dim, shadow: false });
  }
  ctx.globalAlpha = 1;
}
