import { IsEmail, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string; // Optional custom expiry date
}

export class ValidateInviteDto {
  @IsString()
  token: string;
}

export class UseInviteDto {
  @IsString()
  token: string;

  @IsString()
  name: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;
}

export class InviteResponseDto {
  success: boolean;
  message: string;
  invite?: {
    token: string;
    email: string;
    expiresAt: Date;
    inviteLink: string;
  };
}

export class ValidateInviteResponseDto {
  success: boolean;
  valid: boolean;
  invite?: {
    email: string;
    invitedBy: string;
    expiresAt: Date;
    message?: string;
  };
  message?: string;
}

export class InviteListDto {
  invites: Array<{
    id: string;
    email: string;
    invitedBy: string;
    status: string;
    createdAt: Date;
    expiresAt: Date;
    usedAt?: Date;
  }>;
  total: number;
  pending: number;
  used: number;
  expired: number;
}
