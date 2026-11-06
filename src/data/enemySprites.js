// Original enemy pixel art. Each sprite has its own color key and named animations
// (arrays of frames). '.' is transparent. Rotten variants are tinted in code.
const BASE = { k: '#160f0c', e: '#e8e0c8', p: '#120c0a', r: '#c0281e', R: '#ffb0a0' };

// Shift the top `rows` rows of a frame sideways by one pixel (cheap wobble frame).
const wobble = (frame, rows) => frame.map((row, i) => (i < rows ? row.slice(-1) + row.slice(0, -1) : row));

const BLOB_A = [
  '....kkkkkk....',
  '..kkGGGGGGkk..',
  '.kGGLLGGGGGGk.',
  '.kGLGGGGGGGGk.',
  'kGGGepGGepGGGk',
  'kGGGppGGppGGGk',
  'kGGGGGGGGGGGgk',
  'kGGgGGkkGGGggk',
  'kgGGGGGGGGgggk',
  '.kggggggggggk.',
  '..kkkkkkkkkk..',
];
const BLOB_B = [
  '..............',
  '....kkkkkk....',
  '.kkGGLLGGGGkk.',
  'kGGLGGGGGGGGGk',
  'kGGGepGGepGGGk',
  'kGGGppGGppGGGk',
  'kGGGGGGGGGGGgk',
  'kGGgGGkkGGGggk',
  'kgGGGGGGGGgggk',
  'kggggggggggggk',
  '.kkkkkkkkkkkk.',
];

const MOTH_A = [
  'kk..........kk',
  'kwk........kwk',
  'kwwk......kwwk',
  '.kwwk.kk.kwwk.',
  '..kwwkMMkwwk..',
  '...kkMrrMkk...',
  '....kMMMMk....',
  '.....kmmk.....',
  '.....kmmk.....',
  '......kk......',
];
const MOTH_B = [
  '..............',
  '..............',
  '......kk......',
  '....kkMMkk....',
  '..kkwkrrkwkk..',
  '.kwwwkMMkwwwk.',
  'kwwwk.kk.kwwwk',
  'kwwk.kmmk.kwwk',
  'kkk..kmmk..kkk',
  '......kk......',
];

const EYE_OPEN = [
  '....kkkkkkkk....',
  '..kkaaaaaaaakk..',
  '.kaakkkkkkkkaak.',
  'kaakeeeeeeeekaak',
  'kakeeerrrreeekak',
  'kakeerrpRrreekak',
  'kakeerrpprreekak',
  'kakeeerrrreeekak',
  'kaakeeeeeeeekaak',
  '.kaakkkkkkkkaak.',
  '..kkaaaaaaaakk..',
  '....kkkkkkkk....',
];
const EYE_SHUT = [
  '....kkkkkkkk....',
  '..kkaaaaaaaakk..',
  '.kaakkkkkkkkaak.',
  'kaakllllllllkaak',
  'kakllllllllllkak',
  'kakllllllllllkak',
  'kakkkkkkkkkkkkak',
  'kakllllllllllkak',
  'kaakllllllllkaak',
  '.kaakkkkkkkkaak.',
  '..kkaaaaaaaakk..',
  '....kkkkkkkk....',
];

const RAT_A = [
  '..........kkk...',
  '.........kHHHk..',
  '..kkkkk.kHkkHk..',
  '.kAAAAAkkAAAkk..',
  'kAAaAAAAAAAArAk.',
  'kAAAAAAAAAAAAAPk',
  'kaAAAAAAAAAAAkk.',
  '.kaaAAAAAAAak...',
  '..kkakkkkakk....',
  '..k.k....k.k....',
];
const RAT_B = [
  ...RAT_A.slice(0, 8),
  '..kakk..kakk....',
  '...k.k...k.k....',
];

const TOAD_SIT = [
  '..............',
  '...kk....kk...',
  '..kTek..keTk..',
  '..kTTkkkkTTk..',
  '.kTTTTTTTTTTk.',
  'kTTtTTTTTTtTTk',
  'kTtTTmmmmTTtTk',
  'kTTTTTTTTTTTTk',
  '.kTYYYYYYYYTk.',
  'kTkYYYYYYYYkTk',
  'kTTkkkkkkkkTTk',
  '.kk........kk.',
];
const TOAD_JUMP = [
  '...kk....kk...',
  '..kTek..keTk..',
  '..kTTkkkkTTk..',
  '.kTTTTTTTTTTk.',
  'kTTtTTTTTTtTTk',
  'kTtTTmmmmTTtTk',
  'kTTTTTTTTTTTTk',
  '.kTYYYYYYYYTk.',
  'kTkYYYYYYYYkTk',
  '.kTkkkkkkkkTk.',
  '.kTk......kTk.',
  '..kk......kk..',
];

const SAC_A = [
  '......kkkk......',
  '....kkOOOOkk....',
  '...kOOOOOOoOk...',
  '..kOOvOOOOOOok..',
  '..kOOOvOOOvOok..',
  '.kOOOOvOOvOOook.',
  '.kOOOOOvvOOOook.',
  '.kOoOOOOvOOOook.',
  '.kOOoOOOvOOoook.',
  '.kOOOOOOOOOoook.',
  '..kOOOOOOOoook..',
  '..kkoOOOOoookk..',
  '.kkkkkkkkkkkkkk.',
  'kkkkkkkkkkkkkkkk',
];

const MITE_A = [
  'k.k....k.k',
  '.kk.kk.kk.',
  '..kMMMMk..',
  'kkMmMMmMkk',
  '..kMrrMk..',
  '.k.kkkk.k.',
  'k........k',
];
const MITE_B = [
  '.k......k.',
  'k.k.kk.k.k',
  '.kkMMMMkk.',
  '..kMmmMk..',
  'kkkMrrMkkk',
  '..kkkkkk..',
  '.k......k.',
];

const SLUDGE_A = [
  '......kkkkkk......',
  '....kkSSVSSSkk....',
  '..kkSSVVSSSSSSkk..',
  '.kSSSSSSSSeSSSSSk.',
  'kSSeSSSSSSSSSSSSSk',
  'kSSSSSSSsSSSSSeSSk',
  'kSSSSSsssssSSSSSSk',
  'ksSSSSSSSSSSSSSssk',
  '.ksssSSSSSSSSsssk.',
  '..kksssssssssskk..',
  '....kkkkkkkkkk....',
];
const SLUDGELING_A = [
  '...kkkk...',
  '.kkSVSSkk.',
  'kSSeSSeSSk',
  'kSSSSSSSSk',
  'ksSSsSSSsk',
  '.kssssssk.',
  '..kkkkkk..',
];

const DRAFT_TOP = [
  '....kkkkkk....',
  '...kDDDDDDk...',
  '..kDDDDDDDDk..',
  '.kDDDDDDDDDDk.',
  '.kDkkDDDDkkDk.',
  '.kDkkDDDDkkDk.',
  '.kDDDDDDDDDDk.',
  '.kDDDDkkDDDDk.',
  '.kDDDDkkDDDDk.',
  '.kDDDDDDDDDdk.',
  '.kDDDDDDDDDdk.',
  '..kDDDDDDDddk.',
];
const DRAFT_A = [...DRAFT_TOP, '..kdDDDdDDdk..', '..kkdDkkdDkk..', '...k.kk..kk...'];
const DRAFT_B = [...DRAFT_TOP, '..kDdDDDdDDk..', '...kkDdkkDdk..', '....kk..kk.k..'];

const HUSK_TOP = [
  '......kk......',
  '.....krrk.....',
  '...kkkkkkkk...',
  '..khhHHHHhhk..',
  '..khHHHHHHhk..',
];
const HUSK_BOTTOM = [
  '..khHHHHHHhk..',
  '..khHHkkHHhk..',
  '..khHHHHHHhk..',
  '.khhHHHHHHhhk.',
  '.khHhHHHHhHhk.',
  '.khhHhhHhhHhk.',
  '.khhhhhhhhhhk.',
  '..kkkkkkkkkk..',
];
const HUSK_IDLE = [...HUSK_TOP, '..khkkHHkkhk..', '..khkkHHkkhk..', ...HUSK_BOTTOM];
const HUSK_GLOW = [...HUSK_TOP, '..khooHHoohk..', '..khoOHHOohk..', ...HUSK_BOTTOM];

export const ENEMY_SPRITES = {
  blob: {
    colors: { ...BASE, G: '#5a6a34', g: '#3e4a24', L: '#8a9a50' },
    anims: { idle: [BLOB_A, BLOB_B] },
  },
  moth: {
    colors: { ...BASE, M: '#6a5a48', m: '#4a3e32', w: '#a89880' },
    anims: { idle: [MOTH_A, MOTH_B] },
  },
  eye: {
    colors: { ...BASE, a: '#4a4540', l: '#7a5048' },
    anims: { idle: [EYE_OPEN], windup: [EYE_SHUT, EYE_OPEN] },
  },
  ratram: {
    colors: { ...BASE, A: '#5a4a42', a: '#3a2e28', H: '#c8bca8', P: '#c08a80' },
    anims: { idle: [RAT_A, RAT_B] },
  },
  toad: {
    colors: { ...BASE, T: '#6a7040', t: '#4a5030', Y: '#b0a060', m: '#2a2a18' },
    anims: { idle: [TOAD_SIT], air: [TOAD_JUMP] },
  },
  sac: {
    colors: { ...BASE, O: '#c8b8a0', o: '#9a8a74', v: '#8a3030', V: '#d04040' },
    anims: { idle: [SAC_A, SAC_A.map((r) => r.replace(/v/g, 'V'))] },
  },
  mite: {
    colors: { ...BASE, M: '#9a8a74', m: '#6a5a48' },
    anims: { idle: [MITE_A, MITE_B] },
  },
  sludge: {
    colors: { ...BASE, S: '#3a2a3a', s: '#2a1c2a', V: '#6a5070' },
    anims: { idle: [SLUDGE_A, wobble(SLUDGE_A, 3)] },
  },
  sludgeling: {
    colors: { ...BASE, S: '#3a2a3a', s: '#2a1c2a', V: '#6a5070' },
    anims: { idle: [SLUDGELING_A, wobble(SLUDGELING_A, 2)] },
  },
  draft: {
    colors: { ...BASE, D: '#c8d0d8', d: '#8a96a4' },
    anims: { idle: [DRAFT_A, DRAFT_B] },
  },
  husk: {
    colors: { ...BASE, H: '#8a7a5e', h: '#5a4c3a', o: '#f08a24', O: '#ffd25a' },
    anims: { idle: [HUSK_IDLE], windup: [HUSK_GLOW] },
  },
};
