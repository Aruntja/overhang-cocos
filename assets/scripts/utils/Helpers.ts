import { Color, EventTarget } from 'cc';
import { GAME_CONSTANTS, GAME_EVENTS } from './Constants';
import { DifficultyKey, GameState, RoundEndedPayload, RoundStartedPayload, StateChangedPayload, BlockPlacedPayload } from './Types';

type EventPayloadMap = {
  [GAME_EVENTS.stateChanged]: StateChangedPayload;
  [GAME_EVENTS.blockPlaced]: BlockPlacedPayload;
  [GAME_EVENTS.roundStarted]: RoundStartedPayload;
  [GAME_EVENTS.roundEnded]: RoundEndedPayload;
};

export class GameEventBus {
  private readonly emitter = new EventTarget();

  public on<K extends keyof EventPayloadMap>(eventName: K, callback: (payload: EventPayloadMap[K]) => void, target?: object): void {
    this.emitter.on(eventName, callback as unknown as (...args: unknown[]) => void, target);
  }

  public off<K extends keyof EventPayloadMap>(eventName: K, callback: (payload: EventPayloadMap[K]) => void, target?: object): void {
    this.emitter.off(eventName, callback as unknown as (...args: unknown[]) => void, target);
  }

  public emit<K extends keyof EventPayloadMap>(eventName: K, payload: EventPayloadMap[K]): void {
    this.emitter.emit(eventName, payload);
  }
}

export const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const wrapDifficulty = (difficulties: DifficultyKey[], current: DifficultyKey, direction: number): DifficultyKey => {
  const index = difficulties.indexOf(current);
  const nextIndex = (index + direction + difficulties.length) % difficulties.length;
  return difficulties[nextIndex] || difficulties[0];
};

export const formatCurrency = (value: number): string => value.toFixed(2);

export const ladderSlice = (values: number[], currentHeight = 0): number[] => {
  const maxStart = Math.max(0, values.length - GAME_CONSTANTS.ladderVisibleRows);
  const start = Math.min(Math.max(0, currentHeight - GAME_CONSTANTS.ladderVisibleRows + 1), maxStart);
  return values.slice(start, start + GAME_CONSTANTS.ladderVisibleRows);
};

export const colorFromHex = (hex: string): Color => new Color().fromHEX(hex);

export const coalesceNumber = (value: string | null | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const emitStateChange = (bus: GameEventBus, previous: GameState, current: GameState): void => {
  bus.emit(GAME_EVENTS.stateChanged, { previous, current });
};
