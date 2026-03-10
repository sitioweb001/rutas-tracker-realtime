
(function () {
  const REFRESH_MS = 3000;
  const DEFAULT_CENTER = [13.6929, -89.2182];
  function ensureStatusBarStyles(){ if(document.getElementById('liveStatusStyles')) return; const css=`#liveStatusBar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:rgba(27,29,54,.92);color:#e5e7eb;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:9999;backdrop-filter:blur(4px);}#liveStatusDot{width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 2px rgba(0,0,0,.25) inset;}#liveStatusText{user-select:none;} .status-online  #liveStatusDot{background:#16a34a;} .status-offline #liveStatusDot{background:#ef4444;}`; const style=document.createElement('style'); style.id='liveStatusStyles'; style.textContent=css; document.head.appendChild(style);} 
  function ensureStatusBar(){ let bar=document.getElementById('liveStatusBar'); if(!bar){ bar=document.createElement('div'); bar.id='liveStatusBar'; bar.className='status-offline'; bar.innerHTML = '<div id="liveStatusDot"></div><div id="liveStatusText">🔴 Detenido</div>'; document.body.appendChild(bar);} return bar; }
  ensureStatusBarStyles(); const bar=ensureStatusBar(); const barText=document.getElementById('liveStatusText');
  function setOnlineUI(isOnline){ if(!bar||!barText) return; if(isOnline){ bar.classList.add('status-online'); bar.classList.remove('status-offline'); barText.textContent='🟢 En vivo'; } else { bar.classList.remove('status-online'); bar.classList.add('status-offline'); barText.textContent='🔴 Detenido'; } }
  const params=new URLSearchParams(location.search); const transportId=params.get('transport')||'t1'; const titleEl=document.getElementById('title'); if(titleEl) titleEl.textContent=`Transporte: ${transportId}`;
  const socket = io();
  const map = L.map('map').setView(DEFAULT_CENTER, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:20, attribution:'&copy; OpenStreetMap' }).addTo(map);
  const marker = L.marker(DEFAULT_CENTER, { draggable:false }).addTo(map);
  let lastTs = 0;
  socket.emit('join', { transportId });
  fetch(`/api/location/${encodeURIComponent(transportId)}`).then(r=>r.ok?r.json():null).then(d=>{ if(d && typeof d.lat==='number' && typeof d.lng==='number'){ marker.setLatLng([d.lat,d.lng]); map.setView([d.lat,d.lng],16); lastTs=d.ts||Date.now(); } });
  fetch(`/api/location/status/${encodeURIComponent(transportId)}`).then(r=>r.ok?r.json():{online:false}).then(({online})=>setOnlineUI(online)).catch(()=>setOnlineUI(false));
  socket.on('location', (p)=>{ if(!p||p.transportId!==transportId) return; const {lat,lng,ts}=p; if(typeof lat!=='number'||typeof lng!=='number') return; if(ts && ts<lastTs) return; lastTs=ts||Date.now(); marker.setLatLng([lat,lng]); map.panTo([lat,lng]); });
  socket.on('status', ({transportId:t, online})=>{ if(t!==transportId) return; setOnlineUI(online); });
  setInterval(()=>{ fetch(`/api/location/${encodeURIComponent(transportId)}`).then(r=>r.ok?r.json():null).then(d=>{ if(!d) return; const {lat,lng,ts}=d; if(typeof lat!=='number'||typeof lng!=='number') return; if(ts && ts<lastTs) return; lastTs=ts||Date.now(); marker.setLatLng([lat,lng]); }); }, REFRESH_MS);
})();
