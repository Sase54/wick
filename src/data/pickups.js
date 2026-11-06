// Floor pickups and the tables that decide what drops where.
//
// kind:  coin | bomb | key | heart (blood, half hearts) | ash (Ash Heart halves) |
//        soot (Soot Heart halves) | vigil | brass | rib | moldy
// value: how much it gives
// sprite: key in src/data/pickupSprites.js
// The heart kinds are explained in src/game/health.js and DESIGN.md.
export const PICKUPS = {
  coin: { name: 'Coin', kind: 'coin', value: 1, sprite: 'coin' },
  silver: { name: 'Silver Coin', kind: 'coin', value: 5, sprite: 'silver' },
  bomb: { name: 'Bomb', kind: 'bomb', value: 1, sprite: 'bomb' },
  bomb2: { name: 'Two Bombs', kind: 'bomb', value: 2, sprite: 'bomb', double: true },
  key: { name: 'Key', kind: 'key', value: 1, sprite: 'key' },
  heartHalf: { name: 'Half Blood Heart', kind: 'heart', value: 1, sprite: 'heartHalf' },
  heart: { name: 'Blood Heart', kind: 'heart', value: 2, sprite: 'heart' },
  ash: { name: 'Ash Heart', kind: 'ash', value: 2, sprite: 'ash' },
  ashHalf: { name: 'Half Ash Heart', kind: 'ash', value: 1, sprite: 'ashHalf' },
  soot: { name: 'Soot Heart', kind: 'soot', value: 2, sprite: 'soot' },
  vigil: { name: 'Vigil Heart', kind: 'vigil', value: 1, sprite: 'vigil' },
  brass: { name: 'Brass Heart', kind: 'brass', value: 1, sprite: 'brass' },
  rib: { name: 'Ribcage Heart', kind: 'rib', value: 1, sprite: 'rib' },
  moldy: { name: 'Moldy Heart', kind: 'moldy', value: 1, sprite: 'moldy' },
  // Fading heart: dropped by enemies for Brick, Crumbled. Vanishes after a few seconds.
  fading: { name: 'Fading Heart', kind: 'heart', value: 1, sprite: 'heartHalf', fades: 4 },
  // Pocket things and trinkets: what they are is rolled when they spawn (pickup.cons / pickup.trinket),
  // see src/game/consumables.js. Batteries charge your active item.
  trinket: { name: 'Trinket', kind: 'trinket', value: 1 },
  pill: { name: 'Pill', kind: 'pill', value: 1 },
  card: { name: 'Card', kind: 'card', value: 1 },
  rune: { name: 'Rune', kind: 'rune', value: 1 },
  stone: { name: 'Character Stone', kind: 'stone', value: 1 },
  battery: { name: 'Little Battery', kind: 'battery', value: 2 },
  batteryFull: { name: 'Full Battery', kind: 'battery', value: 99 },
};

export const HEART_KINDS = new Set(['heart', 'ash', 'soot', 'vigil', 'brass', 'rib', 'moldy']);

// chance: probability that anything drops at all (luck adds luckBonus per point)
// count:  [min, max] pickups when it does drop
export const DROP_TABLES = {
  roomClear: {
    chance: 0.45, luckBonus: 0.04, count: [1, 1],
    entries: [
      { type: 'coin', weight: 30 }, { type: 'silver', weight: 3 },
      { type: 'bomb', weight: 13 }, { type: 'bomb2', weight: 2 },
      { type: 'key', weight: 12 },
      { type: 'heartHalf', weight: 9 }, { type: 'heart', weight: 9 },
      { type: 'ash', weight: 3 }, { type: 'ashHalf', weight: 2 },
      { type: 'soot', weight: 1 }, { type: 'vigil', weight: 0.6 },
      { type: 'brass', weight: 0.6 }, { type: 'rib', weight: 0.6 }, { type: 'moldy', weight: 1.2 },
      // pocket things, trinkets, batteries and chests (chest:any rolls the kind, src/data/chests.js)
      { type: 'card', weight: 3 }, { type: 'pill', weight: 3 }, { type: 'rune', weight: 0.5 }, { type: 'stone', weight: 0.15 },
      { type: 'trinket', weight: 1.5 }, { type: 'battery', weight: 1.2 }, { type: 'batteryFull', weight: 0.15 },
      { type: 'chest:any', weight: 4 },
    ],
  },
  jar: {
    chance: 0.3, luckBonus: 0.02, count: [1, 1],
    entries: [
      { type: 'coin', weight: 6 }, { type: 'heartHalf', weight: 2 },
      { type: 'bomb', weight: 1 }, { type: 'key', weight: 1 }, { type: 'moldy', weight: 0.3 }, { type: 'pill', weight: 0.3 },
    ],
  },
  markedRock: {
    chance: 1, count: [2, 3],
    entries: [
      { type: 'ash', weight: 3 }, { type: 'bomb', weight: 3 }, { type: 'key', weight: 3 },
      { type: 'silver', weight: 1 }, { type: 'heart', weight: 2 }, { type: 'coin', weight: 3 },
      { type: 'soot', weight: 1 }, { type: 'brass', weight: 0.5 }, { type: 'rib', weight: 0.5 },
      { type: 'trinket', weight: 0.6 }, { type: 'rune', weight: 0.6 },
    ],
  },
};

// Pickups the shop can stock, with prices in coins.
export const SHOP_PICKUPS = [
  { type: 'heart', price: 3, weight: 3 },
  { type: 'bomb', price: 5, weight: 3 },
  { type: 'key', price: 5, weight: 3 },
  { type: 'ash', price: 5, weight: 2 },
  { type: 'bomb2', price: 8, weight: 1 },
  { type: 'brass', price: 7, weight: 0.5 },
  { type: 'rib', price: 6, weight: 0.5 },
  // pocket things, trinkets and batteries
  { type: 'card', price: 5, weight: 1.2 },
  { type: 'pill', price: 4, weight: 1.2 },
  { type: 'rune', price: 8, weight: 0.3 },
  { type: 'battery', price: 6, weight: 0.6 },
  { type: 'trinket', price: 8, weight: 0.4 },
];

// If this many rooms are cleared without a single key appearing, the next drop is a key
// (so the shop is always reachable).
export const KEY_PITY_ROOMS = 3;

// Damage a Soot Heart deals to everything in the room when it is lost.
export const SOOT_BLAST_DAMAGE = 30;
// Coins a cracked Brass Heart scatters.
export const BRASS_COINS = 3;
