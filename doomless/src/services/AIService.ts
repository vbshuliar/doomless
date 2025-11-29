// CactusLM import - may need to be installed manually
// See CACTUS_INSTALL.md for installation instructions
let CactusLM: any;
try {
  CactusLM = require('cactus-react-native').CactusLM;
} catch (error) {
  console.warn('cactus-react-native not found. AI features will not work until installed.');
  // Create a stub for development
  CactusLM = null;
}
import { Fact } from '../types/Fact';
import { Interaction } from '../types/Interaction';
import { PreferenceAnalysis } from '../types/Preferences';
import { getModelPath, verifyModelExists, getModelConfig } from '../utils/modelLoader';

class AIService {
  private lm: any = null;
  private initialized = false;
  private initializing = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializing) {
      // Wait for ongoing initialization
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.initialized) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }

    this.initializing = true;

    try {
      // If CactusLM native module is not available, skip initialization gracefully.
      if (!CactusLM) {
        console.warn(
          '[AIService] cactus-react-native is not installed or failed to load. ' +
            'AI features are disabled for now. See CACTUS_INSTALL.md for setup.',
        );
        this.initialized = true;
        this.initializing = false;
        return;
      }

      const modelPath = await getModelPath();
      const exists = await verifyModelExists(modelPath);

      if (!exists) {
        console.error(
          `[AIService] Model file not found at: ${modelPath}. ` +
            'The app will run, but AI features are disabled. ' +
            'Make sure android/app/src/main/assets/models/model.gguf exists and is a real GGUF model.',
        );
        // Do not throw here to avoid crashing the app; leave AI uninitialized.
        this.initializing = false;
        this.initialized = false;
        return;
      }

      if (!CactusLM) {
        throw new Error(
          'cactus-react-native is not installed. Please install it following the instructions in CACTUS_INSTALL.md'
        );
      }

      const config = getModelConfig();
      
      // Initialize CactusLM - API may vary, try both patterns
      let lm: any;
      let error: any;
      
      try {
        // Try new CactusLM() pattern
        const cactusLM = new CactusLM();
        const result = await cactusLM.init({
          model: modelPath,
          n_ctx: config.n_ctx || 2048,
        });
        
        if (result.error) {
          error = result.error;
        } else {
          lm = result.lm || cactusLM;
        }
      } catch (initError) {
        // Try alternative initialization pattern
        try {
          const result = await CactusLM.init({
            model: modelPath,
            n_ctx: config.n_ctx || 2048,
          });
          
          if (result.error) {
            error = result.error;
          } else {
            lm = result.lm;
          }
        } catch (altError) {
          error = altError;
        }
      }

      if (error || !lm) {
        throw new Error(`Failed to initialize model: ${error || 'Unknown error'}`);
      }

      this.lm = lm;
      this.initialized = true;
      this.initializing = false;
    } catch (error) {
      this.initializing = false;
      console.error('Failed to initialize AI service:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Parse large text into 200-character facts
   */
  async parseTextToFacts(text: string, topic: string): Promise<Fact[]> {
    await this.ensureInitialized();

    if (!this.lm) {
      throw new Error('Model not initialized');
    }

    try {
      // Split text into chunks for processing (2000 chars per chunk)
      const chunkSize = 2000;
      const chunks: string[] = [];
      
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }

      const allFacts: Fact[] = [];

      for (const chunk of chunks) {
        const prompt = `Extract concise, interesting facts from the following text. Each fact should be exactly 200 characters or less. Format each fact on a new line. Only extract factual information, not opinions.

Text:
${chunk}

Facts:`;

        const messages = [
          { role: 'user' as const, content: prompt }
        ];

        // Try different API patterns for CactusLM
        let result: any;
        
        try {
          // Try .complete() method
          result = await this.lm.complete({ messages });
        } catch (err) {
          try {
            // Try .completion() method
            result = await this.lm.completion(messages, {
              n_predict: 500,
              temperature: 0.7,
            });
            // Normalize response format
            if (result && result.text) {
              result = { response: result.text, error: null };
            }
          } catch (err2) {
            throw new Error(`Model inference failed: ${err2}`);
          }
        }
        
        if (result.error) {
          console.error('Error generating facts:', result.error);
          continue;
        }

        const response = result.response || '';
        
        // Parse facts from response (split by newlines)
        const factLines = response
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && line.length <= 200);

        // Create Fact objects
        for (const content of factLines) {
          if (content.length > 0) {
            allFacts.push({
              id: 0, // Will be set by database
              content: content.substring(0, 200), // Ensure max 200 chars
              topic,
              source: 'default',
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      return allFacts;
    } catch (error) {
      console.error('Error parsing text to facts:', error);
      throw error;
    }
  }

  /**
   * Analyze user preferences based on interactions
   */
  async analyzeUserPreference(interactions: Interaction[]): Promise<PreferenceAnalysis> {
    await this.ensureInitialized();

    if (!this.lm) {
      throw new Error('Model not initialized');
    }

    if (interactions.length === 0) {
      return {
        preferred_topics: [],
        disliked_topics: [],
        neutral_topics: [],
        overall_scores: {},
      };
    }

    try {
      // Group interactions by topic (we need to get facts first)
      // For now, we'll analyze based on swipe directions
      const rightSwipes = interactions.filter(i => i.direction === 'right').length;
      const leftSwipes = interactions.filter(i => i.direction === 'left').length;

      const prompt = `Based on the following user interactions, analyze their preferences:
- Right swipes (interested): ${rightSwipes}
- Left swipes (not interested): ${leftSwipes}
- Total interactions: ${interactions.length}

Analyze the pattern and provide a JSON response with:
{
  "preferred_topics": ["topic1", "topic2"],
  "disliked_topics": ["topic3"],
  "neutral_topics": ["topic4"],
  "overall_scores": {"topic1": 0.8, "topic2": 0.6, "topic3": -0.5}
}

Only respond with valid JSON.`;

      const messages = [
        { role: 'user' as const, content: prompt }
      ];

      // Try different API patterns for CactusLM
      let result: any;
      
      try {
        result = await this.lm.complete({ messages });
      } catch (err) {
        try {
          result = await this.lm.completion(messages, {
            n_predict: 500,
            temperature: 0.7,
          });
          if (result && result.text) {
            result = { response: result.text, error: null };
          }
        } catch (err2) {
          throw new Error(`Model inference failed: ${err2}`);
        }
      }
      
      if (result.error) {
        console.error('Error analyzing preferences:', result.error);
        // Return default analysis
        return {
          preferred_topics: [],
          disliked_topics: [],
          neutral_topics: [],
          overall_scores: {},
        };
      }

      try {
        // Try to parse JSON from response
        const response = result.response || '';
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return analysis as PreferenceAnalysis;
        }
      } catch (parseError) {
        console.error('Error parsing preference analysis JSON:', parseError);
      }

      // Fallback: simple analysis based on ratios
      const preferenceRatio = rightSwipes / (rightSwipes + leftSwipes || 1);
      return {
        preferred_topics: preferenceRatio > 0.6 ? ['general'] : [],
        disliked_topics: preferenceRatio < 0.4 ? ['general'] : [],
        neutral_topics: [],
        overall_scores: { general: (preferenceRatio - 0.5) * 2 }, // Scale to -1 to 1
      };
    } catch (error) {
      console.error('Error analyzing user preference:', error);
      throw error;
    }
  }

  /**
   * Generate related facts for a topic when user swipes right
   */
  async generateRelatedFacts(topic: string, currentFact: string): Promise<string[]> {
    await this.ensureInitialized();

    if (!this.lm) {
      throw new Error('Model not initialized');
    }

    try {
      const prompt = `Based on this fact about ${topic}:
"${currentFact}"

Generate 3 related, interesting facts about ${topic}. Each fact should be exactly 200 characters or less. Format each fact on a new line.

Related facts:`;

      const messages = [
        { role: 'user' as const, content: prompt }
      ];

      // Try different API patterns for CactusLM
      let result: any;
      
      try {
        result = await this.lm.complete({ messages });
      } catch (err) {
        try {
          result = await this.lm.completion(messages, {
            n_predict: 500,
            temperature: 0.7,
          });
          if (result && result.text) {
            result = { response: result.text, error: null };
          }
        } catch (err2) {
          throw new Error(`Model inference failed: ${err2}`);
        }
      }
      
      if (result.error) {
        console.error('Error generating related facts:', result.error);
        return [];
      }

      const response = result.response || '';
      
      // Parse facts from response
      const facts = response
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.length <= 200)
        .slice(0, 3); // Limit to 3 facts

      return facts;
    } catch (error) {
      console.error('Error generating related facts:', error);
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.lm) {
      try {
        await this.lm.destroy();
      } catch (error) {
        console.error('Error destroying model:', error);
      }
      this.lm = null;
      this.initialized = false;
    }
  }
}

export const aiService = new AIService();

