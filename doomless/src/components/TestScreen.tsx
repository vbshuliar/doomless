import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useAIService } from '../hooks/useAIService';
import { textProcessor } from '../services/TextProcessor';
import { storageService } from '../services/StorageService';
import type { Fact } from '../types/Fact';

export function TestScreen() {
  const {
    isInitialized,
    isInitializing,
    error: aiError,
    processingStatus,
    progressLog,
  } = useAIService();
  const [isProcessing, setIsProcessing] = useState(false);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!isInitialized || isProcessing) {
        return;
      }
      try {
        setIsProcessing(true);
        setError(null);

        // Ensure DB is ready
        await storageService.initialize();

        // Process animals.txt with the local LLM if not already processed
        await textProcessor.processTopicFile('animals');

        // Load all animal facts
        const storedFacts = await storageService.getFacts('animals');
        const normalizedFacts = storedFacts
          .filter(f => !f.is_quiz)
          .sort((a, b) => a.id - b.id);
        if (normalizedFacts.length > 0) {
          setFacts(normalizedFacts);
        } else {
          setError('No facts generated from animals.txt yet.');
        }
      } catch (e) {
        console.error('Error loading initial fact:', e);
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
      } finally {
        setIsProcessing(false);
      }
    };

    run();
  }, [isInitialized, isProcessing]);

  useEffect(() => {
    if (processingStatus?.stage !== 'complete' || !isInitialized) {
      return;
    }

    const syncFacts = async () => {
      try {
        await storageService.initialize();
        const storedFacts = await storageService.getFacts('animals');
        const normalizedFacts = storedFacts
          .filter(f => !f.is_quiz)
          .sort((a, b) => a.id - b.id);
        setFacts(normalizedFacts);
      } catch (e) {
        console.error('Error refreshing facts:', e);
      }
    };

    syncFacts();
  }, [processingStatus?.stage, isInitialized]);

  const progressValue = useMemo(() => {
    if (!processingStatus) {
      return 0;
    }

    const stage = processingStatus.stage;
    const downloadProgress = processingStatus.modelDownloadProgress ?? 0;
    const totalChunks = processingStatus.totalChunks ?? 0;
    const currentChunk = processingStatus.currentChunk ?? 0;
    const savedFacts = processingStatus.savedFacts ?? 0;
    const totalFacts = processingStatus.totalFacts ?? 0;
    const quizCurrent = processingStatus.quizCurrent ?? 0;
    const quizTotal = processingStatus.quizTotal ?? 0;

    const modelWeight = 0.2;
    const parsingWeight = 0.5;
    const quizWeight = 0.1;
    const savingWeight = 0.2;

    switch (stage) {
      case 'model-download':
        return Math.min(1, downloadProgress * modelWeight);
      case 'parsing': {
        if (totalChunks === 0) {
          return modelWeight;
        }
        const parsingProgress = currentChunk / totalChunks;
        return Math.min(1, modelWeight + parsingProgress * parsingWeight);
      }
      case 'quiz': {
        if (quizTotal === 0) {
          return Math.min(1, modelWeight + parsingWeight);
        }
        const quizProgress = quizCurrent / quizTotal;
        return Math.min(1, modelWeight + parsingWeight + quizProgress * quizWeight);
      }
      case 'saving': {
        if (totalFacts === 0) {
          return modelWeight + parsingWeight + quizWeight;
        }
        const savingProgress = savedFacts / totalFacts;
        return Math.min(1, modelWeight + parsingWeight + quizWeight + savingProgress * savingWeight);
      }
      case 'complete':
      case 'error':
        return 1;
      default:
        return 0;
    }
  }, [processingStatus]);

  const processingError = processingStatus?.stage === 'error' ? processingStatus.errorMessage : null;
  const showProgress =
    processingStatus !== null &&
    processingStatus.stage !== 'idle' &&
    processingStatus.stage !== 'complete' &&
    processingStatus.stage !== 'error';

  if (isInitializing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FEE715" />
        <Text style={styles.subtitle}>Initializing local AI model...</Text>
      </View>
    );
  }

  if (aiError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>AI initialization failed</Text>
        <Text style={styles.subtitle}>{aiError.message}</Text>
        <Text style={styles.subtitleSmall}>
          Make sure `cactus-react-native` is installed and the Cactus model download completes on device.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.appTitle}>Doomless</Text>
      {showProgress && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color="#FEE715" />
          <Text style={styles.subtitle}>
            {processingStatus?.message ?? 'Generating animal facts from your local model...'}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.round(progressValue * 100)}%` }]} />
          </View>
          <View style={styles.logContainer}>
            {progressLog.slice(-6).map((entry, index) => (
              <Text key={`${entry}-${index}`} style={styles.logText}>
                {entry}
              </Text>
            ))}
          </View>
        </View>
      )}
      {processingError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Processing error</Text>
          <Text style={styles.errorDetail}>{processingError}</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Error</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      )}
      <FlatList
        data={facts}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : `${item.topic}-${index}`)}
        renderItem={({ item, index }) => (
          <View style={styles.factRow}>
            <Text style={styles.factIndex}>{index + 1}.</Text>
            <Text style={styles.factText}>{item.content}</Text>
          </View>
        )}
        contentContainerStyle={facts.length === 0 ? styles.listEmptyContainer : styles.listContainer}
        ListEmptyComponent={
          !showProgress && !error ? (
            <Text style={styles.subtitleSmall}>No animal facts generated yet.</Text>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050812',
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#050812',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FEE715',
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FEE715',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 8,
  },
  subtitleSmall: {
    fontSize: 12,
    color: '#aaaaaa',
    textAlign: 'center',
    marginTop: 8,
  },
  errorBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b0f15',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffb4b4',
    marginBottom: 4,
  },
  errorDetail: {
    fontSize: 13,
    color: '#ffdede',
  },
  progressContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#121829',
    borderRadius: 12,
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: '#1f2a45',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FEE715',
    borderRadius: 4,
  },
  logContainer: {
    marginTop: 12,
    backgroundColor: '#0c111f',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: 120,
  },
  logText: {
    fontSize: 12,
    color: '#aeb8e5',
    marginBottom: 4,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomColor: '#1d2539',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  factIndex: {
    fontSize: 14,
    color: '#8F9FF8',
    width: 24,
    textAlign: 'right',
    marginRight: 12,
  },
  factText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#ffffff',
  },
  listContainer: {
    paddingBottom: 48,
  },
  listEmptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
