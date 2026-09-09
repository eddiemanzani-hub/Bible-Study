@echo off
cd /d "%~dp0"
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "serve.ps1" -Port 8843
timeout /t 1 /nobreak >nul
start "" http://localhost:8843
echo.
echo Verse by Verse is running at http://localhost:8843
echo Close this window's PowerShell process (or restart your computer) to stop the server.
pause
