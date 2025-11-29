export interface UserPreference {
  id: number;
  topic: string;
  preference_score: number; // -1.0 to 1.0, where -1 = dislike, 1 = like
  last_updated: string;
}

export interface PreferenceAnalysis {
  preferred_topics: string[];
  disliked_topics: string[];
  neutral_topics: string[];
  overall_scores: Record<string, number>;
}

