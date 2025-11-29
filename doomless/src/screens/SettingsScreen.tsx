// Settings screen provides a reset button and communicates upcoming AI features.
import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBrainStore } from '../store/brainStore';
import type { BrainState } from '../store/brainStore';

export const SettingsScreen: React.FC = () => {
  const resetAll = useBrainStore((state: BrainState) => state.resetAll);

  const handleReset = () => {
    Alert.alert(
      'Reset CurioSwipe',
      'This will clear your local progress and preferences. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetAll();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Controls</Text>
          <Text style={styles.sectionBody}>
            Everything lives on this device. Reset whenever you want a fresh curiosity journey.
          </Text>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonLabel}>Reset Local Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>
          <Text style={styles.sectionBody}>
            On-device AI via the Cactus SDK will personalize facts, remix quizzes, and let you chat with characters from your own PDFs—without leaving airplane mode.
          </Text>
          <Text style={styles.sectionBody}>
            We will also add optional PDF ingestion and retrieval-augmented generation backed by local embeddings (think Qwen3-Embedding-0.6B) so your brain feed adapts to your library.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  sectionBody: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 22,
  },
  resetButton: {
    marginTop: 12,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
