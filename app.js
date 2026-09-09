/* ============================================================
   STUDY PREMIUM LEARNING - app.js (COMPLETE)
   ============================================================ */

// ===== CONFIGURATION =====
const CONFIG = {
    CORS_PROXY: "https://corsproxy.io/?url=",
    DEFAULT_HLS_URL: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    PLAYER_ID: "videoPlayer",
    STORAGE_KEY: "study_premium_data",
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
    fileSystem: null,
    currentFolderId: null,
    currentPlaylist: [],
    currentVideoIndex: -1,
    playerState: {
        locked: false,
        loop: 'none',
        aspect: 'fit',
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
        try {
            const data = JSON.parse(raw);
            state.fileSystem = data.fileSystem || createDefaultFS();
            state.theme = data.theme || 'dark';
            state.playerState.defaultVolume = data.defaultVolume || 0.8;
        } catch(e) {
            state.fileSystem = createDefaultFS();
        }
    } else {
        state.fileSystem = createDefaultFS();
    }
}

function createDefaultFS() {
    return {
        folders: {
            'root': { id: 'root', name: 'Platform', parentId: null, files: [] }
        },
        nextId: 1
    };
}

function genId() {
    return 'f' + (state.fileSystem.nextId++);
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2500);
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
        showToast('Welcome, ' + state.user + '!');
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
    const el = document.getElementById('view-' + view);
    if (el) el.classList.add('active');
    if (view === 'explore') renderExplore();
    if (view === 'add') renderExplorer();
}

// ===== VIEWS =====
function initViews() {
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
        if (video.paused) video.play().catch(()=>{}); else video.pause();
        showOverlay();
    });

    // Double-tap gestures
    let lastTap = 0;
    overlay.addEventListener('touchend', (e) => {
        const now = Date.now();
        const x = e.changedTouches[0].clientX;
        const rect = overlay.getBoundingClientRect();
        const relX = (x - rect.left) / rect.width;

        if (now - lastTap < 300) {
            if (relX < 0.3) { video.currentTime = Math.max(0, video.currentTime - 30); showToast('-30s'); }
            else if (relX < 0.5) { video.currentTime = Math.max(0, video.currentTime - 10); showToast('-10s'); }
            else if (relX > 0.7) { video.currentTime = Math.min(video.duration||0, video.currentTime + 30); showToast('+30s'); }
            else if (relX > 0.5) { video.currentTime = Math.min(video.duration||0, video.currentTime + 10); showToast('+10s'); }
            lastTap = 0;
        } else { lastTap = now; }
    });

    // Mouse double-click
    overlay.addEventListener('dblclick', (e) => {
        const rect = overlay.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        if (relX < 0.3) video.currentTime = Math.max(0, video.currentTime - 30);
        else if (relX < 0.5) video.currentTime = Math.max(0, video.currentTime - 10);
        else if (relX > 0.7) video.currentTime = Math.min(video.duration||0, video.currentTime + 30);
        else if (relX > 0.5) video.currentTime = Math.min(video.duration||0, video.currentTime + 10);
    });

    // Swipe: brightness (left) / volume (right)
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
        const delta = dy / 200;
        if (swipeTarget === 'brightness') {
            state.playerState.brightness = Math.max(-1, Math.min(1, state.playerState.brightness + delta * 0.05));
            applyBrightness();
        } else {
            video.volume = Math.max(0, Math.min(1, video.volume + delta * 0.05));
            updateVolumeUI();
        }
    });

    overlay.addEventListener('touchend', () => { swipeStartY = null; swipeTarget = null; });

    // Mouse drag
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
        } else {
            video.volume = Math.max(0, Math.min(1, video.volume + delta * 0.02));
            updateVolumeUI();
        }
    });
    document.addEventListener('mouseup', () => { mouseSwipeStartY = null; mouseSwipeTarget = null; });

    // Lock
    document.getElementById('ctrlLock').addEventListener('click', () => {
        state.playerState.locked = !state.playerState.locked;
        overlay.classList.toggle('locked', state.playerState.locked);
        document.getElementById('ctrlLock').querySelector('i').className =
            state.playerState.locked ? 'fas fa-lock' : 'fas fa-lock-open';
    });

    // Loop
    document.getElementById('ctrlLoop').addEventListener('click', () => {
        const modes = ['none','same','playlist'];
        const icons = { none:'fas fa-redo', same:'fas fa-rotate-right', playlist:'fas fa-list-ol' };
        const idx = modes.indexOf(state.playerState.loop);
        state.playerState.loop = modes[(idx+1)%modes.length];
        document.getElementById('ctrlLoop').querySelector('i').className = icons[state.playerState.loop];
        showToast('Loop: ' + state.playerState.loop);
    });

    // Aspect
    document.getElementById('ctrlAspect').addEventListener('click', () => {
        const modes = ['fit','stretch','crop'];
        const icons = { fit:'fas fa-expand', stretch:'fas fa-arrows-alt-h', crop:'fas fa-crop' };
        const idx = modes.indexOf(state.playerState.aspect);
        state.playerState.aspect = modes[(idx+1)%modes.length];
        video.style.objectFit = state.playerState.aspect === 'fit' ? 'contain' : state.playerState.aspect === 'stretch' ? 'fill' : 'cover';
        document.getElementById('ctrlAspect').querySelector('i').className = icons[state.playerState.aspect];
    });

    // UI Scale
    document.getElementById('ctrlScaleUp').addEventListener('click', () => {
        state.playerState.uiScale = Math.min(2.0, state.playerState.uiScale + 0.5);
        applyUIScale();
    });
    document.getElementById('ctrlScaleDown').addEventListener('click', () => {
        state.playerState.uiScale = Math.max(0.5, state.playerState.uiScale - 0.5);
        applyUIScale();
    });

    // Reverse / Forward buttons
    document.getElementById('ctrlReverse').addEventListener('click', () => {
        video.currentTime = Math.max(0, video.currentTime - 10);
    });
    document.getElementById('ctrlForward').addEventListener('click', () => {
        video.currentTime = Math.min(video.duration||0, video.currentTime + 10);
    });

    // Brightness button
    document.getElementById('ctrlBrightness').addEventListener('click', () => {
        state.playerState.brightness = state.playerState.brightness === 0 ? 0.5 : 0;
        applyBrightness();
    });

    // Volume button
    document.getElementById('ctrlVolume').addEventListener('click', () => {
        const vo = document.getElementById('volumeOverlay');
        vo.style.display = vo.style.display === 'block' ? 'none' : 'block';
    });

    // Play/Pause
    function togglePlay() { if (video.paused) video.play().catch(()=>{}); else video.pause(); }
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

    // Prev / Next
    document.getElementById('ctrlPrev').addEventListener('click', playPrev);
    document.getElementById('ctrlNext').addEventListener('click', playNext);

    // Speed
    document.getElementById('ctrlSpeedDown').addEventListener('click', () => {
        video.playbackRate = Math.max(0.1, Math.round((video.playbackRate - 0.05)*100)/100);
        updateSpeedUI();
    });
    document.getElementById('ctrlSpeedUp').addEventListener('click', () => {
        video.playbackRate = Math.min(4.0, Math.round((video.playbackRate + 0.1)*100)/100);
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
            if (document.pictureInPictureElement) await document.exitPictureInPicture();
            else await video.requestPictureInPicture();
        } catch(e) { showToast('PiP not supported'); }
    });

    // Fullscreen
    document.getElementById('ctrlFullscreen').addEventListener('click', () => {
        const c = document.getElementById('videoContainer');
        if (!document.fullscreenElement) c.requestFullscreen().catch(()=>{});
        else document.exitFullscreen();
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
            video.currentTime = 0; video.play().catch(()=>{});
        } else if (state.playerState.loop === 'playlist') {
            if (state.currentVideoIndex < state.currentPlaylist.length - 1) playNext();
        } else {
            playNext();
        }
    });
}

function applyBrightness() {
    const o = document.getElementById('brightnessOverlay');
    const b = state.playerState.brightness;
    if (b > 0) o.style.background = 'rgba(255,255,255,' + (b*0.5) + ')';
    else if (b < 0) o.style.background = 'rgba(0,0,0,' + (-b*0.5) + ')';
    else o.style.background = 'transparent';
}

function applyUIScale() {
    const s = state.playerState.uiScale;
    document.getElementById('ctrlScaleVal').textContent = Math.round(s*100) + '%';
    document.getElementById('playerOverlay').style.transform = 'scale(' + s + ')';
    document.getElementById('playerOverlay').style.transformOrigin = 'center center';
}

function updateSpeedUI() {
    const v = document.getElementById(CONFIG.PLAYER_ID);
    document.getElementById('ctrlSpeedVal').textContent = v.playbackRate.toFixed(1) + 'x';
}

function updateVolumeUI() {
    const v = document.getElementById(CONFIG.PLAYER_ID).volume;
    document.getElementById('volumeFill').style.height = (v*100) + '%';
    const icon = document.getElementById('ctrlVolume').querySelector('i');
    icon.className = v === 0 ? 'fas fa-volume-mute' : v < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';
}

function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s/60);
    const sec = Math.floor(s%60);
    return m + ':' + String(sec).padStart(2,'0');
}

// ===== HLS.JS INTEGRATION =====
function loadVideo(url, title) {
    const video = document.getElementById(CONFIG.PLAYER_ID);
    if (state.hlsInstance) { state.hlsInstance.destroy(); state.hlsInstance = null; }

    document.getElementById('ctrlTitle').textContent = title || url;

    const isHLS = /\.m3u8(\?|$)/i.test(url) || /master|playlist.*m3u8/i.test(url);
    const isPDF = /\.pdf(\?|$)/i.test(url);

    if (isPDF) { openPDF(url, title); return; }

    if (isHLS && Hls.isSupported()) {
        const hls = new Hls({
            xhrSetup: (xhr, u) => { xhr.withCredentials = false; },
            manifestLoadingMaxRetry: 3,
            levelLoadingMaxRetry: 3,
            fragLoadingMaxRetry: 3,
            maxBufferLength: 30,
            enableWorker: true,
        });

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(()=>{});
        });

        hls.on(Hls.Events.ERROR, (e, data) => {
            if (data.fatal) {
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    // Try CORS proxy fallback
                    console.warn('[HLS] Direct failed, trying proxy...');
                    hls.destroy();
                    const proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);
                    const hls2 = new Hls();
                    hls2.loadSource(proxyUrl);
                    hls2.attachMedia(video);
                    hls2.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}));
                    hls2.on(Hls.Events.ERROR, (e2, d2) => {
                        if (d2.fatal) showToast('Stream error: ' + d2.details);
                    });
                    state.hlsInstance = hls2;
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                } else {
                    showToast('Playback error: ' + data.details);
                    hls.destroy();
                }
            }
        });

        state.hlsInstance = hls;

    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(()=>{});
    } else {
        video.src = url;
        video.play().catch(()=>{});
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
    const container = document.getElementById('playlistBelow');
    container.innerHTML = '';
    state.currentPlaylist.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'pl-item' + (i === state.currentVideoIndex ? ' active' : '');
        div.innerHTML = '<div class="pl-thumb"><i class="fas fa-play-circle"></i></div><div class="pl-info"><div class="pl-title">' + (i+1) + '. ' + escapeHtml(item.title) + '</div></div>';
        div.addEventListener('click', () => playVideoAt(i));
        container.appendChild(div);
    });

    const panel = document.getElementById('playlistItems');
    panel.innerHTML = '';
    state.currentPlaylist.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'playlist-item' + (i === state.currentVideoIndex ? ' active' : '');
        div.innerHTML = '<span class="pi-num">' + (i+1) + '</span><span class="pi-title">' + escapeHtml(item.title) + '</span>';
        div.addEventListener('click', () => {
            playVideoAt(i);
            document.getElementById('playlistPanel').classList.add('hidden');
        });
        panel.appendChild(div);
    });
}

function renderSidePanels() {
    const currentFile = state.currentPlaylist[state.currentVideoIndex];
    if (!currentFile) return;
    const pdfList = document.getElementById('pdfList');
    const videos = document.getElementById('sideVideoList');
    pdfList.innerHTML = '';
    videos.innerHTML = '';

    const folder = findFolderByFile(currentFile);
    if (folder) {
        folder.files.forEach(f => {
            if (f.type === 'pdf') {
                const div = document.createElement('div');
                div.className = 'pdf-item';
                div.innerHTML = '<i class="fas fa-file-pdf"></i> ' + escapeHtml(f.title);
                div.addEventListener('click', () => openPDF(f.url, f.title));
                pdfList.appendChild(div);
            } else if (f.type === 'video' && f.url !== currentFile.url) {
                const div = document.createElement('div');
                div.className = 'side-video-item';
                div.innerHTML = '<i class="fas fa-video"></i> ' + escapeHtml(f.title);
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
    document.getElementById('newFolderBtn').addEventListener('click', () => {
        const name = prompt('Folder name:');
        if (!name) return;
        const id = genId();
        state.fileSystem.folders[id] = { id, name, parentId: state.currentFolderId || 'root', files: [] };
        saveState(); renderExplorer();
        showToast('Folder "' + name + '" created');
    });

    document.getElementById('newSubFolderBtn').addEventListener('click', () => {
        const name = prompt('Subfolder name:');
        if (!name) return;
        const id = genId();
        const parent = state.currentFolderId || 'root';
        state.fileSystem.folders[id] = { id, name, parentId: parent, files: [] };
        saveState(); renderExplorer();
        showToast('Subfolder "' + name + '" created');
    });

    document.getElementById('upDirBtn').addEventListener('click', () => {
        const cur = state.fileSystem.folders[state.currentFolderId || 'root'];
        if (cur && cur.parentId) {
            state.currentFolderId = cur.parentId;
        } else {
            state.currentFolderId = null;
        }
        renderExplorer();
    });

    // TXT file import
    document.getElementById('txtFileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            parseTxtAndImport(ev.target.result);
        };
        reader.readAsText(file);
    });

    // Direct file upload
    document.getElementById('fileInput').addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files.length) return;
        Array.from(files).forEach(f => {
            const isVideo = /\.(mp4|m3u8)$/i.test(f.name);
            const isPDF = /\.pdf$/i.test(f.name);
            const isImage = /\.(png|jpg|jpeg|webp)$/i.test(f.name);
            const type = isVideo ? 'video' : isPDF ? 'pdf' : isImage ? 'image' : 'file';
            // For local files we can't get a URL on static hosting, so show warning
            showToast('Local file "' + f.name + '" - use URL fetcher for remote files');
        });
    });

    // URL Fetcher
    document.getElementById('fetchAddBtn').addEventListener('click', () => {
        const title = document.getElementById('fetchTitle').value.trim();
        const url = document.getElementById('fetchUrl').value.trim();
        const folderId = document.getElementById('fetchFolder').value || 'root';

        if (!url) { showToast('Enter a URL'); return; }
        if (!title) { showToast('Enter a title'); return; }

        // Show confirm modal
        document.getElementById('confirmFileName').textContent = title;
        document.getElementById('confirmFolder').textContent = getFolderPath(folderId);
        populateFolderSelect('confirmFolderSelect', folderId);
        document.getElementById('confirmModal').classList.remove('hidden');

        document.getElementById('confirmOk').onclick = () => {
            const finalFolder = document.getElementById('confirmFolderSelect').value || folderId;
            const isVideo = /\.(mp4|m3u8)$/i.test(url);
            const isPDF = /\.pdf$/i.test(url);
            const type = isVideo ? 'video' : isPDF ? 'pdf' : 'file';

            state.fileSystem.folders[finalFolder].files.push({
                title: title,
                url: url,
                type: type,
                folderId: finalFolder
            });
            saveState();
            document.getElementById('confirmModal').classList.add('hidden');
            document.getElementById('fetchTitle').value = '';
            document.getElementById('fetchUrl').value = '';
            renderExplorer();
            showToast('Added: ' + title);

            // Preview if video
            if (isVideo) {
                const pp = document.getElementById('previewPlayer');
                loadVideo(url, title);
            }
        };

        document.getElementById('confirmCancel').onclick = () => {
            document.getElementById('confirmModal').classList.add('hidden');
        };
    });
}

function parseTxtAndImport(text) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    let imported = 0;

    lines.forEach(line => {
        const parts = line.split(',').map(p => p.trim());
        let subject = null, topic = null, title = null, url = null;

        if (parts.length === 4) {
            subject = parts[0]; topic = parts[1]; title = parts[2]; url = parts[3];
        } else if (parts.length === 3) {
            // Could be Subject+Title+Url or Topic+Title+Url
            if (parts[2].startsWith('http')) { title = parts[1]; url = parts[2]; subject = parts[0]; }
            else { subject = parts[0]; topic = parts[1]; url = parts[2]; title = parts[2].split('/').pop(); }
        } else if (parts.length === 2) {
            if (parts[1].startsWith('http')) { title = parts[0]; url = parts[1]; }
            else { subject = parts[0]; topic = parts[1]; }
        } else if (parts.length === 1) {
            if (parts[0].startsWith('http')) { url = parts[0]; title = parts[0].split('/').pop(); }
            else { subject = parts[0]; }
        }

        if (!url) return;

        // Create folder structure
        let folderId = 'root';
        if (subject) {
            folderId = findOrCreateFolder(subject, 'root');
        }
        if (topic) {
            folderId = findOrCreateFolder(topic, folderId);
        }

        const isVideo = /\.(mp4|m3u8)$/i.test(url);
        const isPDF = /\.pdf$/i.test(url);
        const type = isVideo ? 'video' : isPDF ? 'pdf' : 'file';

        state.fileSystem.folders[folderId].files.push({
            title: title || url.split('/').pop(),
            url: url,
            type: type,
            folderId: folderId
        });
        imported++;
    });

    saveState();
    renderExplorer();
    showToast('Imported ' + imported + ' items from TXT');
}

function findOrCreateFolder(name, parentId) {
    // Search existing
    for (const id in state.fileSystem.folders) {
        const f = state.fileSystem.folders[id];
        if (f.name === name && f.parentId === parentId) return id;
    }
    // Create
    const id = genId();
    state.fileSystem.folders[id] = { id, name, parentId, files: [] };
    return id;
}

function getFolderPath(folderId) {
    const parts = [];
    let cur = state.fileSystem.folders[folderId];
    while (cur) {
        parts.unshift(cur.name);
        cur = cur.parentId ? state.fileSystem.folders[cur.parentId] : null;
    }
    return '/' + parts.join('/');
}

function populateFolderSelect(selectId, selectedId) {
    const sel = document.getElementById(selectId);
    sel.innerHTML = '';
    function addOptions(parentId, depth) {
        const children = Object.values(state.fileSystem.folders).filter(f => f.parentId === parentId);
        children.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = '  '.repeat(depth) + f.name;
            if (f.id === selectedId) opt.selected = true;
            sel.appendChild(opt);
            addOptions(f.id, depth + 1);
        });
    }
    addOptions('root', 0);
}

function renderExplorer() {
    const container = document.getElementById('explorerContent');
    container.innerHTML = '';
    const currentId = state.currentFolderId || 'root';
    const current = state.fileSystem.folders[currentId];
    document.getElementById('explorerPath').textContent = getFolderPath(currentId);

    // Subfolders
    const children = Object.values(state.fileSystem.folders).filter(f => f.parentId === currentId);
    children.forEach(f => {
        const div = document.createElement('div');
        div.className = 'explorer-item folder';
        div.innerHTML = '<i class="fas fa-folder"></i> ' + escapeHtml(f.name);
        div.addEventListener('click', () => { state.currentFolderId = f.id; renderExplorer(); });
        container.appendChild(div);
    });

    // Files
    current.files.forEach((f, i) => {
        const icon = f.type === 'video' ? 'fas fa-video' : f.type === 'pdf' ? 'fas fa-file-pdf' : 'fas fa-file';
        const div = document.createElement('div');
        div.className = 'explorer-item file';
        div.innerHTML = '<i class="' + icon + '"></i> ' + escapeHtml(f.title);
        div.addEventListener('click', () => {
            state.currentPlaylist = current.files.filter(x => x.type === 'video');
            const idx = state.currentPlaylist.findIndex(p => p.url === f.url);
            if (idx >= 0) {
                switchView('home');
                playVideoAt(idx);
            } else if (f.type === 'pdf') {
                openPDF(f.url, f.title);
            }
        });
        container.appendChild(div);
    });

    // Populate fetch folder select
    populateFolderSelect('fetchFolder', currentId);
}

// ===== EXPLORE VIEW =====
function initExploreView() {
    document.getElementById('exploreDeleteFolder').addEventListener('click', () => {
        if (!state.currentFolderId || state.currentFolderId === 'root') return;
        if (!confirm('Delete this folder and all its contents?')) return;
        const id = state.currentFolderId;
        deleteFolderRecursive(id);
        state.currentFolderId = null;
        saveState();
        renderExplore();
        showToast('Folder deleted');
    });
}

function deleteFolderRecursive(id) {
    const children = Object.values(state.fileSystem.folders).filter(f => f.parentId === id);
    children.forEach(c => deleteFolderRecursive(c.id));
    delete state.fileSystem.folders[id];
}

function renderExplore() {
    const grid = document.getElementById('exploreGrid');
    const breadcrumb = document.getElementById('exploreBreadcrumb');
    grid.innerHTML = '';
    breadcrumb.innerHTML = '';

    const currentId = state.currentFolderId || 'root';
    const current = state.fileSystem.folders[currentId];

    // Breadcrumb
    let path = [];
    let cur = current;
    while (cur) {
        path.unshift(cur);
        cur = cur.parentId ? state.fileSystem.folders[cur.parentId] : null;
    }
    path.forEach((p, i) => {
        const span = document.createElement('span');
        span.textContent = p.name;
        span.addEventListener('click', () => { state.currentFolderId = p.id === 'root' ? null : p.id; renderExplore(); });
        breadcrumb.appendChild(span);
        if (i < path.length - 1) {
            const sep = document.createElement('span');
            sep.textContent = ' / ';
            sep.style.cursor = 'default';
            breadcrumb.appendChild(sep);
        }
    });

    // Responsive columns
    const w = window.innerWidth;
    if (w > 1400) grid.className = 'explore-grid cols-6';
    else if (w > 1100) grid.className = 'explore-grid cols-5';
    else if (w > 800) grid.className = 'explore-grid cols-4';
    else grid.className = 'explore-grid';

    // Subfolders
    const children = Object.values(state.fileSystem.folders).filter(f => f.parentId === currentId);
    children.forEach(f => {
        const card = document.createElement('div');
        card.className = 'explore-card';
        card.innerHTML = '<div class="card-thumb"><i class="fas fa-folder" style="font-size:2.5rem;color:var(--warning)"></i></div><div class="card-info"><div class="card-title">' + escapeHtml(f.name) + '</div><div class="card-type"><i class="fas fa-folder"></i> Folder (' + f.files.length + ' items)</div></div>';
        card.addEventListener('click', () => { state.currentFolderId = f.id; renderExplore(); });
        grid.appendChild(card);
    });

    // Files
    current.files.forEach(f => {
        const icon = f.type === 'video' ? 'fas fa-play-circle' : f.type === 'pdf' ? 'fas fa-file-pdf' : 'fas fa-file';
        const color = f.type === 'video' ? 'var(--accent)' : f.type === 'pdf' ? 'var(--danger)' : 'var(--text-muted)';
        const card = document.createElement('div');
        card.className = 'explore-card';
        card.innerHTML = '<div class="card-thumb"><i class="' + icon + '" style="font-size:2.5rem;color:' + color + '"></i></div><div class="card-info"><div class="card-title">' + escapeHtml(f.title) + '</div><div class="card-type"><i class="' + icon + '"></i> ' + f.type.toUpperCase() + '</div></div>';
        card.addEventListener('click', () => {
            if (f.type === 'video') {
                state.currentPlaylist = current.files.filter(x => x.type === 'video');
                const idx = state.currentPlaylist.findIndex(p => p.url === f.url);
                if (idx >= 0) { switchView('home'); playVideoAt(idx); }
            } else if (f.type === 'pdf') {
                openPDF(f.url, f.title);
            }
        });
        grid.appendChild(card);
    });
}

// ===== PDF VIEWER =====
function initPdfViewer() {
    document.getElementById('pdfClose').addEventListener('click', () => {
        document.getElementById('pdfModal').classList.add('hidden');
        document.getElementById('pdfFrame').src = '';
    });
    document.getElementById('pdfBack').addEventListener('click', () => {
        document.getElementById('pdfModal').classList.add('hidden');
        document.getElementById('pdfFrame').src = '';
    });
    document.getElementById('pdfDownload').addEventListener('click', () => {
        const url = document.getElementById('pdfFrame').src;
        if (url) window.open(url, '_blank');
    });
}

function openPDF(url, title) {
    document.getElementById('pdfTitle').textContent = title || 'PDF';
    document.getElementById('pdfFrame').src = url;
    document.getElementById('pdfModal').classList.remove('hidden');
}

// ===== RENDER FILE SYSTEM (initial) =====
function renderFileSystem() {
    renderExplorer();
    renderExplore();
}   
