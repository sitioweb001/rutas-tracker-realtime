
import { Router } from 'express';
import { store } from '../services/store.js';
import { authRequired } from '../middleware/auth.js';

export const locationRouter = Router();

// Última ubicación de un transporte (público)
locationRouter.get('/:transportId', (req, res) => {
  const { transportId } = req.params;
  const last = store.lastLocations.get(transportId);
  if (!last) return res.status(404).json({ error: 'Sin datos' });
  res.json(last);
});

// Tracker envía ubicación (requiere token de tracker)
locationRouter.post('/', authRequired, (req, res) => {
  const user = req.user;
  if (user.role !== 'tracker') return res.status(403).json({ error: 'Solo trackers' });
  const { lat, lng, speed, heading, accuracy } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat/lng inválidos' });
  }
  const transportId = user.transportId;
  const payload = { transportId, lat, lng, speed: speed ?? null, heading: heading ?? null, accuracy: accuracy ?? null, ts: Date.now() };
  store.lastLocations.set(transportId, payload);
  // Notificar por Socket.IO (inyectado via app.get('io'))
  const io = req.app.get('io');
  io.to(`transport:${transportId}`).emit('location', payload);
  res.json({ ok: true });
});
