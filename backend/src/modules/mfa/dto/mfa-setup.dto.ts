import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class MfaSetupDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;

  // Optional manual secret from client if cache expired
  @IsOptional()
  @IsString()
  tempSecret?: string;
}

export class MfaVerifyDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class MfaBackupCodeDto {
  @IsString()
  @IsNotEmpty()
  @Length(8, 8)
  code: string;
}

export class MfaDisableDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
