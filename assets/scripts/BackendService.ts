import { _decorator, Component } from 'cc';
import { DIFFICULTIES, DifficultyKey } from './GameConstants';

const { ccclass } = _decorator;

export interface RoundData {
  multipliers: number[];
  collapseStep: number;
}

@ccclass('BackendService')
export class BackendService extends Component {
  public async connect(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 280));
  }

  public createRound(difficulty: DifficultyKey): RoundData {
    const cfg = DIFFICULTIES[difficulty];
    const multipliers: number[] = [];

    let value = 1;
    for (let i = 0; i < cfg.maxSteps; i++) {
      value *= cfg.growth;
      multipliers.push(Number(value.toFixed(2)));
    }

    let collapseStep = cfg.maxSteps + 1;
    for (let i = 1; i <= cfg.maxSteps; i++) {
      if (Math.random() > cfg.surviveChance) {
        collapseStep = i;
        break;
      }
    }

    return { multipliers, collapseStep };
  }
}
