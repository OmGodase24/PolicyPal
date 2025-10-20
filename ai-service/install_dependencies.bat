@echo off
echo Installing PolicyPal AI Service Dependencies...
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo Python found. Installing dependencies...
echo.

REM Install Python packages
pip install -r requirements.txt

echo.
echo Dependencies installed successfully!
echo.
echo Next steps:
echo 1. Install Tesseract OCR: run install_tesseract_windows.bat as administrator
echo 2. Configure environment: copy env.example to .env and set your API keys
echo 3. Run the service: python main.py
echo.
pause
