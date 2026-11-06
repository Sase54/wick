// Chapter 3 room layouts (The Underhall, The Wax Tombs and The Mire share them; each variant skins
// the tiles and brings its own enemies). Hand-made rooms plus generated ones in the chapter's
// style: pillars, rows of iron blocks (sarcophagi), spike runs, pits (src/data/rooms/generate.js).
import { generateRooms } from './generate.js';

const STYLE = {
  features: [['pillars', 3], ['blocks', 3], ['spikes', 2], ['ring', 1], ['rocks', 2], ['pits', 2], ['pots', 1]],
  density: [2, 4],
  enemies: { e: [2, 3], f: [0, 2], s: [0, 1] },
};

const HANDMADE = [
  // a colonnade: two rows of pillars
  { id: 'c3-colonnade', layout: [
    '.............',
    '..#..#.#..#..',
    '...e.....e...',
    '.f....s....f.',
    '...e.....e...',
    '..#..#.#..#..',
    '.............',
  ] },
  // rows of sarcophagi (iron blocks)
  { id: 'c3-crypt-rows', layout: [
    '.............',
    '.XX.e...e.XX.',
    '.............',
    '...XX.s.XX...',
    '.............',
    '.XX.e...e.XX.',
    '.............',
  ] },
  // a throne room: a dais of spikes, the way round it
  { id: 'c3-throne', layout: [
    '.............',
    '.e..^^^^^..e.',
    '....^...^....',
    '.f..^.s.^..f.',
    '....^...^....',
    '.e.........e.',
    '.............',
  ] },
  // a pit with a walkway round it
  { id: 'c3-sunken-floor', layout: [
    '.............',
    '..e.......e..',
    '...ooo.ooo...',
    '.f.ooo.ooo.f.',
    '...ooo.ooo...',
    '..e...s...e..',
    '.............',
  ] },
  // a long gallery with alcoves
  { id: 'c3-gallery', shape: '2x1', layout: [
    '..........................',
    '.#.#.#.#.#.#..#.#.#.#.#.#.',
    '..e.....e...f.....e....e..',
    '..........................',
    '..e.....e...s.....e....e..',
    '.#.#.#.#.#.#..#.#.#.#.#.#.',
    '..........................',
  ] },
  // a great hall: four pillar clusters and a spike cross in the middle
  { id: 'c3-great-hall', shape: '2x2', layout: [
    '..........................',
    '..........................',
    '...##....e......e....##...',
    '...##................##...',
    '.......f..........f.......',
    '............^^............',
    '..e.......^^.s^^.......e..',
    '..........^^..^^..........',
    '............^^............',
    '.......f..........f.......',
    '...##................##...',
    '...##....e......e....##...',
    '..........................',
    '..........................',
  ] },
];

export const CHAPTER3_ROOMS = [
  ...HANDMADE,
  ...generateRooms('c3', '1x1', 20, STYLE),
  ...generateRooms('c3', 'hall', 2, STYLE),
  ...generateRooms('c3', 'shaft', 2, STYLE),
  ...generateRooms('c3', '2x1', 2, STYLE),
  ...generateRooms('c3', '1x2', 2, STYLE),
  ...generateRooms('c3', '2x2', 1, STYLE),
  ...generateRooms('c3', 'L1', 2, STYLE),
];
