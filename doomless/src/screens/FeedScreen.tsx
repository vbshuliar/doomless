// Feed screen renders one card at a time and routes interactions to the controller hook.
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FactCard } from '../components/FactCard';
import { QuizCard } from '../components/QuizCard';
import { useFeedController } from '../hooks/useFeedController';

export const FeedScreen: React.FC = () => {
  const {
    currentCard,
    isHydrating,
    quizFeedback,
    likeCurrent,
    dislikeCurrent,
    skipCurrent,
    answerQuiz,
  } = useFeedController();

  if (isHydrating) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.placeholder}>
          <ActivityIndicator size="large" />
          <Text style={styles.placeholderText}>Warming up your curiosity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentCard) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>All caught up!</Text>
          <Text style={styles.placeholderText}>
            You have explored all bundled cards. New content will arrive with the next update.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heroTitle}>CurioSwipe</Text>
        <Text style={styles.subtitle}>Replace doomscrolling with delightful micro-knowledge.</Text>
        <View style={styles.cardWrapper}>
          {currentCard.type === 'fact' ? (
            <FactCard
              card={currentCard}
              onLike={likeCurrent}
              onDislike={dislikeCurrent}
              onSkip={skipCurrent}
            />
          ) : (
            <QuizCard
              card={currentCard}
              feedback={quizFeedback}
              onSelect={answerQuiz}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f4f8',
  },
  container: {
    flex: 1,
    paddingVertical: 24,
    gap: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2933',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2933',
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6c7280',
    textAlign: 'center',
  },
});
