import { useState, useEffect, useCallback } from 'react';
import { aiService } from '../services/AIService';

interface UseAIServiceReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
}

export function useAIService(): UseAIServiceReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initialize = useCallback(async () => {
    if (isInitialized || isInitializing) {
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      await aiService.initialize();
      setIsInitialized(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize AI service');
      setError(error);
      console.error('Failed to initialize AI service:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitialized, isInitializing]);

  useEffect(() => {
    // Auto-initialize on mount
    initialize();
  }, [initialize]);

  return {
    isInitialized,
    isInitializing,
    error,
    initialize,
  };
}

