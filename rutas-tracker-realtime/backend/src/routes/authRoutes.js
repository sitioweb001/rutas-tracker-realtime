
import { Router } from 'express';
import { store } from '../services/store.js';
import { signToken } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = store.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = signToken({ id: user.id, role: user.role, transportId: user.transportId });
  res.json({ token, user: { id: user.id, role: user.role, transportId: user.transportId } });
});
