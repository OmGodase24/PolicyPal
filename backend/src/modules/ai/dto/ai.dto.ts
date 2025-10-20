import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class QuestionDto {
  @ApiProperty({
    description: 'The question about the policy',
    example: 'What hospitals are covered by my insurance?',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  question: string;

  @ApiProperty({
    description: 'Specific policy ID to search in (optional)',
    example: 'policy123',
    required: false,
  })
  @IsOptional()
  @IsString()
  policyId?: string;

  @ApiProperty({
    description: 'Chat session ID for tracking conversation (optional)',
    example: 'chat_123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'Optional recent chat history for better context',
    required: false,
    isArray: true,
    type: Object,
    example: [
      { role: 'user', content: 'What is my deductible?', timestamp: '2025-09-10T10:00:00Z' },
      { role: 'assistant', content: 'Your deductible is $500.', timestamp: '2025-09-10T10:00:05Z' }
    ]
  })
  @IsOptional()
  history?: Array<{ role: string; content: string; timestamp?: string }>;

  @ApiProperty({
    description: 'Base64 encoded images for context (optional)',
    required: false,
    isArray: true,
    type: String,
    example: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...']
  })
  @IsOptional()
  images?: string[];
}

export class UploadPolicyDto {
  @ApiProperty({
    description: 'Policy ID to associate with the uploaded document (optional)',
    example: 'policy123',
    required: false,
  })
  @IsOptional()
  @IsString()
  policyId?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'PDF file to upload',
  })
  file: any;
}

export class UploadResponse {
  @ApiProperty({
    description: 'Document ID in the AI service',
    example: 'doc_123456',
  })
  documentId: string;

  @ApiProperty({
    description: 'Filename of the uploaded document',
    example: 'policy.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'Status of the upload',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Message about the upload',
    example: 'Document uploaded and processed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Extracted text from the PDF',
    example: 'This is the text content extracted from the PDF...',
    required: false,
  })
  extracted_text?: string;

  @ApiProperty({
    description: 'Length of extracted text',
    example: 1500,
    required: false,
  })
  text_length?: number;

  @ApiProperty({
    description: 'Number of chunks created',
    example: 3,
    required: false,
  })
  chunks_created?: number;
}

export class AnswerResponse {
  @ApiProperty({
    description: 'AI-generated answer to the question',
    example: 'Based on your policy, you are covered for...',
  })
  answer: string;

  @ApiProperty({
    description: 'Confidence score of the answer (0-1)',
    example: 0.95,
  })
  confidence: number;

  @ApiProperty({
    description: 'Sources used to generate the answer',
    example: ['policy_section_1', 'policy_section_2'],
  })
  sources: string[];

  @ApiProperty({
    description: 'Policy ID the answer is based on',
    example: 'policy123',
    required: false,
  })
  @IsOptional()
  policyId?: string;
}