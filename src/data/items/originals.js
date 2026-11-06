// Part 6 additions for the original items: collection text (lore), tags, and the new pools
// (beggars, chests, the crane, the curse room, greed mode). Merged into ITEMS in src/data/items.js.
export const EXTRAS = {
  cyclopsjar: {
    lore: 'A pickled eye the size of a fist. Your shots come out huge, slow and furious: double damage, much less fire rate.',
    tags: ['bloated'], pools: { treasure: 1, secret: 1, greedTreasure: 0.5, crane: 0.3 },
  },
  searingstrand: {
    lore: 'A coil of wire that never cools. Hold to charge, let go: a thick beam runs to the wall and burns everything in it. Another beam item makes the beam twice as wide and stronger.',
    tags: ['horned'], pools: { treasure: 0.6, devil: 1, redChest: 0.4, demonBeggar: 0.3, greedDevil: 1 },
  },
  lodestone: {
    lore: 'A tooth that points north, and at whatever you hate. Your shots turn toward the nearest enemy.',
    tags: ['stargazer'], pools: { treasure: 1, planetarium: 1, crane: 0.5, greedTreasure: 1 },
  },
  forkedtongue: {
    lore: 'Split down the middle and still talking. Three shots per volley, a bit slower.',
    tags: ['spiderkin'], pools: { treasure: 1, crane: 0.6, greedTreasure: 1 },
  },
  rubbermolar: {
    lore: 'Somebody chewed this for years. Your shots bounce off walls and rocks twice.',
    tags: ['ossuary'], pools: { treasure: 1, beggar: 0.4, greedTreasure: 1 },
  },
  eggsac: {
    lore: 'Keep it warm and it keeps giving. Every shot bursts into four little shots where it lands.',
    tags: ['spiderkin'], pools: { treasure: 1, rottenBeggar: 0.8, greedTreasure: 1 },
  },
  coffinnail: {
    lore: 'Pulled from a lid that did not want to stay shut. Shots go through enemies.',
    tags: ['ossuary'], pools: { treasure: 1, boss: 0.5, keyBeggar: 0.5, greedTreasure: 1 },
  },
  mildewjar: {
    lore: 'Scraped off the cellar walls. A chance to poison with every shot.',
    tags: ['moldering', 'bloated'], pools: { treasure: 1, rottenBeggar: 1, greedTreasure: 1 },
  },
  frostfinger: {
    lore: 'Lost to the cold, found by you. A chance to freeze enemies solid.',
    pools: { treasure: 1, crane: 0.5, greedTreasure: 1 },
  },
  scarebutton: {
    lore: 'A button off a coat that stood in a field too long. A chance to send enemies running.',
    tags: ['spectre'], pools: { treasure: 1, curse: 0.5, greedTreasure: 1 },
  },
  loveletter: {
    lore: 'Never sent. Never opened. A chance to charm enemies into fighting for you.',
    tags: ['seraph'], pools: { treasure: 1, angel: 0.5, goldenChest: 0.5, greedTreasure: 1 },
  },
  livecoal: {
    lore: 'Still glowing from a fire that went out ages ago. A little more damage and a chance to set things alight.',
    tags: ['bonfire'], pools: { treasure: 1, devil: 0.5, bombBeggar: 0.6, greedTreasure: 1 },
  },
  fourleaf: {
    lore: 'Bent into a hook and somehow luckier for it. +1 luck and a chance at critical hits.',
    tags: ['ninelives'], pools: { treasure: 1, secret: 0.8, goldenChest: 1, beggar: 0.5, greedTreasure: 1 },
  },
  wanderingtooth: {
    lore: 'A tooth that would not stay in any mouth. It circles you, blocks shots and bites.',
    tags: ['ossuary'], pools: { treasure: 1, crane: 0.8, greedTreasure: 1 },
  },
  palemoths: {
    lore: 'They found your flame and decided to stay. Two moths orbit you and block shots.',
    tags: ['spectre', 'mothkin'], pools: { treasure: 1, angel: 0.6, crane: 0.5, greedTreasure: 1 },
  },
  stubbuddy: {
    lore: 'Made from the end of you. A little candle follows you and shoots where you shoot.',
    tags: ['brood'], pools: { treasure: 1, crane: 1, greedTreasure: 1 },
  },
  hungryrat: {
    lore: 'You fed it once. Now it chases and bites anything that moves.',
    tags: ['ninelives'], pools: { treasure: 1, boss: 0.5, rottenBeggar: 0.6, greedTreasure: 1 },
  },
  nitrowax: {
    lore: 'Wax mixed with something that should not be in wax. Big damage, slower shots, and every shot explodes (never hurting you).',
    tags: ['bonfire'], pools: { treasure: 0.6, devil: 1, secret: 0.6, bombBeggar: 1, greedDevil: 1 },
  },
  copperwick: {
    lore: 'A wick of pure copper. It hums. A chance for lightning to jump from what you hit to two more enemies.',
    tags: ['livewire'], pools: { treasure: 1, planetarium: 1, batteryBeggar: 1, greedTreasure: 1 },
  },
  echobell: {
    lore: 'Ring it once, hear it twice. Every attack happens again a moment later, a bit weaker.',
    tags: ['scholar'], pools: { treasure: 1, planetarium: 1, greedTreasure: 1 },
  },
  meltingpot: {
    lore: 'A tiny cauldron. Drop your trinket in and its effect becomes part of you forever.',
    pools: { treasure: 0.6, shop: 1, beggar: 0.4, greedShop: 1 },
  },
  sandtimer: {
    lore: 'The sand runs slower for everyone but you. Slows every enemy for six seconds.',
    tags: ['scholar'], pools: { treasure: 1, library: 1, greedTreasure: 1 },
  },
  frostbook: {
    lore: 'Its pages are rimed with ice. Freezes every enemy in the room for a moment.',
    tags: ['scholar'], pools: { library: 1, treasure: 0.6, greedTreasure: 0.6 },
  },
  matchbook: {
    lore: 'Every match is a grudge. Strike one for a burst of extra damage.',
    tags: ['bonfire', 'horned'], pools: { treasure: 1, devil: 0.6, curse: 0.6, greedTreasure: 1 },
  },
  stormjar: {
    lore: 'A thunderstorm in a pickle jar. Lightning strikes every enemy in the room.',
    tags: ['livewire'], pools: { treasure: 0.5, library: 1, angel: 1, batteryBeggar: 0.6, greedAngel: 1 },
  },
  squeakyboots: {
    lore: 'Two sizes too big and very loud. A little more speed.',
    pools: { shop: 1, beggar: 0.8, greedShop: 1 },
  },
  coldcoffee: {
    lore: 'Bitter, stale and somehow it still works. More fire rate.',
    tags: ['wired'], pools: { shop: 1, boss: 1, beggar: 0.6, greedShop: 1, greedBoss: 1 },
  },
  blueprints: {
    lore: 'Smudged plans of the cellar. Shows every room on the map.',
    pools: { treasure: 0.8, shop: 1, keyBeggar: 0.6, greedShop: 1 },
  },
  gravecompass: {
    lore: 'Its needle spins toward trouble. Shows every special room on the map.',
    pools: { treasure: 0.8, shop: 1, keyBeggar: 0.6, greedShop: 1 },
  },
  molenotes: {
    lore: 'Scribbled by the shopkeeper years ago. Shows the secret rooms on the map.',
    pools: { shop: 1, secret: 1, keyBeggar: 0.6, greedShop: 1 },
  },
  belljar: {
    lore: 'A glass dome you can hide under. A few seconds where nothing can touch you.',
    tags: ['seraph'], pools: { shop: 1, angel: 1, greedShop: 1 },
  },
  pennyjar: {
    lore: 'Rattles every time something dies. +1 luck and enemies sometimes drop coins.',
    pools: { shop: 1, beggar: 1, goldenChest: 0.5, greedShop: 1 },
  },
  rabbitfoot: {
    lore: 'The rabbit was not lucky. You might be: +2 luck.',
    tags: ['ninelives'], pools: { shop: 1, secret: 1, beggar: 0.8, goldenChest: 0.8, greedShop: 1 },
  },
  rustyshovel: {
    lore: 'Still caked with old dirt. Dig up a couple of pickups wherever you stand.',
    pools: { shop: 1, beggar: 0.4, greedShop: 1 },
  },
  scaldingdrip: {
    lore: 'Wax that came out far too hot. +1 damage.',
    tags: ['bonfire'], pools: { boss: 1, goldenChest: 0.4, greedBoss: 1 },
  },
  mysterymeat: {
    lore: 'Do not ask. +1 heart container and a little healing.',
    tags: ['moldering'], pools: { boss: 1, shop: 0.6, rottenBeggar: 1, greedBoss: 1 },
  },
  bandage: {
    lore: 'Soaked through, but it holds. +1 heart container, heals three hearts, a little speed.',
    pools: { boss: 1, greedBoss: 1 },
  },
  mothwings: {
    lore: 'Dusty wings that still beat. Fly over pits and spikes, and your shots pass over rocks.',
    tags: ['seraph', 'mothkin'], pools: { secret: 1, angel: 1, greedAngel: 1 },
  },
  hollowcrown: {
    lore: 'Nobody wears it for long. x1.5 damage and shots go through enemies.',
    tags: ['horned'], pools: { devil: 1, secret: 0.5, redChest: 0.5, greedDevil: 1 },
  },
  sacredwick: {
    lore: 'A wick lit from a holier flame. x1.6 damage and homing shots, a little slower.',
    tags: ['seraph'], pools: { angel: 1, treasure: 0.2, greedAngel: 1 },
  },
  crimsonkey: {
    lore: 'Opens red rooms that hide behind the walls of the cellar.',
    pools: { secret: 0.7, treasure: 0.25, redChest: 0.6, keyBeggar: 0.8, greedSecret: 0.7 },
  },
  loadeddie: { lore: 'Weighted on every side. Rerolls every item in the room.' },
  hymnal: { lore: 'Burnt at the edges. One verse hurts everything in the room and gives half an ash heart.' },
  blackhymnal: { lore: 'The verses are written in soot. Pay half a heart for three wisps that block shots.' },
  pact: { lore: 'Signed in red wax. Fiend form for a while: more damage, burning shots and flight.' },
  shadowdash: { lore: 'Turn into smoke for a heartbeat and dash through enemies, hurting them.' },
  paleveil: { lore: 'A veil so thin it is almost not there. Blocks the next hit.' },
  sparecandle: { lore: 'Plant a little candle that shoots for you for the rest of the room.' },
  tallowstub: { lore: 'A short candle with a short fuse. Plant it and it shoots for a few seconds.' },
  keyhalf1: { lore: 'Rusted through. The other half is somewhere bright.' },
  keyhalf2: { lore: 'Gilded and cold. The other half is somewhere dark.' },
};
