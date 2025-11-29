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

      // Store facts in database
      for (const fact of facts) {
        const factInput: FactInput = {
          content: fact.content,
          topic: fact.topic,
          source: 'default',
        };
        await storageService.insertFact(factInput);
      }

      // Add quiz facts every 5-10 facts
      await this.addQuizFacts(topic, facts.length);

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
  private async addQuizFacts(topic: string, totalFacts: number): Promise<void> {
    // Add a quiz every 7 facts on average
    const quizInterval = 7;
    const numQuizzes = Math.floor(totalFacts / quizInterval);

    for (let i = 0; i < numQuizzes; i++) {
      try {
        // Get a random fact from the topic to create a quiz about
        const facts = await storageService.getFacts(topic, 1, i * quizInterval);
        if (facts.length > 0) {
          const fact = facts[0];
          
          // Generate quiz question using AI (simplified - in production, use AI to generate)
          const quizData = await this.generateQuizQuestion(fact.content, topic);
          
          if (quizData) {
            const quizFact: FactInput = {
              content: `Quiz: ${quizData.question}`,
              topic,
              source: 'default',
              is_quiz: true,
              quiz_data: quizData,
            };
            await storageService.insertFact(quizFact);
          }
        }
      } catch (error) {
        console.error('Error adding quiz fact:', error);
      }
    }
  }

  /**
   * Generate a quiz question based on a fact
   */
  private async generateQuizQuestion(factContent: string, topic: string): Promise<{
    question: string;
    options: string[];
    correct_answer: number;
  } | null> {
    try {
      await aiService.ensureInitialized();
      const lm = (aiService as any).lm;
      
      if (!lm) {
        return null;
      }

      const prompt = `Based on this fact: "${factContent}"

Generate a multiple-choice quiz question with 4 options. Respond in JSON format:
{
  "question": "What is the question?",
  "options": ["option1", "option2", "option3", "option4"],
  "correct_answer": 0
}

Only respond with valid JSON.`;

      const messages = [
        { role: 'user' as const, content: prompt }
      ];

      // Try different API patterns for CactusLM
      let result: any;
      
      try {
        result = await lm.complete({ messages });
      } catch (err) {
        try {
          result = await lm.completion(messages, {
            n_predict: 500,
            temperature: 0.7,
          });
          if (result && result.text) {
            result = { response: result.text, error: null };
          }
        } catch (err2) {
          console.error('Error generating quiz:', err2);
          return null;
        }
      }
      
      if (result.error) {
        console.error('Error generating quiz:', result.error);
        return null;
      }

      try {
        const response = result.response || '';
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const quiz = JSON.parse(jsonMatch[0]);
          if (quiz.question && quiz.options && Array.isArray(quiz.options) && quiz.options.length === 4) {
            return {
              question: quiz.question,
              options: quiz.options,
              correct_answer: quiz.correct_answer || 0,
            };
          }
        }
      } catch (parseError) {
        console.error('Error parsing quiz JSON:', parseError);
      }

      return null;
    } catch (error) {
      console.error('Error generating quiz question:', error);
      return null;
    }
  }

  /**
   * Get default topics list
   */
  getDefaultTopics(): string[] {
    return [...this.defaultTopics];
  }
}

export const textProcessor = new TextProcessor();

