// Seeded random numbers. Everything that shapes a run uses this; cosmetic effects use Math.random.
const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTVWXYZ0123456789';

export function hashString(str) {
  // cyrb-style 32-bit hash
  let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

export function randomSeedString() {
  let s = '';
  for (let i = 0; i < 8; i++) {
    s += SEED_CHARS[Math.floor(Math.random() * SEED_CHARS.length)];
    if (i === 3) s += ' ';
  }
  return s;
}

export function normalizeSeed(str) {
  const clean = String(str).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return clean.length > 4 ? clean.slice(0, 4) + ' ' + clean.slice(4) : clean;
}

export class RNG {
  constructor(seed) {
    this.seed = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    this.state = this.seed || 1;
  }

  // mulberry32
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  float(min = 0, max = 1) { return min + this.next() * (max - min); }
  int(min, max) { return min + Math.floor(this.next() * (max - min + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Pick from [{weight, ...}] entries.
  weighted(entries, key = 'weight') {
    let total = 0;
    for (const e of entries) total += e[key] ?? 1;
    let r = this.next() * total;
    for (const e of entries) {
      r -= e[key] ?? 1;
      if (r < 0) return e;
    }
    return entries[entries.length - 1];
  }

  // Independent stream derived from this seed, so adding a roll in one system
  // doesn't shift every other system's rolls.
  fork(label) {
    return new RNG(hashString(this.seed + ':' + label));
  }
}
