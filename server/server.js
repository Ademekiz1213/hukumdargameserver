// Load environment variables
require('dotenv').config();

const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// Google Sheets Aktivasyon Sistemi
const { getMachineId, validateActivationCode } = require('./activation-sheets');


const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Connection State
let tiktokUsername = process.argv[2] || null;
let tiktokLiveConnection = null;
const activeCombos = new Map();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000; // 2 saniye

// Reconnection fonksiyonu
async function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`❌ Maksimum deneme sayısına ulaşıldı (${MAX_RECONNECT_ATTEMPTS}). Bağlantı tekrar edilemiyor.`);
        io.emit('connectionStatus', {
            success: false,
            message: `❌ Bağlantı tekrar kurulamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.`,
            reconnecting: false
        });
        return;
    }

    reconnectAttempts++;
    console.log(`🔄 Yeniden bağlanma denemesi ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);

    io.emit('connectionStatus', {
        success: false,
        message: `🔄 Bağlantı koptu! Yeniden bağlanılıyor... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
        reconnecting: true
    });

    setTimeout(async () => {
        try {
            if (!tiktokUsername) {
                console.error('❌ Yayıncı adı bilinmiyor. Yeniden bağlanılamıyor.');
                return;
            }

            console.log(`📡 ${tiktokUsername} yayınına yeniden bağlanılıyor...`);

            // Eski bağlantıyı temizle
            if (tiktokLiveConnection) {
                try {
                    tiktokLiveConnection.disconnect();
                } catch (e) { }
            }

            // Yeni bağlantı oluştur
            tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);
            setupTikTokListeners();

            const state = await tiktokLiveConnection.connect();
            console.log(`✅ Yeniden bağlantı başarılı! Room ID: ${state.roomId}`);

            reconnectAttempts = 0; // Başarılı oldu, sayacı sıfırla

            io.emit('connectionStatus', {
                success: true,
                message: `✅ Bağlantı yeniden kuruldu! (@${tiktokUsername})`
            });

        } catch (err) {
            console.error(`❌ Yeniden bağlanma başarısız: ${err.message}`);
            // Tekrar dene
            attemptReconnect();
        }
    }, RECONNECT_DELAY);
}

// Setup TikTok event listeners
function setupTikTokListeners() {
    if (!tiktokLiveConnection) return;

    tiktokLiveConnection.on('disconnected', () => {
        console.warn('⚠️ TikTok bağlantısı koptu!');
        io.emit('connectionStatus', {
            success: false,
            message: '⚠️ Bağlantı koptu! Yeniden bağlanılıyor...',
            reconnecting: true
        });

        // Otomatik yeniden bağlan
        attemptReconnect();
    });

    tiktokLiveConnection.on('error', err => {
        console.error('❌ TikTok Connector Hatası:', err.message);
        io.emit('connectionStatus', {
            success: false,
            message: `❌ Bağlantı hatası: ${err.message}`,
            reconnecting: false
        });
    });

    // Listen for Gifts
    tiktokLiveConnection.on('gift', data => {
        const comboKey = `${data.userId}-${data.giftId}`;
        let lastCount = activeCombos.get(comboKey) || 0;
        const currentCount = data.repeatCount || 1;

        // If this is a combo end event, just clean up and don't process again
        if (data.repeatEnd) {
            activeCombos.delete(comboKey);
            console.log(`[COMBO END] ${data.giftName} x${currentCount} from ${data.nickname || data.uniqueId}`);
            return;
        }

        // Reset if it's a new combo starting
        if (currentCount < lastCount) {
            lastCount = 0;
        }

        const deltaCount = currentCount - lastCount;

        if (deltaCount > 0) {
            activeCombos.set(comboKey, currentCount);

            const giftName = data.giftName;
            const perGiftDiamonds = data.diamondCount;
            const deltaDiamonds = perGiftDiamonds * deltaCount;
            const sender = data.uniqueId;
            const nickname = data.nickname || data.uniqueId;
            const profilePictureUrl = data.profilePictureUrl;

            console.log(`[GIFT] ${giftName} x${deltaCount} | From: ${nickname} | Diamonds: ${deltaDiamonds}`);

            io.emit('tiktokGift', {
                giftName,
                diamondCount: deltaDiamonds,
                sender,
                userId: data.userId,
                nickname,
                profilePictureUrl,
                giftIcon: data.giftPictureUrl,
                repeatCount: deltaCount,
                fullRepeatCount: currentCount,
                isEndOfCombo: false
            });
        }
    });

    // Handle Like events
    tiktokLiveConnection.on('like', data => {
        const nickname = data.nickname || data.uniqueId;
        console.log(`[LIKE] ${nickname} liked! Count: ${data.likeCount}`);
        io.emit('tiktokLike', {
            sender: data.uniqueId,
            userId: data.userId,
            nickname: nickname,
            likeCount: parseInt(data.likeCount),
            totalLikeCount: data.totalLikeCount,
            profilePictureUrl: data.profilePictureUrl
        });
    });

    // Handle Follow events
    tiktokLiveConnection.on('follow', data => {
        const nickname = data.nickname || data.uniqueId;
        console.log(`[FOLLOW] ${nickname} followed!`);
        io.emit('tiktokFollow', {
            sender: data.uniqueId,
            userId: data.userId,
            nickname: nickname,
            profilePictureUrl: data.profilePictureUrl
        });
    });

    // Handle Social events (often contains follows)
    tiktokLiveConnection.on('social', data => {
        if (data.displayType && data.displayType.includes('follow')) {
            const nickname = data.nickname || data.uniqueId;
            console.log(`[FOLLOW] ${nickname} followed! (via social)`);
            io.emit('tiktokFollow', {
                sender: data.uniqueId,
                userId: data.userId,
                nickname: nickname,
                profilePictureUrl: data.profilePictureUrl
            });
        }
    });

    tiktokLiveConnection.on('streamEnd', () => console.warn('Stream has ended.'));
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected to socket');

    // Send current state
    socket.emit('roomConfig', {
        tiktokUsername,
        connected: tiktokLiveConnection ? true : false
    });

    // Handle streamer change request
    socket.on('changeStreamer', async (data) => {
        // Eski format için geriye dönük uyumluluk
        let newUsername, activationCode;

        if (typeof data === 'string') {
            // Eski format (sadece username)
            newUsername = data;
            activationCode = null;
        } else {
            // Yeni format (object)
            newUsername = data.username;
            activationCode = data.activationCode;
        }

        if (!newUsername || newUsername.trim() === '') {
            socket.emit('connectionStatus', { success: false, message: 'Kullanıcı adı boş olamaz!' });
            return;
        }

        // Aktivasyon kodu kontrolü
        if (!activationCode || activationCode.trim() === '') {
            socket.emit('connectionStatus', { success: false, message: '❌ Aktivasyon kodu gerekli!' });
            return;
        }

        const cleanUsername = newUsername.trim().replace('@', '');
        console.log(`Aktivasyon kodu kontrol ediliyor...`);

        // Aktivasyon kodunu doğrula
        const validation = await validateActivationCode(activationCode);

        if (!validation.valid) {
            socket.emit('connectionStatus', {
                success: false,
                message: `❌ ${validation.error}`
            });
            return;
        }

        // Aktivasyon başarılı
        console.log(`✅ Aktivasyon başarılı! Kalan gün: ${validation.expiryDate || 'Sınırsız'}`);
        console.log(`Connecting to streamer: ${cleanUsername}`);

        socket.emit('connectionStatus', {
            success: false,
            message: `${cleanUsername} yayınına bağlanılıyor...`,
            connecting: true
        });

        try {
            // Disconnect from current streamer
            if (tiktokLiveConnection) {
                tiktokLiveConnection.disconnect();
            }

            // Clear combos
            activeCombos.clear();

            // Update username and create new connection
            tiktokUsername = cleanUsername;
            tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

            // Setup event listeners
            setupTikTokListeners();

            // Attempt connection
            const state = await tiktokLiveConnection.connect();
            console.info(`Connected to roomId ${state.roomId} (@${tiktokUsername})`);

            // Notify all clients
            io.emit('roomConfig', { tiktokUsername, connected: true });
            socket.emit('connectionStatus', {
                success: true,
                message: `✅ ${tiktokUsername} yayınına bağlandı!${validation.expiryDate ? ` (Geçerlilik: ${validation.expiryDate})` : ''}`
            });

        } catch (err) {
            console.error('Connection failed:', err.message);
            socket.emit('connectionStatus', {
                success: false,
                message: `❌ Bağlantı başarısız: ${err.message.includes('offline') ? 'Yayın aktif değil!' : 'Lütfen tekrar deneyin.'}`
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log('📡 Waiting for client to connect and specify streamer...');
});
