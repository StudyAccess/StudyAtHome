/* STUDY PREMIUM LEARNING - app.js v3 */
const CONFIG = {
  CORS_PROXY: "https://corsproxy.io/?url=",
  PLAYER_ID: "videoPlayer",
  STORAGE_KEY: "study_premium_data",
  ADMIN_USER: "admin",
  ADMIN_PASS: "admin123"
};
let state = {
  user: null, role: null,
  theme: localStorage.getItem('spl_theme') || 'dark',
  sidebarCollapsed: false, currentView: 'home',
  fileSystem: null, currentFolderId: null,
  currentPlaylist: [], currentVideoIndex: -1,
  playerState: { locked:false, loop:'none', aspect:'fit', uiScale:1, quality:'auto', brightness:0, defaultVolume:0.8 },
  hlsInstance: null
};
document.addEventListener('DOMContentLoaded', function(){
  loadState(); applyTheme(state.theme);
  initLogin(); initSidebar(); initViews();
  initPlayer(); initAddView(); initExploreView();
  initPieMenu(); initThemePanel(); initPdfViewer();
  renderExplorer(); renderExplore();
  document.addEventListener('DOMContentLoaded', function(){
  loadState(); applyTheme(state.theme);
  initLogin(); initSidebar(); initViews();
  initPlayer(); initAddView(); initExploreView();
  initPieMenu(); initThemePanel(); initPdfViewer();
  initExplorerActions();  // <-- ADD THIS LINE
  renderExplorer(); renderExplore();
});   
});
function saveState(){
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({fileSystem:state.fileSystem, theme:state.theme, defaultVolume:state.playerState.defaultVolume}));
  localStorage.setItem('spl_theme', state.theme);
}
function loadState(){
  try{ var r=localStorage.getItem(CONFIG.STORAGE_KEY);
    if(r){ var d=JSON.parse(r); state.fileSystem=d.fileSystem||createFS(); state.theme=d.theme||'dark'; state.playerState.defaultVolume=d.defaultVolume||0.8; }
    else state.fileSystem=createFS();
  }catch(e){ state.fileSystem=createFS(); }
}
function createFS(){ return {folders:{'root':{id:'root',name:'Platform',parentId:null,files:[]}},nextId:1}; }
function genId(){ return 'f'+(state.fileSystem.nextId++); }
function esc(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.classList.remove('hidden'); setTimeout(function(){t.classList.add('hidden');},2500); }
function fmtTime(s){ if(!s||isNaN(s))return'0:00'; var m=Math.floor(s/60); return m+':'+String(Math.floor(s%60)).padStart(2,'0'); }
function getFolderPath(id){ var p=[]; var c=state.fileSystem.folders[id]; while(c){p.unshift(c.name); c=c.parentId?state.fileSystem.folders[c.parentId]:null;} return'/'+p.join('/'); }
function findOrCreateFolder(name,pid){ var ids=Object.keys(state.fileSystem.folders); for(var i=0;i<ids.length;i++){var f=state.fileSystem.folders[ids[i]]; if(f.name===name&&f.parentId===pid)return f.id;} var id=genId(); state.fileSystem.folders[id]={id:id,name:name,parentId:pid,files:[]}; return id; }
function populateFolderSelect(sid,sid2){ var sel=document.getElementById(sid); sel.innerHTML=''; (function add(p,d){ var k=Object.values(state.fileSystem.folders).filter(function(f){return f.parentId===p;}); k.forEach(function(f){ var o=document.createElement('option'); o.value=f.id; o.textContent='  '.repeat(d)+f.name; if(f.id===sid2)o.selected=true; sel.appendChild(o); add(f.id,d+1); }); })('root',0); }
function findFolderByFile(f){ return(f&&f.folderId)?state.fileSystem.folders[f.folderId]||null:null; }
function initLogin(){
  var tabs=document.querySelectorAll('.login-tab');
  var role='guest';
  tabs.forEach(function(t){ t.addEventListener('click',function(){ tabs.forEach(function(x){x.classList.remove('active');}); t.classList.add('active'); role=t.dataset.role; }); });
  document.getElementById('loginBtn').addEventListener('click',function(){
    var u=document.getElementById('loginUser').value.trim();
    var p=document.getElementById('loginPass').value.trim();
    if(role==='admin'){ if(u===CONFIG.ADMIN_USER&&p===CONFIG.ADMIN_PASS){state.user=u;state.role='admin';} else{toast('Invalid admin credentials');return;} }
    else{ if(u&&p){state.user=u;state.role='guest';} else{toast('Enter username and password');return;} }
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    toast('Welcome, '+state.user+'!');
  });
  document.getElementById('logoutBtn').addEventListener('click',logout);
  document.getElementById('userBtn').addEventListener('click',logout);
}
function logout(){ state.user=null;state.role=null; document.getElementById('app').classList.add('hidden'); document.getElementById('loginOverlay').classList.remove('hidden'); document.getElementById('loginUser').value=''; document.getElementById('loginPass').value=''; }
function initSidebar(){
  var app=document.getElementById('app');
  document.getElementById('sidebarToggle').addEventListener('click',function(){
    state.sidebarCollapsed=!state.sidebarCollapsed;
    app.classList.toggle('sidebar-collapsed',state.sidebarCollapsed);
    document.getElementById('sidebarCollapse').querySelector('i').className=state.sidebarCollapsed?'fas fa-chevron-right':'fas fa-chevron-left';
  });
  document.querySelectorAll('.nav-item').forEach(function(item){
    item.addEventListener('click',function(e){ e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(function(x){x.classList.remove('active');});
      item.classList.add('active'); switchView(item.dataset.view);
    });
  });
}
function switchView(v){ state.currentView=v; document.querySelectorAll('.view').forEach(function(x){x.classList.remove('active');}); var el=document.getElementById('view-'+v); if(el)el.classList.add('active'); if(v==='explore')renderExplore(); if(v==='add')renderExplorer(); }
function initViews(){
  document.getElementById('layoutGrid').addEventListener('click',function(){ document.getElementById('playlistBelow').className='playlist-below-items grid-layout'; document.getElementById('layoutGrid').classList.add('active'); document.getElementById('layoutList').classList.remove('active'); });
  document.getElementById('layoutList').addEventListener('click',function(){ document.getElementById('playlistBelow').className='playlist-below-items list-layout'; document.getElementById('layoutList').classList.add('active'); document.getElementById('layoutGrid').classList.remove('active'); });
}
function applyTheme(t){ state.theme=t; document.documentElement.setAttribute('data-theme',t); localStorage.setItem('spl_theme',t); document.querySelectorAll('.theme-swatch').forEach(function(s){s.classList.toggle('active',s.dataset.theme===t);}); }
function initThemePanel(){
  var btn=document.getElementById('themeToggle'); var panel=document.getElementById('themePanel');
  btn.addEventListener('click',function(e){e.stopPropagation();panel.classList.toggle('hidden');});
  document.querySelectorAll('.theme-swatch').forEach(function(s){s.addEventListener('click',function(){applyTheme(s.dataset.theme);});});
  document.addEventListener('click',function(e){if(!panel.contains(e.target)&&e.target!==btn)panel.classList.add('hidden');});
}
function initPieMenu(){
  var btn=document.getElementById('pieMenuBtn'); var menu=document.getElementById('pieMenu');
  btn.addEventListener('click',function(e){e.stopPropagation();menu.classList.toggle('hidden');});
  document.querySelectorAll('.pie-item').forEach(function(item){
    item.addEventListener('click',function(){ var a=item.dataset.action;
      if(a==='theme')document.getElementById('themePanel').classList.toggle('hidden');
      else if(a==='logout')logout();
      else if(a==='about')toast('Study Premium Learning v1.0');
      menu.classList.add('hidden');
    });
  });
  document.addEventListener('click',function(e){if(!menu.contains(e.target)&&e.target!==btn)menu.classList.add('hidden');});
}   
function initPlayer(){
  var video=document.getElementById(CONFIG.PLAYER_ID);
  var overlay=document.getElementById('playerOverlay');
  var hideTimer=null;
  function showOverlay(){ overlay.classList.add('visible'); clearTimeout(hideTimer); if(!state.playerState.locked){ hideTimer=setTimeout(function(){ if(!video.paused)overlay.classList.remove('visible'); },3000); } }
  overlay.addEventListener('mousemove',showOverlay);
  overlay.addEventListener('touchstart',showOverlay);
  video.addEventListener('click',function(){ if(state.playerState.locked)return; if(video.paused)video.play().catch(function(){}); else video.pause(); showOverlay(); });
  var lastTap=0;
  overlay.addEventListener('touchend',function(e){
    var now=Date.now(); var x=e.changedTouches[0].clientX; var rect=overlay.getBoundingClientRect(); var relX=(x-rect.left)/rect.width;
    if(now-lastTap<300){
      if(relX<0.3){video.currentTime=Math.max(0,video.currentTime-30);toast('-30s');}
      else if(relX<0.5){video.currentTime=Math.max(0,video.currentTime-10);toast('-10s');}
      else if(relX>0.7){video.currentTime=Math.min(video.duration||0,video.currentTime+30);toast('+30s');}
      else if(relX>0.5){video.currentTime=Math.min(video.duration||0,video.currentTime+10);toast('+10s');}
      lastTap=0;
    } else { lastTap=now; }
  });
  overlay.addEventListener('dblclick',function(e){
    var rect=overlay.getBoundingClientRect(); var relX=(e.clientX-rect.left)/rect.width;
    if(relX<0.3)video.currentTime=Math.max(0,video.currentTime-30);
    else if(relX<0.5)video.currentTime=Math.max(0,video.currentTime-10);
    else if(relX>0.7)video.currentTime=Math.min(video.duration||0,video.currentTime+30);
    else if(relX>0.5)video.currentTime=Math.min(video.duration||0,video.currentTime+10);
  });
  var swipeStartY=null,swipeTarget=null;
  overlay.addEventListener('touchstart',function(e){ if(e.touches.length===1){ swipeStartY=e.touches[0].clientY; var rect=overlay.getBoundingClientRect(); var relX=(e.touches[0].clientX-rect.left)/rect.width; swipeTarget=relX<0.5?'brightness':'volume'; } });
  overlay.addEventListener('touchmove',function(e){ if(swipeStartY===null)return; e.preventDefault(); var dy=swipeStartY-e.touches[0].clientY; var d=dy/200; if(swipeTarget==='brightness'){state.playerState.brightness=Math.max(-1,Math.min(1,state.playerState.brightness+d*0.05));applyBrightness();}else{video.volume=Math.max(0,Math.min(1,video.volume+d*0.05));updateVolUI();} });
  overlay.addEventListener('touchend',function(){swipeStartY=null;swipeTarget=null;});
  var mSY=null,mT=null;
  overlay.addEventListener('mousedown',function(e){ if(e.target===overlay||e.target===video){ mSY=e.clientY; var rect=overlay.getBoundingClientRect(); var relX=(e.clientX-rect.left)/rect.width; mT=relX<0.5?'brightness':'volume'; } });
  document.addEventListener('mousemove',function(e){ if(mSY===null)return; var dy=mSY-e.clientY; var d=dy/200; if(mT==='brightness'){state.playerState.brightness=Math.max(-1,Math.min(1,state.playerState.brightness+d*0.02));applyBrightness();}else{video.volume=Math.max(0,Math.min(1,video.volume+d*0.02));updateVolUI();} });
  document.addEventListener('mouseup',function(){mSY=null;mT=null;});
  document.getElementById('ctrlLock').addEventListener('click',function(){ state.playerState.locked=!state.playerState.locked; overlay.classList.toggle('locked',state.playerState.locked); document.getElementById('ctrlLock').querySelector('i').className=state.playerState.locked?'fas fa-lock':'fas fa-lock-open'; });
  document.getElementById('ctrlLoop').addEventListener('click',function(){ var m=['none','same','playlist']; var ic={none:'fas fa-redo',same:'fas fa-rotate-right',playlist:'fas fa-list-ol'}; var i=m.indexOf(state.playerState.loop); state.playerState.loop=m[(i+1)%m.length]; document.getElementById('ctrlLoop').querySelector('i').className=ic[state.playerState.loop]; toast('Loop: '+state.playerState.loop); });
  document.getElementById('ctrlAspect').addEventListener('click',function(){ var m=['fit','stretch','crop']; var ic={fit:'fas fa-expand',stretch:'fas fa-arrows-alt-h',crop:'fas fa-crop'}; var i=m.indexOf(state.playerState.aspect); state.playerState.aspect=m[(i+1)%m.length]; video.style.objectFit=state.playerState.aspect==='fit'?'contain':state.playerState.aspect==='stretch'?'fill':'cover'; document.getElementById('ctrlAspect').querySelector('i').className=ic[state.playerState.aspect]; });
  document.getElementById('ctrlScaleUp').addEventListener('click',function(){ state.playerState.uiScale=Math.min(2.0,state.playerState.uiScale+0.5); applyUIScale(); });
  document.getElementById('ctrlScaleDown').addEventListener('click',function(){ state.playerState.uiScale=Math.max(0.5,state.playerState.uiScale-0.5); applyUIScale(); });
  document.getElementById('ctrlReverse').addEventListener('click',function(){ video.currentTime=Math.max(0,video.currentTime-10); });
  document.getElementById('ctrlForward').addEventListener('click',function(){ video.currentTime=Math.min(video.duration||0,video.currentTime+10); });
  document.getElementById('ctrlBrightness').addEventListener('click',function(){ state.playerState.brightness=state.playerState.brightness===0?0.5:0; applyBrightness(); });
  document.getElementById('ctrlVolume').addEventListener('click',function(){ var vo=document.getElementById('volumeOverlay'); vo.style.display=vo.style.display==='block'?'none':'block'; });
  function togglePlay(){ if(video.paused)video.play().catch(function(){}); else video.pause(); }
  document.getElementById('ctrlPlayPause').addEventListener('click',togglePlay);
  document.getElementById('ctrlPlayPause2').addEventListener('click',togglePlay);
  video.addEventListener('play',function(){ document.getElementById('ctrlPlayPause').querySelector('i').className='fas fa-pause'; document.getElementById('ctrlPlayPause2').querySelector('i').className='fas fa-pause'; });
  video.addEventListener('pause',function(){ document.getElementById('ctrlPlayPause').querySelector('i').className='fas fa-play'; document.getElementById('ctrlPlayPause2').querySelector('i').className='fas fa-play'; });
  document.getElementById('ctrlPrev').addEventListener('click',playPrev);
  document.getElementById('ctrlNext').addEventListener('click',playNext);
  document.getElementById('ctrlSpeedDown').addEventListener('click',function(){ video.playbackRate=Math.max(0.1,Math.round((video.playbackRate-0.05)*100)/100); updateSpeedUI(); });
  document.getElementById('ctrlSpeedUp').addEventListener('click',function(){ video.playbackRate=Math.min(4.0,Math.round((video.playbackRate+0.1)*100)/100); updateSpeedUI(); });
  var sm=document.getElementById('speedMenu');
  document.getElementById('ctrlSpeed').addEventListener('click',function(){ sm.classList.toggle('hidden'); document.getElementById('qualityMenu').classList.add('hidden'); });
  sm.querySelectorAll('.menu-item').forEach(function(item){ item.addEventListener('click',function(){ video.playbackRate=parseFloat(item.dataset.speed); updateSpeedUI(); sm.classList.add('hidden'); }); });
  var qm=document.getElementById('qualityMenu');
  document.getElementById('ctrlQuality').addEventListener('click',function(){ qm.classList.toggle('hidden'); sm.classList.add('hidden'); });
  qm.querySelectorAll('.menu-item').forEach(function(item){ item.addEventListener('click',function(){ state.playerState.quality=item.dataset.quality; if(state.hlsInstance){ if(item.dataset.quality==='auto'){state.hlsInstance.currentLevel=-1;} else { var lv=state.hlsInstance.levels; var t=-1; for(var i=0;i<lv.length;i++){if(lv[i].height<=parseInt(item.dataset.quality)){t=i;break;}} if(t>=0)state.hlsInstance.currentLevel=t; } } qm.classList.add('hidden'); }); });
  document.getElementById('ctrlPlaylist').addEventListener('click',function(){ document.getElementById('playlistPanel').classList.toggle('hidden'); });
  document.getElementById('playlistClose').addEventListener('click',function(){ document.getElementById('playlistPanel').classList.add('hidden'); });
  document.getElementById('ctrlPip').addEventListener('click',function(){ if(document.pictureInPictureElement){document.exitPictureInPicture();} else { video.requestPictureInPicture().catch(function(){toast('PiP not supported');}); } });
  document.getElementById('ctrlFullscreen').addEventListener('click',function(){ var c=document.getElementById('videoContainer'); if(!document.fullscreenElement)c.requestFullscreen().catch(function(){}); else document.exitFullscreen(); });
  var pb=document.getElementById('progressBar'); var pf=document.getElementById('progressFill'); var ph=document.getElementById('progressHead'); var pbuf=document.getElementById('progressBuffer');
  pb.addEventListener('click',function(e){ var r=pb.getBoundingClientRect(); var p=(e.clientX-r.left)/r.width; if(video.duration)video.currentTime=p*video.duration; });
  video.addEventListener('timeupdate',function(){ if(video.duration){ var p=(video.currentTime/video.duration)*100; pf.style.width=p+'%'; ph.style.left=p+'%'; document.getElementById('ctrlCurrentTime').textContent=fmtTime(video.currentTime); document.getElementById('ctrlDuration').textContent=fmtTime(video.duration); } });
  video.addEventListener('progress',function(){ if(video.buffered.length>0&&video.duration){ var be=video.buffered.end(video.buffered.length-1); pbuf.style.width=(be/video.duration*100)+'%'; } });
  video.volume=state.playerState.defaultVolume;
  video.addEventListener('volumechange',updateVolUI);
  video.addEventListener('ended',function(){ if(state.playerState.loop==='same'){video.currentTime=0;video.play().catch(function(){});} else if(state.playerState.loop==='playlist'){if(state.currentVideoIndex<state.currentPlaylist.length-1)playNext();} else {playNext();} });
}
function applyBrightness(){ var o=document.getElementById('brightnessOverlay'); var b=state.playerState.brightness; if(b>0)o.style.background='rgba(255,255,255,'+(b*0.5)+')'; else if(b<0)o.style.background='rgba(0,0,0,'+(-b*0.5)+')'; else o.style.background='transparent'; }
function applyUIScale(){ var s=state.playerState.uiScale; document.getElementById('ctrlScaleVal').textContent=Math.round(s*100)+'%'; document.getElementById('playerOverlay').style.transform='scale('+s+')'; document.getElementById('playerOverlay').style.transformOrigin='center center'; }
function updateSpeedUI(){ var v=document.getElementById(CONFIG.PLAYER_ID); document.getElementById('ctrlSpeedVal').textContent=v.playbackRate.toFixed(1)+'x'; }
function updateVolUI(){ var v=document.getElementById(CONFIG.PLAYER_ID).volume; document.getElementById('volumeFill').style.height=(v*100)+'%'; var ic=document.getElementById('ctrlVolume').querySelector('i'); ic.className=v===0?'fas fa-volume-mute':v<0.5?'fas fa-volume-down':'fas fa-volume-up'; }
function loadVideo(url,title){
  var video=document.getElementById(CONFIG.PLAYER_ID);
  if(state.hlsInstance){state.hlsInstance.destroy();state.hlsInstance=null;}
  document.getElementById('ctrlTitle').textContent=title||url;

  var isHLS=/\.m3u8(\?|$)/i.test(url)||/master|playlist.*m3u8/i.test(url);
  var isPDF=/\.pdf(\?|$)/i.test(url);
  if(isPDF){openPDF(url,title);return;}

  // Multiple proxy fallbacks
  var proxies=[
    '', // direct (no proxy)
    'https://corsproxy.io/?url=',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/'
  ];
  var proxyIdx=0;

  function tryLoad(){
    var source=proxies[proxyIdx]?proxies[proxyIdx]+encodeURIComponent(url):url;

    if(isHLS&&Hls.isSupported()){
      var hls=new Hls({
        xhrSetup:function(xhr){xhr.withCredentials=false;},
        manifestLoadingMaxRetry:2,
        levelLoadingMaxRetry:2,
        fragLoadingMaxRetry:2,
        maxBufferLength:30,
        enableWorker:true
      });
      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,function(){video.play().catch(function(){});});
      hls.on(Hls.Events.ERROR,function(e,data){
        if(data.fatal){
          if(data.type===Hls.ErrorTypes.NETWORK_ERROR){
            console.warn('[HLS] Proxy '+proxyIdx+' failed (403/blocked), trying next...');
            hls.destroy();
            proxyIdx++;
            if(proxyIdx<proxies.length){tryLoad();}
            else toast('All proxies failed. Stream may require auth/cookies.');
          } else if(data.type===Hls.ErrorTypes.MEDIA_ERROR){
            hls.recoverMediaError();
          } else {
            toast('Error: '+data.details);
            hls.destroy();
          }
        }
      });
      state.hlsInstance=hls;
    } else if(isHLS&&video.canPlayType('application/vnd.apple.mpegurl')){
      video.src=source;
      video.play().catch(function(){});
    } else {
      video.src=source;
      video.play().catch(function(){});
      video.onerror=function(){
        if(proxyIdx<proxies.length-1){
          proxyIdx++;
          tryLoad();
        } else {
          toast('Video failed to load (403). May need auth.');
        }
      };
    }
  }

  tryLoad();
}   
function playNext(){ if(state.currentVideoIndex<state.currentPlaylist.length-1){state.currentVideoIndex++;playVideoAt(state.currentVideoIndex);} }
function playPrev(){ if(state.currentVideoIndex>0){state.currentVideoIndex--;playVideoAt(state.currentVideoIndex);} }
function playVideoAt(idx){ var item=state.currentPlaylist[idx]; if(!item)return; state.currentVideoIndex=idx; loadVideo(item.url,item.title); renderPlaylist(); renderSidePanels(); }
function renderPlaylist(){
  var c=document.getElementById('playlistBelow'); c.innerHTML='';
  state.currentPlaylist.forEach(function(item,i){
    var d=document.createElement('div'); d.className='pl-item'+(i===state.currentVideoIndex?' active':'');
    d.innerHTML='<div class="pl-thumb"><i class="fas fa-play-circle"></i></div><div class="pl-info"><div class="pl-title">'+(i+1)+'. '+esc(item.title)+'</div></div>';
    d.addEventListener('click',function(){playVideoAt(i);}); c.appendChild(d);
  });
  var p=document.getElementById('playlistItems'); p.innerHTML='';
  state.currentPlaylist.forEach(function(item,i){
    var d=document.createElement('div'); d.className='playlist-item'+(i===state.currentVideoIndex?' active':'');
    d.innerHTML='<span class="pi-num">'+(i+1)+'</span><span class="pi-title">'+esc(item.title)+'</span>';
    d.addEventListener('click',function(){playVideoAt(i);document.getElementById('playlistPanel').classList.add('hidden');});
    p.appendChild(d);
  });
}
function renderSidePanels(){
  var cf=state.currentPlaylist[state.currentVideoIndex]; if(!cf)return;
  var pl=document.getElementById('pdfList'); var sv=document.getElementById('sideVideoList');
  pl.innerHTML=''; sv.innerHTML='';
  var folder=findFolderByFile(cf);
  if(folder){ folder.files.forEach(function(f){
    if(f.type==='pdf'){ var d=document.createElement('div'); d.className='pdf-item'; d.innerHTML='<i class="fas fa-file-pdf"></i> '+esc(f.title); d.addEventListener('click',function(){openPDF(f.url,f.title);}); pl.appendChild(d); }
    else if(f.type==='video'&&f.url!==cf.url){ var d2=document.createElement('div'); d2.className='side-video-item'; d2.innerHTML='<i class="fas fa-video"></i> '+esc(f.title); d2.addEventListener('click',function(){ var idx=-1; for(var i=0;i<state.currentPlaylist.length;i++){if(state.currentPlaylist[i].url===f.url){idx=i;break;}} if(idx>=0)playVideoAt(idx); }); sv.appendChild(d2); }
  }); }
}
function initAddView(){
  document.getElementById('newFolderBtn').addEventListener('click',function(){ var n=prompt('Folder name:'); if(!n)return; var id=genId(); state.fileSystem.folders[id]={id:id,name:n,parentId:state.currentFolderId||'root',files:[]}; saveState(); renderExplorer(); toast('Folder "'+n+'" created'); });
  document.getElementById('newSubFolderBtn').addEventListener('click',function(){ var n=prompt('Subfolder name:'); if(!n)return; var id=genId(); var p=state.currentFolderId||'root'; state.fileSystem.folders[id]={id:id,name:n,parentId:p,files:[]}; saveState(); renderExplorer(); toast('Subfolder "'+n+'" created'); });
  document.getElementById('upDirBtn').addEventListener('click',function(){ var c=state.fileSystem.folders[state.currentFolderId||'root']; if(c&&c.parentId)state.currentFolderId=c.parentId; else state.currentFolderId=null; renderExplorer(); });
  document.getElementById('txtFileInput').addEventListener('change',function(e){ var f=e.target.files[0]; if(!f)return; var r=new FileReader(); r.onload=function(ev){parseTxt(ev.target.result);}; r.readAsText(f); });
  document.getElementById('fetchAddBtn').addEventListener('click',function(){
    var title=document.getElementById('fetchTitle').value.trim();
    var url=document.getElementById('fetchUrl').value.trim();
    var fid=document.getElementById('fetchFolder').value||'root';
    if(!url){toast('Enter a URL');return;} if(!title){toast('Enter a title');return;}
    document.getElementById('confirmFileName').textContent=title;
    document.getElementById('confirmFolder').textContent=getFolderPath(fid);
    populateFolderSelect('confirmFolderSelect',fid);
    document.getElementById('confirmModal').classList.remove('hidden');
    document.getElementById('confirmOk').onclick=function(){
      var ff=document.getElementById('confirmFolderSelect').value||fid;
      var isV=/\.(mp4|m3u8)$/i.test(url); var isP=/\.pdf$/i.test(url);
      var type=isV?'video':isP?'pdf':'file';
      state.fileSystem.folders[ff].files.push({title:title,url:url,type:type,folderId:ff});
      saveState(); document.getElementById('confirmModal').classList.add('hidden');
      document.getElementById('fetchTitle').value=''; document.getElementById('fetchUrl').value='';
      renderExplorer(); toast('Added: '+title); if(isV)loadVideo(url,title);
    };
    document.getElementById('confirmCancel').onclick=function(){ document.getElementById('confirmModal').classList.add('hidden'); };
  });
}
function parseTxt(text){
  var lines=text.split('\n').filter(function(l){return l.trim()!=='';});
  var count=0;
  lines.forEach(function(line){
    var parts=line.split(',').map(function(p){return p.trim();}).filter(function(p){return p!=='';});
    if(parts.length<2)return;
    var url=parts[parts.length-1];
    if(url.indexOf('http')!==0)return;
    var title=parts[parts.length-2];
    var folderFields=parts.slice(0,parts.length-2);
    if(folderFields.length===0){
      state.fileSystem.folders['root'].files.push({title:title,url:url,type:fileType(url),folderId:'root'});
      count++; return;
    }
    var fid='root';
    for(var i=0;i<folderFields.length;i++){
      fid=findOrCreateFolder(folderFields[i],fid);
    }
    state.fileSystem.folders[fid].files.push({title:title,url:url,type:fileType(url),folderId:fid});
    count++;
  });
  saveState(); renderExplorer(); toast('Imported '+count+' items');
}
function fileType(url){
  if(/\.(mp4|m3u8)$/i.test(url))return 'video';
  if(/\.pdf$/i.test(url))return 'pdf';
  return 'file';
}   
function deleteFolderRecursive(id){
  var ch=Object.values(state.fileSystem.folders).filter(function(f){return f.parentId===id;});
  ch.forEach(function(c){deleteFolderRecursive(c.id);});
  delete state.fileSystem.folders[id];
}
function renderExplore(){
  var grid=document.getElementById('exploreGrid');
  var bc=document.getElementById('exploreBreadcrumb');
  grid.innerHTML=''; bc.innerHTML='';
  var cid=state.currentFolderId||'root';
  var cur=state.fileSystem.folders[cid];
  var path=[]; var c=cur;
  while(c){path.unshift(c); c=c.parentId?state.fileSystem.folders[c.parentId]:null;}
  path.forEach(function(p,i){
    var sp=document.createElement('span');
    sp.textContent=p.name;
    sp.addEventListener('click',function(){state.currentFolderId=p.id==='root'?null:p.id;renderExplore();});
    bc.appendChild(sp);
    if(i<path.length-1){var s2=document.createElement('span');s2.textContent=' / ';s2.style.cursor='default';bc.appendChild(s2);}
  });
  var w=window.innerWidth;
  if(w>1400)grid.className='explore-grid cols-6';
  else if(w>1100)grid.className='explore-grid cols-5';
  else if(w>800)grid.className='explore-grid cols-4';
  else grid.className='explore-grid';
  var children=Object.values(state.fileSystem.folders).filter(function(f){return f.parentId===cid;});
  children.forEach(function(f){
    var card=document.createElement('div');
    card.className='explore-card';
    card.innerHTML='<div class="card-thumb"><i class="fas fa-folder" style="font-size:2.5rem;color:var(--warning)"></i></div><div class="card-info"><div class="card-title">'+esc(f.name)+'</div><div class="card-type"><i class="fas fa-folder"></i> Folder ('+f.files.length+' items)</div></div>';
    card.addEventListener('click',function(){state.currentFolderId=f.id;renderExplore();});
    grid.appendChild(card);
  });
  cur.files.forEach(function(f){
    var icon=f.type==='video'?'fas fa-play-circle':f.type==='pdf'?'fas fa-file-pdf':'fas fa-file';
    var color=f.type==='video'?'var(--accent)':f.type==='pdf'?'var(--danger)':'var(--text-muted)';
    var card=document.createElement('div');
    card.className='explore-card';
    card.innerHTML='<div class="card-thumb"><i class="'+icon+'" style="font-size:2.5rem;color:'+color+'"></i></div><div class="card-info"><div class="card-title">'+esc(f.title)+'</div><div class="card-type"><i class="'+icon+'"></i> '+f.type.toUpperCase()+'</div></div>';
    card.addEventListener('click',function(){
      if(f.type==='video'){
        state.currentPlaylist=cur.files.filter(function(x){return x.type==='video';});
        var idx=-1;
        for(var i=0;i<state.currentPlaylist.length;i++){if(state.currentPlaylist[i].url===f.url){idx=i;break;}}
        if(idx>=0){switchView('home');playVideoAt(idx);}
      } else if(f.type==='pdf'){ openPDF(f.url,f.title); }
    });
    grid.appendChild(card);
  });
}
function initPdfViewer(){
  document.getElementById('pdfClose').addEventListener('click',function(){
    document.getElementById('pdfModal').classList.add('hidden');
    document.getElementById('pdfFrame').src='';
  });
  document.getElementById('pdfBack').addEventListener('click',function(){
    document.getElementById('pdfModal').classList.add('hidden');
    document.getElementById('pdfFrame').src='';
  });
  document.getElementById('pdfDownload').addEventListener('click',function(){
    var u=document.getElementById('pdfFrame').src;
    if(u)window.open(u,'_blank');
  });
}
function openPDF(url,title){
  document.getElementById('pdfTitle').textContent=title||'PDF';
  document.getElementById('pdfFrame').src=url;
  document.getElementById('pdfModal').classList.remove('hidden');
}
function renderExplorer(){
  var container=document.getElementById('explorerContent');
  container.innerHTML='';
  var cid=state.currentFolderId||'root';
  var cur=state.fileSystem.folders[cid];
  document.getElementById('explorerPath').textContent=getFolderPath(cid);

  var children=Object.values(state.fileSystem.folders).filter(function(f){return f.parentId===cid;});
  children.forEach(function(f){
    var d=document.createElement('div');
    d.className='explorer-item folder';
    d.innerHTML='<i class="fas fa-folder"></i> '+esc(f.name);
    d.addEventListener('click',function(){state.currentFolderId=f.id;selectedItems={};renderExplorer();});
    container.appendChild(d);
  });

  cur.files.forEach(function(f,i){
    var key=cid+'_'+i;
    var isSelected=selectedItems[key];
    var icon=f.type==='video'?'fas fa-video':f.type==='pdf'?'fas fa-file-pdf':'fas fa-file';
    var d=document.createElement('div');
    d.className='explorer-item file'+(isSelected?' selected':'');
    d.innerHTML='<input type="checkbox" '+(isSelected?'checked':'')+' style="accent-color:var(--accent)"> <i class="'+icon+'"></i> '+esc(f.title);
    d.querySelector('input').addEventListener('click',function(e){
      e.stopPropagation();
      if(selectedItems[key])delete selectedItems[key]; else selectedItems[key]=true;
      renderExplorer();
    });
    d.addEventListener('click',function(){
      if(f.type==='video'){
        state.currentPlaylist=cur.files.filter(function(x){return x.type==='video';});
        var idx=-1;
        for(var j=0;j<state.currentPlaylist.length;j++){if(state.currentPlaylist[j].url===f.url){idx=j;break;}}
        if(idx>=0){switchView('home');playVideoAt(idx);}
      } else if(f.type==='pdf'){ openPDF(f.url,f.title); }
    });
    container.appendChild(d);
  });

  populateFolderSelect('fetchFolder',cid);
}   

function initExplorerActions(){
  document.getElementById('selectAllBtn').addEventListener('click',function(){
    var cid=state.currentFolderId||'root';
    var cur=state.fileSystem.folders[cid];
    selectedItems={};
    cur.files.forEach(function(f,i){ selectedItems[cid+'_'+i]=true; });
    renderExplorer();
    toast('Selected '+cur.files.length+' items');
  });

  document.getElementById('deleteSelectedBtn').addEventListener('click',function(){
    var keys=Object.keys(selectedItems);
    if(keys.length===0){toast('Nothing selected. Use Select All first.');return;}
    if(!confirm('Delete '+keys.length+' selected items?'))return;
    // Group by folder
    var byFolder={};
    keys.forEach(function(k){
      var parts=k.split('_');
      var fid=parts.slice(0,-1).join('_');
      var idx=parseInt(parts[parts.length-1]);
      if(!byFolder[fid])byFolder[fid]=[];
      byFolder[fid].push(idx);
    });
    // Delete from highest index first to avoid shifting
    Object.keys(byFolder).forEach(function(fid){
      var idxs=byFolder[fid].sort(function(a,b){return b-a;});
      idxs.forEach(function(i){ state.fileSystem.folders[fid].files.splice(i,1); });
    });
    selectedItems={};
    saveState(); renderExplorer(); toast('Items deleted');
  });

  document.getElementById('moveSelectedBtn').addEventListener('click',function(){
    var keys=Object.keys(selectedItems);
    if(keys.length===0){toast('Nothing selected. Use Select All first.');return;}
    // Populate target folder select
    var sel=document.getElementById('moveTargetSelect');
    sel.innerHTML='';
    (function addOpts(pid,depth){
      var kids=Object.values(state.fileSystem.folders).filter(function(f){return f.parentId===pid;});
      kids.forEach(function(f){
        var o=document.createElement('option');
        o.value=f.id;
        o.textContent='  '.repeat(depth)+f.name;
        sel.appendChild(o);
        addOpts(f.id,depth+1);
      });
    })('root',0);
    document.getElementById('moveModal').classList.remove('hidden');

    document.getElementById('moveOk').onclick=function(){
      var target=document.getElementById('moveTargetSelect').value;
      if(!target){toast('Select a target folder');return;}
      var byFolder={};
      keys.forEach(function(k){
        var parts=k.split('_');
        var fid=parts.slice(0,-1).join('_');
        var idx=parseInt(parts[parts.length-1]);
        if(!byFolder[fid])byFolder[fid]=[];
        byFolder[fid].push(idx);
      });
      // Move items
      Object.keys(byFolder).forEach(function(fid){
        if(fid===target)return;
        var idxs=byFolder[fid].sort(function(a,b){return b-a;});
        idxs.forEach(function(i){
          var item=state.fileSystem.folders[fid].files.splice(i,1)[0];
          item.folderId=target;
          state.fileSystem.folders[target].files.push(item);
        });
      });
      selectedItems={};
      saveState(); renderExplorer();
      document.getElementById('moveModal').classList.add('hidden');
      toast('Items moved');
    };
    document.getElementById('moveCancel').onclick=function(){
      document.getElementById('moveModal').classList.add('hidden');
    };
  });
}   
