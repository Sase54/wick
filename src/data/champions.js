// Champion enemies: random, recolored, stronger versions with a special trick and a drop.
// Any enemy can roll one (chance per floor in src/data/floors.js) unless it has `noChampion`.
// Bosses can be champions too (tougher, angrier, recolored).
//
//   color     tint over the enemy (prismatic cycles through `colors`)
//   hpMul, speedMul, contact (extra half hearts on touch), scale (drawn size and hitbox)
//   armor     fraction of damage it ignores
//   trail     leaves creep behind it: 'poison' (green, hurts) | 'fire' (flames, hurt)
//   deathShots, split (copies of itself as runts), retaliate (shots back when hit), pull, fade
//   drop      pickup it leaves behind (src/data/pickups.js)
export const CHAMPIONS = {
  crimson: { name: 'Crimson', color: '#d02020', hpMul: 2, drop: 'heart' },
  amber: { name: 'Amber', color: '#e0a020', speedMul: 1.45, drop: 'key' },
  bilious: { name: 'Bilious', color: '#6ab030', trail: 'poison', drop: 'coin' },
  frost: { name: 'Frost', color: '#60b0f0', deathShots: { count: 8, speed: 62 }, drop: 'bomb' },
  sooty: { name: 'Sooty', color: '#2a2228', hpMul: 1.5, contact: 1, drop: 'soot' },
  pale: { name: 'Pale', color: '#e8e8f0', fade: true, drop: 'ash' },
  violet: { name: 'Violet', color: '#9040c0', pull: 34, drop: 'coin' },
  stone: { name: 'Stone', color: '#8a8a8a', armor: 0.5, speedMul: 0.8, drop: 'bomb' },
  bloated: { name: 'Bloated', color: '#e090b0', split: 2, drop: 'heartHalf' },
  ember: { name: 'Ember', color: '#f06020', trail: 'fire', drop: 'coin' },
  thorned: { name: 'Thorned', color: '#4a7a2a', retaliate: { count: 4, speed: 70 }, drop: 'silver' },
  prismatic: { name: 'Prismatic', colors: ['#ff5a5a', '#ffd25a', '#6ad06a', '#5aa0ff', '#c070ff'], hpMul: 3, drop: 'brass' },
  runt: { name: 'Runt', color: '#c8b070', scale: 0.7, speedMul: 1.4, hpMul: 0.6, drop: 'coin' },
  hulking: { name: 'Hulking', color: '#7a4a2a', scale: 1.4, hpMul: 3, speedMul: 0.75, contact: 1, drop: 'heart' },
};

// How likely each champion is (runt and prismatic are rarer).
export const CHAMPION_WEIGHTS = {
  crimson: 3, amber: 3, bilious: 2, frost: 2, sooty: 1.5, pale: 1.5, violet: 1.5, stone: 2,
  bloated: 1.5, ember: 2, thorned: 1.5, prismatic: 0.5, runt: 1, hulking: 1.5,
};
