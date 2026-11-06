// Achievements and what they unlock. This is the single place that decides what is locked.
//
// Any content (item, character, trinket, card, pill, challenge, mode) listed in an achievement's
// `unlocks` is LOCKED until that achievement is earned, and never appears in runs before then.
// Content not listed here is available from the start (all original 51 items are).
//
//   id       unique id (saved in progress, never rename)
//   name     shown in the unlock popup
//   how      how to earn it (shown in DESIGN.md and menus)
//   when     { stat, gte }: earned when progress stat `stat` (dot path) reaches `gte`
//            stats live in src/engine/storage.js freshProgress()
//   unlocks  [{ type, id }]
import { CHARACTERS } from './characters.js';
import { ITEMS } from './items.js';

const CHARACTER_NAMES = Object.fromEntries(Object.entries(CHARACTERS).map(([id, c]) => [id, c.name]));

export const ACHIEVEMENTS = [
  {
    id: 'firstLight', name: 'FIRST LIGHT', how: 'Defeat any boss.',
    when: { stat: 'bossKillsTotal', gte: 1 },
    unlocks: [{ type: 'item', id: 'bandage' }],
  },
  {
    id: 'deeper', name: 'DEEPER', how: 'Reach The Caves (chapter 2).',
    when: { stat: 'maxChapter', gte: 2 },
    unlocks: [{ type: 'item', id: 'coldcoffee' }],
  },
  {
    id: 'hiddenThings', name: 'HIDDEN THINGS', how: 'Find 3 secret rooms.',
    when: { stat: 'secretsFound', gte: 3 },
    unlocks: [{ type: 'item', id: 'nitrowax' }],
  },
  {
    id: 'customer', name: 'REGULAR CUSTOMER', how: 'Buy 5 things in shops.',
    when: { stat: 'shopBuys', gte: 5 },
    unlocks: [{ type: 'item', id: 'pennyjar' }],
  },
  {
    id: 'snuffedOut', name: 'SNUFFED OUT', how: 'Die 5 times.',
    when: { stat: 'deaths', gte: 5 },
    unlocks: [{ type: 'item', id: 'livecoal' }],
  },
  {
    id: 'packRat', name: 'PACK RAT', how: 'Pick up 20 different items.',
    when: { stat: 'itemsCollected', gte: 20 },
    unlocks: [{ type: 'item', id: 'fourleaf' }],
  },
  {
    id: 'escape', name: 'ESCAPE THE CELLAR', how: 'Defeat The Snuffer.',
    when: { stat: 'bossKills.snuffer', gte: 1 },
    unlocks: [{ type: 'item', id: 'sacredwick' }],
  },

  // ---------------------------------------------------------------- characters
  // Wick is the only character unlocked from the start.
  { id: 'luckyDraw', name: 'LUCK OF THE DRAW', how: 'Use active items 15 times.', when: { stat: 'activeUses', gte: 15 }, unlocks: [{ type: 'character', id: 'pip' }] },
  { id: 'heavyHitter', name: 'HEAVY HITTER', how: 'Defeat 5 bosses.', when: { stat: 'bossKillsTotal', gte: 5 }, unlocks: [{ type: 'character', id: 'brick' }] },
  { id: 'evensong', name: 'EVENSONG', how: 'Reach chapter 3.', when: { stat: 'maxChapter', gte: 3 }, unlocks: [{ type: 'character', id: 'vesper' }] },
  { id: 'intoFurnace', name: 'INTO THE FURNACE', how: 'Reach chapter 4.', when: { stat: 'maxChapter', gte: 4 }, unlocks: [{ type: 'character', id: 'cinder' }] },
  { id: 'bigSpender', name: 'BIG SPENDER', how: 'Buy 15 things in shops.', when: { stat: 'shopBuys', gte: 15 }, unlocks: [{ type: 'character', id: 'pilfer' }] },
  { id: 'untouched', name: 'UNTOUCHED', how: 'Finish a floor without taking damage.', when: { stat: 'noHitFloors', gte: 1 }, unlocks: [{ type: 'character', id: 'wisp' }] },
  { id: 'relit', name: 'RELIT AGAIN', how: 'Die 10 times.', when: { stat: 'deaths', gte: 10 }, unlocks: [{ type: 'character', id: 'morrow' }] },
  { id: 'encore', name: 'ENCORE', how: 'Escape the cellar twice.', when: { stat: 'wins', gte: 2 }, unlocks: [{ type: 'character', id: 'nib' }] },
  { id: 'massacre', name: 'WAX MASSACRE', how: 'Snuff out 500 enemies.', when: { stat: 'enemiesKilled', gte: 500 }, unlocks: [{ type: 'character', id: 'prism' }] },
  { id: 'patchwork', name: 'PATCHWORK', how: 'Escape with 3 different characters.', when: { stat: 'charactersWon', gte: 3 }, unlocks: [{ type: 'character', id: 'motley' }] },
  { id: 'gravedigger', name: 'GRAVEDIGGER', how: 'Break 10 marked rocks.', when: { stat: 'markedRocks', gte: 10 }, unlocks: [{ type: 'character', id: 'sexton' }] },
  { id: 'stillMelting', name: 'STILL MELTING', how: 'Start 15 runs.', when: { stat: 'runs', gte: 15 }, unlocks: [{ type: 'character', id: 'spill' }] },
  { id: 'firedClay', name: 'FIRED CLAY', how: 'Defeat The Old Boiler.', when: { stat: 'bossKills.boiler', gte: 1 }, unlocks: [{ type: 'character', id: 'kiln' }] },
  { id: 'mothsBell', name: "THE MOTH'S BELL", how: 'Defeat the Moth Queen.', when: { stat: 'bossKills.moth', gte: 1 }, unlocks: [{ type: 'character', id: 'echo' }] },
  { id: 'lightKeeper', name: 'LIGHT KEEPER', how: 'Pick up 40 different items.', when: { stat: 'itemsCollected', gte: 40 }, unlocks: [{ type: 'character', id: 'beacon' }] },

  // ---------------------------------------------------------------- floor variants
  { id: 'intoTheFire', name: 'INTO THE FIRE', how: 'Defeat 2 bosses.', when: { stat: 'bossKillsTotal', gte: 2 }, unlocks: [{ type: 'variant', id: 'smolder' }] },
  { id: 'deeperStill', name: 'DEEPER STILL', how: 'Reach chapter 3.', when: { stat: 'maxChapter', gte: 3 }, unlocks: [{ type: 'variant', id: 'sunken' }] },
  { id: 'blackWater', name: 'BLACK WATER', how: 'Defeat 10 bosses.', when: { stat: 'bossKillsTotal', gte: 10 }, unlocks: [{ type: 'variant', id: 'mire' }] },
  { id: 'procession', name: 'THE PROCESSION', how: 'Defeat The Chandler.', when: { stat: 'bossKills.chandler', gte: 1 }, unlocks: [{ type: 'room', id: 'bossrush' }] },
  { id: 'oldWounds', name: 'OLD WOUNDS', how: 'Beat the heart.', when: { stat: 'bossKills.tallowheart', gte: 1 }, unlocks: [{ type: 'variant', id: 'scarred' }] },

  // ---------------------------------------------------------------- pocket things (part 5)
  { id: 'pillPopper', name: 'PILL POPPER', how: 'Take 10 pills.', when: { stat: 'pillsUsed', gte: 10 }, unlocks: [{ type: 'pill', id: 'sporecloud' }, { type: 'pill', id: 'heavyheart' }] },
  { id: 'badMedicine', name: 'BAD MEDICINE', how: 'Take 25 pills.', when: { stat: 'pillsUsed', gte: 25 }, unlocks: [{ type: 'pill', id: 'hotpocket' }] },
  { id: 'treasureHunter', name: 'TREASURE HUNTER', how: 'Open 15 chests.', when: { stat: 'chestsOpened', gte: 15 }, unlocks: [{ type: 'pill', id: 'loosechange' }, { type: 'trinket', id: 'wickstub' }] },
  { id: 'cardSharp', name: 'CARD SHARP', how: 'Use 10 cards.', when: { stat: 'cardsUsed', gte: 10 }, unlocks: [{ type: 'card', id: 'blank' }] },
  { id: 'runeReader', name: 'RUNE READER', how: 'Use 5 runes.', when: { stat: 'runesUsed', gte: 5 }, unlocks: [{ type: 'rune', id: 'hollow' }] },
  { id: 'collector', name: 'TRINKET COLLECTOR', how: 'Pick up 20 trinkets.', when: { stat: 'trinketsFound', gte: 20 }, unlocks: [{ type: 'item', id: 'meltingpot' }] },
];

// ---------------------------------------------------------------- items (part 6)
// Every Part 6 item names one of these in its `unlock` field (src/data/items.js); the item is added
// to that achievement's unlocks below. Several items can share one achievement.
const ITEM_ACHIEVEMENTS = [
  { id: 'kills100', name: 'CANDLE SNUFFER', how: 'Snuff out 100 enemies.', when: { stat: 'enemiesKilled', gte: 100 } },
  { id: 'kills250', name: 'WAX WORKS', how: 'Snuff out 250 enemies.', when: { stat: 'enemiesKilled', gte: 250 } },
  { id: 'kills1000', name: 'TALLOW TIDE', how: 'Snuff out 1000 enemies.', when: { stat: 'enemiesKilled', gte: 1000 } },
  { id: 'kills2500', name: 'A THOUSAND WICKS', how: 'Snuff out 2500 enemies.', when: { stat: 'enemiesKilled', gte: 2500 } },
  { id: 'boss3', name: 'BOSS HUNTER', how: 'Defeat 3 bosses.', when: { stat: 'bossKillsTotal', gte: 3 } },
  { id: 'boss8', name: 'BIG GAME', how: 'Defeat 8 bosses.', when: { stat: 'bossKillsTotal', gte: 8 } },
  { id: 'boss15', name: 'TROPHY ROOM', how: 'Defeat 15 bosses.', when: { stat: 'bossKillsTotal', gte: 15 } },
  { id: 'boss25', name: 'TALLOW KING', how: 'Defeat 25 bosses.', when: { stat: 'bossKillsTotal', gte: 25 } },
  { id: 'secrets6', name: 'CELLAR CARTOGRAPHER', how: 'Find 6 secret rooms.', when: { stat: 'secretsFound', gte: 6 } },
  { id: 'secrets12', name: 'WALL KNOCKER', how: 'Find 12 secret rooms.', when: { stat: 'secretsFound', gte: 12 } },
  { id: 'shop30', name: 'GOOD FOR BUSINESS', how: 'Buy 30 things in shops.', when: { stat: 'shopBuys', gte: 30 } },
  { id: 'items60', name: 'HOARDER', how: 'Pick up 60 different items.', when: { stat: 'itemsCollected', gte: 60 } },
  { id: 'items100', name: 'CURATOR', how: 'Pick up 100 different items.', when: { stat: 'itemsCollected', gte: 100 } },
  { id: 'items150', name: 'MUSEUM OF WAX', how: 'Pick up 150 different items.', when: { stat: 'itemsCollected', gte: 150 } },
  { id: 'actives40', name: 'BUTTON MASHER', how: 'Use active items 40 times.', when: { stat: 'activeUses', gte: 40 } },
  { id: 'actives100', name: 'WELL USED', how: 'Use active items 100 times.', when: { stat: 'activeUses', gte: 100 } },
  { id: 'runs30', name: 'ALWAYS RELIT', how: 'Start 30 runs.', when: { stat: 'runs', gte: 30 } },
  { id: 'deaths20', name: 'DRIP, DRIP', how: 'Die 20 times.', when: { stat: 'deaths', gte: 20 } },
  { id: 'wins3', name: 'THIRD TIME LUCKY', how: 'Escape the cellar 3 times.', when: { stat: 'wins', gte: 3 } },
  { id: 'wins6', name: 'OLD FLAME', how: 'Escape the cellar 6 times.', when: { stat: 'wins', gte: 6 } },
  { id: 'noHit3', name: 'DODGER', how: 'Finish 3 floors without taking damage.', when: { stat: 'noHitFloors', gte: 3 } },
  { id: 'noHit8', name: 'UNTOUCHABLE', how: 'Finish 8 floors without taking damage.', when: { stat: 'noHitFloors', gte: 8 } },
  { id: 'devil3', name: 'BAD COMPANY', how: 'Take 3 items from The Bargain.', when: { stat: 'dealsDevil', gte: 3 } },
  { id: 'devil10', name: 'THE LONG CONTRACT', how: 'Take 10 items from The Bargain.', when: { stat: 'dealsDevil', gte: 10 } },
  { id: 'angel3', name: 'GOOD COMPANY', how: 'Take 3 items from The Vigil.', when: { stat: 'dealsAngel', gte: 3 } },
  { id: 'angel10', name: 'THE CHOIR', how: 'Take 10 items from The Vigil.', when: { stat: 'dealsAngel', gte: 10 } },
  { id: 'transform1', name: 'NEW SHAPE', how: 'Transform for the first time.', when: { stat: 'transformations', gte: 1 } },
  { id: 'transform5', name: 'SHAPESHIFTER', how: 'Transform 5 times.', when: { stat: 'transformations', gte: 5 } },
  { id: 'chests30', name: 'LOCKPICK', how: 'Open 30 chests.', when: { stat: 'chestsOpened', gte: 30 } },
  { id: 'cards25', name: 'FULL DECK', how: 'Use 25 cards.', when: { stat: 'cardsUsed', gte: 25 } },
  { id: 'pills40', name: 'IRON STOMACH', how: 'Take 40 pills.', when: { stat: 'pillsUsed', gte: 40 } },
];
// escaping with a character unlocks something that suits them
for (const id of ['wick', 'pip', 'brick', 'vesper', 'cinder', 'pilfer', 'wisp', 'morrow', 'nib', 'prism', 'motley', 'sexton', 'spill', 'kiln', 'echo', 'beacon']) {
  ITEM_ACHIEVEMENTS.push({ id: `win_${id}`, name: `${CHARACTER_NAMES[id]} ESCAPES`, how: `Escape the cellar as ${CHARACTER_NAMES[id]}.`, when: { stat: `chars.${id}.wins`, gte: 1 } });
}
for (const a of ITEM_ACHIEVEMENTS) ACHIEVEMENTS.push({ ...a, unlocks: [] });
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
for (const [id, d] of Object.entries(ITEMS)) {
  if (!d.unlock) continue;
  if (!ACH_BY_ID[d.unlock]) throw new Error(`item ${id}: unknown unlock ${d.unlock}`);
  ACH_BY_ID[d.unlock].unlocks.push({ type: 'item', id });
}

// Twisted characters: found through a secret with each character. The secret arrives in part 7;
// until then the placeholder is reaching chapter 3 with that character.
const TWISTED = [
  ['wick', 'HOLLOWED OUT'], ['pip', 'RIGGED'], ['brick', 'CRUMBLING'], ['vesper', 'THE UNSUNG VERSE'],
  ['cinder', 'SMOTHERED'], ['pilfer', 'PAWN SHOP'], ['wisp', 'FADING'], ['morrow', 'DAWN AND DUSK'],
  ['nib', 'THE SHADOW OF NUB'], ['prism', 'SPLINTERED'], ['motley', 'UNSTITCHED'], ['sexton', 'UNEARTHED'],
  ['spill', 'FLOODED'], ['kiln', 'CRACKED'], ['echo', 'ASTRAY'], ['beacon', 'DIMMED'],
];
for (const [id, name] of TWISTED) {
  ACHIEVEMENTS.push({
    id: `twisted_${id}`, name, placeholder: true,
    how: `Reach chapter 3 as ${CHARACTER_NAMES[id]}.`,
    when: { stat: `chars.${id}.maxChapter`, gte: 3 },
    unlocks: [{ type: 'character', id: `${id}_t` }],
  });
}

// type:id -> achievement id that unlocks it
export const LOCKED_BY = {};
for (const a of ACHIEVEMENTS) for (const u of a.unlocks) LOCKED_BY[`${u.type}:${u.id}`] = a.id;
