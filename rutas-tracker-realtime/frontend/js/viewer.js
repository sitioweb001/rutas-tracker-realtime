
(function(){
  const REFRESH_MS = 3000;
  const DEFAULT_CENTER = [13.6929, -89.2182];
  const params = new URLSearchParams(location.search);
  const transportParam = params.get('transport') || 't1';
  const titleEl = document.getElementById('title');

  // Colors by transport id
  const colorById = { t1:'#22c55e', t2:'#3b82f6', t3:'#f59e0b', other:'#a855f7' };

  // Map
  const map = L.map('map').setView(DEFAULT_CENTER, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:20, attribution:'&copy; OpenStreetMap' }).addTo(map);
  const markers = new Map(); // transportId -> marker

  // Bottom panel (legend)
  const panel = document.getElementById('fleetPanel');
  function createItem(tid){
    const dotColor = colorById[tid] || colorById.other;
    const el = document.createElement('div');
    el.className = 'fleetItem';
    el.dataset.tid = tid;
    el.innerHTML = `<span class="fleetDot" style="background:${dotColor}"></span>
                    <span class="fleetName">${tid.toUpperCase()}</span>
                    <span class="fleetStatus fleetOffline">— Detenido</span>`;
    el.onclick = () => { const m = markers.get(tid); if(m){ map.panTo(m.getLatLng()); }}
    panel.appendChild(el);
    return el;
  }
  function setItemStatus(tid, online){
    const el = panel.querySelector(`.fleetItem[data-tid="${tid}"]`);
    if(!el) return; const st = el.querySelector('.fleetStatus');
    st.classList.toggle('fleetOnline', !!online);
    st.classList.toggle('fleetOffline', !online);
    st.textContent = online? '— Compartiendo ubicación' : '— No comparte ubicación';
  }

  // Single-view last fix chip
  const lastFixChip = document.getElementById('lastFix');
  let lastTs=0,lastLat=null,lastLng=null;
  function fmtTime(ts){ try{ return new Date(ts).toLocaleString(); }catch{return '';} }
  function updateChip(){
    if(transportParam==='all') { lastFixChip.style.display='none'; return; }
    if(!lastTs || lastLat==null || lastLng==null){ lastFixChip.style.display='none'; return; }
    lastFixChip.innerHTML = `<div><b>Última posición</b></div>
      <div>Lat: ${lastLat.toFixed(6)}<br>Lng: ${lastLng.toFixed(6)}</div>
      <div><small>${fmtTime(lastTs)}</small></div>`;
    lastFixChip.style.display='block';
  }

  // Helpers
  function upsertMarker(tid, lat, lng){
    const color = colorById[tid] || colorById.other;
    let m = markers.get(tid);
    if(!m){
      m = L.circleMarker([lat,lng], { radius:10, color, fillColor:color, fillOpacity:.9 }).addTo(map);
      m.bindTooltip(tid.toUpperCase(), { permanent:true, direction:'top', offset:[0,-10], opacity:.9 });
      markers.set(tid, m);
    } else { m.setLatLng([lat,lng]); }
  }

  // Socket
  const socket = io();

  async function initSingle(){
    titleEl.textContent = `Transporte: ${transportParam}`;
    createItem(transportParam);
    socket.emit('join',{ transportId: transportParam });
    try{ const r=await fetch(`/api/location/${encodeURIComponent(transportParam)}`); if(r.ok){ const d=await r.json(); lastTs=d.ts||Date.now(); lastLat=d.lat; lastLng=d.lng; upsertMarker(transportParam,d.lat,d.lng); map.setView([d.lat,d.lng],16); updateChip(); }}catch{}
    try{ const r=await fetch(`/api/location/status/${encodeURIComponent(transportParam)}`); const s=r.ok?await r.json():{online:false}; setItemStatus(transportParam, !!s.online);}catch{ setItemStatus(transportParam,false);}  }

  async function initAll(){
    titleEl.textContent = 'Viendo todos los transportes';
    let transports=[]; try{ const r=await fetch('/api/transports/public'); transports = r.ok? await r.json(): []; }catch{}
    transports.forEach(t=>{ createItem(t.id); socket.emit('join',{ transportId:t.id }); });
    try{ const r=await fetch('/api/location'); if(r.ok){ const arr=await r.json(); arr.forEach(d=>{ if(d && d.transportId){ upsertMarker(d.transportId,d.lat,d.lng); } }); const first=arr.find(Boolean); if(first) map.setView([first.lat, first.lng], 13); }}catch{}
    // initial status per transport
    transports.forEach(async t=>{ try{ const r=await fetch(`/api/location/status/${encodeURIComponent(t.id)}`); const s=r.ok?await r.json():{online:false}; setItemStatus(t.id, !!s.online); }catch{ setItemStatus(t.id,false); } });
  }

  if(transportParam==='all') initAll(); else initSingle();

  socket.on('location', (p)=>{
    if(!p||!p.transportId) return; if(transportParam!=='all' && p.transportId!==transportParam) return; upsertMarker(p.transportId,p.lat,p.lng);
    if(transportParam!=='all'){ if(p.ts && p.ts<lastTs) return; lastTs=p.ts||Date.now(); lastLat=p.lat; lastLng=p.lng; map.panTo([p.lat,p.lng]); updateChip(); setItemStatus(transportParam,true); }
  });
  socket.on('status', ({transportId:t, online})=>{
    if(transportParam!=='all' && t!==transportParam) return; setItemStatus(t, online);
  });

  // polling single
  setInterval(async()=>{
    if(transportParam==='all') return; try{ const r=await fetch(`/api/location/${encodeURIComponent(transportParam)}`); if(!r.ok) return; const d=await r.json(); if(d.ts && d.ts<lastTs) return; lastTs=d.ts||Date.now(); lastLat=d.lat; lastLng=d.lng; upsertMarker(transportParam,d.lat,d.lng); updateChip(); }catch{}
  }, REFRESH_MS);
})();
