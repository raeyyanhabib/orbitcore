@echo off
echo Building Python executable for OrbitCore...

cd src\backend
pip install -r requirements.txt
pip install pyinstaller

pyinstaller --onefile ^
  --windowed ^
  --name orbit_monitor ^
  --distpath ./dist ^
  --specpath . ^
  --hidden-import=psutil ^
  --hidden-import=win32gui ^
  --hidden-import=win32process ^
  --hidden-import=winsound ^
  --hidden-import=duckduckgo_search ^
  monitor.py

cd ..\..

echo.
echo Python executable created at: src\backend\dist\orbit_monitor.exe
pause
