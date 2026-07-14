@echo off
echo ----------------------------------------------------
echo CHACHAJI UDYOG ERP - FRESH PRODUCTION RESET TOOL
echo ----------------------------------------------------
echo.
echo WARNING: This will permanently delete all test data, 
echo dummy entries, and backup files.
echo.
echo IMPORTANT: PLEASE MAKE SURE YOUR SERVER (node server.js) 
echo IS STOPPED BEFORE CONTINUING!
echo.
pause

echo Deleting Database Files...
del /F /Q "backend\hd_safa.db" 2>nul
del /F /Q "backend\hd_safa.db-wal" 2>nul
del /F /Q "backend\hd_safa.db-shm" 2>nul
del /F /Q "hd_safa" 2>nul

echo Deleting Backup Folders...
rmdir /S /Q "backend\backups" 2>nul

echo.
echo ----------------------------------------------------
echo RESET SUCCESSFUL! 
echo The software is now 100%% clean and ready to be zipped.
echo The database will automatically recreate itself as fresh 
echo when the client starts the software for the first time.
echo ----------------------------------------------------
pause
