import { DifficultyConfigShape, DifficultyKey } from '../utils/Types';

export const DIFFICULTY_ORDER: DifficultyKey[] = ['easy', 'medium', 'hard', 'hardcore'];

export const DIFFICULTY_CONFIG: Record<DifficultyKey, DifficultyConfigShape> = {
  easy: { growth: 1.1, surviveChance: 0.9, maxSteps: 40 },
  medium: { growth: 1.15, surviveChance: 0.82, maxSteps: 30 },
  hard: { growth: 1.25, surviveChance: 0.7, maxSteps: 22 },
  hardcore: { growth: 1.45, surviveChance: 0.55, maxSteps: 16 },
};
