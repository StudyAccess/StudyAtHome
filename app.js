/* STUDY PREMIUM LEARNING - app.js v2 (FIXED) */

const CONFIG = {
  CORS_PROXY: "https://corsproxy.io/?url=",
  DEFAULT_HLS_URL: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  PLAYER_ID: "videoPlayer",
  STORAGE_KEY: "study_premium_data",
  ADMIN_USER: "admin",
  ADMIN_PASS: "admin123"
};

let state = {
  user: null, role: null,
  theme: localStorage.getItem('spl_theme') || 'dark',
  sidebarCollapsed: false,
  currentView: 'home',
  fileSystem: null,
  currentFolderId: null,
  currentPlaylist: [],
  currentVideoIndex: -1,
  playerState: {
    locked: false, loop: 'none', aspect: 'fit',
    uiScale: 1.0, speed: 1.0, quality: 'auto',
    brightness: 0, volume: 0.8, defaultVolume: 0.8
  },
  hlsInstance: null
};

document.addEventListener('DOMContentLoaded', function() {
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
  renderExplorer();
  renderExplore();
});

/* ===== HELPERS ===== */
function saveState() {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
    fileSystem: state.fileSystem,
    theme: state.theme,
    defaultVolume: state.playerState.defaultVolume
  }));
  localStorage.setItem('spl_theme', state.theme);
}

function loadState() {
  try {
    var raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
      var d = JSON.parse(raw);
      state.fileSystem = d.fileSystem || createDefaultFS();
      state.theme = d.theme || 'dark';
      state.playerState.defaultVolume = d.defaultVolume || 0.8;
    } else {
      state.fileSystem = createDefaultFS();
    }
  } catch(e) {
    state.fileSystem = createDefaultFS();
  }
}

function createDefaultFS() {
  return { folders: { 'root': { id: 'root', name: 'Platform', parentId: null, files: [] } }, nextId: 1 };
}

function genId() { return 'f' + (state.fileSystem.nextId++); }

function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(function() { t.classList.add('hidden'); }, 2500);
}

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  var m = Math.floor(s / 60);
  var sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

function getFolderPath(folderId) {
  var parts = [];
  var cur = state.fileSystem.folders[folderId];
  while (cur) {
    parts.unshift(cur.name);
    cur = cur.parentId ? state.fileSystem.folders[cur.parentId] : null;
  }
  return '/' + parts.join('/');
}

function findOrCreateFolder(name, parentId) {
  var ids = Object.keys(state.fileSystem.folders);
  for (var i = 0; i < ids.length; i++) {
    var f = state.fileSystem.folders[ids[i]];
    if (f.name === name && f.parentId === parentId) return f.id;
  }
  var id = genId();
  state.fileSystem.folders[id] = { id: id, name: name, parentId: parentId, files: [] };
  return id;
}

function populateFolderSelect(selectId, selectedId) {
  var sel = document.getElementById(selectId);
  sel.innerHTML = '';
  (function addOpts(pid, depth) {
    var kids = Object.values(state.fileSystem.folders).filter(function(f) { return f.parentId === pid; });
    kids.forEach(function(f) {
      var opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = '  '.repeat(depth) + f.name;
      if (f.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
      addOpts(f.id, depth + 1);
    });
  })('root', 0);
}

function findFolderByFile(file) {
  if (!file || !file.folderId) return null;
  return state.fileSystem.folders[file.folderId] || null;
}

/* ===== LOGIN ===== */
function initLogin() {
  var tabs = document.querySelectorAll('.login-tab');
  var btn = document.getElementById('loginBtn');
  var role = 'guest';

  tabs.forEach(function(t) {
    t.addEventListener('click', function() {
      tabs.forEach(function(x) { x.classList.remove('active'); });
      t.classList.add('active');
      role = t.dataset.role;
    });
  });

  btn.addEventListener('click', function() {
    var user = document.getElementById('loginUser').value.trim();
    var pass = document.getElementById('loginPass').value.trim();

    if (role === 'admin') {
      if (user === CONFIG.ADMIN_USER && pass === CONFIG.ADMIN_PASS) {
        state.user = user; state.role = 'admin';
      } else { showToast('Invalid admin credentials'); return; }
    } else {
      if (user && pass) { state.user = user; state.role = 'guest'; }
      else { showToast('Enter username and password'); return; }
    }
    document.getElementById('loginOverlay').classList.add('hidden');
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

/* ===== SIDEBAR ===== */
function initSidebar() {
  var toggle = document.getElementById('sidebarToggle');
  var collapse = document.getElementById('sidebarCollapse');
  var app = document.getElementById('app');

  toggle.addEventListener('click', function() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    app.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
    collapse.querySelector('i').className = state.sidebarCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
  });

  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(function(x) { x.classList.remove('active'); });
      item.classList.add('active');
      switchView(item.dataset.view);
    });
  });
}

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  var el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
  if (view === 'explore') renderExplore();
  if (view === 'add') renderExplorer();
}

/* ===== VIEWS ===== */
function initViews() {
  document.getElementById('layoutGrid').addEventListener('click', function() {
    document.getElementById('playlistBelow').className = 'playlist-below-items grid-layout';
    document.getElementById('layoutGrid').classList.add('active');
    document.getElementById('layoutList').classList.remove('active');
  });
  document.getElementById('layoutList').addEventListener('click', function() {
    document.getElementById('playlistBelow').className = 'playlist-below-items list-layout';
    document.getElementById('layoutList').classList.add('active');
    document.getElementById('layoutGrid').classList.remove('active');
  });
}

/* ===== THEME ===== */
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('spl_theme', theme);
  document.querySelectorAll('.theme-swatch').forEach(function(s) {
    s.classList.toggle('active', s.dataset.theme === theme);
  });
}

function initThemePanel() {
  var btn = document.getElementById('themeToggle');
  var panel = document.getElementById('themePanel');

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  document.querySelectorAll('.theme-swatch').forEach(function(s) {
    s.addEventListener('click', function() { applyTheme(s.dataset.theme); });
  });

  document.addEventListener('click', function(e) {
    if (!panel.contains(e.target) && e.target !== btn) panel.classList.add('hidden');
  });
}

/* ===== PIE MENU ===== */
function initPieMenu() {
  var btn = document.getElementById('pieMenuBtn');
  var menu = document.getElementById('pieMenu');

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  document.querySelectorAll('.pie-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var action = item.dataset.action;
      if (action === 'theme') document.getElementById('themePanel').classList.toggle('hidden');
      else if (action === 'logout') logout();
      else if (action === 'about') showToast('Study Premium Learning v1.0');
      menu.classList.add('hidden');
    });
  });

  document.addEventListener('click', function(e) {
    if (!menu.contains(e.target) && e.target !== btn) menu.classList.add('hidden');
  });
}

/* ===== PLAYER ===== */
function initPlayer() {
  var video = document.getElementById(CONFIG.PLAYER_ID);
  var overlay = document.getElementById('playerOverlay');
  var hideTimer = null;

  function showOverlay() {
    overlay.classList.add('visible');
    clearTimeout(hideTimer);
    if (!state.playerState.locked) {
      hideTimer = setTimeout(function() {
        if (!video.paused) overlay.classList.remove('visible');
      }, 3000);
    }
  }

  overlay.addEventListener('mousemove', showOverlay);
  overlay.addEventListener('touchstart', showOverlay);

  video.addEventListener('click', function() {
    if (state.playerState.locked) return;
    if (video.paused) video.play().catch(function(){}); else video.pause();
    showOverlay();
  });

  // Double tap
  var lastTap = 0;
  overlay.addEventListener('touchend', function(e) {
    var now = Date.now();
    var x = e.changedTouches[0].clientX;
    var rect = overlay.getBoundingClientRect();
    var relX = (x - rect.left) / rect.width;
    if (now - lastTap < 300) {
      if (relX < 0.3) { video.currentTime = Math.max(0, video.currentTime - 30); showToast('-30s'); }
      else if (relX < 0.5) { video.currentTime = Math.max(0, video.currentTime - 10); showToast('-10s'); }
      else if (relX > 0.7) { video.currentTime = Math.min(video.duration || 0, video.currentTime + 30); showToast('+30s'); }
      else if (relX > 0.5) { video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); showToast('+10s'); }
      lastTap = 0;
    } else { lastTap = now; }
  });

  overlay.addEventListener('dblclick', function(e) {
    var rect = overlay.getBoundingClientRect();
    var relX = (e.clientX - rect.left) / rect.width;
    if (relX < 0.3) video.currentTime = Math.max(0, video.currentTime - 30);
    else if (relX < 0.5) video.currentTime = Math.max(0, video.currentTime - 10);
    else if (relX > 0.7) video.currentTime = Math.min(video.duration || 0, video.currentTime + 30);
    else if (relX > 0.5) video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
  });

  // Swipe
  var swipeStartY = null, swipeTarget = null;
  overlay.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      swipeStartY = e.touches[0].clientY;
      var rect = overlay.getBoundingClientRect();
      var relX = (e.touches[0].clientX - rect.left) / rect.width;
      swipeTarget = relX < 0.5 ? 'brightness' : 'volume';
    }
  });
  overlay.addEventListener('touchmove', function(e) {
    if (swipeStartY === null) return;
    e.preventDefault();
    var dy = swipeStartY - e.touches[0].clientY;
    var delta = dy / 200;
    if (swipeTarget === 'brightness') {
      state.playerState.brightness = Math.max(-1, Math.min(1, state.playerState.brightness + delta * 0.05));
      applyBrightness();
    } else {
      video.volume = Math.max(0, Math.min(1, video.volume + delta * 0.05));
      updateVolumeUI();
    }
  });
  overlay.addEventListener('touchend', function() { swipeStartY = null; swipeTarget = null; });

  // Mouse drag
  var mStartY = null, mTarget = null;
  overlay.addEventListener('mousedown', function(e) {
    if (e.target === overlay || e.target === video) {
      mStartY = e.clientY;
      var rect = overlay.getBoundingClientRect();
      var relX = (e.clientX - rect.left) / rect.width;
      mTarget = relX < 0.5 ? 'brightness' : 'volume';
    }
  });
  document.addEventListener('mousemove', function(e) {
    if (mStartY === null) return;
    var dy = mStartY - e.clientY;
    var delta = dy / 200;
    if (mTarget === 'brightness') {
      state.playerState.brightness = Math.max(-1, Math.min(1, state.playerState.brightness + delta * 0.02));
      applyBrightness();
    } else {
      video.volume = Math.max(0, Math.min(1, video.volume + delta * 0.02));
      updateVolumeUI();
    }
  });
  document.addEventListener('mouseup', function() { mStartY = null; mTarget = null; });

  // Lock
  document.getElementById('ctrlLock').addEventListener('click', function() {
    state.playerState.locked = !state.playerState.locked;
    overlay.classList.toggle('locked', state.playerState.locked);
    document.getElementById('ctrlLock').querySelector('i').className =
      state.playerState.locked ? 'fas fa-lock' : 'fas fa-lock-open';
  });

  // Loop
  document.getElementById('ctrlLoop').addEventListener('click', function() {
    var modes = ['none', 'same', 'playlist'];
    var icons = { none: 'fas fa-redo', same: 'fas fa-rotate-right', playlist: 'fas fa-list-ol' };
    var idx = modes.indexOf(state.playerState.loop);
    state.playerState.loop = modes[(idx + 1) % modes.length];
    document.getElementById('ctrlLoop').querySelector('i').className = icons[state.playerState.loop];
    showToast('Loop: ' + state.playerState.loop);
  });

  // Aspect
  document.getElementById('ctrlAspect').addEventListener('click', function() {
    var modes = ['fit', 'stretch', 'crop'];
    var icons = { fit: 'fas fa-expand', stretch: 'fas fa-arrows-alt-h', crop: 'fas fa-crop' };
    var idx = modes.indexOf(state.playerState.aspect);
    state.playerState.aspect = modes[(idx + 1) % modes.length];
    video.style.objectFit = state.playerState.aspect === 'fit' ? 'contain' : state.playerState.aspect === 'stretch' ? 'fill' : 'cover';
    document.getElementById('ctrlAspect').querySelector('i').className = icons[state.playerState.aspect];
  });

  // UI Scale
  document.getElementById('ctrlScaleUp').addEventListener('click', function() {
    state.playerState.uiScale = Math.min(2.0, state.playerState.uiScale + 0.5);
    applyUIScale();
  });
  document.getElementById('ctrlScaleDown').addEventListener('click', function() {
    state.playerState.uiScale = Math.max(0.5, state.playerState.uiScale - 0.5);
    applyUIScale();
  });

  // Reverse / Forward
  document.getElementById('ctrlReverse').addEventListener('click', function() {
    video.currentTime = Math.max(0, video.currentTime - 10);
  });
  document.getElementById('ctrlForward').addEventListener('click', function() {
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
  });

  // Brightness
  document.getElementById('ctrlBrightness').addEventListener('click', function() {
    state.playerState.brightness = state.playerState.brightness === 0 ? 0.5 : 0;
    applyBrightness();
  });

  // Volume
  document.getElementById('ctrlVolume').addEventListener('click', function() {
    var vo = document.getElementById('volumeOverlay');
    vo.style.display = vo.style.display === 'block' ? 'none' : 'block';
  });

  // Play/Pause
  function togglePlay() {
    if (video.paused) video.play().catch(function(){}); else video.pause();
  }
  document.getElementById('ctrlPlayPause').addEventListener('click', togglePlay);
  document.getElementById('ctrlPlayPause2').addEventListener('click', togglePlay);
  video.addEventListener('play', function() {
    document.getElementById('ctrlPlayPause').querySelector('i').className = 'fas fa-pause';
    document.getElementById('ctrlPlayPause2').querySelector('i').className = 'fas fa-pause';
  });
  video.addEventListener('pause', function() {
    document.getElementById('ctrlPlayPause').querySelector('i').className = 'fas fa-play';
    document.getElementById('ctrlPlayPause2').querySelector('i').className = 'fas fa-play';
  });

  // Prev / Next
  document.getElementById('ctrlPrev').addEventListener('click', playPrev);
  document.getElementById('ctrlNext').addEventListener('click', playNext);

  // Speed
  document.getElementById('ctrlSpeedDown').addEventListener('click', function() {
    video.playbackRate = Math.max(0.1, Math.round((video.playbackRate - 0.05) * 100) / 100);
    updateSpeedUI();
  });
  document.getElementById('ctrlSpeedUp').addEventListener('click', function() {
    video.playbackRate = Math.min(4.0, Math.round((video.playbackRate + 0.1) * 100) / 100);
    updateSpeedUI();
  });

  var speedMenu = document.getElementById('speedMenu');
  document.getElementById('ctrlSpeed').addEventListener('click', function() {
    speedMenu.classList.toggle('hidden');
    document.getElementById('qualityMenu').classList.add('hidden');
  });
  speedMenu.querySelectorAll('.menu-item').forEach(function(item) {
    item.addEventListener('click', function() {
      video.playbackRate = parseFloat(item.dataset.speed);
      updateSpeedUI();
      speedMenu.classList.add('hidden');
    });
  });

  // Quality
  var qualityMenu = document.getElementById('qualityMenu');
  document.getElementById('ctrlQuality').addEventListener('click', function() {
    qualityMenu.classList.toggle('hidden');
    speedMenu.classList.add('hidden');
  });
  qualityMenu.querySelectorAll('.menu-item').forEach(function(item) {
    item.addEventListener('click', function() {
      state.playerState.quality = item.dataset.quality;
      if (state.hlsInstance) {
        if (item.dataset.quality === 'auto') {
          state.hlsInstance.currentLevel = -1;
        } else {
          var levels = state.hlsInstance.levels;
          var target = null;
          for (var i = 0; i < levels.length; i++) {
            if (levels[i].height <= parseInt(item.dataset.quality)) { target = i; break; }
          }
          if (target !== null) state.hlsInstance.currentLevel = target;
        }
      }
      qualityMenu.classList.add('hidden');
    });
  });

  // Playlist
  document.getElementById('ctrlPlaylist').addEventListener('click', function() {
    document.getElementById('playlistPanel').classList.toggle('hidden');
  });
  document.getElementById('playlistClose').addEventListener('click', function() {
    document.getElementById('playlistPanel').classList.add('hidden');
  });

  // PiP
  document.getElementById('ctrlPip').addEventListener('click', function() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      video.requestPictureInPicture().catch(function() { showToast('PiP not supported'); });
    }
  });

  // Fullscreen
  document.getElementById('ctrlFullscreen').addEventListener('click', function() {
    var c = document.getElementById('videoContainer');
    if (!document.fullscreenElement) c.requestFullscreen().catch(function(){});
    else document.exitFullscreen();
  });

  // Progress
  var progressBar = document.getElementById('progressBar');
  var progressFill = document.getElementById('progressFill');
  var progressHead = document.getElementById('progressHead');
  var progressBuffer = document.getElementById('progressBuffer');

  progressBar.addEventListener('click', function(e) {
    var rect = progressBar.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    if (video.duration) video.currentTime = pct * video.duration;
  });

  video.addEventListener('timeupdate', function() {
    if (video.duration) {
      var pct = (video.currentTime / video.duration) * 100;
      progressFill.style.width = pct + '%';
      progressHead.style.left = pct + '%';
      document.getElementById('ctrlCurrentTime').textContent = fmtTime(video.currentTime);
      document.getElementById('ctrlDuration').textContent = fmtTime(video.duration);
    }
  });

  video.addEventListener('progress', function() {
    if (video.buffered.length > 0 && video.duration) {
      var bufEnd = video.buffered.end(video.buffered.length - 1);
      progressBuffer.style.width = (bufEnd / video.duration * 100) + '%';
    }
  });

  video.volume = state.playerState.defaultVolume;
  video.addEventListener('volumechange', updateVolumeUI);

  video.addEventListener('ended', function() {
    if (state.playerState.loop === 'same') {
      video.currentTime = 0; video.play().catch(function(){});
    } else if (state.playerState.loop === 'playlist') {
      if (state.currentVideoIndex < state.currentPlaylist.length - 1) playNext();
    } else {
      playNext();
    }
  });
}

function applyBrightness() {
  var o = document.getElementById('brightnessOverlay');
  var b = state.playerState.brightness;
  if (b > 0) o.style.background = 'rgba(255,255,255,' + (b * 0.5) + ')';
  else if (b < 0) o.style.background = 'rgba(0,0,0,' + (-b * 0.5) + ')';
  else o.style.background = 'transparent';
}

function applyUIScale() {
  var s = state.playerState.uiScale;
  document.getElementById('ctrlScaleVal').textContent = Math.round(s * 100) + '%';
  document.getElementById('playerOverlay').style.transform = 'scale(' + s + ')';
  document.getElementById('playerOverlay').style.transformOrigin = 'center center';
}

function updateSpeedUI() {
  var v = document.getElementById(CONFIG.PLAYER_ID);
  document.getElementById('ctrlSpeedVal').textContent = v.playbackRate.toFixed(1) + 'x';
}

function updateVolumeUI() {
  var v = document.getElementById(CONFIG.PLAYER_ID).volume;
  document.getElementById('volumeFill').style.height = (v * 100) + '%';
  var icon = document.getElementById('ctrlVolume').querySelector('i');
  icon.className = v === 0 ? 'fas fa-volume-mute' : v < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';
}

/* ===== HLS PLAYER ===== */
function loadVideo(url, title) {
  var video = document.getElementById(CONFIG.PLAYER_ID);
  if (state.hlsInstance) { state.hlsInstance.destroy(); state.hlsInstance = null; }

  document.getElementById('ctrlTitle').textContent = title || url;

  var isHLS = /\.m3u8(\?|$)/i.test(url) || /master|playlist.*m3u8/i.test(url);
  var isPDF = /\.pdf(\?|$)/i.test(url);

  if (isPDF) { openPDF(url, title); return; }

  if (isHLS && Hls.isSupported()) {
    var hls = new Hls({
      xhrSetup: function(xhr) { xhr.withCredentials = false; },
      manifestLoadingMaxRetry: 3,
      levelLoadingMaxRetry: 3,
      fragLoadingMaxRetry: 3,
      maxBufferLength: 30,
      enableWorker: true
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, function() {
      video.play().catch(function(){});
    });

    hls.on(Hls.Events.ERROR, function(e, data) {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          console.warn('[HLS] Direct failed, trying proxy...');
          hls.destroy();
          var proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);
          var hls2 = new Hls();
          hls2.loadSource(proxyUrl);
          hls2.attachMedia(video);
          hls2.on(Hls.Events.MANIFEST_PARSED, function() { video.play().catch(function(){}); });
          hls2.on(Hls.Events.ERROR, function(e2, d2) {
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
    video.play().catch(function(){});
  } else {
    video.src = url;
    video.play().catch(function(){});
  }
}

/* ===== PLAYLIST ===== */
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
  var item = state.currentPlaylist[idx];
  if (!item) return;
  state.currentVideoIndex = idx;
  loadVideo(item.url, item.title);
  renderPlaylist();
  renderSidePanels();
}

function renderPlaylist() {
  var container = document.getElementById('playlistBelow');
  container.innerHTML = '';
  state.currentPlaylist.forEach(function(item, i) {
    var div = document.createElement('div');
    div.className = 'pl-item' + (i === state.currentVideoIndex ? ' active' : '');
    div.innerHTML = '<div class="pl-thumb"><i class="fas fa-play-circle"></i></div><div class="pl-info"><div class="pl-title">' + (i + 1) + '. ' + escapeHtml(item.title) + '</div></div>';
    div.addEventListener('click', function() { playVideoAt(i); });
    container.appendChild(div);
  });

  var panel = document.getElementById('playlistItems');
  panel.innerHTML = '';
  state.currentPlaylist.forEach(function(item, i) {
    var div = document.createElement('div');
    div.className = 'playlist-item' + (i === state.currentVideoIndex ? ' active' : '');
    div.innerHTML = '<span class="pi-num">' + (i + 1) + '</span><span class="pi-title">' + escapeHtml(item.title) + '</span>';
    div.addEventListener('click', function() {
      playVideoAt(i);
      document.getElementById('playlistPanel').classList.add('hidden');
    });
    panel.appendChild(div);
  });
}

function renderSidePanels() {
  var currentFile = state.currentPlaylist[state.currentVideoIndex];
  if (!currentFile) return;
  var pdfList = document.getElementById('pdfList');
  var videos = document.getElementById('sideVideoList');
  pdfList.innerHTML = '';
  videos.innerHTML = '';

  var folder = findFolderByFile(currentFile);
  if (folder) {
    folder.files.forEach(function(f) {
      if (f.type === 'pdf') {
        var div = document.createElement('div');
        div.className = 'pdf-item';
        div.innerHTML = '<i class="fas fa-file-pdf"></i> ' + escapeHtml(f.title);
        div.addEventListener('click', function() { openPDF(f.url, f.title); });
        pdfList.appendChild(div);
      } else if (f.type === 'video' && f.url !== currentFile.url) {
        var div2 = document.createElement('div');
        div2.className = 'side-video-item';
        div2.innerHTML = '<i class="fas fa-video"></i> ' + escapeHtml(f.title);
        div2.addEventListener('click', function() {
          var idx = -1;
          for (var i = 0; i < state.currentPlaylist.length; i++) {
            if (state.currentPlaylist[i].url === f.url) { idx = i; break; }
          }
          if (idx >= 0) playVideoAt(idx);
        });
        videos.appendChild(div2);
      }
    });
  }
}

/* ===== ADD VIEW ===== */
function initAddView() {
  document.getElementById('newFolderBtn').addEventListener('click', function() {
    var name = prompt('Folder name:');
    if (!name) return;
    var id = genId();
    state.fileSystem.folders[id] = { id: id, name: name, parentId: state.currentFolderId || 'root', files: [] };
    saveState(); renderExplorer();
    showToast('Folder "' + name + '" created');
  });

  document.getElementById('newSubFolderBtn').addEventListener('click', function() {
    var name = prompt('Subfolder name:');
    if (!name) return;
    var id = genId();
    var parent = state.currentFolderId || 'root';
    state.fileSystem.folders[id] = { id: id, name: name, parentId: parent, files: [] };
    saveState(); renderExplorer();
    showToast('Subfolder "' + name + '" created');
  });

  document.getElementById('upDirBtn').addEventListener('click', function() {
    var cur = state.fileSystem.folders[state.currentFolderId || 'root'];
    if (cur && cur.parentId) state.currentFolderId = cur.parentId;
    else state.currentFolderId = null;
    renderExplorer();
  });

  // TXT import
  document.getElementById('txtFileInput').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) { parseTxtAndImport(ev.target.result); };
    reader.readAsText(file);
  });

  // URL fetcher
  document.getElementById('fetchAddBtn').addEventListener('click', function() {
    var title = document.getElementById('fetchTitle').value.trim();
    var url = document.getElementById('fetchUrl').value.trim();
    var folderId = document.getElementById('fetchFolder').value || 'root';

    if (!url) { showToast('Enter a URL'); return; }
    if (!title) { showToast('Enter a title'); return; }

    document.getElementById('confirmFileName').textContent = title;
    document.getElementById('confirmFolder').textContent = getFolderPath(folderId);
    populateFolderSelect('confirmFolderSelect', folderId);
    document.getElementById('confirmModal').classList.remove('hidden');

    document.getElementById('confirmOk').onclick = function() {
      var finalFolder = document.getElementById('confirmFolderSelect').value || folderId;
      var isVideo = /\.(mp4|m3u8)$/i.test(url);
      var isPDF2 = /\.pdf$/i.test(url);
      var type = isVideo ? 'video' : isPDF2 ? 'pdf' : 'file';

      state.fileSystem.folders[finalFolder].files.push({
        title: title, url: url, type: type, folderId: finalFolder
      });
      saveState();
      document.getElementById('confirmModal').classList.add('hidden');
      document.getElementById('fetchTitle').value = '';
      document.getElementById('fetchUrl').value = '';
      renderExplorer();
      showToast('Added: ' + title);
      if (isVideo) loadVideo(url, title);
    };

    document.getElementById('confirmCancel').onclick = function() {
      document.getElementById('confirmModal').classList.add('hidden');
    };
  });
}

function parseTxtAndImport(text) {
  var lines = text.split('\n').filter(function(l) { return l.trim() !== ''; });
  var imported = 0;

  lines.forEach(function(line) {
    var parts = line.split(',').map(function(p) { return p.trim(); });
    var subject = null, topic = null, title = null, url = null;

    if (parts.length === 4) {
      subject = parts[0]; topic = parts[1]; title = parts[2]; url = parts[3];
    } else if (parts.length === 3) {
      if (parts[2].startsWith('http')) { subject = parts[0]; title = parts[1]; url = parts[2]; }
      else { subject = parts[0]; topic = parts[1]; url = parts[2]; title = parts[2].split('/').pop(); }
    } else if (parts.length === 2) {
      if (parts[1].startsWith('http')) { title = parts[0]; url = parts[1]; }
      else { subject = parts[0]; topic = parts[1]; }
    } else if (parts.length === 1) {
      if (parts[0].startsWith('http')) { url = parts[0]; title = parts[0].split('/').pop(); }
      else { subject = parts[0]; }
    }

    if (!url) return;

    var folderId = 'root';
    if (subject) folderId = findOrCreateFolder(subject, 'root');
    if (topic) folderId = findOrCreateFolder(topic, folderId);

    var isVideo = /\.(mp4|m3u8)$/i.test(url);
    var isPDF = /\.pdf$/i.test(url);
    var type = isVideo ? 'video' : isPDF ? 'pdf' : 'file';

    state.fileSystem.folders[folderId].files.push({
      title: title || url.split('/').pop(), url: url, type: type, folderId: folderId
    });
    imported++;
  });

  saveState();
  renderExplorer();
  showToast('Imported ' + imported + ' items');
}

function renderExplorer() {
  var container = document.getElementById('explorerContent');
  container.innerHTML = '';
  var currentId = state.currentFolderId || 'root';
  var current = state.fileSystem.folders[currentId];
  document.getElementById('explorerPath').textContent = getFolderPath(currentId);

  var children = Object.values(state.fileSystem.folders).filter(function(f) { return f.parentId === currentId; });
  children.forEach(function(f) {
    var div = document.createElement('div');
    div.className = 'explorer-item folder';
    div.innerHTML = '<i class="fas fa-folder"></i> ' + escapeHtml(f.name);
    div.addEventListener('click', function() { state.currentFolderId = f.id; renderExplorer(); });
    container.appendChild(div);
  });

  current.files.forEach(function(f) {
    var icon = f.type === 'video' ? 'fas fa-video' : f.type === 'pdf' ? 'fas fa-file-pdf' : 'fas fa-file';
    var div = document.createElement('div');
    div.className = 'explorer-item file';
    div.innerHTML = '<i class="' + icon + '"></i> ' + escapeHtml(f.title);
    div.addEventListener('click', function() {
      if (f.type === 'video') {
        state.currentPlaylist = current.files.filter(function(x) { return x.type === 'video'; });
        var idx = -1;
        for (var i = 0; i < state.currentPlaylist.length; i++) {
          if (state.currentPlaylist[i].url === f.url) { idx = i; break; }
        }
        if (idx >= 0) { switchView('home'); playVideoAt(idx); }
      } else if (f.type === 'pdf') {
        openPDF(f.url, f.title);
      }
    });
    container.appendChild(div);
  });

  populateFolderSelect('fetchFolder', currentId);
}

/* ===== EXPLORE ===== */
function initExploreView() {
  document.getElementById('exploreDeleteFolder').addEventListener('click', function() {
    if (!state.currentFolderId || state.currentFolderId === 'root') return;
    if (!confirm('Delete this folder and all contents?')) return;
    deleteFolderRecursive(state.currentFolderId);
    state.currentFolderId = null;
    saveState();
    renderExplore();
    showToast('Folder deleted');
  });
}

function deleteFolderRecursive(id) {
  var children = Object.values(state.fileSystem.folders).filter(function(f) { return f.parentId === id; });
  children.forEach(function(c) { deleteFolderRecursive(c.id); });
  delete state.fileSystem.folders[id];
}

function renderExplore() {
  var grid = document.getElementById('exploreGrid');
  var breadcrumb = document.getElementById('exploreBreadcrumb');
  grid.innerHTML = '';
  breadcrumb.innerHTML = '';

  var currentId = state.currentFolderId || 'root';
  var current = state.fileSystem.folders[currentId];

  var path = [];
  var cur = current;
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? state.fileSystem.folders[cur.parentId] : null;
  }
  path.forEach(function(p, i) {
    var span = document.createElement('span');
    span.textContent = p.name;
    span.addEventListener('click', function() {
      state.currentFolderId = p.id === 'root' ? null : p.id;
      renderExplore();
    });
    breadcrumb.appendChild(span);
    if (i < path.length - 1) {
      var sep = document.createElement('span');
      sep.textContent = ' / ';
      sep.style.cursor = 'default';
      breadcrumb.appendChild(sep);
    }
  });

  var w = window.innerWidth;
  if (w > 1400) grid.className = 'explore-grid cols-6';
  else if (w > 1100) grid.className = 'explore-grid cols-5';
  else if (w > 800) grid   
