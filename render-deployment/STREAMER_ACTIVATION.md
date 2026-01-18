# 🔐 Yayıncı Bazlı Aktivasyon Sistemi

## ✨ Yeni Özellik: Her Kod Bir Yayıncıya Özel

Artık her aktivasyon kodu **sadece belirli bir yayıncı** için geçerli!

---

## 📊 Google Sheets Yapısı (YENİ)

### Sütunlar:

| A: Kod | B: Yayıncı | C: Bitiş Tarihi | D: Durum |
|--------|-----------|-----------------|----------|
| AAAA-AAAA-AAAA-AAAA | yayinci1 | 31/12/2026 | Aktif |
| BBBB-BBBB-BBBB-BBBB | yayinci2 | | Aktif |
| CCCC-CCCC-CCCC-CCCC | yayinci3 | 01/01/2024 | Pasif |

**Açıklama:**
- **A Sütunu**: Aktivasyon Kodu
- **B Sütunu**: İzin Verilen Yayıncı Kullanıcı Adı (küçük harf)
- **C Sütunu**: Bitiş Tarihi (boş = sınırsız)
- **D Sütunu**: Durum (Aktif/Pasif)

---

## 🔧 Google Apps Script Kodu (GÜNCEL)

Apps Script'inizi şu şekilde güncelleyin:

```javascript
function doGet(e) {
  const action = e.parameter.action;
  const code = e.parameter.code;
  const streamer = e.parameter.streamer; // YENİ: Yayıncı adı
  
  if (action === 'validate') {
    return validateCode(code, streamer);
  }
  
  if (action === 'check') {
    return checkCodeStatus(code);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    valid: false,
    error: 'Geçersiz action'
  })).setMimeType(ContentService.MimeType.JSON);
}

function validateCode(code, streamerUsername) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Aktivasyonlar');
  const data = sheet.getDataRange().getValues();
  
  // Yayıncı adı zorunlu
  if (!streamerUsername) {
    return ContentService.createTextOutput(JSON.stringify({
      valid: false,
      error: 'Yayıncı kullanıcı adı belirtilmedi.'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Başlık satırını atla (index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const activationCode = row[0];  // A sütunu: Kod
    const allowedStreamer = row[1]; // B sütunu: Yayıncı
    const expiryDate = row[2];      // C sütunu: Bitiş Tarihi
    const status = row[3];          // D sütunu: Durum
    
    if (activationCode === code) {
      // Kod bulundu, yayıncı kontrolü yap
      
      // Yayıncı adı eşleşmeli (büyük/küçük harf duyarsız)
      if (allowedStreamer.toLowerCase() !== streamerUsername.toLowerCase()) {
        return ContentService.createTextOutput(JSON.stringify({
          valid: false,
          error: 'Bu aktivasyon kodu sizin yayıncı hesabınız için geçerli değil.'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Durum kontrolü
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
        
        // Başarılı - Süreli
        return ContentService.createTextOutput(JSON.stringify({
          valid: true,
          streamer: allowedStreamer,
          expiryDate: expiry.toLocaleDateString('tr-TR')
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Başarılı - Süresiz
      return ContentService.createTextOutput(JSON.stringify({
        valid: true,
        streamer: allowedStreamer,
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Aktivasyonlar');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === code) {
      return ContentService.createTextOutput(JSON.stringify({
        exists: true,
        streamer: row[1],
        expiryDate: row[2] ? new Date(row[2]).toLocaleDateString('tr-TR') : null,
        status: row[3]
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    exists: false
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 🧪 Test Etme

### Manuel Test (Google Apps Script):

URL formatı:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=validate&code=AAAA-AAAA-AAAA-AAAA&streamer=yayinci1
```

**Başarılı Yanıt:**
```json
{
  "valid": true,
  "streamer": "yayinci1",
  "expiryDate": "31/12/2026"
}
```

**Hatalı Yanıt (Yanlış Yayıncı):**
```json
{
  "valid": false,
  "error": "Bu aktivasyon kodu sizin yayıncı hesabınız için geçerli değil."
}
```

---

## 📋 Örnek Sheets Verileri

Örnek kayıtlar:

| A: Kod | B: Yayıncı | C: Bitiş Tarihi | D: Durum |
|--------|-----------|-----------------|----------|
| TEST-1111-1111-1111 | knewzystreamer | 31/12/2026 | Aktif |
| TEST-2222-2222-2222 | futbolgaming | | Aktif |
| TEST-3333-3333-3333 | esportstv | 01/01/2027 | Aktif |
| TEST-4444-4444-4444 | oldstreamer | 01/01/2024 | Pasif |

**Kullanım Senaryoları:**

1. **knewzystreamer** → Kod: `TEST-1111-1111-1111` → ✅ Çalışır
2. **knewzystreamer** → Kod: `TEST-2222-2222-2222` → ❌ "Bu kod sizin için geçerli değil"
3. **futbolgaming** → Kod: `TEST-2222-2222-2222` → ✅ Çalışır (süresiz)
4. **oldstreamer** → Kod: `TEST-4444-4444-4444` → ❌ "Kod aktif değil"

---

## 🚀 Deployment Checklist

- [ ] Google Sheets'e **B sütunu** ekledim (Yayıncı)
- [ ] Her kod için yayıncı adı yazdım
- [ ] Apps Script kodunu güncelledim
- [ ] **Manage Deployments → New deployment** yaptım
- [ ] Yeni URL'yi `.env` dosyasına ekledim
- [ ] Render'da environment variable güncelledim
- [ ] Test ettim (doğru kod + doğru yayıncı)
- [ ] Test ettim (doğru kod + yanlış yayıncı → hata vermeli)

---

## 💰 Avantajlar

### Güvenlik:
- ✅ Kod paylaşımı engellenir
- ✅ Her yayıncı kendi kodunu kullanır
- ✅ Yetkisiz erişim önlenir

### Yönetim:
- ✅ Hangi kod kime ait kolayca görülebilir
- ✅ Yayıncı bazlı raporlama yapılabilir
- ✅ Kod iptali kolay

### Esneklik:
- ✅ Bir yayıncıya birden fazla kod verilebilir
- ✅ Farklı sürelerde kodlar tanımlanabilir
- ✅ Toplu kod yönetimi

---

## 📞 Sorun Giderme

### "Bu kod sizin için geçerli değil" Hatası:
- Google Sheets'te yayıncı adı doğru yazılmış mı?
- Büyük/küçük harf sorun yaratmamalı (otomatik düzeltiliyor)
- @ işareti olmadan yazın (örn: "yayinci1" ✅, "@yayinci1" ❌)

### Kod Çalışmıyor:
- Apps Script güncellenmiş mi?
- Deployment yenilenmiş mi?
- Sheet'te "Aktif" durumunda mı?

---

**Güncellemeler tamamlandıktan sonra test edebilirsiniz!**
