// Enemy art, painted in code. Every enemy that moves has front ('down'), back ('up') and side
// ('side', facing right; left is mirrored) views, plus poses for its states:
//   idle, move, wind (the wind-up before an attack: eyes glow), attack, stun, air, under...
// paint(g, o) draws one frame into a PixelGrid; o = { dir, state, f (frame index) }.
// The game outlines, caches and tints the frames (src/game/enemies.js).
//
//   w, h     sprite size in pixels (the sprite stands on its bottom edge)
//   frames   frames per state (missing states fall back to idle)
//   dirs     false for things that look the same from every side
import { ramp, light } from '../engine/pixelgrid.js';

const K = '#160f0c';
const EYE_W = '#e8e0c8', EYE_P = '#120c0a';
const GLOW = ['#ff3a20', '#ffb060'];        // glowing eyes during a wind-up

// shaded body fill for ellipses
const shade = (cols, bias = 0) => (nx, ny, x, y) => ramp(cols, light(nx, ny) + bias, x, y);

// Two eyes. dir decides placement; glowing during wind-ups.
function eyes(g, cx, cy, o, { gap = 3, size = 1, look = 0, pupil = EYE_P, white = EYE_W } = {}) {
  if (o.dir === 'up') return;
  const glow = o.state === 'wind' || o.state === 'rage';
  const put = (x, y) => {
    if (glow) {
      g.rect(x, y, size + 1, size + 1, GLOW[o.f % 2]);
      g.set(x, y, GLOW[1]);
      return;
    }
    g.rect(x, y, size + 1, size + 1, white);
    g.rect(x + (size > 0 ? 1 : 0), y + (size > 0 ? 1 : 0), size, size, pupil);
  };
  if (o.dir === 'side') {
    put(cx + gap - 1 + look, cy);
    if (gap > 2) put(cx + gap + 2 + look, cy);
  } else {
    put(cx - gap - size, cy);
    put(cx + gap, cy);
  }
}

// Stars circling over a stunned head.
function stars(g, cx, cy, f) {
  const a = f * 1.4;
  for (let i = 0; i < 3; i++) {
    const x = cx + Math.cos(a + i * 2.1) * 6, y = cy + Math.sin(a + i * 2.1) * 2;
    g.set(x, y, '#fff3a0');
    g.set(x + 1, y, '#ffd25a');
  }
}

// ---------------------------------------------------------------------------------
const GREEN = ['#1e2a12', '#2f4018', '#45581f', '#5f7430', '#7f9446', '#a2b562'];
const MOTH = ['#3a3028', '#5a4a3a', '#7a6a52', '#9a8a6a', '#c4b494'];
const RAT = ['#2a1e1c', '#3e2c28', '#5a403a', '#76564c', '#94705e'];
const TOAD = ['#1e2a14', '#2e4020', '#44582c', '#5e743a', '#80984e'];
const FLESH = ['#3a1418', '#5a2226', '#7a3436', '#9a4a48', '#bc6a62'];
const PALE = ['#6a5a4a', '#8a7a64', '#aa9a80', '#c8b8a0', '#e8dcc8'];
const TAR = ['#140c14', '#22162a', '#32223a', '#46324e', '#5e4668'];
const GHOST = ['#4a5a6a', '#6a7a8c', '#8a9aac', '#b0c0d0', '#e0ecf8'];
const WAX = ['#4a3c2c', '#6a5a44', '#8a7a5e', '#aa9a78', '#c9b48a'];
const FLY = ['#141418', '#24242c', '#363640', '#4a4a58', '#62627a'];
const BLUEB = ['#101a2c', '#1a2a48', '#28406a', '#3a5a8a', '#5a80b0'];
const MUD = ['#2a1e14', '#3e2c1c', '#58402a', '#72583a', '#8e7250'];
const WORM = ['#4a2a2a', '#6a3a36', '#8a5048', '#aa6a5a', '#c88a74'];
const BRISTLE = ['#2a2014', '#40301c', '#5a4428', '#765c36', '#947848'];
const GAWP = ['#5a4c3a', '#7a6a50', '#9a8a6a', '#bcac88', '#dccca8'];

export const ENEMY_ART = {
  // ================================================================= shared, chapter 1
  // Mildew Blob: a quivering lump of green mold with two beady eyes.
  blob: {
    w: 24, h: 19, frames: { idle: 2, move: 4 },
    paint(g, o) {
      const sq = o.state === 'move' ? [0, 1, 0, -1][o.f] : o.f;
      const rx = 10 + sq, ry = 8 - sq, cx = 12, cy = 18 - ry;
      g.ellipse(cx, cy, rx, ry, shade(GREEN));
      g.ellipse(cx - 4, cy - ry + 3, 3, 2, GREEN[5]);
      for (const [x, y] of [[cx - 6, cy + 2], [cx + 5, cy - 3], [cx + 7, cy + 3]]) g.set(x, y, GREEN[1]);
      if (o.dir === 'up') { g.ellipse(cx + 2, cy - 1, 2, 1.5, GREEN[1]); return; }
      const ex = o.dir === 'side' ? cx + 3 : cx;
      eyes(g, ex, cy - 2, o, { gap: o.dir === 'side' ? 1 : 3 });
      g.rect(ex - 1, cy + 3, 3, 1, GREEN[0]);
    },
  },

  // Dustmoth: a grey cellar moth, fluttering.
  moth: {
    w: 22, h: 16, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const up = o.f % 2 === 0;
      const cx = 11;
      const wing = (side) => {
        const dx = side;
        if (o.dir === 'side') {
          // seen from the side: one big wing over the body, flapping up and down
          if (side > 0) return;
          const tip = up ? 0 : 13;
          g.poly([[cx - 7, 8], [cx - 4, tip], [cx + 5, up ? 1 : 12], [cx + 4, 8]], (x, y) => ramp(MOTH, 0.75 - Math.abs(y - 8) / 16, x, y));
          g.line(cx - 3, 8, cx - 1, up ? 3 : 11, MOTH[1]);
          return;
        }
        g.poly([[cx + dx * 2, 7], [cx + dx * 10, up ? 1 : 11], [cx + dx * 10, up ? 6 : 14], [cx + dx * 3, 11]], (x, y) => ramp(MOTH, 0.7 - Math.abs(x - cx) / 22, x, y));
        g.set(cx + dx * 7, up ? 5 : 10, MOTH[0]);
        g.set(cx + dx * 8, up ? 5 : 10, MOTH[0]);
      };
      wing(-1);
      wing(1);
      if (o.dir === 'side') g.ellipse(cx, 9, 5, 2.5, shade(MOTH, -0.15));
      else g.ellipse(cx, 9, 2.5, 4.5, shade(MOTH, -0.15));
      if (o.dir === 'up') { g.rect(cx, 5, 1, 7, MOTH[1]); return; }
      g.set(cx - 2, 3, MOTH[2]); g.set(cx + 2, 3, MOTH[2]);
      g.set(cx - 3, 2, MOTH[2]); g.set(cx + 3, 2, MOTH[2]);
      const red = o.state === 'wind' ? GLOW[o.f % 2] : '#c0281e';
      if (o.dir === 'side') g.set(cx + 1, 6, red);
      else { g.set(cx - 1, 6, red); g.set(cx + 1, 6, red); }
    },
  },

  // Ratram: a big rat with ram horns that lines up with you and charges.
  ratram: {
    w: 28, h: 20, frames: { idle: 2, move: 4, wind: 2, attack: 4, stun: 4 },
    paint(g, o) {
      const run = o.state === 'move' || o.state === 'attack' ? o.f : 0;
      const bob = run % 2;
      if (o.dir === 'side') {
        const cx = 13, cy = 12 - bob;
        // tail
        g.line(2, cy + 2, 6, cy, '#a8786a');
        // legs
        const leg = (x, ph) => g.rect(x + (ph ? 1 : -1) * (run % 2 ? 1 : 0), cy + 5, 2, 3, RAT[1]);
        leg(cx - 6, run & 1); leg(cx - 3, !(run & 1)); leg(cx + 4, run & 1); leg(cx + 7, !(run & 1));
        g.ellipse(cx, cy, 9, 6, shade(RAT));
        g.ellipse(cx + 9, cy - 1, 5, 4, shade(RAT, 0.05));
        g.set(cx + 14, cy, '#d88a8a');
        // ram horn curling back over the ear
        g.ellipse(cx + 6, cy - 5, 3, 3, '#c8bca0');
        g.set(cx + 6, cy - 5, '#8a7e64'); g.set(cx + 5, cy - 3, '#8a7e64');
        const e = o.state === 'wind' ? GLOW[o.f % 2] : o.state === 'stun' ? '#ffffff' : '#ff4a2a';
        g.rect(cx + 10, cy - 2, 2, 1, e);
        if (o.state === 'stun') { g.set(cx + 10, cy - 3, K); g.set(cx + 11, cy - 1, K); stars(g, cx + 8, 2, o.f); }
        return;
      }
      // front / back
      const cx = 14, cy = 12 - bob;
      g.rect(cx - 7, cy + 5, 3, 3, RAT[1]); g.rect(cx + 5, cy + 5, 3, 3, RAT[1]);
      g.ellipse(cx, cy, 8, 7, shade(RAT));
      if (o.dir === 'up') {
        g.line(cx, cy + 6, cx + 2, cy + 9, '#a8786a');
        g.ellipse(cx - 6, cy - 6, 3, 3, '#c8bca0'); g.ellipse(cx + 6, cy - 6, 3, 3, '#c8bca0');
        return;
      }
      g.ellipse(cx, cy + 1, 5, 4, shade(RAT, 0.1));
      g.ellipse(cx - 6, cy - 6, 3, 3, '#c8bca0'); g.ellipse(cx + 6, cy - 6, 3, 3, '#c8bca0');
      g.set(cx - 6, cy - 6, '#8a7e64'); g.set(cx + 6, cy - 6, '#8a7e64');
      g.rect(cx - 1, cy + 3, 2, 1, '#d88a8a');
      if (o.state === 'stun') { g.set(cx - 3, cy - 2, '#ffffff'); g.set(cx + 3, cy - 2, '#ffffff'); stars(g, cx, 2, o.f); return; }
      eyes(g, cx, cy - 2, o, { gap: 2, size: 0, white: '#ff4a2a', pupil: '#ff4a2a' });
    },
  },

  // Jar Toad: a warty toad that crouches, then hops at you.
  toad: {
    w: 24, h: 20, frames: { idle: 2, wind: 2, air: 1 },
    paint(g, o) {
      const crouch = o.state === 'wind' ? 2 : 0, air = o.state === 'air';
      const cx = 12, cy = 13 + crouch - (air ? 2 : 0);
      const rx = 9 + (crouch ? 1 : 0), ry = air ? 7 : 6 - crouch / 2;
      if (air) { g.rect(cx - 9, cy + 4, 3, 4, TOAD[2]); g.rect(cx + 7, cy + 4, 3, 4, TOAD[2]); }
      else { g.ellipse(cx - 8, cy + 4, 3, 2, TOAD[2]); g.ellipse(cx + 8, cy + 4, 3, 2, TOAD[2]); }
      g.ellipse(cx, cy, rx, ry, shade(TOAD));
      for (const [x, y] of [[cx - 5, cy - 2], [cx + 4, cy + 1], [cx - 2, cy + 3], [cx + 6, cy - 3]]) g.set(x, y, TOAD[4]);
      if (o.dir === 'up') return;
      g.ellipse(cx - (o.dir === 'side' ? 0 : 4), cy - ry + 1, 2.5, 2.5, TOAD[3]);
      g.ellipse(cx + (o.dir === 'side' ? 5 : 4), cy - ry + 1, 2.5, 2.5, TOAD[3]);
      eyes(g, cx + (o.dir === 'side' ? 2 : 0), cy - ry, o, { gap: o.dir === 'side' ? 2 : 4, size: 1, white: '#e8d860' });
      g.rect(cx - 4 + (o.dir === 'side' ? 4 : 0), cy + 2, o.dir === 'side' ? 5 : 8, 1, TOAD[0]);
      if (o.state === 'wind') g.rect(cx - 2, cy + 3, 5, 2, '#d8c860'); // throat puffing
    },
  },

  // Drain Eye: an eyeball lodged in a drain. Opens wide and glows before it fires.
  eye: {
    w: 20, h: 20, dirs: false, frames: { idle: 2, wind: 2 },
    paint(g, o) {
      const cx = 10, cy = 11;
      g.ellipse(cx, cy, 9, 8, '#2c2c34');
      for (let i = -8; i <= 8; i += 3) g.rect(cx + i, cy - 7, 1, 15, '#44444e');
      g.ellipse(cx, cy, 7, 6, '#0a0706');
      const open = o.state === 'wind' ? 5.5 : o.f ? 3 : 4;
      g.ellipse(cx, cy, 6, open, (nx, ny, x, y) => ramp(['#a8a090', '#d0c8b8', '#e8e0d0', '#fffaf0'], 0.8 - ny * 0.3, x, y));
      const glow = o.state === 'wind';
      g.ellipse(cx, cy, 3, Math.min(3, open), glow ? GLOW[o.f % 2] : '#9a1c20');
      g.ellipse(cx, cy, 1.5, Math.min(1.5, open), glow ? '#ffffff' : '#120c0a');
      if (!glow) { g.line(cx - 5, cy - 1, cx - 3, cy, '#c0281e'); g.line(cx + 5, cy + 1, cx + 3, cy, '#c0281e'); }
    },
  },

  // Egg Sac: a pale, veiny sac that swells before something crawls out of it.
  sac: {
    w: 26, h: 24, dirs: false, frames: { idle: 2, wind: 2 },
    paint(g, o) {
      const sw = o.state === 'wind' ? 1 + o.f : o.f * 0.5;
      const cx = 13, cy = 14;
      g.ellipse(cx, cy + 6, 11, 4, '#3a2a20');
      g.ellipse(cx, cy, 9 + sw, 9 + sw * 0.6, shade(PALE));
      g.line(cx - 6, cy - 4, cx - 2, cy + 6, '#a83030');
      g.line(cx + 5, cy - 6, cx + 3, cy + 5, '#a83030');
      g.line(cx - 1, cy - 8, cx + 1, cy - 2, '#a83030');
      for (const [x, y] of [[cx - 3, cy - 3], [cx + 3, cy], [cx - 1, cy + 3]]) g.ellipse(x, y, 1.5, 1.5, o.state === 'wind' ? '#5a2a20' : '#7a5a48');
    },
  },

  // Mite: a tiny pale bug that comes in swarms.
  mite: {
    w: 13, h: 11, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 6, cy = 6, k = o.f % 2;
      for (let i = -1; i <= 1; i++) {
        g.set(cx - 4, cy + i * 2 + k, PALE[1]); g.set(cx + 4, cy + i * 2 - k, PALE[1]);
      }
      g.ellipse(cx, cy, 3.5, 3.5, shade(PALE));
      if (o.dir !== 'up') { g.set(cx - 1, cy - 1, '#c03030'); g.set(cx + 1, cy - 1, '#c03030'); }
    },
  },

  // Sludge: a heap of tar that splits apart when it dies.
  sludge: {
    w: 26, h: 19, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const s = o.f;
      g.ellipse(13, 12 + s * 0.5, 11, 6 - s * 0.5, shade(TAR));
      g.ellipse(9, 8, 5, 4, shade(TAR, 0.1));
      g.ellipse(16, 7, 4, 4, shade(TAR, 0.05));
      g.set(6, 15, TAR[4]); g.set(19, 14, TAR[4]);
      if (o.dir === 'up') return;
      eyes(g, o.dir === 'side' ? 15 : 12, 9, o, { gap: o.dir === 'side' ? 1 : 3, white: '#c8b8d8' });
    },
  },
  sludgeling: {
    w: 15, h: 12, frames: { idle: 2, move: 2 },
    paint(g, o) {
      g.ellipse(7, 7 + o.f * 0.5, 6, 4 - o.f * 0.5, shade(TAR));
      if (o.dir !== 'up') eyes(g, o.dir === 'side' ? 8 : 7, 5, o, { gap: o.dir === 'side' ? 1 : 2, size: 0, white: '#c8b8d8', pupil: '#c8b8d8' });
    },
  },

  // Draft: a cold sheet of air with a face in it. Sometimes it fades away completely.
  draft: {
    w: 20, h: 22, frames: { idle: 3, move: 3 },
    paint(g, o) {
      const cx = 10;
      g.ellipse(cx, 8, 7, 7, shade(GHOST));
      g.poly([[cx - 7, 8], [cx + 8, 8], [cx + 8, 17], [cx - 7, 17]], (x, y) => ramp(GHOST, 0.6 - (y - 8) / 30, x, y));
      for (let x = cx - 7; x <= cx + 7; x++) {
        const len = 2 + Math.round((Math.sin(x * 1.3 + o.f * 2) * 0.5 + 0.5) * 3);
        for (let k = 0; k < len; k++) g.set(x, 17 + k, k === len - 1 ? GHOST[1] : GHOST[2]);
      }
      if (o.dir === 'up') return;
      const ex = o.dir === 'side' ? cx + 2 : cx;
      g.ellipse(ex - (o.dir === 'side' ? 0 : 3), 8, 1.5, 2, '#1a2a3a');
      g.ellipse(ex + 3, 8, 1.5, 2, '#1a2a3a');
      g.ellipse(ex, 13, 2, 1.5, '#1a2a3a');
    },
  },

  // Wax Husk: a hollow, faceless candle-man that blasts shots in a cross.
  husk: {
    w: 18, h: 24, frames: { idle: 2, move: 4, wind: 2 },
    paint(g, o) {
      const cx = 9, step = o.state === 'move' ? o.f % 2 : 0;
      g.rect(cx - 4 + step, 19, 3, 4, WAX[1]);
      g.rect(cx + 1 - step, 19, 3, 4, WAX[1]);
      g.poly([[cx - 6, 6], [cx + 6, 6], [cx + 5, 20], [cx - 5, 20]], (x, y) => ramp(WAX, 0.75 - Math.abs(x - cx) / 14 - (y - 6) / 50, x, y));
      g.ellipse(cx, 5, 5, 4, shade(WAX));
      g.line(cx - 6, 8, cx - 8, 14, WAX[2]); g.line(cx + 6, 8, cx + 8, 14, WAX[2]);
      g.set(cx - 4, 10, WAX[4]); g.set(cx + 3, 13, WAX[4]); g.set(cx - 2, 16, WAX[4]);
      if (o.dir === 'up') return;
      const glow = o.state === 'wind';
      const hx = o.dir === 'side' ? cx + 2 : cx;
      g.ellipse(hx, 6, o.dir === 'side' ? 1.5 : 2.5, 2, glow ? GLOW[o.f % 2] : '#1a1008');
      if (glow) g.set(hx, 6, '#ffffff');
    },
  },

  // ================================================================= The Undercroft
  // Pestfly: a fat little cellar fly. Comes in clouds, drifts at you.
  pestfly: {
    w: 13, h: 11, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 6, cy = 6, up = o.f % 2 === 0;
      const wingC = '#c8d0d8';
      if (o.dir === 'side') { g.ellipse(cx - 1, cy - (up ? 4 : 2), 2.5, 1.5, wingC); }
      else { g.ellipse(cx - 3, cy - (up ? 4 : 2), 2.5, 1.5, wingC); g.ellipse(cx + 3, cy - (up ? 4 : 2), 2.5, 1.5, wingC); }
      g.ellipse(cx, cy, 3.5, 3, shade(FLY));
      g.set(cx - 1, cy + 2, FLY[4]); g.set(cx + 1, cy + 2, FLY[4]);
      if (o.dir === 'up') return;
      if (o.dir === 'side') g.rect(cx + 2, cy - 1, 2, 2, '#c03028');
      else { g.rect(cx - 3, cy - 1, 2, 2, '#c03028'); g.rect(cx + 2, cy - 1, 2, 2, '#c03028'); }
    },
  },

  // Divebuzzer: a big bluebottle with a stinger. Hovers, buzzes louder, then dives.
  divebuzzer: {
    w: 20, h: 16, frames: { idle: 2, move: 2, wind: 2, attack: 2, stun: 4 },
    paint(g, o) {
      const cx = 10, cy = 8, up = o.f % 2 === 0;
      const blur = o.state === 'wind' || o.state === 'attack';
      const wingC = blur ? '#e0e8f0' : '#b8c4d0';
      const flap = blur ? 0 : up ? -2 : 1;
      if (o.dir === 'side') {
        g.ellipse(cx - 2, cy - 5 + flap, 4, 2, wingC);
        g.ellipse(cx, cy, 6, 4, shade(BLUEB));
        g.ellipse(cx + 5, cy - 1, 3, 3, shade(BLUEB, 0.1));
        g.line(cx - 6, cy + 1, cx - 9, cy + 2, '#d8c060');
        g.rect(cx + 6, cy - 2, 2, 2, o.state === 'wind' ? GLOW[o.f % 2] : '#c03028');
        if (o.state === 'stun') stars(g, cx, 1, o.f);
        return;
      }
      g.ellipse(cx - 5, cy - 4 + flap, 4, 2, wingC);
      g.ellipse(cx + 5, cy - 4 + flap, 4, 2, wingC);
      g.ellipse(cx, cy, 5, 5, shade(BLUEB));
      for (let i = -3; i <= 3; i += 3) g.set(cx + i, cy + 2, BLUEB[4]);
      if (o.dir === 'up') { g.line(cx, cy + 5, cx, cy + 8, '#d8c060'); return; }
      const e = o.state === 'wind' ? GLOW[o.f % 2] : '#c03028';
      g.rect(cx - 4, cy - 3, 3, 3, e); g.rect(cx + 2, cy - 3, 3, 3, e);
      if (o.state === 'stun') stars(g, cx, 1, o.f);
    },
  },

  // Mudworm: travels under the floor as a moving mound, bursts out, spits, burrows again.
  mudworm: {
    w: 22, h: 22, frames: { idle: 2, under: 2, wind: 2, attack: 1, emerge: 3 },
    paint(g, o) {
      const cx = 11;
      // the dirt mound it leaves around itself
      g.ellipse(cx, 18, 9, 3.5, (nx, ny, x, y) => ramp(MUD, 0.55 - ny * 0.3, x, y));
      for (const [x, y] of [[cx - 6, 17], [cx + 5, 18], [cx - 2, 20]]) g.set(x, y, MUD[4]);
      if (o.state === 'under') {
        g.ellipse(cx + (o.f ? 1 : -1), 16, 5, 3, shade(MUD, 0.1));
        return;
      }
      const rise = o.state === 'emerge' ? [3, 8, 12][o.f] : 14;
      const top = 19 - rise;
      g.rect(cx - 3, top + 3, 7, rise - 2, (x, y) => ramp(WORM, 0.7 - Math.abs(x - cx) / 6, x, y));
      for (let y = top + 5; y < 18; y += 3) g.rect(cx - 3, y, 7, 1, WORM[1]);
      g.ellipse(cx, top + 3, 4, 3.5, shade(WORM));
      if (o.dir === 'up' || rise < 8) return;
      const open = o.state === 'wind' || o.state === 'attack';
      const mx = o.dir === 'side' ? cx + 2 : cx;
      g.ellipse(mx, top + 3, open ? 2.5 : 1.5, open ? 2 : 1, open ? (o.state === 'wind' ? GLOW[o.f % 2] : '#2a0808') : '#2a0808');
      if (open) { g.set(mx - 2, top + 1, '#e8e0c8'); g.set(mx + 2, top + 1, '#e8e0c8'); }
    },
  },

  // Bristleworm: a long bristly crawler. The head leads, the body follows its path.
  bristleworm: {
    w: 18, h: 17, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 9, cy = 10, k = o.f % 2;
      for (let i = -1; i <= 1; i += 2) { g.set(cx - 7, cy + i * 2 + k, BRISTLE[0]); g.set(cx + 7, cy + i * 2 - k, BRISTLE[0]); }
      g.ellipse(cx, cy, 7, 6, shade(BRISTLE, 0.05));
      for (const [x, y] of [[cx - 5, cy - 4], [cx + 4, cy - 5], [cx - 1, cy - 6], [cx + 6, cy - 2]]) g.set(x, y, BRISTLE[4]);
      if (o.dir === 'up') return;
      const fx = o.dir === 'side' ? cx + 3 : cx;
      g.ellipse(fx, cy + 2, 3, 2, '#2a0808');
      g.set(fx - 2, cy + 3, '#e8e0c8'); g.set(fx + 2, cy + 3, '#e8e0c8');
      eyes(g, fx, cy - 3, o, { gap: o.dir === 'side' ? 1 : 2, size: 0, white: '#ffd25a', pupil: '#ffd25a' });
    },
  },
  bristleseg: {
    w: 16, h: 15, dirs: false, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 8, cy = 9, k = o.f % 2;
      for (let i = -1; i <= 1; i += 2) { g.set(cx - 7, cy + i * 2 + k, BRISTLE[0]); g.set(cx + 7, cy + i * 2 - k, BRISTLE[0]); }
      g.ellipse(cx, cy, 6, 5, shade(BRISTLE));
      g.rect(cx - 4, cy - 1, 9, 1, BRISTLE[1]);
      for (const [x, y] of [[cx - 3, cy - 4], [cx + 3, cy - 4], [cx, cy - 5]]) g.set(x, y, BRISTLE[4]);
    },
  },

  // Gnawer: a scrawny rat. Scurries about, rears up, then lunges at you.
  gnawer: {
    w: 20, h: 15, frames: { idle: 2, move: 4, wind: 2, attack: 1, stun: 4 },
    paint(g, o) {
      const run = o.state === 'move' ? o.f : 0;
      const rear = o.state === 'wind';
      if (o.dir === 'side') {
        const cy = 10 - (rear ? 2 : 0);
        g.line(1, cy + 1, 5, cy, '#a8786a');
        g.rect(7 + (run % 2), cy + 3, 2, 2, RAT[1]); g.rect(12 - (run % 2), cy + 3, 2, 2, RAT[1]);
        if (o.state === 'attack') g.ellipse(10, cy, 8, 3, shade(RAT));
        else g.ellipse(10, cy, 6, 4, shade(RAT));
        g.ellipse(15, cy - 1 - (rear ? 1 : 0), 3.5, 3, shade(RAT, 0.05));
        g.set(18, cy - 1, '#d88a8a');
        g.ellipse(13, cy - 4, 1.5, 1.5, '#d88a8a');
        g.set(16, cy - 2 - (rear ? 1 : 0), o.state === 'wind' ? GLOW[o.f % 2] : o.state === 'stun' ? '#ffffff' : K);
        if (rear) { g.set(17, cy + 1, '#e8e0c8'); }
        if (o.state === 'stun') stars(g, 13, 1, o.f);
        return;
      }
      const cx = 10, cy = 9 - (rear ? 2 : 0) - (run % 2);
      g.rect(cx - 5, cy + 4, 2, 2, RAT[1]); g.rect(cx + 4, cy + 4, 2, 2, RAT[1]);
      g.ellipse(cx, cy, 6, 5, shade(RAT));
      g.ellipse(cx - 5, cy - 4, 2, 2, '#d88a8a'); g.ellipse(cx + 5, cy - 4, 2, 2, '#d88a8a');
      if (o.dir === 'up') { g.line(cx, cy + 5, cx + 3, cy + 8, '#a8786a'); return; }
      g.ellipse(cx, cy + 2, 3, 2, shade(RAT, 0.12));
      g.set(cx, cy + 2, '#d88a8a');
      if (rear || o.state === 'attack') { g.set(cx - 1, cy + 4, '#e8e0c8'); g.set(cx + 1, cy + 4, '#e8e0c8'); }
      if (o.state === 'stun') { g.set(cx - 2, cy - 1, '#ffffff'); g.set(cx + 2, cy - 1, '#ffffff'); stars(g, cx, 1, o.f); return; }
      eyes(g, cx, cy - 1, o, { gap: 2, size: 0, white: K, pupil: K });
    },
  },

  // Gawper: a slumped wax figure with a drooping face that shambles after you.
  // Hurt it enough and the face cracks: it shakes with rage, then runs.
  gawper: {
    w: 20, h: 26, frames: { idle: 2, move: 4, wind: 2 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 4 : 0;
      const lean = step === 1 ? 1 : step === 3 ? -1 : 0;
      const angry = o.state === 'rage' || o.state === 'wind' || o.angry;
      g.rect(cx - 4, 21, 3, 4 - (step === 1 ? 1 : 0), GAWP[1]);
      g.rect(cx + 1, 21, 3, 4 - (step === 3 ? 1 : 0), GAWP[1]);
      g.poly([[cx - 6 + lean, 9], [cx + 6 + lean, 9], [cx + 6, 22], [cx - 6, 22]], (x, y) => ramp(GAWP, 0.75 - Math.abs(x - cx) / 16 - (y - 9) / 60, x, y));
      g.line(cx - 6 + lean, 11, cx - 8, 18 + (step % 2), GAWP[2]);
      g.line(cx + 6 + lean, 11, cx + 8, 18 - (step % 2), GAWP[2]);
      g.ellipse(cx + lean, 7, 6, 6, shade(GAWP));
      // drips of wax
      g.rect(cx - 5 + lean, 10, 1, 3, GAWP[4]); g.rect(cx + 4 + lean, 9, 1, 4, GAWP[4]);
      if (o.dir === 'up') return;
      const hx = cx + lean + (o.dir === 'side' ? 2 : 0);
      const e = angry ? GLOW[o.f % 2] : '#120c0a';
      if (o.dir === 'side') g.rect(hx + 1, 5, 2, 3, e);
      else { g.rect(hx - 3, 5, 2, 3, e); g.rect(hx + 2, 5, 2, 3, e); }
      g.ellipse(hx, 10, angry ? 2.5 : 1.5, angry ? 2 : 2.5, '#2a0808');
      if (angry) { g.line(hx - 4, 2, hx - 1, 5, '#2a1a10'); g.line(hx + 3, 1, hx + 1, 4, '#2a1a10'); }
    },
  },

  // Rat Matron (miniboss): a huge mother rat in a crown of chewed wax. Charges and calls her brood.
  ratmatron: {
    w: 40, h: 30, frames: { idle: 2, move: 4, wind: 2, attack: 4, stun: 4, summon: 2 },
    paint(g, o) {
      const run = o.state === 'move' || o.state === 'attack' ? o.f : 0;
      const bob = run % 2;
      const crown = (x, y) => { for (let i = 0; i < 4; i++) { g.rect(x + i * 3, y, 2, 3 - (i % 2), '#c9b48a'); g.set(x + i * 3, y - 1, '#e8d9b0'); } };
      const eye = o.state === 'wind' || o.state === 'summon' ? GLOW[o.f % 2] : o.state === 'stun' ? '#ffffff' : '#ff4a2a';
      if (o.dir === 'side') {
        const cx = 18, cy = 18 - bob;
        g.line(1, cy + 4, 8, cy, '#a8786a'); g.line(1, cy + 5, 8, cy + 1, '#a8786a');
        for (const [x, ph] of [[cx - 9, 0], [cx - 4, 1], [cx + 6, 0], [cx + 11, 1]]) g.rect(x + ((run + ph) % 2), cy + 8, 3, 4, RAT[1]);
        g.ellipse(cx, cy, 14, 9, shade(RAT));
        g.ellipse(cx + 14, cy - 2, 7, 6, shade(RAT, 0.05));
        g.set(cx + 21, cy - 1, '#d88a8a'); g.set(cx + 21, cy, '#d88a8a');
        g.ellipse(cx + 10, cy - 8, 3, 3, '#d88a8a');
        g.rect(cx + 15, cy - 4, 3, 2, eye);
        crown(cx + 9, cy - 12);
        if (o.state === 'summon') { g.ellipse(cx + 18, cy + 2, 2, 2, '#2a0808'); }
        if (o.state === 'stun') stars(g, cx + 12, 3, o.f);
        return;
      }
      const cx = 20, cy = 17 - bob;
      g.rect(cx - 12, cy + 8, 4, 4, RAT[1]); g.rect(cx + 9, cy + 8, 4, 4, RAT[1]);
      g.ellipse(cx, cy, 13, 11, shade(RAT));
      g.ellipse(cx - 10, cy - 10, 3.5, 3.5, '#d88a8a'); g.ellipse(cx + 10, cy - 10, 3.5, 3.5, '#d88a8a');
      crown(cx - 5, cy - 14);
      if (o.dir === 'up') { g.line(cx, cy + 10, cx + 5, cy + 13, '#a8786a'); return; }
      g.ellipse(cx, cy + 3, 6, 5, shade(RAT, 0.12));
      g.rect(cx - 1, cy + 5, 3, 1, '#d88a8a');
      g.rect(cx - 6, cy - 3, 3, 2, eye); g.rect(cx + 4, cy - 3, 3, 2, eye);
      if (o.state === 'summon' || o.state === 'wind') { g.ellipse(cx, cy + 6, 3, 2, '#2a0808'); g.set(cx - 2, cy + 5, '#e8e0c8'); g.set(cx + 2, cy + 5, '#e8e0c8'); }
      if (o.state === 'stun') stars(g, cx, 3, o.f);
    },
  },
};

// The Gawper after its face cracks: same body, burning eyes and a gaping mouth.
ENEMY_ART.gawperRage = { ...ENEMY_ART.gawper, paint: (g, o) => ENEMY_ART.gawper.paint(g, { ...o, angry: true }) };

// ======================================================================= The Weeping Hollow
const SPIDER = ['#14100e', '#241c18', '#36281f', '#4a382a', '#644c38'];
const MOSS = ['#14200e', '#203216', '#30461e', '#44602a', '#5e7c3a', '#7e9a50'];
const SHELL = ['#1e2414', '#2e3820', '#40502c', '#56683a', '#70844a'];
const WEB = '#c8c4b8';

// Eight bent spider legs around a body center. `wiggle` comes from the frame.
function spiderLegs(g, cx, cy, span, wiggle, col) {
  const pairs = [-0.9, -0.35, 0.25, 0.8];
  for (let i = 0; i < 4; i++) {
    const w = (i + wiggle) % 2 ? 1 : -1;
    for (const s of [-1, 1]) {
      const kx = cx + s * span * 0.6, ky = cy + pairs[i] * span * 0.45 - 2 + w;
      const fx = cx + s * span, fy = cy + pairs[i] * span * 0.55 + 2 - w;
      g.line(cx, cy + pairs[i] * 2, kx, ky, col);
      g.line(kx, ky, fx, fy, col);
    }
  }
}

Object.assign(ENEMY_ART, {
  // Crawlspider: a small black spider that skitters in jerky bursts.
  crawlspider: {
    w: 18, h: 12, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 9, cy = 7;
      spiderLegs(g, cx, cy, 8, o.f, SPIDER[2]);
      g.ellipse(cx, cy + (o.dir === 'up' ? -1 : 1), 3.5, 3, shade(SPIDER, 0.1));
      g.ellipse(cx, cy + (o.dir === 'up' ? 2 : -2), 2.5, 2, shade(SPIDER, 0.15));
      if (o.dir === 'up') { g.set(cx, cy - 1, '#8a2020'); return; }
      g.set(cx - 1, cy - 3, '#ff4a2a'); g.set(cx + 1, cy - 3, '#ff4a2a');
    },
  },

  // Bigleg: a long-legged spider. Crouches with burning eyes, then leaps across the room.
  bigleg: {
    w: 30, h: 20, frames: { idle: 2, wind: 2, air: 1 },
    paint(g, o) {
      const crouch = o.state === 'wind' ? 2 : 0, air = o.state === 'air';
      const cx = 15, cy = 11 + crouch;
      spiderLegs(g, cx, cy, air ? 11 : 14 - crouch, air ? 0 : o.f, SPIDER[3]);
      g.ellipse(cx, cy + (o.dir === 'up' ? -2 : 2), 6, 5, shade(SPIDER));
      for (const [x, y] of [[cx - 2, cy + 2], [cx + 2, cy + 3], [cx, cy + 5]]) g.set(x, y + (o.dir === 'up' ? -3 : 0), '#a83030');
      g.ellipse(cx, cy + (o.dir === 'up' ? 3 : -3), 4, 3, shade(SPIDER, 0.1));
      if (o.dir === 'up') return;
      const e = o.state === 'wind' ? GLOW[o.f % 2] : '#ff4a2a';
      for (const [x, y] of [[cx - 2, cy - 4], [cx + 2, cy - 4], [cx - 1, cy - 5], [cx + 1, cy - 5]]) g.set(x, y, e);
      g.set(cx - 1, cy - 1, '#e8e0c8'); g.set(cx + 1, cy - 1, '#e8e0c8');
    },
  },

  // Brood Nest: a lumpy web cocoon stuck to the floor. It swells, then spiders crawl out.
  broodnest: {
    w: 26, h: 24, dirs: false, frames: { idle: 2, wind: 2 },
    paint(g, o) {
      const sw = o.state === 'wind' ? 1 + o.f : 0;
      const cx = 13, cy = 14;
      g.ellipse(cx, cy + 6, 12, 4, '#2a2a20');
      g.ellipse(cx, cy, 9 + sw, 9 + sw * 0.5, (nx, ny, x, y) => ramp(['#6a665a', '#8a8678', '#aaa698', '#c8c4b8', '#e8e4d8'], light(nx, ny), x, y));
      for (let i = -8; i <= 8; i += 4) g.line(cx + i, cy - 9, cx - i * 0.6, cy + 8, '#8a8678');
      g.line(cx - 9, cy - 2, cx + 9, cy + 1, '#8a8678');
      for (const [x, y] of [[cx - 3, cy - 2], [cx + 3, cy + 2], [cx, cy - 5]]) g.ellipse(x, y, 1.5, 1.5, o.state === 'wind' ? '#5a1a14' : '#3a2a20');
      g.line(cx - 12, cy + 4, cx - 6, cy + 1, WEB); g.line(cx + 12, cy + 5, cx + 6, cy + 2, WEB);
    },
  },

  // Webspitter: a pale-bellied spider that keeps its distance and spits balls of web.
  webspitter: {
    w: 22, h: 16, frames: { idle: 2, move: 2, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 11, cy = 9;
      spiderLegs(g, cx, cy, 10, o.f, SPIDER[2]);
      const glow = o.state === 'wind';
      const by = o.dir === 'up' ? cy - 2 : cy + 2;
      g.ellipse(cx, by, 5, 4.5, (nx, ny, x, y) => ramp(glow ? ['#6a5a3a', '#a89060', '#e8d8a0', '#fff8d0'] : ['#3a3028', '#6a5c48', '#9a8a70', '#c8b898'], light(nx, ny), x, y));
      g.ellipse(cx, o.dir === 'up' ? cy + 3 : cy - 3, 3.5, 2.5, shade(SPIDER, 0.1));
      if (o.dir === 'up') return;
      const e = glow ? GLOW[o.f % 2] : '#ff4a2a';
      g.set(cx - 1, cy - 4, e); g.set(cx + 1, cy - 4, e);
      if (glow || o.state === 'attack') g.ellipse(cx, cy - 1, 1.5, 1, WEB);
    },
  },

  // Mossback: a slow beetle under a thick mossy shell. Shots from the front just bounce off.
  mossback: {
    w: 28, h: 20, frames: { idle: 2, move: 2, wind: 2, attack: 1 },
    paint(g, o) {
      const step = o.state === 'move' ? o.f % 2 : 0, raised = o.state === 'wind' || o.state === 'attack';
      const cx = 14, cy = 12 - (raised ? 1 : 0);
      for (const [x, ph] of [[cx - 9, 0], [cx - 3, 1], [cx + 3, 0], [cx + 9, 1]]) g.rect(x, cy + 5 + ((step + ph) % 2), 2, 3, SHELL[0]);
      g.ellipse(cx, cy, 13, 7, (nx, ny, x, y) => ramp(MOSS, light(nx, ny) + ((x * 7 + y * 3) % 5 === 0 ? 0.2 : 0), x, y));
      for (const [x, y] of [[cx - 7, cy - 3], [cx + 5, cy - 4], [cx - 1, cy - 5], [cx + 9, cy - 1]]) g.set(x, y, '#9aba60');
      g.line(cx - 12, cy + 3, cx + 12, cy + 3, SHELL[1]);
      if (o.dir === 'up') return;
      if (o.dir === 'side') {
        g.ellipse(cx + 12, cy + 2, 3.5, 3, shade(SHELL));
        g.set(cx + 13, cy + 1, raised ? GLOW[o.f % 2] : '#e8d860');
        return;
      }
      g.ellipse(cx, cy + 4, 5, 3, shade(SHELL));
      const e = raised ? GLOW[o.f % 2] : '#e8d860';
      g.set(cx - 2, cy + 3, e); g.set(cx + 2, cy + 3, e);
      if (raised) g.ellipse(cx, cy + 5, 2, 1, '#2a0808');
    },
  },

  // Moss Lurker: hides as a patch of moss; bulges, then bursts up into a toothy maw.
  mosslurker: {
    w: 24, h: 22, frames: { idle: 2, hidden: 2, wind: 2, attack: 1, stun: 2 },
    paint(g, o) {
      const cx = 12;
      const patch = () => {
        g.ellipse(cx, 18, 10, 3.5, (nx, ny, x, y) => ramp(MOSS, 0.5 - ny * 0.25 + ((x + y) % 3 === 0 ? 0.15 : 0), x, y));
        for (const [x, y] of [[cx - 6, 17], [cx + 4, 18], [cx - 1, 19], [cx + 7, 17]]) g.set(x, y, MOSS[5]);
      };
      if (o.state === 'hidden') { patch(); return; }
      if (o.state === 'wind') {
        patch();
        g.ellipse(cx + (o.f ? 1 : -1), 15, 6, 4, shade(MOSS, 0.1));
        g.set(cx - 2, 14, GLOW[o.f % 2]); g.set(cx + 2, 14, GLOW[o.f % 2]);
        return;
      }
      patch();
      const open = o.state === 'attack';
      g.ellipse(cx, 11, 8, 8, shade(MOSS));
      for (const [x, y] of [[cx - 5, 6], [cx + 4, 5], [cx, 4], [cx + 6, 9], [cx - 7, 10]]) g.set(x, y, MOSS[5]);
      if (o.dir === 'up') return;
      g.ellipse(cx, 12, 5, open ? 4 : 2, '#1a0606');
      for (let x = cx - 4; x <= cx + 4; x += 2) { g.set(x, 12 - (open ? 3 : 1), '#e8e0c8'); g.set(x + 1, 12 + (open ? 3 : 1), '#e8e0c8'); }
      const e = o.state === 'stun' ? '#ffffff' : '#ffd25a';
      g.set(cx - 3, 7, e); g.set(cx + 3, 7, e);
    },
  },

  // Hanger: a spider on a thread. Its shadow creeps after you, then it drops.
  hanger: {
    w: 20, h: 14, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 10, cy = 8;
      spiderLegs(g, cx, cy, 9, o.f, SPIDER[3]);
      g.ellipse(cx, cy + 1, 4.5, 4, (nx, ny, x, y) => ramp(['#2a1a2a', '#4a2a4a', '#6a3a5a', '#8a5070'], light(nx, ny), x, y));
      g.set(cx - 2, cy + 2, '#c8a0c0'); g.set(cx + 2, cy, '#c8a0c0');
      g.ellipse(cx, cy - 3, 3, 2.5, shade(SPIDER, 0.1));
      if (o.dir !== 'up') { g.set(cx - 1, cy - 4, '#ff4a2a'); g.set(cx + 1, cy - 4, '#ff4a2a'); }
    },
  },

  // Loom Mother (miniboss): a huge old spider with a ruff of web. Leaps, spits webs, calls her brood.
  loommother: {
    w: 44, h: 30, frames: { idle: 2, move: 2, wind: 2, air: 1, summon: 2, attack: 1 },
    paint(g, o) {
      const crouch = o.state === 'wind' || o.state === 'summon' ? 2 : 0, air = o.state === 'air';
      const cx = 22, cy = 16 + crouch;
      spiderLegs(g, cx, cy, air ? 16 : 20 - crouch, air ? 0 : o.f, SPIDER[3]);
      g.ellipse(cx, cy + (o.dir === 'up' ? -3 : 4), 10, 8, shade(SPIDER));
      const my = cy + (o.dir === 'up' ? -3 : 5);
      g.poly([[cx - 3, my - 3], [cx + 3, my - 3], [cx - 3, my + 3], [cx + 3, my + 3]], '#a82a2a');
      g.ellipse(cx, cy + (o.dir === 'up' ? 4 : -4), 7, 5, shade(SPIDER, 0.12));
      for (let i = -6; i <= 6; i += 2) g.line(cx + i, cy - 7, cx + i * 1.4, cy - 11, WEB);
      if (o.dir === 'up') return;
      const e = o.state === 'wind' || o.state === 'summon' ? GLOW[o.f % 2] : '#ff4a2a';
      for (const [x, y] of [[cx - 3, cy - 6], [cx + 3, cy - 6], [cx - 1, cy - 7], [cx + 1, cy - 7], [cx - 4, cy - 4], [cx + 4, cy - 4]]) g.set(x, y, e);
      g.rect(cx - 2, cy - 2, 1, 2, '#e8e0c8'); g.rect(cx + 2, cy - 2, 1, 2, '#e8e0c8');
      if (o.state === 'attack') g.ellipse(cx, cy - 1, 2, 1.5, WEB);
    },
  },
});

// ======================================================================= The Smolder
const CHAR = ['#0e0a0a', '#1c1414', '#2a1e1c', '#3c2a26', '#523a32'];
const EMBER = ['#5a1008', '#a02010', '#e04a18', '#ff8a2a', '#ffd25a', '#fff3c0'];
const ASHG = ['#2a2624', '#45403c', '#625a54', '#837a72', '#a89e94'];

// A little flame on top of something (flickers with the frame).
function flame(g, cx, top, f, big = 1) {
  const h = Math.round((4 + (f % 2)) * big), w = Math.round(2 * big);
  g.ellipse(cx, top - h / 2, w + 1, h / 2 + 1, EMBER[2]);
  g.ellipse(cx, top - h / 2 + 1, w, h / 2, EMBER[3]);
  g.ellipse(cx, top - h / 4 + 1, Math.max(1, w - 1), h / 4, EMBER[4]);
  g.set(cx + (f % 2 ? 1 : -1), top - h - 1, EMBER[3]);
}
// Glowing cracks across a body.
function cracks(g, pts, col = EMBER[3]) { for (let i = 0; i + 1 < pts.length; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col); }

Object.assign(ENEMY_ART, {
  // Cinderling: a scurrying lump of burning tallow that leaves fire behind it.
  cinderling: {
    w: 16, h: 18, frames: { idle: 2, move: 4 },
    paint(g, o) {
      const cx = 8, sq = o.state === 'move' ? [0, 1, 0, -1][o.f] : 0;
      g.ellipse(cx, 13, 6 + sq, 4 - sq * 0.5, shade(CHAR, 0.15));
      cracks(g, [[cx - 4, 13], [cx - 1, 12], [cx + 2, 14], [cx + 4, 12]]);
      flame(g, cx, 10, o.f);
      if (o.dir === 'up') return;
      const ex = o.dir === 'side' ? cx + 2 : cx;
      g.set(ex - (o.dir === 'side' ? 0 : 2), 12, '#ffd25a'); g.set(ex + 2, 12, '#ffd25a');
    },
  },

  // Ashwalker: a charred figure. When it dies it glows white-hot for a moment, then bursts into flames.
  ashwalker: {
    w: 20, h: 26, frames: { idle: 2, move: 4, fuse: 2 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 4 : 0, fuse = o.state === 'fuse';
      const body = fuse ? ['#7a2a10', '#c04a18', '#f08a24', '#ffd25a', '#fff3c0'] : CHAR;
      g.rect(cx - 4, 21, 3, 4 - (step === 1 ? 1 : 0), body[1]);
      g.rect(cx + 1, 21, 3, 4 - (step === 3 ? 1 : 0), body[1]);
      g.poly([[cx - 6, 9], [cx + 6, 9], [cx + 5, 22], [cx - 5, 22]], (x, y) => ramp(body, 0.7 - Math.abs(x - cx) / 14 - (y - 9) / 60, x, y));
      g.ellipse(cx, 6, 5, 5, shade(body));
      g.line(cx - 6, 11, cx - 8, 18 + (step % 2), body[2]); g.line(cx + 6, 11, cx + 8, 18 - (step % 2), body[2]);
      cracks(g, [[cx - 3, 11], [cx - 1, 14], [cx - 3, 17], [cx - 1, 20]], fuse ? '#ffffff' : EMBER[2]);
      cracks(g, [[cx + 3, 12], [cx + 2, 16], [cx + 4, 19]], fuse ? '#ffffff' : EMBER[2]);
      if (o.dir === 'up') return;
      const hx = o.dir === 'side' ? cx + 2 : cx;
      const e = fuse ? '#ffffff' : EMBER[4];
      if (o.dir === 'side') g.rect(hx + 1, 5, 2, 2, e);
      else { g.rect(hx - 3, 5, 2, 2, e); g.rect(hx + 2, 5, 2, 2, e); }
    },
  },

  // Flickerwisp: a floating flame with a face. It blinks out and reappears next to you.
  flickerwisp: {
    w: 16, h: 20, frames: { idle: 3, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 8, k = o.f % 3;
      g.ellipse(cx, 13, 6, 6, (nx, ny, x, y) => ramp(EMBER, 0.85 - ny * 0.3 - Math.abs(nx) * 0.3, x, y));
      g.poly([[cx - 5, 12], [cx - 1 + k, 1], [cx + 5, 12]], (x, y) => ramp(EMBER, 0.6 - (12 - y) / 40, x, y));
      g.ellipse(cx, 14, 3, 3, EMBER[4]);
      if (o.dir === 'up') return;
      const glow = o.state === 'wind';
      const ex = o.dir === 'side' ? cx + 2 : cx;
      g.rect(ex - (o.dir === 'side' ? 0 : 3), 11, 2, 2, glow ? '#ffffff' : '#3a0804');
      g.rect(ex + 2, 11, 2, 2, glow ? '#ffffff' : '#3a0804');
      g.rect(ex - 1, 15, 3, 1, '#3a0804');
    },
  },

  // Kindler: a hunched candle-goblin with a sack of coals. Lights one, lobs it at you.
  kindler: {
    w: 20, h: 22, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 2 : 0;
      g.rect(cx - 4 + step, 18, 3, 3, CHAR[2]); g.rect(cx + 1 - step, 18, 3, 3, CHAR[2]);
      g.ellipse(cx - 4, 12, 4, 5, '#4a3424');                 // sack on its back
      g.ellipse(cx, 13, 6, 6, (nx, ny, x, y) => ramp(['#3a2a1e', '#5a4230', '#7a5a40', '#9a7652'], light(nx, ny), x, y));
      g.ellipse(cx + 1, 7, 4, 4, shade(['#5a4a3a', '#7a6650', '#9a8468', '#baa486']));
      flame(g, cx + 1, 3, o.f, 0.6);
      const raised = o.state === 'wind' || o.state === 'attack';
      if (raised) { g.line(cx + 5, 12, cx + 7, 5, '#7a6650'); g.ellipse(cx + 7, 4, 2, 2, o.state === 'wind' ? GLOW[o.f % 2] : '#3a2a20'); }
      else g.line(cx + 5, 12, cx + 7, 16, '#7a6650');
      if (o.dir === 'up') return;
      const ex = o.dir === 'side' ? cx + 3 : cx + 1;
      g.set(ex - (o.dir === 'side' ? 0 : 1), 7, '#ffd25a'); g.set(ex + 1, 7, '#ffd25a');
    },
  },

  // Smokebelly: a bloated bellows of a creature. Breathes in (puffing up), then breathes fire.
  smokebelly: {
    w: 26, h: 24, frames: { idle: 2, move: 2, wind: 2, attack: 2 },
    paint(g, o) {
      const cx = 13, puff = o.state === 'wind' ? 1 + o.f : 0;
      g.rect(cx - 6, 19, 3, 4, ASHG[1]); g.rect(cx + 3, 19, 3, 4, ASHG[1]);
      g.ellipse(cx, 13, 10 + puff, 9 + puff * 0.6, shade(ASHG));
      for (let y = 7; y < 20; y += 3) g.line(cx - 8, y, cx + 8, y, ASHG[1]);    // bellows folds
      g.ellipse(cx, 13, 5, 4, puff ? EMBER[2] : '#3a2a26');                  // belly glow
      if (o.dir === 'up') return;
      const side = o.dir === 'side';
      const mx = side ? cx + 9 : cx, my = side ? 11 : 16;
      const fire = o.state === 'attack';
      g.ellipse(mx, my, fire ? 3 : 2, fire ? 3 : 1.5, fire ? EMBER[4] : '#1a0a08');
      const e = o.state === 'wind' ? GLOW[o.f % 2] : '#ffd25a';
      if (side) g.rect(cx + 5, 8, 2, 2, e);
      else { g.rect(cx - 4, 9, 2, 2, e); g.rect(cx + 3, 9, 2, 2, e); }
    },
  },

  // Scorch Rat: a rat with its fur on fire. Charges, leaving a line of flames.
  scorchrat: {
    w: 24, h: 18, frames: { idle: 2, move: 4, wind: 2, attack: 4, stun: 4 },
    paint(g, o) {
      ENEMY_ART.gnawer.paint(g, { ...o, state: o.state === 'attack' ? 'move' : o.state === 'wind' ? 'wind' : o.state });
      const fx = o.dir === 'side' ? 7 : 10;
      flame(g, fx, 6, o.f, 0.7);
      flame(g, fx + 5, 7, o.f + 1, 0.5);
    },
  },

  // Clinker: a slow lump of half-burnt coal. Breaks into two burning bits when it dies.
  clinker: {
    w: 24, h: 20, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 12, s = o.f % 2;
      g.ellipse(cx, 12 + s * 0.5, 10, 7 - s * 0.5, shade(CHAR, 0.1));
      g.ellipse(cx - 4, 8, 4, 3, shade(CHAR, 0.15)); g.ellipse(cx + 5, 7, 3, 3, shade(CHAR, 0.12));
      cracks(g, [[cx - 7, 13], [cx - 3, 11], [cx, 14], [cx + 4, 11], [cx + 8, 13]]);
      cracks(g, [[cx - 2, 8], [cx, 10]]);
      if (o.dir === 'up') return;
      const ex = o.dir === 'side' ? cx + 4 : cx;
      g.set(ex - (o.dir === 'side' ? 0 : 3), 11, '#ffd25a'); g.set(ex + 3, 11, '#ffd25a');
    },
  },
  coalbit: {
    w: 12, h: 11, frames: { idle: 2, move: 2 },
    paint(g, o) {
      g.ellipse(6, 7, 4.5, 3.5, shade(CHAR, 0.15));
      cracks(g, [[3, 7], [5, 6], [7, 8], [9, 6]]);
      if (o.dir !== 'up') { g.set(5, 6, '#ffd25a'); g.set(7, 6, '#ffd25a'); }
    },
  },

  // Ember Hound (miniboss): a big dog made of coals. Charges trailing fire and breathes flame.
  emberhound: {
    w: 40, h: 28, frames: { idle: 2, move: 4, wind: 2, attack: 4, stun: 4, breath: 2 },
    paint(g, o) {
      const run = o.state === 'move' || o.state === 'attack' ? o.f : 0, bob = run % 2;
      const eye = o.state === 'wind' || o.state === 'breath' ? GLOW[o.f % 2] : o.state === 'stun' ? '#ffffff' : EMBER[4];
      if (o.dir === 'side') {
        const cx = 17, cy = 16 - bob;
        for (const [x, ph] of [[cx - 10, 0], [cx - 5, 1], [cx + 5, 0], [cx + 10, 1]]) g.rect(x + ((run + ph) % 2), cy + 6, 3, 5, CHAR[1]);
        g.ellipse(cx, cy, 13, 7, shade(CHAR, 0.1));
        g.ellipse(cx + 13, cy - 3, 6, 5, shade(CHAR, 0.12));
        g.rect(cx + 16, cy - 1, 5, 3, CHAR[2]);                       // snout
        g.poly([[cx + 9, cy - 7], [cx + 11, cy - 13], [cx + 13, cy - 7]], CHAR[2]);   // ear
        cracks(g, [[cx - 10, cy], [cx - 5, cy - 3], [cx, cy + 1], [cx + 6, cy - 2]]);
        g.rect(cx + 14, cy - 5, 2, 2, eye);
        if (o.state === 'breath') g.ellipse(cx + 21, cy, 3, 2, EMBER[4]);
        for (let i = 0; i < 4; i++) flame(g, cx - 10 + i * 5, cy - 6, o.f + i, 0.6);
        if (o.state === 'stun') stars(g, cx + 12, 2, o.f);
        return;
      }
      const cx = 20, cy = 15 - bob;
      g.rect(cx - 11, cy + 6, 4, 5, CHAR[1]); g.rect(cx + 8, cy + 6, 4, 5, CHAR[1]);
      g.ellipse(cx, cy, 12, 9, shade(CHAR, 0.1));
      g.poly([[cx - 9, cy - 6], [cx - 7, cy - 13], [cx - 4, cy - 7]], CHAR[2]);
      g.poly([[cx + 4, cy - 7], [cx + 7, cy - 13], [cx + 9, cy - 6]], CHAR[2]);
      cracks(g, [[cx - 8, cy + 2], [cx - 3, cy - 1], [cx + 2, cy + 3], [cx + 8, cy]]);
      for (let i = 0; i < 3; i++) flame(g, cx - 6 + i * 6, cy - 8, o.f + i, 0.7);
      if (o.dir === 'up') return;
      g.ellipse(cx, cy + 3, 5, 4, shade(CHAR, 0.2));
      g.rect(cx - 5, cy - 3, 3, 2, eye); g.rect(cx + 3, cy - 3, 3, 2, eye);
      if (o.state === 'breath' || o.state === 'wind') g.ellipse(cx, cy + 5, 3, 2, o.state === 'breath' ? EMBER[4] : '#2a0808');
      if (o.state === 'stun') stars(g, cx, 2, o.f);
    },
  },
});

// Painting helpers shared with the other chapters' art files (src/data/art/).
export { shade, eyes, stars, spiderLegs, flame, cracks, GLOW, K };
