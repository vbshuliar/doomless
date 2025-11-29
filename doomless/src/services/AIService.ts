import { Fact } from '../types/Fact';
import type { Interaction } from '../types/Interaction';
import type { PreferenceAnalysis } from '../types/Preferences';
import { getModelConfig, type ModelConfig } from '../utils/modelLoader';

// React Native exposes __DEV__ for runtime environment detection.
declare const __DEV__: boolean | undefined;

// ------------ Progress & internal types ------------

export type AIProgressEvent =
  | { type: 'model-download'; progress: number }
  | { type: 'parse-start'; topic: string; totalChunks: number }
  | { type: 'parse-chunk-start'; topic: string; chunkIndex: number; totalChunks: number }
  | {
      type: 'parse-chunk-complete';
      topic: string;
      chunkIndex: number;
      totalChunks: number;
      factsGenerated: number;
    }
  | { type: 'parse-complete'; topic: string; totalChunks: number; factsGenerated: number }
  | { type: 'parse-error'; topic: string; message: string }
  | { type: 'storage-save-progress'; topic: string; saved: number; total: number }
  | { type: 'storage-complete'; topic: string; total: number }
  | { type: 'quiz-start'; topic: string; total: number }
  | { type: 'quiz-progress'; topic: string; current: number; total: number }
  | { type: 'quiz-complete'; topic: string; total: number };

type ProgressListener = (event: AIProgressEvent) => void;

type CactusMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
};

type CompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
};

type QuizQuestion = {
  question: string;
  options: string[];
  correct_answer: number;
};

type StorageServiceInstance = {
  initialize: () => Promise<void>;
  getFactById: (id: number) => Promise<Fact | null>;
};

// ------------ Cactus dynamic import ------------

let CactusLMClass: any = null;
try {
  // This will work in React Native; in tests / web it just falls back.
  CactusLMClass = require('cactus-react-native').CactusLM;
} catch {
  console.warn(
    '[AIService] cactus-react-native not found. AI features will use fallback sentence splitter.',
  );
}

// Remove <think> blocks if the local model ever emits them.
function stripThinkingBlocks(raw: string): string {
  if (!raw) return raw;
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<think>|<\/think>/gi, '');
  return cleaned.trim();
}

// ------------ AIService ------------

class AIService {
  private lm: any = null;
  private initialized = false;
  private initializing = false;
  private fallbackEnabled = false;
  private lastDownloadPercent: number | null = null;
  private progressListeners = new Set<ProgressListener>();
  private storageService: StorageServiceInstance | null | undefined;

  /**
   * Optional: hook to get progress events in your UI
   */
  setProgressListener(listener?: ProgressListener) {
    this.progressListeners.clear();
    if (listener) {
      this.progressListeners.add(listener);
    }
  }

  subscribeProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  public emitProgress(event: AIProgressEvent) {
    if (this.progressListeners.size === 0) {
      return;
    }

    this.progressListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        this.debugLog('Progress listener threw an error', error);
      }
    });
  }

  private debugLog(message: string, extra?: unknown) {
    if (__DEV__) {
      console.log('[AIService]', message, extra ?? '');
    }
  }

  private preview(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen)}…`;
  }

  // ---------- Initialization / model loading ----------

  private async prepareModelInstance(config: ModelConfig): Promise<any> {
    if (!CactusLMClass) {
      throw new Error('cactus-react-native is not available');
    }

    // Use your model config if it has a `model` field; otherwise default.
    const lmOptions: any = { mode: 'local' }; // force local-only (no hybrid)
    if ((config as any).model) {
      lmOptions.model = (config as any).model;
    }

    const lmInstance = new CactusLMClass(lmOptions);

    // Download the model (no-op if already downloaded)
    await lmInstance.download({
      onProgress: (progress: number) => {
        const percent = Math.round(progress * 100);
        if (this.lastDownloadPercent === null || percent !== this.lastDownloadPercent) {
          this.lastDownloadPercent = percent;
          this.emitProgress({ type: 'model-download', progress });
          this.debugLog('Model download progress', percent);
        }
      },
    });

    // Some Cactus objects support an explicit init; call if present.
    if (typeof lmInstance.init === 'function') {
      await lmInstance.init();
    }

    return lmInstance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.initializing) {
      // If another call is already initializing, just wait for it.
      await new Promise<void>((resolve) => {
        const id = setInterval(() => {
          if (this.initialized) {
            clearInterval(id);
            resolve();
          }
        }, 100);
      });
      return;
    }

    this.initializing = true;

    try {
      if (!CactusLMClass) {
        console.warn(
          '[AIService] cactus-react-native is not installed or failed to load. ' +
            'Using fallback (simple sentence splitter).',
        );
        this.fallbackEnabled = true;
        this.initialized = true;
        this.initializing = false;
        return;
      }

      const config = getModelConfig();
      this.lm = await this.prepareModelInstance(config);

      this.initialized = true;
      this.initializing = false;
      this.fallbackEnabled = false;
    } catch (error) {
      console.error('[AIService] Failed to initialize Cactus model, using fallback.', error);
      this.lm = null;
      this.fallbackEnabled = true;
      this.initialized = true;
      this.initializing = false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ---------- Core helper: one-shot completion ----------

  private async runCompletion(
    messages: CactusMessage[],
    options: CompletionOptions = {},
  ): Promise<string> {
    if (!this.lm) {
      throw new Error('Cactus model is not initialized');
    }

    const result = await this.lm.complete({
      messages,
      mode: 'local', // ensure offline / local model
      temperature: options.temperature ?? 0.4,
      maxTokens: options.maxTokens ?? 512,
    });

    // Cactus docs: `result.response` holds the text. :contentReference[oaicite:1]{index=1}
    const raw = typeof result.response === 'string' ? result.response : '';
    return stripThinkingBlocks(raw);
  }

  // ---------- PUBLIC API: parse big text to key facts ----------

  /**
   * Given a big `text` and a `topic`, returns an array of Facts
   * that you can directly JSON.stringify and store in your DB.
   *
   * Uses the local Cactus model when available; otherwise a simple
   * sentence splitter as fallback.
   */
  async parseTextToFacts(text: string, topic: string): Promise<Fact[]> {
    await this.ensureInitialized();

    const normalizedText = text.trim();
    if (normalizedText.length === 0) {
      return [];
    }

    // Fallback: no Cactus available
    if (this.fallbackEnabled || !this.lm) {
      this.debugLog('parseTextToFacts using fallback sentence splitter');
      return this.fallbackParseTextToFacts(normalizedText, topic);
    }

    try {
      const chunkSize = 6000; // chars; safe for local models
      const chunks: string[] = [];

      for (let i = 0; i < normalizedText.length; i += chunkSize) {
        chunks.push(normalizedText.slice(i, i + chunkSize));
      }

      this.emitProgress({ type: 'parse-start', topic, totalChunks: chunks.length });

      const allFacts: Fact[] = [];
      const seen = new Set<string>();
      const MAX_FACTS = 120;
      const timestamp = new Date().toISOString();

      for (let index = 0; index < chunks.length; index++) {
        if (allFacts.length >= MAX_FACTS) break;

        const chunk = chunks[index];
        const chunkIndex = index + 1;

        this.emitProgress({
          type: 'parse-chunk-start',
          topic,
          chunkIndex,
          totalChunks: chunks.length,
        });

        const prompt = `
You are a JSON API that extracts key facts from documents.

TASK:
- Read the document text.
- Return ONLY valid JSON.
- JSON format: an array of objects like:
  [
    { "content": "short fact <= 200 characters" },
    { "content": "another key fact" }
  ]

RULES:
- Each fact MUST be 200 characters or less.
- Facts MUST be directly supported by the text.
- No IDs, no metadata, no explanations, no comments.
- Do NOT wrap the JSON in backticks.
- Do NOT output anything except the JSON array.

Topic: "${topic}"

Document:
${chunk}

JSON:
        `.trim();

        const messages: CactusMessage[] = [
          {
            role: 'system',
            content:
              'You convert documents into key factual JSON. ' +
              'Respond ONLY with a JSON array of objects: { "content": string }. ' +
              'No extra text, no <think> tags, no comments.',
          },
          { role: 'user', content: prompt },
        ];

        let modelResponse: string;
        try {
          modelResponse = await this.runCompletion(messages, {
            temperature: 0.3,
            maxTokens: 384,
          });
        } catch (completionError) {
          console.error('[AIService] Error calling Cactus complete:', completionError);
          continue;
        }

        let parsedFacts = this.parseFactsJson(modelResponse);

        if (parsedFacts.length === 0) {
          this.debugLog('parseTextToFacts: model response missing JSON, requesting reformat', {
            topic,
            chunkIndex,
            preview: this.preview(modelResponse, 220),
          });

          const recoveredFacts = await this.attemptJsonRecovery(modelResponse);
          if (recoveredFacts.length > 0) {
            this.debugLog('parseTextToFacts: JSON recovery succeeded', {
              topic,
              chunkIndex,
              count: recoveredFacts.length,
            });
            parsedFacts = recoveredFacts;
          }
        }

        let acceptedCount = 0;

        if (parsedFacts.length > 0) {
          this.debugLog('parseTextToFacts: model JSON parsed', {
            topic,
            chunkIndex,
            count: parsedFacts.length,
            preview: this.preview(JSON.stringify(parsedFacts), 220),
          });

          acceptedCount = this.collectFactsFromContents(
            parsedFacts.map((fact) => fact.content),
            topic,
            timestamp,
            'cactus',
            allFacts,
            seen,
            MAX_FACTS,
          );
        } else {
          const fallbackSentences = this.splitTextIntoSentences(chunk);
          acceptedCount = this.collectFactsFromContents(
            fallbackSentences,
            topic,
            timestamp,
            'fallback',
            allFacts,
            seen,
            MAX_FACTS,
          );

          this.debugLog('parseTextToFacts: using sentence fallback', {
            topic,
            chunkIndex,
            count: acceptedCount,
            preview: this.preview(JSON.stringify(fallbackSentences.slice(0, 5)), 220),
          });
        }

        this.emitProgress({
          type: 'parse-chunk-complete',
          topic,
          chunkIndex,
          totalChunks: chunks.length,
          factsGenerated: acceptedCount,
        });

        if (allFacts.length >= MAX_FACTS) break;
      }

      this.emitProgress({
        type: 'parse-complete',
        topic,
        totalChunks: chunks.length,
        factsGenerated: allFacts.length,
      });

      return allFacts;
    } catch (error) {
      console.error('[AIService] Error parsing text to facts:', error);
      const message = error instanceof Error ? error.message : 'Unknown parsing error';
      this.emitProgress({ type: 'parse-error', topic, message });
      throw error;
    }
  }

  // ---------- JSON parsing helper ----------

  /**
   * Try to interpret the model output as JSON array of { content: string }.
   * Robust to models that add junk before/after the array.
   */
  private parseFactsJson(
    raw: string,
  ): Array<{ content: string }> {
    const cleaned = stripThinkingBlocks(raw).trim();
    if (!cleaned) return [];

    // Try to extract the first [...] block
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const candidate = arrayMatch ? arrayMatch[0] : cleaned;

    try {
      const parsed = JSON.parse(candidate);

      if (!Array.isArray(parsed)) return [];

      const facts: Array<{ content: string }> = [];

      for (const item of parsed) {
        if (item && typeof item === 'object') {
          const content =
            typeof (item as any).content === 'string'
              ? (item as any).content
              : typeof (item as any).fact === 'string'
              ? (item as any).fact
              : '';

          if (content.trim().length > 0) {
            facts.push({ content: content.trim() });
          }
        }
      }

      return facts;
    } catch (e) {
      console.warn('[AIService] Failed to parse JSON from model output, returning empty list.', e);
      return [];
    }
  }

  private async attemptJsonRecovery(rawResponse: string): Promise<Array<{ content: string }>> {
    const cleaned = stripThinkingBlocks(rawResponse).trim();
    if (!cleaned || !this.lm) {
      return [];
    }

    const messages: CactusMessage[] = [
      {
        role: 'system',
        content:
          'You reformat replies into strict JSON arrays of { "content": string }. Output only JSON.',
      },
      {
        role: 'user',
        content:
          `Convert the following text into a JSON array where each element is an object with a "content" field (<= 200 characters). Each fact must remain separate.\n\nText:\n${cleaned}`,
      },
    ];

    try {
      const response = await this.runCompletion(messages, {
        temperature: 0.1,
        maxTokens: 384,
      });

      return this.parseFactsJson(response);
    } catch (error) {
      this.debugLog('attemptJsonRecovery failed', error);
      return [];
    }
  }

  private collectFactsFromContents(
    contents: Iterable<string>,
    topic: string,
    timestamp: string,
    source: 'cactus' | 'fallback',
    allFacts: Fact[],
    seen: Set<string>,
    maxFacts: number,
  ): number {
    let accepted = 0;

    for (const rawContent of contents) {
      if (allFacts.length >= maxFacts) break;

      const content = rawContent.trim();
      if (!content) continue;

      const truncated = content.slice(0, 200);
      const normalized = truncated.toLowerCase();
      if (seen.has(normalized)) continue;

      seen.add(normalized);
      allFacts.push({
        id: 0,
        content: truncated,
        topic,
        source: source as unknown as Fact['source'],
        created_at: timestamp,
      });
      accepted++;
    }

    return accepted;
  }

  private splitTextIntoSentences(text: string): string[] {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];

    return cleaned
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);
  }

  // ---------- Simple fallback if Cactus is not available ----------

  private fallbackParseTextToFacts(text: string, topic: string): Fact[] {
    const sentences = this.splitTextIntoSentences(text);
    const MAX_FACTS = 60;
    const timestamp = new Date().toISOString();

    return sentences
      .slice(0, MAX_FACTS)
      .map<Fact>((sentence) => ({
        id: 0,
        content: sentence.slice(0, 200),
        topic,
        source: 'fallback' as unknown as Fact['source'],
        created_at: timestamp,
      }));
  }

  // ---------- Lifecycle helpers ----------

  isInitialized(): boolean {
    return this.initialized;
  }

  async destroy(): Promise<void> {
    if (this.lm) {
      try {
        if (typeof this.lm.destroy === 'function') {
          await this.lm.destroy();
        }
      } catch (error) {
        console.error('[AIService] Error destroying model:', error);
      }
      this.lm = null;
      this.initialized = false;
    }
  }
}

export const aiService = new AIService();
