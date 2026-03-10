
import { Router } from 'express';
import { store } from '../services/store.js';
import { authRequired } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
export const usersRouter = Router();

// List users (admin only). Optional filter by role
usersRouter.get('/', authRequired, requireRole('admin'), (req,res)=>{
  const role = (req.query.role||'').toString();
  const list = store.users
    .filter(u=>!role || u.role===role)
    .map(u=>({ id:u.id, email:u.email, role:u.role, transportId:u.transportId||null }));
  res.json(list);
});
