export type SoundCue = 'round-start' | 'drop' | 'land' | 'cash-out' | 'collapse' | 'result';

export class SoundManager {
  public play(_cue: SoundCue): void {
    // Audio hooks are intentionally centralized here for inspector-assigned clips.
  }
}
