import { DIFFICULTY_CONFIG } from '../config/DifficultyConfig';
import { GAME_CONSTANTS } from '../utils/Constants';
import { DifficultyKey, RoundData } from '../utils/Types';
import { wait } from '../utils/Helpers';

export class BackendService {
  public async connect(): Promise<void> {
    await wait(GAME_CONSTANTS.connectDelayMs);
  }

  public createRound(difficulty: DifficultyKey): RoundData {
    const config = DIFFICULTY_CONFIG[difficulty];
    const multipliers: number[] = [];
    let currentMultiplier = 1;

    for (let stepIndex = 0; stepIndex < config.maxSteps; stepIndex += 1) {
      currentMultiplier *= config.growth;
      multipliers.push(Number(currentMultiplier.toFixed(2)));
    }

    let collapseStep = config.maxSteps + 1;
    for (let stepIndex = 1; stepIndex <= config.maxSteps; stepIndex += 1) {
      if (Math.random() > config.surviveChance) {
        collapseStep = stepIndex;
        break;
      }
    }

    return { multipliers, collapseStep };
  }
}
