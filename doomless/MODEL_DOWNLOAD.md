# Model Download Guide (Android Only)

## Quick Download Links

### Custom Bundled Model

Bundle the GGUF file you want to ship as `model.gguf`. Ensure it includes all tokenizer/config assets required by the runtime.

## Installation Steps

### 1. Download the Model

Download the GGUF file linked above. The Q4_K_M build offers a solid balance of quality and speed for on-device parsing.

### 2. Rename the File

Rename the downloaded/converted file to `model.gguf` (matching the configuration in `modelLoader.ts`).

### 3. Place in Android Assets

Copy the GGUF file (plus any supporting files) to:
```
android/app/src/main/assets/models/model.gguf
```

**Windows PowerShell:**
```powershell
# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "android\app\src\main\assets\models"

# Copy the model file (adjust path to where you downloaded it)
Copy-Item "C:\path\to\model.gguf" -Destination "android\app\src\main\assets\models\model.gguf"
```

**Linux/Mac:**
```bash
# Create directory if it doesn't exist
mkdir -p android/app/src/main/assets/models

# Copy the model file
cp ~/Downloads/model.gguf android/app/src/main/assets/models/model.gguf
```

### 4. Verify

Make sure the file exists at:
```
android/app/src/main/assets/models/model.gguf
```

### 5. Rebuild the App

After adding the model file, rebuild your Android app:
```bash
npm run android
```

## Model Size Considerations

- **Q4_K_M**: ~1.1GB - Recommended balance of speed and accuracy
- **Q5_K_M**: ~1.4GB - Higher fidelity, slower on mid-range phones
- **Q8_0**: ~2.2GB - Highest fidelity, requires high-end hardware

## Troubleshooting

If the model doesn't load:
1. Verify the file is in the correct location
2. Check the file size matches the download
3. Ensure the file is named exactly `model.gguf`
4. Check app logs for error messages
5. Make sure you have enough storage space on the device

