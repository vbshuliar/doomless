// Core content types for CurioSwipe cards and categories.
export type Category =
  | 'science'
  | 'history'
  | 'psychology'
  | 'literature'
  | 'random';

export type FactDifficulty = 'easy' | 'medium' | 'hard';

export type FactCard = {
  id: string;
  type: 'fact';
  text: string;
  category: Category;
  difficulty: FactDifficulty;
};

export type QuizCard = {
  id: string;
  type: 'quiz';
  question: string;
  options: string[];
  correctIndex: number;
  category: Category;
  relatedFactId?: string;
};

export type Card = FactCard | QuizCard;
