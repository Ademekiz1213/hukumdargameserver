@echo off
chcp 65001 >nul
color 0C
cls
echo.
echo ========================================================
echo        HUKUMDAR: SERVER KAPATMA ARACI
echo ========================================================
echo.
echo ⚠️  UYARI: Bu islem bilgisayardaki calisan TUM Node.js
echo sureclerini (oyun sunucusu dahil) kapatacaktir.
echo.
echo Devam etmek icin bir tusa basin...
pause >nul
echo.
echo Server kapatiliyor...
taskkill /F /IM node.exe /T
echo.
echo Islem tamamlandi. Pencereyi kapatabilirsiniz.
pause
