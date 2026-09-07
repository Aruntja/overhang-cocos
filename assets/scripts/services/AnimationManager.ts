import { Node, Tween, tween, UIOpacity, Vec3 } from 'cc';
import { GAME_CONSTANTS } from '../utils/Constants';

export class AnimationManager {
  public playSwingIntro(node: Node, targetY: number): Promise<void> {
    return new Promise((resolve) => {
      tween(node)
        .to(
          GAME_CONSTANTS.introSwingDuration,
          { position: new Vec3(node.position.x, targetY, node.position.z) },
          { easing: 'quadOut' },
        )
        .call(resolve)
        .start();
    });
  }

  public playSquashSpring(node: Node): Promise<void> {
    Tween.stopAllByTarget(node);
    node.setScale(new Vec3(1, GAME_CONSTANTS.landingSquashScale, 1));
    return new Promise((resolve) => {
      tween(node)
        .to(GAME_CONSTANTS.landingSquashDuration, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .call(resolve)
        .start();
    });
  }

  public playDemolition(node: Node): Promise<void> {
    const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    return new Promise((resolve) => {
      tween(opacity)
        .to(GAME_CONSTANTS.demolitionFadeDuration, { opacity: 0 })
        .call(resolve)
        .start();
    });
  }

  public pulse(node: Node): void {
    Tween.stopAllByTarget(node);
    node.setScale(new Vec3(1, 1, 1));
    tween(node)
      .to(GAME_CONSTANTS.toastInDuration, { scale: new Vec3(GAME_CONSTANTS.multiplierPulseScale, GAME_CONSTANTS.multiplierPulseScale, 1) })
      .to(GAME_CONSTANTS.toastOutDuration, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  public animateToast(node: Node, opacity: UIOpacity): void {
    Tween.stopAllByTarget(node);
    Tween.stopAllByTarget(opacity);
    node.setScale(new Vec3(GAME_CONSTANTS.toastScaleFrom, GAME_CONSTANTS.toastScaleFrom, 1));
    node.setPosition(0, 0, 0);
    opacity.opacity = 0;

    tween(opacity)
      .to(GAME_CONSTANTS.toastInDuration, { opacity: 255 })
      .delay(GAME_CONSTANTS.toastHoldDuration)
      .to(GAME_CONSTANTS.toastOutDuration, { opacity: 0 })
      .start();

    tween(node)
      .to(GAME_CONSTANTS.toastInDuration, {
        scale: new Vec3(1, 1, 1),
        position: new Vec3(0, GAME_CONSTANTS.toastLiftY, 0),
      })
      .delay(GAME_CONSTANTS.toastHoldDuration)
      .start();
  }

  public animateResultBanner(node: Node, opacity: UIOpacity): Promise<void> {
    Tween.stopAllByTarget(node);
    Tween.stopAllByTarget(opacity);
    node.setScale(new Vec3(GAME_CONSTANTS.resultScaleFrom, GAME_CONSTANTS.resultScaleFrom, 1));
    opacity.opacity = 0;

    return new Promise((resolve) => {
      tween(node)
        .to(GAME_CONSTANTS.resultInDuration, { scale: new Vec3(GAME_CONSTANTS.resultScaleTo, GAME_CONSTANTS.resultScaleTo, 1) })
        .delay(GAME_CONSTANTS.resultHoldDuration)
        .to(GAME_CONSTANTS.resultOutDuration, { scale: new Vec3(GAME_CONSTANTS.resultScaleEnd, GAME_CONSTANTS.resultScaleEnd, 1) })
        .start();

      tween(opacity)
        .to(GAME_CONSTANTS.resultInDuration, { opacity: 255 })
        .delay(GAME_CONSTANTS.resultHoldDuration + GAME_CONSTANTS.resultOutDuration)
        .to(GAME_CONSTANTS.resultOutDuration, { opacity: 0 })
        .call(resolve)
        .start();
    });
  }
}
