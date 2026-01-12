import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeRedis, getRedisClient } from './config/redis';
import { prisma } from './config/database';
import { logger } from './utils/logger';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import { apiRateLimiter } from './middleware/rateLimiter';
import { RTBEngine } from './services/adtech/rtb/RTBEngine';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for ad serving compatibility
}));

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// Compression for responses
app.use(compression());

// Request ID middleware for distributed tracing
app.use(requestIdMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with request ID
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
});

// Health check endpoint (before rate limiting)
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: { status: 'unknown', latency: 0 },
      redis: { status: 'unknown', latency: 0 },
    },
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.services.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    healthCheck.services.database = {
      status: 'unhealthy',
      latency: Date.now() - startTime,
    };
    healthCheck.status = 'degraded';
    logger.error('Database health check failed', { error });
  }

  try {
    // Check Redis connection
    const redisStart = Date.now();
    const redis = getRedisClient();
    await redis.ping();
    healthCheck.services.redis = {
      status: 'healthy',
      latency: Date.now() - redisStart,
    };
  } catch (error) {
    healthCheck.services.redis = {
      status: 'unhealthy',
      latency: Date.now() - startTime,
    };
    healthCheck.status = 'degraded';
    logger.error('Redis health check failed', { error });
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Readiness probe (for Kubernetes)
app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redis = getRedisClient();
    await redis.ping();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

// Liveness probe (for Kubernetes)
app.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize Turbospike (High-performance NoSQL database)
    await turbospike.connect();
    logger.info('✅ Turbospike connected successfully');

    // Initialize Redis (Caching layer)
    await initializeRedis();
    logger.info('✅ Redis connected successfully');

    // Initialize RTB Engine
    const rtbEngine = RTBEngine.getInstance();
    await rtbEngine.initialize(io);
    logger.info('✅ RTB Engine initialized successfully');

    // API rate limiting (applied to all API routes)
    app.use('/api', apiRateLimiter);

    // API Routes - loaded after Redis initialization
    app.use('/api/v1', routes);

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        status: 'error',
        message: `Route ${req.method} ${req.path} not found`,
        requestId: req.requestId,
      });
    });

    // Error handling
    app.use(errorHandler);

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`AdTech/MarTech Platform running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API: http://localhost:${PORT}/api/v1`);
      logger.info(`Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);

  // Close HTTP server
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connection
      await prisma.$disconnect();
      logger.info('Database connection closed');

      // Close Redis connection
      const redis = getRedisClient();
      await redis.quit();
      logger.info('Redis connection closed');

      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Start the application
initializeServices();

export { app, io };
