// Zustand store that holds the on-device personalization state for CurioSwipe.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Category } from '../types/cards';
import type { BrainProfile } from '../types/brain';
import { initialBrainProfile } from '../types/brain';

const STORAGE_KEY = 'curioswipe-brain-store';

const cloneProfile = (profile: BrainProfile): BrainProfile => ({
  ...profile,
  categoryScores: { ...profile.categoryScores },
});

const buildInitialProfile = (): BrainProfile => cloneProfile(initialBrainProfile);

type FactAction = 'like' | 'dislike' | 'skip';

export type BrainState = {
  profile: BrainProfile;
  seenCardIds: string[];
  hasHydrated: boolean;
  recordFactInteraction: (category: Category, action: FactAction) => void;
  recordQuizResult: (category: Category, correct: boolean) => void;
  addSeenCard: (id: string) => void;
  clearSeenCards: () => void;
  resetAll: () => Promise<void>;
  setHasHydrated: (value: boolean) => void;
};

export const useBrainStore = create<BrainState>()(
  persist(
    (
      set: (
        partial:
          | Partial<BrainState>
          | ((state: BrainState) => Partial<BrainState>),
        replace?: boolean,
      ) => void,
      _get: () => BrainState,
    ) => ({
      profile: buildInitialProfile(),
      seenCardIds: [],
      hasHydrated: false,
      recordFactInteraction: (category: Category, action: FactAction) => {
        set((state: BrainState) => {
          const profile = cloneProfile(state.profile);
          profile.factsSeen += 1;
          if (action === 'like') {
            profile.likes += 1;
            profile.categoryScores[category] =
              (profile.categoryScores[category] ?? 0) + 1;
          }
          if (action === 'dislike') {
            profile.dislikes += 1;
            profile.categoryScores[category] =
              (profile.categoryScores[category] ?? 0) - 1;
          }
          if (action === 'skip') {
            profile.skips += 1;
          }
          return { profile };
        });
      },
      recordQuizResult: (category: Category, correct: boolean) => {
        set((state: BrainState) => {
          const profile = cloneProfile(state.profile);
          profile.quizzesAnswered += 1;
          if (correct) {
            profile.quizzesCorrect += 1;
            profile.categoryScores[category] =
              (profile.categoryScores[category] ?? 0) + 1;
          } else {
            profile.categoryScores[category] =
              (profile.categoryScores[category] ?? 0) - 1;
          }
          return { profile };
        });
      },
      addSeenCard: (id: string) => {
        set((state: BrainState) => {
          if (state.seenCardIds.includes(id)) {
            return {};
          }
          const next = [...state.seenCardIds, id];
          const truncated = next.length > 200 ? next.slice(next.length - 200) : next;
          return { seenCardIds: truncated };
        });
      },
      clearSeenCards: () => set({ seenCardIds: [] }),
      resetAll: async () => {
        set({ profile: buildInitialProfile(), seenCardIds: [] });
        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          console.warn('Failed to clear stored brain data', error);
        }
      },
      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: BrainState) => ({
        profile: state.profile,
        seenCardIds: state.seenCardIds,
      }),
      onRehydrateStorage: () => (state: BrainState | undefined, error?: unknown) => {
        if (error) {
          console.warn('CurioSwipe brain store failed to rehydrate', error);
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

export const selectBrainProfile = () => useBrainStore.getState().profile;
export const selectSeenCardIds = () => useBrainStore.getState().seenCardIds;
export const resetBrainStore = () => useBrainStore.getState().resetAll();
export const markCardSeen = (id: string) => useBrainStore.getState().addSeenCard(id);
export const recordFact = (category: Category, action: FactAction) =>
  useBrainStore.getState().recordFactInteraction(category, action);
export const recordQuiz = (category: Category, correct: boolean) =>
  useBrainStore.getState().recordQuizResult(category, correct);
export const getHasHydrated = () => useBrainStore.getState().hasHydrated;
