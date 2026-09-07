import { _decorator, Component, Node, Sprite, tween, Vec3 } from 'cc';
import { COLOR_SCHEME } from '../config/ColorScheme';
import { GAME_CONSTANTS } from '../utils/Constants';
import { colorFromHex } from '../utils/Helpers';

const { ccclass, property } = _decorator;

@ccclass('DebrisController')
export class DebrisController extends Component {
  /** Debris sprite used for collapse chunks. */
  @property(Sprite)
  public debrisSprite: Sprite | null = null;

  /** Lifetime used by the centralized tween launch. */
  @property
  public lifetime = GAME_CONSTANTS.debrisTravelDuration;

  private registrationHook: ((controller: DebrisController) => void) | null = null;

  public setRegistrationHook(hook: (controller: DebrisController) => void): void {
    this.registrationHook = hook;
  }

  protected onLoad(): void {
    if (!this.debrisSprite) {
      this.debrisSprite = this.getComponent(Sprite);
    }
    if (this.debrisSprite) {
      this.debrisSprite.color = colorFromHex(COLOR_SCHEME.neon.pink);
    }
    this.registrationHook?.(this);
  }

  public launch(origin: Vec3, velocityX: number, velocityY: number, rotationDelta: number): void {
    this.node.setPosition(origin);
    tween(this.node)
      .by(this.lifetime, { position: new Vec3(velocityX * this.lifetime, -velocityY * this.lifetime, 0), angle: rotationDelta })
      .call(() => this.node.destroy())
      .start();
  }

  public getWorldNode(): Node {
    return this.node;
  }
}
