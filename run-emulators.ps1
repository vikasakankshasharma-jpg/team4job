# Force correct Java 21 Environment for Firebase Emulators
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "✅ Forced JAVA_HOME to: $env:JAVA_HOME"
Write-Host "ℹ️ Checking Java Version..."
java -version

Write-Host "🚀 Starting Firebase Emulators..."
# execute the batch file to avoid quoting/parsing issues with && in PowerShell
npx firebase emulators:exec ".\test-runner.bat"
