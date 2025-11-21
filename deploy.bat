@echo off
echo ========================================
echo   BPH Billing - Deployment Script
echo ========================================
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Firebase CLI not found!
    echo Please install: npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check if logged in
echo [1/4] Checking Firebase login...
firebase projects:list >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Not logged in to Firebase!
    echo Please run: firebase login
    pause
    exit /b 1
)
echo [OK] Logged in to Firebase
echo.

REM Check if environment variables are set
echo [2/4] Checking environment variables...
if not exist .env.local (
    if not exist "src\config\firebaseConfig.js" (
        echo [WARNING] No environment variables found!
        echo Please create .env.local or src/config/firebaseConfig.js
        echo See PREPARE_DEPLOYMENT.md for instructions
        echo.
        set /p continue="Continue anyway? (y/n): "
        if /i not "%continue%"=="y" (
            echo Deployment cancelled.
            pause
            exit /b 1
        )
    )
)
echo [OK] Environment check passed
echo.

REM Build the app
echo [3/4] Building application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo [OK] Build successful
echo.

REM Deploy to Firebase
echo [4/4] Deploying to Firebase Hosting...
firebase deploy --only hosting
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Deployment failed!
    pause
    exit /b 1
)
echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Your app is live at:
echo   https://bhp-billing.web.app
echo   https://bhp-billing.firebaseapp.com
echo.
pause

