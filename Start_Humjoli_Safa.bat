@echo off
title Humjoli Safa ERP Launcher
echo ==============================================
echo STARTING HUMJOLI SAFA ERP & CRM NETWORKS...
echo ==============================================
echo.
echo [1/3] Terminating any existing node processes...
taskkill /f /im node.exe >nul 2>&1
echo.
echo [2/3] Installing workspace dependencies...
call npm run install-all
echo.
echo [3/3] Booting backend & frontend servers concurrently...
echo Application will launch on: http://localhost:3000/
echo.
npm run dev
pause
