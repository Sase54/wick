// Save & continue for the run in progress.
//
// A run is rebuilt from its seed (floors, room layouts and art are all deterministic),
// then everything that changed is laid back on top: Wick, items, the item pools, which rooms
// were visited/cleared, broken rocks, opened doors, what's left on the floor, shop stock.
// Rooms that were not cleared when saving are re-filled with fresh enemies on continue,
// and an undefeated boss comes back at full health.
import { Pedestal } from './items.js';
import { Pickup } from './pickups.js';
import { Shopkeeper } from './shop.js';
import { Trapdoor } from './trapdoor.js';
import { Health } from './health.js';
import { Gnat } from './followers.js';
import { MECHANICS } from './mechanics.js';
import { loadProp } from './specials.js';
import { setupPills, pillsSave } from './consumables.js';

// a saved floor pickup, with what it holds if it's a pocket thing or a trinket
function loadPickup(q) {
  const it = new Pickup(q.t, q.x, q.y);
  it.price = q.price || 0;
  if (q.c) it.cons = { ...q.c };
  if (q.tr) it.trinket = { ...q.tr };
  return it;
}

export function serializeRun(g) {
  const p = g.player;
  return {
    seed: g.seed,
    character: g.characterId,
    floorNum: g.floorNum,
    floorName: g.floorDef?.name,   // shown under CONTINUE on the title screen
    variants: { ...g.variantLog },
    bosses: { ...g.bossLog },
    cell: g.cell.key,
    player: {
      x: p.x, y: p.y,
      health: p.health.toJSON(),
      coins: p.coins, bombs: p.bombs, keys: p.keys,
      items: [...p.items],
      active: p.active ? { ...p.active } : null,
      pocket: p.pocket ? { ...p.pocket } : null,
      charStats: { ...p.charStats },
      pillStats: { ...p.pillStats },
      consumables: p.consumables.map((c) => ({ ...c })),
      pocketSel: p.pocketSel,
      trinket: p.trinket ? { ...p.trinket } : null,
      gulped: p.gulped.map((t) => ({ ...t })),
      lookColors: p.lookColors,
      ward: p.ward,
      gnats: g.gnats.length,
      helperXp: p.helperXp || undefined,
      transforms: p.transforms?.length ? [...p.transforms] : undefined,
      // mechanics that need to remember something (Morrow's revive, Twofold's other form...)
      mech: Object.fromEntries(Object.entries(p.mech).filter(([n]) => MECHANICS[n].save).map(([n, m]) => [n, MECHANICS[n].save(p, m)])),
    },
    rng: { loot: g.lootRng.state, items: g.itemPools.rng.state },
    taken: [...g.itemPools.taken],
    floorLoot: g.floorLoot,
    // the floor is rebuilt from the seed plus the special rooms it rolled and how often the die reshuffled it
    floorPlan: { specials: g.floorDef.specials, rearranged: g.rearrangeCount || 0 },
    keySeen: g.keySeen,
    roomsCleared: g.roomsCleared,
    stats: { ...g.stats, items: [...g.stats.items] },
    // special rooms: rooms added during the floor, deals, the crawlspace
    added: g.floor.added,
    runFlags: { ...g.runFlags },
    devilTaken: g.devilTaken,
    pills: pillsSave(g),
    trinketsSeen: [...g.trinketsSeen],
    floorRedHit: g.floorRedHit, bossRedHit: g.bossRedHit,
    crawl: g.crawl ? { ...g.crawl, marketCell: undefined, marketKey: g.crawl.marketCell?.key ?? null } : null,
    cells: [...g.floor.cells.values()]
      .filter((c) => c.seen || c.visited || c.room)
      .map((c) => ({
        key: c.key,
        seen: c.seen,
        visited: c.visited,
        doors: Object.fromEntries(Object.entries(c.doors).map(([k, d]) => [k, { locked: d.locked, hidden: d.hidden }])),
        room: c.room ? {
          grid: Array.from(c.room.grid),
          cleared: c.room.cleared,
          special: !!c.room.specialDone,
          bossDone: !!c.room.bossDone,
          pickups: c.room.pickups.filter((it) => !it.collected).map((it) => ({ t: it.type, x: Math.round(it.x), y: Math.round(it.y), price: it.price, c: it.cons || undefined, tr: it.trinket || undefined })),
          pedestals: c.room.pedestals.map((pd) => ({ x: pd.x, y: pd.y, item: pd.item, price: pd.price, bare: pd.bare, flick: pd.flick || null, flickDone: !!pd.flickDone, cost: pd.cost, group: pd.group, deal: pd.deal })),
          trapdoor: c.room.trapdoor ? { x: c.room.trapdoor.x, y: c.room.trapdoor.y, kind: c.room.trapdoor.kind } : null,
          props: (c.room.props || []).map((pr) => pr.save()),
        } : null,
      })),
  };
}

// Rebuild a saved run inside `g`. Returns false if the save can't be used.
export function restoreRun(g, s) {
  if (!s || !s.seed || !s.floorNum) return false;
  g.restoring = true;
  // the saved floor's plan goes to whichever startFloor builds it
  if (s.floorNum === 1) g.restoreFloor = s.floorPlan || null;
  g.newRun(s.seed, { character: s.character, fresh: false, variants: s.variants || {}, bosses: s.bosses || {} });
  if (s.floorNum > 1) { g.restoreFloor = s.floorPlan || null; g.startFloor(s.floorNum); }
  g.restoreFloor = null;

  // RNG streams, item pools and floor loot exactly as they were
  g.lootRng.state = s.rng.loot;
  g.itemPools.rng.state = s.rng.items;
  g.itemPools.taken = new Set(s.taken);
  g.floorLoot = s.floorLoot;
  g.keySeen = s.keySeen;
  g.roomsCleared = s.roomsCleared;
  g.runFlags = { ...(s.runFlags || {}) };
  g.devilTaken = !!s.devilTaken;
  if (s.pills) setupPills(g, s.pills);
  g.trinketsSeen = new Set(s.trinketsSeen || []);
  g.floorRedHit = !!s.floorRedHit;
  g.bossRedHit = !!s.bossRedHit;
  if (s.added) g.floor.replayAdded(s.added);
  if (s.crawl) {
    g.crawl = { ...s.crawl };
    if (s.crawl.marketKey != null) g.crawl.marketCell = g.floor.cells.get(s.crawl.marketKey) || null;
  }
  g.stats = { ...g.stats, ...s.stats, items: [...(s.stats.items || [])] };

  // The candle
  const p = g.player, sp = s.player;
  Object.assign(p, {
    health: Health.from(sp.health || {}),
    coins: sp.coins, bombs: sp.bombs, keys: sp.keys,
    items: [...sp.items],
    active: sp.active ? { ...sp.active } : null,
    pocket: sp.pocket ? { ...sp.pocket } : null,
    ward: sp.ward || 0,
  });
  if (sp.charStats) p.charStats = { ...sp.charStats };
  p.pillStats = { ...(sp.pillStats || {}) };
  p.consumables = (sp.consumables || []).map((c) => ({ ...c }));
  p.pocketSel = sp.pocketSel || 0;
  p.trinket = sp.trinket ? { ...sp.trinket } : null;
  p.gulped = (sp.gulped || []).map((t) => ({ ...t }));
  if (sp.lookColors) p.lookColors = sp.lookColors;
  p.helperXp = sp.helperXp ? { ...sp.helperXp } : {};
  p.transforms = [...(sp.transforms || [])];
  for (const [name, data] of Object.entries(sp.mech || {})) if (p.mech[name]) MECHANICS[name].load?.(data, p, p.mech[name]);
  p.recompute();
  p.newTransforms = null;   // already announced before the save
  g.syncFollowers();
  g.gnats = Array.from({ length: sp.gnats || 0 }, () => new Gnat(p.x, p.y));

  // Rooms and doors
  for (const sc of s.cells) {
    const cell = g.floor.cells.get(sc.key);
    if (!cell) continue;
    cell.seen = sc.seen;
    cell.visited = sc.visited;
    for (const [d, st] of Object.entries(sc.doors || {})) {
      const door = cell.doors[d];
      if (door) { door.locked = st.locked; door.hidden = st.hidden; }
    }
    const sr = sc.room;
    if (!sr) continue;
    const room = g.floor.roomFor(cell);
    room.grid.set(sr.grid);
    room.dirty = true;
    room.version++;
    room.cleared = sr.cleared;
    room.populated = sr.cleared;     // uncleared rooms get fresh enemies when entered
    const bossPending = cell.type === 'boss' && !sr.bossDone;
    room.specialDone = sr.special && !bossPending;
    room.bossDone = sr.bossDone;
    if (bossPending) room.cleared = false;
    // a boss rush left half-way starts over when you come back
    if (cell.type === 'bossrush' && !sr.cleared) room.specialDone = false;
    if (room.specialDone) {
      room.pickups = sr.pickups.map(loadPickup);
      room.pedestals = sr.pedestals.map((q) => {
        const ped = new Pedestal(q.x, q.y, q.item, { price: q.price, bare: q.bare, cost: q.cost || null, group: q.group || null, deal: q.deal || null });
        ped.cooldown = 0;
        ped.flick = q.flick || null;
        ped.flickDone = !!q.flickDone;
        return ped;
      });
      room.props = (sr.props || []).map(loadProp).filter(Boolean);
      const k = room.spawns.find((sp) => sp.ch === 'K');
      if (k) room.keeper = new Shopkeeper(k.x, k.y);
      if (sr.trapdoor) {
        room.trapdoor = new Trapdoor(sr.trapdoor.x, sr.trapdoor.y, sr.trapdoor.kind);
        room.trapdoor.open = 1;
        room.trapdoor.t = 1;
      }
    } else {
      // only floor pickups survive in non-special rooms
      room.pickups = sr.pickups.map(loadPickup).map((it) => { it.price = 0; return it; });
    }
  }

  const cell = g.floor.cells.get(s.cell) || g.floor.start;
  g.enterCell(cell, null);
  if (g.room.cleared) {
    p.x = s.player.x;
    p.y = s.player.y;
  } else {
    p.x = g.room.centerX;
    p.y = g.room.B - 20;
  }
  g.banner = { text: g.floorDef.name, sub: 'CONTINUED', t: 0, dur: 2.5 };
  g.restoring = false;
  return true;
}
