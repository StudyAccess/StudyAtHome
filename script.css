/* ============================================================
   STUDY PREMIUM LEARNING - Main Application
   ============================================================ */

// ===== CONFIGURATION =====
const CONFIG = {
    // ⚠️ PASTE YOUR CUSTOM CORS PROXY URL HERE
    // Example: "http://localhost:3000/proxy?url="
    // Or use a public one for testing:
    CORS_PROXY: "https://corsproxy.io/?url=",

    // ⚠️ PASTE YOUR CUSTOM HLS URL HERE (for testing)
    DEFAULT_HLS_URL: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",

    // ⚠️ YOUR VIDEO PLAYER ID
    PLAYER_ID: "videoPlayer",

    // Storage key
    STORAGE_KEY: "study_premium_data",

    // Admin credentials
    ADMIN_USER: "admin",
    ADMIN_PASS: "admin123",
};

// ===== STATE =====
let state = {
    user: null,
    role: null,
    theme: localStorage.getItem('spl_theme') || 'dark',
    sidebarCollapsed: false,
    currentView: 'home',
    // File system: { folders: { id: { name, parentId, files: [] } }, files: [...] }
    fileSystem: null,
    currentFolderId: null,
    currentPlaylist: [],
    currentVideoIndex: -1,
    // Player state
    playerState: {
        locked: false,
        loop: 'none', // none, same, playlist
        aspect: 'fit', // fit, stretch, crop
        uiScale: 1.0,
        speed: 1.0,
        quality: 'auto',
        brightness: 0,
        volume: 0.8,
        defaultVolume: 0.8,
    },
    hlsInstance: null,
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    applyTheme(state.theme);
    initLogin();
    initSidebar();
    initViews();
    initPlayer();
    initAddView();
    initExploreView();
    initPieMenu();
    initThemePanel();
    initPdfViewer();
    renderFileSystem();
});

// ===== PERSISTENCE =====
function saveState() {
    const data = {
        fileSystem: state.fileSystem,
        theme: state.theme,
        defaultVolume: state.playerState.defaultVolume,
    };
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem('spl_theme', state.theme);
}

function loadState() {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
        const data = JSON.parse(raw);
        state.fileSystem = data.fileSystem || createDefaultFS();
        state.theme = data.theme || 'dark';
        state.playerState.defaultVolume = data.defaultVolume || 0.8;
    } else {
        state.fileSystem = createDefaultFS();
    }
}

function createDefaultFS() {
    return {
        folders: {
            'root': { id: 'root', name: 'Platform', parentId: null, files: [] },
        },
        nextId: 1,
    };
}

function genId() {
    return 'f' + (state.fileSystem.nextId++);
}

// ===== LOGIN =====
function initLogin() {
    const overlay = document.getElementById('loginOverlay');
    const tabs = document.querySelectorAll('.login-tab');
    const btn = document.getElementById('loginBtn');
    let role = 'guest';

    tabs.forEach(t => t.addEventListener('click', () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        role = t.dataset.role;
    }));

    btn.addEventListener('click', () => {
        const user = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value.trim();

        if (role === 'admin') {
            if (user === CONFIG.ADMIN_USER && pass === CONFIG.ADMIN_PASS) {
                state.user = user; state.role = 'admin';
            } else {
                showToast('Invalid admin credentials'); return;
            }
        } else {
            if (user && pass) {
                state.user = user; state.role = 'guest';
            } else {
                showToast('Enter username and password'); return;
            }
        }
        overlay.classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        showToast(`Welcome, ${state.user}!`);
    });

    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('userBtn').addEventListener('click', logout);
}

function logout() {
    state.user = null; state.role = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
}

// ===== SIDEBAR =====
function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const collapse = document.getElementById('sidebarCollapse');
    const app = document.getElementById('app');

    toggle.addEventListener('click', () => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        app.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
        collapse.querySelector('i').className = state.sidebarCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
            item.classList.add('active');
            switchView(item.dataset.view);
        });
    });
}

function switchView(view) {
    state.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    if (view === 'explore') renderExplore();
    if (view === 'add') renderExplorer();
}

// ===== VIEWS =====
function initViews() {
    // Layout toggle for playlist below
    document.getElementById('layoutGrid').addEventListener('click', () => {
        document.getElementById('playlistBelow').className = 'playlist-below-items grid-layout';
        document.getElementById('layoutGrid').classList.add('active');
        document.getElementById('layoutList').classList.remove('active');
    });
    document.getElementById('layoutList').addEventListener('click', () => {
        document.getElementById('playlistBelow').className = 'playlist-below-items list-layout';
        document.getElementById('layoutList').classList.add('active');
        document.getElementById('layoutGrid').classList.remove('active');
    });
}

// ===== THEME =====
function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('spl_theme', theme);
    document.querySelectorAll('.theme-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.theme === theme);
    });
}

function initThemePanel() {
    const btn = document.getElementById('themeToggle');
    const panel = document.getElementById('themePanel');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('hidden');
    });

    document.querySelectorAll('.theme-swatch').forEach(s => {
        s.addEventListener('click', () => applyTheme(s.dataset.theme));
    });

    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== btn) panel.classList.add('hidden');
    });
}

// ===== PIE MENU =====
function initPieMenu() {
    const btn = document.getElementById('pieMenuBtn');
    const menu = document.getElementById('pieMenu');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.querySelectorAll('.pie-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            if (action === 'theme') {
                document.getElementById('themePanel').classList.toggle('hidden');
            } else if (action === 'logout') {
                logout();
            } else if (action === 'about') {
                showToast('Study Premium Learning v1.0');
            }
            menu.classList.add('hidden');
        });
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== btn) menu.classList.add('hidden');
    });
}

// ===== VIDEO PLAYER =====
function initPlayer() {
    const video = document.getElementById(CONFIG.PLAYER_ID);
    const overlay = document.getElementById('playerOverlay');
    let hideTimer = null;

    // Show/hide overlay
    function showOverlay() {
        overlay.classList.add('visible');
        clearTimeout(hideTimer);
        if (!state.playerState.locked) {
            hideTimer = setTimeout(() => {
                if (!video.paused) overlay.classList.remove('visible');
            }, 3000);
        }
    }

    overlay.addEventListener('mousemove', showOverlay);
    overlay.addEventListener('touchstart', showOverlay);
    video.addEventListener('click', () => {
        if (state.playerState.locked) return;
        video.paused ? video.play() : video.pause();
        showOverlay();
    });

    // Double-tap gestures
    let lastTap = 0;
    let lastTapX = 0;
    overlay.addEventListener('touchend', (e) => {
        const now = Date.now();
        const x = e.changedTouches[0].clientX;
        const rect = overlay.getBoundingClientRect();
        const relX = (x - rect.left) / rect.width;

        if (now - lastTap < 300) {
            // Double tap
            if (relX < 0.3) {
                video.currentTime = Math.max(0, video.currentTime - 30);
                showToast('⏪ -30s');
            } else if (relX < 0.5) {
                video.currentTime = Math.max(0, video.currentTime - 10);
                showToast('⏪ -10s');
            } else if (relX > 0.7) {
                video.currentTime = Math.min(video.duration || 0, video.currentTime + 30);
                showToast('⏩ +30s');
            } else if (relX > 0.5) {
                video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
                showToast('⏩ +10s');
            }
            lastTap = 0;
        } else {
            lastTap = now;
            lastTapX = x;
        }
    });

    // Swipe gestures (brightness & volume)
    let swipeStartY = null;
    let swipeTarget = null;

    overlay.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            swipeStartY = e.touches[0].clientY;
            const x = e.touches[0].clientX;
            const rect = overlay.getBoundingClientRect();
            const relX = (x - rect.left) / rect.width;
            swipeTarget = relX < 0.5 ? 'brightness' : 'volume';
        }
    });

    overlay.addEventListener('touchmove', (e) => {
        if (swipeStartY === null) return;
        e.preventDefault();
        const dy = swipeStartY - e.touches[0].clientY;
        const delta = dy / 200; // sensitivity

        if (swipeTarget === 'brightness') {
            state.playerState.brightness = Math.max(-1, Math.min(1, state.playerState.brightness + delta * 0.05));
            applyBrightness();
        } else if (swipeTarget === 'volume') {
            video.volume = Math.max(0, Math.min(1, video.volume + delta * 0.05));
            updateVolumeUI();
        }
    });

    overlay.addEventListener('touchend', () => {
        swipeStartY = null;
        swipeTarget = null;
    });

    // Mouse drag for volume/brightness
    let mouseSwipeStartY = null;
    let mouseSwipeTarget = null;

    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay || e.target === video) {
            mouseSwipeStartY = e.clientY;
            const rect = overlay.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            mouseSwipeTarget = relX < 0.5 ? 'brightness' : 'volume';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (mouseSwipeStartY === null) return;
        const dy = mouseSwipeStartY - e.clientY;
        const delta = dy / 200;

        if (mouseSwipeTarget === 'brightness') {
            state.playerState.brightness = Math.max(-1, Math.min(1, state.playerState.brightness + delta * 0.02));
            applyBrightness();
        } else if (mouseSwipeTarget === 'volume') {
            video.volume = Math.max(0, Math.min(1, video.volume + delta * 0.02));
            updateVolumeUI();
        }
    });

    document.addEventListener('mouseup', () => {
        mouseSwipeStartY = null;
        mouseSwipeTarget = null;
    });

    // Lock controls
    document.getElementById('ctrlLock').addEventListener('click', () => {
        state.playerState.locked = !state.playerState.locked;
        overlay.classList.toggle('locked', state.playerState.locked);
        document.getElementById('ctrlLock').querySelector('i').className =
            state.playerState.locked ? 'fas fa-lock' : 'fas fa-lock-open';
    });

    // Loop toggle
    document.getElementById('ctrlLoop').addEventListener('click', () => {
        const modes = ['none', 'same', 'playlist'];
        const icons = { none: 'fas fa-redo', same: 'fas fa-rotate-right', playlist: 'fas fa-list-ol' };
        const labels = { none: 'Loop: Off', same: 'Loop: Same', playlist: 'Loop: Playlist' };
        const idx = modes.indexOf(state.playerState.loop);
        state.playerState.loop = modes[(idx + 1) % modes.length];
        document.getElementById('ctrlLoop').querySelector('i').className = icons[state.playerState.loop];
        showToast(labels[state.playerState.loop]);
    });

    // Aspect ratio
    document.getElementById('ctrlAspect').addEventListener('click', () => {
        const modes = ['fit', 'stretch', 'crop'];
        const icons = { fit: 'fas fa-expand', stretch: 'fas fa-arrows-alt-h', crop: 'fas fa-crop' };
        const idx = modes.indexOf(state.playerState.aspect);
        state.playerState.aspect = modes[(idx + 1) % modes.length];
        video.style.objectFit = state.playerState.aspect === 'fit' ? 'contain' : state.playerState.aspect === 'stretch' ? 'fill' : 'cover';
        document.getElementById('ctrlAspect').querySelector('i').className = icons[state.playerState.aspect];
        showToast('Aspect: ' + state.playerState.aspect);
    });

    // UI Scaler
    document.getElementById('ctrlScaleUp').addEventListener('click', () => {
        state.playerState.uiScale = Math.min(2.0, state.playerState.uiScale + 0.5);
        applyUIScale();
    });
    document.getElementById('ctrlScaleDown').addEventListener('click', () => {
        state.playerState.uiScale = Math.max(0.5, state.playerState.uiScale - 0.5);
        applyUIScale();
    });

    // Reverse
    document.getElementById('ctrlReverse').addEventListener('click', () => {
        video.currentTime = Math.max(0, video.currentTime - 10);
    });

    // Forward
    document.getElementById('ctrlForward').addEventListener('click', () => {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
    });

    // Brightness button
    document.getElementById('ctrlBrightness').addEventListener('click', () => {
        state.playerState.brightness = state.playerState.brightness === 0 ? 0.5 : 0;
        applyBrightness();
    });

    // Volume button
    document.getElementById('ctrlVolume').addEventListener('click', () => {
        const volOverlay = document.getElementById('volumeOverlay');
        volOverlay.style.display = volOverlay.style.display === 'block' ? 'none' : 'block';
    });

    // Play/Pause
    function togglePlay() {
        video.paused ? video.play() : video.pause();
    }
    document.getElementById('ctrlPlayPause').addEventListener('click', togglePlay);
    document.getElementById('ctrlPlayPause2').addEventListener('click', togglePlay);
    video.addEventListener('play', () => {
        document.getElementById('ctrlPlayPause').querySelector('i').className = 'fas fa-pause';
        document.getElementById('ctrlPlayPause2').querySelector('i').className = 'fas fa-pause';
    });
    video.addEventListener('pause', () => {
        document.getElementById('ctrlPlayPause').querySelector('i').className = 'fas fa-play';
        document.getElementById('ctrlPlayPause2').querySelector('i').className = 'fas fa-play';
    });

    // Previous / Next
    document.getElementById('ctrlPrev').addEventListener('click', playPrev);
    document.getElementById('ctrlNext').addEventListener('click', playNext);

    // Speed
    document.getElementById('ctrlSpeedDown').addEventListener('click', () => {
        video.playbackRate = Math.max(0.1, Math.round((video.playbackRate - 0.05) * 100) / 100);
        updateSpeedUI();
    });
    document.getElementById('ctrlSpeedUp').addEventListener('click', () => {
        video.playbackRate = Math.min(4.0, Math.round((video.playbackRate + 0.1) * 100) / 100);
        updateSpeedUI();
    });

    const speedMenu = document.getElementById('speedMenu');
    document.getElementById('ctrlSpeed').addEventListener('click', () => {
        speedMenu.classList.toggle('hidden');
        document.getElementById('qualityMenu').classList.add('hidden');
    });
    speedMenu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            video.playbackRate = parseFloat(item.dataset.speed);
            updateSpeedUI();
            speedMenu.classList.add('hidden');
        });
    });

    // Quality
    const qualityMenu = document.getElementById('qualityMenu');
    document.getElementById('ctrlQuality').addEventListener('click', () => {
        qualityMenu.classList.toggle('hidden');
        speedMenu.classList.add('hidden');
    });
    qualityMenu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            state.playerState.quality = item.dataset.quality;
            if (state.hlsInstance) {
                if (item.dataset.quality === 'auto') {
                    state.hlsInstance.currentLevel = -1;
                } else {
                    const levels = state.hlsInstance.levels;
                    const target = levels.find(l => l.height <= parseInt(item.dataset.quality));
                    if (target) state.hlsInstance.currentLevel = levels.indexOf(target);
                }
            }
            updateQualityUI();
            qualityMenu.classList.add('hidden');
        });
    });

    // Playlist panel
    document.getElementById('ctrlPlaylist').addEventListener('click', () => {
        document.getElementById('playlistPanel').classList.toggle('hidden');
    });
    document.getElementById('playlistClose').addEventListener('click', () => {
        document.getElementById('playlistPanel').classList.add('hidden');
    });

    // PiP
    document.getElementById('ctrlPip').addEventListener('click', async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (e) { showToast('PiP not supported'); }
    });

    // Fullscreen
    document.getElementById('ctrlFullscreen').addEventListener('click', () => {
        const container = document.getElementById('videoContainer');
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    });

    // Progress bar
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const progressHead = document.getElementById('progressHead');
    const progressBuffer = document.getElementById('progressBuffer');

    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        if (video.duration) video.currentTime = pct * video.duration;
    });

    video.addEventListener('timeupdate', () => {
        if (video.duration) {
            const pct = (video.currentTime / video.duration) * 100;
            progressFill.style.width = pct + '%';
            progressHead.style.left = pct + '%';
            document.getElementById('ctrlCurrentTime').textContent = fmtTime(video.currentTime);
            document.getElementById('ctrlDuration').textContent = fmtTime(video.duration);
        }
    });

    video.addEventListener('progress', () => {
        if (video.buffered.length > 0 && video.duration) {
            const bufEnd = video.buffered.end(video.buffered.length - 1);
            progressBuffer.style.width = (bufEnd / video.duration * 100) + '%';
        }
    });

    // Volume
    video.volume = state.playerState.defaultVolume;
    video.addEventListener('volumechange', updateVolumeUI);

    // Ended
    video.addEventListener('ended', () => {
        if (state.playerState.loop === 'same') {
            video.currentTime = 0;
            video.play();
        } else if (state.playerState.loop === 'playlist') {
            if (state.currentVideoIndex < state.currentPlaylist.length - 1) {
                playNext();
            }
        } else {
            playNext();
        }
    });
}

function applyBrightness() {
    const overlay = document.getElementById('brightnessOverlay');
    const b = state.playerState.brightness;
    if (b > 0) overlay.style.background = `rgba(255,255,255,${b * 0.5})`;
    else if (b < 0) overlay.style.background = `rgba(0,0,0,${-b * 0.5})`;
    else overlay.style.background = 'transparent';
}

function applyUIScale() {
    const s = state.playerState.uiScale;
    document.getElementById('ctrlScaleVal').textContent = Math.round(s * 100) + '%';
    document.getElementById('playerOverlay').style.transform = `scale(${s})`;
    document.getElementById('playerOverlay').style.transformOrigin = 'center center';
}

function updateSpeedUI() {
    document.getElementById('ctrlSpeedVal').textContent = video.playbackRate.toFixed(1) + 'x';
}

function updateQualityUI() {
    document.getElementById('ctrlQuality').title = 'Quality: ' + state.playerState.quality;
}

function updateVolumeUI() {
    const v = document.getElementById(CONFIG.PLAYER_ID).volume;
    document.getElementById('volumeFill').style.height = (v * 100) + '%';
    const icon = document.getElementById('ctrlVolume').querySelector('i');
    icon.className = v === 0 ? 'fas fa-volume-mute' : v < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';
}

function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
}

// ===== HLS.JS INTEGRATION =====
function loadVideo(url, title) {
    const video = document.getElementById(CONFIG.PLAYER_ID);
    const hls = state.hlsInstance;

    // Destroy previous HLS instance
    if (hls) { hls.destroy(); state.hlsInstance = null; }

    document.getElementById('ctrlTitle').textContent = title || url;

    const isHLS = /\.m3u8(\?|$)/i.test(url) || /master|playlist.*m3u8/i.test(url);
    const isPDF = /\.pdf(\?|$)/i.test(url);

    if (isPDF) {
        openPDF(url, title);
        return;
    }

    if (isHLS && Hls.isSupported()) {
        const proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);
        const hlsInstance = new Hls({
            // CORS configuration
            xhrSetup: (xhr, url) => {
                xhr.withCredentials = false;
            },
            // Try direct first, fall back to proxy
            manifestLoadingMaxRetry: 3,
            levelLoadingMaxRetry: 3,
            fragLoadingMaxRetry: 3,
            maxBufferLength: 30,
            liveSyncDurationCount: 3,
            enableWorker: true,
            lowLatencyMode: false,
        });

        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (e, data) => {
            video.play().catch(() => {});
            console.log('[HLS] Manifest parsed. Levels:', data.levels.map(l => l.height + 'p'));
        });

        hlsInstance.on(Hls.Events.ERROR, (e, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.warn('[HLS] Network error, trying proxy...');
                        hlsInstance.destroy();
                        // Retry with proxy
                        const proxyUrl2 = CONFIG.CORS_PROXY + encodeURIComponent(url);
                        const hls2 = new Hls();
                        hls2.loadSource(proxyUrl2);
                        hls2.attachMedia(video);
                        hls2.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
                        hls2.on(Hls.Events.ERROR, (e2, d2) => {
                            if (d2.fatal) showToast('Stream error: ' + d2.details);
                        });
                        state.hlsInstance = hls2;
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hlsInstance.recoverMediaError();
                        break;
                    default:
                        showToast('Playback error: ' + data.details);
                        hlsInstance.destroy();
                }
            }
        });

        state.hlsInstance = hlsInstance;

    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        video.src = url;
        video.play().catch(() => {});

    } else {
        // MP4 or other
        video.src = url;
        video.play().catch(() => {});
    }
}

// ===== PLAYLIST / NAVIGATION =====
function playNext() {
    if (state.currentVideoIndex < state.currentPlaylist.length - 1) {
        state.currentVideoIndex++;
        playVideoAt(state.currentVideoIndex);
    }
}

function playPrev() {
    if (state.currentVideoIndex > 0) {
        state.currentVideoIndex--;
        playVideoAt(state.currentVideoIndex);
    }
}

function playVideoAt(idx) {
    const item = state.currentPlaylist[idx];
    if (!item) return;
    state.currentVideoIndex = idx;
    loadVideo(item.url, item.title);
    renderPlaylist();
    renderSidePanels();
}

function renderPlaylist() {
    // Playlist below player
    const container = document.getElementById('playlistBelow');
    container.innerHTML = '';
    state.currentPlaylist.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'pl-item' + (i === state.currentVideoIndex ? ' active' : '');
        div.innerHTML = `
            <div class="pl-thumb"><i class="fas fa-play-circle"></i></div>
            <div class="pl-info"><div class="pl-title">${i + 1}. ${escapeHtml(item.title)}</div></div>
        `;
        div.addEventListener('click', () => playVideoAt(i));
        container.appendChild(div);
    });

    // Playlist panel (in player)
    const panel = document.getElementById('playlistItems');
    panel.innerHTML = '';
    state.currentPlaylist.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'playlist-item' + (i === state.currentVideoIndex ? ' active' : '');
        div.innerHTML = `<span class="pi-num">${i + 1}</span><span class="pi-title">${escapeHtml(item.title)}</span>`;
        div.addEventListener('click', () => {
            playVideoAt(i);
            document.getElementById('playlistPanel').classList.add('hidden');
        });
        panel.appendChild(div);
    });
}

function renderSidePanels() {
    // Find current folder
    const currentFile = state.currentPlaylist[state.currentVideoIndex];
    if (!currentFile) return;

    // PDFs in same folder
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '';
    const videos = document.getElementById('sideVideoList');
    videos.innerHTML = '';

    // Find folder from file path
    const folder = findFolderByFile(currentFile);
    if (folder) {
        folder.files.forEach(f => {
            if (f.type === 'pdf') {
                const div = document.createElement('div');
                div.className = 'pdf-item';
                div.innerHTML = `<i class="fas fa-file-pdf"></i> ${escapeHtml(f.title)}`;
                div.addEventListener('click', () => openPDF(f.url, f.title));
                pdfList.appendChild(div);
            } else if (f.type === 'video' && f.url !== currentFile.url) {
                const div = document.createElement('div');
                div.className = 'side-video-item';
                div.innerHTML = `<i class="fas fa-video"></i> ${escapeHtml(f.title)}`;
                div.addEventListener('click', () => {
                    const idx = state.currentPlaylist.findIndex(p => p.url === f.url);
                    if (idx >= 0) playVideoAt(idx);
                });
                videos.appendChild(div);
            }
        });
    }
}

function findFolderByFile(file) {
    if (!file || !file.folderId) return null;
    return state.fileSystem.folders[file.folderId] || null;
}

// ===== ADD VIEW =====
function initAddView() {
    // New folder
    document.getElementById('newFolderBtn').addEventListener('click', () => {
        const name = prompt('Folder name:');
        if (!name) return;
        const id = genId();
        state.fileSystem.folders[id] = { id, name, parentId: state.currentFolderId || 'root', files: [] };
        saveState();
        renderExplorer();
        showToast(`Folder "${name}" created`);
    });

    document.getElementById('newSubFolderBtn').addEventListener('click', () => {
        const name = prompt('Subfolder name:');
        if (!name) return;
        const id = genId();
        const parent = state.currentFolderId || 'root';
        state.fileSystem.folders[id] = { id, name, parentId: parent, files: [] };
        saveState();
        renderExplorer();
        showToast(`Subfolder "${name}" created`);
    });

    document.getElementById('upDirBtn').   
