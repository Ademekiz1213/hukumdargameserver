# 🔐 Aktivasyon Sistemi Kurulum Kılavuzu

Bu oyun artık **aylık aktivasyon kodu** sistemi ile çalışmaktadır. Her bilgisayar için benzersiz bir aktivasyon kodu gereklidir.

## 📋 Google Sheets Kurulumu

### 1. Google Sheets Tablosu Oluşturun

Yeni bir Google Sheets dosyası oluşturun ve şu kolonları ekleyin:

| Kod | Makine ID | Son Tarih | Yayıncı | Durum | Aktivasyon Tarihi |
|-----|-----------|-----------|---------|-------|-------------------|
| DEMO-2024-ABCD-1234 | | 2024-12-31 | | | |
| DEMO-2024-EFGH-5678 | | 2024-12-31 | | | |

**Kolon açıklamaları:**
- **Kod**: Aktivasyon kodu (örnek: `DEMO-2024-ABCD-1234`)
- **Makine ID**: Boş bırakın (ilk aktivasyonda otomatik doldurulur)
- **Son Tarih**: Kodun geçerlilik tarihi (YYYY-MM-DD formatında)
- **Yayıncı**: İsteğe bağlı, hangi yayıncı için verildiği
- **Durum**: Boş bırakın (otomatik doldurulur: active/expired)
- **Aktivasyon Tarihi**: Boş bırakın (otomatik doldurulur)

### 2. Google Cloud Console Kurulumu

#### a) Proje Oluşturun
1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Yeni bir proje oluşturun (örn: "TikTok-Game-Activation")

#### b) Google Sheets API'yi Aktif Edin
1. Soldaki menüden **APIs & Services > Library** seçin
2. "Google Sheets API" aratın ve aktif edin

#### c) Service Account Oluşturun
1. **APIs & Services > Credentials** bölümüne gidin
2. **Create Credentials > Service Account** seçin
3. İsim verin (örn: "game-activation") ve Create
4. Role olarak **Editor** seçin
5. Done'a tıklayın

#### d) JSON Key Dosyası İndirin
1. Oluşturduğunuz Service Account'a tıklayın
2. **Keys** sekmesine gidin
3. **Add Key > Create new key** seçin
4. **JSON** formatını seçin ve Create
5. İndirilen JSON dosyasını açın

### 3. Environment Variables Ayarlayın

`server` klasöründe `.env` dosyası oluşturun:

```env
GOOGLE_SHEET_ID=1abc...xyz
GOOGLE_CLIENT_EMAIL=game-activation@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...ABCD\n-----END PRIVATE KEY-----\n"
```

**Bilgileri JSON dosyasından alın:**
- `GOOGLE_SHEET_ID`: Google Sheets URL'sindeki ID
  - Örnek URL: `https://docs.google.com/spreadsheets/d/1abc...xyz/edit`
  - ID: `1abc...xyz`
- `GOOGLE_CLIENT_EMAIL`: JSON'daki `client_email` değeri
- `GOOGLE_PRIVATE_KEY`: JSON'daki `private_key` değeri (tırnak içinde)

### 4. Sheets Dosyasını Paylaşın

1. Google Sheets dosyanızı açın
2. Sağ üstteki **Share** butonuna tıklayın
3. Service Account email adresini ekleyin (`xxxx@yyyy.iam.gserviceaccount.com`)
4. **Editor** yetkisi verin

## 📦 Kurulum

### 1. Gerekli Paketleri Yükleyin

```bash
cd server
npm install
```

### 2. `.env` Dosyasını Doğru Ayarlayın

`.env.example` dosyasını `.env` olarak kopyalayın ve bilgilerinizi girin:

```bash
copy .env.example .env
```

Ardından `.env` dosyasını düzenleyin.

## 🎮 Kullanım

### Oyunu Başlatın

1. `OYUNU_BASLAT.bat` dosyasını çalıştırın
2. Tarayıcıda açılan sayfada:
   - **Aktivasyon Kodu** girin (Google Sheets'teki kodlardan biri)
   - **Yayıncı Kullanıcı Adı** girin
   - **Bağlan** butonuna tıklayın

### Aktivasyon Nasıl Çalışır?

1. **İlk Kullanım**: Kod girildiğinde, bilgisayarın benzersiz ID'si Google Sheets'e kaydedilir
2. **Tekrar Kullanım**: Aynı bilgisayarda kod tekrar kullanılabilir
3. **Farklı Bilgisayar**: Aynı kod başka bir bilgisayarda KULLANILAMAZ
4. **Süre Kontrolü**: Her bağlantıda kodun geçerlilik tarihi kontrol edilir

### Makine ID Nasıl Oluşturulur?

Sistem, bilgisayarın benzersiz kimliğini şu şekilde oluşturur:
- MAC adresi (ağ kartı)
- Bilgisayar adı (hostname)
- Bu bilgilerden SHA256 hash

Bu sayede her bilgisayar için benzersiz ve değişmez bir ID üretilir.

## 🛠️ Sorun Giderme

### "Google Sheets bağlantısı kurulamadı"
- `.env` dosyasının doğru ayarlandığından emin olun
- Service Account'un Sheets dosyasına erişimi olduğunu kontrol edin
- Google Sheets API'nin aktif olduğunu doğrulayın

### "Bu kod başka bir bilgisayarda kullanılmış"
- Her kod sadece bir bilgisayarda kullanılabilir
- Yeni bir aktivasyon kodu almanız gerekir

### "Kodun geçerlilik süresi dolmuş"
- Google Sheets'teki "Son Tarih" kolonunu kontrol edin
- Tarihi güncelleyebilir veya yeni kod oluşturabilirsiniz

## 📊 Kod Yönetimi

### Yeni Kod Eklemek

Google Sheets'e yeni satır ekleyin:
```
Kod: YENI-2024-TEST-9999
Son Tarih: 2024-12-31
```

### Kodu İptal Etmek

"Durum" kolonuna `expired` yazın.

### Kod Süresini Uzatmak

"Son Tarih" kolonundaki tarihi değiştirin.

### Makine ID'yi Sıfırlamak

"Makine ID" kolonunu boşaltın (kod başka bir bilgisayarda kullanılabilir hale gelir).

## 🔒 Güvenlik

- `.env` dosyasını asla paylaşmayın
- Service Account JSON dosyasını güvenli tutun
- Aktivasyon kodlarını sadece güvenilir kişilerle paylaşın
- Google Sheets dosyasını sadece gerekli kişilerle paylaşın

## 📞 Destek

Sorun yaşarsanız:
1. Console loglarını kontrol edin (`F12` > Console)
2. Server loglarını inceleyin
3. `.env` dosyasının doğru olduğundan emin olun
4. Google Sheets'in Service Account ile paylaşıldığını doğrulayın
