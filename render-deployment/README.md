# TikTok Hükümdar Oyunu - Render Deployment

TikTok Live entegrasyonlu Hükümdar oyunu sunucu dosyaları.

## Özellikler

- ✅ TikTok Live bağlantısı (gift, like, follow eventleri)
- ✅ Socket.IO real-time iletişim
- ✅ Google Sheets aktivasyon sistemi
- ✅ Otomatik reconnection
- ✅ Render.com ready

## Kurulum

Detaylı kurulum talimatları için [RENDER_KURULUM.md](./RENDER_KURULUM.md) dosyasına bakın.

## Hızlı Başlangıç

```bash
# Bağımlılıkları yükle
npm install

# Environment variables ayarla
cp .env.example .env
# .env dosyasını düzenle

# Başlat
npm start
```

## Environment Variables

- `GOOGLE_APPS_SCRIPT_URL` - Google Apps Script Web App URL'i
- `PORT` - Sunucu portu (Render otomatik ayarlar)

## Teknolojiler

- Node.js
- Express
- Socket.IO
- TikTok Live Connector
- Google Sheets API

## License

Private - All rights reserved
