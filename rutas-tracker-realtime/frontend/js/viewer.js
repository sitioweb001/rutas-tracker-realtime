
(function(){
  const REFRESH_MS = 3000;
  const DEFAULT_CENTER = [13.6929, -89.2182];
  const params = new URLSearchParams(location.search);
  const transportParam = params.get('transport') || 't1';
  const titleEl = document.getElementById('title');

  // UI helpers (status bar + last fix chip)
  function ensureStyles(){ if(document.getElementById('liveStatusStyles')) return; const css = `#liveStatusBar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:rgba(27,29,54,.92);color:#e5e7eb;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:9999;backdrop-filter:blur(4px);}#liveStatusDot{width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 2px rgba(0,0,0,.25) inset;}#liveStatusText{user-select:none;white-space:nowrap;} .status-online #liveStatusDot{background:#16a34a;} .status-offline #liveStatusDot{background:#ef4444;} #lastFix{position:fixed;left:12px;bottom:12px;display:none;padding:10px 12px;background:rgba(27,29,54,.92);color:#e5e7eb;border-radius:12px;font-size:.9rem;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:9999;backdrop-filter:blur(4px);max-width:60vw;line-height:1.3;}#lastFix b{color:#d8b4fe;}`; const style=document.createElement('style'); style.id='liveStatusStyles'; style.textContent=css; document.head.appendChild(style); }
  function ensureBar(){ let b=document.getElementById('liveStatusBar'); if(!b){ b=document.createElement('div'); b.id='liveStatusBar'; b.className='status-offline'; b.innerHTML='<div id="liveStatusDot"></div><div id="liveStatusText">🔴 Detenido</div>'; document.body.appendChild(b);} return b; }
  function ensureChip(){ let c=document.getElementById('lastFix'); if(!c){ c=document.createElement('div'); c.id='lastFix'; c.textContent='Última posición…'; document.body.appendChild(c);} return c; }
  function fmtTime(ts){ try{ return new Date(ts).toLocaleString(); }catch{ return ''; } }

  ensureStyles(); const statusBar = ensureBar(); const statusText = document.getElementById('liveStatusText'); const lastFixChip = ensureChip();
  function setOnlineUI(isOnline){ if(isOnline){ statusBar.classList.add('status-online'); statusBar.classList.remove('status-offline'); statusText.textContent='🟢 En vivo'; } else { statusBar.classList.remove('status-online'); statusBar.classList.add('status-offline'); statusText.textContent='🔴 Detenido || La última posición es esta'; lastFixChip.style.display = lastTs ? 'block' : 'none'; } }
  function updateChip(){ if(!lastTs || lastLat==null || lastLng==null){ lastFixChip.style.display='none'; return; } lastFixChip.innerHTML = `<div><b>Última posición</b></div><div>Lat: ${lastLat.toFixed(6)}<br>Lng: ${lastLng.toFixed(6)}</div><div><small>${fmtTime(lastTs)}</small></div>`; }

  // Map + markers store
  const map = L.map('map').setView(DEFAULT_CENTER, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:20, attribution:'&copy; OpenStreetMap' }).addTo(map);
  const colorById = { t1:'#22c55e', t2:'#3b82f6', t3:'#f59e0b', other:'#a855f7' };
  const markers = new Map(); // transportId -> marker

  let lastTs = 0, lastLat = null, lastLng = null; // for single view chip
  const socket = io();

  function setTitle(){
    titleEl.textContent = transportParam==='all' ? 'Viendo todos los transportes' : `Transporte: ${transportParam}`;
  }
  setTitle();

  function upsertMarker(tid, lat, lng){
    const color = colorById[tid] || colorById.other;
    let m = markers.get(tid);
    if(!m){
      m = L.circleMarker([lat,lng], { radius:10, color, fillColor:color, fillOpacity:.9 }).addTo(map);
      m.bindTooltip(tid.toUpperCase(), { permanent:true, direction:'top', offset:[0,-10], opacity:.9 });
      markers.set(tid, m);
    } else {
      m.setLatLng([lat,lng]);
    }
  }

  async function initSingle(){
    // join room
    socket.emit('join',{ transportId: transportParam });
    // center with last
    try{
      const r = await fetch(`/api/location/${encodeURIComponent(transportParam)}`);
      if(r.ok){ const d = await r.json(); lastTs=d.ts||Date.now(); lastLat=d.lat; lastLng=d.lng; upsertMarker(transportParam, d.lat, d.lng); map.setView([d.lat,d.lng], 16); updateChip(); }
    }catch{}
    // status now
    try{ const r = await fetch(`/api/location/status/${encodeURIComponent(transportParam)}`); const s = r.ok? await r.json(): {online:false}; setOnlineUI(!!s.online); }catch{ setOnlineUI(false); }
  }

  async function initAll(){
    // get transports public
    let transports = [];
    try{ const r = await fetch('/api/transports/public'); transports = r.ok? await r.json(): []; }catch{}
    // join all rooms
    transports.forEach(t=> socket.emit('join',{ transportId: t.id }));
    // load all last locations
    try{ const r = await fetch('/api/location'); if(r.ok){ const arr = await r.json(); arr.forEach(d=>{ if(d && d.transportId && typeof d.lat==='number'){ upsertMarker(d.transportId, d.lat, d.lng); } }); const first = arr.find(Boolean); if(first){ map.setView([first.lat, first.lng], 13); } } }catch{}
    // Hide status bar for ALL mode (optional) and chip
    statusBar.style.display = 'none'; lastFixChip.style.display='none';
  }

  if(transportParam==='all') initAll(); else initSingle();

  // socket updates
  socket.on('location', (p)=>{
    if(!p || !p.transportId || (transportParam!=='all' && p.transportId!==transportParam)) return;
    upsertMarker(p.transportId, p.lat, p.lng);
    if(transportParam!=='all'){
      if(p.ts && p.ts<lastTs) return; lastTs=p.ts||Date.now(); lastLat=p.lat; lastLng=p.lng; map.panTo([p.lat,p.lng]); updateChip();
    }
  });
  socket.on('status', ({transportId:t, online})=>{
    if(transportParam==='all') return; // status bar solo en vista de 1 transporte
    if(t!==transportParam) return; setOnlineUI(online);
  });

  // polling fallback (single)
  setInterval(async()=>{
    if(transportParam==='all') return; try{ const r=await fetch(`/api/location/${encodeURIComponent(transportParam)}`); if(!r.ok) return; const d=await r.json(); if(d.ts && d.ts<lastTs) return; lastTs=d.ts||Date.now(); lastLat=d.lat; lastLng=d.lng; upsertMarker(transportParam,d.lat,d.lng); updateChip(); }catch{}
  }, REFRESH_MS);
})();
