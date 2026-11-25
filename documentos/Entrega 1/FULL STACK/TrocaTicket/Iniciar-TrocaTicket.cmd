@echo off
setlocal
rem Abre a API e o site do TrocaTicket (Entrega 1). Use "Iniciar-TrocaTicket.cmd configurar" para refazer a conexao do MySQL.
cd /d "%~dp0"
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 22.12 ou mais novo ^(https://nodejs.org^) e abra este arquivo de novo.
  pause
  exit /b 1
)
node "%~dp0scripts\iniciar.mjs" %*
if errorlevel 1 pause
endlocal
