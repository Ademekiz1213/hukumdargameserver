// Google Sheets Bağlantı Testi - Redirect Desteği İle
require('dotenv').config();
const https = require('https');

const url = process.env.GOOGLE_APPS_SCRIPT_URL;

console.log('Google Sheets Apps Script test ediliyor...');
console.log('URL:', url, '\n');

function makeRequest(targetUrl, redirectCount = 0) {
    if (redirectCount > 5) {
        console.log('❌ Çok fazla redirect!');
        return;
    }

    const finalUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=test';

    https.get(finalUrl, (res) => {
        console.log(`[${redirectCount}] HTTP Status: ${res.statusCode}`);

        // Redirect kontrolü
        if (res.statusCode === 302 || res.statusCode === 301) {
            const location = res.headers.location;
            console.log(`    Redirect -> ${location.substring(0, 60)}...`);
            makeRequest(location, redirectCount + 1);
            return;
        }

        let body = '';

        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            console.log('\n✅ Yanıt alındı!\n');

            try {
                const json = JSON.parse(body);
                console.log('🎉 BAŞARILI! Google Sheets çalışıyor!');
                console.log(JSON.stringify(json, null, 2));
            } catch (e) {
                console.log('❌ Yanıt JSON değil:');
                console.log(body.substring(0, 200));
            }
        });

    }).on('error', (e) => {
        console.error('❌ Bağlantı hatası:', e.message);
    });
}

makeRequest(url);
