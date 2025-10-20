import { SummaryLevel } from './summary-level.model';

export type PolicyStatus = 'draft' | 'publish';
export type PolicyLifecycle = 'active' | 'expiring-soon' | 'expired';

export interface PolicyLifecycleInfo {
  lifecycle: PolicyLifecycle;
  daysUntilExpiry?: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isActive: boolean;
}

export interface Policy {
  _id: string;
  title: string;
  description: string;
  content: string;
  createdBy: string;
  status: PolicyStatus;
  hasPDF: boolean;
  pdfProcessed: boolean;
  pdfFilename?: string;
  pdfSize?: number;
  publishedAt?: Date;
  expiryDate?: Date;
  expiryDateEdited?: boolean;
  createdAt: Date;
  updatedAt: Date;
  pdfText?: string;
  
  // Legacy AI summary (for backward compatibility)
  aiSummary?: string;
  aiSummaryGeneratedAt?: Date;
  
  // Multi-level AI summaries
  aiSummaryBrief?: string;
  aiSummaryBriefGeneratedAt?: Date;
  aiSummaryStandard?: string;
  aiSummaryStandardGeneratedAt?: Date;
  aiSummaryDetailed?: string;
  aiSummaryDetailedGeneratedAt?: Date;
  currentSummaryLevel?: SummaryLevel;
  
  aiProcessed: boolean;
  aiProcessedAt?: Date;
  
  // Compliance scoring
  complianceScore?: number;
  complianceLevel?: 'compliant' | 'partial' | 'non-compliant' | 'unknown';
  complianceLastChecked?: Date;
  complianceFramework?: string;
}

export interface CreatePolicyRequest {
  title: string;
  description?: string;
  content?: string;
  status: PolicyStatus;
  expiryDate?: Date;
}

export interface UpdatePolicyRequest {
  title?: string;
  description?: string;
  content?: string;
  status?: PolicyStatus;
  expiryDate?: Date;
}
