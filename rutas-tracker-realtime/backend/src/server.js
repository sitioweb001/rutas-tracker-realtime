
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { authRouter } from './routes/authRoutes.js';
import { transportRouter } from './routes/transportRoutes.js';
import { locationRouter } from './routes/locationRoutes.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*'}));
app.use(express.json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/transports', transportRouter);
app.use('/api/location', locationRouter);

// Frontend estático
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));
app.get('/', (req, res) => {
  res.redirect('/frontend/index.html');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join', ({ transportId }) => {
    if (!transportId) return;
    socket.join(`transport:${transportId}`);
    socket.emit('joined', { room: `transport:${transportId}` });
  });
  socket.on('leave', ({ transportId }) => {
    if (!transportId) return;
    socket.leave(`transport:${transportId}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));
