// Music. Real music files play where there are some (src/data/music.js); everything else, and
// anything still loading or that the browser can't play, is generated here by a small step
// sequencer that schedules notes slightly ahead on the audio clock.
//   - every floor variant has its own track, and a chapter layer goes on top that gets heavier
//     the deeper you are: organ and choir, then a fuzzed bass, then drums, then double kicks
//   - boss and final: always intense; the boss phases push them further (intensity)
//   - shop, secret, devil, angel: the special rooms' own tracks
// One track crossfades into the next. Patterns come from a fixed hash, so each track loops the
// same way every time.
import { MUSIC_FILES, CROSSFADE } from '../data/music.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const LOOKAHEAD = 0.25;

function hash(a, b) {
  const x = Math.sin(a * 91.37 + b * 47.11) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
const TRACKS = {
  cellar: {
    bpm: 66,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      // D minor with a borrowed A major for tension: Dm - Bb - Gm - A
      const chords = [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]];
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 32);
      if (pos === 0 || pos === 3) m.heartbeat(t, pos === 0 ? 0.32 : 0.22);
      if (pos === 0 || pos === 8) m.bass(chord[0] - 24, t, sd * 7);
      if (pos % 2 === 0 && hash(bar, pos) < 0.5) {
        const note = chord[(pos / 2 + bar) % 3] + 12 + (hash(bar, pos + 1) < 0.25 ? 12 : 0);
        m.pluck(note, t, 0.09);
      }
      if (hash(s * 0.37, 7) < 0.035) m.drip(t);
    },
  },

  // The Undercroft: a plodding waltz in A minor for old storage vaults. Ticking like a clock that
  // runs a bit slow, a low drone, a creaky music-box tune and the odd drip.
  undercroft: {
    bpm: 84,
    stepsPerBar: 12,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 12) % 8, pos = s % 12;   // 3/4: twelve steps a bar
      const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]]; // Am F G E
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 24);
      if (pos === 0) m.bass(chord[0] - 24, t, sd * 4);
      if (pos === 4 || pos === 8) m.bass(chord[2] - 24, t, sd * 2);
      if (pos % 4 === 0) m.hat(t, pos === 0 ? 0.035 : 0.02);
      const tune = [0, 2, 1, 2, 0, 1, 2, 1];
      if (pos % 2 === 0 && hash(bar, pos * 3) < 0.6) {
        const note = chord[tune[(pos / 2 + bar) % 8]] + 12 + (bar % 4 === 3 && pos > 6 ? 12 : 0);
        m.pluck(note, t, 0.08);
      }
      if (pos === 6 && bar % 4 === 1) m.heartbeat(t, 0.18);
      if (hash(s * 0.31, 3) < 0.03) m.drip(t);
    },
  },

  // The Weeping Hollow: slow and wet. A cold drone in E minor, sparse plucked notes that echo
  // back off the stone a moment later, and water dripping everywhere. No beat to hold on to.
  weeping: {
    bpm: 58,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 50, 54]]; // Em C D Bm
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 32);
      if (pos === 0 && bar % 4 === 0) m.bass(chord[0] - 24, t, sd * 12);
      // a note, then its echo three steps later, softer
      if ((pos === 2 || pos === 9 || pos === 13) && hash(bar, pos) < 0.75) {
        const note = chord[(pos + bar) % 3] + 12 + (hash(bar, pos + 5) < 0.3 ? 12 : 0);
        m.pluck(note, t, 0.08);
        m.pluck(note, t + sd * 3, 0.03);
      }
      if (hash(s * 0.53, 11) < 0.09) m.drip(t);
      if (pos === 8 && bar % 4 === 3) m.heartbeat(t, 0.14);
    },
  },

  // The Smolder: hot and restless. A pulsing low drone in D Phrygian, crackling hats like burning
  // wood, and a nervous plucked figure that keeps climbing.
  smolder: {
    bpm: 100,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[50, 53, 57], [51, 55, 58], [50, 53, 57], [48, 51, 55]]; // Dm Eb Dm Cm
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 32);
      if (pos % 4 === 0) m.bass(chord[0] - 24, t, sd * 2);
      if (pos % 2 === 1 && hash(bar, pos) < 0.7) m.hat(t, 0.02 + hash(pos, bar) * 0.025);
      if (pos === 0 || pos === 10) m.kick(t);
      if (pos % 2 === 0) {
        const arp = [0, 1, 2, 1, 0, 2, 1, 2][(pos / 2 + bar) % 8];
        if (hash(bar, pos * 7) < 0.6) m.pluck(chord[arp] + 12 + (bar % 4 >= 2 ? 12 : 0), t, 0.07);
      }
      if (pos === 14 && bar % 2 === 1) m.stab([chord[0] + 12, chord[1] + 12, chord[2] + 12], t, sd * 2);
    },
  },

  // The Grotto: a slow 7/8 trudge in C minor. A heavy kick on every bar like a pick striking
  // stone, a deep bass walk, and bell-like notes ringing off the cave walls.
  grotto: {
    bpm: 92,
    stepsPerBar: 14,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 14) % 8, pos = s % 14;   // 7/8: fourteen steps a bar
      const chords = [[48, 51, 55], [44, 48, 51], [46, 50, 53], [43, 47, 50]]; // Cm Ab Bb G
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 28);
      if (pos === 0 || pos === 6) m.kick(t);
      if (pos === 0 || pos === 4 || pos === 10) m.bass(chord[pos === 4 ? 2 : 0] - 24, t, sd * 3);
      if (pos === 8 && bar % 2 === 1) m.snare(t);
      if (pos % 2 === 1 && hash(bar, pos) < 0.4) m.hat(t, 0.018);
      if ((pos === 2 || pos === 12) && hash(bar, pos * 5) < 0.65) m.bell(chord[(bar + pos) % 3] + 24, t);
      if (hash(s * 0.41, 7) < 0.025) m.drip(t);
    },
  },

  // The Ossuary: a funeral organ in G minor, very slow, with a bell tolling on the first beat
  // every other bar and a soft, uneasy heartbeat underneath.
  ossuary: {
    bpm: 64,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[55, 58, 62], [51, 55, 58], [53, 57, 60], [50, 54, 57]]; // Gm Eb F D
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0) m.organ(chord.map((n) => n - 12), t, sd * 16);
      if (pos === 0 && bar % 2 === 0) m.bell(chord[0], t);
      if (pos === 0 || pos === 8) m.bass(chord[0] - 24, t, sd * 6);
      if (pos === 4 || pos === 12) m.heartbeat(t, 0.1);
      if ((pos === 6 || pos === 14) && hash(bar, pos) < 0.55) m.pluck(chord[(pos / 2 + bar) % 3] + 12, t, 0.05);
    },
  },

  // The Sunken Caves: underwater and floating. A wide pad in F, an off-kilter arpeggio that
  // drifts up and down, notes echoing twice, bubbling drips. Barely any rhythm.
  sunken: {
    bpm: 72,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[53, 57, 60, 64], [50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 58]]; // Fmaj7 Dm7 Bbmaj7 C7
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 32);
      if (pos === 0) m.bass(chord[0] - 24, t, sd * 8);
      if (pos % 3 === 0 && hash(bar, pos) < 0.7) {
        const note = chord[Math.floor(pos / 3 + bar) % 4] + 12;
        m.pluck(note, t, 0.06);
        m.pluck(note, t + sd * 2, 0.025);
        m.pluck(note + 12, t + sd * 4, 0.012);
      }
      if (hash(s * 0.71, 5) < 0.12) m.drip(t);
    },
  },

  // The Underhall: a grim march in D minor. Kick and snare like boots on stone, a low organ
  // holding each chord, and a short brass-like stab answering every other bar.
  underhall: {
    bpm: 84,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]; // Dm Bb Gm A
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0) m.organ(chord.map((n) => n - 12), t, sd * 16);
      if (pos === 0 || pos === 8) m.kick(t);
      if (pos === 4 || pos === 12) m.snare(t);
      if (pos === 14 && bar % 2 === 0) m.kick(t);
      if (pos % 4 === 0) m.bass(chord[0] - 24, t, sd * 3);
      if (pos === 10 && bar % 2 === 1) m.stab(chord.map((n) => n + 12), t, sd * 2);
      if (pos % 2 === 1 && hash(bar, pos) < 0.3) m.hat(t, 0.015);
    },
  },

  // The Wax Tombs: a slow 6/8 lament in B minor. Bells ring out over a choir-like pad, a lone
  // plucked line wanders, and a heartbeat thuds now and then.
  waxtombs: {
    bpm: 60,
    stepsPerBar: 12,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 12) % 8, pos = s % 12;   // 6/8: twelve steps a bar
      const chords = [[59, 62, 66], [55, 59, 62], [57, 61, 64], [54, 58, 61]]; // Bm G A F#
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 24);
      if (pos === 0) m.bell(chord[0] + 12, t);
      if (pos === 6 && hash(bar, 3) < 0.6) m.bell(chord[2] + 12, t);
      if (pos === 0 && bar % 2 === 0) m.bass(chord[0] - 24, t, sd * 12);
      if ((pos === 2 || pos === 4 || pos === 8) && hash(bar, pos) < 0.55) m.pluck(chord[(pos / 2 + bar) % 3] + 12, t, 0.05);
      if (pos === 9 && bar % 4 === 3) m.heartbeat(t, 0.14);
    },
  },

  // The Mire: thick and bubbling. A sluggish bass crawling in E Phrygian, slurpy low plucks, dull
  // thumps, and wet drips everywhere.
  mire: {
    bpm: 70,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[40, 43, 47], [41, 45, 48], [40, 43, 47], [38, 41, 45]]; // Em F Em Dm
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord, t, sd * 32);
      if (pos === 0 || pos === 6 || pos === 10) m.bass(chord[pos === 6 ? 1 : 0] - 12, t, sd * 3);
      if (pos === 0 || pos === 10) m.kick(t);
      if ((pos === 3 || pos === 13) && hash(bar, pos) < 0.6) m.pluck(chord[(bar + pos) % 3] + 12, t, 0.05);
      if (hash(s * 0.37, 9) < 0.1) m.drip(t);
      if (pos === 8 && bar % 4 === 2) m.heartbeat(t, 0.12);
    },
  },

  // The Fleshworks: everything keeps time with a heartbeat. A thick pad in C# minor, a pulsing
  // bass on the beat, the lub-dub on every bar and a queasy, sliding melody.
  fleshworks: {
    bpm: 76,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[49, 52, 56], [45, 49, 52], [47, 51, 54], [44, 48, 51]]; // C#m A B G#
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 32);
      if (pos === 0 || pos === 3) m.heartbeat(t, pos === 0 ? 0.22 : 0.14);
      if (pos === 0 || pos === 8) m.bass(chord[0] - 24, t, sd * 4);
      if ((pos === 6 || pos === 11 || pos === 14) && hash(bar, pos) < 0.7) m.lead(chord[(pos + bar) % 3] + 12 - (pos === 14 ? 1 : 0), t, sd * 2);
      if (hash(s * 0.29, 4) < 0.05) m.drip(t);
    },
  },

  // The Black Womb: near silence. A low organ drone in Bb minor, a distant bell, a heartbeat that
  // only comes now and then, and something whispering in plucks.
  blackwomb: {
    bpm: 56,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[46, 49, 53], [42, 46, 49], [44, 48, 51], [41, 45, 48]]; // Bbm Gb Ab F
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.organ(chord.map((n) => n - 12), t, sd * 32);
      if (pos === 0 && bar % 4 === 0) m.bell(chord[0], t);
      if (pos === 8 && bar % 2 === 1) m.heartbeat(t, 0.12);
      if ((pos === 5 || pos === 13) && hash(bar, pos) < 0.45) m.pluck(chord[(bar + pos) % 3] + 12, t, 0.03);
    },
  },

  // The Scarred Womb: brittle and uneasy. A thin pad in F# minor, a stiff 5/4 tick like a clock in
  // a sickroom, and a music-box tune that keeps slipping out of tune.
  scarred: {
    bpm: 84,
    stepsPerBar: 10,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 10) % 8, pos = s % 10;   // 5/4: ten steps a bar
      const chords = [[54, 57, 61], [50, 54, 57], [52, 56, 59], [49, 53, 56]]; // F#m D E C#
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 20);
      if (pos % 2 === 0) m.hat(t, pos === 0 ? 0.03 : 0.015);
      if (pos === 0) m.bass(chord[0] - 24, t, sd * 4);
      const tune = [0, 2, 1, 2, 0];
      if (pos % 2 === 0 && hash(bar, pos) < 0.75) m.bell(chord[tune[(pos / 2 + bar) % 5]] + 12 - (hash(bar, pos * 3) < 0.15 ? 1 : 0), t);
    },
  },

  boss: {
    bpm: 132,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 4, pos = s % 16;
      const root = [38, 38, 39, 36][bar]; // D D Eb C
      const intense = m.intensity >= 2;
      if (pos % 2 === 0) {
        const off = [0, 0, 12, 0, 0, 0, 1, 0][pos / 2];
        m.bassSaw(root + off, t, sd * 1.6, intense ? 0.2 : 0.17);
      }
      // fuzzed kicks (a double kick when it gets intense), a distorted bass under the saw, a choir
      if (pos % 4 === 0 || (intense && pos % 4 === 2)) m.heavyKick(t, 0.5);
      if (pos % 4 === 0) m.distBass(root - 12, t, sd * 2, 0.06);
      if (pos === 0 && bar === 0) m.choir([root + 24, root + 27, root + 30], t, sd * 60, 0.8);
      if (pos === 4 || pos === 12) m.snare(t);
      if (intense ? true : pos % 2 === 1) m.hat(t, pos % 4 === 2 ? 0.05 : 0.03);
      if (pos === 0 && bar % 2 === 0) m.stab([root + 24, root + 27, root + 30], t, sd * 3);
      if (pos === 14 && bar === 3) m.stab([root + 25, root + 28, root + 31], t, sd * 2);
      if (intense && pos % 2 === 0) {
        const arp = [0, 3, 6, 10, 12, 10, 6, 3][(pos / 2) % 8];
        m.lead(root + 36 + arp, t, sd * 1.8);
      }
    },
  },

  // The final boss: a slow, heavy dirge with a tolling bell that builds over three phases.
  final: {
    bpm: 104,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[50, 53, 57], [49, 52, 56], [48, 51, 55], [46, 50, 53]];
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.organ(chord.map((n) => n + 12), t, sd * 32);
      if (pos === 0) m.bell(chord[0] + 24, t);
      if (pos % 4 === 0) m.bassSaw(chord[0] - 12, t, sd * 3, 0.16);
      if (pos === 0 || pos === 10) m.heavyKick(t, 0.55);
      if (pos === 0 && bar % 2 === 0) m.choir(chord.map((n) => n + 12), t, sd * 30, 1);
      if (pos % 4 === 0) m.distBass(chord[0] - 24, t, sd * 3, 0.07);
      if (m.intensity >= 2 && (pos === 4 || pos === 12)) m.snare(t);
      if (m.intensity >= 2 && pos % 2 === 1) m.hat(t, 0.03);
      if (m.intensity >= 3 && pos % 2 === 0) m.lead(chord[(pos / 2) % 3] + 36, t, sd * 1.5);
    },
  },

  // ---- special rooms ----

  // The shop: a music box winding down in a dusty room, a slow waltz in E minor; something
  // breathes in the corner.
  shop: {
    bpm: 76,
    stepsPerBar: 12,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 12) % 8, pos = s % 12;
      const chords = [[52, 55, 59], [48, 52, 55], [45, 48, 52], [47, 51, 54]]; // Em C Am B
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 24);
      if (pos === 0) m.bass(chord[0] - 24, t, sd * 6);
      const tune = [0, 1, 2, 1, 2, 0];
      if (pos % 2 === 0 && hash(bar, pos) < 0.8) m.bell(chord[tune[(pos / 2 + bar) % 6]] + 24 - (hash(s, 2) < 0.1 ? 1 : 0), t, 0.5);
      if (pos === 6 && bar % 2 === 1) m.heartbeat(t, 0.12);
    },
  },

  // Secret rooms: a hollow wind, a low drone and far-off bells; no beat at all.
  secret: {
    bpm: 60,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[49, 52, 56], [48, 51, 55], [46, 49, 53], [48, 51, 55]]; // C#m Cm Bbm Cm
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) { m.pad(chord.map((n) => n - 12), t, sd * 32); m.wind(t, sd * 32); }
      if (pos === 0 && bar % 4 === 0) m.bass(chord[0] - 24, t, sd * 16);
      if ((pos === 5 || pos === 13) && hash(bar, pos) < 0.5) m.bell(chord[(bar + pos) % 3] + 24, t, 0.5);
      if (hash(s * 0.43, 9) < 0.05) m.drip(t);
    },
  },

  // The Bargain: a deep distorted drone a tritone apart, a choir moaning in half steps, a slow
  // heavy drum like something knocking from below.
  devil: {
    bpm: 70,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const root = [38, 38, 37, 39][Math.floor(bar / 2) % 4];
      const chord = [root, root + 3, root + 6];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) { m.choir([root + 12, root + 13, root + 18], t, sd * 32, 0.9); m.distBass(root - 12, t, sd * 30, 0.1); }
      if (pos === 0 || (pos === 10 && bar % 2 === 1)) m.heavyKick(t, 0.5);
      if (pos === 8 && bar % 4 === 3) m.tom(t, 70);
      if (pos === 0 && bar % 4 === 0) m.bell(root + 24, t, 0.9);
      if ((pos === 6 || pos === 14) && hash(bar, pos) < 0.4) m.organ([root + 12, root + 18], t, sd * 4);
    },
  },

  // The Vigil: a choir on suspended chords that never quite resolve, bells, no drums. Beautiful
  // and a little wrong.
  angel: {
    bpm: 62,
    step(m, s, t, sd) {
      const bar = Math.floor(s / 16) % 8, pos = s % 16;
      const chords = [[60, 65, 67], [58, 63, 65], [56, 61, 63], [55, 60, 62]]; // Csus4 Bbsus4 Absus4 Gsus4
      const chord = chords[Math.floor(bar / 2) % 4];
      m.chord = chord;
      if (pos === 0 && bar % 2 === 0) m.choir(chord, t, sd * 32, 1.1);
      if (pos === 0 && bar % 2 === 0) m.pad(chord.map((n) => n - 12), t, sd * 32);
      if (pos % 4 === 2 && hash(bar, pos) < 0.6) m.bell(chord[(pos + bar) % 3] + 12, t, 0.6);
      if (pos === 0 && bar % 4 === 0) m.bass(chord[0] - 24, t, sd * 16);
    },
  },
};

// ---------------------------------------------------------------------------
// Chapter layers: laid over every floor variant's own track. The deeper the chapter, the heavier
// it gets: organ and choir from the start, then a distorted bass, then drums, then double kicks
// and a screaming lead. Uses the chord the track is playing (m.chord).
const CHAPTER_LAYERS = {
  1(m, s, t, sd, bar, pos, c) {
    // slow and creepy: a choir on every other bar, an organ drone, one heavy knock a bar
    if (pos === 0 && bar % 2 === 0) m.choir(c.map((n) => n), t, sd * 30, 0.7);
    if (pos === 0 && bar % 4 === 2) m.organ([c[0] - 12, c[2] - 12], t, sd * 28);
    if (pos === 0) m.heavyKick(t, 0.35);
  },
  2(m, s, t, sd, bar, pos, c) {
    CHAPTER_LAYERS[1](m, s, t, sd, bar, pos, c);
    if (pos === 0 || pos === 6 || pos === 10) m.distBass(c[0] - 24, t, sd * 3, 0.07);
    if (pos === 8 && bar % 2 === 1) m.tom(t, 90);
  },
  3(m, s, t, sd, bar, pos, c) {
    if (pos === 0 && bar % 2 === 0) m.choir(c, t, sd * 30, 0.8);
    if (pos % 4 === 0) m.heavyKick(t, 0.45);
    if (pos === 4 || pos === 12) m.snare(t);
    if (pos % 2 === 0) m.distBass(c[0] - 24 + (pos === 14 ? 1 : 0), t, sd * 1.6, 0.075);
    if (pos === 14 && bar % 2 === 1) { m.tom(t, 110); m.tom(t + sd, 80); }
  },
  4(m, s, t, sd, bar, pos, c) {
    if (pos === 0 && bar % 2 === 0) m.choir([c[0], c[1], c[2] + 1], t, sd * 30, 0.9);
    if (pos % 2 === 0 || (pos % 4 === 3 && bar % 2 === 1)) m.heavyKick(t, 0.42);   // double kick
    if (pos === 4 || pos === 12) m.snare(t);
    m.distBass(c[0] - 24 + ([0, 0, 1, 0][(pos >> 2)] || 0), t, sd * 0.9, 0.06);
    if (pos % 4 === 0 && bar % 2 === 1) m.lead(c[(pos / 4 + bar) % 3] + 24, t, sd * 3);
    if (pos % 2 === 1) m.hat(t, 0.025);
  },
};

// ---------------------------------------------------------------------------
// A generated track playing: its own volume (for crossfades) and the step sequencer.
class GenPlayer {
  constructor(music, name, { transpose = 0, chapter = 0 } = {}) {
    this.music = music;
    this.ctx = music.ctx;
    this.e = music.e;
    this.name = name;
    this.T = TRACKS[name];
    this.tr = transpose;          // transpose in semitones (each floor sits in a lower key)
    this.chapter = chapter;       // > 0: lay that chapter's layer over it
    this.intensity = 1;
    this.step = 0;
    this.chord = [48, 51, 55];
    this.nextTime = this.ctx.currentTime + 0.05;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(music.bus);
    // a shared fuzz for the heavy instruments
    this.fuzz = this.ctx.createWaveShaper();
    this.fuzz.curve = fuzzCurve();
    this.fuzz.oversample = '2x';
    const fuzzOut = this.ctx.createBiquadFilter();
    fuzzOut.type = 'lowpass';
    fuzzOut.frequency.value = 2200;
    this.fuzz.connect(fuzzOut).connect(this.out);
  }

  tick() {
    const T = this.T;
    const sd = 60 / T.bpm / 4; // one 16th note
    // If the tab slept, don't try to catch up on missed notes.
    if (this.nextTime < this.ctx.currentTime - 0.5) this.nextTime = this.ctx.currentTime + 0.05;
    const per = T.stepsPerBar || 16;
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      T.step(this, this.step, this.nextTime, sd);
      const layer = CHAPTER_LAYERS[this.chapter];
      if (layer) layer(this, this.step, this.nextTime, sd, Math.floor(this.step / per) % 8, this.step % per, this.chord);
      this.nextTime += sd;
      this.step++;
    }
  }

  fade(to, time) {
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(to, now, time / 3);
  }

  stop() { this.out.disconnect(); }

  // ---- instruments ------------------------------------------------------------
  voice(type, freq, t, dur, vol, { attack = 0.01, release = null, filter = null, detune = 0, to = null } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (release ?? dur));
    let node = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(filter[0], t);
      if (filter[1]) f.frequency.exponentialRampToValueAtTime(filter[1], t + dur);
      node = o.connect(f);
    }
    node.connect(g).connect(to || this.out);
    o.start(t);
    o.stop(t + (release ?? dur) + 0.05);
  }

  pad(notes, t, dur) {
    for (const n of notes) {
      for (const det of [-8, 8]) {
        this.voice('sawtooth', midi(n + this.tr), t, dur, 0.022, { attack: dur * 0.3, release: dur, filter: [500, 900], detune: det });
      }
    }
  }

  bass(n, t, dur) {
    this.voice('triangle', midi(n + this.tr), t, dur, 0.2, { attack: 0.02 });
  }

  pluck(n, t, vol) {
    this.voice('triangle', midi(n + this.tr), t, 0.5, vol, { attack: 0.003 });
    this.voice('sine', midi(n + 12 + this.tr), t, 0.25, vol * 0.3, { attack: 0.003 });
  }

  heartbeat(t, vol) {
    this.voice('sine', 60, t, 0.18, vol, { attack: 0.005, filter: [200] });
  }

  drip(t) {
    const f = 1200 + hash(t, 3) * 900;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.4, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.2);
  }

  bassSaw(n, t, dur, vol) {
    this.voice('sawtooth', midi(n + this.tr), t, dur, vol, { attack: 0.005, filter: [1400, 200] });
  }

  // a fuzzed bass: saw and square an octave apart through the distortion
  distBass(n, t, dur, vol) {
    this.voice('sawtooth', midi(n + this.tr), t, dur, vol, { attack: 0.005, filter: [900, 300], to: this.fuzz });
    this.voice('square', midi(n + 12 + this.tr), t, dur, vol * 0.5, { attack: 0.005, filter: [700], to: this.fuzz });
  }

  kick(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.25);
  }

  // a hard, fuzzed kick with a click on top
  heavyKick(t, vol = 0.45) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.fuzz);
    o.start(t);
    o.stop(t + 0.32);
    this.e.noise({ at: t, dur: 0.02, vol: vol * 0.25, type: 'highpass', f: 3000, bus: this.out });
  }

  tom(t, f) {
    this.voice('sine', f, t, 0.3, 0.3, { attack: 0.003, filter: [600] });
    this.e.noise({ at: t, dur: 0.06, vol: 0.06, type: 'bandpass', f: f * 4, q: 1, bus: this.out });
  }

  snare(t) {
    this.e.noise({ at: t, dur: 0.16, vol: 0.22, type: 'bandpass', f: 1800, q: 0.8, bus: this.out });
    this.voice('triangle', 190, t, 0.08, 0.12);
  }

  hat(t, vol) {
    this.e.noise({ at: t, dur: 0.04, vol, type: 'highpass', f: 7000, bus: this.out });
  }

  stab(notes, t, dur) {
    for (const n of notes) this.voice('square', midi(n + this.tr), t, dur, 0.035, { attack: 0.004, filter: [2400, 600] });
  }

  lead(n, t, dur) {
    this.voice('sawtooth', midi(n + this.tr), t, dur, 0.035, { attack: 0.004, filter: [3000, 900], to: this.fuzz });
  }

  organ(notes, t, dur) {
    for (const n of notes) {
      this.voice('square', midi(n + this.tr), t, dur, 0.016, { attack: dur * 0.15, release: dur, filter: [900] });
      this.voice('sine', midi(n - 12 + this.tr), t, dur, 0.03, { attack: dur * 0.15, release: dur });
      this.voice('sine', midi(n + 19 + this.tr), t, dur, 0.006, { attack: dur * 0.15, release: dur });   // a little sparkle stop
    }
  }

  // A choir: detuned saws through two vowel formants ("aah"), swelling in and out.
  choir(notes, t, dur, vol = 1) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 * vol, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [f, q, v] of [[730, 8, 1], [1090, 10, 0.6], [2440, 12, 0.2]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const fg = ctx.createGain();
      fg.gain.value = v * 2.2;
      bp.connect(fg).connect(g);
      for (const n of notes) {
        for (const det of [-12, 0, 11]) {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = midi(n + this.tr);
          o.detune.value = det + Math.sin(n * 3.1) * 4;
          o.connect(bp);
          o.start(t);
          o.stop(t + dur + 0.05);
        }
      }
    }
    g.connect(this.out);
  }

  // wind through a hole: swept noise
  wind(t, dur) {
    this.e.noise({ at: t, dur, vol: 0.03, type: 'bandpass', f: 300, f2: 900, q: 3, bus: this.out });
  }

  // A church-ish bell: a few out-of-tune partials with a long decay.
  bell(n, t, vol = 1) {
    const f = midi(n + this.tr);
    for (const [mul, v] of [[1, 0.09], [2.76, 0.04], [5.4, 0.02]]) this.voice('sine', f * mul, t, 2.4, v * vol, { attack: 0.004 });
  }
}

// a soft-clipping curve for the fuzz
let FUZZ = null;
function fuzzCurve() {
  if (FUZZ) return FUZZ;
  const n = 1024;
  FUZZ = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; FUZZ[i] = Math.tanh(x * 6) * 0.8; }
  return FUZZ;
}

// A music file playing on a loop.
class FilePlayer {
  constructor(music, name, buffer, vol) {
    this.music = music;
    this.name = name;
    this.ctx = music.ctx;
    this.intensity = 1;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0;
    this.vol = vol;
    this.out.connect(music.dry);
    this.src = this.ctx.createBufferSource();
    this.src.buffer = buffer;
    this.src.loop = true;
    this.src.connect(this.out);
    this.src.start();
  }

  tick() {}

  fade(to, time) {
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(to * this.vol, now, time / 3);
  }

  stop() {
    try { this.src.stop(); } catch { /* already stopped */ }
    this.out.disconnect();
  }
}

// ---------------------------------------------------------------------------
// The music: whichever track is playing, crossfading into the next. Real files (src/data/music.js)
// win over generated tracks once they've loaded.
export class Music {
  constructor(engine) {
    this.e = engine;
    const ctx = (this.ctx = engine.ctx);
    this.players = [];
    this.key = null;
    this.buffers = new Map();   // file track -> AudioBuffer | 'loading' | 'failed'

    // generated tracks -> dry + echo -> music bus; files go straight to the bus
    this.dry = ctx.createGain();
    this.dry.connect(engine.musicBus);
    this.bus = ctx.createGain();
    this.bus.connect(this.dry);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1600;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    this.bus.connect(delay);
    delay.connect(tone).connect(fb).connect(delay);
    tone.connect(wet).connect(engine.musicBus);

    this.timer = setInterval(() => this.tick(), 40);
  }

  get current() { return this.players[this.players.length - 1] || null; }
  get intensity() { return this.current?.intensity ?? 1; }
  set intensity(n) { if (this.current) this.current.intensity = n; }

  // name: a file track or a generated one. opts: { transpose, chapter, fallback }
  //   fallback: the generated track to play while the file loads (or if it can't play)
  play(name, opts = {}) {
    const key = `${name}:${opts.transpose || 0}:${opts.fallback || ''}`;
    if (key === this.key) return;
    this.key = key;
    const file = MUSIC_FILES[name];
    const buf = this.buffers.get(name);
    if (buf instanceof AudioBuffer) { this.start(new FilePlayer(this, name, buf, file.vol)); return; }
    const gen = TRACKS[name] ? name : (opts.fallback || file?.gen);
    if (gen && TRACKS[gen] && this.current?.name !== gen) this.start(new GenPlayer(this, gen, opts));
    // fetch the file; switch to it when it's ready, if this is still the wanted track
    if (file && !buf) {
      this.buffers.set(name, 'loading');
      fetch(new URL(`../../assets/music/${file.file}`, import.meta.url))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then((b) => this.ctx.decodeAudioData(b))
        .then((ab) => {
          this.buffers.set(name, ab);
          if (this.key === key) { this.key = null; this.play(name, opts); }
        })
        .catch(() => this.buffers.set(name, 'failed'));
    }
  }

  // fade everything else out and this in
  start(player) {
    for (const p of this.players) {
      p.fade(0, CROSSFADE);
      setTimeout(() => { p.stop(); this.players = this.players.filter((o) => o !== p); }, CROSSFADE * 1000 + 400);
    }
    this.players.push(player);
    player.fade(1, CROSSFADE);
  }

  stop() {
    this.key = null;
    for (const p of this.players) {
      p.fade(0, 1);
      setTimeout(() => { p.stop(); this.players = this.players.filter((o) => o !== p); }, 1400);
    }
  }

  tick() {
    if (this.ctx.state !== 'running') return;
    for (const p of this.players) p.tick();
  }
}
