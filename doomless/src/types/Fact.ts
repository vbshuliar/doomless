export interface Fact {
  id: number;
  content: string;
  topic: string;
  source: 'default' | 'user_upload';
  created_at: string;
  is_quiz?: boolean;
  quiz_data?: {
    question: string;
    options: string[];
    correct_answer: number;
  };
}

export interface FactInput {
  content: string;
  topic: string;
  source: 'default' | 'user_upload';
  is_quiz?: boolean;
  quiz_data?: {
    question: string;
    options: string[];
    correct_answer: number;
  };
}

