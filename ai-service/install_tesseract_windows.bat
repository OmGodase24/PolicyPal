@echo off
echo Installing Tesseract OCR for Windows...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as administrator - proceeding with installation
) else (
    echo Please run this script as administrator
    pause
    exit /b 1
)

REM Download Tesseract installer
echo Downloading Tesseract OCR installer...
powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.0.20221214/tesseract-ocr-w64-setup-5.3.0.20221214.exe' -OutFile 'tesseract-installer.exe'}"

REM Run installer silently
echo Installing Tesseract OCR...
tesseract-installer.exe /S

REM Clean up
del tesseract-installer.exe

echo.
echo Tesseract OCR installation completed!
echo Please restart your application for changes to take effect.
pause
