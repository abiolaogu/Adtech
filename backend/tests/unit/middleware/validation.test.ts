import { Request, Response, NextFunction } from 'express';
import {
  validate,
  registerSchema,
  loginSchema,
  createCampaignSchema,
  reserveSlotSchema,
  identifyCustomerSchema,
} from '../../../src/middleware/validation';
import { AppError } from '../../../src/middleware/errorHandler';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('validate function', () => {
    it('should call next without error for valid body', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      const middleware = validate(registerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with AppError for invalid body', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'short',
        name: 'T', // Too short
      };

      const middleware = validate(registerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('Validation error');
    });

    it('should transform validated body into request', async () => {
      mockRequest.body = {
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123',
        name: 'Test User',
      };

      const middleware = validate(registerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      // Body should be the parsed/validated version
      expect(mockRequest.body.email).toBe('TEST@EXAMPLE.COM');
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'SecurePass123',
        name: 'John Doe',
        organizationName: 'Acme Corp',
      };

      const middleware = validate(registerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should reject invalid email format', async () => {
      mockRequest.body = {
        email: 'not-an-email',
        password: 'SecurePass123',
        name: 'John Doe',
      };

      const middleware = validate(registerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toContain('email');
    });

    it('should reject weak passwords', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'weak', // Too short, no uppercase, no number
        name: 'John Doe',
      };

      const middleware = validate(registerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject password without uppercase', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'password123', // No uppercase
        name: 'John Doe',
      };

      const middleware = validate(registerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should accept organizationName as optional', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'SecurePass123',
        name: 'John Doe',
        // No organizationName
      };

      const middleware = validate(registerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'anypassword',
      };

      const middleware = validate(loginSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should reject missing email', async () => {
      mockRequest.body = {
        password: 'anypassword',
      };

      const middleware = validate(loginSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject missing password', async () => {
      mockRequest.body = {
        email: 'user@example.com',
      };

      const middleware = validate(loginSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('createCampaignSchema', () => {
    const validCampaign = {
      name: 'Test Campaign',
      advertiserId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'DISPLAY',
      objective: 'AWARENESS',
      budget: 1000,
      bidStrategy: 'CPM',
      startDate: new Date().toISOString(),
    };

    it('should validate correct campaign data', async () => {
      mockRequest.body = validCampaign;

      const middleware = validate(createCampaignSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should reject invalid campaign type', async () => {
      mockRequest.body = {
        ...validCampaign,
        type: 'INVALID_TYPE',
      };

      const middleware = validate(createCampaignSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject negative budget', async () => {
      mockRequest.body = {
        ...validCampaign,
        budget: -100,
      };

      const middleware = validate(createCampaignSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject invalid UUID for advertiserId', async () => {
      mockRequest.body = {
        ...validCampaign,
        advertiserId: 'not-a-uuid',
      };

      const middleware = validate(createCampaignSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('reserveSlotSchema', () => {
    it('should validate correct reservation data', async () => {
      mockRequest.body = {
        slotId: '550e8400-e29b-41d4-a716-446655440000',
        campaignId: '550e8400-e29b-41d4-a716-446655440001',
        price: 10.5,
      };

      const middleware = validate(reserveSlotSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should reject zero price', async () => {
      mockRequest.body = {
        slotId: '550e8400-e29b-41d4-a716-446655440000',
        campaignId: '550e8400-e29b-41d4-a716-446655440001',
        price: 0,
      };

      const middleware = validate(reserveSlotSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('identifyCustomerSchema', () => {
    it('should validate customer with email', async () => {
      mockRequest.body = {
        email: 'customer@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(identifyCustomerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should validate customer with phone', async () => {
      mockRequest.body = {
        phone: '+1234567890',
      };

      const middleware = validate(identifyCustomerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should validate customer with externalId', async () => {
      mockRequest.body = {
        externalId: 'ext-123',
      };

      const middleware = validate(identifyCustomerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should reject customer with no identifier', async () => {
      mockRequest.body = {
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(identifyCustomerSchema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});
