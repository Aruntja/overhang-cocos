export const GAME_STATES = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  SWINGING: 'SWINGING',
  FALLING: 'FALLING',
  LANDED: 'LANDED',
  COLLAPSING: 'COLLAPSING',
  RESULT: 'RESULT',
} as const;

export type GameState = (typeof GAME_STATES)[keyof typeof GAME_STATES];

export type DifficultyKey = 'easy' | 'medium' | 'hard' | 'hardcore';

export interface DifficultyConfigShape {
  growth: number;
  surviveChance: number;
  maxSteps: number;
}

export interface RoundData {
  multipliers: number[];
  collapseStep: number;
}

export interface StackBlockModel {
  nodeUuid: string;
  x: number;
  y: number;
  height: number;
  isFloor: boolean;
}

export interface BlockPlacedPayload {
  height: number;
  multiplier: number;
  payout: number;
  block: StackBlockModel;
  ladder: number[];
}

export interface RoundStartedPayload {
  difficulty: DifficultyKey;
  bet: number;
  balance: number;
  ladder: number[];
}

export interface RoundEndedPayload {
  win: boolean;
  payout: number;
  balance: number;
  height: number;
}

export interface StateChangedPayload {
  previous: GameState;
  current: GameState;
}

export interface UIModel {
  balance: number;
  bestHeight: number;
  currentHeight: number;
  multiplier: number;
  payout: number;
  bet: number;
  difficulty: DifficultyKey;
  ladder: number[];
  canCashOut: boolean;
  isRoundLocked: boolean;
}

export interface FallingBody {
  x: number;
  y: number;
  velocityY: number;
  rotation: number;
}

export interface SwingFrame {
  x: number;
  angleRadians: number;
}

export interface DropSnapshot {
  x: number;
  y: number;
  angleDegrees: number;
}
