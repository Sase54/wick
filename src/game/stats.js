// Player stats. Items modify these through data (src/data/items.js); this file only
// holds the starting values and limits.
import { TUNING } from '../data/tuning.js';
export const BASE_STATS = {
  damage: TUNING.damage.base,   // before damage ups (see items.js computeLoadout)
  fireRate: 30 / 11, // shots per second (worked out from the tears stat, see tearDelay)
  range: TUNING.tears.range,   // tiles a shot travels before dropping
  shotSpeed: 1.0,
  speed: 1.0,
  luck: 0,
};

export const STAT_LIMITS = {
  damage: [0.5, 99],
  fireRate: [0.3, 15],
  range: [2, 20],
  shotSpeed: [0.6, 2.5],
  speed: [TUNING.player.speedMin, TUNING.player.speedMax],
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

// Isaac's tear delay (frames at 30 per second) from the tears stat T. "+fire rate" on items adds
// to T, so each one helps a bit less, and T alone can't push the delay below the cap.
export function tearDelay(T) {
  const { delayBase: B, delayMul: M, delaySlope: S, delayCap } = TUNING.tears;
  if (T >= 0) return Math.max(delayCap, B - M * Math.sqrt(1 + S * T));
  if (T > -0.77) return B - M * Math.sqrt(1 + S * T) - M * T;
  return B - M * T;
}
