// Enemy definitions. Behaviors live in src/game/enemies.js, art in src/data/enemyArt.js;
// everything tunable is here. Which variant an enemy lives in is set by the variant's groups
// (src/data/variants.js) and listed in DESIGN.md.
//
// Fields:
//   name        shown on the game-over screen ("snuffed out by ...")
//   art         key in src/data/enemyArt.js (defaults to the id)
//   hp, speed (px/s), radius (hitbox, px), contact (half hearts dealt on touch)
//   behavior    chase | swarm | flutter | turret | charger | hopper | spawner | drift | cross | skitter |
//               spitter | tank | lurker | dropper | loom | blinker | lobber | breather | hound |
//               diver | burrower | crawler | lunger | shambler | matron
//   flying      crosses pits;  ghost: passes through rocks;  static: never moves or gets pushed
//   blood       particle/stain colors (see BLOOD)
//   base        inherit every field from another enemy, then override
//   rotten      stronger "rotten" version (tinted sickly green), used deeper down
//   mini        a miniboss: big, has a health bar, takes over a whole room
//   noChampion  never becomes a champion
//   windSfx     sound at the start of its wind-up (every attack has a wind-up: a pose with
//               glowing eyes, a red glow under it, a shake and this sound)
//   shoot       { every, speed, wind, count, spread, alternate, style, web (lands as a sticky web) }
//   frontArmor  share of damage ignored from shots that hit it head-on
//   landWeb     hoppers leave a web where they land
//   trail       leaves creep while it moves ('fire' | 'poison');  chargeTrail: only while charging
//   deathFuse   { time, fires, shots } glows white-hot when killed, then bursts into fire
//   blink, lob, breath  { ... } blinkers, lobbers and fire-breathers (see the enemies below)
//   lurk, drop  { ... } lurkers and droppers (see the enemies below)
//   charge      { speed, wind, stun, maxTime }      (chargers: line up, wind up, run until a wall)
//   hop         { every, dist, wind, air, recover }  (hoppers)
//   lunge       { range, wind, speed, time, recover }
//   dive        { every: [min, max], wind, speed, time, stun, hover }
//   burrow      { speed, time: [min, max], emerge, stay }
//   segments    { count, art, hp, radius, spacing }  (crawlers)
//   rage        { below, wind, speed }               (shamblers: angry under this much health)
//   split       { type, count }   spawn these on death
//   deathShots  { count, speed }  burst of shots on death
//   landShots   { count, speed }  burst when a hopper lands
//   spawn       { type, every, max, wind } for spawners
export const ENEMIES = {
  // ================================================================ chapter 1, all variants
  blob: { name: 'Mildew Blob', hp: 10, speed: 24, radius: 9, behavior: 'chase', contact: 1, blood: 'green', animSpeed: 5 },
  blobRotten: { base: 'blob', name: 'Rotten Blob', hp: 18, speed: 30, rotten: true, deathShots: { count: 6, speed: 68 } },

  moth: { name: 'Dustmoth', hp: 5, speed: 56, radius: 7, behavior: 'flutter', flying: true, contact: 1, blood: 'dust', animSpeed: 14 },
  mothRotten: { base: 'moth', name: 'Rotten Moth', hp: 8, rotten: true, windSfx: 'chirp', shoot: { every: 2.4, speed: 72, wind: 0.45 } },

  eye: { name: 'Drain Eye', hp: 12, radius: 9, behavior: 'turret', static: true, contact: 1, blood: 'red', windSfx: 'chirp', shoot: { every: 2.3, speed: 80, wind: 0.55, count: 1 } },
  eyeRotten: { base: 'eye', name: 'Rotten Eye', hp: 18, rotten: true, shoot: { every: 2.4, speed: 80, wind: 0.55, count: 3, spread: 0.3 } },

  ratram: {
    name: 'Ratram', hp: 14, speed: 30, radius: 10, behavior: 'charger', contact: 1, blood: 'red', animSpeed: 8, windSfx: 'snort',
    charge: { speed: 165, wind: 0.5, stun: 1.0, maxTime: 1.8 },
  },
  ratramRotten: { base: 'ratram', name: 'Rotten Ratram', hp: 24, speed: 34, rotten: true, contact: 2, charge: { speed: 190, wind: 0.45, stun: 0.9, maxTime: 1.8 } },

  toad: { name: 'Jar Toad', hp: 12, radius: 9, behavior: 'hopper', contact: 1, blood: 'green', windSfx: 'croak', hop: { every: 1.1, dist: 56, wind: 0.35, air: 0.55, recover: 0.35 } },
  toadRotten: { base: 'toad', name: 'Rotten Toad', hp: 18, rotten: true, landShots: { count: 4, speed: 72 } },

  sac: { name: 'Egg Sac', hp: 20, radius: 11, behavior: 'spawner', static: true, contact: 1, blood: 'pale', animSpeed: 2, windSfx: 'squish', spawn: { type: 'mite', every: 5.5, max: 2, wind: 0.75 } },
  mite: { name: 'Mite', hp: 3, speed: 46, radius: 5, behavior: 'swarm', contact: 1, blood: 'pale', animSpeed: 12, noChampion: true },

  // ================================================================ The Undercroft (exclusive)
  // Pestfly: drifts at you in little clouds; weak alone, annoying in numbers.
  pestfly: { name: 'Pestfly', hp: 4, speed: 38, radius: 5, behavior: 'swarm', flying: true, contact: 1, blood: 'dust', animSpeed: 16 },
  // Divebuzzer: keeps its distance, then winds up (red eyes, loud buzz) and dives in a straight line.
  divebuzzer: {
    name: 'Divebuzzer', hp: 9, speed: 46, radius: 7, behavior: 'diver', flying: true, contact: 1, blood: 'dust', animSpeed: 18, windSfx: 'buzz',
    dive: { every: [1.6, 2.8], wind: 0.6, speed: 230, time: 0.45, stun: 0.9, hover: 72 },
  },
  // Mudworm: a mound moves under the floor, shakes, the worm bursts out, spits three shots, burrows.
  mudworm: {
    name: 'Mudworm', hp: 14, radius: 9, behavior: 'burrower', contact: 1, blood: 'red', windSfx: 'chirp',
    burrow: { speed: 42, time: [1.4, 2.4], emerge: 0.7, stay: 1.8 }, shoot: { speed: 78, wind: 0.5, count: 3, spread: 0.28 },
  },
  // Bristleworm: a head and four body segments crawling along straight lines. Every part can be hit.
  bristleworm: {
    name: 'Bristleworm', hp: 12, speed: 36, radius: 8, behavior: 'crawler', contact: 1, blood: 'red', animSpeed: 8,
    segments: { count: 4, art: 'bristleseg', hp: 8, radius: 7, spacing: 12 },
  },
  // Gnawer: scurries in short bursts; when you're close it rears up, squeaks and lunges.
  gnawer: {
    name: 'Gnawer', hp: 8, speed: 52, radius: 7, behavior: 'lunger', contact: 1, blood: 'red', animSpeed: 12, windSfx: 'squeak',
    lunge: { range: 74, wind: 0.45, speed: 215, time: 0.26, recover: 0.6 },
  },
  // Gawper: a slow shambling wax figure. Below half health its face cracks and it runs at you.
  gawper: {
    name: 'Gawper', hp: 16, speed: 21, radius: 8, behavior: 'shambler', contact: 1, blood: 'wax', animSpeed: 5, windSfx: 'growl',
    rage: { below: 0.5, wind: 0.7, speed: 50 },
  },

  // ================================================================ The Weeping Hollow (exclusive)
  // Crawlspider: skitters at you in quick jerky bursts with little pauses.
  crawlspider: { name: 'Crawlspider', hp: 5, speed: 150, radius: 6, behavior: 'skitter', contact: 1, blood: 'tar', animSpeed: 14 },
  // Bigleg: crouches with burning eyes (its landing spot shows), leaps far, leaves a web where it lands.
  bigleg: {
    name: 'Bigleg', hp: 14, radius: 10, behavior: 'hopper', contact: 1, blood: 'tar', windSfx: 'hiss', landWeb: true,
    hop: { every: 1.7, dist: 120, wind: 0.55, air: 0.7, recover: 0.6 },
  },
  // Brood Nest: a web cocoon; swells, then a crawlspider crawls out (2 at a time).
  broodnest: { name: 'Brood Nest', hp: 22, radius: 11, behavior: 'spawner', static: true, contact: 1, blood: 'pale', animSpeed: 2, windSfx: 'squish', spawn: { type: 'crawlspider', every: 6, max: 2, wind: 0.8 } },
  // Webspitter: keeps its distance; its belly glows, then it spits a web glob (a sticky web where it lands).
  webspitter: { name: 'Webspitter', hp: 10, speed: 40, radius: 8, behavior: 'spitter', contact: 1, blood: 'tar', animSpeed: 10, windSfx: 'hiss', shoot: { every: 2.6, speed: 92, wind: 0.6, web: true } },
  // Mossback: slow, armored in front (shots from the front do half). It turns slowly, so you can get round it. Rears up and spits 3 spores.
  mossback: {
    name: 'Mossback', hp: 16, speed: 16, radius: 11, behavior: 'tank', contact: 1, blood: 'green', animSpeed: 4, windSfx: 'growl', frontArmor: 0.5, turnRate: 1.4,
    shoot: { every: 3.4, speed: 64, wind: 0.65, count: 3, spread: 0.35, style: 'green' },
  },
  // Moss Lurker: hidden as moss. Comes close and it bulges (0.55 s), bursts up and bites, stays exposed, sinks, moves.
  mosslurker: {
    name: 'Moss Lurker', hp: 14, radius: 9, behavior: 'lurker', contact: 1, blood: 'green', animSpeed: 6, windSfx: 'growl',
    lurk: { trigger: 62, wind: 0.55, speed: 170, time: 0.3, exposed: 1.3, travel: 1.4 },
  },
  // Hanger: hides on the ceiling, its shadow creeps after you, grows (0.7 s), then it drops; climbs back up later.
  hanger: { name: 'Hanger', hp: 9, speed: 26, radius: 7, behavior: 'dropper', contact: 1, blood: 'tar', animSpeed: 10, windSfx: 'hiss', drop: { creep: 46, wind: 0.7, fall: 0.25, ground: 1.8, climb: 0.45 } },

  // ================================================================ The Smolder (exclusive)
  // Cinderling: a scurrying lump of burning tallow; leaves a trail of fire.
  cinderling: { name: 'Cinderling', hp: 6, speed: 44, radius: 6, behavior: 'chase', contact: 1, blood: 'ember', animSpeed: 10, trail: 'fire' },
  // Ashwalker: walks at you; when killed it glows white-hot (0.7 s) and bursts into fire and shots.
  ashwalker: {
    name: 'Ashwalker', hp: 14, speed: 20, radius: 8, behavior: 'chase', contact: 1, blood: 'ash', animSpeed: 5,
    deathFuse: { time: 0.7, fires: 6, shots: { count: 6, speed: 58 } },
  },
  // Flickerwisp: its flame appears where it's going (0.55 s), it blinks there, glows, shoots a fireball.
  flickerwisp: {
    name: 'Flickerwisp', hp: 8, radius: 7, behavior: 'blinker', flying: true, contact: 1, blood: 'ember', animSpeed: 10, windSfx: 'crackle',
    blink: { every: [2.2, 3.2], wind: 0.55, range: [55, 90] }, shoot: { speed: 85, wind: 0.45, style: 'ember' },
  },
  // Kindler: keeps its distance, holds up a glowing coal (0.6 s), lobs it at you: fire where it lands.
  kindler: {
    name: 'Kindler', hp: 11, speed: 30, radius: 8, behavior: 'lobber', contact: 1, blood: 'ash', animSpeed: 8, windSfx: 'crackle',
    lob: { every: 3, wind: 0.6, flight: 0.9, fires: 3 },
  },
  // Smokebelly: slow; up close it breathes in (puffing up, pulling you a little), then breathes a cone of fire.
  smokebelly: {
    name: 'Smokebelly', hp: 20, speed: 15, radius: 11, behavior: 'breather', contact: 1, blood: 'ash', animSpeed: 4, windSfx: 'inhale',
    breath: { range: 88, wind: 0.8, time: 1, recover: 0.9, cone: 0.45, speed: 105 },
  },
  // Scorch Rat: a burning charger: lines up, snorts, charges, and leaves a line of fire behind it.
  scorchrat: {
    name: 'Scorch Rat', hp: 12, speed: 32, radius: 9, behavior: 'charger', contact: 1, blood: 'ember', animSpeed: 10, windSfx: 'snort', chargeTrail: 'fire',
    charge: { speed: 175, wind: 0.5, stun: 1.0, maxTime: 1.6 },
  },
  // Clinker: a slow, tough lump of coal that breaks into two burning bits.
  clinker: { name: 'Clinker', hp: 20, speed: 16, radius: 10, behavior: 'chase', contact: 1, blood: 'ash', animSpeed: 3, split: { type: 'coalbit', count: 2 } },
  coalbit: { name: 'Coal Bit', hp: 4, speed: 50, radius: 5, behavior: 'chase', contact: 1, blood: 'ash', animSpeed: 8, noChampion: true },

  // ================================================================ The Grotto (chapter 2, exclusive)
  // Shriekbat: flutters; spreads its wings and shrieks (0.6 s), sending out a ring of sound.
  shriekbat: { name: 'Shriekbat', hp: 10, speed: 62, radius: 7, behavior: 'flutter', flying: true, contact: 1, blood: 'red', animSpeed: 14, windSfx: 'screech', shoot: { every: 3, speed: 52, wind: 0.6, ring: 8, style: 'ghost' } },
  // Pebbler: a rock until you get close; uncurls (0.5 s), rolls at you bouncing off walls, sits dizzy.
  pebbler: { name: 'Pebbler', hp: 16, speed: 0, radius: 8, behavior: 'roller', contact: 1, blood: 'dust', animSpeed: 10, windSfx: 'rumble', roll: { trigger: 95, wind: 0.5, speed: 170, bounces: 2, dizzy: 1.3 } },
  // Boulderback: slow golem; raises its fists (0.8 s), slams: a shockwave ring of stones.
  boulderback: { name: 'Boulderback', hp: 30, speed: 14, radius: 12, behavior: 'slammer', contact: 1, blood: 'dust', animSpeed: 3, windSfx: 'growl', slam: { every: 3.4, wind: 0.8, count: 10, speed: 62 } },
  // Pick Ghoul: walks at you; up close it raises its pick (0.6 s, glinting), then swings in front of it.
  pickghoul: { name: 'Pick Ghoul', hp: 18, speed: 26, radius: 8, behavior: 'swinger', contact: 1, blood: 'red', animSpeed: 6, windSfx: 'growl', swing: { reach: 34, wind: 0.6, arc: 1.2, recover: 0.7 } },
  // Geode: a crystal-filled stone; glows brighter (0.9 s), then bursts a ring of shards.
  geode: { name: 'Geode', hp: 18, radius: 10, behavior: 'turret', static: true, contact: 1, blood: 'crystal', windSfx: 'chime', shoot: { every: 3.2, speed: 70, wind: 0.9, ring: 8, style: 'ice' } },
  // Rockhopper: small stone frog; two little hops, then a big one that slams a ring of stones.
  rockhopper: { name: 'Rockhopper', hp: 12, radius: 8, behavior: 'hopper', contact: 1, blood: 'dust', windSfx: 'croak', hop: { every: 0.6, dist: 40, wind: 0.3, air: 0.4, recover: 0.25, bigEvery: 3, bigDist: 80 }, landShots: { count: 6, speed: 60, style: 'dust' } },

  // ================================================================ The Ossuary (chapter 2, exclusive)
  // Bonewalker: when "killed" it falls into a pile of bones (break the pile!) or gets up 4 s later.
  bonewalker: { name: 'Bonewalker', hp: 14, speed: 30, radius: 8, behavior: 'chase', contact: 1, blood: 'bone', animSpeed: 7, windSfx: 'rattle', reassemble: { time: 4, pileHp: 7, wind: 0.8 } },
  // Shade: drifts through rock, mostly see-through; its face shows, it wails (0.6 s), then dashes through you.
  shade: { name: 'Shade', hp: 12, speed: 26, radius: 8, behavior: 'phaser', flying: true, ghost: true, contact: 1, blood: 'ghost', animSpeed: 7, windSfx: 'wail', dash: { every: [2.4, 3.4], wind: 0.6, speed: 190, time: 0.45 } },
  // Ossifier: keeps its distance, raises a bone (0.6 s) and throws it: it flies out and comes back.
  ossifier: { name: 'Ossifier', hp: 14, speed: 28, radius: 8, behavior: 'thrower', contact: 1, blood: 'bone', animSpeed: 7, windSfx: 'rattle', throw: { every: 3, wind: 0.6, speed: 150, range: 120 } },
  // Rattleskull: a floating skull; chatters (0.5 s), spits 3 teeth, then lunges a short way.
  rattleskull: { name: 'Rattleskull', hp: 9, speed: 34, radius: 7, behavior: 'skull', flying: true, contact: 1, blood: 'bone', animSpeed: 6, windSfx: 'rattle', shoot: { every: 2.6, speed: 82, wind: 0.5, count: 3, spread: 0.3, style: 'dust' }, lunge: { speed: 170, time: 0.3 } },
  // Lanternkeeper: slow; its lantern flares (0.7 s) and two slow wisps drift after you.
  lanternkeeper: { name: 'Lanternkeeper', hp: 18, speed: 14, radius: 9, behavior: 'tank', contact: 1, blood: 'ghost', animSpeed: 4, windSfx: 'chime', shoot: { every: 3.4, speed: 42, wind: 0.7, count: 2, spread: 0.8, style: 'ghost', seek: true } },
  // Cofferling: a closed coffin (shots barely scratch it). Rattles (0.6 s), bursts open lunging, sits open.
  cofferling: { name: 'Cofferling', hp: 18, radius: 9, behavior: 'lurker', contact: 1, blood: 'bone', windSfx: 'rattle', lurk: { trigger: 70, wind: 0.6, speed: 160, time: 0.3, exposed: 1.6, travel: 0, armored: 0.9 } },

  // ================================================================ The Sunken Caves (chapter 2, exclusive)
  // Leech: a fast wriggling worm.
  leech: { name: 'Leech', hp: 5, speed: 58, radius: 5, behavior: 'swarm', contact: 1, blood: 'red', animSpeed: 12 },
  // Snapjaw: only its fin shows above the water; bubbles rise (0.6 s, landing spot shown), it leaps out to bite.
  snapjaw: { name: 'Snapjaw', hp: 14, radius: 9, behavior: 'submerger', contact: 1, blood: 'red', animSpeed: 6, windSfx: 'bubble', hop: { dist: 110, wind: 0.6, air: 0.6, recover: 0.5 }, swim: { speed: 40, under: [1.6, 2.6] } },
  // Bloatfish: drifts; near you it swells up (0.6 s), then shoots its spikes in a ring and goes limp.
  bloatfish: { name: 'Bloatfish', hp: 12, speed: 22, radius: 8, behavior: 'puffer', flying: true, contact: 1, blood: 'green', animSpeed: 4, windSfx: 'bubble', puff: { trigger: 70, wind: 0.6, count: 8, speed: 70, rest: 1.6 } },
  // Drowned: shuffles after you; its cheeks bulge (0.7 s), then it spits a jet of water.
  drowned: { name: 'Drowned', hp: 18, speed: 17, radius: 8, behavior: 'tank', contact: 1, blood: 'green', animSpeed: 5, windSfx: 'gurgle', shoot: { every: 3, speed: 70, wind: 0.7, stream: 5, style: 'ice' } },
  // Eel: a head and five segments swimming in waves.
  eel: { name: 'Eel', hp: 10, speed: 46, radius: 7, behavior: 'crawler', contact: 1, blood: 'red', animSpeed: 8, wavy: true, segments: { count: 5, art: 'eelseg', hp: 6, radius: 6, spacing: 10 } },
  // Clam: a shell that shrugs off shots while closed; it opens (0.7 s, the pearl glows), fires 3 pearls, stays open a moment.
  clam: { name: 'Giant Clam', hp: 16, radius: 10, behavior: 'clam', static: true, contact: 1, blood: 'pale', windSfx: 'chime', shell: { closed: 2.4, wind: 0.7, open: 1.3, armor: 0.9 }, shoot: { speed: 60, count: 3, spread: 0.35, style: 'ice' } },

  // ================================================================ The Underhall (chapter 3, exclusive)
  // Chainling: swings an iron ball around itself (touching the ball hurts). Every few seconds it
  // winds up (0.7 s, the line shows) and hurls the ball at you on its chain, then reels it back.
  chainling: { name: 'Chainling', hp: 18, speed: 24, radius: 8, behavior: 'flail', contact: 1, blood: 'red', animSpeed: 6, windSfx: 'rattle', flail: { every: 3, wind: 0.7, reach: 110, orbit: 20, spin: 4, ball: 5 } },
  // Gargoyle: a statue (shots barely chip it). Line up with it and its eyes light up (0.6 s), it
  // flies straight at you, crashes, sits dazed, turns back to stone.
  gargoyle: { name: 'Gargoyle', hp: 22, radius: 10, behavior: 'statue', contact: 1, blood: 'dust', animSpeed: 6, windSfx: 'growl', charge: { wind: 0.6, speed: 190, stun: 1.2, maxTime: 1.6 }, stoneArmor: 0.85 },
  // Brute: a hulking jailer. Raises its fists (0.8 s) and pounds the floor: shockwaves run out in a
  // cross (or an x).
  brute: { name: 'Brute', hp: 34, speed: 18, radius: 12, behavior: 'pounder', contact: 1, blood: 'red', animSpeed: 5, windSfx: 'growl', pound: { every: 3.6, wind: 0.8, speed: 80, rows: 3 } },
  // Hookjaw: throws a hook on a chain (0.7 s wind-up, line shown). If it catches you, it reels you in.
  hookjaw: { name: 'Hookjaw', hp: 16, speed: 26, radius: 8, behavior: 'hooker', contact: 1, blood: 'red', animSpeed: 7, windSfx: 'rattle', hook: { every: 3.4, wind: 0.7, speed: 200, reach: 150, pull: 0.45 } },
  // Sentry Eye: floats slowly; its pupil narrows and a thin red line shows for 0.9 s, then it burns
  // a beam along that line for 0.6 s.
  sentryeye: { name: 'Sentry Eye', hp: 20, speed: 14, radius: 10, behavior: 'lasereye', flying: true, contact: 1, blood: 'red', animSpeed: 4, windSfx: 'hum', laser: { every: 3.8, wind: 0.9, time: 0.6, len: 220 } },
  // Ironclad: a knight behind a shield (shots from the front do 20%; it turns slowly). Up close it
  // sets its spear (0.5 s) and lunges.
  ironclad: { name: 'Ironclad', hp: 18, speed: 22, radius: 9, behavior: 'knight', contact: 1, blood: 'red', animSpeed: 6, windSfx: 'clink', frontArmor: 0.8, turnRate: 1.6, lunge: { range: 70, wind: 0.5, speed: 170, time: 0.3, recover: 0.8 } },

  // ================================================================ The Wax Tombs (chapter 3, exclusive)
  // Shroudling: shuffles; hurt it below half and it tears its wrappings off (0.6 s) and runs.
  shroudling: { name: 'Shroudling', hp: 20, speed: 18, radius: 8, behavior: 'shambler', contact: 1, blood: 'pale', animSpeed: 5, windSfx: 'wail', rage: { below: 0.5, wind: 0.6, speed: 54, art: 'shroudlingRage' } },
  // Mourner: a weeping statue that walks slowly; covers her face (0.8 s) and cries a ring of tears.
  mourner: { name: 'Mourner', hp: 22, speed: 14, radius: 8, behavior: 'tank', contact: 1, blood: 'dust', animSpeed: 4, windSfx: 'wail', shoot: { every: 3.4, speed: 56, wind: 0.8, ring: 8, style: 'ice' } },
  // Candlewight: strafes at a distance; its candle flares (0.55 s) and it flicks 3 violet flames.
  candlewight: { name: 'Candlewight', hp: 14, speed: 38, radius: 8, behavior: 'spitter', contact: 1, blood: 'pale', animSpeed: 8, windSfx: 'crackle', shoot: { every: 2.6, speed: 84, wind: 0.55, count: 3, spread: 0.3, style: 'violet' } },
  // Tomb Hand: cracks in the floor creep after you; they stop and glow (0.7 s), a hand bursts up.
  tombhand: { name: 'Tomb Hand', hp: 14, radius: 9, behavior: 'grabber', contact: 1, blood: 'pale', windSfx: 'rumble', grab: { speed: 50, track: [1.4, 2.2], wind: 0.7, up: 1.2 } },
  // Reliquary: a golden box; creaks open (0.6 s) and lets out a soul moth (2 at a time).
  reliquary: { name: 'Reliquary', hp: 24, radius: 10, behavior: 'spawner', static: true, contact: 1, blood: 'crystal', windSfx: 'chime', spawn: { type: 'soulmoth', every: 5, max: 2, wind: 0.6 } },
  // Soul Moth: a glowing violet moth that flutters at you.
  soulmoth: { name: 'Soul Moth', hp: 4, speed: 52, radius: 5, behavior: 'swarm', flying: true, contact: 1, blood: 'ghost', animSpeed: 14 },
  // Pallbearer: lines up with you, tilts its coffin back (0.6 s, snorts) and charges; dazed at walls.
  pallbearer: { name: 'Pallbearer', hp: 24, speed: 24, radius: 11, behavior: 'charger', contact: 1, blood: 'red', animSpeed: 8, windSfx: 'snort', charge: { wind: 0.6, speed: 160, stun: 1.4, maxTime: 2.2 } },

  // ================================================================ The Mire (chapter 3, exclusive)
  // Tarling: a fast little blob of tar; leaves a sticky trail (slows you, doesn't hurt).
  tarling: { name: 'Tarling', hp: 6, speed: 46, radius: 6, behavior: 'swarm', contact: 1, blood: 'tar', animSpeed: 8, trail: 'tar' },
  // Gulper: a bog toad. Its throat swells (0.6 s, the line shows), its tongue lashes out 90 px.
  gulper: { name: 'Gulper', hp: 20, speed: 20, radius: 11, behavior: 'tongue', contact: 1, blood: 'green', animSpeed: 4, windSfx: 'croak', tongue: { every: 2.8, wind: 0.6, reach: 92, out: 0.18, hold: 0.25 } },
  // Oozer: a slug; rears up (0.6 s) and spits a tar glob that leaves a tar puddle where it lands.
  oozer: { name: 'Oozer', hp: 16, speed: 20, radius: 9, behavior: 'spitter', contact: 1, blood: 'tar', animSpeed: 5, windSfx: 'gurgle', shoot: { every: 3, speed: 80, wind: 0.6, tar: true } },
  // Bloatfly: a swollen fly; when it pops it leaves a poison puddle and two tarlings.
  bloatfly: { name: 'Bloatfly', hp: 12, speed: 30, radius: 8, behavior: 'swarm', flying: true, contact: 1, blood: 'green', animSpeed: 12, deathSpawn: { type: 'tarling', count: 2, creep: 'poison' } },
  // Rotgut: a bog corpse; heaves (0.7 s) and vomits a fan of 5 bile shots.
  rotgut: { name: 'Rotgut', hp: 24, speed: 16, radius: 9, behavior: 'tank', contact: 1, blood: 'green', animSpeed: 5, windSfx: 'gurgle', shoot: { every: 3.2, speed: 74, wind: 0.7, count: 5, spread: 0.22, style: 'green' } },
  // Murkworm: a long black worm (head + 4 segments).
  murkworm: { name: 'Murkworm', hp: 12, speed: 40, radius: 7, behavior: 'crawler', contact: 1, blood: 'tar', animSpeed: 8, wavy: true, trail: 'tar', segments: { count: 4, art: 'murkseg', hp: 7, radius: 6, spacing: 10 } },

  // ================================================================ The Fleshworks (chapter 4, exclusive)
  // Pulper: a lump of meat; two short hops then a big one that splatters a ring of blood.
  pulper: { name: 'Pulper', hp: 14, radius: 9, behavior: 'hopper', contact: 1, blood: 'red', windSfx: 'squish', hop: { every: 0.7, dist: 46, wind: 0.35, air: 0.45, recover: 0.3, bigEvery: 3, bigDist: 90 }, landShots: { count: 8, speed: 66, style: 'blood' }, landCreep: 'blood' },
  // Clotling: a fast little fly of clotted blood.
  clotling: { name: 'Clotling', hp: 5, speed: 54, radius: 5, behavior: 'swarm', flying: true, contact: 1, blood: 'red', animSpeed: 16 },
  // Umbilic: tied to the floor by a cord; it rears up (0.6 s, line shown) and lunges as far as the cord lets it.
  umbilic: { name: 'Umbilic', hp: 18, radius: 9, behavior: 'tethered', contact: 1, blood: 'red', animSpeed: 5, windSfx: 'growl', tether: { length: 70, every: 2.4, wind: 0.6, speed: 210 } },
  // Gutworm: moves under the floor (a ripple), surfaces with a shudder, spits a fan of blood, sinks.
  gutworm: {
    name: 'Gutworm', hp: 18, radius: 9, behavior: 'burrower', contact: 1, blood: 'red', windSfx: 'gurgle',
    burrow: { speed: 46, time: [1.3, 2.2], emerge: 0.7, stay: 1.8 }, shoot: { speed: 82, wind: 0.5, count: 5, spread: 0.22 },
  },
  // Thumper: an organ rooted in the floor; it swells (0.6 s) and beats out a ring of blood.
  thumper: { name: 'Thumper', hp: 26, radius: 11, behavior: 'turret', static: true, contact: 1, blood: 'red', windSfx: 'thump', shoot: { every: 2.2, speed: 60, wind: 0.6, ring: 10, style: 'blood' } },
  // Fetch: a pale unborn ghost drifting through rocks; it cries (0.7 s) three slow tears that follow you.
  fetch: { name: 'Fetch', hp: 14, speed: 20, radius: 8, behavior: 'tank', flying: true, ghost: true, contact: 1, blood: 'ghost', animSpeed: 6, windSfx: 'wail', shoot: { every: 3.2, speed: 46, wind: 0.7, count: 3, spread: 0.6, style: 'ghost', seek: true } },

  // ================================================================ The Black Womb (chapter 4, exclusive)
  // Gloom: a shadow flat on the floor (can't be hit). Get close: it rises (0.6 s, line shown), swipes, then stands dazed.
  gloom: { name: 'Gloom', hp: 18, radius: 9, behavior: 'lurker', contact: 1, blood: 'ghost', windSfx: 'wail', lurk: { trigger: 70, wind: 0.6, speed: 170, time: 0.3, exposed: 1.4, travel: 1 } },
  // Blacktongue: its mouth gapes (0.6 s, line shown), then a long tongue lashes out.
  blacktongue: { name: 'Blacktongue', hp: 20, speed: 22, radius: 9, behavior: 'tongue', contact: 1, blood: 'tar', animSpeed: 5, windSfx: 'hiss', tongue: { every: 2.6, wind: 0.6, reach: 104, out: 0.16, hold: 0.25 } },
  // Weeper: an eyeless thing crying black bile; leaves a trail of it and spits a fan (0.6 s).
  weeper: { name: 'Weeper', hp: 22, speed: 18, radius: 8, behavior: 'tank', contact: 1, blood: 'tar', animSpeed: 5, windSfx: 'wail', trail: 'poison', shoot: { every: 3, speed: 72, wind: 0.6, count: 3, spread: 0.3, style: 'violet' } },
  // Mawling: almost all mouth. Lines up with you, snorts (0.5 s), charges; dazed at walls.
  mawling: { name: 'Mawling', hp: 22, speed: 30, radius: 10, behavior: 'charger', contact: 1, blood: 'tar', animSpeed: 8, windSfx: 'snort', charge: { speed: 195, wind: 0.5, stun: 1, maxTime: 2 } },
  // Eyestalk: an eye on a stalk rooted in the floor; a thin red line shows (0.9 s), then it burns a beam.
  eyestalk: { name: 'Eyestalk', hp: 20, radius: 8, behavior: 'lasereye', static: true, contact: 1, blood: 'red', animSpeed: 3, windSfx: 'hum', laser: { every: 3.4, wind: 0.9, time: 0.6, len: 230 } },
  // Nightfly: hovers at a distance, its eyes light up (0.6 s, line shown), it dives; dazed after.
  nightfly: {
    name: 'Nightfly', hp: 12, speed: 50, radius: 7, behavior: 'diver', flying: true, contact: 1, blood: 'tar', animSpeed: 14, windSfx: 'buzz',
    dive: { every: [1.6, 2.6], wind: 0.6, speed: 240, time: 0.45, stun: 0.9, hover: 76 },
  },

  // ================================================================ The Scarred Womb (chapter 4, exclusive)
  // Stitchling: a doll of scar tissue; when it dies it splits into its two halves.
  stitchling: { name: 'Stitchling', hp: 16, speed: 28, radius: 8, behavior: 'chase', contact: 1, blood: 'red', animSpeed: 7, deathSpawn: { type: 'stitchhalf', count: 2 } },
  stitchhalf: { name: 'Stitchling Half', hp: 7, speed: 40, radius: 6, behavior: 'chase', contact: 1, blood: 'red', animSpeed: 9, noChampion: true },
  // Scab: a crusted beetle; its front is hard (shots do 25%) and turns slowly. Rears (0.6 s), flicks 3 shards.
  scab: { name: 'Scab', hp: 22, speed: 18, radius: 10, behavior: 'tank', contact: 1, blood: 'red', animSpeed: 5, windSfx: 'clink', frontArmor: 0.75, turnRate: 1.5, shoot: { every: 3, speed: 76, wind: 0.6, count: 3, spread: 0.3, style: 'bone' } },
  // Suture: a long worm of thread (head + 5 segments).
  suture: { name: 'Suture', hp: 12, speed: 44, radius: 7, behavior: 'crawler', contact: 1, blood: 'red', animSpeed: 8, segments: { count: 5, art: 'sutureseg', hp: 7, radius: 6, spacing: 10 } },
  // Lancer: sets its sharpened rib (0.5 s, line shown) and lunges.
  lancer: { name: 'Lancer', hp: 18, speed: 26, radius: 9, behavior: 'knight', contact: 1, blood: 'red', animSpeed: 6, windSfx: 'growl', lunge: { range: 80, wind: 0.5, speed: 190, time: 0.32, recover: 0.7 } },
  // Picker: a small skittering thing with long fingers.
  picker: { name: 'Picker', hp: 6, speed: 70, radius: 5, behavior: 'skitter', contact: 1, blood: 'red', animSpeed: 14 },
  // Bonecage: a ribcage curled into a ball; uncurls (0.5 s), rolls at you bouncing off walls, sits dizzy.
  bonecage: { name: 'Bonecage', hp: 20, speed: 0, radius: 8, behavior: 'roller', contact: 1, blood: 'bone', animSpeed: 10, windSfx: 'rattle', roll: { trigger: 110, wind: 0.5, speed: 185, bounces: 2, dizzy: 1.2 } },

  // ================================================================ minibosses
  // Rat Matron: lines up and charges like a ratram, and squeals to call gnawers out of the walls.
  ratmatron: {
    name: 'Rat Matron', hp: 120, speed: 32, radius: 15, behavior: 'matron', contact: 2, blood: 'red', animSpeed: 8, windSfx: 'snort', mini: true, noChampion: true,
    charge: { speed: 175, wind: 0.65, stun: 1.3, maxTime: 2 }, summon: { type: 'gnawer', count: 2, wind: 0.8, max: 4 },
  },
  // Ember Hound: charges trailing fire (0.65 s wind-up) and breathes fire up close (0.8 s wind-up).
  emberhound: {
    name: 'Ember Hound', hp: 140, speed: 34, radius: 15, behavior: 'hound', contact: 2, blood: 'ember', animSpeed: 9, windSfx: 'growl', mini: true, noChampion: true,
    chargeTrail: 'fire', charge: { speed: 185, wind: 0.65, stun: 1.2, maxTime: 2 },
    breath: { range: 95, wind: 0.8, time: 1.1, recover: 0.9, cone: 0.5, speed: 115 },
  },
  // Stonemaw: rolls across the room bouncing off walls, slams shockwaves, shakes rocks loose from the ceiling.
  stonemaw: {
    name: 'Stonemaw', hp: 150, radius: 15, behavior: 'stonemaw', contact: 2, blood: 'dust', animSpeed: 6, windSfx: 'rumble', mini: true, noChampion: true,
    roll: { trigger: 999, wind: 0.7, speed: 160, bounces: 3, dizzy: 1.4 }, slam: { wind: 0.8, count: 12, speed: 64 },
  },
  // Bone Colossus: stomps a shockwave, throws three bones that come back, and gets up once after falling.
  bonecolossus: {
    name: 'Bone Colossus', hp: 150, speed: 18, radius: 14, behavior: 'colossus', contact: 2, blood: 'bone', animSpeed: 5, windSfx: 'rattle', mini: true, noChampion: true,
    slam: { wind: 0.8, count: 10, speed: 60 }, throw: { wind: 0.7, speed: 150, range: 140, count: 3 }, reassemble: { time: 3, pileHp: 30, wind: 1 },
  },
  // The Undertow: a huge snapjaw: lurks under the water, leaps across the room, spits water fans.
  undertow: {
    name: 'The Undertow', hp: 150, radius: 15, behavior: 'submerger', contact: 2, blood: 'red', animSpeed: 5, windSfx: 'bubble', mini: true, noChampion: true,
    hop: { dist: 160, wind: 0.75, air: 0.75, recover: 0.8 }, swim: { speed: 50, under: [1.2, 2] }, landShots: { count: 10, speed: 62, style: 'ice' },
    shoot: { speed: 75, count: 5, spread: 0.3, style: 'ice' },
  },
  // The Mother of Clots: a quivering mass of blood: leaps (landing shown) into a ring and a blood puddle, spits clots, births clotlings.
  clotmother: {
    name: 'The Mother of Clots', hp: 200, speed: 14, radius: 16, behavior: 'loom', contact: 2, blood: 'red', animSpeed: 4, windSfx: 'squish', mini: true, noChampion: true,
    hop: { dist: 130, wind: 0.75, air: 0.7, recover: 0.7 }, landShots: { count: 12, speed: 60, style: 'blood' }, landCreep: 'blood',
    shoot: { wind: 0.65, speed: 84, count: 5, spread: 0.24, style: 'blood' },
    summon: { type: 'clotling', count: 3, wind: 0.8, max: 4 },
  },
  // The Hollow Mother: a tall veiled shadow: glides at you (leap), throws a fan of dark wisps, calls nightflies.
  hollowmother: {
    name: 'The Hollow Mother', hp: 190, speed: 18, radius: 13, behavior: 'loom', contact: 2, blood: 'tar', animSpeed: 4, windSfx: 'wail', mini: true, noChampion: true, flying: true,
    hop: { dist: 150, wind: 0.7, air: 0.6, recover: 0.6 }, landShots: { count: 10, speed: 58, style: 'violet' },
    shoot: { wind: 0.7, speed: 50, count: 4, spread: 0.45, style: 'ghost', seek: true },
    summon: { type: 'nightfly', count: 2, wind: 0.8, max: 3 },
  },
  // The Surgeon: a stitched giant with scalpel fingers: slams, throws three scalpels that come back.
  surgeon: {
    name: 'The Surgeon', hp: 200, speed: 20, radius: 14, behavior: 'colossus', contact: 2, blood: 'red', animSpeed: 5, windSfx: 'growl', mini: true, noChampion: true,
    slam: { wind: 0.8, count: 12, speed: 64 }, throw: { wind: 0.65, speed: 160, range: 150, count: 3 },
  },
  // The Jailer: swings a huge ball and chain, hurls it, pounds shockwaves, calls chainlings.
  jailer: {
    name: 'The Jailer', hp: 180, speed: 18, radius: 15, behavior: 'jailer', contact: 2, blood: 'red', animSpeed: 5, windSfx: 'growl', mini: true, noChampion: true,
    flail: { wind: 0.75, reach: 130, orbit: 28, spin: 3.4, ball: 8 }, pound: { wind: 0.85, speed: 82, rows: 4 },
    summon: { type: 'chainling', count: 2, wind: 0.8, max: 2 },
  },
  // The Embalmer: throws fans of needles, leaps, wraps the dead back up (calls shroudlings).
  embalmer: {
    name: 'The Embalmer', hp: 170, speed: 22, radius: 13, behavior: 'loom', contact: 2, blood: 'pale', animSpeed: 5, windSfx: 'wail', mini: true, noChampion: true,
    hop: { dist: 140, wind: 0.7, air: 0.65, recover: 0.6 }, landShots: { count: 10, speed: 64, style: 'violet' },
    shoot: { wind: 0.65, speed: 96, count: 5, spread: 0.2, style: 'bone' },
    summon: { type: 'shroudling', count: 2, wind: 0.8, max: 3 },
  },
  // The Bog Mother: a mound of tar: spits tar globs, leaps (tar puddles where she lands), births tarlings.
  bogmother: {
    name: 'The Bog Mother', hp: 180, speed: 14, radius: 16, behavior: 'loom', contact: 2, blood: 'tar', animSpeed: 4, windSfx: 'gurgle', mini: true, noChampion: true, landTar: true,
    hop: { dist: 130, wind: 0.75, air: 0.7, recover: 0.7 }, landShots: { count: 10, speed: 58, style: 'violet' },
    shoot: { wind: 0.7, speed: 80, count: 3, spread: 0.4, tar: true },
    summon: { type: 'tarling', count: 3, wind: 0.8, max: 4 },
  },
  // Loom Mother: leaps across the room (a ring of shots and a web where she lands), spits a fan of
  // web globs, and calls crawlspiders. Every move has a wind-up.
  loommother: {
    name: 'Loom Mother', hp: 130, speed: 22, radius: 15, behavior: 'loom', contact: 2, blood: 'tar', animSpeed: 8, windSfx: 'hiss', mini: true, noChampion: true,
    hop: { dist: 150, wind: 0.7, air: 0.8, recover: 0.8 }, landShots: { count: 8, speed: 66 },
    shoot: { speed: 90, wind: 0.7, count: 3, spread: 0.4, web: true }, summon: { type: 'crawlspider', count: 2, wind: 0.8, max: 4 },
  },

  // ================================================================ deeper chapters (placeholders until rebuilt)
  sludge: { name: 'Sludge', hp: 16, speed: 19, radius: 10, behavior: 'chase', contact: 1, blood: 'tar', split: { type: 'sludgeling', count: 2 } },
  sludgeling: { name: 'Sludgeling', hp: 6, speed: 36, radius: 6, behavior: 'chase', contact: 1, blood: 'tar', animSpeed: 7, noChampion: true },
  draft: { name: 'Draft', hp: 10, speed: 22, radius: 8, behavior: 'drift', flying: true, ghost: true, contact: 1, blood: 'ghost', animSpeed: 6 },
  husk: { name: 'Wax Husk', hp: 14, speed: 13, radius: 8, behavior: 'cross', contact: 1, blood: 'wax', animSpeed: 6, windSfx: 'chirp', shoot: { every: 2.8, speed: 72, wind: 0.55 } },
  huskRotten: { base: 'husk', name: 'Rotten Husk', hp: 20, rotten: true, shoot: { every: 2.4, speed: 75, wind: 0.55, alternate: true } },
};

export const BLOOD = {
  green: ['#3e4a24', '#5a6a34', '#2a3418'],
  red: ['#6a1216', '#9a1c20', '#3a0a0c'],
  dust: ['#6a5a48', '#8a7a62', '#4a3e32'],
  pale: ['#c8b8a0', '#9a8a74', '#8a3030'],
  tar: ['#2a1c2a', '#3a2a3a', '#5a4060'],
  ghost: ['#c8d0d8', '#8a96a4', '#e8f0f8'],
  wax: ['#8a7a5e', '#5a4c3a', '#c9b48a'],
  ember: ['#f04a24', '#ffd25a', '#5a1008'],
  ash: ['#45403c', '#837a72', '#f08a24'],
  crystal: ['#3a86c0', '#7ac4f0', '#d8f4ff'],
  bone: ['#bcb49e', '#9a927e', '#e0d8c2'],
};

// Resolve `base` inheritance once.
const resolved = {};
export function enemyDef(type) {
  if (resolved[type]) return resolved[type];
  const raw = ENEMIES[type];
  if (!raw) throw new Error(`Unknown enemy type "${type}"`);
  const def = raw.base ? { ...enemyDef(raw.base), ...raw } : { ...raw };
  def.type = type;
  def.art ??= raw.base ? enemyDef(raw.base).art : type;
  resolved[type] = def;
  return def;
}

// How much each enemy counts against a room's enemy budget (src/data/floors.js `threat`).
// A room stops filling its spawn markers once the budget is spent, so big rooms and unlucky
// rolls can't pile up more than a fair fight. Rotten versions cost 1.5x. Default 1.
export const THREAT = {
  blob: 1, moth: 0.8, eye: 1.5, ratram: 1.6, toad: 1.2, sac: 2.5, mite: 0.4,
  pestfly: 0.5, divebuzzer: 1.5, mudworm: 1.6, bristleworm: 2.6, gnawer: 1.1, gawper: 1.2,
  shriekbat: 1.3, pebbler: 1.4, boulderback: 2, pickghoul: 1.5, geode: 1.6, rockhopper: 1.3,
  bonewalker: 1.3, shade: 1.4, ossifier: 1.5, rattleskull: 1.1, lanternkeeper: 1.6, cofferling: 1.5,
  chainling: 1.6, gargoyle: 1.6, brute: 2.2, hookjaw: 1.6, sentryeye: 1.8, ironclad: 1.6,
  shroudling: 1.4, mourner: 1.7, candlewight: 1.4, tombhand: 1.5, reliquary: 2.5, soulmoth: 0.6, pallbearer: 1.7,
  pulper: 1.7, clotling: 0.7, umbilic: 1.6, gutworm: 1.7, thumper: 2.2, fetch: 1.6,
  gloom: 1.6, blacktongue: 1.7, weeper: 1.8, mawling: 1.8, eyestalk: 1.8, nightfly: 1.5,
  stitchling: 1.8, stitchhalf: 0.7, scab: 1.8, suture: 2.4, lancer: 1.7, picker: 0.7, bonecage: 1.6,
  tarling: 0.6, gulper: 1.6, oozer: 1.5, bloatfly: 1.5, rotgut: 1.7, murkworm: 2.2,
  leech: 0.6, snapjaw: 1.5, bloatfish: 1.3, drowned: 1.5, eel: 2.4, clam: 1.6,
  cinderling: 0.7, ashwalker: 1.3, flickerwisp: 1.4, kindler: 1.4, smokebelly: 1.8, scorchrat: 1.7, clinker: 1.5, coalbit: 0.4,
  crawlspider: 0.6, bigleg: 1.6, broodnest: 2.5, webspitter: 1.4, mossback: 1.7, mosslurker: 1.3, hanger: 1.3,
  sludge: 1.4, sludgeling: 0.5, draft: 1.2, husk: 1.5,
};
export function threatOf(type) {
  const def = enemyDef(type);
  const base = THREAT[type] ?? THREAT[def.base] ?? 1;
  return def.rotten ? base * 1.5 : base;
}

// Spawners in one room share this many live minions at most (egg sacs hatching mites...).
export const ROOM_MINION_CAP = 4;
