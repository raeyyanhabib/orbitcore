@echo off
rem ORBIT TASK TRACKER - RUNNER & SETUP SCRIPT
rem Automates dependency checks, npm/pip installations, and launches the application.

title Orbit Core Setup & Run Console
color 0B

echo ================================================================================
echo                     ORBIT TASK TRACKER - SETUP ^& RUNNER
echo ================================================================================
echo.

rem 1. Check Node.js and npm presence
echo [1/4] Checking Node.js and npm environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js is not installed or not added to system PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: npm is not available in system PATH.
    echo.
    pause
    exit /b 1
)
echo OK: Node.js and npm detected.
echo.

rem 2. Check Python interpreter presence
echo [2/4] Checking Python environment...
where python >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Python is not installed or not added to system PATH.
    echo Please install Python 3.10+ from https://www.python.org/ and check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)
echo OK: Python interpreter detected.
echo.

rem 3. Fetch/install npm packages
echo [3/4] Checking Node.js package dependencies...
if exist "node_modules\" (
    echo OK: node_modules directory found. Skipping npm install.
) else (
    echo Running npm install...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo ERROR: Failed to install Node.js dependencies. Check network or package.json.
        echo.
        pause
        exit /b 1
    )
    echo OK: Node.js packages synced.
)
echo.

rem 4. Fetch/install Python packages
echo [4/4] Checking Python library dependencies...
python -c "import win32gui" >nul 2>nul
if %errorlevel% neq 0 (
    echo Running pip install...
    python -m pip install --upgrade pip
    python -m pip install pywin32 psutil duckduckgo_search pyinstaller
    if %errorlevel% neq 0 (
        color 0C
        echo ERROR: Failed to install Python library dependencies.
        echo.
        pause
        exit /b 1
    )
    echo OK: Python packages synced.
) else (
    echo OK: Python packages already installed. Skipping pip install.
)
echo.

echo ================================================================================
echo                     DEPENDENCIES SYNCED SUCCESSFULLY
echo ================================================================================
echo.
echo Select Execution Mode:
echo [1] Run in Development Mode (Vite Dev Server + Electron CLI)
echo [2] Build Production Python Binary ^& Run Packaged Front-end
echo [3] Exit
echo.

set /p modeChoice="Enter selection (1, 2, or 3): "

if "%modeChoice%"=="1" (
    echo.
    echo Launching development environment...
    echo Starting Vite frontend server concurrently...
    
    rem Start Vite dev server in background using start command
    start "" cmd /c "npm run dev"
    
    echo Starting Electron app shell...
    call npm start
    exit /b 0
)

if "%modeChoice%"=="2" (
    echo.
    echo Compiling Python backend monitor using PyInstaller...
    
    rem Run PyInstaller to package backend to src/backend/dist/orbit_monitor
    python -m PyInstaller --onedir --clean --noconfirm src/backend/monitor.py --distpath src/backend/dist -n orbit_monitor
    if %errorlevel% neq 0 (
        color 0C
        echo ERROR: PyInstaller build failed.
        pause
        exit /b 1
    )
    echo OK: PyInstaller binary created at src/backend/dist/orbit_monitor/orbit_monitor.exe
    
    echo.
    echo Building Vite frontend production assets...
    call npm run build
    if %errorlevel% neq 0 (
        color 0C
        echo ERROR: Frontend production build failed.
        pause
        exit /b 1
    )
    echo OK: Frontend production assets compiled to dist/ folder.
    
    echo.
    echo Starting application shell...
    call npm start
    exit /b 0
)

if "%modeChoice%"=="3" (
    echo Exiting console.
    exit /b 0
)

color 0C
echo Invalid selection. Exiting.
pause
exit /b 1
