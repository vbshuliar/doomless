# Model Download Guide (Android Only)

## Quick Download Links

### Option 1: TinyLlama-1.1B-Chat (Recommended - ~700MB)

**Direct download from Hugging Face:**
- **Q4_K_M quantization** (recommended balance): 
  - https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
- **Q4_0 quantization** (smaller, ~600MB):
  - https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_0.gguf
- **Q5_K_M quantization** (better quality, ~800MB):
  - https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q5_K_M.gguf

### Option 2: Phi-2 (Alternative - Smaller, ~1.6GB)

**Direct download:**
- https://huggingface.co/microsoft/phi-2-gguf/resolve/main/phi-2.Q4_K_M.gguf

## Installation Steps

### 1. Download the Model

Choose one of the links above and download the `.gguf` file. The Q4_K_M version of TinyLlama is recommended for a good balance of size and quality.

### 2. Rename the File

Rename the downloaded file to `model.gguf` (if it's not already named that).

### 3. Place in Android Assets

Copy the `model.gguf` file to:
```
android/app/src/main/assets/models/model.gguf
```

**Windows PowerShell:**
```powershell
# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "android\app\src\main\assets\models"

# Copy the model file (adjust path to where you downloaded it)
Copy-Item "C:\path\to\downloaded\model.gguf" -Destination "android\app\src\main\assets\models\model.gguf"
```

**Linux/Mac:**
```bash
# Create directory if it doesn't exist
mkdir -p android/app/src/main/assets/models

# Copy the model file
cp ~/Downloads/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf android/app/src/main/assets/models/model.gguf
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

- **Q4_0**: ~600MB - Fastest, lower quality
- **Q4_K_M**: ~700MB - Recommended balance
- **Q5_K_M**: ~800MB - Better quality, slower
- **Q8_0**: ~1.4GB - Best quality, slower

For mobile devices, Q4_K_M is recommended.

## Troubleshooting

If the model doesn't load:
1. Verify the file is in the correct location
2. Check the file size matches the download
3. Ensure the file is named exactly `model.gguf`
4. Check app logs for error messages
5. Make sure you have enough storage space on the device

