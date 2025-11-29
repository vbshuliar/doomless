// Presentation component for fact cards in the feed.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { FactCard as FactCardType } from '../types/cards';

export type FactCardProps = {
  card: FactCardType;
  onLike: () => void;
  onDislike: () => void;
  onSkip: () => void;
};

export const FactCard: React.FC<FactCardProps> = ({
  card,
  onLike,
  onDislike,
  onSkip,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.category}>{card.category.toUpperCase()}</Text>
        <Text style={styles.difficulty}>{card.difficulty.toUpperCase()}</Text>
      </View>
      <Text style={styles.text}>{card.text}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onDislike}>
          <Text style={styles.buttonLabel}>👎</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.button, styles.primaryButton]} onPress={onLike}>
          <Text style={[styles.buttonLabel, styles.primaryLabel]}>👍</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onSkip}>
          <Text style={styles.buttonLabel}>➡️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  category: {
    fontWeight: '600',
    color: '#2f80ed',
    letterSpacing: 1.2,
  },
  difficulty: {
    fontWeight: '600',
    color: '#6c6f93',
    letterSpacing: 1.2,
  },
  text: {
    fontSize: 18,
    lineHeight: 26,
    color: '#1f1f1f',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#eef1f6',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minWidth: 56,
  },
  primaryButton: {
    backgroundColor: '#2f80ed',
  },
  buttonLabel: {
    fontSize: 20,
    color: '#1f1f1f',
  },
  primaryLabel: {
    color: '#ffffff',
  },
});
