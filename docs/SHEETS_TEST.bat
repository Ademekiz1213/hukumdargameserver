@echo off
echo ========================================
echo    GOOGLE SHEETS TEST ARACI
echo ========================================
echo.
echo Bu arac Google Sheets baglantisini test eder.
echo.

cd server

echo Makine ID'niz:
node -e "const {getMachineId} = require('./activation-sheets'); console.log(getMachineId());"
echo.

echo.
echo Test kodu (DEMO-2026-OCAK-0001) deneniyor...
echo.
node -e "const {validateActivationCode} = require('./activation-sheets'); validateActivationCode('DEMO-2026-OCAK-0001').then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error('Hata:', e.message));"
echo.

pause
