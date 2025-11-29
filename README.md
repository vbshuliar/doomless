# Doomless

Transform mindless scrolling into personalized learning. A swipe-based React Native app with fully offline AI.

## Overview

Turn doom-scrolling into productive learning through bite-sized facts, adaptive quizzes, and intelligent content delivery. Inspired by TikTok's engagement with Tinder's simplicity.

**Features:**
- **Swipe left** → Mark as learned/skip
- **Swipe right** → Dive deeper into related topics
- **Adaptive quizzes** → Reinforce learning every 5-10 facts
- **Progress tracking** → Monitor your brain training journey
- **Rich topics** → Animals, history, plants, science, sports, and more

**Tech Stack:**
- React Native with [Cactus](https://cactuscompute.com/docs/react-native) for local AI inference
- HuggingFace models for content generation (200-char facts)
- Fully offline personalization and preference learning
- PDF upload support for custom learning materials

## Quick Start

**Prerequisites:**
- [JDK 17](https://download.oracle.com/java/17/archive/jdk-17.0.12_windows-x64_bin.exe)
- [Android Studio](https://redirector.gvt1.com/edgedl/android/studio/install/2025.2.1.8/android-studio-2025.2.1.8-windows.exe)

**Setup:**
```bash
# Configure JAVA_HOME
JAVA_HOME=C:\Program Files\Java\jdk
PATH=%JAVA_HOME%\bin

# Verify installation
java -version
```

**Run:**
```bash
cd android && .\gradlew clean && cd ..
npx react-native run-android
```
