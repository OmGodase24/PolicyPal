import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsDate, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiProperty({ description: 'User password', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ description: 'Password reset token', required: false })
  @IsOptional()
  @IsString()
  passwordResetToken?: string;

  @ApiProperty({ description: 'Password reset expiration date', required: false })
  @IsOptional()
  @IsDate()
  passwordResetExpires?: Date;

  @ApiProperty({ description: 'Password reset attempts count', required: false })
  @IsOptional()
  @IsNumber()
  passwordResetAttempts?: number;

  @ApiProperty({ description: 'Last password reset date', required: false })
  @IsOptional()
  @IsDate()
  lastPasswordResetAt?: Date;

  @ApiProperty({ description: 'Last profile password change date', required: false })
  @IsOptional()
  @IsDate()
  lastProfilePasswordChangeAt?: Date;
}
