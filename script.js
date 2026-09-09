/* ═══════════════════════════════════════════
   STUDY PREMIUM LEARNING — script.js
   ═══════════════════════════════════════════ */

// ─── DATA STORE (localStorage-backed virtual FS) ───
const DB_KEY = 'studyPremiumDB';
let DB = JSON.parse(localStorage.getItem(DB_KEY)) || {
  users: { admin: { pass: 'admin123', role: 'admin' }, guest: { pass: 'guest123', role: 'guest' } },
  folders: {},       // { id: { name, parentId, items: [] } }
  permissions: {},   // { folderId: true } for guest access
  theme: 'dark',
  sidebarCollapsed: false
};
function saveDB() { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }

// ─── STATE ───
let currentUser = null;
let currentRole = null;
let hls = null;
let uiScale = 1.0;
let loopMode = 'none'; // none | same | playlist
let aspectMode = 'fit'; // fit | stretch | crop
let isLocked = false;
let currentPlaylist = [];
let currentVideoIndex = -1;
let explorePath = []; // array of folder IDs
let selectedItems = new Set();
let pendingAdd = null; // { title, url, type, folderPath }
let lastVolume = 0.7;

// ─── DOM REFS ───
const $ = id => document.getElementById(id);
const loginPage = $('loginPage');
const app = $('app');
const videoPlayer = $('videoPlayer');
const playerOverlay = $('playerOverlay');

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  // Restore theme
  document.documentElement.setAttribute('data-theme', DB.theme);
  initLogin();
  initTheme();
  initSidebar();
  initPlayer();
  initExplore();
  initAddFile();
  initSettings();
  renderHomePlaylist();
});

// ─── LOGIN ───
function initLogin() {
  const form = $('loginForm');
  const pwToggle = $('pwToggle');
  let activeTab = 'admin';

  pwToggle.addEventListener('click', () => {
    const inp = $('loginPass');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const user = $('loginUser').value.trim();
    const pass = $('loginPass').value;
    const errEl = $('loginError');

    if (user === 'admin') {
      const admin = DB.users.admin;
      if (pass === admin.pass) {
        currentUser = 'admin'; currentRole = 'admin';
        enterApp();
      } else { errEl.textContent = 'Wrong password.'; return; }
    } else {
      const guest = DB.users[user];
      if (guest && pass === guest.pass) {
        currentUser = user; currentRole = 'guest';
        enterApp();
      } else { errEl.textContent = 'Invalid guest credentials.'; return; }
    }
  });
}

function enterApp() {
  loginPage.classList.add('hidden');
  app.classList.remove('hidden');
  $('currentUserLabel').textContent = currentUser;
  renderSettings();
}

$('logoutBtn').addEventListener('click', () => {
  app.classList.add('hidden');
  loginPage.classList.remove('hidden');
  $('loginPass').value = '';
  $('loginError').textContent = '';
});

// ─── THEME ───
function initTheme() {
  $('themeToggle').addEventListener('click', e => {
    e.stopPropagation();
    $('themePie').classList.toggle('hidden');
  });
  document.addEventListener('click', () => $('themePie').classList.add('hidden'));
  $('themePie').addEventListener('click', e => e.stopPropagation());

  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const theme = dot.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      DB.theme = theme;
      saveDB();
    });
  });
}

// ─── SIDEBAR ───
function initSidebar() {
  $('sidebarToggle').addEventListener('click', () => {
    const sb = $('sidebar');
    if (window.innerWidth <= 768) {
      sb.classList.toggle('mobile-open');
    } else {
      sb.classList.toggle('collapsed');
      DB.sidebarCollapsed = sb.classList.contains('collapsed');
      saveDB();
    }
  });
  // Restore collapsed state
  if (DB.sidebarCollapsed && window.innerWidth > 768) $('sidebar').classList.add('collapsed');

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const page = item.dataset.page;
      document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
      $('page-' + page).classList.remove('hidden');
      if (page === 'explore') renderExplore();
      if (page === 'settings') renderSettings();
      if (window.innerWidth <= 768) $('sidebar').classList.remove('mobile-open');
    });
  });
}

// ─── VIDEO PLAYER ───
function initPlayer() {
  const overlay = playerOverlay;
  let hideTimer;

  // Show overlay on mousemove / touch
  const showOverlay = () => {
    if (isLocked) return;
    overlay.classList.add('visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!videoPlayer.paused) overlay.classList.remove('visible'); }, 3000);
  };
  $('videoContainer').addEventListener('mousemove', showOverlay);
  $('videoContainer').addEventListener('touchstart', showOverlay);

  // Play/Pause
  const togglePlay = () => {
    if (videoPlayer.paused) videoPlayer.play(); else videoPlayer.pause();
  };
  $('ctrlPlay').addEventListener('click', togglePlay);
  $('ctrlPlayBottom').addEventListener('click', togglePlay);
  videoPlayer.addEventListener('click', togglePlay);
  videoPlayer.addEventListener('play', () => {
    $('ctrlPlay').innerHTML = '<i class="fas fa-pause"></i>';
    $('ctrlPlayBottom').innerHTML = '<i class="fas fa-pause"></i>';
  });
  videoPlayer.addEventListener('pause', () => {
    $('ctrlPlay').innerHTML = '<i class="fas fa-play"></i>';
    $('ctrlPlayBottom').innerHTML = '<i class="fas fa-play"></i>';
  });

  // Lock
  $('ctrlLock').addEventListener('click', () => {
    isLocked = !isLocked;
    overlay.classList.toggle('locked', isLocked);
    $('ctrlLock').innerHTML = isLocked ? '<i class="fas fa-unlock"></i>' : '<i class="fas fa-lock"></i>';
    $('ctrlLock').classList.toggle('active', isLocked);
    if (isLocked) overlay.classList.add('visible');
  });

  // Loop
  $('ctrlLoop').addEventListener('click', () => {
    loopMode = loopMode === 'none' ? 'same' : loopMode === 'same' ? 'playlist' : 'none';
    $('ctrlLoop').classList.toggle('active', loopMode !== 'none');
    $('ctrlLoop').title = loopMode === 'none' ? 'Loop: Off' : loopMode === 'same' ? 'Loop: Same' : 'Loop: Playlist';
  });

  // Aspect Ratio
  $('ctrlRatio').addEventListener('click', () => {
    const modes = ['fit', 'stretch', 'crop'];
    const icons = ['fa-expand', 'fa-arrows-alt-h', 'fa-crop'];
    const idx = (modes.indexOf(aspectMode) + 1) % modes.length;
    aspectMode = modes[idx];
    videoPlayer.style.objectFit = aspectMode === 'fit' ? 'contain' : aspectMode === 'stretch' ? 'fill' : 'cover';
    $('ctrlRatio').innerHTML = `<i class="fas ${icons[idx]}"></i>`;
  });

  // UI Scaler
  $('scaleDown').addEventListener('click', () => {
    uiScale = Math.max(0.5, uiScale - 0.5);
    applyUIScale();
  });
  $('scaleUp').addEventListener('click', () => {
    uiScale = Math.min(2.0, uiScale + 0.5);
    applyUIScale();
  });
  function applyUIScale() {
    $('scaleLabel').textContent = Math.round(uiScale * 100) + '%';
    overlay.style.fontSize = (14 * uiScale) + 'px';
    overlay.querySelectorAll('.ctrl-btn').forEach(b => { b.style.width = (36*uiScale)+'px'; b.style.height = (36*uiScale)+'px'; b.style.fontSize = (13*uiScale)+'px'; });
  }

  // Seek
  $('ctrlRewind30').addEventListener('click', () => videoPlayer.currentTime -= 30);
  $('ctrlRewind10').addEventListener('click', () => videoPlayer.currentTime -= 10);
  $('ctrlForward10').addEventListener('click', () => videoPlayer.currentTime += 10);
  $('ctrlForward30').addEventListener('click', () => videoPlayer.currentTime += 30);

  // Progress bar
  const progressBar = $('progressBar');
  videoPlayer.addEventListener('timeupdate', () => {
    const pct = (videoPlayer.currentTime / videoPlayer.duration) * 100 || 0;
    $('progressFill').style.width = pct + '%';
    $('progressHead').style.left = pct + '%';
    $('currentTime').textContent = fmtTime(videoPlayer.currentTime);
    $('timeLeft').textContent = '-' + fmtTime(videoPlayer.duration - videoPlayer.currentTime);
  });
  videoPlayer.addEventListener('progress', () => {
    if (videoPlayer.buffered.length) {
      const bufEnd = videoPlayer.buffered.end(videoPlayer.buffered.length - 1);
      $('progressBuffer').style.width = (bufEnd / videoPlayer.duration * 100) + '%';
    }
  });
  progressBar.addEventListener('click', e => {
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoPlayer.currentTime = pct * videoPlayer.duration;
  });

  // Speed
  const speeds = [0.7, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
  $('speedDown').addEventListener('click', () => setSpeed(videoPlayer.playbackRate - 0.5));
  $('speedUp').addEventListener('click', () => setSpeed(videoPlayer.playbackRate + 0.5));
  function setSpeed(s) {
    s = Math.max(0.7, Math.min(4.0, Math.round(s * 10) / 10));
    videoPlayer.playbackRate = s;
    $('speedLabel').textContent = s.toFixed(1) + 'x';
    document.querySelectorAll('#speedDropdown .dd-item').forEach(d => d.classList.toggle('active', parseFloat(d.dataset.speed) === s));
  }
  $('speedMenuBtn').addEventListener('click', e => { e.stopPropagation(); $('speedDropdown').classList.toggle('hidden'); });
  document.querySelectorAll('#speedDropdown .dd-item').forEach(item => {
    item.addEventListener('click', () => { setSpeed(parseFloat(item.dataset.speed)); $('speedDropdown').classList.add('hidden'); });
  });

  // Quality (HLS)
  $('qualityMenuBtn').addEventListener('click', e => { e.stopPropagation(); $('qualityDropdown').classList.toggle('hidden'); });
  document.querySelectorAll('#qualityDropdown .dd-item').forEach(item => {
    item.addEventListener('click', () => {
      const q = parseInt(item.dataset.quality);
      if (hls) {
        hls.currentLevel = hls.levels.findIndex(l => l.height >= q);
        if (hls.currentLevel === -1) hls.currentLevel = 0;
      }
      document.querySelectorAll('#qualityDropdown .dd-item').forEach(d => d.classList.remove('active'));
      item.classList.add('active');
      $('qualityDropdown').classList.add('hidden');
    });
  });

  // Playlist panel
  $('ctrlPlaylist').addEventListener('click', () => {
    $('playlistPanel').classList.toggle('hidden');
    renderPlaylistPanel();
  });
  $('closePlaylist').addEventListener('click', () => $('playlistPanel').classList.add('hidden'));

  // PiP
  $('ctrlPip').addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoPlayer.requestPictureInPicture();
    } catch(e) { console.warn('PiP not supported'); }
  });

  // Fullscreen
  $('ctrlFullscreen').addEventListener('click', () => {
    const vc = $('videoContainer');
    if (document.fullscreenElement) document.exitFullscreen();
    else vc.requestFullscreen();
  });

  // Prev / Next
  $('ctrlPrev').addEventListener('click', playPrev);
  $('ctrlNext').addEventListener('click', playNext);

  // Double-tap gestures
  let lastTap = 0, lastTapX = 0, lastTapY = 0;
  $('videoContainer').addEventListener('touchend', e => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    const x = touch.clientX, y = touch.clientY;
    const rect = $('videoContainer').getBoundingClientRect();
    const relX = (x - rect.left) / rect.width;

    if (now - lastTap < 300) {
      // Double tap
      if (relX < 0.25) videoPlayer.currentTime -= 30;
      else if (relX < 0.45) videoPlayer.currentTime -= 10;
      else if (relX > 0.55) videoPlayer.currentTime += 10;
      else if (relX > 0.75) videoPlayer.currentTime += 30;
      lastTap = 0;
      return;
    }
    lastTap = now; lastTapX = x; lastTapY = y;
  });

  // Vertical swipe: Volume (right side) / Brightness (left side)
  let swipeStartY = 0, swipeActive = false, swipeSide = '';
  $('videoContainer').addEventListener('touchstart', e => {
    const touch = e.touches[0];
    const rect = $('videoContainer').getBoundingClientRect();
    const relX = (touch.clientX - rect.left) / rect.width;
    swipeStartY = touch.clientY;
    swipeActive = true;
    swipeSide = relX > 0.5 ? 'volume' : 'brightness';
  });
  $('videoContainer').addEventListener('touchmove', e => {
    if (!swipeActive) return;
    const touch = e.touches[0];
    const dy = swipeStartY - touch.clientY;
    const pct = Math.max(0, Math.min(1, 0.5 + dy / 200));
    showGesture(swipeSide, pct);
    if (swipeSide === 'volume') {
      videoPlayer.volume = Math.min(2.0, pct * 2);
    } else {
      videoPlayer.style.filter = `brightness(${pct * 2})`;
    }
  });
  $('videoContainer').addEventListener('touchend', () => {
    swipeActive = false;
    $('gestureOverlay').classList.add('hidden');
  });

  // Mouse drag for volume/brightness (hold Shift + drag)
  let mouseSwipe = null;
  $('videoContainer').addEventListener('mousedown', e => {
    if (!e.shiftKey) return;
    const rect = $('videoContainer').getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    mouseSwipe = { startY: e.clientY, side: relX > 0.5 ? 'volume' : 'brightness' };
  });
  $('videoContainer').addEventListener('mousemove', e => {
    if (!mouseSwipe) return;
    const dy = mouseSwipe.startY - e.clientY;
    const pct = Math.max(0, Math.min(1, 0.5 + dy / 200));
    showGesture(mouseSwipe.side, pct);
    if (mouseSwipe.side === 'volume') videoPlayer.volume = Math.min(2.0, pct * 2);
    else videoPlayer.style.filter = `brightness(${pct * 2})`;
  });
  $('videoContainer').addEventListener('mouseup', () => {
    if (mouseSwipe) { mouseSwipe = null; $('gestureOverlay').classList.add('hidden'); }
  });

  function showGesture(side, pct) {
    const ov = $('gestureOverlay');
    ov.classList.remove('hidden');
    $('gestureIcon').innerHTML = side === 'volume' ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-sun"></i>';
    $('gestureFill').style.height = (pct * 100) + '%';
    $('gestureValue').textContent = Math.round(pct * 100) + '%';
  }

  // On ended
  videoPlayer.addEventListener('ended', () => {
    if (loopMode === 'same') { videoPlayer.currentTime = 0; videoPlayer.play(); }
    else if (loopMode === 'playlist' && currentVideoIndex < currentPlaylist.length - 1) playNext();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (app.classList.contains('hidden')) return;
    switch(e.key) {
      case ' ': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft': videoPlayer.currentTime -= 10; break;
      case 'ArrowRight': videoPlayer.currentTime += 10; break;
      case 'ArrowUp': e.preventDefault(); videoPlayer.volume = Math.min(2, videoPlayer.volume + 0.1); break;
      case 'ArrowDown': e.preventDefault(); videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1); break;
      case 'f': $('ctrlFullscreen').click(); break;
      case 'm': videoPlayer.muted = !videoPlayer.muted; break;
    }
  });
}

function fmtTime(s) {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}:${String(m%60).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}

// ─── LOAD VIDEO (HLS or MP4) ───
function loadVideo(url, title) {
  if (hls) { hls.destroy(); hls = null; }
  videoPlayer.style.filter = 'brightness(1)';
  $('videoTitle').textContent = title || 'Video';

  const isHLS = /\.(m3u8|master\.m3u8|playlist-vod\.m3u8)$/i.test(url) || url.includes('.m3u8');

  if (isHLS && Hls.isSupported()) {
    // ═══════════════════════════════════════════════════
    // 📌 PASTE YOUR CUSTOM HLS URL HERE (or pass via parameter)
    // 📌 VIDEO PLAYER ID: "videoPlayer"
    // ═══════════════════════════════════════════════════
    hls = new Hls({
      xhrSetup: (xhr, url) => {
        // CORS workaround: use proxy if needed
        // xhr.withCredentials = false;
      },
      maxBufferLength: 30,
      fragLoadingTimeOut: 20000,
      manifestLoadingTimeOut: 10000,
      levelLoadingTimeOut: 10000
    });
    hls.loadSource(url);
    hls.attachMedia(videoPlayer);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoPlayer.play();
      // Populate quality levels
      const dd = $('qualityDropdown');
      dd.innerHTML = '';
      hls.levels.forEach((lvl, i) => {
        const div = document.createElement('div');
        div.className = 'dd-item';
        div.dataset.quality = lvl.height;
        div.textContent = lvl.height + 'p';
        div.addEventListener('click', () => { hls.currentLevel = i; $('qualityDropdown').classList.add('hidden'); });
        dd.appendChild(div);
      });
    });
    hls.on(Hls.Events.ERROR, (evt, data) => {
      if (data.fatal) {
        switch(data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
          case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
          default: hls.destroy();
        }
      }
    });
  } else if (isHLS && videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS (Safari)
    videoPlayer.src = url;
    videoPlayer.play();
  } else {
    // MP4 or other
    videoPlayer.src = url;
    videoPlayer.play();
  }
}

// ─── PLAYLIST MANAGEMENT ───
function setPlaylist(items, startIndex = 0) {
  currentPlaylist = items;
  currentVideoIndex = startIndex;
  if (items.length > 0) {
    loadVideo(items[startIndex].url, items[startIndex].title);
    renderPlaylistPanel();
    renderHomePlaylist();
  }
}

function playNext() {
  if (currentVideoIndex < currentPlaylist.length - 1) {
    currentVideoIndex++;
    loadVideo(currentPlaylist[currentVideoIndex].url, currentPlaylist[currentVideoIndex].title);
    renderPlaylistPanel();
    renderHomePlaylist();
  }
}
function playPrev() {
  if (currentVideoIndex > 0) {
    currentVideoIndex--;
    loadVideo(currentPlaylist[currentVideoIndex].url, currentPlaylist[currentVideoIndex].title);
    renderPlaylistPanel();
    renderHomePlaylist();
  }
}

function renderPlaylistPanel() {
  const list = $('playlistList');
  list.innerHTML = '';
  currentPlaylist.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'playlist-item' + (i === currentVideoIndex ? ' active' : '');
    div.innerHTML = `<span class="pl-num">${i+1}</span><span class="pl-title">${item.title}</span>`;
    div.addEventListener('click', () => {
      currentVideoIndex = i;
      loadVideo(item.url, item.title);
      renderPlaylistPanel();
    });
    list.appendChild(div);
  });
}

// ─── HOME PLAYLIST ───
function renderHomePlaylist() {
  const container = $('homePlaylist');
  if (currentPlaylist.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-video"></i><p>No videos yet. Add content from <b>Explore</b>.</p></div>';
    return;
  }
  container.innerHTML = '';
  currentPlaylist.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'video-card' + (i === currentVideoIndex ? ' active' : '');
    const isPdf = item.type === 'pdf';
    card.innerHTML = `
      <div class="thumb"><i class="fas ${isPdf ? 'fa-file-pdf' : 'fa-play-circle'}"></i></div>
      <div class="card-info">
        <div class="card-title">${item.title}</div>
        <div class="card-meta">${isPdf ? 'PDF' : 'Video'} · ${i+1}</div>
      </div>`;
    card.addEventListener('click', () => {
      if (isPdf) openPdf(item.url, item.title);
      else { currentVideoIndex = i; loadVideo(item.url, item.title); renderPlaylistPanel(); renderHomePlaylist(); }
    });
    container.appendChild(card);
  });
}

// Grid/List toggle
$('viewGrid').addEventListener('click', () => {
  $('homePlaylist').classList.remove('list-view');
  $('viewGrid').classList.add('active'); $('viewList').classList.remove('active');
});
$('viewList').addEventListener('click', () => {
  $('homePlaylist').classList.add('list-view');
  $('viewList').classList.add('active'); $('viewGrid').classList.remove('active');
});

// ─── EXPLORE ───
function initExplore() {
  $('btnGoRoot').addEventListener('click', () => { explorePath = []; renderExplore(); });
  $('btnSelectAll').addEventListener('click', () => {
    const items = getExploreItems();
    selectedItems = new Set(items.map(i => i.id));
    renderExplore();
  });
  $('btnDelete').addEventListener('click', () => {
    if (selectedItems.size === 0) return alert('Select items first.');
    if (!confirm(`Delete ${selectedItems.size} item(s)?`)) return;
    const parent = explorePath.length > 0 ? DB.folders[explorePath[explorePath.length-1]] : null;
    const target = parent || DB.folders;
    // Delete from root or current folder
    if (parent) {
      parent.items = parent.items.filter(it => !selectedItems.has(it.id));
    } else {
      // Delete top-level folders
      selectedItems.forEach(id => { delete DB.folders[id]; });
    }
    selectedItems.clear();
    saveDB(); renderExplore();
  });
  $('btnMove').addEventListener('click', () => {
    if (selectedItems.size === 0) return alert('Select items first.');
    const destId = prompt('Move to folder ID (or "root" for root):');
    if (!destId) return;
    // Simplified move logic
    saveDB(); renderExplore();
  });
  $('btnNewFolderExplore').addEventListener('click', () => {
    const name = prompt('Folder name:');
    if (!name) return;
    const id = 'f_' + Date.now();
    const parentId = explorePath.length > 0 ? explorePath[explorePath.length-1] : null;
    DB.folders[id] = { name, parentId, items: [] };
    if (parentId && DB.folders[parentId]) {
      DB.folders[parentId].items.push({ id, type: 'folder', name });
    }
    saveDB(); renderExplore();
  });
}

function getExploreItems() {
  const currentFolderId = explorePath.length > 0 ? explorePath[explorePath.length-1] : null;
  if (currentFolderId && DB.folders[currentFolderId]) {
    return DB.folders[currentFolderId].items;
  }
  // Root: show all top-level folders
  return Object.entries(DB.folders)
    .filter(([id, f]) => !f.parentId)
    .map(([id, f]) => ({ id, type: 'folder', name: f.name }));
}

function renderExplore() {
  const grid = $('exploreGrid');
  const bc = $('exploreBreadcrumb');
  grid.innerHTML = ''; bc.innerHTML = '';

  // Breadcrumb
  const rootSpan = document.createElement('span');
  rootSpan.className = 'bc-item' + (explorePath.length === 0 ? ' active' : '');
  rootSpan.textContent = 'Root';
  rootSpan.addEventListener('click', () => { explorePath = []; renderExplore(); });
  bc.appendChild(rootSpan);

  explorePath.forEach((fid, i) => {
    const f = DB.folders[fid];
    if (!f) return;
    const span = document.createElement('span');
    span.className = 'bc-item' + (i === explorePath.length - 1 ? ' active' : '');
    span.textContent = f.name;
    span.addEventListener('click', () => { explorePath = explorePath.slice(0, i+1); renderExplore(); });
    bc.appendChild(span);
  });

  const items = getExploreItems();
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>Empty folder</p></div>';
    return;
  }

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'explore-item' + (selectedItems.has(item.id) ? ' selected' : '');
    const isFolder = item.type === 'folder';
    const count = isFolder && DB.folders[item.id] ? DB.folders[item.id].items.length : 0;
    div.innerHTML = `
      <div class="item-check"><i class="fas fa-check"></i></div>
      <div class="item-icon"><i class="fas ${isFolder ? 'fa-folder' : item.type === 'pdf' ? 'fa-file-pdf' : 'fa-video'}"></i></div>
      <div class="item-name">${item.name || item.title}</div>
      <div class="item-count">${isFolder ? count + ' items' : (item.type === 'pdf' ? 'PDF' : 'Video')}</div>
      <div class="item-actions">
        ${isFolder ? `<button class="icon-btn" title="Delete" onclick="deleteFolder('${item.id}')"><i class="fas fa-trash"></i></button>` : `<button class="icon-btn" title="Remove" onclick="removeItem('${item.id}')"><i class="fas fa-times"></i></button>`}
      </div>`;
    div.addEventListener('click', e => {
      if (e.target.closest('.item-actions')) return;
      if (isFolder) {
        explorePath.push(item.id);
        renderExplore();
      } else {
        if (item.type === 'pdf') openPdf(item.url, item.title);
        else {
          // Load all items in current folder as playlist
          const items = getExploreItems().filter(i => i.type !== 'folder');
          setPlaylist(items, items.findIndex(i => i.id === item.id));
        }
      }
    });
    div.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (selectedItems.has(item.id)) selectedItems.delete(item.id);
      else selectedItems.add(item.id);
      renderExplore();
    });
    grid.appendChild(div);
  });
}

window.deleteFolder = function(id) {
  if (!confirm('Delete this folder and all its contents?')) return;
  delete DB.folders[id];
  // Remove from parent
  const parentId = Object.values(DB.folders).find(f => f.items.some(i => i.id === id && i.type === 'folder'));
  if (parentId) parentId.items = parentId.items.filter(i => i.id !== id);
  saveDB(); renderExplore();
};

window.removeItem = function(id) {
  const currentFolderId = explorePath.length > 0 ? explorePath[explorePath.length-1] : null;
  if (currentFolderId && DB.folders[currentFolderId]) {
    DB.folders[currentFolderId].items = DB.folders[currentFolderId].items.filter(i => i.id !== id);
    saveDB(); renderExplore();
  }
};

// ─── ADD FILE PAGE ───
function initAddFile() {
  $('btnAddUrl').addEventListener('click', () => {
    const title = $('addTitle').value.trim();
    const url = $('addUrl').value.trim();
    const type = $('addType').value;
    if (!url) return alert('Enter a URL.');
    pendingAdd = { title: title || url.split('/').pop(), url, type };
    showConfirm();
  });

  // TXT file import
  const txtInput = $('txtFileInput');
  txtInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(l => l.trim());
      const parsed = parseTxtLines(lines);
      $('txtPreview').classList.remove('hidden');
      $('txtPreview').innerHTML = parsed.map(p => `<div>${p.batch||''} ${p.subject||''} ${p.topic||''} <b>${p.title}</b> → ${p.url}</div>`).join('');
      $('btnImportTxt').disabled = false;
      $('btnImportTxt').dataset.parsed = JSON.stringify(parsed);
    };
    reader.readAsText(file);
  });

  $('btnImportTxt').addEventListener('click', () => {
    const parsed = JSON.parse($('btnImportTxt').dataset.parsed || '[]');
    if (parsed.length === 0) return;
    // Create folder structure and add items
    const rootId = explorePath.length > 0 ? explorePath[explorePath.length-1] : null;
    parsed.forEach(p => {
      let targetFolderId = rootId;
      // Create batch folder
      if (p.batch) targetFolderId = ensureFolder(p.batch, rootId);
      // Create subject folder
      if (p.subject) targetFolderId = ensureFolder(p.subject, targetFolderId);
      // Create topic folder
      if (p.topic) targetFolderId = ensureFolder(p.topic, targetFolderId);
      // Add item
      const isPdf = p.url.endsWith('.pdf');
      const itemId = 'i_' + Date.now() + Math.random().toString(36).slice(2,6);
      if (targetFolderId && DB.folders[targetFolderId]) {
        DB.folders[targetFolderId].items.push({ id: itemId, type: isPdf ? 'pdf' : 'video', title: p.title, url: p.url });
      }
    });
    saveDB();
    alert(`Imported ${parsed.length} items successfully!`);
    $('txtPreview').classList.add('hidden');
    $('btnImportTxt').disabled = true;
    txtInput.value = '';
  });

  // Folder picker
  $('btnNewFolder').addEventListener('click', () => {
    const name = prompt('New folder name:');
    if (!name) return;
    const id = 'f_' + Date.now();
    const parentId = explorePath.length > 0 ? explorePath[explorePath.length-1] : null;
    DB.folders[id] = { name, parentId, items: [] };
    if (parentId && DB.folders[parentId]) DB.folders[parentId].items.push({ id, type: 'folder', name });
    saveDB();
    renderFolderBrowse();
  });
}

function ensureFolder(name, parentId) {
  const parent = parentId ? DB.folders[parentId] : null;
  let existing = null;
  if (parent) {
    existing = parent.items.find(i => i.type === 'folder' && i.name === name);
  } else {
    existing = Object.entries(DB.folders).find(([id, f]) => !f.parentId && f.name === name);
    if (existing) existing = { id: existing[0], type: 'folder', name };
  }
  if (existing && existing.id) return existing.id;
  const id = 'f_' + Date.now() + Math.random().toString(36).slice(2,5);
  DB.folders[id] = { name, parentId, items: [] };
  if (parent) parent.items.push({ id, type: 'folder', name });
  return id;
}

function renderFolderBrowse() {
  const browse = $('folderBrowse');
  browse.innerHTML = '';
  const rootBtn = document.createElement('span');
  rootBtn.className = 'folder-chip' + (explorePath.length === 0 ? ' active' : '');
  rootBtn.textContent = '/ Root';
  rootBtn.addEventListener('click', () => { explorePath = []; renderFolderBrowse(); });
  browse.appendChild(rootBtn);
  // Show all folders flat for simplicity
  Object.entries(DB.folders).forEach(([id, f]) => {
    const chip = document.createElement('span');
    chip.className = 'folder-chip' + (explorePath[explorePath.length-1] === id ? ' active' : '');
    chip.textContent = f.name;
    chip.addEventListener('click', () => { explorePath = [id]; renderFolderBrowse(); });
    browse.appendChild(chip);
  });
  $('folderPath').textContent = explorePath.length === 0 ? '/ (Root)' : explorePath.map(id => DB.folders[id]?.name || '?').join(' / ');
}
renderFolderBrowse();

function showConfirm() {
  $('confirmFileName').textContent = pendingAdd.title;
  $('confirmFolderLoc').textContent = explorePath.length === 0 ? '/ (Root)' : explorePath.map(id => DB.folders[id]?.name).join(' / ');
  $('confirmModal').classList.remove('hidden');
}
$('confirmCancel').addEventListener('click', () => $('confirmModal').classList.add('hidden'));
$('confirmOk').addEventListener('click', () => {
  if (!pendingAdd) return;
  const targetId = explorePath.length > 0 ? explorePath[explorePath.length-1] : null;
  const itemId = 'i_' + Date.now();
  if (targetId && DB.folders[targetId]) {
    DB.folders[targetId].items.push({ id: itemId, type: pendingAdd.type, title: pendingAdd.title, url: pendingAdd.url });
  } else {
    // Add to a default "Uncategorized" folder
    let unc = Object.values(DB.folders).find(f => f.name === 'Uncategorized' && !f.parentId);
    if (!unc) {
      const uid = 'f_unc';
      DB.folders[uid] = { name: 'Uncategorized', parentId: null, items: [] };
      unc = DB.folders[uid];
    }
    unc.items.push({ id: itemId, type: pendingAdd.type, title: pendingAdd.title, url: pendingAdd.url });
  }
  saveDB();
  $('confirmModal').classList.add('hidden');
  $('addTitle').value = ''; $('addUrl').value = '';
  alert('Added successfully!');
});

// ─── HIERARCHICAL TXT PARSER (Stateful) ───
// Maintains current Batch > Subject > Topic context.
// A new Batch: resets Subject & Topic.
// A new Subject: resets Topic.
// A new Topic: just switches topic (keeps Batch & Subject).
// Title: + Url: = one file entry in the current Topic folder.

function parseTxtLines(lines) {
  const results = [];

  // ── State: the "active" hierarchy path ──
  let curBatch = null;
  let curSubject = null;
  let curTopic = null;
  let curTitle = null;

  // Helper: emit a completed file entry
  function emit(title, url) {
    if (url && /^https?:\/\//i.test(url)) {
      results.push({
        batch: curBatch,
        subject: curSubject,
        topic: curTopic,
        title: title || url.split('/').pop() || 'Untitled',
        url
      });
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue; // skip empty lines

    // ── Try pipe-delimited format first ──
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
      if (parts.length >= 5) {
        // Batch|Subject|Topic|Title|Url
        emit(parts[3], parts[4]);
        // Update state in case subsequent lines rely on it
        curBatch = parts[0] || null;
        curSubject = parts[1] || null;
        curTopic = parts[2] || null;
      } else if (parts.length === 4) {
        // Subject|Topic|Title|Url
        curSubject = parts[0] || null;
        curTopic = parts[1] || null;
        emit(parts[2], parts[3]);
      } else if (parts.length === 3) {
        // Subject|Title|Url
        curSubject = parts[0] || null;
        emit(parts[1], parts[2]);
      } else if (parts.length === 2) {
        // Title|Url
        emit(parts[0], parts[1]);
      }
      continue;
    }

    // ── Key:Value format (the main hierarchical format) ──
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      const val = line.substring(colonIdx + 1).trim();

      switch (key) {
        case 'batch':
          // New batch → reset subject & topic
          curBatch = val || null;
          curSubject = null;
          curTopic = null;
          curTitle = null;
          break;

        case 'subject':
          // New subject → reset topic
          curSubject = val || null;
          curTopic = null;
          curTitle = null;
          break;

        case 'topic':
          // New topic → just switch
          curTopic = val || null;
          curTitle = null;
          break;

        case 'title':
          // Store title, wait for Url
          curTitle = val || null;
          break;

        case 'url':
          // Emit the file entry with current context
          emit(curTitle, val);
          curTitle = null; // reset for next Title
          break;
      }
      continue;
    }

    // ── Bare URL (no key prefix) ──
    if (/^https?:\/\//i.test(line)) {
      emit(curTitle, line);
      curTitle = null;
      continue;
    }

    // ── Fallback: treat as a title if we don't have one yet ──
    if (!curTitle) {
      curTitle = line;
    }
  }

  // Flush any dangling title+url at end of file
  if (curTitle && curTitle.startsWith && /^https?:\/\//i.test(curTitle)) {
    // edge case: title IS a url
    emit(null, curTitle);
  }
  return results;
}   
// ─── SETTINGS ───
function initSettings() {
  // Save user details
  $('btnSaveUser').addEventListener('click', () => {
    const newPass = $('settingsNewPass').value;
    if (newPass) {
      DB.users[currentUser].pass = newPass;
      saveDB();
      $('settingsNewPass').value = '';
      alert('Password updated.');
    } else {
      alert('No new password entered.');
    }
  });

  // Add guest
  $('btnAddGuest').addEventListener('click', () => {
    const u = $('newGuestUser').value.trim();
    const p = $('newGuestPass').value;
    if (!u || !p) return alert('Fill both fields.');
    if (DB.users[u]) return alert('Username already exists.');
    DB.users[u] = { pass: p, role: 'guest' };
    saveDB();
    $('newGuestUser').value = '';
    $('newGuestPass').value = '';
    renderSettings();
  });

  // Save permissions
  $('btnSavePerms').addEventListener('click', () => {
    DB.permissions = {};
    document.querySelectorAll('.perm-check').forEach(cb => {
      if (cb.checked) DB.permissions[cb.dataset.folderId] = true;
    });
    saveDB();
    alert('Permissions saved.');
  });
}

function renderSettings() {
  // ── ALL USERS LIST (admin + guests) ──
  const guestList = $('guestList');
  guestList.innerHTML = '';
  Object.entries(DB.users).forEach(([name, data]) => {
    const row = document.createElement('div');
    row.className = 'guest-row';
    const roleBadge = data.role === 'admin'
      ? '<span class="badge-admin">Admin</span>'
      : '<span class="badge-guest">Guest</span>';
    row.innerHTML = `
      <span class="g-name">${name} ${roleBadge}</span>
      ${data.role === 'guest' ? `
        <button class="icon-btn" title="Change Pass" onclick="changeGuestPass('${name}')"><i class="fas fa-key"></i></button>
        <button class="icon-btn" title="Delete" onclick="deleteGuest('${name}')"><i class="fas fa-trash"></i></button>
      ` : '<span class="hint">default</span>'}`;
    guestList.appendChild(row);
  });

  // ── ALL FOLDERS (nested, with full path) ──
  const permList = $('permissionList');
  permList.innerHTML = '';

  // Build full folder tree with paths
  const allFolders = Object.entries(DB.folders);
  if (allFolders.length === 0) {
    permList.innerHTML = '<p class="hint">No folders yet.</p>';
    return;
  }

  // Sort: top-level first, then nested
  const sorted = allFolders.sort((a, b) => {
    const aParent = a[1].parentId ? 1 : 0;
    const bParent = b[1].parentId ? 1 : 0;
    return aParent - bParent || a[1].name.localeCompare(b[1].name);
  });

  sorted.forEach(([id, f]) => {
    const path = getFolderPath(id);
    const row = document.createElement('div');
    row.className = 'perm-row';
    row.innerHTML = `
      <input type="checkbox" class="perm-check" data-folder-id="${id}" ${DB.permissions[id] ? 'checked' : ''}>
      <span class="perm-path">${path}</span>`;
    permList.appendChild(row);
  });
}

// Helper: get full path like "/Batch1/SubjectA/Topic1"
function getFolderPath(folderId) {
  const parts = [];
  let current = DB.folders[folderId];
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? DB.folders[current.parentId] : null;
  }
  return '/' + parts.join('/');
}   

  // Permission list
  const permList = $('permissionList');
  permList.innerHTML = '';
  const allFolders = Object.entries(DB.folders).filter(([id, f]) => !f.parentId);
  if (allFolders.length === 0) {
    permList.innerHTML = '<p class="hint">No folders yet.</p>';
    return;
  }
  allFolders.forEach(([id, f]) => {
    const row = document.createElement('div');
    row.className = 'perm-row';
    row.innerHTML = `
      <input type="checkbox" class="perm-check" data-folder-id="${id}" ${DB.permissions[id] ? 'checked' : ''}>
      <span>${f.name}</span>`;
    permList.appendChild(row);
  });
}

window.changeGuestPass = function(name) {
  const p = prompt(`New password for "${name}":`);
  if (p) { DB.users[name].pass = p; saveDB(); }
};

window.deleteGuest = function(name) {
  if (!confirm(`Delete guest "${name}"?`)) return;
  delete DB.users[name];
  saveDB();
  renderSettings();
};   

//   
