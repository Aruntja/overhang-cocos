import { _decorator, Component, Label } from 'cc';
import { DifficultyKey, UIModel } from '../utils/Types';
import { formatCurrency } from '../utils/Helpers';

const { ccclass, property } = _decorator;

@ccclass('HUDController')
export class HUDController extends Component {
  /** Label showing the current tower height. */
  @property(Label)
  public heightLabel: Label | null = null;

  /** Label showing the player balance. */
  @property(Label)
  public balanceLabel: Label | null = null;

  private registrationHook: ((controller: HUDController) => void) | null = null;

  public setRegistrationHook(hook: (controller: HUDController) => void): void {
    this.registrationHook = hook;
  }

  protected onLoad(): void {
    this.registrationHook?.(this);
  }

  public updateDisplay(model: UIModel): void {
    if (this.heightLabel) this.heightLabel.string = `Height ${model.currentHeight}`;
    if (this.balanceLabel) this.balanceLabel.string = `Balance ${formatCurrency(model.balance)}`;
  }

  public setDifficultyLabel(_difficulty: DifficultyKey): void {
    // Reserved for future top-panel difficulty badges.
  }
}
