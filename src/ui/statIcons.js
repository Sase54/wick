// Small icons for each stat (Found HUD and pause screen) plus value formatting.
import { buildSprite, scale2x } from '../engine/sprites.js';

const C = {
  k: '#160f0c', o: '#b8865a', O: '#7a5034', f: '#f08a24', F: '#ffd25a', y: '#fff3c0',
  r: '#c0262c', R: '#ff6a5a', s: '#c4bfb6', S: '#f8f4e8', b: '#8ad0f0', B: '#3a6ad0', v: '#5a8a34', V: '#9ccf6a',
};

const ICONS = {
  speed: ['..kkk..', '..kok..', '..kok..', '..kokk.', '.koooOk', '.kkkkkk'],
  fireRate: ['...k...', '..kfk..', '.kfFfk.', 'kfFyFfk', 'kfFFFfk', '.kfffk.', '..kkk..'],
  damage: ['.k...k.', 'kRk.kRk', '.krkrk.', '..krk..', '.krkrk.', 'kRk.kRk', '.k...k.'],
  range: ['....k..', '....kk.', 'kSkSkSk', '....kk.', '....k..'],
  shotSpeed: ['kk..kk.', '.bk..bk', '..bk..b', '.bk..bk', 'kk..kk.'],
  luck: ['.vv.vv.', 'vVvvVvv', '.vvvvv.', 'vVvvVvv', '.vv.vv.', '...k...', '..k....'],
  // deal chances: a horned red pentagram (The Bargain), a pale haloed wing (The Vigil)
  devil: ['r.....r', 'rr...rr', '.rRRRr.', 'rRkRkRr', '.rRRRr.', '..rkr..', '...r...'],
  angel: ['.yyyyy.', 'y.....y', '.yyyyy.', 'SS...SS', 'SsS.SsS', '.SsSsS.', '..SSS..'],
};

export const STAT_ORDER = ['speed', 'fireRate', 'damage', 'range', 'shotSpeed', 'luck'];

let built = null;
export function statIcon(key) {
  if (!built) {
    built = {};
    for (const [k, rows] of Object.entries(ICONS)) built[k] = scale2x(buildSprite(rows, C));
  }
  return built[key];
}

export function formatStat(key, v) {
  if (key === 'luck') return String(Math.round(v * 10) / 10);
  if (key === 'range') return v.toFixed(1);
  return v.toFixed(2);
}
