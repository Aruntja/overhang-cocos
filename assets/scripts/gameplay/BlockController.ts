import { _decorator, Component, Node, Sprite } from 'cc';
import { AnimationManager } from '../services/AnimationManager';
import { COLOR_SCHEME } from '../config/ColorScheme';
import { colorFromHex } from '../utils/Helpers';

const { ccclass, property } = _decorator;

@ccclass('BlockController')
export class BlockController extends Component {
  /** Primary sprite renderer for the stack block. */
  @property(Sprite)
  public blockSprite: Sprite | null = null;

  /** When true the block uses the floor styling variant. */
  @property
  public isFloor = false;

  private animationManager: AnimationManager | null = null;
  private registrationHook: ((controller: BlockController) => void) | null = null;

  public setRegistrationHook(hook: (controller: BlockController) => void): void {
    this.registrationHook = hook;
  }

  public initialize(animationManager: AnimationManager, isFloor: boolean): void {
    this.animationManager = animationManager;
    this.isFloor = isFloor;
    this.applyPalette();
  }

  protected onLoad(): void {
    this.applyPalette();
    this.registrationHook?.(this);
  }

  public setBlockPosition(x: number, y: number): void {
    this.node.setPosition(x, y, 0);
  }

  public async playLanding(): Promise<void> {
    if (!this.animationManager) return;
    await this.animationManager.playSquashSpring(this.node);
  }

  public async playCollapse(): Promise<void> {
    if (!this.animationManager) return;
    await this.animationManager.playDemolition(this.node);
  }

  public getWorldNode(): Node {
    return this.node;
  }

  private applyPalette(): void {
    if (!this.blockSprite) {
      this.blockSprite = this.getComponent(Sprite);
    }
    if (!this.blockSprite) return;
    this.blockSprite.color = colorFromHex(this.isFloor ? COLOR_SCHEME.blocks.floor : COLOR_SCHEME.blocks.base);
  }
}
