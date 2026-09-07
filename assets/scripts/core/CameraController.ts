import { _decorator, Component, Node } from 'cc';
import { GAME_CONSTANTS, GAME_EVENTS } from '../utils/Constants';
import { GameEventBus } from '../utils/Helpers';

const { ccclass, property } = _decorator;

@ccclass('CameraController')
export class CameraController extends Component {
  /** World-space layer moved vertically to keep the tower framed. */
  @property(Node)
  public gameLayer: Node | null = null;

  private targetWorldY = 0;
  private blockSize: number = GAME_CONSTANTS.blockSize;

  public initialize(bus: GameEventBus): void {
    bus.on(GAME_EVENTS.blockPlaced, ({ block }) => {
      this.targetWorldY = this.calculateTargetWorldY(block.y);
    }, this);
    bus.on(GAME_EVENTS.roundEnded, () => {
      this.targetWorldY = 0;
    }, this);
  }

  public setBlockSize(blockSize: number): void {
    this.blockSize = blockSize;
  }

  public reset(): void {
    if (!this.gameLayer) return;
    this.targetWorldY = 0;
    this.gameLayer.setPosition(this.gameLayer.position.x, 0, this.gameLayer.position.z);
  }

  protected update(): void {
    if (!this.gameLayer) return;
    const currentY = this.gameLayer.position.y;
    const desiredY = -this.targetWorldY;
    const isResetting = desiredY > currentY;
    const lerp = isResetting ? GAME_CONSTANTS.cameraResetLerp : GAME_CONSTANTS.cameraLerp;
    this.gameLayer.setPosition(this.gameLayer.position.x, currentY + (desiredY - currentY) * lerp, this.gameLayer.position.z);
  }

  private calculateTargetWorldY(topBlockY: number): number {
    const halfViewport = GAME_CONSTANTS.designHeight * 0.5;
    const anchorY = halfViewport * GAME_CONSTANTS.cameraFrameFraction;
    return Math.max(0, topBlockY - anchorY + this.blockSize * 0.5);
  }
}
