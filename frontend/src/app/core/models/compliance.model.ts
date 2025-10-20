// Compliance Checking Models
export enum ComplianceLevel {
  COMPLIANT = 'compliant',
  PARTIAL = 'partial',
  NON_COMPLIANT = 'non_compliant',
  UNKNOWN = 'unknown'
}

export interface ComplianceCheck {
  check_name: string;
  level: ComplianceLevel;
  score: number; // 0.0 to 1.0
  message: string;
  evidence: string[];
  recommendation?: string;
}

export interface ComplianceReport {
  policy_id: string;
  user_id: string;
  overall_score: number; // 0.0 to 1.0
  overall_level: ComplianceLevel;
  checks: ComplianceCheck[];
  generated_at: string;
  regulation_framework: string;
}

export interface ComplianceRequest {
  policy_id: string;
  user_id: string;
  regulation_framework?: string;
}

export interface ComplianceResponse {
  success: boolean;
  report?: ComplianceReport;
  message: string;
}

export interface RegulationInfo {
  key: string;
  name: string;
  description?: string;
}

export interface ComplianceStats {
  total_checks: number;
  compliant_checks: number;
  partial_checks: number;
  non_compliant_checks: number;
  unknown_checks: number;
  average_score: number;
}
