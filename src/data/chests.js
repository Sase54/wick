// Chests. Each type: how it opens, how it looks (src/data/packArt.js), and what can be inside.
//
//   needs     null (touch it) | 'key' | 'bomb' (only a blast opens it)
//   hurts     touching it costs half a heart (it still opens)
//   reclose   chance it shuts again after opening, ready for another key
//   art       [closed, open] pack sprite names
//   contents  weighted outcomes; one is picked each time it opens. An outcome gives any of:
//     pickups [min, max]   ordinary pickups (coins, hearts, bombs, keys... see randomPickup)
//     cons    n            pills / cards / runes / stones; consKind picks just one kind
//     trinket n            trinkets
//     item    pool         an item on a pedestal from that pool
//     soot    n            Soot Hearts            litBombs n    lit bombs pop out (run!)
//     enemies [type, n]    something was living in there
//     deal    true         a door to a deal room (the red chest's jackpot)
//   Luck: +1 pickup every 3 luck, and outcomes with an item get likelier (CHEST_LUCK per point).
export const CHESTS = {
  // the plain chest: a few pickups, now and then a pocket thing or a trinket
  wood: {
    name: 'Wooden Chest', needs: null, art: ['chestWood', 'chestWoodOpen'],
    contents: [
      { weight: 64, pickups: [1, 3] },
      { weight: 18, pickups: [1, 2], cons: 1 },
      { weight: 10, pickups: [0, 1], trinket: 1 },
      { weight: 8, pickups: [2, 4] },
    ],
  },
  // needs a key; richer, and sometimes a treasure item
  gold: {
    name: 'Golden Chest', needs: 'key', art: ['chestGold', 'chestGoldOpen'],
    contents: [
      { weight: 42, pickups: [2, 5] },
      { weight: 20, pickups: [1, 3], cons: 1 },
      { weight: 12, pickups: [1, 2], trinket: 1 },
      { weight: 26, item: 'goldenChest' },
    ],
  },
  // red and warm to the touch: devil things, and things that bite
  red: {
    name: 'Red Chest', needs: null, art: ['chestRed', 'chestRedOpen'],
    contents: [
      { weight: 22, soot: 2 },
      { weight: 18, cons: 2, consKind: 'pill' },
      { weight: 10, trinket: 1 },
      { weight: 12, item: 'redChest' },
      { weight: 4, deal: true },
      { weight: 16, litBombs: 3 },
      { weight: 18, enemies: ['crawlspider', 3] },
    ],
  },
  // sealed shut: only a bomb opens it. Old stone keeps runes and stones.
  stone: {
    name: 'Stone Chest', needs: 'bomb', art: ['chestStone', 'chestStoneOpen'],
    contents: [
      { weight: 40, pickups: [3, 5] },
      { weight: 25, pickups: [1, 2], cons: 1, consKind: 'rune' },
      { weight: 10, pickups: [1, 2], cons: 1, consKind: 'stone' },
      { weight: 15, trinket: 1, pickups: [1, 2] },
      { weight: 10, item: 'secret' },
    ],
  },
  // covered in nails: it bites when you open it, then pays like a golden one
  spiked: {
    name: 'Spiked Chest', needs: null, hurts: true, art: ['chestSpiked', 'chestSpikedOpen'],
    contents: [
      { weight: 48, pickups: [2, 5] },
      { weight: 20, pickups: [1, 3], cons: 1 },
      { weight: 14, trinket: 1, pickups: [1, 2] },
      { weight: 18, item: 'treasure' },
    ],
  },
  // pale and cold; needs a key, may close again to be opened once more. Angel things inside.
  eternal: {
    name: 'Eternal Chest', needs: 'key', reclose: 0.5, art: ['chestEternal', 'chestEternalOpen'],
    contents: [
      { weight: 45, pickups: [2, 4] },
      { weight: 20, pickups: [1, 2], cons: 1, consKind: 'card' },
      { weight: 35, item: 'angel' },
    ],
  },
  // the big one: needs a key, and it's worth it
  mega: {
    name: 'Mega Chest', needs: 'key', art: ['chestMega', 'chestMegaOpen'],
    contents: [
      { weight: 55, pickups: [7, 11], cons: 2, trinket: 1 },
      { weight: 45, item: 'goldenChest', item2: 'goldenChest', pickups: [2, 4] },
    ],
  },
};

// how often each kind shows up when a room-clear drop (or THE GRAVE card) rolls "a chest"
export const CHEST_ROLL = [
  { type: 'wood', weight: 50 }, { type: 'gold', weight: 22 }, { type: 'red', weight: 8 }, { type: 'stone', weight: 7 },
  { type: 'spiked', weight: 8 }, { type: 'eternal', weight: 3 }, { type: 'mega', weight: 1 },
];
export const CHEST_LUCK = 0.08;
