// Test setup file - runs before all tests
import { PrismaClient } from '@prisma/client';

// Mock logger to prevent console spam during tests
jest.mock('../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/adtech_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Global test timeout
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
    // Close any open connections
    await new Promise(resolve => setTimeout(resolve, 500));
});
