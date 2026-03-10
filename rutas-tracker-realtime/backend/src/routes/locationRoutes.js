
import { Router } from 'express';
import { store } from '../services/store.js';
import { authRequired } from '../middleware/auth.js';

export const locationRouter = Router();

const onlineTimers = new Map();
const ONLINE_TTL_MS = 60_000;

function emitStatus(app, transportId, online){
  const io = app.get('io');
  io.to(`transport:${transportId}`).emit('status', { transportId, online, ts: Date.now() });
}
function markOnline(app, transportId){
  if(!onlineTimers.has(transportId)) emitStatus(app, transportId, true);
  else clearTimeout(onlineTimers.get(transportId));
  const to = setTimeout(()=>{ onlineTimers.delete(transportId); emitStatus(app, transportId, false); }, ONLINE_TTL_MS);
  onlineTimers.set(transportId, to);
}

locationRouter.get('/:transportId', (req,res)=>{
  const { transportId } = req.params;
  const last = store.lastLocations.get(transportId);
  if(!last) return res.status(404).json({error:'Sin datos'});
  res.json(last);
});

locationRouter.get('/status/:transportId', (req,res)=>{
  const { transportId } = req.params;
  const online = onlineTimers.has(transportId);
  res.json({ transportId, online, ts: Date.now() });
});

locationRouter.post('/', authRequired, (req,res)=>{
  const user = req.user;
  if(user.role!=='tracker') return res.status(403).json({error:'Solo trackers'});
  const { lat, lng, speed, heading, accuracy } = req.body || {};
  if(typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({error:'lat/lng inválidos'});
  const transportId = user.transportId;
  const payload = { transportId, lat, lng, speed: speed??null, heading: heading??null, accuracy: accuracy??null, ts: Date.now() };
  store.lastLocations.set(transportId, payload);
  const io = req.app.get('io');
  io.to(`transport:${transportId}`).emit('location', payload);
  markOnline(req.app, transportId);
  res.json({ok:true});
});
