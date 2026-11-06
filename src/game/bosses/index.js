// Boss registry: id -> class. To add a boss, write a class in this folder,
// add its tuning to src/data/bosses.js (and to a chapter pool there), and register it here.
import { BOSSES } from '../../data/bosses.js';
import { LumpBoss } from './lump.js';
import { WeaverBoss } from './weaver.js';
import { HiveBoss } from './hive.js';
import { GrubsBoss } from './grubs.js';
import { DollHeadBoss } from './dollhead.js';
import { GurglerBoss } from './gurgler.js';
import { BoilerBoss } from './boiler.js';
import { MildewBoss } from './mildew.js';
import { MothQueenBoss } from './mothqueen.js';
import { RatKingBoss } from './ratking.js';
import { SnufferBoss } from './snuffer.js';
import { PyreBoss } from './pyre.js';
import { GrottoMawBoss } from './grottomaw.js';
import { ShriekMotherBoss } from './shriekmother.js';
import { GravediggerBoss } from './gravedigger.js';
import { BoneChoirBoss } from './bonechoir.js';
import { DrownerBoss } from './drowner.js';
import { AnglerBoss } from './angler.js';
import { WardenBoss } from './warden.js';
import { GargoylesBoss } from './gargoyles.js';
import { ShroudKingBoss } from './shroudking.js';
import { SaintBoss } from './saint.js';
import { BlightToadBoss } from './blighttoad.js';
import { MuckKnotBoss } from './muckknot.js';
import { ChandlerBoss } from './chandler.js';
import { SentinelBoss } from './sentinel.js';
import { TallowHeartBoss } from './tallowheart.js';

export const BOSS_CLASSES = {
  // chapter 1 (and 3 until it gets its own)
  lump: LumpBoss,
  weaver: WeaverBoss,
  hive: HiveBoss,
  grubs: GrubsBoss,
  dollhead: DollHeadBoss,
  gurgler: GurglerBoss,
  pyre: PyreBoss,
  // chapter 2
  grottomaw: GrottoMawBoss,
  shriekmother: ShriekMotherBoss,
  gravedigger: GravediggerBoss,
  bonechoir: BoneChoirBoss,
  drowner: DrownerBoss,
  angler: AnglerBoss,
  // chapter 3
  warden: WardenBoss,
  gargoyles: GargoylesBoss,
  shroudking: ShroudKingBoss,
  saint: SaintBoss,
  blighttoad: BlightToadBoss,
  muckknot: MuckKnotBoss,
  chandler: ChandlerBoss,
  // the statues of The Vigil
  sentinel1: SentinelBoss,
  sentinel2: SentinelBoss,
  // chapter 4 (the heart is floor 8's giant)
  tallowheart: TallowHeartBoss,
  boiler: BoilerBoss,
  mildew: MildewBoss,
  moth: MothQueenBoss,
  ratking: RatKingBoss,
  snuffer: SnufferBoss,
};

export function createBoss(id, x, y, opts) {
  const Cls = BOSS_CLASSES[id];
  if (!Cls) throw new Error(`Unknown boss "${id}"`);
  return new Cls(id, BOSSES[id], x, y, opts);
}
