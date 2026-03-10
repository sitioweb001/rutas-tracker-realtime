
import { Router } from 'express';
import { store } from '../services/store.js';
import { authRequired } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
export const transportRouter = Router();

transportRouter.get('/public', (req,res)=>{ res.json(store.transports); });
transportRouter.get('/', authRequired, (req,res)=>{ res.json(store.transports); });
transportRouter.post('/:transportId/assign/:userId', authRequired, requireRole('admin'), (req,res)=>{
  const { transportId, userId } = req.params;
  const user = store.users.find(u=>u.id===userId);
  const t = store.transports.find(t=>t.id===transportId);
  if(!user || !t) return res.status(404).json({error:'No encontrado'});
  user.transportId = transportId;
  res.json({ ok:true, user: { id:user.id, email:user.email, role:user.role, transportId:user.transportId } });
});
