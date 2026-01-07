import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Request ID middleware for distributed tracing
 * Adds a unique request ID to each request for tracking across services
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Attach to request object
  req.requestId = requestId;

  // Add to response headers for client-side debugging
  res.setHeader('X-Request-Id', requestId);

  next();
}

/**
 * Get request ID from request object
 * Helper function for use in services
 */
export function getRequestId(req: Request): string {
  return req.requestId || 'unknown';
}
