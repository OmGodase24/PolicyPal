@echo off
echo 🚀 Setting up Policy Project...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js (v18 or higher) first.
    pause
    exit /b 1
)

echo ✅ Node.js detected: 
node --version

REM Setup Backend
echo.
echo 📦 Setting up Backend...
cd backend

REM Install backend dependencies
if exist package.json (
    echo Installing backend dependencies...
    npm install
    if %errorlevel% equ 0 (
        echo ✅ Backend dependencies installed
    ) else (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
) else (
    echo ❌ Backend package.json not found
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy env.example .env
    echo ✅ .env file created. Please update it with your configuration.
    echo ⚠️  Don't forget to update MONGODB_URI and JWT_SECRET in .env
) else (
    echo ✅ .env file already exists
)

cd ..

REM Setup Frontend
echo.
echo 📦 Setting up Frontend...
cd frontend

REM Install frontend dependencies
if exist package.json (
    echo Installing frontend dependencies...
    npm install
    if %errorlevel% equ 0 (
        echo ✅ Frontend dependencies installed
    ) else (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo ❌ Frontend package.json not found
    pause
    exit /b 1
)

cd ..

REM Success message
echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next Steps:
echo 1. Update backend\.env with your MongoDB URI and JWT secret
echo 2. Start MongoDB (if using local instance)
echo 3. Run the applications:
echo.
echo    Backend:
echo    cd backend
echo    npm run start:dev
echo.
echo    Frontend:
echo    cd frontend
echo    npm start
echo.
echo    Or use Docker Compose:
echo    cd backend
echo    docker-compose up -d
echo.
echo 📚 Documentation:
echo    - API Docs: http://localhost:3000/api/docs
echo    - Frontend: http://localhost:4200
echo.
echo Happy coding! 🚀
pause
