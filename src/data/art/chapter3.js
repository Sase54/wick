// Chapter 3 enemy art: The Underhall (iron and stone), The Wax Tombs (crypts of the chandlers),
// The Mire (tar and rot). Same conventions as src/data/enemyArt.js (front/back/side views and
// state poses; `side` faces right, left is mirrored).
import { ramp } from '../../engine/pixelgrid.js';
import { ENEMY_ART, shade, eyes, stars, GLOW } from '../enemyArt.js';

const IRON = ['#16181c', '#24272e', '#363a44', '#4c525e', '#6a7280', '#929aa8'];
const STONE = ['#24262a', '#36393e', '#4c5056', '#666a70', '#868a90'];
const GHOUL = ['#2e3428', '#454e3c', '#5e6a52', '#7a886a', '#9aa888'];
const HIDE = ['#3a2a24', '#563e34', '#745446', '#94705c', '#b48e74'];
const LEATHER = ['#1e1612', '#30241c', '#44342a', '#5a463a'];
const WRAP = ['#6a604e', '#8a7e66', '#aa9e82', '#c8bea0', '#e4dcc0'];
const MARBLE = ['#4a4652', '#68646e', '#88848e', '#aaa6ae', '#d0ccd2'];
const VIOLET = ['#2a1240', '#4a2270', '#7a44b0', '#b48ae8', '#ecdcff'];
const GOLD = ['#4a3410', '#7a5a1c', '#a8822c', '#d0aa48', '#f0d880'];
const TARC = ['#08060a', '#141018', '#221c28', '#342a3c', '#4a3e54'];
const BOG = ['#1a2014', '#2a3420', '#3c4a2c', '#52623a', '#6e7e4c'];
const ROT = ['#3a3a1c', '#565428', '#747036', '#948e48', '#b4ac62'];
const SLIME = ['#1a2a10', '#2e4818', '#4a6e22', '#6e9a30', '#a0cc48'];
const WOOD = ['#2a1c12', '#3e2a1a', '#563c26', '#6e4e32'];

const eyeGlow = (o, base) => (o.state === 'wind' ? GLOW[o.f % 2] : base);
const legs = (g, cx, y, step, col, gap = 3, h = 5) => {
  g.rect(cx - gap - 1, y, 3, h - (step === 1 ? 1 : 0), col);
  g.rect(cx + gap - 1, y, 3, h - (step === 3 ? 1 : 0), col);
};

Object.assign(ENEMY_ART, {
  // ===================================================================== The Underhall
  // Chainling: a shackled ghoul swinging an iron ball on a chain (the ball is drawn by the enemy).
  chainling: {
    w: 22, h: 26, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 11, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 20, step, GHOUL[1]);
      g.rect(cx - 5, 23, 11, 1, IRON[3]);                          // leg shackles and their chain
      g.poly([[cx - 6, 10], [cx + 6, 10], [cx + 5, 21], [cx - 5, 21]], (x, y) => ramp(LEATHER, 0.8 - (y - 10) / 16, x, y));
      g.ellipse(cx, 7, 5, 5, shade(GHOUL));
      g.rect(cx - 6, 11, 12, 2, IRON[3]);                          // iron collar
      g.set(cx - 4, 11, IRON[5]); g.set(cx + 3, 11, IRON[5]);
      const up = o.state === 'wind';
      g.line(cx + 5, 12, cx + 9, up ? 4 : 16, GHOUL[2]);
      g.ellipse(cx + 9, up ? 4 : 16, 1.5, 1.5, GHOUL[3]);
      if (o.dir === 'up') return;
      eyes(g, cx, 6, o, { gap: 2, size: 0, white: '#d8e070' });
      g.rect(cx - 2, 9, 5, 1, '#1a1210');
    },
  },

  // Gargoyle: a stone statue. When you line up with it, its eyes and cracks light up and it
  // flies at you, then lands and turns back to stone.
  gargoyle: {
    w: 28, h: 24, frames: { idle: 1, wind: 2, attack: 2, stun: 2 },
    paint(g, o) {
      const cx = 14, fly = o.state === 'attack', stone = o.state === 'idle';
      const body = stone ? STONE : ['#2a2c32', '#3e4048', '#565a64', '#727680', '#9296a0'];
      for (const s of [-1, 1]) {
        if (fly) g.poly([[cx + s * 4, 8], [cx + s * 14, 2 + (o.f % 2) * 4], [cx + s * 13, 13], [cx + s * 6, 13]], (x, y) => ramp(body, 0.5 - Math.abs(x - cx) / 40, x, y));
        else g.poly([[cx + s * 4, 7], [cx + s * 9, 1], [cx + s * 10, 12], [cx + s * 6, 16]], (x, y) => ramp(body, 0.45, x, y));
      }
      g.ellipse(cx, 14, 6, 7, shade(body));
      g.ellipse(cx, 6, 5, 4.5, shade(body, 0.1));
      g.set(cx - 4, 1, body[3]); g.set(cx + 4, 1, body[3]); g.set(cx - 4, 2, body[2]); g.set(cx + 4, 2, body[2]);   // horns
      if (!fly) { g.rect(cx - 6, 19, 4, 3, body[1]); g.rect(cx + 3, 19, 4, 3, body[1]); }
      if (o.state === 'wind') for (const [x0, y0, x1, y1] of [[cx - 3, 10, cx - 1, 16], [cx + 2, 9, cx + 4, 15]]) g.line(x0, y0, x1, y1, GLOW[o.f % 2]);
      if (o.dir === 'up') return;
      const e = stone ? STONE[1] : o.state === 'stun' ? '#ffffff' : eyeGlow(o, '#ff7a2a');
      g.rect(cx - 3, 5, 2, 2, e); g.rect(cx + 2, 5, 2, 2, e);
      g.rect(cx - 2, 8, 5, 1, '#0e0c0c');
      if (o.state === 'stun') stars(g, cx, 0, o.f);
    },
  },

  // Brute: a hulking jailer. Raises both fists, pounds the floor: shockwaves go out in a cross.
  brute: {
    w: 30, h: 32, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 15, step = o.state === 'move' ? o.f % 4 : 0, up = o.state === 'wind', down = o.state === 'attack';
      legs(g, cx, 25, step, LEATHER[2], 4, 6);
      g.ellipse(cx, 18, 11, 10, shade(HIDE));
      g.rect(cx - 9, 19, 18, 3, LEATHER[2]);                      // belt
      g.rect(cx - 1, 19, 3, 3, IRON[4]);
      g.ellipse(cx, 8, 6, 5.5, shade(HIDE, 0.1));
      g.rect(cx - 6, 3, 12, 3, LEATHER[1]);                       // hood
      for (const s of [-1, 1]) {
        const fx = cx + s * 12, fy = up ? 2 : down ? 27 : 17;
        g.line(cx + s * 9, 13, fx, fy, HIDE[2]);
        g.line(cx + s * 9, 14, fx, fy + 1, HIDE[1]);
        g.ellipse(fx, fy, 3.5, 3.5, shade(HIDE, 0.1));
        g.rect(fx - 3, fy + 1, 7, 1, IRON[3]);                    // knuckle irons
      }
      if (o.dir === 'up') return;
      eyes(g, cx, 7, o, { gap: 2, size: 0, white: '#e0c870' });
      g.rect(cx - 3, 11, 7, 1, '#2a1410');
    },
  },

  // Hookjaw: a ghoul with a hook on a chain. Throws it; if it catches you, it reels you in.
  hookjaw: {
    w: 22, h: 26, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 11, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 20, step, LEATHER[1]);
      g.poly([[cx - 5, 10], [cx + 5, 10], [cx + 6, 21], [cx - 6, 21]], (x, y) => ramp(IRON, 0.6 - (y - 10) / 20, x, y));
      g.ellipse(cx, 7, 5, 5, shade(GHOUL, -0.05));
      // the jaw: an iron hook bolted where the lower jaw was
      if (o.dir !== 'up') { g.line(cx - 3, 10, cx + 3, 10, IRON[4]); g.line(cx + 3, 10, cx + 3, 13, IRON[5]); g.set(cx + 2, 13, IRON[5]); }
      const reel = o.state === 'attack', up = o.state === 'wind';
      g.line(cx + 5, 12, cx + 9, up ? 6 : reel ? 12 : 16, GHOUL[2]);
      if (!reel) { g.line(cx + 9, up ? 6 : 16, cx + 9, up ? 2 : 20, IRON[4]); g.line(cx + 9, up ? 2 : 20, cx + 7, up ? 0 : 22, IRON[5]); }
      if (o.dir === 'up') return;
      eyes(g, cx, 6, o, { gap: 2, size: 0, white: '#d8e070' });
    },
  },

  // Sentry Eye: a huge floating eye in an iron frame. Its pupil narrows and a thin red line
  // shows where it's looking, then it burns a beam along that line.
  sentryeye: {
    w: 24, h: 24, dirs: false, frames: { idle: 2, wind: 2, attack: 2 },
    paint(g, o) {
      const cx = 12, cy = 12;
      for (const [x, y] of [[cx - 11, cy], [cx + 11, cy], [cx, cy - 11], [cx, cy + 11]]) g.line(cx, cy, x, y, IRON[3]);
      g.ellipse(cx, cy, 10, 10, IRON[2]);
      g.ellipse(cx, cy, 8.5, 8.5, shade(['#8a7a74', '#b8a8a0', '#d8ccc4', '#ece4dc', '#fffaf4']));
      for (const [x0, y0, x1, y1] of [[cx - 7, cy - 2, cx - 4, cy - 1], [cx + 6, cy + 3, cx + 3, cy + 2], [cx - 2, cy + 7, cx - 1, cy + 4]]) g.line(x0, y0, x1, y1, '#b43a3a');
      const hot = o.state !== 'idle';
      g.ellipse(cx, cy, 4.5, 4.5, hot ? '#c01a1a' : '#5a3a7a');
      g.ellipse(cx, cy, o.state === 'attack' ? 1 : hot ? 2 : 2.5, o.state === 'attack' ? 3 : hot ? 2.5 : 2.5, '#0a0606');
      g.set(cx - 2, cy - 2, '#ffffff');
      if (o.state === 'wind') g.set(cx, cy, GLOW[o.f % 2]);
    },
  },

  // Ironclad: a small knight behind a big shield (shots from the front clink off). Sets its
  // spear, then lunges.
  ironclad: {
    w: 24, h: 26, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 11, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 20, step, IRON[2]);
      g.ellipse(cx, 15, 6, 7, shade(IRON));
      g.ellipse(cx, 7, 5, 5, shade(IRON, 0.1));
      g.rect(cx - 4, 6, 9, 1, '#0a0a0c');                         // visor slit
      if (o.state === 'wind') g.rect(cx - 2, 6, 5, 1, GLOW[o.f % 2]);
      g.set(cx, 1, '#a02020'); g.set(cx, 2, '#a02020'); g.set(cx + 1, 1, '#c03030');   // plume
      const lunge = o.state === 'attack', set = o.state === 'wind';
      // spear
      if (o.dir === 'side') g.line(cx - 2, 14, cx + (lunge ? 13 : set ? 6 : 9), 14 - (set ? 0 : 3), WOOD[2]);
      else g.line(cx + 6, lunge ? 22 : 18, cx + 6, set ? 6 : 2, WOOD[2]);
      // shield in front
      if (o.dir === 'down') g.poly([[cx - 6, 10], [cx + 2, 10], [cx + 2, 19], [cx - 2, 22], [cx - 6, 19]], (x, y) => ramp(IRON, 0.8 - (y - 10) / 20, x, y));
      else if (o.dir === 'side') g.rect(cx + 4, 9, 3, 12, IRON[4]);
      if (o.dir === 'down') { g.line(cx - 4, 12, cx, 12, '#a02020'); g.line(cx - 2, 11, cx - 2, 18, '#a02020'); }
    },
  },

  // The Jailer (miniboss): a giant jailer with a ball and chain and a ring of keys.
  jailer: {
    w: 38, h: 40, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 19, step = o.state === 'move' ? o.f % 4 : 0, up = o.state === 'wind';
      legs(g, cx, 31, step, LEATHER[2], 6, 8);
      g.ellipse(cx, 22, 15, 12, shade(HIDE));
      g.poly([[cx - 12, 18], [cx + 12, 18], [cx + 10, 32], [cx - 10, 32]], (x, y) => ramp(LEATHER, 0.8 - (y - 18) / 20, x, y));   // apron
      g.ellipse(cx - 6, 30, 3, 3, GOLD[3]); g.ellipse(cx - 6, 30, 1.5, 1.5, LEATHER[1]);   // key ring
      g.line(cx - 6, 32, cx - 6, 35, GOLD[2]);
      g.ellipse(cx, 9, 8, 7, shade(HIDE, 0.1));
      g.rect(cx - 8, 3, 16, 4, LEATHER[1]);
      for (const s of [-1, 1]) {
        const fy = up ? 4 : 22;
        g.line(cx + s * 13, 16, cx + s * 17, fy, HIDE[2]);
        g.ellipse(cx + s * 17, fy, 3.5, 3.5, shade(HIDE, 0.1));
      }
      if (o.dir === 'up') return;
      eyes(g, cx, 8, o, { gap: 3, size: 1, white: '#e0c870' });
      g.rect(cx - 4, 13, 9, 1, '#2a1410');
    },
  },

  // ===================================================================== The Wax Tombs
  // Shroudling: a body wrapped in waxed linen, shuffling. Hurt it enough and it tears its
  // wrappings off and runs (shroudlingRage).
  shroudling: {
    w: 20, h: 26, frames: { idle: 2, move: 4, wind: 2 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 20, step, WRAP[1], 2);
      g.ellipse(cx, 14, 6, 8, shade(WRAP));
      g.ellipse(cx, 6, 5, 5, shade(WRAP, 0.1));
      for (let y = 2; y < 24; y += 3) g.line(cx - 6, y, cx + 5, y + 1, WRAP[1]);
      g.line(cx + 5, 12, cx + 9, 14 + (o.f % 2), WRAP[2]); g.line(cx - 5, 12, cx - 9, 14 + ((o.f + 1) % 2), WRAP[2]);   // arms out
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#b48ae8');
      g.set(cx - 2, 6, e); g.set(cx + 2, 6, e);
    },
  },
  shroudlingRage: {
    w: 20, h: 26, frames: { idle: 2, move: 4, wind: 2 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 20, step, '#5a4a5a', 2);
      g.ellipse(cx, 14, 5, 7, shade(['#3a2a3a', '#544054', '#6e5670', '#8a7090', '#a88aae']));
      g.ellipse(cx, 6, 4.5, 5, shade(['#3a2a3a', '#544054', '#6e5670', '#8a7090', '#a88aae'], 0.1));
      // torn strips flapping behind
      for (let i = 0; i < 4; i++) g.line(cx - 4 + i * 3, 10 + i * 2, cx - 8 + i * 3 + (o.f % 2) * 2, 14 + i * 3, WRAP[2]);
      if (o.dir === 'up') return;
      const e = o.state === 'wind' ? GLOW[o.f % 2] : '#ecdcff';
      g.rect(cx - 3, 5, 2, 2, e); g.rect(cx + 2, 5, 2, 2, e);
      g.ellipse(cx, 9, 2, 1.5, '#140810');
    },
  },

  // Mourner: a marble statue of a weeping woman come alive. Covers her face and cries a ring of
  // tears.
  mourner: {
    w: 20, h: 28, frames: { idle: 2, move: 4, wind: 2 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 4 : 0;
      g.poly([[cx - 4, 8], [cx + 4, 8], [cx + 7, 26 - (step % 2)], [cx - 7, 26 - ((step + 1) % 2)]], (x, y) => ramp(MARBLE, 0.8 - Math.abs(x - cx) / 14 - (y - 8) / 50, x, y));
      for (const x of [-4, -1, 2, 5]) g.line(cx + x, 12, cx + x - 1, 25, MARBLE[1]);
      g.ellipse(cx, 5, 4, 4.5, shade(MARBLE, 0.1));
      g.poly([[cx - 5, 2], [cx + 5, 2], [cx + 6, 12], [cx - 6, 12]], (x, y) => ramp(MARBLE, 0.4, x, y));   // veil
      const cry = o.state === 'wind';
      if (cry) { g.rect(cx - 3, 5, 7, 3, MARBLE[3]); g.set(cx - 2, 9, '#7ac4f0'); g.set(cx + 2, 10, '#7ac4f0'); }
      else if (o.dir !== 'up') { g.set(cx - 2, 5, '#3a364a'); g.set(cx + 2, 5, '#3a364a'); g.set(cx - 2, 7, '#7ac4f0'); }
    },
  },

  // Candlewight: a waxy corpse with a violet candle burning on its head; strafes and flicks
  // violet flames.
  candlewight: {
    w: 20, h: 30, frames: { idle: 2, move: 4, wind: 2 },
    paint(g, o) {
      const cx = 10, step = o.state === 'move' ? o.f % 4 : 0;
      legs(g, cx, 24, step, WRAP[1], 2);
      g.ellipse(cx, 18, 6, 7, shade(WRAP, -0.1));
      g.ellipse(cx, 10, 5, 5, shade(WRAP));
      g.rect(cx - 2, 2, 5, 5, '#e8dcc0'); g.set(cx - 2, 7, '#e8dcc0'); g.set(cx + 2, 8, '#e8dcc0');   // candle and drips
      const big = o.state === 'wind' ? 1.4 : 1;
      const h = Math.round((4 + (o.f % 2)) * big);
      g.ellipse(cx, 1 - h / 2 + 1, 2 * big, h / 2, VIOLET[2]);
      g.ellipse(cx, 1 - h / 4 + 1, big, h / 4, VIOLET[4]);
      if (o.dir === 'up') return;
      const e = eyeGlow(o, '#b48ae8');
      g.set(cx - 2, 10, e); g.set(cx + 2, 10, e);
      g.rect(cx - 1, 13, 3, 1, '#2a1e18');
    },
  },

  // Tomb Hand: lives under the floor. Cracks creep after you, glow, and a huge hand bursts up.
  tombhand: {
    w: 22, h: 24, dirs: false, frames: { hidden: 1, wind: 2, attack: 2 },
    paint(g, o) {
      const cx = 11;
      if (o.state !== 'attack') {
        const glow = o.state === 'wind';
        const col = glow ? VIOLET[3 + (o.f % 2)] : '#100c10';
        for (const [x0, y0, x1, y1] of [[cx - 8, 20, cx - 2, 18], [cx - 2, 18, cx + 3, 21], [cx + 3, 21, cx + 9, 19], [cx - 1, 18, cx, 22]]) g.line(x0, y0, x1, y1, col);
        return;
      }
      g.ellipse(cx, 21, 9, 3, '#1a1418');
      g.rect(cx - 4, 12, 9, 10, WRAP[2]);
      g.ellipse(cx, 11, 5.5, 5, shade(WRAP));
      const curl = o.f % 2;
      for (let i = 0; i < 4; i++) { const x = cx - 4 + i * 3; g.line(x, 8, x - 1 + curl, 2 + (i === 0 || i === 3 ? 2 : 0), WRAP[3]); g.set(x - 1 + curl, 2 + (i === 0 || i === 3 ? 2 : 0), '#3a2a2a'); }
      g.line(cx + 5, 12, cx + 9, 8, WRAP[3]);
    },
  },

  // Reliquary: a golden box of relics; it creaks open and lets out soul moths.
  reliquary: {
    w: 22, h: 22, dirs: false, frames: { idle: 2, wind: 2 },
    paint(g, o) {
      const cx = 11, open = o.state === 'wind';
      g.rect(cx - 9, 10, 18, 10, GOLD[2]);
      g.rect(cx - 9, 10, 18, 2, GOLD[3]); g.rect(cx - 9, 18, 18, 2, GOLD[1]);
      for (const x of [-6, 0, 6]) g.rect(cx + x - 1, 13, 2, 3, VIOLET[2 + (o.f % 2)]);
      const lid = open ? 4 : 8;
      g.poly([[cx - 10, lid + 2], [cx + 10, lid + 2], [cx + 7, lid - 3], [cx - 7, lid - 3]], (x, y) => ramp(GOLD, 0.7, x, y));
      g.rect(cx - 1, lid - 6, 3, 4, GOLD[4]); g.rect(cx - 2, lid - 5, 5, 1, GOLD[4]);
      if (open) { g.rect(cx - 8, lid + 3, 16, 10 - lid + 1, VIOLET[3]); g.set(cx - 3, lid + 4, VIOLET[4]); g.set(cx + 4, lid + 5, VIOLET[4]); }
    },
  },

  // Soul Moth: a little glowing violet moth.
  soulmoth: {
    w: 14, h: 10, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 7, cy = 5, up = o.f % 2;
      for (const s of [-1, 1]) g.ellipse(cx + s * 3.5, cy - (up ? 1 : -1), 3, up ? 3.5 : 2.5, VIOLET[3]);
      g.ellipse(cx, cy, 1.5, 3, VIOLET[4]);
      if (o.dir !== 'up') { g.set(cx - 1, cy - 2, '#ffffff'); g.set(cx + 1, cy - 2, '#ffffff'); }
    },
  },

  // Pallbearer: a hunched ghoul carrying a coffin over its head; charges with it.
  pallbearer: {
    w: 28, h: 30, frames: { idle: 2, move: 4, wind: 2, attack: 2, stun: 2 },
    paint(g, o) {
      const cx = 14, step = o.state === 'move' || o.state === 'attack' ? o.f % 4 : 0;
      legs(g, cx, 24, step, LEATHER[2], 3, 5);
      g.ellipse(cx, 18, 7, 7, shade(GHOUL, -0.05));
      g.ellipse(cx, 12, 4.5, 4, shade(GHOUL));
      // the coffin held over its head
      const tilt = o.state === 'wind' ? 2 : 0;
      g.poly([[cx - 13, 4 + tilt], [cx + 13, 4 - tilt], [cx + 12, 9 - tilt], [cx - 12, 9 + tilt]], (x, y) => ramp(WOOD, 0.7 - (y - 4) / 10, x, y));
      g.line(cx - 4, 6, cx + 4, 6, GOLD[2]); g.line(cx, 5, cx, 7, GOLD[2]);
      g.line(cx - 6, 14, cx - 9, 8, GHOUL[2]); g.line(cx + 6, 14, cx + 9, 8, GHOUL[2]);
      if (o.dir === 'up') return;
      const e = o.state === 'stun' ? '#ffffff' : eyeGlow(o, '#d8e070');
      g.set(cx - 2, 12, e); g.set(cx + 2, 12, e);
      if (o.state === 'stun') stars(g, cx, 1, o.f);
    },
  },

  // The Embalmer (miniboss): a tall gaunt figure in a stained apron with long needles for fingers.
  embalmer: {
    w: 30, h: 40, frames: { idle: 2, move: 4, wind: 2, attack: 1, air: 1, summon: 2 },
    paint(g, o) {
      const cx = 15, step = o.state === 'move' ? o.f % 4 : 0;
      if (o.state !== 'air') { g.rect(cx - 4, 32, 3, 7 - (step === 1 ? 1 : 0), LEATHER[1]); g.rect(cx + 2, 32, 3, 7 - (step === 3 ? 1 : 0), LEATHER[1]); }
      g.poly([[cx - 7, 12], [cx + 7, 12], [cx + 9, 34], [cx - 9, 34]], (x, y) => ramp(['#2a2430', '#3e3646', '#56505e', '#706a78'], 0.8 - (y - 12) / 30, x, y));
      g.poly([[cx - 5, 16], [cx + 5, 16], [cx + 6, 32], [cx - 6, 32]], (x, y) => ramp(WRAP, 0.6 - (y - 16) / 30, x, y));   // apron
      for (const [x, y] of [[-2, 20], [2, 24], [-3, 27], [1, 29]]) g.set(cx + x, y, '#5a2a3a');
      g.ellipse(cx, 7, 5, 6, shade(MARBLE, 0.05));
      g.rect(cx - 6, 1, 12, 3, '#1a141e');
      const up = o.state === 'wind' || o.state === 'summon';
      for (const s of [-1, 1]) {
        const hx = cx + s * 11, hy = up ? 6 : 22;
        g.line(cx + s * 7, 14, hx, hy, '#3e3646');
        for (let i = -1; i <= 1; i++) g.line(hx, hy, hx + s * 2 + i, hy + (up ? -6 : 6), '#c8ccd8');   // needle fingers
      }
      if (o.dir === 'up') return;
      const e = o.state === 'summon' ? VIOLET[4] : eyeGlow(o, '#b48ae8');
      g.set(cx - 2, 7, e); g.set(cx + 2, 7, e);
      g.rect(cx - 2, 10, 5, 1, '#1a141e');
    },
  },

  // ===================================================================== The Mire
  // Tarling: a little blob of black tar; leaves a sticky trail.
  tarling: {
    w: 14, h: 12, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 7, sq = o.f % 2;
      g.ellipse(cx, 7 + sq * 0.5, 6 + sq * 0.5, 4.5 - sq * 0.5, shade(TARC, 0.1));
      g.set(cx - 2, 4, '#8a7aa0'); g.set(cx - 3, 5, '#5e5070');
      if (o.dir === 'up') return;
      g.set(cx - 2, 6, '#e0d080'); g.set(cx + 2, 6, '#e0d080');
    },
  },

  // Gulper: a fat bog toad. Its throat swells, the line shows, then its tongue lashes out.
  gulper: {
    w: 26, h: 20, frames: { idle: 2, move: 2, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 13, cy = 12, swell = o.state === 'wind' ? 1 + (o.f % 2) : 0;
      g.ellipse(cx - 9, cy + 5, 4, 2.5, BOG[1]); g.ellipse(cx + 9, cy + 5, 4, 2.5, BOG[1]);
      g.ellipse(cx, cy, 11, 7, shade(BOG));
      for (const [x, y] of [[-6, -3], [4, -4], [7, 1], [-3, 2]]) g.set(cx + x, cy + y, BOG[4]);
      if (o.dir === 'up') return;
      g.ellipse(cx, cy + 3, 6 + swell, 3 + swell, ROT[3]);
      g.ellipse(cx - 5, cy - 6, 2.5, 2.5, BOG[3]); g.ellipse(cx + 5, cy - 6, 2.5, 2.5, BOG[3]);
      const e = eyeGlow(o, '#e0d040');
      g.set(cx - 5, cy - 6, e); g.set(cx + 5, cy - 6, e);
      if (o.state === 'attack') g.ellipse(cx, cy + 1, 3, 2, '#5a1a2a');
    },
  },

  // Oozer: a black slug; rears up and spits a glob of tar that leaves a puddle.
  oozer: {
    w: 24, h: 16, frames: { idle: 2, move: 4, wind: 2 },
    paint(g, o) {
      const cx = 12, cy = 10, up = o.state === 'wind';
      const stretch = o.state === 'move' ? (o.f % 2) : 0;
      if (o.dir === 'side') {
        g.ellipse(cx - 1, cy + 2, 10 + stretch, 4, shade(TARC, 0.1));
        g.ellipse(cx + 7, cy - (up ? 4 : 1), 4, 4, shade(TARC, 0.15));
        g.line(cx + 8, cy - 4 - (up ? 3 : 0), cx + 10, cy - 8 - (up ? 3 : 0), TARC[3]);
        g.set(cx + 10, cy - 8 - (up ? 3 : 0), up ? GLOW[o.f % 2] : '#e0d080');
      } else {
        g.ellipse(cx, cy + 2, 7, 5 + stretch, shade(TARC, 0.1));
        g.ellipse(cx, cy - (up ? 4 : 2), 5, 4, shade(TARC, 0.15));
        for (const s of [-1, 1]) { g.line(cx + s * 2, cy - 4, cx + s * 4, cy - 9 - (up ? 2 : 0), TARC[3]); if (o.dir !== 'up') g.set(cx + s * 4, cy - 9 - (up ? 2 : 0), up ? GLOW[o.f % 2] : '#e0d080'); }
      }
      g.set(cx - 3, cy, '#7a6a90');
    },
  },

  // Bloatfly: a big swollen fly; pops into a puddle of poison and two tarlings.
  bloatfly: {
    w: 20, h: 18, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 10, cy = 10, up = o.f % 2;
      for (const s of [-1, 1]) g.ellipse(cx + s * 6, cy - 4 - up, 4, 2.5, 'rgba(200,220,200,0.6)');
      g.ellipse(cx, cy + 1, 7, 6, shade(ROT));
      for (const [x, y] of [[-3, 0], [2, 3], [4, -2]]) g.set(cx + x, cy + y, SLIME[3]);
      g.line(cx - 6, cy + 1, cx + 6, cy + 1, ROT[1]);
      if (o.dir === 'up') return;
      g.ellipse(cx - 3, cy - 4, 2, 2, '#8a1a1a'); g.ellipse(cx + 3, cy - 4, 2, 2, '#8a1a1a');
    },
  },

  // Rotgut: a swollen bog corpse; heaves and vomits a fan of bile.
  rotgut: {
    w: 24, h: 28, frames: { idle: 2, move: 4, wind: 2, attack: 1 },
    paint(g, o) {
      const cx = 12, step = o.state === 'move' ? o.f % 4 : 0, heave = o.state === 'wind';
      legs(g, cx, 22, step, BOG[1], 3);
      g.ellipse(cx, 16 + (heave ? 1 : 0), 9 + (heave ? 1 : 0), 8, shade(ROT, -0.05));
      g.line(cx - 6, 16, cx + 6, 19, BOG[1]);
      g.ellipse(cx, 6 + (heave ? 2 : 0), 5, 5, shade(ROT, 0.05));
      g.line(cx - 8, 13, cx - 11, 20, ROT[2]); g.line(cx + 8, 13, cx + 11, 20, ROT[2]);
      if (o.dir === 'up') return;
      eyes(g, cx, 5 + (heave ? 2 : 0), o, { gap: 2, size: 0, white: '#e0e0a0' });
      if (o.state === 'attack' || heave) g.ellipse(cx, 9 + (heave ? 2 : 0), 2.5, 2, '#2a3a10');
    },
  },

  // Murkworm: a long black worm swimming through the muck (head + murksegs).
  murkworm: {
    w: 16, h: 14, frames: { idle: 2, move: 2 },
    paint(g, o) {
      const cx = 8, cy = 7;
      g.ellipse(cx, cy, 6.5, 5.5, shade(TARC, 0.15));
      for (const s of [-1, 1]) g.line(cx + s * 3, cy + 3, cx + s * 4, cy + 6 + (o.f % 2), '#d8d0c0');   // mandibles
      if (o.dir === 'up') return;
      g.set(cx - 2, cy - 1, '#c0e040'); g.set(cx + 2, cy - 1, '#c0e040');
    },
  },
  murkseg: {
    w: 14, h: 12, dirs: false, frames: { idle: 2 },
    paint(g, o) {
      g.ellipse(7, 6, 5.5, 4.5 + (o.f % 2) * 0.3, shade(TARC, 0.05));
      g.set(5, 3, TARC[4]); g.line(3, 7, 11, 7, TARC[0]);
    },
  },

  // The Bog Mother (miniboss): a huge mound of tar with a mouth and too many eyes.
  bogmother: {
    w: 42, h: 32, frames: { idle: 2, move: 2, wind: 2, air: 1, summon: 2 },
    paint(g, o) {
      const cx = 21, cy = 18, swell = o.state === 'summon' ? 2 : 0;
      g.ellipse(cx, cy + 2, 19 + swell, 13 + swell, shade(TARC, 0.1));
      for (const [x, y] of [[-12, -4], [-6, -9], [5, -10], [12, -5], [0, -6]]) {
        g.ellipse(cx + x, cy + y, 2.5, 2.5, '#e8e0a0');
        g.set(cx + x, cy + y, o.state === 'wind' ? GLOW[o.f % 2] : '#1a1408');
      }
      for (const [x, y] of [[-15, 4], [14, 6], [-4, 12]]) g.ellipse(cx + x, cy + y, 2, 1.5, TARC[4]);   // bubbles
      if (o.dir === 'up') return;
      const open = o.state === 'wind' || o.state === 'summon';
      g.ellipse(cx, cy + 4, open ? 7 : 6, open ? 4 : 1.5, '#2a0a14');
      if (open) for (let i = -2; i <= 2; i++) g.set(cx + i * 2, cy + 1, '#d8d0c0');
    },
  },
});
