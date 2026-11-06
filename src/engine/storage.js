// Versioned saves in localStorage. Three separate stores:
//   settings  - options (volume, controls, ...)
//   progress  - persistent: unlocks/achievements, stats, completion marks, item collection, records
//   run       - the run in progress (save & quit / continue)
//
// Every store is saved as { v: version, data, savedAt }. When a store's shape changes:
// bump its version and add a migration `fromVersion -> data` below. Old saves are upgraded on
// load and never thrown away just because the game was updated.
//
// Every access is guarded: storage can be missing or blocked (private mode), and the game
// must still run without it.
import { OLD_ITEMS } from '../data/items.js';

// Part 4.5 replaced every item: a run saved before that swaps each old item for its nearest
// new one (OLD_ITEMS in src/data/items.js), wherever an item id is stored.
function renameItems(d) {
  if (!d) return d;
  const re = (id) => OLD_ITEMS[id] || id;
  const pl = d.player;
  if (pl) {
    pl.items = (pl.items || []).map(re);
    if (pl.active) pl.active.id = re(pl.active.id);
    if (pl.pocket) pl.pocket.id = re(pl.pocket.id);
  }
  if (d.taken) d.taken = d.taken.map(re);
  if (d.stats?.items) d.stats.items = d.stats.items.map(re);
  if (d.floorLoot) for (const [k, v] of Object.entries(d.floorLoot)) d.floorLoot[k] = Array.isArray(v) ? v.map(re) : re(v);
  if (d.crawl?.item) d.crawl.item = re(d.crawl.item);
  for (const r of (d.cells || []).map((c) => c.room).filter(Boolean)) {
    for (const pd of r.pedestals || []) if (pd.item) pd.item = re(pd.item);
    for (const pr of r.props || []) if (pr.state?.prize) pr.state.prize = re(pr.state.prize);
  }
  return d;
}

export const DEFAULT_SETTINGS = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  screenShake: true,
  tearHighlight: true,   // enemy shots glow so they're easier to spot
  foundHud: true,        // stats on the left side of the screen
  itemInfo: 'text',      // 'name' | 'text' | 'detailed' (effect box near pedestals)
  freeAim: false,        // touch: shoot in any direction instead of 4
  stickSize: 120,        // touch joystick diameter in CSS px
  stickOpacity: 0.6,
  showFps: false,
  unlockAll: false,      // testing: treat every unlockable as unlocked
};

export function freshProgress() {
  return {
    stats: {
      runs: 0, wins: 0, deaths: 0,
      enemiesKilled: 0,
      bossKillsTotal: 0,
      bossKills: {},          // boss id -> times beaten
      maxFloor: 0, maxChapter: 0,
      secretsFound: 0, shopBuys: 0, markedRocks: 0,
      itemsCollected: 0,      // different items ever picked up (size of collection)
      activeUses: 0,          // active/pocket items used
      pillsUsed: 0, cardsUsed: 0, runesUsed: 0, chestsOpened: 0, trinketsFound: 0,   // part 5
      dealsDevil: 0, dealsAngel: 0, transformations: 0,   // part 6
      noHitFloors: 0,         // floors finished without taking damage
      charactersWon: 0,       // different characters that escaped the cellar
      chars: {},              // character id -> { runs, wins, maxChapter }
    },
    lastCharacter: 'wick',     // picked first on the character select screen
    achievements: {},          // achievement id -> time unlocked
    marks: {},                 // character id -> { boss id: true } completion marks
    collection: {},            // item id -> true (ever picked up)
    best: [],                  // fastest wins
    recent: [],                // last runs
  };
}

const STORES = {
  settings: {
    key: 'wick.settings',
    version: 1,
    fresh: () => ({ ...DEFAULT_SETTINGS }),
    // from the very first builds, before saves were versioned
    legacy: { key: 'wick.settings.v1', convert: (old) => old },
    migrations: {},
  },
  progress: {
    key: 'wick.progress',
    version: 2,
    fresh: freshProgress,
    legacy: {
      key: 'wick.runs.v1',
      convert: (old) => {
        const p = freshProgress();
        p.stats.runs = old.totals?.runs || 0;
        p.stats.wins = old.totals?.wins || 0;
        p.stats.deaths = old.totals?.deaths || 0;
        p.best = old.best || [];
        p.recent = old.recent || [];
        return p;
      },
    },
    // v2 (part 2): character stats and new lifetime stats. The new fields are filled in
    // from freshProgress() when the save loads, so nothing else needs converting.
    migrations: { 1: (d) => d },
  },
  run: {
    key: 'wick.run',
    // v3 (part 3): floors are generated differently (variants, big rooms), so a run saved by an
    // older version can't be rebuilt; it is dropped (progress and unlocks are kept).
    // v4 (part 4.5): every item was replaced; old item ids are swapped for new ones.
    // v5 (part 5): pocket things, trinkets and this run's pill colors. An older run starts with
    // an empty pocket and no trinket; its pill colors are rolled from the seed.
    // v6 (part 6): familiars that grow keep their progress (helperXp) and transformations are
    // kept for good (transforms). An older run starts with none; a transformation its items
    // already earn is given quietly when it loads.
    version: 6,
    fresh: () => null,
    migrations: {
      // v1 -> v2: red/redMax/ash numbers became a full health object (src/game/health.js)
      1: (d) => {
        if (!d?.player) return d;
        const pl = d.player;
        const extra = [];
        for (let a = pl.ash || 0; a > 0; a -= 2) extra.push({ t: 'soul', v: Math.min(2, a) });
        pl.health = { containers: Math.round((pl.redMax || 6) / 2), red: pl.red || 0, extra };
        delete pl.red; delete pl.redMax; delete pl.ash;
        return d;
      },
      2: () => null,
      3: renameItems,
      4: (d) => {
        if (d?.player) Object.assign(d.player, { consumables: [], pocketSel: 0, trinket: null, gulped: [], pillStats: {} });
        return d;
      },
      5: (d) => {
        if (d?.player) { d.player.helperXp ??= {}; d.player.transforms ??= []; }
        return d;
      },
    },
  },
};

function rawGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function rawSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full or unavailable: the game keeps going
  }
}

function rawDel(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// Fill in fields that newer versions added, keeping everything the player already has.
function mergeDefaults(base, data) {
  if (!base || typeof base !== 'object' || Array.isArray(base)) return data ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(data || {})) {
    out[k] = base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? mergeDefaults(base[k], v) : v;
  }
  return out;
}

export function loadStore(name) {
  const s = STORES[name];
  let env = rawGet(s.key);
  if (!env && s.legacy) {
    const old = rawGet(s.legacy.key);
    if (old) env = { v: 1, data: s.legacy.convert(old) };
  }
  if (!env || env.data == null) return s.fresh();
  let data = env.data;
  let v = env.v || 1;
  while (v < s.version) {
    const migrate = s.migrations[v];
    if (migrate) data = migrate(data);
    v++;
  }
  const fresh = s.fresh();
  return fresh ? mergeDefaults(fresh, data) : data;
}

export function saveStore(name, data) {
  const s = STORES[name];
  return rawSet(s.key, { v: s.version, data, savedAt: Date.now() });
}

export function clearStore(name) {
  rawDel(STORES[name].key);
  if (STORES[name].legacy) rawDel(STORES[name].legacy.key);
}

export function hasStore(name) {
  const env = rawGet(STORES[name].key);
  return !!(env && env.data);
}

// Convenience wrappers for settings
export function loadSettings() { return loadStore('settings'); }
export function saveSettings(settings) { saveStore('settings', settings); }
