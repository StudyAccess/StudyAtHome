/* =====================================================
   STUDY PREMIUM LEARNING — Application Logic (script.js)
   ===================================================== */

/* ---- CUSTOM PORT / HLS CONFIG (paste your values here) ----
   URL:  replace with your custom port HLS stream URL
   VIDEO ID:  the player uses the element id "videoPlayer"  */
const CUSTOM_HLS_URL = "";       // e.g. "http://localhost:8080/hls/master.m3u8"
const PLAYER_VIDEO_ID = "videoPlayer";
const CORS_PROXY = "";           // default / custom proxy if set directly

/* Publicly free, working CORS proxies for streaming media, manifests, and videos */
const PUBLIC_CORS_PROXIES = {
  direct: { name: 'Direct (No Proxy)', prefix: '' },
  corsproxy_io: { name: 'CorsProxy.io (Fast, supports media & byte-ranges)', prefix: 'https://corsproxy.io/?url=' },
  allorigins: { name: 'AllOrigins (Open-source CORS proxy)', prefix: 'https://api.allorigins.win/raw?url=' },
  codetabs: { name: 'CodeTabs (Media & HLS CORS gateway)', prefix: 'https://api.codetabs.com/v1/proxy?quest=' },
  corsproxy_org: { name: 'CorsProxy.org', prefix: 'https://corsproxy.org/?' },
  corslol: { name: 'Cors.lol (Free public CORS gateway)', prefix: 'https://api.cors.lol/?url=' },
  thingproxy: { name: 'ThingProxy (Freeboard)', prefix: 'https://thingproxy.freeboard.io/fetch/' },
  bypasscors: { name: 'BypassCORS API', prefix: 'https://bypasscors.herokuapp.com/api/?url=' },
  yacdn: { name: 'YACDN Proxy', prefix: 'https://yacdn.org/proxy/' },
  corsanywhere: { name: 'CORS Anywhere (Demo)', prefix: 'https://cors-anywhere.herokuapp.com/' }
};

let STATE = {
  theme: localStorage.getItem('spl_theme') || 'dark',
  currentUser: null,
  users: [],
  folders: [],        // tree of folders: {id,name,parentId,type:'folder'}
  files: [],          // {id,name,url,type:'video'|'pdf',folderId,title}
  history: [],        // playback history
  page: 'home',
  sidemenuCollapsed: false,
  layout: 'grid',
  selectMode: false,
  selectedIds: new Set(),
  // player
  playlist: [],
  currentIndex: -1,
  locked: false,
  loopMode: 0,       // 0 off, 1 single repeat, 2 all repeat
  ratioMode: 0,      // 0 fit, 1 stretch, 2 crop
  uiScale: 0,
  brightness: 0,
  lastVolume: (()=>{
    let sv = parseFloat(localStorage.getItem('spl_lastVolume'));
    if(isNaN(sv) || sv == null) return 1.0;
    if(sv > 2.0) sv = sv / 100;
    return Math.max(0, Math.min(2.0, sv));
  })(),
  playbackSpeed: parseFloat(localStorage.getItem('spl_lastSpeed') || '1'),
  levels: [],
  currentQuality: null,
  corsProxy: localStorage.getItem('spl_corsProxy') || 'corsproxy_io',
  customCorsProxy: localStorage.getItem('spl_customCorsProxy') || ''
};

/* ---------- SEED DATA ---------- */
function seedData(){
  const admin = {id:'u_admin', name:'Admin', pass:'admin', role:'admin', perms:null};
  const guests = [
    {id:'u_guest1', name:'Guest', pass:'guest', role:'guest', perms:null},
    {id:'u_guest2', name:'Student', pass:'student', role:'guest', perms:null},
  ];
  let users = JSON.parse(localStorage.getItem('spl_users'));
  if(!users){ users = [admin, ...guests]; localStorage.setItem('spl_users', JSON.stringify(users)); }
  STATE.users = users;

  let folders = JSON.parse(localStorage.getItem('spl_folders'));
  let files = JSON.parse(localStorage.getItem('spl_files'));
  if(!folders){
    folders = [
      {id:'f1', name:'Mathematics', parentId:'root', type:'folder'},
      {id:'f2', name:'Physics', parentId:'root', type:'folder'},
      {id:'f3', name:'Calculus', parentId:'f1', type:'folder'},
      {id:'f4', name:'Algebra', parentId:'f1', type:'folder'},
    ];
  }
  if(!files){
    files = [
      {id:'v1', name:'Intro to Calculus', url:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', type:'video', folderId:'f3', title:'Intro to Calculus'},
      {id:'v2', name:'Derivatives Explained', url:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', type:'video', folderId:'f3', title:'Derivatives Explained'},
      {id:'v3', name:'Linear Algebra Basics', url:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', type:'video', folderId:'f4', title:'Linear Algebra Basics'},
      {id:'v4', name:'Newton Laws of Motion', url:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', type:'video', folderId:'f2', title:'Newton Laws of Motion'},
      {id:'v5', name:'Quantum Mechanics Intro', url:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', type:'video', folderId:'f2', title:'Quantum Mechanics Intro'},
      {id:'p1', name:'Calculus Notes.pdf', url:'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type:'pdf', folderId:'f3', title:'Calculus Notes'},
      {id:'p2', name:'Physics Formula Sheet.pdf', url:'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type:'pdf', folderId:'f2', title:'Physics Formula Sheet'},
    ];
  }
  STATE.folders = folders;
  STATE.files = files;
  let history = JSON.parse(localStorage.getItem('spl_history'));
  STATE.history = history || [];
  persist();
}

function persist(){
  localStorage.setItem('spl_folders', JSON.stringify(STATE.folders));
  localStorage.setItem('spl_files', JSON.stringify(STATE.files));
  localStorage.setItem('spl_history', JSON.stringify(STATE.history));
  localStorage.setItem('spl_users', JSON.stringify(STATE.users));
  localStorage.setItem('spl_theme', STATE.theme);
  localStorage.setItem('spl_lastVolume', String(STATE.lastVolume));
  localStorage.setItem('spl_lastSpeed', String(STATE.playbackSpeed));
  localStorage.setItem('spl_corsProxy', STATE.corsProxy);
  localStorage.setItem('spl_customCorsProxy', STATE.customCorsProxy);
}

/* ---------- THEME (Values and Settings) ---------- */
const state = STATE;
function save(){ persist(); }
const themes = ['light', 'dark', 'ocean', 'forest', 'rose', 'lavender', 'sunset'];

function setTheme(t){
  state.theme = t;
  document.documentElement.dataset.theme = t === 'light' ? '' : t;
  save();
  syncTheme();
}

function syncTheme(){
  const layer = $('#v14ThemeLayer');
  const theme = $('#v14Theme');
  if(theme) theme.textContent = ({light:'☀️', dark:'🌙', ocean:'🌊', forest:'🌲', rose:'🌹', lavender:'🪻', sunset:'🌅'})[state.theme] || '◐';
  layer?.querySelectorAll('[data-theme-v14]').forEach(b => b.classList.toggle('active', b.dataset.themeV14 === state.theme));
}

function setupTheme(){
  const top = $('.top-actions');
  if(!top) return;
  top.innerHTML = `<div id="v14TopArea"><div class="v14-user-row"><button class="v14-top-btn" id="v14Logout" title="Logout" aria-label="Logout"><svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-7"/></svg></button><button class="v14-top-btn v14-user-btn" id="v14User" title="Current user" aria-label="Current user"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M15 21a7 7 0 0 1 14 0"/></svg><span class="v14-user-name"></span></button></div><button class="v14-top-btn v14-settings-btn" id="v14Settings" title="Settings">⚙</button><div class="v14-clock" id="v14Clock">12:00:00 AM</div><button class="v14-top-btn v14-theme-btn" id="v14Theme" title="Change Theme">◐</button></div><div class="v14-theme-layer" id="v14ThemeLayer" aria-hidden="true"><div class="v14-theme-blur"></div><button class="v14-theme-choice" data-theme-v14="light"><span>☀️</span></button><button class="v14-theme-choice" data-theme-v14="dark"><span>🌙</span></button><button class="v14-theme-choice" data-theme-v14="ocean"><span>🌊</span></button><button class="v14-theme-choice" data-theme-v14="forest"><span>🌲</span></button><button class="v14-theme-choice" data-theme-v14="rose"><span>🌹</span></button><button class="v14-theme-choice" data-theme-v14="lavender"><span>🪻</span></button><button class="v14-theme-choice" data-theme-v14="sunset"><span>🌅</span></button></div><div class="v14-theme-name" id="v14ThemeName"></div>`;
  syncTheme();
  syncUserDisplay();
}

function syncUserDisplay(){
  const u = STATE.currentUser;
  const name = u ? u.name : 'Admin';
  const role = u ? u.role : 'admin';
  const nameEl = document.querySelector('.v14-user-name');
  if(nameEl) nameEl.textContent = name;
  const sNav = document.getElementById('settingsNav');
  if(sNav) sNav.style.display = role === 'admin' ? 'flex' : 'none';
  const sBtn = document.getElementById('v14Settings');
  if(sBtn) sBtn.style.display = role === 'admin' ? '' : 'none';
}

function applyTheme(){
  setTheme(state.theme || 'dark');
}

// Delegated events for top-action theme bar
document.addEventListener('click', e => {
  const themeChoice = e.target.closest('[data-theme-v14]');
  if(themeChoice){
    setTheme(themeChoice.dataset.themeV14);
    const layer = $('#v14ThemeLayer');
    if(layer){
      layer.setAttribute('aria-hidden', 'true');
      layer.classList.remove('open');
    }
    return;
  }
  const themeBtn = e.target.closest('#v14Theme');
  if(themeBtn){
    e.stopPropagation();
    const layer = $('#v14ThemeLayer');
    if(layer){
      const open = !layer.classList.contains('open');
      layer.classList.toggle('open', open);
      layer.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    return;
  }
  const logout = e.target.closest('#v14Logout');
  if(logout){ doLogout(); return; }
  const userBtn = e.target.closest('#v14User, #v14Settings');
  if(userBtn){ goPage('settings'); return; }

  const layer = $('#v14ThemeLayer');
  if(layer && !e.target.closest('#v14ThemeLayer')){
    layer.setAttribute('aria-hidden', 'true');
    layer.classList.remove('open');
  }
});

document.addEventListener('mouseover', e => {
  const choice = e.target.closest('[data-theme-v14]');
  const tn = $('#v14ThemeName');
  if(tn){
    tn.textContent = choice ? choice.dataset.themeV14.toUpperCase() : '';
  }
});

/* ---------- LOGIN ---------- */
let loginTab = 'admin';
function switchLoginTab(t){
  loginTab = t;
  document.getElementById('tabAdmin').classList.toggle('active', t==='admin');
  document.getElementById('tabGuest').classList.toggle('active', t==='guest');
  document.getElementById('loginTitle').textContent = t==='admin' ? 'Admin Login' : 'Guest Login';
  document.getElementById('loginSub').textContent = t==='admin' ? 'Enter your admin credentials' : 'Enter your guest credentials';
  if(t==='guest'){ document.getElementById('loginUser').value='Guest'; document.getElementById('loginPass').value='guest'; }
  else { document.getElementById('loginUser').value=''; document.getElementById('loginPass').value=''; }
  document.getElementById('loginError').textContent='';
}
function doLogin(){
  if(!STATE.users || STATE.users.length===0){ seedData(); }
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  const err = document.getElementById('loginError');
  if(!u || !p){ err.textContent='Please enter username and password'; return; }
  const user = STATE.users.find(x=>x.name.toLowerCase()===u.toLowerCase() && x.pass===p);
  if(!user){ err.textContent = 'Invalid username or password'; return; }
  if(loginTab==='admin' && user.role!=='admin'){ err.textContent='This is not an admin account'; return; }
  if(loginTab==='guest' && user.role!=='guest'){ err.textContent='This is not a guest account'; return; }
  
  // Save user session so reloading or refreshing page stays logged in
  STATE.currentUser = user;
  try { localStorage.setItem('spl_currentUser', JSON.stringify(user)); } catch(e){}

  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').style.display='flex';
  syncUserDisplay();
  
  const lastPage = localStorage.getItem('spl_lastPage') || 'home';
  goPage(lastPage);
}
function doLogout(){
  STATE.currentUser = null;
  try { localStorage.removeItem('spl_currentUser'); } catch(e){}
  document.getElementById('app').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  switchLoginTab('admin');
  syncUserDisplay();
  stopPlayback();
}

/* ---------- NAVIGATION ---------- */
function goPage(p){
  STATE.page = p;
  try { localStorage.setItem('spl_lastPage', p); } catch(e){}
  renderAll(true);
}
function renderAll(animateSlide = false){
  // Highlight active menu item
  document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.toggle('active', n.dataset.page===STATE.page));
  
  // Reset all slides and trigger fresh slide-in animation every time a menu item is clicked
  document.querySelectorAll('.page').forEach(pg=>{
    pg.classList.remove('active', 'page-slide-active');
  });
  
  const target = document.getElementById('page-'+STATE.page);
  if(target){
    target.classList.add('active');
    if(animateSlide){
      void target.offsetWidth;
      target.classList.add('page-slide-active');
    }
  }

  // Scroll content to top whenever a new slide/page opens
  const content = document.getElementById('content');
  if(content) content.scrollTop = 0;

  const titles={home:'Home',add:'Add File / Link',explore:'Explore',settings:'Settings'};
  const pt = document.getElementById('pageTitle');
  if(pt) pt.textContent = titles[STATE.page] || 'Home';

  if(STATE.page==='home'){ renderHome(); renderPlaylistBelow(); }
  if(STATE.page==='explore'){ renderExplore(); }
  if(STATE.page==='add'){ renderAddTree(); updateAddPreview(''); }
  if(STATE.page==='settings' && STATE.currentUser?.role==='admin'){ renderSettings(); }
  
  // close mobile sidebar
  const sb = document.getElementById('sidebar');
  if(sb) sb.classList.remove('open');
}
function toggleSidebar(){
  const sb = document.getElementById('sidebar');
  if(window.innerWidth<=860){ sb.classList.toggle('open'); }
  else {
    STATE.sidemenuCollapsed = !STATE.sidemenuCollapsed;
    sb.classList.toggle('collapsed', STATE.sidemenuCollapsed);
  }
}

/* ---------- PIE MENU ---------- */
const pieItems = [
  {ico:'🏠', label:'Home', page:'home'},
  {ico:'➕', label:'Add', page:'add'},
  {ico:'🗂️', label:'Explore', page:'explore'},
  {ico:'⚙️', label:'Settings', page:'settings'},
  {ico:'☀️', label:'Light', theme:'light'},
  {ico:'🌙', label:'Dark', theme:'dark'},
  {ico:'🌊', label:'Ocean', theme:'ocean'},
  {ico:'🌲', label:'Forest', theme:'forest'},
  {ico:'🌹', label:'Rose', theme:'rose'},
  {ico:'🪻', label:'Lavender', theme:'lavender'},
  {ico:'🌅', label:'Sunset', theme:'sunset'},
];
let pieOpen=false;
function buildPie(){
  const fab = document.getElementById('pieFab');
  const r = fab.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  return {cx, cy};
}
function togglePie(){
  pieOpen = !pieOpen;
  document.getElementById('pieFab').classList.toggle('active', pieOpen);
  if(pieOpen){
    const {cx,cy} = buildPie();
    const R = 150;
    document.querySelectorAll('.pie-item').forEach(el=>el.remove());
    pieItems.forEach((it,i)=>{
      const alpha = Math.PI - (i/(pieItems.length-1))*Math.PI;
      const x = cx + Math.cos(alpha)*R - 26;
      const y = cy - Math.sin(alpha)*R - 26;
      const el = document.createElement('div');
      el.className='pie-item';
      el.innerHTML = it.ico;
      el.style.left = x+'px'; el.style.top = y+'px';
      el.title = it.label;
      el.onclick = ()=> { if(it.page) goPage(it.page); if(it.theme){ setTheme(it.theme); } closePie(); };
      el.onmouseenter = (e)=>{ showPieLabel(it.label,e); };
      el.onmouseleave = ()=> document.getElementById('pieLabel').style.opacity=0;
      document.body.appendChild(el);
      requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('open')));
    });
  }else{
    document.querySelectorAll('.pie-item').forEach(el=>{el.classList.remove('open'); setTimeout(()=>el.remove(),350);});
    document.getElementById('pieLabel').style.opacity=0;
  }
}
function closePie(){ pieOpen=false; document.getElementById('pieFab').classList.remove('active'); document.querySelectorAll('.pie-item').forEach(el=>el.remove()); document.getElementById('pieLabel').style.opacity=0; }
function showPieLabel(txt,e){
  const l=document.getElementById('pieLabel'); l.textContent=txt; l.style.opacity=1;
  l.style.left=(e.clientX+14)+'px'; l.style.top=(e.clientY-10)+'px';
}
document.addEventListener('click', e=>{
  if(pieOpen && !e.target.closest('#pieFab') && !e.target.closest('.pie-item')){ closePie(); }
});

/* ---------- HELPERS ---------- */
function $(sel){
  if(typeof sel !== 'string') return null;
  if(sel.startsWith('#') && !sel.includes(' ') && !sel.includes('.') && !sel.includes('[')){
    return document.getElementById(sel.slice(1));
  }
  return document.querySelector(sel) || document.getElementById(sel);
}
function uid(){ return 'x'+Date.now()+Math.random().toString(36).slice(2,7); }
function toast(msg){
  const t = $('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'), 2600);
}
function showModal(title, bodyHTML, actionsHTML){
  $('modalTitle').textContent=title;
  $('modalBody').innerHTML=bodyHTML;
  $('modalActions').innerHTML=actionsHTML||'';
  $('modal').classList.add('show');
}
function closeModal(){ $('modal').classList.remove('show'); }
document.addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); });

function childFolders(parentId){ return STATE.folders.filter(f=>f.parentId===parentId); }
function filesIn(folderId){ return STATE.files.filter(f=>f.folderId===folderId); }
function folderById(id){ return STATE.folders.find(f=>f.id===id); }
function subtreeFileCount(id){
  let n=filesIn(id).length;
  childFolders(id).forEach(c=>{ n+=subtreeFileCount(c.id); });
  return n;
}
function folderPathNames(id){
  const parts=[]; let cur=id;
  while(cur && cur!=='root'){ const f=folderById(cur); if(!f) break; parts.unshift(f.name); cur=f.parentId; }
  return parts;
}
function fileIcon(type){ return type==='pdf' ? '📄' : '🎬'; }

/* ---------- RENDER HOME (player + previous playlist) ---------- */
function renderHome(){
  const vids = STATE.files.filter(f=>f.type==='video');
  if(vids.length===0){ return; }
  if(STATE.playlist.length===0 || STATE.currentIndex<0){
    const accessible = getUserAccessibleFiles().filter(f=>f.type==='video');
    STATE.playlist = accessible;
    if(STATE.currentIndex<0 && accessible.length>0){
      const last = STATE.history[0];
      if(last){ const li = STATE.playlist.findIndex(v=>v.id===last.id); STATE.currentIndex = li>=0?li:0; }
      else STATE.currentIndex=0;
    }
  }
  loadCurrent();
}

function getUserAccessibleFiles(){
  const user = STATE.currentUser;
  if(!user || user.role==='admin' || !user.perms) return STATE.files;
  const allowed = new Set(user.perms);
  return STATE.files.filter(f=> allowed.has(f.folderId));
}
function getUserAccessibleFolders(){
  const user = STATE.currentUser;
  if(!user || user.role==='admin' || !user.perms) return STATE.folders;
  const allowed = new Set(user.perms);
  return STATE.folders.filter(f=> allowed.has(f.id));
}
function allDescendantFolderIds(id){
  const res=[id];
  childFolders(id).forEach(c=>{ res.push(...allDescendantFolderIds(c.id)); });
  return res;
}
function isFolderAccessible(folderId){
  const user=STATE.currentUser;
  if(!user || user.role==='admin' || !user.perms) return true;
  const allowed=new Set(user.perms);
  return allowed.has(folderId) || allowed.has('root');
}

function loadCurrent(){
  const v = STATE.playlist[STATE.currentIndex];
  if(!v){ return; }
  $('videoTitle').textContent = v.title || v.name;
  playSource(v);
  renderPlaylistDrawer();
  renderRelated(v);
}

/* ---------- VIDEO SOURCE / HLS / CORS PROXIES ---------- */
let hls = null;
let currentPdf = null;
let hlsRetryMap = {};
let hlsLoading = null;

function ensureHls(cb){
  if(typeof Hls!=='undefined'){ cb(); return; }
  if(hlsLoading){ hlsLoading.push(cb); return; }
  hlsLoading=[cb];
  const done=()=>{ const q=hlsLoading; hlsLoading=null; (q||[]).forEach(f=>{ try{f();}catch(e){} }); };
  const s=document.createElement('script');
  s.src='https://unpkg.com/hls.js@1.5.13/dist/hls.min.js';
  s.onload=done;
  s.onerror=done;
  document.head.appendChild(s);
}

function safePlay(v){
  if(!v) return;
  try {
    const p = v.play();
    if(p && typeof p.then === 'function'){
      p.catch(err => {
        if(err && err.name !== 'AbortError' && !String(err).includes('aborted')){
          console.warn('Playback notice:', err);
        }
      });
    }
  } catch(e){}
}

function playSource(v){
  const video = document.getElementById(PLAYER_VIDEO_ID);
  $('loadSpin').classList.add('show');
  closePdfPlayer();
  const url = resolveUrl(v.url);
  const isHls = /\.m3u8/i.test(url);

  if(video){
    try { video.pause(); } catch(e){}
  }
  if(hls){
    try {
      hls.stopLoad();
      hls.detachMedia();
      hls.destroy();
    } catch(e){}
    hls = null;
  }
  STATE.levels=[];

  if(isHls){
    ensureHls(function(){
      if(typeof Hls!=='undefined' && Hls.isSupported()){
        hls = new Hls({ enableWorker:true, maxBufferLength: 30 });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function(event,data){
          STATE.levels = data.levels.map((l,i)=>({index:i, height:l.height||(240+i*120), bitrate:l.bitrate}));
          buildQualityMenu();
          safePlay(video);
        });
        hls.on(Hls.Events.LEVEL_LOADED, function(){ $('loadSpin').classList.remove('show'); });
        hls.on(Hls.Events.ERROR, function(e,data){
          if(data.fatal){
            if(data.type===Hls.ErrorTypes.NETWORK_ERROR){
              if(!hlsRetryMap[url]){ hlsRetryMap[url]=true; hls.startLoad(); }
              else { try{hls.destroy();}catch(err){} loadViaXHR(url, video); }
            } else {
              try{hls.destroy();}catch(err){} loadViaXHR(url, video);
            }
          }
        });
      } else if(video.canPlayType('application/vnd.apple.mpegurl')){
        video.src = url;
        safePlay(video);
      } else {
        loadViaXHR(url, video);
      }
    });
  } else {
    // direct file (.mp4 / .mkv / .webm) — set source AND start playback
    video.src = url;
    safePlay(video);
  }
  video.playbackRate = STATE.playbackSpeed;
  applyVolume(STATE.lastVolume != null ? STATE.lastVolume : 1.0);
  video.onloadedmetadata = ()=> { $('loadSpin').classList.remove('show'); updateDuration(); };
  video.oncanplay = ()=> $('loadSpin').classList.remove('show');
  video.onwaiting = ()=> $('loadSpin').classList.add('show');
  video.onplaying = ()=> { $('loadSpin').classList.remove('show'); updatePlayButtons(false); };
  video.onpause = ()=> updatePlayButtons(true);
  video.onended = ()=> {
    if(STATE.loopMode === 1){ video.currentTime = 0; safePlay(video); }
    else if(STATE.loopMode === 2){ nextVideo(); }
    else if(STATE.currentIndex < STATE.playlist.length - 1){ nextVideo(); }
  };
  video.onerror = ()=> {
    $('loadSpin').classList.remove('show');
    // Auto-fallback: if direct URL failed due to CORS or ORB, auto-retry with CorsProxy.io
    if(v && v.url && !v._triedFallback && (!STATE.corsProxy || STATE.corsProxy === 'direct')){
      v._triedFallback = true;
      toast('Media blocked by CORS/ORB — auto-retrying via CorsProxy.io...');
      STATE.corsProxy = 'corsproxy_io';
      localStorage.setItem('spl_corsProxy', 'corsproxy_io');
      setTimeout(()=>playSource(v), 300);
      return;
    }
    toast('⚠️ Could not load this video — check URL or select another CORS Proxy in Settings');
  };
  
  const exists = STATE.history.find(h=>h.id===v.id);
  if(exists){ STATE.history = STATE.history.filter(h=>h.id!==v.id); }
  STATE.history.unshift({id:v.id, ts:Date.now()});
  STATE.history = STATE.history.slice(0,50);
  persist();
}

function loadViaXHR(url, video){
  const full = resolveUrl(url);
  const xhr = new XMLHttpRequest();
  xhr.open('GET', full, true);
  xhr.responseType='arraybuffer';
  xhr.onload=function(){
    const blob=new Blob([xhr.response],{type:'application/vnd.apple.mpegurl'});
    const objUrl=URL.createObjectURL(blob);
    video.src=objUrl;
    safePlay(video);
    $('loadSpin').classList.remove('show');
  };
  xhr.onerror=function(){ toast('Failed to load stream via proxy'); $('loadSpin').classList.remove('show'); };
  xhr.send();
}

/* Resolves media and manifest URLs through the active CORS proxy
   Supports MP4, M3U8, PDF, JSON and other cross-origin resources */
function resolveUrl(u){
  if(!u || typeof u !== 'string') return '';
  u = u.trim();
  if(/^(blob:|data:)/i.test(u)) return u;

  const currentSetting = STATE.corsProxy || localStorage.getItem('spl_corsProxy') || 'corsproxy_io';
  if(currentSetting === 'direct') return u;

  let prefix = '';
  if(currentSetting === 'custom'){
    prefix = (STATE.customCorsProxy || localStorage.getItem('spl_customCorsProxy') || '').trim();
  } else if(PUBLIC_CORS_PROXIES[currentSetting]){
    prefix = PUBLIC_CORS_PROXIES[currentSetting].prefix;
  } else if(typeof CORS_PROXY === 'string' && CORS_PROXY){
    prefix = CORS_PROXY;
  }

  if(prefix && /^https?:\/\//i.test(u)){
    if(u.startsWith(prefix)) return u;
    if(prefix.endsWith('?url=') || prefix.endsWith('?quest=') || prefix.endsWith('&url=')){
      return prefix + encodeURIComponent(u);
    }
    if(prefix.includes('{url}')){
      return prefix.replace('{url}', encodeURIComponent(u));
    }
    return prefix + u;
  }
  return u;
}

function updateDuration(){
  const v=$('videoPlayer');
  if(!isFinite(v.duration)) return;
  $('durTime').textContent = '-'+fmtTime(Math.max(0,v.duration-v.currentTime))+' / '+fmtTime(v.duration);
}
function fmtTime(s){
  if(!isFinite(s) || s<0) return '0:00';
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60);
  if(h>0) return h+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
  return m+':'+String(sec).padStart(2,'0');
}

/* ---------- PLAYER CONTROLS ---------- */
function togglePlay(){
  const v=$('videoPlayer');
  if(!v) return;
  if(v.paused){ safePlay(v); } else { v.pause(); }
}
const PLAY_ICON='<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE_ICON='<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
function svgIcon(path, size){
  return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="currentColor"><path d="'+path+'"/></svg>';
}
function updatePlayButtons(paused){
  $('centerPlayBtn').innerHTML = paused ? PLAY_ICON : PAUSE_ICON;
  $('miniPlayBtn').innerHTML = paused ? svgIcon('M8 5v14l11-7z',15) : svgIcon('M6 5h4v14H6zm8 0h4v14h-4z',15);
}
function seekBy(sec){
  const v=$('videoPlayer');
  v.currentTime = Math.max(0, Math.min(v.duration||0, v.currentTime+sec));
  flashCenter(sec>0?'⏩':'⏪', sec+'s');
}
function nextVideo(){
  if(STATE.playlist.length===0) return;
  if(STATE.currentIndex < STATE.playlist.length-1){ STATE.currentIndex++; loadCurrent(); }
  else if(STATE.loopMode===2){ STATE.currentIndex=0; loadCurrent(); }
}
function prevVideo(){
  if(STATE.currentIndex>0){ STATE.currentIndex--; loadCurrent(); }
}
function playerHome(){ goPage('home'); }

function toggleLock(){
  STATE.locked = !STATE.locked;
  const btn = $('lockBtn');
  if (STATE.locked) {
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm-2 6V6a2 2 0 1 1 4 0v2h-4zm2 5a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.72V19h-2v-2.28c-.6-.34-1-.98-1-1.72a2 2 0 0 1 2-2z"/></svg>';
    btn.title = "Unlock controls";
  } else {
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm3 8H9V6a3 3 0 0 1 6 0z"/></svg>';
    btn.title = "Lock controls UI";
  }
  $('playerUI').classList.toggle('controls-hidden', STATE.locked);
}

function toggleLoop(){
  STATE.loopMode = (STATE.loopMode + 1) % 3;
  const svgs = {
    0: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-9z"/></svg>',
    1: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-9z"/><text x="12" y="15" font-size="9" font-weight="bold" fill="currentColor" text-anchor="middle">1</text></svg>',
    2: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>'
  };
  const titles = { 0: "Loop off", 1: "Loop single video", 2: "Loop entire playlist" };
  $('loopBtn').innerHTML = svgs[STATE.loopMode];
  $('loopBtn').title = titles[STATE.loopMode];
  toast(titles[STATE.loopMode]);
}

function toggleRatio(){
  STATE.ratioMode = (STATE.ratioMode + 1) % 3;
  const stage = $('playerStage');
  stage.classList.remove('ratio-fit', 'ratio-stretch', 'ratio-crop');
  const svgs = {
    0: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 5h18v14H3zM5 7v10h14V7z"/></svg>',
    1: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 4h20v16H2V4zm2 2v12h16V6H4zM8 9h8v6H8V9z"/></svg>',
    2: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"/></svg>'
  };
  const titles = { 0: "Aspect: Fit", 1: "Aspect: Stretch", 2: "Aspect: Crop" };
  $('ratioBtn').innerHTML = svgs[STATE.ratioMode];
  $('ratioBtn').title = titles[STATE.ratioMode];
  if (STATE.ratioMode === 0) stage.classList.add('ratio-fit');
  if (STATE.ratioMode === 1) stage.classList.add('ratio-stretch');
  if (STATE.ratioMode === 2) stage.classList.add('ratio-crop');
  toast(titles[STATE.ratioMode]);
}

function flashCenter(ico,cap){
  const cx=$('centerX'); $('centerIco').textContent=ico; $('centerCap').textContent=cap||'';
  cx.classList.add('show'); clearTimeout(cx._t); cx._t=setTimeout(()=>cx.classList.remove('show'),600);
}

/* speed */
function incSpeed(){ setSpeed(STATE.playbackSpeed+0.1); }
function decSpeed(){ setSpeed(STATE.playbackSpeed-0.05); }
function setSpeed(s){
  s=Math.round(s*100)/100;
  if(s<0.25) s=0.25; if(s>4) s=4;
  STATE.playbackSpeed=s;
  $('videoPlayer').playbackRate=s;
  $('speedVal').textContent=s.toFixed(s%1?2:1).replace(/\.?0+$/,'')+'x';
}
function toggleMenu(id){
  const el=$(id);
  const open=el.classList.contains('open');
  document.querySelectorAll('.pui-menu').forEach(m=>m.classList.remove('open'));
  if(!open){
    el.classList.add('open');
    if(id==='speedMenu') buildSpeedMenu();
    if(id==='qualityMenu') buildQualityMenu();
    const r=$('rightControls').getBoundingClientRect();
    const stage=$('playerStage').getBoundingClientRect();
    el.style.left=Math.max(10, (r.left-stage.left))+'px';
    el.style.bottom=(stage.bottom-r.top+10)+'px';
    el.style.right='auto'; el.style.top='auto';
  }
}
function buildSpeedMenu(){
  const sp=[0.7,1.0,1.5,2.0,2.5,3.0,3.5,4.0];
  $('speedMenu').innerHTML = `
    <div style="padding:5px 12px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Playback Speed</div>
    ${sp.map(s=>`<button class="${Math.abs(s-STATE.playbackSpeed)<0.01?'active':''}" onclick="setSpeed(${s});closeMenus()">${s.toFixed(1)}x</button>`).join('')}
  `;
}
function buildQualityMenu(){
  const defaultQualities = [1040, 720, 480, 360, 240, 144];
  const lv = STATE.levels.length ? STATE.levels : defaultQualities.map((h,i)=>({index:i, height:h, bitrate:0}));
  const sorted = lv.slice().sort((a,b)=>b.height-a.height);
  $('qualityMenu').innerHTML = `
    <div style="padding:6px 12px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Quality Selector</div>
    ${sorted.map(l=>`<button class="${STATE.currentQuality===l.height?'active':''}" ${l.bitrate?'':'onclick="fakeQuality('+l.height+')\"'} data-h="${l.height}" onclick="setQuality(${l.index})">${l.height}p</button>`).join('')}
  `;
}
function setQuality(idx){
  if(hls){ hls.nextLevel=idx; toast('Quality changed to ' + (STATE.levels[idx]?.height || '') + 'p'); }
  STATE.currentQuality = STATE.levels[idx]?.height || 720;
  const qc=$('qualityChip'); if(qc) qc.textContent = STATE.currentQuality + 'p';
  closeMenus();
}
function fakeQuality(h){
  STATE.currentQuality = h;
  const qc=$('qualityChip'); if(qc) qc.textContent = h + 'p';
  toast('Quality set to '+h+'p');
  closeMenus();
}

function changeUIScale(d){
  STATE.uiScale=Math.max(-0.5, Math.min(1.0, Math.round((STATE.uiScale+d)*100)/100));
  applyUIScale();
  toast('UI Scale: ' + Math.round((1+STATE.uiScale)*100) + '%');
}
function applyUIScale(){
  const scale = 1 + STATE.uiScale;
  const ui=$('playerUI');
  if(ui) ui.style.setProperty('--uis', scale);
  const sv=$('uiScaleVal'); if(sv) sv.textContent=Math.round(scale*100)+'%';
}
function closeMenus(){ document.querySelectorAll('.pui-menu').forEach(m=>m.classList.remove('open')); }

function togglePlaylist(){
  const d=$('plDrawer'); d.classList.toggle('open'); renderPlaylistDrawer();
}
function renderPlaylistDrawer(){
  const wrap=$('plDrawerList');
  if(STATE.playlist.length===0){ wrap.innerHTML='<div style="color:#8a93b5;font-size:12px;padding:12px">No videos in playlist</div>'; return; }
  wrap.innerHTML = STATE.playlist.map((v,i)=>{
    const isCurrent = (i === STATE.currentIndex);
    const isPrev = (i === STATE.currentIndex - 1);
    const isNext = (i === STATE.currentIndex + 1);
    const badge = isCurrent ? '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--glow);color:#fff;font-weight:700">PLAYING</span>' : (isPrev ? '<span style="font-size:10px;opacity:.65">PREVIOUS</span>' : (isNext ? '<span style="font-size:10px;opacity:.8;color:var(--glow2)">NEXT</span>' : ''));
    const title = v.title || v.name || ('Video ' + (i+1));
    return `
      <div class="pl-item ${isCurrent?'current':''}" onclick="jumpToPlaylist(${i})" title="${esc(title)}">
        <span class="idx">#${i+1}</span>
        <div style="min-width:0;flex:1">
          <div class="tt">${esc(title)}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px">${badge}</div>
        </div>
      </div>
    `;
  }).join('');
  setTimeout(()=>{
    const curEl = wrap.querySelector('.pl-item.current');
    if(curEl) curEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 60);
}
function jumpToPlaylist(i){ STATE.currentIndex=i; loadCurrent(); closeMenus(); }

function togglePip(){
  const v=$('videoPlayer');
  if(document.pictureInPictureElement){ document.exitPictureInPicture(); }
  else if(v.requestPictureInPicture){ v.requestPictureInPicture(); }
}
function toggleFullscreen(){
  const stage=$('playerStage');
  if(!document.fullscreenElement){ stage.requestFullscreen?.(); }
  else { document.exitFullscreen(); }
}
document.addEventListener('fullscreenchange', ()=>{
  const stage=$('playerStage');
  if(!stage) return;
  stage.classList.toggle('is-fullscreen', !!document.fullscreenElement);
});

/* brightness / volume swipe (supports horizontal swipe & vertical swipe, touch + mouse) */
function enableVerticalSwipe(){
  const stage=$('playerStage');
  let startX=0, startY=0, mode=null, base=0, isDragging=false;
  
  function down(e){
    if(STATE.locked) return;
    if(e.target.closest('.pui-btn') || e.target.closest('.pui-menu') || e.target.closest('.pl-drawer') || e.target.closest('.progress-track') || e.target.closest('.speed-chip') || e.target.closest('.ui-scaler-wrap')) return;
    const rect = stage.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX;
    const y = t.clientY;
    const relX = (x - rect.left) / rect.width;
    
    if(relX < 0.40){ mode = 'brightness'; }
    else { mode = 'volume'; }
    
    startX = x;
    startY = y;
    isDragging = false;
    base = (mode === 'brightness') ? (STATE.brightness || 0) : (STATE.lastVolume != null ? STATE.lastVolume : 1.0);
    stage.addEventListener('mousemove', move);
    stage.addEventListener('touchmove', move, {passive:false});
  }
  
  function move(e){
    if(!mode) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - startX;
    const dy = startY - t.clientY;
    const dist = Math.hypot(dx, dy);
    if(!isDragging && dist < 5) return;
    isDragging = true;
    if(e.cancelable) e.preventDefault();
    
    const isHorizontal = Math.abs(dx) >= Math.abs(dy);
    const delta = isHorizontal
      ? (dx / (stage.clientWidth * 0.38))
      : (dy / (stage.clientHeight * 0.42));

    if(mode === 'brightness'){
      let b = base + delta;
      b = Math.max(-1, Math.min(1, Math.round(b * 100) / 100));
      STATE.brightness = b;
      applyBrightness();
      showHud('🔆', Math.round((b + 1) * 50) + '%', Math.round((b + 1) * 50), 'left');
    } else if(mode === 'volume'){
      let vol = base + delta;
      vol = Math.max(0, Math.min(2.0, Math.round(vol * 100) / 100));
      STATE.lastVolume = vol;
      persist();
      applyVolume(vol);
      showHud('🔊', Math.round(vol * 100) + '%', Math.min(100, Math.round(vol * 100 / 2)), 'right');
    }
  }
  
  function up(){
    stage.removeEventListener('mousemove', move);
    stage.removeEventListener('touchmove', move);
    mode = null;
    isDragging = false;
  }
  
  stage.addEventListener('mousedown', down);
  stage.addEventListener('touchstart', down, {passive:true});
  window.addEventListener('mouseup', up);
  window.addEventListener('touchend', up);
}

function applyBrightness(){
  const v = $('videoPlayer');
  if(!v) return;
  const b = STATE.brightness; // -1..1
  const val = 100 + b * 100;
  v.style.filter = `brightness(${val}%)`;
}

function ensureAudioGain(){
  if(STATE._audioReady || STATE._audioFailed) return;
  try{
    const video = $('videoPlayer');
    if(!video) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx){ STATE._audioFailed = true; return; }
    const ctx = new Ctx();
    const src = ctx.createMediaElementSource(video);
    const gain = ctx.createGain();
    src.connect(gain).connect(ctx.destination);
    STATE._audioCtx = ctx;
    STATE._gainNode = gain;
    STATE._audioReady = true;
  }catch(e){
    STATE._audioFailed = true;
  }
}

function applyVolume(vol){
  vol = Math.max(0, Math.min(2.0, vol));
  STATE.lastVolume = vol;
  const video = $('videoPlayer');
  if(!video) return;

  video.muted = false;
  video.volume = Math.min(1.0, Math.max(0, vol > 1 ? 1.0 : vol));

  ensureAudioGain();
  if(STATE._audioReady && STATE._gainNode){
    try{
      if(STATE._audioCtx && STATE._audioCtx.state === 'suspended'){
        STATE._audioCtx.resume().catch(()=>{});
      }
      STATE._gainNode.gain.value = vol;
    }catch(e){}
  }
}

let hudTimer;
function showHud(ico,num,fillPct,pos){
  const hud=$('hudVertical');
  hud.classList.add('show');
  hud.classList.remove('pos-left','pos-right');
  if(pos==='left') hud.classList.add('pos-left');
  if(pos==='right') hud.classList.add('pos-right');
  $('hudIco').textContent=ico;
  $('hudNum').textContent=num;
  $('hudFill').style.height=fillPct+'%';
  clearTimeout(hudTimer);
  hudTimer=setTimeout(()=>$('hudVertical').classList.remove('show'),900);
}
function hideHud(){ clearTimeout(hudTimer); $('hudVertical').classList.remove('show'); }

/* double-tap & gesture seek */
function enableDoubleTap(){
  const stage=$('playerStage');
  let lastTap=0;
  function tap(e){
    if(STATE.locked) return;
    if(e.target.closest('.pui-btn') || e.target.closest('.progress-track') || e.target.closest('.speed-chip') || e.target.closest('.pui-menu') || e.target.closest('.pl-drawer')) return;
    const t=e.touches?e.touches[0]:e;
    const now=Date.now();
    const rect=stage.getBoundingClientRect();
    const relX=(t.clientX-rect.left)/rect.width;
    if(now-lastTap<320){
      if(relX < 0.28){ seekBy(-30); flashCenter('⏪','-30s'); }
      else if(relX < 0.48){ seekBy(-10); flashCenter('◀','-10s'); }
      else if(relX < 0.72){ seekBy(10); flashCenter('▶','+10s'); }
      else { seekBy(30); flashCenter('⏩','+30s'); }
      lastTap=0;
    } else {
      lastTap=now;
      setTimeout(()=>{
        if(lastTap && (Date.now()-lastTap>=300)){
          togglePlay();
          lastTap=0;
        }
      }, 310);
    }
  }
  stage.addEventListener('touchstart', tap, {passive:true});
  stage.addEventListener('click', tap);
}

/* progress bar dragging */
function enableProgress(){
  const track=$('progTrack');
  let dragging=false;
  function seek(e){
    const rect=track.getBoundingClientRect();
    const p = (e.clientX-rect.left)/rect.width;
    const v=$('videoPlayer');
    if(v.duration) v.currentTime=p*v.duration;
  }
  track.addEventListener('mousedown',e=>{dragging=true;seek(e);});
  track.addEventListener('mousemove',e=>{if(dragging)seek(e);});
  window.addEventListener('mouseup',()=>dragging=false);
  track.addEventListener('touchstart',e=>{dragging=true;seek(e.touches[0]);},{passive:false});
  track.addEventListener('touchmove',e=>{if(dragging){seek(e.touches[0]);e.preventDefault();}},{passive:false});
  window.addEventListener('touchend',()=>dragging=false);
}
function updateProgress(){
  const v=$('videoPlayer');
  if(v.duration){
    const p=v.currentTime/v.duration*100;
    $('progFill').style.width=p+'%';
    $('progHead').style.left=p+'%';
    $('curTime').textContent=fmtTime(v.currentTime);
    if(v.buffered.length){ const b=v.buffered.end(v.buffered.length-1)/v.duration*100; $('progBuffered').style.width=b+'%'; }
    $('durTime').textContent='-'+fmtTime(Math.max(0,v.duration-v.currentTime))+' / '+fmtTime(v.duration);
  } else {
    $('curTime').textContent='0:00';
    $('durTime').textContent='-0:00 / 0:00';
  }
  if(STATE.loopMode===1 && v.ended){ v.currentTime=0; safePlay(v); }
  requestAnimationFrame(updateProgress);
}

/* ---------- PLAYER INIT ---------- */
function initPlayer(){
  enableVerticalSwipe();
  enableDoubleTap();
  enableProgress();
  setInterval(()=>{
    const v=$('videoPlayer');
    if(v.ended || (v.currentTime>0 && v.currentTime>=v.duration && v.duration>1)){
      if(STATE.loopMode===1){ v.currentTime=0; safePlay(v); }
      else if(STATE.loopMode===2){ nextVideo(); }
      else if(STATE.currentIndex < STATE.playlist.length-1){ nextVideo(); }
    }
  },1000);
  updateProgress();
  buildSpeedMenu(); buildQualityMenu();
  applyUIScale();
}

/* ---------- PDF VIEWER ---------- */
function openPdf(file){
  const viewer = $('pdfFrame');
  if(!viewer){
    const el=document.createElement('iframe');
    el.id='pdfFrame';
    el.src=resolveUrl(file.url);
    document.body.appendChild(el);
  } else { viewer.src=resolveUrl(file.url); }
  showModal('📄 '+ (file.title||file.name),
    `<iframe id="pdfFrame" src="${resolveUrl(file.url)}"></iframe>`,
    `<button class="tbtn" onclick="downloadPdf('${encodeURIComponent(file.url)}')">⬇️ Download</button>
     <a class="tbtn primary" href="${resolveUrl(file.url)}" target="_blank">🔗 Open in New Tab</a>`
  );
}
function downloadPdf(url){
  const a=document.createElement('a'); a.href=url; a.download='document.pdf'; a.target='_blank'; document.body.appendChild(a); a.click(); a.remove();
}
function closePdfPlayer(){}

/* ---------- RELATED LISTS ---------- */
function renderRelated(current){
  const folderId = current.folderId;
  const vids = STATE.files.filter(f=>f.folderId===folderId && f.type==='video');
  const pdfs = STATE.files.filter(f=>f.folderId===folderId && f.type==='pdf');
  $('relVideos').innerHTML = vids.map((f,i)=>{
    const isCur = f.id===current.id;
    return `<div class="re-item" onclick="playFileById('${f.id}')" style="${isCur?'border-color:var(--glow)':''}">
      <span class="thumb">🎬</span><div class="mt"><span class="n">${f.title||f.name}</span><span class="s">Video • ${i+1}</span></div><span class="badge">MP4</span></div>`;
  }).join('') || '<div style="color:var(--muted);font-size:13px;padding:10px">No videos</div>';
  $('relPdfs').innerHTML = pdfs.map((f,i)=>{
    return `<div class="re-item" onclick="openPdfFileById('${f.id}')">
      <span class="thumb">📄</span><div class="mt"><span class="n">${f.title||f.name}</span><span class="s">PDF • ${i+1}</span></div><span class="badge">PDF</span></div>`;
  }).join('') || '<div style="color:var(--muted);font-size:13px;padding:10px">No PDFs</div>';
}
function playFileById(id){
  const f=STATE.files.find(x=>x.id===id);
  if(!f) return;
  if(f.type==='pdf'){ openPdf(f); return; }
  const folderVids = STATE.files.filter(x=>x.folderId===f.folderId && x.type==='video');
  STATE.playlist=folderVids;
  STATE.currentIndex=folderVids.findIndex(x=>x.id===id);
  if(STATE.page!=='home'){ goPage('home'); }
  else { loadCurrent(); }
}
function openPdfFileById(id){
  const f=STATE.files.find(x=>x.id===id); if(f) openPdf(f);
}

/* ---------- HOME PREVIOUS WATCHED ---------- */
function setLayout(l){
  STATE.layout=l;
  $('gridBtn').classList.toggle('active',l==='grid');
  $('listBtn').classList.toggle('active',l==='list');
  renderPlaylistBelow();
}
function renderPlaylistBelow(){
  const wrap=$('homePlaylist');
  wrap.className = STATE.layout==='grid'?'playlist-grid':'playlist-list';
  const his = STATE.history.map(h=>STATE.files.find(f=>f.id===h.id)).filter(Boolean);
  if(his.length===0){ wrap.innerHTML='<div style="color:var(--muted);grid-column:1/-1;text-align:center;padding:30px">No watched videos yet</div>'; return; }
  wrap.innerHTML = his.map((f,i)=>{
    const isCur = STATE.playlist[STATE.currentIndex] && STATE.playlist[STATE.currentIndex].id===f.id;
    const cls = STATE.layout==='grid'?'play-item':'play-item list';
    return `<div class="${cls} ${isCur?'dim':''}" onclick="playFileById('${f.id}')">
      <div class="thumb"><span class="pi">🎬</span><span class="play-ov">▶</span></div>
      <div class="meta"><div class="t">${f.title||f.name}</div><div class="sub">${fileIcon(f.type)} ${f.type==='pdf'?'PDF':'Video'} • ${i+1}</div></div>
    </div>`;
  }).join('');
}

/* ---------- EXPLORE ---------- */
let exploreCurrent='root';
function renderExplore(){
  exploreCurrent = exploreCurrent || 'root';
  renderCrumbs();
  const isRoot = exploreCurrent==='root';
  const grid=$('exploreGrid');
  const folders = childFolders(exploreCurrent).filter(f=>isFolderAccessible(f.id));
  const files = filesIn(exploreCurrent).filter(f=>isFolderAccessible(f.folderId));

  let html='';
  if(isRoot){
    html += `<div class="folders-grid">`;
  }
  folders.forEach(f=>{
    const sel = STATE.selectedIds.has(f.id)?'selected':'';
    html += `<div class="folder-card ${sel}" onclick="${STATE.selectMode?`toggleSelect('${f.id}')`:`openFolder('${f.id}')`}">
      <span class="del" onclick="event.stopPropagation();delFolder('${f.id}')">✕</span>
      <span class="sel">✓</span>
      <span class="fic">📁</span>
      <span class="fn">${f.name}</span>
      <span class="fc">${subtreeFileCount(f.id)} files</span>
    </div>`;
  });
  files.forEach(f=>{
    const sel2 = STATE.selectedIds.has(f.id)?'selected':'';
    html += `<div class="folder-card ${sel2}" onclick="${STATE.selectMode?`toggleSelect('${f.id}')`:(f.type==='pdf'?`openPdfFileById('${f.id}')`:`playFileInPip('${f.id}')`)}">
      <span class="del" onclick="event.stopPropagation();delFile('${f.id}')">✕</span>
      <span class="sel">✓</span>
      <span class="fic" style="font-size:22px">${fileIcon(f.type)}</span>
      <span class="fn">${f.title||f.name}</span>
      <span class="fc">${f.type==='pdf'?'PDF':'Video (Click for PiP)'}</span>
    </div>`;
  });
  if(folders.length===0 && files.length===0){
    html += `<div style="color:var(--muted);text-align:center;padding:40px;grid-column:1/-1">This folder is empty. Add content from "Add File / Link".</div>`;
  }
  html += `</div>`;
  grid.innerHTML=html;

  $('selectModeBtn').textContent = STATE.selectMode?'✖ Cancel':'☑️ Select';
  $('selectModeBtn').classList.toggle('danger',STATE.selectMode);
  $('selectAllBtn').style.display = STATE.selectMode?'':'none';
  $('moveBtn').style.display = STATE.selectMode?'':'none';
  $('delSelBtn').style.display = STATE.selectMode?'':'none';
}
function renderCrumbs(){
  const bar=$('crumbBar');
  const path=folderPathNames(exploreCurrent);
  let html=`<span class="crumb" onclick="openFolder('root')">🏠 Home</span>`;
  let cur='root';
  path.forEach((name,i)=>{
    const f = STATE.folders.find(x=>x.name===name && (cur==='root'||x.parentId===cur));
    if(f){ cur=f.id; html+=` › <span class="crumb ${i===path.length-1?'leaf':''}" onclick="openFolder('${f.id}')">📁 ${f.name}</span>`; }
  });
  bar.innerHTML=html;
}
function openFolder(id){ exploreCurrent=id; STATE.selectedIds.clear(); STATE.selectMode=false; renderExplore(); }
function delFolder(id){
  showModal('Delete Folder', '<p style="color:var(--muted);font-size:14px">Delete this folder and all contents inside?</p>',
    `<button class="tbtn" onclick="closeModal()">Cancel</button><button class="tbtn danger" onclick="confirmDelFolder('${id}')">Delete</button>`);
}
function confirmDelFolder(id){
  const ids=allDescendantFolderIds(id);
  STATE.folders=STATE.folders.filter(f=>!ids.includes(f.id));
  STATE.files=STATE.files.filter(f=>!ids.includes(f.folderId));
  persist(); closeModal(); toast('Folder deleted'); renderExplore();
}
function delFile(id){
  showModal('Remove File', '<p style="color:var(--muted);font-size:14px">Remove this file link?</p>',
    `<button class="tbtn" onclick="closeModal()">Cancel</button><button class="tbtn danger" onclick="confirmDelFile('${id}')">Remove</button>`);
}
function confirmDelFile(id){
  STATE.files=STATE.files.filter(f=>f.id!==id);
  persist(); closeModal(); toast('File removed'); renderExplore();
}
function toggleSelect(id){
  if(STATE.selectedIds.has(id)) STATE.selectedIds.delete(id); else STATE.selectedIds.add(id);
  renderExplore();
}
function toggleSelectMode(){
  STATE.selectMode=!STATE.selectMode;
  if(!STATE.selectMode) STATE.selectedIds.clear();
  renderExplore();
}
function selectAllItems(){
  const folders = childFolders(exploreCurrent).filter(f=>isFolderAccessible(f.id));
  const files = filesIn(exploreCurrent).filter(f=>isFolderAccessible(f.folderId));
  const all=[...folders.map(f=>f.id), ...files.map(f=>f.id)];
  const allSelected=all.every(id=>STATE.selectedIds.has(id));
  if(allSelected) STATE.selectedIds.clear(); else all.forEach(id=>STATE.selectedIds.add(id));
  renderExplore();
}
function deleteSelected(){
  if(STATE.selectedIds.size===0){ toast('Select items first'); return; }
  showModal('Delete Selected', `<p style="color:var(--muted);font-size:14px">Delete ${STATE.selectedIds.size} selected item(s)?</p>`,
    `<button class="tbtn" onclick="closeModal()">Cancel</button><button class="tbtn danger" onclick="confirmDeleteSelected()">Delete</button>`);
}
function confirmDeleteSelected(){
  STATE.selectedIds.forEach(id=>{
    const f=folderById(id);
    if(f){ const ids=allDescendantFolderIds(id); STATE.folders=STATE.folders.filter(x=>!ids.includes(x.id)); STATE.files=STATE.files.filter(x=>!ids.includes(x.folderId)); }
    else { STATE.files=STATE.files.filter(x=>x.id!==id); }
  });
  STATE.selectedIds.clear(); STATE.selectMode=false; persist(); closeModal(); toast('Deleted'); renderExplore();
}
function moveSelected(){
  const opts = buildFolderOptions('root',0);
  showModal('Move selected to...', `<div class="exp-tree" style="max-height:320px">${opts}</div>`,
    `<button class="tbtn" onclick="closeModal()">Cancel</button>`);
}
function buildFolderOptions(parentId,depth){
  let html=`<div class="tree-item" style="padding-left:${10+depth*16}px" onclick="chooseMoveDest('${parentId}')"><span class="ti">📁</span> ${parentId==='root'?'Root (Home)':folderById(parentId)?.name}</div>`;
  childFolders(parentId).forEach(f=>{ html+=buildFolderOptions(f.id,depth+1); });
  return html;
}
function chooseMoveDest(destId){
  STATE.selectedIds.forEach(id=>{
    const f=folderById(id);
    if(f){ f.parentId=destId; }
    else { const file=STATE.files.find(x=>x.id===id); if(file) file.folderId=destId; }
  });
  STATE.selectedIds.clear(); STATE.selectMode=false; persist(); closeModal(); toast('Moved successfully'); renderExplore();
}

/* ---------- ADD FILE / LIBRARY IMPORT (OPTION A UI + OPTION B PARSER) ---------- */
let addMethod='txt';
let parsedEntries=[];   // {batch,subject,topic,title,url,type}
let addDestFolder='root';

function setMethod(m){
  addMethod=m;
  $('mtTxt').classList.toggle('active',m==='txt');
  $('mtUrl').classList.toggle('active',m==='url');
  $('txtMethod').style.display=m==='txt'?'block':'none';
  $('urlMethod').style.display=m==='url'?'block':'none';
}

function classifyUrl(url){
  const u=String(url||'').split(/[?#]/)[0].toLowerCase();
  if(/\.(m3u8|mu3u8|mp4|mkv|webm)$/.test(u)||/(?:master|playlist-vod)\.m3u8$/.test(u)) return 'video';
  if(/\.pdf$/.test(u)) return 'pdf';
  return 'other';
}
function pickUrl(o){
  if(!o||typeof o!=='object') return '';
  for(const k of ['Url','URL','url','Link','link','Href','href','source','src'])
    if(typeof o[k]==='string'&&/^https?:\/\//i.test(o[k])) return o[k].trim();
  return '';
}
function pick(o,keys){
  for(const k of keys) if(o?.[k]!=null&&String(o[k]).trim()) return String(o[k]).trim();
  return '';
}
function dedupeRows(rows){
  const seen=new Set();
  return rows.filter(r=>{
    const k=[r.url,r.title,r.subject,r.topic].join('|');
    if(seen.has(k)) return false;
    seen.add(k); return true;
  });
}
function esc(s){
  return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function parseJson(text){
  let data;
  try{ data=JSON.parse(text); }catch(e){ throw new Error('Invalid JSON file'); }
  const out=[];
  const walk=(x,ctx={})=>{
    if(Array.isArray(x)){ x.forEach(v=>walk(v,ctx)); return; }
    if(!x||typeof x!=='object') return;
    const url=pickUrl(x),
      batch=pick(x,['Batch','batch'])||ctx.batch||'',
      subject=pick(x,['Subject','subject'])||ctx.subject||'',
      topic=pick(x,['Topic','topic'])||ctx.topic||'',
      title=pick(x,['Title','title','Name','name'])||'';
    if(url) out.push({url,title,batch,subject,topic,type:classifyUrl(url)});
    Object.entries(x).forEach(([k,v])=>{
      if(v&&typeof v==='object'&&!['items','data','records'].includes(k)){
        walk(v,{batch,subject,topic});
      }
    });
  };
  walk(data);
  return dedupeRows(out);
}

function parseTxt(text){
  const out=[];
  const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let batch='',subject='',topic='',pendingTitle='',titleUsed=true;
  const push=url=>{
    const u=String(url||'').trim().replace(/[),.;'"]+$/,'');
    if(!/^https?:\/\//i.test(u)) return;
    const title=(pendingTitle&&!titleUsed)?pendingTitle:fallbackTitle(u);
    out.push({batch,subject,topic,title,url:u,type:classifyUrl(u)});
    titleUsed=true;
  };
  for(const raw of lines){
    const line=raw.replace(/^\s*[-•*]\s*/,'').trim();
    let m;
    if((m=line.match(/^Batch\s*:\s*(.*)$/i))){ batch=m[1].trim(); subject=''; topic=''; continue; }
    if((m=line.match(/^Subject\s*:\s*(.*)$/i))){ subject=m[1].trim(); topic=''; continue; }
    if((m=line.match(/^Topic\s*:\s*(.*)$/i))){ topic=m[1].trim(); continue; }
    if((m=line.match(/^Title\s*:\s*(.*?)\s*(?:[-–,]\s*)?(?:Url|URL|Link)\s*:\s*(https?:\/\/\S+)$/i))){
      pendingTitle=m[1].trim(); titleUsed=false; push(m[2]); continue;
    }
    if((m=line.match(/^Title\s*:\s*(.*)$/i))){ pendingTitle=m[1].trim(); titleUsed=false; continue; }
    if((m=line.match(/^(?:Url|URL|Link)\s*:\s*(.*)$/i))){
      const um=m[1].match(/https?:\/\/\S+/i);
      push(um?um[0]:m[1]);
      continue;
    }
    const um=line.match(/https?:\/\/\S+/i);
    if(!um) continue;
    const url=um[0].replace(/[),.;]+$/,'');
    const before=line.slice(0,line.indexOf(url)).replace(/[|,;]+$/,'').trim();
    const parts=before.split(/\s*(?:\||\+|;|,)\s*/).map(x=>x.trim()).filter(Boolean);
    let title=(pendingTitle&&!titleUsed)?pendingTitle:'', s=subject, t=topic;
    if(parts.length>=3){ s=parts[0]; t=parts[1]; title=parts.slice(2).join(' '); }
    else if(parts.length===2){ title=parts[0]; t=parts[1]; }
    else if(parts.length===1){ title=parts[0]; }
    out.push({batch,subject:s,topic:t,title:title||fallbackTitle(url),url,type:classifyUrl(url)});
    titleUsed=true;
  }
  return dedupeRows(out);
}

async function handleFileSelect(input){
  const file=input.files?.[0];
  if(!file) return;
  $('fpName').textContent=file.name;
  $('fpSub').textContent=(file.size/1024).toFixed(1)+' KB';
  $('fpBox').classList.add('show');
  try{
    const text=await file.text();
    const rows=/\.json$/i.test(file.name)?parseJson(text):parseTxt(text);
    parsedEntries=dedupeRows(rows);
    updateAddPreview(file.name);
    toast(parsedEntries.length?`Parsed ${parsedEntries.length} item(s)`:'No valid items found');
  }catch(err){
    toast(err.message||'Could not parse file');
  }
}

async function fetchUrlManifest(){
  const url=$('urlInput').value.trim();
  const title=$('urlTitle').value.trim();
  if(!url) return toast('Enter a Video / PDF / Manifest URL');
  const kind=classifyUrl(url);
  if(kind!=='other'){
    parsedEntries=dedupeRows(parsedEntries.concat([{batch:'',subject:'',topic:'',title:title||fallbackTitle(url),url,type:kind}]));
    updateAddPreview(title||url);
    return toast('Direct media link added to preview');
  }
  toast('Fetching remote manifest…');
  try{
    const res=await fetch(resolveUrl(url));
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const text=await res.text();
    const rows=/\.json(?:[?#].*)?$/i.test(url)?parseJson(text):parseTxt(text);
    parsedEntries=dedupeRows(parsedEntries.concat(rows));
    updateAddPreview(url);
    toast(`Successfully Done ☑️ — ${rows.length} item(s) fetched`);
  }catch(err){
    toast('Fetch failed — check URL and CORS permissions');
  }
}

function updateAddPreview(sourceName){
  if(parsedEntries.length===0){
    $('parseResult').classList.remove('show');
    $('addPreview').innerHTML=`<div style="text-align:center;padding:24px 0"><div style="font-size:36px;margin-bottom:8px">📄</div>Select a TXT/JSON file or fetch via URL to preview</div>`;
    return;
  }
  $('parseResult').classList.add('show');
  const summary=parsedEntries.map(p=>{
    const path=[p.batch,p.subject,p.topic].filter(Boolean).join(' › ')||'(destination folder)';
    return `${p.type==='pdf'?'📄':'🎬'} ${p.title||'(untitled)'}\n   📁 ${path}\n   🔗 ${p.url}`;
  }).join('\n');
  $('parseResult').textContent=`✅ Parsed ${parsedEntries.length} item(s):\n\n${summary}`;

  const vids=parsedEntries.filter(p=>p.type==='video').length;
  const pdfs=parsedEntries.filter(p=>p.type==='pdf').length;
  const itemsHtml=parsedEntries.map((p,i)=>{
    const icon=p.type==='pdf'?'📄':'🎬';
    const meta=[p.batch,p.subject,p.topic,p.url].filter(Boolean).join('  •  ');
    return `<div class="re-item" style="margin-bottom:6px">
      <span class="thumb">${icon}</span>
      <div class="mt" style="min-width:0;flex:1"><span class="n">${i+1}. ${esc(p.title)}</span><span class="s">${esc(meta)}</span></div>
      <span class="badge">${p.type==='pdf'?'PDF':'VIDEO'}</span>
    </div>`;
  }).join('');

  $('addPreview').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-weight:700;font-size:14px">Total: ${parsedEntries.length} items</span>
      <div style="display:flex;gap:6px">
        <span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(0,229,255,.15);color:var(--glow2);font-weight:700">🎬 ${vids} Videos</span>
        <span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(251,113,133,.15);color:#fb7185;font-weight:700">📄 ${pdfs} PDFs</span>
      </div>
    </div>
    <div class="related-scroll" style="max-height:360px">${itemsHtml}</div>
    <button class="small-btn" style="width:100%;margin-top:10px" onclick="clearParsedEntries()">Clear Preview</button>
  `;
}

function clearParsedEntries(){
  parsedEntries=[];
  const fp=$('fpBox'); if(fp) fp.classList.remove('show');
  const pr=$('parseResult'); if(pr) pr.classList.remove('show');
  const fi=$('fileInput'); if(fi) fi.value='';
  updateAddPreview('');
}
function renderAddTree(){
  const tree=$('addTree');
  tree.innerHTML = `<div class="tree-item ${addDestFolder==='root'?'selected':''}" onclick="selectAddDest('root')"><span class="ti">📁</span> Root (Home)</div>` + buildAddTree('root',0);
}
function buildAddTree(parentId,depth){
  let html='';
  childFolders(parentId).forEach(f=>{
    html+=`<div class="tree-item" style="padding-left:${10+depth*18}px">
      <span class="toggle" onclick="toggleTreeNode(this)">▸</span>
      <span class="ti">📁</span>
      <span onclick="selectAddDest('${f.id}')">${f.name}</span></div>`;
    html+=`<div class="tree-children" style="display:none">${buildAddTree(f.id,depth+1)}</div>`;
  });
  return html;
}
function toggleTreeNode(el){
  const child = el.parentElement.nextElementSibling;
  if(child && child.classList.contains('tree-children')){
    const open = child.style.display!=='none';
    child.style.display=open?'none':'block';
    el.textContent=open?'▸':'▾';
  }
}
function selectAddDest(id){
  addDestFolder=id; renderAddTree();
  const names=folderPathNames(id);
  const lbl=$('destinationLabel');
  if(lbl) lbl.textContent='Destination: '+(names.length?names.join(' / '):'Root (Home)');
}
function createSubfolderFromAdd(){
  const parentName=addDestFolder==='root'?'Root (Home)':(folderById(addDestFolder)?.name||'Root');
  showModal('Create Subfolder',
    `<p style="font-size:13px;color:var(--muted);margin-bottom:14px">Inside: <b style="color:var(--text)">📁 ${esc(parentName)}</b></p>
     <div class="input-wrap"><label>Subfolder Name</label><span class="ico">📁</span><input id="newFolderName" placeholder="Subfolder name"></div>`,
    `<button class="tbtn" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="confirmCreateSubfolder()" style="max-width:160px">Create</button>`);
}
function confirmCreateSubfolder(){
  const name=$('newFolderName').value.trim();
  if(!name){ toast('Enter subfolder name'); return; }
  const f={id:uid(),name:name,parentId:addDestFolder,type:'folder'};
  STATE.folders.push(f);
  persist(); closeModal();
  selectAddDest(f.id);
  toast(`Subfolder "${name}" created`);
}
function createNewFolderFromAdd(){
  showModal('Create New Folder',
    `<div class="input-wrap"><label>Folder Name</label><span class="ico">📁</span><input id="newFolderName" placeholder="Folder name"></div>
     <div class="input-wrap"><label>Parent Folder</label><span class="ico">🗂️</span><select id="newFolderParent" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--panel);color:var(--text)">
      <option value="root">Root (Home)</option>${folderOptionsHTML('root',0)}</select></div>`,
    `<button class="tbtn" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="confirmCreateFolder()" style="max-width:160px">Create</button>`);
}
function folderOptionsHTML(parentId,depth){
  let o='';
  childFolders(parentId).forEach(f=>{ o+=`<option value="${f.id}">${'— '.repeat(depth)}${f.name}</option>${folderOptionsHTML(f.id,depth+1)}`; });
  return o;
}
function confirmCreateFolder(){
  const name=$('newFolderName').value.trim();
  const parent=$('newFolderParent').value;
  if(!name){ toast('Enter folder name'); return; }
  STATE.folders.push({id:uid(),name:name,parentId:parent,type:'folder'});
  persist(); closeModal(); renderAddTree(); toast('Folder created');
}

function isPdf(url){ return /\.pdf(\?|#|$)/i.test(url); }
function fallbackTitle(url){
  try{
    let name=url.split('/').pop().split('?')[0].split('#')[0];
    name=decodeURIComponent(name).replace(/\.(mp4|mkv|m3u8|pdf)$/i,'');
    return name || 'Untitled';
  }catch(e){ return 'Untitled'; }
}
function cleanEntry(e){
  return {
    batch:(e.batch||'').trim(),
    subject:(e.subject||'').trim(),
    topic:(e.topic||'').trim(),
    title:(e.title||'').trim(),
    url:(e.url||'').trim(),
    type:e.type||'video'
  };
}

function findOrCreateFolder(name, parentId){
  const hit = STATE.folders.find(f=>f.name.toLowerCase()===String(name).toLowerCase() && f.parentId===parentId);
  if(hit) return {id:hit.id, created:false};
  const nf={id:uid(),name:String(name).trim(),parentId:parentId,type:'folder'};
  STATE.folders.push(nf);
  return {id:nf.id, created:true};
}

function placeEntryInHierarchy(e, rootId){
  let created=0;
  let parent=rootId;
  if(e.batch){ const r=findOrCreateFolder(e.batch,parent); created+=r.created?1:0; parent=r.id; }
  if(e.subject){ const r=findOrCreateFolder(e.subject,parent); created+=r.created?1:0; parent=r.id; }
  if(e.topic){ const r=findOrCreateFolder(e.topic,parent); created+=r.created?1:0; parent=r.id; }
  const title = e.title || fallbackTitle(e.url);
  const file={id:uid(),name:title,url:e.url,type:e.type||'video',folderId:parent,title:title};
  STATE.files.push(file);
  return {foldersCreated:created, file};
}

function finishImport(imported, foldersCreated){
  if(imported.length===0){ toast('Nothing imported — no valid URLs found in the file'); return; }
  const vids=imported.filter(f=>f.type==='video');
  const pdfs=imported.filter(f=>f.type==='pdf');
  STATE._importedVids=vids.map(f=>f.id);
  const rows=imported.map(f=>{
    const path=folderPathNames(f.folderId).join(' / ')||'Root';
    return `<div class="re-item" style="cursor:default">
      <span class="thumb">${f.type==='pdf'?'📄':'🎬'}</span>
      <div class="mt"><span class="n">${f.title}</span><span class="s">📁 ${path}</span></div>
      <span class="badge">${f.type==='pdf'?'PDF':'VIDEO'}</span></div>`;
  }).join('');
  showModal('✅ Import Complete',
    `<p style="font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.6">Imported <b style="color:var(--text)">${imported.length}</b> files (<b style="color:var(--text)">${vids.length}</b> videos, <b style="color:var(--text)">${pdfs.length}</b> PDFs) into <b style="color:var(--text)">${foldersCreated}</b> new folders — <b style="color:var(--text)">Batch → Subject → Topic</b>. Same-named folders were merged.</p>
     <div class="related-scroll" style="max-height:300px">${rows}</div>`,
    `<button class="tbtn" onclick="closeModal()">Close</button>
     ${vids.length?`<button class="btn-primary" style="max-width:170px" onclick="playImportedVideos()">▶ Play Now</button>`:''}`);
}
function playImportedVideos(){
  closeModal();
  const vids=STATE.files.filter(f=>(STATE._importedVids||[]).includes(f.id));
  if(vids.length===0) return;
  STATE.playlist=vids;
  STATE.currentIndex=0;
  goPage('home');
}
function addParsedFlat(){
  if(addMethod==='url' && parsedEntries.length===0){
    const url=$('urlInput').value.trim();
    const title=$('urlTitle').value.trim();
    if(!url){ toast('Enter a Video / PDF URL or Manifest Link'); return; }
    const type=classifyUrl(url)==='pdf'?'pdf':'video';
    const name=title||fallbackTitle(url);
    showModal('Confirm Add File', `
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px">
        <span style="font-size:40px">${type==='pdf'?'📄':'🎬'}</span>
        <div><div style="font-weight:700">${esc(name)}</div><div style="font-size:12px;color:var(--muted);word-break:break-all">${esc(url)}</div></div>
      </div>
      <div class="input-wrap"><label>Title</label><span class="ico">✏️</span><input id="cfTitle" value="${esc(name)}"></div>
      <div class="input-wrap"><label>Folder Location</label><span class="ico">🗂️</span><select id="cfFolder" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--panel);color:var(--text)"><option value="root">Root (Home)</option>${folderOptionsHTML('root',0)}</select></div>`,
      `<button class="tbtn" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="confirmAddUrl('${encodeURIComponent(url)}','${type}')" style="max-width:150px">Add File</button>`);
    return;
  }
  if(parsedEntries.length===0){ toast('Select a TXT/JSON file or fetch via URL first'); return; }
  showModal('Confirm Add Content',
    `<p style="font-size:13px;color:var(--muted);margin-bottom:12px">Add <b style="color:var(--text)">${parsedEntries.length}</b> file(s) to destination:</p>
     <div class="input-wrap"><label>Destination Folder</label><span class="ico">🗂️</span><select id="cfFolderAll" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--panel);color:var(--text)"><option value="root">Root (Home)</option>${folderOptionsHTML('root',0)}</select></div>
     <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="cfMakeFolders" checked> Auto-create Batch → Subject → Topic folders (merge same names)</label>`,
    `<button class="tbtn" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="confirmAddParsed()">Add All</button>`);
}
function addParsedToFolders(){
  if(parsedEntries.length===0){
    if(addMethod==='url'){
      const url=$('urlInput').value.trim();
      const title=$('urlTitle').value.trim();
      if(!url) return toast('Enter a Video / PDF URL or Manifest Link');
      const kind=classifyUrl(url);
      parsedEntries=[{batch:'',subject:'',topic:'',title:title||fallbackTitle(url),url,type:kind==='pdf'?'pdf':'video'}];
    } else {
      return toast('Select a TXT/JSON file or fetch via URL first');
    }
  }
  const imported=[]; let folders=0;
  parsedEntries.forEach(e=>{
    const r=placeEntryInHierarchy(e, addDestFolder);
    folders+=r.foldersCreated; imported.push(r.file);
  });
  parsedEntries=[];
  persist();
  updateAddPreview('');
  renderAddTree();
  finishImport(imported, folders);
}
function confirmAddUrl(encUrl,type){
  const url=decodeURIComponent(encUrl);
  const title=$('cfTitle').value.trim()||url.split('/').pop();
  const folder=$('cfFolder').value;
  STATE.files.push({id:uid(),name:title,url:url,type:type,folderId:folder,title:title});
  persist(); closeModal(); toast('File added!');
}
function confirmAddParsed(){
  const root=$('cfFolderAll').value;
  const makeFolders=$('cfMakeFolders').checked;
  const imported=[]; let folders=0;
  parsedEntries.forEach(e=>{
    if(makeFolders){
      const r=placeEntryInHierarchy(e, root);
      folders+=r.foldersCreated; imported.push(r.file);
    } else {
      const title=e.title||fallbackTitle(e.url);
      const file={id:uid(),name:title,url:e.url,type:e.type||'video',folderId:root,title:title};
      STATE.files.push(file); imported.push(file);
    }
  });
  parsedEntries=[];
  persist(); closeModal();
  updateAddPreview('');
  renderAddTree();
  finishImport(imported, folders);
}

/* ---------- SETTINGS ---------- */
function renderSettings(){
  const guests=STATE.users.filter(u=>u.role==='guest');
  $('guestList').innerHTML = guests.map(g=>`
    <div class="user-row">
      <span class="uava">${g.name[0].toUpperCase()}</span>
      <div class="uinfo"><div class="uname">${g.name}</div><div class="urole">Guest</div></div>
      <span class="upass">Pass: ${g.pass}</span>
      <button class="small-btn primary" onclick="editGuestPass('${g.id}')">Change</button>
      <button class="small-btn danger" onclick="deleteGuest('${g.id}')">Delete</button>
    </div>`).join('') || '<div style="color:var(--muted);font-size:13px">No guest users</div>';
  
  const sel=$('permUserSelect');
  if(sel){
    sel.innerHTML = guests.map(g=>`<option value="${g.id}">${g.name}</option>`).join('');
    if(guests.length){ renderPermTree(guests[0].id); }
    sel.onchange=()=>renderPermTree(sel.value);
  }

  renderCorsProxySettings();
}

function renderCorsProxySettings(){
  const sel = $('corsProxySelect');
  if(!sel) return;
  const cur = STATE.corsProxy || localStorage.getItem('spl_corsProxy') || 'corsproxy_io';
  sel.innerHTML = Object.entries(PUBLIC_CORS_PROXIES).map(([k, p]) =>
    `<option value="${k}" ${k===cur?'selected':''}>${esc(p.name)}</option>`
  ).join('') + `<option value="custom" ${cur==='custom'?'selected':''}>Custom Proxy Prefix...</option>`;
  
  const wrap = $('customProxyWrap');
  if(wrap) wrap.style.display = (cur==='custom') ? 'block' : 'none';
  const inp = $('customProxyInput');
  if(inp) inp.value = STATE.customCorsProxy || localStorage.getItem('spl_customCorsProxy') || '';
  
  sel.onchange = () => {
    if(wrap) wrap.style.display = (sel.value==='custom') ? 'block' : 'none';
  };
}

function saveCorsProxySetting(){
  const sel = $('corsProxySelect');
  if(!sel) return;
  const choice = sel.value;
  STATE.corsProxy = choice;
  localStorage.setItem('spl_corsProxy', choice);
  if(choice === 'custom'){
    const inp = $('customProxyInput');
    if(inp){
      STATE.customCorsProxy = inp.value.trim();
      localStorage.setItem('spl_customCorsProxy', STATE.customCorsProxy);
    }
  }
  persist();
  const name = PUBLIC_CORS_PROXIES[choice]?.name || (choice === 'custom' ? 'Custom Proxy' : choice);
  toast('CORS Proxy set to: ' + name);
  if(STATE.playlist && STATE.playlist[STATE.currentIndex]){
    loadCurrent();
  }
}

function renderPermTree(userId){
  const user=STATE.users.find(u=>u.id===userId);
  if(!user) return;
  const perms = user.perms ? new Set(user.perms) : new Set();
  const tree=$('permTree');
  tree.innerHTML = buildPermTreeHTML('root',0,perms,user);
}
function buildPermTreeHTML(folderId,depth,perms,user){
  let html='';
  const folders=childFolders(folderId);
  folders.forEach(f=>{
    const ids=allDescendantFolderIds(f.id);
    const on=ids.every(id=>perms.has(id));
    html+=`<div class="perm-item" style="padding-left:${10+depth*18}px">
      <span class="check ${on?'on':''}" onclick="togglePerm('${f.id}','${user.id}')">✓</span>
      <span style="font-size:14px">📁</span> ${f.name}
      <span style="flex:1"></span>
      <span style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase">${on?'All':'None'}</span>
    </div>`;
    html+=buildPermTreeHTML(f.id,depth+1,perms,user);
  });
  return html;
}
function togglePerm(folderId,userId){
  const user=STATE.users.find(u=>u.id===userId);
  if(!user.perms) user.perms=[];
  const ids=allDescendantFolderIds(folderId);
  const has=ids.every(id=>user.perms.includes(id));
  if(has){ ids.forEach(id=>{ user.perms=user.perms.filter(x=>x!==id); }); }
  else { ids.forEach(id=>{ if(!user.perms.includes(id)) user.perms.push(id); }); }
  persist(); renderPermTree(userId);
}
function savePermissions(){ toast('Permissions saved'); persist(); }
function editGuestPass(id){
  const g=STATE.users.find(u=>u.id===id);
  showModal('Change Guest', `
    <div class="input-wrap"><label>Username</label><span class="ico">👤</span><input id="gName" value="${g.name}"></div>
    <div class="input-wrap"><label>Password</label><span class="ico">🔒</span><input id="gPass" value="${g.pass}"></div>`,
    `<button class="tbtn" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="confirmEditGuest('${id}')">Save</button>`);
}
function confirmEditGuest(id){
  const g=STATE.users.find(u=>u.id===id);
  g.name=$('gName').value.trim()||g.name;
  g.pass=$('gPass').value.trim()||g.pass;
  persist(); closeModal(); renderSettings(); toast('Guest updated');
}
function deleteGuest(id){
  STATE.users=STATE.users.filter(u=>u.id!==id);
  persist(); renderSettings(); toast('Guest deleted');
}
function createGuest(){
  const n=$('newGuestUser').value.trim(); const p=$('newGuestPass').value.trim();
  if(!n||!p){ toast('Enter username and password'); return; }
  STATE.users.push({id:uid(),name:n,pass:p,role:'guest',perms:null});
  persist(); renderSettings(); $('newGuestUser').value=''; $('newGuestPass').value=''; toast('Guest created');
}
function updateMyCreds(){
  const u=STATE.currentUser;
  const nn=$('myNewUser').value.trim(); const np=$('myNewPass').value.trim();
  if(nn) u.name=nn; if(np) u.pass=np;
  persist(); toast('Credentials updated');
  const un = document.querySelector('.v14-user-name');
  if(un) un.textContent=u.name;
}

/* Floating PiP mode in Explorer */
let pipHls = null;
function playFileInPip(id){
  const f = STATE.files.find(x => x.id === id);
  if(!f) return;
  if(f.type === 'pdf'){ openPdf(f); return; }

  const pip = $('pipFloatingWidget');
  const video = $('pipFloatingVideo');
  const title = $('pipFloatingTitle');
  const spin = $('pipFloatingSpin');
  if(!pip || !video) return;

  STATE._currentPipFile = f;
  title.textContent = f.title || f.name;
  pip.style.display = 'block';
  spin.classList.add('show');

  const url = resolveUrl(f.url);
  const isHls = /\.m3u8/i.test(url);

  if(pipHls){
    try{ pipHls.destroy(); }catch(e){}
    pipHls = null;
  }

  if(isHls){
    ensureHls(function(){
      if(typeof Hls !== 'undefined' && Hls.isSupported()){
        pipHls = new Hls({ enableWorker:true });
        pipHls.loadSource(url);
        pipHls.attachMedia(video);
        pipHls.on(Hls.Events.MANIFEST_PARSED, ()=>{
          spin.classList.remove('show');
          safePlay(video);
        });
        pipHls.on(Hls.Events.ERROR, (_, data)=>{
          if(data.fatal){ spin.classList.remove('show'); }
        });
      } else if(video.canPlayType('application/vnd.apple.mpegurl')){
        video.src = url;
        safePlay(video);
      }
    });
  } else {
    video.src = url;
    safePlay(video);
  }

  video.oncanplay = ()=> spin.classList.remove('show');
  video.onplaying = ()=> spin.classList.remove('show');
  video.onerror = ()=> {
    spin.classList.remove('show');
    toast('⚠️ PiP could not play this link directly — check CORS setting');
  };
}

function closePipWidget(){
  const pip = $('pipFloatingWidget');
  const video = $('pipFloatingVideo');
  if(pipHls){ try{ pipHls.destroy(); }catch(e){} pipHls = null; }
  if(video){ try{ video.pause(); video.src = ''; }catch(e){} }
  if(pip) pip.style.display = 'none';
  STATE._currentPipFile = null;
}

function togglePipVideoPlay(){
  const video = $('pipFloatingVideo');
  if(!video) return;
  if(video.paused){ safePlay(video); } else { video.pause(); }
}

function expandPipToHome(){
  const f = STATE._currentPipFile;
  closePipWidget();
  if(f){ playFileById(f.id); }
  else { goPage('home'); }
}

/* ---------- BOOT ---------- */
function stopPlayback(){
  const v=$('videoPlayer');
  if(v){ v.pause(); v.removeAttribute('src'); v.load(); }
}

/* ---------- RUNNING 12-HOUR CLOCK (HH:MM:ss AM/PM) ---------- */
function updateClockDisplay(){
  const el = document.getElementById('v14Clock');
  if(!el) return;
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  el.textContent = `${strHours}:${minutes}:${seconds} ${ampm}`;
}

function startRunningClock(){
  updateClockDisplay();
  setInterval(updateClockDisplay, 1000);
}

function boot(){
  setupTheme();
  STATE.theme = localStorage.getItem('spl_theme') || 'dark';
  setTheme(STATE.theme);
  seedData();
  initPlayer();
  wireImportUI();
  startRunningClock();

  let savedUser = null;
  try {
    const raw = localStorage.getItem('spl_currentUser');
    if(raw) savedUser = JSON.parse(raw);
  } catch(e){}

  if(savedUser && savedUser.name){
    STATE.currentUser = savedUser;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    syncUserDisplay();
    const lastPage = localStorage.getItem('spl_lastPage') || 'home';
    goPage(lastPage);
  } else {
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    switchLoginTab('admin');
  }
}

function wireImportUI(){
  const dz=$('dropzone'), fi=$('fileInput');
  if(dz && fi){
    dz.addEventListener('dragover',e=>{ e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
    dz.addEventListener('drop',e=>{
      e.preventDefault(); dz.classList.remove('drag');
      const f=e.dataTransfer.files[0];
      if(f) handleFileSelect({files:[f]});
    });
  }
  const ui=$('urlInput');
  if(ui) ui.addEventListener('keydown',e=>{ if(e.key==='Enter') fetchUrlManifest(); });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

document.addEventListener('keydown', e=>{
  if(e.key==='Enter' && !STATE.currentUser){
    if(e.target.id==='loginUser' || e.target.id==='loginPass'){ doLogin(); }
  }
});

document.addEventListener('keydown', e=>{
  if(STATE.currentUser){
    if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
    if(e.code==='Space'){ e.preventDefault(); togglePlay(); }
    if(e.key==='ArrowRight'){ seekBy(10); }
    if(e.key==='ArrowLeft'){ seekBy(-10); }
    if(e.key==='f'||e.key==='F'){ toggleFullscreen(); }
    if(e.key==='ArrowUp'){ setSpeed(STATE.playbackSpeed+0.25); }
    if(e.key==='ArrowDown'){ setSpeed(STATE.playbackSpeed-0.25); }
    if(e.key==='m'||e.key==='M'){ const v=$('videoPlayer'); v.muted=!v.muted; }
  }
});
