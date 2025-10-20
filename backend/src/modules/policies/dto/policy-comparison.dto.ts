import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ArrayMinSize, ArrayMaxSize, IsOptional, IsBoolean } from 'class-validator';

export class CreatePolicyComparisonDto {
  @ApiProperty({
    description: 'Array of exactly 2 policy IDs to compare',
    example: ['64f8b2c1e4b0f1234567890b', '64f8b2c1e4b0f1234567890c'],
    minItems: 2,
    maxItems: 2,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  policyIds: string[];

  @ApiProperty({
    description: 'Name for this comparison',
    example: 'Health vs Auto Insurance Comparison',
    required: false,
  })
  @IsOptional()
  @IsString()
  comparisonName?: string;

  @ApiProperty({
    description: 'Whether to generate AI insights for the comparison',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  generateAIInsights?: boolean;
}

export class PolicyComparisonResponseDto {
  @ApiProperty({
    description: 'Comparison ID',
    example: '64f8b2c1e4b0f1234567890d',
  })
  _id: string;

  @ApiProperty({
    description: 'User ID who created the comparison',
    example: '64f8b2c1e4b0f1234567890a',
  })
  userId: string;

  @ApiProperty({
    description: 'Array of policy IDs being compared',
    example: ['64f8b2c1e4b0f1234567890b', '64f8b2c1e4b0f1234567890c'],
  })
  policyIds: string[];

  @ApiProperty({
    description: 'Name of the comparison',
    example: 'Health vs Auto Insurance Comparison',
  })
  comparisonName: string;

  @ApiProperty({
    description: 'Comparison data with policy details',
    type: 'object',
  })
  comparisonData: {
    policy1: any;
    policy2: any;
  };

  @ApiProperty({
    description: 'AI-generated insights about the comparison',
    required: false,
  })
  aiInsights?: {
    summary: string;
    keyDifferences: string[];
    recommendations: string[];
    coverageComparison?: {
      policy1: string[];
      policy2: string[];
    };
    costComparison?: {
      policy1: string;
      policy2: string;
    };
  };

  @ApiProperty({
    description: 'Comparison creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Comparison last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Whether the comparison is deleted',
    example: false,
  })
  isDeleted: boolean;

  @ApiProperty({
    description: 'Deletion timestamp',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  deletedAt?: Date;
}

export class PolicyComparisonListResponseDto {
  @ApiProperty({
    description: 'Array of policy comparisons',
    type: [PolicyComparisonResponseDto],
  })
  comparisons: PolicyComparisonResponseDto[];

  @ApiProperty({
    description: 'Total number of comparisons',
    example: 5,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;
}

export class ComparePoliciesRequestDto {
  @ApiProperty({
    description: 'First policy ID to compare',
    example: '64f8b2c1e4b0f1234567890b',
  })
  @IsString()
  policyId1: string;

  @ApiProperty({
    description: 'Second policy ID to compare',
    example: '64f8b2c1e4b0f1234567890c',
  })
  @IsString()
  policyId2: string;

  @ApiProperty({
    description: 'Whether to generate AI insights',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  generateAIInsights?: boolean;
}
