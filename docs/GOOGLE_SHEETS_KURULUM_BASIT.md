# 🎯 GOOGLE SHEETS KURULUMU - Console Olmadan!

## ✅ 5 DAKİKADA HAZIR! Google Console Gerekmez!

Bu yöntemle **sadece Google Sheets** kullanacaksınız, hiç Google Console'a girmeyeceksiniz!

## 📋 ADIM 1: Google Sheets Oluşturun (1 dakika)

### 1. Yeni Sheets Oluşturun
[Google Sheets](https://sheets.google.com) → Yeni boş sayfa

### 2. Sayfayı İsimlendir
Sayfa adını "Kodlar" yapın (sol altta, Sheet1'e tıklayıp Rename)

### 3. Başlıkları Ekleyin (A1:F1)
İlk satıra şu sütunları ekleyin:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| kod | makine_id | son_tarih | yayinci | durum | aktivasyon_tarihi |

### 4. Örnek Kodlar Ekleyin

**Satır 2:**
- A2: `DEMO-2026-OCAK-0001`
- B2: *(boş)*
- C2: `2026-12-31`
- D2: *(boş veya yayıncı adı)*
- E2: *(boş)*
- F2: *(boş)*

**Satır 3:**
- A3: `DEMO-2026-OCAK-0002`
- B3: *(boş)*
- C3: `2026-12-31`
- D3: *(boş)*
- E3: *(boş)*
- F3: *(boş)*

### ✅ Sheets Hazır!

---

## 🔧 ADIM 2: Apps Script Ekleyin (2 dakika)

### 1. Script Editor'ı Açın
Sheets'te menüden: **Extensions → Apps Script**

### 2. Varsayılan Kodu Silin
`Code.gs` dosyasındaki tüm kodu silin

### 3. Yeni Kodu Yapıştırın
`GOOGLE_APPS_SCRIPT.js` dosyasını açın ve **TÜM KODU** kopyalayıp yapıştırın

### 4. Kaydedin
- Üstteki 💾 (Save) ikonuna tıklayın
- Proje adı sorarsa: "Aktivasyon Sistemi" yazın

### ✅ Script Hazır!

---

## 🚀 ADIM 3: Web App Olarak Yayınlayın (2 dakika)

### 1. Deploy Et
Apps Script editöründe:
- **Deploy → New deployment** tıklayın

### 2. Tip Seç
- ⚙️ (ayarlar) → **Web app** seçin

### 3. Ayarları Yapın
- **Description:** `Aktivasyon API`
- **Execute as:** `Me (sizin email)`
- **Who has access:** `Anyone` ← **ÖNEMLİ!**

### 4. Deploy'a Tıklayın
- **Deploy** butonuna tıklayın
- **Authorize access** derse İzin Verin:
  - Google hesabınızı seçin
  - "Advanced" → "Go to Aktivasyon Sistemi (unsafe)" tıklayın
  - "Allow" tıklayın

### 5. URL'yi Kopyalayın
Deployment başarılı oldu mesajından **Web app URL**'yi kopyalayın.

Örnek URL:
```
https://script.google.com/macros/s/AKfycbxxx...xxx/exec
```

### ✅ Web App Hazır!

---

## ⚙️ ADIM 4: Oyunda URL'yi Ayarlayın (30 saniye)

### Yöntem 1: .env Dosyası (Önerilen)
`server` klasöründe `.env` dosyası oluşturun:

```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxxx...xxx/exec
```

### Yöntem 2: Doğrudan Kod
`server/activation-sheets.js` dosyasını açın:

Satır 9'u bulun:
```javascript
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || 'YOUR_WEB_APP_URL_HERE';
```

Değiştirin:
```javascript
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxxx...xxx/exec';
```

### ✅ URL Ayarlandı!

---

## 🔗 ADIM 5: Server'da Aktif Edin (10 saniye)

`server/server.js` dosyasını açın.

**Satır 11-13'ü bulun:**
```javascript
// BASIT AKTİVASYON SİSTEMİ (Google Cloud Olmadan)
const { getMachineId, validateActivationCode } = require('./activation-simple');
```

**Şu şekilde değiştirin:**
```javascript
// GOOGLE SHEETS AKTİVASYON SİSTEMİ (Apps Script ile)
const { getMachineId, validateActivationCode } = require('./activation-sheets');
```

### ✅ Sistem Aktif!

---

## 🧪 ADIM 6: Test Edin (1 dakika)

### 1. Test Komutu
```bash
cd server
node -e "const {getMachineId, validateActivationCode} = require('./activation-sheets'); getMachineId(); validateActivationCode('DEMO-2026-OCAK-0001').then(r => console.log(r));"
```

### 2. Beklenen Sonuç
```json
{
  "valid": true,
  "expiryDate": "2026-12-31",
  "isNewActivation": true
}
```

### 3. Google Sheets'i Kontrol Edin
- B2 hücresinde makine ID görünecek
- E2'de "active" yazacak
- F2'de bugünün tarihi olacak

### ✅ Test Başarılı!

---

## 🎮 ADIM 7: Oyunu Başlatın

```bash
OYUNU_BASLAT.bat
```

Tarayıcıda:
- **Aktivasyon Kodu:** `DEMO-2026-OCAK-0001`
- **Yayıncı:** `knewzystreamer`
- **[🔗 Bağlan]**

### Başarılı Mesaj:
```
✅ Aktivasyon başarılı!
✅ knewzystreamer yayınına bağlandı! (Geçerlilik: 2026-12-31)
```

---

## 📊 Google Sheets'te Ne Olacak?

### İlk Kullanımda (Otomatik):
| kod | makine_id | son_tarih | yayinci | durum | aktivasyon_tarihi |
|-----|-----------|-----------|---------|-------|-------------------|
| DEMO-2026-OCAK-0001 | a1b2c3...xyz | 2026-12-31 | | active | 2026-01-16 |

### Tekrar Kullanımda:
Aynı bilgisayarda tekrar çalışır, başka bilgisayarda ÇALIŞMAZ.

---

## 🔧 Sorun Giderme

### "Google Sheets bağlantısı başarısız"

**Kontrol Edin:**
1. Apps Script URL doğru mu?
2. Web App deployment'ında "Anyone" seçtiniz mi?
3. İzinleri verdiniz mi?

**Test URL:**
Tarayıcıda şu URL'yi açın:
```
https://script.google.com/macros/s/YOUR_ID/exec?action=test
```

Yanıt:
```json
{
  "success": true,
  "message": "Google Sheets bağlantısı çalışıyor!"
}
```

### "Geçersiz aktivasyon kodu"

**Kontrol Edin:**
1. Google Sheets'te kod var mı?
2. Kod doğru yazıldı mı?
3. Sütun başlıkları doğru mu? (`kod`, `makine_id`, vb.)

### Apps Script Hatası

**Çözüm:**
1. Apps Script editöründe **Run** → `doGet` seçin
2. Hataları göreceksiniz
3. Kodun doğru kopyalandığından emin olun

---

## 💡 Kod Yönetimi

### Yeni Kod Eklemek
Google Sheets'e git → Yeni satır ekle:
```
AYLIK-2026-SUBAT-0001 | | 2026-02-28 | | |
```

### Kod İptal Etmek
`durum` sütununa `expired` yaz

### Makine ID Sıfırla
`makine_id` sütununu boşalt (kod başka bilgisayarda kullanılabilir)

---

## 🔒 Güvenlik

### ✅ Güvenli:
- Web App URL kimseye vermeyin
- Her kod sadece 1 bilgisayarda çalışır
- Tarih kontrolü otomatik

### ⚠️ Dikkat:
- Apps Script URL'si herkese açık, ama kodları bilmeden kullanılamaz
- Sheets dosyasını gizli tutun

---

## 🎯 Özet

| Adım | Yapılacak | Süre |
|------|-----------|------|
| 1 | Google Sheets oluştur | 1 dk |
| 2 | Apps Script ekle | 2 dk |
| 3 | Web App yayınla | 2 dk |
| 4 | URL'yi ayarla | 30 sn |
| 5 | Server'da aktif et | 10 sn |
| 6 | Test et | 1 dk |

**Toplam: ~7 dakika!**

---

## 🎉 Tamamlandı!

**Artık Google Console olmadan, sadece Google Sheets kullanarak aktivasyon sisteminiz çalışıyor!**

### Avantajlar:
- ✅ Google Console'a girmiyorsunuz
- ✅ Service Account yok
- ✅ API Key yok
- ✅ Ücretsiz
- ✅ Kodlar Google Sheets'te
- ✅ Kolay yönetim

**Başarılar! 🚀**
