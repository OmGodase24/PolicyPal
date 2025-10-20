import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheKeyGenerator } from '../decorators/cache.decorator';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Invalidate all cache entries for a specific user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    if (!this.redisService.isAvailable()) {
      return;
    }

    try {
      const patterns = [
        CacheKeyGenerator.userPolicyPattern(userId),
        CacheKeyGenerator.userAiPattern(userId),
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deleted = await this.redisService.delPattern(pattern);
        totalDeleted += deleted;
      }

      this.logger.log(`Invalidated ${totalDeleted} cache entries for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user cache for ${userId}:`, error.message);
    }
  }

  /**
   * Invalidate policy-related cache for a specific user
   */
  async invalidatePolicyCache(userId: string, policyId?: string): Promise<void> {
    if (!this.redisService.isAvailable()) {
      return;
    }

    try {
      const patterns = [
        CacheKeyGenerator.userPolicyPattern(userId),
        CacheKeyGenerator.userAiPattern(userId), // AI summaries are also policy-related
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deleted = await this.redisService.delPattern(pattern);
        totalDeleted += deleted;
      }

      this.logger.log(`Invalidated ${totalDeleted} policy cache entries for user ${userId}${policyId ? ` (policy: ${policyId})` : ''}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate policy cache for user ${userId}:`, error.message);
    }
  }

  /**
   * Invalidate specific policy cache
   */
  async invalidateSpecificPolicy(userId: string, policyId: string): Promise<void> {
    if (!this.redisService.isAvailable()) {
      return;
    }

    try {
      const keys = [
        CacheKeyGenerator.policy(userId, policyId),
        CacheKeyGenerator.aiSummary(userId, policyId),
        CacheKeyGenerator.aiSummary(userId, policyId, 'brief'),
        CacheKeyGenerator.aiSummary(userId, policyId, 'standard'),
        CacheKeyGenerator.aiSummary(userId, policyId, 'detailed'),
      ];

      let deleted = 0;
      for (const key of keys) {
        const result = await this.redisService.del(key);
        if (result) deleted++;
      }

      this.logger.log(`Invalidated ${deleted} specific policy cache entries for user ${userId}, policy ${policyId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate specific policy cache:`, error.message);
    }
  }

  /**
   * Invalidate AI-related cache for a specific user
   */
  async invalidateAiCache(userId: string, policyId?: string): Promise<void> {
    if (!this.redisService.isAvailable()) {
      return;
    }

    try {
      const pattern = CacheKeyGenerator.userAiPattern(userId);
      const deleted = await this.redisService.delPattern(pattern);
      
      this.logger.log(`Invalidated ${deleted} AI cache entries for user ${userId}${policyId ? ` (policy: ${policyId})` : ''}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate AI cache for user ${userId}:`, error.message);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    if (!this.redisService.isAvailable()) {
      return 0;
    }

    try {
      const deleted = await this.redisService.delPattern(pattern);
      this.logger.log(`Invalidated ${deleted} cache entries matching pattern: ${pattern}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to invalidate cache by pattern ${pattern}:`, error.message);
      return 0;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAllCache(): Promise<void> {
    if (!this.redisService.isAvailable()) {
      return;
    }

    try {
      const deleted = await this.redisService.delPattern('*');
      this.logger.warn(`Cleared all cache: ${deleted} entries deleted`);
    } catch (error) {
      this.logger.error('Failed to clear all cache:', error.message);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    isAvailable: boolean;
    totalKeys?: number;
    memoryUsage?: string;
  }> {
    if (!this.redisService.isAvailable()) {
      return { isAvailable: false };
    }

    try {
      // Note: Upstash Redis doesn't support INFO command in the same way
      // This is a simplified version - in production you might want to track stats differently
      return {
        isAvailable: true,
        totalKeys: 0, // Would need to implement key counting differently
        memoryUsage: 'N/A', // Upstash handles memory management
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error.message);
      return { isAvailable: false };
    }
  }
}

