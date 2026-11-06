// Touch controls: a floating move stick plus a shooting pad and on-screen buttons.
// The left half of the screen moves: the stick appears where the thumb lands and Wick goes at
// full speed the moment the thumb leaves a tiny dead zone (how far you push only sets the
// direction). Shooting is a pad of 4 buttons in the bottom-right corner; the thumb can slide
// from one to the next. With "touch aim: 8-way" pressing between two buttons shoots diagonally.
const DEAD_ZONE = 0.12;
const PAD_DEAD = 12;   // px from the pad's center that count as no direction

function makeStick(id) {
  const el = document.getElementById(id);
  return { el, knob: el.querySelector('.knob'), pointer: null, ox: 0, oy: 0, dx: 0, dy: 0 };
}

export class TouchControls {
  constructor(settings) {
    this.settings = settings;
    this.layer = document.getElementById('touch');
    this.move = makeStick('stick-move');
    // the shooting pad: a finger anywhere on it (or slid off it) aims by its angle from the center
    this.pad = { el: document.getElementById('dpad'), pointer: null, x: 0, y: 0 };
    this.padBtns = Object.fromEntries([...this.pad.el.querySelectorAll('.dbtn')].map((b) => [b.dataset.dir, b]));
    this.enabled = false;           // true once the player has touched the screen
    this.actions = [];              // queued button presses, drained by Input
    this.onTap = null;              // set by menus: (clientX, clientY) => void
    // menus that want swipes: (clientX, clientY, dx, dy) when the finger lifts
    this.onRelease = null;
    this.menuPress = null;
    this.menuMode = false;
    // a finger held on the minimap opens the big map: isMapArea(clientX, clientY) is set by main
    this.isMapArea = null;
    this.mapPointer = null;

    const opts = { passive: false };
    this.layer.addEventListener('pointerdown', (e) => this.down(e), opts);
    this.layer.addEventListener('pointermove', (e) => this.drag(e), opts);
    this.layer.addEventListener('pointerup', (e) => this.up(e), opts);
    this.layer.addEventListener('pointercancel', (e) => this.up(e), opts);
    this.layer.addEventListener('lostpointercapture', (e) => this.up(e), opts);

    const pe = this.pad.el;
    pe.addEventListener('pointerdown', (e) => this.padDown(e), opts);
    pe.addEventListener('pointermove', (e) => this.padMove(e), opts);
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) pe.addEventListener(ev, (e) => this.padUp(e), opts);

    for (const btn of this.layer.querySelectorAll('.tbtn')) {
      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setEnabled(true);
        btn.classList.add('down');
        this.actions.push(btn.dataset.action);
      };
      const release = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('down');
      };
      btn.addEventListener('pointerdown', press, opts);
      btn.addEventListener('pointerup', release, opts);
      btn.addEventListener('pointercancel', release, opts);
      btn.addEventListener('pointerleave', release, opts);
    }
    this.applySettings();
  }

  applySettings() {
    const { stickSize, stickOpacity } = this.settings;
    this.move.el.style.setProperty('--size', stickSize + 'px');
    this.move.el.style.opacity = stickOpacity;
    this.pad.el.style.opacity = stickOpacity;
    for (const btn of this.layer.querySelectorAll('.tbtn')) btn.style.opacity = stickOpacity;
  }

  setEnabled(on) {
    if (this.enabled === on) return;
    this.enabled = on;
    document.body.classList.toggle('touch-mode', on);
    if (!on) this.releaseAll();
  }

  setMenuMode(on) {
    this.menuMode = on;
    this.layer.classList.toggle('menu', on);
    if (on) this.releaseAll();
  }

  get radius() {
    return this.settings.stickSize / 2;
  }

  down(e) {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') this.setEnabled(true);
    e.preventDefault();

    if (this.menuMode) {
      this.menuPress = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { this.layer.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      this.onTap?.(e.clientX, e.clientY);
      return;
    }
    if (!this.enabled) return; // desktop mouse: keyboard is the controller
    if (this.mapPointer === null && this.isMapArea?.(e.clientX, e.clientY)) {
      this.mapPointer = e.pointerId;
      try { this.layer.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }

    if (e.clientX >= window.innerWidth / 2) return;   // the right half has the pad and buttons
    const stick = this.move;
    if (stick.pointer !== null) return;
    stick.pointer = e.pointerId;
    stick.ox = e.clientX;
    stick.oy = e.clientY;
    stick.dx = stick.dy = 0;
    try { this.layer.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    this.place(stick);
    stick.el.classList.add('on');
  }

  drag(e) {
    const stick = this.stickFor(e.pointerId);
    if (!stick) return;
    e.preventDefault();
    let dx = e.clientX - stick.ox;
    let dy = e.clientY - stick.oy;
    const r = this.radius;
    const dist = Math.hypot(dx, dy);
    if (dist > r) {
      // Drag the base along so the stick never "runs out".
      const k = 1 - r / dist;
      stick.ox += dx * k;
      stick.oy += dy * k;
      dx = e.clientX - stick.ox;
      dy = e.clientY - stick.oy;
      this.place(stick);
    }
    stick.dx = dx / r;
    stick.dy = dy / r;
    stick.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  up(e) {
    if (this.mapPointer === e.pointerId) this.mapPointer = null;
    const mp = this.menuPress;
    if (mp && mp.id === e.pointerId) {
      this.menuPress = null;
      if (this.menuMode) this.onRelease?.(e.clientX, e.clientY, e.clientX - mp.x, e.clientY - mp.y);
    }
    const stick = this.stickFor(e.pointerId);
    if (stick) this.release(stick);
  }

  stickFor(id) {
    if (this.move.pointer === id) return this.move;
    return null;
  }

  place(stick) {
    stick.el.style.left = stick.ox + 'px';
    stick.el.style.top = stick.oy + 'px';
  }

  release(stick) {
    stick.pointer = null;
    stick.dx = stick.dy = 0;
    stick.knob.style.transform = '';
    stick.el.classList.remove('on');
  }

  get mapHeld() { return this.mapPointer !== null; }

  releaseAll() {
    this.mapPointer = null;
    this.release(this.move);
    this.padRelease();
  }

  // Movement: full speed in the direction of the thumb once it leaves the dead zone.
  moveVector(out) {
    const { dx, dy } = this.move;
    const mag = Math.hypot(dx, dy);
    if (mag < DEAD_ZONE) { out.x = out.y = 0; return out; }
    out.x = dx / mag;
    out.y = dy / mag;
    return out;
  }

  // ---- the shooting pad
  padDown(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setEnabled(true);
    if (this.menuMode || this.pad.pointer !== null) return;
    this.pad.pointer = e.pointerId;
    try { this.pad.el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    this.padAim(e);
  }

  padMove(e) {
    if (e.pointerId !== this.pad.pointer) return;
    e.preventDefault();
    e.stopPropagation();
    this.padAim(e);
  }

  padUp(e) {
    if (e.pointerId !== this.pad.pointer) return;
    e.stopPropagation();
    this.padRelease();
  }

  // Aim by the finger's angle from the pad's center: 4 ways, or 8 with free aim on.
  padAim(e) {
    const r = this.pad.el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    let x = 0, y = 0;
    if (Math.hypot(dx, dy) >= PAD_DEAD) {
      if (this.settings.freeAim) {
        const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        x = Math.round(Math.cos(a));
        y = Math.round(Math.sin(a));
      } else if (Math.abs(dx) > Math.abs(dy)) x = Math.sign(dx);
      else y = Math.sign(dy);
    }
    this.pad.x = x;
    this.pad.y = y;
    const lit = { left: x < 0, right: x > 0, up: y < 0, down: y > 0 };
    for (const [dir, b] of Object.entries(this.padBtns)) b.classList.toggle('down', lit[dir]);
  }

  padRelease() {
    this.pad.pointer = null;
    this.pad.x = this.pad.y = 0;
    for (const b of Object.values(this.padBtns)) b.classList.remove('down');
  }

  // Shooting direction from the pad (a diagonal is made unit length), or zero.
  shootVector(out) {
    const { x, y } = this.pad;
    const k = x && y ? Math.SQRT1_2 : 1;
    out.x = x * k;
    out.y = y * k;
    return out;
  }
}
