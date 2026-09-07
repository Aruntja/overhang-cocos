import { _decorator, Component, Label } from 'cc';
import { GAME_CONSTANTS } from '../utils/Constants';
import { UIModel } from '../utils/Types';

const { ccclass, property } = _decorator;

@ccclass('LadderController')
export class LadderController extends Component {
  /** Pre-created labels for the visible multiplier ladder rows. */
  @property([Label])
  public rowLabels: Label[] = [];

  private registrationHook: ((controller: LadderController) => void) | null = null;

  public setRegistrationHook(hook: (controller: LadderController) => void): void {
    this.registrationHook = hook;
  }

  protected onLoad(): void {
    this.registrationHook?.(this);
  }

  public updateDisplay(model: UIModel): void {
    const maxStart = Math.max(0, model.ladder.length - GAME_CONSTANTS.ladderVisibleRows);
    const startIndex = Math.min(Math.max(0, model.currentHeight - GAME_CONSTANTS.ladderVisibleRows + 1), maxStart);
    const activeIndex = model.currentHeight - 1;
    this.rowLabels.forEach((label, index) => {
      const ladderIndex = startIndex + index;
      const value = model.ladder[ladderIndex];
      const prefix = ladderIndex === activeIndex ? '> ' : '  ';
      label.string = value !== undefined ? `${prefix}${ladderIndex + 1}. ${value.toFixed(2)}x` : `${prefix}${ladderIndex + 1}. --`;
    });
  }
}
