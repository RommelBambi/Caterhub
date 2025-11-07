@echo off
echo ========================================
echo Deploying PayMongo Redirect Edge Function
echo ========================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI is not installed!
    echo.
    echo Please install it first:
    echo   npm install -g supabase
    echo.
    echo Or using Scoop:
    echo   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    echo   scoop install supabase
    echo.
    pause
    exit /b 1
)

echo Supabase CLI found!
echo.

REM Deploy the function
echo Deploying paymongo-redirect function...
echo.
supabase functions deploy paymongo-redirect

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Function deployed!
    echo ========================================
    echo.
    echo Your function URL:
    echo https://YOUR_PROJECT_REF.supabase.co/functions/v1/paymongo-redirect
    echo.
    echo Next steps:
    echo 1. Test the function URL in your browser
    echo 2. Try a payment in your app
    echo 3. Verify the redirect works
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Deployment failed!
    echo ========================================
    echo.
    echo Make sure you:
    echo 1. Logged in: supabase login
    echo 2. Linked project: supabase link --project-ref YOUR_PROJECT_REF
    echo.
)

pause
