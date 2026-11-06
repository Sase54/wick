// What each special room looks like inside, besides its palette (`look` in specialRooms.js):
// painted by src/game/roomdecor.js when the room is built.
//
//   wallTile   a pack texture laid over the top wall's face (wallAlpha: how strongly)
//   floor      [[painter, options], ...]: rug, tiles, stars, checker, felt, blood, decal, ring, pentagram,
//              vaultTiles (see FLOORS in roomdecor.js)
//   place      decor sprites: { key, at, dx, dy, mirror, fps, light: [radius, color] }
//              key: a builder in roomdecor.js or a pack sprite (src/data/packArt.js); animated
//                   ones (several frames) are drawn every frame
//              at:  fractions of the width along the top wall (0..1), or spots: tl, tr, bl, br
//                   (floor corners), tl2, tr2 (a little further in), top, center
//              mirror: the copy on the right half faces the other way
import { RAMP } from './packArt.js';

const CANDLE = [26, 'rgba(255,170,80,0.5)'];
const FIRE = [40, 'rgba(255,90,30,0.6)'];
const HOLY = [46, 'rgba(230,230,255,0.5)'];
const SOUL = [34, 'rgba(150,110,255,0.5)'];

export const ROOM_DECOR = {
  treasure: {
    floor: [['rug', { w: 70, h: 44, col: RAMP.blood, trim: RAMP.gold }]],
    place: [{ key: 'goldSmall', at: ['tl', 'br'] }, { key: 'candles', at: [0.18, 0.82], light: CANDLE }],
  },
  shop: {
    floor: [['rug', { w: 220, h: 56, col: RAMP.wood, trim: RAMP.gold }]],
    place: [
      { key: 'crate', at: ['tl', 'br'] }, { key: 'goldPile', at: ['tr'] },
      { key: 'skullLantern', at: [0.12, 0.88], light: CANDLE },
    ],
  },
  secret: { place: [{ key: 'skullPile', at: ['bl', 'tr'] }, { key: 'chains', at: [0.2, 0.75] }] },
  supersecret: { place: [{ key: 'goldSmall', at: ['tl', 'br'] }, { key: 'chains', at: [0.15, 0.85] }] },
  ultrasecret: {
    wallTile: 'eyeWall', wallAlpha: 0.7,
    floor: [['blood', { r: 40 }]],
    place: [{ key: 'gargoyle', at: ['tl', 'tr'], mirror: true }, { key: 'skullPile', at: ['bl', 'br'] }],
  },
  red: { wallTile: 'eyeWall', wallAlpha: 0.4, floor: [['blood', { r: 24 }]] },

  // the thorned room: dark red walls full of eyes, blades in the corners
  curse: {
    wallTile: 'eyeWall', wallAlpha: 0.8,
    floor: [['blood', { r: 30 }], ['pentagram', { r: 30, alpha: 0.5 }]],
    place: [
      { key: 'bladeTrap', at: ['tl2', 'tr2'] },
      { key: 'chains', at: [0.1, 0.35, 0.65, 0.9] },
      { key: 'skullLantern', at: [0.5], light: [30, 'rgba(255,40,40,0.5)'] },
    ],
  },
  // the offering room: a pool of blood around the spike altar, bones in the walls
  sacrifice: {
    wallTile: 'boneWall', wallAlpha: 0.55,
    floor: [['blood', { r: 48 }]],
    place: [
      { key: 'chains', at: [0.15, 0.4, 0.6, 0.85] },
      { key: 'skullPile', at: ['bl', 'br', 'tl', 'tr'] },
      { key: 'candles', at: ['tl2', 'tr2'], light: CANDLE },
    ],
  },
  // the parlor: a garish carpet and strings of blinking bulbs
  arcade: {
    floor: [['tiles', { key: 'carpet', alpha: 0.85 }]],
    place: [
      { key: 'bulbs', at: [0.22, 0.5, 0.78], dy: -12, fps: 3, light: [30, 'rgba(255,170,60,0.45)'], lightY: 0 },
      { key: 'discoBall', at: ['top'], dy: -4, light: SOUL },
    ],
  },
  // the gauntlets: an arena ring of chalk sigils, bones and blades
  challenge: {
    floor: [['ring', { r: 56, col: RAMP.bone }]],
    place: [{ key: 'bladeTrap', at: ['tl', 'tr', 'bl', 'br'] }, { key: 'banner', at: [0.2, 0.8] }, { key: 'torch', at: [0.35, 0.65], fps: 8, light: FIRE }],
  },
  bosschallenge: {
    wallTile: 'boneWall', wallAlpha: 0.5,
    floor: [['ring', { r: 56, col: RAMP.blood }], ['blood', { r: 22 }]],
    place: [{ key: 'skullPile', at: ['tl', 'tr', 'bl', 'br'] }, { key: 'banner', at: [0.2, 0.8] }, { key: 'torch', at: [0.35, 0.65], fps: 8, light: FIRE }],
  },
  // the reading room: shelves of books along the wall, candles, a long rug
  library: {
    floor: [['rug', { w: 200, h: 60, col: RAMP.ink, trim: RAMP.gold }]],
    place: [
      { key: 'bookshelf', at: [0.08, 0.2, 0.32, 0.68, 0.8, 0.92] },
      { key: 'candles', at: ['tl2', 'tr2', 'bl', 'br'], light: CANDLE },
    ],
  },
  // the strongroom: gold-inlaid floor, hanging cages, heaps of coins
  vault: {
    floor: [['vaultTiles']],
    place: [
      { key: 'goldHeap', at: ['tl', 'tr'] }, { key: 'goldPile', at: ['bl', 'br'] },
      { key: 'cage', at: [0.15, 0.85] }, { key: 'skullLantern', at: [0.5], light: CANDLE },
    ],
  },
  // the gambler's den: green baize, the die face set in the middle (a prop), dice and a deck
  dice: {
    floor: [['felt']],
    place: [{ key: 'diceStack', at: ['tl', 'br'] }, { key: 'deck', at: ['tr'] }, { key: 'goldSmall', at: ['bl'] }, { key: 'candles', at: [0.25, 0.75], light: CANDLE }],
  },
  nursery: {
    floor: [['rug', { w: 150, h: 70, col: RAMP.flesh, trim: RAMP.bone }]],
    place: [{ key: 'cradle', at: ['tr'] }, { key: 'candles', at: ['tl2', 'bl'], light: CANDLE }, { key: 'bookshelf', at: [0.85] }],
  },
  sickroom: {
    floor: [['rug', { w: 150, h: 70, col: RAMP.rot, trim: RAMP.bone }], ['blood', { r: 16 }]],
    place: [{ key: 'bucket', at: ['tr', 'bl'] }, { key: 'chains', at: [0.85] }, { key: 'candles', at: ['tl2'], light: [22, 'rgba(160,220,60,0.35)'] }],
  },
  // the lair: bones everywhere and a cage
  miniboss: {
    wallTile: 'boneWall', wallAlpha: 0.4,
    floor: [['blood', { r: 26 }]],
    place: [{ key: 'skullPile', at: ['tl', 'tr', 'bl', 'br'] }, { key: 'cage', at: [0.2, 0.8] }],
  },
  // the orrery: a floor of stars, a telescope, an orb on a stand
  planetarium: {
    floor: [['stars']],
    place: [
      { key: 'telescope', at: ['tl'] }, { key: 'statueOrb', at: ['tr'], light: SOUL },
      { key: 'candles', at: ['bl', 'br'], light: [24, 'rgba(150,170,255,0.45)'] },
    ],
  },
  // the bargain: fire on black altars, wax idols, a pentagram on the floor
  devil: {
    floor: [['pentagram', { r: 44 }]],
    place: [
      { key: 'fireAltar', at: ['bl', 'br'], fps: 8, light: FIRE },
      { key: 'statueImp', at: [0.3, 0.7], mirror: true },
      { key: 'chains', at: [0.12, 0.88] },
    ],
  },
  // the vigil: pale marble, wax pillars, light falling from above
  angel: {
    floor: [['checker', { a: RAMP.pale, b: RAMP.pale, size: 24, hi: 3.2, low: 0.62 }]],
    place: [
      { key: 'pillar', at: [0.12, 0.88] },
      { key: 'soulFountain', at: ['bl', 'br'], fps: 3, light: HOLY },
      { key: 'altarHand', at: [0.5], light: HOLY },
    ],
  },
  // the procession: gold statues of the fallen, banners, sarcophagi
  bossrush: {
    floor: [['ring', { r: 60, col: RAMP.gold }]],
    place: [
      { key: 'statueGold', at: [0.15, 0.85], mirror: true }, { key: 'statueGold2', at: [0.35, 0.65], mirror: true },
      { key: 'sarcophagus', at: ['bl', 'br'] }, { key: 'torch', at: [0.25, 0.75], fps: 8, light: FIRE },
    ],
  },
  boss: { place: [{ key: 'skullPile', at: ['bl', 'br'] }] },
  error: { floor: [['decal', { key: 'starSwirl', scale: 2, alpha: 0.4 }]] },
};
