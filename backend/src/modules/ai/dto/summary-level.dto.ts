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
