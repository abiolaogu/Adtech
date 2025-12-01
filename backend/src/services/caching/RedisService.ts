import { getRedisClient } from '../../config/redis';
import { logger } from '../../utils/logger';

export class RedisService {
  private static instance: RedisService;
  private redis = getRedisClient();

  private constructor() {}

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Get value from cache or fetch from source
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const value = await fetchFn();
      if (value) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      }
      return value;
    } catch (error) {
      logger.error(`Redis getOrSet error for key ${key}:`, error);
      return fetchFn(); // Fallback to source
    }
  }

  /**
   * Increment a counter atomically
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    return this.redis.incrby(key, amount);
  }

  /**
   * Increment a hash field atomically (e.g. for campaign spend)
   */
  async incrementHash(key: string, field: string, amount: number): Promise<number> {
    return this.redis.hincrby(key, field, amount);
  }

  /**
   * Acquire a lock
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, 'locked', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Release a lock
   */
  async releaseLock(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
