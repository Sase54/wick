// Boot: wires the display, input, title screen and game together and runs the loop.
import { createDisplay } from './engine/canvas.js';
import { startLoop } from './engine/loop.js';
import { Input } from './engine/input.js';
import { TouchControls } from './engine/touch.js';
import { loadSettings, saveSettings } from './engine/storage.js';
import { Game } from './game/game.js';
import { validateTemplate } from './game/room.js';
import { TitleScreen } from './ui/title.js';
import { audio } from './engine/audio.js';
import { SPECIAL_ROOMS } from './data/rooms.js';
import { VARIANTS } from './data/variants.js';
import { FLOORS } from './data/floors.js';
import { progress } from './game/progress.js';
import { popups } from './ui/unlockPopup.js';
import { loadPackArt } from './engine/packart.js';
import { onMinimap } from './ui/minimap.js';

// the sprites made from the asset packs (missing files just fall back to drawn art)
await loadPackArt();

const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const settings = loadSettings();
if (debug) settings.showFps = true;

// Persistent progress (unlocks, stats). Earned achievements show a popup.
progress.onUnlock((a) => popups.push(a));
progress.init(settings);

const display = createDisplay(document.getElementById('screen'));
const touch = new TouchControls(settings);
const input = new Input(touch);
const game = new Game({ input, settings, touch });
audio.init(settings);

// The app is either on the title screen or in a run.
const app = {
  screen: 'title',
  startRun(seed, character) {
    title.leave();
    app.screen = 'game';
    goFullscreen();
    game.newRun(seed, { character });
  },
  continueRun() {
    title.leave();
    app.screen = 'game';
    goFullscreen();
    if (!game.continueRun()) game.newRun();
  },
  toTitle() {
    app.screen = 'title';
    audio.playMusic('chapter1', { fallback: 'cellar' });
    title.enter();
  },
};
const title = new TitleScreen({ settings, touch, onStart: (seed, character) => app.startRun(seed, character), onContinue: () => app.continueRun() });

// On phones, starting a run goes fullscreen and locks landscape where the browser allows it
// (Android Chrome does; iPhone Safari doesn't, so there "Add to Home Screen" is the way).
function goFullscreen() {
  if (!touch.enabled || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

// Offline support (not when opened straight from a file).
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // Updates: check for a new version on load and whenever the game comes back to the front
  // (a home-screen app is rarely reloaded). When a new version takes over, reload right away
  // on the title screen; mid-run it loads the next time the game is opened.
  const hadController = !!navigator.serviceWorker.controller;
  let reg = null;
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((r) => { reg = r; }).catch(() => {}));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reg?.update().catch(() => {});
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && app.screen === 'title') location.reload();
  });
}
game.onQuit = () => app.toTitle();

touch.onRelease = (cx, cy, dx, dy) => {
  if (app.screen !== 'title') return;
  const v = display.toView(cx, cy), v0 = display.toView(cx - dx, cy - dy);
  title.release(v.x, v.y, v.x - v0.x, v.y - v0.y);
};

// a finger held on the minimap opens the big map
touch.isMapArea = (cx, cy) => {
  if (app.screen !== 'game') return false;
  const v = display.toView(cx, cy);
  return onMinimap(v.x, v.y);
};

touch.onTap = (cx, cy) => {
  const v = display.toView(cx, cy);
  if (app.screen === 'title') title.tap(v.x, v.y);
  else game.onTap(v.x, v.y);
};

audio.playMusic('chapter1', { fallback: 'cellar' }); // starts as soon as the first tap/key unlocks audio
if (params.has('play')) {
  app.startRun(params.get('seed') || undefined, params.get('char') || undefined);
  // ?debug&play&floor=3&variant=undercroft: start on that floor (and variant)
  if (debug && params.has('floor')) {
    const n = Math.max(1, Math.min(FLOORS.length, +params.get('floor')));
    if (params.get('variant')) game.forcedVariants[n] = params.get('variant');
    if (n > 1 || params.get('variant')) game.startFloor(n);
  }
}
else title.enter();

// --- browser chrome: no scrolling, zooming, selecting or context menus ---
const stop = (e) => e.preventDefault();
document.addEventListener('touchmove', stop, { passive: false });
document.addEventListener('gesturestart', stop);
document.addEventListener('dblclick', stop);
document.addEventListener('contextmenu', stop);

// --- portrait prompt (phones/tablets only) ---
const coarse = matchMedia('(pointer: coarse)');
function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth && (coarse.matches || touch.enabled);
  document.body.classList.toggle('portrait', portrait);
  if (portrait && app.screen === 'game') game.paused = true;
}
window.addEventListener('resize', checkOrientation);
checkOrientation();

// Save when the app is hidden or closed (phones kill background tabs without warning).
function saveNow() {
  if (app.screen === 'game') game.autosave();
  progress.flush();
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (app.screen === 'game') game.paused = true;
  saveNow();
});
window.addEventListener('pagehide', saveNow);
window.addEventListener('beforeunload', saveNow);

window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    settings.showFps = !settings.showFps;
    saveSettings(settings);
  }
  if (!debug || app.screen !== 'game') return;
  // Debug keys (only with ?debug in the URL)
  if (e.code === 'KeyM') game.revealMap();
  if (e.code === 'KeyO') game.openSecrets();
  if (e.code === 'KeyK') for (const en of [...game.enemies]) game.killEnemy(en);
  if (e.code === 'KeyI' && !game.debugMenu) game.openItemPicker();
  if (e.code === 'KeyG') game.player.coins = Math.min(99, game.player.coins + 10);
  if (e.code === 'KeyC') for (const s of [game.player.active, game.player.pocket]) if (s) s.charge = 99;
  // J: one of each pocket thing, a trinket, a battery and a random chest at your feet
  if (e.code === 'KeyJ') { const p = game.player; for (const k of ['pill', 'card', 'rune', 'stone', 'trinket', 'battery']) game.spawnPickup(k, p.x, p.y); game.dropChest('any', p.x, p.y - 30); }
  // N: skip to the next floor, B: jump to this floor's boss room
  if (e.code === 'KeyN' && game.floorNum < FLOORS.length) game.startFloor(game.floorNum + 1);
  if (e.code === 'KeyB') game.teleportTo([...game.floor.cells.values()].find((c) => c.type === 'boss'));
  // L: the whole floor plan (hidden rooms, dead ends, distances, seed)
  if (e.code === 'KeyL') game.toggleDebugFloorMap();
  // H: show / hide every hitbox (same as Settings > SHOW HITBOXES)
  if (e.code === 'KeyH') { settings.showHitboxes = !settings.showHitboxes; saveSettings(settings); }
  // V: jump to any floor variant
  if (e.code === 'KeyV') game.openDebugJump();
});

if (debug) {
  const all = new Set([...Object.values(VARIANTS).flatMap((v) => v.rooms), ...Object.values(SPECIAL_ROOMS)]);
  for (const t of all) {
    const problems = validateTemplate(t);
    if (problems.length) console.warn(`Room "${t.id}": ${problems.join('; ')}`);
  }
}

let fpsAcc = 0, fpsFrames = 0;
startLoop({
  frameStart: () => input.poll(),
  update: (dt) => {
    if (app.screen === 'title') title.update(dt, input);
    else game.update(dt);
    popups.update(dt);
  },
  render: (dt) => {
    fpsAcc += dt;
    fpsFrames++;
    if (fpsAcc >= 0.5) { game.fps = fpsFrames / fpsAcc; fpsAcc = 0; fpsFrames = 0; }
    if (app.screen === 'title') title.render(display.ctx);
    else game.render(display.ctx);
    popups.render(display.ctx);
  },
  frameEnd: () => input.endFrame(),
});

// Handy for debugging in the console.
window.WICK = { game, input, touch, settings, app, title, progress, popups };
