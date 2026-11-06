// Transformations: hold 3 different items with the same tag (src/data/items/*.js `tags`; the active
// and pocket items count too) and Wick transforms for the rest of the run: a new look and a
// strong bonus. Once gained, a transformation is never lost, even if the items are.
//   tag     the item tag that counts toward it
//   bonus   applied like an item, every time stats are worked out: stats, shot, flying, fx,
//           mechanics, followers, look { costume, flame, bodyTint }
//   once    given a single time when it happens: hearts { containers, ash, soot, bone }, gives
export const TRANSFORM_NEED = 3;

export const TRANSFORMATIONS = {
  hornbearer: {
    tag: 'horned', name: 'HORNBEARER', desc: 'Flight, more damage and two Soot Hearts',
    bonus: { flying: true, stats: { damage: 1 }, look: { costume: 'tfHorns', bodyTint: '#a02018' } },
    once: { hearts: { soot: 4 } },
  },
  seraphic: {
    tag: 'seraph', name: 'SERAPHIC', desc: 'Flight and three Ash Hearts',
    bonus: { flying: true, stats: { luck: 1 }, look: { costume: 'tfSeraph', flame: 'white' } },
    once: { hearts: { ash: 6 } },
  },
  sporeling: {
    tag: 'moldering', name: 'SPORELING', desc: 'A heart container and poison shots',
    bonus: { shot: { poison: 0.2 }, stats: { damage: 0.5 }, look: { costume: 'tfSpores', bodyTint: '#7ab03a' } },
    once: { hearts: { containers: 1, heal: 2 } },
  },
  broodparent: {
    tag: 'brood', name: 'BROODPARENT', desc: 'Two little heads shoot diagonally beside you',
    bonus: {
      stats: { fireRateMul: 0.9 },
      followers: [-1, 1].map((s) => ({ kind: 'helper', move: 'hover', attack: 'aim', damage: 3.5, fireRate: 2, shot: { offset: s * 0.6 }, art: 'broodhead' })),
      look: { costume: 'tfBrood' },
    },
  },
  bookworm: {
    tag: 'scholar', name: 'BOOKWORM', desc: 'One more shot per volley',
    bonus: { shot: { multishot: 1 }, stats: { fireRate: 0.2 }, look: { costume: 'tfBookworm' } },
  },
  jitters: {
    tag: 'wired', name: 'THE JITTERS', desc: 'Much more damage and speed',
    bonus: { stats: { damage: 2, speed: 0.15, shotSpeed: 0.2 }, look: { costume: 'tfJitters' } },
    once: { spawn: ['pill', 'pill'] },
  },
  pyromaniac: {
    tag: 'bonfire', name: 'PYROMANIAC', desc: 'Burning shots, huge bombs and five of them',
    bonus: { shot: { burn: 0.3 }, bombs: { radiusMul: 1.3, damageMul: 1.6 }, look: { costume: 'tfPyro', flame: 'ember' } },
    once: { gives: { bombs: 5 } },
  },
  wraith: {
    tag: 'spectre', name: 'WRAITH', desc: 'Flight and ghost shots that pass through everything',
    bonus: { flying: true, shot: { spectral: true, pierce: true, style: 'ghost' }, look: { costume: 'tfWraith', bodyTint: '#8a96a4' } },
  },
  bonewalker: {
    tag: 'ossuary', name: 'BONEWALKER', desc: 'Two Ribcage Hearts and bone-hard shots',
    bonus: { shot: { pierce: true, knockbackMul: 1.5, style: 'bone' }, stats: { damage: 0.5 }, look: { costume: 'tfSkull' } },
    once: { hearts: { bone: 2 } },
  },
  feline: {
    tag: 'ninelives', name: 'FELINE', desc: 'Flight, and your hits hatch gnats',
    bonus: { flying: true, mechanics: { gnatHit: { chance: 0.2 } }, look: { costume: ['tfFeline', 'tfFelineEars'] } },
  },
  glutton: {
    tag: 'bloated', name: 'GLUTTON', desc: 'Huge shots, more damage, a heart container',
    bonus: { shot: { sizeMul: 1.4, slow: 0.15 }, stats: { damage: 1, speed: -0.1 }, look: { costume: 'tfGlutton' } },
    once: { hearts: { containers: 1, heal: 2 } },
  },
  starborn: {
    tag: 'stargazer', name: 'STARBORN', desc: 'Homing shots and more luck',
    bonus: { shot: { homing: true, style: 'blue' }, stats: { luck: 2 }, look: { costume: 'tfStars', flame: 'blue' } },
  },
  livewire: {
    tag: 'livewire', name: 'LIVEWIRE', desc: 'Lightning jumps from your shots',
    bonus: { shot: { chain: 0.3, style: 'spark' }, stats: { fireRate: 0.3 }, look: { costume: 'tfSparks' } },
  },
  spiderkin: {
    tag: 'spiderkin', name: 'SPIDERKIN', desc: 'Sticky shots and spiderlings from every room',
    bonus: { shot: { slow: 0.2, multishot: 1 }, fx: { tClearGnats: { chance: 1, n: 2, kind: 'spider' } }, look: { costume: 'tfSpider' } },
  },
  mothlord: {
    tag: 'mothkin', name: 'LORD OF MOTHS', desc: 'Flight, and gnats hatch from every room',
    bonus: { flying: true, fx: { tClearGnats: { chance: 1, n: 3 } }, look: { costume: 'tfMoth' } },
  },
};

// the little heads of the Broodparent (not items)
export const ICONS = {
  broodhead: [
    '..kkkk..',
    '.kwwwWk.',
    'kwkwwkWk',
    'kwwwwwWk',
    'kwwrrwWk',
    '.kWWWWk.',
    '..kkkk..',
  ],
};

// each transformation's own look (x/y relative to the 18x16 body, see src/data/sprites.js)
export const COSTUMES = {
  // big curled black horns
  tfHorns: { rows: ['zz..............zz', 'zrz............zrz', 'zrrz..........zrrz', '.zrrz........zrrz.', '..zrz........zrz..', '...z..........z...'], colors: { z: '#1a1418', r: '#7a1010' }, x: 0, y: -5, facings: ['down', 'side', 'up'] },
  // white wings and a gold halo
  tfSeraph: { rows: ['......YYYYYY......', 'S....Y......Y....S', 'SS....YYYYYY....SS', 'SSS............SSS', 'SSSS..........SSSS', '.SSS..........SSS.'], colors: { S: '#f8f4e8', Y: '#d8b048' }, x: 0, y: -7, facings: ['down', 'side', 'up'], behind: true },
  // spotted mushroom cap covering the head, spores around
  tfSpores: { rows: ['v...rrrrrr...v', '..rrSrrrrSrr..', '.rrrrrrSrrrrr.', 'rSrrrrrrrrrrSr', 'kkkkkkkkkkkkkk'], colors: { r: '#c0262c', S: '#f8f4e8', k: '#160f0c', v: '#9ccf6a' }, x: 2, y: -5, facings: ['down', 'side', 'up'] },
  // two little heads growing from the shoulders
  tfBrood: { rows: ['.kkkkk..................kkkkk.', 'kwwwwwk................kwwwwwk', 'kwkwkwk................kwkwkwk', 'kwwwwwk................kwwwwwk', 'kwrrrwk................kwrrrwk', '.kkkkk..................kkkkk.'], colors: { w: '#e8d9b0', k: '#160f0c', r: '#a02018' }, x: -6, y: 3, facings: ['down', 'up'] },
  // a bookworm: thick glasses and a worm in the hair
  tfBookworm: { rows: ['.....PPP..', '....P.....', 'kkkk..kkkk', 'kcck..kcck', 'kkkkkkkkkk'], colors: { k: '#160f0c', c: '#c8e8f8', P: '#e090b0' }, x: 4, y: 2, facings: ['down'] },
  // big bulging eyes
  tfJitters: { rows: ['.kkkk..kkkk.', 'kWWWWkkWWWWk', 'kWWkWkkWkWWk', 'kWWWWkkWWWWk', '.kkkk..kkkk.', '.vvvv..vvvv.'], colors: { k: '#160f0c', W: '#f8f4e8', v: '#6a4a6a' }, x: 3, y: 4, facings: ['down'] },
  // singed, smoking hair
  tfPyro: { rows: ['n.f.n.f.n', '.n.n.n.n.', 'nnnnnnnnn'], colors: { n: '#2a2420', f: '#f08a24' }, x: 4, y: -2, facings: ['down', 'side', 'up'] },
  // a wispy ghost tail instead of feet
  tfWraith: { rows: ['GGGGGGGGGG', '.GGGGGGGG.', '..GG..GG..', '...G...G..'], colors: { G: '#c4cad4' }, x: 4, y: 14, facings: ['down', 'side', 'up'] },
  // skull face paint
  tfSkull: { rows: ['zz.....zz', 'zz.....zz', '...z.z...', '.S.S.S.S.'], colors: { z: '#1a1418', S: '#f8f4e8' }, x: 4, y: 6, facings: ['down'] },
  // whiskers (the tall cat ears are tfFelineEars, seen from every side)
  tfFeline: { rows: ['zzzz................zzzz', '........................', '.zzz................zzz.'], colors: { z: '#3a3030' }, x: -3, y: 9, facings: ['down'] },
  tfFelineEars: { rows: ['G..............G', 'GG............GG', 'GpG..........GpG', 'GppG........GppG', 'GGGGG......GGGGG'], colors: { G: '#6a6560', p: '#e090b0' }, x: 1, y: -5, facings: ['down', 'side', 'up'] },
  // puffed-out cheeks
  tfGlutton: { rows: ['.kkk................kkk.', 'kwww................wwwk', 'kwpp................ppwk', 'kwpp................ppwk', 'kwww................wwwk', '.kkk................kkk.'], colors: { k: '#160f0c', w: '#f4ead0', p: '#e8907a' }, x: -3, y: 6, facings: ['down'] },
  // little stars circling the head
  tfStars: { rows: ['.l....................', 'lYl...................', '.l....................', '....................l.', '...................lYl', '....................l.', '......................', '.l....................', 'lYl...................', '.l....................', '....................l.', '...................lYl', '....................l.'], colors: { Y: '#fff6c0', l: '#d8b048' }, x: -2, y: -6, facings: ['down', 'side', 'up'] },
  // lightning bolts crackling at both sides
  tfSparks: { rows: ['..c..................c..', '.cc..................cc.', 'cc....................cc', '.ccc................ccc.', '..cc................cc..', '.cc..................cc.', '.c....................c.'], colors: { c: '#e8f048' }, x: -3, y: 0, facings: ['down', 'side', 'up'] },
  // eight red eyes and spindly legs
  tfSpider: { rows: ['r.r.r.r', '.r.r.r.', '.......', '.......', '.......', '.......', 'k.....k', '.k...k.', 'k.....k'], colors: { r: '#ff3a2a', k: '#160f0c' }, x: 6, y: 3, facings: ['down'] },
  // dusty moth wings and feathery antennae
  tfMoth: { rows: ['..........a......a..........', '...........a....a...........', '............a..a............', '.WWW....................WWW.', 'WWWWW..................WWWWW', 'WddWWW................WWWddW', 'WdkkdWW..............WWdkkdW', 'WdkkdWWW............WWWdkkdW', 'WddddWW..............WWddddW', '.WWdWW................WWdWW.', '..WWW..................WWW..', '...W....................W...'], colors: { W: '#c9b48a', d: '#9a8462', k: '#3a2e22', a: '#5a4a38' }, x: -5, y: -3, facings: ['down', 'side', 'up'], behind: true },
};
