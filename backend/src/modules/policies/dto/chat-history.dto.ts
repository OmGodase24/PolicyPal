import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateChatHistoryDto {
  @ApiProperty({
    description: 'Policy ID for the chat session',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  policyId: string;

  @ApiProperty({
    description: 'User question',
    example: 'What is the claim process?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'AI answer',
    example: 'The claim process involves...',
  })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({
    description: 'AI confidence score (0-1)',
    example: 0.85,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiProperty({
    description: 'Sources used for the answer',
    example: [{ page: 1, text: 'Policy section 2.1' }],
    required: false,
  })
  @IsOptional()
  @IsArray()
  sources?: any[];
}

export class ChatHistoryResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  policyId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  question: string;

  @ApiProperty()
  answer: string;

  @ApiProperty()
  confidence?: number;

  @ApiProperty()
  sources?: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
