import {
  _decorator,
  Component,
  instantiate,
  Node,
  Prefab,
  Sprite,
  Label,
  UITransform,
  Vec3,
  Color,
  tween,
  UIOpacity,
} from 'cc';
import { BackendService, RoundData } from './BackendService';
import { CameraController } from './CameraController';
import { DifficultyKey, GAME_CONSTANTS, GameState, LOCAL_STORAGE_KEYS } from './GameConstants';
import { PhysicsSimulator } from './PhysicsSimulator';
import { UIManager } from './UIManager';

const { ccclass, property } = _decorator;

interface StackedBlock {
  node: Node;
  worldX: number;
  worldY: number;
}

@ccclass('GameManager')
export class GameManager extends Component {
  @property(Node) public gameLayer: Node | null = null;
  @property(Node) public uiLayer: Node | null = null;

  @property(Prefab) public blockPrefab: Prefab | null = null;
  @property(Prefab) public swingPrefab: Prefab | null = null;
  @property(Prefab) public debrisPrefab: Prefab | null = null;
  @property(Prefab) public particlePrefab: Prefab | null = null;
  @property(Prefab) public resultBannerPrefab: Prefab | null = null;
  @property(Prefab) public controlBarPrefab: Prefab | null = null;

  @property(BackendService) public backend: BackendService | null = null;
  @property(PhysicsSimulator) public physics: PhysicsSimulator | null = null;
  @property(CameraController) public cameraController: CameraController | null = null;
  @property(UIManager) public uiManager: UIManager | null = null;

  public state: GameState = GameState.START;
  private difficulty: DifficultyKey = 'medium';
  private round: RoundData | null = null;

  private blockSize = 150;
  private baseY = -790;

  private currentStep = 0;
  private currentMultiplier = 1;
  private bet = 10;
  private balance = 1000;
  private bestHeight = 0;

  private blocks: StackedBlock[] = [];
  private swingNode: Node | null = null;
  private fallingNode: Node | null = null;
  private fallVelY = 0;
  private fallRot = 0;
  private squashTime = 0;

  onLoad(): void {
    this.blockSize = Math.round(GAME_CONSTANTS.DESIGN_WIDTH * 0.139);
    this.balance = Number(localStorage.getItem(LOCAL_STORAGE_KEYS.balance) || '1000');
    this.bestHeight = Number(localStorage.getItem(LOCAL_STORAGE_KEYS.best) || '0');
    this.setupDesignNodes();
    this.setupUIOverlay();
    this.resetTower();
  }

  private setupDesignNodes(): void {
    if (!this.node.getComponent(UITransform)) this.node.addComponent(UITransform);
    const tx = this.node.getComponent(UITransform)!;
    tx.setContentSize(GAME_CONSTANTS.DESIGN_WIDTH, GAME_CONSTANTS.DESIGN_HEIGHT);

    if (!this.gameLayer) {
      this.gameLayer = new Node('GameLayer');
      this.gameLayer.addComponent(UITransform).setContentSize(GAME_CONSTANTS.DESIGN_WIDTH, GAME_CONSTANTS.DESIGN_HEIGHT);
      this.node.addChild(this.gameLayer);
    }

    if (!this.uiLayer) {
      this.uiLayer = new Node('UILayer');
      this.uiLayer.addComponent(UITransform).setContentSize(GAME_CONSTANTS.DESIGN_WIDTH, GAME_CONSTANTS.DESIGN_HEIGHT);
      this.node.addChild(this.uiLayer);
    }
  }

  private setupUIOverlay(): void {
    if (!this.uiLayer) return;

    if (this.resultBannerPrefab && !this.uiLayer.getChildByName('ResultBanner')) {
      const rb = instantiate(this.resultBannerPrefab);
      rb.name = 'ResultBanner';
      rb.setPosition(0, 720, 0);
      this.uiLayer.addChild(rb);
      if (this.uiManager) {
        this.uiManager.resultBanner = rb;
        this.uiManager.resultBannerLabel = rb.getComponentInChildren(Label);
      }
    }

    if (this.controlBarPrefab && !this.uiLayer.getChildByName('ControlBar')) {
      const bar = instantiate(this.controlBarPrefab);
      bar.name = 'ControlBar';
      bar.setPosition(0, -860, 0);
      this.uiLayer.addChild(bar);
      if (this.uiManager) this.uiManager.controlBar = bar;
    }
  }

  private resetTower(): void {
    if (!this.gameLayer) return;
    this.gameLayer.removeAllChildren();
    this.swingNode = null;
    this.fallingNode = null;
    this.fallVelY = 0;
    this.fallRot = 0;
    this.squashTime = 0;
    this.blocks = [];
    this.currentStep = 0;
    this.currentMultiplier = 1;
    this.state = GameState.START;

    const base = this.createBlockNode(true);
    const baseX = 0;
    const baseY = this.baseY;
    base.setPosition(baseX, baseY, 0);
    this.blocks.push({ node: base, worldX: baseX, worldY: baseY });

    this.uiManager?.updateHeight(0);
    this.uiManager?.updateBalance(this.balance);
    this.uiManager?.updateMultiplier(1);
    this.uiManager?.updatePayout(this.bet);
    this.uiManager?.setCashOutVisible(false);
    this.uiManager?.setRoundConfigLocked(false);
    this.cameraController?.resetToWorldY(0);
  }

  public async startRound(): Promise<void> {
    if (!this.backend || !this.physics || !this.gameLayer) return;
    if (this.state !== GameState.START && this.state !== GameState.RESULT) return;
    if (!this.swingPrefab) {
      this.uiManager?.showToast('Swing prefab is missing');
      return;
    }
    if (this.bet > this.balance) {
      this.uiManager?.showToast('Insufficient balance');
      return;
    }

    const priorState = this.state;
    this.state = GameState.CONNECTING;
    this.uiManager?.lockControls(true);
    this.uiManager?.showToast('Connecting...');
    try {
      await this.backend.connect();
      this.round = this.backend.createRound(this.difficulty);
      if (!this.spawnSwing(true)) {
        throw new Error('Failed to spawn swing');
      }
      this.balance -= this.bet;
      this.persistBalance();
      this.uiManager?.updateBalance(this.balance);
      this.uiManager?.lockControls(false);
      this.uiManager?.setRoundConfigLocked(true);
      this.state = GameState.SWINGING;
    } catch (_error) {
      this.state = priorState === GameState.RESULT ? GameState.START : priorState;
      this.resetTower();
      this.uiManager?.lockControls(false);
      this.uiManager?.setRoundConfigLocked(false);
      this.uiManager?.showToast('Connection failed');
    }
  }

  private spawnSwing(withIntro: boolean): boolean {
    if (!this.gameLayer || !this.swingPrefab) return false;
    if (this.swingNode?.isValid) this.swingNode.destroy();
    this.swingNode = null;
    const top = this.blocks[this.blocks.length - 1];
    if (!top) return false;
    const targetY = top.worldY + GAME_CONSTANTS.SWING_GAP_ABOVE;

    this.swingNode = instantiate(this.swingPrefab);
    this.swingNode.name = 'Swing';
    this.gameLayer.addChild(this.swingNode);

    const spawnY = withIntro ? targetY + 220 : targetY;
    this.swingNode.setPosition(0, spawnY, 0);

    if (withIntro) {
      tween(this.swingNode)
        .to(0.5, { position: new Vec3(0, targetY, 0) }, { easing: 'quadOut' })
        .start();
    }
    return true;
  }

  public tryDrop(): void {
    if (this.state !== GameState.SWINGING || !this.swingNode || !this.gameLayer) return;

    this.fallingNode = this.createBlockNode(false);
    const pos = this.swingNode.position;
    this.fallingNode.setPosition(pos.x, pos.y, 0);
    this.fallVelY = 0;
    this.fallRot = this.swingNode.angle;
    this.fallingNode.angle = this.fallRot;

    this.swingNode.destroy();
    this.swingNode = null;
    this.state = GameState.FALLING;
  }

  update(dt: number): void {
    if (!this.physics || !this.cameraController) return;

    if (this.state === GameState.SWINGING && this.swingNode) {
      const top = this.blocks[this.blocks.length - 1];
      const amp = GAME_CONSTANTS.DESIGN_WIDTH * GAME_CONSTANTS.SWING_AMPLITUDE_FRAC;
      const swing = this.physics.updateSwing(top.worldX, amp, dt);
      const y = top.worldY + GAME_CONSTANTS.SWING_GAP_ABOVE;
      this.swingNode.setPosition(swing.x, y, 0);
      this.swingNode.angle = swing.angle * (180 / Math.PI);
    }

    if (this.state === GameState.FALLING && this.fallingNode) {
      const fallState = {
        pos: this.fallingNode.position.clone(),
        velY: this.fallVelY,
        rotZ: this.fallRot,
        squash: 1,
      };
      this.physics.stepFall(fallState, dt);
      this.fallVelY = fallState.velY;
      this.fallRot = fallState.rotZ;
      this.fallingNode.setPosition(fallState.pos.x, fallState.pos.y, 0);
      this.fallingNode.angle = this.fallRot;

      const landingY = this.blocks[this.blocks.length - 1].worldY + this.blockSize;
      if (this.fallingNode.position.y <= landingY) {
        this.fallingNode.setPosition(this.fallingNode.position.x, landingY, 0);
        this.state = GameState.LANDED;
        this.squashTime = 0;
      }
    }

    if (this.state === GameState.LANDED && this.fallingNode) {
      this.squashTime += dt;
      const s = this.physics.squashSpring(this.squashTime);
      this.fallingNode.setScale(1, s, 1);
      if (this.squashTime >= 0.18) {
        this.fallingNode.setScale(1, 1, 1);
        this.finalizeStep();
      }
    }
  }

  private finalizeStep(): void {
    if (!this.fallingNode || !this.round) return;
    const nextStep = this.currentStep + 1;
    const shouldCrash = nextStep >= this.round.collapseStep;
    const below = this.blocks[this.blocks.length - 1];
    const maxCenterOffset = this.blockSize * 0.9;
    const centerOffset = Math.abs(this.fallingNode.position.x - below.worldX);
    const isAligned = centerOffset <= maxCenterOffset;

    if (shouldCrash || !isAligned) {
      this.spawnDebrisBurst(this.fallingNode.position);
      this.fallingNode.destroy();
      this.fallingNode = null;
      this.finishRound(false);
      return;
    }

    const landed = this.fallingNode;
    this.fallingNode = null;

    const targetX = landed.position.x;
    const targetY = below.worldY + this.blockSize;
    landed.setPosition(targetX, targetY, 0);

    this.blocks.push({ node: landed, worldX: targetX, worldY: targetY });
    this.currentStep = nextStep;
    this.currentMultiplier = this.round.multipliers[this.currentStep - 1] || this.currentMultiplier;

    this.bestHeight = Math.max(this.bestHeight, this.currentStep);
    localStorage.setItem(LOCAL_STORAGE_KEYS.best, String(this.bestHeight));

    this.uiManager?.updateHeight(this.currentStep);
    this.uiManager?.updateMultiplier(this.currentMultiplier, true);
    this.uiManager?.updatePayout(this.bet * this.currentMultiplier);
    this.uiManager?.setCashOutVisible(true);

    if (this.currentStep % 5 === 0) this.uiManager?.showToast(`FLOOR ${this.currentStep}!`);

    const cameraY = this.cameraController!.calculateTargetYForTop(targetY, this.blockSize);
    this.cameraController!.setTargetWorldY(cameraY);
    this.spawnParticles(landed.position);
    this.spawnSwing(false);
    this.state = GameState.SWINGING;
  }

  public cashOut(): void {
    if (!this.round || this.state !== GameState.SWINGING || this.currentStep <= 0) return;
    const payout = this.bet * this.currentMultiplier;
    this.balance += payout;
    this.persistBalance();
    this.uiManager?.updateBalance(this.balance);
    this.finishRound(true, payout);
  }

  private async finishRound(win: boolean, payout = 0): Promise<void> {
    this.state = GameState.RESULT;
    this.round = null;
    if (this.swingNode?.isValid) this.swingNode.destroy();
    this.swingNode = null;
    if (this.fallingNode?.isValid) this.fallingNode.destroy();
    this.fallingNode = null;

    if (!win) {
      await this.demolishTower();
    }

    if (this.uiManager) {
      await this.uiManager.showResult(win, payout);
      this.uiManager.setCashOutVisible(false);
      this.uiManager.setRoundConfigLocked(false);
      this.uiManager.lockControls(false);
    } else {
      await new Promise<void>((resolve) => setTimeout(resolve, 750));
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    this.resetTower();
  }

  private async demolishTower(): Promise<void> {
    for (let i = this.blocks.length - 1; i > 0; i--) {
      const block = this.blocks[i];
      this.spawnDebrisBurst(block.node.position);
      await new Promise<void>((resolve) => {
        const opacity = block.node.getComponent(UIOpacity) || block.node.addComponent(UIOpacity);
        tween(opacity)
          .to(0.08, { opacity: 0 })
          .call(() => {
            block.node.destroy();
            resolve();
          })
          .start();
      });
      this.blocks.pop();
    }
    this.currentStep = 0;
    this.uiManager?.updateHeight(0);
  }

  private createBlockNode(isBase: boolean): Node {
    if (this.blockPrefab) {
      const node = instantiate(this.blockPrefab);
      const sprite = node.getComponent(Sprite);
      if (sprite) {
        sprite.color = new Color().fromHEX(isBase ? '#8a3226' : '#c8493c');
      }
      this.gameLayer?.addChild(node);
      return node;
    }

    const node = new Node(isBase ? 'BaseBlock' : 'Block');
    const tx = node.addComponent(UITransform);
    tx.setContentSize(this.blockSize, this.blockSize);
    const sprite = node.addComponent(Sprite);
    sprite.color = new Color().fromHEX(isBase ? '#8a3226' : '#c8493c');
    this.gameLayer?.addChild(node);
    return node;
  }

  private spawnDebrisBurst(origin: Vec3): void {
    for (let i = 0; i < 8; i++) {
      const node = this.debrisPrefab ? instantiate(this.debrisPrefab) : this.createFallbackParticle('Debris');
      this.gameLayer?.addChild(node);
      node.setPosition(origin.x + (Math.random() - 0.5) * this.blockSize, origin.y + 12, 0);
      const vx = (Math.random() - 0.5) * 420;
      const vy = Math.random() * 420 + 120;
      tween(node)
        .by(0.45, { position: new Vec3(vx * 0.45, -vy * 0.45, 0), angle: (Math.random() - 0.5) * 200 })
        .call(() => node.destroy())
        .start();
    }
  }

  private spawnParticles(origin: Vec3): void {
    for (let i = 0; i < 12; i++) {
      const node = this.particlePrefab ? instantiate(this.particlePrefab) : this.createFallbackParticle('Particle');
      this.gameLayer?.addChild(node);
      node.setPosition(origin.x + (Math.random() - 0.5) * 70, origin.y + (Math.random() - 0.5) * 20, 0);
      const vx = (Math.random() - 0.5) * 260;
      const vy = Math.random() * 160 + 40;
      tween(node)
        .by(0.3, { position: new Vec3(vx * 0.3, vy * 0.3, 0) })
        .by(0.3, { position: new Vec3(vx * 0.2, -vy * 0.5, 0) })
        .call(() => node.destroy())
        .start();
    }
  }

  private createFallbackParticle(name: string): Node {
    const node = new Node(name);
    const tx = node.addComponent(UITransform);
    tx.setContentSize(10, 10);
    const sp = node.addComponent(Sprite);
    sp.color = new Color().fromHEX('#00e4ff');
    return node;
  }

  private persistBalance(): void {
    localStorage.setItem(LOCAL_STORAGE_KEYS.balance, this.balance.toFixed(2));
  }
}
