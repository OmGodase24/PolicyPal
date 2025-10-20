import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { AIModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CacheModule } from './common/cache.module';
import { CacheModule as CacheManagementModule } from './modules/cache/cache.module';
import * as path from 'path';

// Manual dotenv loading as fallback
import * as dotenv from 'dotenv';
const envPath = path.join(process.cwd(), '.env');
console.log('🔧 Manual dotenv loading from:', envPath);
const result = dotenv.config({ path: envPath });
console.log('🔧 Dotenv result:', result);

@Module({
  imports: [
    // Configuration module - Simplified configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development'],
      cache: false,
    }),
    
    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGODB_URI');
        console.log('🔍 Attempting to connect to MongoDB...');
        console.log('📁 Current working directory:', process.cwd());
        console.log('📄 .env file path:', path.join(process.cwd(), '.env'));
        console.log('🔗 URI:', mongoUri ? mongoUri.substring(0, 50) + '...' : 'NOT FOUND');
        
        // Debug: Check all environment variables
        console.log('🔍 All environment variables from ConfigService:');
        console.log('MONGODB_URI:', configService.get('MONGODB_URI'));
        console.log('JWT_SECRET:', configService.get('JWT_SECRET'));
        console.log('PORT:', configService.get('PORT'));
        console.log('NODE_ENV:', configService.get('NODE_ENV'));
        
        // Debug: Check process.env directly
        console.log('🔍 Direct process.env values:');
        console.log('process.env.MONGODB_URI:', process.env.MONGODB_URI);
        console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);
        console.log('process.env.PORT:', process.env.PORT);
        
        return {
          uri: mongoUri,
          useNewUrlParser: true,
          useUnifiedTopology: true,
          // Remove explicit TLS settings - let MongoDB driver handle it
          retryWrites: true,
          w: 'majority',
          serverSelectionTimeoutMS: 10000, // Reduce timeout
          connectTimeoutMS: 10000, // Add connection timeout
          socketTimeoutMS: 45000, // Add socket timeout
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('✅ MongoDB Atlas connected successfully!');
              console.log('🌐 Database:', mongoUri?.split('/').pop()?.split('?')[0]);
            });
            connection.on('error', (error) => {
              console.error('❌ MongoDB connection error:', error);
            });
            connection.on('disconnected', () => {
              console.log('⚠️  MongoDB disconnected');
            });
            connection.on('connecting', () => {
              console.log('🔄 Connecting to MongoDB...');
            });
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),

    // Cache module (global)
    CacheModule,

    // Feature modules
    AuthModule,
    UsersModule,
    PoliciesModule,
    AIModule, // AI-powered policy Q&A
    NotificationsModule, // Live notifications with email
    AnalyticsModule, // Data visualization and analytics
    CacheManagementModule, // Cache management endpoints
  ],
})
export class AppModule {}