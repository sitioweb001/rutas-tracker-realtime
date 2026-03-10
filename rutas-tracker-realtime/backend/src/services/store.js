
export const store = {
  users: [
    { id: 'u1', email: 'admin@demo.com', password: 'admin123', role: 'admin' },
    { id: 'u2', email: 'driver1@demo.com', password: 'driver123', role: 'tracker', transportId: 't1' },
    { id: 'u3', email: 'driver2@demo.com', password: 'driver123', role: 'tracker', transportId: 't2' },
  ],
  transports: [
    { id: 't1', name: 'Transporte 1', description: 'Ruta Principal' },
    { id: 't2', name: 'Transporte 2', description: 'Ruta Secundaria' },
    { id: 't3', name: 'Transporte 3', description: 'Ruta Extra' },
  ],
  lastLocations: new Map(),
};
