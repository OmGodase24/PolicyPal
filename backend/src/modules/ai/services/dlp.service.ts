import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../common/services/redis.service';

export interface DLPScanRequest {
  policyText: string;
  policyId: string;
  userId: string;
  customPatterns?: string[];
}

export interface DLPScanResponse {
  success: boolean;
  scanResult: {
    policyId: string;
    userId: string;
    scanTimestamp: string;
    sensitivityLevel: string;
    violations: Array<{
      type: string;
      severity: string;
      description: string;
      detectedData: string;
      location: string;
      recommendation: string;
      confidence: number;
    }>;
    riskScore: number;
    isSafeToPublish: boolean;
    recommendations: string[];
  };
  message: string;
}

@Injectable()
export class DLPService {
  private readonly logger = new Logger(DLPService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  async scanPolicyContent(request: DLPScanRequest): Promise<DLPScanResponse> {
    try {
      this.logger.log(`Scanning policy ${request.policyId} for DLP violations`);

      // Check cache first
      const cacheKey = `dlp:scan:${request.policyId}:${this.hashText(request.policyText)}`;
      const cachedResult = await this.redisService.get<DLPScanResponse>(cacheKey);
      
      if (cachedResult) {
        this.logger.debug(`DLP scan cache hit for policy ${request.policyId}`);
        return cachedResult;
      }

      // Check if AI service is available
      const isAIServiceAvailable = await this.checkAIServiceAvailability();
      
      let result: DLPScanResponse;
      if (isAIServiceAvailable) {
        // Use real AI service
        result = await this.scanWithAIService(request);
      } else {
        // Use mock implementation
        this.logger.warn('AI service not available, using mock DLP scan results');
        result = await this.scanWithMockService(request);
      }

      // Cache the result for 1 hour (3600 seconds)
      if (result.success) {
        await this.redisService.set(cacheKey, result, 3600);
        this.logger.debug(`DLP scan result cached for policy ${request.policyId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error scanning policy for DLP: ${error.message}`);
      // Fallback to mock service if real service fails
      this.logger.warn('Falling back to mock DLP scan results');
      return await this.scanWithMockService(request);
    }
  }

  private hashText(text: string): string {
    // Simple hash function for cache key generation
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async checkAIServiceAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      this.logger.debug(`AI service health check failed: ${error.message}`);
      return false;
    }
  }

  private async scanWithAIService(request: DLPScanRequest): Promise<DLPScanResponse> {
    const formData = new FormData();
    formData.append('policy_text', request.policyText);
    formData.append('policy_id', request.policyId);
    formData.append('user_id', request.userId);
    
    if (request.customPatterns) {
      formData.append('custom_patterns', JSON.stringify(request.customPatterns));
    }

    const response = await fetch(`${this.aiServiceUrl}/dlp/scan`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`DLP scan failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Validate the response structure - handle both snake_case and camelCase
    const scanResult = result.scan_result || result.scanResult;
    if (!result || !scanResult) {
      throw new Error('Invalid response from AI service');
    }
    
    const violationsCount = scanResult.violations ? scanResult.violations.length : 0;
    this.logger.log(`DLP scan completed for policy ${request.policyId}: ${violationsCount} violations found`);
    
    // Normalize the response to camelCase for consistency
    const normalizedResult = {
      ...result,
      scanResult: scanResult
    };
    
    return normalizedResult;
  }

  private async scanWithMockService(request: DLPScanRequest): Promise<DLPScanResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Analyze policy text for common sensitive data patterns
    const violations = this.analyzePolicyText(request.policyText);
    const riskScore = this.calculateRiskScore(violations);
    const sensitivityLevel = this.determineSensitivityLevel(riskScore);
    const isSafeToPublish = riskScore < 0.3;

    const scanResult = {
      policyId: request.policyId,
      userId: request.userId,
      scanTimestamp: new Date().toISOString(),
      sensitivityLevel,
      violations,
      riskScore,
      isSafeToPublish,
      recommendations: this.generateRecommendations(violations, riskScore)
    };

    this.logger.log(`Mock DLP scan completed for policy ${request.policyId}: ${violations.length} violations found`);

    return {
      success: true,
      scanResult,
      message: 'DLP scan completed successfully (mock mode)'
    };
  }

  private analyzePolicyText(policyText: string): Array<{
    type: string;
    severity: string;
    description: string;
    detectedData: string;
    location: string;
    recommendation: string;
    confidence: number;
  }> {
    const violations = [];
    const text = policyText.toLowerCase();

    // Email patterns
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = policyText.match(emailRegex);
    if (emails && emails.length > 0) {
      violations.push({
        type: 'Email Addresses Found',
        severity: 'medium',
        description: 'We found email addresses in this document',
        detectedData: emails.slice(0, 3).join(', ') + (emails.length > 3 ? '...' : ''),
        location: 'In the document text',
        recommendation: 'Be aware of these email addresses when sharing this document',
        confidence: 0.95
      });
    }

    // Phone number patterns
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    const phones = policyText.match(phoneRegex);
    if (phones && phones.length > 0) {
      violations.push({
        type: 'Phone Numbers Found',
        severity: 'medium',
        description: 'We found phone numbers in this document',
        detectedData: phones.slice(0, 3).join(', ') + (phones.length > 3 ? '...' : ''),
        location: 'In the document text',
        recommendation: 'Be aware of these phone numbers when sharing this document',
        confidence: 0.90
      });
    }

    // SSN patterns
    const ssnRegex = /\b\d{3}-?\d{2}-?\d{4}\b/g;
    const ssns = policyText.match(ssnRegex);
    if (ssns && ssns.length > 0) {
      violations.push({
        type: '⚠️ Social Security Numbers Found',
        severity: 'high',
        description: 'We found Social Security Numbers in this document - this is very sensitive!',
        detectedData: ssns.slice(0, 2).join(', ') + (ssns.length > 2 ? '...' : ''),
        location: 'In the document text',
        recommendation: 'Keep this document very secure - SSNs are highly sensitive',
        confidence: 0.98
      });
    }

    // Credit card patterns
    const ccRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
    const ccs = policyText.match(ccRegex);
    if (ccs && ccs.length > 0) {
      violations.push({
        type: '🚨 Credit Card Numbers Found',
        severity: 'high',
        description: 'We found credit card numbers in this document - this is very dangerous!',
        detectedData: ccs.slice(0, 2).join(', ') + (ccs.length > 2 ? '...' : ''),
        location: 'In the document text',
        recommendation: 'Keep this document very secure - credit card numbers are highly sensitive',
        confidence: 0.97
      });
    }

    // IP address patterns
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const ips = policyText.match(ipRegex);
    if (ips && ips.length > 0) {
      violations.push({
        type: 'Computer Addresses Found',
        severity: 'low',
        description: 'We found computer network addresses in this document',
        detectedData: ips.slice(0, 3).join(', ') + (ips.length > 3 ? '...' : ''),
        location: 'In the document text',
        recommendation: 'These are usually okay, but be aware when sharing this document',
        confidence: 0.85
      });
    }

    // Check for sensitive keywords
    const sensitiveKeywords = [
      'password', 'secret', 'confidential', 'private', 'internal',
      'ssn', 'social security', 'credit card', 'bank account',
      'api key', 'token', 'key', 'credential'
    ];

    const foundKeywords = sensitiveKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );

    if (foundKeywords.length > 0) {
      violations.push({
        type: 'Sensitive Words Found',
        severity: 'medium',
        description: 'We found some sensitive words in this document',
        detectedData: foundKeywords.slice(0, 5).join(', ') + (foundKeywords.length > 5 ? '...' : ''),
        location: 'In the document text',
        recommendation: 'Be aware of the sensitive content when handling this document',
        confidence: 0.80
      });
    }

    return violations;
  }

  private calculateRiskScore(violations: any[]): number {
    if (violations.length === 0) return 0;

    let totalScore = 0;
    const severityWeights = { low: 0.1, medium: 0.3, high: 0.7 };

    for (const violation of violations) {
      const baseScore = severityWeights[violation.severity] || 0.1;
      const confidenceMultiplier = violation.confidence || 0.5;
      totalScore += baseScore * confidenceMultiplier;
    }

    return Math.min(totalScore, 1.0); // Cap at 1.0
  }

  private determineSensitivityLevel(riskScore: number): string {
    if (riskScore < 0.2) return 'low';
    if (riskScore < 0.5) return 'medium';
    if (riskScore < 0.8) return 'high';
    return 'critical';
  }

  private generateRecommendations(violations: any[], riskScore: number): string[] {
    const recommendations = [];

    if (violations.length === 0) {
      recommendations.push('✅ Great! No sensitive information found. Your document looks safe to publish.');
      return recommendations;
    }

    if (riskScore > 0.7) {
      recommendations.push('⚠️ High risk found! This document contains very sensitive information.');
    } else if (riskScore > 0.3) {
      recommendations.push('⚠️ Medium risk found. This document contains some sensitive information.');
    } else {
      recommendations.push('✅ Low risk found. This document has minor sensitive information.');
    }

    const violationTypes = [...new Set(violations.map(v => v.type))];
    
    if (violationTypes.some(type => type.includes('Social Security') || type.includes('Credit Card'))) {
      recommendations.push('🚨 This document contains highly sensitive financial information!');
      recommendations.push('⚠️ Be extra careful with this document - keep it secure.');
    }

    if (violationTypes.some(type => type.includes('Email') || type.includes('Phone'))) {
      recommendations.push('📞 This document contains personal contact information.');
      recommendations.push('🤔 Consider if you need to share this document with others.');
    }

    if (violationTypes.some(type => type.includes('Sensitive Words'))) {
      recommendations.push('📝 This document contains sensitive terminology.');
      recommendations.push('🔍 Be aware of the sensitive content when handling this document.');
    }

    // Add specific recommendations based on risk level
    if (riskScore > 0.7) {
      recommendations.push('🚨 This document contains very sensitive information - handle with care.');
      recommendations.push('📋 Consider creating a summary version without sensitive details for sharing.');
    } else if (riskScore > 0.3) {
      recommendations.push('🤔 This document has some sensitive information - be mindful when sharing.');
      recommendations.push('📝 Consider what information you share when discussing this document.');
    } else {
      recommendations.push('✅ This document is mostly safe, but review the flagged items.');
    }

    recommendations.push('💡 This is your private document - only you can see it.');
    recommendations.push('🔍 The scan helps you understand what sensitive information is in your document.');

    return recommendations;
  }
}
