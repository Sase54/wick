// Isaac-style health. Everything is counted in half hearts.
//
// Left to right on the HUD:
//   containers  red heart containers (whole hearts); `red` half hearts of blood fill them.
//               The last `rotten` filled hearts are Moldy Hearts (each a whole heart).
//   extra       hearts after the containers, in the order they were gained:
//               { t: 'soul', v } Ash Heart, { t: 'black', v } Soot Heart (v = 1 or 2 halves),
//               { t: 'bone', v } Ribcage Heart: a container that holds 0-2 halves of blood.
//   broken      Melted Hearts: dead slots at the very end.
// Overlays:     `eternal` (0/1) Vigil half heart, `golden` Brass Hearts on the last hearts.
//
// Damage (one half heart at a time), like the original game:
//   a Brass Heart cracks first (dropping coins), then hearts are lost from the right:
//   Ash/Soot halves (a Soot Heart blasts the room when it's gone), Ribcage blood then the
//   Ribcage itself, then the Vigil heart, then Moldy Hearts (a whole heart per hit), then blood.
// Red healing fills containers, then Ribcages, then turns Moldy Hearts back into blood.
// At most 12 heart slots in total (containers + extra + broken).
export const MAX_HEARTS = 12;

export class Health {
  constructor(start = {}) {
    this.containers = 0;
    this.red = 0;
    this.rotten = 0;
    this.extra = [];
    this.eternal = 0;
    this.golden = 0;
    this.broken = 0;
    this.soulOnly = !!start.soulOnly;   // can't own containers: they turn into Ash Hearts
    this.boneOnly = !!start.boneOnly;   // containers turn into Ribcage Hearts
    this.oneHit = !!start.oneHit;       // no hearts at all: any hit is the last
    if (this.oneHit) return;
    // starting health: red/hearts in whole containers, the rest in half hearts
    const c = start.hearts ?? 3;
    this.addContainers(c, false);
    this.red = Math.min(this.containers * 2, start.red ?? this.containers * 2);
    for (let i = 0; i < (start.bones || 0); i++) this.addBone(start.boneFill ?? 2);
    if (start.ash) this.addSoul(start.ash, 'soul');
    if (start.soot) this.addSoul(start.soot, 'black');
    if (start.rotten) this.addRotten(start.rotten);
    if (start.eternal) this.eternal = 1;
    if (start.golden) this.addGolden(start.golden);
    if (start.broken) this.addBroken(start.broken);
  }

  get slots() { return this.containers + this.extra.length + this.broken; }
  get room() { return MAX_HEARTS - this.slots; }
  get hearts() { return this.containers + this.extra.length; }   // slots that can be gilded
  get soulTotal() { return this.extra.reduce((s, e) => s + (e.t === 'bone' ? 0 : e.v), 0); }
  get alive() { return this.oneHit || this.red > 0 || this.extra.length > 0 || this.eternal > 0; }
  // total half hearts of health, for "how hurt am I" checks
  get total() { return this.red + this.extra.reduce((s, e) => s + e.v + (e.t === 'bone' ? 1 : 0), 0) + this.eternal; }

  clamp() {
    this.red = Math.max(0, Math.min(this.red, this.containers * 2));
    this.rotten = Math.max(0, Math.min(this.rotten, Math.floor(this.red / 2)));
    this.golden = Math.max(0, Math.min(this.golden, this.hearts));
  }

  // ---- gaining ---------------------------------------------------------------
  // n whole containers (negative to lose them). heal: fill the new ones with blood.
  addContainers(n, heal = true) {
    if (this.oneHit || n === 0) return 0;
    if (this.soulOnly && n > 0) return this.addSoul(n * 2, 'soul');
    if (this.boneOnly && n > 0) { let got = 0; for (let i = 0; i < n; i++) got += this.addBone(heal ? 2 : 0) ? 1 : 0; return got; }
    if (n < 0) {
      // losing containers never kills: the last one stays if it's all you have
      const keep = this.extra.length || this.eternal ? 0 : 1;
      this.containers = Math.max(keep, this.containers + n);
      this.clamp();
      if (this.red === 0 && keep) this.red = 1;
      return n;
    }
    let got = 0;
    for (let i = 0; i < n; i++) {
      if (this.room <= 0) {
        // new containers push the rightmost extra heart off the end, like the original
        if (!this.extra.length) break;
        this.extra.pop();
      }
      this.containers++;
      if (heal) this.red += 2;
      got++;
    }
    this.clamp();
    return got;
  }

  canHealRed() {
    if (this.oneHit) return false;
    return this.red < this.containers * 2 || this.rotten > 0 || this.extra.some((e) => e.t === 'bone' && e.v < 2);
  }

  // Blood: containers first, then Ribcages, then a Moldy Heart turns back into blood.
  healRed(n) {
    if (this.oneHit || n <= 0) return 0;
    let left = n;
    const add = Math.min(left, this.containers * 2 - this.red);
    this.red += add;
    left -= add;
    for (const e of this.extra) {
      if (left <= 0) break;
      if (e.t !== 'bone' || e.v >= 2) continue;
      const f = Math.min(left, 2 - e.v);
      e.v += f;
      left -= f;
    }
    if (left > 0 && this.rotten > 0) { this.rotten--; left = 0; }
    return n - left;
  }

  canAddSoul() {
    if (this.oneHit) return false;
    const last = this.extra[this.extra.length - 1];
    return this.room > 0 || (last && last.t !== 'bone' && last.v < 2);
  }

  // Ash ('soul') or Soot ('black') hearts, n halves.
  addSoul(n, type = 'soul') {
    if (this.oneHit || n <= 0) return 0;
    let left = n;
    const last = this.extra[this.extra.length - 1];
    if (last && last.t !== 'bone' && last.v < 2) {
      last.v = 2;
      if (type === 'black') last.t = 'black';
      left--;
    }
    while (left > 0 && this.room > 0) {
      const v = Math.min(2, left);
      this.extra.push({ t: type, v });
      left -= v;
    }
    return n - left;
  }

  canAddBone() { return !this.oneHit && !this.soulOnly && this.room > 0; }
  addBone(fill = 0) {
    if (!this.canAddBone()) return 0;
    this.extra.push({ t: 'bone', v: fill });
    return 1;
  }

  canAddEternal() { return !this.oneHit; }
  // Two Vigil halves make a new container (also checked when a floor starts).
  addEternal() {
    if (this.oneHit) return 0;
    this.eternal++;
    if (this.eternal >= 2) {
      this.eternal = 0;
      if (this.addContainers(1, true) === 0) this.addSoul(2, 'soul');
    }
    return 1;
  }

  canAddGolden() { return !this.oneHit && this.golden < this.hearts; }
  addGolden(n = 1) {
    const before = this.golden;
    this.golden = Math.min(this.hearts, this.golden + n);
    return this.golden - before;
  }

  // A Moldy Heart fills an empty container, or turns a whole blood heart moldy.
  canAddRotten() {
    if (this.oneHit || this.soulOnly) return false;
    return this.containers * 2 - this.red >= 2 || Math.floor(this.red / 2) > this.rotten;
  }
  addRotten(n = 1) {
    let got = 0;
    for (let i = 0; i < n; i++) {
      if (this.containers * 2 - this.red >= 2) { this.red += 2; this.rotten++; got++; }
      else if (Math.floor(this.red / 2) > this.rotten) { this.rotten++; got++; }
    }
    this.clamp();
    return got;
  }

  // Melted Hearts take a slot away for good: a container goes first, then the rightmost extra.
  addBroken(n = 1) {
    if (this.oneHit) return 0;
    for (let i = 0; i < n && this.broken < MAX_HEARTS; i++) {
      if (this.containers > 0) this.containers--;
      else if (this.extra.length) this.extra.pop();
      this.broken++;
    }
    this.clamp();
    return n;
  }

  // A new floor: a lone Vigil half heart becomes a whole new container.
  floorStart() {
    if (!this.eternal) return false;
    this.eternal = 0;
    if (this.addContainers(1, true) === 0) this.addSoul(2, 'soul');
    return true;
  }

  // ---- losing ----------------------------------------------------------------
  // Take `n` half hearts of damage. Returns what happened, for effects.
  damage(n) {
    const ev = { golden: 0, black: 0, bones: 0, eternal: 0, rotten: 0, taken: 0 };
    if (this.oneHit) { ev.taken = n; return ev; }
    if (this.golden > 0) { this.golden--; ev.golden = 1; }
    let left = n;
    while (left > 0) {
      const last = this.extra[this.extra.length - 1];
      if (last) {
        if (last.t === 'bone') {
          if (last.v > 0) last.v--;
          else { this.extra.pop(); ev.bones++; }
        } else {
          last.v--;
          if (last.v <= 0) { this.extra.pop(); if (last.t === 'black') ev.black++; }
        }
      } else if (this.eternal) {
        this.eternal = 0;
        ev.eternal = 1;
      } else if (this.rotten > 0) {
        this.rotten--;
        this.red -= 2;
        ev.rotten++;
      } else if (this.red > 0) {
        this.red--;
      } else {
        break;
      }
      left--;
      ev.taken++;
    }
    this.clamp();
    return ev;
  }

  // ---- saving ----------------------------------------------------------------
  toJSON() {
    return {
      containers: this.containers, red: this.red, rotten: this.rotten,
      extra: this.extra.map((e) => ({ ...e })), eternal: this.eternal, golden: this.golden, broken: this.broken,
      soulOnly: this.soulOnly, boneOnly: this.boneOnly, oneHit: this.oneHit,
    };
  }

  static from(o) {
    const h = new Health({ oneHit: true });
    Object.assign(h, {
      containers: o.containers || 0, red: o.red || 0, rotten: o.rotten || 0,
      extra: (o.extra || []).map((e) => ({ ...e })), eternal: o.eternal || 0, golden: o.golden || 0, broken: o.broken || 0,
      soulOnly: !!o.soulOnly, boneOnly: !!o.boneOnly, oneHit: !!o.oneHit,
    });
    h.clamp();
    return h;
  }
}
