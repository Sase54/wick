// Dev helper for testing weapons in the browser console (not part of the game).
//   const T = await import('/tools/weapontest.js'); T.setup(); T.run({ weapon: 'beam' }, 90, 999, 80); T.snap('label');
export function setup() {
  const g = window.WICK.game;
  if (g.state !== 'play') window.WICK.app.startRun(12345);
  g.floorCard = null;
  g.pause.open = () => null;
  g.pause.closeNow();
  return g;
}

// Hold shoot (right) for `holdF` frames out of every `period`, `frames` frames in all, at 4 blobs.
export function run(shot, frames = 200, period = 90, holdF = 75, { dir = [1, 0], items = null, each = null } = {}) {
  const g = window.WICK.game, p = g.player;
  p.charShot = shot;
  if (items) p.items = [...items];
  p.recompute();
  g.syncFollowers();
  p.wpn = null;
  g.room.enemies.length = 0;
  g.projectiles.clear();
  p.x = g.room.x0 + 30; p.y = (g.room.y0 + g.room.B) / 2; p.invuln = 0;
  p.hurt = () => false;   // untouchable while testing (without the blinking)
  const es = [];
  for (let i = 0; i < 4; i++) {
    const e = g.spawnEnemy('blob', p.x + 50 + i * 30, p.y + (i % 2 ? 14 : -14), { delay: 0 });
    e.hp = e.maxHp = 400;
    es.push(e);
  }
  let err = null;
  try {
    for (let f = 0; f < frames; f++) {
      const hold = (f % period) < holdF;
      g.input.shoot.x = hold ? dir[0] : 0; g.input.shoot.y = hold ? dir[1] : 0;
      each?.(f, g);
      g.update(1 / 60);
    }
  } catch (e) {
    err = e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ');
  }
  g.input.shoot.x = 0; g.input.shoot.y = 0;
  return { form: p.shot.form, dmg: Math.round(es.reduce((s, e) => s + (400 - Math.max(0, e.hp)), 0)), err };
}

export function step(n = 1, sx = 0, sy = 0) {
  const g = window.WICK.game;
  for (let i = 0; i < n; i++) { g.input.shoot.x = sx; g.input.shoot.y = sy; g.update(1 / 60); }
  g.input.shoot.x = 0; g.input.shoot.y = 0;
}

// Draw the game 3x into an overlay at the top left of the page.
export function snap(label = '', slot = 0) {
  const g = window.WICK.game;
  let ov = document.getElementById('ov');
  if (!ov) {
    ov = document.createElement('canvas');
    ov.id = 'ov';
    ov.width = 1152; ov.height = 648;
    ov.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;width:768px;height:432px;image-rendering:pixelated;background:#000';
    document.body.appendChild(ov);
  }
  const oc = document.createElement('canvas');
  oc.width = 384; oc.height = 216;
  g.render(oc.getContext('2d'));
  const c = ov.getContext('2d');
  c.imageSmoothingEnabled = false;
  if (slot === 0) c.drawImage(oc, 0, 0, 1152, 648);
  else c.drawImage(oc, 0, 0, 384, 216, (slot - 1) % 2 * 576, Math.floor((slot - 1) / 2) * 324, 576, 324);
  c.fillStyle = '#fff';
  c.font = '20px monospace';
  c.fillText(label, slot ? (slot - 1) % 2 * 576 + 6 : 10, slot ? Math.floor((slot - 1) / 2) * 324 + 316 : 630);
}
