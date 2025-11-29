export interface ModelConfig {
  /**
   * Context window size supplied to the model during initialization.
   */
  contextSize?: number;
  /**
   * Whether the model should be predownloaded during initialization.
   */
  preloadModel?: boolean;
}

export function getModelConfig(): ModelConfig {
  return {
    contextSize: 4096,
    preloadModel: true,
  };
}

