// Web Audio engine: every sound is synthesized live (no audio files).
// Browsers only allow audio after a user gesture, so the context is created on the
// first tap/click/key press.
import { Music } from './music.js';

// ---------------------------------------------------------------------------
// Sound recipes. Each one builds a short sound from tones and filtered noise.
const N = (name, f) => [name, f];
const vary = (f, amt = 0.08) => f * (1 + (Math.random() - 0.5) * amt * 2);

const SFX = Object.fromEntries([
  // Wick
  N('shoot', (a) => {
    a.tone({ type: 'sine', f: vary(560), f2: 240, dur: 0.1, vol: 0.16 });
    a.noise({ dur: 0.05, vol: 0.05, f: 1400 });
  }),
  // low health: a soft lub-dub
  N('heartbeat', (a) => {
    a.tone({ type: 'sine', f: 62, f2: 40, dur: 0.13, vol: 0.32 });
    a.tone({ type: 'sine', f: 55, f2: 36, dur: 0.12, vol: 0.22, delay: 0.2 });
  }),
  N('splash', (a) => a.noise({ dur: 0.07, vol: 0.05, type: 'bandpass', f: vary(900, 0.2), q: 2 })),
  // character weapons and heart effects
  N('swing', (a) => a.noise({ dur: 0.14, vol: 0.14, type: 'bandpass', f: vary(700), f2: 2400, q: 1.5 })),
  N('beam', (a) => {
    a.tone({ type: 'sawtooth', f: vary(220), f2: 880, dur: 0.3, vol: 0.1 });
    a.tone({ type: 'sine', f: 1320, f2: 660, dur: 0.35, vol: 0.06 });
  }),
  N('hum', (a) => a.tone({ type: 'triangle', f: vary(330, 0.03), dur: 0.11, vol: 0.035 })),
  N('ward', (a) => {
    a.tone({ type: 'sine', f: 1200, f2: 600, dur: 0.25, vol: 0.12 });
    a.tone({ type: 'sine', f: 1800, f2: 900, dur: 0.2, vol: 0.06, delay: 0.04 });
  }),
  N('revive', (a) => {
    [440, 554, 659, 880].forEach((f, i) => a.tone({ type: 'triangle', f, dur: 0.3, vol: 0.12, delay: i * 0.09 }));
    a.noise({ dur: 0.6, vol: 0.08, type: 'highpass', f: 3000 });
  }),
  N('dash', (a) => a.noise({ dur: 0.2, vol: 0.14, type: 'lowpass', f: 2000, f2: 300 })),
  N('reroll', (a) => {
    for (let i = 0; i < 5; i++) a.tone({ type: 'square', f: vary(500 + i * 120, 0.15), dur: 0.04, vol: 0.05, delay: i * 0.04 });
  }),
  N('boneBreak', (a) => {
    a.noise({ dur: 0.12, vol: 0.2, type: 'highpass', f: 1800 });
    a.tone({ type: 'square', f: 300, f2: 120, dur: 0.1, vol: 0.08 });
  }),
  N('gnat', (a) => a.tone({ type: 'sawtooth', f: vary(900), f2: 700, dur: 0.06, vol: 0.03 })),
  // enemy wind-ups: every attack announces itself
  N('snort', (a) => {
    a.noise({ dur: 0.28, vol: 0.2, type: 'bandpass', f: vary(380), f2: 160, q: 3 });
    a.tone({ type: 'sawtooth', f: vary(90), f2: 60, dur: 0.3, vol: 0.12 });
  }),
  N('squeak', (a) => {
    a.tone({ type: 'square', f: vary(1500), f2: 2200, dur: 0.08, vol: 0.06 });
    a.tone({ type: 'square', f: vary(1700), f2: 2500, dur: 0.07, vol: 0.05, delay: 0.1 });
  }),
  N('croak', (a) => a.tone({ type: 'sawtooth', f: vary(130), f2: 90, dur: 0.22, vol: 0.14 })),
  N('buzz', (a) => {
    a.tone({ type: 'sawtooth', f: vary(180), f2: 260, dur: 0.5, vol: 0.09 });
    a.tone({ type: 'square', f: vary(184), f2: 262, dur: 0.5, vol: 0.05 });
  }),
  N('rumble', (a) => a.noise({ dur: 0.6, vol: 0.22, type: 'lowpass', f: 220, f2: 90 })),
  N('hiss', (a) => a.noise({ dur: 0.45, vol: 0.14, type: 'highpass', f: vary(3500), f2: 5500 })),
  N('clink', (a) => {
    a.tone({ type: 'square', f: vary(1800), f2: 1400, dur: 0.05, vol: 0.06 });
    a.tone({ type: 'triangle', f: vary(2600), dur: 0.08, vol: 0.05, delay: 0.02 });
  }),
  N('crackle', (a) => {
    for (let i = 0; i < 6; i++) a.noise({ dur: 0.03, vol: 0.1, type: 'highpass', f: vary(2500, 0.4), delay: i * 0.06 + Math.random() * 0.03 });
  }),
  N('inhale', (a) => a.noise({ dur: 0.75, vol: 0.14, type: 'bandpass', f: 600, f2: 1800, q: 1.5 })),
  N('whoosh', (a) => {
    a.noise({ dur: 0.5, vol: 0.2, type: 'lowpass', f: 1800, f2: 400 });
    a.tone({ type: 'sawtooth', f: 90, f2: 60, dur: 0.4, vol: 0.06 });
  }),
  N('webTear',(a) => a.noise({ dur: 0.12, vol: 0.08, type: 'bandpass', f: vary(2200), q: 2 })),
  N('screech', (a) => {
    a.tone({ type: 'sawtooth', f: vary(1800), f2: 2600, dur: 0.35, vol: 0.06 });
    a.tone({ type: 'square', f: vary(1850), f2: 2500, dur: 0.35, vol: 0.04 });
  }),
  N('rattle', (a) => {
    for (let i = 0; i < 7; i++) a.noise({ dur: 0.025, vol: 0.12, type: 'bandpass', f: vary(1600, 0.3), q: 4, delay: i * 0.05 });
  }),
  N('wail', (a) => a.tone({ type: 'sine', f: vary(420), f2: 260, dur: 0.6, vol: 0.12, attack: 0.15 })),
  N('chime', (a) => {
    a.tone({ type: 'triangle', f: vary(1320, 0.03), dur: 0.5, vol: 0.06 });
    a.tone({ type: 'triangle', f: vary(1980, 0.03), dur: 0.4, vol: 0.04, delay: 0.08 });
  }),
  N('bubble', (a) => {
    for (let i = 0; i < 4; i++) a.tone({ type: 'sine', f: vary(380, 0.3), f2: 900, dur: 0.06, vol: 0.08, delay: i * 0.11 });
  }),
  N('gurgle', (a) => {
    a.noise({ dur: 0.5, vol: 0.12, type: 'bandpass', f: vary(400), f2: 200, q: 5 });
    a.tone({ type: 'sine', f: 120, f2: 180, dur: 0.5, vol: 0.08 });
  }),
  N('splashBig', (a) => {
    a.noise({ dur: 0.4, vol: 0.22, type: 'lowpass', f: 2500, f2: 300 });
    a.tone({ type: 'sine', f: 180, f2: 60, dur: 0.25, vol: 0.12 });
  }),
  N('rockFall', (a) => {
    a.noise({ dur: 0.25, vol: 0.25, type: 'lowpass', f: 900, f2: 150 });
    a.tone({ type: 'square', f: 90, f2: 50, dur: 0.12, vol: 0.1 });
  }),
  N('dart', (a) => a.noise({ dur: 0.08, vol: 0.12, type: 'bandpass', f: vary(3000), q: 3 })),
  N('thump', (a) => {
    a.tone({ type: 'sine', f: 70, f2: 40, dur: 0.16, vol: 0.3 });
    a.tone({ type: 'sine', f: 60, f2: 36, dur: 0.14, vol: 0.22, delay: 0.2 });
  }),
  N('chirp', (a) => a.tone({ type: 'triangle', f: vary(700), f2: 1100, dur: 0.12, vol: 0.08 })),
  N('squish', (a) => {
    a.noise({ dur: 0.25, vol: 0.12, type: 'bandpass', f: vary(500), f2: 250, q: 2 });
    a.tone({ type: 'sine', f: 160, f2: 90, dur: 0.2, vol: 0.1 });
  }),
  N('growl', (a) => {
    a.tone({ type: 'sawtooth', f: vary(70), f2: 110, dur: 0.6, vol: 0.14 });
    a.noise({ dur: 0.5, vol: 0.12, type: 'bandpass', f: 300, q: 2 });
  }),
  N('hurt', (a) => {
    a.tone({ type: 'sawtooth', f: 420, f2: 110, dur: 0.28, vol: 0.2 });
    a.noise({ dur: 0.18, vol: 0.18, f: 1200, f2: 300 });
  }),
  N('playerDeath', (a) => {
    a.tone({ type: 'sawtooth', f: 330, f2: 40, dur: 1.4, vol: 0.22 });
    a.tone({ type: 'sine', f: 220, f2: 55, dur: 1.6, vol: 0.2, delay: 0.1 });
    a.noise({ dur: 1.2, vol: 0.12, f: 2000, f2: 100 });
  }),

  // Enemies
  N('hit', (a) => {
    a.tone({ type: 'square', f: vary(190), f2: 80, dur: 0.07, vol: 0.07 });
    a.noise({ dur: 0.06, vol: 0.12, f: 700 });
  }),
  N('enemyDeath', (a) => {
    a.noise({ dur: 0.35, vol: 0.28, f: 2400, f2: 180 });
    a.tone({ type: 'sine', f: vary(300), f2: 50, dur: 0.32, vol: 0.22 });
  }),
  N('enemyShoot', (a) => a.tone({ type: 'sine', f: vary(260), f2: 480, dur: 0.09, vol: 0.09 })),

  // Pickups
  N('coin', (a) => {
    a.tone({ type: 'square', f: 1320, dur: 0.06, vol: 0.1 });
    a.tone({ type: 'square', f: 1760, dur: 0.18, vol: 0.1, delay: 0.06 });
  }),
  N('heart', (a) => {
    a.tone({ type: 'sine', f: 440, f2: 880, dur: 0.16, vol: 0.14 });
    a.tone({ type: 'sine', f: 660, dur: 0.2, vol: 0.1, delay: 0.08 });
  }),
  N('key', (a) => {
    a.tone({ type: 'triangle', f: 1800, dur: 0.06, vol: 0.1 });
    a.tone({ type: 'triangle', f: 2400, dur: 0.1, vol: 0.08, delay: 0.06 });
  }),
  N('pickup', (a) => a.tone({ type: 'triangle', f: 520, f2: 900, dur: 0.12, vol: 0.12 })),
  N('itemGet', (a) => {
    [62, 65, 69, 74, 77].forEach((n, i) => a.tone({ type: 'triangle', f: midi(n), dur: 0.5, vol: 0.1, delay: i * 0.07 }));
    a.tone({ type: 'sine', f: midi(50), dur: 0.9, vol: 0.12, attack: 0.05 });
  }),
  // a quality 4 item: a bright little tune to dance to
  N('jingle', (a) => {
    [67, 72, 76, 79, 76, 79, 84].forEach((n, i) => a.tone({ type: 'square', f: midi(n), dur: 0.14, vol: 0.06, delay: i * 0.1 }));
    [72, 76, 79, 84].forEach((n, i) => a.tone({ type: 'triangle', f: midi(n), dur: 0.9, vol: 0.07, delay: 0.7 + i * 0.03 }));
    a.tone({ type: 'sine', f: midi(48), dur: 1.4, vol: 0.12, attack: 0.05 });
    a.noise({ dur: 0.6, vol: 0.03, type: 'highpass', f: 6000, delay: 0.7 });
  }),
  N('buy', (a) => {
    a.tone({ type: 'square', f: 880, dur: 0.05, vol: 0.06 });
    a.tone({ type: 'square', f: 1320, dur: 0.05, vol: 0.06, delay: 0.05 });
    a.tone({ type: 'square', f: 1760, dur: 0.12, vol: 0.06, delay: 0.1 });
  }),

  // World
  N('doorOpen', (a) => {
    a.noise({ dur: 0.3, vol: 0.14, f: 500 });
    a.tone({ type: 'sawtooth', f: 95, f2: 70, dur: 0.35, vol: 0.05 });
  }),
  N('doorClose', (a) => {
    a.noise({ dur: 0.18, vol: 0.3, f: 350 });
    a.tone({ type: 'sine', f: 90, f2: 40, dur: 0.22, vol: 0.28 });
  }),
  N('unlock', (a) => {
    a.tone({ type: 'square', f: 900, dur: 0.04, vol: 0.08 });
    a.tone({ type: 'square', f: 1400, dur: 0.08, vol: 0.08, delay: 0.06 });
    a.noise({ dur: 0.1, vol: 0.08, type: 'highpass', f: 3000, delay: 0.02 });
  }),
  N('roomClear', (a) => {
    a.tone({ type: 'sine', f: 880, dur: 0.35, vol: 0.06 });
    a.tone({ type: 'sine', f: 1320, dur: 0.45, vol: 0.05, delay: 0.09 });
  }),
  N('secret', (a) => {
    [60, 64, 67, 72, 76].forEach((n, i) => a.tone({ type: 'triangle', f: midi(n), dur: 0.3, vol: 0.09, delay: i * 0.06 }));
  }),
  N('rockBreak', (a) => {
    a.noise({ dur: 0.2, vol: 0.2, f: 900, f2: 200 });
    a.tone({ type: 'square', f: 120, f2: 60, dur: 0.1, vol: 0.06 });
  }),
  N('jarBreak', (a) => {
    a.noise({ dur: 0.15, vol: 0.16, type: 'bandpass', f: 2200, q: 1.5 });
    a.tone({ type: 'triangle', f: vary(1400), f2: 700, dur: 0.08, vol: 0.06 });
  }),
  N('bombPlace', (a) => {
    a.tone({ type: 'square', f: 240, dur: 0.03, vol: 0.08 });
    a.noise({ dur: 0.25, vol: 0.04, type: 'highpass', f: 4000, delay: 0.03 });
  }),
  N('explosion', (a, o) => {
    const big = o?.big ? 1.4 : 1;
    a.noise({ dur: 0.9 * big, vol: 0.55, f: 3000, f2: 80 });
    a.tone({ type: 'sine', f: 120, f2: 28, dur: 0.7 * big, vol: 0.5 });
  }),
  N('active', (a) => {
    a.noise({ dur: 0.35, vol: 0.16, type: 'bandpass', f: 500, f2: 3500, q: 1.2 });
    a.tone({ type: 'triangle', f: 300, f2: 900, dur: 0.3, vol: 0.08 });
  }),
  N('denied', (a) => a.tone({ type: 'square', f: 140, dur: 0.12, vol: 0.06 })),

  // Boss
  N('bossRoar', (a) => {
    a.tone({ type: 'sawtooth', f: 75, f2: 42, dur: 1.3, vol: 0.32, attack: 0.05 });
    a.tone({ type: 'square', f: 112, f2: 60, dur: 1.1, vol: 0.12, attack: 0.05 });
    a.noise({ dur: 1.2, vol: 0.22, f: 500, f2: 120 });
  }),
  N('steam', (a) => a.noise({ dur: 0.5, vol: 0.2, type: 'highpass', f: 2500, f2: 5000 })),
  N('lob', (a) => a.tone({ type: 'sine', f: 140, f2: 90, dur: 0.18, vol: 0.25 })),
  N('coalLand', (a) => {
    a.noise({ dur: 0.22, vol: 0.18, f: 1200, f2: 200 });
    a.tone({ type: 'sine', f: 150, f2: 60, dur: 0.16, vol: 0.18 });
  }),
  N('charge', (a) => a.tone({ type: 'sawtooth', f: 55, f2: 130, dur: 0.6, vol: 0.18 })),
  N('slam', (a) => {
    a.noise({ dur: 0.4, vol: 0.4, f: 900, f2: 60 });
    a.tone({ type: 'sine', f: 90, f2: 30, dur: 0.4, vol: 0.4 });
  }),
  N('trapdoor', (a) => {
    a.tone({ type: 'sawtooth', f: 180, f2: 70, dur: 0.7, vol: 0.08 });
    a.noise({ dur: 0.5, vol: 0.12, f: 600 });
  }),

  // Stings
  N('gameOver', (a) => {
    [69, 65, 62, 57].forEach((n, i) => a.tone({ type: 'triangle', f: midi(n), dur: 0.9, vol: 0.12, delay: i * 0.35, attack: 0.02 }));
  }),
  N('victory', (a) => {
    [62, 65, 69, 74, 69, 74, 78].forEach((n, i) => a.tone({ type: 'triangle', f: midi(n), dur: 0.6, vol: 0.1, delay: i * 0.13 }));
    a.tone({ type: 'sine', f: midi(50), dur: 1.8, vol: 0.12, attack: 0.1 });
  }),

  // Menus
  N('menuMove', (a) => a.tone({ type: 'square', f: 620, dur: 0.035, vol: 0.04 })),
  N('menuSelect', (a) => {
    a.tone({ type: 'square', f: 760, dur: 0.04, vol: 0.05 });
    a.tone({ type: 'square', f: 1140, dur: 0.06, vol: 0.05, delay: 0.04 });
  }),
  N('waxDrip', (a) => a.tone({ type: 'sine', f: 1300, f2: 500, dur: 0.12, vol: 0.06 })),
]);

// Minimum time between repeats of the same sound, so rapid fire doesn't pile up.
const MIN_GAP = { shoot: 0.03, splash: 0.04, hit: 0.03, enemyShoot: 0.05, coalLand: 0.05, menuMove: 0.02, explosion: 0.15, enemyDeath: 0.04 };

export function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.settings = null;
    this.last = {};
    this.music = null;
    this.wantTrack = null;
  }

  init(settings) {
    this.settings = settings;
    const unlock = () => this.unlock();
    for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(comp);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.master);

    // One second of white noise, reused by every noise sound.
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // iOS needs a sound started inside the gesture to fully unlock.
    const silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, 22050);
    silent.connect(ctx.destination);
    silent.start(0);

    this.applySettings();
    this.music = new Music(this);
    if (this.wantTrack) this.music.play(this.wantTrack, this.wantOpts);
  }

  get ready() { return !!this.ctx && this.ctx.state !== 'closed'; }

  applySettings() {
    if (!this.ctx) return;
    const s = this.settings;
    // Squared so the slider feels even to the ear.
    this.sfxBus.gain.setTargetAtTime(s.sfxVolume * s.sfxVolume * 0.9, this.ctx.currentTime, 0.05);
    this.musicBus.gain.setTargetAtTime(s.musicVolume * s.musicVolume * 0.7, this.ctx.currentTime, 0.05);
  }

  sfx(name, opts) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const recipe = SFX[name];
    if (!recipe) return;
    const now = this.ctx.currentTime;
    const gap = MIN_GAP[name];
    if (gap && now - (this.last[name] ?? -1) < gap) return;
    this.last[name] = now;
    recipe(this, opts);
  }

  playMusic(name, opts) {
    this.wantTrack = name;
    this.wantOpts = opts;
    this.music?.play(name, opts);
  }

  stopMusic() {
    this.wantTrack = null;
    this.music?.stop();
  }

  setIntensity(n) {
    if (this.music) this.music.intensity = n;
  }

  // ---- building blocks ----------------------------------------------------
  // A tone with a pitch slide and a quick envelope. `at` schedules it at an exact time.
  tone({ type = 'sine', f = 440, f2 = null, dur = 0.1, vol = 0.2, attack = 0.004, delay = 0, at = null, bus = null, detune = 0 }) {
    const ctx = this.ctx;
    const t = at ?? ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    if (detune) o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Filtered white noise with an optional filter sweep.
  noise({ dur = 0.2, vol = 0.2, type = 'lowpass', f = 1000, f2 = null, q = 1, delay = 0, at = null, bus = null }) {
    const ctx = this.ctx;
    const t = at ?? ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f, t);
    if (f2) filter.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(bus || this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }
}

export const audio = new AudioEngine();
export const sfx = (name, opts) => audio.sfx(name, opts);
