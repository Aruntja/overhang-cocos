export enum GameState {
  START = 'START',
  CONNECTING = 'CONNECTING',
  SWINGING = 'SWINGING',
  FALLING = 'FALLING',
  LANDED = 'LANDED',
  RESULT = 'RESULT',
}

export const GAME_CONSTANTS = {
  DESIGN_WIDTH: 1080,
  DESIGN_HEIGHT: 1920,
  GRAVITY: 2600,
  BASE_SWING_SPEED: 1.7,
  SWING_GAP_ABOVE: 460,
  CAM_LERP: 0.09,
  CAM_LERP_RESET: 0.028,
  MAX_SWING_ANGLE: 0.30,
  CAMERA_FRAME_FRACTION: 0.48,
  ROPE_LENGTH_PX: 200,
  SWING_AMPLITUDE_FRAC: 0.18,
  LADDER_VISIBLE: 8,
  CONTROL_BAR_HEIGHT: 200,
  HUD_PILL_HEIGHT: 40,
  MULTIPLIER_FONT_SIZE: 58,
  BUTTON_FONT_SIZE: 15,
  BUTTON_RADIUS: 44,
} as const;

export const COLOR_SCHEME = {
  building: {
    body: '#8a3226',
    bodyDark: '#5c2018',
    trim: '#f4ead6',
  },
  floor: {
    body: '#c8493c',
    bodyDark: '#8a3226',
    windowGlass: '#bfe9ef',
  },
  neon: {
    cyan: '#00e4ff',
    pink: '#ff3fd2',
    purple: '#8f57ff',
    green: '#2dff8b',
    red: '#ff4e61',
  },
} as const;

export type DifficultyKey = 'easy' | 'medium' | 'hard' | 'hardcore';

export interface DifficultyConfig {
  growth: number;
  surviveChance: number;
  maxSteps: number;
}

export const DIFFICULTIES: Record<DifficultyKey, DifficultyConfig> = {
  easy: { growth: 1.10, surviveChance: 0.90, maxSteps: 40 },
  medium: { growth: 1.15, surviveChance: 0.82, maxSteps: 30 },
  hard: { growth: 1.25, surviveChance: 0.70, maxSteps: 22 },
  hardcore: { growth: 1.45, surviveChance: 0.55, maxSteps: 16 },
};

export const LOCAL_STORAGE_KEYS = {
  balance: 'neonstack_balance',
  best: 'neonstack_best',
} as const;
