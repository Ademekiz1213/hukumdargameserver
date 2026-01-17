# 🌐 Web Client Güncelleme Talimatları

Render'da sunucu deploy edildikten sonra, web-client dosyalarını güncellemelisin.

## 🔄 Güncellenecek Dosyalar

Render URL'ini aldıktan sonra:

### 1️⃣ game.js veya ana JavaScript dosyası

**Lokal sunucu URL'i:**
```javascript
const SERVER_URL = 'http://localhost:3000';
```

**Production (Render) URL'i:**
```javascript
const SERVER_URL = 'https://SENIN-RENDER-URL.onrender.com';
```

### Örnek:
Render URL'in: `https://tiktok-ruler-server.onrender.com` ise:

```javascript
// ÖNCE (lokal test)
// const SERVER_URL = 'http://localhost:3000';

// SONRA (production)
const SERVER_URL = 'https://tiktok-ruler-server.onrender.com';
```

## 📍 Nereden Değiştirmeli?

1. `web-client` klasörüne git
2. Ana JavaScript dosyasını bul (muhtemelen `game.js`)
3. `SERVER_URL` veya `socket.io` bağlantısını bul
4. URL'i Render URL'i ile değiştir

## 🔍 Socket.IO Bağlantısı

Eğer doğrudan Socket.IO kullanıyorsan:

**Önce:**
```javascript
const socket = io('http://localhost:3000');
```

**Sonra:**
```javascript
const socket = io('https://tiktok-ruler-server.onrender.com');
```

## 🎛️ Çift Mod (Development + Production)

İsterseniz her iki modu da destekle:

```javascript
// Development/Production otomatik seçim
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

const SERVER_URL = isDevelopment 
    ? 'http://localhost:3000'  // Lokal test için
    : 'https://tiktok-ruler-server.onrender.com';  // Production

const socket = io(SERVER_URL);
```

Bu şekilde:
- Lokal açarsan → localhost'a bağlanır
- Canlıda açarsan → Render'a bağlanır

## ⚙️ CORS Ayarları

Ayrıca `server.js`'de CORS ayarlarını production için güncelle:

**Development (test için):**
```javascript
const io = new Server(server, {
    cors: {
        origin: "*",  // Her yerden izin ver
        methods: ["GET", "POST"]
    }
});
```

**Production (güvenli):**
```javascript
const io = new Server(server, {
    cors: {
        origin: "https://YOUR-GAME-DOMAIN.com",  // Sadece kendi domain'in
        methods: ["GET", "POST"]
    }
});
```

Eğer birden fazla domain varsa:
```javascript
cors: {
    origin: [
        "https://your-game.com",
        "https://www.your-game.com",
        "http://localhost:3000"  // Lokal test için
    ],
    methods: ["GET", "POST"]
}
```

## ✅ Test Etme

1. Web sayfanı aç
2. Developer Console'u aç (F12)
3. "Connected to server" gibi mesaj görmeli
4. TikTok kullanıcı adı gir
5. Aktivasyon kodu gir
6. Bağlantıyı test et

## 🐞 Sorun Giderme

### "Failed to load resource: net::ERR_CONNECTION_REFUSED"
- Render sunucusu çalışıyor mu kontrol et
- URL doğru mu? (https:// ile başlamalı)

### "CORS error"
- server.js'de CORS ayarlarını kontrol et
- Origin'in doğru domain olduğundan emin ol

### "Socket connection timeout"
- Render Free plan kullanıyorsan sunucu uyumuş olabilir
- İlk bağlanma 30-50 saniye sürebilir

## 📝 Örnek Tam Kod

```javascript
// Web Client - game.js

// Sunucu URL
const isDev = window.location.hostname === 'localhost';
const SERVER_URL = isDev 
    ? 'http://localhost:3000'
    : 'https://tiktok-ruler-server.onrender.com';

// Socket.IO bağlantısı
const socket = io(SERVER_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
});

// Bağlantı dinleyicileri
socket.on('connect', () => {
    console.log('✅ Sunucuya bağlandı:', SERVER_URL);
});

socket.on('disconnect', () => {
    console.warn('⚠️ Sunucu bağlantısı koptu');
});

socket.on('connect_error', (error) => {
    console.error('❌ Bağlantı hatası:', error);
});
```

---

Bu talimatları uyguladıktan sonra web uygulamanız Render sunucusuna bağlanacaktır! 🎉
