$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "Java Version:"
java -version

npx firebase emulators:exec --project team4job-live --only auth,firestore,storage "npx playwright test tests/e2e/coordination-sync.spec.ts tests/e2e/universal-master-audit.spec.ts --project=chromium"
