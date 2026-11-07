// Character mechanics: the unique rules some characters play by.
//
// A character lists `mechanics: { name: params }` in src/data/characters.js. The player keeps
// one state object per mechanic (seeded with its params) and the game calls these hooks.
// Every hook gets the player `p` and the mechanic state `m` as its LAST two arguments.
//
//   init(g)                          a run starts (also when a saved run is rebuilt)
//   update(dt, g)                    every frame of play, before moving
//   weapon(dt, g, sx, sy, shooting)  return true to replace normal shooting
//   fired(g, dx, dy, dmgMul, sizeMul) after a normal volley
//   hurt(g, amount)                  after taking damage
//   preventDeath(g)                  return true to cancel dying
//   enterRoom(g), roomClear(g), floorStart(g)
//   kill(g, enemy)                   an enemy died
//   takeItem(g, id, ped)             return true to intercept picking up an item
//   itemTaken(g, id, ped)            after an item was picked up
//   shotLand(g, shot)                one of the player's shots splashed
//   renderFloor(ctx, ox, oy, g)      drawn on the floor, under everything
//   render(ctx, ox, oy, g)           drawn with the player
//   drawables(g) -> [...]            extra things sorted and drawn with the entities
//   bodies(g) -> [{x, y, r}]         extra bodies that get hurt like the player
//   hud(ctx, g, x, y) -> height      a small HUD element under the counters
//   save() -> data, load(data)       run save & continue
import { sfx } from '../engine/audio.js';
import { TILE } from './constants.js';
import { moveCircle } from './collision.js';
import { Health } from './health.js';
import { Pedestal } from './items.js';
import { ITEMS } from '../data/items.js';
import { DROP_TABLES } from '../data/pickups.js';
import { LOOKS, MOTLEY_SWATCHES, MOTLEY_RAMPS } from '../data/characterSprites.js';
import { drawText } from '../ui/text.js';
import { laserFlash } from './weapons.js';
import { Gnat } from './followers.js';

// ---- helpers -------------------------------------------------------------------
const TAU = Math.PI * 2;

function addStats(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k.endsWith('Mul') ? (out[k] ?? 1) * v : (out[k] ?? 0) + v;
  return out;
}

function lookOf(id, p) {
  const L = LOOKS[id] || LOOKS.wick;
  return { id, costumes: [...(L.costumes || [])], flame: L.flame ?? p.look?.flame, alpha: L.alpha, noFeet: L.noFeet };
}

const fighting = (g) => !g.room.cleared && (g.enemies.length > 0 || !!g.boss);

// Hit everything `test` accepts, at most once per owner (bosses have several circles).
function hitTargets(g, test, damage, { fromX, fromY, knock = 60, once = new Set() } = {}) {
  let n = 0;
  for (const e of g.targets()) {
    const owner = e.boss || e;
    if (once.has(owner) || !test(e)) continue;
    once.add(owner);
    n++;
    if (e.boss) e.boss.takeHit(damage, g);
    else {
      const dx = e.x - fromX, dy = e.y - fromY, d = Math.hypot(dx, dy) || 1;
      e.takeHit(damage, dx / d, dy / d, knock, g);
    }
  }
  return n;
}

function killEnemyShots(g, test) {
  for (const s of g.projectiles.pool.live) if (s.team === 'enemy' && !s.removed && test(s)) { s.removed = true; g.projectiles.splash?.(s, true); }
}

// Item for "a random item from a random pool" (Motley).
function randomItem(g, rng, type) {
  const ids = Object.keys(ITEMS).filter((id) => {
    const d = ITEMS[id];
    return !d.starter && d.type === type && !g.itemPools.taken.has(id) && g.itemPools.allowed(id);
  });
  if (!ids.length) return null;
  const id = rng.pick(ids);
  g.itemPools.taken.add(id);
  return id;
}

function rollStats(rng) {
  const r = (lo, hi) => Math.round((lo + rng.next() * (hi - lo)) * 20) / 20;
  return { damage: r(-0.6, 1.2), fireRate: r(-0.5, 0.8), speed: r(-0.15, 0.25), range: r(-1.5, 2), shotSpeed: r(-0.15, 0.25), luck: Math.round(r(-1, 2)) };
}

// ---- hot wax puddles (Spill) ---------------------------------------------------------
function addPuddle(m, x, y, r, life) {
  (m.puddles ??= []).push({ x, y, r, life, t: 0 });
  if (m.puddles.length > 40) m.puddles.shift();
}
const inPuddle = (pd, e) => ((e.x - pd.x) / (pd.r + e.r)) ** 2 + ((e.y - pd.y) / (pd.r * 0.6 + e.r)) ** 2 < 1;
function updatePuddles(dt, g, p, m) {
  if (!m.puddles?.length) return;
  for (const pd of m.puddles) pd.t += dt;
  m.puddles = m.puddles.filter((pd) => pd.t < pd.life);
  m.tick = (m.tick || 0) - dt;
  if (m.tick > 0) return;
  m.tick = 0.4;
  const dmg = Math.max(1, p.stats.damage * 0.35);
  for (const e of g.enemies) {
    if (!e.hittable || e.def.flying || m.puddles.every((pd) => !inPuddle(pd, e))) continue;
    e.takeHit(dmg, 0, 0, 0, g);
    e.applyStatus?.('slow', dmg);
  }
  for (const b of g.bosses) {
    if (b.hittable && !b.def.flying && b.hitCircles().some((c) => m.puddles.some((pd) => inPuddle(pd, c)))) b.takeHit(dmg, g);
  }
}
function renderPuddles(ctx, ox, oy, m, colors = ['#b0661c', '#eaae4a', '#ffd88a']) {
  for (const pd of m.puddles || []) {
    const a = Math.min(1, (pd.life - pd.t) / 0.6, pd.t / 0.1);
    const rx = pd.r, ry = pd.r * 0.55;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = a * [0.55, 0.6, 0.7][i];
      ctx.fillStyle = colors[i];
      const s = [1, 0.7, 0.3][i];
      for (let y = -Math.ceil(ry * s); y <= Math.ceil(ry * s); y++) {
        const half = Math.round(rx * s * Math.sqrt(Math.max(0, 1 - (y / (ry * s + 0.01)) ** 2)));
        ctx.fillRect(Math.round(pd.x - half + ox - (i === 2 ? 2 : 0)), Math.round(pd.y + y + oy - (i === 2 ? 1 : 0)), half * 2, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------------
export const MECHANICS = {
  // Ninth Life: come back with one heart when you would die, `lives` times per run.
  catLives: {
    preventDeath(g, p, m) {
      m.left ??= m.lives;
      if (m.left <= 0) return false;
      m.left--;
      p.health = new Health({ hearts: 1 });
      p.invuln = 2.5;
      g.projectiles.clearTeam('enemy');
      sfx('revive');
      g.flashT = 0.4;
      g.effects.ring(p.x, p.y - 6, 40, '#d8b048', 0.6, 8);
      g.particles.burst(p.x, p.y - 8, 30, { colors: ['#d8b048', '#fff0a0', '#c4bfb6'], speed: 90, z: 10, vz: 80, life: 0.8 });
      g.banner = { text: 'ANOTHER LIFE', sub: `${m.left} LEFT`, t: 0, dur: 2.4 };
      return true;
    },
    save(p, m) { return { left: m.left ?? m.lives }; },
    load(d, p, m) { if (d) m.left = d.left; },
  },

  // Feline (transformation) and the like: a hit sometimes hatches a gnat from the wound.
  gnatHit: {
    shotHit(g, t, dmg, p, m) {
      if (g.gnats.length < 12 && Math.random() < m.chance) g.gnats.push(new Gnat(t.x, t.y - 4));
    },
  },

  // ---- item mechanics (Part 6) ----
  // Lantern Prayer: a hit sometimes calls down a pillar of light on the enemy.
  smite: {
    shotHit(g, t, dmg, p, m) {
      if (g.time - (m.last || -9) < 0.2 || Math.random() > m.chance + Math.max(0, p.stats.luck) * 0.015) return;
      m.last = g.time;
      const dd = Math.max(4, p.stats.damage * 3);
      hitTargets(g, (e) => Math.hypot(e.x - t.x, e.y - t.y) < e.r + 16, dd, { fromX: t.x, fromY: t.y - 1, knock: 20 });
      g.effects.bolt(t.x, t.y - 130, t.x, t.y - 2, 0.25);
      g.effects.ring(t.x, t.y, 18, 'rgba(240,244,255,0.9)', 0.3, 4);
      sfx('chime');
    },
  },
  // Chewed Pencil: every 15th attack also sprays a fistful of shots.
  pencil: {
    fired(g, dx, dy, dm, sm, p, m) {
      m.n = (m.n || 0) + 1;
      if (m.n < 15) return;
      m.n = 0;
      p.fire(g, dx, dy, 1, 0.9, { spray: 10, noHook: true, quiet: true });
    },
  },
  // Weeping Stye: attacks sometimes throw a stray shot or two in random directions.
  stye: {
    fired(g, dx, dy, dm, sm, p, m) {
      if (Math.random() > 0.3) return;
      for (let i = Math.random() < 0.5 ? 1 : 2; i > 0; i--) {
        const a = Math.random() * TAU;
        p.fire(g, Math.cos(a), Math.sin(a), 0.9, 0.9, { noHook: true, quiet: true });
      }
    },
  },
  // Ash Pepper: attacks sometimes breathe out a slow, burning flame.
  chili: {
    fired(g, dx, dy, dm, sm, p, m) {
      if (Math.random() > m.chance + Math.max(0, p.stats.luck) * 0.01) return;
      const len = Math.hypot(dx, dy) || 1;
      g.projectiles.spawn({ x: p.x, y: p.y, z: 10, vx: (dx / len) * 80, vy: (dy / len) * 80, r: 6, damage: p.shotDamage * 1.5, range: 110, team: 'player', style: 'ember', burn: true, pierce: true, spectral: true, knockback: 10 });
      sfx('whoosh');
    },
  },
  // Steady Hand: every hit in a row adds damage (up to double); a miss loses it.
  deadeye: {
    shotHit(g, t, dmg, p, m) { m.stack = Math.min(4, (m.stack || 0) + 0.34); },
    shotLand(g, s, p, m) { if (!s.hits.size && !s.child) m.stack = Math.max(0, (m.stack || 0) - 2); },
    update(dt, g, p, m) { p.dmgMul *= 1 + (m.stack || 0) * 0.25; },
    enterRoom(g, p, m) { m.stack = 0; },
  },
  // Loose Wire: attacks sometimes crackle out a thin laser too.
  loosewire: {
    fired(g, dx, dy, dm, sm, p, m) {
      if (Math.random() > m.chance) return;
      laserFlash(g, p, p.x, p.y, Math.atan2(dy, dx), 1);
    },
  },

  // PILFER: enemies sometimes drop a coin.
  pickpocket: {
    kill(g, e, p, m) {
      if (g.lootRng.next() < m.chance + Math.max(0, p.stats.luck) * 0.01) g.spawnPickup('coin', e.x, e.y);
    },
  },

  // WISP: a ward that soaks one hit, renewed in every room.
  ward: {
    init(g, p) { p.ward = 1; },
    enterRoom(g, p, m) { if (m.perRoom) p.ward = Math.max(p.ward, 1); },
  },

  // MORROW: dies once, comes back in a stronger second form.
  revive: {
    preventDeath(g, p, m) {
      if (m.used) return false;
      m.used = true;
      MECHANICS.revive.apply(p, m);
      p.health = new Health(m.health);
      p.invuln = 2.5;
      g.projectiles.clearTeam('enemy');
      sfx('revive');
      g.flashT = 0.4;
      g.effects.ring(p.x, p.y - 6, 50, '#f0c040', 0.6, 10);
      g.particles.burst(p.x, p.y - 8, 40, { colors: ['#f0c040', '#fff0d0', '#e8d0a0'], speed: 110, z: 10, vz: 90, life: 0.9 });
      g.banner = { text: m.name, sub: 'BACK FROM THE DARK', t: 0, dur: 2.6 };
      return true;
    },
    apply(p, m) {
      p.charName = m.name;
      p.lookId = m.look;
      p.charStats = addStats(p.baseCharStats, m.stats);
      p.recompute();
    },
    save(p, m) { return { used: !!m.used }; },
    load(d, p, m) { if (d?.used) { m.used = true; MECHANICS.revive.apply(p, m); } },
  },

  // NIB & NUB: a second candle that moves and shoots with you. It shares your hearts.
  twin: {
    init(g, p, m) {
      m.body = { x: p.x + 16, y: p.y, r: 6, usesDoors: false };
      m.lookObj = lookOf(m.look, p);
    },
    enterRoom(g, p, m) {
      const spot = g.room.findFreeSpot(p.x + (p.x < (g.room.x0 + g.room.R) / 2 ? 16 : -16), p.y);
      m.body.x = spot.x;
      m.body.y = spot.y;
    },
    update(dt, g, p, m) {
      moveCircle(m.body, p.vx * dt, p.vy * dt, g.room, p.flying ? 'fly' : 'walk');
    },
    fired(g, dx, dy, dm, sm, p, m) {
      p.burst(g, dx, dy, dm, sm, { from: m.body, noHook: true, quiet: true });
    },
    bodies(g, p, m) { return [m.body]; },
    drawables(g, p, m) {
      const b = m.body;
      return [{
        y: b.y,
        renderShadow(ctx, ox, oy) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(Math.round(b.x - 7 + ox), Math.round(b.y + 1 + oy), 14, 3); },
        render(ctx, ox, oy) {
          if (p.dead || (p.invuln > 0 && p.flash <= 0 && Math.floor(p.invuln * 14) % 2 === 0)) return;
          p.drawCandle(ctx, m.lookObj, b.x, b.y, ox, oy, { flash: p.flash > 0 });
        },
      }];
    },
  },

  // MOTLEY: random health, stats, items and colors, all from the run's seed.
  random: {
    init(g, p, m) {
      const rng = g.rng.fork('motley');
      p.charStats = addStats(p.baseCharStats, rollStats(rng));
      const hearts = rng.int(0, 3);
      let ash = rng.int(0, 3) * 2;
      const soot = rng.next() < 0.25 ? 2 : 0;
      if (hearts * 2 + ash + soot < 4) ash += 4 - (hearts * 2 + ash + soot);
      p.health = new Health({ hearts, ash, soot });
      for (let i = 0; i < 2; i++) { const id = randomItem(g, rng, 'passive'); if (id) p.items.push(id); }
      if (rng.next() < 0.65) { const id = randomItem(g, rng, 'active'); if (id) p.active = { id, charge: 99 }; }
      const ramp = rng.pick(MOTLEY_RAMPS), sw = rng.pick(MOTLEY_SWATCHES);
      p.lookColors = { ...ramp, S: sw[0], s: sw[1] };
      p.recompute();
    },
  },

  // MOTLEY, UNSTITCHED: every hit rerolls your items and stats.
  rerollOnHit: {
    hurt(g, amount, p) {
      if (p.health.oneHit || !p.health.alive) return;
      const rng = g.lootRng;
      const own = p.items.filter((id) => !p.startItems.has(id));
      p.items = p.items.filter((id) => p.startItems.has(id));
      for (let i = 0; i < own.length; i++) { const id = randomItem(g, rng, 'passive'); if (id) p.items.push(id); }
      p.charStats = addStats(p.baseCharStats, rollStats(rng));
      p.recompute();
      g.syncFollowers();
      sfx('reroll');
      g.particles.burst(p.x, p.y - 8, 20, { colors: ['#5a3a6a', '#a8c03a', '#e8e0c8'], speed: 80, z: 10, vz: 60 });
    },
  },

  // SPILL: hot wax drips behind you and burns whatever stands in it.
  trail: {
    enterRoom(g, p, m) { m.puddles = []; },
    update(dt, g, p, m) {
      m.acc = (m.acc || 0) + Math.hypot(p.vx, p.vy) * dt;
      if (m.acc > 8) { m.acc = 0; addPuddle(m, p.x, p.y + 2, 9, 2.6); }
      updatePuddles(dt, g, p, m);
    },
    renderFloor(ctx, ox, oy, g, p, m) { renderPuddles(ctx, ox, oy, m); },
  },

  // SPILL, FLOODED: every shot splashes a puddle where it lands...
  splash: {
    enterRoom(g, p, m) { m.puddles = []; },
    update(dt, g, p, m) { updatePuddles(dt, g, p, m); },
    shotLand(g, shot, p, m) { addPuddle(m, shot.x, shot.y + 2, 10, 2.2); },
    renderFloor(ctx, ox, oy, g, p, m) { renderPuddles(ctx, ox, oy, m, m.colors || ['#2a4a7a', '#5a8aba', '#c8e4ff']); },
  },
  // ...and the floor is slick under your feet.
  slippery: {
    update(dt, g, p) { p.accelMul = 0.16; },
  },

  // KILN: heat builds as you shoot (more damage); at the top it erupts and you cool off.
  // Twisted: heat rises by itself during fights, shooting vents it, and erupting hurts.
  heat: {
    update(dt, g, p, m) {
      m.heat ??= 0;
      m.cool = Math.max(0, (m.cool || 0) - dt);
      m.idle = (m.idle || 0) + dt;
      if (m.inverse) {
        if (fighting(g)) m.heat += 9 * dt;
        else m.heat = Math.max(0, m.heat - 25 * dt);
      } else if (m.idle > 0.45) {
        m.heat = Math.max(0, m.heat - 30 * dt);
      }
      p.dmgMul *= 1 + (m.heat / 100) * 0.9;
      if (m.heat >= 100) MECHANICS.heat.erupt(g, p, m);
      if (m.heat > 70 && Math.random() < dt * 10) g.particles.spawn(p.x + (Math.random() - 0.5) * 10, p.y - 10, { z: 8, vz: 30, gravity: -20, life: 0.6, color: '#c8c0b8', size: 1 });
    },
    weapon(dt, g, sx, sy, shooting, p, m) { return m.cool > 0; },
    fired(g, dx, dy, dm, sm, p, m) {
      m.idle = 0;
      m.heat = m.inverse ? Math.max(0, m.heat - 4) : Math.min(100, m.heat + 6.5);
    },
    erupt(g, p, m) {
      const dmg = p.stats.damage * 1.5;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        g.projectiles.spawn({ x: p.x, y: p.y, z: 12, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 5, damage: dmg, range: 120, team: 'player', style: 'ember', burn: true, pierce: true, knockback: 50 });
      }
      sfx('explosion');
      g.shake(5);
      g.effects.ring(p.x, p.y, 40, '#f08a24', 0.4, 8);
      m.heat = m.inverse ? 40 : 0;
      m.cool = m.inverse ? 0 : 1.2;
      if (m.inverse) p.hurt(1, 'Its Own Heat', g);
    },
    hud(ctx, g, x, y, p, m) {
      const k = Math.min(1, (m.heat || 0) / 100);
      drawText(ctx, m.cool > 0 ? 'COOLING' : 'HEAT', x, y, { color: '#d8c69a' });
      ctx.fillStyle = '#160f0c';
      ctx.fillRect(x, y + 9, 42, 5);
      ctx.fillStyle = k > 0.8 ? (Math.floor(g.time * 8) % 2 ? '#fff3c0' : '#f04a24') : k > 0.5 ? '#f08a24' : '#ffd25a';
      ctx.fillRect(x + 1, y + 10, Math.round(40 * k), 3);
      return 17;
    },
  },

  // ECHO: every volley rings out again a moment later from where you stood.
  echo: {
    enterRoom(g, p, m) { m.queue = []; },
    fired(g, dx, dy, dm, sm, p, m) {
      (m.queue ??= []).push({ t: m.delay, x: p.x, y: p.y, dx, dy, dm, sm });
    },
    update(dt, g, p, m) {
      if (!m.queue?.length) return;
      for (const q of m.queue) {
        q.t -= dt;
        if (q.t > 0) continue;
        p.burst(g, q.dx, q.dy, q.dm * m.mul, q.sm * 0.85, { from: q, noHook: true, quiet: true, style: 'violet' });
        g.effects.ring(q.x, q.y - 4, 10, 'rgba(200,180,240,0.7)', 0.2, 2);
      }
      m.queue = m.queue.filter((q) => q.t > 0);
    },
  },

  // ECHO, ASTRAY: an echo body walks your path a second behind and repeats your shots.
  // If anything hits it, you get hurt.
  ghost: {
    enterRoom(g, p, m) { m.hist = []; m.clock = 0; m.queue = []; m.body = null; },
    update(dt, g, p, m) {
      m.hist ??= [];
      m.clock = (m.clock || 0) + dt;
      m.hist.push({ x: p.x, y: p.y, t: m.clock });
      while (m.hist.length > 2 && m.hist[1].t <= m.clock - m.delay) m.hist.shift();
      const h = m.hist[0];
      m.body = m.clock >= m.delay && h ? { x: h.x, y: h.y, r: 6 } : null;
      for (const q of m.queue || []) {
        q.t -= dt;
        if (q.t <= 0 && m.body) p.burst(g, q.dx, q.dy, q.dm, q.sm, { from: m.body, noHook: true, quiet: true, style: 'violet' });
      }
      if (m.queue) m.queue = m.queue.filter((q) => q.t > 0);
    },
    fired(g, dx, dy, dm, sm, p, m) { (m.queue ??= []).push({ t: m.delay, dx, dy, dm, sm }); },
    bodies(g, p, m) { return m.body ? [m.body] : []; },
    drawables(g, p, m) {
      if (!m.body) return [];
      const b = m.body;
      return [{ y: b.y, renderShadow() {}, render(ctx, ox, oy) { if (!p.dead) p.renderCopy(ctx, b.x, b.y, ox, oy, 0.45); } }];
    },
  },

  // NIB, ALONE: the shadow of Nub hunts you in every fight. It can't be hurt, but it
  // tramples enemies in its way too.
  stalker: {
    enterRoom(g, p, m) { m.shadow = null; m.wait = 1.6; },
    update(dt, g, p, m) {
      if (!m.shadow) {
        if (!fighting(g)) return;
        m.wait -= dt;
        if (m.wait > 0) return;
        const rm = g.room;
        const corners = [[rm.x0 + 20, rm.y0 + 20], [rm.R - 20, rm.y0 + 20], [rm.x0 + 20, rm.B - 20], [rm.R - 20, rm.B - 20]].map(([x, y]) => { const s = rm.findFreeSpot(x, y); return [s.x, s.y]; });
        corners.sort((a, b) => Math.hypot(b[0] - p.x, b[1] - p.y) - Math.hypot(a[0] - p.x, a[1] - p.y));
        m.shadow = { x: corners[0][0], y: corners[0][1], r: 6, state: 'chase', t: 0, cd: 2.5, fade: 0, appear: 0, hits: new Set(), touch: 0 };
        g.particles.burst(m.shadow.x, m.shadow.y, 16, { colors: ['#18121a', '#6a2a8a'], speed: 50, z: 6 });
        return;
      }
      const s = m.shadow;
      s.appear = Math.min(1, s.appear + dt * 2);
      if (!fighting(g)) { s.fade += dt; if (s.fade > 1) m.shadow = null; return; }
      s.t += dt;
      const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1;
      let vx = 0, vy = 0;
      if (s.state === 'chase') {
        vx = (dx / d) * 34; vy = (dy / d) * 34;
        s.cd -= dt;
        if (s.cd <= 0 && d < 170) { s.state = 'wind'; s.t = 0; }
      } else if (s.state === 'wind') {
        if (s.t >= 0.7) { s.state = 'charge'; s.t = 0; s.dx = dx / d; s.dy = dy / d; s.hits.clear(); sfx('dash'); }
      } else if (s.state === 'charge') {
        vx = s.dx * 200; vy = s.dy * 200;
        if (s.t >= 0.65) { s.state = 'rest'; s.t = 0; }
      } else if (s.t >= 0.6) {
        s.state = 'chase'; s.t = 0; s.cd = 3.5;
      }
      const hit = moveCircle(s, vx * dt, vy * dt, g.room, 'fly');
      if (s.state === 'charge' && hit) { s.state = 'rest'; s.t = 0; g.shake(3); }
      // trample enemies: a big hit while charging, a little burn on touch otherwise
      s.touch -= dt;
      if (s.state === 'charge') hitTargets(g, (e) => Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r + 2, 25, { fromX: s.x, fromY: s.y, knock: 200, once: s.hits });
      else if (s.touch <= 0 && hitTargets(g, (e) => Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r, 4, { fromX: s.x, fromY: s.y, knock: 40 })) s.touch = 0.5;
      for (const b of g.playerBodies()) {
        if (Math.hypot(b.x - s.x, b.y - s.y) < s.r + b.r - 2) { p.hurt(2, 'The Shadow of Nub', g, s.x, s.y); break; }
      }
    },
    drawables(g, p, m) {
      const s = m.shadow;
      if (!s) return [];
      const look = (m.lookObj ??= lookOf('nub_shadow', p));
      return [{
        y: s.y,
        renderShadow(ctx, ox, oy) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(Math.round(s.x - 7 + ox), Math.round(s.y + 1 + oy), 14, 3); },
        render(ctx, ox, oy) {
          const shake = s.state === 'wind' ? Math.round((Math.random() - 0.5) * 3) : 0;
          const a = s.appear * (1 - Math.min(1, s.fade));
          p.drawCandle(ctx, look, s.x + shake, s.y, ox, oy, { alpha: a, flare: false });
          if (s.state === 'wind') {
            ctx.fillStyle = '#ff3020';
            ctx.fillRect(Math.round(s.x + ox) - 1, Math.round(s.y - 30 + oy), 2, 5);
            ctx.fillRect(Math.round(s.x + ox) - 1, Math.round(s.y - 23 + oy), 2, 2);
          }
        },
      }];
    },
  },

  // MORROW, TWOFOLD: Dawn and Dusk take turns, swapping every cleared room. Each keeps its own hearts.
  forms: {
    init(g, p, m) {
      m.cur = 'dawn';
      m.other = new Health(m.dusk.health || { hearts: 3 });
      MECHANICS.forms.apply(p, m);
    },
    apply(p, m) {
      const f = m[m.cur];
      p.charStats = addStats(p.baseCharStats, f.stats);
      p.lookId = f.look;
      p.charFlying = !!f.flying;
      p.charName = `MORROW, ${f.name}`;
      p.recompute();
    },
    roomClear(g, p, m) {
      const h = p.health;
      p.health = m.other;
      m.other = h;
      m.cur = m.cur === 'dawn' ? 'dusk' : 'dawn';
      MECHANICS.forms.apply(p, m);
      sfx('revive');
      g.particles.burst(p.x, p.y - 8, 24, { colors: m.cur === 'dawn' ? ['#e8d0a0', '#fff0d0'] : ['#6e7e66', '#d0201c'], speed: 90, z: 10, vz: 70 });
      g.banner = { text: m[m.cur].name, sub: '', t: 0, dur: 1.4, top: true };
    },
    hud(ctx, g, x, y, p, m) {
      const next = m[m.cur === 'dawn' ? 'dusk' : 'dawn'];
      drawText(ctx, `NEXT: ${next.name}`, x, y, { color: '#d8c69a' });
      drawText(ctx, `${(m.other.total / 2).toFixed(1).replace('.0', '')} HP`, x, y + 9, { color: '#8a7a62' });
      return 19;
    },
    save(p, m) { return { cur: m.cur, other: m.other.toJSON() }; },
    load(d, p, m) {
      if (!d) return;
      m.cur = d.cur || 'dawn';
      m.other = Health.from(d.other || {});
      MECHANICS.forms.apply(p, m);
    },
  },

  // WICK, HOLLOW: room for only a few items. A new one pushes the oldest back onto the pedestal.
  slots: {
    itemTaken(g, id, ped, p, m) {
      if (ITEMS[id]?.type !== 'passive') return;
      const own = p.items.filter((i) => !p.startItems.has(i));
      if (own.length <= m.max) return;
      const old = own[0];
      p.items.splice(p.items.indexOf(old), 1);
      p.recompute();
      g.syncFollowers();
      if (ped && !ped.item) {
        ped.item = old;
        ped.needLeave = true;
        ped.cooldown = 0.6;
      } else {
        const spot = g.room.findFreeSpot(p.x, p.y + 24);
        const np = new Pedestal(spot.x, spot.y, old);
        np.needLeave = true;
        g.room.pedestals.push(np);
      }
    },
    hud(ctx, g, x, y, p, m) {
      const n = p.items.filter((i) => !p.startItems.has(i)).length;
      drawText(ctx, `ITEMS ${n}/${m.max}`, x, y, { color: n >= m.max ? '#f08a24' : '#d8c69a' });
      return 10;
    },
  },

  // PIP, LOADED: every free item pedestal flickers between two items.
  flicker: {
    update(dt, g, p, m) {
      m.t = (m.t || 0) + dt;
      const pool = g.cell.type === 'secret' ? 'secret' : g.cell.type === 'boss' ? 'boss' : 'treasure';
      for (const ped of g.room.pedestals) {
        if (!ped.item || ped.price || ped.flickDone) continue;
        if (!ped.flick) ped.flick = [ped.item, g.itemPools.draw(pool)];
        ped.item = ped.flick[Math.floor(m.t / m.every) % 2];
      }
    },
    itemTaken(g, id, ped) {
      if (ped?.flick) { ped.flick = null; ped.flickDone = true; }
    },
  },

  // BRICK, CRUMBLED: loses half a heart every few seconds while fighting.
  // Enemies drop half hearts that fade away fast.
  drain: {
    update(dt, g, p, m) {
      if (!fighting(g) || g.bossIntro) return;
      m.t = (m.t || 0) + dt;
      if (m.t < m.every) return;
      m.t = 0;
      const gold = p.health.golden;
      p.health.damage(1);
      p.health.golden = gold;
      p.flash = 0.06;
      sfx('hit');
      g.particles.burst(p.x, p.y - 6, 10, { colors: ['#5e4640', '#3a2a28', '#7a5e56'], speed: 50, z: 8, vz: 40 });
      if (!p.health.alive) p.die(g, 'Crumbling Away');
    },
    kill(g, e, p, m) {
      if (g.lootRng.next() < m.drop) g.spawnPickup('fading', e.x, e.y);
    },
    hud(ctx, g, x, y, p, m) {
      const k = Math.min(1, (m.t || 0) / m.every);
      drawText(ctx, 'CRUMBLE', x, y, { color: '#d8c69a' });
      ctx.fillStyle = '#160f0c';
      ctx.fillRect(x, y + 9, 42, 5);
      ctx.fillStyle = '#7a5e56';
      ctx.fillRect(x + 1, y + 10, Math.round(40 * k), 3);
      return 17;
    },
  },

  // PILFER, PAWNED: items burst into pickups when touched.
  pawn: {
    takeItem(g, id, ped, p) {
      const n = 2 + (ITEMS[id]?.quality ?? 1) * 2;
      for (let i = 0; i < n; i++) g.dropOne(g.lootRng.weighted(DROP_TABLES.roomClear.entries).type, ped.x, ped.y - 4);
      ped.item = null;
      sfx('reroll');
      g.particles.burst(ped.x, ped.y - 14, 20, { colors: ['#d8b048', '#fff0a0', '#e8d9b0'], speed: 90, z: 10, vz: 60 });
      g.banner = { text: 'PAWNED', sub: ITEMS[id]?.name || '', t: 0, dur: 2, top: true };
      return true;
    },
  },

  // BEACON, DIMMED: no shooting at all.
  noShoot: {
    weapon() { return true; },
  },
};
