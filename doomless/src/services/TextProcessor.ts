import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { aiService } from './AIService';
import { storageService } from './StorageService';
import { Fact, FactInput } from '../types/Fact';

class TextProcessor {
  private defaultTopics = ['animals', 'history', 'plants', 'science', 'sport'];
  private processingCache = new Set<string>();

  /**
   * Load and process default topic files from assets
   */
  async processDefaultTopics(): Promise<void> {
    for (const topic of this.defaultTopics) {
      try {
        await this.processTopicFile(topic);
      } catch (error) {
        console.error(`Error processing topic ${topic}:`, error);
      }
    }
  }

  /**
   * Process a single topic file
   */
  async processTopicFile(topic: string): Promise<void> {
    // Check if already processed
    const cacheKey = `default_${topic}`;
    if (this.processingCache.has(cacheKey)) {
      return;
    }

    // Check if facts already exist in database
    const existingFacts = await storageService.getFacts(topic, 1);
    if (existingFacts.length > 0) {
      console.log(`Topic ${topic} already processed, skipping`);
      return;
    }

    this.processingCache.add(cacheKey);

    try {
      // Load text file from assets
      const text = await this.loadTopicFile(topic);
      
      if (!text) {
        console.warn(`No text file found for topic: ${topic}`);
        this.processingCache.delete(cacheKey);
        return;
      }

      // Process text into facts using AI
      const facts = await aiService.parseTextToFacts(text, topic);

      aiService.emitProgress({ type: 'storage-save-progress', topic, saved: 0, total: facts.length });
      // Store facts in database
      let savedCount = 0;
      for (const fact of facts) {
        const factInput: FactInput = {
          content: fact.content,
          topic: fact.topic,
          source: 'default',
        };
        await storageService.insertFact(factInput);
        savedCount += 1;
        aiService.emitProgress({ type: 'storage-save-progress', topic, saved: savedCount, total: facts.length });
      }

      // Add quiz facts every 5-10 facts
      await this.addQuizFacts(topic, facts);

      aiService.emitProgress({ type: 'storage-complete', topic, total: facts.length });

      console.log(`Processed ${facts.length} facts for topic: ${topic}`);
    } catch (error) {
      console.error(`Error processing topic ${topic}:`, error);
      throw error;
    } finally {
      this.processingCache.delete(cacheKey);
    }
  }

  /**
   * Load a topic file from assets
   */
  private async loadTopicFile(topic: string): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        // Android: files are in assets folder
        const assetPath = `${topic}.txt`;
        const destPath = `${RNFS.DocumentDirectoryPath}/${topic}.txt`;
        
        try {
          // Copy from assets to a readable location
          await RNFS.copyFileAssets(assetPath, destPath);
          const content = await RNFS.readFile(destPath, 'utf8');
          return content;
        } catch (error) {
          console.warn(`Could not load ${topic}.txt from assets:`, error);
          // Try reading directly from assets path
          const content = await RNFS.readFileAssets(`${topic}.txt`, 'utf8');
          return content;
        }
      } else {
        // iOS: files are in bundle
        const bundlePath = `${RNFS.MainBundlePath}/${topic}.txt`;
        const exists = await RNFS.exists(bundlePath);
        
        if (exists) {
          const content = await RNFS.readFile(bundlePath, 'utf8');
          return content;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error loading topic file ${topic}:`, error);
      return null;
    }
  }

  /**
   * Process raw text into facts
   */
  async processText(text: string, topic: string, source: 'default' | 'user_upload' = 'default'): Promise<Fact[]> {
    try {
      // Parse text into facts using AI
      const facts = await aiService.parseTextToFacts(text, topic);

      // Store facts in database
      const storedFacts: Fact[] = [];
      for (const fact of facts) {
        const factInput: FactInput = {
          content: fact.content,
          topic: fact.topic,
          source,
        };
        const id = await storageService.insertFact(factInput);
        storedFacts.push({
          ...fact,
          id,
        });
      }

      return storedFacts;
    } catch (error) {
      console.error('Error processing text:', error);
      throw error;
    }
  }

  /**
   * Add quiz facts periodically (every 5-10 facts)
   */
  private async addQuizFacts(topic: string, facts: Fact[]): Promise<void> {
    const totalFacts = facts.length;
    if (totalFacts === 0) {
      return;
    }

    const quizInterval = 8;
    const maxQuizzes = Math.min(5, Math.floor(totalFacts / quizInterval) || (totalFacts >= 4 ? 1 : 0));
    if (maxQuizzes <= 0) {
      return;
    }

    const step = Math.max(1, Math.floor(totalFacts / maxQuizzes));
    const selectedFacts: Fact[] = [];
    for (let index = 0; index < totalFacts && selectedFacts.length < maxQuizzes; index += step) {
      selectedFacts.push(facts[index]);
    }

    const expectedQuizzes = selectedFacts.length;
    aiService.emitProgress({ type: 'quiz-start', topic, total: expectedQuizzes });

    const quizQuestions = await aiService.generateQuizQuestions(
      topic,
      selectedFacts.map((fact) => fact.content),
    );

    let inserted = 0;
    for (const quiz of quizQuestions) {
      try {
        const quizFact: FactInput = {
          content: `Quiz: ${quiz.question}`,
          topic,
          source: 'default',
          is_quiz: true,
          quiz_data: quiz,
        };
        await storageService.insertFact(quizFact);
        inserted += 1;
        aiService.emitProgress({ type: 'quiz-progress', topic, current: inserted, total: expectedQuizzes });
      } catch (error) {
        console.error('Error inserting quiz fact:', error);
      }
    }

    aiService.emitProgress({ type: 'quiz-complete', topic, total: inserted });
  }

  /**
   * Get default topics list
   */
  getDefaultTopics(): string[] {
    return [...this.defaultTopics];
  }
}

export const textProcessor = new TextProcessor();

