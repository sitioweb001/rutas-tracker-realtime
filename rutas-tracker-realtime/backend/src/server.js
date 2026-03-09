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

// CORS (puedes limitar dominios en producción con CORS_ORIGIN="https://tu-dominio.com,https://otro.com")
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : '*';
app.use(cors({ origin: corsOrigins }));

app.use(express.json());

// ---------------- API ----------------
app.use('/api/auth', authRouter);
app.use('/api/transports', transportRouter);
app.use('/api/location', locationRouter);

// --------------- FRONTEND ---------------
// Desde backend/src hay que subir dos niveles para llegar a la carpeta 'frontend'
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
app.use('/frontend', express.static(FRONTEND_DIR));

// Redirige la raíz a la landing del frontend
app.get('/', (_req, res) => {
  res.redirect('/frontend/index.html');
});

// --------------- SOCKET.IO ---------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // en producción limita a tus dominios
});
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

// --------------- START ---------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
