import { _decorator, Component, Node, Sprite, tween, UIOpacity, Vec3 } from 'cc';
import { COLOR_SCHEME } from '../config/ColorScheme';
import { GAME_CONSTANTS } from '../utils/Constants';
import { colorFromHex } from '../utils/Helpers';

const { ccclass, property } = _decorator;

@ccclass('ParticleController')
export class ParticleController extends Component {
  /** Particle sprite used for spark and dust effects. */
  @property(Sprite)
  public particleSprite: Sprite | null = null;

  /** Enables softer dust-cloud tinting when true. */
  @property
  public useDustPalette = false;

  private registrationHook: ((controller: ParticleController) => void) | null = null;

  public setRegistrationHook(hook: (controller: ParticleController) => void): void {
    this.registrationHook = hook;
  }

  protected onLoad(): void {
    this.refreshPalette();
    this.registrationHook?.(this);
  }

  public refreshPalette(): void {
    if (!this.particleSprite) {
      this.particleSprite = this.getComponent(Sprite);
    }
    if (this.particleSprite) {
      const tint = this.useDustPalette ? COLOR_SCHEME.neon.yellow : COLOR_SCHEME.neon.cyan;
      this.particleSprite.color = colorFromHex(tint);
    }
  }

  public launch(origin: Vec3, upOffset: Vec3, downOffset: Vec3): void {
    const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
    opacity.opacity = 255;
    this.node.setPosition(origin);
    tween(this.node)
      .by(GAME_CONSTANTS.particleRiseDuration, { position: upOffset })
      .by(GAME_CONSTANTS.particleFallDuration, { position: downOffset })
      .call(() => this.node.destroy())
      .start();
    tween(opacity)
      .delay(GAME_CONSTANTS.particleFadeDelay)
      .to(GAME_CONSTANTS.particleFadeDuration, { opacity: 0 })
      .start();
  }

  public getWorldNode(): Node {
    return this.node;
  }
}
