// Trinket effects (`fx` in src/data/trinkets.js). They plug into the same hooks as the
// characters' mechanics (src/game/mechanics.js): enterRoom, update, hurt, kill, roomClear, fired.
// Each effect's params carry `gold`: 2 for a golden trinket, which doubles how strong it is.
import { MECHANICS } from './mechanics.js';
import { Gnat } from './followers.js';
import { sfx } from '../engine/audio.js';

const mulOf = (m) => m.gold || 1;
const living = (g) => g.enemies.filter((e) => e.hittable);

export const TRINKET_FX = {
  // ---- hurt: (g, amount, p, m)
  tHurtBurst: {
    hurt(g, amount, p, m) {
      const n = m.count * mulOf(m);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.projectiles.spawn({ x: p.x, y: p.y - 4, z: 10, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 4, damage: m.damage, range: 120, team: 'player', style: 'red', pierce: true, knockback: 30 });
      }
    },
  },
  tHurtDrop: {
    hurt(g, amount, p, m) { if (g.lootRng.chance(Math.min(1, m.chance * mulOf(m)))) g.spawnPickup(m.type, p.x, p.y); },
  },
  tHurtRage: {
    hurt(g, amount, p, m) { p.rageT = m.time; p.rageDamage = m.damage * mulOf(m); sfx('growl'); },
  },
  tHurtCharge: {
    hurt(g, amount, p, m) {
      for (const slot of [p.active, p.pocket]) if (slot) slot.charge = Math.min(99, slot.charge + m.amount * mulOf(m));
    },
  },
  tHurtTeleport: {
    hurt(g, amount, p, m) {
      if (!g.lootRng.chance(m.chance) || g.bosses.length) return;
      const cells = [...g.floor.cells.values()].filter((c) => !c.offGrid && c.type !== 'boss' && c !== g.cell);
      if (cells.length) setTimeout(() => g.teleportTo(g.lootRng.pick(cells)), 0);
    },
  },

  // ---- health: (dt, g, p, m)
  tLowHealth: {
    update(dt, g, p, m) { if (p.health.total <= 2) p.dmgMul *= 1 + (m.damageMul - 1) * mulOf(m); },
  },
  tFullHealth: {
    update(dt, g, p, m) { const h = p.health; if (h.containers > 0 && h.red >= h.containers * 2) p.dmgMul *= 1 + (m.damageMul - 1) * mulOf(m); },
  },
  tFightSpeed: {
    update(dt, g, p, m) { if (living(g).length) p.speedMul *= 1 + m.speed * mulOf(m); },
  },

  // ---- entering a room: (g, p, m)
  tEnterFreeze: {
    enterRoom(g, p, m) {
      if (!g.lootRng.chance(m.chance * mulOf(m))) return;
      setTimeout(() => { for (const e of living(g)) e.status.freeze = Math.max(e.status.freeze || 0, m.time); }, 0);
    },
  },
  tEnterFear: {
    enterRoom(g, p, m) {
      if (!g.lootRng.chance(m.chance * mulOf(m))) return;
      setTimeout(() => { for (const e of living(g)) e.applyStatus('fear', 0); }, 0);
    },
  },
  tEnterShield: {
    enterRoom(g, p, m) { if (g.lootRng.chance(m.chance * mulOf(m))) p.shieldT = Math.max(p.shieldT, m.time); },
  },
  tEnterWard: {
    enterRoom(g, p, m) { if (g.lootRng.chance(m.chance * mulOf(m))) p.ward = Math.max(p.ward, 1); },
  },

  // ---- clearing a room: (g, p, m)
  tClearDrop: {
    roomClear(g, p, m) { if (g.lootRng.chance(Math.min(1, m.chance * mulOf(m)))) g.spawnPickup(m.type, p.x, p.y - 10); },
  },
  tClearCharge: {
    roomClear(g, p, m) {
      if (!g.lootRng.chance(Math.min(1, m.chance * mulOf(m)))) return;
      for (const slot of [p.active, p.pocket]) if (slot) slot.charge = Math.min(99, slot.charge + 1);
    },
  },
  tClearHeal: {
    roomClear(g, p, m) {
      m.n = (m.n || 0) + 1;
      if (m.n >= Math.max(1, Math.round(m.every / mulOf(m)))) { m.n = 0; p.health.healRed(1); sfx('heart'); }
    },
  },
  tClearGnats: {
    roomClear(g, p, m) {
      if (!g.lootRng.chance(Math.min(1, m.chance * mulOf(m)))) return;
      for (let i = 0; i < m.n && g.gnats.length < 12; i++) g.gnats.push(new Gnat(p.x, p.y, m.kind));
    },
  },

  // ---- kills: (g, e, p, m)
  tKillDrop: {
    kill(g, e, p, m) { if (g.lootRng.chance(m.chance * mulOf(m))) g.spawnPickup(m.type === 'any' ? g.randomDrop() : m.type, e.x, e.y); },
  },
  tKillHeal: {
    kill(g, e, p, m) {
      m.n = (m.n || 0) + 1;
      if (m.n >= Math.round(m.every / mulOf(m))) { m.n = 0; p.health.healRed(1); sfx('heart'); }
    },
  },
  tKillExplode: {
    kill(g, e, p, m) { if (g.lootRng.chance(m.chance * mulOf(m))) g.explode(e.x, e.y, 24, p.stats.damage * 2, { safe: true }); },
  },
  tKillStack: {
    enterRoom(g, p, m) { m.k = 0; },
    kill(g, e, p, m) { m.k = Math.min(m.cap * mulOf(m), (m.k || 0) + m.per * mulOf(m)); },
    update(dt, g, p, m) { if (m.k) p.dmgMul *= 1 + m.k; },
  },

  // ---- around you
  tMagnet: {
    update(dt, g, p, m) {
      const range = m.range * mulOf(m);
      for (const it of g.pickups) {
        if (it.price || it.z > 2) continue;
        const dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy);
        if (d > range || d < 4) continue;
        it.vx += (dx / d) * 160 * dt;
        it.vy += (dy / d) * 160 * dt;
      }
    },
  },
  tAura: {
    update(dt, g, p, m) {
      m.t = (m.t || 0) - dt;
      if (m.t > 0) return;
      m.t = 0.5;
      for (const e of living(g)) {
        if (Math.hypot(e.x - p.x, e.y - p.y) > m.radius + e.r) continue;
        e.takeHit(m.damage * mulOf(m), 0, 0, 10, g);
        g.particles.spawn(e.x, e.y - 4, { z: 6, vz: 30, life: 0.3, color: '#f08a24' });
      }
    },
  },
  tShotBurst: {
    fired(g, dx, dy, dm, sm, p, m) {
      m.n = (m.n || 0) + 1;
      if (m.n < Math.max(2, Math.round(m.every / mulOf(m)))) return;
      m.n = 0;
      for (let i = 0; i < m.count; i++) {
        const a = (i / m.count) * Math.PI * 2;
        g.projectiles.spawn({ x: p.x, y: p.y - 4, z: 12, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 3, damage: p.shotDamage * 0.6, range: 110, team: 'player', style: 'gold', knockback: 20 });
      }
    },
  },
};

// They live alongside the characters' mechanics so the player runs them the same way.
Object.assign(MECHANICS, TRINKET_FX);
