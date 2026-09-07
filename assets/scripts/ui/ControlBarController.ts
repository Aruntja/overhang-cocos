import { _decorator, Button, Component, Label } from 'cc';
import { DifficultyKey, UIModel } from '../utils/Types';
import { formatCurrency } from '../utils/Helpers';

const { ccclass, property } = _decorator;

interface ControlBarActions {
  startRound: () => void;
  cashOut: () => void;
  changeBet: (direction: number) => void;
  changeDifficulty: (direction: number) => void;
}

@ccclass('ControlBarController')
export class ControlBarController extends Component {
  /** Label used for the current bet amount. */
  @property(Label)
  public betLabel: Label | null = null;

  /** Label used for the selected difficulty. */
  @property(Label)
  public difficultyLabel: Label | null = null;

  /** Primary action button to start a round. */
  @property(Button)
  public actionButton: Button | null = null;

  /** Optional cash-out button shown during an active round. */
  @property(Button)
  public cashOutButton: Button | null = null;

  private actions: ControlBarActions | null = null;
  private registrationHook: ((controller: ControlBarController) => void) | null = null;

  public setRegistrationHook(hook: (controller: ControlBarController) => void): void {
    this.registrationHook = hook;
  }

  public bindActions(actions: ControlBarActions): void {
    this.actions = actions;
  }

  protected onLoad(): void {
    this.registrationHook?.(this);
  }

  public updateDisplay(model: UIModel): void {
    if (this.betLabel) this.betLabel.string = `Bet ${formatCurrency(model.bet)}`;
    if (this.difficultyLabel) this.difficultyLabel.string = model.difficulty.toUpperCase();
    if (this.cashOutButton) this.cashOutButton.node.active = model.canCashOut;
    if (this.actionButton) this.actionButton.interactable = !model.isRoundLocked;
  }

  public setInputLocked(locked: boolean): void {
    if (this.actionButton) this.actionButton.interactable = !locked;
  }

  public onStartPressed(): void {
    this.actions?.startRound();
  }

  public onCashOutPressed(): void {
    this.actions?.cashOut();
  }

  public onBetDownPressed(): void {
    this.actions?.changeBet(-1);
  }

  public onBetUpPressed(): void {
    this.actions?.changeBet(1);
  }

  public onDifficultyPreviousPressed(): void {
    this.actions?.changeDifficulty(-1);
  }

  public onDifficultyNextPressed(): void {
    this.actions?.changeDifficulty(1);
  }

  public setDifficultyLabel(difficulty: DifficultyKey): void {
    if (this.difficultyLabel) this.difficultyLabel.string = difficulty.toUpperCase();
  }
}
