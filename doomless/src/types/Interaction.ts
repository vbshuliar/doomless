export type SwipeDirection = 'left' | 'right';

export interface Interaction {
  id: number;
  fact_id: number;
  direction: SwipeDirection;
  timestamp: string;
}

export interface InteractionInput {
  fact_id: number;
  direction: SwipeDirection;
}

