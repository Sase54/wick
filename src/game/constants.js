// Room geometry. A one-screen room (walls included) fills the 480x270 view, like in Isaac.
// The walls are thicker on top than at the bottom: the fake 3/4 view (numbers in data/tuning.js).
import { VIEW_W, VIEW_H } from '../engine/canvas.js';
import { TUNING } from '../data/tuning.js';
export { VIEW_W, VIEW_H };

export const TILE = TUNING.room.tile;
export const COLS = 13;
export const ROWS = 7;
export const ROOM_W = COLS * TILE;              // 312
export const ROOM_H = ROWS * TILE;              // 168
export const ROOM_X = TUNING.room.wallSide;     // 84: left edge of the playfield (inside the walls)
export const ROOM_Y = TUNING.room.wallTop;      // 62: top edge of the playfield (the tall top wall)
export const ROOM_YB = TUNING.room.wallBottom;  // 40: the bottom wall below the playfield
export const ROOM_R = ROOM_X + ROOM_W;          // 396
export const ROOM_B = ROOM_Y + ROOM_H;          // 230
export const ROOM_CX = ROOM_X + ROOM_W / 2;     // 240: middle of a one-screen room
export const ROOM_CY = ROOM_Y + ROOM_H / 2;     // 146

// Tile types
export const T = {
  FLOOR: 0,
  ROCK: 1,
  PIT: 2,
  SPIKES: 3,
  POT: 4,       // destructible by shots
  BLOCK: 5,     // indestructible
  TINTED: 6,    // special rock, drops loot when bombed
  WALL: 7,      // solid wall inside the grid (L-shaped and narrow rooms)
};

// Character codes used in room template strings (src/data/rooms.js).
export const TILE_CHARS = {
  '.': T.FLOOR,
  '#': T.ROCK,
  'o': T.PIT,
  '^': T.SPIKES,
  'u': T.POT,
  'X': T.BLOCK,
  't': T.TINTED,
  '=': T.WALL,
};

// Doors sit in the middle of each wall.
export const DIR_LIST = ['up', 'down', 'left', 'right'];
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
export const DOOR_GAP = 11; // half-width of a doorway opening
export const DOOR_POS = {
  up: { x: ROOM_X + ROOM_W / 2, y: ROOM_Y },
  down: { x: ROOM_X + ROOM_W / 2, y: ROOM_B },
  left: { x: ROOM_X, y: ROOM_Y + ROOM_H / 2 },
  right: { x: ROOM_R, y: ROOM_Y + ROOM_H / 2 },
};
export const DOOR_CELL = { up: [6, 0], down: [6, 6], left: [0, 3], right: [12, 3] };

// Pixel/second scale for the "1.0" value of speed stats.
export const MOVE_SPEED_PX = TUNING.player.moveSpeed;   // 125: see data/tuning.js
export const SHOT_SPEED_PX = TUNING.tears.shotSpeed;   // 180 = 7.5 tiles per second, see data/tuning.js
