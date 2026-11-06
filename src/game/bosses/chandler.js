// THE CHANDLER (chapter 3, floor 2 only): the giant who made the candles. She's far too big for
// the room: only her hands, her arm and her eye ever reach in. Hit whatever part of her is in
// the room (one health bar). Every attack has a tell:
//   hand    her hand's shadow slides after you (1 s), stops and flashes red (0.55 s), then the
//           hand slams down there (a ring of hot wax) and stays a moment before lifting
//   eye     a huge eye opens in one of the doorways (0.6 s), then stares and fires fans at you
//   arm     a doorway glows and the strip in front of it is marked (0.9 s), then her arm thrusts
//           straight in across the room, stays, and pulls back
//   pour    she tips a ladle of hot wax from above: blobs land on marked spots and burst
//   call    something is pushed in through the doors (two of the chapter's creatures)
//   hands   (phase 2) both hands, one after the other
import { PixelGrid, ramp, light } from '../../engine/pixelgrid.js';
import { makeShadow } from '../../engine/sprites.js';
import { sfx } from '../../engine/audio.js';
import { Boss, TAU } from './base.js';

const SKIN = ['#6a5446', '#8a6e5a', '#a88a72', '#c4a88c', '#dcc4a8', '#f0dcc4'];
const SLEEVE = ['#1e1426', '#2e2038', '#40304e', '#544064'];

function makeHand(open) {
  const W = 48, H = 40, cx = 24;
  const g = new PixelGrid(W, H);
  // the back of a huge hand seen from above, fingers spread (or curled into a fist)
  g.ellipse(cx, 24, 15, 12, (nx, ny, x, y) => ramp(SKIN, light(nx, ny) + 0.1, x, y));
  const fingers = open ? [[-14, 10, -18, 2], [-6, 8, -7, 0], [2, 8, 3, 0], [10, 10, 13, 2]] : [[-10, 14, -11, 10], [-3, 13, -3, 9], [4, 13, 4, 9], [11, 14, 12, 10]];
  for (const [x0, y0, x1, y1] of fingers) {
    for (let i = -2; i <= 2; i++) g.line(cx + x0 + i, y0 + 4, cx + x1 + i, y1, SKIN[2 + (i === -1 ? 1 : 0)]);
    g.rect(cx + x1 - 1, y1, 3, 2, SKIN[5]);                  // nails
  }
  g.line(cx + 14, 26, cx + 22, 18, SKIN[2]); g.line(cx + 15, 27, cx + 23, 19, SKIN[3]);   // thumb
  for (const [x, y] of [[-5, 22], [3, 26], [-1, 30]]) g.set(cx + x, y, SKIN[0]);           // wax burns
  g.rect(cx - 12, 35, 24, 4, SLEEVE[2]);                    // cuff
  return g.outline('#140c0a').toCanvas();
}

function makeEye(open, look) {
  const W = 46, H = 28, cx = 23, cy = 14;
  const g = new PixelGrid(W, H);
  g.ellipse(cx, cy, 22, 13, SKIN[1]);
  if (open > 0) {
    g.ellipse(cx, cy, 18, 9 * open, (nx, ny, x, y) => ramp(['#a89a8a', '#d8ccbc', '#f4ecdc'], light(nx, ny) + 0.3, x, y));
    for (const [x0, y0, x1, y1] of [[-16, -2, -9, -1], [14, 3, 8, 2], [-12, 5, -7, 3]]) g.line(cx + x0, cy + y0, cx + x1, cy + y1, '#c03a3a');
    g.ellipse(cx + look, cy, 7, Math.min(7, 9 * open), '#5a2a6a');
    g.ellipse(cx + look, cy, 3, Math.min(4, 9 * open), '#0a0408');
    g.set(cx + look - 2, cy - 2, '#ffffff');
  } else g.line(cx - 18, cy, cx + 18, cy, SKIN[0]);
  for (let i = -3; i <= 3; i++) g.line(cx + i * 5, cy - 9 - Math.abs(i) * 0.3, cx + i * 6, cy - 13, '#2a1a14');   // lashes
  return g.outline('#140c0a').toCanvas();
}

let ART = null;
function art() {
  ART ??= {
    hand: makeHand(true),
    fist: makeHand(false),
    eye: [0, 0.4, 1].map((k) => makeEye(k, 0)),
    eyeL: makeEye(1, -6), eyeR: makeEye(1, 6),
    shadow: makeShadow(44, 16, 0.55),
  };
  return ART;
}

const DIR = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] };   // into the room from that door

export class ChandlerBoss extends Boss {
  constructor(...args) {
    super(...args);
    this.def.debris = ['#c4a88c', '#f0dcc4', '#544064', '#6a5446'];
    this.def.glowColor = 'rgba(255,170,90,0.45)';
    this.hands = [];
    this.eye = null;
    this.arm = null;
  }

  frames() { return [art().eye[2]]; }
  portrait() { return art().eye[2]; }

  // the parts of her that are in the room right now
  hitCircles() {
    if (this.dead || this.dying || this.state === 'intro' || this.state === 'enrage') return [];
    const out = [];
    for (const h of this.hands) if (h.state === 'down') out.push({ x: h.x, y: h.y - 8, r: 18 });
    if (this.eye && this.eye.open > 0.5) out.push({ x: this.eye.x, y: this.eye.y, r: 15 });
    const a = this.arm;
    if (a && (a.state === 'hold' || a.state === 'thrust')) for (let k = 0.3; k <= 1.01; k += 0.35) out.push({ x: a.x0 + a.dx * a.len * k, y: a.y0 + a.dy * a.len * k, r: 12 });
    return out;
  }

  get hittable() { return this.hitCircles().length > 0; }
  get harmful() { return false; }   // her parts hurt on their own terms (see update)

  update(dt, g) {
    super.update(dt, g);
    const room = g.room, p = g.player;
    this.x = room.centerX; this.y = room.y0 + 30;
    // hands
    for (const h of this.hands) {
      h.t += dt;
      if (h.delay > 0) { h.delay -= dt; h.t = 0; continue; }
      if (h.state === 'track') {
        const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy), step = Math.min(d, 140 * dt);
        if (d > 0.5) { h.x += (dx / d) * step; h.y += (dy / d) * step; }
        h.x = Math.max(room.x0 + 20, Math.min(room.R - 20, h.x));
        h.y = Math.max(room.y0 + 20, Math.min(room.B - 14, h.y));
        h.lift = 150;
        if (h.t >= h.track) { h.state = 'lock'; h.t = 0; sfx('charge'); }
      } else if (h.state === 'lock') {
        if (h.t >= 0.55) { h.state = 'fall'; h.t = 0; }
      } else if (h.state === 'fall') {
        h.lift = 150 * (1 - Math.min(1, h.t / 0.2));
        if (h.t >= 0.2) {
          h.state = 'down'; h.t = 0; h.lift = 0;
          g.shake(8); sfx('slam');
          g.effects.ring(h.x, h.y, 44, 'rgba(240,220,190,0.8)', 0.4, 8);
          g.particles.burst(h.x, h.y + 4, 18, { colors: ['#4a3e32', '#2e241d', '#c4a88c'], speed: 90, z: 2, vz: 60 });
          if (!p.dead && Math.hypot(p.x - h.x, p.y - h.y) < 22 + p.r) p.hurt(2, this.name, g, h.x, h.y);
          const n = 10 + this.tier * 2, off = Math.random() * TAU;
          for (let i = 0; i < n; i++) g.enemyShoot({ x: h.x, y: h.y, r: 16, z: 6, def: { name: this.name } }, off + (i / n) * TAU, 62, 'ember');
        }
      } else if (h.state === 'down') {
        if (h.t >= h.stay) { h.state = 'lift'; h.t = 0; }
      } else if (h.state === 'lift') {
        h.lift = 150 * Math.min(1, h.t / 0.4);
        if (h.t >= 0.4) h.done = true;
      }
    }
    this.hands = this.hands.filter((h) => !h.done);
    // the arm
    const a = this.arm;
    if (a) {
      a.t += dt;
      if (a.state === 'warn' && a.t >= 0.9) { a.state = 'thrust'; a.t = 0; sfx('dash'); }
      else if (a.state === 'thrust') { a.len = a.reach * Math.min(1, a.t / 0.2); if (a.t >= 0.2) { a.state = 'hold'; a.t = 0; g.shake(4); } }
      else if (a.state === 'hold' && a.t >= 1) { a.state = 'pull'; a.t = 0; }
      else if (a.state === 'pull') { a.len = a.reach * (1 - Math.min(1, a.t / 0.45)); if (a.t >= 0.45) this.arm = null; }
      if (this.arm && (a.state === 'thrust' || a.state === 'hold') && !p.dead) {
        const along = (p.x - a.x0) * a.dx + (p.y - a.y0) * a.dy, across = Math.abs((p.x - a.x0) * a.dy - (p.y - a.y0) * a.dx);
        if (along > 0 && along < a.len && across < 13 + p.r) p.hurt(1, this.name, g, p.x, p.y);
      }
    }
    // the eye
    const e = this.eye;
    if (e) {
      e.t += dt;
      e.open = e.t < 0.6 ? e.t / 0.6 : e.t > e.dur - 0.4 ? Math.max(0, (e.dur - e.t) / 0.4) : 1;
      if (e.t >= e.dur) this.eye = null;
    }
    if (this.dying) { this.hands.length = 0; this.arm = null; }
  }

  // a doorway (any of the room's edge slots) for the eye or arm, preferably not the one the
  // player is standing next to
  pickSlot(g) {
    const p = g.player, slots = g.room.slots.filter((s) => Math.hypot(s.x - p.x, s.y - p.y) > 70);
    const list = slots.length ? slots : g.room.slots;
    return list[Math.floor(Math.random() * list.length)];
  }

  slam(n, gap = 0.5) {
    for (let i = 0; i < n; i++) this.hands.push({ x: this.x + (i ? 60 : -60), y: this.y + 60, t: 0, state: 'track', lift: 150, track: 1, stay: this.phase >= 2 ? 1 : 1.4, delay: i * gap });
  }

  attacks() {
    const p2 = this.phase >= 2, t = this.tier;
    const waitFor = (cond, extra = 0.3) => {
      let after = 0;
      return { update: (dt) => { this.vx = this.vy = 0; if (!cond()) return false; after += dt; return after >= extra; } };
    };
    return {
      hand: (g) => { this.slam(1); return waitFor(() => !this.hands.length); },
      hands: (g) => { this.slam(2, 0.7); return waitFor(() => !this.hands.length); },
      eye: (g) => {
        const s = this.pickSlot(g), [dx, dy] = DIR[s.dir];
        const volleys = p2 ? 4 : 3;
        this.eye = { x: s.x + dx * 4, y: s.y + dy * 4, t: 0, dur: 0.6 + volleys * 0.5 + 0.6, open: 0, slot: s };
        sfx('rumble');
        let fired = 0;
        return {
          update: (dt) => {
            const e = this.eye;
            if (!e) return true;
            while (fired < volleys && e.t >= 0.6 + fired * 0.5 + 0.2) {
              const p = g.player, base = Math.atan2(p.y - e.y, p.x - e.x), n = (p2 ? 7 : 5) + t;
              for (let i = 0; i < n; i++) g.enemyShoot({ x: e.x, y: e.y, r: 12, z: 10, def: { name: this.name } }, base + (i - (n - 1) / 2) * 0.17, 80, 'blood');
              fired++;
            }
            return false;
          },
        };
      },
      arm: (g) => {
        const s = this.pickSlot(g), [dx, dy] = DIR[s.dir];
        const room = g.room, reach = (dx ? room.W : room.H) * 0.72;
        this.arm = { x0: s.x, y0: s.y, dx, dy, len: 0, reach, t: 0, state: 'warn', dir: s.dir };
        sfx('growl');
        return waitFor(() => !this.arm, 0.3);
      },
      pour: (g) => this.simple(g, {
        wind: 0.6, after: 1.4, sound: 'crackle', shake: 0,
        fire: () => {
          const p = g.player, n = 6 + t + (p2 ? 2 : 0);
          for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU, r = i === 0 ? 0 : 24 + Math.random() * 70;
            const tx = Math.max(g.room.x0 + 10, Math.min(g.room.R - 10, p.x + Math.cos(a) * r));
            const ty = Math.max(g.room.y0 + 10, Math.min(g.room.B - 10, p.y + Math.sin(a) * r));
            this.lob(g, tx, ty, { flight: 0.9 + i * 0.07, burst: 4, speed: 52, style: 'ember', from: { x: tx + (Math.random() - 0.5) * 40, y: g.room.y0 - 60 } });
          }
        },
      }),
      call: (g) => this.simple(g, {
        wind: 0.8, after: 0.6, sound: 'rumble', shake: 0,
        fire: () => {
          const pool = ['chainling', 'shroudling', 'candlewight', 'tarling', 'ironclad'];
          for (let i = 0; i < 2; i++) {
            const s = this.pickSlot(g), [dx, dy] = DIR[s.dir];
            const spot = g.room.findFreeSpot(s.x + dx * 30, s.y + dy * 30);
            const e = g.spawnEnemy(pool[Math.floor(Math.random() * pool.length)], spot.x, spot.y, { delay: 0.3 });
            e.kx = dx * 140; e.ky = dy * 140;
          }
          g.shake(3);
        },
      }),
    };
  }

  canUse(name, g) { return name !== 'call' || g.enemies.length < 3; }

  renderShadow(ctx, ox, oy) {
    const A = art();
    // her hands' shadows (growing as they come down, red ring once locked)
    for (const h of this.hands) {
      if (h.delay > 0) continue;
      const k = 1 - h.lift / 150;
      const w = Math.round(30 + k * 20), hh = Math.round(10 + k * 8);
      ctx.globalAlpha = 0.35 + 0.4 * k;
      ctx.drawImage(A.shadow, Math.round(h.x - w / 2 + ox), Math.round(h.y - hh / 2 + oy), w, hh);
      if (h.state === 'lock' || h.state === 'fall') {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 20);
        ctx.fillStyle = '#ff4a2a';
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * TAU;
          ctx.fillRect(Math.round(h.x + Math.cos(a) * 26 + ox), Math.round(h.y + Math.sin(a) * 11 + oy), 2, 1);
        }
      }
    }
    // the strip the arm will thrust along
    const a = this.arm;
    if (a && a.state === 'warn') {
      ctx.globalAlpha = 0.2 + 0.35 * (a.t / 0.9) + 0.1 * Math.sin(this.t * 25);
      ctx.fillStyle = '#ff4a2a';
      for (let d = 10; d < a.reach; d += 6) {
        for (const o of [-12, 12]) ctx.fillRect(Math.round(a.x0 + a.dx * d + a.dy * o + ox), Math.round(a.y0 + a.dy * d - a.dx * o + oy), 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    // the mortar marks from pour (base class)
    for (const m of this.mortars) {
      const k = m.t / m.dur;
      ctx.globalAlpha = 0.4 + k * 0.5;
      const mw = Math.round(6 + 10 * k), mh = Math.round(3 + 4 * k);
      ctx.drawImage(A.shadow, Math.round(m.x1 - mw / 2 + ox), Math.round(m.y1 - mh / 2 + oy), mw, mh);
    }
    ctx.globalAlpha = 1;
  }

  render(ctx, ox, oy) {
    const A = art(), flash = this.flash > 0;
    const draw = (img, x, y) => {
      ctx.drawImage(img, x, y);
      if (flash) { ctx.globalAlpha = 0.6; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(img, x, y); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    };
    // the eye in its doorway
    const e = this.eye;
    if (e) {
      const img = e.open < 0.3 ? A.eye[0] : e.open < 0.8 ? A.eye[1] : this.t % 2 < 1 ? A.eyeL : A.eyeR;
      ctx.fillStyle = '#0a0606';
      ctx.fillRect(Math.round(e.x - 24 + ox), Math.round(e.y - 15 + oy), 48, 30);
      draw(img, Math.round(e.x - img.width / 2 + ox), Math.round(e.y - img.height / 2 + oy));
    }
    // the arm: a sleeve from the doorway, a pointing hand at the end
    const a = this.arm;
    if (a && a.len > 2) {
      const ang = Math.atan2(a.dy, a.dx);
      ctx.save();
      ctx.translate(Math.round(a.x0 + ox), Math.round(a.y0 - 6 + oy));
      ctx.rotate(ang);
      const L = Math.max(0, a.len - 30);
      ctx.fillStyle = '#140c0a'; ctx.fillRect(-4, -13, L + 6, 26);
      ctx.fillStyle = SLEEVE[1]; ctx.fillRect(-4, -12, L + 4, 24);
      ctx.fillStyle = SLEEVE[3]; ctx.fillRect(-4, -12, L + 4, 3);
      ctx.fillStyle = SLEEVE[0]; ctx.fillRect(-4, 8, L + 4, 4);
      // her open hand at the end, fingers reaching along the thrust
      ctx.rotate(Math.PI / 2);
      const hi = A.hand;
      ctx.drawImage(hi, -hi.width / 2, -L - hi.height + 10);
      if (flash) { ctx.globalAlpha = 0.6; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(hi, -hi.width / 2, -L - hi.height + 10); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      ctx.restore();
    }
    // the hands, with sleeves reaching down from above the screen
    for (const h of this.hands) {
      if (h.delay > 0) continue;
      const img = h.state === 'down' ? A.fist : A.hand;
      const x = Math.round(h.x - img.width / 2 + ox), y = Math.round(h.y - img.height + 6 - h.lift + oy);
      ctx.globalAlpha = h.state === 'track' ? 0.0 : 1;
      if (h.state !== 'track') {
        ctx.fillStyle = '#140c0a'; ctx.fillRect(x + 11, y - 400, 26, 400 + 4);
        ctx.fillStyle = SLEEVE[1]; ctx.fillRect(x + 12, y - 400, 24, 400 + 4);
        ctx.fillStyle = SLEEVE[3]; ctx.fillRect(x + 12, y - 400, 3, 404);
        draw(img, x, y);
      }
      ctx.globalAlpha = 1;
    }
    // falling wax (base mortars)
    for (const m of this.mortars) {
      const k = Math.min(1, m.t / m.dur);
      const cx = m.x0 + (m.x1 - m.x0) * k, cy = m.y0 + (m.y1 - m.y0) * k;
      ctx.fillStyle = '#5a2a10'; ctx.fillRect(Math.round(cx - 3 + ox), Math.round(cy - 4 + oy), 6, 8);
      ctx.fillStyle = '#ffb05a'; ctx.fillRect(Math.round(cx - 2 + ox), Math.round(cy - 3 + oy), 4, 6);
      ctx.fillStyle = '#fff0c0'; ctx.fillRect(Math.round(cx - 1 + ox), Math.round(cy - 2 + oy), 1, 3);
    }
  }
}
