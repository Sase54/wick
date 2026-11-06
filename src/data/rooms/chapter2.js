// Chapter 2 room layouts (the caves, the ossuary and the sunken caves share them; each variant
// skins the tiles and brings its own enemies). A few hand-made rooms, the rest generated in the
// chapter's style: more pits and chasms, rubble and rock rings (see src/data/rooms/generate.js).
import { generateRooms } from './generate.js';

const STYLE = {
  features: [['pits', 3], ['lake', 2], ['rocks', 3], ['rubble', 2], ['ring', 1], ['pillars', 1], ['spikes', 1], ['pots', 1]],
  density: [2, 4],
  enemies: { e: [2, 3], f: [0, 2], s: [0, 1] },
};

const HANDMADE = [
  { id: 'c2-chasm-bridge', layout: [
    '.............',
    '.e...ooo...e.',
    '.....ooo.....',
    '..f.......f..',
    '.....ooo.....',
    '.e...ooo.s.e.',
    '.............',
  ] },
  { id: 'c2-stalagmites', layout: [
    '.............',
    '..#..#.#..#..',
    '.....e.e.....',
    '.#....f....#.',
    '.....e.e.....',
    '..#..#.#..#..',
    '.............',
  ] },
  { id: 'c2-cave-in', layout: [
    '#............',
    '##..e....##..',
    '###.....###..',
    '......s......',
    '..###.....###',
    '..##....e..##',
    '............#',
  ] },
  { id: 'c2-pool', layout: [
    '.............',
    '...e.....e...',
    '....ooooo....',
    '..f.ooooo.f..',
    '....ooooo....',
    '...e.....e...',
    '.............',
  ] },
  { id: 'c2-long-chasm', shape: '2x1', layout: [
    '..........................',
    '..e...........#.....e.....',
    '....ooooo....###...oooo...',
    '....ooooo.f...#..f.oooo...',
    '....ooooo....###...oooo...',
    '..e...........#.....e.....',
    '..........................',
  ] },
  { id: 'c2-cavern', shape: '2x2', layout: [
    '..........................',
    '..#....e.........e....#...',
    '.##...................##..',
    '.......oooo....oooo.......',
    '...f...oooo.ss.oooo...f...',
    '.......oooo....oooo.......',
    '..........................',
    '..........................',
    '....#.......ee.......#....',
    '...###..............###...',
    '....#....f......f....#....',
    '..........................',
    '..e....................e..',
    '..........................',
  ] },
];

export const CHAPTER2_ROOMS = [
  ...HANDMADE,
  ...generateRooms('c2', '1x1', 20, STYLE),
  ...generateRooms('c2', 'hall', 2, STYLE),
  ...generateRooms('c2', 'shaft', 2, STYLE),
  ...generateRooms('c2', '2x1', 2, STYLE),
  ...generateRooms('c2', '1x2', 2, STYLE),
  ...generateRooms('c2', '2x2', 1, STYLE),
  ...generateRooms('c2', 'L1', 2, STYLE),
];
