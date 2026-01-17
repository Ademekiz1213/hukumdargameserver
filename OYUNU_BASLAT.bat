@echo off
title Hükümdar Game Server
color 0A
echo.
echo ========================================
echo    HUKUMDAR - TikTok Turkiye Oyunu
echo ========================================
echo.

cd /d "%~dp0server"

echo Tarayici aciliyor...
start "" "%~dp0web-client\index.html"

echo.
echo Server baslatiliyor...
echo Bu pencereyi kapattiginizda sunucu da kapanacak!
echo.
echo ----------------------------------------

node server.js
