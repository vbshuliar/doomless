# Quick Start Guide

## 1. Download the Model File

Download the TinyLlama model (recommended - ~700MB):
- **Direct link**: https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf

Or see `MODEL_DOWNLOAD.md` for more options.

## 2. Install the Model

1. Rename the downloaded file to `model.gguf`
2. Place it in: `android/app/src/main/assets/models/model.gguf`
3. Create the directory if it doesn't exist:
   ```bash
   mkdir -p android/app/src/main/assets/models
   ```

**Windows PowerShell:**
```powershell
New-Item -ItemType Directory -Force -Path "android\app\src\main\assets\models"
Copy-Item "path\to\downloaded\file.gguf" -Destination "android\app\src\main\assets\models\model.gguf"
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Run the App

```bash
npm run android
```

## 5. Test the UI

The app will show a test screen where you can:
- See AI initialization status
- Process the animals.txt file into facts
- Swipe left (Skip) or right (Like) on facts
- View quizzes that appear every 5-10 facts
- See your interaction history

## Troubleshooting

**Model not found error:**
- Verify `model.gguf` is in `android/app/src/main/assets/models/`
- Check the file size is ~700MB (for Q4_K_M)
- Rebuild the app after adding the model

**AI initialization fails:**
- Check device has enough storage space
- Check console logs for detailed error messages
- Ensure model file is not corrupted

**No facts showing:**
- Click "Process Topics" button to process animals.txt
- Check that animals.txt exists in `android/app/src/main/assets/`
- Check console for processing errors

## Next Steps

- The test UI demonstrates all core functionality
- Integrate with your main UI branch when ready
- Add more topic files (history.txt, science.txt, etc.) to assets folder

