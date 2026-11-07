// Persistent progress: lifetime stats, achievements/unlocks, completion marks, item collection
// and run records. The game reports events here; this decides what gets unlocked.
import { loadStore, saveStore, freshProgress } from '../engine/storage.js';
import { ACHIEVEMENTS, LOCKED_BY } from '../data/unlocks.js';

function statAt(stats, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), stats) ?? 0;
}

class Progress {
  constructor() {
    this.data = freshProgress();
    this.settings = { unlockAll: false };
    this.listeners = [];   // (achievement) => void, used by the unlock popup
    this.dirty = false;
  }

  init(settings) {
    this.settings = settings;
    this.data = loadStore('progress');
    // Achievements earned by an older save but not yet recorded (e.g. after new ones are added)
    this.check();
  }

  onUnlock(fn) { this.listeners.push(fn); }

  save() {
    saveStore('progress', this.data);
    this.dirty = false;
  }

  // Save if anything changed since the last save (cheap; called on room changes etc.)
  flush() {
    if (this.dirty) this.save();
  }

  // ---- unlocks --------------------------------------------------------------
  isUnlocked(type, id) {
    if (this.settings.unlockAll) return true;
    const ach = LOCKED_BY[`${type}:${id}`];
    return !ach || !!this.data.achievements[ach];
  }

  hasAchievement(id) { return !!this.data.achievements[id]; }

  check() {
    const s = this.data.stats;
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (this.data.achievements[a.id]) continue;
      if (statAt(s, a.when.stat) >= a.when.gte) {
        this.data.achievements[a.id] = Date.now();
        changed = true;
        for (const fn of this.listeners) fn(a);
      }
    }
    if (changed) this.save();
  }

  // ---- events from the game ---------------------------------------------------
  // Light events just mark the save dirty; important ones save right away.
  event(name, info = {}) {
    const s = this.data.stats;
    const ch = info.character ? (s.chars[info.character] ??= { runs: 0, wins: 0, maxChapter: 0 }) : null;
    switch (name) {
      case 'runStart':
        s.runs++;
        if (ch) { ch.runs++; this.data.lastCharacter = info.character; }
        break;
      case 'enemyKilled': s.enemiesKilled++; this.dirty = true; break;
      case 'activeUsed': s.activeUses++; this.dirty = true; break;
      case 'noHitFloor': s.noHitFloors++; break;
      case 'bossKilled':
        s.bossKillsTotal++;
        s.bossKills[info.id] = (s.bossKills[info.id] || 0) + 1;
        break;
      case 'floorReached':
        s.maxFloor = Math.max(s.maxFloor, info.floor);
        s.maxChapter = Math.max(s.maxChapter, info.chapter);
        if (ch) ch.maxChapter = Math.max(ch.maxChapter, info.chapter);
        break;
      case 'itemCollected':
        if (!this.data.collection[info.id]) {
          this.data.collection[info.id] = true;
          s.itemsCollected = Object.keys(this.data.collection).length;
        }
        break;
      case 'secretFound': s.secretsFound++; break;
      case 'shopBuy': s.shopBuys++; break;
      case 'markedRock': s.markedRocks++; break;
      case 'pillUsed': s.pillsUsed++; break;
      case 'cardUsed': s.cardsUsed++; break;
      case 'runeUsed': s.runesUsed++; break;
      case 'chestOpened': s.chestsOpened++; break;
      case 'trinketFound': s.trinketsFound++; break;
      case 'dealTaken': if (info.deal === 'devil') s.dealsDevil++; else if (info.deal === 'angel') s.dealsAngel++; break;
      case 'transformed': s.transformations++; break;
      case 'death': s.deaths++; break;
      case 'win': {
        s.wins++;
        const marks = (this.data.marks[info.character] ??= {});
        marks[info.boss] = true;
        if (ch) ch.wins++;
        s.charactersWon = Object.values(s.chars).filter((c) => c.wins > 0).length;
        break;
      }
    }
    if (name === 'enemyKilled' || name === 'activeUsed') {
      this.check();
      return;
    }
    this.save();
    this.check();
  }

  // Keep the last runs and the fastest wins.
  recordRun(result, summary, seed) {
    const { killerPic, itemIds, ...kept } = summary;   // pictures and item lists stay out of the save
    const entry = { seed, result, ...kept, date: Date.now() };
    this.data.recent = [entry, ...this.data.recent].slice(0, 10);
    if (result === 'win') this.data.best = [...this.data.best, entry].sort((a, b) => a.time - b.time).slice(0, 5);
    this.save();
  }

  reset() {
    this.data = freshProgress();
    this.save();
  }
}

export const progress = new Progress();
