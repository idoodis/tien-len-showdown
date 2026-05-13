'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AnimationIntensity = 'full' | 'reduced' | 'minimal';

interface SettingsState {
  animation: AnimationIntensity;
  sound: boolean;
  autoSubmitQueued: boolean;
  setAnimation: (a: AnimationIntensity) => void;
  setSound: (b: boolean) => void;
  setAutoSubmit: (b: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      animation: 'full',
      sound: false,
      autoSubmitQueued: true,
      setAnimation: (animation) => set({ animation }),
      setSound: (sound) => set({ sound }),
      setAutoSubmit: (autoSubmitQueued) => set({ autoSubmitQueued }),
    }),
    { name: 'tls.settings' },
  ),
);

export function useAnimationLevel(): AnimationIntensity {
  return useSettings((s) => s.animation);
}
