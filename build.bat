@echo off
setlocal enabledelayedexpansion

echo === Try Monitor - Building Installer ===
echo.

set PATH=%PATH%;C:\Program Files\nodejs

echo [1/3] Building renderer...
call npx.cmd vite build
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo [2/3] Building main process...
call npx.cmd tsc -p tsconfig.node.json
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

copy /Y electron\preload.cjs dist-electron\preload.cjs

echo [3/3] Building NSIS installer...
call npx.cmd electron-builder --win nsis

if %ERRORLEVEL% EQU 0 (
    echo.
    echo === Done! Installer in release\ folder ===
) else (
    echo.
    echo === Failed - try running as Administrator ===
)
