import { _decorator, Component, Label, Node, UIOpacity } from 'cc';
import { AnimationManager } from '../services/AnimationManager';
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

  /** Label showing the active multiplier. */
  @property(Label)
  public multiplierLabel: Label | null = null;

  /** Label showing the current cash-out value. */
  @property(Label)
  public payoutLabel: Label | null = null;

  /** Toast wrapper node shown for round messaging. */
  @property(Node)
  public toastNode: Node | null = null;

  /** Label rendered inside the toast wrapper. */
  @property(Label)
  public toastLabel: Label | null = null;

  private animationManager: AnimationManager | null = null;
  private registrationHook: ((controller: HUDController) => void) | null = null;

  public setRegistrationHook(hook: (controller: HUDController) => void): void {
    this.registrationHook = hook;
  }

  public initialize(animationManager: AnimationManager): void {
    this.animationManager = animationManager;
  }

  protected onLoad(): void {
    this.registrationHook?.(this);
  }

  public updateDisplay(model: UIModel): void {
    if (this.heightLabel) this.heightLabel.string = `Height ${model.currentHeight}`;
    if (this.balanceLabel) this.balanceLabel.string = `Balance ${formatCurrency(model.balance)}`;
    if (this.multiplierLabel) this.multiplierLabel.string = `${model.multiplier.toFixed(2)}x`;
    if (this.payoutLabel) this.payoutLabel.string = `Payout ${formatCurrency(model.payout)}`;
  }

  public pulseMultiplier(): void {
    if (this.multiplierLabel?.node && this.animationManager) {
      this.animationManager.pulse(this.multiplierLabel.node);
    }
  }

  public showToast(message: string): void {
    if (!this.toastNode || !this.toastLabel || !this.animationManager) return;
    this.toastNode.active = true;
    this.toastLabel.string = message;
    const opacity = this.toastNode.getComponent(UIOpacity) ?? this.toastNode.addComponent(UIOpacity);
    this.animationManager.animateToast(this.toastNode, opacity);
  }

  public setDifficultyLabel(_difficulty: DifficultyKey): void {
    // Top-panel difficulty text can be added later without changing the manager contract.
  }
}
