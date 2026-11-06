// Chapter 4 room layouts (The Fleshworks, The Black Womb and The Scarred Womb share them; each
// variant skins the tiles and brings its own enemies). Hand-made rooms plus generated ones in the
// chapter's style: soft round clusters (rocks are lumps of tissue), holes, rings and spikes
// (src/data/rooms/generate.js).
import { generateRooms } from './generate.js';

const STYLE = {
  features: [['rocks', 3], ['ring', 2], ['pits', 2], ['lake', 1], ['spikes', 2], ['pots', 2], ['pillars', 1]],
  density: [2, 4],
  enemies: { e: [2, 3], f: [1, 2], s: [0, 1] },
};

const HANDMADE = [
  // a ring of growths round a heart-shaped hole
  { id: 'c4-heart-hole', layout: [
    '.............',
    '...e.....e...',
    '....oo.oo....',
    '..f.ooooo.f..',
    '.....ooo.....',
    '...e..o..e...',
    '.............',
  ] },
  // ribs: rows of growths like a ribcage
  { id: 'c4-ribcage', layout: [
    '.............',
    '.#.#.#.#.#.#.',
    '......e......',
    '..f...s...f..',
    '......e......',
    '.#.#.#.#.#.#.',
    '.............',
  ] },
  // sacs around the walls, open floor
  { id: 'c4-sacs', layout: [
    'u...........u',
    '.u..e...e..u.',
    '.............',
    '.....f.f.....',
    '.............',
    '.u..e...e..u.',
    'u...........u',
  ] },
  // a spiked scar running across, two ways round
  { id: 'c4-scar', layout: [
    '.............',
    '.e.........e.',
    '.............',
    '.^^^^...^^^^.',
    '.............',
    '..f..s.s..f..',
    '.............',
  ] },
  // a long gut: winding lumps
  { id: 'c4-gut', shape: '2x1', layout: [
    '..........................',
    '..e...##.......##.....e...',
    '.....##...f...##..........',
    '....##.........##...s.....',
    '...##.....e.....##........',
    '..e...................e...',
    '..........................',
  ] },
  // the chamber: a 2x2 with a ring of holes
  { id: 'c4-chamber', shape: '2x2', layout: [
    '..........................',
    '..e...................e...',
    '.....#..............#.....',
    '..........oooooo..........',
    '....f....oo....oo....f....',
    '.........o..ss..o.........',
    '..........................',
    '..........................',
    '.........o......o.........',
    '....f....oo....oo....f....',
    '..........oooooo..........',
    '.....#..............#.....',
    '..e...................e...',
    '..........................',
  ] },
];

export const CHAPTER4_ROOMS = [
  ...HANDMADE,
  ...generateRooms('c4', '1x1', 20, STYLE),
  ...generateRooms('c4', 'hall', 2, STYLE),
  ...generateRooms('c4', 'shaft', 2, STYLE),
  ...generateRooms('c4', '2x1', 2, STYLE),
  ...generateRooms('c4', '1x2', 2, STYLE),
  ...generateRooms('c4', '2x2', 1, STYLE),
  ...generateRooms('c4', 'L1', 2, STYLE),
];
