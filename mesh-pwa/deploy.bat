@echo off
title Yogheart Market Live Deployer
cd /d "C:\Users\liony\Yogheartmarket\mesh-pwa"
echo ========================================================
echo   YOGHEART MARKET LIVE DEPLOYMENT (Hosting + Firestore Rules)
echo ========================================================
echo.
echo Step 1: Logging into Firebase...
call firebase login
echo.
echo Step 2: Deploying to live app (https://yogheartmarket.web.app)...
call firebase deploy --only hosting,firestore:rules,storage
echo.
echo ========================================================
echo   DEPLOYMENT COMPLETE!
echo ========================================================
pause
