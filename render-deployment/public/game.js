// Auto-detect server URL: Use same origin in production, localhost in development
const SERVER_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : window.location.origin;
const socket = io(SERVER_URL);

// Game State
const cityOwners = {};
const userColors = {};
const userCityCounts = {};
const cityCoords = {}; // Store cx, cy for profile pictures
const userProfilePics = {}; // Store user avatars

// Configuration
const COST_PER_CITY = 1;

// Load Map via Fetch (To avoid CORS/Document access issues)
// Load Map from map_data.js (SVG content is in 'mapSVG' variable)
const container = document.getElementById('map-container');
container.innerHTML = mapSVG;
initMap();

function initMap() {
    const svg = document.querySelector('svg');
    svg.setAttribute('id', 'turkey-map');

    // Create group for avatars
    const avatarGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    avatarGroup.setAttribute('id', 'avatar-group');
    svg.appendChild(avatarGroup);

    // Extract coordinates from label_points
    const labelPoints = document.getElementById('label_points');
    if (labelPoints) {
        labelPoints.querySelectorAll('circle').forEach(circle => {
            cityCoords[circle.id] = {
                cx: parseFloat(circle.getAttribute('cx')),
                cy: parseFloat(circle.getAttribute('cy'))
            };
        });
        // Hide original label points
        labelPoints.style.display = 'none';
    }

    const paths = svg.querySelectorAll('path');
    paths.forEach(path => {
        path.style.cursor = 'pointer';
        path.style.transition = 'fill 0.5s';
        path.addEventListener('click', () => {
            openManualAssignModal(path.id);
        });
    });

    console.log("Map Initialized and Coords Extracted");
}

socket.on('connect', () => {
    console.log("Connected to Backend Relay");
    const status = document.getElementById('connection-status');
    if (status) {
        status.innerText = '✅ Sunucuya bağlandı! Yayıncı adını girin.';
        status.className = 'connection-status success';
    }
    const btn = document.getElementById('connect-btn');
    if (btn) btn.disabled = false;
});

socket.on('connect_error', (err) => {
    console.error("Socket connection error:", err);
    const status = document.getElementById('connection-status');
    if (status) {
        status.innerHTML = '❌ Sunucu bulunamadı! <br><small>OYUNU_BASLAT.bat dosyasını çalıştırın.</small>';
        status.className = 'connection-status error';
    }
    const btn = document.getElementById('connect-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerText = '⚠️ Sunucu Yok';
    }
});

socket.on('tiktokGift', (data) => {
    console.log("Gift Received:", data);
    handleGift(data);
});

// Protection Mode State
let isProtectionActive = false;
let protectionOwner = null;
let protectionShield = 0;
let protectionTimerInterval = null;
let protectionTimeLeft = 60;
let protectionDuration = parseInt(localStorage.getItem('tiktokProtectionDuration')) || 60; // Configurable
const TOTAL_CITIES = 81; // Turkey has 81 provinces
let dominationAnimationDuration = parseInt(localStorage.getItem('tiktokDominationDuration')) || 3; // Default 3 sec

// Load Settings
let configuredGiftValues = JSON.parse(localStorage.getItem('tiktokGiftValues')) || defaultGiftValues;
let configuredRulerValues = JSON.parse(localStorage.getItem('tiktokRulerValues')) || {};
// Load Cached Icons (Self-Learning)
let cachedGiftIcons = JSON.parse(localStorage.getItem('tiktokGiftIcons')) || {};

let likeGoal = parseInt(localStorage.getItem('tiktokLikeGoal')) || 150;
let cityRewardPerGoal = parseInt(localStorage.getItem('tiktokCityReward')) || 2;
let notificationsEnabled = localStorage.getItem('tiktokNotifications') !== 'false'; // Default ON
let avatarDisplayMode = localStorage.getItem('tiktokAvatarMode') || 'centroid'; // 'centroid' or 'per-city'

socket.on('tiktokLike', (data) => {
    console.log("Like Received:", data);
    handleLike(data);
});

socket.on('tiktokFollow', (data) => {
    console.log("Follow Received:", data);
    handleFollow(data);
});

let currentStreamer = "default";

// Like State
const userLikes = {};
const userNicknames = {}; // Store display names

// Follow State
let followRewardEnabled = localStorage.getItem('tiktokFollowRewardEnabled') !== 'false'; // Default ON
let cityRewardPerFollow = parseInt(localStorage.getItem('tiktokCityRewardPerFollow')) || 3;
let rewardedFollowers = new Set(); // Will be loaded via roomConfig

function handleLike(data) {
    if (isProtectionActive) return; // Disable likes during protection

    const { userId, sender, nickname, likeCount, profilePictureUrl } = data;
    const senderId = userId || sender; // Use userId as persistent key

    if (nickname) userNicknames[senderId] = nickname;

    if (!userColors[senderId]) {
        userColors[senderId] = getRandomColor();
    }

    // Accumulate likes
    userLikes[senderId] = (userLikes[senderId] || 0) + likeCount;

    // Use Configured Goal
    const REWARD_THRESHOLD = likeGoal;
    const CITIES_PER_REWARD = cityRewardPerGoal;

    const rewards = Math.floor(userLikes[senderId] / REWARD_THRESHOLD);

    if (rewards > 0) {
        userLikes[senderId] -= (rewards * REWARD_THRESHOLD);

        const totalCitiesToConquer = rewards * CITIES_PER_REWARD;

        const displayName = userNicknames[senderId] || nickname || sender;
        showNotification(`👍 ${displayName} ${rewards * REWARD_THRESHOLD} beğeniye ulaştı! +${totalCitiesToConquer} Şehir!`);

        for (let i = 0; i < totalCitiesToConquer; i++) {
            if (isProtectionActive) {
                const remaining = totalCitiesToConquer - i;
                protectionShield += remaining;
                showNotification(`🛡️ Kalan Güç Kalkana Eklendi: +${remaining}`);
                updateProtectionUI();
                break;
            }
            conquerBestCity(senderId, userColors[senderId], profilePictureUrl);
        }
        updateLeaderboard();

        // Update avatar if we didn't have it before
        if (!userProfilePics[senderId]) {
            updateEmpireAvatar(senderId, profilePictureUrl);
        }
    }
}

function handleFollow(data) {
    const { userId, sender, nickname, profilePictureUrl } = data;
    const senderId = userId || sender;

    if (nickname) userNicknames[senderId] = nickname;

    if (!followRewardEnabled) return;

    // Check if user already got the reward
    if (rewardedFollowers.has(senderId)) {
        console.log(`User ${senderId} already rewarded for following.`);
        return;
    }

    if (!userColors[senderId]) {
        userColors[senderId] = getRandomColor();
    }

    // Mark as rewarded for THIS streamer
    rewardedFollowers.add(senderId);
    localStorage.setItem(`tiktokRewardedFollowers_${currentStreamer}`, JSON.stringify([...rewardedFollowers]));

    const displayName = userNicknames[senderId] || nickname || sender;
    showNotification(`✨ ${displayName} takip etti! +${cityRewardPerFollow} Şehir!`);

    for (let i = 0; i < cityRewardPerFollow; i++) {
        if (isProtectionActive) {
            const remaining = cityRewardPerFollow - i;
            protectionShield += remaining;
            showNotification(`🛡️ Koruma Aktif: +${remaining} Kalkan!`);
            updateProtectionUI();
            break;
        }
        conquerBestCity(senderId, userColors[senderId], profilePictureUrl);
    }
    updateLeaderboard();

    // Update avatar
    if (!userProfilePics[senderId]) {
        updateAvatar(senderId, profilePictureUrl);
    }
}

function handleGift(data) {
    const { userId, sender, nickname, giftName, diamondCount, profilePictureUrl, giftIcon, repeatCount } = data;
    const senderId = userId || sender;
    const finalRepeatCount = repeatCount || 1;
    const lowerGiftName = giftName.toLowerCase();

    if (nickname) userNicknames[senderId] = nickname;

    if (!userColors[senderId]) {
        userColors[senderId] = getRandomColor();
    }

    // CACHE GIFT ICON (Self-Learning - Case Insensitive)
    const normalizedGiftName = lowerGiftName;
    if (giftIcon) {
        if (!cachedGiftIcons[normalizedGiftName]) {
            cachedGiftIcons[normalizedGiftName] = giftIcon;
            localStorage.setItem('tiktokGiftIcons', JSON.stringify(cachedGiftIcons));
        }
    }

    // PROTECTION MODE LOGIC (Existing Shield interaction)
    if (isProtectionActive) {
        // Shield equals exact Coin value (diamondCount is already total in backend)
        const SHIELD_PER_DIAMOND = 1;
        const DAMAGE_PER_DIAMOND = 1;

        if (senderId === protectionOwner) {
            protectionShield += diamondCount * SHIELD_PER_DIAMOND;
            showNotification(`🛡️ KRAL ${nickname || sender} Kalkanı Güçlendirdi! +${diamondCount}`);
        } else {
            protectionShield -= diamondCount * DAMAGE_PER_DIAMOND;
            showNotification(`⚔️ ${nickname || sender} Kalkana Saldırdı! -${diamondCount}`);

            if (protectionShield <= 0) {
                endProtectionMode(false);
                showNotification(`💔 KALKAN KIRILDI! SALDIRIN!`);
            }
        }
        updateProtectionUI();
        return;
    }

    // CASE-INSENSITIVE LOOKUP FOR RULER POINTS
    let rulerPointsPerGift = 0;

    // Find in configured values (case-insensitive key)
    const configKey = Object.keys(configuredRulerValues).find(k => k.toLowerCase() === lowerGiftName);
    const defaultKey = Object.keys(defaultRulerValues).find(k => k.toLowerCase() === lowerGiftName);

    if (configKey) {
        rulerPointsPerGift = parseInt(configuredRulerValues[configKey]);
    } else if (defaultKey) {
        rulerPointsPerGift = defaultRulerValues[defaultKey];
    }

    let pointsAdded = 0;
    if (rulerPointsPerGift > 0) {
        pointsAdded = rulerPointsPerGift * finalRepeatCount;
        // Use senderId for consistent tracking, nickname for display
        const displayNickname = nickname || userNicknames[senderId] || sender;
        addRulerPoints(senderId, pointsAdded, profilePictureUrl, displayNickname);
    }

    // Determine City Count from Settings (Conquest Power)
    let cityCountToConquer = 1;

    // Check locally configured values (case-insensitive)
    const conquestKey = Object.keys(configuredGiftValues).find(k => k.toLowerCase() === lowerGiftName);

    if (conquestKey) {
        cityCountToConquer = parseInt(configuredGiftValues[conquestKey]) * finalRepeatCount;
    } else {
        // Fallback to diamond value (diamondCount is already total from backend)
        cityCountToConquer = Math.floor(diamondCount / COST_PER_CITY) || 1;
    }

    const displayName = userNicknames[senderId] || nickname || sender;
    const displayIcon = giftIcon || cachedGiftIcons[lowerGiftName] || '🎁';
    const iconHtml = displayIcon.startsWith('http') ? `<img src="${displayIcon}" style="width:24px; vertical-align:middle;">` : displayIcon;
    const comboText = finalRepeatCount > 1 ? ` x${finalRepeatCount}` : '';

    if (pointsAdded > 0) {
        showNotification(`👑 ${displayName} ${iconHtml} ${giftName}${comboText} | +${pointsAdded} Puan & ${cityCountToConquer} Şehir!`);
    } else {
        showNotification(`${displayName} ${iconHtml} ${giftName}${comboText} gönderdi! ${cityCountToConquer} şehir alıyor!`);
    }

    for (let i = 0; i < cityCountToConquer; i++) {
        // OVERFLOW LOGIC
        if (isProtectionActive) {
            const remainingCities = cityCountToConquer - i;
            if (remainingCities > 0) {
                protectionShield += remainingCities;
                showNotification(`🛡️ Fetih Tamamlandı! Artan Güç Kalkana Eklendi: +${remainingCities}`);
                updateProtectionUI();
            }
            break;
        }

        conquerBestCity(senderId, userColors[senderId], profilePictureUrl);
    }

    updateLeaderboard();
}

// ----------------------
// PROTECTION MODE FUNCTIONS
// ----------------------
function startProtectionMode(owner) {
    if (isProtectionActive) return;

    isProtectionActive = true;
    protectionOwner = owner;
    protectionShield = 1; // Starting Shield (Lowered from 500)
    protectionTimeLeft = protectionDuration; // Use configurable duration

    // Update UI
    document.getElementById('protection-panel').classList.add('active');
    document.getElementById('protection-avatar').src = userProfilePics[owner] || '';
    document.getElementById('protection-ruler-name').innerText = userNicknames[owner] || owner;
    document.getElementById('shield-count').innerText = protectionShield;
    document.getElementById('time-left').innerText = protectionTimeLeft;
    document.getElementById('shield-count').parentElement.classList.add('shield-active');

    // Reset Bar
    const timerBar = document.getElementById('timer-bar');
    if (timerBar) timerBar.style.width = '100%';

    // Start Timer
    if (protectionTimerInterval) clearInterval(protectionTimerInterval);
    const totalTime = protectionTimeLeft;

    protectionTimerInterval = setInterval(() => {
        protectionTimeLeft--;
        document.getElementById('time-left').innerText = protectionTimeLeft;

        // Update Bar
        if (timerBar) {
            const percentage = (protectionTimeLeft / totalTime) * 100;
            timerBar.style.width = `${percentage}%`;
        }

        if (protectionTimeLeft <= 0) {
            endProtectionMode(true); // Survived!
        }
    }, 1000);
}

function endProtectionMode(survived) {
    isProtectionActive = false;
    if (protectionTimerInterval) clearInterval(protectionTimerInterval);

    document.getElementById('protection-panel').classList.remove('active');
    document.getElementById('shield-count').parentElement.classList.remove('shield-active');

    if (survived) {
        const winnerName = userNicknames[protectionOwner] || protectionOwner;
        const winnerPic = userProfilePics[protectionOwner] || "";

        showNotification(`👑 ${winnerName} İMPARATORLUĞUNU İLAN ETTİ! (Harita Temizleniyor...)`);

        // Save Ruler - use protectionOwner as ID, winnerName as display
        saveRuler(protectionOwner, winnerPic, winnerName);

        // Reset game without page reload
        setTimeout(() => resetGame(), 2000);
    } else {
        // Shield broken
    }
}

function updateProtectionUI() {
    if (!isProtectionActive) return;
    document.getElementById('shield-count').innerText = protectionShield;
}

// Border cities for new players (Expanded List)
const BORDER_CITIES = [
    'TR08', 'TR75', 'TR36', 'TR76', 'TR04', 'TR65', 'TR30', 'TR73', 'TR47', // East
    'TR63', 'TR27', 'TR79', 'TR31', 'TR01', 'TR33', 'TR07', 'TR48', 'TR09', 'TR35', 'TR10', 'TR17', 'TR22', 'TR39', // South & West
    'TR34', 'TR41', 'TR54', 'TR81', 'TR67', 'TR74', 'TR37', 'TR57', 'TR55', 'TR52', 'TR28', 'TR61', 'TR53' // North
];
const MAX_ADJACENT_DISTANCE = 80;

function conquerBestCity(owner, color, profilePic) {
    const allPaths = Array.from(document.querySelectorAll('path'));
    let targetId = null;

    // Get list of cities owned by this user
    const userOwnedCities = allPaths.filter(p => cityOwners[p.id]?.owner === owner);

    if (userOwnedCities.length === 0) {
        // NEW USER: Start from ANY Border City
        const availableBorders = BORDER_CITIES.filter(id => !cityOwners[id]);
        if (availableBorders.length > 0) {
            targetId = availableBorders[Math.floor(Math.random() * availableBorders.length)];
        } else {
            // All borders taken, pick a random free city
            const freeCities = allPaths.filter(p => !cityOwners[p.id]);
            if (freeCities.length > 0) {
                targetId = freeCities[Math.floor(Math.random() * freeCities.length)].id;
            } else {
                // No free cities - steal from a random enemy
                const enemyCities = allPaths.filter(p => cityOwners[p.id]?.owner !== owner);
                if (enemyCities.length > 0) {
                    targetId = enemyCities[Math.floor(Math.random() * enemyCities.length)].id;
                }
            }
        }
    } else {
        // USER HAS TERRITORY: Expand to neighbors (Circular Growth)
        let totalX = 0, totalY = 0, count = 0;
        userOwnedCities.forEach(p => {
            const c = cityCoords[p.id];
            if (c) { totalX += c.cx; totalY += c.cy; count++; }
        });
        const empireCx = totalX / count;
        const empireCy = totalY / count;

        const freeCities = allPaths.filter(p => !cityOwners[p.id]);
        let candidates = [];

        // Check free cities first
        freeCities.forEach(candidate => {
            const candCoords = cityCoords[candidate.id];
            if (!candCoords) return;

            for (const owned of userOwnedCities) {
                const ownedCoords = cityCoords[owned.id];
                if (ownedCoords) {
                    const d = Math.hypot(candCoords.cx - ownedCoords.cx, candCoords.cy - ownedCoords.cy);
                    if (d <= MAX_ADJACENT_DISTANCE) {
                        const distToCentroid = Math.hypot(candCoords.cx - empireCx, candCoords.cy - empireCy);
                        candidates.push({ path: candidate, score: distToCentroid });
                        break;
                    }
                }
            }
        });

        // If no adjacent free cities, look for adjacent enemies
        if (candidates.length === 0) {
            const enemyCities = allPaths.filter(p => cityOwners[p.id] && cityOwners[p.id].owner !== owner);
            enemyCities.forEach(candidate => {
                const candCoords = cityCoords[candidate.id];
                if (!candCoords) return;

                for (const owned of userOwnedCities) {
                    const ownedCoords = cityCoords[owned.id];
                    if (ownedCoords) {
                        const d = Math.hypot(candCoords.cx - ownedCoords.cx, candCoords.cy - ownedCoords.cy);
                        if (d <= MAX_ADJACENT_DISTANCE) {
                            const distToCentroid = Math.hypot(candCoords.cx - empireCx, candCoords.cy - empireCy);
                            candidates.push({ path: candidate, score: distToCentroid });
                            break;
                        }
                    }
                }
            });
        }

        if (candidates.length > 0) {
            candidates.sort((a, b) => a.score - b.score);
            targetId = candidates[0].path.id;
        }
    }

    if (targetId) {
        conquerCity(targetId, owner, color, profilePic);
    }
}

function conquerCity(cityId, owner, color, profilePic) {
    const path = document.getElementById(cityId);
    if (!path) return;

    // Visual Update
    path.style.fill = color;
    path.classList.add('shake-map');
    setTimeout(() => path.classList.remove('shake-map'), 500);

    // Update Data
    const prevOwner = cityOwners[cityId]?.owner;
    if (prevOwner && userCityCounts[prevOwner]) userCityCounts[prevOwner]--;

    cityOwners[cityId] = { owner, color };
    userCityCounts[owner] = (userCityCounts[owner] || 0) + 1;

    updateAvatar(owner, profilePic);
    if (prevOwner) {
        if (userProfilePics[prevOwner]) {
            updateAvatar(prevOwner, userProfilePics[prevOwner]);
        }
    }

    // Elimination Check
    if (prevOwner && prevOwner !== owner && userCityCounts[prevOwner] === 0) {
        showEliminationAnimation(owner, prevOwner);
    }

    // Domination Check
    if (userCityCounts[owner] >= TOTAL_CITIES) {
        showTotalDominationAnimation(owner);
        startProtectionMode(owner);
    }
}

function showEliminationAnimation(attacker, victim) {
    const overlay = document.getElementById('elimination-overlay');
    if (!overlay) return;

    const attackerImg = document.querySelector('#elim-attacker .elim-avatar');
    const attackerName = document.querySelector('#elim-attacker .elim-name');
    const victimImg = document.querySelector('#elim-victim .elim-avatar');
    const victimName = document.querySelector('#elim-victim .elim-name');

    attackerImg.src = userProfilePics[attacker] || 'https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg';
    attackerName.innerText = userNicknames[attacker] || attacker;

    victimImg.src = userProfilePics[victim] || 'https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg';
    victimName.innerText = userNicknames[victim] || victim;

    overlay.classList.add('active');

    // Fast animation - remove after 1.5 seconds
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 2000);
}

function showTotalDominationAnimation(winner) {
    const overlay = document.getElementById('domination-overlay');
    if (!overlay) return;

    overlay.innerHTML = '';
    overlay.className = 'domination-overlay active';

    const losers = Object.keys(userProfilePics).filter(u => u !== winner);
    const winnerName = userNicknames[winner] || winner;
    const winnerPic = userProfilePics[winner] || 'https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg';

    // 1. Create Layout
    const layout = document.createElement('div');
    layout.className = 'domination-layout';

    // Left Side: Winner
    const winnerSide = document.createElement('div');
    winnerSide.className = 'winner-side';
    winnerSide.innerHTML = `
        <img src="${winnerPic}" class="winner-avatar-big">
        <div class="winner-info-card">
            <div class="winner-display-name">${winnerName}</div>
            <h1 class="domination-title-text">ÜLKENİN HÜKÜMDARI</h1>
        </div>
    `;

    // Right Side: Losers
    const losersSide = document.createElement('div');
    losersSide.className = 'losers-side';

    const loserItems = [];
    losers.forEach(loser => {
        const item = document.createElement('div');
        item.className = 'loser-item-animated';
        item.innerHTML = `
            <img src="${userProfilePics[loser]}" class="loser-avatar-small">
            <div class="elendi-label">ELENDİ</div>
        `;
        losersSide.appendChild(item);
        loserItems.push(item);
    });

    layout.appendChild(winnerSide);
    layout.appendChild(losersSide);
    overlay.appendChild(layout);

    // Sword & Slash Elements
    const swordContainer = document.createElement('div');
    swordContainer.className = 'sword-container';
    swordContainer.innerHTML = `<img src="sword.png" class="sword-img">`;
    overlay.appendChild(swordContainer);

    const slash = document.createElement('div');
    slash.className = 'slash-effect';
    overlay.appendChild(slash);

    // 2. TIMELINE
    setTimeout(() => {
        // Swing Sword
        swordContainer.classList.add('sword-active');

        // Trigger Slash & Impact
        setTimeout(() => {
            slash.classList.add('slash-active');
            document.body.classList.add('impact-shake');
            setTimeout(() => document.body.classList.remove('impact-shake'), 300);

            // Blow Losers Away
            loserItems.forEach(item => {
                const flyX = 500 + Math.random() * 1000;
                const flyY = (Math.random() - 0.5) * 1000;
                const rot = (Math.random() - 0.5) * 720;

                item.style.setProperty('--fly-x', `${flyX}px`);
                item.style.setProperty('--fly-y', `${flyY}px`);
                item.style.setProperty('--fly-rot', `${rot}deg`);
                item.classList.add('blown');
            });

        }, 400);

    }, 500);

    // 3. Cleanup
    setTimeout(() => {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
    }, dominationAnimationDuration * 1000);
}

function updateEmpireAvatar(owner, imageUrl) {
    if (!imageUrl) return;
    userProfilePics[owner] = imageUrl;

    const svg = document.querySelector('svg');
    const group = document.getElementById('avatar-group');

    const safeOwner = owner.toString().replace(/[^a-zA-Z0-9]/g, '');
    const clipId = `clip-${safeOwner}`;
    const imgId = `avatar-user-${safeOwner}`;

    const userCities = Object.keys(cityOwners).filter(cityId => cityOwners[cityId].owner === owner);

    if (userCities.length === 0) {
        const existingImg = document.getElementById(imgId);
        if (existingImg) existingImg.remove();
        const existingClip = document.getElementById(clipId);
        if (existingClip) existingClip.remove();
        const existingBorder = document.getElementById(`border-${owner.replace(/[^a-zA-Z0-9]/g, '')}`);
        if (existingBorder) existingBorder.remove();
        return;
    }

    let totalX = 0, totalY = 0, count = 0;
    userCities.forEach(cityId => {
        const coords = cityCoords[cityId];
        if (coords) {
            totalX += coords.cx;
            totalY += coords.cy;
            count++;
        }
    });
    if (count === 0) return;

    const centerX = totalX / count;
    const centerY = totalY / count;

    const size = Math.min(120, 30 + (count * 3));
    const radius = size / 2;

    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
    }

    let clipPath = document.getElementById(clipId);
    if (!clipPath) {
        clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', clipId);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        clipPath.appendChild(circle);
        defs.appendChild(clipPath);
    }

    const clipCircle = clipPath.querySelector('circle');
    clipCircle.setAttribute('cx', centerX);
    clipCircle.setAttribute('cy', centerY);
    clipCircle.setAttribute('r', radius);

    let img = document.getElementById(imgId);
    if (!img) {
        img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('id', imgId);
        img.style.pointerEvents = 'none';
        group.appendChild(img);
    }

    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageUrl);
    img.setAttribute('clip-path', `url(#${clipId})`);
    img.style.transition = 'all 0.5s ease-out';
    img.setAttribute('x', centerX - radius);
    img.setAttribute('y', centerY - radius);
    img.setAttribute('width', size);
    img.setAttribute('height', size);

    // Border Circle
    const borderId = `border-${owner.replace(/[^a-zA-Z0-9]/g, '')}`;
    let borderCircle = document.getElementById(borderId);
    if (!borderCircle) {
        borderCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        borderCircle.setAttribute('id', borderId);
        borderCircle.setAttribute('fill', 'none');
        borderCircle.setAttribute('stroke', 'white');
        borderCircle.setAttribute('stroke-width', '2');
        borderCircle.style.pointerEvents = 'none';
        group.appendChild(borderCircle);
    }
    borderCircle.setAttribute('cx', centerX);
    borderCircle.setAttribute('cy', centerY);
    borderCircle.setAttribute('r', radius);
}

// Territory Fill Avatar Mode: Profile picture fills all owned cities
function updatePerCityAvatars(owner, imageUrl) {
    if (!imageUrl) return;
    userProfilePics[owner] = imageUrl;

    const svg = document.querySelector('svg');
    const group = document.getElementById('avatar-group');
    const ownerId = owner.toString().replace(/[^a-zA-Z0-9]/g, '');

    // Remove old centroid avatar if exists
    const oldImg = document.getElementById(`avatar-user-${ownerId}`);
    if (oldImg) oldImg.remove();
    const oldClip = document.getElementById(`clip-${ownerId}`);
    if (oldClip) oldClip.remove();
    const oldBorder = document.getElementById(`border-${ownerId}`);
    if (oldBorder) oldBorder.remove();

    // Clean up old per-city elements
    document.querySelectorAll(`[id^="city-avatar-${ownerId}-"]`).forEach(el => el.remove());
    document.querySelectorAll(`[id^="city-clip-${ownerId}-"]`).forEach(el => el.remove());
    document.querySelectorAll(`[id^="city-border-${ownerId}-"]`).forEach(el => el.remove());

    // Get all cities owned by this user
    const userCities = Object.keys(cityOwners).filter(cityId => cityOwners[cityId].owner === owner);

    if (userCities.length === 0) {
        // Remove territory fill if no cities owned
        const existingFill = document.getElementById(`territory-fill-${ownerId}`);
        if (existingFill) existingFill.remove();
        const existingClip = document.getElementById(`territory-clip-${ownerId}`);
        if (existingClip) existingClip.remove();
        return;
    }

    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
    }

    // Create or update clipPath with all city paths combined
    const clipId = `territory-clip-${ownerId}`;
    let clipPath = document.getElementById(clipId);
    if (!clipPath) {
        clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', clipId);
        defs.appendChild(clipPath);
    }
    clipPath.innerHTML = ''; // Clear old paths

    // Add each city's path to the clipPath and calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    userCities.forEach(cityId => {
        const cityPath = document.getElementById(cityId);
        if (cityPath) {
            // Clone the path for clip
            const clonedPath = cityPath.cloneNode(true);
            clonedPath.removeAttribute('id');
            clonedPath.removeAttribute('style');
            clipPath.appendChild(clonedPath);

            // Get bounding box
            try {
                const bbox = cityPath.getBBox();
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            } catch (e) { }
        }
    });

    // Draw the profile image fill
    const fillId = `territory-fill-${ownerId}`;
    let fillImg = document.getElementById(fillId);
    if (!fillImg) {
        fillImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        fillImg.setAttribute('id', fillId);
        fillImg.style.pointerEvents = 'none';
        group.appendChild(fillImg);
    }

    const width = maxX - minX;
    const height = maxY - minY;

    fillImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageUrl);
    fillImg.setAttribute('clip-path', `url(#${clipId})`);
    fillImg.setAttribute('x', minX);
    fillImg.setAttribute('y', minY);
    fillImg.setAttribute('width', width);
    fillImg.setAttribute('height', height);
    fillImg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
}

// Wrapper function to call the correct avatar mode
function updateAvatar(owner, imageUrl) {
    if (avatarDisplayMode === 'per-city') {
        updatePerCityAvatars(owner, imageUrl);
    } else {
        updateEmpireAvatar(owner, imageUrl);
    }
}

function updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    const sorted = Object.keys(userCityCounts)
        .filter(user => userCityCounts[user] > 0)
        .sort((a, b) => userCityCounts[b] - userCityCounts[a]);

    // Top 10 for horizontal marquee bar
    sorted.slice(0, 10).forEach((user, index) => {
        const displayName = userNicknames[user] || user;
        const li = document.createElement('li');
        li.className = 'leader-item';

        let rankIcon = `<span class="rank-num">#${index + 1}</span>`;
        if (index === 0) {
            rankIcon = '👑';
            li.classList.add('ruler-glow');
        }

        const avatarUrl = userProfilePics[user] || 'https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg';

        li.innerHTML = `
            <span class="rank">${rankIcon}</span>
            <img class="leader-avatar" src="${avatarUrl}" onerror="this.src='https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg'">
            <div class="user-info">
                <span class="user-name" style="color:${userColors[user]}">${displayName}</span>
                <span class="city-count">${userCityCounts[user]} Şehir</span>
            </div>
        `;
        list.appendChild(li);
    });
}

// ----------------------
// RULERS HALL OF FAME (YAYINCI BAZLI)
// ----------------------
let pastRulers = JSON.parse(localStorage.getItem(`tiktokRulers_${currentStreamer}`)) || [];

function saveRuler(name, avatar, displayNickname = null) {
    const timestamp = Date.now();
    // Record with date and seconds: DD/MM/YYYY HH:MM:SS
    const date = new Date().toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    // Use provided nickname, or lookup, or fallback to name
    const nickname = displayNickname || userNicknames[name] || name;
    pastRulers.unshift({ name, avatar, date, timestamp, nickname }); // Add to top (newest at index 0)
    if (pastRulers.length > 2000) pastRulers.pop();
    localStorage.setItem(`tiktokRulers_${currentStreamer}`, JSON.stringify(pastRulers));
    renderRulers();
}

// Special Helper for Multiple Points
function addRulerPoints(name, points, avatar, displayNickname = null) {
    for (let i = 0; i < points; i++) {
        saveRuler(name, avatar, displayNickname);
    }
}

// Show all rulers with scrolling animation
const MAX_RULERS_SHOWN = 999;

function renderRulers() {
    const list = document.getElementById('rulers-list');
    const topList = document.getElementById('top-rulers-list');
    if (!list || !topList) return;

    list.innerHTML = '';
    topList.innerHTML = '';

    // Aggregate Rulers - Iterate OLDEST to NEWEST
    const rulerCounts = {};
    for (let i = pastRulers.length - 1; i >= 0; i--) {
        const r = pastRulers[i];
        // Normalize name to lowercase to prevent duplicates from case differences
        const normalizedName = (r.name || '').toString().toLowerCase();
        if (!rulerCounts[normalizedName]) {
            rulerCounts[normalizedName] = {
                ...r,
                name: r.name, // Keep original for display
                count: 0,
                // Fallback for old data: use 0 as oldest or date check
                firstTime: r.timestamp || 0
            };
        }
        rulerCounts[normalizedName].count++;
        rulerCounts[normalizedName].avatar = r.avatar; // Keep latest avatar
        if (r.nickname) rulerCounts[normalizedName].nickname = r.nickname; // Keep latest nickname
    }

    // Convert to Array, Sort by Count DESC, then FirstTime ASC (First come first served)
    const aggregatedRulers = Object.values(rulerCounts)
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.firstTime - b.firstTime; // Smaller timestamp = Earlier
        })
        .slice(0, MAX_RULERS_SHOWN);

    aggregatedRulers.forEach((ruler, index) => {
        const li = document.createElement('li');
        li.className = 'ruler-entry';

        // Special styling for top 3
        let rankBadge = '';
        let specialClass = '';
        if (index === 0) {
            rankBadge = '👑';
            specialClass = 'ruler-gold';
        } else if (index === 1) {
            rankBadge = '🥈';
            specialClass = 'ruler-silver';
        } else if (index === 2) {
            rankBadge = '🥉';
            specialClass = 'ruler-bronze';
        } else {
            rankBadge = `${index + 1}.`;
        }

        if (specialClass) li.classList.add(specialClass);

        let countDisplay = `<span class="ruler-count">${ruler.count}</span>`;

        // Use Nickname from history or global cache
        const displayName = ruler.nickname || userNicknames[ruler.name] || ruler.name;

        // Dynamic Font Size for Long Names
        let fontSize = '0.95em';
        if (displayName.length > 18) fontSize = '0.7em';
        else if (displayName.length > 14) fontSize = '0.8em';
        else if (displayName.length > 10) fontSize = '0.9em';

        li.innerHTML = `
            <span class="ruler-rank">${rankBadge}</span>
            <img src="${ruler.avatar}" onerror="this.src='https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg'">
            <div class="ruler-info">
                <div class="ruler-name" style="font-size:${fontSize}">${displayName}</div>
            </div>
            <div class="ruler-controls">
                ${countDisplay}
                <div class="ruler-btn-group">
                    <button class="ruler-btn ruler-minus" data-ruler="${encodeURIComponent(ruler.name)}" data-delta="-1">−</button>
                    <button class="ruler-btn ruler-plus" data-ruler="${encodeURIComponent(ruler.name)}" data-delta="1">+</button>
                </div>
            </div>
        `;

        if (index < 3) {
            topList.appendChild(li);
        } else {
            list.appendChild(li);
        }
    });

    // Event Delegation for both lists
    const setupDelegation = (element) => {
        if (element && !element.hasAttribute('data-delegated')) {
            element.setAttribute('data-delegated', 'true');
            element.addEventListener('click', function (e) {
                const btn = e.target.closest('.ruler-btn');
                if (btn) {
                    const name = decodeURIComponent(btn.dataset.ruler);
                    const delta = parseInt(btn.dataset.delta);
                    adjustRulerCount(name, delta);
                }
            });
        }
    };

    setupDelegation(list);
    setupDelegation(topList);

    // Manual Interaction Support
    if (container && !container.hasAttribute('data-scroll-init')) {
        container.setAttribute('data-scroll-init', 'true');
        container.addEventListener('mouseleave', () => {
            updateRulerScroll();
        });
    }

    // Handle Scrolling Animation
    updateRulerScroll();
}

function updateRulerScroll() {
    const list = document.getElementById('rulers-list');
    const container = document.getElementById('rulers-list-container');
    if (!list || !container) return;

    // Don't restart/interfere if being manually scrolled (hovered)
    if (container.matches(':hover')) return;

    const visibleHeight = container.offsetHeight;
    const listHeight = list.scrollHeight;

    if (listHeight > visibleHeight) {
        const scrollDist = listHeight - visibleHeight;
        const currentDist = list.style.getPropertyValue('--ruler-scroll-dist');
        const newDist = '-' + scrollDist + 'px';

        if (currentDist !== newDist) {
            list.style.animation = 'none';
            void list.offsetHeight;
            const duration = Math.max(10, scrollDist / 15);
            list.style.setProperty('--ruler-scroll-dist', newDist);
            list.style.animation = 'rulerScrollVertical ' + duration + 's ease-in-out infinite alternate';
        }
    } else {
        list.style.animation = 'none';
        list.style.transform = 'translateY(0)';
    }
}

// Adjust ruler count by delta (+1 or -1)
function adjustRulerCount(name, delta) {
    const searchName = name.toLowerCase();
    const currentCount = pastRulers.filter(r => r.name.toLowerCase() === searchName).length;
    const newCount = currentCount + delta;

    if (newCount < 0) return;

    if (delta > 0) {
        const existing = pastRulers.find(r => r.name.toLowerCase() === searchName);
        const timestamp = Date.now();
        const date = new Date().toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        pastRulers.unshift({
            name: existing ? existing.name : name,
            avatar: existing ? existing.avatar : 'https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg',
            date: date,
            timestamp: timestamp,
            nickname: existing ? existing.nickname : (userNicknames[name] || name)
        });
    } else if (delta < 0 && currentCount > 0) {
        // Remove the NEWEST one when decreasing
        for (let i = 0; i < pastRulers.length; i++) {
            if (pastRulers[i].name.toLowerCase() === searchName) {
                pastRulers.splice(i, 1);
                break;
            }
        }
    }

    localStorage.setItem(`tiktokRulers_${currentStreamer}`, JSON.stringify(pastRulers));
    renderRulers();
}

function resetRulers() {
    if (confirm("Hükümdarlar listesini silmek istediğine emin misin?")) {
        pastRulers = [];
        localStorage.removeItem(`tiktokRulers_${currentStreamer}`);
        renderRulers();
        showNotification("🗑️ Hükümdarlar Silindi!");
    }
}

// Initialize Rulers on Load
window.addEventListener('load', renderRulers);


const DEFAULT_COLORS = [
    '#FF3B30', '#34C759', '#007AFF', '#FF9500', '#AF52DE', '#5856D6', '#FF2D55', '#5AC8FA',
    '#FFCC00', '#FF3037', '#00DF6D', '#00CCFF', '#F08080', '#FF1493', '#7FFF00', '#00FFFF',
    '#FF4500', '#DA70D6', '#B0C4DE', '#FFFF00', '#ADFF2F', '#FF00FF', '#7B68EE', '#40E0D0',
    '#EE82EE', '#F5DEB3', '#D2691E', '#CD5C5C', '#F4A460', '#9ACD32', '#66CDAA', '#87CEEB',
    '#BC8F8F', '#FFD700', '#9370DB', '#3CB371', '#FFA07A', '#DB7093', '#48D1CC', '#6495ED'
];

let COLOR_PALETTE = JSON.parse(localStorage.getItem('tiktokColorPalette')) || [...DEFAULT_COLORS];

let isColorShuffleEnabled = localStorage.getItem('tiktokColorShuffleEnabled') === 'true'; // Default False (Ordered)
let shuffledPalette = [];
let colorIndex = 0;

function shufflePalette() {
    shuffledPalette = [...COLOR_PALETTE];
    for (let i = shuffledPalette.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPalette[i], shuffledPalette[j]] = [shuffledPalette[j], shuffledPalette[i]];
    }
}

// Initial shuffle
shufflePalette();

function getRandomColor() {
    // If shuffle is enabled, use shuffledPalette, otherwise use COLOR_PALETTE in order
    const palette = isColorShuffleEnabled ? shuffledPalette : COLOR_PALETTE;
    if (palette.length === 0) return '#ffffff';

    const color = palette[colorIndex % palette.length];
    colorIndex++;
    return color;
}

function showNotification(text, type = 'info') {
    if (!notificationsEnabled) return; // Check toggle
    const area = document.getElementById('notification-area');
    area.innerHTML = ''; // Clear previous notifications
    const note = document.createElement('div');
    note.className = `notification notification-${type}`;
    note.innerHTML = text;
    area.appendChild(note);

    // Warning mesajları daha uzun kalssın
    const duration = type === 'warning' ? 6000 : 4000;
    setTimeout(() => note.remove(), duration);
}


// ----------------------
// MANUAL ASSIGNMENT FUNCTIONS
// ----------------------
function openManualAssignModal(cityId) {
    const cityPath = document.getElementById(cityId);
    if (!cityPath) return;

    const cityName = cityPath.getAttribute('name') || cityId;
    const modal = document.getElementById('manual-assign-modal');
    const title = document.getElementById('assign-city-title');
    const list = document.getElementById('assign-user-list');

    title.innerText = `Şehir Ata: ${cityName}`;
    list.innerHTML = '';

    // Get current players (those who own at least one city or are in leaderboard)
    const activeUsers = Object.keys(userCityCounts).filter(u => userCityCounts[u] > 0);

    // If no active users, show a message
    if (activeUsers.length === 0) {
        list.innerHTML = '<div style="color:#aaa; text-align:center; padding:20px;">Henüz aktif oyuncu yok.</div>';
    } else {
        // Sort active users by city count
        activeUsers.sort((a, b) => userCityCounts[b] - userCityCounts[a]);

        activeUsers.forEach(user => {
            const displayName = userNicknames[user] || user;
            const avatar = userProfilePics[user] || 'https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg';

            const item = document.createElement('div');
            item.className = 'assign-user-item';
            item.onclick = () => assignCityManually(cityId, user);

            item.innerHTML = `
                <img src="${avatar}" class="assign-avatar" onerror="this.src='https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg'">
                <span class="assign-name" style="color:${userColors[user]}">${displayName}</span>
                <span style="color:#ffd700; font-size:0.8em; font-weight:bold;">${userCityCounts[user]}🏙️</span>
            `;
            list.appendChild(item);
        });
    }

    modal.classList.add('active');
}

function closeAssignModal() {
    const modal = document.getElementById('manual-assign-modal');
    modal.classList.remove('active');
}

function assignCityManually(cityId, user) {
    const color = userColors[user];
    const avatar = userProfilePics[user];

    conquerCity(cityId, user, color, avatar);
    updateLeaderboard();
    closeAssignModal();

    const cityName = document.getElementById(cityId).getAttribute('name') || cityId;
    showNotification(`⚡ MOD: ${cityName} şehri ${userNicknames[user] || user} kullanıcısına atandı!`);
}

// ----------------------
// SETTINGS FUNCTIONS
// ----------------------
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal.style.display === 'flex') {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    } else {
        modal.style.display = 'flex';
        // Force reflow
        void modal.offsetWidth;
        modal.classList.add('active');
        renderGiftSettings();
    }
}

// Tab Switching Logic
window.openTab = function (evt, tabName) {
    const contents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < contents.length; i++) {
        contents[i].className = contents[i].className.replace(' active', '');
    }
    const tabs = document.getElementsByClassName('tab-btn');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].className = tabs[i].className.replace(' active', '');
    }
    document.getElementById(tabName).className += ' active';
    evt.currentTarget.className += ' active';
};

function renderGiftSettings() {
    const container = document.getElementById('gift-list-container');
    container.innerHTML = '';

    // --- TABS HEADER ---
    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'settings-tabs';
    tabsHeader.innerHTML = `
        <button class="tab-btn active" onclick="openTab(event, 'tab-general')">⚙️ Genel</button>
        <button class="tab-btn" onclick="openTab(event, 'tab-colors')">🎨 Renkler</button>
        <button class="tab-btn" onclick="openTab(event, 'tab-ruler')">👑 Hükümdar</button>
        <button class="tab-btn" onclick="openTab(event, 'tab-gift')">🎁 Fetih</button>
    `;
    container.appendChild(tabsHeader);

    // --- TAB 1: GENERAL (Likes + Reset) ---
    const tabGeneral = document.createElement('div');
    tabGeneral.id = 'tab-general';
    tabGeneral.className = 'tab-content active';
    tabGeneral.innerHTML = `
        <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:5px; margin-top:0;">👍 Beğeni & Diğer</h3>
    `;

    // --- TAB 2: RULER GIFTS ---
    const tabRuler = document.createElement('div');
    tabRuler.id = 'tab-ruler';
    tabRuler.className = 'tab-content';
    tabRuler.innerHTML = `
        <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:5px; margin-top:0;">👑 Hükümdarlık Puanları</h3>
    `;

    // --- TAB 4: COLOR PALETTE ---
    const tabColors = document.createElement('div');
    tabColors.id = 'tab-colors';
    tabColors.className = 'tab-content';
    tabColors.innerHTML = `
        <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:5px; margin-top:0;">🎨 Harita Renk Paleti</h3>
        <div class="gift-setting-item" style="margin-bottom:15px; background:rgba(255,255,255,0.05); padding:10px; border-radius:10px;">
            <span class="gift-name">🎲 Renkleri Karıştır</span>
            <label class="toggle-switch">
                <input type="checkbox" id="setting-color-shuffle" ${isColorShuffleEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>
        <div id="color-palette-editor" style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px;"></div>
        <div style="display:flex; gap:10px; margin-top:10px; border-top:1px solid #333; padding-top:15px;">
            <input type="color" id="new-color-picker" value="#ff0000" style="width:50px; height:40px; border:none; padding:0; background:none; cursor:pointer;">
            <button class="save-btn" style="flex:1; background:#34c759; margin:0;" onclick="addColorToPalette()">➕ Ekle</button>
            <button class="save-btn" style="flex:1; background:#546de5; margin:0;" onclick="shufflePaletteManual()">🔀 Karıştır</button>
        </div>
        <p style="font-size:0.8em; color:#aaa; margin-top:15px;">
            <b>Renk Sırası:</b> 1. Renk 1. kişiye verilir. Karıştırma açıksa rastgele verilir.
        </p>
    `;

    function renderPaletteEditor() {
        const editor = tabColors.querySelector('#color-palette-editor');
        editor.innerHTML = '';
        COLOR_PALETTE.forEach((color, idx) => {
            const div = document.createElement('div');
            div.style.cssText = `width:42px; height:42px; border-radius:50%; background:${color}; border:2px solid #fff; position:relative; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold; color:rgba(255,255,255,0.8); font-size:12px; text-shadow:0 0 3px #000;`;
            div.innerHTML = idx + 1; // Order number
            div.title = "Silmek için tıkla";
            div.onclick = () => {
                COLOR_PALETTE.splice(idx, 1);
                renderPaletteEditor();
            };
            // Delete icon on hover (via CSS/Internal)
            const removeIcon = document.createElement('span');
            removeIcon.innerHTML = '×';
            removeIcon.style.cssText = 'position:absolute; top:-5px; right:-5px; background:red; color:white; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; box-shadow:0 0 5px #000;';
            div.appendChild(removeIcon);
            editor.appendChild(div);
        });
    }

    window.shufflePaletteManual = () => {
        // Simple shuffle
        for (let i = COLOR_PALETTE.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [COLOR_PALETTE[i], COLOR_PALETTE[j]] = [COLOR_PALETTE[j], COLOR_PALETTE[i]];
        }
        renderPaletteEditor();
    };

    window.addColorToPalette = () => {
        const color = document.getElementById('new-color-picker').value;
        if (!COLOR_PALETTE.includes(color)) {
            COLOR_PALETTE.push(color);
            renderPaletteEditor();
        }
    };

    renderPaletteEditor();

    // NEW SECTION: ACTIVE PLAYER COLORS
    const playerColorsSection = document.createElement('div');
    playerColorsSection.style.marginTop = "20px";
    playerColorsSection.style.borderTop = "1px solid #333";
    playerColorsSection.style.paddingTop = "10px";
    playerColorsSection.innerHTML = `<h3 style="color:#fff; margin-bottom:10px;">👤 Oyuncu Renkleri</h3>`;

    const activeUsers = Object.keys(userCityCounts).filter(u => userCityCounts[u] > 0);

    if (activeUsers.length === 0) {
        playerColorsSection.innerHTML += '<div style="color:#aaa;">Henüz şehir sahibi oyuncu yok.</div>';
    } else {
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '8px';

        activeUsers.sort((a, b) => userCityCounts[b] - userCityCounts[a]);

        activeUsers.forEach(user => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.background = 'rgba(255,255,255,0.05)';
            row.style.padding = '8px 12px';
            row.style.borderRadius = '8px';

            const nameBox = document.createElement('div');
            nameBox.style.display = 'flex';
            nameBox.style.alignItems = 'center';
            nameBox.style.gap = '8px';

            const avatarUrl = userProfilePics[user] || 'https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg';
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.borderRadius = '50%';

            const nameSpan = document.createElement('span');
            nameSpan.innerText = userNicknames[user] || user;
            nameSpan.style.color = '#fff';
            nameSpan.style.fontWeight = 'bold';
            nameSpan.style.fontSize = '0.9em';

            nameBox.appendChild(img);
            nameBox.appendChild(nameSpan);

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = userColors[user] || '#ffffff';
            colorInput.style.border = 'none';
            colorInput.style.width = '40px';
            colorInput.style.height = '30px';
            colorInput.style.cursor = 'pointer';
            colorInput.style.backgroundColor = 'transparent';

            colorInput.onchange = (e) => {
                const newColor = e.target.value;
                updateUserColor(user, newColor);
            };

            row.appendChild(nameBox);
            row.appendChild(colorInput);
            list.appendChild(row);
        });
        playerColorsSection.appendChild(list);
    }

    tabColors.appendChild(playerColorsSection);

    // --- TAB 3: CONQUEST GIFTS ---
    const tabGift = document.createElement('div');
    tabGift.id = 'tab-gift';
    tabGift.className = 'tab-content';
    tabGift.innerHTML = `
        <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:5px; margin-top:0;">🎁 Fetih Hediyeleri</h3>
    `;

    // --- POPULATE TAB 2 (RULER) ---
    // Extract special gifts from common defaults defined in gifts.js
    const specialGifts = Object.keys(defaultRulerValues).map(name => ({
        name: name,
        default: defaultRulerValues[name]
    }));
    specialGifts.forEach(item => {
        const giftObj = TICKTOK_GIFTS.find(g => g.name === item.name);
        const iconUrl = (giftObj && giftObj.icon) ? giftObj.icon : 'https://p16-tiktokcdn-com.akamaized.net/obj/v0201/default_avatar.jpeg';
        const currentValue = configuredRulerValues[item.name] !== undefined ? configuredRulerValues[item.name] : item.default;

        const div = document.createElement('div');
        div.className = 'gift-setting-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                <img src="${iconUrl}" width="30" height="30" style="margin-right:10px; border-radius:5px;">
                <span class="gift-name">${item.name}</span>
            </div>
            <input type="number" id="setting-ruler-${item.name.replace(/ /g, '-')}" class="gift-input" value="${currentValue}" min="1">
        `;
        tabRuler.appendChild(div);
    });

    // --- POPULATE TAB 1 (GENERAL) ---
    const likeSection = document.createElement('div');
    likeSection.innerHTML = `
        <div class="gift-setting-item">
            <span class="gift-name">Hedef Beğeni (Goal)</span>
            <input type="number" id="setting-like-goal" class="gift-input" value="${likeGoal}" min="10">
        </div>
        <div class="gift-setting-item">
            <span class="gift-name">Ödül Şehir Sayısı</span>
            <input type="number" id="setting-city-reward" class="gift-input" value="${cityRewardPerGoal}" min="1">
        </div>
        <div class="gift-setting-item">
            <span class="gift-name">📢 Bildirimler</span>
            <label class="toggle-switch">
                <input type="checkbox" id="setting-notifications" ${notificationsEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>
        <div class="gift-setting-item">
            <span class="gift-name">🗺️ Avatar (Her Şehirde)</span>
            <label class="toggle-switch">
                <input type="checkbox" id="setting-avatar-mode" ${avatarDisplayMode === 'per-city' ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>
        <div class="gift-setting-item">
            <span class="gift-name">⏱️ Koruma Süresi (sn)</span>
            <input type="number" id="setting-protection-duration" class="gift-input" value="${protectionDuration}" min="10" max="300">
        </div>
        <div class="gift-setting-item">
            <span class="gift-name">💥 Animasyon Süresi (sn)</span>
            <input type="number" id="setting-domination-duration" class="gift-input" value="${dominationAnimationDuration}" min="1" max="15">
        </div>
        <div style="margin-top:20px; padding-top:10px; border-top:1px solid #444;">
            <h4 style="margin:0 0 10px 0; color:#ffd700;">Takip Ödülü</h4>
            <div class="gift-setting-item">
                <span class="gift-name">🎁 Takip Ödülü Aktif</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="setting-follow-reward" ${followRewardEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="gift-setting-item">
                <span class="gift-name">🏙️ Takipçi Şehir Sayısı</span>
                <input type="number" id="setting-follow-city-reward" class="gift-input" value="${cityRewardPerFollow}" min="1">
            </div>
        </div>
    `;
    tabGeneral.appendChild(likeSection);

    const resetSection = document.createElement('div');
    resetSection.style.marginTop = "20px";
    resetSection.style.paddingTop = "20px";
    resetSection.style.borderTop = "1px solid #333";
    resetSection.innerHTML = `
        <p style="color:#aaa; font-size:0.9em; margin-bottom:10px;">Veri Yönetimi:</p>
        <button class="reset-btn" onclick="resetGiftSettings()" id="reset-settings-btn" style="width:100%; margin-bottom:10px;">⚡ Ayarları Sıfırla</button>
        <button class="reset-btn" onclick="resetRulers()" style="width:100%; background:#444;">📜 Hükümdar Geçmişini Sil</button>
    `;
    tabGeneral.appendChild(resetSection);

    // --- POPULATE TAB 3 (GIFT LIST) ---
    const allKeys = new Set([...TICKTOK_GIFTS.map(g => g.name), ...Object.keys(configuredGiftValues)]);

    allKeys.forEach(name => {
        let displayIcon = null;
        if (cachedGiftIcons[name]) {
            displayIcon = cachedGiftIcons[name];
        } else {
            const giftObj = TICKTOK_GIFTS.find(g => g.name === name);
            if (giftObj && giftObj.icon) {
                displayIcon = giftObj.icon;
            }
        }

        if (!displayIcon || !displayIcon.startsWith('http')) return;

        let val = 1;
        if (configuredGiftValues[name] !== undefined) {
            val = configuredGiftValues[name];
        } else {
            const giftObj = TICKTOK_GIFTS.find(g => g.name === name);
            if (giftObj) val = giftObj.cost;
        }

        const div = document.createElement('div');
        div.className = 'gift-setting-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                <img src="${displayIcon}" width="30" height="30" style="margin-right:10px; border-radius:5px;">
                <span class="gift-name">${name}</span>
            </div>
            <div style="display:flex; align-items:center;">
                <span style="font-size:0.8em; color:#666; margin-right:5px;">Şehir:</span>
                <input type="number" class="gift-input gift-value-input" data-gift="${name}" value="${val}" min="1">
            </div>
        `;
        tabGift.appendChild(div);
    });

    container.appendChild(tabGeneral);
    container.appendChild(tabColors);
    container.appendChild(tabRuler);
    container.appendChild(tabGift);
}

function updateUserColor(user, newColor) {
    // 1. Update State
    userColors[user] = newColor;

    // 2. Update Map Polygons
    const userCities = Object.keys(cityOwners).filter(cityId => cityOwners[cityId].owner === user);
    userCities.forEach(cityId => {
        cityOwners[cityId].color = newColor;
        const path = document.getElementById(cityId);
        if (path) {
            path.style.fill = newColor;
        }
    });

    // 3. Update Leaderboard (to reflect text color change)
    updateLeaderboard();

    // 4. Notify - Optional, maybe too noisy
    // showNotification(`🎨 ${userNicknames[user] || user} rengi güncellendi!`);
}

let resetConfirmationTimeout;

function resetGiftSettings() {
    const btn = document.getElementById('reset-settings-btn');

    if (btn.innerText.includes('Sıfırla')) {
        // First Click: Ask Confirmation
        btn.innerText = "⚠️ Emin misin?";
        btn.style.background = "red";

        resetConfirmationTimeout = setTimeout(() => {
            btn.innerText = "🔄 Sıfırla";
            btn.style.background = "#ff4757"; // Original color
        }, 3000);
    } else {
        // Second Click: Confirm
        clearTimeout(resetConfirmationTimeout);
        btn.innerText = "🔄 Sıfırla";
        btn.style.background = "#ff4757";

        configuredGiftValues = {};
        TICKTOK_GIFTS.forEach(g => { configuredGiftValues[g.name] = g.cost; });
        localStorage.setItem('tiktokGiftValues', JSON.stringify(configuredGiftValues));

        renderGiftSettings(); // Re-render logic
        showNotification("🔄 Ayarlar Fabrika Ayarlarına Döndü!");
    }
}

function saveSettings() {
    // Save Ruler Values
    const rulerInputs = document.querySelectorAll('[id^="setting-ruler-"]');
    rulerInputs.forEach(input => {
        const giftName = input.id.replace('setting-ruler-', '').replace(/-/g, ' ');
        const value = parseInt(input.value);
        if (!isNaN(value)) {
            configuredRulerValues[giftName] = value;
        }
    });
    localStorage.setItem('tiktokRulerValues', JSON.stringify(configuredRulerValues));

    // Save Likes
    const newLikeGoal = parseInt(document.getElementById('setting-like-goal').value);
    const newCityReward = parseInt(document.getElementById('setting-city-reward').value);

    if (newLikeGoal > 0) likeGoal = newLikeGoal;
    if (newCityReward > 0) cityRewardPerGoal = newCityReward;

    localStorage.setItem('tiktokLikeGoal', likeGoal);
    localStorage.setItem('tiktokCityReward', cityRewardPerGoal);

    // Save Notifications Toggle
    const notifCheckbox = document.getElementById('setting-notifications');
    if (notifCheckbox) {
        notificationsEnabled = notifCheckbox.checked;
        localStorage.setItem('tiktokNotifications', notificationsEnabled ? 'true' : 'false');
    }

    // Save Avatar Display Mode
    const avatarModeCheckbox = document.getElementById('setting-avatar-mode');
    if (avatarModeCheckbox) {
        avatarDisplayMode = avatarModeCheckbox.checked ? 'per-city' : 'centroid';
        localStorage.setItem('tiktokAvatarMode', avatarDisplayMode);
    }

    // Save Protection Duration
    const protectionInput = document.getElementById('setting-protection-duration');
    if (protectionInput) {
        const newDuration = parseInt(protectionInput.value);
        if (newDuration >= 10 && newDuration <= 300) {
            protectionDuration = newDuration;
            localStorage.setItem('tiktokProtectionDuration', protectionDuration);
        }
    }

    // Save Domination Duration
    const domDurationInput = document.getElementById('setting-domination-duration');
    if (domDurationInput) {
        dominationAnimationDuration = parseInt(domDurationInput.value) || 3;
        localStorage.setItem('tiktokDominationDuration', dominationAnimationDuration);
    }

    // Save Gifts
    const inputs = document.querySelectorAll('.gift-value-input');
    inputs.forEach(input => {
        const name = input.getAttribute('data-gift');
        const val = parseInt(input.value);
        if (val > 0) {
            configuredGiftValues[name] = val;
        }
    });
    localStorage.setItem('tiktokGiftValues', JSON.stringify(configuredGiftValues));

    // Save Follow Settings
    const followCheckbox = document.getElementById('setting-follow-reward');
    if (followCheckbox) {
        followRewardEnabled = followCheckbox.checked;
        localStorage.setItem('tiktokFollowRewardEnabled', followRewardEnabled ? 'true' : 'false');
    }
    const followCityInput = document.getElementById('setting-follow-city-reward');
    if (followCityInput) {
        cityRewardPerFollow = parseInt(followCityInput.value) || 1;
        localStorage.setItem('tiktokCityRewardPerFollow', cityRewardPerFollow);
    }

    // Save Color Settings
    const colorShuffleCheckbox = document.getElementById('setting-color-shuffle');
    if (colorShuffleCheckbox) {
        isColorShuffleEnabled = colorShuffleCheckbox.checked;
        localStorage.setItem('tiktokColorShuffleEnabled', isColorShuffleEnabled ? 'true' : 'false');
    }

    // Save Palette
    localStorage.setItem('tiktokColorPalette', JSON.stringify(COLOR_PALETTE));
    shufflePalette(); // Re-shuffle internal buffer

    toggleSettings();
    showNotification("✅ Ayarlar Kaydedildi!");
}

function resetGame() {
    // 1. Reset Game Data
    Object.keys(cityOwners).forEach(key => delete cityOwners[key]);
    Object.keys(userCityCounts).forEach(key => delete userCityCounts[key]);

    // 2. Reset Map Visuals
    document.querySelectorAll('path').forEach(path => {
        path.style.fill = '#2c3e50'; // Default dark land color
        path.classList.remove('shake-map');
    });

    // 3. Clear Empire Avatars
    const avatarGroup = document.getElementById('avatar-group');
    if (avatarGroup) avatarGroup.innerHTML = '';

    const defs = document.querySelector('svg defs');
    // Clear clipPaths created for avatars
    if (defs) {
        const clips = defs.querySelectorAll('clipPath');
        clips.forEach(c => c.remove());
    }

    // 4. Clear UI
    updateLeaderboard(); // Will be empty
    document.getElementById('notification-area').innerHTML = '';

    // 5. Reset Protection State
    isProtectionActive = false;

    // 6. Reset Followed Reward History for THIS streamer
    rewardedFollowers.clear();
    localStorage.removeItem(`tiktokRewardedFollowers_${currentStreamer}`);

    showNotification("📢 YENİ OYUN BAŞLADI! SALDIRIN!");
}

// ========== CONNECTION MODAL FUNCTIONS ==========

function connectToStreamer() {
    const activationInput = document.getElementById('activation-code-input');
    const streamerInput = document.getElementById('streamer-input');
    const btn = document.getElementById('connect-btn');
    const status = document.getElementById('connection-status');

    const activationCode = activationInput.value.trim();
    const username = streamerInput.value.trim();

    if (!activationCode) {
        status.innerText = '❌ Lütfen aktivasyon kodunu girin!';
        status.className = 'connection-status error';
        activationInput.focus();
        return;
    }

    if (!username) {
        status.innerText = '❌ Lütfen bir kullanıcı adı girin!';
        status.className = 'connection-status error';
        streamerInput.focus();
        return;
    }

    btn.disabled = true;
    btn.innerText = '⏳ Bağlanıyor...';
    status.innerText = `Aktivasyon kodu kontrol ediliyor...`;
    status.className = 'connection-status connecting';

    socket.emit('changeStreamer', { username, activationCode });
}

// Handle connection status from server
socket.on('connectionStatus', (data) => {
    const status = document.getElementById('connection-status');
    const btn = document.getElementById('connect-btn');
    const modal = document.getElementById('connection-modal');

    if (data.success) {
        status.innerText = data.message;
        status.className = 'connection-status success';

        // ÖNEMLİ: Yayıncı adını güncelle (username input'undan al)
        const usernameInput = document.getElementById('streamer-input');
        if (usernameInput && usernameInput.value) {
            currentStreamer = usernameInput.value.trim().replace('@', '');
            console.log(`✅ currentStreamer set to: ${currentStreamer}`);

            // Yayıncıya özel hükümdar listesini yükle
            pastRulers = JSON.parse(localStorage.getItem(`tiktokRulers_${currentStreamer}`)) || [];
            renderRulers();
            console.log(`📜 Loaded ${pastRulers.length} past rulers for ${currentStreamer}`);
        }

        // Başarılı bağlantı bildirimi göster
        showNotification(data.message);

        // Hide modal after successful connection
        setTimeout(() => {
            modal.classList.remove('active');
        }, 1000);
    } else {
        status.innerText = data.message;

        // Reconnecting durumunu kontrol et
        if (data.reconnecting) {
            status.className = 'connection-status connecting';

            // Modal açıksa göster, değilse bildirim
            if (!modal.classList.contains('active')) {
                showNotification(data.message, 'warning');
            }
        } else {
            status.className = 'connection-status error';

            // Hata bildirimi
            showNotification(data.message, 'error');
        }

        if (!data.connecting && !data.reconnecting) {
            btn.disabled = false;
            btn.innerText = '🔗 Bağlan';
        }
    }
});

// Handle room config from server
socket.on('roomConfig', (data) => {
    console.log("Room Config:", data);
    if (data.tiktokUsername) {
        currentStreamer = data.tiktokUsername;
        // Load specific rewarded list for this streamer
        const saved = localStorage.getItem(`tiktokRewardedFollowers_${currentStreamer}`);
        rewardedFollowers = new Set(JSON.parse(saved) || []);
    }

    // If already connected, hide modal
    if (data.connected && data.tiktokUsername) {
        document.getElementById('connection-modal').classList.remove('active');
    }
});

// Enter key support for input
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('streamer-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                connectToStreamer();
            }
        });
        input.focus();
    }
});

// Initial Render
renderRulers();
updateLeaderboard();
renderGiftSettings();
