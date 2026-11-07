// Little icons drawn above an enemy for each status it has (src/game/enemies.js, bosses/base.js).
// '#' = the main color, 'o' = a lighter highlight; a dark outline is added around each one.
// `tint` is the color the enemy itself is washed with while it has that status.
export const STATUS_ICONS = {
  poison: {
    tint: '#6aba34', color: '#5aa82a', light: '#b8f07a',
    rows: [
      '...#...',
      '..###..',
      '.##o##.',
      '.#o###.',
      '#######',
      '.#####.',
      '..###..',
    ],
  },
  burn: {
    tint: '#f05a24', color: '#f06a1c', light: '#ffd25a',
    rows: [
      '...#...',
      '..##...',
      '..###.#',
      '.##o###',
      '##ooo##',
      '##ooo##',
      '.#####.',
    ],
  },
  slow: {
    tint: '#9a9aa2', color: '#9a9aa4', light: '#e0e0e8',
    rows: [
      '#######',
      '.#ooo#.',
      '..#o#..',
      '...#...',
      '..#.#..',
      '.#ooo#.',
      '#######',
    ],
  },
  fear: {
    tint: '#7a4a9a', color: '#9a5ac8', light: '#e0c0ff',
    rows: [
      '.#####.',
      '#######',
      '#o.#.o#',
      '#######',
      '.#...#.',
      '.#.#.#.',
      '..###..',
    ],
  },
  charm: {
    tint: '#ff80c0', color: '#ff5aa8', light: '#ffd0e8',
    rows: [
      '.##.##.',
      '#o#####',
      '#######',
      '.#####.',
      '..###..',
      '...#...',
      '.......',
    ],
  },
  freeze: {
    tint: '#7ac8ff', color: '#5ab0f0', light: '#e8f8ff',
    rows: [
      '#..#..#',
      '.#.#.#.',
      '..#o#..',
      '###o###',
      '..#o#..',
      '.#.#.#.',
      '#..#..#',
    ],
  },
};

// The order they're drawn in, left to right.
export const STATUS_ORDER = ['burn', 'poison', 'freeze', 'slow', 'fear', 'charm'];
