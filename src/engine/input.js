// Merges keyboard, gamepad and touch into one simple interface:
//   input.move  {x, y}  analog, length <= 1
//   input.shoot {x, y}  unit direction or zero
//   input.consume(action) -> true once per press ('bomb', 'active', 'pocket', 'switch', 'pause', 'confirm', 'back', 'up', 'down', 'left', 'right')
//   input.map   true while the map is held open (Tab, Back on a pad, a finger on the minimap)
const MOVE_KEYS = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };
const SHOOT_KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const ACTION_KEYS = {
  KeyE: ['bomb'],
  KeyQ: ['pocket'],
  KeyF: ['switch'],
  Space: ['active', 'confirm'],
  Escape: ['pause', 'back'],
  KeyP: ['pause'],
  KeyR: ['retry'],
  Enter: ['confirm'],
  Backspace: ['back'],
  ArrowUp: ['up'], ArrowDown: ['down'], ArrowLeft: ['left'], ArrowRight: ['right'],
  KeyW: ['up'], KeyS: ['down'], KeyA: ['left'], KeyD: ['right'],
};
const GAME_KEYS = new Set([
  ...Object.keys(MOVE_KEYS), ...Object.keys(SHOOT_KEYS), ...Object.keys(ACTION_KEYS), 'Tab',
]);

// Standard gamepad layout
const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PAD_ACTIONS = [
  [PAD.LB, ['bomb']], [PAD.LT, ['pocket']],
  [PAD.LS, ['switch']], [PAD.RS, ['switch']],
  [PAD.RB, ['active']], [PAD.RT, ['active']],
  [PAD.START, ['pause']],
  [PAD.A, ['confirm']], [PAD.B, ['back']],
  [PAD.UP, ['up']], [PAD.DOWN, ['down']], [PAD.LEFT, ['left']], [PAD.RIGHT, ['right']],
];
const PAD_SHOOT = [[PAD.Y, 0, -1], [PAD.A, 0, 1], [PAD.X, -1, 0], [PAD.B, 1, 0]];

export class Input {
  constructor(touch) {
    this.touch = touch;
    this.down = new Set();
    this.shootOrder = [];         // most recent arrow key wins, like the classic
    this.pending = new Set();
    this.move = { x: 0, y: 0 };
    this.shoot = { x: 0, y: 0 };
    this.map = false;
    this.padPrev = [];
    this.lastDevice = 'keyboard';
    this.anyPressed = false;      // any key/button/tap this frame (for "press any key")
    this._tmp = { x: 0, y: 0 };

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.clear());
  }

  onKey(e, isDown) {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    const code = e.code;
    if (isDown) {
      this.lastDevice = 'keyboard';
      this.touch.setEnabled(false);
      this.anyPressed = true;
      if (!e.repeat) {
        for (const a of ACTION_KEYS[code] || []) this.pending.add(a);
      }
      this.down.add(code);
      if (SHOOT_KEYS[code] && !this.shootOrder.includes(code)) this.shootOrder.push(code);
    } else {
      this.down.delete(code);
      const i = this.shootOrder.indexOf(code);
      if (i >= 0) this.shootOrder.splice(i, 1);
    }
  }

  clear() {
    this.down.clear();
    this.shootOrder.length = 0;
    this.touch.releaseAll();
  }

  // Called once per rendered frame, before the update steps.
  poll() {
    let mx = 0, my = 0, sx = 0, sy = 0;
    let map = this.down.has('Tab') || this.touch.mapHeld;

    for (const code of this.down) {
      const m = MOVE_KEYS[code];
      if (m) { mx += m[0]; my += m[1]; }
    }
    if (this.shootOrder.length) {
      const s = SHOOT_KEYS[this.shootOrder[this.shootOrder.length - 1]];
      sx = s[0]; sy = s[1];
    }

    // Touch
    for (const a of this.touch.actions) { this.pending.add(a); this.anyPressed = true; }
    this.touch.actions.length = 0;
    if (this.touch.enabled) {
      const tm = this.touch.moveVector(this._tmp);
      if (tm.x || tm.y) { mx = tm.x; my = tm.y; }
      const ts = this.touch.shootVector(this._tmp);
      if (ts.x || ts.y) { sx = ts.x; sy = ts.y; }
    }

    // Gamepad
    const pad = this.readPad();
    if (pad) {
      const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
      for (const [btn, acts] of PAD_ACTIONS) {
        if (b(btn) && !this.padPrev[btn]) {
          for (const a of acts) this.pending.add(a);
          this.anyPressed = true;
          this.lastDevice = 'gamepad';
        }
      }
      for (let i = 0; i < pad.buttons.length; i++) this.padPrev[i] = b(i);

      const lx = pad.axes[0] || 0, ly = pad.axes[1] || 0;
      const lmag = Math.hypot(lx, ly);
      if (lmag > 0.2) {
        const k = Math.min(1, (lmag - 0.2) / 0.8) / lmag;
        mx = lx * k; my = ly * k;
      }
      if (b(PAD.UP)) my = -1;
      if (b(PAD.DOWN)) my = 1;
      if (b(PAD.LEFT)) mx = -1;
      if (b(PAD.RIGHT)) mx = 1;

      const rx = pad.axes[2] || 0, ry = pad.axes[3] || 0;
      if (Math.hypot(rx, ry) > 0.5) {
        if (Math.abs(rx) > Math.abs(ry)) { sx = Math.sign(rx); sy = 0; } else { sx = 0; sy = Math.sign(ry); }
      }
      for (const [btn, x, y] of PAD_SHOOT) if (b(btn)) { sx = x; sy = y; }
      if (b(PAD.BACK)) map = true;
    }

    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    this.move.x = mx; this.move.y = my;
    this.shoot.x = sx; this.shoot.y = sy;
    this.map = map;
  }

  readPad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  // True once per press. Consuming means a press is never handled twice
  // even when a frame is split into several update steps.
  consume(action) {
    if (this.pending.has(action)) {
      this.pending.delete(action);
      return true;
    }
    return false;
  }

  endFrame() {
    this.pending.clear();
    this.anyPressed = false;
  }
}
