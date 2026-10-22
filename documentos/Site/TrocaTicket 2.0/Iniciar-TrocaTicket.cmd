@echo off
setlocal
cd /d "%~dp0"
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 22.12 ou superior com npm e abra novamente.
  pause
  exit /b 1
)
if /I "%~1"=="configurar" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar.ps1" -Reconfigurar
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar.ps1"
)
if errorlevel 1 pause
endlocal
