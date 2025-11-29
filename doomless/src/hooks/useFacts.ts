import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/StorageService';
import { Fact } from '../types/Fact';
import { InteractionInput } from '../types/Interaction';
import { aiService } from '../services/AIService';

interface UseFactsOptions {
  topic?: string;
  limit?: number;
  autoLoad?: boolean;
}

interface UseFactsReturn {
  facts: Fact[];
  loading: boolean;
  error: Error | null;
  loadFacts: () => Promise<void>;
  recordInteraction: (interaction: InteractionInput) => Promise<void>;
  getRelatedFacts: (fact: Fact) => Promise<Fact[]>;
  refresh: () => Promise<void>;
}

export function useFacts(options: UseFactsOptions = {}): UseFactsReturn {
  const { topic, limit, autoLoad = true } = options;
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadFacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await storageService.initialize();
      const loadedFacts = await storageService.getFacts(topic, limit);
      setFacts(loadedFacts);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load facts');
      setError(error);
      console.error('Failed to load facts:', error);
    } finally {
      setLoading(false);
    }
  }, [topic, limit]);

  const recordInteraction = useCallback(async (interaction: InteractionInput) => {
    try {
      await storageService.initialize();
      await storageService.insertInteraction(interaction);

      // Update preference based on interaction
      const fact = await storageService.getFactById(interaction.fact_id);
      if (fact) {
        const scoreDelta = interaction.direction === 'right' ? 0.1 : -0.1;
        await storageService.updatePreference(fact.topic, scoreDelta);
      }

      // If right swipe, generate related facts
      if (interaction.direction === 'right' && fact) {
        try {
          const relatedFacts = await aiService.generateRelatedFacts(fact.topic, fact.content);
          
          // Store related facts
          for (const content of relatedFacts) {
            await storageService.insertFact({
              content,
              topic: fact.topic,
              source: 'default',
            });
          }

          // Reload facts to include new ones
          await loadFacts();
        } catch (err) {
          console.error('Error generating related facts:', err);
          // Don't throw, just log - interaction is still recorded
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to record interaction');
      console.error('Failed to record interaction:', error);
      throw error;
    }
  }, [loadFacts]);

  const getRelatedFacts = useCallback(async (fact: Fact): Promise<Fact[]> => {
    try {
      const relatedContent = await aiService.generateRelatedFacts(fact.topic, fact.content);
      
      // Convert to Fact objects (without IDs since they're not stored yet)
      return relatedContent.map((content, index) => ({
        id: -index - 1, // Temporary negative IDs
        content,
        topic: fact.topic,
        source: 'default' as const,
        created_at: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Failed to get related facts:', err);
      return [];
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadFacts();
  }, [loadFacts]);

  useEffect(() => {
    if (autoLoad) {
      loadFacts();
    }
  }, [autoLoad, loadFacts]);

  return {
    facts,
    loading,
    error,
    loadFacts,
    recordInteraction,
    getRelatedFacts,
    refresh,
  };
}

