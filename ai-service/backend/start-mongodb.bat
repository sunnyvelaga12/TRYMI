@echo off
echo ==========================================
echo 🚀 STARTING MONGODB SERVICE...
echo ==========================================

:: Check if MongoDB is already running
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ MongoDB is already running!
    pause
    exit /b
)

:: Try to start MongoDB
echo ⏳ Attempting to start MongoDB...
start "MongoDB Server" mongod --dbpath "%~dp0data_restore"

:: Wait a few seconds for it to initialize
timeout /t 5 /nobreak > NUL

:: Check again
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ MongoDB started successfully!
) else (
    echo ❌ Failed to start MongoDB. 
    echo 💡 Please make sure MongoDB is installed and the data directory ^(C:\data\db^) exists.
    echo 💡 Or run: mongod --dbpath your_data_path
)

pause
