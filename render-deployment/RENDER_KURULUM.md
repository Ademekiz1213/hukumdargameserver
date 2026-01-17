# 🚀 Render.com Deployment Rehberi

Bu klasör, TikTok Hükümdar oyununun Render.com'a deploy edilmesi için hazırlanmıştır.

## 📋 İçindekiler

- `server.js` - Ana sunucu dosyası (PORT environment variable desteği ile)
- `activation-sheets.js` - Google Sheets aktivasyon sistemi
- `package.json` - Node.js bağımlılıkları
- `.env.example` - Environment variables şablonu
- `.gitignore` - Git ignore dosyası

## 🔧 Kurulum Adımları

### 1. GitHub Repository Oluşturma

1. GitHub'da yeni bir **private** repository oluşturun
2. Bu klasördeki dosyaları repository'ye yükleyin:

```bash
cd render-deployment
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
git push -u origin main
```

### 2. Render.com'da Web Service Oluşturma

1. [Render.com](https://render.com) hesabınıza giriş yapın
2. **Dashboard** > **New** > **Web Service** tıklayın
3. GitHub repository'nizi bağlayın ve seçin
4. Aşağıdaki ayarları yapın:

**Temel Ayarlar:**
- **Name**: `tiktok-ruler-server` (veya istediğiniz isim)
- **Region**: `Frankfurt (EU Central)` (Türkiye'ye yakın)
- **Branch**: `main`
- **Root Directory**: Boş bırakın (veya klasör adını yazın)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- **Free** (test için) veya **Starter** ($7/ay - daha kararlı)

### 3. Environment Variables Ayarlama

Render Dashboard'da **Environment** sekmesine gidin ve şu değişkenleri ekleyin:

```
GOOGLE_APPS_SCRIPT_URL=YOUR_ACTUAL_WEB_APP_URL_HERE
```

> ⚠️ **ÖNEMLİ**: `GOOGLE_APPS_SCRIPT_URL` değerini Google Apps Script'ten aldığınız gerçek URL ile değiştirin!

`PORT` değişkenini eklemenize **gerek yok** - Render otomatik ayarlar.

### 4. Deploy Başlatma

1. **Create Web Service** butonuna tıklayın
2. Render otomatik olarak deploy başlatır
3. Deploy loglarını takip edin
4. Deploy başarılı olunca **URL**'yi alın (örn: `https://tiktok-ruler-server.onrender.com`)

### 5. Client Tarafını Güncelleme

Web client dosyanızda (`web-client/game.js` veya benzeri) sunucu URL'sini güncelleyin:

```javascript
// Eski (lokal):
// const SERVER_URL = 'http://localhost:3000';

// Yeni (Render):
const SERVER_URL = 'https://tiktok-ruler-server.onrender.com';
```

## 🔄 Güncelleme Yapma

Kod değişikliği yaptığınızda:

```bash
git add .
git commit -m "Değişiklik açıklaması"
git push
```

Render otomatik olarak yeni versiyonu deploy eder.

## ⚙️ Render Ayarları

### Auto-Deploy

Render varsayılan olarak her GitHub push'ta otomatik deploy yapar. Bunu kapatmak için:
- **Settings** > **Auto-Deploy** > **Disable**

### Health Check

Render'ın sunucunun çalışıp çalışmadığını kontrol etmesi için:
- **Settings** > **Health Check Path**: `/`

Veya server.js'e health check endpoint ekleyin:

```javascript
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
```

### Sleep Mode (Free Plan)

Free planada sunucu 15 dakika inaktif kalırsa uyku moduna girer. İlk istekte 50 saniye kadar uyanması gerekir.

**Çözüm için:**
- Starter plan kullanın ($7/ay)
- Veya [UptimeRobot](https://uptimerobot.com) gibi servisle her 5 dakikada ping atın

## 🧪 Test Etme

Deploy tamamlandıktan sonra:

```bash
# Sunucu çalışıyor mu kontrol et
curl https://YOUR_RENDER_URL.onrender.com/health

# Veya tarayıcıda aç
https://YOUR_RENDER_URL.onrender.com
```

## 📊 Logları Görüntüleme

Render Dashboard > **Logs** sekmesinden real-time logları görebilirsiniz.

## 🔐 Güvenlik Notları

1. **Private Repository kullanın** - Kod gizli kalmalı
2. **Environment Variables'ı asla commit etmeyin** - `.gitignore`'da `.env` var
3. **CORS ayarlarını güncelleyin** - Production'da sadece domain'inizi izin verin:

```javascript
const io = new Server(server, {
    cors: {
        origin: "https://your-game-domain.com",  // * yerine
        methods: ["GET", "POST"]
    }
});
```

## ❓ Sorun Giderme

### Deploy Hatası

- **Logs** sekmesinde hatayı kontrol edin
- `package.json` dependencies'in doğru olduğundan emin olun
- Build komutunun başarılı olduğunu kontrol edin

### Bağlantı Hatası

- CORS ayarlarını kontrol edin
- Client-side URL'nin doğru olduğunu kontrol edin
- Render URL'inin `https://` ile başladığından emin olun

### Sleep Mode

- Free plandan Starter plana geçin
- Veya UptimeRobot ile ping atın

## 📞 Destek

Sorun yaşıyorsanız:
- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com

---

**Başarılar! 🎮**
