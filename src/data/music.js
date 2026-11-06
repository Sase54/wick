// Music files (assets/music/, credits in CREDITS.md). A track with a file plays the file; while
// it's still loading, or if the browser can't play it (some iPhones can't play .ogg), or if the
// file is gone, the generated version plays instead (src/engine/music.js). Files load when they're
// first needed, so they don't slow the start of the game down.
//
//   file    the file in assets/music/
//   vol     how loud it plays (they were mixed differently)
//   gen     the generated track to fall back on (chapters fall back on the floor variant's own
//           generated track instead, see game.updateMusic)
export const MUSIC_FILES = {
  chapter1: { file: 'chapter1.ogg', vol: 0.9 },
  chapter2: { file: 'chapter2.ogg', vol: 0.9 },
  chapter3: { file: 'chapter3.ogg', vol: 1 },
  chapter4: { file: 'chapter4.ogg', vol: 0.55 },
  boss: { file: 'boss.ogg', vol: 0.55, gen: 'boss' },
  final: { file: 'final.ogg', vol: 0.6, gen: 'final' },
  devil: { file: 'devil.ogg', vol: 0.6, gen: 'devil' },
  angel: { file: 'angel.ogg', vol: 0.7, gen: 'angel' },
  shop: { file: 'shop.ogg', vol: 0.8, gen: 'shop' },
  secret: { file: 'secret.ogg', vol: 1, gen: 'secret' },
};

// Which special rooms have their own music (everything else plays the chapter's).
export const ROOM_MUSIC = {
  shop: 'shop', blackmarket: 'shop',
  secret: 'secret', supersecret: 'secret', ultrasecret: 'secret', red: 'secret',
  devil: 'devil', angel: 'angel',
};

// Seconds for one track to fade into the next.
export const CROSSFADE = 1.5;
