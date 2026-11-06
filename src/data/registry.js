// Central registry of all content, by type. Systems that need to look content up by
// (type, id) - unlocks, popups, saves, DESIGN.md generation - go through here.
import { CHARACTERS } from './characters.js';
import { ITEMS } from './items.js';
import { TRINKETS } from './trinkets.js';
import { CARDS, PILLS, RUNES, STONES } from './consumables.js';
import { CHALLENGES, MODES } from './challenges.js';
import { BOSSES } from './bosses.js';
import { ENEMIES } from './enemies.js';
import { FLOORS } from './floors.js';
import { VARIANTS } from './variants.js';
import { SPECIAL_TYPES } from './specialRooms.js';

export const REGISTRY = {
  character: CHARACTERS,
  item: ITEMS,
  trinket: TRINKETS,
  card: CARDS,
  pill: PILLS,
  rune: RUNES,
  stone: STONES,
  challenge: CHALLENGES,
  mode: MODES,
  boss: BOSSES,
  enemy: ENEMIES,
  variant: VARIANTS,
  room: SPECIAL_TYPES,
  floor: Object.fromEntries(FLOORS.map((f, i) => [String(i + 1), f])),
};

export function getContent(type, id) {
  return REGISTRY[type]?.[id] || null;
}

export function contentName(type, id) {
  return getContent(type, id)?.name || id.toUpperCase();
}
