// Weapons: HOW the candle attacks. Items (and characters) choose a FORM with `shot.weapon` in
// src/data/items.js. Every shot trait works with every form, so items stack freely:
// homing, pierce, spectral, bounce, split, multishot, sizeMul, backShot, knockbackMul, explode,
// and the per-shot chances (poison, burn, slow, freeze, fear, charm, crit, chain).
//
//   tears   wax shots on a cooldown (the default; Slow Cooker style `charged` works here)
//   beam    hold to charge, let go: a thick searing beam for a moment
//   laser   a thin laser that stays on while you hold
//   knife   a blade held in front of you: hold to draw it back, let go to throw it, it comes back
//   sword   swing in an arc while you hold; keep swinging to charge a spin that throws a slash wave
//   bombs   every attack rolls out a little bomb that bursts (never hurts you)
// Two DELIVERY traits change whatever form you have:
//   barrage  charge up, then it all comes out at once: a spray of shots, a fan of beams...
//   lobbed   shots arc through the air and burst where they land; every other form's hits burst
// When several forms are held, the first one in FORM_PRIORITY wins (the rest are kept, so
// losing the top one falls back to the next).
//
// How each trait reads on each form:
//   trait       tears/bombs        beam / laser                knife                 sword
//   homing      steer              the ray bends to enemies   steers in flight      aims at the nearest
//   pierce      through enemies    beam always; laser stops   always pierces        hits everything
//                                  at the first enemy without
//   spectral    over rocks         beam always; laser stops   flies over rocks      -
//                                  at rocks without
//   bounce      off walls          the ray reflects           bounces before        the slash wave
//                                                             coming back           bounces
//   split       on landing         where the ray hits         where it hits         where it hits
//   multishot   more shots         more rays in a fan         more knives           wider arc + waves
//   sizeMul     bigger shots       wider rays                 bigger blade          longer reach
//   backShot    one backwards      one backwards              one behind            hits behind too
//   statuses, crit, chain, explode: rolled per attack and carried by every hit
import { TILE } from './constants.js';
import { STATUS } from '../data/items.js';
import { SHOT_STYLES } from './projectiles.js';
import { sfx } from '../engine/audio.js';

const TAU = Math.PI * 2;
export const FORM_PRIORITY = ['sword', 'knife', 'beam', 'laser', 'bombs', 'tears'];
export const DELIVERY = ['barrage', 'lobbed'];
// statuses an attack can carry onto what it hits (crit, chain and blast are handled apart)
const STATUS_KEYS = Object.keys(STATUS).filter((k) => !['crit', 'chain', 'blast'].includes(k));

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = (a) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};
const ownerOf = (t) => t.boss || t;
const alive = (t) => (t.boss ? t.boss.hittable : t.hittable && !t.dead);

// ---------------------------------------------------------------------------------
// PAYLOAD: what one attack carries onto everything it hits (rolled once per attack).
export function payload(p, mul = 1, opt = {}) {
  const sh = p.shot, roll = p.rollShot();
  const crit = !!roll.crit;
  const statuses = STATUS_KEYS.filter((k) => roll[k]);
  const rolled = statuses[0];
  if (p.fiendT > 0 && !statuses.includes('burn')) statuses.push('burn');
  return {
    damage: p.shotDamage * mul * (crit ? 3 : 1),
    crit,
    statuses,
    chain: !!roll.chain,
    explode: !!(sh.explode || sh.lobbed || roll.blast),
    split: sh.split,
    knock: 48 * sh.knockbackMul * (crit ? 1.6 : 1),
    style: crit ? 'gold' : opt.style || (rolled ? STATUS[rolled].style : p.fiendT > 0 ? 'ember' : sh.style),
  };
}

// A burst that carries the attack's statuses (Nitro Wax, lobbed shots, bomb shots...).
export function blast(g, x, y, r, dmg, pl) {
  const onHit = pl.statuses.length ? (t) => { for (const k of pl.statuses) t.applyStatus?.(k, dmg); } : null;
  g.explode(x, y, r, dmg, { safe: true, onHit });
}

// Little shots bursting out of a hit (Spider Egg Sac on anything that isn't a tear).
export function splitAt(g, p, x, y, angle, pl, owner = null) {
  const n = pl.split, sh = p.shot;
  if (!n) return;
  const base = angle + Math.PI / n;
  for (let i = 0; i < n; i++) {
    const a = base + (i / n) * TAU;
    const c = g.projectiles.spawn({
      x, y, z: 8, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 2, damage: pl.damage * 0.5, range: 48,
      style: pl.style, team: 'player', knockback: pl.knock * 0.5, child: true,
      homing: sh.homing, pierce: sh.pierce, spectral: sh.spectral,
      ...Object.fromEntries(pl.statuses.map((k) => [k, true])),
    });
    if (owner) c.hits.add(owner);
  }
}

// Land an attack on one target from g.targets(). Weapons that touch the same enemy many times
// a second pass `procs` (a Map) so the costly extras (bursts, splitting) only happen every
// `gap` seconds per enemy.
export function strike(g, p, t, pl, dx, dy, { mul = 1, knock = 1, procs = null, gap = 0.45 } = {}) {
  const owner = ownerOf(t);
  const dmg = pl.damage * mul;
  for (const k of pl.statuses) owner.applyStatus?.(k, dmg);
  if (t.boss) t.boss.takeHit(dmg, g);
  else t.takeHit(dmg, dx, dy, pl.knock * knock, g);
  if (pl.chain) g.projectiles.chain({ damage: dmg }, t.boss ? null : t, t);
  p.runMech('shotHit', g, t, dmg);
  if (!pl.explode && !pl.split) return;
  if (procs) {
    if (g.time - (procs.get(owner) ?? -9) < gap) return;
    procs.set(owner, g.time);
  }
  if (pl.explode) blast(g, t.x, t.y, 22 * clamp(p.shot.sizeMul, 1, 1.6), dmg * 1.2, pl);
  if (pl.split) splitAt(g, p, t.x, t.y, Math.atan2(dy, dx), pl, owner);
}

function killEnemyShots(g, test) {
  for (const s of g.projectiles.pool.live) {
    if (s.team === 'enemy' && !s.removed && test(s)) { s.removed = true; g.projectiles.splash(s, true); }
  }
}

// Hold to charge. Returns the charge (0..1) on the frame you let go, otherwise -1.
function charge(dt, p, shooting, time) {
  p.chargeTimeOverride = time;
  if (shooting) {
    p.charging = true;
    p.chargeT = Math.min(time, p.chargeT + dt);
    return -1;
  }
  if (!p.charging) return -1;
  p.charging = false;
  const c = p.chargeT / time;
  p.chargeT = 0;
  return c;
}

// The directions one attack goes: the aim, a fan for multishot (and barrage), one behind.
function fan(p, ang, extra = 0, spread = 0.22) {
  const n = 1 + p.shot.multishot + extra;
  const out = [];
  for (let i = 0; i < n; i++) out.push(ang + (i - (n - 1) / 2) * spread);
  if (p.shot.backShot) out.push(ang + Math.PI);
  return out;
}

// Twin helpers copy every attack, and mechanics hear about it (echoes, a second candle, heat).
function attacked(g, p, dx, dy, mul = 1) {
  for (const f of g.familiars) if (f.def.variant === 'twin' || f.mimic) burst(g, p, f, dx, dy, mul * 0.75, 1, { quiet: true });
  p.runMech('fired', g, dx, dy, mul, 1);
}

// ---------------------------------------------------------------------------------
// RAYS (beam and laser). A ray marches through the room in small steps: it bends toward
// enemies (homing), reflects off walls (bounce), stops at rocks unless it passes them and at
// the first enemy unless it pierces. Returns the path and what it touched.
const STEP = 4;
export function trace(g, x, y, ang, maxLen, { homing = false, bounce = 0, passRocks = true, pierce = true, width = 6, wrap: wrapWalls = false } = {}) {
  const rm = g.room, targets = g.targets();
  const pts = [[x, y]];
  let wrapLeft = wrapWalls ? 1 : 0;
  const hits = [];
  const seen = new Set();
  let left = bounce, len = 0, rock = null, guard = 0;
  while (len < maxLen && guard++ < 700) {
    if (homing) {
      let best = null, bd = 120 * 120;
      for (const t of targets) {
        if (seen.has(ownerOf(t))) continue;
        const d2 = (t.x - x) ** 2 + (t.y - y) ** 2;
        if (d2 < bd && Math.abs(wrap(Math.atan2(t.y - y, t.x - x) - ang)) < 1.4) { bd = d2; best = t; }
      }
      if (best) ang += clamp(wrap(Math.atan2(best.y - y, best.x - x) - ang), -0.1, 0.1);
    }
    const nx = x + Math.cos(ang) * STEP, ny = y + Math.sin(ang) * STEP;
    const outX = nx < rm.x0 || nx >= rm.R, outY = ny < rm.y0 || ny >= rm.B;
    if (outX || outY) {
      pts.push([clamp(nx, rm.x0, rm.R - 1), clamp(ny, rm.y0, rm.B - 1)]);
      if (wrapLeft-- > 0) {
        // through the wall and out the other side (a break in the drawn line)
        x = outX ? (nx < rm.x0 ? rm.R - 1 : rm.x0) : nx;
        y = outY ? (ny < rm.y0 ? rm.B - 1 : rm.y0) : ny;
        pts.push(null, [x, y]);
        continue;
      }
      if (left-- <= 0) break;
      if (outX) ang = Math.PI - ang;
      if (outY) ang = -ang;
      continue;
    }
    if (!passRocks) {
      const c = rm.colAt(nx), r = rm.rowAt(ny);
      if (rm.blocksShots(c, r)) {
        pts.push([nx, ny]);
        if (left-- <= 0) { rock = { c, r }; break; }
        if (rm.blocksShots(rm.colAt(x), r)) ang = -ang;
        else ang = Math.PI - ang;
        continue;
      }
    }
    x = nx; y = ny; len += STEP;
    let stop = false;
    for (const t of targets) {
      const o = ownerOf(t);
      if (seen.has(o)) continue;
      const rr = t.r + width / 2;
      if ((t.x - x) ** 2 + (t.y - y) ** 2 > rr * rr) continue;
      seen.add(o);
      hits.push({ t, dx: Math.cos(ang), dy: Math.sin(ang) });
      if (!pierce) { stop = true; break; }
    }
    if (homing) pts.push([x, y]);
    if (stop) break;
  }
  const last = pts[pts.length - 1];
  if (last[0] !== x || last[1] !== y) pts.push([x, y]);
  return { pts, hits, rock, end: { x, y } };
}

// Rays are drawn at chest height, 6 pixels above where they hit.
export function drawRay(ctx, pts, ox, oy, width, k, style) {
  if (pts.length < 2 || k <= 0) return;
  const cols = SHOT_STYLES[style] || SHOT_STYLES.ember;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    let gap = true;
    for (const q of pts) {
      if (!q) { gap = true; continue; }
      const px = Math.round(q[0] + ox), py = Math.round(q[1] - 6 + oy);
      if (gap) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      gap = false;
    }
  };
  const w = Math.max(1, width * k);
  ctx.strokeStyle = cols[1];
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = w * 1.9 + 2;
  path(); ctx.stroke();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = cols[2];
  ctx.lineWidth = w;
  path(); ctx.stroke();
  ctx.strokeStyle = cols[4];
  ctx.lineWidth = Math.max(1, w * 0.4);
  path(); ctx.stroke();
  ctx.restore();
  const end = pts[pts.length - 1];
  ctx.fillStyle = cols[3];
  const s = Math.max(2, Math.round(w));
  ctx.fillRect(Math.round(end[0] - s / 2 + ox), Math.round(end[1] - 6 - s / 2 + oy), s, s);
}

// Beams are thick and run to the wall. Every extra beam item makes it bigger: the second one
// doubles the width and adds x1.2 damage and +1 damage, each one after that +1 damage and a bit wider.
// Lasers are thin, pierce everything and also run to the wall.
function beamLevel(p) { return Math.max(1, p.shot.beamLevel || 1); }
function rayOpts(p, kind) {
  const sh = p.shot;
  if (kind === 'beam') {
    const lv = beamLevel(p);
    const width = 13 * clamp(sh.sizeMul, 0.6, 2.2) * (lv >= 2 ? 2 : 1) * (1 + 0.2 * Math.max(0, lv - 2));
    return { homing: sh.homing, bounce: sh.bounce, passRocks: true, pierce: true, width, wrap: sh.wrap };
  }
  return { homing: sh.homing, bounce: sh.bounce, passRocks: true, pierce: true, width: 2 * clamp(sh.sizeMul, 0.6, 3), wrap: sh.wrap };
}
const rayStyle = (pl, kind) => (pl.style !== 'wax' ? pl.style : kind === 'beam' ? 'red' : 'ember');
const RAY_LEN = 1600;   // beams and lasers run until they hit a wall
const BEAM_TICK = 1 / 15;   // a beam burns 15 times a second...
const BEAM_LIFE = 0.9;      // ...for a bit under a second: 13 ticks of full damage
const BEAM_TURN = 5.5;      // radians per second: the beam swings after you a little late

// One ray that lives a moment: a beam (follows where you face, a little late) or a laser flash.
function addRay(g, p, w, src, ang, mul, kind, life) {
  let m = mul;
  if (kind === 'beam') {
    const lv = beamLevel(p);
    if (lv >= 2) m *= 1.2 * (1 + (lv - 1) / Math.max(1, p.shotDamage));
  }
  const pl = payload(p, m);
  (w.rays ??= []).push({ src, rel: ang - Math.atan2(p.head.y, p.head.x), ang, follow: src === p, kind, life, t: 0, tick: 0, pl, procs: new Map(), pts: null });
}

function updateRays(dt, g, p, w) {
  if (!w.rays?.length) return;
  const face = Math.atan2(p.head.y, p.head.x);
  for (const b of w.rays) {
    b.t += dt;
    b.tick -= dt;
    if (b.follow && b.kind === 'beam') b.ang += clamp(wrap(face + b.rel - b.ang), -BEAM_TURN * dt, BEAM_TURN * dt);
    const o = rayOpts(p, b.kind);
    const sx = b.src.x + Math.cos(b.ang) * 6, sy = b.src.y - 2 + Math.sin(b.ang) * 4;
    const tr = trace(g, sx, sy, b.ang, RAY_LEN, o);
    b.pts = tr.pts;
    b.width = o.width;
    if (b.tick > 0) continue;
    // a beam burns in ticks; a laser flash hits once
    b.tick = b.kind === 'beam' ? BEAM_TICK : 99;
    for (const h of tr.hits) strike(g, p, h.t, b.pl, h.dx, h.dy, { knock: b.kind === 'beam' ? 0.35 : 0.8, procs: b.procs, gap: 0.3 });
    if (p.shot.eraser) eraseAlong(g, tr.pts, b.width);
    if (tr.rock) g.room.hitTile(tr.rock.c, tr.rock.r, g);
    if (b.kind === 'beam' && Math.random() < 0.5) {
      const e = tr.end, cols = SHOT_STYLES[rayStyle(b.pl, 'beam')];
      g.particles.burst(e.x, e.y, 3, { colors: [cols[2], cols[3], cols[1]], z: 6, speed: 60, vz: 50, gravity: 300, life: 0.3, size: 1, sizeVar: 1 });
    }
  }
  w.rays = w.rays.filter((b) => b.t < b.life);
}

function renderRays(ctx, ox, oy, w, p) {
  for (const b of w.rays || []) {
    if (!b.pts) continue;
    const k = b.t < 0.06 ? b.t / 0.06 : 1 - Math.max(0, (b.t - b.life + 0.15) / 0.15);
    // a living beam swells and shivers
    const wob = b.kind === 'beam' ? 1 + Math.sin(b.t * 50) * 0.08 : 1;
    drawRay(ctx, b.pts, ox, oy, b.width * wob, k, rayStyle(b.pl, b.kind));
    if (b.kind === 'beam' && k > 0.2) {
      const cols = SHOT_STYLES[rayStyle(b.pl, 'beam')];
      const [x0, y0] = b.pts[0], s = Math.round(b.width * 0.9 * k);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = cols[3];
      ctx.beginPath(); ctx.arc(Math.round(x0 + ox), Math.round(y0 - 6 + oy), s * 0.75, 0, TAU); ctx.fill();
      ctx.fillStyle = cols[4];
      ctx.beginPath(); ctx.arc(Math.round(x0 + ox), Math.round(y0 - 6 + oy), s * 0.4, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------------------------
// KNIVES
function drawBlade(ctx, x, y, ang, scale, art) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(ang);
  ctx.scale(scale, scale);
  if (art === 'shovel') {
    ctx.fillStyle = '#1a120c'; ctx.fillRect(-9, -1.5, 13, 3);
    ctx.fillStyle = '#7a5034'; ctx.fillRect(-8, -0.5, 12, 1);
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(3, -4, 8, 8);
    ctx.fillStyle = '#9a9aa4'; ctx.fillRect(4, -3, 6, 6);
    ctx.fillStyle = '#d8d8e0'; ctx.fillRect(4, -3, 6, 1);
  } else {
    // a long kitchen knife: dark handle, rivets, a pale steel blade with a sharp tip
    ctx.fillStyle = '#160f0c';
    ctx.fillRect(-8, -2, 7, 4);
    ctx.beginPath(); ctx.moveTo(-1, -3); ctx.lineTo(10, -2); ctx.lineTo(14, 0); ctx.lineTo(10, 2); ctx.lineTo(-1, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3420'; ctx.fillRect(-7, -1, 5, 2);
    ctx.fillStyle = '#c8b48a'; ctx.fillRect(-6, -1, 1, 1); ctx.fillRect(-4, -1, 1, 1);
    ctx.fillStyle = '#b8bcc8';
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(10, -1); ctx.lineTo(13, 0); ctx.lineTo(10, 1); ctx.lineTo(0, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f0f4ff'; ctx.fillRect(1, -2, 9, 1);
  }
  ctx.restore();
}

function knifeSet(p, w) {
  const want = fan(p, 0, 0, 0.5).length;
  w.knives ??= [];
  const own = w.knives.filter((k) => !k.temp);
  if (own.length !== want) {
    const offs = fan(p, 0, 0, 0.5);
    w.knives = [...w.knives.filter((k) => k.temp), ...offs.map((off, i) => own[i] ? Object.assign(own[i], { off }) : { src: p, off, state: 'held', x: p.x, y: p.y, ang: 0, hits: new Map() })];
  }
}

function throwKnife(g, p, k, ang, c) {
  const sh = p.shot;
  k.state = 'out';
  k.ang = ang;
  k.dist = 0;
  k.max = (0.3 + 0.7 * c) * Math.max(80, p.stats.range * TILE * 1.15);
  k.mul = 2 + 4 * c;
  k.bounce = sh.bounce;
  k.pl = payload(p, 1);
  k.procs = new Map();
  k.seen = new Set();
  k.spray = sh.barrage;
}

function updateKnife(dt, g, p, w, k) {
  const sh = p.shot, rm = g.room;
  const size = clamp(sh.sizeMul, 0.8, 2.2);
  const rad = 6 * size;
  if (k.state === 'held') {
    const aim = Math.atan2(p.lastShoot.y, p.lastShoot.x) + k.off;
    const pull = p.charging ? (p.chargeT / p.chargeTime) * 7 : 0;
    k.ang = aim;
    k.x = k.src.x + Math.cos(aim) * (12 - pull);
    k.y = k.src.y - 2 + Math.sin(aim) * (10 - pull);
    // a held blade cuts what it touches
    if (!w.heldPl || g.time - w.heldAt > 0.5) { w.heldPl = payload(p, 1); w.heldAt = g.time; }
    for (const t of g.targets()) {
      const o = ownerOf(t);
      if ((t.x - k.x) ** 2 + (t.y - k.y) ** 2 > (t.r + rad) ** 2 || g.time - (k.hits.get(o) ?? -9) < 0.3) continue;
      k.hits.set(o, g.time);
      strike(g, p, t, w.heldPl, Math.cos(aim), Math.sin(aim), { mul: 2, procs: k.hits2 ??= new Map() });
    }
    return;
  }
  const out = k.state === 'out';
  const sp = (out ? 330 : 400) * clamp(p.stats.shotSpeed, 0.6, 1.8);
  if (out) {
    if (sh.homing) {
      let best = null, bd = 130 * 130;
      for (const t of g.targets()) {
        if (k.seen.has(ownerOf(t))) continue;
        const d2 = (t.x - k.x) ** 2 + (t.y - k.y) ** 2;
        if (d2 < bd) { bd = d2; best = t; }
      }
      if (best) k.ang += clamp(wrap(Math.atan2(best.y - k.y, best.x - k.x) - k.ang), -7 * dt, 7 * dt);
    }
    const nx = k.x + Math.cos(k.ang) * sp * dt, ny = k.y + Math.sin(k.ang) * sp * dt;
    k.dist += sp * dt;
    const outX = nx < rm.x0 + 2 || nx >= rm.R - 2, outY = ny < rm.y0 + 2 || ny >= rm.B - 2;
    const c = rm.colAt(nx), r = rm.rowAt(ny);
    const rock = !sh.spectral && rm.blocksShots(c, r);
    let turn = k.dist >= k.max;
    if (outX || outY || rock) {
      if (rock) rm.hitTile(c, r, g);
      if (k.bounce > 0) {
        k.bounce--;
        if (outX || (rock && !rm.blocksShots(rm.colAt(k.x), r))) k.ang = Math.PI - k.ang;
        else k.ang = -k.ang;
        k.seen.clear();
      } else turn = true;
    } else {
      k.x = nx; k.y = ny;
    }
    if (turn) {
      k.state = 'back';
      k.seen.clear();
      if (k.spray) {
        g.player.fire(g, Math.cos(k.ang), Math.sin(k.ang), 0.6, 0.8, { from: { x: k.x, y: k.y }, spray: 8 + 3 * sh.multishot, ring: true, noHook: true, quiet: true });
        sfx('splash');
      }
    }
  } else {
    const dx = k.src.x - k.x, dy = k.src.y - 2 - k.y, d = Math.hypot(dx, dy) || 1;
    k.ang = Math.atan2(-dy, -dx);
    if (d < 10) {
      if (k.temp) { k.dead = true; return; }
      k.state = 'held';
      k.hits.clear();
      return;
    }
    k.x += (dx / d) * Math.min(d, sp * dt);
    k.y += (dy / d) * Math.min(d, sp * dt);
  }
  // a flying blade cuts everything once per leg and swats enemy shots away
  for (const t of g.targets()) {
    const o = ownerOf(t);
    if (k.seen.has(o) || (t.x - k.x) ** 2 + (t.y - k.y) ** 2 > (t.r + rad) ** 2) continue;
    k.seen.add(o);
    strike(g, p, t, k.pl, Math.cos(k.ang), Math.sin(k.ang), { mul: k.mul, knock: 1.4, procs: k.procs, gap: 0.05 });
  }
  killEnemyShots(g, (s) => Math.hypot(s.x - k.x, s.y - k.y) < s.r + rad);
}

// ---------------------------------------------------------------------------------
// SWORD SWINGS
function swingAt(g, p, w, src, ang, mul, { spin = false } = {}) {
  const sh = p.shot;
  const reach = 26 * clamp(sh.sizeMul, 0.8, 1.8) + 2;
  if (sh.homing && !spin) {
    let best = null, bd = (reach + 40) ** 2;
    for (const t of g.targets()) {
      const d2 = (t.x - src.x) ** 2 + (t.y - src.y) ** 2;
      if (d2 < bd && Math.abs(wrap(Math.atan2(t.y - src.y, t.x - src.x) - ang)) < 1.7) { bd = d2; best = t; }
    }
    if (best) ang = Math.atan2(best.y - src.y, best.x - src.x);
  }
  const arc = spin ? Math.PI + 0.01 : Math.min(2.6, 1.15 + 0.25 * sh.multishot);
  const dirs = spin ? [ang] : sh.backShot ? [ang, ang + Math.PI] : [ang];
  const pl = payload(p, mul);
  const inArc = (x, y, r) => {
    const dx = x - src.x, dy = y - (src.y - 4), d = Math.hypot(dx, dy);
    if (d > reach + r) return false;
    if (d < r + 8) return true;
    return dirs.some((a) => Math.abs(wrap(Math.atan2(dy, dx) - a)) < arc);
  };
  let hit = null;
  const once = new Set(), procs = new Map();
  for (const t of g.targets()) {
    const o = ownerOf(t);
    if (once.has(o) || !inArc(t.x, t.y, t.r)) continue;
    once.add(o);
    hit ??= t;
    const d = Math.hypot(t.x - src.x, t.y - src.y) || 1;
    strike(g, p, t, { ...pl, explode: false }, (t.x - src.x) / d, (t.y - src.y) / d, { mul: spin ? 4 : 3, knock: 3.3, procs });
  }
  killEnemyShots(g, (s) => inArc(s.x, s.y, s.r));
  const tx = src.x + Math.cos(ang) * 18, ty = src.y + Math.sin(ang) * 18;
  g.room.hitTile(g.room.colAt(tx), g.room.rowAt(ty), g);
  // one burst at the tip of the blade when it connects
  if (hit && pl.explode) blast(g, hit.x, hit.y, 24, pl.damage * 2, pl);
  (w.slashes ??= []).push({ src, ang, arc, dirs, reach, t: 0, life: spin ? 0.3 : 0.2, spin, style: pl.style });
  if (hit) g.shake(2);
  sfx('swing');
  return pl;
}

function drawSlash(ctx, ox, oy, s, art) {
  const k = s.t / s.life;
  const x = s.src.x + ox, y = s.src.y - 6 + oy;
  const cols = SHOT_STYLES[s.style === 'wax' ? 'pearl' : s.style] || SHOT_STYLES.pearl;
  for (const a0 of s.dirs) {
    const from = s.spin ? a0 + k * TAU - 0.8 : a0 - s.arc * 0.9, to = s.spin ? a0 + k * TAU + 0.8 : a0 - s.arc * 0.9 + s.arc * 1.8 * Math.min(1, k * 1.6);
    ctx.globalAlpha = 0.75 * (1 - k * 0.6);
    ctx.strokeStyle = cols[3];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + 2, s.reach * 0.85, from, to);
    ctx.stroke();
    ctx.strokeStyle = cols[4];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y + 2, s.reach * 0.85, from, to);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const a = to;
    if (art === 'shovel') drawBlade(ctx, x + Math.cos(a) * 8, y + 2 + Math.sin(a) * 6, a, 1.1, 'shovel');
    else drawSword(ctx, x, y + 2, a, s.reach * 0.9);
  }
}

// a waxen blade: a dark grip, a crossguard and a long pale edge
function drawSword(ctx, x, y, ang, len) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(ang);
  ctx.fillStyle = '#160f0c';
  ctx.fillRect(2, -2, len - 2, 4);
  ctx.fillRect(5, -4, 2, 8);
  ctx.fillStyle = '#5a3420'; ctx.fillRect(2, -1, 3, 2);
  ctx.fillStyle = '#a87c24'; ctx.fillRect(5, -3, 1, 6);
  ctx.fillStyle = '#d8dce8'; ctx.fillRect(7, -1, len - 9, 2);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(7, -1, len - 9, 1);
  ctx.restore();
}

// ---------------------------------------------------------------------------------
// One-off attacks from somewhere else: echoes, the second candle, twin helpers.
export function burst(g, p, from, dx, dy, mul = 1, size = 1, opt = {}) {
  const form = p.shot.form, w = weaponState(p);
  const ang = Math.atan2(dy, dx);
  if (form === 'beam' || form === 'laser') {
    for (const a of fan(p, ang, 0, 0.22)) addRay(g, p, w, { x: from.x, y: from.y }, a, mul, form === 'beam' ? 'beam' : 'flash', form === 'beam' ? BEAM_LIFE * 0.5 : 0.14);
  } else if (form === 'knife') {
    const k = { src: from, off: 0, state: 'held', x: from.x, y: from.y - 2, ang, hits: new Map(), temp: true };
    throwKnife(g, p, k, ang, 0.6);
    k.mul *= mul;
    (w.knives ??= []).push(k);
  } else if (form === 'sword') {
    swingAt(g, p, w, { x: from.x, y: from.y }, ang, mul);
  } else {
    p.fire(g, dx, dy, mul, size, { ...opt, from, noHook: true, quiet: true, bomb: form === 'bombs' });
  }
}

// ---------------------------------------------------------------------------------
export const WEAPONS = {
  tears: {
    update(dt, g, p, w, sx, sy, shooting) {
      const sh = p.shot;
      if (sh.barrage) {
        const c = charge(dt, p, shooting, 2.2 / p.stats.fireRate * 1.6 + 0.3);
        if (c >= 0.999) {
          p.fire(g, p.lastShoot.x, p.lastShoot.y, 1, 1, { spray: 10 + 4 * sh.multishot });
          g.shake(2);
        }
        return;
      }
      if (sh.charged) {
        // Slow Cooker: hold to charge, let go to fire.
        const c = charge(dt, p, shooting, 2.2 / p.stats.fireRate + 0.25);
        if (c > 0.12) p.fire(g, p.lastShoot.x, p.lastShoot.y, 0.6 + 2.6 * c, 1 + c * 0.9);
        return;
      }
      p.chargeTimeOverride = 0;
      p.charging = false;
      repeat(dt, p, w, shooting, 1 / p.stats.fireRate, () => p.fire(g, sx, sy));
    },
  },

  bombs: {
    update(dt, g, p, w, sx, sy, shooting) {
      const sh = p.shot;
      if (sh.barrage) {
        const c = charge(dt, p, shooting, 2.6 / p.stats.fireRate + 0.6);
        if (c >= 0.999) p.fire(g, p.lastShoot.x, p.lastShoot.y, 1, 1, { spray: 3 + sh.multishot, bomb: true });
        return;
      }
      p.chargeTimeOverride = 0;
      p.charging = false;
      repeat(dt, p, w, shooting, 1 / (p.stats.fireRate * 0.42), () => p.fire(g, sx, sy, 1, 1, { bomb: true }));
    },
  },

  beam: {
    update(dt, g, p, w, sx, sy, shooting) {
      const sh = p.shot;
      // no new charge while a beam is still burning
      if (w.rays?.some((b) => b.follow && b.kind === 'beam')) { p.charging = false; p.chargeT = 0; return; }
      const c = charge(dt, p, shooting, clamp(3 / p.stats.fireRate, 0.35, 2.4) * (sh.barrage ? 1.3 : 1));
      if (c < 0.999) return;
      const ang = Math.atan2(p.head.y, p.head.x);
      for (const a of fan(p, ang, sh.barrage ? 2 : 0, sh.barrage ? 0.32 : 0.22)) addRay(g, p, w, p, a, 1, 'beam', BEAM_LIFE);
      sfx('beam');
      g.shake(3);
      p.flareTime = 0.25;
      p.shootingTime = BEAM_LIFE;
      attacked(g, p, p.head.x, p.head.y);
    },
  },

  // A thin laser on every shot (no charge). With `steady` it stays on while you hold instead.
  laser: {
    update(dt, g, p, w, sx, sy, shooting) {
      const sh = p.shot;
      if (sh.barrage) {
        // charged: a fan of laser flashes
        w.on = false;
        const c = charge(dt, p, shooting, clamp(2.2 / p.stats.fireRate, 0.4, 2.2));
        if (c >= 0.999) {
          const ang = Math.atan2(p.lastShoot.y, p.lastShoot.x);
          for (const a of fan(p, ang, 4, 0.2)) addRay(g, p, w, p, a, 1.3, 'flash', 0.2);
          sfx('beam');
          attacked(g, p, p.lastShoot.x, p.lastShoot.y);
        }
        return;
      }
      p.chargeTimeOverride = 0;
      p.charging = false;
      if (!sh.steady) {
        w.on = false;
        repeat(dt, p, w, shooting, 1 / p.stats.fireRate, () => {
          for (const a of fan(p, Math.atan2(sy, sx), 0, 0.14)) addRay(g, p, w, p, a, 1, 'flash', 0.14);
          sfx('hum');
          p.flareTime = 0.09;
          p.shootingTime = Math.min(0.18, 0.6 / p.stats.fireRate);
          attacked(g, p, sx, sy);
        });
        return;
      }
      w.on = shooting;
      if (!shooting) { w.live = null; w.pulse = 0; return; }
      p.speedMul *= 0.8;
      p.shootingTime = 0.15;
      w.pulse = (w.pulse || 0) - dt;
      if (w.pulse <= 0) {
        // a fresh roll for statuses and crits a couple of times a second
        w.pulse = 0.4;
        w.pl = payload(p, 1);
        w.procs = new Map();
        attacked(g, p, sx, sy, 0.6);
      }
      const o = rayOpts(p, 'laser');
      w.live = fan(p, Math.atan2(sy, sx), 0, 0.2).map((a) => ({ tr: trace(g, p.x, p.y - 2, a, RAY_LEN, o), width: o.width }));
      w.tick = (w.tick || 0) - dt;
      if (w.tick > 0) return;
      w.tick = 0.1;
      w.hum = (w.hum || 0) + 1;
      if (w.hum % 3 === 0) sfx('hum');
      for (const r of w.live) {
        for (const h of r.tr.hits) strike(g, p, h.t, w.pl, h.dx, h.dy, { mul: p.stats.fireRate * 0.1, knock: 0.25, procs: w.procs });
        if (r.tr.rock && w.hum % 4 === 0) g.room.hitTile(r.tr.rock.c, r.tr.rock.r, g);
        if (sh.eraser) eraseAlong(g, r.tr.pts, r.width);
      }
    },
    render(ctx, ox, oy, g, p, w) {
      if (!w.on || !w.live) return;
      const st = rayStyle(w.pl || { style: p.shot.style }, 'laser');
      for (const r of w.live) drawRay(ctx, r.tr.pts, ox, oy, r.width + Math.sin(p.time * 40) * 0.5, 1, st);
    },
  },

  knife: {
    update(dt, g, p, w, sx, sy, shooting) {
      knifeSet(p, w);
      const held = w.knives.filter((k) => !k.temp && k.state === 'held');
      // you can only draw back and throw while the knives are in your hand
      const c = held.length ? charge(dt, p, shooting, clamp(1.5 / p.stats.fireRate, 0.25, 1.4)) : (p.charging = false, -1);
      if (c > 0.05) {
        const aim = Math.atan2(p.lastShoot.y, p.lastShoot.x);
        for (const k of held) throwKnife(g, p, k, aim + k.off, c);
        sfx('swing');
        p.shootingTime = 0.15;
        attacked(g, p, p.lastShoot.x, p.lastShoot.y, 0.5 + c);
      }
      for (const k of w.knives) updateKnife(dt, g, p, w, k);
      w.knives = w.knives.filter((k) => !k.dead);
    },
    render(ctx, ox, oy, g, p, w) {
      const size = clamp(p.shot.sizeMul, 0.8, 2.2);
      for (const k of w.knives || []) {
        const spin = p.shot.weaponArt === 'shovel' && k.state !== 'held' ? p.time * 20 : k.ang;
        drawBlade(ctx, k.x + ox, k.y - 4 + oy, spin, size, p.shot.weaponArt);
      }
    },
  },

  sword: {
    update(dt, g, p, w, sx, sy, shooting) {
      const sh = p.shot;
      w.cd = (w.cd || 0) - dt;
      for (const s of w.slashes || []) s.t += dt;
      if (w.slashes) w.slashes = w.slashes.filter((s) => s.t < s.life);
      const spinTime = clamp(4 / p.stats.fireRate, 1.1, 3);
      p.chargeTimeOverride = spinTime;
      if (!shooting) { p.charging = false; p.chargeT = Math.max(0, p.chargeT - dt * 2); return; }
      // keep swinging to charge the spin: it hits all round and throws a slash wave
      p.charging = true;
      p.chargeT = Math.min(spinTime, p.chargeT + dt);
      if (p.chargeT >= spinTime) {
        p.chargeT = 0;
        w.cd = 0.3;
        const ang = Math.atan2(sy, sx);
        swingAt(g, p, w, p, ang, 1, { spin: true });
        if (sh.barrage) p.fire(g, sx, sy, 1, 1, { spray: 10 + 3 * sh.multishot, ring: true, style: 'pearl' });
        else p.fire(g, sx, sy, 2, 1.4, { style: 'pearl' });
        p.flareTime = 0.2;
        return;
      }
      if (w.cd > 0) return;
      w.cd = 1 / (p.stats.fireRate * 0.45);
      swingAt(g, p, w, p, Math.atan2(sy, sx), 1);
      p.shootingTime = 0.2;
      attacked(g, p, sx, sy);
    },
    render(ctx, ox, oy, g, p, w) {
      for (const s of w.slashes || []) drawSlash(ctx, ox, oy, s, p.shot.weaponArt);
    },
  },
};

// Fire on a cooldown while the button is held.
function repeat(dt, p, w, shooting, gap, fn) {
  p.cooldown -= dt;
  if (shooting) {
    if (p.cooldown <= 0) {
      fn();
      p.cooldown += gap;
      if (p.cooldown < 0) p.cooldown = 0;
    }
  } else if (p.cooldown < 0) p.cooldown = 0;
}

// ---------------------------------------------------------------------------------
// The player's weapon state lives on `p.wpn` and is reset when the form changes or a room starts.
export function weaponState(p) {
  if (!p.wpn || p.wpn.form !== p.shot.form) {
    p.wpn = { form: p.shot.form };
    p.charging = false;
    p.chargeT = 0;
  }
  return p.wpn;
}

export function updateWeapon(dt, g, p, sx, sy, shooting) {
  const w = weaponState(p);
  updateRays(dt, g, p, w);
  WEAPONS[w.form].update(dt, g, p, w, sx, sy, shooting);
}

export function renderWeapon(ctx, ox, oy, g, p) {
  const w = p.wpn;
  if (!w) return;
  renderRays(ctx, ox, oy, w, p);
  WEAPONS[w.form]?.render?.(ctx, ox, oy, g, p, w);
}

export function weaponEnterRoom(p) {
  if (p.wpn) p.wpn = null;
  p.charging = false;
  p.chargeT = 0;
}

// For the item text: what a weapon item turns your attack into.
export const WEAPON_TEXT = {
  beam: 'HOLD TO CHARGE, LET GO: A THICK BEAM ALL THE WAY TO THE WALL (MORE COPIES: BIGGER)',
  laser: 'EVERY SHOT IS A THIN LASER THAT PIERCES EVERYTHING',
  steady: 'A THIN LASER THAT STAYS ON WHILE YOU SHOOT',
  knife: 'A KNIFE: HOLD TO DRAW IT BACK, LET GO TO THROW, IT COMES BACK',
  sword: 'SWING A SWORD; KEEP SWINGING TO CHARGE A SPIN AND A SLASH WAVE',
  bombs: 'SHOOT LITTLE BOMBS INSTEAD OF WAX',
  barrage: 'CHARGE UP, THEN EVERYTHING FIRES AT ONCE',
  lobbed: 'SHOTS ARC AND EXPLODE WHERE THEY LAND',
  tears: 'PLAIN WAX SHOTS',
};

// Cracked Monocle on a ray: enemy shots that touch it are wiped out.
function eraseAlong(g, pts, width) {
  killEnemyShots(g, (s) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (!a || !b) continue;
      const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
      const t = clamp(((s.x - a[0]) * dx + (s.y - a[1]) * dy) / L, 0, 1);
      if (Math.hypot(s.x - (a[0] + dx * t), s.y - (a[1] + dy * t)) < s.r + width / 2 + 2) return true;
    }
    return false;
  });
}

// A thin laser flash from any weapon (Loose Wire, Live Wire): hits everything on a line once.
export function laserFlash(g, p, x, y, ang, mul = 1) {
  addRay(g, p, weaponState(p), { x, y }, ang, mul, 'flash', 0.14);
}

// A big beam from an active item (Hollering Jaw, Horned Mask): like a full charged beam, turning with you.
export function fireBeam(g, p, ang, mul = 1, life = BEAM_LIFE) {
  addRay(g, p, weaponState(p), p, ang, mul, 'beam', life);
  sfx('beam');
}
