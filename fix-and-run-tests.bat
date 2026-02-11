@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Cleaning up previous Emulator processes...
taskkill /F /IM java.exe >nul 2>&1

echo.
echo ===================================================
echo  Forcing Java 21 Environment for Firebase Emulators
echo ===================================================
echo JAVA_HOME set to: %JAVA_HOME%
echo.
echo Checking Java Version...
java -version
echo.

echo ===================================================
echo  Starting Firebase Emulators and Tests
echo ===================================================
call npx firebase emulators:exec "test-runner.bat"
if %errorlevel% neq 0 (
    echo.
    echo Tests Failed or Emulator Crashed
    exit /b %errorlevel%
)

echo.
echo All Tests passed!
