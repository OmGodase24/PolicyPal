import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './services/redis.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, CacheInvalidationService],
  exports: [RedisService, CacheInvalidationService],
})
export class CacheModule {}

