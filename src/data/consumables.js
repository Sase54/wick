// Pocket things you use once: pills, cards, runes and character stones. You carry up to
// POCKET_SIZE of them (next to a character's own pocket item); Q / PKT uses the chosen one,
// F / SWAP picks the next. What each effect does is in src/game/consumables.js (`fx` names).
//
// Every one of them: { name, desc, fx, ...params }.  `fx` names an effect in CONSUMABLE_FX; many
// just call an active item's effect ("active:<effect>" with the same params as items).

export const POCKET_SIZE = 2;

// ---------------------------------------------------------------------------- PILLS
// Each run gives PILL_COLORS.length of the pill effects a color, at random from the seed. A pill's
// effect is unknown ("???") until you take one of that color; then that color is known for the run.
// A big pill (BIG_PILL_CHANCE) does everything twice as hard. Some pills only appear
// once their achievement is earned (src/data/unlocks.js).
//   good: true / false / null (neutral)
export const PILLS = {
  // good
  fullpint: { name: 'FULL PINT', desc: 'Heals all your blood hearts.', good: true, fx: 'heal', amount: 24 },
  ashdraught: { name: 'ASH DRAUGHT', desc: '+1 Ash Heart.', good: true, fx: 'hearts', type: 'ash' },
  meanstreak: { name: 'MEAN STREAK', desc: 'Damage up.', good: true, fx: 'stat', stat: 'damage', amount: 0.4 },
  quickwick: { name: 'QUICK WICK', desc: 'Fire rate up.', good: true, fx: 'stat', stat: 'fireRate', amount: 0.35 },
  rundown: { name: 'RUN DOWN', desc: 'Speed up.', good: true, fx: 'stat', stat: 'speed', amount: 0.12 },
  longsight: { name: 'LONG SIGHT', desc: 'Range up.', good: true, fx: 'stat', stat: 'range', amount: 1.5 },
  clovertea: { name: 'CLOVER TEA', desc: 'Luck up.', good: true, fx: 'stat', stat: 'luck', amount: 1 },
  slingshot: { name: 'SLING SHOT', desc: 'Shot speed up.', good: true, fx: 'stat', stat: 'shotSpeed', amount: 0.2 },
  fullcharge: { name: 'FULL CHARGE', desc: 'Your active item is charged.', good: true, fx: 'charge' },
  ironskin: { name: 'IRON SKIN', desc: 'Nothing can hurt you for a moment.', good: true, fx: 'active:shield', time: 5 },
  clearsight: { name: 'CLEAR SIGHT', desc: 'The whole floor, mapped.', good: true, fx: 'map' },
  buzzbuzz: { name: 'BUZZ BUZZ', desc: 'Gnats come to help.', good: true, fx: 'gnats', n: 4 },
  sporecloud: { name: 'SPORE CLOUD', desc: 'You breathe out poison.', good: true, fx: 'poisonCloud', damage: 6 },
  heavyheart: { name: 'HEAVY HEART', desc: '+1 heart container.', good: true, fx: 'containers', amount: 1 },
  // bad
  limpwick: { name: 'LIMP WICK', desc: 'Damage down.', good: false, fx: 'stat', stat: 'damage', amount: -0.25 },
  dragfoot: { name: 'DRAG FOOT', desc: 'Speed down.', good: false, fx: 'stat', stat: 'speed', amount: -0.1 },
  shortfuse: { name: 'SHORT FUSE', desc: 'Range down.', good: false, fx: 'stat', stat: 'range', amount: -1 },
  butterfingers: { name: 'BUTTERFINGERS', desc: 'Fire rate down.', good: false, fx: 'stat', stat: 'fireRate', amount: -0.25 },
  blackcat: { name: 'BLACK CAT', desc: 'Luck down.', good: false, fx: 'stat', stat: 'luck', amount: -1 },
  bitterpill: { name: 'BITTER PILL', desc: 'Ouch.', good: false, fx: 'hurt', amount: 1 },
  wrongway: { name: 'WRONG WAY', desc: 'Up is down. Left is right.', good: false, fx: 'confuse', time: 6 },
  leadboots: { name: 'LEAD BOOTS', desc: 'Your feet feel heavy.', good: false, fx: 'heavy', time: 8 },
  lightsout: { name: 'LIGHTS OUT', desc: 'Who blew out the candles?', good: false, fx: 'dark', time: 12 },
  forgetful: { name: 'FORGETFUL', desc: 'Where was I?', good: false, fx: 'amnesia' },
  // neutral
  wanderlust: { name: 'WANDERLUST', desc: 'You wake up somewhere else.', good: null, fx: 'teleport' },
  swapsies: { name: 'SWAPSIES', desc: 'Bombs become keys. Keys become bombs.', good: null, fx: 'swapBombsKeys' },
  loosechange: { name: 'LOOSE CHANGE', desc: 'Everything here turns to coins.', good: null, fx: 'turnInto', type: 'coin' },
  hotpocket: { name: 'HOT POCKETS', desc: 'Three lit bombs fall out. Run.', good: null, fx: 'dropBombs', n: 3 },
  sugarpill: { name: 'SUGAR PILL', desc: 'Nothing happens. Or does it?', good: null, fx: 'nothing' },
};

// Two halves per pill: [left, right]; a run uses all of them.
export const PILL_COLORS = [
  ['#e8e4d8', '#e8e4d8'], ['#e8e4d8', '#3a6ad0'], ['#c0262c', '#e8e4d8'], ['#1a1614', '#f0c040'],
  ['#5a8a34', '#e8e4d8'], ['#7a4a9a', '#7a4a9a'], ['#f08a24', '#f08a24'], ['#3a6ad0', '#3a6ad0'],
  ['#c0262c', '#1a1614'], ['#e090b0', '#e8e4d8'], ['#8a8580', '#f0c040'], ['#5a8a34', '#7a4a9a'], ['#f0c040', '#c0262c'],
];
export const BIG_PILL_CHANCE = 0.06;

// ---------------------------------------------------------------------------- CARDS
// kind: 'tarot' (a picture card) or 'playing' (a suit and a number). art: what's on the face.
export const CARDS = {
  // the tarot, our own arcana
  candlemaker: { name: 'THE CANDLEMAKER', desc: 'Back to where it all started.', kind: 'tarot', art: 'candle', fx: 'goTo', room: 'start' },
  moth: { name: 'THE MOTH', desc: 'Flies to the brightest room.', kind: 'tarot', art: 'moth', fx: 'goTo', room: 'treasure' },
  merchant: { name: 'THE MERCHANT', desc: 'Takes you shopping.', kind: 'tarot', art: 'coin', fx: 'goTo', room: 'shop' },
  crown: { name: 'THE CROWN', desc: 'An audience with the boss.', kind: 'tarot', art: 'crown', fx: 'goTo', room: 'boss' },
  lantern: { name: 'THE LANTERN', desc: 'Lights up the whole floor.', kind: 'tarot', art: 'lantern', fx: 'map' },
  sexton: { name: 'THE GRAVEDIGGER', desc: 'Every hidden door in the room opens.', kind: 'tarot', art: 'shovel', fx: 'openSecrets' },
  hangedwick: { name: 'THE HANGED WICK', desc: 'Damage up for this room.', kind: 'tarot', art: 'noose', fx: 'roomBuff', stat: 'damage', amount: 1.5 },
  drowned: { name: 'THE DROWNED', desc: 'Everything stops. Cold.', kind: 'tarot', art: 'drop', fx: 'active:freezeall', time: 4 },
  tower: { name: 'THE TOWER OF WAX', desc: 'It all comes down.', kind: 'tarot', art: 'tower', fx: 'blasts', n: 6 },
  twins: { name: 'THE TWO FLAMES', desc: 'A copy of you, for one room.', kind: 'tarot', art: 'twins', fx: 'active:twin' },
  pyre: { name: 'THE PYRE', desc: 'A ring of fire.', kind: 'tarot', art: 'flame', fx: 'active:firering', count: 18 },
  vigil: { name: 'THE VIGIL', desc: 'Watched over. Untouchable.', kind: 'tarot', art: 'wings', fx: 'active:shield', time: 8 },
  beggar: { name: 'THE BEGGAR', desc: 'A friend in need.', kind: 'tarot', art: 'cup', fx: 'spawnMachine', pick: ['beggar', 'keybeggar', 'bombbeggar', 'batterybeggar', 'rotbeggar'] },
  wheel: { name: 'THE WHEEL OF WAX', desc: 'Feeling lucky?', kind: 'tarot', art: 'wheel', fx: 'spawnMachine', pick: ['slot', 'fortune', 'shell'] },
  feast: { name: 'THE FEAST', desc: 'Eat up.', kind: 'tarot', art: 'heart', fx: 'heal', amount: 24, extra: 'heart' },
  grave: { name: 'THE GRAVE', desc: 'Something is buried here.', kind: 'tarot', art: 'grave', fx: 'chest' },
  devilsdue: { name: "THE DEVIL'S DUE", desc: 'Strength, for a price you already paid.', kind: 'tarot', art: 'horns', fx: 'roomBuff', stat: 'damage', amount: 2.5 },
  crimson: { name: 'THE CRIMSON DOOR', desc: 'A door that was never there.', kind: 'tarot', art: 'door', fx: 'active:redkey' },
  kiln: { name: 'THE KILN', desc: 'Melts your trinket into you. For good.', kind: 'tarot', art: 'kiln', fx: 'absorbTrinket' },
  // playing cards
  acecoins: { name: 'ACE OF COINS', desc: 'Everything here turns to coins.', kind: 'playing', suit: 'coin', rank: 'A', fx: 'turnInto', type: 'coin' },
  acekeys: { name: 'ACE OF KEYS', desc: 'Everything here turns to keys.', kind: 'playing', suit: 'key', rank: 'A', fx: 'turnInto', type: 'key' },
  acebombs: { name: 'ACE OF BOMBS', desc: 'Everything here turns to bombs.', kind: 'playing', suit: 'bomb', rank: 'A', fx: 'turnInto', type: 'bomb' },
  acehearts: { name: 'ACE OF HEARTS', desc: 'Everything here turns to hearts.', kind: 'playing', suit: 'heart', rank: 'A', fx: 'turnInto', type: 'heart' },
  twocoins: { name: 'TWO OF COINS', desc: 'Doubles your coins.', kind: 'playing', suit: 'coin', rank: '2', fx: 'double', type: 'coins' },
  twokeys: { name: 'TWO OF KEYS', desc: 'Doubles your keys.', kind: 'playing', suit: 'key', rank: '2', fx: 'double', type: 'keys' },
  twobombs: { name: 'TWO OF BOMBS', desc: 'Doubles your bombs.', kind: 'playing', suit: 'bomb', rank: '2', fx: 'double', type: 'bombs' },
  twohearts: { name: 'TWO OF HEARTS', desc: 'Doubles your blood.', kind: 'playing', suit: 'heart', rank: '2', fx: 'double', type: 'hearts' },
  queenash: { name: 'QUEEN OF ASH', desc: 'Three Ash Hearts.', kind: 'playing', suit: 'ash', rank: 'Q', fx: 'hearts', type: 'ash', n: 3 },
  kingcandles: { name: 'KING OF CANDLES', desc: 'A gift from the treasure room.', kind: 'playing', suit: 'candle', rank: 'K', fx: 'spawnItem', pool: 'treasure', weight: 0.3 },
  joker: { name: 'THE JESTER', desc: 'Someone wants to make a deal.', kind: 'playing', suit: 'jester', rank: 'J', fx: 'dealRoom' },
  blank: { name: 'BLANK CARD', desc: 'Could be anything.', kind: 'playing', suit: 'blank', rank: '?', fx: 'randomCard' },
};

// ---------------------------------------------------------------------------- RUNES
// Rarer and stronger than cards.
export const RUNES = {
  pyre: { name: 'RUNE OF THE PYRE', desc: 'Everything burns.', glyph: 'fire', fx: 'smite', damage: 40, burn: true },
  chains: { name: 'RUNE OF CHAINS', desc: 'Nothing moves.', glyph: 'chain', fx: 'active:freezeall', time: 7 },
  gate: { name: 'RUNE OF THE WAX GATE', desc: 'Every secret on the floor, open.', glyph: 'gate', fx: 'secrets' },
  change: { name: 'RUNE OF CHANGE', desc: 'Every item here becomes another.', glyph: 'change', fx: 'active:reroll' },
  plenty: { name: 'RUNE OF PLENTY', desc: 'Two of everything.', glyph: 'plenty', fx: 'duplicate' },
  deep: { name: 'RUNE OF THE DEEP', desc: 'Takes you somewhere you have not been.', glyph: 'deep', fx: 'goTo', room: 'unvisited' },
  hunger: { name: 'RUNE OF HUNGER', desc: 'Every rock and pot here breaks open.', glyph: 'hunger', fx: 'breakAll' },
  wall: { name: 'RUNE OF THE WALL', desc: 'Untouchable, for a long while.', glyph: 'wall', fx: 'active:shield', time: 12 },
  ash: { name: 'RUNE OF ASH', desc: 'Three Ash Hearts, and a Vigil Heart.', glyph: 'ash', fx: 'hearts', type: 'ash', n: 3, plus: 'vigil' },
  swarm: { name: 'RUNE OF THE SWARM', desc: 'A cloud of gnats.', glyph: 'swarm', fx: 'gnats', n: 8 },
  hollow: { name: 'HOLLOW RUNE', desc: 'Could be any of them.', glyph: 'hollow', fx: 'randomRune' },
};

// ---------------------------------------------------------------------------- CHARACTER STONES
// One per character (twisted ones share theirs): a little of that character's power.
export const STONES = {
  wick: { name: 'STONE OF WICK', desc: 'A flash of temper and a ring of fire.', fx: 'combo', steps: [['active:rage', { damage: 2, time: 8 }], ['active:firering', { count: 12 }]] },
  pip: { name: 'STONE OF PIP', desc: 'Every item here, rerolled.', fx: 'active:reroll' },
  brick: { name: 'STONE OF BRICK', desc: 'Hard as brick for a while.', fx: 'combo', steps: [['active:shield', { time: 6 }], ['active:gust', { damage: 10 }]] },
  vesper: { name: 'STONE OF VESPER', desc: 'One verse, and the room goes quiet.', fx: 'active:hymn', damage: 18, ash: 1 },
  cinder: { name: 'STONE OF CINDER', desc: 'The fiend, for a moment.', fx: 'active:fiend', damage: 2, time: 6 },
  pilfer: { name: 'STONE OF PILFER', desc: 'Pockets full of coins.', fx: 'spawn', type: 'coin', n: 7 },
  wisp: { name: 'STONE OF WISP', desc: 'Three wards.', fx: 'wards', n: 3 },
  morrow: { name: 'STONE OF MORROW', desc: 'Come back once, this floor.', fx: 'extraLife' },
  nib: { name: 'STONE OF NIB & NUB', desc: 'A twin for this room.', fx: 'active:twin' },
  prism: { name: 'STONE OF PRISM', desc: 'Light in four directions.', fx: 'crossBeam', damage: 25 },
  motley: { name: 'STONE OF MOTLEY', desc: 'Some other stone. Who knows.', fx: 'randomStone' },
  sexton: { name: 'STONE OF SEXTON', desc: 'Dig deep.', fx: 'active:dig', count: 4 },
  spill: { name: 'STONE OF SPILL', desc: 'Burning wax wherever you walk, this room.', fx: 'roomMech', mech: 'trail' },
  kiln: { name: 'STONE OF KILN', desc: 'The pot cracks. Everything burns.', fx: 'active:firering', count: 24 },
  echo: { name: 'STONE OF ECHO', desc: 'Everything twice, this room.', fx: 'roomMech', mech: 'echo', params: { delay: 0.2, mul: 0.8 } },
  beacon: { name: 'STONE OF BEACON', desc: 'Three little candles to guard you.', fx: 'sentries', n: 3 },
};

// What drops when "a consumable" drops (weights by kind).
export const CONSUMABLE_DROP = [
  { kind: 'card', weight: 5 }, { kind: 'pill', weight: 5 }, { kind: 'rune', weight: 1 }, { kind: 'stone', weight: 0.35 },
];
