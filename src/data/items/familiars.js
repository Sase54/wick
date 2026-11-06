// Part 6, batch 2: HELPERS (familiars), 35 items. Behaviors live in src/game/familiars.js
// (`follower: { kind: 'helper', move, attack, ... }`); each helper is drawn with its own item icon.
// `say` is the line shown under the item's name.
export const ITEMS = {
  // ------------------------------------------------------------------ shooters
  sootsister: {
    name: 'Soot Sister', desc: 'She got the good wax.', type: 'passive', quality: 2,
    lore: 'A sooty little candle in a pink bow. She trails behind you and shoots hot wax where you shoot: stronger than a buddy, a little slower, and sometimes it sets things alight.',
    pools: { treasure: 1, crane: 0.8, greedTreasure: 1 }, tags: ['brood'], unlock: 'kills100', look: { costume: 'sootcheeks' },
    follower: { kind: 'helper', move: 'trail', attack: 'aim', damage: 5, fireRate: 1.4, shot: { style: 'ember', burn: 0.15, r: 3 }, say: 'A SISTER WHO SHOOTS HOT WAX WHERE YOU SHOOT' },
  },
  shadowself: {
    name: 'Shadow Self', desc: 'It has your moves. And your grudges.', type: 'passive', quality: 4,
    lore: 'Your own shadow, peeled off the floor. It follows you and attacks with whatever you attack with (shots, beams, knives, swords...) at three quarters of your damage, with all your shot effects.',
    pools: { devil: 1, redChest: 0.3, greedDevil: 1 }, tags: ['horned'], unlock: 'devil10', look: { costume: 'shadoweyes' },
    follower: { kind: 'helper', move: 'trail', mimic: true, copy: true, say: 'A SHADOW THAT ATTACKS WITH YOUR WEAPON' },
  },
  tinyhorns: {
    name: 'Little Horned One', desc: 'Small, red and spiteful.', type: 'passive', quality: 1,
    lore: 'A tiny imp who sits on your shoulder and spits at whatever comes close. It aims by itself, so it keeps shooting even when you do not.',
    pools: { devil: 0.6, treasure: 0.8, greedTreasure: 0.8 }, tags: ['horned'], unlock: 'boss3', look: { costume: 'imptail' },
    follower: { kind: 'helper', move: 'hover', attack: 'target', damage: 3, fireRate: 2.5, reach: 120, shot: { style: 'red', r: 2 }, say: 'AN IMP THAT SHOOTS THE NEAREST ENEMY BY ITSELF' },
  },
  tintinker: {
    name: 'Tin Tinker', desc: 'Batteries not included. Lasers are.', type: 'passive', quality: 2,
    lore: 'A wind-up tin robot with one red eye. It follows you and fires a thin laser where you shoot that goes through every enemy in a line.',
    pools: { treasure: 1, batteryBeggar: 0.8, greedTreasure: 1 }, tags: ['livewire'], unlock: 'actives40', look: { costume: 'antenna' },
    follower: { kind: 'helper', move: 'trail', attack: 'aim', damage: 3.5, fireRate: 0.9, shot: { laser: true, style: 'red' }, say: 'A TIN TOY THAT FIRES LASERS WHERE YOU SHOOT' },
  },
  hellmouth: {
    name: 'Little Hellmouth', desc: 'Small mouth. Big opinions.', type: 'passive', quality: 3,
    lore: 'A little head with a furnace for a mouth. While you hold shoot it fills up; let go and it breathes a blood-red beam across the whole room that hurts everything in it.',
    pools: { devil: 1, greedDevil: 1 }, tags: ['horned'], unlock: 'devil3',
    follower: { kind: 'helper', move: 'trail', attack: 'charge', damage: 2.5, charge: { kind: 'beam', time: 1.3, life: 0.6, width: 7, style: 'red' }, say: 'HOLD SHOOT TO CHARGE ITS BEAM, LET GO TO FIRE' },
  },
  jester: {
    name: 'Two-Faced Jester', desc: 'Half of it is laughing at you.', type: 'passive', quality: 2,
    lore: 'A jester doll with a white face on one side and a black one on the other. It fires two shots at a time in a wide V where you shoot.',
    pools: { treasure: 1, crane: 0.6, greedTreasure: 1 }, tags: ['brood'], unlock: 'items60', look: { costume: 'ruffle' },
    follower: { kind: 'helper', move: 'trail', attack: 'aim', damage: 3.5, fireRate: 1.6, shot: { count: 2, spread: 0.45 }, say: 'SHOOTS TWO SHOTS IN A V WHERE YOU SHOOT' },
  },
  oilslick: {
    name: 'Oil-Slick Child', desc: 'Every color. None of them nice.', type: 'passive', quality: 2,
    lore: 'A puddle of lamp oil that got up and started following you. Every shot it fires has a random effect: burning, poison, slowing, freezing, fear or charm.',
    pools: { treasure: 1, crane: 0.8, greedTreasure: 1 }, tags: ['brood'], unlock: 'cards25', look: { costume: 'sheen' },
    follower: { kind: 'helper', move: 'trail', attack: 'aim', damage: 3, fireRate: 1.4, shot: { random: true }, say: 'EVERY SHOT HAS A RANDOM EFFECT' },
  },
  lanternghost: {
    name: 'Lantern Ghost', desc: 'Lights the way. Through walls.', type: 'passive', quality: 2,
    lore: 'A little ghost carrying a lantern. It floats after you and fires pale shots that fly over rocks and through enemies.',
    pools: { treasure: 1, angel: 0.5, greedTreasure: 1 }, tags: ['spectre'], unlock: 'secrets6',
    follower: { kind: 'helper', move: 'trail', fly: true, attack: 'aim', damage: 3.5, fireRate: 1.2, shot: { pierce: true, spectral: true, style: 'ghost', r: 4 }, say: 'GHOST SHOTS: THROUGH ENEMIES, OVER ROCKS' },
  },
  mirrorkin: {
    name: 'Mirror Kin', desc: 'Your left is its right.', type: 'passive', quality: 1,
    lore: 'A hand mirror whose reflection walked out. It always stands on the opposite side of the room from you and shoots the other way, so it covers your back.',
    pools: { treasure: 1, greedTreasure: 1 }, tags: ['brood'], unlock: 'noHit3',
    follower: { kind: 'helper', move: 'mirror', attack: 'aim', damage: 3.5, fireRate: 1.8, say: 'STANDS OPPOSITE YOU AND SHOOTS THE OTHER WAY' },
  },
  fourwayimp: {
    name: 'Four-Way Imp', desc: 'Cannot pick a side. Picks all of them.', type: 'passive', quality: 2,
    lore: 'A tiny devil with a compass rose scratched into its forehead. Whenever it shoots, it shoots in all four directions at once.',
    pools: { devil: 0.6, treasure: 0.6, greedTreasure: 0.6 }, tags: ['horned'], unlock: 'win_brick',
    follower: { kind: 'helper', move: 'trail', attack: 'aim', damage: 3.5, fireRate: 1.3, shot: { dirs: 'cross', style: 'red' }, say: 'SHOOTS IN FOUR DIRECTIONS AT ONCE' },
  },
  gutbucket: {
    name: 'Little Gutbucket', desc: 'Do not look inside.', type: 'passive', quality: 3,
    lore: 'A wooden bucket that is, somehow, hungry. Hold shoot and it fills up; let go and it spews a messy spray of shots in front of it.',
    pools: { treasure: 1, rottenBeggar: 0.6, greedTreasure: 1 }, tags: ['bloated'], unlock: 'win_vesper',
    follower: { kind: 'helper', move: 'trail', attack: 'charge', damage: 3.5, charge: { kind: 'spray', time: 1.2, n: 10, style: 'blood' }, say: 'HOLD SHOOT TO FILL IT, LET GO FOR A SPRAY OF SHOTS' },
  },
  waxcherub: {
    name: 'Wax Cherub', desc: 'Cute. Armed.', type: 'passive', quality: 3,
    lore: 'A little winged face molded from church candles. It flies after you and fires strong pearly shots that seek out enemies.',
    pools: { angel: 1, greedAngel: 1 }, tags: ['seraph'], unlock: 'win_beacon',
    follower: { kind: 'helper', move: 'trail', fly: true, attack: 'aim', damage: 4.5, fireRate: 1.8, shot: { homing: true, style: 'pearl' }, say: 'A CHERUB THAT FIRES HOMING SHOTS' },
  },

  // ------------------------------------------------------------------ orbitals and blockers
  altardagger: {
    name: 'Altar Dagger', desc: 'Sharp end out, please.', type: 'passive', quality: 3,
    lore: 'A ceremonial dagger that circles you point first, very fast. It cuts deep (15 per hit) and blocks enemy shots.',
    pools: { angel: 1, greedAngel: 1 }, tags: ['seraph'], unlock: 'angel10',
    follower: { kind: 'helper', move: 'orbit', radius: 22, speed: 4.4, attack: 'contact', damage: 15, gap: 0.3, blocks: true, flip: false, say: 'A DAGGER CIRCLES YOU: BIG HITS, BLOCKS SHOTS' },
  },
  guardianfeather: {
    name: 'Guardian Feather', desc: 'Light as a feather. Faster than one.', type: 'passive', quality: 2,
    lore: 'A white feather that never stops moving. It whips around you close and fast, blocking shots and hitting whatever it brushes.',
    pools: { angel: 1, greedAngel: 1 }, tags: ['seraph'], unlock: 'angel3', look: { costume: 'earfeather' },
    follower: { kind: 'helper', move: 'orbit', radius: 18, speed: 6.5, attack: 'contact', damage: 7, blocks: true, r: 6, flip: false, say: 'A FAST, CLOSE ORBIT THAT BLOCKS SHOTS' },
  },
  lonelyfly: {
    name: 'Lonely Fly', desc: 'Finally, a friend.', type: 'passive', quality: 1,
    lore: 'One fly, all on its own. It circles you slowly, gets in the way of enemy shots and nibbles enemies it bumps into.',
    pools: { treasure: 1, rottenBeggar: 0.6, greedTreasure: 1 }, tags: ['mothkin'], unlock: 'kills100',
    follower: { kind: 'helper', move: 'orbit', radius: 16, speed: 2.2, attack: 'contact', damage: 2, blocks: true, say: 'A FLY ORBITS YOU AND BLOCKS SHOTS' },
  },
  mindfulfly: {
    name: 'Mindful Fly', desc: 'Sees it coming.', type: 'passive', quality: 3,
    lore: 'A fly with a third eye that glows. It drifts around you, and when an enemy shot comes close it darts over and swallows it.',
    pools: { treasure: 0.8, angel: 0.6, greedTreasure: 0.8 }, tags: ['mothkin'], unlock: 'noHit8',
    follower: { kind: 'helper', move: 'orbit', radius: 26, speed: 2.6, attack: 'hunt', reach: 70, damage: 2, blocks: true, say: 'HUNTS DOWN ENEMY SHOTS NEAR YOU' },
  },
  brassdoorstop: {
    name: 'Brass Doorstop', desc: 'Nothing gets past. Not even doors.', type: 'passive', quality: 2,
    lore: 'A heavy brass doorstop that slides along the floor by itself. It always puts itself between you and the closest enemy or enemy shot, and blocks shots.',
    pools: { shop: 1, greedShop: 1 }, unlock: 'shop30',
    follower: { kind: 'helper', move: 'guard', blocks: true, r: 7, touch: 2, flip: false, say: 'STEPS BETWEEN YOU AND DANGER, BLOCKS SHOTS' },
  },

  // ------------------------------------------------------------------ biters and fighters
  cellarleech: {
    name: 'Cellar Leech', desc: 'Give a little, take a little.', type: 'passive', quality: 2,
    lore: 'A fat leech from the damp bricks. It chases enemies and latches on; every enemy it finishes off heals you half a heart.',
    pools: { treasure: 1, rottenBeggar: 1, greedTreasure: 1 }, tags: ['moldering'], unlock: 'deaths20', look: { costume: 'leechcheek' },
    follower: { kind: 'helper', move: 'chase', speed: 75, attack: 'contact', damage: 3, gap: 0.35, heal: { kill: 1 }, say: 'CHASES ENEMIES, HEALS YOU WHEN IT KILLS' },
  },
  chubbygrub: {
    name: 'Chubby Grub', desc: 'Built for throwing.', type: 'passive', quality: 2,
    lore: 'A fat white grub. When you shoot, it launches itself that way and chews through everything until it hits a wall, then wriggles back to you.',
    pools: { treasure: 1, rottenBeggar: 0.6, greedTreasure: 1 }, tags: ['brood'], unlock: 'boss3',
    follower: { kind: 'helper', move: 'trail', attack: 'throw', damage: 3, reach: 170, say: 'FLUNG WHERE YOU SHOOT, CHEWS THROUGH ENEMIES' },
  },
  crowskull: {
    name: 'Crow Skull', desc: 'It only wakes up for drama.', type: 'passive', quality: 1,
    lore: 'A crow skull that sleeps in your pocket. The first time you get hurt in a room, it bursts out and pecks at enemies for the rest of the room.',
    pools: { treasure: 1, greedTreasure: 1 }, tags: ['ossuary'], unlock: 'deaths20',
    follower: { kind: 'helper', move: 'chase', speed: 120, fly: true, attack: 'contact', damage: 4, gap: 0.3, wake: 'hurt', say: 'WAKES WHEN YOU ARE HURT AND PECKS ENEMIES' },
  },
  lodger: {
    name: 'Long-Legged Lodger', desc: 'Rent is paid in stomps.', type: 'passive', quality: 3,
    lore: 'Something with very long legs lives in the rafters. Every few seconds it picks an enemy, its shadow follows it, and it stomps down hard on that spot.',
    pools: { treasure: 0.8, secret: 0.6, greedTreasure: 0.8 }, tags: ['spiderkin'], unlock: 'secrets12',
    follower: { kind: 'helper', move: 'trail', attack: 'stomp', every: 2.5, damage: 20, say: 'STOMPS ON ENEMIES FROM ABOVE' },
  },
  fusemouse: {
    name: 'Fuse Mouse', desc: 'Very brave. Very brief.', type: 'passive', quality: 2,
    lore: 'A grey mouse with a fuse for a tail. It runs at the nearest enemy and explodes (never hurting you), then comes back a few seconds later, somehow.',
    pools: { treasure: 1, bombBeggar: 1, greedTreasure: 1 }, tags: ['bonfire'], unlock: 'chests30',
    follower: { kind: 'helper', move: 'trail', attack: 'bomb', damage: 40, radius: 30, respawn: 6, speed: 110, say: 'RUNS AT ENEMIES AND EXPLODES, THEN COMES BACK' },
  },
  lanternmoth: {
    name: 'Lantern Moth', desc: 'Its light hurts. On purpose.', type: 'passive', quality: 3,
    lore: 'A moth whose belly glows like a coal. It drifts around near you in a ring of light, and enemies inside the light burn.',
    pools: { treasure: 1, planetarium: 0.5, angel: 0.5, greedTreasure: 1 }, tags: ['mothkin'], unlock: 'win_pip', look: { costume: 'motes' },
    follower: { kind: 'helper', move: 'roam', speed: 28, fly: true, attack: 'aura', damage: 8, aura: { radius: 30, status: 'burn', color: '#ffd25a' }, say: 'A RING OF LIGHT THAT BURNS ENEMIES IN IT' },
  },

  // ------------------------------------------------------------------ growers
  tallowlump: {
    name: 'Lump of Tallow', desc: 'It is getting ideas.', type: 'passive', quality: 2,
    lore: 'A lump of raw tallow with a face pressed in. It starts out circling you and blocking shots. Clear rooms and it grows: after 5 it also shoots, after 12 it climbs down and bites enemies, after 22 it is big and mean.',
    pools: { treasure: 1, boss: 0.6, rottenBeggar: 0.6, greedTreasure: 1 }, tags: ['bloated'], unlock: 'boss8',
    follower: {
      kind: 'helper', move: 'orbit', radius: 20, speed: 3.6, attack: 'contact', damage: 3.5, blocks: true,
      levels: {
        by: 'rooms', per: 'run', at: [0, 5, 12, 22],
        stages: [{}, { attack: 'aim', touch: 3.5, fireRate: 1.5 }, { move: 'chase', attack: 'contact', damage: 6, speed: 80, blocks: false, scale: 1.25 }, { move: 'chase', attack: 'contact', damage: 10, speed: 95, gap: 0.2, scale: 1.6 }],
      },
      say: 'GROWS AS YOU CLEAR ROOMS: ORBITER, SHOOTER, BITER',
    },
  },
  dustbunny: {
    name: 'Dust Bunny', desc: 'Gets bigger. Gets angrier.', type: 'passive', quality: 3,
    lore: 'A ball of fluff from under the bed. It circles you and blocks shots, and every enemy it kills makes it bigger and stronger, until the floor is over.',
    pools: { treasure: 1, greedTreasure: 1 }, tags: ['ninelives'], unlock: 'kills1000',
    follower: {
      kind: 'helper', move: 'orbit', radius: 26, speed: 2.6, attack: 'contact', damage: 3, blocks: true,
      levels: { by: 'kills', per: 'floor', at: [0], grow: { scale: 0.08, damage: 0.6, max: 12 } },
      say: 'GROWS WITH EVERY KILL UNTIL THE FLOOR ENDS',
    },
  },

  // ------------------------------------------------------------------ droppers
  coinpurse: {
    name: 'Coin Purse', desc: 'It jingles when it walks.', type: 'passive', quality: 1,
    lore: 'A little leather purse that hops after you. Every second room you clear, it spits out a coin.',
    pools: { shop: 1, beggar: 1, greedShop: 1 }, unlock: 'shop30', look: { costume: 'foreheadcoin' },
    follower: { kind: 'helper', move: 'trail', every: { rooms: 2, drop: ['coin', 'coin', 'coin', 'coin', 'silver'] }, say: 'DROPS A COIN EVERY 2 ROOMS' },
  },
  fusesatchel: {
    name: 'Satchel of Fuses', desc: 'Smells like a firework.', type: 'passive', quality: 1,
    lore: 'A canvas satchel stuffed with black powder. Every third room you clear, a bomb rolls out of it.',
    pools: { shop: 1, bombBeggar: 1, greedShop: 1 }, tags: ['bonfire'], unlock: 'chests30', look: { costume: 'satchel' },
    follower: { kind: 'helper', move: 'trail', every: { rooms: 3, drop: ['bomb', 'bomb', 'bomb2'] }, say: 'DROPS A BOMB EVERY 3 ROOMS' },
  },
  heartjar: {
    name: 'Little Heart Jar', desc: 'Contains love. And formaldehyde.', type: 'passive', quality: 1,
    lore: 'A jar with a small heart beating inside. Every third room you clear, it lets one out.',
    pools: { treasure: 1, beggar: 0.6, greedTreasure: 1 }, unlock: 'noHit3',
    follower: { kind: 'helper', move: 'trail', every: { rooms: 3, drop: ['heartHalf', 'heartHalf', 'heart'] }, say: 'DROPS A HEART EVERY 3 ROOMS' },
  },
  staticchild: {
    name: 'Static Child', desc: 'Do not touch. Seriously.', type: 'passive', quality: 2,
    lore: 'A little baby whose hair stands straight up. Every fourth room you clear, it sparks out a battery to recharge your active item.',
    pools: { treasure: 1, batteryBeggar: 1.2, greedTreasure: 1 }, tags: ['livewire'], unlock: 'actives100', look: { costume: 'static' },
    follower: { kind: 'helper', move: 'trail', every: { rooms: 4, drop: ['battery'] }, say: 'DROPS A BATTERY EVERY 4 ROOMS' },
  },
  gnatmother: {
    name: 'Gnat Mother', desc: 'So many children. So hungry.', type: 'passive', quality: 2,
    lore: 'A fat fly swollen with eggs. Every room you clear, two gnats hatch from her. Gnats buzz around you and dive into enemies.',
    pools: { treasure: 1, rottenBeggar: 1, greedTreasure: 1 }, tags: ['mothkin'], unlock: 'kills250',
    follower: { kind: 'helper', move: 'trail', fly: true, gnats: { clear: 2 }, say: 'HATCHES 2 GNATS EVERY CLEARED ROOM' },
  },
  spidermama: {
    name: 'Spider Mama', desc: 'Eight legs. Eighty kids.', type: 'passive', quality: 2,
    lore: 'A plump spider with a full egg sac. During fights she lays a spiderling every few seconds; spiderlings scuttle at enemies and bite.',
    pools: { treasure: 1, rottenBeggar: 0.6, greedTreasure: 1 }, tags: ['spiderkin'], unlock: 'win_wick', look: { costume: 'cobweb' },
    follower: { kind: 'helper', move: 'trail', lay: { every: 4, kind: 'spider' }, say: 'LAYS SPIDERLINGS DURING FIGHTS' },
  },

  // ------------------------------------------------------------------ collectors
  beggarpal: {
    name: 'Beggar Pal', desc: 'Spare change? Spare change.', type: 'passive', quality: 2,
    lore: 'A tiny beggar who follows you around. He runs over and picks up any coin on the floor, and for every 4 coins he gives you something back.',
    pools: { shop: 1, beggar: 1, treasure: 0.4, greedShop: 1 }, unlock: 'runs30', look: { costume: 'patch' },
    follower: { kind: 'helper', move: 'collect', speed: 70, collect: { kinds: ['coin'], need: 4, reward: ['heart', 'key', 'bomb', 'card', 'pill', 'ash'] }, say: 'PICKS UP COINS; EVERY 4 HE GIVES YOU SOMETHING' },
  },
  grimpal: {
    name: 'Grim Pal', desc: 'Says nothing. Eats hearts.', type: 'passive', quality: 3,
    lore: 'A beggar in a black hood. He picks up blood hearts from the floor, and for every 3 halves of heart he gives back ash or soot hearts.',
    pools: { devil: 0.6, demonBeggar: 1, greedDevil: 0.6 }, tags: ['spectre'], unlock: 'devil3',
    follower: { kind: 'helper', move: 'collect', speed: 70, collect: { kinds: ['heart'], need: 3, reward: ['ash', 'ash', 'soot', 'ashHalf'] }, say: 'EATS BLOOD HEARTS, PAYS BACK IN ASH AND SOOT' },
  },
  magpie: {
    name: 'Magpie', desc: 'Ooh, shiny. Yours now.', type: 'passive', quality: 2,
    lore: 'A black and white bird that loves anything you can pick up. It flies to coins, keys, bombs and hearts and brings them straight to you.',
    pools: { treasure: 1, keyBeggar: 0.6, greedTreasure: 1 }, unlock: 'items100', look: { costume: 'magpiefeather' },
    follower: { kind: 'helper', move: 'fetch', speed: 110, fly: true, say: 'FETCHES PICKUPS FOR YOU' },
  },

  // ------------------------------------------------------------------ for the helpers
  bestfriendlocket: {
    name: 'Best Friend Locket', desc: 'Friends forever. Bigger, too.', type: 'passive', quality: 3,
    lore: 'A heart-shaped locket with two faces inside. Every helper you have (orbiters, buddies, biters...) hits twice as hard and grows a little.',
    pools: { shop: 0.8, treasure: 0.5, greedShop: 0.8 }, unlock: 'win_cinder', look: { costume: 'locket' },
    helperMul: 2,
  },
};

export const ICONS = {
  // a sooty candle girl with a pink bow
  sootsister: [
    '.....fF......',
    '....fyFf.....',
    '.....ff......',
    '....kkkk.PP..',
    '...knnnnkPPk.',
    '...knSnSnkk..',
    '...knnnnnk...',
    '...knnrnnk...',
    '...knnnnnk...',
    '...kgnnngk...',
    '...kkkkkkk...',
  ],
  // a hooded shadow with two red eyes and a violet rim
  shadowself: [
    '....ppppp....',
    '...pzzzzzp...',
    '..pzzzzzzzp..',
    '..pzRzzzRzp..',
    '..pzzzzzzzp..',
    '..pzzzbzzzp..',
    '..pzzzzzzzp..',
    '..pzzzzzzzp..',
    '...pzpzpzp...',
    '....p.p.p....',
  ],
  // a tiny red imp head with grey horns
  tinyhorns: [
    '.k.......k...',
    'kGk.....kGk..',
    '.kGk...kGk...',
    '..krrrrrk....',
    '.krRrrrRrk...',
    '.krkrrrkrk...',
    '.krrrrrrrk...',
    '.krrkkkrrk...',
    '..krrrrrk....',
    '...kkkkk.....',
  ],
  // a tin robot head with an antenna and one red eye
  tintinker: [
    '......Y......',
    '......k......',
    '...kkkkkkk...',
    '...ksssssk...',
    '...ksRsssk...',
    '...ksssssk...',
    '...ksgggsk...',
    '...kkkkkkk...',
    '....kgkgk....',
    '...ksssssk...',
    '...kgk.kgk...',
  ],
  // a dark little head with a glowing furnace mouth
  hellmouth: [
    '..k.......k..',
    '.knk.....knk.',
    '..kkkkkkkkk..',
    '.knnnnnnnnnk.',
    '.knRnnnnnRnk.',
    '.knnnnnnnnnk.',
    '.knkkkkkkknk.',
    '.knkrRRRrknk.',
    '.knkkkkkkknk.',
    '..knnnnnnnk..',
    '...kkkkkkk...',
  ],
  // a two-faced jester mask under a belled hat
  jester: [
    '.Y.k.....k.Y.',
    '.kpk.....kBk.',
    '..kpk...kBk..',
    '...kkkkkkk...',
    '..kSSSknnnk..',
    '..kSkSknrnk..',
    '..kSSSknnnk..',
    '..kSkkkkknk..',
    '..kSSSknnnk..',
    '...kkkkkkk...',
  ],
  // a puddle child with a rainbow oil sheen
  oilslick: [
    '....kkkkk....',
    '...kpBBcck...',
    '..kpkpBkcVk..',
    '..kBSBcSVVk..',
    '..kBcVVYYfk..',
    '..kcVkkkYfk..',
    '..kVVYYffrk..',
    '...kYffrrk...',
    '..kkkkkkkkk..',
  ],
  // a little ghost holding a lantern
  lanternghost: [
    '....kkkk.....',
    '...kSSSSk....',
    '..kSSSSSSk...',
    '..kSkSSkSk...',
    '..kSSSSSSk.k.',
    '..kSSSSSSkkFk',
    '..kSSSSSSkFyk',
    '..kSSSSSSkkFk',
    '..kSkSSkSk.k.',
    '...k.kk.k....',
  ],
  // a round hand mirror with a face in the glass
  mirrorkin: [
    '....kkkkk....',
    '...kYYYYYk...',
    '..kYccccSYk..',
    '..kYckcckYk..',
    '..kYccccSYk..',
    '..kYcckccYk..',
    '..kYSccccYk..',
    '...kYYYYYk...',
    '.....kYk.....',
    '....kYYYk....',
    '....kkkkk....',
  ],
  // an imp face with arrows pointing four ways
  fourwayimp: [
    '......k......',
    '.....kRk.....',
    '...k.kRk.k...',
    '..kGkkkkkGk..',
    '.kkrrrrrrrkk.',
    'kRrrkrrrkrrRk',
    '.kkrrrrrrrkk.',
    '...krrkrrk...',
    '....kkRkk....',
    '.....kRk.....',
    '......k......',
  ],
  // a wooden bucket overflowing with red
  gutbucket: [
    '..rR..rRr....',
    '.rRrrrrRrr...',
    'kkkkkkkkkkk..',
    'kOoOOoOOoOk..',
    '.kOogggoOk...',
    '.kOoOOoOOk...',
    '.kOogggoOk...',
    '..kOoOOoOk...',
    '..kkkkkkkk...',
  ],
  // a winged wax baby face under a halo
  waxcherub: [
    '.....YYY.....',
    '....Y...Y....',
    'kk...kkk...kk',
    'kSk.kwwwk.kSk',
    'kSSkwkwkwkSSk',
    'kSSkwwwwwkSSk',
    '.kSkwwPwwkSk.',
    '..kkkwwwkkk..',
    '.....kkk.....',
  ],
  // a dagger, point up, gold hilt with a red stone
  altardagger: [
    '......k......',
    '.....kSk.....',
    '.....kSsk....',
    '.....kSsk....',
    '.....kSsk....',
    '.....kSsk....',
    '...kkkkkkkk..',
    '...kYYrYYYk..',
    '...kkkYkkkk..',
    '.....kek.....',
    '.....kek.....',
    '......k......',
  ],
  // a white feather with a gold quill
  guardianfeather: [
    '.........kk..',
    '........kSSk.',
    '.......kSSSk.',
    '......kSSSSk.',
    '.....kSSSSk..',
    '....kSSGSk...',
    '...kSSGSk....',
    '..kSSGSk.....',
    '..kSGSk......',
    '..kYkk.......',
    '.kYk.........',
    '.kk..........',
  ],
  // one fly with big wings
  lonelyfly: [
    '..kkk...kkk..',
    '.kcSSk.kSSck.',
    '.kcSSSkSSSck.',
    '..kkcSkSckk..',
    '....knnnk....',
    '...knrnrnk...',
    '...knnnnnk...',
    '....knnnk....',
    '.....kkk.....',
  ],
  // a violet fly with a glowing third eye
  mindfulfly: [
    '.....YYY.....',
    '....Y...Y....',
    '..kk.YYY.kk..',
    '.kccPkkkPcck.',
    '.kcckpppkcck.',
    '..kkpPlPpkk..',
    '....kpppk....',
    '....kpppk....',
    '.....kkk.....',
  ],
  // a brass doorstop wedge with a loop handle
  brassdoorstop: [
    '.....kkk.....',
    '....kY.Yk....',
    '....kY.Yk....',
    '...kkkkkkk...',
    '..kYlYYYYek..',
    '.kYlYYYYYYek.',
    '.kYYYYYYYYek.',
    'kYYYYYYYYYYek',
    'keeeeeeeeeeek',
    'kkkkkkkkkkkkk',
  ],
  // a fat maroon leech with a red mouth
  cellarleech: [
    '.............',
    '...kkkkkk....',
    '..kbrrrrbk...',
    '.kbrRrrrrbk..',
    'kbrrrrrrrrbkk',
    'kbrkrrrrrrbRk',
    'kbrrrrrrrrbRk',
    '.kbbrrrrbbkkk',
    '..kkkkkkkk...',
  ],
  // a chubby white grub
  chubbygrub: [
    '....kkkk.....',
    '...kwwwWk....',
    '..kwkwwkWk...',
    '..kwwrrwWk...',
    '.kkWwwwWkk...',
    '.kwwwwwwwWk..',
    '.kWWWWWWWWk..',
    '..kwwwwwWk...',
    '..kWWWWWWk...',
    '...kwwwWk....',
    '....kkkk.....',
  ],
  // a crow skull with a long beak
  crowskull: [
    '...kkkkk.....',
    '..kSSSSSk....',
    '.kSSSSSSSk...',
    '.kSzkSSSSkkk.',
    '.kSzzSSSSSddk',
    '.kSSSSSSkddk.',
    '..kSSSSkddk..',
    '...kkkkkkk...',
  ],
  // a small body on very long legs
  lodger: [
    'k...........k',
    '.k.........k.',
    '..k...k...k..',
    '...k.kmk.k...',
    '....kmmmk....',
    '...kmrmrmk...',
    '..k.kmmmk.k..',
    '.k...kkk...k.',
    'k...k...k...k',
    '...k.....k...',
    '..k.......k..',
  ],
  // a grey mouse with a lit fuse for a tail
  fusemouse: [
    '.........F...',
    '........fy...',
    '........k....',
    '..kk...k.....',
    '.kPGkkk......',
    '.kGGGGGkk....',
    'kGkGGGGGGk...',
    'PGGGGGGGGk...',
    '.kkGGGGGk....',
    '..kk.kk......',
  ],
  // a moth with a glowing belly
  lanternmoth: [
    '.kk..k.k..kk.',
    'kWWk..k..kWWk',
    'kWdWk.k.kWdWk',
    'kWWWWkykWWWWk',
    '.kWdWkFkWdWk.',
    '..kWWkFkWWk..',
    '.kWWkFlFkWWk.',
    'kWWk.kFk.kWWk',
    '.kk...k...kk.',
  ],
  // a lump of tallow with a face
  tallowlump: [
    '...kkkkkk....',
    '..kwwwwwWk...',
    '.kwwWwwwwWk..',
    '.kwwwwwwwWk..',
    '.kwkwwwkwWk..',
    '.kwwwwwwwWk..',
    '.kwwwkkwwdk..',
    '.kWwwwwwWdk..',
    '..kdWWWWdk...',
    '...kkkkkk....',
  ],
  // a grey fluff ball with ears
  dustbunny: [
    '..kk....kk...',
    '.kGk....kGk..',
    '.kGGk..kGGk..',
    '..kGGkkGGk...',
    '.kgGGGGGGgk..',
    'kgGGkGGkGGgk.',
    'kgGGGGGGGGgk.',
    'kgGGGPPGGGgk.',
    '.kgGGGGGGgk..',
    '..kkgggggk...',
    '....kkkk.....',
  ],
  // a leather purse with a coin peeking out
  coinpurse: [
    '....k...k....',
    '.....kok.....',
    '....kOOOk....',
    '...kkkkkkk...',
    '..kOOOOOOOk..',
    '.kOoOOOOOOok.',
    '.kOOOYYOOOok.',
    '.kOOYlYeOOok.',
    '.kOOOeeOOook.',
    '..koooooook..',
    '...kkkkkkk...',
  ],
  // a canvas satchel with a bomb poking out
  fusesatchel: [
    '.......F.....',
    '......kfk....',
    '.....kzzzk...',
    '....kzgzzzk..',
    '..kkkzzzzkkk.',
    '.kdWWWWWWWdk.',
    '.kWdddddddWk.',
    '.kWWWWYWWWWk.',
    '.kWWWWWWWWWk.',
    '.kddddddddk..',
    '..kkkkkkkkk..',
  ],
  // a glass jar with a heart inside
  heartjar: [
    '...kkkkkkk...',
    '...koooook...',
    '..kkkkkkkkk..',
    '..kc.....ck..',
    '..kc.r.r.ck..',
    '..kcrRrrrck..',
    '..kcrrrrrck..',
    '..kc.rrr.ck..',
    '..kc..r..ck..',
    '..kcccccccck.',
    '..kkkkkkkkk..',
  ],
  // a baby with a lightning bolt in its hair
  staticchild: [
    '.c.....Y...c.',
    '..c...Yl.....',
    '...kkYlkk....',
    '..kwwYwwwk...',
    '.kwwwwYwwwk..',
    '.kwBwwwwBwk..',
    '.kwwwwwwwwk..',
    '.kwwwkkwwwk..',
    '..kwwwwwwk...',
    '...kkkkkk.c..',
  ],
  // a fat fly swollen with eggs
  gnatmother: [
    '..kk.....kk..',
    '.kSSk...kSSk.',
    '.kcSSk.kSSck.',
    '..kkkkkkkkk..',
    '.kvvxvvvxvvk.',
    'kvrvvvvvvrvvk',
    'kvvvvvvvvvvvk',
    'kxvVvVvVvvxk.',
    '.kxvvvvvvxk..',
    '..kkkkkkkk...',
  ],
  // a plump spider with a white egg sac
  spidermama: [
    '.k..k...k..k.',
    '..k.k...k.k..',
    '...kkkkkkk...',
    'k.kmmmmmmmk.k',
    '.kmrmmmmrmmk.',
    'k.kmmmmmmmk.k',
    '.kkmmSmSmmkk.',
    'k..kmmmmmk..k',
    '..k.kkkkk.k..',
    '.k.........k.',
  ],
  // a little hooded beggar with a tin cup
  beggarpal: [
    '....kkkk.....',
    '...koooOk....',
    '..kooooOOk...',
    '..kokwwkOk...',
    '..kowkwwok...',
    '..koowwook...',
    '.kooooooook..',
    '.koOooookgk..',
    '.koooooksgsk.',
    '..kkkkkkkgk..',
  ],
  // a black-hooded beggar holding a red heart
  grimpal: [
    '...kkkkk.....',
    '..knnnnnk....',
    '.knnzzznnk...',
    '.knzSzSznk...',
    '.knzzzzznk...',
    '.knnzzznnk...',
    'knnnnnnnnnk..',
    'knnnrRnnnnk..',
    'knnnrrnnnnk..',
    '.kkkkkkkkk...',
  ],
  // a black and white magpie with something shiny in its beak
  magpie: [
    '...kkk.......',
    '..kzzzk......',
    '.kzzSzzk.....',
    'klkzzzzk.....',
    '.k.kzzzzkk...',
    '...kSSzzzzk..',
    '...kSSSzzzzkk',
    '....kSSzzzk.k',
    '.....kkkkk...',
    '......k.k....',
  ],
  // a heart-shaped gold locket on a chain
  bestfriendlocket: [
    '..k.......k..',
    '...k.....k...',
    '....k...k....',
    '.....k.k.....',
    '..kkk.k.kkk..',
    '.kYlYkkYYYek.',
    '.kYlYYYYYYek.',
    '.kYYYYrYYYek.',
    '..kYYYYYYek..',
    '...kYYYYek...',
    '....kYYek....',
    '.....kek.....',
    '......k......',
  ],
};

export const COSTUMES = {
  // soot smudges on both cheeks
  sootcheeks: { rows: ['n........n', '.n......n.'], colors: { n: '#4a4540' }, x: 4, y: 9, facings: ['down'] },
  // dark rings under the eyes
  shadoweyes: { rows: ['pp......pp'], colors: { p: '#3a2050' }, x: 4, y: 8, facings: ['down', 'side'] },
  // a red imp tail curling out behind
  imptail: { rows: ['....R', '...r.', 'rrr..', 'r....'], colors: { r: '#c0262c', R: '#ff6a5a' }, x: 14, y: 9, facings: ['down', 'side', 'up'], behind: true },
  // a wind-up antenna on top of the head
  antenna: { rows: ['.R.', '.k.', '.k.'], colors: { R: '#ff6a5a', k: '#6e665c' }, x: 8, y: -4, facings: ['down', 'side', 'up'] },
  // a jester's ruffled collar
  ruffle: { rows: ['PSPSPSPSPSPS', '.P.S.P.S.P.S'], colors: { P: '#7a4a9a', S: '#f8f4e8' }, x: 3, y: 12, facings: ['down', 'side'] },
  // an oily rainbow smear across the body
  sheen: { rows: ['.pBcV', 'pBcVYf', '.cVYf'], colors: { p: '#7a4a9a', B: '#3a6ad0', c: '#8ad0f0', V: '#9ccf6a', Y: '#d8b048', f: '#f08a24' }, x: 6, y: 11, facings: ['down', 'side'] },
  // a white feather tucked behind the ear
  earfeather: { rows: ['..S', '.SS', 'SS.', 'Y..'], colors: { S: '#f8f4e8', Y: '#d8b048' }, x: 14, y: 0, facings: ['down', 'side'] },
  // a leech stuck to the cheek
  leechcheek: { rows: ['brb', 'bbr'], colors: { b: '#6a1216', r: '#c0262c' }, x: 12, y: 9, facings: ['down'] },
  // glowing motes drifting around the head
  motes: { rows: ['l.....l', '...l...', '.l...l.'], colors: { l: '#fff0a0' }, x: 5, y: -4, facings: ['down', 'side', 'up'] },
  // a coin stuck to the forehead
  foreheadcoin: { rows: ['.kk.', 'kYlk', 'kYek', '.kk.'], colors: { k: '#160f0c', Y: '#d8b048', l: '#fff0a0', e: '#8a6a20' }, x: 7, y: 1, facings: ['down'] },
  // a satchel strap over the shoulder, bag at the hip
  satchel: { rows: ['W.........', '.W........', '..W.......', '...W......', '....dWWd..', '....WWWW..'], colors: { W: '#c9b48a', d: '#9a8462' }, x: 3, y: 6, facings: ['down'] },
  // static sparks crackling out of the hair
  static: { rows: ['c...c', '.c.c.', 'c....'], colors: { c: '#8ad0f0' }, x: 6, y: -3, facings: ['down', 'side', 'up'] },
  // a cobweb across one corner of the head
  cobweb: { rows: ['s.s.s', '.sss.', 'sssss', '.s.s.'], colors: { s: '#c8c4b8' }, x: 2, y: 0, facings: ['down', 'side', 'up'] },
  // a sewn-on patch
  patch: { rows: ['oOo', 'OoO', 'oOo'], colors: { o: '#7a5034', O: '#b8865a' }, x: 11, y: 11, facings: ['down', 'side'] },
  // a blue-black feather stuck in the wax
  magpiefeather: { rows: ['.u', 'uB', 'B.'], colors: { u: '#1a2a5a', B: '#3a6ad0' }, x: 11, y: -2, facings: ['down', 'side', 'up'] },
  // a gold locket on a chain
  locket: { rows: ['k......k', '.k....k.', '..kYYk..', '...Yk...'], colors: { k: '#8a6a20', Y: '#d8b048' }, x: 5, y: 8, facings: ['down'] },
};
