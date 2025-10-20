import { Module } from '@nestjs/common';
import { CacheController } from './cache.controller';
import { CacheModule as CommonCacheModule } from '../../common/cache.module';

@Module({
  imports: [CommonCacheModule],
  controllers: [CacheController],
})
export class CacheModule {}

