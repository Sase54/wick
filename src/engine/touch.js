// Floating twin-stick touch controls plus on-screen buttons.
// Left half of the screen moves, right half shoots; each stick appears where the thumb lands.
const DEAD_ZONE = 0.18;
const SHOOT_THRESHOLD = 0.35;

function makeStick(id) {
  const el = document.getElementById(id);
  return { el, knob: el.querySelector('.knob'), pointer: null, ox: 0, oy: 0, dx: 0, dy: 0 };
}

export class TouchControls {
  constructor(settings) {
    this.settings = settings;
    this.layer = document.getElementById('touch');
    this.move = makeStick('stick-move');
    this.shoot = makeStick('stick-shoot');
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
    for (const s of [this.move, this.shoot]) {
      s.el.style.setProperty('--size', stickSize + 'px');
      s.el.style.opacity = stickOpacity;
    }
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

    const stick = e.clientX < window.innerWidth / 2 ? this.move : this.shoot;
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
    if (this.shoot.pointer === id) return this.shoot;
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
    this.release(this.shoot);
  }

  // Analog movement vector, length 0..1, with a dead zone.
  moveVector(out) {
    const { dx, dy } = this.move;
    const mag = Math.hypot(dx, dy);
    if (mag < DEAD_ZONE) { out.x = out.y = 0; return out; }
    const k = Math.min(1, (mag - DEAD_ZONE) / (1 - DEAD_ZONE)) / mag;
    out.x = dx * k;
    out.y = dy * k;
    return out;
  }

  // Unit shooting direction (snapped to 4 directions unless free aim is on), or zero.
  shootVector(out) {
    const { dx, dy } = this.shoot;
    const mag = Math.hypot(dx, dy);
    if (mag < SHOOT_THRESHOLD) { out.x = out.y = 0; return out; }
    if (this.settings.freeAim) {
      out.x = dx / mag;
      out.y = dy / mag;
    } else if (Math.abs(dx) > Math.abs(dy)) {
      out.x = Math.sign(dx); out.y = 0;
    } else {
      out.x = 0; out.y = Math.sign(dy);
    }
    return out;
  }
}
