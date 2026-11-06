// Sprites made from the free asset packs (credits and licenses: CREDITS.md). The source PNGs are
// copied into assets/sprites/ and turned into our look by src/engine/packart.js.
//
// An entry is one sprite, or `layers` of them drawn on top of each other:
//   src      file in assets/sprites/
//   crop     [x, y, w, h] part of the file to use        scale   resize (nearest pixel)
//   map      { group: RAMP }: repaint each color group (gray, red, orange, yellow, green, cyan,
//            blue, purple, or `other` for the rest) with a palette ramp, dark to light
//   dim      how much to darken groups left without a ramp (default 0.75)
//   gamma    < 1 brightens, > 1 darkens                 erase   [[x, y, w, h]] cut parts out
//   shadow   true keeps the pack's soft drop shadow      x, y    where a layer sits; flip mirrors it
//   w, h     size of the result (default: the first layer's)
//   paint    (ctx, w, h) => {}: our own pixels drawn over the result
//   fill     one flat color for every pixel (the 1-bit icons)
//   outline  outline color, or false for floor decals
// Animated sprites are entries named `name:0`, `name:1`... (see packFrames()).

// ---- palette ramps (dark -> light)
export const RAMP = {
  iron: ['#14110f', '#2a2622', '#46403a', '#6a625a', '#948a7e', '#c4baa8'],
  stone: ['#121014', '#24212a', '#3a3640', '#55505c', '#78727e', '#a29ca6'],
  bone: ['#2a2218', '#4a3e2e', '#6e604a', '#988a6c', '#c4b694', '#e8dcbc'],
  gold: ['#2a1a06', '#4e3410', '#7a5418', '#a87c24', '#d4a838', '#f6d870'],
  blood: ['#1a0405', '#3a080a', '#5e0f12', '#8a1a1c', '#b42a26', '#d84a3a'],
  wood: ['#1a0f08', '#2e1c10', '#462c18', '#624026', '#7e5634', '#9c7046'],
  flesh: ['#2a0c10', '#4a1a1e', '#6e2a2e', '#924644', '#b4665e', '#d08a7c'],
  wax: ['#3a3226', '#5c5240', '#80745a', '#a89a78', '#cfc19a', '#efe2bc'],
  soul: ['#120a1c', '#24143a', '#3c2260', '#5a368a', '#8058b8', '#b090e0'],
  ember: ['#2a0a02', '#5a1a04', '#8a3008', '#c45a10', '#f08a24', '#ffd25a'],
  pale: ['#3a3a48', '#5e5e70', '#8a8a9c', '#b4b4c4', '#d8d8e4', '#f4f4fc'],
  void: ['#050307', '#0c0810', '#16101c', '#221a2a', '#30263a', '#40344c'],
  teal: ['#06141a', '#0c2830', '#14424c', '#1e6470', '#3a8c94', '#7ac0c0'],
  rot: ['#0e1208', '#1c2410', '#2e3a18', '#465422', '#62702e', '#86904a'],
  ink: ['#0a0a14', '#141828', '#22283e', '#343c58', '#4a5474', '#6a7494'],
  tar: ['#0c080a', '#1c1418', '#2e2228', '#44343a', '#5e4a50', '#7a6268'],
};
const R = RAMP;

const dcss = (name, map, more = {}) => ({ src: `dcss/${name}.png`, map, ...more });

// nails sticking up out of the spiked chest's lid
function nails(ctx, w) {
  for (let x = 8; x < w - 7; x += 4) {
    ctx.fillStyle = '#0a0606'; ctx.fillRect(x - 1, 1, 3, 6);
    ctx.fillStyle = R.iron[5]; ctx.fillRect(x, 1, 1, 2);
    ctx.fillStyle = R.iron[3]; ctx.fillRect(x, 3, 1, 3);
  }
}

export const PACK_ART = {
  // ---- statues
  statueAngel: dcss('statue_angel', { gray: R.pale, other: R.pale }, { gamma: 0.8 }),
  statueDevil: dcss('statue_demonic_bust', { gray: R.tar, red: R.blood, other: R.tar }),
  statueImp: dcss('statue_imp', { gray: R.tar, red: R.blood, other: R.tar }),
  statueEvil: dcss('statue_ancient_evil', { gray: R.stone, other: R.stone }),
  statueWraith: dcss('statue_wraith', { gray: R.stone, other: R.stone }),
  statueGold: dcss('golden_statue_1', { yellow: R.gold, orange: R.gold, gray: R.iron, other: R.gold }),
  statueGold2: dcss('golden_statue_2', { yellow: R.gold, orange: R.gold, gray: R.iron, other: R.gold }),
  gargoyle: dcss('gargoyle', { gray: R.stone, red: R.blood, other: R.stone }),
  statueOrb: dcss('statue_orb', { gray: R.stone, other: R.soul }),

  // ---- altars
  altarStone: dcss('altar_base', { gray: R.stone, other: R.stone }),
  altarOld: dcss('altar_old', { gray: R.stone, other: R.wax }),
  altarHand: dcss('altar_zin', { gray: R.pale, other: R.pale }),
  altarCloth: dcss('misc_altar', { gray: R.bone, yellow: R.ember, orange: R.ember, red: R.blood, other: R.wax }),

  // ---- containers and treasure
  chestWood: dcss('chest_2_closed', { orange: R.wood, yellow: R.gold, red: R.wood, gray: R.iron, other: R.wood }),
  chestWoodOpen: dcss('chest_2_open', { orange: R.wood, yellow: R.gold, red: R.wood, gray: R.iron, other: R.wood }),
  chestGold: dcss('chest', { orange: R.wood, yellow: R.gold, red: R.wood, gray: R.iron, other: R.gold }),
  chestGoldOpen: dcss('chest_2_open', { orange: R.gold, yellow: R.gold, red: R.gold, gray: R.iron, other: R.gold }),
  // the Part 5 chests: the same two chests in other materials
  chestRed: dcss('chest_2_closed', { orange: R.blood, yellow: R.gold, red: R.blood, gray: R.tar, other: R.blood }),
  chestRedOpen: dcss('chest_2_open', { orange: R.blood, yellow: R.gold, red: R.blood, gray: R.tar, other: R.blood }),
  chestStone: dcss('chest_2_closed', { orange: R.stone, yellow: R.stone, red: R.stone, gray: R.stone, other: R.stone }, { gamma: 0.85 }),
  chestStoneOpen: dcss('chest_2_open', { orange: R.stone, yellow: R.stone, red: R.stone, gray: R.stone, other: R.stone }, { gamma: 0.85 }),
  chestSpiked: dcss('chest_2_closed', { orange: R.tar, yellow: R.iron, red: R.tar, gray: R.iron, other: R.tar }, { paint: nails }),
  chestSpikedOpen: dcss('chest_2_open', { orange: R.tar, yellow: R.iron, red: R.tar, gray: R.iron, other: R.tar }, { paint: nails }),
  chestEternal: dcss('chest_2_closed', { orange: R.pale, yellow: R.gold, red: R.pale, gray: R.pale, other: R.pale }, { gamma: 0.8 }),
  chestEternalOpen: dcss('chest_2_open', { orange: R.pale, yellow: R.gold, red: R.pale, gray: R.pale, other: R.pale }, { gamma: 0.8 }),
  chestMega: dcss('chest', { orange: R.void, yellow: R.gold, red: R.blood, gray: R.gold, other: R.gold }, { scale: 1.5 }),
  chestMegaOpen: dcss('chest_2_open', { orange: R.gold, yellow: R.gold, red: R.gold, gray: R.iron, other: R.gold }, { scale: 1.5 }),
  crate: dcss('large_box', { orange: R.wood, yellow: R.wood, gray: R.iron, other: R.wood }),
  sarcophagus: dcss('sarcophagus_sealed', { yellow: R.gold, orange: R.gold, gray: R.stone, other: R.gold }),
  goldSmall: dcss('gold_pile_3', { yellow: R.gold, orange: R.gold, other: R.gold }),
  goldPile: dcss('gold_pile_10', { yellow: R.gold, orange: R.gold, other: R.gold }),
  goldHeap: dcss('gold_pile_16', { yellow: R.gold, orange: R.gold, other: R.gold }),
  key: dcss('key', { yellow: R.gold, orange: R.gold, other: R.gold }),

  // ---- fountains, fire
  'bloodFountain:0': dcss('blood_fountain', { gray: R.stone, red: R.blood, other: R.stone }),
  'bloodFountain:1': dcss('blood_fountain_2', { gray: R.stone, red: R.blood, other: R.stone }),
  'soulFountain:0': dcss('sparkling_fountain', { gray: R.stone, cyan: R.soul, blue: R.soul, other: R.soul }),
  'soulFountain:1': dcss('sparkling_fountain_2', { gray: R.stone, cyan: R.soul, blue: R.soul, other: R.soul }),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`fireAltar:${i - 1}`, dcss(`altar_makhleb_flame_${i}`, { gray: R.void, red: R.ember, orange: R.ember, yellow: R.ember, other: R.ember })])),
  ...Object.fromEntries([0, 1, 2, 3, 4].map((i) => [`torch:${i}`, dcss(`torch_${i}`, { gray: R.iron, red: R.ember, orange: R.ember, yellow: R.ember, other: R.ember })])),

  // ---- wall and floor pieces
  banner: dcss('banner_1', { red: R.blood, gray: R.iron, other: R.blood }),
  pentagram: dcss('trap_magical', { red: R.blood, gray: R.void, other: R.blood }, { outline: false }),
  spikeTrap: dcss('trap_spear', { gray: R.iron, red: R.blood, other: R.iron }),
  bladeTrap: dcss('trap_blade', { gray: R.iron, red: R.blood, other: R.iron }),
  eyeWall: dcss('brick_dark_eyes', { gray: R.void, red: R.blood, other: R.blood }, { outline: false }),
  boneWall: dcss('brick_dark_skeleton', { gray: R.bone, other: R.bone }, { outline: false }),
  starSwirl: dcss('starry_portal', { gray: R.soul, other: R.soul }, { outline: false }),
  discoBall: dcss('disco_ball', { other: R.soul, gray: R.pale }),
  runedDoor: dcss('runed_door', { orange: R.wood, red: R.wood, blue: R.soul, cyan: R.soul, gray: R.iron, other: R.wood }),
  sealedDoor: dcss('sealed_door', { orange: R.wood, red: R.wood, green: R.rot, gray: R.iron, other: R.wood }),

  // ---- little things
  crystalBall: dcss('misc_crystal_new', { blue: R.soul, purple: R.soul, cyan: R.soul, gray: R.pale, other: R.soul }),
  deck: dcss('misc_deck_new', { gray: R.bone, blue: R.ink, other: R.ink }),
  skullLantern: dcss('misc_lantern', { gray: R.bone, yellow: R.ember, orange: R.ember, other: R.bone }),
  orb: dcss('misc_orb', { other: R.soul, gray: R.pale }),
  deadBook: dcss('book_of_the_dead_new', { gray: R.void, other: R.bone }),
  bookGray: dcss('book_gray', { gray: R.stone, other: R.ink }),
  bookIndigo: dcss('book_indigo', { blue: R.ink, purple: R.soul, gray: R.bone, other: R.ink }),
  bookOrange: dcss('book_orange', { orange: R.wood, yellow: R.gold, gray: R.bone, other: R.wood }),
  bookWorn: dcss('book_dog_eared', { other: R.flesh, gray: R.bone }),
  bookRed: dcss('misc_book', { other: R.blood, gray: R.bone }),
  flyingSkull: dcss('flying_skull', { gray: R.bone, other: R.bone }),
  bone: dcss('bone', { gray: R.bone, other: R.bone }),

  // ---- the arcade's carpet (64x64 halved to a 32x32 floor tile)
  carpet: { src: 'arcade/Carpet1.png', scale: 0.5, map: { gray: R.void, other: R.soul }, outline: false, gamma: 1.4 },
  carpet2: { src: 'arcade/Carpet3.png', scale: 0.5, map: { gray: R.void, other: R.blood }, outline: false, gamma: 1.4 },
};

// ---- the crawlspace: lumpy earth for the rock, dark dirt behind
const EARTH = ['#1a110a', '#22170e', '#2a1d12', '#332317', '#3c2a1b', '#4a3522'];
Object.assign(PACK_ART, {
  'earth:0': dcss('lair_0_new', { other: EARTH, gray: EARTH }, { outline: false }),
  'earth:1': dcss('lair_1_new', { other: EARTH, gray: EARTH }, { outline: false }),
  'earth:2': dcss('lair_2_new', { other: EARTH, gray: EARTH }, { outline: false }),
  'darkDirt:0': dcss('grey_dirt_0_new', { other: RAMP.void, gray: ['#08060a', '#0e0a0c', '#140f10', '#1a1414'] }, { outline: false }),
  'darkDirt:1': dcss('grey_dirt_1_new', { other: RAMP.void, gray: ['#08060a', '#0e0a0c', '#140f10', '#1a1414'] }, { outline: false }),
});

// ---- map icons: Kenney's 1-Bit Pack (a 16px sheet), one flat color each, outlined.
// `map:NAME` is the 16px icon on the big map (the minimap has small hand-drawn copies: src/ui/minimap.js).
// [sheet column, row, color]
export const MAP_ICONS = {
  boss: [38, 11, '#e8e0d0'], treasure: [44, 2, '#f0c040'], shop: [45, 4, '#f0c040'],
  secret: [38, 13, '#9ab0e0'], supersecret: [37, 13, '#9ab0e0'], ultrasecret: [38, 13, '#ff4a3a'],
  curse: [30, 11, '#c060c0'], sacrifice: [36, 6, '#d84a3a'], arcade: [35, 16, '#f0c040'],
  challenge: [36, 7, '#c4baa8'], bosschallenge: [36, 7, '#ff6a5a'], library: [45, 5, '#d8a868'],
  vault: [9, 6, '#c8a048'], dice: [46, 14, '#e8dcbc'], nursery: [5, 8, '#e8b8c8'], sickroom: [5, 8, '#9ccf6a'],
  miniboss: [36, 0, '#d0c0b0'], planetarium: [29, 12, '#a0b8ff'], devil: [28, 11, '#ff5a2a'],
  angel: [39, 0, '#f4f4fc'], bossrush: [40, 16, '#f0c040'], error: [36, 13, '#ff40ff'],
  // what's left lying in a room you've been to
  heart: [39, 10, '#e0303a'], coin: [36, 16, '#f0c040'], key: [33, 11, '#c4bfb6'], bomb: [45, 9, '#9a948c'],
  item: [29, 12, '#fff3c0'], chest: [9, 6, '#b8865a'],
};
for (const [name, [col, row, color]] of Object.entries(MAP_ICONS)) {
  PACK_ART[`map:${name}`] = { src: 'kenney/1bit.png', crop: [col * 16, row * 16, 16, 16], fill: color };
}
