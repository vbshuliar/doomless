import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export interface ModelConfig {
  modelPath: string;
  n_ctx?: number;
}

/**
 * Get the path to the bundled model file (Android only)
 * Model should be placed in: android/app/src/main/assets/models/model.gguf
 */
export async function getModelPath(): Promise<string> {
  // Android only implementation
  const modelName = 'model.gguf';
  const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;
  
  // Check if model already exists in documents (already copied)
  const exists = await RNFS.exists(destPath);
  if (exists) {
    return destPath;
  }

  // Copy from assets to documents directory
  // The model should be in android/app/src/main/assets/models/model.gguf
  try {
    // Copy from assets to writable documents directory
    await RNFS.copyFileAssets(`models/${modelName}`, destPath);
    console.log('Model copied from assets to:', destPath);
    return destPath;
  } catch (error) {
    console.error('Could not copy model from assets:', error);
    console.error('Make sure model.gguf is in android/app/src/main/assets/models/');
    // Still return the destination path - the error will be caught during initialization
    return destPath;
  }
}

/**
 * Verify that the model file exists
 */
export async function verifyModelExists(modelPath: string): Promise<boolean> {
  try {
    const exists = await RNFS.exists(modelPath);
    return exists;
  } catch (error) {
    console.error('Error verifying model existence:', error);
    return false;
  }
}

/**
 * Get model configuration
 */
export function getModelConfig(): ModelConfig {
  return {
    modelPath: '', // Will be set by getModelPath()
    n_ctx: 2048, // Context window size
  };
}

