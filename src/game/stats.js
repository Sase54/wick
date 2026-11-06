// Player stats. Items modify these through data (src/data/items.js); this file only
// holds the starting values and limits.
export const BASE_STATS = {
  damage: 3.5,
  fireRate: 2.5,     // shots per second
  range: 6.5,        // tiles a shot travels before dropping
  shotSpeed: 1.0,
  speed: 1.0,
  luck: 0,
};

export const STAT_LIMITS = {
  damage: [0.5, 99],
  fireRate: [0.5, 15],
  range: [2, 20],
  shotSpeed: [0.6, 2.5],
  speed: [0.5, 2.0],
  luck: [-5, 15],
};

export const STAT_LABELS = {
  damage: 'DMG',
  fireRate: 'RATE',
  range: 'RANGE',
  shotSpeed: 'SHOT SPD',
  speed: 'SPEED',
  luck: 'LUCK',
};

export function clampStats(s) {
  for (const [k, [lo, hi]] of Object.entries(STAT_LIMITS)) s[k] = Math.max(lo, Math.min(hi, s[k]));
  return s;
}
