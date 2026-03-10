(function () {
  // Cambia aquí la frecuencia de refresco por polling: 2000 (2s) / 3000 (3s) / 5000 (5s)
  const REFRESH_MS = 2000;

  const params = new URLSearchParams(location.search);
  const transportId = params.get('transport') || 't1';

  const titleEl = document.getElementById('title');
  if (titleEl) titleEl.textContent = `Transporte: ${transportId}`;

  // Elementos de la barra fija
  const bar = document.getElementById('liveStatusBar');
  const barText = document.getElementById('liveStatusText');

  // Funciones para setear estado visual
  function setOnlineUI(isOnline){
    if(!bar || !barText) return;
    if(isOnline){
      bar.classList.add('status-online');
      bar.classList.remove('status-offline');
      barText.textContent = '🟢 En vivo';
    }else{
      bar.classList.remove('status-online');
      bar.classList.add('status-offline');
      barText.textContent = '🔴 Detenido';
    }
  }

  // Conexión con Socket.IO (misma URL del backend)
  const socket = io();

  // Mapa inicial (centra en San Salvador por defecto)
  const map = L.map('map').setView([13.6929, -89.2182], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const marker = L.marker([13.6929, -89.2182], { draggable: false }).addTo(map);

  // Para evitar “retrocesos” por polling y socket a la vez
  let lastTs = 0;

  // Únete a la sala del transporte
  socket.emit('join', { transportId });

  // 1) Centrar con la última ubicación al cargar (si existe)
  fetch(`/api/location/${encodeURIComponent(transportId)}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
        marker.setLatLng([data.lat, data.lng]);
        map.setView([data.lat, data.lng], 16);
        lastTs = data.ts || Date.now();
      }
    })
    .catch(()=>{});

  // 2) Consultar estado actual (online/offline) al abrir
  fetch(`/api/location/status/${encodeURIComponent(transportId)}`)
    .then(r => r.ok ? r.json() : { online: false })
    .then(({ online }) => setOnlineUI(online))
    .catch(() => setOnlineUI(false));

  // 3) Ubicaciones en tiempo real por socket
  socket.on('location', (payload) => {
    if (!payload || payload.transportId !== transportId) return;
    const { lat, lng, ts } = payload;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    // Aplica solo si es más reciente
    if (ts && ts < lastTs) return;
    lastTs = ts || Date.now();

    marker.setLatLng([lat, lng]);
    map.panTo([lat, lng]);
  });

  // 4) Estado ONLINE/OFFLINE en tiempo real por socket
  socket.on('status', ({ transportId: t, online }) => {
    if (t !== transportId) return;
    setOnlineUI(online);
  });

  // 5) Polling cada REFRESH_MS como respaldo/“keep fresh”
  setInterval(() => {
    fetch(`/api/location/${encodeURIComponent(transportId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const { lat, lng, ts } = data;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        // Solo si es más reciente que lo último aplicado
        if (ts && ts < lastTs) return;
        lastTs = ts || Date.now();

        marker.setLatLng([lat, lng]);
        // Si quieres que el mapa siga agresivamente en cada poll:
        // map.panTo([lat, lng]);
      })
      .catch(()=>{ /* no-op */ });
  }, REFRESH_MS);

})();
