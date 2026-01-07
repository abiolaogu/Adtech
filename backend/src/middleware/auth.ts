import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'PUBLISHER' | 'ADVERTISER';
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Get JWT secret with validation
 * Throws error if not configured in production
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret === 'your-secret-key' || secret === 'dev-secret-key-change-in-prod') {
    if (process.env.NODE_ENV === 'production') {
      logger.error('JWT_SECRET is not properly configured in production!');
      throw new AppError('Server configuration error', 500);
    }
    logger.warn('Using insecure JWT secret - only acceptable in development');
    return 'dev-only-insecure-secret-do-not-use-in-prod';
  }

  return secret;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('No authorization header provided', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('Invalid authorization format. Use: Bearer <token>', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const secret = getJWTSecret();
    const decoded = jwt.verify(token, secret) as JWTPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token has expired', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    const secret = getJWTSecret();
    const decoded = jwt.verify(token, secret) as JWTPayload;
    req.user = decoded;
  } catch (error) {
    // Token is invalid, but that's okay for optional auth
    logger.debug('Optional auth token invalid', { error });
  }

  next();
}

/**
 * Role-based authorization middleware
 * Must be used after authenticate middleware
 */
export function authorize(...allowedRoles: JWTPayload['role'][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
}

/**
 * Helper to get JWT secret for token generation
 */
export function getJWTSecretForSigning(): string {
  return getJWTSecret();
}

/**
 * Get JWT expiration time from environment or default
 */
export function getJWTExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '7d';
}
