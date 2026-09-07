import { _decorator, Component, Label, Node, ScrollView, Tween, tween, UIOpacity, Vec3 } from 'cc';
import { DifficultyKey } from './GameConstants';

const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
  @property(Label) public heightLabel: Label | null = null;
  @property(Label) public balanceLabel: Label | null = null;
  @property(Label) public multiplierLabel: Label | null = null;
  @property(Label) public payoutLabel: Label | null = null;
  @property(Label) public toastLabel: Label | null = null;
  @property(Node) public toastNode: Node | null = null;
  @property(Node) public resultBanner: Node | null = null;
  @property(Label) public resultBannerLabel: Label | null = null;
  @property(Node) public cashOutButton: Node | null = null;
  @property(Node) public controlBar: Node | null = null;
  @property(ScrollView) public ladderScroll: ScrollView | null = null;

  public lockControls(lock: boolean): void {
    if (!this.controlBar) return;
    const queue: Node[] = [this.controlBar];
    while (queue.length > 0) {
      const node = queue.shift()!;
      node.pauseSystemEvents(lock);
      queue.push(...node.children);
    }
  }

  public setRoundConfigLocked(lock: boolean): void {
    if (!this.controlBar) return;
    const names = new Set(['BetStepper', 'DifficultyStepper', 'StartButton']);
    const queue: Node[] = [this.controlBar];
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (names.has(node.name)) node.pauseSystemEvents(lock);
      queue.push(...node.children);
    }
  }

  public updateHeight(height: number): void {
    if (this.heightLabel) this.heightLabel.string = `Height ${height}`;
  }

  public updateBalance(balance: number): void {
    if (this.balanceLabel) this.balanceLabel.string = `Balance ${balance.toFixed(2)}`;
  }

  public updateMultiplier(mult: number, pulse = false): void {
    if (!this.multiplierLabel) return;
    this.multiplierLabel.string = `${mult.toFixed(2)}x`;
    if (!pulse) return;
    tween(this.multiplierLabel.node)
      .to(0.08, { scale: new Vec3(1.25, 1.25, 1) })
      .to(0.1, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  public updatePayout(value: number): void {
    if (this.payoutLabel) this.payoutLabel.string = `Payout ${value.toFixed(2)}`;
  }

  public setCashOutVisible(visible: boolean): void {
    if (this.cashOutButton) this.cashOutButton.active = visible;
  }

  public setDifficultyLabel(_difficulty: DifficultyKey): void {
    // Hook for ControlBar script bindings.
  }

  public showToast(message: string): void {
    if (!this.toastNode || !this.toastLabel) return;
    this.toastLabel.string = message;
    this.toastNode.active = true;

    const opacity = this.toastNode.getComponent(UIOpacity) || this.toastNode.addComponent(UIOpacity);
    Tween.stopAllByTarget(this.toastNode);
    Tween.stopAllByTarget(opacity);
    this.toastNode.setScale(new Vec3(0.9, 0.9, 1));
    this.toastNode.setPosition(0, 0, 0);
    opacity.opacity = 0;

    tween(opacity)
      .to(0.12, { opacity: 255 })
      .delay(0.6)
      .to(0.15, { opacity: 0 })
      .start();

    tween(this.toastNode)
      .to(0.12, { scale: new Vec3(1, 1, 1), position: new Vec3(0, 20, 0) })
      .delay(0.6)
      .call(() => (this.toastNode ? (this.toastNode.active = false) : undefined))
      .start();
  }

  public async showResult(win: boolean, amount: number): Promise<void> {
    if (!this.resultBanner || !this.resultBannerLabel) {
      this.showToast(win ? `WIN +${amount.toFixed(2)}` : 'BUST');
      await new Promise<void>((resolve) => setTimeout(resolve, 750));
      return;
    }
    const opacity = this.resultBanner.getComponent(UIOpacity) || this.resultBanner.addComponent(UIOpacity);
    opacity.opacity = 0;
    this.resultBanner.active = true;
    this.resultBanner.setScale(new Vec3(0.8, 0.8, 1));
    this.resultBannerLabel.string = win ? `WIN +${amount.toFixed(2)}` : 'BUST';

    await new Promise<void>((resolve) => {
      tween(this.resultBanner)
        .to(0.2, { scale: new Vec3(1, 1, 1) })
        .delay(1.2)
        .to(0.16, { scale: new Vec3(0.92, 0.92, 1) })
        .start();
      tween(opacity)
        .to(0.2, { opacity: 255 })
        .delay(1.35)
        .to(0.14, { opacity: 0 })
        .call(() => {
          if (this.resultBanner) this.resultBanner.active = false;
          resolve();
        })
        .start();
    });
  }
}
