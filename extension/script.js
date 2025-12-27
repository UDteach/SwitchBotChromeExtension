// API Configuration
const BASE_API_URL = "https://api.switch-bot.com/v1.1";
const CORS_PROXY = "https://corsproxy.io/?";

// Detect if running as Chrome Extension or in browser preview
const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

// Use proxy mode (can be overridden in settings)
let useProxy = localStorage.getItem('sb_use_proxy') === 'true' || !isExtension;

// Helper function to build API URL (handles CORS proxy correctly)
function getApiUrl(endpoint) {
    const fullUrl = BASE_API_URL + endpoint;
    return useProxy ? CORS_PROXY + encodeURIComponent(fullUrl) : fullUrl;
}

// DOM Elements
const timeEl = document.getElementById('time');
const dateEl = document.getElementById('date');
const pinnedGridEl = document.getElementById('pinned-grid');
const devicesGridEl = document.getElementById('devices-grid');
const pinnedSection = document.getElementById('pinned-section');
const mainSection = document.getElementById('main-section');
// Use the container for grouping
const devicesContainer = document.getElementById('devices-container');
const hiddenContainerEl = document.getElementById('hidden-devices-container');
const deviceVisibilityListEl = document.getElementById('device-visibility-list');

const settingsBtn = document.getElementById('settings-btn');
const refreshBtn = document.getElementById('refresh-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const apiTokenInput = document.getElementById('api-token');
const clientSecretInput = document.getElementById('client-secret');

// State
let devices = [];
let lastUpdated = new Date(); // Track last update time
let nextUpdate = new Date();  // Track next scheduled update
let layout = {
    pinned: [], // Array of deviceIds
    order: [],  // Array of deviceIds in main list (optional, for sorting)
    hidden: []  // Array of hidden deviceIds
};

// Appearance settings
let appearance = {
    tileSize: 'medium',    // small, medium, large
    showIcons: true,
    showDetails: true,
    refreshInterval: 30    // seconds (0 = off)
};

// --- User Interaction Utils ---
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            z-index: 1000; display: flex; flex-direction: column; gap: 10px;
        `;
        document.body.appendChild(container); // Don't block
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px;
        backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);
        font-size: 0.9rem; animation: fadeInOut 3s forwards; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    `;

    // Add custom animation if not exists (check hacky way or just assume global CSS handles it or script injected once)
    if (!document.getElementById('toast-style')) {
        const styleSheet = document.createElement("style");
        styleSheet.id = 'toast-style';
        styleSheet.innerText = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(20px); }
                10% { opacity: 1; transform: translateY(0); }
                90% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(styleSheet);
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) container.remove();
    }, 3000);
}

// --- Clock Logic ---
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeEl.innerHTML = `${hours}:${minutes}<span class="seconds">:${seconds}</span>`;

    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
    dateEl.textContent = now.toLocaleDateString('ja-JP', options);

    // Update Timer Display
    updateTimerDisplay();
}
setInterval(updateClock, 1000);
updateClock();

function updateTimerDisplay() {
    const statusEl = document.getElementById('update-status');
    if (!statusEl) return;

    // Calculate time until next update
    // Note: 'nextUpdate' needs to be set when we schedule the timer.
    // If auto-refresh is off (scale=0), show nothing or "Manual".

    if (appearance.refreshInterval === 0) {
        const lastStr = lastUpdated.toLocaleTimeString('ja-JP');
        statusEl.innerHTML = `最終更新: ${lastStr} (手動)`;
        return;
    }

    const now = new Date();
    let diff = Math.ceil((nextUpdate - now) / 1000);
    if (diff < 0) diff = 0;

    const lastStr = lastUpdated.toLocaleTimeString('ja-JP');
    statusEl.innerHTML = `最終更新: ${lastStr} <span style="opacity:0.5; margin:0 4px">|</span> 次回: ${diff}秒後`;
}

// --- Weather Widget ---
async function fetchWeather() {
    const weatherWidget = document.getElementById('weather-widget');
    if (!weatherWidget) return;

    try {
        // Use wttr.in API (no API key needed)
        const response = await fetch('https://wttr.in/?format=j1');
        const data = await response.json();

        const current = data.current_condition[0];
        const temp = current.temp_C;
        const feelsLike = current.FeelsLikeC;
        const humidity = current.humidity;
        const desc = current.weatherDesc[0].value;
        const weatherCode = current.weatherCode;

        // Map weather codes to emoji
        const weatherEmoji = getWeatherEmoji(weatherCode, desc);

        weatherWidget.innerHTML = `
            <div class="weather-icon">${weatherEmoji}</div>
            <div class="weather-temp">${temp}°C</div>
            <div class="weather-details">
                <div>体感 ${feelsLike}°C</div>
                <div>湿度 ${humidity}%</div>
            </div>
        `;
    } catch (error) {
        console.error('[Weather] Fetch error:', error);
        weatherWidget.innerHTML = `<div class="weather-error">🌤️ --°C</div>`;
    }
}

function getWeatherEmoji(code, desc) {
    const lowerDesc = desc.toLowerCase();
    if (lowerDesc.includes('rain') || lowerDesc.includes('drizzle')) return '🌧️';
    if (lowerDesc.includes('snow')) return '❄️';
    if (lowerDesc.includes('thunder')) return '⛈️';
    if (lowerDesc.includes('cloud') || lowerDesc.includes('overcast')) return '☁️';
    if (lowerDesc.includes('partly')) return '⛅';
    if (lowerDesc.includes('fog') || lowerDesc.includes('mist')) return '🌫️';
    if (lowerDesc.includes('clear') || lowerDesc.includes('sunny')) return '☀️';
    return '🌤️';
}

// Fetch weather on load and every 30 minutes
fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000);

// --- Calendar Widget ---
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // Day headers
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    let html = '<div class="calendar-header">';
    days.forEach((day, i) => {
        const cls = i === 0 ? 'sunday' : i === 6 ? 'saturday' : '';
        html += `<div class="calendar-day-name ${cls}">${day}</div>`;
    });
    html += '</div><div class="calendar-days">';

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = (startDayOfWeek + day - 1) % 7;
        const isToday = day === today;
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;

        let cls = 'calendar-day';
        if (isToday) cls += ' today';
        if (isSunday) cls += ' sunday';
        if (isSaturday) cls += ' saturday';

        html += `<div class="${cls}">${day}</div>`;
    }

    html += '</div>';
    calendarGrid.innerHTML = html;
}

renderCalendar();

// --- Secure Storage API (uses chrome.storage in extension, localStorage as fallback) ---
const storage = {
    async get(keys) {
        if (isExtension && chrome.storage && chrome.storage.local) {
            return new Promise(resolve => {
                chrome.storage.local.get(keys, resolve);
            });
        }
        // Fallback to localStorage
        const result = {};
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                try {
                    result[key] = JSON.parse(value);
                } catch {
                    result[key] = value;
                }
            }
        });
        return result;
    },
    async set(data) {
        if (isExtension && chrome.storage && chrome.storage.local) {
            return new Promise(resolve => {
                chrome.storage.local.set(data, resolve);
            });
        }
        // Fallback to localStorage
        Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
        });
    }
};

// --- Settings & Auth ---
async function loadSettings() {
    const data = await storage.get(['sb_token', 'sb_secret', 'sb_use_proxy', 'sb_layout', 'sb_appearance']);

    const token = data.sb_token || '';
    const secret = data.sb_secret || '';
    if (token) apiTokenInput.value = token;
    if (secret) clientSecretInput.value = secret;

    // Load connection mode
    if (data.sb_use_proxy !== undefined) {
        useProxy = data.sb_use_proxy === true || data.sb_use_proxy === 'true';
    }
    document.getElementById('mode-direct').checked = !useProxy;
    document.getElementById('mode-proxy').checked = useProxy;

    // Load layout
    if (data.sb_layout) {
        try {
            layout = typeof data.sb_layout === 'string' ? JSON.parse(data.sb_layout) : data.sb_layout;
        } catch (e) {
            console.error("Invalid layout settings", e);
        }
    }
    if (!layout.pinned) layout.pinned = [];
    if (!layout.order) layout.order = [];
    if (!layout.hidden) layout.hidden = [];

    // Load appearance settings
    if (data.sb_appearance) {
        try {
            const savedAppearance = typeof data.sb_appearance === 'string' ? JSON.parse(data.sb_appearance) : data.sb_appearance;
            appearance = { ...appearance, ...savedAppearance };
        } catch (e) {
            console.error("Invalid appearance settings", e);
        }
    }

    // Apply appearance to UI elements
    const tileSizeEl = document.getElementById('tile-size');
    const showIconsEl = document.getElementById('show-icons');
    const showDetailsEl = document.getElementById('show-details');
    const refreshIntervalEl = document.getElementById('refresh-interval');

    if (tileSizeEl) tileSizeEl.value = appearance.tileSize;
    if (showIconsEl) showIconsEl.checked = appearance.showIcons;
    if (showDetailsEl) showDetailsEl.checked = appearance.showDetails;
    if (refreshIntervalEl) refreshIntervalEl.value = appearance.refreshInterval.toString();

    // Apply tile size class
    applyAppearance();

    return { token, secret };
}

async function saveSettings() {
    // Read appearance from UI
    const tileSizeEl = document.getElementById('tile-size');
    const showIconsEl = document.getElementById('show-icons');
    const showDetailsEl = document.getElementById('show-details');
    const refreshIntervalEl = document.getElementById('refresh-interval');

    appearance.tileSize = tileSizeEl ? tileSizeEl.value : 'medium';
    appearance.showIcons = showIconsEl ? showIconsEl.checked : true;
    appearance.showDetails = showDetailsEl ? showDetailsEl.checked : true;
    appearance.refreshInterval = refreshIntervalEl ? parseInt(refreshIntervalEl.value) : 30;

    await storage.set({
        sb_token: apiTokenInput.value.trim(),
        sb_secret: clientSecretInput.value.trim(),
        sb_use_proxy: document.getElementById('mode-proxy').checked,
        sb_appearance: appearance
    });

    useProxy = document.getElementById('mode-proxy').checked;

    // Apply appearance
    applyAppearance();

    // Restart auto-refresh with new interval
    startAutoRefresh();

    settingsModal.classList.add('hidden');
    showToast("設定を保存しました");
    fetchDevices();
}

function applyAppearance() {
    const gridEl = document.getElementById('devices-grid');
    const pinnedGridEl = document.getElementById('pinned-grid');

    // Apply tile size
    [gridEl, pinnedGridEl].forEach(el => {
        if (el) {
            el.classList.remove('tiles-small', 'tiles-medium', 'tiles-large');
            el.classList.add(`tiles-${appearance.tileSize}`);
        }
    });

    // Apply show/hide icons and details via CSS class on body
    document.body.classList.toggle('hide-icons', !appearance.showIcons);
    document.body.classList.toggle('hide-details', !appearance.showDetails);
}

async function saveLayout() {
    await storage.set({ sb_layout: layout });
}

// --- SwitchBot API ---
async function generateAuthHeader(token, secret) {
    const t = Date.now();
    const nonce = "requestID" + t;
    const data = token + t + nonce;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(data)
    );

    const sign = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return {
        "Authorization": token,
        "sign": sign,
        "nonce": nonce,
        "t": t,
        "Content-Type": "application/json; charset=utf8"
    };
}

async function fetchDevices() {
    const { token, secret } = await loadSettings();
    if (!token || !secret) {
        devicesContainer.innerHTML = '<div class="loading-message">右下の⚙️ボタンからAPI設定を行ってください。</div>';
        return;
    }

    if (devices.length === 0) {
        devicesContainer.innerHTML = '<div class="loading-message">デバイスを探索中...</div>';
    }

    try {
        const apiUrl = getApiUrl('/devices');
        console.log('[SwitchBot] API URL:', apiUrl);
        console.log('[SwitchBot] useProxy:', useProxy);

        const headers = await generateAuthHeader(token, secret);
        console.log('[SwitchBot] Sending request...');

        const response = await fetch(apiUrl, { headers });
        console.log('[SwitchBot] Response status:', response.status);

        const data = await response.json();
        console.log('[SwitchBot] Response data:', data);

        if (data.statusCode !== 100) {
            throw new Error(data.message || "API Auth Error");
        }

        devices = [...data.body.deviceList, ...data.body.infraredRemoteList];
        renderDevices();
        showToast(`デバイス ${devices.length} 台を読み込みました`);
    } catch (error) {
        console.error("[SwitchBot] Fetch Error:", error);
        // Only show error text if empty
        if (devices.length === 0) {
            devicesContainer.innerHTML = `<div class="loading-message" style="color:#ff6b6b">エラー: ${error.message} <br> <small>※ブラウザプレビューではCORSエラーが出る場合があります。</small></div>`;
        }
        showToast("読み込み失敗: " + error.message, 'error');
    }
}

async function controlDevice(deviceId, command, parameter = "default", commandType = "command", tileEl) {
    const { token, secret } = await loadSettings();
    if (!token || !secret) return;

    tileEl.classList.add('active');

    try {
        const headers = await generateAuthHeader(token, secret);
        const body = JSON.stringify({ command, parameter, commandType });

        const response = await fetch(getApiUrl(`/devices/${deviceId}/commands`), {
            method: 'POST',
            headers,
            body
        });
        const data = await response.json();

        if (data.statusCode === 100) {
            showToast("コマンド送信成功");
        } else {
            showToast("コマンド送信失敗: " + data.message, 'error');
            tileEl.classList.remove('active');
        }
        setTimeout(() => tileEl.classList.remove('active'), 1000);

    } catch (error) {
        console.error("Command Error:", error);
        showToast("通信エラー", 'error');
        tileEl.classList.remove('active');
    }
}

// --- Status Fetching ---
async function fetchDeviceStatus(dev, tile) {
    const { token, secret } = await loadSettings();
    if (!token || !secret) return;

    try {
        const headers = await generateAuthHeader(token, secret);
        const response = await fetch(getApiUrl(`/devices/${dev.deviceId}/status`), { headers });
        const data = await response.json();

        if (data.statusCode === 100) {
            updateTileWithStatus(dev, tile, data.body);
        }
    } catch (error) {
        console.warn(`Status error for ${dev.deviceName}:`, error);
    }
}

function updateTileWithStatus(dev, tile, status) {
    const statusEl = tile.querySelector('.tile-status');
    const iconEl = tile.querySelector('.tile-icon');

    let info = dev.deviceType || 'Unknown';
    let isActive = false;
    let details = [];

    // Enhanced Status Logic with detailed info
    const deviceType = dev.deviceType || '';

    switch (deviceType) {
        case "Meter":
        case "MeterPlus":
        case "WoIOSensor":
            if (status.temperature !== undefined) {
                info = `${status.temperature}℃ / ${status.humidity}%`;
                if (status.battery !== undefined) details.push(`🔋${status.battery}%`);
            }
            break;
        case "Hub 2":
            if (status.temperature !== undefined) {
                info = `${status.temperature}℃ / ${status.humidity}%`;
                if (status.lightLevel !== undefined) details.push(`💡${status.lightLevel}`);
            }
            break;
        case "Plug":
        case "Plug Mini (US)":
        case "Plug Mini (JP)":
            if (status.power) {
                isActive = (status.power === "on");
                info = isActive ? "ON" : "OFF";
                // Add voltage, current, power info
                if (status.voltage !== undefined) details.push(`${status.voltage}V`);
                if (status.electricCurrent !== undefined) details.push(`${status.electricCurrent}A`);
                if (status.weight !== undefined) details.push(`${status.weight}W`);
                if (status.electricityOfDay !== undefined) details.push(`本日${status.electricityOfDay}分`);
            }
            break;
        case "Bot":
            if (status.power !== undefined) {
                isActive = (status.power === "on");
                info = isActive ? "ON" : "OFF";
            }
            if (status.battery !== undefined) details.push(`🔋${status.battery}%`);
            break;
        case "Light":
        case "Strip Light":
        case "Color Bulb":
        case "Ceiling Light":
        case "Ceiling Light Pro":
            if (status.power) {
                isActive = (status.power === "on");
                info = isActive ? "ON" : "OFF";
                if (status.brightness !== undefined) details.push(`明るさ${status.brightness}%`);
                if (status.colorTemperature !== undefined) details.push(`${status.colorTemperature}K`);
            }
            break;
        case "Curtain":
        case "Curtain3":
            if (status.slidePosition !== undefined) {
                info = `開閉: ${status.slidePosition}%`;
                isActive = status.slidePosition > 0;
                if (status.battery !== undefined) details.push(`🔋${status.battery}%`);
                if (status.moving !== undefined && status.moving) details.push("移動中");
            }
            break;
        case "Humidifier":
            if (status.humidity !== undefined) info = `${status.humidity}%rh`;
            isActive = (status.power === "on");
            if (status.temperature !== undefined) details.push(`${status.temperature}℃`);
            if (status.lackWater !== undefined && status.lackWater) details.push("⚠️水不足");
            break;
        case "Fan":
        case "Battery Circulator Fan":
            if (status.power) {
                isActive = (status.power === "on");
                info = isActive ? `ON (Lv ${status.fanSpeed || ''})` : "OFF";
                if (status.battery !== undefined) details.push(`🔋${status.battery}%`);
            }
            break;
        case "Lock":
        case "Smart Lock":
        case "Smart Lock Pro":
            if (status.lockState) {
                info = status.lockState === "locked" ? "施錠中" : "解錠中";
                isActive = status.lockState === "unlocked";
                iconEl.textContent = status.lockState === "locked" ? "🔒" : "🔓";
                if (status.battery !== undefined) details.push(`🔋${status.battery}%`);
                if (status.doorState) details.push(status.doorState === "open" ? "ドア開" : "ドア閉");
            }
            break;
        case "Motion Sensor":
            if (status.moveDetected) { info = "動作検知!"; isActive = true; } else { info = "異常なし"; }
            if (status.battery !== undefined) details.push(`🔋${status.battery}%`);
            if (status.brightness) details.push(status.brightness);
            break;
        case "Contact Sensor":
            if (status.openState) {
                info = status.openState === "open" ? "開いています" : "閉じています";
                isActive = status.openState === "open";
            }
            if (status.battery !== undefined) details.push(`🔋${status.battery}%`);
            break;
        case "Robot Vacuum Cleaner S1":
        case "Robot Vacuum Cleaner S1 Plus":
            if (status.workingStatus) {
                info = status.workingStatus;
                isActive = status.workingStatus !== "StandBy" && status.workingStatus !== "Dormant";
            }
            if (status.battery !== undefined) details.push(`🔋${status.battery}%`);
            break;
        default:
            if (status.power) {
                info = status.power.toUpperCase();
                isActive = (status.power === "on");
            }
            break;
    }

    // Combine info and details
    if (details.length > 0) {
        statusEl.innerHTML = `${info}<br><small style="opacity:0.7">${details.join(' ')}</small>`;
    } else {
        statusEl.textContent = info;
    }

    if (isActive) tile.classList.add('active');
    else tile.classList.remove('active');
}

// --- Rendering & Logic ---
function getIconForDevice(type) {
    if (!type) return "📦";
    const map = {
        "Hub Mini": "📡", "Hub Plus": "📡", "Hub 2": "🌡️", "Bot": "🤖", "Curtain": "🪟",
        "Plug": "🔌", "Plug Mini (US)": "🔌", "Plug Mini (JP)": "🔌", "Meter": "🌡️",
        "MeterPlus": "🌡️", "Lock": "🔒", "Keypad": "🔢", "Keypad Touch": "🔢",
        "Remote": "🎮", "Motion Sensor": "🏃", "Contact Sensor": "🚪",
        "Ceiling Light": "💡", "Ceiling Light Pro": "💡", "Color Bulb": "💡",
        "Strip Light": "🌈", "Robot Vacuum Cleaner S1": "🧹", "Robot Vacuum Cleaner S1 Plus": "🧹",
        "Humidifier": "💧", "Indoor Cam": "📷", "Pan/Tilt Cam": "📷",
        "Air Conditioner": "❄️", "TV": "📺", "Light": "💡", "IPTV": "📺",
        "DVD": "📀", "Speaker": "🔊", "Fan": "🌀",
    };
    for (const key in map) { if (type.includes(key)) return map[key]; }
    return "📦";
}

function renderDevices() {
    // Clear containers
    pinnedGridEl.innerHTML = '';

    // Ensure devices-grid exists (might be destroyed by innerHTML replacement)
    let mainGrid = document.getElementById('devices-grid');
    if (!mainGrid) {
        // Recreate the grid
        devicesContainer.innerHTML = '<div id="devices-grid" class="devices-grid"></div>';
        mainGrid = document.getElementById('devices-grid');
    } else {
        mainGrid.innerHTML = '';
    }

    // Filter hidden devices
    const visibleDevices = devices.filter(d => !layout.hidden.includes(d.deviceId));

    const pinnedDevices = visibleDevices.filter(d => layout.pinned.includes(d.deviceId));
    const unpinnedDevices = visibleDevices.filter(d => !layout.pinned.includes(d.deviceId));

    // Render Pinned
    if (pinnedDevices.length > 0) {
        pinnedSection.classList.remove('hidden');
        pinnedDevices.forEach(dev => {
            const tile = createTile(dev, true);
            pinnedGridEl.appendChild(tile);
        });
    } else {
        pinnedSection.classList.add('hidden');
    }

    // Render Unpinned (Single List)
    // Sort unpinned devices based on layout.order
    if (layout.order && layout.order.length > 0) {
        unpinnedDevices.sort((a, b) => {
            const indexA = layout.order.indexOf(a.deviceId);
            const indexB = layout.order.indexOf(b.deviceId);
            // If both are in order list, sort by index
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            // If only A is in list, A comes first
            if (indexA !== -1) return -1;
            // If only B is in list, B comes first
            if (indexB !== -1) return 1;
            // If neither, keep original order (or alphabetical?)
            return 0;
        });
    }

    if (unpinnedDevices.length > 0) {
        unpinnedDevices.forEach(dev => {
            const tile = createTile(dev, false);
            mainGrid.appendChild(tile);
        });
    }

    if (unpinnedDevices.length === 0 && pinnedDevices.length === 0) {
        if (devices.length > 0) {
            mainGrid.innerHTML = '<div class="loading-message">すべてのデバイスが非表示です。設定から再表示できます。</div>';
        } else {
            mainGrid.innerHTML = '<div class="loading-message">デバイスが見つかりません。</div>';
        }
    }

    // Apply appearance settings after rendering
    applyAppearance();
}

function createTile(dev, isPinned) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.draggable = true; // Enable drag
    tile.dataset.id = dev.deviceId;

    const icon = getIconForDevice(dev.deviceType);

    tile.innerHTML = `
        <div class="tile-icon">${icon}</div>
        <div class="tile-name">${dev.deviceName}</div>
        <div class="tile-status">${dev.deviceType}</div>
    `;

    // Click: Control
    tile.addEventListener('click', (e) => {
        // Prevent click when dragging
        if (tile.classList.contains('dragging')) return;
        handleDeviceClick(dev, tile);
    });

    // Right Click: Context Menu (Toggle Pin OR Hide)
    // Custom context menu would be cool, but let's stick to simple logic:
    // User requested "Hide only registered ones". 
    // Maybe we just cycle: Unpinned -> Pinned -> Hidden? No, that's confusing.
    // Right click is standard for "More options".
    // Since we don't have a UI menu, let's implement a simple prompt or confirm?
    // "Pin" was on right click. Now we need "Pin" AND "Hide".
    // Let's make right-click toggle PIN.
    // And Shift+RightClick toggle Hide? Or Long Press?
    // Or just add a small menu.
    // Let's add a small native `confirm` dialog for "Hide" if Shift is held?
    // Or simpler: Left click = Control. Right click = Pin. 
    // How to Hide? 
    // User wants "Show only registered". This usually implies a one-time setup.
    // Let's add the list to Settings Modal directly so they can checklist them?
    // That's cleaner for "Setup". 
    // "Manage Hidden Devices" in settings. 
    // BUT context menu is faster.
    // Let's try: Right Click opens a custom mini menu.

    tile.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.pageX, e.pageY, dev.deviceId);
    });

    // ... drag handlers ... (same as before)
    tile.addEventListener('dragstart', (e) => {
        tile.classList.add('dragging');
        e.dataTransfer.setData('text/plain', dev.deviceId);
        e.dataTransfer.effectAllowed = 'move';
    });

    tile.addEventListener('dragend', () => {
        tile.classList.remove('dragging');
        document.querySelectorAll('.drag-over-zone').forEach(el => el.classList.remove('drag-over-zone'));
    });

    if (!dev.remoteType) fetchDeviceStatus(dev, tile);

    return tile;
}

// Custom Context Menu
function showContextMenu(x, y, deviceId) {
    // Remove existing
    const existing = document.getElementById('context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.style.cssText = `
        position: absolute; top: ${y}px; left: ${x}px;
        background: rgba(30,30,46,0.95); backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;
        padding: 5px 0; z-index: 2000; min-width: 120px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
    `;

    const isPinned = layout.pinned.includes(deviceId);

    const pinOption = document.createElement('div');
    pinOption.textContent = isPinned ? "お気に入り解除" : "お気に入りに追加";
    pinOption.style.cssText = "padding: 8px 15px; cursor: pointer; color: white; font-size: 0.9rem;";
    pinOption.onmouseover = () => pinOption.style.background = "rgba(255,255,255,0.1)";
    pinOption.onmouseout = () => pinOption.style.background = "transparent";
    pinOption.onclick = () => { togglePin(deviceId); menu.remove(); };

    const hideOption = document.createElement('div');
    hideOption.textContent = "非表示にする";
    hideOption.style.cssText = "padding: 8px 15px; cursor: pointer; color: #ff6b6b; font-size: 0.9rem;";
    hideOption.onmouseover = () => hideOption.style.background = "rgba(255,255,255,0.1)";
    hideOption.onmouseout = () => hideOption.style.background = "transparent";
    hideOption.onclick = () => { toggleHidden(deviceId); menu.remove(); };

    menu.appendChild(pinOption);
    menu.appendChild(hideOption);

    document.body.appendChild(menu);

    // Close on click elsewhere
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function toggleHidden(deviceId) {
    if (!layout.hidden.includes(deviceId)) {
        layout.hidden.push(deviceId);

        // Remove from pinned if present
        if (layout.pinned.includes(deviceId)) {
            layout.pinned = layout.pinned.filter(id => id !== deviceId);
        }

        showToast("デバイスを非表示にしました");
    }
    saveLayout();
    renderDevices();
}

function restoreDevice(deviceId) {
    layout.hidden = layout.hidden.filter(id => id !== deviceId);
    saveLayout();
    renderHiddenList(); // Refresh list
    renderDevices(); // Refresh grid
    showToast("デバイスを再表示しました");
}

function renderDeviceVisibilityList() {
    deviceVisibilityListEl.innerHTML = '';

    if (devices.length === 0) {
        deviceVisibilityListEl.innerHTML = '<div class="empty-message">デバイスがありません。まずAPIキーを設定してください。</div>';
        return;
    }

    devices.forEach(dev => {
        const isVisible = !layout.hidden.includes(dev.deviceId);
        const item = document.createElement('div');
        item.className = 'device-visibility-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `visibility-${dev.deviceId}`;
        checkbox.checked = isVisible;
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                // Show device
                layout.hidden = layout.hidden.filter(id => id !== dev.deviceId);
            } else {
                // Hide device
                if (!layout.hidden.includes(dev.deviceId)) {
                    layout.hidden.push(dev.deviceId);
                }
                // Also remove from pinned
                layout.pinned = layout.pinned.filter(id => id !== dev.deviceId);
            }
            saveLayout();
            renderDevices();
        });

        const label = document.createElement('label');
        label.htmlFor = `visibility-${dev.deviceId}`;
        label.innerHTML = `<span class="device-icon">${getIconForDevice(dev.deviceType)}</span> ${dev.deviceName}`;

        const typeSpan = document.createElement('span');
        typeSpan.className = 'device-type';
        typeSpan.textContent = dev.deviceType;

        item.appendChild(checkbox);
        item.appendChild(label);
        item.appendChild(typeSpan);
        deviceVisibilityListEl.appendChild(item);
    });
}

function togglePin(deviceId) {
    if (layout.pinned.includes(deviceId)) {
        layout.pinned = layout.pinned.filter(id => id !== deviceId);
        showToast("お気に入りから外しました");
    } else {
        layout.pinned.push(deviceId);
        showToast("お気に入りに追加しました");
    }
    saveLayout();
    renderDevices();
}

function handleDeviceClick(dev, tile) {
    const type = dev.deviceType || '';
    let command = "turnOn";

    if (type.includes("Bot")) command = "press";
    else if (type.includes("Lock")) command = "lock";

    controlDevice(dev.deviceId, command, "default", "command", tile);
}

// Global Drag Over Handler (for grids)
// We need to attach this to all potential drop targets (grids)
// But since grids are dynamic, let's use event delegation on document or update in render.
document.addEventListener('dragover', (e) => {
    // Check if hovering over a grid
    const grid = e.target.closest('.devices-grid');
    if (grid) {
        e.preventDefault(); // Allow drop
        grid.classList.add('drag-over-zone');
        const afterElement = getDragAfterElement(grid, e.clientX, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (dragging) {
            if (afterElement == null) {
                grid.appendChild(dragging);
            } else {
                grid.insertBefore(dragging, afterElement);
            }
        }
    }
});

// Drop Handler
document.addEventListener('drop', (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const dragging = document.querySelector('.dragging');
    const grid = e.target.closest('.devices-grid');

    if (grid && dragging) {
        grid.classList.remove('drag-over-zone');

        // Determine where we dropped it
        // 1. Is it Pinned Grid?
        if (grid.id === 'pinned-grid') {
            if (!layout.pinned.includes(id)) {
                layout.pinned.push(id);
            }
            // Reorder pinned array based on DOM order
            // ... (Simple implementation: just reload re-render for now to organize arrays)
            // But we want to persist the Grid order. 
            // Let's grab all IDs in the grid
            const newPinnedOrder = Array.from(grid.children).map(c => c.dataset.id);
            layout.pinned = newPinnedOrder;
        } else {
            // Dropped in a main group
            // Remove from pinned if it was there
            if (layout.pinned.includes(id)) {
                layout.pinned = layout.pinned.filter(pid => pid !== id);
            }

            // Save order for main grid
            const newOrder = Array.from(grid.children).map(c => c.dataset.id);
            layout.order = newOrder;
        }

        saveLayout();
        renderDevices(); // Re-render to ensure consistency (and correct group if dropped in wrong group visually)
    }
});

function getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.tile:not(.dragging)')];

    const closestObj = draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        // Distance from center
        const dx = x - (box.left + box.width / 2);
        const dy = y - (box.top + box.height / 2);
        const dist = dx * dx + dy * dy;

        if (closest === null || dist < closest.dist) {
            return { element: child, dist: dist, dx: dx };
        } else {
            return closest;
        }
    }, null);

    if (!closestObj) return null;

    // If we are to the right of the closest element (dx > 0), 
    // we want to insert AFTER it, which means inserting BEFORE its next sibling.
    if (closestObj.dx > 0) {
        return closestObj.element.nextElementSibling;
    } else {
        return closestObj.element;
    }
}

// --- Event Listeners ---
settingsBtn.addEventListener('click', async () => {
    console.log('[UI] Settings button clicked');
    try {
        await loadSettings();
        renderDeviceVisibilityList();
        settingsModal.classList.remove('hidden');
    } catch (e) {
        console.error('[UI] Error opening settings:', e);
        showToast("設定を開けませんでした: " + e.message, "error");
    }
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});
settingsBtn.className = 'footer-btn';
refreshBtn.className = 'footer-btn';

saveSettingsBtn.addEventListener('click', saveSettings);
refreshBtn.addEventListener('click', () => {
    console.log('[UI] Refresh button clicked');
    showToast("更新中...");
    fetchDevices();
});

// --- Auto Refresh ---
let autoRefreshTimer = null;
let statusRefreshTimer = null;

function startAutoRefresh() {
    // Stop existing timers
    stopAutoRefresh();

    // If refresh is disabled, don't start timers
    if (appearance.refreshInterval === 0) {
        console.log('[SwitchBot] Auto refresh is disabled');
        return;
    }

    // Auto refresh device list every 5 minutes
    autoRefreshTimer = setInterval(() => {
        console.log('[SwitchBot] Auto refreshing device list...');
        fetchDevices();
    }, 5 * 60 * 1000); // 5 minutes

    // Auto refresh individual device status based on settings
    const intervalMs = appearance.refreshInterval * 1000;
    console.log(`[SwitchBot] Auto refresh interval: ${appearance.refreshInterval}s`);

    // Set initial next update time
    nextUpdate = new Date(Date.now() + intervalMs);

    statusRefreshTimer = setInterval(() => {
        refreshAllDeviceStatus();
        // Reset next update time
        nextUpdate = new Date(Date.now() + intervalMs);
    }, intervalMs);
}

function stopAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
    if (statusRefreshTimer) {
        clearInterval(statusRefreshTimer);
        statusRefreshTimer = null;
    }
}

async function refreshAllDeviceStatus() {
    const tiles = document.querySelectorAll('.tile');
    const visibleDevices = devices.filter(d => !layout.hidden.includes(d.deviceId) && !d.remoteType);

    // Stagger requests to avoid hitting API too fast
    for (let i = 0; i < visibleDevices.length; i++) {
        const dev = visibleDevices[i];
        const tile = document.querySelector(`.tile[data-id="${dev.deviceId}"]`);
        if (tile) {
            await fetchDeviceStatus(dev, tile);
            // Small delay between requests (200ms)
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    // Update lastUpdated timestamp after all done
    lastUpdated = new Date();
}

// Initial Load
setTimeout(async () => {
    await loadSettings();
    fetchDevices();
    startAutoRefresh();
}, 500);

// Cleanup on page unload
window.addEventListener('beforeunload', stopAutoRefresh);
