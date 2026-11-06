// Machines and beggars: what they cost, what they pay out and how often. Their art and behavior
// live in src/game/machines.js. Odds are close to Isaac's: most plays give nothing, a few give a
// pickup, very few give an item. Luck moves the odds: every point of luck adds `luck` to an
// outcome's weight (negative on the bad outcomes, so they shrink).
//
//   name       shown in the banner when it pays out big
//   pay        what one use costs: { coins: n } | { keys: n } | { bombs: n } | { hearts: halves }
//   table      outcomes: { give, weight, luck, ... } (see GIVE in src/game/machines.js):
//                nothing                  just the sound of the reels
//                pickup   type, n         that pickup (n: count or [min, max])
//                random   n               random pickups
//                item     pool            an item from that pool (beggars leave after)
//                enemy    type, n         something nasty
//                gnats    n               gnats that fight for you
//                chest    type            a chest pops out (src/data/chests.js)
//                charge   n               charges your active item n notches
//                fortune                  a fortune, and nothing else
//   breakChance  chance that a use breaks it for good (it pays out a last time)
//   blast      what it drops when bombed
//   leaves     a beggar: after paying out an item it waves and goes
//   guarantee  a beggar: after this many donations the next one always pays out its item
export const MACHINES = {
  // ---------------------------------------------------------------- machines
  slot: {
    name: 'THE GRINNING REELS', pay: { coins: 1 }, breakChance: 0.02,
    table: [
      { give: 'nothing', weight: 58, luck: -3 },
      { give: 'pickup', type: 'coin', n: 2, weight: 13, luck: 1 },
      { give: 'pickup', type: 'coin', n: [3, 5], weight: 3, luck: 0.5 },
      { give: 'pickup', type: 'bomb', weight: 6, luck: 0.5 },
      { give: 'pickup', type: 'key', weight: 5, luck: 0.5 },
      { give: 'pickup', type: 'heartHalf', weight: 5, luck: 0.3 },
      { give: 'pickup', type: 'heart', weight: 2, luck: 0.3 },
      { give: 'pickup', type: 'pill', weight: 3, luck: 0.3 },
      { give: 'enemy', type: 'pestfly', n: 2, weight: 5, luck: -0.5 },
      { give: 'item', pool: 'shop', weight: 1.2, luck: 0.2 },
    ],
    blast: { coins: [2, 4] },
  },
  fortune: {
    name: 'THE MURMURING BOOTH', pay: { coins: 1 }, breakChance: 0.02,
    table: [
      { give: 'fortune', weight: 64, luck: -3 },
      { give: 'pickup', type: 'ashHalf', weight: 9, luck: 0.6 },
      { give: 'pickup', type: 'ash', weight: 4, luck: 0.4 },
      { give: 'random', n: 1, weight: 12, luck: 0.6 },
      { give: 'pickup', type: 'card', weight: 6, luck: 0.4 },
      { give: 'pickup', type: 'trinket', weight: 2, luck: 0.3 },
      { give: 'pickup', type: 'rune', weight: 1, luck: 0.2 },
      { give: 'pickup', type: 'vigil', weight: 2, luck: 0.2 },
      { give: 'item', pool: 'library', weight: 1.5, luck: 0.2 },
    ],
    blast: { coins: [1, 3] },
  },
  blood: {
    name: 'THE DRAWING CHAIR', pay: { hearts: 1 }, breakChance: 0.04,
    table: [
      { give: 'pickup', type: 'coin', n: 1, weight: 50, luck: -2 },
      { give: 'pickup', type: 'coin', n: 2, weight: 35, luck: 1 },
      { give: 'pickup', type: 'coin', n: 3, weight: 10, luck: 1 },
      { give: 'pickup', type: 'heartHalf', weight: 3, luck: 0.2 },
      { give: 'item', pool: 'devil', weight: 0.8, luck: 0.1 },
    ],
    blast: { coins: [2, 4], pickup: 'heart' },
  },
  shell: {
    name: 'THE THIMBLERIGGER', pay: { coins: 1 }, breakChance: 0,
    // the shells: one prize under three; luck makes you guess right more often
    table: [
      { give: 'nothing', weight: 64, luck: -3 },
      { give: 'pickup', type: 'coin', n: 3, weight: 10, luck: 1 },
      { give: 'pickup', type: 'bomb', n: 2, weight: 7, luck: 0.5 },
      { give: 'pickup', type: 'key', n: 2, weight: 7, luck: 0.5 },
      { give: 'pickup', type: 'heart', n: 2, weight: 6, luck: 0.5 },
      { give: 'item', pool: 'shop', weight: 1, luck: 0.2 },
    ],
    leaves: true,
    blast: { coins: [1, 2] },
  },
  crane: {
    name: 'THE GRASPING CLAW', pay: { coins: 5 }, breakChance: 0,
    // the item in the glass is rolled when the room fills; winning it shuts the machine down
    table: [
      { give: 'nothing', weight: 70, luck: -3 },
      { give: 'random', n: 2, weight: 18, luck: 0.5 },
      { give: 'prize', weight: 12, luck: 1.5 },
    ],
    prizePool: 'crane',
    blast: { coins: [3, 6] },
  },
  confessional: {
    name: 'THE PENITENT BOX', pay: { hearts: 1 }, breakChance: 0.03,
    table: [
      { give: 'nothing', weight: 50, luck: -3 },
      { give: 'pickup', type: 'vigil', weight: 22, luck: 1 },
      { give: 'pickup', type: 'ash', weight: 16, luck: 0.5 },
      { give: 'item', pool: 'angel', weight: 3, luck: 0.3 },
    ],
    blast: { coins: [0, 1] },
  },
  restock: {
    name: 'THE RESTOCKER', pay: { coins: 3 }, breakChance: 0.08,
    table: [{ give: 'restock', weight: 1 }],
    blast: { coins: [1, 2] },
  },

  // ---------------------------------------------------------------- beggars
  beggar: {
    name: 'THE TIN-CUP WRETCH', beggar: true, pay: { coins: 1 },
    table: [
      { give: 'nothing', weight: 68, luck: -3 },
      { give: 'random', n: 1, weight: 26, luck: 1.5 },
      { give: 'item', pool: 'beggar', weight: 5, luck: 0.4 },
    ],
    leaves: true, guarantee: 14,
  },
  keybeggar: {
    name: 'THE LOCKSMITH', beggar: true, pay: { keys: 1 },
    table: [
      { give: 'nothing', weight: 45, luck: -3 },
      { give: 'chest', type: 'wood', weight: 30, luck: 1 },
      { give: 'chest', type: 'gold', weight: 14, luck: 1 },
      { give: 'chest', type: 'eternal', weight: 1.5, luck: 0.3 },
      { give: 'item', pool: 'keyBeggar', weight: 7, luck: 0.5 },
    ],
    leaves: true, guarantee: 7,
  },
  bombbeggar: {
    name: 'THE SOOTLING', beggar: true, pay: { bombs: 1 },
    table: [
      { give: 'nothing', weight: 50, luck: -3 },
      { give: 'pickup', type: 'coin', n: [2, 4], weight: 22, luck: 1 },
      { give: 'pickup', type: 'bomb2', weight: 12, luck: 0.5 },
      { give: 'pickup', type: 'soot', weight: 6, luck: 0.4 },
      { give: 'item', pool: 'bombBeggar', weight: 6, luck: 0.5 },
    ],
    leaves: true, guarantee: 8,
  },
  devilbeggar: {
    name: 'THE SUPPLICANT', beggar: true, pay: { hearts: 1 },
    table: [
      { give: 'nothing', weight: 46, luck: -3 },
      { give: 'pickup', type: 'soot', weight: 16, luck: 0.6 },
      { give: 'pickup', type: 'coin', n: [2, 3], weight: 22, luck: 1 },
      { give: 'item', pool: 'demonBeggar', weight: 8, luck: 0.6 },
    ],
    leaves: true, guarantee: 6,
  },
  // takes coins, hands out batteries: it charges your active item, or tops it right up
  batterybeggar: {
    name: 'THE SPARK-EATER', beggar: true, pay: { coins: 1 },
    table: [
      { give: 'nothing', weight: 55, luck: -3 },
      { give: 'charge', n: 1, weight: 18, luck: 0.8 },
      { give: 'pickup', type: 'battery', weight: 15, luck: 0.8 },
      { give: 'pickup', type: 'batteryFull', weight: 3, luck: 0.3 },
      { give: 'item', pool: 'batteryBeggar', weight: 5, luck: 0.4 },
    ],
    leaves: true, guarantee: 10,
  },
  rotbeggar: {
    name: 'THE ROTTING WRETCH', beggar: true, pay: { coins: 1 },
    table: [
      { give: 'nothing', weight: 46, luck: -3 },
      { give: 'gnats', n: [1, 3], weight: 30, luck: 1 },
      { give: 'pickup', type: 'moldy', weight: 10, luck: 0.6 },
      { give: 'pickup', type: 'rib', weight: 6, luck: 0.4 },
      { give: 'item', pool: 'rottenBeggar', weight: 4, luck: 0.4 },
    ],
    leaves: true, guarantee: 12,
  },
};

// The parlor's machines (4 'M' spots): a mix, never all the same.
export const ARCADE_MACHINES = ['slot', 'slot', 'fortune', 'blood', 'shell', 'crane', 'confessional', 'beggar'];
// Beggars and machines that turn up on their own in a plain room (once a floor at most).
export const WANDERERS = [
  { id: 'beggar', weight: 4 }, { id: 'keybeggar', weight: 2 }, { id: 'bombbeggar', weight: 2 },
  { id: 'devilbeggar', weight: 1.5, minFloor: 2 }, { id: 'rotbeggar', weight: 1.5 }, { id: 'batterybeggar', weight: 1.5 },
  { id: 'slot', weight: 2 }, { id: 'blood', weight: 1.5 }, { id: 'fortune', weight: 1.5 }, { id: 'confessional', weight: 1, minFloor: 3 },
];
export const WANDERER_CHANCE = 0.5;   // chance per floor

// Fortunes for the booth.
export const FORTUNES = [
  'THE WAX REMEMBERS.', 'SOMETHING IS COUNTING YOUR STEPS.', 'DO NOT TRUST THE THIRD DOOR.',
  'YOUR FLAME WILL OUTLAST THEM ALL.', 'A KEY LIES WHERE THE RATS SLEEP.', 'SHE IS STILL ABOVE YOU.',
  'THE DARK IS PATIENT.', 'YOU WILL BURN BRIGHT, ONCE.', 'THE HEART BELOW IS STILL BEATING.',
  'LUCK IS A CANDLE IN A DRAFT.', 'COUNT YOUR HEARTS. THEN COUNT AGAIN.', 'THE BEGGAR KNOWS MORE THAN HE SAYS.',
];
