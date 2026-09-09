@echo off
REM Start Orbit Task Tracker

echo Starting Orbit Task Tracker...
echo.

REM Start npm dev and npm start simultaneously
start cmd /k "npm run dev"
timeout /t 3
start cmd /k "npm start"

echo.
echo Orbit is launching... 🚀