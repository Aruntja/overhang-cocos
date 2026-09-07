import { _decorator, Camera, Component, Node, UITransform, Vec3, view } from 'cc';
import { GAME_CONSTANTS } from './GameConstants';

const { ccclass, property } = _decorator;

@ccclass('CameraController')
export class CameraController extends Component {
  @property(Camera)
  public mainCamera: Camera | null = null;

  @property(Node)
  public gameLayer: Node | null = null;

  private targetY = 0;

  public setTargetWorldY(y: number): void {
    this.targetY = y;
  }

  public resetToWorldY(y: number): void {
    if (!this.gameLayer) return;
    this.gameLayer.setPosition(this.gameLayer.position.x, -y, this.gameLayer.position.z);
    this.targetY = y;
  }

  update(): void {
    if (!this.gameLayer) return;
    const pos = this.gameLayer.position;
    const isResetting = this.targetY < -pos.y;
    const lerp = isResetting ? GAME_CONSTANTS.CAM_LERP_RESET : GAME_CONSTANTS.CAM_LERP;
    const newY = pos.y + (-this.targetY - pos.y) * lerp;
    this.gameLayer.setPosition(pos.x, newY, pos.z);
  }

  public calculateTargetYForTop(topBlockY: number, blockSize: number): number {
    const layerHeight =
      this.gameLayer?.getComponent(UITransform)?.contentSize.height || view.getDesignResolutionSize().height;
    const halfViewport = layerHeight * 0.5;
    const anchorY = halfViewport * GAME_CONSTANTS.CAMERA_FRAME_FRACTION;
    return Math.max(0, topBlockY - anchorY + blockSize * 0.5);
  }

  public worldToLayerY(worldY: number): number {
    if (!this.gameLayer) return worldY;
    return worldY - this.gameLayer.position.y;
  }

  public createLayerPosition(x: number, y: number): Vec3 {
    return new Vec3(x, this.worldToLayerY(y), 0);
  }
}
