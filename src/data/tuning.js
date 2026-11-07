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

  // ---- 2. The player
  player: {
    moveSpeed: 125,         // px per second at speed 1.0: crosses a room's 312 px floor in ~2.5 s
    speedMin: 0.1,          // the speed stat's limits
    speedMax: 2.0,
    accelTime: 0.1,         // seconds from standing still to full speed
    slideTime: 0.15,        // seconds to slide to a stop after letting go
    headIdle: 0.35,         // seconds standing still (not shooting) before the head looks back down
    shotSquash: 0.08,       // seconds the head squashes after each shot
    eyeOffset: 3,           // px from the middle of the face to each eye (shots alternate eyes)
    eyeHeight: 16,          // px above the feet where shots leave the eyes
    // getting hurt
    invuln: 1.0,            // seconds of blinking invincibility after a hit
    invulnFull: 1.33,       // ...after a hit of a full heart or more
    blinkRate: 14,          // blinks per second while invincible
    flinch: 0.4,            // seconds the hurt face shows
    knockback: 150,         // px/s push away from what hit you
    hurtShake: 5,           // screen shake strength
    hurtFlash: 0.18,        // seconds of red screen flash
    // low health: a heartbeat and a red pulse at the screen edges
    lowHealth: 2,           // half hearts (all kinds) at or below which it starts: 1 heart
    heartbeatEvery: 0.85,   // seconds between beats
    lowPulse: 0.32,         // strength of the red edges at the peak of a beat
    // death
    meltTime: 1.4,          // seconds of the melting animation
    deathPause: 0.8,        // then a short pause before the death screen
  },

  // ---- 3. Shooting (tears)
  tears: {
    // Fire rate, Isaac's formula. T = the tears stat (0 at the start; "+fire rate" on items adds to T):
    //   T >= 0:          delay = base - mul * sqrt(1 + 1.3 * T), never below delayCap from T alone
    //   -0.77 < T < 0:   delay = base - mul * sqrt(1 + 1.3 * T) - mul * T
    //   T <= -0.77:      delay = base - mul * T
    //   shots per second = framesPerSecond / (delay + 1)   (30 / 11 = 2.73 at the start)
    // Items with tearDelay change the delay directly and fire rate multipliers multiply the result;
    // both can go past the cap.
    delayBase: 16,
    delayMul: 6,
    delaySlope: 1.3,
    delayCap: 5,
    framesPerSecond: 30,
    shotSpeed: 180,         // px per second at shot speed 1.0 (7.5 tiles), scales linearly
    range: 6.5,             // tiles at the start (the range stat)
    inherit: 0.35,          // share of Wick's own movement a shot keeps (moving sideways curves it)
    arcLift: 28,            // px/s upward bump when a shot's range runs out, before it drops
    fallGravity: 520,       // px/s² pulling a falling shot down to the floor
    sizeBase: 4,            // shot radius (px) at 3.5 damage...
    sizePerDamage: 0.3,     // ...growing this much per point of damage above 3.5
    sizeMin: 3, sizeMax: 14,
    alpha: 0.88,            // shots are a little see-through
    knockback: 48,          // px/s push on an enemy hit at shot speed 1.0 and size 4...
    // ...times shot speed and times (size / 4), so faster and bigger shots push harder
    hitFlashWhite: 0.06,    // an enemy hit flashes white...
    hitFlashRed: 0.1,       // ...then red
  },

  // ---- 4. Stats and damage
  damage: {
    // damage = (base * sqrt(1 + damageUps * upFactor) + flatDamage) * multipliers
    // "+damage" on items is damage ups; characters only have multipliers (0.75 .. 1.35)
    base: 3.5,
    upFactor: 1.2,
  },
  hud: {
    statArrowTime: 3,       // seconds a green up / red down arrow shows next to a stat that changed
  },
};
