@echo off
title PM QUEST - Launcher
cd /d "%~dp0"
cls
echo ==============================================================
echo   PM QUEST - The Project Management Challenge
echo ==============================================================
echo.
echo 1. Starting game server in background window...
start "PM QUEST SERVER" cmd /k "node server.js"

echo 2. Waiting 2 seconds for server initialization...
timeout /t 2 /nobreak > nul

echo 3. Opening Host Presentation Screen in default browser...
start http://localhost:3000/host

echo.
echo ==============================================================
echo   Server is running! 
echo   Keep the server window open while running your presentation.
echo ==============================================================
echo.
exit
