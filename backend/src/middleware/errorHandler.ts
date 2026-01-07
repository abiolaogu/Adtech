import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error codes for API responses
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get request ID for tracking
  const requestId = req.requestId || 'unknown';

  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;
  let code: string | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
    code = err.code;
  }

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = ErrorCodes.AUTHENTICATION_ERROR;
    isOperational = true;
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = ErrorCodes.AUTHENTICATION_ERROR;
    isOperational = true;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      message = 'A record with this value already exists';
      code = ErrorCodes.VALIDATION_ERROR;
      isOperational = true;
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
      code = ErrorCodes.NOT_FOUND;
      isOperational = true;
    }
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    isOperational = true;
  }

  // Log error
  const logData = {
    requestId,
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    code,
    isOperational,
  };

  if (statusCode >= 500) {
    logger.error('Server error:', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client error:', logData);
  }

  // Send response
  const errorResponse: {
    status: string;
    message: string;
    requestId: string;
    code?: string;
    stack?: string;
  } = {
    status: 'error',
    message: isOperational ? message : 'Something went wrong',
    requestId,
  };

  if (code) {
    errorResponse.code = code;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.requestId || 'unknown',
    code: ErrorCodes.NOT_FOUND,
  });
}
