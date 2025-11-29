# Model Setup Instructions

This app ships with a Hugging Face model in GGUF format so the Cactus runtime can operate entirely offline.

## Recommended Model

- **Qwen 3.0 0.5B Instruct – Q4_K_M quantization** (~1.1 GB)
- The project is configured to look for a bundled asset named `qwen3-0_5b-instruct-q4_k_m.gguf`.

## Model Format

The model must be in **GGUF format** (required by Cactus). If you have a model in other formats, you'll need to convert it using tools like `llama.cpp` or similar conversion utilities.

## Installation Steps

### 1. Download Model

Download the GGUF artifact from Hugging Face (for example `qwen3-0_5b-instruct-q4_k_m.gguf`). Keep the filename intact so it matches the value referenced in `src/utils/modelLoader.ts`.

### 2. Place Model File

#### Android
Place the model file in:
```
android/app/src/main/assets/models/qwen3-0_5b-instruct-q4_k_m.gguf
```

#### iOS
1. Open the Xcode project
2. Drag the GGUF file into the project (select “Create folder references”)
3. Ensure it's added to the app target
4. The bundled filename should remain `qwen3-0_5b-instruct-q4_k_m.gguf`

### 3. Verify Model Path

The app will automatically:
- Copy the bundled model into Cactus' writable directory on first run (Android)
- Load the GGUF file directly from the iOS bundle

### 4. Model Size Considerations

- Models are typically 500MB - 2GB in size
- This will increase your app bundle size significantly
- Consider using app bundle splits or on-demand downloads for production

## Alternative: On-Demand Download

The default configuration avoids any network calls. If you must download models dynamically, update `src/utils/modelLoader.ts` to provide a fallback identifier and re-enable remote downloads. Remember to obtain user consent before transferring large files.

## Testing

After placing the model file, run the app and check the console logs. The AI service should initialize successfully if the model is found.

