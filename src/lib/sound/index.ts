'use client';

/** Minimal sound stub. Each cue is a no-op until real audio assets ship.
 *  Wired through useSound() so swapping in Howler/WebAudio is one file. */

export type SoundCue =
  | 'turn_start'
  | 'card_play'
  | 'invalid_move'
  | 'pass'
  | 'game_start'
  | 'winner'
  | 'button_click'
  | 'win_increment'
  | 'play_again';

const placeholderEnabled = false;

export function playSound(cue: SoundCue, muted: boolean): void {
  if (muted) return;
  if (!placeholderEnabled) return;
  // TODO: load /public/sounds/${cue}.mp3 via HTMLAudioElement or Howler.
  if (typeof window !== 'undefined') {
    // console.debug('[sound]', cue);
    void cue;
  }
}
