/**
 * server.js — Express + Socket.io Entry Point
 * UOM Room Allocation System v3.0
 */

import { createServer } from 'http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

import { errorHandler } from './middleware/errorHandler.js';
import { notFound }      from './middleware/notFound.js';
import logger            from './utils/logger.js';
import { setSocketIO }   from './services/notificationService.js';

import authRoutes         from './routes/auth.js';
import roomRoutes         from './routes/rooms.js';
import queueRoutes        from './routes/queue.js';
import allocationRoutes   from './routes/allocations.js';
import processRoutes      from './routes/process.js';
import semesterRoutes     from './routes/semesters.js';
import adminRoutes        from './routes/admin.js';
import hodRoutes          from './routes/hod.js';
import notificationRoutes from './routes/notifications.js';
import facultyRoutes      from './routes/faculty.js';
import studentRoutes      from './routes/student.js';

dotenv.config();

const app        = express();
const httpServer = createServer(app);
const PORT       = process.env.PORT || 5000;

const corsOptions = {
  origin:         process.env.CLIENT_URL || 'http://localhost:5173',
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX || '200'),
  message:  { success: false, error: 'Too many requests.' },
  standardHeaders: true, legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, error: 'Too many auth attempts.' },
});

app.use('/api/', limiter);
app.use('/api/auth', authLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (m) => logger.http(m.trim()) } }));
}

app.get('/api/health', (_req, res) => res.json({
  success: true, status: 'healthy', version: '3.0.0',
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
}));

app.use('/api/auth',          authRoutes);
app.use('/api/rooms',         roomRoutes);
app.use('/api/queue',         queueRoutes);
app.use('/api/allocations',   allocationRoutes);
app.use('/api/process',       processRoutes);
app.use('/api/semesters',     semesterRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/hod',           hodRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/faculty',       facultyRoutes);
app.use('/api/student',       studentRoutes);

app.use(notFound);
app.use(errorHandler);

// ── Socket.io ─────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

setSocketIO(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  logger.debug(`WS connected: user ${socket.userId}`);
  socket.on('disconnect', () => logger.debug(`WS disconnected: user ${socket.userId}`));
});

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    logger.info(`🏫  UOM Room Allocation System v3.0`);
    logger.info(`✅  HTTP → http://localhost:${PORT}`);
    logger.info(`⚡  WS   → ws://localhost:${PORT}`);
    logger.info(`📦  Env  → ${process.env.NODE_ENV || 'development'}`);
  });
}

export { app, httpServer };
export default app;
