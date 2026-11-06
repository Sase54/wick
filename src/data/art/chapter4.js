// Chapter 4 enemy art: The Fleshworks (living wax and meat), The Black Womb (dark, ash and
// shadow), The Scarred Womb (old wounds, stitches and scabs). Same conventions as
// src/data/enemyArt.js (front/back/side views and state poses; `side` faces right).
import { ramp } from '../../engine/pixelgrid.js';
import { ENEMY_ART, shade, eyes, stars, GLOW } from '../enemyArt.js';

const MEAT = ['#3a0a10', '#5a141a', '#7a2028', '#9a3438', '#ba5050', '#d87870'];
const PINK = ['#5a2a30', '#7a3a40', '#9a5058', '#b86a70', '#d88a8a'];
const CLOT = ['#1a0406', '#2e080c', '#460c12', '#62141a', '#7e2024'];
const PALEF = ['#6a5a5a', '#8a7676', '#aa9494', '#c8b4b0', '#e4d4cc'];
const DARK = ['#08060a', '#121016', '#1c1822', '#28222e', '#36303e'];
const ASHF = ['#1e1a1c', '#2e2a2c', '#403a3c', '#56504e', '#706866'];
const SCAR = ['#5a4038', '#7a584c', '#9a7462', '#b8927c', '#d4b098'];
const SCABC = ['#2a120c', '#421c12', '#5a281a', '#743624', '#8e4632'];
const BONEW = ['#6a6250', '#8a826c', '#aaa28a', '#cac2a8', '#e8e0c8'];
const THREAD = '#1a1a20';

const eyeGlow = (o, base) => (o.state === 'wind' ? GLOW[o.f % 2] : base);
const legs = (g, cx, y, step, col, gap = 3, h = 5) => {
  g.rect(cx - gap - 1, y, 3, h - (step === 1 ? 1 : 0), col);
  g.rect(cx + gap - 1, y, 3, h - (step === 3 ? 1 : 0), col);
};
const veins = (g, pts, col = MEAT[0]) => { for (let i = 0; i + 1 < pts.length; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col); };
const stitches = (g, x0, y0, x1, y1) => {
  g.line(x0, y0, x1, y1, THREAD);
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    g.set(x - 1, y - 1, THREAD); g.set(x + 1, y + 1, THREAD);
  }
};

Object.assign(ENEMY_ART, {
  // ===================================================================== The Fleshworks
  // Pulper: a lump of raw meat that hops, splattering blood where it lands.
  pulper: {
    w: 22, h: 18, frames: { idle: 2, wind: 2, air: 1 },
    paint(g, o) {
      const crouch = o.state === 'wind' ? 2 : 0, air = o.state === 'air';
      const cx = 11, cy = 11 + crouch - (air ? 2 : 0);
      g.ellipse(cx, cy, 9, 6.5 - crouch / 2 + (air ? 1 : 0), shade(MEAT));
      veins(g, [[cx - 6, cy - 2], [cx - 2, cy], [cx + 1, cy - 3], [cx + 5, cy - 1]]);
      g.ellipse(cx + 3, cy - 3, 2, 1.5, MEAT[5]);
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#f0e0a0');
      g.set(cx - 3, cy - 1, e); g.set(cx + 2, cy - 1, e);
      g.rect(cx - 2, cy + 2, 4, 1, CLOT[0]);
    },
  },
  // Clotling: a small fly made of a blood clot.
  clotling: {
    w: 14, h: 12, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 7, cy = 7, up = o.f % 2;
      for (const s of [-1, 1]) g.ellipse(cx + s * 4, cy - 3 - up, 3, 2, 'rgba(220,180,180,0.55)');
      g.ellipse(cx, cy, 4.5, 4, shade(CLOT, 0.2));
      g.set(cx - 2, cy - 2, MEAT[4]);
      if (o.dir !== 'up') { g.set(cx - 1, cy, '#f0e0a0'); g.set(cx + 2, cy, '#f0e0a0'); }
    },
  },
  // Umbilic: a fleshy thing tethered to the floor by a cord (the cord is drawn by the enemy);
  // it rears up and lunges as far as the cord lets it.
  umbilic: {
    w: 20, h: 20, frames: { idle: 2, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 10, cy = 11, up = o.state === 'wind' ? -2 : 0;
      g.ellipse(cx, cy + up, 8, 7, shade(PINK));
      veins(g, [[cx - 5, cy + up - 3], [cx - 1, cy + up + 1], [cx + 4, cy + up - 2]], PINK[0]);
      if (o.dir === 'up') return;
      const open = o.state === 'attack' || o.state === 'wind';
      g.ellipse(cx, cy + 2 + up, open ? 4 : 3, open ? 3 : 1, CLOT[0]);
      if (open) for (let i = -1; i <= 1; i++) g.set(cx + i * 2, cy + up, '#f0e8d8');
      const e = eyeGlow(o, '#f0e0a0');
      g.set(cx - 3, cy - 3 + up, e); g.set(cx + 3, cy - 3 + up, e);
    },
  },
  // Gutworm: a fat red worm under the floor; surfaces (emerge frames) and spits blood.
  gutworm: {
    w: 20, h: 22, frames: { under: 2, emerge: 3, idle: 2, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 10;
      if (o.state === 'under') {
        g.ellipse(cx, 18, 8, 3, MEAT[1]);
        g.set(cx - 3 + (o.f % 2) * 2, 16, MEAT[3]);
        return;
      }
      const h = o.state === 'emerge' ? 6 + o.f * 4 : 16;
      g.ellipse(cx, 19, 8, 3, MEAT[0]);
      g.rect(cx - 5, 20 - h, 10, h, MEAT[2]);
      g.ellipse(cx, 20 - h, 5, 4, shade(MEAT, 0.1));
      for (let y = 22 - h; y < 19; y += 3) g.line(cx - 5, y, cx + 4, y, MEAT[1]);
      if (o.dir === 'up' || h < 10) return;
      g.ellipse(cx, 21 - h, 3, o.state === 'wind' || o.state === 'attack' ? 2.5 : 1.2, CLOT[0]);
      g.set(cx - 3, 18 - h, eyeGlow(o, '#f0e0a0')); g.set(cx + 3, 18 - h, eyeGlow(o, '#f0e0a0'));
    },
  },
  // Thumper: an organ rooted in the floor that beats; on each heavy beat a ring of blood.
  thumper: {
    w: 24, h: 22, dirs: false, frames: { idle: 2, wind: 2 },
    paint(g, o) {
      const cx = 12, beat = o.state === 'wind' ? 1 + (o.f % 2) : o.f % 2 ? 0.5 : 0;
      g.ellipse(cx, 19, 10, 3, CLOT[1]);
      g.ellipse(cx, 12, 8 + beat, 8 + beat, shade(MEAT, beat * 0.1));
      g.ellipse(cx - 3, 8, 3, 3, MEAT[4]);
      veins(g, [[cx - 6, 12], [cx - 2, 14], [cx + 1, 10], [cx + 6, 13]], CLOT[2]);
      for (const [x, y] of [[cx - 4, 3], [cx + 3, 2]]) g.rect(x, y - 2, 2, 4, MEAT[1]);   // stumps of vessels
    },
  },
  // Fetch: a pale unborn ghost curled up in the air, crying slow homing tears.
  fetch: {
    w: 20, h: 20, frames: { idle: 3, move: 3, wind: 2 },
    paint(g, o) {
      const cx = 10, cy = 9;
      g.ellipse(cx, cy + 3, 6, 6, shade(PALEF, 0.1));
      g.ellipse(cx, cy - 3, 6, 5.5, shade(PALEF, 0.2));
      g.line(cx + 4, cy + 7, cx + 1 + (o.f % 2), cy + 13, PALEF[2]);   // a trailing cord
      g.line(cx - 4, cy + 3, cx - 1, cy + 6, PALEF[1]);
      if (o.dir === 'up') return;
      const cry = o.state === 'wind';
      g.rect(cx - 3, cy - 3, 2, cry ? 1 : 2, '#2a1a1a'); g.rect(cx + 2, cy - 3, 2, cry ? 1 : 2, '#2a1a1a');
      if (cry) { g.set(cx - 3, cy - 1, '#9ad8f8'); g.set(cx + 3, cy, '#9ad8f8'); g.ellipse(cx, cy + 1, 1.5, 1, '#2a1a1a'); }
    },
  },
  // The Mother of Clots (miniboss): a great quivering mass of clotted blood.
  clotmother: {
    w: 40, h: 32, frames: { idle: 2, move: 2, wind: 2, air: 1, summon: 2 },
    paint(g, o) {
      const cx = 20, cy = 18, swell = o.state === 'summon' ? 2 : 0;
      g.ellipse(cx, cy + 2, 18 + swell, 12 + swell, shade(CLOT, 0.1));
      for (const [x, y, r] of [[-10, -4, 4], [6, -7, 5], [12, 2, 3.5], [-4, 4, 3]]) g.ellipse(cx + x, cy + y, r, r * 0.8, shade(MEAT, 0.15));
      veins(g, [[cx - 14, cy], [cx - 6, cy - 2], [cx, cy + 3], [cx + 9, cy - 1], [cx + 15, cy + 2]], MEAT[1]);
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#f0e0a0');
      g.rect(cx - 5, cy - 2, 2, 2, e); g.rect(cx + 4, cy - 2, 2, 2, e);
      const open = o.state === 'wind' || o.state === 'summon';
      g.ellipse(cx, cy + 4, open ? 6 : 5, open ? 3.5 : 1, '#14020a');
    },
  },

  // ===================================================================== The Black Womb
  // Gloom: a shadow lying flat on the floor; it rises into a tall shape and swipes.
  gloom: {
    w: 22, h: 30, dirs: false, frames: { hidden: 1, wind: 2, attack: 1, stun: 2 },
    paint(g, o) {
      const cx = 11;
      if (o.state === 'hidden') { g.ellipse(cx, 26, 9, 3, DARK[1]); return; }
      const h = o.state === 'wind' ? 14 + o.f * 6 : 26;
      g.ellipse(cx, 26, 9, 3, DARK[0]);
      g.poly([[cx - 7, 27], [cx + 7, 27], [cx + 4, 27 - h], [cx - 4, 27 - h]], (x, y) => ramp(DARK, 0.7 - (27 - y) / 60, x, y));
      g.ellipse(cx, 27 - h, 5, 4, DARK[2]);
      const e = o.state === 'stun' ? '#ffffff' : eyeGlow(o, '#e8e0ff');
      g.set(cx - 2, 27 - h, e); g.set(cx + 2, 27 - h, e);
      if (o.state === 'attack') for (let i = 0; i < 4; i++) g.line(cx + 4, 27 - h + 6 + i, cx + 10, 27 - h + 2 + i * 3, DARK[3]);
      if (o.state === 'stun') stars(g, cx, 26 - h - 4, o.f);
    },
  },
  // Blacktongue: a hunched ash-gray thing with a tongue far too long.
  blacktongue: {
    w: 22, h: 24, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 11, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 18, step, ASHF[1], 3);
      g.ellipse(cx, 13, 8, 7, shade(ASHF));
      g.ellipse(cx, 6, 6, 5, shade(ASHF, 0.1));
      if (o.dir === 'up') return;
      const open = o.state === 'wind' || o.state === 'attack';
      g.ellipse(cx, 9, 4, open ? 2.5 : 1, '#0a0608');
      if (open) g.rect(cx - 1, 10, 3, 2, '#2a0a1a');
      const e = eyeGlow(o, '#c8c0d8');
      g.set(cx - 3, 5, e); g.set(cx + 3, 5, e);
    },
  },
  // Weeper: an eyeless figure crying black bile; it leaves a trail and spits.
  weeper: {
    w: 20, h: 26, frames: { idle: 2, move: 4, wind: 2 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 20, step, DARK[2], 2);
      g.poly([[cx - 5, 8], [cx + 5, 8], [cx + 7, 22], [cx - 7, 22]], (x, y) => ramp(ASHF, 0.7 - (y - 8) / 30, x, y));
      g.ellipse(cx, 6, 5, 5.5, shade(ASHF, 0.15));
      if (o.dir === 'up') return;
      // empty sockets streaming black
      for (const s of [-1, 1]) { g.rect(cx + s * 2 - (s < 0 ? 1 : 0), 5, 2, 2, '#000000'); g.line(cx + s * 2, 7, cx + s * 2, 12 + (o.f % 2), '#0a0a10'); }
      if (o.state === 'wind') g.ellipse(cx, 9, 2, 1.5, '#000000');
    },
  },
  // Mawling: a body that is nearly all mouth; snorts and charges.
  mawling: {
    w: 24, h: 20, frames: { idle: 2, move: 2, wind: 2, attack: 2, stun: 2 },
    paint(g, o) {
      const cx = 12, cy = 11;
      const step = o.state === 'move' || o.state === 'attack' ? o.f % 2 : 0;
      g.rect(cx - 7, 16, 3, 3 - step, DARK[2]); g.rect(cx + 4, 16, 3, 2 + step, DARK[2]);
      g.ellipse(cx, cy, 10, 7, shade(DARK, 0.25));
      if (o.dir === 'up') return;
      const open = o.state !== 'idle';
      if (o.dir === 'side') {
        g.ellipse(cx + 5, cy + 1, 5, open ? 4 : 2, '#2a0a0a');
        for (let i = 0; i < 3; i++) { g.set(cx + 2 + i * 3, cy - (open ? 2 : 1), '#e8e0d0'); g.set(cx + 3 + i * 3, cy + (open ? 4 : 2), '#e8e0d0'); }
      } else {
        g.ellipse(cx, cy + 2, 7, open ? 4 : 2, '#2a0a0a');
        for (let i = -2; i <= 2; i++) { g.set(cx + i * 2, cy - (open ? 1 : 0), '#e8e0d0'); g.set(cx + i * 2 + 1, cy + (open ? 5 : 3), '#e8e0d0'); }
      }
      const e = o.state === 'stun' ? '#ffffff' : eyeGlow(o, '#ff4a2a');
      g.set(cx - 4, cy - 4, e); g.set(cx + 4, cy - 4, e);
      if (o.state === 'stun') stars(g, cx, 1, o.f);
    },
  },
  // Eyestalk: an eye on a long stalk rooted in the floor; it fixes its gaze and burns a beam.
  eyestalk: {
    w: 18, h: 30, dirs: false, frames: { idle: 2, wind: 2, attack: 2 },
    paint(g, o) {
      const cx = 9, sway = o.state === 'idle' ? (o.f % 2 ? 1 : -1) : 0;
      g.ellipse(cx, 27, 6, 2.5, DARK[1]);
      for (let y = 12; y < 27; y++) g.rect(cx - 1 + Math.round(sway * (27 - y) / 15), y, 3, 1, y % 3 ? ASHF[2] : ASHF[1]);
      g.ellipse(cx + sway, 8, 6, 6, shade(['#8a7a74', '#b8a8a0', '#d8ccc4', '#ece4dc', '#fffaf4']));
      const hot = o.state !== 'idle';
      g.ellipse(cx + sway, 8, 3, 3, hot ? '#c01a1a' : '#3a2a5a');
      g.ellipse(cx + sway, 8, o.state === 'attack' ? 0.8 : 1.6, 2, '#0a0606');
    },
  },
  // Nightfly: a black moth-like flier with pale eyes that dives at you.
  nightfly: {
    w: 22, h: 16, frames: { idle: 2, move: 2, wind: 2, attack: 1, stun: 2 },
    paint(g, o) {
      const cx = 11, cy = 8, up = o.f % 2;
      const tuck = o.state === 'attack';
      for (const s of [-1, 1]) g.poly([[cx + s * 2, cy], [cx + s * (tuck ? 6 : 10), cy - (tuck ? 2 : 6 + up)], [cx + s * (tuck ? 7 : 10), cy + 4]], (x, y) => ramp(DARK, 0.6 - Math.abs(x - cx) / 30, x, y));
      g.ellipse(cx, cy, 3, 5, shade(DARK, 0.2));
      if (o.dir === 'up') return;
      const e = o.state === 'stun' ? '#ffffff' : eyeGlow(o, '#d8e8ff');
      g.set(cx - 1, cy - 2, e); g.set(cx + 1, cy - 2, e);
    },
  },
  // The Hollow Mother (miniboss): a tall dark shape in a veil of smoke with a hollow lit chest.
  hollowmother: {
    w: 32, h: 44, frames: { idle: 2, move: 4, wind: 2, air: 1, summon: 2 },
    paint(g, o) {
      const cx = 16;
      g.poly([[cx - 8, 12], [cx + 8, 12], [cx + 13, 42], [cx - 13, 42]], (x, y) => ramp(DARK, 0.7 - (y - 12) / 60 + ((x + y) % 7 === 0 ? 0.2 : 0), x, y));
      g.ellipse(cx, 7, 6, 7, shade(ASHF, 0.1));
      g.poly([[cx - 7, 1], [cx + 7, 1], [cx + 9, 16], [cx - 9, 16]], (x, y) => ramp(DARK, 0.4, x, y));   // veil
      const lit = o.state === 'summon' || o.state === 'wind';
      g.ellipse(cx, 24, 4, 5, lit ? '#e8e0ff' : '#5a4a7a');   // the hollow in its chest
      g.ellipse(cx, 24, 2, 3, lit ? '#ffffff' : '#8a7aaa');
      for (const s of [-1, 1]) g.line(cx + s * 8, 16, cx + s * 14, lit ? 6 : 30, DARK[3]);
      if (o.dir === 'up') return;
      g.set(cx - 2, 8, eyeGlow(o, '#c8c0d8')); g.set(cx + 2, 8, eyeGlow(o, '#c8c0d8'));
    },
  },

  // ===================================================================== The Scarred Womb
  // Stitchling: a doll of scar tissue sewn together down the middle; it splits in two halves.
  stitchling: {
    w: 20, h: 24, frames: { idle: 2, move: 4 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 18, step, SCAR[1], 3);
      g.ellipse(cx, 13, 7, 7, shade(SCAR));
      g.ellipse(cx, 5, 5, 5, shade(SCAR, 0.1));
      stitches(g, cx, 1, cx, 19);
      if (o.dir === 'up') return;
      g.set(cx - 3, 5, '#1a0a08'); g.rect(cx + 2, 4, 2, 2, '#e8e0d0');   // mismatched eyes
    },
  },
  stitchhalf: {
    w: 14, h: 18, frames: { idle: 2, move: 4 },
    paint(g, o) {
      const cx = 7, step = o.state === 'move' ? o.f % 4 : 0;
      g.rect(cx - 2, 13, 3, 4 - (step === 1 ? 1 : 0), SCAR[1]);
      g.ellipse(cx, 9, 5, 6, shade(SCAR));
      g.line(cx + 4, 3, cx + 4, 15, THREAD);
      for (let y = 4; y < 15; y += 3) g.set(cx + 5, y, THREAD);
      if (o.dir !== 'up') g.set(cx - 1, 6, '#1a0a08');
    },
  },
  // Scab: a crusted beetle of dried blood; its front is hard (shots chip off), it flicks shards.
  scab: {
    w: 24, h: 20, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 12, step = o.state === 'move' ? o.f % 2 : 0;
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.line(cx + s * 5, 10 + i * 3, cx + s * 10, 12 + i * 3 + (i % 2 === step ? 1 : -1), SCABC[0]);
      g.ellipse(cx, 11, 8, 7, shade(SCABC));
      for (const [x, y] of [[-4, -3], [2, -4], [4, 1], [-3, 3]]) g.rect(cx + x, 11 + y, 3, 2, SCABC[4]);
      if (o.dir === 'up') return;
      g.ellipse(cx, 5, 4, 3, shade(SCABC, 0.15));
      const e = eyeGlow(o, '#f0c040');
      g.set(cx - 2, 5, e); g.set(cx + 2, 5, e);
    },
  },
  // Suture: a long worm of thread and tissue (head + suturesegs).
  suture: {
    w: 16, h: 14, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 8, cy = 7;
      g.ellipse(cx, cy, 6.5, 5.5, shade(SCAR, 0.1));
      stitches(g, cx - 5, cy, cx + 5, cy);
      for (const s of [-1, 1]) g.line(cx + s * 3, cy + 3, cx + s * 5, cy + 6 + (o.f % 2), '#c8c8d0');   // needle jaws
      if (o.dir === 'up') return;
      g.set(cx - 2, cy - 2, '#1a0a08'); g.set(cx + 2, cy - 2, '#1a0a08');
    },
  },
  sutureseg: {
    w: 14, h: 12, dirs: false, frames: { idle: 2 },
    paint(g, o) {
      g.ellipse(7, 6, 5.5, 4.5 + (o.f % 2) * 0.3, shade(SCAR, 0.05));
      stitches(g, 2, 6, 12, 6);
    },
  },
  // Lancer: a figure of scar tissue holding a sharpened rib; it sets it and lunges.
  lancer: {
    w: 24, h: 26, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 11, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 20, step, SCAR[1], 3);
      g.ellipse(cx, 14, 6, 7, shade(SCAR));
      g.ellipse(cx, 6, 5, 5, shade(SCAR, 0.1));
      stitches(g, cx - 4, 9, cx + 4, 17);
      const set = o.state === 'wind', lunge = o.state === 'attack';
      if (o.dir === 'side') g.line(cx - 2, 13, cx + (lunge ? 13 : set ? 7 : 9), 13 - (set ? 0 : 3), BONEW[3]);
      else g.line(cx + 6, lunge ? 23 : 19, cx + 6, set ? 6 : 2, BONEW[3]);
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#e8e0d0');
      g.set(cx - 2, 6, e); g.set(cx + 2, 6, e);
    },
  },
  // Picker: a small skittering thing with long fingers that picks at scabs. And at you.
  picker: {
    w: 16, h: 12, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 8, cy = 7;
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.line(cx + s * 2, cy + i - 1, cx + s * 7, cy + i * 2 - 2 + ((o.f + i) % 2), PALEF[1]);
      g.ellipse(cx, cy, 4, 3.5, shade(PALEF, 0.05));
      if (o.dir !== 'up') { g.set(cx - 1, cy - 1, '#c01a1a'); g.set(cx + 1, cy - 1, '#c01a1a'); }
    },
  },
  // Bonecage: a ribcage curled into a ball; it rolls at you and bounces off walls.
  bonecage: {
    w: 20, h: 18, frames: { idle: 1, wind: 2, attack: 4, stun: 4 },
    paint(g, o) {
      const cx = 10, cy = 10;
      if (o.state === 'attack') {
        g.ellipse(cx, cy, 7.5, 7.5, '#1a0a08');
        const a = o.f * 1.2;
        for (let i = 0; i < 5; i++) { const t = a + i * 1.26; g.line(cx, cy, cx + Math.cos(t) * 7, cy + Math.sin(t) * 7, BONEW[3]); }
        return;
      }
      g.ellipse(cx, cy + 1, 8, 6.5, '#1a0a08');
      for (let i = -3; i <= 3; i++) g.line(cx + i * 2, cy - 4, cx + i * 2 + (i < 0 ? -1 : 1), cy + 6, BONEW[3 - (Math.abs(i) > 2 ? 1 : 0)]);
      g.line(cx, cy - 5, cx, cy + 6, BONEW[4]);
      if (o.state === 'idle' || o.dir === 'up') return;
      const e = o.state === 'stun' ? '#ffffff' : eyeGlow(o, '#ff4a2a');
      g.set(cx - 2, cy, e); g.set(cx + 2, cy, e);
      if (o.state === 'stun') stars(g, cx, 1, o.f);
    },
  },
  // The Surgeon (miniboss): a stitched giant with scalpels for fingers.
  surgeon: {
    w: 36, h: 42, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 18, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 34, step, SCAR[1], 6, 7);
      g.poly([[cx - 11, 14], [cx + 11, 14], [cx + 12, 36], [cx - 12, 36]], (x, y) => ramp(['#5a5a5a', '#7a7a78', '#9a9a96', '#bab8b2'], 0.7 - (y - 14) / 40, x, y));   // a stained smock
      for (const [x, y] of [[-6, 22], [3, 27], [-2, 31], [7, 19]]) g.rect(cx + x, y, 2, 2, MEAT[1]);
      g.ellipse(cx, 8, 8, 8, shade(SCAR, 0.1));
      stitches(g, cx - 7, 4, cx + 6, 12);
      g.rect(cx - 6, 10, 12, 3, '#c8d8d8');   // surgical mask
      const up = o.state === 'wind';
      for (const s of [-1, 1]) {
        const hx = cx + s * 15, hy = up ? 8 : 26;
        g.line(cx + s * 10, 16, hx, hy, SCAR[2]);
        for (let i = -1; i <= 1; i++) g.line(hx, hy, hx + s * 2 + i, hy + (up ? -6 : 6), '#d8e0e8');
      }
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#e8e0d0');
      g.rect(cx - 4, 6, 2, 2, e); g.rect(cx + 3, 6, 2, 2, e);
    },
  },
});
