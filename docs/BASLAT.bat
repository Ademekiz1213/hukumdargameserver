@echo off
chcp 65001 >nul
color 0A
cls
echo ========================================================
echo    HUKUMDAR: TIKTOK HARITA OYUNU BASLATICI(THENDA GAME)
echo ========================================================
echo.
echo Lutfen baglanmak istediginiz TikTok kullanici adini girin.
echo (Bos birakip ENTER'a basarsaniz hata verir)
echo.
set /p username="Kullanici Adi: "

if "%username%"=="" set username=AdemEkiz

echo.
echo [%username%] kullanicisina baglaniliyor...
echo Server baslatiliyor...
echo.

start "" "web-client/index.html"
cd server
npm start -- %username%
pause
