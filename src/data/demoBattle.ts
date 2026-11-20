/**
 * Free demo battle for judges and first-time visitors: a battle video made earlier in the app with the LTX API,
 * served as a static file so replaying it costs nothing. demoBattle.json and public/videos/battles/demo_battle.mp4
 * are written by scripts/import-demo-battle.ps1 from a Monster Manager ZIP export.
 */
import type { BattleChronicle } from "../services/monsterVaultService";
import demo from "./demoBattle.json";

export const DEMO_BATTLE_VIDEO_URL = "/videos/battles/demo_battle.mp4";

export const DEMO_BATTLE: BattleChronicle = {
  id: "demo_battle",
  fighter1Id: demo.fighter1,
  fighter2Id: demo.fighter2,
  winnerId: demo.winner,
  storyKo: demo.storyKo,
  storyEn: demo.storyEn,
  timestamp: Date.parse(demo.date),
};

export const DEMO_BATTLE_TITLE = { ko: demo.titleKo, en: demo.titleEn };
