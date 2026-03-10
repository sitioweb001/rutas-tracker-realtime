
(function(){
  const REFRESH_MS = 3000;
  const DEFAULT_CENTER = [13.6929, -89.2182];
  const params = new URLSearchParams(location.search);
  const transportParam = params.get('transport') || 't1';
  const titleEl = document.getElementById('title');
  const panel = document.getElementById('fleetPanel');

  const colorById = { t1:'#22c55e', t2:'#3b82f6', t3:'#f59e0b', t4:'#e11d48', t5:'#06b6d4', t6:'#a855f7', other:'#64748b' };

  const map = L.map('map').setView(DEFAULT_CENTER, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:20, attribution:'&copy; OpenStreetMap' }).addTo(map);
  const markers = new Map(); // transportId -> marker
  const lastTsById = new Map();

  function fmtTime(ts){ try{ const d=new Date(ts); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'}); }catch{return '—';} }

  function createItem(tid){
    const dotColor = colorById[tid] || colorById.other;
    const el = document.createElement('div');
    el.className = 'fleetItem'; el.dataset.tid = tid;
    el.innerHTML = `<span class="fleetDot" style="background:${dotColor}"></span>
                    <span class="fleetName">${tid.toUpperCase()}</span>
                    <span class="fleetStatus fleetOffline">— No comparte ubicación</span>
                    <span class="fleetTime">· —</span>`;
    el.onclick = () => { const m = markers.get(tid); if(m){ map.panTo(m.getLatLng()); }}
    panel.appendChild(el);
    return el;
  }
  function ensureItem(tid){ let el = panel.querySelector(`.fleetItem[data-tid="${tid}"]`); return el || createItem(tid); }
  function setItemStatus(tid, online){
    const el = ensureItem(tid); const st = el.querySelector('.fleetStatus');
    st.classList.toggle('fleetOnline', !!online); st.classList.toggle('fleetOffline', !online);
    st.textContent = online? '— Compartiendo ubicación' : '— No comparte ubicación';
  }
  function setItemTime(tid, ts){ const el = ensureItem(tid); const tt = el.querySelector('.fleetTime'); tt.textContent = ' · ' + (ts? fmtTime(ts) : '—'); }

  function upsertMarker(tid, lat, lng){
    const color = colorById[tid] || colorById.other; let m = markers.get(tid);
    if(!m){ m = L.circleMarker([lat,lng], { radius:10, color, fillColor:color, fillOpacity:.9 }).addTo(map); m.bindTooltip(tid.toUpperCase(), { permanent:true, direction:'top', offset:[0,-10], opacity:.9 }); markers.set(tid, m); }
    else { m.setLatLng([lat,lng]); }
  }

  const lastFixChip = document.getElementById('lastFix'); let lastTs=0,lastLat=null,lastLng=null;
  function updateChip(){ if(transportParam==='all'){ lastFixChip.style.display='none'; return; } if(!lastTs||lastLat==null||lastLng==null){ lastFixChip.style.display='none'; return;} lastFixChip.innerHTML=`<div><b>Última posición</b></div><div>Lat: ${lastLat.toFixed(6)}<br>Lng: ${lastLng.toFixed(6)}</div><div><small>${new Date(lastTs).toLocaleString()}</small></div>`; lastFixChip.style.display='block'; }

  const socket = io();

  async function initSingle(){
    titleEl.textContent = `Transporte: ${transportParam}`; ensureItem(transportParam);
    socket.emit('join',{ transportId: transportParam });
    try{ const r=await fetch(`/api/location/${encodeURIComponent(transportParam)}`); if(r.ok){ const d=await r.json(); lastTs=d.ts||Date.now(); lastLat=d.lat; lastLng=d.lng; lastTsById.set(transportParam,lastTs); upsertMarker(transportParam,d.lat,d.lng); map.setView([d.lat,d.lng],16); updateChip(); setItemTime(transportParam,lastTs); }}catch{}
    try{ const r=await fetch(`/api/location/status/${encodeURIComponent(transportParam)}`); const s=r.ok?await r.json():{online:false}; setItemStatus(transportParam, !!s.online);}catch{ setItemStatus(transportParam,false);}  }

  async function initAll(){
    titleEl.textContent = 'Viendo todos los transportes';
    let transports=[]; try{ const r=await fetch('/api/transports/public'); transports = r.ok? await r.json(): []; }catch{}
    transports.forEach(t=>{ ensureItem(t.id); socket.emit('join',{ transportId:t.id }); });
    try{ const r=await fetch('/api/location'); if(r.ok){ const arr=await r.json(); arr.forEach(d=>{ if(d && d.transportId){ lastTsById.set(d.transportId, d.ts||Date.now()); setItemTime(d.transportId, d.ts); upsertMarker(d.transportId,d.lat,d.lng); } }); const first=arr.find(Boolean); if(first) map.setView([first.lat, first.lng], 13); }}catch{}
    transports.forEach(async t=>{ try{ const r=await fetch(`/api/location/status/${encodeURIComponent(t.id)}`); const s=r.ok?await r.json():{online:false}; setItemStatus(t.id, !!s.online); }catch{ setItemStatus(t.id,false); } });
  }

  if(transportParam==='all') initAll(); else initSingle();

  socket.on('location', (p)=>{
    if(!p||!p.transportId) return; if(transportParam!=='all' && p.transportId!==transportParam) return; upsertMarker(p.transportId,p.lat,p.lng); setItemStatus(p.transportId,true); setItemTime(p.transportId,p.ts); lastTsById.set(p.transportId,p.ts||Date.now()); if(transportParam!=='all'){ if(p.ts && p.ts<lastTs) return; lastTs=p.ts||Date.now(); lastLat=p.lat; lastLng=p.lng; map.panTo([p.lat,p.lng]); updateChip(); }
  });
  socket.on('status', ({transportId:t, online})=>{ setItemStatus(t, online); /* keep last time */ });

  setInterval(async()=>{
    if(transportParam==='all') return; try{ const r=await fetch(`/api/location/${encodeURIComponent(transportParam)}`); if(!r.ok) return; const d=await r.json(); if(d.ts && d.ts<lastTs) return; lastTs=d.ts||Date.now(); lastLat=d.lat; lastLng=d.lng; upsertMarker(transportParam,d.lat,d.lng); setItemTime(transportParam,lastTs); updateChip(); }catch{}
  }, REFRESH_MS);
})();
