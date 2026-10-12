@echo off
REM ============================================================
REM  VEKROM - Iniciar tudo e abrir no Edge (duplo clique)
REM  Sobe: API :3001, Gateway :3002, Web :5173 (janelas minimizadas)
REM  Para parar: feche as 3 janelas "Vekrom ..." na barra de tarefas
REM ============================================================
set NPM="C:\Program Files\nodejs\npm.cmd"
set "BASE=%~dp0"

echo Subindo API...
start "Vekrom API" /d "%BASE%\apps\api" /min %NPM% run dev

echo Subindo Gateway...
start "Vekrom Gateway" /d "%BASE%\apps\gateway" /min %NPM% run dev

echo Subindo Web...
start "Vekrom Web" /d "%BASE%\apps\web" /min %NPM% run dev

echo Aguardando servidores (15s)...
timeout /t 15 /nobreak >nul

start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" http://localhost:5173
echo.
echo Vekrom aberto no Edge!
echo Login demo:  demo@vekrom.gg  /  password123
echo.
pause
