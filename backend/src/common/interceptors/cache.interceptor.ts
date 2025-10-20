import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../services/redis.service';
import { CACHE_KEY, CacheOptions, CacheKeyGenerator } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheOptions = this.reflector.get<CacheOptions>(CACHE_KEY, context.getHandler());
    
    if (!cacheOptions || !this.redisService.isAvailable()) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user?.userId) {
      this.logger.warn('No user found in request, skipping cache');
      return next.handle();
    }

    // Check if cache should be skipped for this request
    if (cacheOptions.skipCache || request.headers['x-skip-cache'] === 'true') {
      this.logger.debug('Cache skipped for request');
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(cacheOptions, user.userId, request);
    
    if (!cacheKey) {
      return next.handle();
    }

    // Try to get from cache
    try {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return of(cachedData);
      }
    } catch (error) {
      this.logger.error(`Failed to get from cache: ${error.message}`);
    }

    // Cache miss, execute the handler and cache the result
    return next.handle().pipe(
      tap(async (data) => {
        try {
          const ttl = cacheOptions.ttl || 300; // Default 5 minutes
          await this.redisService.set(cacheKey, data, ttl);
          this.logger.debug(`Cached data for key: ${cacheKey} (TTL: ${ttl}s)`);
        } catch (error) {
          this.logger.error(`Failed to cache data: ${error.message}`);
        }
      }),
    );
  }

  private generateCacheKey(options: CacheOptions, userId: string, request: any): string | null {
    // Use custom key if provided
    if (options.key) {
      return options.key;
    }

    // Generate key based on route and parameters
    const method = request.method;
    const url = request.url;
    const query = request.query;
    const params = request.params;

    // Extract route-specific information
    const route = url.split('?')[0]; // Remove query string
    const routeParts = route.split('/').filter(part => part);

    // Handle different routes
    if (route.includes('/policies')) {
      if (params.id) {
        // Single policy: GET /policies/:id
        return CacheKeyGenerator.policy(userId, params.id);
      } else if (query.status) {
        // Policies by status: GET /policies?status=draft
        return CacheKeyGenerator.userPolicies(userId, query.status);
      } else if (route.includes('/lifecycle/')) {
        // Policies by lifecycle: GET /policies/lifecycle/:lifecycle
        const lifecycle = params.lifecycle;
        return CacheKeyGenerator.policiesByLifecycle(userId, lifecycle);
      } else if (route.includes('/stats/lifecycle')) {
        // Lifecycle stats: GET /policies/stats/lifecycle
        return CacheKeyGenerator.lifecycleStats(userId);
      } else {
        // All user policies: GET /policies
        return CacheKeyGenerator.userPolicies(userId);
      }
    } else if (route.includes('/ai')) {
      if (route.includes('/assistant/published-policies')) {
        // Published policies for AI: GET /ai/assistant/published-policies
        return CacheKeyGenerator.publishedPolicies(userId);
      } else if (route.includes('/policy/') && route.includes('/summary')) {
        // AI summary: GET /ai/policy/:policyId/summary or GET /ai/policy/:policyId/summary/:level
        const policyId = params.policyId;
        const level = params.level;
        return CacheKeyGenerator.aiSummary(userId, policyId, level);
      } else if (route.includes('/policies')) {
        // AI user policies: GET /ai/policies
        return CacheKeyGenerator.userPolicies(userId); // Use consistent key pattern
      } else if (route.includes('/image-analysis')) {
        if (route.includes('/history/')) {
          // Image analysis history: GET /ai/image-analysis/history/:userId
          return CacheKeyGenerator.imageAnalysisHistory(userId);
        } else if (route.includes('/patterns/')) {
          // Image analysis patterns: GET /ai/image-analysis/patterns/:userId
          return CacheKeyGenerator.imageAnalysisPatterns(userId);
        }
      }
    }

    // Fallback: generate key from method and URL
    return `cache:${method}:${route}:${userId}:${JSON.stringify({ ...query, ...params })}`;
  }
}
