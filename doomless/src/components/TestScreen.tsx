import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAIService } from '../hooks/useAIService';
import { textProcessor } from '../services/TextProcessor';
import { storageService } from '../services/StorageService';

export function TestScreen() {
  const { isInitialized, isInitializing, error: aiError } = useAIService();
  const [loading, setLoading] = useState(false);
  const [fact, setFact] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!isInitialized || loading || fact || error) {
        return;
      }
      try {
        setLoading(true);
        setError(null);

        // Ensure DB is ready
        await storageService.initialize();

        // Process animals.txt with the local LLM if not already processed
        await textProcessor.processTopicFile('animals');

        // Load the most recent animal fact
        const facts = await storageService.getFacts('animals', 1);
        if (facts.length > 0) {
          setFact(facts[0].content);
        } else {
          setError('No facts generated from animals.txt yet.');
        }
      } catch (e) {
        console.error('Error loading initial fact:', e);
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isInitialized, loading, fact, error]);

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
          Check that `model.gguf` is in `android/app/src/main/assets/models/` and Cactus is installed.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.appTitle}>Doomless</Text>
      {loading && (
        <View style={styles.centerInner}>
          <ActivityIndicator size="large" color="#FEE715" />
          <Text style={styles.subtitle}>Generating animal facts from your local model...</Text>
        </View>
      )}
      {!loading && fact && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Animal fact</Text>
          <Text style={styles.cardText}>{fact}</Text>
        </View>
      )}
      {!loading && !fact && !error && (
        <Text style={styles.subtitleSmall}>Waiting for facts...</Text>
      )}
      {!loading && error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Error</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      )}
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
  centerInner: {
    marginTop: 32,
    alignItems: 'center',
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
  card: {
    marginTop: 24,
    backgroundColor: '#121829',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#8F9FF8',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#ffffff',
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
});
