
// Almacenamiento en memoria para demo. Cambiar por DB en producción.
export const store = {
  users: [
    { id: 'u1', email: 'admin@demo.com', password: 'admin123', role: 'admin' },
    { id: 'u2', email: 'driver@demo.com', password: 'driver123', role: 'tracker', transportId: 't1' },
  ],
  transports: [
    { id: 't1', name: 'Transporte 1', description: 'Ruta Principal' },
    { id: 't2', name: 'Transporte 2', description: 'Ruta Secundaria' },
  ],
  lastLocations: new Map(), // key: transportId -> {lat,lng,ts,...}
};
