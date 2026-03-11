
import { Router } from 'express';
import { store } from '../services/store.js';
import { authRequired } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
export const usersRouter = Router();

// Admin list (optionally role=tracker)
usersRouter.get('/', authRequired, requireRole('admin'), (req,res)=>{
  const role = (req.query.role||'').toString();
  const list = store.users
    .filter(u=>!role || u.role===role)
    .map(u=>({ id:u.id, email:u.email, role:u.role, transportId:u.transportId||null, displayName: u.displayName || null }));
  res.json(list);
});

// NEW: set/update tracker's display name (admin)
usersRouter.post('/:userId/label', authRequired, requireRole('admin'), (req,res)=>{
  const { userId } = req.params;
  const { displayName } = req.body || {};
  const u = store.users.find(x=>x.id===userId && x.role==='tracker');
  if(!u) return res.status(404).json({ error:'Usuario no encontrado' });
  u.displayName = (displayName ?? '').trim();
  res.json({ ok:true, user: { id:u.id, email:u.email, transportId:u.transportId, displayName: u.displayName } });
});

// NEW: public labels for viewer
usersRouter.get('/public/labels', (req,res)=>{
  const transports = store.transports.map(({id,name,label})=>({ id, name, label: label || null }));
  const trackers = store.users
    .filter(u=>u.role==='tracker')
    .map(({ email, transportId, displayName })=>({ email, transportId, displayName: displayName || null }));
  res.json({ transports, trackers });
});
