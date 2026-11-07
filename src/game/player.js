// The player's candle: movement, shooting, health, items, character mechanics and animation.
import { buildSprite, flipX, silhouette, tint, makeShadow, makeGlow } from '../engine/sprites.js';
import { COLORS, WICK_BODY, WICK_FACES, FLAME_FRAMES, FLAME_FLARE, COSTUMES, FLAME_COLORS } from '../data/sprites.js';
import { LOOKS, FLAME_GLOWS, makeBody } from '../data/characterSprites.js';
import { CHARACTERS, DEFAULT_CHARACTER } from '../data/characters.js';
import { SOOT_BLAST_DAMAGE, BRASS_COINS } from '../data/pickups.js';
import { STATUS } from '../data/items.js';
import { moveCircle } from './collision.js';
import { computeLoadout } from './items.js';
import { Health } from './health.js';
import { MECHANICS } from './mechanics.js';
import { updateWeapon, renderWeapon, burst } from './weapons.js';
import { sfx } from '../engine/audio.js';
import { TILE, MOVE_SPEED_PX, SHOT_SPEED_PX } from './constants.js';
import { TUNING } from '../data/tuning.js';

// ---------------------------------------------------------------------------
// Art, cached per look (character body + colors + flame + item tint).
const STILL = { x: 0, y: 0 };
const HOLD_GLOW = makeGlow(14, 'rgba(255,236,170,0.6)');
const BODIES = new Map();
function bodyFor(id) {
  let b = BODIES.get(id);
  if (!b) {
    const L = LOOKS[id];
    b = L?.shape ? makeBody(L.shape) : { rows: WICK_BODY, wickY: 0 };
    BODIES.set(id, b);
  }
  return b;
}

const ARTS = new Map();
export function lookArt(look = {}) {
  const id = LOOKS[look.id] ? look.id : 'wick';
  const key = `${id}|${look.colorKey || ''}|${look.bodyTint || ''}|${look.flame || ''}`;
  let A = ARTS.get(key);
  if (A) return A;
  const L = LOOKS[id];
  const body = bodyFor(id);
  const colors = { ...COLORS, ...(L.colors || {}), ...(look.colors || {}) };
  A = { faces: {}, wickY: body.wickY, colors };
  for (const name of Object.keys(WICK_FACES)) {
    let right = buildSprite(body.rows, colors, WICK_FACES[name]);
    if (look.bodyTint) right = tint(right, look.bodyTint, 0.4);
    const left = flipX(right);
    A.faces[name] = {
      right, left,
      flashRight: silhouette(right, '#ffffff'), flashLeft: silhouette(left, '#ffffff'),
      rageRight: silhouette(right, '#ff3020'), rageLeft: silhouette(left, '#ff3020'),
    };
  }
  const flameColors = look.flame && FLAME_COLORS[look.flame] ? { ...COLORS, ...FLAME_COLORS[look.flame] } : COLORS;
  A.flames = FLAME_FRAMES.map((f) => buildSprite(f, flameColors));
  A.flames.splice(2, 0, flipX(A.flames[1]));
  A.flare = buildSprite(FLAME_FLARE, flameColors);
  A.shadow = makeShadow(18, 6, 0.45);
  A.glow = makeGlow(56, FLAME_GLOWS[look.flame] || 'rgba(255,150,60,0.55)');
  A.dark = silhouette(A.faces.down.right, '#0b0807');
  ARTS.set(key, A);
  return A;
}

// The look of a character as it starts a run (select screen, portraits).
export function characterLook(id, colors = null) {
  const def = CHARACTERS[id] || CHARACTERS[DEFAULT_CHARACTER];
  const L = LOOKS[def.look || id] || LOOKS.wick;
  return { id: def.look || id, costumes: [...(L.costumes || [])], flame: L.flame, alpha: L.alpha, noFeet: L.noFeet, colors, colorKey: colors ? JSON.stringify(colors) : '' };
}

// A still picture of a character facing forward (unlock popups). Cached per id.
const PORTRAITS = new Map();
export function characterPortrait(id) {
  let c = PORTRAITS.get(id);
  if (!c) {
    const p = new Player(12, 32, CHARACTERS[id] || CHARACTERS[DEFAULT_CHARACTER], id);
    c = document.createElement('canvas');
    c.width = 24;
    c.height = 34;
    p.drawCandle(c.getContext('2d'), p.look, 12, 32, 0, 0, { flare: false });
    PORTRAITS.set(id, c);
  }
  return c;
}

const COSTUME_ART = {};
function costumeArt(name) {
  if (!COSTUME_ART[name]) {
    const c = COSTUMES[name];
    const right = buildSprite(c.rows, { ...COLORS, ...(c.colors || {}) });
    COSTUME_ART[name] = { right, left: flipX(right) };
  }
  return COSTUME_ART[name];
}

// ---------------------------------------------------------------------------
export class Player {
  // char: a character definition from src/data/characters.js (starting loadout)
  constructor(x, y, char = CHARACTERS[DEFAULT_CHARACTER], charId = DEFAULT_CHARACTER) {
    this.x = x;
    this.y = y;
    const HB = TUNING.hitboxes;
    this.r = HB.playerHurt;                               // hurtbox (lower body, at the feet)
    this.box = { hw: HB.feetW / 2, hh: HB.feetH / 2 };    // collision with walls / rocks / pits
    this.touchR = HB.touch;                               // reaching pickups, pedestals, machines
    this.usesDoors = true;
    this.vx = 0;
    this.vy = 0;

    this.charId = charId;
    this.charDef = char;
    this.charName = char.name || 'WICK';
    this.lookId = char.look || charId;
    this.lookColors = null;        // per-run colors (Motley)
    this.health = new Health(char.health || { hearts: 3 });

    this.coins = char.coins ?? 0;
    this.bombs = char.bombs ?? 1;
    this.keys = char.keys ?? 0;

    this.baseCharStats = { ...(char.stats || {}) };
    this.charStats = { ...this.baseCharStats };
    this.charShot = char.shot || null;
    this.charFlying = !!char.flying;
    this.startItems = new Set(char.items || []);
    this.items = [...(char.items || [])];   // passive item ids, in pickup order
    this.active = char.active ? { id: char.active, charge: 99 } : null;   // { id, charge }
    this.pocket = char.pocket ? { id: char.pocket, charge: 99 } : null;   // second active slot
    this.consumables = [];   // pills, cards, runes, stones: [{ kind, id, color, big }] (src/game/consumables.js)
    this.pillStats = {};   // stat changes from pills, for the whole run
    this.pocketSel = 0;     // which pocket entry Q / PKT uses (the pocket item counts as one)
    this.trinket = null;    // { id, golden }
    this.gulped = [];       // trinkets melted in for good
    this.helperXp = {};     // helpers that grow: { item: { n, floor } }
    this.transforms = [];   // transformations gained this run (src/data/transformations.js), kept for good
    // mechanics: one state object per mechanic, seeded with its parameters
    this.mech = {};
    for (const [name, params] of Object.entries(char.mechanics || {})) if (MECHANICS[name]) this.mech[name] = { ...params };

    this.ward = 0;          // hits blocked before any damage (Wisp, Pale Veil)
    this.ghostT = 0;        // can't be hurt (dashing as smoke)
    this.dashT = 0;
    this.dashDir = { x: 0, y: 1 };
    this.fiendT = 0;        // Cinder Pact
    this.fiendDamage = 0;
    this.speedMul = 1;      // set by mechanics each frame
    this.accelMul = 1;
    this.dmgMul = 1;
    this.recompute();

    this.cooldown = 0;
    this.shotSide = 1;
    this.head = { x: 0, y: 1 };   // where the face looks
    this.lastShoot = { x: 0, y: 1 };
    this.chargeT = 0;
    this.charging = false;
    this.chargeTimeOverride = 0;
    this.walkTime = 0;
    this.flareTime = 0;
    this.shootingTime = 0;
    this.hurtTime = 0;
    this.invuln = 0;
    this.flash = 0;
    this.time = 0;
    this.rageT = 0;
    this.rageDamage = 0;
    this.shieldT = 0;
    this.holdT = 0;
    this.holdIcon = null;
    this.dead = false;
  }

  recompute() {
    computeLoadout(this);
    // the Short Wick curse
    if (this.curseRange && this.curseRange !== 1) this.stats.range = Math.max(2, this.stats.range * this.curseRange);
    // mechanics granted by items (a beam, echoes...): added while held, gone when the item is
    for (const [name, params] of Object.entries(this.itemMechanics)) {
      const had = this.mech[name];
      if (MECHANICS[name] && (!had || (had.fromItem && had.gold !== params.gold))) this.mech[name] = { ...params, fromItem: true };
    }
    for (const name of Object.keys(this.mech)) if (this.mech[name].fromItem && !this.itemMechanics[name]) delete this.mech[name];
  }

  // This volley's rolls: the chance traits of `shot` (poison, crit...) with luck added, capped.
  rollShot() {
    const out = {}, luck = this.stats.luck;
    for (const [k, st] of Object.entries(STATUS)) {
      const base = this.shot[k];
      if (!base) continue;
      out[k] = Math.random() < Math.min(st.cap, base + Math.max(0, luck) * st.luck);
    }
    return out;
  }

  // Call every mechanic's hook. True if any of them returned true (handled / prevented).
  runMech(hook, ...args) {
    let any = false;
    for (const [name, m] of Object.entries(this.mech)) {
      const fn = MECHANICS[name][hook];
      if (fn && fn(...args, this, m)) any = true;
    }
    return any;
  }

  // Collect the arrays some hooks return (extra bodies, extra things to draw).
  mechList(hook, ...args) {
    const out = [];
    for (const [name, m] of Object.entries(this.mech)) {
      const fn = MECHANICS[name][hook];
      if (fn) out.push(...fn(...args, this, m));
    }
    return out;
  }

  get moveSpeed() { return this.stats.speed * MOVE_SPEED_PX * this.speedMul; }
  get chargeTime() { return this.chargeTimeOverride || 2.2 / this.stats.fireRate + 0.25; }

  update(dt, game) {
    const { input } = game;
    this.time += dt;
    this.flareTime = Math.max(0, this.flareTime - dt);
    this.shootingTime = Math.max(0, this.shootingTime - dt);
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.rageT = Math.max(0, this.rageT - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    this.holdT = Math.max(0, this.holdT - dt);
    this.danceT = Math.max(0, (this.danceT || 0) - dt);   // a quality 4 item: a little dance
    this.confuseT = Math.max(0, (this.confuseT || 0) - dt);   // a bad pill: controls the wrong way
    this.heavyT = Math.max(0, (this.heavyT || 0) - dt);       // a bad pill: heavy feet
    if (this.danceT > 0 && Math.random() < dt * 30) {
      game.particles.spawn(this.x + (Math.random() - 0.5) * 26, this.y - 10, { z: 8 + Math.random() * 14, vz: 40, life: 0.6, color: Math.random() < 0.5 ? '#ffd25a' : '#fff3c0', gravity: -20 });
    }
    this.ghostT = Math.max(0, this.ghostT - dt);
    this.fiendT = Math.max(0, this.fiendT - dt);
    this.flying = this.baseFlying || this.fiendT > 0;
    if (this.dead) return;
    this.speedMul = this.heavyT > 0 ? 0.6 : 1;
    // stuck in a web (The Weeping Hollow)
    if (this.webT > 0) { this.webT -= dt; this.speedMul = 0.45; }
    this.accelMul = 1;
    this.dmgMul = 1;
    this.runMech('update', dt, game);

    // Movement with a little acceleration/slide (dashes take over for a moment).
    let mv = this.danceT > 0 ? STILL : input.move;   // dancing: stand still
    if (this.confuseT > 0) mv = { x: -mv.x, y: -mv.y };
    const moving = mv.x !== 0 || mv.y !== 0;
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashDir.x * 420;
      this.vy = this.dashDir.y * 420;
      if (this.dashT <= 0) { this.vx *= 0.3; this.vy *= 0.3; }
      // smoke burns whatever it passes through, once each
      for (const e of game.targets()) {
        const owner = e.boss || e;
        if (this.dashHits?.has(owner) || Math.hypot(e.x - this.x, e.y - this.y) > e.r + this.r + 4) continue;
        this.dashHits?.add(owner);
        if (e.boss) e.boss.takeHit(this.dashDamage, game);
        else e.takeHit(this.dashDamage, this.dashDir.x, this.dashDir.y, 120, game);
      }
      if (Math.random() < dt * 40) game.particles.spawn(this.x, this.y - 4, { z: 6, vz: 10, life: 0.4, color: '#2a2226', size: 2 });
    } else {
      // Isaac-like: full speed in ~0.1 s, a short slide (~0.15 s) after letting go
      const P = TUNING.player;
      const tx = mv.x * this.moveSpeed, ty = mv.y * this.moveSpeed;
      const top = Math.max(1, this.moveSpeed);
      const step = (moving ? top / P.accelTime : top / P.slideTime) * this.accelMul * dt;
      const dvx = tx - this.vx, dvy = ty - this.vy, dl = Math.hypot(dvx, dvy);
      if (dl <= step) { this.vx = tx; this.vy = ty; }
      else { this.vx += (dvx / dl) * step; this.vy += (dvy / dl) * step; }
    }
    moveCircle(this, this.vx * dt, this.vy * dt, game.room, this.flying ? 'fly' : 'walk');

    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 8) this.walkTime += dt * (0.6 + spd / Math.max(1, this.moveSpeed));
    else this.walkTime = 0;

    // Shooting (not while dancing)
    if (this.danceT > 0) { this.charging = false; return; }
    const sh = input.shoot;
    const shooting = sh.x !== 0 || sh.y !== 0;
    // the body faces where Wick walks; the head where he shoots (else where he walks, and after a
    // moment standing still it looks back down at you)
    if (moving) this.bodyDir = Math.abs(mv.x) > Math.abs(mv.y) ? (mv.x > 0 ? 'right' : 'left') : (mv.y < 0 ? 'up' : 'down');
    else if (spd < 20) this.bodyDir = 'down';
    this.idleT = moving || shooting ? 0 : (this.idleT || 0) + dt;
    if (shooting) {
      this.head.x = sh.x;
      this.head.y = sh.y;
      this.lastShoot.x = sh.x;
      this.lastShoot.y = sh.y;
    } else if (moving) {
      this.head.x = mv.x;
      this.head.y = mv.y;
    } else if (this.idleT > TUNING.player.headIdle) {
      this.head.x = 0;
      this.head.y = 1;
    }

    // Some characters don't attack at all for a while (heat, nothing); the rest use their weapon
    if (this.runMech('weapon', dt, game, sh.x, sh.y, shooting)) { this.charging = false; return; }
    updateWeapon(dt, game, this, sh.x, sh.y, shooting);
  }

  // The damage one shot does right now (stats, temporary boosts, heat...).
  get shotDamage() {
    return (this.stats.damage + (this.rageT > 0 ? this.rageDamage : 0) + (this.fiendT > 0 ? this.fiendDamage : 0) + (this.roomDamage || 0)) * this.dmgMul;
  }

  // Fires one volley of wax (or bombs): multishot, back shots and any mimicking helpers all come
  // from here. Other weapon forms live in src/game/weapons.js.
  //   opt.from {x, y}: fire from somewhere else (echoes, a twin), opt.noHook: don't tell mechanics
  //   opt.spray n: a barrage of n shots in a ragged cone (opt.ring: all the way round)
  //   opt.bomb: bomb shots, opt.style: force a look
  fire(game, dx, dy, damageMul = 1, sizeMul = 1, opt = {}) {
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const s = this.stats, sh = this.shot;
    const damage = this.shotDamage * damageMul;
    const TT = TUNING.tears;
    const r = Math.max(TT.sizeMin, Math.min(TT.sizeMax, Math.round((TT.sizeBase + (damage - 3.5) * TT.sizePerDamage) * sh.sizeMul * sizeMul)));
    const speed = s.shotSpeed * SHOT_SPEED_PX * (opt.bomb ? 0.8 : 1);
    const count = opt.spray || 1 + sh.multishot;
    const base = Math.atan2(dy, dx);
    const spread = count > 2 ? 0.2 : 0.12;
    const fiend = this.fiendT > 0;
    const style = opt.style || (fiend ? 'ember' : sh.style);
    const lob = sh.lobbed && !opt.bomb;
    this.shotSide = -this.shotSide;
    const eye = TUNING.player.eyeOffset;

    const emitters = opt.from ? [opt.from] : [this, ...game.familiars.filter((f) => f.def.variant === 'twin' || f.mimic)];
    for (const em of emitters) {
      const isMe = em === this || em === opt.from;
      const moving = em === this;
      const shootOne = (a, side, sp = 1, sz = 1) => {
        const cx = Math.cos(a), cy = Math.sin(a);
        // each shot rolls its own chances (luck helps); a shot that rolled one wears its color
        const roll = this.rollShot();
        const rolled = Object.keys(roll).find((k) => roll[k] && k !== 'crit');
        const crit = !!roll.crit;
        const dmg = (isMe ? damage : damage * 0.75) * (crit ? 3 : 1);
        game.projectiles.spawn({
          x: em.x + cx * 5 - cy * eye * side,
          y: em.y + cy * 3 + cx * eye * side + 2,
          z: opt.bomb ? 4 : TUNING.player.eyeHeight,
          vx: cx * speed * sp + (moving ? this.vx * TT.inherit : 0),
          vy: cy * speed * sp + (moving ? this.vy * TT.inherit : 0),
          r: Math.max(3, Math.round(((isMe ? r : Math.max(3, r - 1)) + (crit ? 2 : 0)) * sz)),
          damage: opt.bomb ? dmg * 2.2 + 4 : dmg,
          range: s.range * TILE * (opt.spray ? 0.7 + Math.random() * 0.5 : 1),
          team: 'player',
          // faster and bigger shots push harder
          knockback: TT.knockback * s.shotSpeed * (r / TT.sizeBase) * sh.knockbackMul * (crit ? 1.6 : 1),
          style: crit ? 'gold' : rolled && !opt.style ? STATUS[rolled].style : style,
          homing: sh.homing, pierce: sh.pierce, spectral: sh.spectral || sh.orbit,
          bounce: sh.bounce, split: sh.split, burn: roll.burn || fiend,
          poison: roll.poison, slow: roll.slow, freeze: roll.freeze, fear: roll.fear, charm: roll.charm, chain: roll.chain,
          grow: sh.grow, pull: sh.pull, hover: sh.hover, wrap: sh.wrap, eraser: sh.eraser, orbit: sh.orbit && !opt.bomb, own: true,
          execute: roll.execute, explode: sh.explode || sh.lobbed || roll.blast,
          lob, bomb: opt.bomb ? { fuse: 1.1, radius: 26 * Math.min(2, sh.sizeMul) * (sh.explode || sh.lobbed ? 1.3 : 1) } : null,
        });
      };
      if (opt.spray) {
        for (let i = 0; i < count; i++) {
          const a = opt.ring ? base + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3 : base + (Math.random() - 0.5) * 0.9;
          shootOne(a, 0, 0.75 + Math.random() * 0.5, 0.7 + Math.random() * 0.5);
        }
      } else {
        for (let i = 0; i < count; i++) {
          const a = base + (i - (count - 1) / 2) * spread;
          shootOne(a, count === 1 ? this.shotSide : 0);
        }
      }
      if (sh.backShot) shootOne(base + Math.PI, 0);
    }
    if (!opt.quiet) {
      this.flareTime = 0.09;
      this.lastShotAt = this.time;   // the head squashes
      sfx(opt.bomb ? 'swing' : 'shoot');
      this.shootingTime = Math.min(0.18, 0.6 / s.fireRate);
    }
    if (!opt.noHook) this.runMech('fired', game, dx, dy, damageMul, sizeMul);
  }

  // A one-off attack with whatever weapon is held, from somewhere else (echoes, a twin body).
  burst(game, dx, dy, damageMul = 1, sizeMul = 1, opt = {}) {
    burst(game, this, opt.from || this, dx, dy, damageMul, sizeMul, opt);
  }

  // amount in half hearts. Returns true if it landed.
  // self: damage you chose to take (sacrifice spike, thorned door, blood machine) doesn't spoil a
  // floor's chance of a deal
  hurt(amount, source, game, fromX = this.x, fromY = this.y + 1, self = false) {
    if (this.invuln > 0 || this.dead || this.shieldT > 0 || this.ghostT > 0 || this.danceT > 0) return false;
    amount = game.hitSize ? game.hitSize(amount) : amount;   // full hearts from the womb on
    if (this.ward > 0) {
      // a ward pops instead of the candle getting hurt
      this.ward--;
      this.invuln = 1.0;
      sfx('ward');
      game.effects.ring(this.x, this.y - 6, 22, 'rgba(230,240,255,0.9)', 0.35, 6);
      game.particles.burst(this.x, this.y - 6, 14, { colors: ['#ffffff', '#c8d8f0'], speed: 70, z: 10, vz: 40 });
      return false;
    }
    const redBefore = this.health.red;
    const ev = this.health.damage(amount);
    if (!self && this.health.red < redBefore) {
      game.floorRedHit = true;
      if (game.cell?.type === 'boss') game.bossRedHit = true;
    }
    game.stats.damageTaken += amount;
    game.floorDamage = (game.floorDamage || 0) + amount;

    const P = TUNING.player;
    this.invuln = amount >= 2 ? P.invulnFull : P.invuln;
    this.flash = 0.08;
    this.hurtTime = P.flinch;
    let dx = this.x - fromX, dy = this.y - fromY;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) { dx = 0; dy = 1; } else { dx /= len; dy /= len; }
    this.hurtDir = { x: dx, y: dy };
    this.vx += dx * P.knockback;
    this.vy += dy * P.knockback;
    game.shake(P.hurtShake);
    game.hurtFlash = P.hurtFlash;
    sfx('hurt');
    game.particles.burst(this.x, this.y, 8, { colors: [COLORS.w, COLORS.W, COLORS.d], speed: 60, z: 10, vz: 60 });
    this.heartEffects(ev, game);
    this.runMech('hurt', game, amount);

    if (this.health.oneHit || !this.health.alive) this.die(game, source);
    return true;
  }

  // What losing special hearts does.
  heartEffects(ev, game) {
    if (ev.golden) {
      for (let i = 0; i < BRASS_COINS; i++) game.spawnPickup('coin', this.x, this.y);
      sfx('coin');
      game.particles.burst(this.x, this.y - 8, 10, { colors: ['#d8b048', '#fff0a0'], speed: 70, z: 10, vz: 60 });
    }
    for (let i = 0; i < ev.black; i++) game.sootBlast(this.x, this.y);
    if (ev.bones) {
      sfx('boneBreak');
      game.particles.burst(this.x, this.y - 6, 12, { colors: ['#e8e0c8', '#9a907a'], speed: 80, z: 10, vz: 70 });
    }
    if (ev.eternal) game.particles.burst(this.x, this.y - 8, 10, { colors: ['#ffffff', '#efe6cc'], speed: 50, z: 12, vz: 50 });
  }

  // Out of health: a mechanic may still save the day (Morrow comes back once).
  die(game, source) {
    if (this.dead) return;
    if (this.runMech('preventDeath', game)) return;
    this.dead = true;
    this.killedBy = source;
    this.killerPic = game.killerPicture?.(source) || null;   // shown on the death screen
    game.onPlayerDeath();
  }

  // Wick melts into a puddle and his flame goes out. k goes 0 -> 1. The little body sinks into the
  // puddle first, then the head slumps down after it.
  renderDeath(ctx, ox, oy, k) {
    const a = lookArt(this.look);
    const melt = Math.min(1, k * 1.25);
    const cx = Math.round(this.x + ox), base = Math.round(this.y + 3 + oy);
    const pw = 10 + Math.round(melt * 16), ph = 3 + Math.round(melt * 3);
    const legs = !this.look.noFeet;
    const sink = legs ? Math.round(Math.max(0, 1 - melt / 0.4) * 8) : 0;   // how much body still shows
    if (legs && sink > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - 12, base - ph - 12, 24, 12);
      ctx.clip();
      this.drawBody(ctx, a, cx, base - ph + 1 + (8 - sink), 'down', -1);
      ctx.restore();
    }
    for (let i = 0; i < ph; i++) {
      const t = (i + 0.5 - ph / 2) / (ph / 2);
      const half = Math.round((pw / 2) * Math.sqrt(1 - t * t));
      ctx.fillStyle = i === 0 ? COLORS.w : i < ph - 1 ? COLORS.W : COLORS.d;
      ctx.fillRect(cx - half, base - ph + i, half * 2, 1);
    }
    const body = a.faces.hurt.right;
    const h = Math.max(1, Math.round(16 * (1 - melt * 0.9)));
    const w = 18 + Math.round(melt * 6);
    const top = base - ph - h + 2 - sink;
    ctx.drawImage(body, 0, 0, 18, 16, cx - Math.round(w / 2), top, w, h);
    if (k < 0.3) {
      const f = a.flames[Math.floor(this.time * 12) % a.flames.length];
      const s = 1 - k / 0.3;
      const fw = Math.max(1, Math.round(f.width * s)), fh = Math.max(1, Math.round(f.height * s));
      ctx.drawImage(f, cx - Math.round(fw / 2), top + 1 - fh, fw, fh);
    }
  }

  get facing() {
    const { x, y } = this.head;
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left';
    return y < 0 ? 'up' : 'down';
  }

  // which way the little body faces (where Wick walks)
  get bodyFacing() { return this.bodyDir || 'down'; }

  get hover() {
    return this.flying ? 3 + Math.round(Math.sin(this.time * 6) * 1.5) : 0;
  }

  renderShadow(ctx, ox, oy) {
    const a = lookArt(this.look);
    ctx.drawImage(a.shadow, Math.round(this.x - 9 + ox), Math.round(this.y + oy));
  }

  drawCostumes(ctx, look, bx, by, facing, behind) {
    const dirKey = facing === 'left' || facing === 'right' ? 'side' : facing;
    const left = facing === 'left';
    for (const name of look.costumes || []) {
      const c = COSTUMES[name];
      if (!c || !!c.behind !== behind || !c.facings.includes(dirKey)) continue;
      const img = costumeArt(name)[left ? 'left' : 'right'];
      const x = left ? 18 - c.x - img.width : c.x;
      const flap = c.flap && Math.floor(this.time * 10) % 2 === 0 ? -1 : 0;
      ctx.drawImage(img, bx + x, by + c.y + flap);
    }
  }

  // The little wax body under the big head: it faces where Wick WALKS (the head faces where he
  // shoots), legs stepping and stubby arms swinging. fy is the bottom row of the feet.
  drawBody(ctx, a, cx, fy, dir, step, flash = false) {
    const C = a.colors;
    const K = flash ? '#ffffff' : C.k, W1 = flash ? '#ffffff' : C.w, W2 = flash ? '#ffffff' : C.W;
    const D = flash ? '#ffffff' : C.d, LH = flash ? '#ffffff' : C.l;
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const bob = step === 1 || step === 3 ? 1 : 0;
    if (dir === 'left' || dir === 'right') {
      const s = dir === 'left' ? -1 : 1;
      const sw = step < 0 ? 0 : [2, 0, -2, 0][step];          // the stride: legs scissor
      for (const [off, shade] of [[-sw, D], [sw, W2]]) {      // back leg, then front leg
        const lx = cx - 1 + off * s;
        r(lx - 1, fy - 2, 3, 3, K); r(lx, fy - 2, 1, 2, shade);
      }
      const t = fy - 9 + bob, L = cx - 4;
      r(L + 1, t, 6, 8, K); r(L, t + 1, 8, 6, K);
      r(L + 1, t + 1, 6, 6, W1);
      r(s > 0 ? L + 5 : L + 2, t + 1, 1, 6, W2);
      r(s > 0 ? L + 6 : L + 1, t + 2, 1, 4, D);
      const ax = cx + Math.round(-sw * 0.6) * s;              // one arm, swinging against the front leg
      r(ax, t + 3, 1, 3, D); r(ax, t + 6, 1, 1, K);
      return;
    }
    // facing down (front) or up (back): the legs take turns lifting
    const lu = step === 0 ? 1 : 0, ru = step === 2 ? 1 : 0;
    r(cx - 4, fy - 2 - lu, 3, 3, K); r(cx - 3, fy - 2 - lu, 1, 2, W2);
    r(cx + 1, fy - 2 - ru, 3, 3, K); r(cx + 2, fy - 2 - ru, 1, 2, D);
    const t = fy - 9 + bob, L = cx - 5;
    const sway = step === 0 ? -1 : step === 2 ? 1 : 0;
    r(L - 2, t + 3 + sway, 3, 3, K); r(L - 1, t + 4 + sway, 1, 1, W1);   // arms
    r(L + 9, t + 3 - sway, 3, 3, K); r(L + 10, t + 4 - sway, 1, 1, W2);
    r(L + 1, t, 8, 8, K); r(L, t + 1, 10, 6, K);
    r(L + 1, t + 1, 8, 6, W1);
    if (dir !== 'up') r(L + 1, t + 1, 1, 5, LH);
    r(L + 6, t + 1, 2, 6, W2); r(L + 8, t + 2, 1, 4, D);
  }

  // Draw the candle (big head on a little body) with this player's animation state; also used
  // for twins, echoes and portraits. body: false draws the old head-only candle with two feet
  // (small icons). Returns where the head ended up.
  drawCandle(ctx, look, x, y, ox, oy, { flash = false, rage = false, alpha = 1, flare = true, body = true } = {}) {
    const a = lookArt(look), P = TUNING.player;
    const facing = this.facing;
    const shooting = this.shootingTime > 0 || this.charging;
    let face;
    if (this.hurtTime > 0) face = 'hurt';
    else if (facing === 'up') face = 'up';
    else if (facing === 'down') face = shooting ? (this.shotSide > 0 ? 'downShootL' : 'downShootR') : 'down';
    else face = shooting ? 'sideShoot' : 'side';
    const set = a.faces[face] || a.faces.down;
    const left = facing === 'left';
    const head = flash ? (left ? set.flashLeft : set.flashRight) : left ? set.left : set.right;

    const step = this.walkTime > 0 && !this.flying ? Math.floor(this.walkTime * 10) % 4 : -1;
    const bob = step === 1 || step === 3 ? 1 : 0;
    const hover = this.hover;
    const cx = Math.round(x + ox), fy = Math.round(y + oy) + 1 - hover;
    const legs = body && !look.noFeet;
    // the head: squashes for a moment with every shot, flinches back when hurt
    const squash = this.time - (this.lastShotAt ?? -9) < P.shotSquash ? 2 : 0;
    const flinch = this.hurtTime > P.flinch - 0.12 && this.hurtDir ? this.hurtDir : null;
    const hx = flinch ? Math.round(flinch.x * 2) : 0, hy = flinch ? Math.round(flinch.y * 2) : 0;
    const bx = cx - 9 + hx;
    const by = (legs ? fy - 23 : fy - 15) + bob + hy;
    const hw = 18 + squash, hh = 16 - squash, hTop = by + 16 - hh;
    const baseAlpha = (look.alpha ?? 1) * alpha;
    if (baseAlpha < 1) ctx.globalAlpha = baseAlpha;

    this.drawCostumes(ctx, look, bx, by, facing, true);
    if (legs) this.drawBody(ctx, a, cx, fy, this.bodyFacing, step, flash);
    else if (!look.noFeet) {
      ctx.fillStyle = flash ? '#ffffff' : COLORS.k;
      const lf = step === 0 ? -1 : 0, rf = step === 2 ? -1 : 0;
      ctx.fillRect(cx - 5, fy + lf, 3, 2);
      ctx.fillRect(cx + 2, fy + rf, 3, 2);
    }
    ctx.drawImage(head, bx - squash / 2, hTop, hw, hh);
    if (rage && !flash) {
      ctx.globalAlpha = baseAlpha * (0.25 + Math.sin(this.time * 14) * 0.12);
      ctx.drawImage(left ? set.rageLeft : set.rageRight, bx - squash / 2, hTop, hw, hh);
      ctx.globalAlpha = baseAlpha;
    }
    this.drawCostumes(ctx, look, bx, hTop, facing, false);
    const flame = flare && this.flareTime > 0 ? a.flare : a.flames[Math.floor(this.time * 9) % a.flames.length];
    const flameY = hTop + a.wickY - flame.height + 2;
    ctx.drawImage(flame, bx + 9 - flame.width / 2, flameY);
    ctx.globalAlpha = 1;
    return { bx, by: hTop, flameTop: flameY };
  }

  render(ctx, ox, oy, game) {
    if (this.invuln > 0 && this.flash <= 0 && this.ghostT <= 0 && Math.floor(this.invuln * TUNING.player.blinkRate) % 2 === 0) return;
    const smoke = this.ghostT > 0;
    // a quality 4 item: hop and sway from side to side, turning left and right
    let dx = 0, dy = 0;
    const head = { ...this.head };
    if (this.danceT > 0) {
      const t = this.time * 11;
      dy = -Math.round(Math.abs(Math.sin(t)) * 4);
      dx = Math.round(Math.sin(t * 0.5) * 2);
      this.head.x = Math.sin(t * 0.5) > 0 ? 1 : -1; this.head.y = 0;
    } else if (this.holdT > 0) { this.head.x = 0; this.head.y = 1; }   // faces you while holding it up
    const { bx, by, flameTop } = this.drawCandle(ctx, this.look, this.x + dx, this.y + dy, ox, oy, {
      flash: this.flash > 0, rage: this.rageT > 0 || this.fiendT > 0, alpha: smoke ? 0.35 : 1,
    });
    Object.assign(this.head, head);
    if (game) { renderWeapon(ctx, ox, oy, game, this); this.runMech('render', ctx, ox, oy, game); }

    // Holding up a new item: two little wax arms raise it over the flame, a glow behind it
    if (this.holdT > 0 && this.holdIcon) {
      const ic = this.holdIcon;
      const rise = Math.min(1, (1.1 - this.holdT) / 0.15);
      const ix = Math.round(this.x + dx - ic.width / 2 + ox), iy = Math.round(flameTop - ic.height - 1 - rise * 2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + Math.sin(this.time * 8) * 0.15;
      ctx.drawImage(HOLD_GLOW, ix + ic.width / 2 - 14, iy + ic.height / 2 - 14);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      for (const [sx, ex] of [[bx + 1, ix + 2], [bx + 16, ix + ic.width - 3]]) {
        const sy = by + 10, ey = iy + ic.height - 1;
        const n = Math.max(1, Math.abs(ey - sy));
        for (let i = 0; i <= n; i++) {
          const x = Math.round(sx + ((ex - sx) * i) / n), y = Math.round(sy + ((ey - sy) * i) / n);
          ctx.fillStyle = COLORS.k; ctx.fillRect(x - 1, y, 3, 1);
          ctx.fillStyle = '#e8d9b0'; ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.drawImage(ic, ix, iy);
      if (Math.floor(this.time * 10) % 3 === 0) { ctx.fillStyle = '#fff3c0'; ctx.fillRect(ix + ((this.time * 97) % ic.width | 0), iy - 2, 1, 1); }
    }

    // Charge bar
    if (this.charging) {
      const c = this.chargeT / this.chargeTime;
      const x = Math.round(this.x - 8 + ox), y = by + 18 + 4;
      ctx.fillStyle = '#160f0c';
      ctx.fillRect(x - 1, y - 1, 18, 4);
      ctx.fillStyle = c >= 1 ? (Math.floor(this.time * 12) % 2 ? '#fff3c0' : '#ffd25a') : '#f08a24';
      ctx.fillRect(x, y, Math.round(16 * c), 2);
    }

    // Bell Jar shield, and the softer ring of a ward
    if (this.shieldT > 0 || this.ward > 0) {
      const blink = this.shieldT > 0 && this.shieldT < 1 && Math.floor(this.shieldT * 10) % 2 === 0;
      if (!blink) {
        const ward = this.shieldT <= 0;
        ctx.fillStyle = ward ? 'rgba(240,244,255,0.45)' : 'rgba(160,220,255,0.55)';
        const cx = this.x + ox, cy = this.y - 12 + oy - this.hover;
        const n = ward ? 24 : 40;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + this.time * (ward ? -0.7 : 1);
          ctx.fillRect(Math.round(cx + Math.cos(ang) * 14), Math.round(cy + Math.sin(ang) * 16), 1, 1);
        }
      }
    }
  }

  // Draw a see-through copy of the candle somewhere else (Tallow Twin, boss intro), standing still.
  renderCopy(ctx, x, y, ox, oy, alpha, look = this.look) {
    const a = lookArt(look);
    const facing = this.facing;
    const set = a.faces[facing === 'up' ? 'up' : facing === 'down' ? 'down' : 'side'];
    const head = facing === 'left' ? set.left : set.right;
    const cx = Math.round(x + ox), fy = Math.round(y + oy) + 1;
    const bx = cx - 9, by = look.noFeet ? fy - 15 : fy - 23;
    ctx.globalAlpha = alpha * (look.alpha ?? 1);
    ctx.drawImage(a.shadow, bx, Math.round(y + oy));
    this.drawCostumes(ctx, look, bx, by, facing, true);
    if (!look.noFeet) this.drawBody(ctx, a, cx, fy, 'down', -1);
    ctx.drawImage(head, bx, by);
    this.drawCostumes(ctx, look, bx, by, facing, false);
    const flame = a.flames[Math.floor(this.time * 9 + 1) % a.flames.length];
    ctx.drawImage(flame, bx + 9 - flame.width / 2, by + a.wickY - flame.height + 2);
    ctx.globalAlpha = 1;
  }

  // Warm light around the flame, drawn additively after the world.
  renderLight(ctx, ox, oy) {
    const a = lookArt(this.look);
    const flicker = 0.85 + Math.sin(this.time * 13) * 0.05 + Math.sin(this.time * 31) * 0.04 + (this.flareTime > 0 ? 0.15 : 0);
    ctx.globalAlpha = 0.32 * flicker;
    ctx.drawImage(a.glow, Math.round(this.x - 56 + ox), Math.round(this.y - 84 + oy - this.hover));
    ctx.globalAlpha = 1;
  }
}
