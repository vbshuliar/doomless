// Presentation component for quiz cards, showing feedback inline.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { QuizCard as QuizCardType } from '../types/cards';

export type QuizFeedback = {
  correctIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
};

export type QuizCardProps = {
  card: QuizCardType;
  onSelect: (index: number) => void;
  feedback: QuizFeedback | null;
};

export const QuizCard: React.FC<QuizCardProps> = ({ card, onSelect, feedback }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.category}>{card.category.toUpperCase()}</Text>
        <Text style={styles.quizLabel}>QUIZ</Text>
      </View>
      <Text style={styles.question}>{card.question}</Text>
      <View style={styles.optionsWrapper}>
        {card.options.map((option, index) => {
          const isSelected = feedback?.selectedIndex === index;
          const isCorrect = feedback?.correctIndex === index;
          const showCorrect = Boolean(feedback) && isCorrect;
          const showIncorrect = Boolean(feedback) && isSelected && !isCorrect;

          return (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                showCorrect && styles.optionCorrect,
                showIncorrect && styles.optionIncorrect,
              ]}
              onPress={() => onSelect(index)}
              disabled={Boolean(feedback)}
            >
              <Text
                style={[
                  styles.optionText,
                  (showCorrect || showIncorrect) && styles.optionTextHighlighted,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {feedback && (
        <Text style={styles.feedbackLabel}>
          {feedback.isCorrect ? 'Nice! You nailed it.' : 'Good try! Another fact is coming.'}
        </Text>
      )}
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
    color: '#a855f7',
    letterSpacing: 1.2,
  },
  quizLabel: {
    fontWeight: '700',
    color: '#6c6f93',
    letterSpacing: 1.2,
  },
  question: {
    fontSize: 20,
    lineHeight: 28,
    color: '#1f1f1f',
    marginBottom: 20,
  },
  optionsWrapper: {
    gap: 12,
  },
  option: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d5dae3',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f5f7fa',
  },
  optionSelected: {
    borderColor: '#2f80ed',
  },
  optionCorrect: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  optionIncorrect: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  optionText: {
    fontSize: 16,
    color: '#1f2933',
  },
  optionTextHighlighted: {
    fontWeight: '600',
  },
  feedbackLabel: {
    marginTop: 16,
    textAlign: 'center',
    color: '#4b5563',
    fontSize: 15,
  },
});
