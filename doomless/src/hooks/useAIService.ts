import { useState, useEffect, useCallback } from 'react';
import { aiService, type AIProgressEvent } from '../services/AIService';

export interface AIProcessingStatus {
  stage: 'idle' | 'model-download' | 'parsing' | 'quiz' | 'saving' | 'complete' | 'error';
  topic?: string;
  modelId?: string;
  modelDownloadProgress?: number;
  currentChunk?: number;
  totalChunks?: number;
  generatedFacts?: number;
  savedFacts?: number;
  totalFacts?: number;
  quizCurrent?: number;
  quizTotal?: number;
  message?: string;
  errorMessage?: string;
  eventId: number;
}

interface UseAIServiceReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
  processingStatus: AIProcessingStatus | null;
  progressLog: string[];
}

export function useAIService(): UseAIServiceReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [processingStatus, setProcessingStatus] = useState<AIProcessingStatus | null>(null);
  const [progressLog, setProgressLog] = useState<string[]>([]);

  const updateProcessingStatus = useCallback((event: AIProgressEvent) => {
    setProcessingStatus((prev) => {
      const timestamp = Date.now();
      const base: AIProcessingStatus = prev ?? {
        stage: 'idle',
        eventId: timestamp,
      };

      switch (event.type) {
        case 'model-download': {
          return {
            ...base,
            stage: 'model-download',
            modelId: event.modelId,
            modelDownloadProgress: event.progress,
            message: `Downloading model ${event.modelId} (${Math.round(event.progress * 100)}%)`,
            eventId: timestamp,
          };
        }
        case 'parse-start': {
          return {
            stage: 'parsing',
            topic: event.topic,
            currentChunk: 0,
            totalChunks: event.totalChunks,
            generatedFacts: 0,
            savedFacts: 0,
            totalFacts: undefined,
            message: event.totalChunks > 0
              ? `Parsing ${event.topic}.txt in ${event.totalChunks} chunk${event.totalChunks === 1 ? '' : 's'}...`
              : `Parsing ${event.topic}.txt...`,
            eventId: timestamp,
          };
        }
        case 'parse-chunk-start': {
          return {
            ...base,
            stage: 'parsing',
            topic: event.topic,
            currentChunk: Math.max(event.chunkIndex - 1, 0),
            totalChunks: event.totalChunks,
            message: `Processing chunk ${event.chunkIndex} of ${event.totalChunks} for ${event.topic}...`,
            eventId: timestamp,
          };
        }
        case 'parse-chunk-complete': {
          const accumulatedFacts = (base.generatedFacts ?? 0) + event.factsGenerated;
          return {
            ...base,
            stage: 'parsing',
            topic: event.topic,
            currentChunk: event.chunkIndex,
            totalChunks: event.totalChunks,
            generatedFacts: accumulatedFacts,
            message: `Generated ${event.factsGenerated} fact${event.factsGenerated === 1 ? '' : 's'} from chunk ${event.chunkIndex} of ${event.totalChunks}.`,
            eventId: timestamp,
          };
        }
        case 'parse-complete': {
          return {
            ...base,
            stage: 'parsing',
            topic: event.topic,
            currentChunk: event.totalChunks,
            totalChunks: event.totalChunks,
            generatedFacts: event.factsGenerated,
            message: `Completed parsing ${event.topic}.txt with ${event.factsGenerated} generated fact${event.factsGenerated === 1 ? '' : 's'}.`,
            eventId: timestamp,
          };
        }
        case 'parse-error': {
          return {
            ...base,
            stage: 'error',
            topic: event.topic,
            errorMessage: event.message,
            message: `Parsing error for ${event.topic}: ${event.message}`,
            eventId: timestamp,
          };
        }
        case 'storage-save-progress': {
          return {
            ...base,
            stage: 'saving',
            topic: event.topic,
            savedFacts: event.saved,
            totalFacts: event.total,
            message: event.total > 0
              ? `Saving fact ${event.saved} of ${event.total} for ${event.topic}...`
              : `No facts generated for ${event.topic}.`,
            eventId: timestamp,
          };
        }
        case 'storage-complete': {
          return {
            ...base,
            stage: 'complete',
            topic: event.topic,
            savedFacts: event.total,
            totalFacts: event.total,
            message: `Saved ${event.total} fact${event.total === 1 ? '' : 's'} for ${event.topic}.`,
            eventId: timestamp,
          };
        }
        case 'quiz-start': {
          return {
            ...base,
            stage: 'quiz',
            topic: event.topic,
            quizCurrent: 0,
            quizTotal: event.total,
            message: event.total > 0
              ? `Generating ${event.total} quiz question${event.total === 1 ? '' : 's'} for ${event.topic}...`
              : `Preparing quiz questions for ${event.topic}...`,
            eventId: timestamp,
          };
        }
        case 'quiz-progress': {
          return {
            ...base,
            stage: 'quiz',
            topic: event.topic,
            quizCurrent: event.current,
            quizTotal: event.total,
            message: `Generated quiz ${event.current} of ${event.total} for ${event.topic}...`,
            eventId: timestamp,
          };
        }
        case 'quiz-complete': {
          return {
            ...base,
            stage: 'quiz',
            topic: event.topic,
            quizCurrent: event.total,
            quizTotal: event.total,
            message: event.total > 0
              ? `Completed quiz generation for ${event.topic} (${event.total} total).`
              : `No quizzes generated for ${event.topic}.`,
            eventId: timestamp,
          };
        }
        default:
          return base;
      }
    });

    const logEntry = (() => {
      switch (event.type) {
        case 'model-download':
          return `Model download ${event.modelId}: ${Math.round(event.progress * 100)}%`;
        case 'parse-start':
          return `Started parsing ${event.topic}.txt`;
        case 'parse-chunk-start':
          return `Processing chunk ${event.chunkIndex}/${event.totalChunks} (${event.topic})`;
        case 'parse-chunk-complete':
          return `Chunk ${event.chunkIndex}/${event.totalChunks} produced ${event.factsGenerated} fact${event.factsGenerated === 1 ? '' : 's'}`;
        case 'parse-complete':
          return `Parsing complete for ${event.topic} (${event.factsGenerated} fact${event.factsGenerated === 1 ? '' : 's'})`;
        case 'parse-error':
          return `Parsing error for ${event.topic}: ${event.message}`;
        case 'storage-save-progress':
          return event.total > 0
            ? `Saved ${event.saved}/${event.total} facts for ${event.topic}`
            : `No facts saved for ${event.topic}`;
        case 'storage-complete':
          return `Storage complete for ${event.topic} (${event.total} fact${event.total === 1 ? '' : 's'})`;
        case 'quiz-start':
          return event.total > 0
            ? `Starting quiz generation (${event.total} question${event.total === 1 ? '' : 's'})`
            : `Starting quiz generation`;
        case 'quiz-progress':
          return `Quiz ${event.current}/${event.total} generated`;
        case 'quiz-complete':
          return `Quiz generation complete (${event.total})`;
        default:
          return null;
      }
    })();

    if (logEntry) {
      setProgressLog((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === logEntry) {
          return prev;
        }
        const next = [...prev, logEntry];
        return next.slice(-25);
      });
    }
  }, []);

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
      const normalizedError = err instanceof Error ? err : new Error('Failed to initialize AI service');
      setError(normalizedError);
      console.error('Failed to initialize AI service:', normalizedError);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitialized, isInitializing]);

  useEffect(() => {
    // Auto-initialize on mount
    initialize();
  }, [initialize]);

  useEffect(() => {
    const unsubscribe = aiService.subscribeProgress(updateProcessingStatus);
    return unsubscribe;
  }, [updateProcessingStatus]);

  return {
    isInitialized,
    isInitializing,
    error,
    initialize,
    processingStatus,
    progressLog,
  };
}

