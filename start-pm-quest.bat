@echo off
title PM QUEST - Real-Time Server
cd /d "%~dp0"
cls
echo ==============================================================
echo   PM QUEST - The Project Management Challenge
echo ==============================================================
echo.
echo Starting local game server...
echo.
node server.js
pause
