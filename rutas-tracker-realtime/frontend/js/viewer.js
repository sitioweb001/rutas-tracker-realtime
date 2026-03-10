(function () {
  // === Ajustes ===
  const REFRESH_MS = 3000; // 2000 (2s) | 3000 (3s) | 5000 (5s)
  const DEFAULT_CENTER = [13.6929, -89.2182]; // San Salvador

  // === Inyectar CSS de la barra si no existe ===
  function ensureStatusBarStyles() {
    if (document.getElementById('liveStatusStyles')) return;
    const css = `
#liveStatusBar{
  position: fixed;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(27,29,54,.92);
  color: #e5e7eb;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
  z-index: 9999;
  backdrop-filter: blur(4px);
}
#liveStatusDot{
  width: 10px; height: 10px; border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(0,0,0,.25) inset;
}
#liveStatusText{ user-select: none; }
.status-online  #liveStatusDot{ background:#16a34a; } /* verde */
.status-offline #liveStatusDot{ background:#ef4444; } /* rojo  */
`;
    const style = document.createElement('style');
    style.id = 'liveStatusStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // === Crear barra si no existe ===
  function ensureStatusBar() {
    let bar = document.getElementById('liveStatusBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'liveStatusBar';
      bar.className = 'status-offline';
      bar.innerHTML = `
        <div id="liveStatusDot"></div>
        <div id="liveStatusText">🔴 Detenido</div>
      `;
      document.body.appendChild(bar);
    }
    return bar;
  }

  ensureStatusBarStyles();
  const bar = ensureStatusBar();
  const barText = document.getElementById('liveStatusText');

  function setOnlineUI(isOnline) {
    if (!bar || !barText) return;
    if (isOnline) {
      bar.classList.add('status-online');
      bar.classList.remove('status-offline');
      barText.textContent = '🟢 En vivo';
    } else {
      bar.classList.remove('status-online');
      bar.classList.add('status-offline');
      barText.textContent = '🔴 Detenido';
    }
  }

  // === Parámetros ===
  const params = new URLSearchParams(location.search);
  const transportId = params.get('transport') || 't1';
  const titleEl = document.getElementById('title');
  if (titleEl) titleEl.textContent = `Transporte: ${transportId}`;

  // === Socket.IO (cargado desde /socket.io/socket.io.js) ===
  const socket = io();

  // === Mapa ===
  const map = L.map('map').setView(DEFAULT_CENTER, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  const marker = L.marker(DEFAULT_CENTER, { draggable: false }).addTo(map);

  // Control para no aplicar puntos más viejos
  let lastTs = 0;

  // Unirse a la sala
  socket.emit('join', { transportId });

  // 1) Última ubicación al abrir
  fetch(`/api/location/${encodeURIComponent(transportId)}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
        marker.setLatLng([data.lat, data.lng]);
        map.setView([data.lat, data.lng], 16);
        lastTs = data.ts || Date.now();
      }
    })
    .catch(() => {});

  // 2) Estado actual online/offline al abrir
  fetch(`/api/location/status/${encodeURIComponent(transportId)}`)
    .then(r => r.ok ? r.json() : { online: false })
    .then(({ online }) => setOnlineUI(online))
    .catch(() => setOnlineUI(false));

  // 3) Ubicaciones en tiempo real (socket)
  socket.on('location', (payload) => {
    if (!payload || payload.transportId !== transportId) return;
    const { lat, lng, ts } = payload;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    if (ts && ts < lastTs) return;
    lastTs = ts || Date.now();

    marker.setLatLng([lat, lng]);
    map.panTo([lat, lng]);
  });

  // 4) Estado online/offline en tiempo real (socket)
  socket.on('status', ({ transportId: t, online }) => {
    if (t !== transportId) return;
    setOnlineUI(online);
  });

  // 5) Polling de respaldo cada REFRESH_MS
  setInterval(() => {
    fetch(`/api/location/${encodeURIComponent(transportId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const { lat, lng, ts } = data;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        if (ts && ts < lastTs) return;
        lastTs = ts || Date.now();

        marker.setLatLng([lat, lng]);
        // map.panTo([lat, lng]); // Descomenta si quieres que siga en cada poll
      })
      .catch(() => {});
  }, REFRESH_MS);
})();
