# Redis Caching Implementation Guide

## Overview

This guide explains the Redis caching implementation in the PolicyPal backend application. The caching system uses Upstash Redis to improve performance for read-heavy endpoints.

## Architecture

### Components

1. **RedisService** - Core Redis operations service
2. **CacheInterceptor** - NestJS interceptor for automatic caching
3. **CacheInvalidationService** - Service for cache invalidation
4. **Cache Decorator** - Decorator for marking cacheable endpoints
5. **Cache Management Controller** - Admin endpoints for cache management

### Cached Endpoints

#### Policies Module
- `GET /api/policies` - Get user policies (5 min TTL)
- `GET /api/policies/my-policies` - Get user policies (5 min TTL)
- `GET /api/policies/lifecycle/:lifecycle` - Get policies by lifecycle (5 min TTL)
- `GET /api/policies/stats/lifecycle` - Get lifecycle statistics (5 min TTL)
- `GET /api/policies/:id` - Get single policy (5 min TTL)

#### AI Module
- `GET /api/ai/assistant/published-policies` - Get published policies for AI (5 min TTL)
- `GET /api/ai/assistant/policy/:policyId/summary` - Get AI summary (10 min TTL)
- `GET /api/ai/policies` - Get user AI policies (5 min TTL)
- `GET /api/ai/policy/:policyId/summary/:level` - Get AI summary by level (10 min TTL)
- `GET /api/ai/policy/:policyId/summary-info` - Get summary info (5 min TTL)

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Redis Configuration (Upstash)
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

### Upstash Redis Setup

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the REST URL and REST Token
4. Add them to your `.env` file

## Usage

### Automatic Caching

Endpoints are automatically cached when decorated with `@Cache()`:

```typescript
@Get()
@UseInterceptors(CacheInterceptor)
@Cache({ ttl: 300 }) // Cache for 5 minutes
async findAll(@CurrentUser() user: any): Promise<PolicyResponseDto[]> {
  return this.policiesService.findByUserId(user.userId);
}
```

### Cache Invalidation

Cache is automatically invalidated when data changes:

```typescript
// In service method
await this.cacheInvalidationService.invalidatePolicyCache(userId, policyId);
```

### Manual Cache Management

Use the cache management endpoints:

```bash
# Get cache statistics
GET /api/cache/stats

# Invalidate user cache
POST /api/cache/invalidate/user

# Invalidate specific policy cache
POST /api/cache/invalidate/policy/:policyId

# Invalidate AI cache
POST /api/cache/invalidate/ai

# Clear all cache (admin only)
DELETE /api/cache/clear
```

## Cache Keys

Cache keys follow a consistent pattern:

- User policies: `user:{userId}:policies:all`
- Policies by status: `user:{userId}:policies:status:{status}`
- Single policy: `user:{userId}:policy:{policyId}`
- AI summary: `user:{userId}:ai:summary:{policyId}:{level}`
- Lifecycle stats: `user:{userId}:policies:lifecycle:stats`

## Performance Benefits

### Before Caching
- Every request hits MongoDB
- Database load increases with user count
- Slower response times for repeated requests

### After Caching
- Repeated requests served from Redis
- Reduced MongoDB load
- Faster response times (typically 10-50ms vs 100-500ms)
- Better scalability

## Monitoring

### Cache Hit Rate
Monitor cache effectiveness through logs:
```
Cache hit for key: user:123:policies:all
Cached data for key: user:123:policy:456 (TTL: 300s)
```

### Cache Statistics
Use the `/api/cache/stats` endpoint to monitor:
- Cache availability
- Memory usage
- Key count

## Troubleshooting

### Cache Not Working
1. Check Redis connection in logs
2. Verify environment variables
3. Check if endpoint has `@Cache()` decorator
4. Ensure `CacheInterceptor` is applied

### Cache Not Invalidating
1. Check if service method calls `cacheInvalidationService`
2. Verify cache key patterns
3. Check Redis connection

### Performance Issues
1. Monitor cache hit rate
2. Adjust TTL values based on data change frequency
3. Consider cache warming strategies

## Best Practices

### TTL Selection
- **Policies**: 5 minutes (data changes moderately)
- **AI Summaries**: 10 minutes (expensive to generate)
- **Statistics**: 5 minutes (calculated from policies)

### Cache Invalidation
- Always invalidate after data modifications
- Use specific patterns for targeted invalidation
- Consider batch invalidation for bulk operations

### Error Handling
- Cache failures should not break the application
- Log cache errors for monitoring
- Gracefully fallback to database queries

## Security Considerations

- Cache keys include user IDs for data isolation
- Admin cache operations require authentication
- Sensitive data is not cached (passwords, tokens)
- Cache TTL prevents stale data exposure

## Future Enhancements

1. **Cache Warming**: Pre-populate cache for active users
2. **Distributed Caching**: Multi-instance cache synchronization
3. **Cache Analytics**: Detailed performance metrics
4. **Smart Invalidation**: Event-driven cache updates
5. **Cache Compression**: Reduce memory usage for large objects

