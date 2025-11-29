# Model Download Guide (Android Only)

## Quick Download Links

### Qwen 3.0 0.5B Instruct (Recommended - ~1.1GB)

**Direct download from Hugging Face:**
- **Q4_K_M quantization (balanced):**
  - https://huggingface.co/Qwen/Qwen3-0.5B-Instruct-GGUF/resolve/main/qwen3-0.5b-instruct-q4_k_m.gguf

> Tip: mirror the file locally if you need a stable internal host. The app expects the filename `qwen3-0_5b-instruct-q4_k_m.gguf`; rename the downloaded file if necessary.

## Installation Steps

### 1. Download the Model

Download the GGUF file linked above. The Q4_K_M build offers a solid balance of quality and speed for on-device parsing.

### 2. Rename the File

Rename the downloaded file to `qwen3-0_5b-instruct-q4_k_m.gguf` (matching the configuration in `modelLoader.ts`).

### 3. Place in Android Assets

Copy the GGUF file to:
```
android/app/src/main/assets/models/qwen3-0_5b-instruct-q4_k_m.gguf
```

**Windows PowerShell:**
```powershell
# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "android\app\src\main\assets\models"

# Copy the model file (adjust path to where you downloaded it)
Copy-Item "C:\path\to\downloaded\qwen3-0_5b-instruct-q4_k_m.gguf" -Destination "android\app\src\main\assets\models\qwen3-0_5b-instruct-q4_k_m.gguf"
```

**Linux/Mac:**
```bash
# Create directory if it doesn't exist
mkdir -p android/app/src/main/assets/models

# Copy the model file
cp ~/Downloads/qwen3-0_5b-instruct-q4_k_m.gguf android/app/src/main/assets/models/qwen3-0_5b-instruct-q4_k_m.gguf
```

### 4. Verify

Make sure the file exists at:
```
android/app/src/main/assets/models/qwen3-0_5b-instruct-q4_k_m.gguf
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
3. Ensure the file is named exactly `qwen3-0_5b-instruct-q4_k_m.gguf`
4. Check app logs for error messages
5. Make sure you have enough storage space on the device

