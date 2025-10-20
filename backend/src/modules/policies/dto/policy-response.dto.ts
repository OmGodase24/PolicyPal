import { ApiProperty } from '@nestjs/swagger';

export class PolicyResponseDto {
  @ApiProperty({
    description: 'Policy ID',
    example: '64f8b2c1e4b0f1234567890b',
  })
  _id: string;

  @ApiProperty({
    description: 'Policy title',
    example: 'Data Privacy Policy',
  })
  title: string;

  @ApiProperty({
    description: 'Policy description',
    example: 'This policy outlines how we handle user data',
  })
  description: string;

  @ApiProperty({
    description: 'Policy content',
    example: 'Detailed policy content goes here...',
  })
  content: string;

  @ApiProperty({
    description: 'Policy creator ID',
    example: '64f8b2c1e4b0f1234567890a',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Policy status',
    example: 'published',
  })
  status: string;

  @ApiProperty({
    description: 'Policy tags',
    example: ['privacy', 'data', 'gdpr'],
  })
  tags: string[];

  @ApiProperty({
    description: 'Policy published timestamp',
    example: '2023-12-01T10:00:00.000Z',
  })
  publishedAt: Date;

  @ApiProperty({
    description: 'Policy expiry date',
    example: '2024-12-01T10:00:00.000Z',
    required: false,
  })
  expiryDate?: Date;

  @ApiProperty({
    description: 'Whether the expiry date has been edited',
    example: false,
    required: false,
  })
  expiryDateEdited?: boolean;

  @ApiProperty({
    description: 'Policy creation timestamp',
    example: '2023-12-01T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Policy last update timestamp',
    example: '2023-12-01T10:30:00.000Z',
  })
  updatedAt: Date;

  // PDF-related fields
  @ApiProperty({
    description: 'Whether the policy has a PDF attached',
    example: true,
    required: false,
  })
  hasPDF?: boolean;

  @ApiProperty({
    description: 'Whether the PDF has been processed for AI',
    example: false,
    required: false,
  })
  pdfProcessed?: boolean;

  @ApiProperty({
    description: 'Original PDF filename',
    example: 'policy_document.pdf',
    required: false,
  })
  pdfFilename?: string;

  @ApiProperty({
    description: 'PDF file size in bytes',
    example: 1024000,
    required: false,
  })
  pdfSize?: number;

  @ApiProperty({
    description: 'Extracted text content from PDF',
    example: 'Policy text content extracted from PDF...',
    required: false,
  })
  pdfText?: string;

  // AI-related fields
  @ApiProperty({
    description: 'AI-generated summary of the policy',
    example: 'This policy covers data privacy and user rights...',
    required: false,
  })
  aiSummary?: string;

  @ApiProperty({
    description: 'Date when the AI summary was generated',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  aiSummaryGeneratedAt?: Date;

  @ApiProperty({
    description: 'Brief AI-generated summary',
    example: 'Brief policy summary...',
    required: false,
  })
  aiSummaryBrief?: string;

  @ApiProperty({
    description: 'Date when the brief summary was generated',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  aiSummaryBriefGeneratedAt?: Date;

  @ApiProperty({
    description: 'Standard AI-generated summary',
    example: 'Standard policy summary...',
    required: false,
  })
  aiSummaryStandard?: string;

  @ApiProperty({
    description: 'Date when the standard summary was generated',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  aiSummaryStandardGeneratedAt?: Date;

  @ApiProperty({
    description: 'Detailed AI-generated summary',
    example: 'Detailed policy summary...',
    required: false,
  })
  aiSummaryDetailed?: string;

  @ApiProperty({
    description: 'Date when the detailed summary was generated',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  aiSummaryDetailedGeneratedAt?: Date;

  @ApiProperty({
    description: 'Current summary level preference',
    example: 'standard',
    required: false,
  })
  currentSummaryLevel?: string;
}