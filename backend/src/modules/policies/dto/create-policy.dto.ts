import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePolicyDto {
  @ApiProperty({
    description: 'Title of the policy',
    example: 'Data Privacy Policy',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Description of the policy',
    example: 'This policy outlines our data privacy practices...',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Content of the policy',
    example: 'This policy outlines our data privacy practices...',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Status of the policy',
    enum: ['draft', 'publish'],
    example: 'draft',
  })
  @IsEnum(['draft', 'publish'])
  status: 'draft' | 'publish';

  @ApiProperty({
    description: 'Date when the policy was published',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: Date;

  @ApiProperty({
    description: 'Policy expiry date',
    example: '2024-12-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: Date;

  @ApiProperty({
    description: 'Extracted text content from the PDF',
    example: 'This is the text content extracted from the PDF document...',
    required: false,
  })
  @IsOptional()
  @IsString()
  pdfText?: string;

  // AI-related fields
  @ApiProperty({
    description: 'AI-generated summary of the policy',
    example: 'This policy covers data privacy and user rights...',
    required: false,
  })
  @IsOptional()
  @IsString()
  aiSummary?: string;

  @ApiProperty({
    description: 'Date when the AI summary was generated',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  aiSummaryGeneratedAt?: Date;

  // PDF processing fields
  @ApiProperty({
    description: 'Whether the policy has a PDF attached',
    example: true,
    required: false,
  })
  @IsOptional()
  hasPDF?: boolean;

  @ApiProperty({
    description: 'Whether the PDF has been processed',
    example: false,
    required: false,
  })
  @IsOptional()
  pdfProcessed?: boolean;

  @ApiProperty({
    description: 'PDF filename',
    example: 'policy.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  pdfFilename?: string;

  @ApiProperty({
    description: 'PDF file size in bytes',
    example: 1024000,
    required: false,
  })
  @IsOptional()
  pdfSize?: number;

  @ApiProperty({
    description: 'Whether AI processing is complete',
    example: false,
    required: false,
  })
  @IsOptional()
  aiProcessed?: boolean;
}