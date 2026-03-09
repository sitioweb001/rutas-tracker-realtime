
(function(){
  const params = new URLSearchParams(location.search);
  const transportId = params.get('transport') || 't1';
  document.getElementById('title').textContent = `Transporte: ${transportId}`;
  const socket = io();

  const map = L.map('map').setView([13.6929, -89.2182], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const marker = L.marker([13.6929, -89.2182], { draggable: false }).addTo(map);

  // Unirse a la sala de este transporte
  socket.emit('join', { transportId });

  // Cargar última ubicación si existe
  fetch(`/api/location/${encodeURIComponent(transportId)}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.lat && data.lng) {
        marker.setLatLng([data.lat, data.lng]);
        map.setView([data.lat, data.lng], 16);
      }
    }).catch(()=>{});

  // Escuchar actualizaciones
  socket.on('location', (payload) => {
    if (!payload || payload.transportId !== transportId) return;
    marker.setLatLng([payload.lat, payload.lng]);
    map.panTo([payload.lat, payload.lng]);
  });
})();
