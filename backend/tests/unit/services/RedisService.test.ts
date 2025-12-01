import { RedisService } from '../../../src/services/caching/RedisService';

// Mock the Redis client
jest.mock('../../../src/config/redis', () => ({
    getRedisClient: jest.fn().mockReturnValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        setex: jest.fn(),
    }),
}));

describe('RedisService', () => {
    let redisService: RedisService;
    let mockRedis: any;

    beforeEach(() => {
        const { getRedisClient } = require('../../../src/config/redis');
        mockRedis = getRedisClient();
        redisService = RedisService.getInstance();
        jest.clearAllMocks();
    });

    describe('get', () => {
        it('should retrieve and parse JSON value from Redis', async () => {
            const testData = { id: 1, name: 'test' };
            mockRedis.get.mockResolvedValue(JSON.stringify(testData));

            const result = await redisService.get('test-key');

            expect(mockRedis.get).toHaveBeenCalledWith('test-key');
            expect(result).toEqual(testData);
        });

        it('should return null if key does not exist', async () => {
            mockRedis.get.mockResolvedValue(null);

            const result = await redisService.get('nonexistent-key');

            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('should stringify and store value in Redis', async () => {
            const testData = { id: 1, name: 'test' };
            mockRedis.set.mockResolvedValue('OK');

            await redisService.set('test-key', testData);

            expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
        });

        it('should set expiration if ttl is provided', async () => {
            const testData = { id: 1, name: 'test' };
            mockRedis.setex.mockResolvedValue('OK');

            await redisService.set('test-key', testData, 60);

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'test-key',
                60,
                JSON.stringify(testData)
            );
        });
    });

    describe('getOrSet', () => {
        it('should return cached value if it exists', async () => {
            const cachedData = { id: 1, name: 'cached' };
            mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

            const fetcher = jest.fn();
            const result = await redisService.getOrSet('test-key', 60, fetcher);

            expect(result).toEqual(cachedData);
            expect(fetcher).not.toHaveBeenCalled();
        });

        it('should fetch and cache value if not in cache', async () => {
            const freshData = { id: 1, name: 'fresh' };
            mockRedis.get.mockResolvedValue(null);
            mockRedis.setex.mockResolvedValue('OK');

            const fetcher = jest.fn().mockResolvedValue(freshData);
            const result = await redisService.getOrSet('test-key', 60, fetcher);

            expect(result).toEqual(freshData);
            expect(fetcher).toHaveBeenCalled();
            expect(mockRedis.setex).toHaveBeenCalledWith(
                'test-key',
                60,
                JSON.stringify(freshData)
            );
        });
    });

    describe('increment', () => {
        it('should increment a counter in Redis', async () => {
            mockRedis.incr.mockResolvedValue(5);

            const result = await redisService.increment('counter-key');

            expect(mockRedis.incr).toHaveBeenCalledWith('counter-key');
            expect(result).toBe(5);
        });
    });

    describe('delete', () => {
        it('should delete a key from Redis', async () => {
            mockRedis.del.mockResolvedValue(1);

            await redisService.delete('test-key');

            expect(mockRedis.del).toHaveBeenCalledWith('test-key');
        });
    });
});
