import { GAME_CONSTANTS } from '../utils/Constants';
import { FallingBody, SwingFrame } from '../utils/Types';

export class PhysicsSimulator {
  private swingTime = 0;

  public resetSwing(): void {
    this.swingTime = 0;
  }

  public updateSwing(baseX: number, deltaTime: number): SwingFrame {
    this.swingTime += deltaTime * GAME_CONSTANTS.baseSwingSpeed;
    return {
      x: baseX + Math.sin(this.swingTime) * (GAME_CONSTANTS.designWidth * GAME_CONSTANTS.swingAmplitudeFraction),
      angleRadians: Math.sin(this.swingTime) * GAME_CONSTANTS.maxSwingAngleRadians,
    };
  }

  public stepFall(body: FallingBody, deltaTime: number): FallingBody {
    const nextVelocityY = body.velocityY + GAME_CONSTANTS.gravity * deltaTime;
    return {
      x: body.x,
      y: body.y - nextVelocityY * deltaTime,
      velocityY: nextVelocityY,
      rotation: body.rotation * GAME_CONSTANTS.fallRotationDamping,
    };
  }
}
