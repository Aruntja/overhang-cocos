import { _decorator, Component, Vec3 } from 'cc';
import { GAME_CONSTANTS } from './GameConstants';

const { ccclass } = _decorator;

export interface FallingBlockBody {
  pos: Vec3;
  velY: number;
  rotZ: number;
  squash: number;
}

@ccclass('PhysicsSimulator')
export class PhysicsSimulator extends Component {
  public swingTime = 0;

  public updateSwing(baseX: number, amplitudePx: number, dt: number): { x: number; angle: number } {
    this.swingTime += dt * GAME_CONSTANTS.BASE_SWING_SPEED;
    const x = baseX + Math.sin(this.swingTime) * amplitudePx;
    const angle = Math.sin(this.swingTime) * GAME_CONSTANTS.MAX_SWING_ANGLE;
    return { x, angle };
  }

  public stepFall(body: FallingBlockBody, dt: number): void {
    body.velY += GAME_CONSTANTS.GRAVITY * dt;
    body.pos.y -= body.velY * dt;
    body.rotZ *= 0.88;
  }

  public squashSpring(t: number): number {
    const dur = 0.18;
    const frac = Math.min(t / dur, 1);
    const back = 1.70158;
    const t1 = frac - 1;
    return 0.8 + 0.2 * (1 + (back + 1) * t1 * t1 * t1 + back * t1 * t1);
  }
}
