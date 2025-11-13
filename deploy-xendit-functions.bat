@echo off
echo ========================================
echo Deploying Xendit Edge Functions
echo ========================================

echo.
echo 1. Deploying create-xendit-payment function...
supabase functions deploy create-xendit-payment
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy create-xendit-payment
    pause
    exit /b 1
)

echo.
echo 2. Deploying xendit-webhook function...
supabase functions deploy xendit-webhook
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy xendit-webhook
    pause
    exit /b 1
)

echo.
echo 3. Deploying xendit-redirect function...
supabase functions deploy xendit-redirect
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy xendit-redirect
    pause
    exit /b 1
)

echo.
echo ========================================
echo All Xendit functions deployed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Set XENDIT_SECRET_KEY in Supabase secrets
echo 2. Set XENDIT_WEBHOOK_TOKEN in Supabase secrets
echo 3. Configure webhooks in Xendit dashboard
echo 4. Update your .env file with EXPO_PUBLIC_XENDIT_PUBLIC_KEY
echo.
echo Webhook URL: https://your-project.supabase.co/functions/v1/xendit-webhook
echo.
pause
