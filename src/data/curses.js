// Curses: a floor (from floor 2, never the finale) is sometimes cursed. The curse's name shows on
// the floor card. What each one does lives in src/game/game.js (look for `this.curse`).
//
//   name   shown on the floor card
//   desc   what it does, in a few words (also on the pause screen)
//   odd    only on the first floor of a chapter (the Sprawl needs a floor to swallow)

export const CURSES = {
  darkness: { name: 'CURSE OF THE GUTTERED FLAME', desc: 'THE DARK CREEPS CLOSE' },
  lost: { name: 'CURSE OF THE TORN MAP', desc: 'NO MAP' },
  labyrinth: { name: 'CURSE OF THE SPRAWL', desc: 'TWO FLOORS IN ONE', odd: true },
  unknown: { name: 'CURSE OF THE BLANK HEART', desc: 'YOUR HEALTH IS HIDDEN' },
  maze: { name: 'CURSE OF THE WANDERING DOORS', desc: 'DOORS LEAD ASTRAY' },
  blind: { name: 'CURSE OF THE VEILED ALTARS', desc: 'ITEMS HIDE THEIR FACES' },
  // two of our own
  restless: { name: 'CURSE OF THE RESTLESS', desc: 'THE DEAD RETURN TO EMPTY ROOMS' },
  shortwick: { name: 'CURSE OF THE SHORT WICK', desc: 'YOUR SHOTS FALL SHORT' },
};

// Chance for a floor to be cursed.
export const CURSE_CHANCE = 0.28;
