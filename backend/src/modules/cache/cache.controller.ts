import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CacheInvalidationService } from '../../common/services/cache-invalidation.service';
import { RedisService } from '../../common/services/redis.service';

@ApiTags('Cache Management')
@Controller('cache')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CacheController {
  constructor(
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly redisService: RedisService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isAvailable: { type: 'boolean' },
        totalKeys: { type: 'number' },
        memoryUsage: { type: 'string' },
      },
    },
  })
  async getCacheStats(): Promise<any> {
    const stats = await this.cacheInvalidationService.getCacheStats();
    return {
      success: true,
      data: stats,
      message: 'Cache statistics retrieved successfully',
    };
  }

  @Post('invalidate/user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate all cache for current user' })
  @ApiResponse({
    status: 200,
    description: 'User cache invalidated successfully',
  })
  async invalidateUserCache(@CurrentUser() user: any): Promise<any> {
    await this.cacheInvalidationService.invalidateUserCache(user.userId);
    return {
      success: true,
      message: 'User cache invalidated successfully',
    };
  }

  @Post('invalidate/policy/:policyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate cache for specific policy' })
  @ApiParam({ name: 'policyId', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Policy cache invalidated successfully',
  })
  async invalidatePolicyCache(
    @Param('policyId') policyId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    await this.cacheInvalidationService.invalidateSpecificPolicy(user.userId, policyId);
    return {
      success: true,
      message: `Cache invalidated for policy ${policyId}`,
    };
  }

  @Post('invalidate/ai')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate AI-related cache for current user' })
  @ApiResponse({
    status: 200,
    description: 'AI cache invalidated successfully',
  })
  async invalidateAiCache(@CurrentUser() user: any): Promise<any> {
    await this.cacheInvalidationService.invalidateAiCache(user.userId);
    return {
      success: true,
      message: 'AI cache invalidated successfully',
    };
  }

  @Post('invalidate/pattern')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate cache by pattern (admin only)' })
  @ApiQuery({ name: 'pattern', description: 'Cache key pattern to invalidate' })
  @ApiResponse({
    status: 200,
    description: 'Cache pattern invalidated successfully',
  })
  async invalidateByPattern(@Query('pattern') pattern: string): Promise<any> {
    const deleted = await this.cacheInvalidationService.invalidateByPattern(pattern);
    return {
      success: true,
      message: `Invalidated ${deleted} cache entries matching pattern: ${pattern}`,
      deletedCount: deleted,
    };
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all cache (admin only - use with caution)' })
  @ApiResponse({
    status: 200,
    description: 'All cache cleared successfully',
  })
  async clearAllCache(): Promise<any> {
    await this.cacheInvalidationService.clearAllCache();
    return {
      success: true,
      message: 'All cache cleared successfully',
    };
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get cache value by key' })
  @ApiParam({ name: 'key', description: 'Cache key' })
  @ApiResponse({
    status: 200,
    description: 'Cache value retrieved successfully',
  })
  async getCacheValue(@Param('key') key: string): Promise<any> {
    const value = await this.redisService.get(key);
    return {
      success: true,
      data: {
        key,
        value,
        exists: value !== null,
      },
      message: 'Cache value retrieved successfully',
    };
  }

  @Delete('key/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete specific cache key' })
  @ApiParam({ name: 'key', description: 'Cache key to delete' })
  @ApiResponse({
    status: 200,
    description: 'Cache key deleted successfully',
  })
  async deleteCacheKey(@Param('key') key: string): Promise<any> {
    const deleted = await this.redisService.del(key);
    return {
      success: true,
      message: `Cache key ${key} ${deleted ? 'deleted' : 'not found'}`,
      deleted,
    };
  }
}

