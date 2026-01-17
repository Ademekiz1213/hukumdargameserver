@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════╗
echo ║     TikTok Hükümdar - Render Test Scripti         ║
echo ╚════════════════════════════════════════════════════╝
echo.

:: Node.js kontrolü
echo [1/5] Node.js kontrol ediliyor...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js yüklü değil! Lütfen Node.js yükleyin.
    echo https://nodejs.org
    pause
    exit /b 1
) else (
    echo ✅ Node.js yüklü
    node --version
)
echo.

:: Package.json kontrolü
echo [2/5] package.json kontrol ediliyor...
if exist "package.json" (
    echo ✅ package.json mevcut
) else (
    echo ❌ package.json bulunamadı!
    pause
    exit /b 1
)
echo.

:: Dependencies yükleme
echo [3/5] Node modules yükleniyor...
if not exist "node_modules" (
    echo 📦 npm install çalıştırılıyor...
    call npm install
    if errorlevel 1 (
        echo ❌ npm install başarısız!
        pause
        exit /b 1
    )
) else (
    echo ✅ node_modules zaten mevcut
)
echo.

:: .env kontrolü
echo [4/5] Environment variables kontrol ediliyor...
if exist ".env" (
    echo ✅ .env dosyası mevcut
    echo.
    echo 📄 .env içeriği:
    type .env
) else (
    echo ⚠️  .env dosyası yok!
    echo.
    echo .env.example'dan .env oluşturuluyor...
    copy .env.example .env >nul
    echo.
    echo ⚠️  UYARI: .env dosyasını düzenleyin!
    echo     GOOGLE_APPS_SCRIPT_URL değerini güncelleyin.
    echo.
    notepad .env
)
echo.

:: Server başlatma testi
echo [5/5] Server test ediliyor...
echo.
echo 🚀 Server başlatılıyor (10 saniye test)...
echo    Ctrl+C ile durdurun veya 10 saniye bekleyin.
echo.

timeout /t 3 /nobreak >nul

start /B node server.js
timeout /t 10 /nobreak

taskkill /F /IM node.exe >nul 2>&1

echo.
echo ✅ Test tamamlandı!
echo.
echo ═══════════════════════════════════════════════════
echo 📋 SONRAKİ ADIMLAR:
echo ═══════════════════════════════════════════════════
echo.
echo 1. .env dosyasını kontrol edin
echo 2. GitHub'a yükleyin
echo 3. Render.com'da deploy edin
echo 4. RENDER_KURULUM.md'yi okuyun
echo.
pause
