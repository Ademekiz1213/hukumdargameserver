# 📋 Aktivasyon Sistemi - Makine ID Kaldırıldı

## ⚠️ ÖNEMLİ DEĞİŞİKLİK

**Makine ID kontrolü kaldırıldı!** Artık sadece aktivasyon kodu kontrol ediliyor.

### Neden?
- ✅ Render her deploy'da farklı container = farklı makine ID
- ✅ Multi-tenant sistem için uyumlu
- ✅ Daha esnek kullanım

---

## 🔧 Google Apps Script Güncelleme

Apps Script kodunuzu şu şekilde güncelleyin:

### ESKİ KOD (ÇALIŞMAZ):
```javascript
function doGet(e) {
  const action = e.parameter.action;
  const code = e.parameter.code;
  const machineId = e.parameter.machineId; // ❌ Artık gönderilmiyor!
  
  // ... machineId kontrolü ...
}
```

### YENİ KOD (KULLANIN):
```javascript
function doGet(e) {
  const action = e.parameter.action;
  const code = e.parameter.code;
  // machineId artık gerekli değil - sadece kod kontrolü
  
  if (action === 'validate') {
    return validateCode(code); // Makine ID olmadan
  }
  
  if (action === 'check') {
    return checkCodeStatus(code);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    valid: false,
    error: 'Geçersiz action'
  })).setMimeType(ContentService.MimeType.JSON);
}

function validateCode(code) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Aktivasyonlar');
  const data = sheet.getDataRange().getValues();
  
  // Başlık satırını atla (index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const activationCode = row[0]; // A sütunu: Kod
    const expiryDate = row[1];     // B sütunu: Bitiş Tarihi
    const status = row[2];         // C sütunu: Durum
    
    if (activationCode === code) {
      // Kod bulundu, kontrol et
      if (status !== 'Aktif') {
        return ContentService.createTextOutput(JSON.stringify({
          valid: false,
          error: 'Bu aktivasyon kodu aktif değil.'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Bitiş tarihi kontrolü (eğer varsa)
      if (expiryDate) {
        const now = new Date();
        const expiry = new Date(expiryDate);
        
        if (now > expiry) {
          return ContentService.createTextOutput(JSON.stringify({
            valid: false,
            error: 'Aktivasyon kodunun süresi dolmuş.'
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        return ContentService.createTextOutput(JSON.stringify({
          valid: true,
          expiryDate: expiry.toLocaleDateString('tr-TR')
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Süresiz aktivasyon
      return ContentService.createTextOutput(JSON.stringify({
        valid: true,
        expiryDate: null
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Kod bulunamadı
  return ContentService.createTextOutput(JSON.stringify({
    valid: false,
    error: 'Geçersiz aktivasyon kodu.'
  })).setMimeType(ContentService.MimeType.JSON);
}

function checkCodeStatus(code) {
  // Aynı mantık, validateCode ile benzer
  return validateCode(code);
}
```

---

## 📊 Google Sheets Yapısı

Sheets'inizde şu sütunlar olmalı:

| A: Kod | B: Bitiş Tarihi | C: Durum |
|--------|-----------------|----------|
| XXXX-XXXX-XXXX-XXXX | 31/12/2026 | Aktif |
| YYYY-YYYY-YYYY-YYYY | | Aktif |
| ZZZZ-ZZZZ-ZZZZ-ZZZZ | 01/01/2024 | Pasif |

**Notlar:**
- Boş bitiş tarihi = sınırsız kullanım
- Durum: "Aktif" veya "Pasif"

---

## 🧪 Test Etme

### 1. Local Test (Development Mode):
```bash
# .env dosyasına ekle:
NODE_ENV=development
```
Bu durumda aktivasyon bypass edilir (sadece test için!)

### 2. Production Test:
```bash
# .env dosyasında:
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Tarayıcıda test edin:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=validate&code=XXXX-XXXX-XXXX-XXXX
```

Beklenen yanıt:
```json
{
  "valid": true,
  "expiryDate": "31/12/2026"
}
```

---

## 🚀 Deployment Checklist

- [ ] Google Apps Script kodunu güncelledim
- [ ] Script'i yeniden deploy ettim (Manage Deployments → New deployment)
- [ ] Yeni URL'yi `.env` dosyasına ekledim
- [ ] Render'da environment variable'ı ekledim
- [ ] Test ettim (bir kod ile giriş yaptım)

---

## 💡 Ek Özellikler

### Kullanım Sayacı Eklemek İsterseniz:

Google Sheets'e **D sütunu: Kullanım Sayısı** ekleyin:

```javascript
function validateCode(code) {
  // ... kod bulundu ...
  
  // Kullanım sayısını artır
  sheet.getRange(i + 1, 4).setValue((row[3] || 0) + 1);
  
  // ... devam et ...
}
```

### IP Logging:

```javascript
function validateCode(code) {
  // ... 
  const userIp = Session.getActiveUser().getEmail(); // veya başka metot
  // Log ekle
}
```

---

**Güncellemeler tamamlandıktan sonra sisteminiz hazır!**
