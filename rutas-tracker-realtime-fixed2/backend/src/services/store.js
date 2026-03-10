
export const store = {
  users: [
    { id: 'u1', email: 'admin@demo.com', password: 'admin123', role: 'admin' },
    { id: 'u2', email: 'driver@demo.com', password: 'driver123', role: 'tracker', transportId: 't1' },
  ],
  transports: [
    { id: 't1', name: 'Transporte 1', description: 'Ruta Principal' },
  ],
  lastLocations: new Map(),
};
