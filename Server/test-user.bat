@echo off
echo 🧪 BorrowEase Test User Management
echo ================================

if "%1"=="" (
    echo Usage:
    echo   test-user.bat delete [email]     - Delete specific user
    echo   test-user.bat reset              - Reset bt21cse012@nituk.ac.in
    echo   test-user.bat list               - List all users
    echo   test-user.bat clean              - Delete all test users
    echo.
    echo Examples:
    echo   test-user.bat reset
    echo   test-user.bat delete test@example.com
    echo   test-user.bat list
    goto :eof
)

if "%1"=="reset" (
    echo 🔄 Resetting test user bt21cse012@nituk.ac.in...
    node delete-user-by-email.js bt21cse012@nituk.ac.in
    goto :eof
)

if "%1"=="delete" (
    if "%2"=="" (
        echo ❌ Please provide an email address
        echo Usage: test-user.bat delete [email]
        goto :eof
    )
    echo 🗑️ Deleting user: %2
    node delete-user-by-email.js %2
    goto :eof
)

if "%1"=="list" (
    echo 👥 Listing all users...
    node quick-test-reset.js 3
    goto :eof
)

if "%1"=="clean" (
    echo 🧹 Cleaning all test users...
    node quick-test-reset.js 2
    goto :eof
)

echo ❌ Unknown command: %1
echo Use 'test-user.bat' without arguments to see usage.
