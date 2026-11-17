// Arena feature: MonsterClashArena (16x16 combat grid) and battle UI.
export {
  BattleMatrix,
  CUSTOM_MONSTER_ID_PREFIX,
  isCustomFighterId,
  getBattleVideoForPair,
  PREMADE_BATTLES,
  toShortName,
} from './BattleMatrix';
export {
  composeClashPrompt,
  composeStoryClashPrompt,
  describeFighterForClash,
  shouldWrapClashPlayback,
  CLASH_MAX_SECONDS,
} from './clashPrompt';
export type { ClashFighter } from './clashPrompt';
