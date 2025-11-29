# Model Setup Instructions

This app requires a Hugging Face model in GGUF format to be bundled with the app for offline AI inference.

## Recommended Model

- **TinyLlama-1.1B-Chat** (GGUF format, ~700MB)
- Alternative: **Phi-2** (smaller, but may have different performance characteristics)

## Model Format

The model must be in **GGUF format** (required by Cactus). If you have a model in other formats, you'll need to convert it using tools like `llama.cpp` or similar conversion utilities.

## Installation Steps

### 1. Download Model

Download a GGUF model file (e.g., `tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf` or similar) from Hugging Face.

### 2. Place Model File

#### Android
Place the model file in:
```
android/app/src/main/assets/models/model.gguf
```

#### iOS
1. Open the Xcode project
2. Drag the `model.gguf` file into the project
3. Ensure it's added to the app target
4. The file will be bundled with the app

### 3. Verify Model Path

The app will automatically:
- Copy the model from Android assets to a writable location on first run
- Load the model from the iOS bundle

### 4. Model Size Considerations

- Models are typically 500MB - 2GB in size
- This will increase your app bundle size significantly
- Consider using app bundle splits or on-demand downloads for production

## Alternative: On-Demand Download

If you prefer to download the model on first launch instead of bundling it:

1. Host the model file on a CDN or file server
2. Modify `src/utils/modelLoader.ts` to download the model on first launch
3. Store the downloaded model in the app's documents directory

## Testing

After placing the model file, run the app and check the console logs. The AI service should initialize successfully if the model is found.

