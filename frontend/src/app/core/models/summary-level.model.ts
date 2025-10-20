export enum SummaryLevel {
  BRIEF = 'brief',
  STANDARD = 'standard',
  DETAILED = 'detailed'
}

export interface SummaryLevelRequest {
  level: SummaryLevel;
}

export interface SummaryLevelResponse {
  summary: string;
  level: SummaryLevel;
  generatedAt: Date;
  isNewGeneration: boolean;
}

export interface PolicySummaryInfo {
  brief: {
    summary: string;
    generatedAt: Date;
    exists: boolean;
  };
  standard: {
    summary: string;
    generatedAt: Date;
    exists: boolean;
  };
  detailed: {
    summary: string;
    generatedAt: Date;
    exists: boolean;
  };
  currentLevel: SummaryLevel;
}

export interface PolicyWithSummaryLevels {
  id: string;
  title: string;
  description: string;
  content: string;
  status: string;
  hasPDF: boolean;
  pdfProcessed: boolean;
  aiProcessed: boolean;
  
  // Legacy summary (for backward compatibility)
  aiSummary?: string;
  aiSummaryGeneratedAt?: Date;
  
  // Multi-level summaries
  aiSummaryBrief?: string;
  aiSummaryBriefGeneratedAt?: Date;
  aiSummaryStandard?: string;
  aiSummaryStandardGeneratedAt?: Date;
  aiSummaryDetailed?: string;
  aiSummaryDetailedGeneratedAt?: Date;
  currentSummaryLevel?: SummaryLevel;
  
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}
