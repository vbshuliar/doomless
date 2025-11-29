export interface ModelConfig {
  /**
   * Preferred model identifier used by Cactus when loading from the local bundle.
   */
  modelId: string;
  /**
   * Optional remote model identifier to fall back to when the bundled asset is missing.
   */
  fallbackModelId?: string;
  /**
   * Context window size supplied to the model during initialization.
   */
  contextSize?: number;
  /**
   * Name of the bundled model file placed under android/app/src/main/assets/models/.
   */
  assetFileName?: string;
  /**
   * Whether we should attempt to seed Cactus' model cache from the bundled asset.
   */
  useBundledAsset?: boolean;
}

export function getModelConfig(): ModelConfig {
  return {
    modelId: 'qwen3-0.6',
    contextSize: 2048,
    useBundledAsset: false,
  };
}

