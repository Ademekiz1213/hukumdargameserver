# 🚀 RENDER.COM DEPLOYMENT KILAVUZU

## ✅ Render'da Hızlı Kurulum

### 1️⃣ GitHub'a Yükleyin

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/tiktok-hukumdar-game.git
git push -u origin main
```

---

### 2️⃣ Render'da Web Service Oluşturun

1. [Render.com](https://render.com) → Dashboard
2. **New +** → **Web Service**
3. **Connect repository** → GitHub hesabınızı bağlayın
4. Repository'nizi seçin

---

### 3️⃣ Build Settings

| Ayar | Değer |
|------|-------|
| **Name** | `tiktok-hukumdar-game` |
| **Region** | `Frankfurt` (veya yakın) |
| **Branch** | `main` |
| **Root Directory** | *(boş bırakın)* |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server/server.js` |

---

### 4️⃣ Environment Variables

**Environment** sekmesine gidin ve ekleyin:

| Key | Value |
|-----|-------|
| `GOOGLE_APPS_SCRIPT_URL` | `https://script.google.com/macros/s/YOUR_ID/exec` |
| `PORT` | `10000` |
| `NODE_ENV` | `production` |

**Önemli:** `GOOGLE_APPS_SCRIPT_URL` değerini Google Apps Script deployment URL'iniz ile değiştirin!

---

### 5️⃣ Deploy Edin

1. **Create Web Service** butonuna tıklayın
2. Deployment başlayacak (3-5 dakika sürer)
3. "Live" yazısı görününce hazır!

---

## 🌐 Oyunu Açın

Render size bir URL verecek:
```
https://tiktok-hukumdar-game.onrender.com
```

Bu URL'yi tarayıcıda açın!

---

## ⚙️ Önemli Notlar

### Port Ayarı
Render otomatik olarak PORT environment variable atar. Kod bunu kullanıyor:
```javascript
const PORT = process.env.PORT || 3000;
```

### Auto-Deploy
GitHub'a her push yaptığınızda Render otomatik deploy eder.

### Free Plan Limitleri
- ✅ 750 saat/ay
- ✅ 512 MB RAM
- ⚠️ 15 dakika aktivite yoksa sleep mode
- ⚠️ İlk istek 30-60 saniye sürebilir (soğuk başlatma)

---

## 🔧 Server.js Ayarları

`server/server.js` dosyasında PORT ayarı:

```javascript
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

**Render için zaten hazır!** ✅

---

## 📁 Dosya Yapısı (Render İçin)

```
📂 TiktokTurkiyeHukumdarGame/
│
├── 📄 package.json (root - önemli!)
├── 📄 render.yaml
├── 📄 .env.example
├── 📄 .gitignore
│
├── 📂 server/
│   ├── server.js (ana dosya)
│   ├── activation-sheets.js
│   ├── package.json
│   └── .env (GitHub'a eklemeyin!)
│
└── 📂 web-client/
    ├── index.html
    ├── game.js
    ├── style.css
    └── ...
```

---

## 🔐 .gitignore Ekleyin

```.gitignore
# Dependencies
node_modules/
server/node_modules/

# Environment
.env
server/.env
.env.local

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

---

## 🧪 Test Etme

### Lokal Test:
```bash
npm install
npm start
```
`http://localhost:3000` açın

### Render Test:
Deploy edildikten sonra Render URL'ini açın

---

## 🐛 Sorun Giderme

### "Application failed to respond"
- Logs sekmesine bakın
- PORT environment variable doğru mu?
- `server.js` doğru çalışıyor mu?

### "Build failed"
- `package.json` root'ta mı?
- Dependencies doğru mu?
- Node version uyumlu mu? (>=18.0.0)

### "Cannot connect to TikTok"
- Environment variables doğru mu?
- Google Apps Script URL geçerli mi?

### Sleep Mode Problemi
- Free plan 15 dakika sonra uyuyor
- İlk istek 30-60 saniye sürebilir
- Upgrade yaparak önlenebilir (7$/ay)

---

## 📊 Monitoring

Render Dashboard'da:
- **Logs** - Sunucu logları
- **Metrics** - CPU, Memory kullanımı
- **Events** - Deploy geçmişi

---

## 🚀 Production Checklist

- [ ] GitHub repository oluşturuldu
- [ ] Root'ta `package.json` var
- [ ] `render.yaml` eklendi
- [ ] `.gitignore` eklendi
- [ ] `.env` GitHub'a eklenmedi
- [ ] Render'da service oluşturuldu
- [ ] Environment variables eklendi
- [ ] Deploy başarılı
- [ ] URL açıldı ve test edildi
- [ ] Google Sheets bağlantısı çalışıyor

---

## 💡 İpuçları

1. **Free Plan Sleep**: Uptime monitoring servisi kullanın (örn: UptimeRobot) - her 5 dakikada ping atar, uyanık kalır

2. **Hızlı Deploy**: `git push` ile otomatik deploy

3. **Rollback**: Deploy geçmişinden eski versiyona dönebilirsiniz

4. **Custom Domain**: Kendi domain'inizi bağlayabilirsiniz

---

**Başarılar! Render'da deployment kolay! 🎉**
