import { _decorator, Component, Node, UITransform, Vec3 } from 'cc';
import { AnimationManager } from '../services/AnimationManager';
import { GAME_CONSTANTS } from '../utils/Constants';
import { DropSnapshot } from '../utils/Types';

const { ccclass, property } = _decorator;

@ccclass('SwingController')
export class SwingController extends Component {
  /** Rope child node that stretches from the anchor to the payload block. */
  @property(Node)
  public ropeNode: Node | null = null;

  /** Visual payload node rotated during pendulum movement. */
  @property(Node)
  public payloadNode: Node | null = null;

  /** Inspector override for the rope length in pixels. */
  @property
  public ropeLength = GAME_CONSTANTS.swingRopeLength;

  private animationManager: AnimationManager | null = null;
  private registrationHook: ((controller: SwingController) => void) | null = null;

  public setRegistrationHook(hook: (controller: SwingController) => void): void {
    this.registrationHook = hook;
  }

  public initialize(animationManager: AnimationManager): void {
    this.animationManager = animationManager;
  }

  protected onLoad(): void {
    this.registrationHook?.(this);
  }

  public async playIntro(targetY: number): Promise<void> {
    if (!this.animationManager) return;
    await this.animationManager.playSwingIntro(this.node, targetY);
  }

  public updateSwing(x: number, y: number, angleDegrees: number): void {
    this.node.setPosition(x, y, 0);
    this.node.angle = angleDegrees;
    if (this.payloadNode) {
      this.payloadNode.setPosition(0, -this.ropeLength, 0);
    }

    if (this.ropeNode) {
      this.ropeNode.setPosition(0, -this.ropeLength * 0.5, 0);
      const ropeTransform = this.ropeNode.getComponent(UITransform) ?? this.ropeNode.addComponent(UITransform);
      ropeTransform.setContentSize(ropeTransform.contentSize.width, this.ropeLength);
      this.ropeNode.setScale(new Vec3(1, 1, 1));
    }
  }

  public captureDropSnapshot(): DropSnapshot {
    return {
      x: this.node.position.x,
      y: this.node.position.y,
      angleDegrees: this.node.angle,
    };
  }
}
