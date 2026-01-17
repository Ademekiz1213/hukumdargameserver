# 🎮 TikTok Türkiye Hükümdar Oyunu

## ✅ Google Sheets Aktivasyon Sistemi

Bu oyun **Google Sheets** ile aktivasyon kodlarını yönetir.

---

## 🚀 Hızlı Başlangıç

### 1️⃣ Google Sheets Kurulumu
📖 **GOOGLE_SHEETS_KURULUM_BASIT.md** dosyasını okuyun

Özet:
1. Google Sheets oluştur
2. Apps Script ekle (`GOOGLE_APPS_SCRIPT.js` kopyala)
3. Deploy → "Herkes" erişimi
4. URL'yi `.env` dosyasına ekle

### 2️⃣ Test Et
```bash
SHEETS_TEST.bat
```

### 3️⃣ Oyunu Başlat
```bash
OYUNU_BASLAT.bat
```

---

## 📁 Dosya Yapısı

```
📂 TiktokTurkiyeHukumdarGame/
│
├── 🎮 OYUNU_BASLAT.bat ⭐ Oyunu başlat
├── 🛑 SERVER_DURDUR.bat
├── 📄 BENI_OKU.md ← Bu dosya
│
├── 📊 GOOGLE SHEETS SİSTEMİ
│   ├── GOOGLE_APPS_SCRIPT.js ← Sheets'e yapıştır
│   ├── GOOGLE_SHEETS_KURULUM_BASIT.md ← Kurulum kılavuzu
│   └── SHEETS_TEST.bat ← Test aracı
│
├── 📂 server/
│   ├── activation-sheets.js ← Aktivasyon sistemi
│   ├── test-sheets-redirect.js ← Test aracı
│   ├── .env ← Google Apps Script URL (kendiniz oluşturun)
│   └── server.js ← Ana sunucu
│
├── 📂 web-client/ ← Oyun dosyaları
└── 📂 docs/ ← Eski dokümantasyon
```

---

## 🔐 Aktivasyon Nasıl Çalışır?

1. **Google Sheets**'te aktivasyon kodları saklanır
2. Oyun başlatılınca **kod sorulur**
3. Kod **Google Sheets**'te doğrulanır
4. **Makine ID** kaydedilir
5. Her kod **sadece bir bilgisayarda** çalışır

---

## 📊 Google Sheets Yapısı

| kod | makine_id | son_tarih | yayinci | durum | aktivasyon_tarihi |
|-----|-----------|-----------|---------|-------|-------------------|
| DEMO-2026-OCAK-001 | | 2026-12-31 | | | |

- **kod**: Aktivasyon kodu
- **makine_id**: Otomatik doldurulur (ilk kullanımda)
- **son_tarih**: Geçerlilik tarihi (YYYY-MM-DD)
- **yayinci**: Opsiyonel
- **durum**: Otomatik (active/expired)
- **aktivasyon_tarihi**: Otomatik

---

## 🛠️ Yönetim

### Yeni Kod Ekle
Google Sheets'i aç → Yeni satır → Kod bilgilerini gir

### Kodu İptal Et
`durum` sütununa `expired` yaz

### Makine ID Sıfırla
`makine_id` sütununu boşalt (başka bilgisayarda kullanılabilir)

---

## 🧪 Test

```bash
SHEETS_TEST.bat
```

Beklenen çıktı:
```json
{
  "success": true,
  "message": "Google Sheets bağlantısı çalışıyor!",
  "timestamp": "2026-01-16T..."
}
```

---

## ⚙️ Ayarlar

### .env Dosyası
`server/.env`:
```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

**Not:** `.env.example` dosyası şablon olarak kullanılabilir.

---

## 📖 Kılavuzlar

- **GOOGLE_SHEETS_KURULUM_BASIT.md** - Adım adım kurulum
- **docs/** klasörü - Detaylı dokümantasyon

---

## 🎯 Kullanım Akışı

1. **Kurulum (İlk Kez)**
   - Google Sheets oluştur
   - Apps Script deploy et
   - `.env` dosyası oluştur

2. **Her Oyunda**
   - `OYUNU_BASLAT.bat`
   - Aktivasyon kodu gir (Sheets'ten)
   - Yayıncı adı gir
   - Bağlan

3. **Kod Yönetimi**
   - Google Sheets'i aç
   - Kod ekle/düzenle
   - Kaydet

---

## ❓ Sık Sorulan

**Q: Kod nerede saklanıyor?**
A: Google Sheets'te

**Q: Her kod kaç bilgisayarda çalışır?**
A: Sadece 1 bilgisayarda

**Q: Kodu nasıl iptal ederim?**
A: Sheets'te `durum` → `expired`

**Q: Başka sistem var mı?**
A: Hayır, sadece Google Sheets kullanıyoruz

---

## 🎉 Sistem Hazır!

- ✅ Sadeleştirilmiş yapı
- ✅ Sadece Google Sheets
- ✅ Kolay yönetim
- ✅ Çalışıyor!

**Başarılar! 🚀**
