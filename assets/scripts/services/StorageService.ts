import { DIFFICULTY_ORDER } from '../config/DifficultyConfig';
import { GAME_CONFIG } from '../config/GameConfig';
import { STORAGE_KEYS } from '../utils/Constants';
import { DifficultyKey } from '../utils/Types';
import { clamp, coalesceNumber } from '../utils/Helpers';

export class StorageService {
  public getBalance(): number {
    return coalesceNumber(localStorage.getItem(STORAGE_KEYS.balance), GAME_CONFIG.defaultBalance);
  }

  public setBalance(value: number): void {
    localStorage.setItem(STORAGE_KEYS.balance, value.toFixed(2));
  }

  public getBestHeight(): number {
    return coalesceNumber(localStorage.getItem(STORAGE_KEYS.bestHeight), 0);
  }

  public setBestHeight(value: number): void {
    localStorage.setItem(STORAGE_KEYS.bestHeight, String(value));
  }

  public getBet(): number {
    const storedBet = coalesceNumber(localStorage.getItem(STORAGE_KEYS.bet), GAME_CONFIG.defaultBet);
    return clamp(storedBet, GAME_CONFIG.minBet, GAME_CONFIG.maxBet);
  }

  public setBet(value: number): void {
    localStorage.setItem(STORAGE_KEYS.bet, String(value));
  }

  public getDifficulty(): DifficultyKey {
    const stored = localStorage.getItem(STORAGE_KEYS.difficulty) as DifficultyKey | null;
    return stored && DIFFICULTY_ORDER.includes(stored) ? stored : GAME_CONFIG.defaultDifficulty;
  }

  public setDifficulty(value: DifficultyKey): void {
    localStorage.setItem(STORAGE_KEYS.difficulty, value);
  }
}
