(function() {
  const params = new URLSearchParams(location.search);
  const transportId = params.get('transport') || 't1';
  const titleEl = document.getElementById('title');
  if (titleEl) titleEl.textContent = `Transporte: ${transportId}`;

  // Conexión con Socket.IO (servido por tu backend)
  const socket = io();

  // Mapa inicial (centra en San Salvador por defecto)
  const map = L.map('map').setView([13.6929, -89.2182], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const marker = L.marker([13.6929, -89.2182], { draggable: false }).addTo(map);

  // ------- Banner visual (online/offline/primer fix) -------
  function showBanner(msg, type = 'ok') {
    let el = document.getElementById('banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'banner';
      el.style.position = 'fixed';
      el.style.top = '16px';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.padding = '10px 16px';
      el.style.borderRadius = '10px';
      el.style.zIndex = '9999';
      el.style.fontWeight = '600';
      el.style.boxShadow = '0 10px 30px rgba(0,0,0,.25)';
      el.style.maxWidth = '90vw';
      el.style.textAlign = 'center';
      document.body.appendChild(el);
    }
    el.style.background = type === 'ok' ? '#16a34a' : '#ef4444';
    el.style.color = '#fff';
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  // Únete a la sala del transporte
  socket.emit('join', { transportId });
  console.log('[viewer] joined room for', transportId);

  // 1) Cargar última ubicación (para centrar)
  fetch(`/api/location/${encodeURIComponent(transportId)}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
        marker.setLatLng([data.lat, data.lng]);
        map.setView([data.lat, data.lng], 16);
      }
    })
    .catch(err => console.warn('[viewer] last location fetch error', err));

  // 2) Consultar estado actual (online/offline) al abrir
  fetch(`/api/location/status/${encodeURIComponent(transportId)}`)
    .then(r => r.ok ? r.json() : { online: false })
    .then(({ online }) => {
      console.log('[viewer] initial status online=', online);
      if (online) {
        showBanner('✅ El admin ya nos está compartiendo ubicación', 'ok');
      }
    })
    .catch(err => console.warn('[viewer] status fetch error', err));

  // 3) Ubicaciones en tiempo real
  socket.on('location', (payload) => {
    if (!payload || payload.transportId !== transportId) return;
    const { lat, lng } = payload;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    marker.setLatLng([lat, lng]);
    map.panTo([lat, lng]);
  });

  // 4) Estado ONLINE/OFFLINE en tiempo real
  socket.on('status', ({ transportId: t, online }) => {
    if (t !== transportId) return;
    console.log('[viewer] live status:', online);
    if (online) {
      showBanner('✅ El admin ya nos está compartiendo ubicación', 'ok');
    } else {
      showBanner('⚠️ El rastreo se detuvo', 'error');
    }
  });
})();
