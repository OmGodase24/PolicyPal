import { SetMetadata } from '@nestjs/common';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
  key?: string; // Custom cache key (default: auto-generated)
  skipCache?: boolean; // Skip cache for this request
  invalidatePattern?: string; // Pattern to invalidate when this endpoint is called
}

export const CACHE_KEY = 'cache_options';

/**
 * Cache decorator for methods
 * @param options Cache configuration options
 */
export const Cache = (options: CacheOptions = {}) => SetMetadata(CACHE_KEY, options);

/**
 * Cache key generator utility
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for user-specific data
   */
  static userPolicies(userId: string, status?: string): string {
    return status 
      ? `user:${userId}:policies:status:${status}`
      : `user:${userId}:policies:all`;
  }

  /**
   * Generate cache key for single policy
   */
  static policy(userId: string, policyId: string): string {
    return `user:${userId}:policy:${policyId}`;
  }

  /**
   * Generate cache key for AI summary
   */
  static aiSummary(userId: string, policyId: string, level?: string): string {
    return level 
      ? `user:${userId}:ai:summary:${policyId}:${level}`
      : `user:${userId}:ai:summary:${policyId}`;
  }

  /**
   * Generate cache key for policy lifecycle stats
   */
  static lifecycleStats(userId: string): string {
    return `user:${userId}:policies:lifecycle:stats`;
  }

  /**
   * Generate cache key for published policies
   */
  static publishedPolicies(userId: string): string {
    return `user:${userId}:policies:published`;
  }

  /**
   * Generate cache key for policy by lifecycle
   */
  static policiesByLifecycle(userId: string, lifecycle: string): string {
    return `user:${userId}:policies:lifecycle:${lifecycle}`;
  }

  /**
   * Generate pattern for invalidating user's policy cache
   */
  static userPolicyPattern(userId: string): string {
    return `user:${userId}:policies:*`;
  }

  /**
   * Generate pattern for invalidating user's AI cache
   */
  static userAiPattern(userId: string): string {
    return `user:${userId}:ai:*`;
  }

  /**
   * Generate cache key for image analysis history
   */
  static imageAnalysisHistory(userId: string): string {
    return `user:${userId}:image-analysis:history`;
  }

  /**
   * Generate cache key for image analysis patterns
   */
  static imageAnalysisPatterns(userId: string): string {
    return `user:${userId}:image-analysis:patterns`;
  }

  /**
   * Generate pattern for invalidating user's image analysis cache
   */
  static userImageAnalysisPattern(userId: string): string {
    return `user:${userId}:image-analysis:*`;
  }
}

