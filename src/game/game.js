// One run of the game: owns the floor, the current room, the player, enemies, shots and effects.
import { RNG, randomSeedString } from '../engine/rng.js';
import { Particles } from '../engine/particles.js';
import { makeCanvas, makeGlow } from '../engine/sprites.js';
import { UI_X, UI_Y } from '../engine/canvas.js';
import { loadStore, saveStore, clearStore } from '../engine/storage.js';
import { progress } from './progress.js';
import { serializeRun, restoreRun } from './save.js';
import { CHARACTERS, DEFAULT_CHARACTER } from '../data/characters.js';
import { Floor } from './floor.js';
import { shapeSlots, doorwayTiles } from './shapes.js';
import { drawDebugFloorMap } from '../ui/debugmap.js';
import { Player } from './player.js';
import { Projectiles } from './projectiles.js';
import { Effects } from './effects.js';
import { Enemy, populateRoom, computeFlow, clearEntry, enemyPicture } from './enemies.js';
import { drawDoor } from './door.js';
import { Pickup, pickupIcon } from './pickups.js';
import { Bomb, BOMB_RADIUS, BOMB_DAMAGE } from './bombs.js';
import { ItemPools, Pedestal, itemDef, itemIcon, applyItemPickup, applyHearts } from './items.js';
import { TRANSFORMATIONS } from '../data/transformations.js';
import { Orbital, Familiar, Gnat } from './followers.js';
import { Helper } from './familiars.js';
import { ACTIVE_EFFECTS } from './actives.js';
import { Shopkeeper, stockShop } from './shop.js';
import { createBoss } from './bosses/index.js';
import { BOSSES, BOSS_POOLS, FINAL_BOSS, BOSS_CHAMPIONS } from '../data/bosses.js';
import { FLOORS, ROMAN } from '../data/floors.js';
import { VARIANTS, CHAPTERS, variantsFor } from '../data/variants.js';
import { Ambience } from './ambience.js';
import { placeHazards, updateCreep, renderCreep } from './hazards.js';
import { Trapdoor } from './trapdoor.js';
import { SPECIAL_TYPES } from '../data/specialRooms.js';
import { ITEMS } from '../data/items.js';
import { CURSES, CURSE_CHANCE } from '../data/curses.js';
import { drawRoomDecor } from './roomdecor.js';
import { ItemPicker } from '../ui/itemPicker.js';
import { Machine } from './machines.js';
import { ROOM_MUSIC } from '../data/music.js';
import { WANDERERS, WANDERER_CHANCE } from '../data/machines.js';
import { populateSpecialRoom, updateWaves, startWaves, chooseSpecials, maybeOpenDeal, openSideRoom, maybeErrorRoom, canPay, pay, loadProp, addProp, Hatch, Chest, rollChest, randomPickup } from './specials.js';
import { Crawlspace } from './crawlspace.js';
import { CONSUMABLE_FX, fillPickup, takeConsumable, takeTrinket, usePocket, switchPocket, setupPills, absorbTrinket } from './consumables.js';
import { Menu } from '../ui/menu.js';
import { drawWaxPanel, inkAlpha, INK } from '../ui/wax.js';
import { BLOOD, ENEMIES, enemyDef } from '../data/enemies.js';
import { DROP_TABLES, KEY_PITY_ROOMS, SOOT_BLAST_DAMAGE, HEART_KINDS } from '../data/pickups.js';
import { PAL } from '../data/palette.js';
import { VIEW_W, VIEW_H, ROOM_X, ROOM_Y, ROOM_W, ROOM_H, T, DIRS } from './constants.js';
import { TUNING } from '../data/tuning.js';
import { drawHud } from '../ui/hud.js';
import { PauseScreen } from '../ui/pause.js';
import { weaponEnterRoom } from './weapons.js';
import { audio, sfx } from '../engine/audio.js';
import { drawText } from '../ui/text.js';

const TRANSITION_TIME = TUNING.camera.transition;
const DEATH_TIME = TUNING.player.meltTime + TUNING.player.deathPause;   // melt, then a short pause
// beat The Chandler within this many seconds of the run (and own the unlock) for the boss rush
const BOSS_RUSH_TIME = 22 * 60;
// double bosses: from this chapter on, this chance that a floor's boss comes as a pair
const DOUBLE_BOSS_CHAPTER = 3;
const DOUBLE_BOSS_CHANCE = 0.25;
// boss champions: from this floor on, this chance (+ per floor) for a floor boss to be a champion
const BOSS_CHAMPION_FLOOR = 3;
const BOSS_CHAMPION_CHANCE = 0.1;

let vignette = null;
// Soft glow for room light sources (wall candles), cached by size and color.
const lightGlows = new Map();
function getLightGlow(r, color) {
  const k = r + color;
  if (!lightGlows.has(k)) lightGlows.set(k, makeGlow(r, color));
  return lightGlows.get(k);
}
function getVignette() {
  if (vignette) return vignette;
  const [c, ctx] = makeCanvas(VIEW_W, VIEW_H);
  // an ellipse that fits the screen, so the corners darken evenly on a wide screen
  const L = TUNING.lighting;
  ctx.translate(VIEW_W / 2, VIEW_H / 2);
  ctx.scale(1, VIEW_H / VIEW_W);
  const g = ctx.createRadialGradient(0, 0, (VIEW_W / 2) * L.vignetteInner, 0, 0, VIEW_W * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${L.vignette})`);
  ctx.fillStyle = g;
  ctx.fillRect(-VIEW_W, -VIEW_W, VIEW_W * 2, VIEW_W * 2);
  vignette = c;
  return c;
}

// Red screen edges for low health (faded in and out by the heartbeat).
let redEdges = null;
function getRedEdges() {
  if (redEdges) return redEdges;
  const [c, ctx] = makeCanvas(VIEW_W, VIEW_H);
  ctx.translate(VIEW_W / 2, VIEW_H / 2);
  ctx.scale(1, VIEW_H / VIEW_W);
  const g = ctx.createRadialGradient(0, 0, VIEW_W * 0.42, 0, 0, VIEW_W * 0.72);
  g.addColorStop(0, 'rgba(160,10,10,0)');
  g.addColorStop(1, 'rgba(170,12,12,1)');
  ctx.fillStyle = g;
  ctx.fillRect(-VIEW_W, -VIEW_W, VIEW_W * 2, VIEW_W * 2);
  redEdges = c;
  return c;
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// A blotchy stain on the floor where something died.
function splat(g, x, y, size, colors) {
  const n = 3 + Math.floor(size / 3);
  for (let i = 0; i < n; i++) {
    const cx = x + (Math.random() - 0.5) * size * 1.6;
    const cy = y + (Math.random() - 0.5) * size * 0.9;
    const r = 1 + Math.random() * size * 0.45;
    g.fillStyle = colors[i % colors.length];
    g.globalAlpha = 0.55;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      g.fillRect(Math.round(cx - half), Math.round(cy + dy * 0.6), half * 2, 1);
    }
  }
  g.globalAlpha = 1;
}

export class Game {
  constructor({ input, settings, touch }) {
    this.input = input;
    this.settings = settings;
    this.touch = touch;
    this.fps = 60;
    this.drawList = [];
    this.pause = new PauseScreen(this);
    this.onQuit = null; // set by the app: back to the title screen
    this.victoryMenu = new Menu([
      { label: 'NEW RUN', action: () => this.newRun() },
      { label: 'MAIN MENU', action: () => this.onQuit?.() },
    ], { rowH: 14 });
  }

  get boss() { return this.room?.boss || this.room?.extraBosses?.find((b) => !b.dead) || null; }
  // every boss in the room (boss waves and double bosses bring more than one)
  get bosses() {
    const r = this.room;
    if (!r) return [];
    const list = r.boss ? [r.boss] : [];
    if (r.extraBosses) for (const b of r.extraBosses) if (!b.dead) list.push(b);
    return list;
  }

  // Anything outside (visibility change, portrait mode) can pause the game.
  get paused() { return this.pause.visible; }
  set paused(v) {
    if (v && this.state === 'play') this.pause.open();
    else if (!v) this.pause.closeNow();
  }

  // fresh: a brand new run (counts as a run, gets saved); false when rebuilding a saved run
  // character: id from src/data/characters.js (a retry keeps the current one)
  newRun(seed = randomSeedString(), { character = this.characterId || DEFAULT_CHARACTER, fresh = true, variants = {}, bosses = {} } = {}) {
    this.forcedVariants = { ...variants };
    this.variantLog = {};
    this.characterId = CHARACTERS[character] ? character : DEFAULT_CHARACTER;
    this.seed = seed;
    this.rng = new RNG(seed);
    this.player = new Player(ROOM_X + ROOM_W / 2, ROOM_Y + ROOM_H / 2, CHARACTERS[this.characterId], this.characterId);
    this.lootRng = this.rng.fork('loot');
    // locked items never show up (see src/data/unlocks.js)
    this.itemPools = new ItemPools(this.rng.fork('items'), (id) => progress.isUnlocked('item', id));
    for (const id of this.player.items) this.itemPools.taken.add(id);
    if (fresh) progress.event('runStart', { character: this.characterId });
    // Bosses are picked as each floor starts (see bossFor), so the floor's variant can favor
    // a boss that fits it. bossLog keeps them for save & continue.
    this.bossLog = { ...bosses };
    this.orbitals = [];
    this.familiars = [];
    this.trail = [];
    this.slowT = 0;
    this.enemyTimeScale = 1;
    this.flashT = 0;
    this.projectiles = new Projectiles(this);
    this.particles = new Particles();
    this.effects = new Effects();
    this.stats = { kills: 0, damageTaken: 0, time: 0, items: [], bossKilled: false, bosses: 0, rooms: 0 };
    this.bossIntro = null;
    this.state = 'play';     // play | dying | gameover | descend | victory
    this.stateT = 0;
    this.shakeAmount = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.hurtFlash = 0;
    this.time = 0;
    this.pause.closeNow();
    this.transition = null;
    this.flowKey = '';
    this.touch.setMenuMode(false);
    this.floor = null;
    this.gnats = [];
    this.sentries = [];
    this.floorDamage = 0;
    // run-wide special room bookkeeping (deals, skipped treasure rooms, the planetarium...)
    this.runFlags = {};
    this.devilTaken = false;
    // pocket things: this run's pill colors, and trinkets already seen (so they don't repeat)
    setupPills(this);
    this.trinketsSeen = new Set();
    this.pillDarkT = 0;
    this.crawl = null;
    // character mechanics set themselves up (Motley rolls its loadout here)
    this.room = null;
    this.player.runMech('init', this);
    this.syncFollowers();
    this.startFloor(1);
  }

  // Everything that gets hurt like the player: the candle plus twins and echoes.
  playerBodies() {
    const p = this.player;
    return [p, ...p.mechList('bodies', this)];
  }

  // A Soot Heart was lost: everything in the room takes a big hit.
  sootBlast(x, y) {
    sfx('explosion', { big: true });
    this.shake(7);
    this.flashT = 0.2;
    this.effects.ring(x, y, 90, '#5a2a6a', 0.5, 12);
    this.particles.burst(x, y - 6, 40, { colors: ['#1c1418', '#3a3038', '#ff7a3a'], speed: 150, z: 10, vz: 80, life: 0.8 });
    for (const e of [...this.enemies]) if (e.hittable) e.takeHit(SOOT_BLAST_DAMAGE, 0, 0, 0, this);
    for (const b of this.bosses) if (b.hittable) b.takeHit(SOOT_BLAST_DAMAGE, this);
  }

  // Which variant floor n uses: random among the chapter's ready and unlocked variants
  // (rolled from the seed, so a seed always gives the same floors).
  pickVariant(n) {
    const def = FLOORS[n - 1];
    const forced = this.forcedVariants?.[n];
    if (forced && VARIANTS[forced]) return VARIANTS[forced];
    const ids = variantsFor(def.chapter, (id) => progress.isUnlocked('variant', id));
    return VARIANTS[this.rng.fork('variant:' + n).pick(ids)];
  }

  // The boss of floor n: from the chapter's pool, weighted toward bosses that fit the floor's
  // variant, never one already met this run while others remain; the last floor gets the final boss.
  // From chapter 3 on, a floor's boss is sometimes a pair ("a+b"): both at once, at reduced health.
  // own: the first of a Sprawl floor's two boss rooms, which holds the floor's own boss.
  bossFor(n, own = false) {
    const key = own ? `${n}a` : n;
    if (this.bossLog[key]) return this.bossLog[key];
    // the current floor may have changed its boss (the Sprawl curse takes the next floor's)
    const def = !own && n === this.floorNum && this.floorDef ? this.floorDef : FLOORS[n - 1];
    let id = FINAL_BOSS;
    if (def.giant) id = def.giant;
    else if (!def.final) {
      const vid = this.variant?.id;
      const pool = (BOSS_POOLS[def.chapter] || BOSS_POOLS[1]).filter((b) => !BOSSES[b].variants || BOSSES[b].variants.includes(vid));
      const used = new Set(Object.values(this.bossLog).flatMap((v) => v.split('+')));
      const fresh = pool.filter((b) => !used.has(b));
      const bias = this.variant?.bossBias || {};
      const r = this.rng.fork('boss:' + key);
      const pick = (list) => r.weighted(list.map((b) => ({ id: b, weight: bias[b] || 1 }))).id;
      id = pick(fresh.length ? fresh : pool);
      if (def.chapter >= DOUBLE_BOSS_CHAPTER && r.chance(DOUBLE_BOSS_CHANCE)) {
        const rest = (fresh.length > 1 ? fresh : pool).filter((b) => b !== id);
        if (rest.length) id = `${id}+${pick(rest)}`;
      }
    }
    this.bossLog[key] = id;
    return id;
  }

  // Floor n's boss is sometimes a champion (src/data/bosses.js BOSS_CHAMPIONS): from floor 3,
  // likelier deeper, never a giant or the final boss.
  bossChampion(n) {
    const def = this.floorDef;
    if (n < BOSS_CHAMPION_FLOOR || def.giant || def.final) return null;
    const r = this.rng.fork('bchamp:' + n);
    if (!r.chance(BOSS_CHAMPION_CHANCE + (n - BOSS_CHAMPION_FLOOR) * 0.03)) return null;
    return r.pick(Object.keys(BOSS_CHAMPIONS));
  }

  // Floor n's curse, if any (src/data/curses.js): never on the first floor or the finale.
  // The Sprawl only lands on the first floor of a chapter, so it has a second floor to swallow.
  pickCurse(n) {
    const def = FLOORS[n - 1];
    if (n < 2 || def.final) return null;
    const r = this.rng.fork('curse:' + n);
    if (!r.chance(CURSE_CHANCE)) return null;
    const next = FLOORS[n];
    const ok = Object.keys(CURSES).filter((id) => !CURSES[id].odd
      || (next && next.chapter === def.chapter && !next.final && n + 2 <= FLOORS.length));
    return r.pick(ok);
  }

  // Build floor n of the run and drop the player into its start room.
  startFloor(n) {
    if (this.floor && !this.rearranging) {
      this.stats.rooms += [...this.floor.cells.values()].filter((c) => c.visited).length;
      if (!this.floorDamage && !this.restoring) progress.event('noHitFloor');
      // a lone Vigil half heart turns into a new container
      if (this.player.health.floorStart()) this.particles.burst(this.player.x, this.player.y - 8, 16, { colors: ['#ffffff', '#efe6cc'], speed: 60, z: 10, vz: 60 });
      if (this.floorNum !== n) {
        // a treasure room left unopened makes a planetarium likelier later
        const cells = [...this.floor.cells.values()];
        if (cells.some((c) => c.type === 'treasure' && !c.visited)) this.runFlags.treasureSkipped = (this.runFlags.treasureSkipped || 0) + 1;
        // a bargain seen and passed up opens the way to The Vigil
        if (cells.some((c) => c.type === 'devil' && c.visited) && this.runFlags.devilBoughtOn !== this.floorNum) this.runFlags.devilPassed = true;
      }
    }
    this.floorDamage = 0;
    this.floorRedHit = false;
    this.bossRedHit = false;
    this.floorNum = n;
    const def = FLOORS[n - 1];
    this.variant = this.pickVariant(n);
    this.variantLog[n] = this.variant.id;
    const inChapter = FLOORS.slice(0, n - 1).filter((f) => f.chapter === def.chapter).length;
    this.floorDef = { ...def, floorNum: n, name: def.title || `${this.variant.name} ${ROMAN[inChapter] || ''}`.trim(), variant: this.variant.id };
    // a curse, sometimes (src/data/curses.js)
    this.curse = this.pickCurse(n);
    if (this.curse === 'labyrinth') {
      // the Sprawl: this floor swallows the next one: bigger, and its boss is the next floor's
      const next = FLOORS[n];
      // (twice the rooms and two boss rooms back to back: this floor's boss, then the next one's)
      Object.assign(this.floorDef, {
        labyrinth: true, ownBossHp: def.bossHp, ownBossTier: def.bossTier,
        name: `${this.variant.name} XL`, skipTo: n + 2,
        giant: next.giant, bossHp: next.bossHp, bossTier: next.bossTier, threat: next.threat, enemyHp: next.enemyHp,
      });
    }
    this.player.curseRange = this.curse === 'shortwick' ? 0.7 : 1;
    Pedestal.veiled = this.curse === 'blind';
    this.darkK = 0;
    this.player.recompute();
    this.floorDef.lost = this.curse === 'lost';
    // which special rooms: rolled from how you're doing as you arrive (a continued run reuses
    // the saved list so the floor comes out the same)
    const restoring = this.restoreFloor;
    this.restoreFloor = null;
    if (!this.rearranging) this.rearrangeCount = restoring?.rearranged || 0;
    this.floorDef.specials = restoring?.specials || chooseSpecials(this, n, def, { labyrinth: this.curse === 'labyrinth' });
    // (the die's five rebuilds the floor with new rooms: a fresh layout each time)
    this.floor = new Floor(this.rng.fork('floor:' + n + (this.rearrangeCount ? ':' + this.rearrangeCount : '')), this.floorDef, this.variant);
    // one rock on some floors hides a ladder down into a crawlspace
    this.crawl = this.pickCrawlspace(n);
    // maybe a beggar or a machine waits in one plain room (src/data/machines.js)
    const wr = this.rng.fork('wander:' + n);
    const plain = [...this.floor.cells.values()].filter((c) => c.type === 'normal');
    this.wanderCell = plain.length && wr.chance(WANDERER_CHANCE) ? wr.pick(plain).key : null;
    this.wanderType = wr.weighted(WANDERERS.filter((w) => !w.minFloor || n >= w.minFloor)).id;
    if (this.player.items.some((id) => ITEMS[id]?.revealMap)) this.floor.revealAll();
    this.ambience = new Ambience(this.variant.particles);
    this.keySeen = false;
    this.roomsCleared = 0;
    // Items for this floor's special rooms are rolled up front, so a seed always
    // offers the same items no matter which order you explore in.
    this.floorLoot = {
      treasure: this.itemPools.draw('treasure'),
      shop: [this.itemPools.draw('shop'), this.itemPools.draw('shop')],
      secret: this.itemPools.draw('secret'),
      boss: this.itemPools.draw('boss'),
    };
    this.state = 'play';
    this.stateT = 0;
    this.arriveT = 0;
    this.banner = null;
    // the floor title card: name, chapter and what's special about it
    this.floorCard = {
      t: 0, dur: 2.6,
      title: this.floorDef.name,
      sub: `CHAPTER ${def.chapter}: ${CHAPTERS[def.chapter]?.name || ''}`,
      foot: n === 1 ? `SEED ${this.seed}` : `FLOOR ${n} OF ${FLOORS.length}`,
      curse: this.curse ? CURSES[this.curse].name : null,
    };
    this.slowT = 0;
    this.player.vx = this.player.vy = 0;
    this.updateMusic();
    this.enterCell(this.floor.start, null);
    progress.event('floorReached', { floor: n, chapter: this.floorDef.chapter, character: this.characterId });
    this.autosave();
  }

  get enemies() { return this.room.enemies; }

  // Everything that player helpers can hit: enemies plus the boss's hit circles.
  targets() {
    const list = this.enemies.filter((e) => e.hittable);
    for (const b of this.bosses) for (const c of b.hitCircles()) list.push({ x: c.x, y: c.y, r: c.r, boss: b, hittable: true });
    return list;
  }
  get pickups() { return this.room.pickups; }
  get bombs() { return this.room.bombs; }

  // Make `cell` the current room. `slotKey`: the door slot of the new room we walk in through
  // (null when placed at the start or teleported).
  enterCell(cell, slotKey = null) {
    this.cell = cell;
    this.room = this.floor.roomFor(cell);
    if (cell.type === 'secret') {
      // Once you're inside, every way out of the secret room is visible.
      for (const door of Object.values(cell.doors)) door.hidden = false;
    }
    populateRoom(this, cell);
    this.populateSpecial(cell);
    placeHazards(this, cell);
    // the Restless curse: the dead sometimes come back to rooms you already cleared
    if (this.curse === 'restless' && cell.visited && cell.type === 'normal' && this.room.cleared && !this.restoring && this.lootRng.chance(0.3)) this.wakeRestless();
    if (cell.type === 'secret' && !cell.visited && !this.restoring) progress.event('secretFound');
    // special rooms announce themselves the first time
    const st = SPECIAL_TYPES[cell.type];
    if (st?.name && !cell.visited && !this.restoring) this.banner = { text: st.name, sub: '', t: 0, dur: 2.2 };
    // a card's buff lasts one room
    this.player.roomDamage = 0;
    if (this.player.roomBuffs?.length) { this.player.roomBuffs = []; this.player.recompute(); }
    for (const [k, m] of Object.entries(this.player.mech)) if (m.roomTemp) delete this.player.mech[k];
    this.floor.visit(cell);
    this.projectiles.clear();
    this.particles.clear();
    this.effects.clear();
    for (const door of Object.values(cell.doors)) {
      door.closed = !this.room.cleared;
      door.snap();
      if (door.closed) door.anim = 1; // visibly slam shut
    }
    if (!this.room.cleared) setTimeout(() => sfx('doorClose'), slotKey ? 250 : 0);

    const p = this.player;
    const slot = slotKey && this.room.slots.find((s) => s.key === slotKey);
    if (slot) {
      const [dx, dy] = DIRS[slot.dir];
      p.x = slot.x - dx * (p.r + 12);
      p.y = slot.y - dy * (p.r + 12);
      p.vx *= 0.5;
      p.vy *= 0.5;
    } else {
      const spot = this.room.findFreeSpot(this.room.centerX, this.room.centerY + 20);
      p.x = spot.x;
      p.y = spot.y;
    }
    // nothing starts on top of you
    if (!this.room.cleared) clearEntry(this, p.x, p.y);
    this.updateCamera(0, true);
    // Helpers come along; a Tallow Twin only lasts one room.
    this.familiars = this.familiars.filter((f) => !f.temp);
    this.familiars.forEach((f) => f.place(p.x, p.y));
    this.trail = [];
    this.sentries = [];
    this.orbitals = this.orbitals.filter((o) => !o.temp);
    for (const gn of this.gnats) { gn.x = p.x + (Math.random() - 0.5) * 20; gn.y = p.y; gn.target = null; }
    weaponEnterRoom(p);
    p.runMech('enterRoom', this);
    for (const e of this.enemies) {
      if (e.spawnT > 0) this.particles.burst(e.x, e.y, 6, { colors: ['#1a1210', '#2a201a'], speed: 25, z: 4, vz: 30, life: 0.5 });
    }
  }

  // The music for right now (src/data/music.js): a boss fight, a special room, the crawlspace, or
  // the chapter (a music file, else the floor variant's own generated track with the chapter's
  // heavy layer on top). Called every frame; asking for the playing track again does nothing.
  updateMusic() {
    if (this.state === 'gameover' || this.state === 'victory') return;
    if (this.bosses.length && !this.bossIntro) { audio.playMusic(this.floorDef.final ? 'final' : 'boss'); return; }
    const room = this.crawlspace ? 'secret' : ROOM_MUSIC[this.cell?.type];
    if (room) { audio.playMusic(room); return; }
    const ch = Math.min(4, this.floorDef.chapter);
    audio.playMusic(`chapter${ch}`, { fallback: this.variant.music, transpose: this.variant.transpose, chapter: ch });
  }

  shake(amount) {
    if (!this.settings.screenShake) return;
    this.shakeAmount = Math.min(8, Math.max(this.shakeAmount, amount));
  }

  // ---------------------------------------------------------------------------
  update(dt) {
    const input = this.input;
    if (this.state === 'gameover') return this.updateGameOver(dt);
    if (this.state === 'victory') return this.updateVictory(dt);

    if (this.pause.visible) {
      this.pause.update(dt, input);
      return;
    }
    if (this.debugFloorMap) {
      if (input.consume('back') || input.consume('pause') || input.consume('confirm')) this.toggleDebugFloorMap(false);
      return;
    }
    if (this.debugMenu) {
      if (input.consume('back') || input.consume('pause')) this.debugMenu = null;
      else this.debugMenu.update(dt, input);
      return;
    }
    const pausePressed = input.consume('pause');
    input.consume('back');
    if (pausePressed && this.state === 'play') {
      this.pause.open();
      return;
    }

    this.time += dt;
    this.updateMusic();
    if (this.banner) this.banner.t += dt;
    // a new transformation waits for the item banner to be read first
    const nt = this.player.newTransforms;
    if (nt?.length && this.state === 'play' && (!this.banner || this.banner.t > 2.2)) this.announceTransform(nt.shift());
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.arriveT = Math.max(0, (this.arriveT || 0) - dt * 1.2);
    this.updateShake(dt);

    if (this.state === 'dying') {
      this.stateT += dt;
      this.player.time += dt;
      this.particles.update(dt);
      this.effects.update(dt);
      this.projectiles.update(dt);
      if (this.stateT > 0.5 && this.stateT < 1.6 && Math.random() < dt * 14) {
        this.particles.spawn(this.player.x + (Math.random() - 0.5) * 4, this.player.y, {
          z: 10, vz: 18 + Math.random() * 10, vx: (Math.random() - 0.5) * 8, life: 1.2, size: 2, color: Math.random() < 0.5 ? '#3a3430' : '#5a524a',
        });
      }
      if (this.stateT >= DEATH_TIME) this.enterGameOver();
      return;
    }

    if (this.transition) {
      this.transition.t += dt;
      if (this.transition.t >= TRANSITION_TIME) this.transition = null;
      this.player.time += dt;
      return;
    }
    if (this.crawlspace) {
      this.stats.time += dt;
      this.crawlspace.update(dt, input);
      return;
    }

    if (this.state === 'descend') {
      this.stateT += dt;
      this.player.time += dt;
      this.particles.update(dt);
      if (this.stateT >= 1.4) {
        if (this.floorDef.final) this.enterVictory();
        else this.startFloor(this.floorDef.skipTo || this.floorNum + 1);
      }
      return;
    }

    if (this.floorCard) {
      // The floor title card. Any button skips it after a moment.
      const fc = this.floorCard;
      fc.t += dt;
      // the card doubles as a loading screen: build the floor's rooms a couple per frame
      let built = 0;
      for (const c of this.floor.cells.values()) {
        if (c.room) continue;
        this.floor.roomFor(c);
        if (++built >= 2) break;
      }
      this.player.time += dt;
      if (fc.t > 0.7 && (input.consume('confirm') || input.consume('active') || input.consume('bomb') || input.consume('tap'))) fc.t = Math.max(fc.t, fc.dur - 0.35);
      if (fc.t >= fc.dur) this.floorCard = null;
      return;
    }

    if (this.bossIntro) {
      // "Wick vs The Old Boiler" card. Any button skips it after a moment.
      const bi = this.bossIntro;
      bi.t += dt;
      this.player.time += dt;
      for (const b of this.bosses) b.update(0, this);
      if (bi.t > 0.8 && (input.consume('confirm') || input.consume('active') || input.consume('bomb'))) bi.t = bi.dur;
      if (bi.t >= bi.dur) {
        this.bossIntro = null;
        for (const b of this.bosses) b.toIdle();
        this.updateMusic();
        this.onBossStart?.();
      }
      return;
    }

    this.stats.time += dt;
    const p = this.player;
    p.update(dt, this);
    if (input.consume('bomb') && p.bombs > 0 && !p.dead) {
      p.bombs--;
      const bomb = new Bomb(p.x, p.y + 2);
      bomb.radius = BOMB_RADIUS * p.bombMods.radiusMul;
      bomb.damage = BOMB_DAMAGE * p.bombMods.damageMul;
      bomb.big = p.bombMods.radiusMul > 1.2;
      this.bombs.push(bomb);
      sfx('bombPlace');
    }
    if (input.consume('active')) this.useActive('active');
    if (input.consume('pocket')) usePocket(this);
    if (input.consume('switch')) switchPocket(this);
    // the phone's PKT and SWAP buttons show only when they'd do something
    const inPocket = (p.pocket ? 1 : 0) + p.consumables.length;
    if (inPocket !== this.pocketCount) {
      this.pocketCount = inPocket;
      document.body.classList.toggle('has-pocket', inPocket > 0);
      document.body.classList.toggle('has-swap', inPocket > 1);
    }
    this.chargeTimed(dt);
    this.recordTrail();
    this.assistDoors(dt);
    this.updateFlow();
    this.slowT = Math.max(0, this.slowT - dt);
    this.pillDarkT = Math.max(0, (this.pillDarkT || 0) - dt);
    this.enemyTimeScale = this.slowT > 0 ? 0.35 : 1;
    for (const e of this.enemies) e.update(dt * this.enemyTimeScale, this);
    for (const b of this.bosses) {
      b.chillT = Math.max(0, (b.chillT || 0) - dt);
      b.update(dt * this.enemyTimeScale * (b.chillT > 0 ? 0.6 : 1), this);   // chilled by freezing shots
    }
    for (const o of this.orbitals) o.update(dt, this);
    if (this.orbitals.some((o) => o.dead)) this.orbitals = this.orbitals.filter((o) => !o.dead);
    for (const f of this.familiars) f.update(dt, this);
    if (this.familiars.some((f) => f.dead)) this.familiars = this.familiars.filter((f) => !f.dead);
    for (const s of this.sentries) s.update(dt, this);
    if (this.sentries.some((s) => s.dead)) this.sentries = this.sentries.filter((s) => !s.dead);
    for (const gn of this.gnats) gn.update(dt, this);
    if (this.gnats.some((gn) => gn.dead)) this.gnats = this.gnats.filter((gn) => !gn.dead);
    for (const h of this.room.hazards) h.update(dt, this);
    // special rooms: props (spike, die, beds, machines, chests, statues, hatches) and waves
    if (this.room.props) {
      for (const pr of this.room.props) pr.update(dt, this);
      if (this.room.props.some((pr) => pr.dead)) this.room.props = this.room.props.filter((pr) => !pr.dead);
    }
    updateWaves(this, dt);
    if (this.rebuildFloor) { this.rebuildFloor = false; this.rearrangeFloor(); return; }
    if (this.room.hazards.some((h) => h.dead)) this.room.hazards = this.room.hazards.filter((h) => !h.dead);
    updateCreep(this, dt);
    this.ambience.update(dt, this);
    this.updatePedestals(dt);
    this.room.keeper?.update(dt);
    this.separateEnemies();
    this.contactDamage();
    for (const b of this.bombs) {
      b.update(dt, this);
      // Walk into a bomb to push it (once you've stepped off it).
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), rr = b.r + p.r;
      if (b.age > 0.5 && d < rr && d > 0.01) {
        b.vx += (dx / d) * 50;
        b.vy += (dy / d) * 50;
      }
    }
    if (this.bombs.some((b) => b.done)) this.room.bombs = this.bombs.filter((b) => !b.done);
    this.updatePickups(dt);
    this.projectiles.update(dt);
    this.particles.update(dt);
    this.effects.update(dt);
    if (this.enemies.some((e) => e.dead)) this.room.enemies = this.enemies.filter((e) => !e.dead);
    if (!this.room.cleared && this.enemies.length === 0 && !this.bosses.length && !this.room.waves && !this.room.waitWaves) this.onRoomCleared();
    // challenge doors only open while your red hearts are full (from the outside)
    const h = this.player.health, full = h.red >= h.containers * 2;
    for (const door of Object.values(this.cell.doors)) {
      if (door.lock === 'health') door.gated = !full && this.cell.type !== 'challenge' && this.cell.type !== 'bosschallenge';
    }
    for (const door of Object.values(this.cell.doors)) door.update(dt);
    const td = this.room.trapdoor;
    if (td) {
      td.update(dt);
      if (td.ready && !p.dead && Math.hypot(p.x - td.x, p.y - td.y) < 8) this.enterTrapdoor();
    }
    this.room.redraw();
    this.updateLowHealth(dt);
    this.updateCamera(dt);
    if (!p.dead) this.checkExit();
  }

  // The camera follows the player through big rooms (one-screen rooms never scroll). A room smaller
  // than the screen is centered in it.
  updateCamera(dt, snap = false) {
    const p = this.player, room = this.room, C = TUNING.camera;
    const fit = (size, view, want) => (size <= view ? (size - view) / 2 : Math.max(0, Math.min(size - view, want)));
    const tx = fit(room.worldW, VIEW_W, p.x - VIEW_W / 2);
    const ty = fit(room.worldH, VIEW_H, p.y - C.lookAhead - VIEW_H / 2);
    this.cam ??= { x: 0, y: 0 };
    if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
    const k = Math.min(1, dt * C.follow);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
  }

  // ---------------------------------------------------------------------------
  // Boss, trapdoor, victory

  onBossDefeated(boss) {
    const room = this.room;
    // wave bosses (challenge rooms, boss rush) report to their wave instead
    if (boss.onDefeat) { this.removeBoss(boss); boss.onDefeat(this, boss); return; }
    // a double boss: the reward only comes when the last one falls
    this.removeBoss(boss);
    if (this.bosses.length) {
      progress.event('bossKilled', { id: boss.id });
      this.shake(6);
      this.particles.burst(boss.x, boss.y - 8, 30, { colors: ['#9a9aa4', '#f08a24', '#ffd25a'], speed: 120, z: 14, vz: 100, life: 0.9 });
      sfx('explosion', { big: true });
      return;
    }
    room.boss = null;
    room.bossDone = true;
    this.stats.bossKilled = true;
    for (const e of [...this.enemies]) this.killEnemy(e);
    this.shake(8);
    this.flashT = 0.3;
    this.effects.disc(boss.x, boss.y, 40, 'rgba(255,230,160,0.95)', 0.2);
    this.effects.ring(boss.x, boss.y, 70, '#f08a24', 0.5, 10);
    this.particles.burst(boss.x, boss.y - 8, 50, { colors: ['#9a9aa4', '#6a6a74', '#2a2a30', '#f08a24', '#ffd25a'], speed: 150, z: 14, vz: 120, sizeVar: 3, life: 1.1 });
    room.paintDecal((g) => splat(g, boss.x, boss.y + 6, 22, ['#0e0a08', '#1a1210', '#3a2416']));
    const cx = room.centerX, cy = room.centerY;
    if (this.cell.firstBoss) {
      // the first of two boss rooms: an item, and the way on to the second
      this.floorLoot.boss2 ??= this.itemPools.draw('boss');
      const at = room.findFreeSpot(cx, cy - 22);
      room.pedestals.push(new Pedestal(at.x, at.y, this.floorLoot.boss2));
      this.stats.bosses++;
      progress.event('bossKilled', { id: boss.id });
      this.spawnPickup('heart', boss.x, boss.y);
      this.banner = { text: `${boss.name} IS DOWN`, sub: 'SOMETHING WORSE WAITS BEYOND...', t: 0, dur: 3 };
      this.updateMusic();
      sfx('explosion', { big: true });
      return;
    }
    // On the final floor the light beam takes the middle, so the item sits to the side.
    const ped = room.findFreeSpot(this.floorDef.final ? cx - 70 : cx, this.floorDef.final ? cy : cy - 22);
    room.pedestals.push(new Pedestal(ped.x, ped.y, this.floorLoot.boss));
    const hatchAt = room.findFreeSpot(cx, cy + 36);
    room.trapdoor = new Trapdoor(hatchAt.x, hatchAt.y, this.floorDef.final ? 'light' : 'hatch');
    this.stats.bosses++;
    progress.event('bossKilled', { id: boss.id });
    this.spawnPickup('heart', boss.x, boss.y);
    // a champion boss pays out a little more
    if (room.bossChampion) { this.spawnPickup('heart', boss.x + 14, boss.y); for (let i = 0; i < 3; i++) this.spawnPickup('coin', boss.x - 10 + i * 10, boss.y + 10); }
    this.banner = this.floorDef.final
      ? { text: 'THE SNUFFER FALLS', sub: 'A LIGHT SHINES FROM ABOVE...', t: 0, dur: 3.5 }
      : { text: `${boss.name} IS DOWN`, sub: 'A TRAPDOOR CREAKS OPEN...', t: 0, dur: 3 };
    this.updateMusic();
    sfx('explosion', { big: true });
    this.onBossDead?.();
    if (this.cell.type === 'boss' && !this.floorDef.final) {
      // The Chandler beaten quickly opens the way to the boss rush (once unlocked)
      if (this.floorDef.giant === 'chandler' && this.stats.time < BOSS_RUSH_TIME && progress.isUnlocked('room', 'bossrush')) {
        if (openSideRoom(this, 'bossrush')) this.banner = { text: 'A GILDED DOOR OPENS', sub: 'THE PROCESSION AWAITS', t: 0, dur: 3 };
      }
      maybeOpenDeal(this);
    }
  }

  // The die's five: the same floor, rebuilt with new rooms (you keep everything you carry).
  rearrangeFloor() {
    this.rearranging = true;
    this.rearrangeCount = (this.rearrangeCount || 0) + 1;
    this.forcedVariants[this.floorNum] = this.variant.id;
    this.startFloor(this.floorNum);
    this.rearranging = false;
    this.floorCard = null;
    this.flashT = 0.5;
    sfx('trapdoor');
  }

  // A floor may hide a crawlspace under one rock of an ordinary room: { cell key, c, r }.
  pickCrawlspace(n) {
    const r = this.rng.fork('crawl:' + n);
    if (n < 2 || FLOORS[n - 1].noExtras || !r.chance(0.45)) return null;
    const cells = r.shuffle([...this.floor.cells.values()].filter((c) => c.type === 'normal' && c.shape === '1x1'));
    for (const c of cells) {
      const rocks = [];
      // (not a rock in a doorway: those are cleared away)
      const doorway = new Set(shapeSlots('1x1').flatMap((sl) => doorwayTiles(sl, '1x1')).map(([ci, ri]) => `${ci},${ri}`));
      c.template.layout.forEach((row, ri) => [...row].forEach((ch, ci) => { if (ch === '#' && !doorway.has(`${ci},${ri}`)) rocks.push([ci, ri]); }));
      if (rocks.length) { const [ci, ri] = r.pick(rocks); return { key: c.key, c: ci, r: ri, item: null, market: r.chance(0.25), taken: false }; }
    }
    return null;
  }

  // ---- crawlspaces: a side-view hole under a rock (see src/game/crawlspace.js) ----
  enterCrawlspace(hatch) {
    this.crawlFrom = { cell: this.cell, x: hatch.x, y: hatch.y };
    if (!this.crawl.market && !this.crawl.item && !this.crawl.taken) this.crawl.item = this.itemPools.draw('treasure');
    this.crawlspace = new Crawlspace(this, this.crawl);
    sfx('trapdoor');
  }

  leaveCrawlspace() {
    const from = this.crawlFrom;
    this.crawlspace = null;
    this.enterCell(from.cell, null);
    this.player.x = from.x; this.player.y = from.y + 18;
    this.updateCamera(0, true);
  }

  // From the crawlspace's far end into the black market (a room that isn't on the map).
  enterBlackMarket() {
    this.crawlspace = null;
    this.crawl.marketCell ??= this.floor.addCell('blackmarket', null, null);
    this.enterCell(this.crawl.marketCell, null);
    const p = this.player;
    p.x = this.room.centerX; p.y = this.room.B - 46;
  }

  leaveBlackMarket() {
    this.crawlspace = new Crawlspace(this, this.crawl, 'right');
    sfx('trapdoor');
  }

  removeBoss(boss) {
    const room = this.room;
    if (room.boss === boss) room.boss = null;
    if (room.extraBosses) room.extraBosses = room.extraBosses.filter((b) => b !== boss);
    // keep the main slot filled while others remain (the HUD and the intro use it)
    if (!room.boss && room.extraBosses?.length) room.boss = room.extraBosses.shift();
  }

  enterTrapdoor() {
    const td = this.room.trapdoor;
    this.state = 'descend';
    sfx('trapdoor');
    this.stateT = 0;
    this.player.x = td.x;
    this.player.y = td.y;
    this.player.vx = this.player.vy = 0;
  }

  enterVictory() {
    this.state = 'victory';
    this.stateT = 0;
    this.victoryMenu.sel = 0;
    this.touch.setMenuMode(true);
    this.summary = this.buildSummary();
    this.saveRun('win');
    audio.stopMusic();
    sfx('victory');
  }

  updateVictory(dt) {
    this.stateT += dt;
    if (this.stateT < 1.2) { this.input.pending.clear(); return; }
    this.victoryMenu.update(dt, this.input);
  }

  buildSummary() {
    const visited = [...this.floor.cells.values()].filter((c) => c.visited).length;
    return {
      killedBy: this.player.killedBy || 'Something in the dark',
      killerPic: this.player.killerPic || null,
      itemIds: [...this.player.items],
      time: this.stats.time,
      rooms: this.stats.rooms + visited,
      kills: this.stats.kills,
      damage: this.stats.damageTaken,
      items: this.stats.items.length,
      floor: this.floorNum,
      floorName: this.floorDef.name,
      bosses: this.stats.bosses,
    };
  }

  // The run is over: record it in progress and drop the save & continue slot.
  saveRun(result) {
    if (result === 'win') progress.event('win', { character: this.characterId, boss: FINAL_BOSS });
    else progress.event('death');
    progress.recordRun(result, this.summary, this.seed);
    clearStore('run');
  }

  // Save the run in progress (called on room changes and when the app is hidden or closed).
  autosave() {
    if (this.restoring || !this.floor || this.state !== 'play') return;
    saveStore('run', serializeRun(this));
    progress.flush();
  }

  saveAndQuit() {
    this.autosave();
    this.onQuit?.();
  }

  continueRun() {
    const ok = restoreRun(this, loadStore('run'));
    if (!ok) clearStore('run');
    return ok;
  }

  updateShake(dt) {
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 30);
      this.shakeX = (Math.random() * 2 - 1) * this.shakeAmount;
      this.shakeY = (Math.random() * 2 - 1) * this.shakeAmount;
    } else {
      this.shakeX = this.shakeY = 0;
    }
  }

  updateFlow() {
    const p = this.player, room = this.room;
    const key = `${room.colAt(p.x)},${room.rowAt(p.y)},${room.version},${this.cell.key}`;
    if (key !== this.flowKey) {
      this.flowKey = key;
      this.flow = computeFlow(room, p.x, p.y);
    }
  }

  separateEnemies() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.active || a.def.static || a.noMove) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.active || b.noMove || a.def.flying !== b.def.flying || (a.chain && a.chain === b.chain)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 0.0001) continue;
        const d = Math.sqrt(d2), push = (rr - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        if (b.def.static) { a.x -= nx * push * 2; a.y -= ny * push * 2; continue; }
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }

  contactDamage() {
    const p = this.player;
    if (p.dead) return;
    for (const body of this.playerBodies()) {
      for (const e of this.enemies) {
        if (!e.harmful) continue;
        const dx = body.x - e.x, dy = body.y - e.y, rr = body.r + e.r - 3;
        if (dx * dx + dy * dy < rr * rr) {
          p.hurt(e.contact, e.def.name, this, e.x, e.y);
          return;
        }
      }
      for (const b of this.bosses) {
        if (!b.harmful) continue;
        for (const c of b.hitCircles()) {
          if (Math.hypot(body.x - c.x, body.y - c.y) < body.r + c.r - 3) {
            p.hurt(b.def.contact, b.name, this, c.x, c.y);
            return;
          }
        }
      }
    }
    if (!p.flying && this.room.get(this.room.colAt(p.x), this.room.rowAt(p.y)) === T.SPIKES) {
      p.hurt(1, 'Rusty Spikes', this, p.x, p.y - 4);
    }
  }

  // opts.safe: put it on a safe spot near (x, y) (enemies made by cards, items, machines)
  spawnEnemy(type, x, y, opts) {
    if (opts?.safe) ({ x, y } = this.room.findFreeSpot(x, y, { share: true }));
    const e = new Enemy(type, x, y, { hpMul: this.floorDef?.enemyHp ?? 1, ...opts });
    this.room.enemies.push(e);
    return e;
  }

  enemyShoot(e, angle, speed, style = 'blood') {
    sfx('enemyShoot');
    const c = Math.cos(angle), s = Math.sin(angle);
    this.projectiles.spawn({
      x: e.x + c * e.r * 0.6, y: e.y + s * e.r * 0.6, z: e.z + 7,
      vx: c * speed, vy: s * speed, r: 4, damage: 1, team: 'enemy', range: 190, source: e.def.name, style,
    });
  }

  killEnemy(e) {
    if (e.dead) return;
    if (e.beforeDeath?.(this)) return;   // some enemies take a moment to die (ashwalkers burst)
    e.dead = true;
    progress.event('enemyKilled');
    this.player.runMech('kill', this, e);
    sfx('enemyDeath');
    this.stats.kills++;
    const blood = BLOOD[e.def.blood] || BLOOD.red;
    this.particles.burst(e.x, e.y, 12 + e.r, { colors: blood, speed: 85, z: e.z + 6, vz: 80, gravity: 320, sizeVar: 2, life: 0.7 });
    this.effects.ring(e.x, e.y, e.r + 10, blood[blood.length - 1], 0.3);
    this.shake(e.maxHp >= 14 ? 3 : 2);
    if (e.def.blood !== 'ghost') this.room.paintDecal((g) => splat(g, e.x, e.y + e.r * 0.5, e.r, blood));

    e.onKilled?.(this);
    const d = e.def;
    if (d.split) {
      for (let i = 0; i < d.split.count; i++) {
        const a = (i / d.split.count) * Math.PI * 2 + Math.random();
        const c = this.spawnEnemy(d.split.type, e.x + Math.cos(a) * 4, e.y + Math.sin(a) * 4, { delay: 0 });
        c.kx = Math.cos(a) * 105;
        c.ky = Math.sin(a) * 105;
      }
    }
    if (d.deathShots) {
      for (let i = 0; i < d.deathShots.count; i++) this.enemyShoot(e, (i / d.deathShots.count) * Math.PI * 2, d.deathShots.speed);
    }
  }

  // A few of the floor's enemies rise again in a cleared room (the Restless curse). No reward.
  wakeRestless() {
    const room = this.room, groups = this.variant.groups || [];
    const list = groups.flatMap((gr) => gr.e || []).filter(([type]) => !enemyDef(type).segments && !enemyDef(type).mini);
    if (!list.length) return;
    const n = 2 + (this.lootRng.chance(0.4) ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const [type] = this.lootRng.pick(list);
      const spot = room.findFreeSpot(room.x0 + this.lootRng.next() * (room.R - room.x0), room.y0 + this.lootRng.next() * (room.B - room.y0));
      this.spawnEnemy(type, spot.x, spot.y, { delay: 0.6 });
    }
    room.cleared = false;
    room.restless = true;
    this.banner = { text: 'THE DEAD ARE RESTLESS', sub: '', t: 0, dur: 1.8 };
  }

  onRoomCleared() {
    this.room.cleared = true;
    this.roomsCleared++;
    sfx('doorOpen');
    sfx('roomClear');
    const p = this.player;
    for (const slot of [p.active, p.pocket]) {
      const a = slot && itemDef(slot.id).active;
      if (a && !a.timed && !a.byShooting) slot.charge = Math.min(a.charge, slot.charge + 1);
    }
    // each Moldy Heart hatches a gnat
    for (let i = 0; i < p.health.rotten && this.gnats.length < 12; i++) this.gnats.push(new Gnat(p.x, p.y - 4));
    if (p.health.rotten) sfx('gnat');
    p.runMech('roomClear', this);
    for (const f of this.familiars) f.roomCleared?.(this);
    for (const door of Object.values(this.cell.doors)) door.closed = false;
    if (this.cell.type === 'boss') return; // the boss leaves its own rewards
    if (this.room.restless) { this.room.restless = false; return; }   // the Restless give nothing back
    if (this.room.lairReward) { this.room.lairReward = false; const s = this.room.findFreeSpot(this.room.centerX, this.room.centerY); addProp(this.room, new Chest(s.x, s.y, { locked: false, open: false })); }
    const spot = this.room.findFreeSpot(this.room.centerX, this.room.centerY);
    this.rollDrops('roomClear', spot.x, spot.y);
  }

  // ---------------------------------------------------------------------------
  // Items

  // Treasure/secret pedestals and the shop are filled the first time you walk in.
  populateSpecial(cell) {
    const room = this.room;
    if (room.specialDone) return;
    room.specialDone = true;
    if (SPECIAL_TYPES[cell.type]) { populateSpecialRoom(this, cell); return; }
    for (const s of room.spawns) {
      if (s.ch === 'P') {
        const id = cell.type === 'secret' ? this.floorLoot.secret
          : cell.type === 'treasure' ? this.floorLoot.treasure
          : this.itemPools.draw('treasure');
        room.pedestals.push(new Pedestal(s.x, s.y, id));
      } else if (s.ch === 'K') {
        room.keeper = new Shopkeeper(s.x, s.y);
      } else if (s.ch === 'B') {
        // one boss, or a pair ("a+b") side by side at reduced health; sometimes a champion
        // (a Sprawl floor's first boss room holds the floor's own boss, at its own strength)
        const own = !!cell.firstBoss;
        const ids = this.bossFor(this.floorNum, own).split('+');
        const pair = ids.length > 1;
        const champion = own ? null : this.bossChampion(this.floorNum);
        const hp = own ? this.floorDef.ownBossHp : this.floorDef.bossHp, tier = own ? this.floorDef.ownBossTier : this.floorDef.bossTier;
        const list = ids.map((id, i) => createBoss(id, s.x + (pair ? (i ? 60 : -60) : 0), s.y, {
          hpMul: hp * (pair ? 0.65 : 1), tier, champion: i === 0 ? champion : null,
        }));
        room.boss = list[0];
        if (pair) room.extraBosses = list.slice(1);
        room.bossChampion = champion;
        room.cleared = false;
        this.bossIntro = { t: 0, dur: 2.6 };
        sfx('bossRoar');
      }
    }
    if (cell.type === 'shop') {
      stockShop(this, room);
      // sometimes a restock box in the corner
      if (this.rng.fork('restock:' + cell.key).chance(0.3)) { const s = room.findFreeSpot(room.R - 28, room.y0 + 34); addProp(room, new Machine(s.x, s.y, { type: 'restock' })); }
    }
    // a beggar or a machine wandered into one plain room of the floor
    if (cell.key === this.wanderCell && cell.type === 'normal') {
      const spot = room.findFreeSpot(room.x0 + 40, room.y0 + 30);
      const m = addProp(room, new Machine(spot.x, spot.y + 6, { type: this.wanderType }));
      m.setup(this);
    }
  }

  updatePedestals(dt) {
    const p = this.player;
    for (const ped of this.room.pedestals) {
      ped.update(dt);
      const touching = Math.hypot(p.x - ped.x, p.y - ped.y) < p.r + ped.r;
      if (!touching) { ped.needLeave = false; continue; }
      if (!ped.item || ped.cooldown > 0 || ped.needLeave || p.dead) continue;
      if (ped.price) {
        if (p.coins < ped.price) continue;
        p.coins -= ped.price;
        progress.event('shopBuy');
        sfx('buy');
        ped.price = 0;
      }
      // deals and the black market: paid in hearts
      if (ped.cost) {
        if (!canPay(this, ped.cost)) continue;
        pay(this, ped.cost);
        ped.cost = null;
        sfx('slam');
        this.shake(4);
        this.particles.burst(p.x, p.y - 8, 14, { colors: ['#c0262c', '#6a1216', '#160f0c'], speed: 60, z: 10, vz: 50 });
      }
      if (ped.deal === 'devil') { this.devilTaken = true; this.runFlags.devilBoughtOn = this.floorNum; }
      if (ped.deal) progress.event('dealTaken', { deal: ped.deal });
      const group = ped.group;
      this.giveItem(ped.item, ped);
      // a group: taking one makes the others vanish
      if (group) {
        for (const o of this.room.pedestals) {
          if (o === ped || o.group !== group || !o.item) continue;
          this.particles.burst(o.x, o.y - 14, 12, { colors: ['#e8d9b0', '#8a7a62'], speed: 50, z: 12 });
          o.item = null;
        }
        for (const o of this.room.pedestals) if (o.group === group) o.group = null;
      }
      // challenge rooms: taking the prize springs the ambush
      if (this.room.ambush) startWaves(this, this.room.ambush);
    }
    // Bought shop items leave nothing behind.
    if (this.room.pedestals.some((ped) => ped.bare && !ped.item)) {
      this.room.pedestals = this.room.pedestals.filter((ped) => !(ped.bare && !ped.item));
    }
  }

  giveItem(id, ped = null) {
    const d = itemDef(id);
    const p = this.player;
    if (ped && p.runMech('takeItem', this, id, ped)) return;
    if (d.type === 'active') {
      const old = p.active;
      p.active = { id, charge: d.active.charge };
      if (ped) {
        ped.item = old ? old.id : null;   // swap: your old active stays behind
        ped.needLeave = true;
      }
    } else {
      p.items.push(id);
      applyItemPickup(id, p);
      if (ped) ped.item = null;
    }
    p.recompute();
    this.syncFollowers();
    this.stats.items.push(id);
    progress.event('itemCollected', { id });
    // the item's name and line on a strip at the top (src/ui/hud.js), held up over the flame
    this.banner = { text: d.name, sub: this.settings.itemInfo === 'name' ? '' : d.desc, t: 0, dur: 3.2, top: true, item: id };
    p.holdT = 1.1;
    p.holdIcon = itemIcon(id);
    this.particles.burst(p.x, p.y - 20, 14, { colors: ['#fff3c0', '#ffd25a', '#e8d9b0'], speed: 60, z: 10, gravity: 60, life: 0.6 });
    if (d.quality >= 4) {
      // a run-defining item: a little dance with a jingle (can't be hurt while dancing)
      p.danceT = 1.2;
      p.holdT = 1.2;
      sfx('jingle');
      this.effects.ring(p.x, p.y - 8, 40, 'rgba(255,220,120,0.9)', 0.6, 8);
    } else sfx('itemGet');
    p.runMech('itemTaken', this, id, ped);
  }

  // A transformation was just gained (3 items with the same tag, see updateTransforms in
  // src/game/items.js): its one-time gifts, a jingle, and a banner with a picture of the new look.
  announceTransform(tid) {
    const t = TRANSFORMATIONS[tid];
    const p = this.player;
    if (!t) return;
    const once = t.once || {};
    if (once.hearts) applyHearts(p.health, once.hearts);
    if (once.gives) for (const k of ['coins', 'bombs', 'keys']) if (once.gives[k]) p[k] = Math.min(99, p[k] + once.gives[k]);
    (once.spawn || []).forEach((type, i) => this.spawnPickup(type, p.x - 8 + i * 16, p.y + 14));
    const [pic, pctx] = makeCanvas(24, 34);
    p.drawCandle(pctx, p.look, 12, 30, 0, 0, { flare: false, body: false });
    this.banner = { text: t.name, sub: t.desc, t: 0, dur: 3.6, top: true, icon: pic };
    p.danceT = 1.2;
    sfx('jingle');
    this.shake(3);
    this.effects.ring(p.x, p.y - 8, 54, 'rgba(255,220,120,0.9)', 0.7, 10);
    this.particles.burst(p.x, p.y - 12, 30, { colors: ['#fff3c0', '#ffd25a', '#e8d9b0', '#ff9a3a'], speed: 90, z: 10, gravity: 40, life: 0.9 });
    progress.event('transformed', { id: tid });
  }

  // Rebuild orbitals and familiars from the items Wick is holding.
  syncFollowers() {
    const p = this.player;
    const defs = p.followerDefs;
    const temps = this.familiars.filter((f) => f.temp);
    const tempOrbitals = (this.orbitals || []).filter((o) => o.temp);
    this.orbitals = [...defs.filter((d) => d.kind === 'orbital').map((d, i) => new Orbital(d, i)), ...tempOrbitals];
    const old = this.familiars.filter((f) => !f.temp);
    const seen = {};
    this.familiars = defs.filter((d) => d.kind === 'familiar' || d.kind === 'helper').map((d, i) => {
      const f = d.kind === 'helper' ? new Helper(d, i) : new Familiar(d, i);
      // the same helper as before keeps where it was and what it was counting
      const n = seen[d.item] = (seen[d.item] || 0) + 1;
      const prev = old.filter((o) => (o.base || o.def).item === d.item)[n - 1];
      f.place(prev ? prev.x : p.x, prev ? prev.y : p.y);
      if (prev && d.kind === 'helper') for (const k of ['bank', 'rooms', 'awake', 'gone', 'cd']) if (prev[k] !== undefined) f[k] = prev[k];
      return f;
    });
    // helpers that walk in your footsteps queue up one after another
    let slot = 0;
    for (const f of this.familiars) if (f.walksBehind ?? f.def.variant !== 'rat') f.index = slot++;
    for (const t of temps) { t.index = this.familiars.length; this.familiars.push(t); }
  }

  addTempTwin() {
    const p = this.player;
    const f = new Familiar({ variant: 'twin' }, this.familiars.length);
    f.temp = true;
    f.place(p.x, p.y);
    this.familiars.push(f);
    this.particles.burst(p.x, p.y, 12, { colors: ['#e8d9b0', '#fff4d6'], speed: 50, z: 8 });
  }

  // slot: 'active' (Space / USE) or 'pocket' (Q / PKT)
  useActive(slot = 'active') {
    const p = this.player;
    const it = p[slot];
    if (!it || p.dead) return;
    const a = itemDef(it.id).active;
    if (a.costHealth) {
      // paid in health instead of charge, but never the last of it
      if (p.health.total <= a.costHealth) { sfx('denied'); return; }
      const gold = p.health.golden;
      p.health.damage(a.costHealth);
      p.health.golden = gold;
    } else if (a.costCoins) {
      if (p.coins < a.costCoins) { sfx('denied'); return; }
      p.coins -= a.costCoins;
    } else {
      if (it.charge < a.charge) { sfx('denied'); return; }
      it.charge = 0;
    }
    sfx('active');
    progress.event('activeUsed');
    // an effect that couldn't do anything (no wall for the Crimson Key...) gives the charge back;
    // effects shared with cards and pills come from CONSUMABLE_FX
    const fx = ACTIVE_EFFECTS[a.effect] || ((g, a) => CONSUMABLE_FX[a.effect](g, a, 1));
    if (fx(this, { ...a, item: it.id }) === false) {
      if (a.costCoins) p.coins += a.costCoins;
      else if (!a.costHealth) it.charge = a.charge;
      sfx('denied');
      return;
    }
    // one-time items are used up
    if (a.single) {
      p[slot] = null;
      this.effects.float(itemIcon(it.id), p.x, p.y - 22, 1);
      this.particles.burst(p.x, p.y - 22, 10, { colors: ['#e8d9b0', '#fff3c0'], speed: 40, z: 10 });
    }
  }

  // Actives with `timed` recharge over time instead of by clearing rooms.
  chargeTimed(dt) {
    const p = this.player;
    for (const slot of [p.active, p.pocket]) {
      const a = slot && itemDef(slot.id).active;
      if (a?.timed) slot.charge = Math.min(a.charge, slot.charge + (dt / a.timed) * a.charge);
      // Weeping Censer: fills while you shoot
      else if (a?.byShooting && (this.input.shoot.x || this.input.shoot.y)) slot.charge = Math.min(a.charge, slot.charge + (dt / a.byShooting) * a.charge);
    }
  }

  absorbTrinket() { return absorbTrinket(this); }

  teleportTo(cell) {
    this.enterCell(cell, null);
    this.transition = null;
    this.flashT = 0.4;
    this.autosave();
  }

  recordTrail() {
    const p = this.player, last = this.trail[0];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1.5) {
      this.trail.unshift({ x: p.x, y: p.y });
      if (this.trail.length > 160) this.trail.pop();
    }
  }

  // ---------------------------------------------------------------------------
  // Pickups and loot
  spawnPickup(type, x, y, pop = true) {
    // never in a doorway, a wall or a rock (pickups may pile up on one spot)
    ({ x, y } = this.room.findFreeSpot(x, y, { share: true }));
    const a = Math.random() * Math.PI * 2;
    const sp = pop ? 25 + Math.random() * 35 : 0;
    const p = new Pickup(type, x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: pop ? 90 : 0, z: pop ? 1 : 0 });
    this.pickups.push(p);
    if (type === 'key') this.keySeen = true;
    fillPickup(this, p);
    return p;
  }

  rollChest() { return rollChest(this); }
  randomDrop() { return randomPickup(this); }

  // a chest dropped as a reward ("any" rolls the kind), on free floor near x, y
  dropChest(type, x, y) {
    const s = this.room.findFreeSpot(x, y);
    addProp(this.room, new Chest(s.x, s.y, { type: type === 'any' ? rollChest(this) : type, open: false }));
    this.particles.burst(s.x, s.y - 6, 10, { colors: ['#e8d9b0', '#9a8462'], speed: 50, z: 6, vz: 40 });
  }

  // one entry rolled from a drop table: a pickup, or a chest ("chest:any", "chest:gold"...)
  dropOne(type, x, y) {
    if (type.startsWith('chest:')) this.dropChest(type.slice(6), x, y);
    else this.spawnPickup(type, x, y);
  }

  rollDrops(tableName, x, y) {
    const table = DROP_TABLES[tableName];
    const rng = this.lootRng;
    const chance = table.chance + (table.luckBonus || 0) * this.player.stats.luck;
    const pity = tableName === 'roomClear' && !this.keySeen && this.roomsCleared >= KEY_PITY_ROOMS;
    if (rng.next() >= chance && !pity) return;
    const n = rng.int(table.count[0], table.count[1]);
    for (let i = 0; i < n; i++) {
      const type = rng.weighted(table.entries).type;
      this.dropOne(pity && i === 0 ? 'key' : type, x, y);
    }
  }

  onTileBroken(tile, x, y) {
    // the rock hiding this floor's crawlspace ladder
    const cr = this.crawl;
    if (cr && tile === T.ROCK && this.cell.key === cr.key && this.room.colAt(x) === cr.c && this.room.rowAt(y) === cr.r) {
      addProp(this.room, new Hatch(x, y, { to: 'crawl' }));
      sfx('secret');
    }
    if (tile === T.POT) {
      // some variants hide things in their breakables (a spider in a cocoon...)
      const ps = this.variant?.potSpawn;
      if (ps && this.lootRng.next() < ps.chance) {
        const e = this.spawnEnemy(ps.type, x, y, { delay: 0.2 });
        e.kx = (Math.random() - 0.5) * 80;
        e.ky = 40;
      } else this.rollDrops('jar', x, y);
    }
    else if (tile === T.TINTED) {
      this.rollDrops('markedRock', x, y);
      progress.event('markedRock');
    }
  }

  updatePickups(dt) {
    const p = this.player;
    const list = this.pickups;
    for (const it of list) it.update(dt, this);
    // keep pickups from stacking
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.price || b.price) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, rr = a.r + b.r;
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2), push = ((rr - d) / d) * 20;
          a.vx -= dx * push * dt * 10; a.vy -= dy * push * dt * 10;
          b.vx += dx * push * dt * 10; b.vy += dy * push * dt * 10;
        }
      }
    }
    if (p.dead) return;
    for (const it of list) {
      if (it.collected || it.age < 0.3 || it.z > 4) continue;
      const dx = it.x - p.x, dy = it.y - p.y, rr = it.r + p.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (it.price) {
        // Shop stock: buy it if you can afford it and can use it.
        if (p.coins < it.price || !it.canCollect(p)) continue;
        p.coins -= it.price;
        progress.event('shopBuy');
        sfx('buy');
        it.price = 0;
      }
      if (!this.collectPickup(it)) {
        // can't use it right now: nudge it out of the way
        const d = Math.hypot(dx, dy) || 1;
        it.vx += (dx / d) * 40;
        it.vy += (dy / d) * 40;
      }
    }
    if (list.some((it) => it.collected)) this.room.pickups = list.filter((it) => !it.collected);
  }

  // Give a floor pickup to the candle (walked over, or fetched by a helper). False if it can't use it now.
  collectPickup(it) {
    const p = this.player;
    if (it.collected || it.price || !it.canCollect(p)) return false;
    const kind = it.def.kind;
    if (it.cons) takeConsumable(this, it.cons);
    else if (it.trinket) takeTrinket(this, it.trinket, it.x, it.y);
    else it.apply(p);
    sfx(kind === 'coin' ? 'coin' : HEART_KINDS.has(kind) ? 'heart' : kind === 'key' ? 'key' : 'pickup');
    it.collected = true;
    this.effects.float(pickupIcon(it.type, it), it.x, it.y);
    this.particles.burst(it.x, it.y, 6, { colors: ['#fff0a0', '#e8d9b0'], speed: 40, z: 6, gravity: 80, life: 0.35 });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Bombs
  // safe: a shot bursting (Nitro Wax): never hurts you, leaves machines, beggars and pickups be
  explode(x, y, radius = BOMB_RADIUS, damage = BOMB_DAMAGE, { safe = false, onHit = null } = {}) {
    sfx('explosion', { big: radius > BOMB_RADIUS });
    this.shake(safe ? 3 : 7);
    this.effects.disc(x, y, radius * 0.8, 'rgba(255,230,160,0.9)', 0.12);
    this.effects.ring(x, y, radius + 6, '#f08a24', 0.35, 6);
    this.particles.burst(x, y, 28, { colors: ['#fff3c0', '#ffd25a', '#f08a24', '#c2461c'], speed: 130, z: 6, vz: 90, gravity: 200, life: 0.5, sizeVar: 2 });
    this.particles.burst(x, y, 14, { colors: ['#2a2420', '#3a3430', '#1a1614'], speed: 50, z: 8, vz: 40, gravity: -30, life: 0.9, size: 2, sizeVar: 2, drag: 3 });
    this.room.paintDecal((g) => splat(g, x, y + 2, 12, ['#0e0a08', '#1a1210', '#120c0a']));

    // Tiles
    const room = this.room;
    const c0 = room.colAt(x - radius), c1 = room.colAt(x + radius);
    const r0 = room.rowAt(y - radius), r1 = room.rowAt(y + radius);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!room.inBounds(c, r)) continue;
        const t = room.tileCenter(c, r);
        if (Math.hypot(t.x - x, t.y - y) < radius + 8) room.breakTile(c, r, this);
      }
    }

    // Enemies
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < radius + e.r) {
        e.intangible = false;
        onHit?.(e);
        e.takeHit(damage, dx / d, dy / d, 180, this);
      }
    }

    for (const boss of this.bosses) if (boss.hitCircles().some((c) => Math.hypot(c.x - x, c.y - y) < radius + c.r)) { onHit?.(boss); boss.takeHit(damage, this); }

    // The player is not immune to their own bombs
    const p = this.player;
    if (!safe && Math.hypot(p.x - x, p.y - y) < radius + p.r) p.hurt(2, 'Your Own Bomb', this, x, y);

    // hazards caught in the blast (webs burn away)
    for (const h of this.room.hazards) if (h.blast && Math.hypot(h.x - x, h.y - y) < radius + (h.r || 0)) h.blast(this);
    if (safe) return;
    if (this.room.props) for (const pr of this.room.props) if (pr.blast && Math.hypot(pr.x - x, pr.y - y) < radius + 14) pr.blast(this);
    // Push pickups, light other bombs
    for (const it of this.pickups) {
      if (it.price) continue;
      const dx = it.x - x, dy = it.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < radius * 1.5) { it.vx += (dx / d) * 120; it.vy += (dy / d) * 120; it.vz = 60; it.z = Math.max(it.z, 1); }
    }
    for (const b of this.bombs) if (!b.done && Math.hypot(b.x - x, b.y - y) < radius + 6) b.fuse = Math.min(b.fuse, 0.12);

    // Secret walls
    for (const pos of this.room.doorSlots) {
      const door = pos.door;
      if (!door.hidden) continue;
      if (Math.hypot(pos.x - x, pos.y - y) < radius + 14) {
        door.hidden = false;
        door.closed = !this.room.cleared;
        door.snap();
        this.floor.visit(this.cell);
        this.particles.burst(pos.x, pos.y, 20, { colors: PAL.wall.slice(1), speed: 80, z: 8, vz: 80, sizeVar: 2, life: 0.8 });
        this.secretsFound = (this.secretsFound || 0) + 1;
        sfx('secret');
      }
    }
  }

  // What got you, as a picture for the death screen (the boss, the enemy, or one painted from the
  // data when the shooter is already gone). Null for hazards and the like.
  killerPicture(name) {
    try {
      for (const b of this.bosses) if (b.name === name) return b.portrait();
      for (const e of this.enemies) if (e.def?.name === name && e.frame) return e.frame();
      for (const id of Object.keys(ENEMIES)) {
        const def = enemyDef(id);
        if (def.name === name) return enemyPicture(def.art);
      }
    } catch (err) { /* no picture then */ }
    return null;
  }

  // Low health (1 heart or less, every kind counted): a heartbeat, and the screen edges pulse red
  // with each beat (drawn in renderLowHealth).
  updateLowHealth(dt) {
    const P = TUNING.player, p = this.player;
    const low = !p.dead && !p.health.oneHit && p.health.total <= P.lowHealth && this.state === 'play';
    if (!low) { this.beatT = 0; this.beatK = Math.max(0, (this.beatK || 0) - dt * 2); return; }
    this.beatT = (this.beatT || 0) - dt;
    if (this.beatT <= 0) { this.beatT = P.heartbeatEvery; this.beatAt = this.time; sfx('heartbeat'); }
    this.beatK = Math.min(1, (this.beatK || 0) + dt * 2);
  }

  renderLowHealth(ctx) {
    if (!this.beatK) return;
    const since = this.time - (this.beatAt ?? -9);
    // lub-dub: two quick swells per beat
    const pulse = Math.max(0, 1 - since * 4) + 0.7 * Math.max(0, 1 - Math.abs(since - 0.2) * 5);
    ctx.globalAlpha = Math.min(1, this.beatK * TUNING.player.lowPulse * (0.35 + pulse));
    ctx.drawImage(getRedEdges(), 0, 0);
    ctx.globalAlpha = 1;
  }

  onPlayerDeath() {
    this.state = 'dying';
    this.stateT = 0;
    audio.stopMusic();
    sfx('playerDeath');
    this.paused = false;
    this.shake(7);
  }

  enterGameOver() {
    this.state = 'gameover';
    this.stateT = 0;
    this.touch.setMenuMode(true);
    this.summary = this.buildSummary();
    this.saveRun('death');
    sfx('gameOver');
  }

  updateGameOver(dt) {
    this.stateT += dt;
    this.particles.update(dt);
    if (this.stateT < 0.8) { this.input.pending.clear(); return; }
    if (this.input.consume('retry')) this.newRun(this.seed);
    else if (this.input.consume('confirm')) this.newRun();
    else if (this.input.consume('back')) this.onQuit?.();
  }

  // Taps/clicks while a menu is showing (view coordinates).
  onTap(vx, vy) {
    if (this.debugFloorMap) this.toggleDebugFloorMap(false);
    else if (this.debugMenu) this.debugMenu.tap(vx, vy);
    else if (this.pause.visible) this.pause.tap(vx, vy);
    else if (this.state === 'gameover' && this.stateT >= 0.8) this.newRun();
    else if (this.state === 'victory' && this.stateT >= 1.2) this.victoryMenu.tap(vx, vy);
  }

  // Nudge the player into a doorway when they push against the wall next to it,
  // and use a key on a locked door they walk into.
  assistDoors(dt) {
    const p = this.player, mv = this.input.move, room = this.room;
    for (const pos of room.doorSlots) {
      const door = pos.door;
      if (door.hidden) continue;
      const [dx, dy] = DIRS[pos.dir];
      if (mv.x * dx + mv.y * dy < 0.5) continue;
      const atWall = dy < 0 ? p.y - p.r <= room.y0 + 2
        : dy > 0 ? p.y + p.r >= room.B - 2
        : dx < 0 ? p.x - p.r <= room.x0 + 2
        : p.x + p.r >= room.R - 2;
      if (!atWall) continue;
      const off = dx === 0 ? p.x - pos.x : p.y - pos.y;
      if (Math.abs(off) > 24) continue;

      if (door.locked) {
        // a coin door (The Parlor) takes a coin, the others a key
        const coin = door.lock === 'coin';
        if ((coin ? p.coins : p.keys) > 0 && Math.abs(off) < 12) {
          if (coin) { p.coins--; sfx('coin'); } else p.keys--;
          door.locked = false;
          sfx('unlock');
          this.particles.burst(pos.x, pos.y, 10, { colors: ['#d8b048', '#fff0a0'], speed: 50, z: 10 });
        }
        continue;
      }
      if (!door.isOpen || Math.abs(off) < 0.5) continue;
      const step = Math.sign(off) * Math.min(Math.abs(off), 100 * dt);
      if (dx === 0) p.x -= step;
      else p.y -= step;
    }
  }

  checkExit() {
    const p = this.player, room = this.room;
    if (p.y >= room.y0 - 5 && p.y <= room.B + 5 && p.x >= room.x0 - 5 && p.x <= room.R + 5) return;
    const slot = room.slotAt(p);
    // the error room: every door leads somewhere random on the floor
    if (slot && this.cell.type === 'error') {
      const cells = [...this.floor.cells.values()].filter((c) => c.visited && !c.offGrid && c.type !== 'boss');
      const to = cells[Math.floor(this.lootRng.next() * cells.length)] || this.floor.start;
      this.enterCell(to, null);
      this.flashT = 0.4;
      this.autosave();
      return;
    }
    const link = slot && this.floor.link(this.cell, slot.key);
    if (!link) return;
    const fromCell = this.cell, fromCam = { ...this.cam };
    // the thorned door bites as you pass through (either way)
    if (slot.door?.kind === 'curse' && !p.flying) p.hurt(1, 'THE THORNED DOOR', this, slot.x, slot.y, true);
    // the Wandering Doors curse: now and then a door between plain rooms leads somewhere else
    if (this.curse === 'maze' && fromCell.type === 'normal' && link.cell.type === 'normal' && this.lootRng.chance(0.15)) {
      const cells = [...this.floor.cells.values()].filter((c) => c.visited && c.type === 'normal' && c !== fromCell && c !== link.cell);
      if (cells.length) {
        this.enterCell(this.lootRng.pick(cells), null);
        this.flashT = 0.4;
        sfx('secret');
        this.banner = { text: 'THE DOORS WANDER', sub: '', t: 0, dur: 1.6 };
        this.autosave();
        return;
      }
    }
    // very rarely, a room takes a wrong turn
    const err = maybeErrorRoom(this, fromCell, link.cell);
    if (err) {
      this.enterCell(err, null);
      this.flashT = 0.6;
      sfx('secret');
      return;
    }
    this.enterCell(link.cell, link.slotKey);
    this.transition = { fromCell, fromCam, dir: slot.dir, t: 0 };
    this.autosave();
  }

  // ---- debug: pick any item (I with ?debug) ----
  openItemPicker() {
    this.debugMenu = new ItemPicker(this);
  }

  // ---- debug: jump straight to any floor variant (V with ?debug) ----
  openDebugJump() {
    const items = [{
      label: 'FLOOR', choice: [() => !!this.debugSecond, (v) => { this.debugSecond = v; }],
      options: [[false, 'FIRST OF CHAPTER'], [true, 'SECOND OF CHAPTER']],
    }];
    for (const [c, ch] of Object.entries(CHAPTERS)) {
      for (const id of ch.variants) {
        const v = VARIANTS[id];
        items.push({ label: `${c}. ${v.name}${v.ready ? '' : ' (WIP)'}${v.legacy ? ' (OLD)' : ''}`, action: () => this.debugJump(+c, id) });
      }
    }
    items.push({ label: 'SPECIAL ROOMS >', action: () => this.openDebugRooms() });
    items.push({ label: 'CLOSE', action: () => { this.debugMenu = null; } });
    this.debugMenu = new Menu(items, { rowH: 11 });
  }

  debugJump(chapter, id) {
    const first = FLOORS.findIndex((f) => f.chapter === chapter);
    const n = Math.min(FLOORS.length, first + 1 + (this.debugSecond ? 1 : 0));
    this.forcedVariants[n] = id;
    this.debugMenu = null;
    this.startFloor(n);
  }

  // Debug: open any special room next to the current one (behind a free wall).
  openDebugRooms() {
    const types = ['devil', 'angel', 'bossrush', 'curse', 'sacrifice', 'arcade', 'challenge', 'bosschallenge', 'library', 'vault', 'dice', 'nursery', 'sickroom', 'miniboss', 'planetarium', 'supersecret', 'ultrasecret', 'red', 'error'];
    const items = types.map((t) => ({ label: SPECIAL_TYPES[t].name || 'A CRIMSON ROOM (RED KEY)', action: () => this.debugRoom(t) }));
    items.push({ label: 'CRAWLSPACE', action: () => this.debugRoom('crawl') });
    items.push({ label: 'CLOSE', action: () => { this.debugMenu = null; } });
    this.debugMenu = new Menu(items, { rowH: 9 });
    this.debugMenu.title = 'DEBUG: OPEN A SPECIAL ROOM';
  }

  debugRoom(type) {
    this.debugMenu = null;
    this.room.cleared = true;
    for (const d of Object.values(this.cell.doors)) d.closed = false;
    if (type === 'crawl') {
      this.crawl ??= { key: this.cell.key, c: 0, r: 0, item: null, market: true, taken: false };
      this.enterCrawlspace({ x: this.player.x, y: this.player.y });
      return;
    }
    if (type === 'error') { this.enterCell(this.floor.addCell('error', null, null), null); return; }
    const c = openSideRoom(this, type);
    this.banner = c ? { text: 'A DOOR HAS OPENED', sub: (SPECIAL_TYPES[type].name || type).toUpperCase(), t: 0, dur: 2 } : { text: 'NO FREE WALL HERE', sub: 'TRY ANOTHER ROOM', t: 0, dur: 2 };
    if (c) for (const d of Object.values(c.doors)) { d.locked = false; d.hidden = false; }
  }

  // Debug: the whole floor plan with hidden rooms, dead ends and distances (src/ui/debugmap.js).
  toggleDebugFloorMap(on = !this.debugFloorMap) {
    this.debugFloorMap = on;
    this.touch.setMenuMode(on || this.pause.visible);
  }

  renderDebugMenu(ctx) {
    const m = this.debugMenu;
    if (m.custom) { m.render(ctx); return; }   // the item picker draws itself
    const rowH = m.rowH || 11, h = m.items.length * rowH + 22;
    const w = 240, x = (VIEW_W - w) / 2, y = Math.round((VIEW_H - h) / 2);
    drawWaxPanel(ctx, x, y, w, h, 1, 17);
    drawText(ctx, m.title || 'DEBUG: JUMP TO A FLOOR', x + w / 2, y + 5, { align: 'center', color: INK.title, shadow: false });
    m.t = this.time;
    m.layout(x + 12, y + 16, w - 24);
    m.render(ctx, 1);
  }

  revealMap() {
    this.floor.revealAll(true);
  }

  // Debug helper until bombs exist: open every secret door next to this room.
  openSecrets() {
    for (const door of Object.values(this.cell.doors)) door.hidden = false;
    this.floor.visit(this.cell);
  }

  // ---------------------------------------------------------------------------
  render(ctx) {
    ctx.fillStyle = '#060404';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.crawlspace) {
      this.crawlspace.render(ctx);
      drawHud(ctx, this);
      return;
    }

    if (this.transition) {
      const tr = this.transition;
      const k = ease(Math.min(1, tr.t / TRANSITION_TIME));
      const [dx, dy] = DIRS[tr.dir];
      const fromCell = tr.fromCell;
      this.renderRoomLayer(ctx, fromCell.room, fromCell, Math.round(-tr.fromCam.x - dx * k * VIEW_W), Math.round(-tr.fromCam.y - dy * k * VIEW_H));
      const ox = Math.round(-this.cam.x + dx * (1 - k) * VIEW_W), oy = Math.round(-this.cam.y + dy * (1 - k) * VIEW_H);
      this.renderRoomLayer(ctx, this.room, this.cell, ox, oy);
      for (const h of this.room.hazards) h.renderFloor?.(ctx, ox, oy, this);
      this.renderEntities(ctx, ox, oy);
      this.renderLighting(ctx, ox, oy);
      ctx.drawImage(getVignette(), 0, 0);
      drawHud(ctx, this);
      return;
    }

    // world offset: the camera (big rooms) plus screen shake
    const ox = Math.round(-this.cam.x + this.shakeX), oy = Math.round(-this.cam.y + this.shakeY);
    this.renderRoomLayer(ctx, this.room, this.cell, ox, oy);
    if (this.cell.type === 'start' && this.floorNum === 1) this.renderFloorHints(ctx, ox, oy);
    this.room.trapdoor?.renderFloor(ctx, ox, oy);
    for (const h of this.room.hazards) h.renderFloor?.(ctx, ox, oy, this);
    renderCreep(ctx, ox, oy, this);
    this.player.runMech('renderFloor', ctx, ox, oy, this);
    this.effects.render(ctx, ox, oy);
    this.renderEntities(ctx, ox, oy);
    this.projectiles.render(ctx, ox, oy);
    this.particles.render(ctx, ox, oy);
    this.ambience.render(ctx, ox, oy, this);
    this.renderLighting(ctx, ox, oy);
    this.renderDarkness(ctx, ox, oy);
    ctx.drawImage(getVignette(), 0, 0);
    this.renderLowHealth(ctx);
    if (this.hurtFlash > 0) {
      ctx.fillStyle = `rgba(150,20,20,${(this.hurtFlash / 0.18) * 0.25})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.slowT > 0) {
      ctx.fillStyle = `rgba(120,140,180,${Math.min(1, this.slowT) * 0.14})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255,250,230,${this.flashT / 0.4})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    if (this.state === 'dying') {
      const k = Math.min(1, this.stateT / DEATH_TIME);
      ctx.fillStyle = `rgba(0,0,0,${k * 0.5})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.arriveT > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.arriveT})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.state === 'descend') {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.stateT / 1.3)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.state !== 'gameover' && this.state !== 'victory' && !this.bossIntro && !this.floorCard) drawHud(ctx, this);
    if (this.bossIntro) this.renderBossIntro(ctx);
    if (this.floorCard) this.renderFloorCard(ctx);
    this.pause.render(ctx);
    if (this.debugMenu) this.renderDebugMenu(ctx);
    if (this.debugFloorMap) drawDebugFloorMap(ctx, this);
    if (this.state === 'gameover') this.renderGameOver(ctx);
    if (this.state === 'victory') this.renderVictory(ctx);
  }

  // The variant's ambient light: a tint over the room, glowing wall candles and the player's flame.
  renderLighting(ctx, ox, oy) {
    const light = this.variant?.light;
    if (light?.tint) {
      ctx.fillStyle = light.tint;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (light?.dark) {
      ctx.fillStyle = `rgba(0,0,0,${light.dark})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const l of this.room.lights || []) {
      const g = getLightGlow(l.r, l.color);
      ctx.globalAlpha = 0.75 + Math.sin(this.time * 9 + l.x) * 0.12 + Math.sin(this.time * 23 + l.y) * 0.08;
      ctx.drawImage(g, Math.round(l.x - l.r + ox), Math.round(l.y - l.r + oy));
    }
    ctx.globalAlpha = 1;
    // light spilling in through every open door from the room beyond
    const L = TUNING.lighting, spill = getLightGlow(L.doorLightReach, 'rgba(255,214,150,1)');
    for (const s of this.room.doorSlots) {
      const d = s.door;
      if (!d || d.hidden || d.anim <= 0) continue;
      const [dx, dy] = DIRS[s.dir];
      ctx.globalAlpha = L.doorLight * d.anim * (0.92 + Math.sin(this.time * 3 + s.x) * 0.08);
      ctx.drawImage(spill, Math.round(s.x + dx * 6 - L.doorLightReach + ox), Math.round(s.y + dy * 6 - L.doorLightReach + oy));
    }
    ctx.globalAlpha = 1;
    if (!this.player.dead) this.player.renderLight(ctx, ox, oy);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Between floors: the name of the new floor on a black card.
  renderFloorCard(ctx) {
    const fc = this.floorCard;
    const a = Math.min(1, (fc.dur - fc.t) / 0.35);
    ctx.fillStyle = `rgba(4,3,3,${Math.min(1, a * 1.2)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const k = Math.min(1, fc.t / 0.5) * a;
    ctx.globalAlpha = Math.max(0, k);
    const y = 76 + UI_Y + Math.round((1 - Math.min(1, fc.t / 0.5)) * 6);
    drawText(ctx, fc.sub, VIEW_W / 2, y - 18, { align: 'center', color: '#8a7a62' });
    drawText(ctx, fc.title, VIEW_W / 2, y, { align: 'center', scale: 3, color: '#e8d9b0', shadow: '#2a0e04' });
    ctx.fillStyle = '#5a2410';
    ctx.fillRect(VIEW_W / 2 - 60, y + 28, 120, 1);
    if (fc.curse) drawText(ctx, fc.curse, VIEW_W / 2, y + 36, { align: 'center', color: '#c88af0' });
    drawText(ctx, fc.foot, VIEW_W / 2, y + 56, { align: 'center', color: '#5a4a3a' });
    ctx.globalAlpha = 1;
  }

  // "WICK vs THE OLD BOILER": two bands slide in from the sides.
  renderBossIntro(ctx) {
    const t = this.bossIntro.t, dur = this.bossIntro.dur;
    const inK = Math.min(1, t / 0.35), outK = Math.max(0, (t - (dur - 0.3)) / 0.3);
    const slide = (1 - inK) * VIEW_W + outK * -VIEW_W;
    ctx.fillStyle = `rgba(0,0,0,${0.55 * inK * (1 - outK)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const bandY = 58 + UI_Y, bandH = 100;
    ctx.fillStyle = '#120a08';
    ctx.fillRect(Math.round(slide), bandY, VIEW_W, bandH);
    ctx.fillStyle = '#6a1010';
    ctx.fillRect(Math.round(slide), bandY, VIEW_W, 2);
    ctx.fillRect(Math.round(slide), bandY + bandH - 2, VIEW_W, 2);
    const x0 = Math.round(slide) + UI_X;
    // Wick on the left
    this.player.renderCopy(ctx, x0 + 70, bandY + 70, 0, 0, 1);
    drawText(ctx, this.player.charName, x0 + 70, bandY + 78, { align: 'center', color: '#e8d9b0' });
    // Boss on the right, twice as big
    const img = this.boss ? this.boss.portrait() : null;
    if (img) {
      const sc = Math.min(2, (bandH - 22) / img.height);
      const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
      ctx.drawImage(img, x0 + 286 - Math.round(w / 2), bandY + bandH - 18 - h, w, h);
    }
    const shake = t > 0.35 && t < 0.6 ? Math.round((Math.random() - 0.5) * 4) : 0;
    drawText(ctx, 'VS', x0 + 150 + shake, bandY + 34, { align: 'center', scale: 3, color: '#f08a24' });
    const names = this.bosses.map((b) => b.name);
    names.forEach((nm, i) => drawText(ctx, nm, x0 + 286, bandY + bandH - 14 - (names.length - 1 - i) * 9, { align: 'center', color: '#ff6a5a' }));
  }

  renderVictory(ctx) {
    ctx.fillStyle = '#060404';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const k = Math.min(1, this.stateT / 1.2);
    const P = { x: 62 + UI_X, y: 10 + UI_Y, w: 260, h: 192 };
    drawWaxPanel(ctx, P.x, P.y, P.w, P.h, k, 21);
    const a = inkAlpha(k);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    const mid = P.x + P.w / 2, s = this.summary;
    drawText(ctx, 'WICK ESCAPED', mid, P.y + 10, { align: 'center', scale: 2, color: INK.title, shadow: false });
    drawText(ctx, 'THE SNUFFER IS OUT. YOUR FLAME LIVES ON.', mid, P.y + 32, { align: 'center', color: INK.dim, shadow: false });
    const mm = Math.floor(s.time / 60), ss = Math.floor(s.time % 60);
    const rows = [
      ['TIME', `${mm}:${String(ss).padStart(2, '0')}`],
      ['FLOOR', `${s.floor}. ${s.floorName}`],
      ['ROOMS EXPLORED', `${s.rooms}`],
      ['ENEMIES SNUFFED', `${s.kills}`],
      ['ITEMS FOUND', `${s.items}`],
      ['DAMAGE TAKEN', `${(s.damage / 2).toFixed(1)} HEARTS`],
      ['SEED', this.seed],
    ];
    rows.forEach(([label, value], i) => {
      const y = P.y + 50 + i * 12;
      drawText(ctx, label, P.x + 26, y, { color: INK.dim, shadow: false });
      drawText(ctx, value, P.x + P.w - 26, y, { align: 'right', color: INK.text, shadow: false });
    });
    // items collected this run
    const items = this.stats.items.slice(0, 8);
    items.forEach((id, i) => {
      const icon = itemIcon(id);
      ctx.drawImage(icon, Math.round(mid - items.length * 14 + i * 28 + 14 - icon.width / 2), P.y + 141 - Math.round(icon.height / 2));
    });
    this.victoryMenu.t = this.stateT;
    this.victoryMenu.layout(mid - 50, P.y + 157, 100);
    this.victoryMenu.render(ctx, a * (this.stateT >= 1.2 ? 1 : 0.5));
    ctx.globalAlpha = 1;
  }

  // The final boss's last phase: everything outside Wick's own little light goes dark.
  // The Guttered Flame curse does the same all floor long, with a wider light.
  renderDarkness(ctx, ox = 0, oy = 0) {
    const b = this.boss;
    const bossDark = b && b.def.darkness && b.phase >= b.def.darkness && !b.dead;
    const cursed = (this.curse === 'darkness' || this.pillDarkT > 0) && this.state === 'play' && !this.crawlspace;
    const target = bossDark || cursed ? 1 : 0;
    const dk = this.darkK || 0;
    this.darkK = dk < target ? Math.min(target, dk + 0.02) : Math.max(target, dk - 0.02);
    if (bossDark) this.darkWide = false;
    else if (cursed) this.darkWide = true;
    if (!this.darkK) return;
    this.darkMasks ||= {};
    const wide = !!this.darkWide;
    if (!this.darkMasks[wide]) {
      const r = wide ? TUNING.lighting.darknessWideRadius : TUNING.lighting.darknessRadius;
      const [c, mctx] = makeCanvas(VIEW_W * 2, VIEW_H * 2);
      mctx.fillStyle = 'rgba(2,1,4,0.88)';
      mctx.fillRect(0, 0, c.width, c.height);
      mctx.globalCompositeOperation = 'destination-out';
      const g = mctx.createRadialGradient(VIEW_W, VIEW_H, r / 4, VIEW_W, VIEW_H, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = g;
      mctx.fillRect(0, 0, c.width, c.height);
      this.darkMasks[wide] = c;
    }
    const p = this.player;
    const flicker = Math.sin(this.time * 9) * 1.5;
    ctx.globalAlpha = this.darkK;
    ctx.drawImage(this.darkMasks[wide], Math.round(p.x + ox - VIEW_W + flicker), Math.round(p.y + oy - 22 - VIEW_H));
    ctx.globalAlpha = 1;
  }

  renderEntities(ctx, ox, oy) {
    const list = this.drawList;
    list.length = 0;
    list.push(this.player);
    for (const e of this.enemies) list.push(e);
    for (const it of this.pickups) list.push(it);
    for (const b of this.bombs) list.push(b);
    for (const ped of this.room.pedestals) list.push(ped);
    if (this.room.keeper) list.push(this.room.keeper);
    for (const b of this.bosses) list.push(b);
    for (const s of this.sentries) list.push(s);
    for (const h of this.room.hazards) if (h.render) list.push(h);
    if (this.room.props) for (const pr of this.room.props) list.push(pr);
    for (const d of this.player.mechList('drawables', this)) list.push(d);
    if (!this.player.dead) {
      for (const o of this.orbitals) list.push(o);
      for (const f of this.familiars) list.push(f);
      for (const gn of this.gnats) list.push(gn);
    }
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.renderShadow(ctx, ox, oy);
    this.projectiles.renderShadows(ctx, ox, oy);
    for (const e of list) {
      if (e === this.player && this.player.dead) {
        this.player.renderDeath(ctx, ox, oy, this.state === 'dying' ? Math.min(1, this.stateT / TUNING.player.meltTime) : 1);
      } else if (e === this.player && this.state === 'descend') {
        // Wick climbs down into the dark: shrink toward the hole.
        const s = Math.max(0.05, 1 - this.stateT / 1.1);
        const px = this.player.x + ox, py = this.player.y + oy;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(s, s);
        ctx.translate(-px, -py);
        this.player.render(ctx, ox, oy);
        ctx.restore();
      } else {
        e.render(ctx, ox, oy, this);
      }
    }
  }

  renderRoomLayer(ctx, room, cell, ox, oy) {
    ctx.drawImage(room.bg, ox, oy);
    drawRoomDecor(ctx, room, this.time, ox, oy);
    for (const s of room.doorSlots) drawDoor(ctx, s, s.door, ox, oy);
  }

  renderFloorHints(ctx, ox, oy) {
    const opts = { align: 'center', color: '#4d3c30', shadow: '#140f0c' };
    const room = this.room, lx = room.x0 + room.W * 0.27 + ox, rx = room.x0 + room.W * 0.73 + ox, B = room.B;
    if (this.touch.enabled) {
      drawText(ctx, 'LEFT THUMB: MOVE', lx, B - 40 + oy, opts);
      drawText(ctx, 'RIGHT THUMB: SHOOT', rx, B - 40 + oy, opts);
      drawText(ctx, 'HOLD THE MAP TO SEE THE WHOLE FLOOR', VIEW_W / 2 + ox, B - 26 + oy, opts);
    } else {
      drawText(ctx, 'WASD: MOVE', lx, B - 44 + oy, opts);
      drawText(ctx, 'ARROWS: SHOOT', rx, B - 44 + oy, opts);
      drawText(ctx, 'E: BOMB   SPACE: ITEM   TAB: MAP   ESC: PAUSE', VIEW_W / 2 + ox, B - 30 + oy, opts);
    }
  }

  // The death screen: what got you (its picture), where, the run's numbers and every item you
  // carried. Laid out for the 480x270 screen.
  renderGameOver(ctx) {
    const k = Math.min(1, this.stateT / 0.6);
    ctx.fillStyle = `rgba(6,4,4,${0.6 + k * 0.3})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = k;
    const s = this.summary;
    const mid = VIEW_W / 2;
    drawText(ctx, 'YOUR FLAME WENT OUT', mid, 14, { align: 'center', scale: 2, color: PAL.textWarn });

    // left: the killer's picture in a dark frame
    const fx = 40, fy = 50, fw = 120, fh = 104;
    ctx.fillStyle = '#120b09'; ctx.fillRect(fx, fy, fw, fh);
    ctx.fillStyle = '#3a2418'; ctx.fillRect(fx, fy, fw, 1); ctx.fillRect(fx, fy + fh - 1, fw, 1); ctx.fillRect(fx, fy, 1, fh); ctx.fillRect(fx + fw - 1, fy, 1, fh);
    drawText(ctx, 'SNUFFED OUT BY', fx + fw / 2, fy - 12, { align: 'center', color: PAL.textDim });
    const pic = s.killerPic;
    if (pic && pic.width) {
      const sc = Math.max(1, Math.min(4, Math.floor(Math.min((fw - 16) / pic.width, (fh - 34) / pic.height))));
      const w = pic.width * sc, h = pic.height * sc;
      ctx.drawImage(pic, Math.round(fx + (fw - w) / 2), Math.round(fy + (fh - 22 - h) / 2 + 4), w, h);
    } else {
      drawText(ctx, '?', fx + fw / 2, fy + 26, { align: 'center', scale: 4, color: '#5a4030' });
    }
    drawText(ctx, String(s.killedBy).toUpperCase(), fx + fw / 2, fy + fh - 16, { align: 'center', color: PAL.textBad });

    // right: where and how it went
    const mm = Math.floor(s.time / 60), ss = Math.floor(s.time % 60);
    const rows = [
      ['FLOOR', `${s.floor}. ${s.floorName}`],
      ['TIME', `${mm}:${String(ss).padStart(2, '0')}`],
      ['ROOMS EXPLORED', `${s.rooms}`],
      ['ENEMIES SNUFFED', `${s.kills}`],
      ['DAMAGE TAKEN', `${(s.damage / 2).toFixed(1)} HEARTS`],
      ['SEED', this.seed],
    ];
    const rx = 184, rw = 256;
    rows.forEach(([label, value], i) => {
      const y = fy + 4 + i * 14;
      drawText(ctx, label, rx, y, { color: PAL.textDim });
      drawText(ctx, value, rx + rw, y, { align: 'right' });
    });

    // bottom: the items you carried
    const ids = s.itemIds || [];
    drawText(ctx, ids.length ? `ITEMS (${ids.length})` : 'NO ITEMS', 40, 166, { color: PAL.textDim });
    const cell = 22, perRow = Math.floor((VIEW_W - 80) / cell), maxRows = 2;
    ids.slice(0, perRow * maxRows).forEach((id, i) => {
      const icon = itemIcon(id);
      const cx = 40 + (i % perRow) * cell + cell / 2, cy = 190 + Math.floor(i / perRow) * cell;
      ctx.drawImage(icon, Math.round(cx - icon.width / 2), Math.round(cy - icon.height / 2));
    });
    if (ids.length > perRow * maxRows) drawText(ctx, `+${ids.length - perRow * maxRows}`, VIEW_W - 40, 222, { align: 'right', color: PAL.textDim });

    if (this.stateT >= 0.8 && Math.floor(this.stateT * 2) % 2 === 0) {
      const msg = this.touch.enabled ? 'TAP TO TRY AGAIN' : 'ENTER: NEW RUN   R: SAME SEED   ESC: MENU';
      drawText(ctx, msg, mid, VIEW_H - 16, { align: 'center', color: PAL.text });
    }
    ctx.globalAlpha = 1;
  }
}
