// Google Apps Script Kodu
// Bu kodu Google Sheets > Extensions > Apps Script içine yapıştırın

// Sheets sayfasını al
function getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss.getSheetByName('Kodlar') || ss.getSheets()[0];
}

// GET isteği geldiğinde çalışır
function doGet(e) {
    const action = e.parameter.action;

    if (action === 'validate') {
        return validateCode(e.parameter.code, e.parameter.machineId);
    } else if (action === 'check') {
        return checkCode(e.parameter.code);
    } else if (action === 'test') {
        return testConnection();
    }

    return ContentService.createTextOutput(
        JSON.stringify({ error: 'Geçersiz işlem' })
    ).setMimeType(ContentService.MimeType.JSON);
}

// Test bağlantısı
function testConnection() {
    return ContentService.createTextOutput(
        JSON.stringify({
            success: true,
            message: 'Google Sheets bağlantısı çalışıyor!',
            timestamp: new Date().toISOString()
        })
    ).setMimeType(ContentService.MimeType.JSON);
}

// Kodu doğrula
function validateCode(code, machineId) {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();

    // Başlıkları bul
    const headers = data[0];
    const kodCol = headers.indexOf('kod') !== -1 ? headers.indexOf('kod') : headers.indexOf('Kod');
    const machineCol = headers.indexOf('makine_id') !== -1 ? headers.indexOf('makine_id') : headers.indexOf('Makine ID');
    const dateCol = headers.indexOf('son_tarih') !== -1 ? headers.indexOf('son_tarih') : headers.indexOf('Son Tarih');
    const statusCol = headers.indexOf('durum') !== -1 ? headers.indexOf('durum') : headers.indexOf('Durum');
    const activationCol = headers.indexOf('aktivasyon_tarihi') !== -1 ? headers.indexOf('aktivasyon_tarihi') : headers.indexOf('Aktivasyon Tarihi');
    const streamerCol = headers.indexOf('yayinci') !== -1 ? headers.indexOf('yayinci') : headers.indexOf('Yayıncı');

    // Kodu bul
    for (let i = 1; i < data.length; i++) {
        if (data[i][kodCol] === code) {
            const row = data[i];
            const rowNum = i + 1;

            // Durum kontrolü
            if (row[statusCol] && row[statusCol].toLowerCase() === 'expired') {
                return ContentService.createTextOutput(
                    JSON.stringify({
                        valid: false,
                        error: 'Bu kod kullanım dışı bırakılmış'
                    })
                ).setMimeType(ContentService.MimeType.JSON);
            }

            // Tarih kontrolü
            if (row[dateCol]) {
                const expiryDate = new Date(row[dateCol]);
                const now = new Date();

                if (expiryDate < now) {
                    // Durumu güncelle
                    sheet.getRange(rowNum, statusCol + 1).setValue('expired');

                    return ContentService.createTextOutput(
                        JSON.stringify({
                            valid: false,
                            error: 'Bu kodun geçerlilik süresi dolmuş'
                        })
                    ).setMimeType(ContentService.MimeType.JSON);
                }
            }

            // Makine ID kontrolü
            const assignedMachineId = row[machineCol];

            if (assignedMachineId && assignedMachineId.toString().trim() !== '') {
                // Kod daha önce kullanılmış
                if (assignedMachineId !== machineId) {
                    return ContentService.createTextOutput(
                        JSON.stringify({
                            valid: false,
                            error: 'Bu kod başka bir bilgisayarda kullanılmış'
                        })
                    ).setMimeType(ContentService.MimeType.JSON);
                }

                // Aynı makine
                return ContentService.createTextOutput(
                    JSON.stringify({
                        valid: true,
                        expiryDate: row[dateCol] ? row[dateCol].toString() : null,
                        streamerName: row[streamerCol] || null,
                        isNewActivation: false
                    })
                ).setMimeType(ContentService.MimeType.JSON);

            } else {
                // İlk kez kullanılıyor
                const today = new Date().toISOString().split('T')[0];

                sheet.getRange(rowNum, machineCol + 1).setValue(machineId);
                sheet.getRange(rowNum, statusCol + 1).setValue('active');
                sheet.getRange(rowNum, activationCol + 1).setValue(today);

                return ContentService.createTextOutput(
                    JSON.stringify({
                        valid: true,
                        expiryDate: row[dateCol] ? row[dateCol].toString() : null,
                        streamerName: row[streamerCol] || null,
                        isNewActivation: true
                    })
                ).setMimeType(ContentService.MimeType.JSON);
            }
        }
    }

    // Kod bulunamadı
    return ContentService.createTextOutput(
        JSON.stringify({
            valid: false,
            error: 'Geçersiz aktivasyon kodu'
        })
    ).setMimeType(ContentService.MimeType.JSON);
}

// Kod durumunu kontrol et
function checkCode(code) {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();

    const headers = data[0];
    const kodCol = headers.indexOf('kod') !== -1 ? headers.indexOf('kod') : headers.indexOf('Kod');
    const dateCol = headers.indexOf('son_tarih') !== -1 ? headers.indexOf('son_tarih') : headers.indexOf('Son Tarih');
    const statusCol = headers.indexOf('durum') !== -1 ? headers.indexOf('durum') : headers.indexOf('Durum');

    for (let i = 1; i < data.length; i++) {
        if (data[i][kodCol] === code) {
            const row = data[i];

            if (row[statusCol] && row[statusCol].toLowerCase() === 'expired') {
                return ContentService.createTextOutput(
                    JSON.stringify({ valid: false, daysLeft: 0 })
                ).setMimeType(ContentService.MimeType.JSON);
            }

            if (row[dateCol]) {
                const expiryDate = new Date(row[dateCol]);
                const now = new Date();
                const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                return ContentService.createTextOutput(
                    JSON.stringify({
                        valid: daysLeft > 0,
                        daysLeft: Math.max(0, daysLeft),
                        expiryDate: row[dateCol].toString()
                    })
                ).setMimeType(ContentService.MimeType.JSON);
            }

            return ContentService.createTextOutput(
                JSON.stringify({ valid: true, daysLeft: null })
            ).setMimeType(ContentService.MimeType.JSON);
        }
    }

    return ContentService.createTextOutput(
        JSON.stringify({ valid: false })
    ).setMimeType(ContentService.MimeType.JSON);
}
