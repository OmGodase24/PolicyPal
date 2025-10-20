import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '64f8b2c1e4b0f1234567890a',
  })
  _id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  // Removed role field - everyone is just a user

  @ApiProperty({
    description: 'User active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2023-12-01T10:30:00.000Z',
  })
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2023-12-01T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2023-12-01T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Last name change timestamp',
    example: '2023-12-01T10:30:00.000Z',
  })
  lastNameChangeAt?: Date;

  @ApiProperty({
    description: 'Last profile password change timestamp',
    example: '2023-12-01T10:30:00.000Z',
  })
  lastProfilePasswordChangeAt?: Date;

  @ApiProperty({
    description: 'Last password reset timestamp',
    example: '2023-12-01T10:30:00.000Z',
  })
  lastPasswordResetAt?: Date;
}
