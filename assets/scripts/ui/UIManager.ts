import { _decorator, Button, Component, Label, Node, UIOpacity } from 'cc';
import { GAME_CONFIG } from '../config/GameConfig';
import { AnimationManager } from '../services/AnimationManager';
import { StorageService } from '../services/StorageService';
import { GAME_EVENTS } from '../utils/Constants';
import { GameEventBus } from '../utils/Helpers';
import { GAME_STATES, BlockPlacedPayload, DifficultyKey, RoundEndedPayload, RoundStartedPayload, UIModel } from '../utils/Types';
import { ControlBarController } from './ControlBarController';
import { HUDController } from './HUDController';
import { LadderController } from './LadderController';

const { ccclass, property } = _decorator;

interface UIActions {
  startRound: () => void;
  cashOut: () => void;
  changeBet: (direction: number) => void;
  changeDifficulty: (direction: number) => void;
}

@ccclass('UIManager')
export class UIManager extends Component {
  /** Top HUD controller for balance, height, multiplier, and toast rendering. */
  @property(HUDController)
  public hudController: HUDController | null = null;

  /** Bottom control bar controller used for bet and difficulty input. */
  @property(ControlBarController)
  public controlBarController: ControlBarController | null = null;

  /** Left ladder controller used for visible multiplier steps. */
  @property(LadderController)
  public ladderController: LadderController | null = null;

  /** Cash-out button rendered as a sibling of the control bar. */
  @property(Button)
  public cashOutButton: Button | null = null;

  /** Root node for the animated round result banner. */
  @property(Node)
  public resultBanner: Node | null = null;

  /** Label shown inside the result banner. */
  @property(Label)
  public resultBannerLabel: Label | null = null;

  private animationManager: AnimationManager | null = null;
  private actions: UIActions | null = null;
  private uiModel: UIModel = {
    balance: GAME_CONFIG.defaultBalance,
    bestHeight: 0,
    currentHeight: 0,
    multiplier: 1,
    payout: GAME_CONFIG.defaultBet,
    bet: GAME_CONFIG.defaultBet,
    difficulty: GAME_CONFIG.defaultDifficulty,
    ladder: [],
    canCashOut: false,
    isRoundLocked: false,
  };

  public initialize(bus: GameEventBus, storageService: StorageService, animationManager: AnimationManager): void {
    this.animationManager = animationManager;
    this.hudController?.initialize(animationManager);
    this.uiModel = {
      ...this.uiModel,
      balance: storageService.getBalance(),
      bestHeight: storageService.getBestHeight(),
      bet: storageService.getBet(),
      difficulty: storageService.getDifficulty(),
      payout: storageService.getBet(),
    };
    this.refreshAll();

    bus.on(GAME_EVENTS.stateChanged, ({ current }) => {
      this.uiModel.isRoundLocked = current !== GAME_STATES.IDLE && current !== GAME_STATES.RESULT;
      this.uiModel.canCashOut = current === GAME_STATES.SWINGING && this.uiModel.currentHeight > 0;
      this.refreshAll();
    }, this);
    bus.on(GAME_EVENTS.roundStarted, (payload) => this.handleRoundStarted(payload), this);
    bus.on(GAME_EVENTS.blockPlaced, (payload) => this.handleBlockPlaced(payload), this);
    bus.on(GAME_EVENTS.roundEnded, (payload) => {
      void this.handleRoundEnded(payload);
    }, this);
  }

  public bindActions(actions: UIActions): void {
    this.actions = actions;
    this.controlBarController?.bindActions(actions);
  }

  public onCashOutPressed(): void {
    this.actions?.cashOut();
  }

  public updateLocalState(update: Partial<UIModel>): void {
    this.uiModel = { ...this.uiModel, ...update };
    this.refreshAll();
  }

  public showToast(message: string): void {
    this.hudController?.showToast(message);
  }

  public setDifficulty(difficulty: DifficultyKey): void {
    this.uiModel.difficulty = difficulty;
    this.hudController?.setDifficultyLabel(difficulty);
    this.controlBarController?.setDifficultyLabel(difficulty);
    this.refreshAll();
  }

  private handleRoundStarted(payload: RoundStartedPayload): void {
    this.uiModel = {
      ...this.uiModel,
      difficulty: payload.difficulty,
      bet: payload.bet,
      balance: payload.balance,
      payout: payload.bet,
      multiplier: 1,
      ladder: payload.ladder,
      currentHeight: 0,
      canCashOut: false,
    };
    this.showToast('Connecting complete');
    this.refreshAll();
  }

  private handleBlockPlaced(payload: BlockPlacedPayload): void {
    this.uiModel = {
      ...this.uiModel,
      currentHeight: payload.height,
      multiplier: payload.multiplier,
      payout: payload.payout,
      ladder: payload.ladder,
      canCashOut: true,
    };
    this.refreshAll();
    this.hudController?.pulseMultiplier();
  }

  private async handleRoundEnded(payload: RoundEndedPayload): Promise<void> {
    this.uiModel.balance = payload.balance;
    this.uiModel.canCashOut = false;
    this.refreshAll();
    await this.showResult(payload.win, payload.payout);
  }

  private refreshAll(): void {
    this.hudController?.updateDisplay(this.uiModel);
    this.controlBarController?.updateDisplay(this.uiModel);
    this.ladderController?.updateDisplay(this.uiModel);
    if (this.cashOutButton) {
      this.cashOutButton.node.active = this.uiModel.canCashOut;
      this.cashOutButton.interactable = this.uiModel.canCashOut;
    }
  }

  private async showResult(win: boolean, payout: number): Promise<void> {
    if (!this.resultBanner || !this.resultBannerLabel || !this.animationManager) {
      this.showToast(win ? `WIN +${payout.toFixed(2)}` : 'BUST');
      return;
    }
    this.resultBanner.active = true;
    this.resultBannerLabel.string = win ? `WIN +${payout.toFixed(2)}` : 'BUST';
    const opacity = this.resultBanner.getComponent(UIOpacity) ?? this.resultBanner.addComponent(UIOpacity);
    await this.animationManager.animateResultBanner(this.resultBanner, opacity);
    this.resultBanner.active = false;
  }
}
