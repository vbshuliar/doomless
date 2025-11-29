# doomless
An offline swipe-based app that turns mindless scrolling into smart, personalized learning through facts, games, and conversations.

Download JDK 17: https://download.oracle.com/java/17/archive/jdk-17.0.12_windows-x64_bin.exe
Download Android Studio: https://redirector.gvt1.com/edgedl/android/studio/install/2025.2.1.8/android-studio-2025.2.1.8-windows.exe

Open “Environment Variables…
Under System variables:
    Click New…
        Name: JAVA_HOME
        Value: your JDK 17 path(C:\Program Files\Java\jdk)

Under System variables, find Path → Edit… → New:
    %JAVA_HOME%\bin

Confirm Java 17 is active in new powershell:
    java -version
    echo %JAVA_HOME%

 Then:
 cd android   
 .\gradlew clean
 cd ..
 npx react-native run-android