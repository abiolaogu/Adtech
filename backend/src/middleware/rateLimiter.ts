import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Rate limit configuration for different endpoint types
 */

// Strict rate limiting for authentication endpoints (login, register)
// Prevents brute force attacks
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP address as the key
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      status: 'error',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: '15 minutes',
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
});

// Standard rate limiting for API endpoints
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    status: 'error',
    message: 'Too many requests. Please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // For authenticated requests, use user ID if available
    const authHeader = req.headers.authorization;
    if (authHeader) {
      // Use auth header as part of the key to allow higher limits per user
      return `${req.ip}-auth`;
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'test';
  },
});

// Strict rate limiting for ad serving (higher volume expected)
export const adServingRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute (high volume expected)
  message: {
    status: 'error',
    message: 'Rate limit exceeded for ad serving.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'test';
  },
});

// Very strict rate limiting for data export (GDPR)
export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 exports per hour
  message: {
    status: 'error',
    message: 'Export rate limit exceeded. Please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Export rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      status: 'error',
      message: 'Export rate limit exceeded. Please try again later.',
      retryAfter: '1 hour',
    });
  },
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'test';
  },
});

// Strict rate limiting for resource deletion
export const deleteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 deletions per 15 minutes
  message: {
    status: 'error',
    message: 'Delete operation rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'test';
  },
});
