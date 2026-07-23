@echo off
echo ===================================================
echo Running Flock Energy API Wrapper Test Suite
echo ===================================================
cd %~dp0..\backend
call .\venv\Scripts\activate.bat
pytest -v
pause
