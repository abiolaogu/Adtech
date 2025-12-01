import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: Redis;
let redisPubClient: Redis;
let redisSubClient: Redis;

export async function initializeRedis(): Promise<void> {
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };

  redisClient = new Redis(redisConfig);
  redisPubClient = new Redis(redisConfig);
  redisSubClient = new Redis(redisConfig);

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis Client Connected');
  });

  await redisClient.ping();
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

export function getRedisPubClient(): Redis {
  if (!redisPubClient) {
    throw new Error('Redis pub client not initialized');
  }
  return redisPubClient;
}

export function getRedisSubClient(): Redis {
  if (!redisSubClient) {
    throw new Error('Redis sub client not initialized');
  }
  return redisSubClient;
}
