/**
 * Example usage of the AI services and hooks
 * 
 * This file demonstrates how to use the implemented services in your React Native components
 */

import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { useAIService, useFacts, useUserPreferences } from './hooks';
import { textProcessor, pdfProcessor } from './services';
import { SwipeDirection } from './types';

// Example: Initialize AI and load facts
export function FactsScreen() {
  const { isInitialized, isInitializing, error: aiError } = useAIService();
  const { facts, loading, error, recordInteraction, refresh } = useFacts({
    topic: 'animals',
    limit: 10,
  });
  const { preferences, analyzePreferences } = useUserPreferences();

  useEffect(() => {
    // Process default topics on app start (only once)
    if (isInitialized) {
      textProcessor.processDefaultTopics().catch(console.error);
    }
  }, [isInitialized]);

  const handleSwipe = async (factId: number, direction: SwipeDirection) => {
    try {
      await recordInteraction({
        fact_id: factId,
        direction,
      });

      // Analyze preferences after recording interaction
      await analyzePreferences();
    } catch (error) {
      console.error('Error recording swipe:', error);
    }
  };

  if (isInitializing) {
    return <Text>Initializing AI model...</Text>;
  }

  if (aiError) {
    return <Text>Error initializing AI: {aiError.message}</Text>;
  }

  if (loading) {
    return <Text>Loading facts...</Text>;
  }

  if (error) {
    return <Text>Error loading facts: {error.message}</Text>;
  }

  return (
    <View>
      <Text>Facts ({facts.length})</Text>
      {facts.map((fact) => (
        <View key={fact.id}>
          <Text>{fact.content}</Text>
          <Button
            title="Swipe Right (Like)"
            onPress={() => handleSwipe(fact.id, 'right')}
          />
          <Button
            title="Swipe Left (Skip)"
            onPress={() => handleSwipe(fact.id, 'left')}
          />
        </View>
      ))}
      <Button title="Refresh" onPress={refresh} />
    </View>
  );
}

// Example: Process user-uploaded PDF
export async function processUserPDF(filePath: string, filename: string) {
  try {
    const facts = await pdfProcessor.processPDF(filePath, filename, 'user_upload');
    console.log(`Processed ${facts.length} facts from PDF`);
    return facts;
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
}

// Example: Get user preferences
export function PreferencesScreen() {
  const { preferences, analysis, loading, getPreferenceScore } = useUserPreferences();

  if (loading) {
    return <Text>Loading preferences...</Text>;
  }

  return (
    <View>
      <Text>Your Preferences</Text>
      {preferences.map((pref) => (
        <View key={pref.id}>
          <Text>
            {pref.topic}: {pref.preference_score.toFixed(2)}
          </Text>
        </View>
      ))}
      
      {analysis && (
        <View>
          <Text>Preferred Topics: {analysis.preferred_topics.join(', ')}</Text>
          <Text>Disliked Topics: {analysis.disliked_topics.join(', ')}</Text>
        </View>
      )}
    </View>
  );
}

