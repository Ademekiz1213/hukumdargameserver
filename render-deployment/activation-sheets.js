// Google Sheets Aktivasyon Sistemi - Apps Script Kullanarak

// Load environment variables
require('dotenv').config();

const https = require('https');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

// Google Apps Script Web App URL'iniz buraya gelecek
// Sheets içinden Scripts > Deploy > Web App yapınca alacaksınız
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

// Makine ID'sini al
function getMachineId() {
    const networkInterfaces = os.networkInterfaces();
    let macAddress = '';

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
                macAddress = iface.mac;
                break;
            }
        }
        if (macAddress) break;
    }

    const hostname = os.hostname();
    const combined = `${macAddress}-${hostname}`;

    return crypto.createHash('sha256').update(combined).digest('hex');
}

// HTTP Request yap (REDIRECT DESTEĞİ İLE!)
function makeRequest(url, data, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            return reject(new Error('Çok fazla redirect'));
        }

        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const lib = isHttps ? https : http;

        const postData = new URLSearchParams(data).toString();

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search + (urlObj.search ? '&' : '?') + postData,
            method: 'GET',
            headers: {
                'User-Agent': 'TikTok-Game-Activation/1.0'
            }
        };

        const req = lib.request(options, (res) => {
            // REDIRECT KONTROLÜ - Google Apps Script 302 dönüyor!
            if (res.statusCode === 302 || res.statusCode === 301) {
                const location = res.headers.location;
                return makeRequest(location, {}, redirectCount + 1)
                    .then(resolve)
                    .catch(reject);
            }

            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Geçersiz yanıt formatı'));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('İstek zaman aşımına uğradı'));
        });

        req.end();
    });
}

// Aktivasyon kodunu doğrula (Makine ID gereksinimsiz - Multi-tenant uyumlu)
async function validateActivationCode(activationCode, machineId = null) {
    try {
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
            // DEVELOPMENT MODE: Aktivasyon kontrolü bypass (sadece development için!)
            if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ DEVELOPMENT MODE: Aktivasyon kontrolü bypass edildi');
                return {
                    valid: true,
                    message: 'Development mode - aktivasyon bypass',
                    expiryDate: null
                };
            }

            return {
                valid: false,
                error: 'Google Apps Script URL ayarlanmamış. Lütfen .env dosyasını kontrol edin.'
            };
        }

        // Apps Script'e istek gönder (Makine ID GÖNDERİLMİYOR - Cloud uyumlu)
        const response = await makeRequest(APPS_SCRIPT_URL, {
            action: 'validate',
            code: activationCode
            // machineId artık gönderilmiyor - Multi-tenant destek için
        });

        return response;

    } catch (error) {
        console.error('Aktivasyon doğrulama hatası:', error);
        return {
            valid: false,
            error: 'Google Sheets bağlantısı başarısız: ' + error.message
        };
    }
}

// Kod durumunu kontrol et
async function checkActivationStatus(activationCode) {
    try {
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
            return { valid: false };
        }

        const response = await makeRequest(APPS_SCRIPT_URL, {
            action: 'check',
            code: activationCode
        });

        return response;

    } catch (error) {
        console.error('Durum kontrolü hatası:', error);
        return { valid: false };
    }
}

module.exports = {
    getMachineId,
    validateActivationCode,
    checkActivationStatus
};
