// What each active item does when used (Space / USE button). The item data in
// src/data/items.js picks an effect by name and passes its parameters.
import { Bomb, BOMB_RADIUS, BOMB_DAMAGE } from './bombs.js';
import { DROP_TABLES } from '../data/pickups.js';
import { WispOrbital, Sentry, Gnat } from './followers.js';
import { Helper } from './familiars.js';
import { Pedestal, itemIcon } from './items.js';
import { fireBeam } from './weapons.js';
import { ITEMS as FAMILIARS } from '../data/items/familiars.js';
import { sfx } from '../engine/audio.js';
import { useRedKey } from './specials.js';

export const ACTIVE_EFFECTS = {
  // Crimson Key: a red room behind the nearest empty wall (see src/game/specials.js)
  redkey(g) { return useRedKey(g); },
  // Melting Pot: the held trinket melts into you (see src/game/consumables.js); nothing to melt, no charge used
  absorbTrinket(g) { return g.absorbTrinket() ? undefined : false; },

  rage(g, a) {
    const p = g.player;
    p.rageT = a.time;
    p.rageDamage = a.damage;
    g.shake(3);
    g.particles.burst(p.x, p.y, 16, { colors: ['#ff3020', '#f08a24', '#ffd25a'], speed: 80, z: 12, vz: 60 });
  },

  firering(g, a) {
    const p = g.player;
    const dmg = Math.max(4, p.stats.damage) * (a.mul || 1);
    for (let i = 0; i < a.count; i++) {
      const ang = (i / a.count) * Math.PI * 2;
      g.projectiles.spawn({
        x: p.x, y: p.y, z: 12, vx: Math.cos(ang) * 130, vy: Math.sin(ang) * 130,
        r: 5, damage: dmg, range: 130, team: 'player', style: a.style || 'ember', burn: a.burn ?? true, pierce: true, knockback: 40,
      });
    }
    g.effects.ring(p.x, p.y, 30, a.style === 'pearl' ? '#f8f0f8' : '#f08a24', 0.3);
  },

  shield(g, a) {
    g.player.shieldT = a.time;
  },

  gust(g, a) {
    const p = g.player;
    for (const e of g.enemies) {
      if (!e.active) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d > 140) continue;
      e.kx += (dx / d) * 260;
      e.ky += (dy / d) * 260;
      e.takeHit(a.damage, dx / d, dy / d, 0, g);
    }
    g.projectiles.clearTeam('enemy');
    g.effects.ring(p.x, p.y, 70, 'rgba(220,210,190,0.8)', 0.4, 10);
    g.particles.burst(p.x, p.y, 24, { colors: ['#c4bfb6', '#8a8580', '#e8d9b0'], speed: 160, z: 8, vz: 20, gravity: 40, drag: 3, life: 0.6 });
    g.shake(3);
  },

  slowtime(g, a) {
    g.slowT = a.time;
  },

  // Book of Hoarfrost: every enemy in the room freezes solid for a moment (bosses slow down).
  freezeall(g, a) {
    for (const e of g.enemies) {
      if (!e.hittable) continue;
      e.status.freeze = Math.max(e.status.freeze || 0, a.time);
      g.particles.burst(e.x, e.y - 6, 6, { colors: ['#d0f0ff', '#8ad0f0', '#ffffff'], speed: 40, z: 8, vz: 30 });
    }
    for (const b of g.bosses) b.chillT = Math.max(b.chillT || 0, a.time * 0.6);
    g.flashT = 0.2;
    g.effects.ring(g.player.x, g.player.y, 120, 'rgba(200,240,255,0.9)', 0.5, 10);
    sfx('chime');
  },

  // Storm in a Jar: lightning strikes every enemy in the room.
  storm(g, a) {
    const p = g.player;
    const dmg = a.damage + p.stats.damage;
    for (const e of [...g.enemies]) {
      if (!e.hittable) continue;
      g.effects.bolt(e.x + (Math.random() - 0.5) * 30, e.y - 120, e.x, e.y - 4, 0.3);
      e.takeHit(dmg, 0, 0, 30, g);
    }
    for (const b of g.bosses) {
      const c = b.hitCircles()[0];
      if (!c) continue;
      g.effects.bolt(c.x, c.y - 120, c.x, c.y, 0.3);
      b.takeHit(dmg, g);
    }
    g.flashT = 0.3;
    g.shake(5);
    sfx('crackle'); sfx('explosion');
  },

  dig(g, a) {
    const p = g.player;
    for (let i = 0; i < a.count; i++) g.dropOne(g.lootRng.weighted(DROP_TABLES.roomClear.entries).type, p.x, p.y + 6);
    g.particles.burst(p.x, p.y + 4, 14, { colors: ['#4a3e32', '#2e241d', '#6a5a48'], speed: 60, z: 2, vz: 70 });
    g.room.paintDecal((ctx) => {
      ctx.fillStyle = 'rgba(10,6,4,0.6)';
      ctx.fillRect(Math.round(p.x - 6), Math.round(p.y + 2), 12, 4);
    });
  },

  megabomb(g) {
    const p = g.player;
    const b = new Bomb(p.x, p.y + 2);
    b.radius = BOMB_RADIUS * 1.8;
    b.damage = BOMB_DAMAGE * 2;
    b.big = true;
    g.bombs.push(b);
  },

  heal(g, a) {
    const p = g.player;
    p.health.healRed(a.amount);
    g.particles.burst(p.x, p.y, 12, { colors: ['#ff6a5a', '#c0262c', '#e8d9b0'], speed: 50, z: 12, vz: 70 });
  },

  twin(g) {
    g.addTempTwin();
  },

  teleport(g) {
    const cells = [...g.floor.cells.values()].filter((c) => c !== g.cell && (c.type !== 'secret' || c.visited));
    const target = g.lootRng.pick(cells);
    g.teleportTo(target);
  },

  // ---- character starters ----
  // Loaded Die: every item in the room rerolls (from the same kind of pool).
  reroll(g) {
    const t = g.cell.type;
    const pool = t === 'secret' ? 'secret' : t === 'boss' ? 'boss' : t === 'shop' ? 'shop' : 'treasure';
    let n = 0;
    for (const ped of g.room.pedestals) {
      if (!ped.item) continue;
      ped.item = g.itemPools.draw(pool);
      ped.flick = null;
      ped.cooldown = 0.3;
      n++;
      g.particles.burst(ped.x, ped.y - 16, 14, { colors: ['#f8f4e8', '#c0262c', '#c4bfb6'], speed: 70, z: 12, vz: 50 });
    }
    if (n) sfx('reroll');
  },

  // Ashen Hymnal: hurts everything in the room and grants half an Ash Heart.
  hymn(g, a) {
    const p = g.player;
    const dmg = a.damage + p.stats.damage;
    for (const e of [...g.enemies]) if (e.hittable) e.takeHit(dmg, 0, -1, 40, g);
    for (const b of g.bosses) if (b.hittable) b.takeHit(dmg, g);
    p.health.addSoul(a.ash, 'soul');
    g.flashT = 0.25;
    g.effects.ring(p.x, p.y - 8, 90, 'rgba(240,236,220,0.9)', 0.5, 10);
    g.particles.burst(p.x, p.y - 12, 26, { colors: ['#f4f0e8', '#d0e0f0', '#c4bfb6'], speed: 110, z: 14, vz: 60, life: 0.8 });
  },

  // Unsung Hymnal: orbiting wisps that block shots (paid for in health, see game.useActive).
  wisps(g, a) {
    const p = g.player;
    g.orbitals = g.orbitals.filter((o) => !o.temp);
    for (let i = 0; i < a.count; i++) g.orbitals.push(new WispOrbital(i, a.count));
    g.particles.burst(p.x, p.y - 8, 18, { colors: ['#6a2a8a', '#c88af0'], speed: 70, z: 10, vz: 50 });
  },

  // Cinder Pact: fiend form - more damage, burning shots, flight.
  fiend(g, a) {
    const p = g.player;
    p.fiendT = a.time;
    p.fiendDamage = a.damage;
    g.shake(4);
    g.effects.ring(p.x, p.y - 6, 40, '#d0201c', 0.5, 8);
    g.particles.burst(p.x, p.y - 8, 24, { colors: ['#d0201c', '#5a0a10', '#ff9a5a'], speed: 90, z: 10, vz: 70 });
  },

  // Smother Step: a quick dash as smoke, hurting everything you pass through.
  dash(g, a) {
    const p = g.player, mv = g.input.move;
    let dx = mv.x, dy = mv.y;
    if (!dx && !dy) { dx = p.head.x; dy = p.head.y; }
    const len = Math.hypot(dx, dy) || 1;
    p.dashDir = { x: dx / len, y: dy / len };
    p.dashT = 0.2;
    p.ghostT = 0.3;
    p.dashHits = new Set();
    p.dashDamage = p.stats.damage * a.damageMul;
    sfx('dash');
    g.particles.burst(p.x, p.y - 6, 16, { colors: ['#1e181a', '#3a3038', '#ff9a3a'], speed: 50, z: 8, vz: 30 });
  },

  // Pale Veil: the next hit is blocked.
  ward(g) {
    const p = g.player;
    p.ward = Math.max(p.ward, 1);
    sfx('ward');
    g.effects.ring(p.x, p.y - 6, 20, 'rgba(240,244,255,0.9)', 0.4, 4);
  },

  // Spare Candle / Tallow Stub: plant a little candle that shoots for you.
  sentry(g, a) {
    const p = g.player;
    const spot = g.room.findFreeSpot(p.x, p.y + 4);
    g.sentries.push(new Sentry(spot.x, spot.y, { damage: Math.max(1.5, p.stats.damage * a.damageMul), life: a.life, fireRate: 1.6 }));
    while (g.sentries.length > a.max) g.sentries.shift();
    g.particles.burst(spot.x, spot.y - 6, 10, { colors: ['#ffd25a', '#e8d9b0'], speed: 40, z: 8, vz: 40 });
  },
};

// ---------------------------------------------------------------------------------
// Part 6 actives (src/data/items/actives.js). Effects that only need a card's or pill's
// effect use CONSUMABLE_FX directly (game.useActive falls back to it).
const rand = (list) => list[Math.floor(Math.random() * list.length)];
function nearestFree(g, x, y) { return g.room.findFreeSpot(x, y); }
function facing(g) {
  const p = g.player, sh = g.input.shoot;
  return sh.x || sh.y ? Math.atan2(sh.y, sh.x) : Math.atan2(p.head.y, p.head.x);
}
// a short-lived helper for the room (Torn Bestiary Page, Spilled Vinegar, a thrown flame...)
function tempHelper(g, def, x, y) {
  const h = new Helper(def, 99);
  h.temp = true;
  h.place(x, y);
  g.familiars.push(h);
  return h;
}

Object.assign(ACTIVE_EFFECTS, {
  // Twin Mirror: every item and pickup in the room gets a twin (once).
  twinMirror(g) {
    let n = 0;
    for (const ped of [...g.room.pedestals]) {
      if (!ped.item || ped.price || ped.cost || ped.deal) continue;
      const s = nearestFree(g, ped.x + 24, ped.y);
      g.room.pedestals.push(new Pedestal(s.x, s.y, ped.item));
      n++;
    }
    for (const it of [...g.room.pickups]) {
      if (it.price || it.collected) continue;
      const c = g.spawnPickup(it.type, it.x, it.y);
      if (it.cons) c.cons = { ...it.cons };
      if (it.trinket) c.trinket = { ...it.trinket };
      n++;
    }
    if (!n) return false;
    sfx('chime');
    g.flashT = 0.2;
  },

  // Fuse Recipe Book: bombs land all over the room (they can hurt you too).
  bombRain(g, a) {
    const p = g.player, rm = g.room;
    for (let i = 0; i < a.n; i++) {
      let x, y, tries = 0;
      do { x = rm.x0 + 16 + Math.random() * (rm.R - rm.x0 - 32); y = rm.y0 + 16 + Math.random() * (rm.B - rm.y0 - 32); } while (Math.hypot(x - p.x, y - p.y) < 44 && ++tries < 12);
      const s = nearestFree(g, x, y);
      const b = new Bomb(s.x, s.y);
      b.fuse *= 1 + Math.random() * 0.6;
      g.bombs.push(b);
    }
    sfx('whoosh');
  },

  // stats, shot traits or flight until you leave the room (and maybe some ash)
  roomBuff(g, a) {
    const p = g.player;
    (p.roomBuffs ??= []).push(a.buff);
    p.recompute();
    if (a.ash) p.health.addSoul(a.ash, 'soul');
    g.effects.ring(p.x, p.y - 8, 26, a.color || '#fff3c0', 0.4, 6);
    g.particles.burst(p.x, p.y - 10, 14, { colors: [a.color || '#fff3c0', '#e8d9b0'], speed: 60, z: 10, vz: 40 });
  },

  // Torn Bestiary Page: a random helper fights for you this room.
  bestiary(g) {
    const ids = Object.keys(FAMILIARS).filter((id) => FAMILIARS[id].follower && !FAMILIARS[id].follower.every && !FAMILIARS[id].follower.collect);
    const id = rand(ids), p = g.player;
    tempHelper(g, { ...FAMILIARS[id].follower, item: id }, p.x, p.y - 6);
    g.effects.float(itemIcon(id), p.x, p.y - 20, 1.2);
    sfx('chirp');
  },

  // Sour Rag: every enemy runs away.
  fearAll(g) {
    let n = 0;
    for (const e of g.enemies) if (e.hittable) { e.applyStatus('fear', 0); n++; }
    g.effects.ring(g.player.x, g.player.y, 100, 'rgba(90,70,110,0.8)', 0.5, 10);
    sfx('wail');
    if (!n) return false;
  },

  // Hollering Jaw / Horned Mask: one big beam where you face, or one each way
  beam(g, a) {
    const base = facing(g), dirs = a.cross ? [0, 1, 2, 3] : [0];
    for (const i of dirs) fireBeam(g, g.player, base + i * Math.PI / 2, a.mul || 1, a.life);
    g.shake(3);
  },

  // Powder Heart: you go off like a bomb, but it never hurts you.
  selfBlast(g, a) {
    const p = g.player;
    g.explode(p.x, p.y, a.radius, a.damage + p.stats.damage * 2, { safe: true });
  },

  // Grandmother's Powder: the whole room goes up.
  roomBlast(g, a) {
    const rm = g.room;
    for (const e of [...g.enemies]) if (e.hittable) g.explode(e.x, e.y, 30, a.damage, { safe: true });
    for (const b of g.bosses) { const c = b.hitCircles()[0]; if (c) g.explode(c.x, c.y, 40, a.damage, { safe: true }); }
    for (let i = 0; i < 5; i++) g.explode(rm.x0 + 30 + Math.random() * (rm.R - rm.x0 - 60), rm.y0 + 30 + Math.random() * (rm.B - rm.y0 - 60), 34, a.damage, { safe: true });
    g.flashT = 0.5;
    g.shake(10);
  },

  // a helper that sits on the floor (puddle, flame, sinkhole) or rides on you (Rocking Horse)
  place(g, a) {
    const p = g.player;
    let x = p.x, y = p.y;
    if (a.throw) {
      const ang = facing(g);
      const s = nearestFree(g, p.x + Math.cos(ang) * a.throw, p.y + Math.sin(ang) * a.throw * 0.8);
      x = s.x; y = s.y;
    }
    tempHelper(g, { ...a.helper, item: a.item }, x, y);
    if (a.shield) p.shieldT = Math.max(p.shieldT || 0, a.shield);
    sfx(a.sound || 'whoosh');
  },

  // Janitor's Key Ring: every locked door in the room opens.
  unlockDoors(g) {
    let n = 0;
    for (const door of Object.values(g.cell.doors)) if (door.locked) { door.locked = false; n++; }
    if (!n) return false;
    sfx('unlock');
  },

  // Box of Spiderlings
  spiders(g, a) {
    const p = g.player, n = a.min + Math.floor(Math.random() * (a.max - a.min + 1));
    for (let i = 0; i < n && g.gnats.length < 16; i++) g.gnats.push(new Gnat(p.x + (Math.random() - 0.5) * 16, p.y + 4, 'spider'));
    sfx('squish');
  },

  // Bone Dice: every plain pickup in the room becomes another one.
  rerollPickups(g) {
    const kinds = ['coin', 'coin', 'silver', 'bomb', 'bomb2', 'key', 'heart', 'heartHalf', 'ash', 'battery'];
    let n = 0;
    for (const it of g.pickups) {
      if (it.price || it.collected || it.cons || it.trinket) continue;
      it.setType(rand(kinds));
      g.particles.burst(it.x, it.y, 6, { colors: ['#f8f4e8', '#c4bfb6'], speed: 40, z: 6 });
      n++;
    }
    if (!n) return false;
    sfx('reroll');
  },

  // Rubber Eraser: the nearest ordinary enemy is rubbed out.
  erase(g) {
    const p = g.player;
    let best = null, bd = Infinity;
    for (const e of g.enemies) {
      if (!e.hittable || e.def.mini || e.def.boss) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return false;
    g.particles.burst(best.x, best.y - 4, 16, { colors: ['#e090b0', '#f8f4e8'], speed: 60, z: 8 });
    best.hp = 0;
    g.killEnemy(best);
  },

  // Sealed Coffer: a little of everything, more the deeper you are; an item from floor 4 on.
  coffer(g) {
    const p = g.player, f = g.floorNum;
    const loot = ['coin', 'coin', 'key', 'bomb'];
    for (let i = 0; i < Math.floor(f / 2); i++) loot.push(rand(['coin', 'silver', 'key', 'bomb', 'heart', 'ash', 'card', 'pill']));
    for (const t of loot) g.spawnPickup(t, p.x, p.y);
    if (f >= 4) { const s = nearestFree(g, p.x, p.y - 30); g.room.pedestals.push(new Pedestal(s.x, s.y, g.itemPools.draw(f >= 7 ? 'angel' : 'treasure'))); }
    sfx('secret');
  },

  // Wax Donor Kit: half a heart for a coin or two.
  donor(g) {
    const p = g.player;
    for (let i = 0; i < 1 + (Math.random() < 0.5 ? 1 : 0); i++) g.spawnPickup('coin', p.x, p.y);
    sfx('coin');
  },

  // Pocket Slot Machine: put a coin in, maybe get something out.
  slot(g) {
    const p = g.player, r = Math.random();
    if (r < 0.34) g.spawnPickup(rand(['heart', 'bomb', 'key', 'card', 'pill', 'heartHalf', 'coin', 'silver']), p.x, p.y);
    else if (r < 0.4) for (let i = 0; i < 3; i++) g.spawnPickup('coin', p.x, p.y);
    else { g.particles.burst(p.x, p.y - 10, 6, { colors: ['#4a4540', '#8a8580'], speed: 30, z: 10 }); sfx('denied'); return; }
    sfx('chirp');
  },

  // Bent Boomerang: out and back, freezing what it hits for a moment.
  boomerang(g, a) {
    const p = g.player, ang = facing(g), dx = Math.cos(ang), dy = Math.sin(ang), sp = 210;
    g.projectiles.spawn({
      x: p.x, y: p.y, z: 10, vx: dx * sp, vy: dy * sp, r: 5, damage: a.damage + p.stats.damage, range: 9999,
      team: 'player', style: 'bone', pierce: true, freeze: true, knockback: 30,
      back: { owner: p, out: 0.55, speed: sp, dx, dy, t: 0, x0: p.x, y0: p.y },
    });
    sfx('whoosh');
  },

  // Cracked Skylight: pillars of light fall on a few enemies.
  skylight(g, a) {
    const p = g.player, list = g.targets();
    if (!list.length) return false;
    for (let i = 0; i < a.n; i++) {
      const t = list[Math.floor(Math.random() * list.length)];
      setTimeout(() => {
        if (t.boss ? !t.boss.hittable : !t.hittable) return;
        g.effects.bolt(t.x, t.y - 140, t.x, t.y - 2, 0.35);
        g.effects.ring(t.x, t.y, 16, 'rgba(255,250,220,0.9)', 0.3, 4);
        const dmg = a.damage + p.stats.damage;
        if (t.boss) t.boss.takeHit(dmg, g); else t.takeHit(dmg, 0, -1, 20, g);
        sfx('chime');
      }, i * 160);
    }
  },

  // Prayer Slip: a Vigil Heart.
  vigil(g) {
    const p = g.player;
    if (!p.health.canAddEternal()) return false;
    p.health.addEternal();
    sfx('heart');
    g.effects.ring(p.x, p.y - 8, 20, '#f8f4e8', 0.4, 4);
  },
});
