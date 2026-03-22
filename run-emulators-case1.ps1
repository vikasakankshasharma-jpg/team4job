# Force correct Java 21 Environment for Firebase Emulators
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "Forced JAVA_HOME to: $env:JAVA_HOME"
Write-Host "Checking Java Version..."
java -version

Write-Host "Starting Firebase Emulators and running Case 1..."
npx firebase emulators:exec --project dodo-beta --only auth,firestore,storage ".\run-case1.bat"
