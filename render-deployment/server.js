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

// Statik dosyaları serve et (web client)
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ============================================
// MULTI-TENANT ROOM MANAGEMENT
// ============================================
const rooms = new Map(); // streamerName -> RoomData

class StreamerRoom {
    constructor(streamerName) {
        this.streamerName = streamerName;
        this.tiktokConnection = null;
        this.activeCombos = new Map();
        this.connectedClients = new Set(); // Socket IDs
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 2000;
        this.reconnectTimer = null;
        this.cleanupTimer = null;

        console.log(`🏠 Room created for streamer: ${streamerName}`);
    }

    async connect() {
        try {
            if (this.tiktokConnection) {
                console.log(`⚠️ Room ${this.streamerName} already has active connection`);
                return;
            }

            console.log(`📡 Connecting to ${this.streamerName}...`);
            this.tiktokConnection = new WebcastPushConnection(this.streamerName);
            this.setupTikTokListeners();

            const state = await this.tiktokConnection.connect();
            console.log(`✅ Connected to ${this.streamerName} | Room ID: ${state.roomId}`);

            this.reconnectAttempts = 0;
            this.broadcastToRoom('connectionStatus', {
                success: true,
                message: `✅ Bağlantı kuruldu! (@${this.streamerName})`
            });

            return state;
        } catch (err) {
            console.error(`❌ Connection failed for ${this.streamerName}: ${err.message}`);
            throw err;
        }
    }

    setupTikTokListeners() {
        if (!this.tiktokConnection) return;

        this.tiktokConnection.on('disconnected', () => {
            console.warn(`⚠️ TikTok connection lost for ${this.streamerName}`);

            // Eğer hiç client yoksa reconnect yapma (cleanup başlamış demektir)
            if (this.connectedClients.size === 0) {
                console.log(`ℹ️ No clients in room, skipping reconnect for ${this.streamerName}`);
                return;
            }

            this.broadcastToRoom('connectionStatus', {
                success: false,
                message: '⚠️ Bağlantı koptu! Yeniden bağlanılıyor...',
                reconnecting: true
            });
            this.attemptReconnect();
        });

        this.tiktokConnection.on('error', err => {
            console.error(`❌ TikTok error for ${this.streamerName}:`, err.message);
            this.broadcastToRoom('connectionStatus', {
                success: false,
                message: `❌ Bağlantı hatası: ${err.message}`,
                reconnecting: false
            });
        });

        this.tiktokConnection.on('gift', data => {
            const comboKey = `${data.userId}-${data.giftId}`;
            let lastCount = this.activeCombos.get(comboKey) || 0;
            const currentCount = data.repeatCount || 1;

            if (data.repeatEnd) {
                this.activeCombos.delete(comboKey);
                console.log(`[${this.streamerName}] COMBO END: ${data.giftName} x${currentCount}`);
                // RETURN KALDIRILDI - Hediye işlenmeye devam edecek
            }

            if (currentCount < lastCount) {
                lastCount = 0;
            }

            const deltaCount = currentCount - lastCount;

            if (deltaCount > 0) {
                this.activeCombos.set(comboKey, currentCount);

                const giftData = {
                    giftName: data.giftName,
                    diamondCount: data.diamondCount * deltaCount,
                    sender: data.uniqueId,
                    userId: data.userId,
                    nickname: data.nickname || data.uniqueId,
                    profilePictureUrl: data.profilePictureUrl,
                    giftIcon: data.giftPictureUrl,
                    repeatCount: deltaCount,
                    fullRepeatCount: currentCount,
                    isEndOfCombo: false
                };

                console.log(`[${this.streamerName}] GIFT: ${giftData.giftName} x${deltaCount} | From: ${giftData.nickname}`);
                this.broadcastToRoom('tiktokGift', giftData);
            }
        });

        this.tiktokConnection.on('like', data => {
            const likeData = {
                sender: data.uniqueId,
                userId: data.userId,
                nickname: data.nickname || data.uniqueId,
                likeCount: parseInt(data.likeCount),
                totalLikeCount: data.totalLikeCount,
                profilePictureUrl: data.profilePictureUrl
            };
            console.log(`[${this.streamerName}] LIKE: ${likeData.nickname} | Count: ${likeData.likeCount}`);
            this.broadcastToRoom('tiktokLike', likeData);
        });

        this.tiktokConnection.on('follow', data => {
            const followData = {
                sender: data.uniqueId,
                userId: data.userId,
                nickname: data.nickname || data.uniqueId,
                profilePictureUrl: data.profilePictureUrl
            };
            console.log(`[${this.streamerName}] FOLLOW: ${followData.nickname}`);
            this.broadcastToRoom('tiktokFollow', followData);
        });

        this.tiktokConnection.on('social', data => {
            if (data.displayType && data.displayType.includes('follow')) {
                const followData = {
                    sender: data.uniqueId,
                    userId: data.userId,
                    nickname: data.nickname || data.uniqueId,
                    profilePictureUrl: data.profilePictureUrl
                };
                console.log(`[${this.streamerName}] FOLLOW (social): ${followData.nickname}`);
                this.broadcastToRoom('tiktokFollow', followData);
            }
        });

        this.tiktokConnection.on('streamEnd', () => {
            console.warn(`[${this.streamerName}] Stream has ended.`);
            this.broadcastToRoom('connectionStatus', {
                success: false,
                message: '📴 Yayın sona erdi.',
                reconnecting: false
            });
        });
    }

    async attemptReconnect() {
        // Eğer hiç client yoksa reconnect yapma
        if (this.connectedClients.size === 0) {
            console.log(`ℹ️ No clients remain, aborting reconnect for ${this.streamerName}`);
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`❌ Max reconnect attempts reached for ${this.streamerName}`);
            this.broadcastToRoom('connectionStatus', {
                success: false,
                message: `❌ Bağlantı tekrar kurulamadı. Lütfen sayfayı yenileyin.`,
                reconnecting: false
            });
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} for ${this.streamerName}`);

        this.broadcastToRoom('connectionStatus', {
            success: false,
            message: `🔄 Yeniden bağlanılıyor... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
            reconnecting: true
        });

        this.reconnectTimer = setTimeout(async () => {
            try {
                if (this.tiktokConnection) {
                    try {
                        this.tiktokConnection.disconnect();
                    } catch (e) { }
                }

                this.tiktokConnection = new WebcastPushConnection(this.streamerName);
                this.setupTikTokListeners();

                const state = await this.tiktokConnection.connect();
                console.log(`✅ Reconnected to ${this.streamerName} | Room ID: ${state.roomId}`);

                this.reconnectAttempts = 0;
                this.broadcastToRoom('connectionStatus', {
                    success: true,
                    message: `✅ Bağlantı yeniden kuruldu!`
                });

            } catch (err) {
                console.error(`❌ Reconnect failed for ${this.streamerName}: ${err.message}`);
                this.attemptReconnect();
            }
        }, this.reconnectDelay);
    }

    addClient(socketId) {
        this.connectedClients.add(socketId);
        console.log(`👤 Client ${socketId} joined room ${this.streamerName} (Total: ${this.connectedClients.size})`);

        // Cancel cleanup if scheduled
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
            console.log(`⏸️ Cleanup cancelled for ${this.streamerName}`);
        }
    }

    removeClient(socketId) {
        this.connectedClients.delete(socketId);
        console.log(`👋 Client ${socketId} left room ${this.streamerName} (Remaining: ${this.connectedClients.size})`);

        // If no clients left, schedule cleanup after 2 seconds (hızlı cleanup)
        if (this.connectedClients.size === 0) {
            console.log(`⏳ No clients in ${this.streamerName}. Scheduling cleanup in 2s...`);
            this.cleanupTimer = setTimeout(() => {
                this.cleanup();
            }, 2000); // 2 seconds grace period (sayfa yenileme için yeterli)
        }
    }

    broadcastToRoom(event, data) {
        io.to(this.streamerName).emit(event, data);
    }

    cleanup() {
        console.log(`🧹 Cleaning up room: ${this.streamerName}`);

        // Clear timers
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        // Disconnect TikTok connection
        if (this.tiktokConnection) {
            try {
                this.tiktokConnection.disconnect();
                console.log(`🔌 TikTok connection closed for ${this.streamerName}`);
            } catch (e) {
                console.error(`Error disconnecting ${this.streamerName}:`, e.message);
            }
            this.tiktokConnection = null;
        }

        // Clear data
        this.activeCombos.clear();
        this.connectedClients.clear();

        // Remove from rooms map
        rooms.delete(this.streamerName);
        console.log(`✅ Room ${this.streamerName} cleaned up and removed`);
    }

    getStatus() {
        return {
            streamerName: this.streamerName,
            connected: this.tiktokConnection !== null,
            clientCount: this.connectedClients.size,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// ============================================
// SOCKET.IO CONNECTION HANDLING
// ============================================
io.on('connection', (socket) => {
    console.log(`🔌 New socket connected: ${socket.id}`);

    let currentRoom = null;

    socket.on('changeStreamer', async (data) => {
        let newUsername, activationCode;

        // Backward compatibility
        if (typeof data === 'string') {
            newUsername = data;
            activationCode = null;
        } else {
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
        console.log(`🔑 Validating activation for ${cleanUsername}...`);

        // Validate activation code (YENİ: Yayıncı adı ile birlikte)
        const validation = await validateActivationCode(activationCode, cleanUsername);

        if (!validation.valid) {
            socket.emit('connectionStatus', {
                success: false,
                message: `❌ ${validation.error}`
            });
            return;
        }

        console.log(`✅ Activation valid! Expiry: ${validation.expiryDate || 'Unlimited'}`);

        // Leave previous room if any
        if (currentRoom) {
            socket.leave(currentRoom);
            const room = rooms.get(currentRoom);
            if (room) {
                room.removeClient(socket.id);
            }
        }

        currentRoom = cleanUsername;
        socket.join(currentRoom);

        socket.emit('connectionStatus', {
            success: false,
            message: `${cleanUsername} yayınına bağlanılıyor...`,
            connecting: true
        });

        try {
            // Get or create room
            let room = rooms.get(cleanUsername);

            if (!room) {
                // Create new room
                room = new StreamerRoom(cleanUsername);
                rooms.set(cleanUsername, room);
                await room.connect();
            } else {
                console.log(`♻️ Reusing existing room for ${cleanUsername}`);
            }

            // Add client to room
            room.addClient(socket.id);

            // Send room config
            socket.emit('roomConfig', {
                tiktokUsername: cleanUsername,
                connected: room.tiktokConnection !== null
            });

            socket.emit('connectionStatus', {
                success: true,
                message: `✅ ${cleanUsername} yayınına bağlandı!${validation.expiryDate ? ` (Geçerlilik: ${validation.expiryDate})` : ''}`
            });

        } catch (err) {
            console.error(`Connection failed for ${cleanUsername}:`, err.message);

            // Hata mesajını analiz et ve kullanıcıya uygun mesaj göster
            let userMessage = '❌ Bağlantı başarısız.';

            if (err.message.includes('offline') || err.message.includes('not found')) {
                userMessage = `📴 ${cleanUsername} şu anda canlı yayında DEĞİL!\n\nLütfen yayıncının canlı yayın açmasını bekleyin.`;
            } else if (err.message.includes('LIVE_ACCESS_UNAUTHORIZED')) {
                userMessage = `🔒 Bu yayına erişim izni yok.\n\nYayıncı hesabı özel veya erişim kısıtlı olabilir.`;
            } else if (err.message.includes('timeout')) {
                userMessage = `⏱️ Bağlantı zaman aşımına uğradı.\n\nİnternet bağlantınızı kontrol edin ve tekrar deneyin.`;
            } else if (err.message.includes('rate limit')) {
                userMessage = `⚠️ Çok fazla deneme yapıldı.\n\nBir süre bekleyip tekrar deneyin.`;
            } else {
                userMessage = `❌ Bağlantı hatası: ${err.message}\n\nLütfen tekrar deneyin.`;
            }

            socket.emit('connectionStatus', {
                success: false,
                message: userMessage
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);

        if (currentRoom) {
            const room = rooms.get(currentRoom);
            if (room) {
                room.removeClient(socket.id);
            }
        }
    });
});

// ============================================
// STATUS ENDPOINT
// ============================================
app.get('/status', (req, res) => {
    const roomStatuses = Array.from(rooms.values()).map(room => room.getStatus());
    res.json({
        totalRooms: rooms.size,
        rooms: roomStatuses,
        uptime: process.uptime()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Multi-Tenant Server listening on port ${PORT}`);
    console.log(`📊 Status endpoint: http://localhost:${PORT}/status`);
    console.log(`🎮 Game client: http://localhost:${PORT}`);
    console.log('Waiting for clients to connect...');
});
