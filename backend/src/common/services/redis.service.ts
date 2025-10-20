import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const redisUrl = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
      const redisToken = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

      if (!redisUrl || !redisToken) {
        this.logger.warn('Redis credentials not found. Caching will be disabled.');
        return;
      }

      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      // Test connection
      await this.redis.ping();
      this.logger.log('✅ Redis connection established successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Redis:', error.message);
      this.logger.warn('Caching will be disabled. Application will continue without Redis.');
    }
  }

  async onModuleDestroy() {
    // Upstash Redis doesn't require explicit connection closing
    this.logger.log('Redis service destroyed');
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return !!this.redis;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value === null) {
        return null;
      }
      
      // Upstash Redis automatically parses JSON, so we need to handle both cases
      if (typeof value === 'string') {
        return JSON.parse(value) as T;
      } else {
        return value as T; // Already parsed by Upstash
      }
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      this.logger.error(`Failed to delete pattern ${pattern}:`, error.message);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}:`, error.message);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      return await this.redis.incr(key);
    } catch (error) {
      this.logger.error(`Failed to increment key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * Set key with expiration only if it doesn't exist
   */
  async setnx(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.redis.setnx(key, JSON.stringify(value));
      if (result === 1) {
        await this.redis.expire(key, ttlSeconds);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to setnx key ${key}:`, error.message);
      return false;
    }
  }
}
