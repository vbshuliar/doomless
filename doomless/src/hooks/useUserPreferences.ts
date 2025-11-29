import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/StorageService';
import { aiService } from '../services/AIService';
import { UserPreference, PreferenceAnalysis } from '../types/Preferences';
import { Interaction } from '../types/Interaction';

interface UseUserPreferencesReturn {
  preferences: UserPreference[];
  analysis: PreferenceAnalysis | null;
  loading: boolean;
  error: Error | null;
  loadPreferences: () => Promise<void>;
  analyzePreferences: () => Promise<void>;
  getPreferenceScore: (topic: string) => number;
  refresh: () => Promise<void>;
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [analysis, setAnalysis] = useState<PreferenceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await storageService.initialize();
      const loadedPreferences = await storageService.getPreferences();
      setPreferences(loadedPreferences);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load preferences');
      setError(error);
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzePreferences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await storageService.initialize();
      
      // Get recent interactions
      const interactions = await storageService.getInteractions(100);
      
      if (interactions.length === 0) {
        setAnalysis({
          preferred_topics: [],
          disliked_topics: [],
          neutral_topics: [],
          overall_scores: {},
        });
        return;
      }

      // Use AI to analyze preferences
      const analysisResult = await aiService.analyzeUserPreference(interactions);
      setAnalysis(analysisResult);

      // Also reload preferences from database
      await loadPreferences();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to analyze preferences');
      setError(error);
      console.error('Failed to analyze preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [loadPreferences]);

  const getPreferenceScore = useCallback((topic: string): number => {
    const preference = preferences.find(p => p.topic === topic);
    return preference?.preference_score || 0;
  }, [preferences]);

  const refresh = useCallback(async () => {
    await loadPreferences();
    await analyzePreferences();
  }, [loadPreferences, analyzePreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    analysis,
    loading,
    error,
    loadPreferences,
    analyzePreferences,
    getPreferenceScore,
    refresh,
  };
}

