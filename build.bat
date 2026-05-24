@echo off
setlocal enabledelayedexpansion

echo === Try Monitor - Building Installer ===
echo.

set PATH=%PATH%;C:\Program Files\nodejs

echo [0/4] Generating app icon...
call npx.cmd node scripts/generate-icon.mjs
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo [1/4] Building renderer...
call npx.cmd vite build
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo [2/4] Building main process...
call npx.cmd tsc -p tsconfig.node.json
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

copy /Y electron\preload.cjs dist-electron\preload.cjs

echo [3/4] Building installer (MSI + NSIS)...
call npx.cmd electron-builder

if %ERRORLEVEL% EQU 0 (
    echo.
    echo === Done! Installer in release\ folder ===
) else (
    echo.
    echo === Failed ===
    echo If the error mentions winCodeSign or 7z, run this script as Administrator.
    echo Otherwise, check the output above for details.
)
