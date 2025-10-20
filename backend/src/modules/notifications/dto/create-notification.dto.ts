import { IsEnum, IsString, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, NotificationPriority, NotificationChannel } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationPriority, required: false })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({ enum: NotificationChannel, required: false })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  policyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chatSessionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  complianceReportId?: string;
}
