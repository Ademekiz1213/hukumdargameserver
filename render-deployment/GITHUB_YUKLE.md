# 📤 GitHub'a Yükleme Talimatları

## 🎯 Hızlı Başlangıç

### 1️⃣ GitHub'da Repository Oluştur

1. https://github.com/new adresine git
2. Repository ayarları:
   - **Repository name**: `tiktok-ruler-server` (veya istediğin isim)
   - **Visibility**: **Private** ⚠️ (önemli!)
   - **Initialize**: Hiçbir şey ekleme (boş bırak)
3. **Create repository** tıkla

### 2️⃣ Git Komutları

GitHub'da oluşturduktan sonra bu komutları çalıştır:

```bash
# render-deployment klasörüne git
cd c:\Users\Adem\Desktop\TiktokTurkiyeHukumdarGame\render-deployment

# Git başlat
git init

# Dosyaları ekle
git add .

# İlk commit
git commit -m "Initial commit - Render deployment dosyaları"

# Ana branch'i main yap
git branch -M main

# GitHub repository'yi bağla (kendi URL'inle değiştir!)
git remote add origin https://github.com/KULLANICI_ADINIZ/tiktok-ruler-server.git

# GitHub'a yükle
git push -u origin main
```

### 3️⃣ URL'i Değiştir

Yukarıdaki komutlarda:
```
https://github.com/KULLANICI_ADINIZ/tiktok-ruler-server.git
```

kısmını GitHub'da aldığın URL ile değiştir!

## 🔑 GitHub Authentication

Eğer ilk kez kullanıyorsan:

### Windows için:
```bash
# Git config
git config --global user.name "İsmin"
git config --global user.email "email@example.com"
```

Push yaparken:
- **Username**: GitHub kullanıcı adın
- **Password**: GitHub Personal Access Token (şifre değil!)

### Personal Access Token Oluşturma:
1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate new token (classic)
3. **repo** checkbox'ını işaretle
4. Generate token
5. Token'ı kopyala (bir daha göremezsin!)

## 📋 Kontrol Listesi

Yüklemeden önce kontrol et:

- [ ] .env dosyası commit edilmiyor (.gitignore'da var)
- [ ] node_modules commit edilmiyor
- [ ] Tüm gerekli dosyalar var
- [ ] Repository private

## ✅ Başarı Kontrolü

GitHub repository sayfanda şu dosyaları görmelisin:
- ✅ server.js
- ✅ package.json
- ✅ activation-sheets.js
- ✅ .env.example
- ✅ .gitignore
- ✅ README.md
- ✅ RENDER_KURULUM.md
- ✅ CHECKLIST.md

**Görmemelisin:**
- ❌ .env
- ❌ node_modules/

## 🔄 Güncelleme Yaparken

Değişiklik yaptığında:

```bash
git add .
git commit -m "Değişiklik açıklaması"
git push
```

Render otomatik deploy eder!

## ❓ Sorunlar

### "git: command not found"
Git yüklü değil: https://git-scm.com/download/win

### "Permission denied"
Personal Access Token kullan (şifre değil!)

### "Repository not found"
- URL doğru mu kontrol et
- Private repo için token gerekli

---

Sonraki adım: **Render.com'da Deploy**  
Rehber: `RENDER_KURULUM.md`
