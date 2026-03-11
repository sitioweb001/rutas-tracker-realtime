
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

// set/update tracker's display name (admin)
usersRouter.post('/:userId/label', authRequired, requireRole('admin'), (req,res)=>{
  const { userId } = req.params;
  const { displayName } = req.body || {};
  const u = store.users.find(x=>x.id===userId && x.role==='tracker');
  if(!u) return res.status(404).json({ error:'Usuario no encontrado' });
  u.displayName = (displayName ?? '').trim();
  res.json({ ok:true, user: { id:u.id, email:u.email, transportId:u.transportId, displayName: u.displayName } });
});

// bulk labels for trackers
usersRouter.post('/bulk-labels', authRequired, requireRole('admin'), (req,res)=>{
  const { items } = req.body || {};
  if(!Array.isArray(items)) return res.status(400).json({error:'items requerido'});
  let updated = 0;
  for(const it of items){
    const u = store.users.find(x=> (x.id===it.userId || x.email===it.email) && x.role==='tracker');
    if(u){ u.displayName = (it.displayName ?? '').trim(); updated++; }
  }
  res.json({ ok:true, updated });
});

// reset labels for all trackers
usersRouter.post('/reset-labels/all', authRequired, requireRole('admin'), (req,res)=>{
  let updated=0; store.users.forEach(u=>{ if(u.role==='tracker' && u.displayName){ delete u.displayName; updated++; } });
  res.json({ ok:true, updated });
});

// public labels for viewer
usersRouter.get('/public/labels', (req,res)=>{
  const transports = store.transports.map(({id,name,label})=>({ id, name, label: label || null }));
  const trackers = store.users
    .filter(u=>u.role==='tracker')
    .map(({ email, transportId, displayName })=>({ email, transportId, displayName: displayName || null }));
  res.json({ transports, trackers });
});
