// Trinkets: small charms you carry one at a time (picking up another drops the one you hold).
// They work like small items: stats / shot traits (as in src/data/items.js) and effects (`fx`:
// trinket effects in src/game/trinketfx.js, or character mechanics like `trail`). A trinket can
// turn up GOLDEN (from floor 2): every number in it is doubled (stats, chances, effect strength).
// The Melting Pot (item) and THE KILN (card) melt a trinket into you for good: it keeps working
// and frees the slot. Icons: src/game/consumables.js (drawn from `icon`).
//
//   name, desc     shown on pickup ("desc" is the funny line)
//   quality        0-4, same rules as items (DESIGN.md)
//   stats, shot    as items; chances (poison, crit...) grow with luck as for items
//   fx             { effect: params }, effects in src/game/trinketfx.js (and src/game/mechanics.js)
//   map, flying, dealChance   as items
//   icon           [shape, color]: how the icon is drawn
//   weight         how often it drops compared to others (default 1)
export const TRINKETS = {
  // ---------- small and simple
  chippedtooth: { name: 'Chipped Tooth', desc: 'Still bites.', quality: 1, stats: { damage: 0.3 }, icon: ['tooth', 'bone'] },
  bentpin: { name: 'Bent Pin', desc: 'Pokes faster than it should.', quality: 1, stats: { fireRate: 0.3 }, icon: ['pin', 'iron'] },
  wornsole: { name: 'Worn Sole', desc: 'Someone ran a long way in this.', quality: 1, stats: { speed: 0.15 }, icon: ['sole', 'wood'] },
  lenscap: { name: 'Cracked Lens', desc: 'Sees a little further. A little wrong.', quality: 1, stats: { range: 1.2 }, icon: ['lens', 'teal'] },
  loosethread: { name: 'Loose Thread', desc: 'Pull it. Go on.', quality: 1, stats: { shotSpeed: 0.2, range: 0.5 }, icon: ['thread', 'blood'] },
  wishbone: { name: 'Dry Wishbone', desc: 'You got the big half.', quality: 1, stats: { luck: 1 }, icon: ['wishbone', 'bone'] },
  greasyrag: { name: 'Greasy Rag', desc: 'Everything slides off you. Even shots.', quality: 1, stats: { speed: 0.1, shotSpeed: 0.15 }, icon: ['rag', 'rot'] },
  lumpoftallow: { name: 'Lump of Tallow', desc: 'Your shots got heavier.', quality: 1, shot: { sizeMul: 1.25, knockbackMul: 1.5 }, stats: { damage: 0.15 }, icon: ['lump', 'wax'] },
  // ---------- shot changers
  rustytack: { name: 'Rusty Tack', desc: 'Goes straight through. Hurts a bit less.', quality: 2, shot: { pierce: true }, stats: { damage: -0.2 }, icon: ['pin', 'wood'] },
  marble: { name: 'Glass Marble', desc: 'It rolls off walls. So do your shots.', quality: 2, shot: { bounce: 1 }, icon: ['orb', 'teal'] },
  moldyspore: { name: 'Moldy Spore', desc: 'Achoo.', quality: 1, shot: { poison: 0.1 }, icon: ['spore', 'rot'] },
  emberchip: { name: 'Ember Chip', desc: 'Still warm after all these years.', quality: 1, shot: { burn: 0.1 }, icon: ['lump', 'ember'] },
  icetooth: { name: 'Frozen Molar', desc: 'Brr.', quality: 1, shot: { slow: 0.15 }, icon: ['tooth', 'teal'] },
  oldcharm: { name: 'Lucky Horseshoe Nail', desc: 'Lucky for the horse? No.', quality: 2, shot: { crit: 0.06 }, stats: { luck: 0.5 }, icon: ['horseshoe', 'iron'] },
  copperpenny: { name: 'Bent Copper Penny', desc: 'Sparks when you flip it.', quality: 2, shot: { chain: 0.1 }, icon: ['coin', 'ember'] },
  owlfeather: { name: 'Owl Feather', desc: 'It knows where they hide.', quality: 2, shot: { homing: true }, stats: { fireRate: -0.3 }, icon: ['feather', 'wood'] },
  ghostthread: { name: 'Ghost Thread', desc: 'Sewn through the wall.', quality: 2, shot: { spectral: true }, icon: ['thread', 'pale'] },
  backtooth: { name: 'Wisdom Tooth', desc: 'Watches your back.', quality: 1, shot: { backShot: true }, stats: { damage: -0.1 }, icon: ['tooth', 'wax'] },
  eggshell: { name: 'Eggshell Shard', desc: 'Something crawled out of this.', quality: 2, shot: { split: 2 }, icon: ['shard', 'bone'] },
  pricklyburr: { name: 'Prickly Burr', desc: 'Sticks to them. Then they run.', quality: 1, shot: { fear: 0.08 }, icon: ['spore', 'wood'] },
  pinkribbon: { name: 'Pink Ribbon', desc: 'Tied in a bow. Tied to your heart.', quality: 1, shot: { charm: 0.06 }, icon: ['bow', 'flesh'] },
  frostbead: { name: 'Frost Bead', desc: 'Cold enough to stop a heart.', quality: 2, shot: { freeze: 0.06 }, icon: ['orb', 'pale'] },
  // ---------- when you get hurt
  thornring: { name: 'Thorn Ring', desc: 'Touch me and see.', quality: 2, fx: { tHurtBurst: { count: 8, damage: 5 } }, icon: ['ring', 'rot'] },
  coinpouch: { name: 'Torn Coin Pouch', desc: 'Every hit shakes something loose.', quality: 1, fx: { tHurtDrop: { type: 'coin', chance: 0.6 } }, icon: ['pouch', 'wood'] },
  angrycandle: { name: 'Angry Birthday Candle', desc: 'Make a wish. A mean one.', quality: 2, fx: { tHurtRage: { time: 4, damage: 1.2 } }, icon: ['candle', 'blood'] },
  leakybattery: { name: 'Leaky Battery', desc: 'Pain is a kind of power.', quality: 2, fx: { tHurtCharge: { amount: 1 } }, icon: ['battery', 'rot'] },
  brokenkey: { name: 'Broken Doorkey', desc: 'Sometimes a hit sends you somewhere else.', quality: 0, fx: { tHurtTeleport: { chance: 0.25 } }, icon: ['key', 'iron'] },
  hollowbone: { name: 'Hollow Bone', desc: 'Something rattles out when you break.', quality: 1, fx: { tHurtDrop: { type: 'ashHalf', chance: 0.12 } }, icon: ['bone', 'bone'] },
  // ---------- depending on your health
  lastember: { name: 'Last Ember', desc: 'Burns brightest when you are almost out.', quality: 2, fx: { tLowHealth: { damageMul: 1.3 } }, icon: ['flame', 'ember'] },
  fullcup: { name: 'Brimming Cup', desc: 'Never spill a drop.', quality: 2, fx: { tFullHealth: { damageMul: 1.15 } }, icon: ['cup', 'gold'] },
  // ---------- entering a room
  bellrope: { name: 'Frayed Bell Rope', desc: 'Ring it and they freeze.', quality: 2, fx: { tEnterFreeze: { chance: 0.25, time: 1.2 } }, icon: ['bell', 'gold'] },
  scarycloth: { name: 'Scarecrow Rag', desc: 'Hung in the doorway.', quality: 1, fx: { tEnterFear: { chance: 0.25, time: 2 } }, icon: ['rag', 'wood'] },
  candlehalo: { name: 'Wax Halo', desc: 'Sometimes it holds.', quality: 2, fx: { tEnterShield: { chance: 0.15, time: 2.5 } }, icon: ['ring', 'pale'] },
  wardstone: { name: 'Ward Pebble', desc: 'Keeps the first one off you. Sometimes.', quality: 2, fx: { tEnterWard: { chance: 0.25 } }, icon: ['pebble', 'pale'] },
  sprintcharm: { name: 'Hare Charm', desc: 'Run when it gets ugly.', quality: 1, fx: { tFightSpeed: { speed: 0.15 } }, icon: ['foot', 'bone'] },
  // ---------- clearing a room
  saucer: { name: 'Chipped Saucer', desc: 'Something always ends up in it.', quality: 1, fx: { tClearDrop: { type: 'coin', chance: 0.3 } }, icon: ['cup', 'pale'] },
  bloodvial: { name: 'Vial of Old Blood', desc: 'Drink up. It refills.', quality: 2, fx: { tClearDrop: { type: 'heartHalf', chance: 0.18 } }, icon: ['vial', 'blood'] },
  keyhole: { name: 'Keyhole Cut-Out', desc: 'Where there is a hole, there is a key.', quality: 1, fx: { tClearDrop: { type: 'key', chance: 0.12 } }, icon: ['keyhole', 'gold'] },
  fusebox: { name: 'Damp Fuse', desc: 'Still lights. Mostly.', quality: 1, fx: { tClearDrop: { type: 'bomb', chance: 0.12 } }, icon: ['fuse', 'iron'] },
  ashurn: { name: 'Tiny Ash Urn', desc: 'Grandma, is that you?', quality: 2, fx: { tClearDrop: { type: 'ashHalf', chance: 0.12 } }, icon: ['urn', 'pale'] },
  tarotcorner: { name: 'Torn Tarot Corner', desc: 'The rest of the card is out there.', quality: 1, fx: { tClearDrop: { type: 'card', chance: 0.1 } }, icon: ['card', 'soul'] },
  pillbox: { name: 'Rattling Pillbox', desc: 'Shake it. Take whatever falls out.', quality: 1, fx: { tClearDrop: { type: 'pill', chance: 0.1 } }, icon: ['box', 'teal'] },
  sparkplug: { name: 'Old Spark Plug', desc: 'Some rooms charge you twice.', quality: 2, fx: { tClearCharge: { chance: 0.3 } }, icon: ['battery', 'iron'] },
  stitchedheart: { name: 'Stitched Heart', desc: 'Heals a little every few rooms.', quality: 2, fx: { tClearHeal: { every: 4 } }, icon: ['heart', 'flesh'] },
  gnatnest: { name: 'Gnat Nest', desc: 'They follow you home.', quality: 1, fx: { tClearGnats: { chance: 0.35, n: 1 } }, icon: ['nest', 'rot'] },
  // ---------- killing things
  fangnecklace: { name: 'Fang Necklace', desc: 'Every kill feeds you, slowly.', quality: 2, fx: { tKillHeal: { every: 25 } }, icon: ['fang', 'bone'] },
  powderhorn: { name: 'Powder Horn', desc: 'Some of them pop.', quality: 2, fx: { tKillExplode: { chance: 0.12 } }, icon: ['horn', 'wood'] },
  warpaint: { name: 'Smear of War Paint', desc: 'Every kill makes you meaner. For this room.', quality: 2, fx: { tKillStack: { per: 0.04, cap: 0.4 } }, icon: ['smear', 'blood'] },
  pickedpocket: { name: 'Pickpocket Glove', desc: 'Lighter fingers.', quality: 1, fx: { pickpocket: { chance: 0.08 } }, icon: ['glove', 'ink'] },
  lootbag: { name: 'Bottomless Sack', desc: 'Sometimes they drop something worth having.', quality: 1, fx: { tKillDrop: { type: 'any', chance: 0.04 } }, icon: ['pouch', 'rot'] },
  // ---------- around you
  magnetstone: { name: 'Lodestone Chip', desc: 'Loose change comes to you.', quality: 1, fx: { tMagnet: { range: 70 } }, icon: ['pebble', 'iron'] },
  hotcoal: { name: 'Pocket Coal', desc: 'Too hot to stand next to.', quality: 2, fx: { tAura: { damage: 2, radius: 26 } }, icon: ['lump', 'ember'] },
  dripcan: { name: 'Dripping Wax Can', desc: 'Leaves a burning trail.', quality: 2, fx: { trail: {} }, icon: ['can', 'wax'] },
  echoshell: { name: 'Whispering Shell', desc: 'It repeats what you shoot.', quality: 3, fx: { echo: { delay: 0.3, mul: 0.4 } }, icon: ['shell', 'flesh'] },
  burstcap: { name: 'Crown Cork', desc: 'Every fifth volley pops off in all directions.', quality: 2, fx: { tShotBurst: { every: 5, count: 8 } }, icon: ['cork', 'gold'] },
  blackfeather: { name: 'Crow Quill', desc: 'Light as a feather.', quality: 3, flying: true, stats: { speed: -0.05 }, icon: ['feather', 'void'] },
  // ---------- maps and deals
  inkblot: { name: 'Ink-Blotted Map', desc: 'Most of it is still legible.', quality: 1, map: 'rooms', icon: ['map', 'bone'] },
  needlecompass: { name: 'Sewing-Needle Compass', desc: 'Points at the interesting doors.', quality: 1, map: 'icons', icon: ['compass', 'gold'] },
  goathorn: { name: 'Goat Horn Shard', desc: 'Something down here wants to talk.', quality: 1, dealChance: 0.15, icon: ['horn', 'void'] },
  // ---------- rare and strong
  heartstone: { name: 'Heart-Shaped Stone', desc: 'Heavy. Warm. Beating?', quality: 3, stats: { damage: 0.5, luck: 1 }, fx: { tFullHealth: { damageMul: 1.1 } }, icon: ['heart', 'stone'], weight: 0.5 },
  wickstub: { name: 'The First Wick', desc: 'Where it all started.', quality: 3, stats: { damage: 0.4, fireRate: 0.3, speed: 0.1, range: 0.5 }, icon: ['candle', 'wax'], weight: 0.4 },
};

// Chance a dropped trinket is golden (from floor 2 on).
export const GOLDEN_CHANCE = 0.06;
