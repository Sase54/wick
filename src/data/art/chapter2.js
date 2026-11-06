// Chapter 2 enemy art: The Grotto (caves), The Ossuary (catacombs), The Sunken Caves (flooded).
// Same conventions as src/data/enemyArt.js (front/back/side views and state poses).
import { ramp, light } from '../../engine/pixelgrid.js';
import { ENEMY_ART, shade, eyes, stars, GLOW } from '../enemyArt.js';

const STONE = ['#2a2622', '#403a34', '#5a524a', '#766c60', '#958a7c'];
const BAT = ['#140e14', '#241a22', '#362832', '#4a3844', '#5e4a58'];
const CRYS = ['#14304a', '#1e5280', '#3a86c0', '#7ac4f0', '#d8f4ff'];
const BONE = ['#5a5244', '#7a7260', '#9a927e', '#bcb49e', '#e0d8c2'];
const GHOSTB = ['#34404c', '#4e5c6a', '#74828e', '#a4b2be', '#dce6ee'];
const FISH = ['#102a2c', '#1c4446', '#2c6260', '#4a847a', '#78ac9a'];
const DROWN = ['#2e3a30', '#455644', '#5e705a', '#7c8e74', '#9cae92'];
const PUFF = ['#4a3a14', '#7a6420', '#a8902e', '#d0b84a', '#f0e080'];
const SHELL = ['#2a2834', '#423e4e', '#5e5868', '#7e7888', '#a8a2b0'];
const RUST = ['#3a2416', '#5a3a22', '#7a5230', '#9a6a40'];

const eyeGlow = (o, base) => (o.state === 'wind' ? GLOW[o.f % 2] : base);

Object.assign(ENEMY_ART, {
  // ===================================================================== The Grotto
  // Shriekbat: flutters erratically; spreads its wings and shrieks out a ring of sound.
  shriekbat: {
    w: 24, h: 14, frames: { idle: 2, move: 2, wind: 2 },
    paint(g, o) {
      const cx = 12, cy = 7, up = o.f % 2 === 0, spread = o.state === 'wind';
      for (const s of [-1, 1]) {
        const tip = spread ? 0 : up ? 1 : 10;
        g.poly([[cx + s * 2, cy - 1], [cx + s * 11, tip], [cx + s * 9, cy + 3], [cx + s * 6, cy + 1], [cx + s * 4, cy + 4]], (x, y) => ramp(BAT, 0.6 - Math.abs(x - cx) / 30, x, y));
      }
      g.ellipse(cx, cy, 3, 3.5, shade(BAT, 0.15));
      g.set(cx - 2, cy - 4, BAT[3]); g.set(cx + 2, cy - 4, BAT[3]);
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#ff4a2a');
      g.set(cx - 1, cy - 1, e); g.set(cx + 1, cy - 1, e);
      if (spread) { g.ellipse(cx, cy + 2, 1.5, 1.5, '#2a0808'); g.set(cx - 1, cy + 1, '#e8e0c8'); g.set(cx + 1, cy + 1, '#e8e0c8'); }
    },
  },

  // Pebbler: looks like a rock until you come close; uncurls, rolls at you, then sits dizzy.
  pebbler: {
    w: 20, h: 18, frames: { idle: 1, wind: 2, attack: 4, stun: 4 },
    paint(g, o) {
      const cx = 10, cy = 10;
      if (o.state === 'idle') {
        g.ellipse(cx, cy + 1, 8, 6.5, shade(STONE));
        g.line(cx - 4, cy - 2, cx - 1, cy + 2, STONE[1]); g.line(cx + 2, cy - 4, cx + 4, cy, STONE[1]);
        return;
      }
      if (o.state === 'attack') {
        g.ellipse(cx, cy + 1, 7.5, 7.5, shade(STONE, 0.05));
        const a = o.f * 1.5;
        for (let i = 0; i < 4; i++) g.line(cx, cy + 1, cx + Math.cos(a + i * 1.57) * 6, cy + 1 + Math.sin(a + i * 1.57) * 6, STONE[1]);
        return;
      }
      g.ellipse(cx, cy + 2, 8, 6, shade(STONE));
      g.rect(cx - 7, cy + 6, 3, 2, STONE[1]); g.rect(cx + 4, cy + 6, 3, 2, STONE[1]);
      if (o.dir === 'up') return;
      g.ellipse(cx, cy + 3, 4, 3, '#2a2420');
      const e = o.state === 'stun' ? '#ffffff' : eyeGlow(o, '#ffd25a');
      g.set(cx - 2, cy + 2, e); g.set(cx + 2, cy + 2, e);
      if (o.state === 'stun') stars(g, cx, 2, o.f);
    },
  },

  // Boulderback: a slow rock golem; raises its fists, slams the floor, a shockwave of stones.
  boulderback: {
    w: 28, h: 28, frames: { idle: 2, move: 2, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 14, raised = o.state === 'wind', slam = o.state === 'attack', step = o.state === 'move' ? o.f : 0;
      g.rect(cx - 7, 22, 5, 5 - step, STONE[1]); g.rect(cx + 2, 22, 5, 4 + step, STONE[1]);
      g.ellipse(cx, 16, 10, 9, shade(STONE));
      g.ellipse(cx, 7, 6, 5, shade(STONE, 0.1));
      for (const [x, y] of [[cx - 5, 13], [cx + 4, 18], [cx - 2, 20], [cx + 6, 11]]) g.set(x, y, '#6a8a4a');
      const arm = (s) => {
        const ax = cx + s * 11, ay = raised ? 4 : slam ? 24 : 16;
        g.line(cx + s * 8, 13, ax, ay, STONE[2]);
        g.ellipse(ax, ay, 3.5, 3.5, shade(STONE, 0.05));
      };
      arm(-1); arm(1);
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#ffb040');
      g.rect(cx - 3, 6, 2, 2, e); g.rect(cx + 2, 6, 2, 2, e);
    },
  },

  // Pick Ghoul: a dead miner with a pickaxe. Raises it (glinting), then swings in front of it.
  pickghoul: {
    w: 24, h: 26, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 11, step = o.state === 'move' ? o.f % 4 : 0;
      g.rect(cx - 4, 20, 3, 5 - (step === 1 ? 1 : 0), DROWN[1]); g.rect(cx + 1, 20, 3, 5 - (step === 3 ? 1 : 0), DROWN[1]);
      g.poly([[cx - 6, 9], [cx + 6, 9], [cx + 5, 21], [cx - 5, 21]], (x, y) => ramp(RUST, 0.7 - Math.abs(x - cx) / 14, x, y));
      g.ellipse(cx, 6, 4.5, 4.5, shade(DROWN));
      g.rect(cx - 5, 1, 10, 3, '#8a7a30'); g.set(cx, 0, '#ffd25a');   // helmet and lamp
      // the pick
      const up = o.state === 'wind', swing = o.state === 'attack';
      const hx = cx + 7, hy = 12;
      const tx = swing ? hx + 9 : up ? hx + 2 : hx + 6, ty = swing ? hy + 8 : up ? 0 : hy + 8;
      g.line(hx, hy, tx, ty, '#6a4a2a');
      g.line(tx - 3, ty - (swing ? -2 : 1), tx + 3, ty + (swing ? -2 : 1), up && o.f % 2 ? '#ffffff' : '#9a9aa4');
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#e8e060');
      g.set(cx - 2, 6, e); g.set(cx + 2, 6, e);
      g.rect(cx - 1, 9, 3, 1, '#1a1210');
    },
  },

  // Geode: a cracked stone full of crystals; glows brighter and brighter, then bursts shards.
  geode: {
    w: 22, h: 20, dirs: false, frames: { idle: 2, wind: 2 },
    paint(g, o) {
      const cx = 11, cy = 11, glow = o.state === 'wind';
      g.ellipse(cx, cy, 10, 8, shade(STONE));
      g.ellipse(cx, cy - 1, 6, 5, '#14181e');
      const c = glow ? [CRYS[2], CRYS[3], CRYS[4], '#ffffff'] : CRYS;
      for (const [x, y, h] of [[cx - 3, cy + 1, 5], [cx, cy + 2, 7], [cx + 3, cy + 1, 4], [cx - 1, cy + 2, 3], [cx + 2, cy + 2, 3]]) {
        for (let k = 0; k < h; k++) g.set(x, y - k, ramp(c, 0.4 + k / h * 0.6, x, y - k));
      }
    },
  },

  // Rockhopper: a little stone frog. Small hops, and every third one a big slam.
  rockhopper: {
    w: 20, h: 18, frames: { idle: 2, wind: 2, air: 1 },
    paint(g, o) {
      const crouch = o.state === 'wind' ? 2 : 0, air = o.state === 'air';
      const cx = 10, cy = 11 + crouch - (air ? 2 : 0);
      if (air) { g.rect(cx - 8, cy + 3, 3, 4, STONE[1]); g.rect(cx + 6, cy + 3, 3, 4, STONE[1]); }
      else { g.ellipse(cx - 7, cy + 4, 3, 2, STONE[1]); g.ellipse(cx + 7, cy + 4, 3, 2, STONE[1]); }
      g.ellipse(cx, cy, 8, 6 - crouch / 2, shade(STONE));
      g.line(cx - 4, cy - 3, cx - 1, cy, STONE[1]);
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#ffd25a');
      g.rect(cx - 4, cy - 4, 2, 2, e); g.rect(cx + 3, cy - 4, 2, 2, e);
    },
  },

  // Stonemaw (miniboss): a boulder with a mouth full of stone teeth. Rolls, slams, shakes rocks loose.
  stonemaw: {
    w: 40, h: 34, frames: { idle: 2, move: 2, wind: 2, attack: 4, stun: 4 },
    paint(g, o) {
      const cx = 20, cy = 18;
      if (o.state === 'attack') {
        g.ellipse(cx, cy, 15, 15, shade(STONE, 0.05));
        const a = o.f * 1.2;
        for (let i = 0; i < 5; i++) g.line(cx, cy, cx + Math.cos(a + i * 1.26) * 13, cy + Math.sin(a + i * 1.26) * 13, STONE[1]);
        return;
      }
      g.ellipse(cx, cy + 2, 16, 13, shade(STONE));
      for (const [x, y] of [[cx - 10, cy - 6], [cx + 8, cy - 8], [cx + 12, cy + 4], [cx - 12, cy + 6]]) g.ellipse(x, y, 3, 2, STONE[3]);
      if (o.dir === 'up') return;
      const open = o.state === 'wind' || o.state === 'stun';
      g.ellipse(cx, cy + 5, 10, open ? 6 : 3, '#1a1210');
      for (let x = cx - 8; x <= cx + 8; x += 3) { g.set(x, cy + 5 - (open ? 5 : 2), '#c8c0a8'); g.set(x + 1, cy + 5 + (open ? 5 : 2), '#c8c0a8'); }
      const e = o.state === 'stun' ? '#ffffff' : eyeGlow(o, '#ffb040');
      g.rect(cx - 7, cy - 5, 3, 2, e); g.rect(cx + 5, cy - 5, 3, 2, e);
      if (o.state === 'stun') stars(g, cx, 2, o.f);
    },
  },

  // ===================================================================== The Ossuary
  // Bonewalker: a rattling skeleton. Knock it down and it lies there as a pile of bones;
  // if you don't break the pile, it pulls itself back together.
  bonewalker: {
    w: 20, h: 26, frames: { idle: 2, move: 4, pile: 1, wind: 2 },
    paint(g, o) {
      const cx = 10;
      if (o.state === 'pile' || o.state === 'wind') {
        const shake = o.state === 'wind' ? (o.f ? 1 : -1) : 0;
        for (const [x, y, l, a] of [[cx - 6, 22, 7, 0], [cx - 1, 23, 6, 1], [cx + 2, 21, 5, 2], [cx - 4, 20, 5, 3]]) {
          g.line(x + shake, y, x + shake + l, y - (a % 2), BONE[3]);
        }
        g.ellipse(cx + shake, 19, 3, 2.5, BONE[3]);
        if (o.state === 'wind') { g.set(cx - 1 + shake, 19, GLOW[o.f % 2]); g.set(cx + 1 + shake, 19, GLOW[o.f % 2]); }
        else { g.set(cx - 1, 19, '#1a1410'); g.set(cx + 1, 19, '#1a1410'); }
        return;
      }
      const step = o.state === 'move' ? o.f % 4 : 0;
      g.line(cx - 2, 18, cx - 3 - (step === 1 ? 1 : 0), 24, BONE[3]); g.line(cx + 2, 18, cx + 3 + (step === 3 ? 1 : 0), 24, BONE[3]);
      g.rect(cx - 3, 16, 7, 2, BONE[2]);
      g.line(cx, 9, cx, 16, BONE[3]);
      for (let y = 10; y <= 14; y += 2) g.line(cx - 3, y, cx + 3, y, BONE[2]);
      g.line(cx - 4, 10, cx - 6, 16 + (step % 2), BONE[3]); g.line(cx + 4, 10, cx + 6, 16 - (step % 2), BONE[3]);
      g.ellipse(cx, 5, 4, 4, shade(BONE));
      if (o.dir === 'up') return;
      g.set(cx - 2, 5, '#1a1410'); g.set(cx + 2, 5, '#1a1410'); g.rect(cx - 1, 8, 3, 1, '#1a1410');
    },
  },

  // Shade: a pale ghost that drifts through walls of stone; its face appears, it wails, it dashes.
  shade: {
    w: 20, h: 24, frames: { idle: 3, move: 3, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 10;
      g.ellipse(cx, 9, 7, 7, shade(GHOSTB));
      g.poly([[cx - 7, 9], [cx + 8, 9], [cx + 6, 18], [cx - 6, 18]], (x, y) => ramp(GHOSTB, 0.6 - (y - 9) / 30, x, y));
      for (let x = cx - 6; x <= cx + 6; x++) {
        const len = 2 + Math.round((Math.sin(x * 1.1 + o.f * 2) * 0.5 + 0.5) * 4);
        for (let k = 0; k < len; k++) g.set(x, 18 + k, GHOSTB[k === len - 1 ? 1 : 2]);
      }
      if (o.dir === 'up') return;
      const wail = o.state === 'wind' || o.state === 'attack';
      g.ellipse(cx - 3, 8, 1.5, wail ? 2.5 : 1.5, '#0e141a'); g.ellipse(cx + 3, 8, 1.5, wail ? 2.5 : 1.5, '#0e141a');
      g.ellipse(cx, 13, wail ? 2.5 : 1.5, wail ? 3 : 1, '#0e141a');
      if (o.state === 'wind') { g.set(cx - 3, 8, GLOW[o.f % 2]); g.set(cx + 3, 8, GLOW[o.f % 2]); }
    },
  },

  // Ossifier: a skeleton with a sack of bones; winds up and throws one that comes back.
  ossifier: {
    w: 22, h: 26, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      ENEMY_ART.bonewalker.paint(g, { ...o, state: o.state === 'wind' || o.state === 'attack' ? 'idle' : o.state });
      g.ellipse(4, 12, 3.5, 5, '#5a4632');
      const up = o.state === 'wind';
      g.line(15, 10, up ? 18 : 17, up ? 2 : 16, BONE[3]);
      if (up) { g.line(16, 1, 20, 3, o.f % 2 ? '#ffffff' : BONE[4]); }
    },
  },

  // Rattleskull: a floating skull that chatters, spits teeth, then lunges.
  rattleskull: {
    w: 18, h: 18, frames: { idle: 2, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 9, chat = o.state === 'wind' ? o.f : 0;
      g.ellipse(cx, 8, 7, 6.5, shade(BONE));
      g.rect(cx - 4, 12 + chat, 9, 3, BONE[2]);
      for (let x = cx - 3; x <= cx + 3; x += 2) g.set(x, 12 + chat, '#1a1410');
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#3a1410');
      const ex = o.dir === 'side' ? 2 : 0;
      g.ellipse(cx - 3 + ex, 7, 2, 2, '#1a1410'); g.ellipse(cx + 3 + ex, 7, 2, 2, '#1a1410');
      g.set(cx - 3 + ex, 7, e); g.set(cx + 3 + ex, 7, e);
      g.set(cx + ex, 10, '#1a1410');
    },
  },

  // Lanternkeeper: a hooded figure with a lantern; the lantern brightens, out float slow wisps that follow you.
  lanternkeeper: {
    w: 22, h: 26, frames: { idle: 2, move: 4, wind: 2 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 2 : 0;
      g.poly([[cx - 6, 7], [cx + 6, 7], [cx + 8, 24], [cx - 8, 24]], (x, y) => ramp(['#1a1620', '#2a2432', '#3c3446', '#50465c'], 0.7 - Math.abs(x - cx) / 16, x, y));
      for (let x = cx - 8; x <= cx + 8; x += 2) g.set(x, 24 + ((x + step) % 2), '#1a1620');
      g.ellipse(cx, 6, 5, 5, shade(['#1a1620', '#2a2432', '#3c3446', '#50465c']));
      g.ellipse(cx, 7, 3, 3, '#06040a');
      // lantern
      const lx = cx + 9, bright = o.state === 'wind';
      g.line(cx + 5, 12, lx, 14, '#5a5a62');
      g.rect(lx - 2, 14, 5, 6, '#3a3a42');
      g.rect(lx - 1, 15, 3, 4, bright ? (o.f % 2 ? '#ffffff' : '#c8f0ff') : '#7ad0e0');
      if (o.dir === 'up') return;
      g.set(cx - 1, 7, '#7ad0e0'); g.set(cx + 1, 7, '#7ad0e0');
    },
  },

  // Cofferling: a small coffin standing on end. Rattles, bursts open lunging, sits open, closes.
  cofferling: {
    w: 20, h: 26, dirs: false, frames: { hidden: 1, wind: 2, attack: 1, stun: 2 },
    paint(g, o) {
      const cx = 10, open = o.state === 'attack' || o.state === 'stun', shake = o.state === 'wind' ? (o.f ? 1 : -1) : 0;
      g.poly([[cx - 5 + shake, 2], [cx + 5 + shake, 2], [cx + 8 + shake, 8], [cx + 6 + shake, 24], [cx - 6 + shake, 24], [cx - 8 + shake, 8]], (x, y) => ramp(RUST, 0.7 - Math.abs(x - cx) / 18, x, y));
      if (!open) {
        g.line(cx + shake, 4, cx + shake, 22, RUST[0]);
        g.line(cx - 3 + shake, 9, cx + 3 + shake, 9, '#b08a30');
        if (o.state === 'wind') { g.set(cx - 2 + shake, 13, GLOW[o.f % 2]); g.set(cx + 2 + shake, 13, GLOW[o.f % 2]); }
        return;
      }
      g.poly([[cx - 4, 4], [cx + 4, 4], [cx + 6, 9], [cx + 5, 22], [cx - 5, 22], [cx - 6, 9]], '#0a0608');
      g.ellipse(cx, 12, 4, 4, shade(BONE));
      g.set(cx - 2, 11, '#ff4a2a'); g.set(cx + 2, 11, '#ff4a2a');
      g.rect(cx - 2, 15, 5, 2, '#1a1410');
      if (o.state === 'stun') stars(g, cx, 2, o.f);
    },
  },

  // Bone Colossus (miniboss): a giant skeleton of many bones. Stomps, throws bones, gets up once more.
  bonecolossus: {
    w: 36, h: 40, frames: { idle: 2, move: 4, wind: 2, attack: 1, pile: 1 },
    paint(g, o) {
      const cx = 18;
      if (o.state === 'pile') {
        for (let i = 0; i < 9; i++) g.line(cx - 14 + i * 3, 36 - (i % 3), cx - 8 + i * 3, 33 + (i % 2) * 3, BONE[3]);
        g.ellipse(cx, 30, 6, 5, shade(BONE));
        return;
      }
      const step = o.state === 'move' ? o.f % 4 : 0, raised = o.state === 'wind';
      g.line(cx - 4, 26, cx - 6 - (step === 1 ? 1 : 0), 38, BONE[3]); g.line(cx - 3, 26, cx - 5, 38, BONE[3]);
      g.line(cx + 4, 26, cx + 6 + (step === 3 ? 1 : 0), 38, BONE[3]); g.line(cx + 3, 26, cx + 5, 38, BONE[3]);
      g.ellipse(cx, 25, 8, 3, BONE[2]);
      g.rect(cx - 1, 11, 3, 14, BONE[3]);
      for (let y = 12; y <= 22; y += 3) { g.line(cx - 7, y, cx + 7, y, BONE[2]); g.set(cx - 7, y + 1, BONE[1]); g.set(cx + 7, y + 1, BONE[1]); }
      const arm = (s) => {
        g.line(cx + s * 7, 12, cx + s * 13, raised ? 2 : 22, BONE[3]);
        g.ellipse(cx + s * 13, raised ? 2 : 23, 2.5, 2.5, BONE[3]);
      };
      arm(-1); arm(1);
      g.ellipse(cx, 6, 7, 6, shade(BONE));
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#5ad0ff');
      g.ellipse(cx - 3, 6, 2, 2, '#1a1410'); g.ellipse(cx + 3, 6, 2, 2, '#1a1410');
      g.set(cx - 3, 6, e); g.set(cx + 3, 6, e);
      g.rect(cx - 2, 10, 5, 1, '#1a1410');
    },
  },

  // ===================================================================== The Sunken Caves
  // Leech: a black worm that wriggles fast through the water at you.
  leech: {
    w: 16, h: 10, frames: { idle: 2, move: 4 },
    paint(g, o) {
      const w = [0, 1, 0, -1][o.f % 4];
      if (o.dir === 'side') {
        for (let x = 2; x < 14; x++) g.ellipse(x, 5 + Math.round(Math.sin(x * 0.7 + o.f) * 1), 1.5, 1.5, x > 11 ? '#3a1a22' : '#1a1218');
        g.set(13, 4, '#c03030');
        return;
      }
      for (let y = 1; y < 9; y++) g.ellipse(8 + Math.round(Math.sin(y * 0.8 + w) * 1.5), y, 2, 1.5, y < 3 ? '#3a1a22' : '#1a1218');
      if (o.dir !== 'up') g.set(8, 2, '#c03030');
    },
  },

  // Snapjaw: under the water only its fin shows; bubbles rise, it leaps out to bite, splashes back down.
  snapjaw: {
    w: 26, h: 18, frames: { under: 2, wind: 2, air: 1, idle: 2 },
    paint(g, o) {
      const cx = 13;
      if (o.state === 'under' || o.state === 'wind') {
        // ripples and a fin cutting the surface
        g.ellipse(cx, 14, 10, 3, '#1e4a52');
        g.ellipse(cx, 14, 7, 2, '#122e34');
        g.poly([[cx - 3, 13], [cx + 1, 5 - (o.f % 2)], [cx + 4, 13]], shade(FISH));
        if (o.state === 'wind') for (const [x, y] of [[cx - 7, 10], [cx + 7, 9], [cx - 4, 7]]) g.ellipse(x, y - o.f, 1.5, 1.5, '#a8e0f0');
        return;
      }
      g.ellipse(cx, 10, 11, 6, shade(FISH));
      g.poly([[cx - 11, 10], [cx - 16, 4], [cx - 16, 16]], FISH[2]);
      g.poly([[cx - 2, 4], [cx + 2, -1], [cx + 4, 5]], FISH[3]);
      if (o.dir === 'up') return;
      g.ellipse(cx + 8, 11, 4, 3, '#1a0606');
      for (let x = cx + 5; x <= cx + 11; x += 2) { g.set(x, 9, '#e8e0c8'); g.set(x, 13, '#e8e0c8'); }
      g.set(cx + 5, 7, '#ffd25a');
    },
  },

  // Bloatfish: a floating puffer; when you're near it swells up, then shoots its spikes out.
  bloatfish: {
    w: 24, h: 22, frames: { idle: 2, move: 2, wind: 2, stun: 2 },
    paint(g, o) {
      const cx = 12, cy = 11, big = o.state === 'wind' ? 2 + o.f : 0, flat = o.state === 'stun';
      const r = (flat ? 5 : 6) + big;
      g.ellipse(cx, cy, r, flat ? 4 : r - 0.5, shade(PUFF));
      if (big || o.state === 'idle' || o.state === 'move') for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.set(cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 0.5), PUFF[0]); }
      g.ellipse(cx, cy + 2, r * 0.6, r * 0.35, PUFF[4]);
      if (o.dir === 'up') return;
      const e = o.state === 'wind' ? GLOW[o.f % 2] : '#120c0a';
      g.ellipse(cx - 3, cy - 2, 1.5, 1.5, '#ffffff'); g.ellipse(cx + 3, cy - 2, 1.5, 1.5, '#ffffff');
      g.set(cx - 3, cy - 2, e); g.set(cx + 3, cy - 2, e);
      g.ellipse(cx, cy + 3, 1.5, 1, '#3a1a08');
    },
  },

  // Drowned: a waterlogged corpse that shuffles after you; its cheeks bulge, it spits a jet of water.
  drowned: {
    w: 20, h: 26, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 4 : 0;
      g.rect(cx - 4, 20, 3, 5 - (step === 1 ? 1 : 0), DROWN[1]); g.rect(cx + 1, 20, 3, 5 - (step === 3 ? 1 : 0), DROWN[1]);
      g.poly([[cx - 7, 9], [cx + 7, 9], [cx + 6, 21], [cx - 6, 21]], (x, y) => ramp(DROWN, 0.7 - Math.abs(x - cx) / 14 - (y - 9) / 50, x, y));
      g.line(cx - 7, 10, cx - 9, 19, DROWN[2]); g.line(cx + 7, 10, cx + 9, 19, DROWN[2]);
      g.ellipse(cx, 6, 5 + (o.state === 'wind' ? 1 : 0), 5, shade(DROWN, 0.05));
      for (const [x, y] of [[cx - 4, 1], [cx - 1, 0], [cx + 3, 1]]) g.line(x, y, x - 1, y + 4, '#2a3a2a');   // wet hair
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#d8e8c8');
      g.set(cx - 2, 5, e); g.set(cx + 2, 5, e);
      g.ellipse(cx, 9, o.state === 'attack' ? 2 : 1.5, o.state === 'attack' ? 2 : 1, '#1a2018');
    },
  },

  // Eel: a long eel swimming in waves; head and body segments.
  eel: {
    w: 16, h: 14, frames: { idle: 2, move: 2 },
    paint(g, o) {
      g.ellipse(8, 8, 6, 4.5, shade(FISH, 0.1));
      g.poly([[4, 4], [8, 1], [12, 4]], FISH[1]);
      if (o.dir === 'up') return;
      g.ellipse(8, 10, 3, 1.5, '#1a0606');
      g.set(6, 6, '#ffd25a'); g.set(10, 6, '#ffd25a');
    },
  },
  eelseg: {
    w: 14, h: 12, dirs: false, frames: { idle: 2 },
    paint(g, o) {
      g.ellipse(7, 7, 5.5, 4, shade(FISH));
      g.set(7, 3 + (o.f % 2), FISH[4]);
    },
  },

  // Clam: a big shell on the floor. Closed it shrugs off shots; it opens (a pearl glows), fires, stays open a moment.
  clam: {
    w: 24, h: 20, dirs: false, frames: { hidden: 1, wind: 2, attack: 1, stun: 1 },
    paint(g, o) {
      const cx = 12, open = o.state === 'wind' ? 2 + o.f * 2 : o.state === 'attack' || o.state === 'stun' ? 6 : 0;
      g.ellipse(cx, 14, 10, 4, shade(SHELL, -0.05));
      if (open) {
        g.ellipse(cx, 13, 8, 2.5, '#d89ab0');
        g.ellipse(cx, 12, 2.5, 2.5, o.state === 'wind' ? GLOW[o.f % 2] : '#f0f0ff');
      }
      g.ellipse(cx, 13 - open, 10, 4, (nx, ny, x, y) => ramp(SHELL, light(nx, ny) + ((x % 3 === 0) ? 0.1 : 0), x, y));
      for (let x = cx - 8; x <= cx + 8; x += 3) g.line(cx, 10 - open, x, 15 - open, SHELL[1]);
    },
  },

  // The Undertow (miniboss): a huge snapjaw. Lurks under the water, leaps across the room, spits water.
  undertow: {
    w: 44, h: 30, frames: { under: 2, wind: 2, air: 1, idle: 2, attack: 1 },
    paint(g, o) {
      const cx = 22;
      if (o.state === 'under' || o.state === 'wind') {
        g.ellipse(cx, 24, 18, 5, '#1e4a52');
        g.ellipse(cx, 24, 13, 3, '#122e34');
        g.poly([[cx - 5, 23], [cx + 1, 9 - (o.f % 2)], [cx + 6, 23]], shade(FISH));
        g.poly([[cx - 14, 24], [cx - 11, 17], [cx - 8, 24]], FISH[2]);
        if (o.state === 'wind') for (const [x, y] of [[cx - 12, 18], [cx + 12, 16], [cx - 6, 13], [cx + 8, 12]]) g.ellipse(x, y - o.f * 2, 2, 2, '#a8e0f0');
        return;
      }
      g.ellipse(cx, 16, 19, 10, shade(FISH));
      g.poly([[cx - 19, 16], [cx - 27, 7], [cx - 27, 25]], FISH[2]);
      g.poly([[cx - 4, 7], [cx + 2, -1], [cx + 6, 7]], FISH[3]);
      if (o.dir === 'up') return;
      const open = o.state === 'attack' ? 6 : 4;
      g.ellipse(cx + 12, 18, 7, open, '#1a0606');
      for (let x = cx + 7; x <= cx + 18; x += 2) { g.set(x, 18 - open + 1, '#e8e0c8'); g.set(x, 18 + open - 1, '#e8e0c8'); }
      g.ellipse(cx + 8, 11, 2, 2, '#ffd25a');
    },
  },
});
