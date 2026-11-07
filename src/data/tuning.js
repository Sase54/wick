// Every feel number in one place, so the game can be tuned without hunting through the code.
// Grouped by the sections of the feel pass (DESIGN.md "Feel and tuning" explains each one).
// Changing a value here changes the game; nothing else needs editing.

export const TUNING = {
  // ---- 1. Screen, rooms and perspective
  screen: {
    width: 480,             // internal resolution (game pixels)
    height: 270,
    // scaling: whole-number scale when the fit loses at most this much of the screen, else the
    // largest crisp fit (a phone at 844x390 can't fit 480x270 twice)
    integerSnap: 0.88,
  },
  room: {
    tile: 24,               // px per tile; a room's floor is 13x7 tiles
    wallSide: 84,           // side wall thickness (px): with the floor 312 wide this fills the 480 screen
    wallTop: 62,            // the top wall is taller: we see its face (3/4 view)
    wallBottom: 40,         // the bottom wall is the shortest
    // how deep each wall's lit face is before it turns into the dark top of the wall
    faceTop: 34, faceSide: 18, faceBottom: 9,
  },
  camera: {
    follow: 9,              // big rooms: how fast the camera catches up (per second)
    lookAhead: 12,          // px the camera sits above the player (more floor ahead)
    transition: 0.3,        // seconds to slide to the next room through a door
  },
  lighting: {
    vignette: 0.55,         // darkness of the screen corners (0..1)
    vignetteInner: 0.55,    // where the vignette starts (fraction of the half-diagonal)
    doorLight: 0.16,        // brightness of the light spilling in from an open door
    doorLightReach: 70,     // how far into the room it reaches (px)
    darknessRadius: 78,     // the final boss's dark phase: light radius around Wick (px)
    darknessWideRadius: 96, // Curse of the Guttered Flame and the dark pill: a wider light
  },
};
