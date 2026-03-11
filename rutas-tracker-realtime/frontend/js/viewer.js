
(function(){
  const REFRESH_MS = 3000;
  const DEFAULT_CENTER = [13.6929, -89.2182];
  const params = new URLSearchParams(location.search);
  const transportParam = params.get('transport') || 't1';
  const titleEl = document.getElementById('title');
  const panel = document.getElementById('fleetPanel');
  const toggleRow = document.getElementById('fleetToggleRow');
  const toggleBtn = document.getElementById('toggleFleet');
  const isAll = (transportParam === 'all');

  // Colors
  const colorById = { t1:'#22c55e', t2:'#3b82f6', t3:'#f59e0b', t4:'#e11d48', t5:'#06b6d4', t6:'#a855f7', t7:'#10b981', t8:'#f97316', t9:'#84cc16', t10:'#0ea5e9', t11:'#9333ea', t12:'#ef4444', t13:'#14b8a6', t14:'#8b5cf6', t15:'#f59e0b', t16:'#22c55e', t17:'#3b82f6', t18:'#f97316', t19:'#84cc16', t20:'#0ea5e9', other:'#64748b' };

  // Map
  const map = L.map('map').setView(DEFAULT_CENTER, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:20, attribution:'&copy; OpenStreetMap' }).addTo(map);
  const markers = new Map();
  const lastTsById = new Map();

  // Collapsible states panel
  if (!isAll) {
    toggleRow.style.display = 'none';
    panel.classList.add('hidden');
  } else {
    panel.classList.add('hidden');
    toggleBtn.onclick = () => {
      panel.classList.toggle('hidden');
      toggleBtn.textContent = panel.classList.contains('hidden') ? 'Desplegar estado de conductores' : 'Ocultar estado de conductores';
    };
  }

  // Labels (aliases) from public endpoint
  let labelByT = new Map();
  let driverByT = new Map();
  let emailByT  = new Map();
  fetch('/api/users/public/labels')
    .then(r=>r.ok?r.json():{transports:[],trackers:[]})
    .then(({transports,trackers})=>{
      transports.forEach(t=>{ if(t&&t.id) labelByT.set(t.id, t.label||null); });
      trackers.forEach(u=>{ if(u&&u.transportId){ if(u.displayName) driverByT.set(u.transportId, u.displayName); if(u.email) emailByT.set(u.transportId, u.email); } });
      // Update titles if markers already exist
      markers.forEach((m,tid)=>{ m.setTooltipContent(titleForTransport(tid)); });
      // Update items already created
      Array.from(panel.querySelectorAll('.fleetItem')).forEach(el=>{
        const tid = el.dataset.tid; const nameEl = el.querySelector('.fleetName'); if(nameEl) nameEl.textContent = titleForTransport(tid);
      });
    });

  function titleForTransport(tid){
    const tLabel = labelByT.get(tid) || tid.toUpperCase();
    const dLabel = driverByT.get(tid) || '';
    return dLabel ? `${tLabel} — ${dLabel}` : tLabel;
  }

  function fmtTime(ts){ try{ const d=new Date(ts); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'}); }catch{return '—';} }

  function ensureItem(tid){
    let el = panel.querySelector(`.fleetItem[data-tid="${tid}"]`);
    if(el) return el;
    const dotColor = colorById[tid] || colorById.other;
    el = document.createElement('div');
    el.className = 'fleetItem';
    el.dataset.tid = tid;
    el.innerHTML = `<span class="fleetDot" style="background:${dotColor}"></span>
                    <span class="fleetName">${titleForTransport(tid)}</span>
                    <span class="fleetStatus fleetOffline">— No comparte ubicación</span>
                    <span class="fleetTime">· —</span>`;
    el.onclick = () => { const m = markers.get(tid); if(m){ map.panTo(m.getLatLng()); }}
    panel.appendChild(el);
    return el;
  }
  function setItemStatus(tid, online){ const el = ensureItem(tid); const st = el.querySelector('.fleetStatus'); st.classList.toggle('fleetOnline', !!online); st.classList.toggle('fleetOffline', !online); st.textContent = online? '— Compartiendo ubicación' : '— No comparte ubicación'; }
  function setItemTime(tid, ts){ const el = ensureItem(tid); const tt = el.querySelector('.fleetTime'); tt.textContent = ' · ' + (ts? fmtTime(ts) : '—'); }

  function upsertMarker(tid, lat, lng){
    const color = colorById[tid] || colorById.other; let m = markers.get(tid);
    if(!m){ m = L.circleMarker([lat,lng], { radius:10, color, fillColor:color, fillOpacity:.9 }).addTo(map); m.bindTooltip(titleForTransport(tid), { permanent:true, direction:'top', offset:[0,-10], opacity:.9 }); markers.set(tid, m); }
    else { m.setLatLng([lat,lng]); m.setTooltipContent(titleForTransport(tid)); }
  }

  const lastFixChip = document.getElementById('lastFix'); let lastTs=0,lastLat=null,lastLng=null;
  function updateChip(){ if(isAll){ lastFixChip.style.display='none'; return; } if(!lastTs||lastLat==null||lastLng==null){ lastFixChip.style.display='none'; return;} lastFixChip.innerHTML=`<div><b>Última posición</b></div><div>Lat: ${lastLat.toFixed(6)}<br>Lng: ${lastLng.toFixed(6)}</div><div><small>${new Date(lastTs).toLocaleString()}</small></div>`; lastFixChip.style.display='block'; }

  const socket = io();

  async function initSingle(){
    titleEl.textContent = `Transporte: ${transportParam}`;
    ensureItem(transportParam);
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

  if(isAll) initAll(); else initSingle();

  socket.on('location', (p)=>{ if(!p||!p.transportId) return; if(!isAll && p.transportId!==transportParam) return; upsertMarker(p.transportId,p.lat,p.lng); setItemStatus(p.transportId,true); setItemTime(p.transportId,p.ts); lastTsById.set(p.transportId,p.ts||Date.now()); if(!isAll){ if(p.ts && p.ts<lastTs) return; lastTs=p.ts||Date.now(); lastLat=p.lat; lastLng=p.lng; map.panTo([p.lat,p.lng]); updateChip(); } });
  socket.on('status', ({transportId:t, online})=>{ setItemStatus(t, online); });

  setInterval(async()=>{ if(isAll) return; try{ const r=await fetch(`/api/location/${encodeURIComponent(transportParam)}`); if(!r.ok) return; const d=await r.json(); if(d.ts && d.ts<lastTs) return; lastTs=d.ts||Date.now(); lastLat=d.lat; lastLng=d.lng; upsertMarker(transportParam,d.lat,d.lng); setItemTime(transportParam,lastTs); updateChip(); }catch{} }, REFRESH_MS);
})();
