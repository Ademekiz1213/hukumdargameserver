# 🚀 RENDER DEPLOYMENT - HIZLI BAŞLANGIÇ

## ✅ Hazır Dosyalar

Render için tüm dosyalar hazır:

- ✅ `package.json` (root)
- ✅ `render.yaml`
- ✅ `.env.example`
- ✅ `.gitignore`
- ✅ `README_RENDER.md` (detaylı kılavuz)
- ✅ `server/server.js` (PORT ayarı yapıldı)

---

## 🎯 3 ADIMDA DEPLOY

### 1️⃣ GitHub'a Yükle

```bash
git init
git add .
git commit -m "Initial commit for Render"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADI.git
git push -u origin main
```

### 2️⃣ Render'da Oluştur

1. [Render.com](https://render.com) → **New Web Service**
2. GitHub repo'nuzu bağlayın
3. Ayarlar:
   - **Name:** `tiktok-hukumdar-game`
   - **Build:** `npm install`
   - **Start:** `node server/server.js`

### 3️⃣ Environment Variable Ekle

**Environment** sekmesi:
```
GOOGLE_APPS_SCRIPT_URL = https://script.google.com/macros/s/YOUR_ID/exec
```

**Deploy!** ✅

---

## 🌐 Oyunu Aç

Render size URL verecek:
```
https://tiktok-hukumdar-game.onrender.com
```

---

## ⚠️ Önemli

1. **`.env` dosyasını GitHub'a eklemeyin!**
2. **Google Apps Script URL'ini Render Environment Variables'a ekleyin**
3. **Free plan 15 dakika sonra sleep mode'a girer**

---

## 📖 Detaylı Kılavuz

`README_RENDER.md` dosyasını okuyun!

---

**Başarılar! 🎉**
