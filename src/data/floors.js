// The floors of a run, top to bottom. Floors come in chapters of two (like Isaac); each floor
// picks one of its chapter's variants (src/data/variants.js) for its look, enemies, music and
// hazards. This file only holds the difficulty curve and size of each floor.
//
//   chapter        1-based chapter number (boss pools are per chapter, see src/data/bosses.js)
//   threat         enemy budget of a one-screen room (enemy costs: THREAT in src/data/enemies.js);
//                  big rooms get 1.5x (2 screens) / 2x (L) / 2.5x (2x2), narrow rooms 0.8x
//   rooms          [min, max] normal rooms (plus special rooms)
//   bigChance      chance for a normal room to grow into a big room (2x1, 2x2, L...)
//   narrowChance   chance for a normal room to become a narrow hall or shaft
//   enemyHp        enemy health multiplier
//   extraEnemies   chance per spawn marker to add one more enemy of the room's mix
//   championChance chance for an enemy to be a champion (src/data/champions.js)
//   bossHp         boss health multiplier
//   bossTier       extra difficulty for early-chapter bosses reused deeper down (more shots)
//   giant          this floor's boss is always this one (the chapter's giant)
//   final          the last floor: its boss is the final boss and beating it wins the run
//   title          the floor's own name instead of "variant + numeral" (the finale)
//   specials       which basic special rooms it gets (default treasure + shop)
//   noExtras       no extra special rooms, no crawlspace
export const FLOORS = [
  { chapter: 1, threat: 5, rooms: [10, 13], bigChance: 0.65, narrowChance: 0.18, enemyHp: 1, extraEnemies: 0, championChance: 0.02, bossHp: 1, bossTier: 0 },
  { chapter: 1, threat: 5.5, rooms: [11, 14], bigChance: 0.75, narrowChance: 0.2, enemyHp: 1.1, extraEnemies: 0.05, championChance: 0.04, bossHp: 1.15, bossTier: 0 },
  { chapter: 2, threat: 6.5, rooms: [12, 15], bigChance: 0.8, narrowChance: 0.2, enemyHp: 1.3, extraEnemies: 0.1, championChance: 0.06, bossHp: 1.6, bossTier: 1 },
  { chapter: 2, threat: 7, rooms: [13, 16], bigChance: 0.85, narrowChance: 0.2, enemyHp: 1.45, extraEnemies: 0.15, championChance: 0.08, bossHp: 1.85, bossTier: 1 },
  { chapter: 3, threat: 8, rooms: [14, 17], bigChance: 0.9, narrowChance: 0.2, enemyHp: 1.65, extraEnemies: 0.2, championChance: 0.1, bossHp: 2.3, bossTier: 1 },
  { chapter: 3, threat: 8.5, rooms: [15, 18], bigChance: 0.95, narrowChance: 0.2, enemyHp: 1.8, extraEnemies: 0.25, championChance: 0.12, bossHp: 2.6, bossTier: 1, giant: 'chandler' },
  // Chapter 4: the heavyweights (their hp is set in bosses.js), then The Tallow Heart
  { chapter: 4, threat: 9.5, rooms: [16, 19], bigChance: 1, narrowChance: 0.2, enemyHp: 2, extraEnemies: 0.3, championChance: 0.14, bossHp: 1, bossTier: 0 },
  { chapter: 4, threat: 10, rooms: [17, 20], bigChance: 1, narrowChance: 0.2, enemyHp: 2.2, extraEnemies: 0.35, championChance: 0.16, bossHp: 1, bossTier: 0, giant: 'tallowheart' },
  // The finale: a short last stretch below the heart, and The Snuffer
  { chapter: 4, threat: 10.5, rooms: [6, 8], bigChance: 0.6, narrowChance: 0.1, enemyHp: 2.3, extraEnemies: 0.35, championChance: 0.18, bossHp: 1, bossTier: 0, final: true, title: "THE WICK'S END", specials: ['treasure'], noExtras: true },
];

export const ROMAN = ['I', 'II', 'III'];
