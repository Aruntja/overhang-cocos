import { GAME_CONSTANTS } from '../utils/Constants';
import { DifficultyKey } from '../utils/Types';

export const GAME_CONFIG = {
  designResolution: {
    width: GAME_CONSTANTS.designWidth,
    height: GAME_CONSTANTS.designHeight,
    fitWidth: true,
    fitHeight: true,
    policy: 'FIXED_HEIGHT',
  },
  defaultDifficulty: 'medium' as DifficultyKey,
  defaultBet: GAME_CONSTANTS.defaultBet,
  defaultBalance: GAME_CONSTANTS.defaultBalance,
  minBet: GAME_CONSTANTS.minBet,
  maxBet: GAME_CONSTANTS.maxBet,
  betStep: GAME_CONSTANTS.betStep,
} as const;
