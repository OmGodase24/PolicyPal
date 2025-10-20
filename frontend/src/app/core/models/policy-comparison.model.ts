export interface PolicyComparison {
  _id: string;
  userId: string;
  policyIds: string[];
  comparisonName: string;
  comparisonData: {
    policy1: PolicyComparisonData;
    policy2: PolicyComparisonData;
  };
  aiInsights?: PolicyComparisonInsights;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyComparisonData {
  id: string;
  title: string;
  description: string;
  content: string;
  status: string;
  hasPDF: boolean;
  pdfProcessed: boolean;
  aiSummary?: string;
  aiSummaryBrief?: string;
  aiSummaryStandard?: string;
  aiSummaryDetailed?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface PolicyComparisonInsights {
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
  isRelevant?: boolean;
  relevanceScore?: number;
}

export interface CreatePolicyComparisonRequest {
  policyIds: string[];
  comparisonName?: string;
  generateAIInsights?: boolean;
}

export interface ComparePoliciesRequest {
  policyId1: string;
  policyId2: string;
  generateAIInsights?: boolean;
}

export interface PolicyComparisonListResponse {
  comparisons: PolicyComparison[];
  total: number;
  page: number;
  limit: number;
}

export interface PolicyComparisonExportOptions {
  format: 'pdf' | 'json';
  includeAIInsights?: boolean;
  includeFullContent?: boolean;
}
