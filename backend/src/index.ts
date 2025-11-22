import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeRedis } from './config/redis';
import { logger } from './utils/logger';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { RTBEngine } from './services/adtech/rtb/RTBEngine';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/v1', routes);

// Error handling
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Initialize Redis
    await initializeRedis();
    logger.info('Redis connected successfully');

    // Initialize RTB Engine
    const rtbEngine = RTBEngine.getInstance();
    await rtbEngine.initialize(io);
    logger.info('RTB Engine initialized successfully');

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 AdTech/MarTech Platform running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start the application
initializeServices();

export { app, io };
