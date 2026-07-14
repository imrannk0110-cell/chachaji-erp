@echo off
title Chachaji Udyog ERP Launcher
color 0E

cd /d "%~dp0"

echo ===================================================
echo       CHACHAJI UDYOG ERP - SYSTEM STARTUP
echo ===================================================
echo.

echo [1/3] Starting Backend Server...
start "Chachaji ERP - Backend (DO NOT CLOSE)" cmd /k "cd backend && node server.js"

echo [2/3] Starting Frontend Interface...
start "Chachaji ERP - Frontend (DO NOT CLOSE)" cmd /k "cd frontend && npm run dev"

echo [3/3] Waiting for the system to boot up...
timeout /t 5 /nobreak > nul

echo Opening ERP in your default web browser...
start http://localhost:3000

echo.
echo ===================================================
echo  System is running successfully! 
echo  Please DO NOT close the black terminal windows. 
echo  (You can minimize them)
echo ===================================================
timeout /t 3 /nobreak > nul
exit
