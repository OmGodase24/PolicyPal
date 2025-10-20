import { IsOptional, IsBoolean, IsString, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../schemas/notification.schema';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['immediate', 'daily', 'weekly', 'never'])
  emailFrequency?: 'immediate' | 'daily' | 'weekly' | 'never';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emailTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  typePreferences?: Record<string, {
    email: boolean;
    inApp: boolean;
    push: boolean;
  }>;
}
