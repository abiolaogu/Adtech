import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticate,
  optionalAuth,
  authorize,
  AuthenticatedRequest,
  getJWTSecretForSigning,
} from '../../../src/middleware/auth';
import { AppError } from '../../../src/middleware/errorHandler';

// Mock environment
const originalEnv = process.env;

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('authenticate', () => {
    it('should call next with error if no authorization header', () => {
      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('No authorization header provided');
      expect(error.statusCode).toBe(401);
    });

    it('should call next with error if authorization format is invalid', () => {
      mockRequest.headers = { authorization: 'InvalidFormat token123' };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Invalid authorization format. Use: Bearer <token>');
    });

    it('should call next with error if token is empty', () => {
      mockRequest.headers = { authorization: 'Bearer ' };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should call next with error if token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token.here' };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should attach user to request and call next if token is valid', () => {
      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' as const };
      const secret = getJWTSecretForSigning();
      const token = jwt.sign(payload, secret);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toEqual(expect.objectContaining(payload));
    });

    it('should handle expired tokens', () => {
      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' as const };
      const secret = getJWTSecretForSigning();
      const token = jwt.sign(payload, secret, { expiresIn: '-1s' }); // Already expired
      mockRequest.headers = { authorization: `Bearer ${token}` };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Token has expired');
    });
  });

  describe('optionalAuth', () => {
    it('should call next without error if no authorization header', () => {
      optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should call next without error if invalid token (but not attach user)', () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token.here' };

      optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should attach user if token is valid', () => {
      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' as const };
      const secret = getJWTSecretForSigning();
      const token = jwt.sign(payload, secret);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toEqual(expect.objectContaining(payload));
    });
  });

  describe('authorize', () => {
    it('should call next with error if user is not authenticated', () => {
      const middleware = authorize('ADMIN');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Authentication required');
    });

    it('should call next with error if user role is not allowed', () => {
      mockRequest.user = { userId: 'user-123', email: 'test@example.com', role: 'USER' };
      const middleware = authorize('ADMIN');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
    });

    it('should call next without error if user role is allowed', () => {
      mockRequest.user = { userId: 'user-123', email: 'test@example.com', role: 'ADMIN' };
      const middleware = authorize('ADMIN', 'USER');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should work with multiple allowed roles', () => {
      mockRequest.user = { userId: 'user-123', email: 'test@example.com', role: 'PUBLISHER' };
      const middleware = authorize('ADMIN', 'PUBLISHER');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });
});
