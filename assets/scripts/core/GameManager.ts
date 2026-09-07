import { _decorator, Component, instantiate, Node, Prefab, Sprite, UITransform, Vec3 } from 'cc';
import { DIFFICULTY_ORDER } from '../config/DifficultyConfig';
import { GAME_CONFIG } from '../config/GameConfig';
import { COLOR_SCHEME } from '../config/ColorScheme';
import { BlockController } from '../gameplay/BlockController';
import { DebrisController } from '../gameplay/DebrisController';
import { ParticleController } from '../gameplay/ParticleController';
import { SwingController } from '../gameplay/SwingController';
import { AnimationManager } from '../services/AnimationManager';
import { BackendService } from '../services/BackendService';
import { SoundManager } from '../services/SoundManager';
import { StorageService } from '../services/StorageService';
import { GAME_CONSTANTS, GAME_EVENTS } from '../utils/Constants';
import { GameEventBus, clamp, colorFromHex, emitStateChange, wait, wrapDifficulty } from '../utils/Helpers';
import { UIManager } from '../ui/UIManager';
import { DifficultyKey, FallingBody, GAME_STATES, GameState, RoundData, StackBlockModel } from '../utils/Types';
import { CameraController } from './CameraController';
import { PhysicsSimulator } from './PhysicsSimulator';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
  /** Container holding stacked block instances. */
  @property(Node)
  public blocksContainer: Node | null = null;

  /** Container holding the active swing instance. */
  @property(Node)
  public swingContainer: Node | null = null;

  /** Container holding collapse debris instances. */
  @property(Node)
  public debrisContainer: Node | null = null;

  /** Container holding sparkle and dust particle instances. */
  @property(Node)
  public particlesContainer: Node | null = null;

  /** Prefab for stackable round blocks. */
  @property(Prefab)
  public blockBasePrefab: Prefab | null = null;

  /** Prefab for the permanent floor block. */
  @property(Prefab)
  public blockFloorPrefab: Prefab | null = null;

  /** Prefab for the swinging drop indicator. */
  @property(Prefab)
  public blockSwingPrefab: Prefab | null = null;

  /** Prefab used for collapsing debris chunks. */
  @property(Prefab)
  public debrisPrefab: Prefab | null = null;

  /** Prefab used for landing spark particles. */
  @property(Prefab)
  public particlePrefab: Prefab | null = null;

  /** Prefab used for dust cloud particles. */
  @property(Prefab)
  public dustCloudPrefab: Prefab | null = null;

  /** Camera controller attached to the GameLayer node. */
  @property(CameraController)
  public cameraController: CameraController | null = null;

  /** UI manager attached to the UILayer node. */
  @property(UIManager)
  public uiManager: UIManager | null = null;

  private readonly eventBus = new GameEventBus();
  private readonly storageService = new StorageService();
  private readonly backendService = new BackendService();
  private readonly soundManager = new SoundManager();
  private readonly animationManager = new AnimationManager();
  private readonly physicsSimulator = new PhysicsSimulator();

  private state: GameState = GAME_STATES.IDLE;
  private difficulty: DifficultyKey = GAME_CONFIG.defaultDifficulty;
  private roundData: RoundData | null = null;
  private bet: number = GAME_CONFIG.defaultBet;
  private balance: number = GAME_CONFIG.defaultBalance;
  private bestHeight = 0;
  private currentHeight = 0;
  private currentMultiplier = 1;
  private activeSwing: SwingController | null = null;
  private activeFall: { controller: BlockController; body: FallingBody } | null = null;
  private isResolvingLanding = false;
  private stackBlocks: Array<{ controller: BlockController; model: StackBlockModel }> = [];

  protected onLoad(): void {
    this.difficulty = this.storageService.getDifficulty();
    this.bet = this.storageService.getBet();
    this.balance = this.storageService.getBalance();
    this.bestHeight = this.storageService.getBestHeight();

    this.cameraController?.setBlockSize(GAME_CONSTANTS.blockSize);
    this.cameraController?.initialize(this.eventBus);
    this.uiManager?.initialize(this.eventBus, this.storageService, this.animationManager);
    this.uiManager?.bindActions({
      startRound: () => {
        void this.startRound();
      },
      cashOut: () => {
        void this.cashOut();
      },
      changeBet: (direction) => this.adjustBet(direction),
      changeDifficulty: (direction) => this.adjustDifficulty(direction),
    });
    this.resetRound();
  }

  protected update(deltaTime: number): void {
    if (this.state === GAME_STATES.SWINGING) {
      this.updateSwing(deltaTime);
    }

    if (this.state === GAME_STATES.FALLING && this.activeFall) {
      const nextBody = this.physicsSimulator.stepFall(this.activeFall.body, deltaTime);
      this.activeFall.body = nextBody;
      this.activeFall.controller.setBlockPosition(nextBody.x, nextBody.y);
      this.activeFall.controller.node.angle = nextBody.rotation;
      void this.detectLanding();
    }
  }

  public async startRound(): Promise<void> {
    if (this.state !== GAME_STATES.IDLE && this.state !== GAME_STATES.RESULT) return;
    if (this.bet > this.balance) {
      this.uiManager?.showToast('Insufficient balance');
      return;
    }

    this.transitionTo(GAME_STATES.CONNECTING);
    this.uiManager?.showToast('Connecting...');

    let deductedBet = false;

    try {
      await this.backendService.connect();
      this.roundData = this.backendService.createRound(this.difficulty);
      this.balance -= this.bet;
      deductedBet = true;
      this.storageService.setBalance(this.balance);
      const hasSwing = await this.spawnSwing(true);
      if (!hasSwing) {
        throw new Error('Unable to create swing');
      }
      this.eventBus.emit(GAME_EVENTS.roundStarted, {
        difficulty: this.difficulty,
        bet: this.bet,
        balance: this.balance,
        ladder: this.roundData.multipliers,
      });
      this.soundManager.play('round-start');
      this.transitionTo(GAME_STATES.SWINGING);
    } catch (_error) {
      if (deductedBet) {
        await this.handleRoundSetupFailure('Round setup failed', true);
        return;
      }
      this.transitionTo(GAME_STATES.IDLE);
      this.uiManager?.showToast('Connection failed');
    }
  }

  public tryDrop(): void {
    if (this.state !== GAME_STATES.SWINGING || !this.activeSwing) return;
    const snapshot = this.activeSwing.captureDropSnapshot();
    const fallingBlock = this.createBlockController(this.blockBasePrefab, this.blocksContainer, false);
    if (!fallingBlock) return;

    fallingBlock.setBlockPosition(snapshot.x, snapshot.y);
    fallingBlock.node.angle = snapshot.angleDegrees;
    this.isResolvingLanding = false;
    this.activeFall = {
      controller: fallingBlock,
      body: {
        x: snapshot.x,
        y: snapshot.y,
        velocityY: 0,
        rotation: snapshot.angleDegrees,
      },
    };
    this.activeSwing.node.destroy();
    this.activeSwing = null;
    this.soundManager.play('drop');
    this.transitionTo(GAME_STATES.FALLING);
  }

  public async cashOut(): Promise<void> {
    if (this.state !== GAME_STATES.SWINGING || this.currentHeight <= 0) return;
    const payout = this.bet * this.currentMultiplier;
    this.balance += payout;
    this.storageService.setBalance(this.balance);
    this.soundManager.play('cash-out');
    await this.finishRound(true, payout);
  }

  private adjustBet(direction: number): void {
    if (this.state !== GAME_STATES.IDLE && this.state !== GAME_STATES.RESULT) return;
    this.bet = clamp(this.bet + direction * GAME_CONFIG.betStep, GAME_CONFIG.minBet, GAME_CONFIG.maxBet);
    this.storageService.setBet(this.bet);
    this.uiManager?.updateLocalState({ bet: this.bet, payout: this.bet, balance: this.balance });
  }

  private adjustDifficulty(direction: number): void {
    if (this.state !== GAME_STATES.IDLE && this.state !== GAME_STATES.RESULT) return;
    this.difficulty = wrapDifficulty(DIFFICULTY_ORDER, this.difficulty, direction);
    this.storageService.setDifficulty(this.difficulty);
    this.uiManager?.setDifficulty(this.difficulty);
  }

  private async spawnSwing(withIntro: boolean): Promise<boolean> {
    if (this.activeSwing) {
      this.activeSwing.node.destroy();
      this.activeSwing = null;
    }
    const belowBlock = this.stackBlocks[this.stackBlocks.length - 1];
    if (!belowBlock) return false;
    const targetY = belowBlock.model.y + GAME_CONSTANTS.swingGapAbove;
    const swing = this.createSwingController();
    if (!swing) return false;

    const spawnY = withIntro ? targetY + GAME_CONSTANTS.swingSpawnOffsetY : targetY;
    swing.node.setPosition(0, spawnY, 0);
    this.activeSwing = swing;
    this.physicsSimulator.resetSwing();
    if (withIntro) {
      await swing.playIntro(targetY);
    }
    return true;
  }

  private updateSwing(deltaTime: number): void {
    if (!this.activeSwing) return;
    const belowBlock = this.stackBlocks[this.stackBlocks.length - 1];
    if (!belowBlock) return;
    const swingFrame = this.physicsSimulator.updateSwing(belowBlock.model.x, deltaTime);
    const targetY = belowBlock.model.y + GAME_CONSTANTS.swingGapAbove;
    this.activeSwing.updateSwing(swingFrame.x, targetY, swingFrame.angleRadians * (180 / Math.PI));
  }

  private async detectLanding(): Promise<void> {
    if (!this.activeFall || this.isResolvingLanding) return;
    const belowBlock = this.stackBlocks[this.stackBlocks.length - 1];
    if (!belowBlock) return;
    const landingY = belowBlock.model.y + GAME_CONSTANTS.blockSize;
    if (this.activeFall.body.y > landingY) return;

    this.isResolvingLanding = true;
    this.activeFall.body.y = landingY;
    this.activeFall.controller.setBlockPosition(this.activeFall.body.x, landingY);
    this.transitionTo(GAME_STATES.LANDED);
    await this.activeFall.controller.playLanding();
    this.soundManager.play('land');
    await this.finalizeLanding();
  }

  private async finalizeLanding(): Promise<void> {
    if (!this.activeFall || !this.roundData) return;
    const nextHeight = this.currentHeight + 1;
    const belowBlock = this.stackBlocks[this.stackBlocks.length - 1];
    if (!belowBlock) return;
    const centerOffset = Math.abs(this.activeFall.body.x - belowBlock.model.x);
    const maxCenterOffset = GAME_CONSTANTS.blockSize * GAME_CONSTANTS.collisionAlignmentFraction;
    const shouldCollapse = nextHeight >= this.roundData.collapseStep || centerOffset > maxCenterOffset;

    if (shouldCollapse) {
      this.spawnDebrisBurst(this.activeFall.controller.node.position.clone());
      this.activeFall.controller.node.destroy();
      this.activeFall = null;
      await this.finishRound(false, 0);
      return;
    }

    const landedController = this.activeFall.controller;
    landedController.node.angle = 0;
    const landedModel: StackBlockModel = {
      nodeUuid: landedController.node.uuid,
      x: this.activeFall.body.x,
      y: belowBlock.model.y + GAME_CONSTANTS.blockSize,
      height: nextHeight,
      isFloor: false,
    };
    this.activeFall = null;
    this.stackBlocks.push({ controller: landedController, model: landedModel });
    this.currentHeight = nextHeight;
    this.currentMultiplier = this.roundData.multipliers[nextHeight - 1] ?? this.currentMultiplier;
    this.bestHeight = Math.max(this.bestHeight, this.currentHeight);
    this.storageService.setBestHeight(this.bestHeight);
    this.eventBus.emit(GAME_EVENTS.blockPlaced, {
      height: this.currentHeight,
      multiplier: this.currentMultiplier,
      payout: this.bet * this.currentMultiplier,
      block: landedModel,
      ladder: this.roundData.multipliers,
    });
    if (this.currentHeight % GAME_CONSTANTS.floorToastInterval === 0) {
      this.uiManager?.showToast(`FLOOR ${this.currentHeight}!`);
    }
    this.spawnParticles(landedController.node.position.clone());
    const hasSwing = await this.spawnSwing(false);
    if (!hasSwing) {
      await this.handleRoundSetupFailure('Next swing failed to spawn', true);
      return;
    }
    this.transitionTo(GAME_STATES.SWINGING);
  }

  private async handleRoundSetupFailure(message: string, refundBet: boolean): Promise<void> {
    if (refundBet) {
      this.balance += this.bet;
      this.storageService.setBalance(this.balance);
    }
    if (this.activeSwing) {
      this.activeSwing.node.destroy();
      this.activeSwing = null;
    }
    if (this.activeFall) {
      this.activeFall.controller.node.destroy();
      this.activeFall = null;
    }
    this.roundData = null;
    this.resetRound();
    this.uiManager?.showToast(message);
  }

  private async finishRound(win: boolean, payout: number): Promise<void> {
    if (!win) {
      this.transitionTo(GAME_STATES.COLLAPSING);
      this.soundManager.play('collapse');
      await this.demolishTower();
    }

    this.transitionTo(GAME_STATES.RESULT);
    this.eventBus.emit(GAME_EVENTS.roundEnded, {
      win,
      payout,
      balance: this.balance,
      height: this.currentHeight,
    });
    this.soundManager.play('result');
    if (this.activeSwing) {
      this.activeSwing.node.destroy();
      this.activeSwing = null;
    }
    this.roundData = null;
    if (this.uiManager) {
      await this.uiManager.waitForRoundPresentation();
      await wait(GAME_CONSTANTS.resultResetDelayMs);
    } else {
      await wait(GAME_CONSTANTS.resultFallbackDelayMs + GAME_CONSTANTS.resultResetDelayMs);
    }
    this.resetRound();
  }

  private async demolishTower(): Promise<void> {
    while (this.stackBlocks.length > 1) {
      const block = this.stackBlocks.pop();
      if (!block) continue;
      this.spawnDebrisBurst(block.controller.node.position.clone());
      await block.controller.playCollapse();
      block.controller.node.destroy();
    }
    this.currentHeight = 0;
  }

  private resetRound(): void {
    this.clearContainer(this.blocksContainer);
    this.clearContainer(this.swingContainer);
    this.clearContainer(this.debrisContainer);
    this.clearContainer(this.particlesContainer);
    this.stackBlocks = [];
    this.roundData = null;
    this.currentHeight = 0;
    this.currentMultiplier = 1;
    this.isResolvingLanding = false;
    this.activeSwing = null;
    this.activeFall = null;
    this.cameraController?.reset();
    this.transitionTo(GAME_STATES.IDLE);
    this.createFloorBlock();
    this.uiManager?.updateLocalState({
      balance: this.balance,
      bestHeight: this.bestHeight,
      currentHeight: 0,
      multiplier: 1,
      payout: this.bet,
      bet: this.bet,
      difficulty: this.difficulty,
      ladder: [],
      canCashOut: false,
      isRoundLocked: false,
    });
  }

  private createFloorBlock(): void {
    const floorController = this.createBlockController(this.blockFloorPrefab ?? this.blockBasePrefab, this.blocksContainer, true);
    if (!floorController) return;
    floorController.setBlockPosition(0, GAME_CONSTANTS.baseY);
    this.stackBlocks.push({
      controller: floorController,
      model: {
        nodeUuid: floorController.node.uuid,
        x: 0,
        y: GAME_CONSTANTS.baseY,
        height: 0,
        isFloor: true,
      },
    });
  }

  private createBlockController(prefab: Prefab | null, parent: Node | null, isFloor: boolean): BlockController | null {
    const node = prefab ? instantiate(prefab) : this.createFallbackBlockNode(isFloor);
    const controller = node.getComponent(BlockController) ?? node.addComponent(BlockController);
    parent?.addChild(node);
    controller.initialize(this.animationManager, isFloor);
    return controller;
  }

  private createSwingController(): SwingController | null {
    if (!this.swingContainer) return null;
    const node = this.blockSwingPrefab ? instantiate(this.blockSwingPrefab) : this.createFallbackSwingNode();
    const controller = node.getComponent(SwingController) ?? node.addComponent(SwingController);
    this.swingContainer.addChild(node);
    controller.initialize(this.animationManager);
    return controller;
  }

  private spawnDebrisBurst(origin: Vec3): void {
    for (let index = 0; index < GAME_CONSTANTS.debrisCount; index += 1) {
      const controller = this.createDebrisController();
      if (!controller) continue;
      const offsetX = (Math.random() - 0.5) * GAME_CONSTANTS.blockSize;
      const velocityX = (Math.random() - 0.5) * GAME_CONSTANTS.debrisVelocityX;
      const velocityY = Math.random() * GAME_CONSTANTS.debrisVelocityYRange + GAME_CONSTANTS.debrisVelocityYMin;
      const rotationDelta = (Math.random() - 0.5) * GAME_CONSTANTS.debrisRotationDeltaMax;
      controller.launch(
        new Vec3(origin.x + offsetX, origin.y + GAME_CONSTANTS.debrisOriginLift, 0),
        velocityX,
        velocityY,
        rotationDelta,
      );
    }
  }

  private spawnParticles(origin: Vec3): void {
    for (let index = 0; index < GAME_CONSTANTS.particleCount; index += 1) {
      const sparkController = this.createParticleController(false);
      if (!sparkController) continue;
      const spreadX = (Math.random() - 0.5) * GAME_CONSTANTS.particleSpreadX;
      const spreadY = (Math.random() - 0.5) * GAME_CONSTANTS.particleSpreadY;
      const upVector = new Vec3(
        (Math.random() - 0.5) * GAME_CONSTANTS.particleVelocityX * GAME_CONSTANTS.particleRiseDuration,
        Math.random() * GAME_CONSTANTS.particleVelocityYRange * GAME_CONSTANTS.particleRiseDuration,
        0,
      );
      const downVector = new Vec3(
        (Math.random() - 0.5) * GAME_CONSTANTS.particleVelocityX * GAME_CONSTANTS.particleDriftFactor,
        -(Math.random() * GAME_CONSTANTS.particleVelocityYRange + GAME_CONSTANTS.particleVelocityYMin) * GAME_CONSTANTS.particleFallDuration,
        0,
      );
      sparkController.launch(new Vec3(origin.x + spreadX, origin.y + spreadY, 0), upVector, downVector);
    }

    const dustController = this.createParticleController(true);
    if (dustController) {
      dustController.launch(origin, new Vec3(0, GAME_CONSTANTS.dustRiseY, 0), new Vec3(0, GAME_CONSTANTS.dustDropY, 0));
    }
  }

  private createDebrisController(): DebrisController | null {
    if (!this.debrisContainer) return null;
    const node = this.debrisPrefab ? instantiate(this.debrisPrefab) : this.createFallbackEffectNode('Debris');
    const controller = node.getComponent(DebrisController) ?? node.addComponent(DebrisController);
    this.debrisContainer.addChild(node);
    return controller;
  }

  private createParticleController(useDustPalette: boolean): ParticleController | null {
    if (!this.particlesContainer) return null;
    const prefab = useDustPalette ? (this.dustCloudPrefab ?? this.particlePrefab) : this.particlePrefab;
    const node = prefab ? instantiate(prefab) : this.createFallbackEffectNode('Particle');
    const controller = node.getComponent(ParticleController) ?? node.addComponent(ParticleController);
    controller.useDustPalette = useDustPalette;
    this.particlesContainer.addChild(node);
    controller.refreshPalette();
    return controller;
  }

  private createFallbackBlockNode(isFloor: boolean): Node {
    const node = new Node(isFloor ? 'BlockFloor' : 'BlockBase');
    const transform = node.addComponent(UITransform);
    transform.setContentSize(GAME_CONSTANTS.blockSize, GAME_CONSTANTS.blockSize);
    const sprite = node.addComponent(Sprite);
    sprite.color = colorFromHex(isFloor ? COLOR_SCHEME.blocks.floor : COLOR_SCHEME.blocks.base);
    return node;
  }

  private createFallbackSwingNode(): Node {
    const node = new Node('BlockSwing');
    node.addComponent(UITransform).setContentSize(GAME_CONSTANTS.blockSize, GAME_CONSTANTS.blockSize + GAME_CONSTANTS.swingRopeLength);
    const ropeNode = new Node('RopeNode');
    ropeNode.addComponent(UITransform).setContentSize(GAME_CONSTANTS.swingRopeWidth, GAME_CONSTANTS.swingRopeLength);
    ropeNode.addComponent(Sprite).color = colorFromHex(COLOR_SCHEME.neon.white);
    const payloadNode = new Node('PayloadNode');
    payloadNode.addComponent(UITransform).setContentSize(GAME_CONSTANTS.blockSize, GAME_CONSTANTS.blockSize);
    payloadNode.addComponent(Sprite).color = colorFromHex(COLOR_SCHEME.blocks.base);
    payloadNode.setPosition(0, -GAME_CONSTANTS.swingRopeLength, 0);
    node.addChild(ropeNode);
    node.addChild(payloadNode);
    return node;
  }

  private createFallbackEffectNode(name: string): Node {
    const node = new Node(name);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(GAME_CONSTANTS.fallbackEffectSize, GAME_CONSTANTS.fallbackEffectSize);
    const sprite = node.addComponent(Sprite);
    sprite.color = colorFromHex(COLOR_SCHEME.neon.cyan);
    return node;
  }

  private clearContainer(node: Node | null): void {
    node?.removeAllChildren();
  }

  private transitionTo(nextState: GameState): void {
    if (this.state === nextState) return;
    const previousState = this.state;
    this.state = nextState;
    emitStateChange(this.eventBus, previousState, nextState);
  }
}
