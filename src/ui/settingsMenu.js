// The settings list, shared by the title screen and the pause menu.
import { saveSettings } from '../engine/storage.js';
import { Menu } from './menu.js';
import { audio } from '../engine/audio.js';

const pct = (v) => `${Math.round(v * 10)}`;

export function createSettingsMenu(settings, { onChange, onBack, onReset }) {
  const bind = (key) => [() => settings[key], (v) => { settings[key] = v; saveSettings(settings); audio.applySettings(); onChange?.(key); }];
  return new Menu([
    { label: 'MUSIC', slider: bind('musicVolume'), min: 0, max: 1, step: 0.1, fmt: pct },
    { label: 'SOUNDS', slider: bind('sfxVolume'), min: 0, max: 1, step: 0.1, fmt: pct },
    { label: 'SCREEN SHAKE', toggle: bind('screenShake') },
    { label: 'TEAR HIGHLIGHT', toggle: bind('tearHighlight') },
    { label: 'FOUND HUD', toggle: bind('foundHud') },
    { label: 'ITEM INFO', choice: bind('itemInfo'), options: [['name', 'NAME'], ['text', 'NAME+TEXT'], ['detailed', 'DETAILED']] },
    { label: 'TOUCH AIM', choice: bind('freeAim'), options: [[false, '4-WAY'], [true, '8-WAY']] },
    { label: 'STICK SIZE', slider: bind('stickSize'), min: 80, max: 180, step: 10, fmt: (v) => `${v}` },
    { label: 'STICK OPACITY', slider: bind('stickOpacity'), min: 0.2, max: 1, step: 0.1, fmt: pct },
    { label: 'SHOW FPS', toggle: bind('showFps') },
    { label: 'UNLOCK ALL', toggle: bind('unlockAll') },
    { label: 'RESET PROGRESS', action: onReset },
    { label: 'BACK', action: onBack },
  ], { rowH: 11 });
}

// Short explanation shown under the settings list for the selected row.
export const SETTING_HINTS = {
  'TEAR HIGHLIGHT': 'ENEMY SHOTS GLOW SO THEY ARE EASY TO SPOT',
  'FOUND HUD': 'SHOW YOUR STATS ON THE LEFT OF THE SCREEN',
  'ITEM INFO': 'DETAILED: SEE WHAT AN ITEM DOES BEFORE TAKING IT',
  'TOUCH AIM': 'PHONE: SHOOT IN 4 DIRECTIONS OR ANY DIRECTION',
  'STICK SIZE': 'PHONE: SIZE OF THE THUMB STICKS',
  'STICK OPACITY': 'PHONE: HOW SOLID THE STICKS AND BUTTONS LOOK',
  'MUSIC': 'MUSIC VOLUME',
  'SOUNDS': 'SOUND EFFECTS VOLUME',
  'SCREEN SHAKE': 'SHAKE THE SCREEN ON HITS AND EXPLOSIONS',
  'UNLOCK ALL': 'TESTING: LOCKED CONTENT CAN APPEAR IN RUNS',
  'RESET PROGRESS': 'ERASE ALL UNLOCKS, STATS AND RECORDS',
};
