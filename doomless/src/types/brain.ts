// Shapes for the local personalization profile stored on-device.
import type { Category } from './cards';

export type BrainProfile = {
  categoryScores: Record<Category, number>;
  factsSeen: number;
  likes: number;
  dislikes: number;
  skips: number;
  quizzesAnswered: number;
  quizzesCorrect: number;
};

export const initialBrainProfile: BrainProfile = {
  categoryScores: {
    science: 0,
    history: 0,
    psychology: 0,
    literature: 0,
    random: 0,
  },
  factsSeen: 0,
  likes: 0,
  dislikes: 0,
  skips: 0,
  quizzesAnswered: 0,
  quizzesCorrect: 0,
};
