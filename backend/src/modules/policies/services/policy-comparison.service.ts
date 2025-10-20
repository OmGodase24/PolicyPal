import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PolicyComparison, PolicyComparisonDocument } from '../schemas/policy-comparison.schema';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { CreatePolicyComparisonDto, ComparePoliciesRequestDto, PolicyComparisonResponseDto, PolicyComparisonListResponseDto } from '../dto/policy-comparison.dto';
import { AIService } from '../../ai/services/ai.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PolicyComparisonService {
  private readonly logger = new Logger(PolicyComparisonService.name);

  constructor(
    @InjectModel(PolicyComparison.name)
    private readonly comparisonModel: Model<PolicyComparisonDocument>,
    @InjectModel(Policy.name)
    private readonly policyModel: Model<PolicyDocument>,
    private readonly aiService: AIService,
  ) {}

  async createComparison(
    createComparisonDto: CreatePolicyComparisonDto,
    userId: string,
  ): Promise<PolicyComparisonResponseDto> {
    const { policyIds, comparisonName, generateAIInsights = true } = createComparisonDto;

    // Validate that both policies exist and belong to the user
    const policies = await this.validateAndFetchPolicies(policyIds, userId);

    // Create comparison data structure
    const comparisonData = {
      policy1: this.extractPolicyData(policies[0]),
      policy2: this.extractPolicyData(policies[1]),
    };

    // Generate comparison name if not provided
    const finalComparisonName = comparisonName || 
      `Comparison: ${policies[0].title} vs ${policies[1].title}`;

    // Create the comparison document
    const comparison = new this.comparisonModel({
      userId,
      policyIds: policies.map(p => p._id),
      comparisonName: finalComparisonName,
      comparisonData,
    });

    // Generate AI insights if requested
    if (generateAIInsights) {
      try {
        comparison.aiInsights = await this.generateAIInsights(comparisonData);
      } catch (error) {
        this.logger.warn(`Failed to generate AI insights: ${error.message}`);
        // Continue without AI insights rather than failing the entire operation
      }
    }

    const savedComparison = await comparison.save();
    return this.transformToResponseDto(savedComparison);
  }

  async comparePolicies(
    compareRequest: ComparePoliciesRequestDto,
    userId: string,
  ): Promise<PolicyComparisonResponseDto> {
    const { policyId1, policyId2, generateAIInsights = true } = compareRequest;

    const createDto: CreatePolicyComparisonDto = {
      policyIds: [policyId1, policyId2],
      generateAIInsights,
    };

    return this.createComparison(createDto, userId);
  }

  async getUserComparisons(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PolicyComparisonListResponseDto> {
    const skip = (page - 1) * limit;

    const [comparisons, total] = await Promise.all([
      this.comparisonModel
        .find({ userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.comparisonModel.countDocuments({ userId, isDeleted: false }),
    ]);

    return {
      comparisons: comparisons.map(c => this.transformToResponseDto(c)),
      total,
      page,
      limit,
    };
  }

  async getComparisonById(comparisonId: string, userId: string): Promise<PolicyComparisonResponseDto> {
    const comparison = await this.comparisonModel
      .findOne({ _id: comparisonId, userId, isDeleted: false })
      .exec();

    if (!comparison) {
      throw new NotFoundException('Policy comparison not found');
    }

    return this.transformToResponseDto(comparison);
  }

  async deleteComparison(comparisonId: string, userId: string): Promise<void> {
    const result = await this.comparisonModel
      .findOneAndUpdate(
        { _id: comparisonId, userId, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Policy comparison not found');
    }
  }

  async regenerateAIInsights(comparisonId: string, userId: string): Promise<PolicyComparisonResponseDto> {
    const comparison = await this.comparisonModel
      .findOne({ _id: comparisonId, userId, isDeleted: false })
      .exec();
    
    if (!comparison) {
      throw new NotFoundException('Policy comparison not found');
    }

    try {
      comparison.aiInsights = await this.generateAIInsights(comparison.comparisonData);
      const savedComparison = await comparison.save();
      return this.transformToResponseDto(savedComparison);
    } catch (error) {
      this.logger.error(`Failed to regenerate AI insights: ${error.message}`);
      throw new BadRequestException('Failed to generate AI insights');
    }
  }

  async exportComparison(comparisonId: string, userId: string): Promise<Buffer> {
    const comparison = await this.comparisonModel
      .findOne({ _id: comparisonId, userId, isDeleted: false })
      .exec();
    
    if (!comparison) {
      throw new NotFoundException('Policy comparison not found');
    }

    // Generate PDF using PDFKit
    return this.generateComparisonPDF(comparison);
  }

  private async generateComparisonPDF(comparison: PolicyComparisonDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        // Collect PDF chunks
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).font('Helvetica-Bold');
        doc.text('Policy Comparison Report', { align: 'center' });
        doc.moveDown();

        // Comparison info
        doc.fontSize(14).font('Helvetica');
        doc.text(`Comparison: ${comparison.comparisonName}`);
        doc.text(`Generated: ${new Date().toLocaleString()}`);
        doc.text(`Report ID: ${comparison._id.toString()}`);
        doc.moveDown(2);

        // Policy 1
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Policy 1: ' + comparison.comparisonData.policy1.title);
        doc.moveDown();

        doc.fontSize(12).font('Helvetica');
        doc.text('Status: ' + comparison.comparisonData.policy1.status.toUpperCase());
        doc.text('Description: ' + (comparison.comparisonData.policy1.description || 'No description available'));
        doc.moveDown();

        if (comparison.comparisonData.policy1.content) {
          doc.text('Content Preview:');
          const content1 = comparison.comparisonData.policy1.content.substring(0, 500);
          doc.text(content1 + (comparison.comparisonData.policy1.content.length > 500 ? '...' : ''));
        }
        doc.moveDown(2);

        // Policy 2
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Policy 2: ' + comparison.comparisonData.policy2.title);
        doc.moveDown();

        doc.fontSize(12).font('Helvetica');
        doc.text('Status: ' + comparison.comparisonData.policy2.status.toUpperCase());
        doc.text('Description: ' + (comparison.comparisonData.policy2.description || 'No description available'));
        doc.moveDown();

        if (comparison.comparisonData.policy2.content) {
          doc.text('Content Preview:');
          const content2 = comparison.comparisonData.policy2.content.substring(0, 500);
          doc.text(content2 + (comparison.comparisonData.policy2.content.length > 500 ? '...' : ''));
        }
        doc.moveDown(2);

        // AI Analysis Section
        if (comparison.aiInsights) {
          doc.addPage();
          doc.fontSize(18).font('Helvetica-Bold');
          doc.text('AI Analysis', { align: 'center' });
          doc.moveDown(2);

          // Relevance Score
          if ((comparison.aiInsights as any).relevanceScore !== undefined) {
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text(`Relevance Score: ${(comparison.aiInsights as any).relevanceScore}%`);
            doc.moveDown();
          }

          // Summary
          if (comparison.aiInsights.summary) {
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text('Summary:');
            doc.fontSize(12).font('Helvetica');
            doc.text(comparison.aiInsights.summary, { align: 'justify' });
            doc.moveDown(2);
          }

          // Key Differences
          if (comparison.aiInsights.keyDifferences && comparison.aiInsights.keyDifferences.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text('Key Differences:');
            doc.fontSize(12).font('Helvetica');
            comparison.aiInsights.keyDifferences.forEach((diff, index) => {
              doc.text(`${index + 1}. ${diff}`);
            });
            doc.moveDown(2);
          }

          // Recommendations
          if (comparison.aiInsights.recommendations && comparison.aiInsights.recommendations.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text('Recommendations:');
            doc.fontSize(12).font('Helvetica');
            comparison.aiInsights.recommendations.forEach((rec, index) => {
              doc.text(`${index + 1}. ${rec}`);
            });
            doc.moveDown(2);
          }

          // Coverage Analysis
          if (comparison.aiInsights.coverageComparison) {
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text('Coverage Analysis:');
            doc.moveDown();

            if (comparison.aiInsights.coverageComparison.policy1) {
              doc.fontSize(12).font('Helvetica-Bold');
              doc.text(`${comparison.comparisonData.policy1.title}:`);
              doc.fontSize(12).font('Helvetica');
              comparison.aiInsights.coverageComparison.policy1.forEach((item, index) => {
                doc.text(`• ${item}`);
              });
              doc.moveDown();
            }

            if (comparison.aiInsights.coverageComparison.policy2) {
              doc.fontSize(12).font('Helvetica-Bold');
              doc.text(`${comparison.comparisonData.policy2.title}:`);
              doc.fontSize(12).font('Helvetica');
              comparison.aiInsights.coverageComparison.policy2.forEach((item, index) => {
                doc.text(`• ${item}`);
              });
            }
          }
        }

        // Footer
        doc.fontSize(10).font('Helvetica');
        doc.text(
          `Generated by PolicyPal - ${new Date().toLocaleDateString()}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async validateAndFetchPolicies(policyIds: string[], userId: string): Promise<PolicyDocument[]> {
    if (policyIds.length !== 2) {
      throw new BadRequestException('Exactly 2 policies must be provided for comparison');
    }

    const policies = await this.policyModel
      .find({
        _id: { $in: policyIds },
        createdBy: userId,
      })
      .exec();

    if (policies.length !== 2) {
      throw new NotFoundException('One or both policies not found or not accessible');
    }

    // Check if any policies are expired (expired policies cannot be compared)
    const expiredPolicies = policies.filter(p => {
      const lifecycleInfo = this.calculatePolicyLifecycle(p);
      return lifecycleInfo.isExpired;
    });
    
    if (expiredPolicies.length > 0) {
      throw new BadRequestException(`Cannot compare expired policies: ${expiredPolicies.map(p => p.title).join(', ')}`);
    }

    // Check if both policies are published (for meaningful comparison)
    const unpublishedPolicies = policies.filter(p => p.status !== 'publish');
    if (unpublishedPolicies.length > 0) {
      this.logger.warn(`Comparing unpublished policies: ${unpublishedPolicies.map(p => p.title).join(', ')}`);
    }

    return policies;
  }

  /**
   * Calculate policy lifecycle based on expiry date
   */
  private calculatePolicyLifecycle(policy: PolicyDocument): {
    lifecycle: 'active' | 'expiring-soon' | 'expired';
    daysUntilExpiry?: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
    isActive: boolean;
  } {
    // If no expiry date, consider it active
    if (!policy.expiryDate) {
      return {
        lifecycle: 'active',
        isExpired: false,
        isExpiringSoon: false,
        isActive: true
      };
    }

    const today = new Date();
    const expiryDate = new Date(policy.expiryDate);
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Check if policy is expired first (regardless of status)
    if (daysUntilExpiry < 0) {
      return {
        lifecycle: 'expired',
        daysUntilExpiry,
        isExpired: true,
        isExpiringSoon: false,
        isActive: false
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        lifecycle: 'expiring-soon',
        daysUntilExpiry,
        isExpired: false,
        isExpiringSoon: true,
        isActive: false
      };
    } else {
      return {
        lifecycle: 'active',
        daysUntilExpiry,
        isExpired: false,
        isExpiringSoon: false,
        isActive: true
      };
    }
  }

  private extractPolicyData(policy: PolicyDocument): any {
    return {
      id: policy._id.toString(),
      title: policy.title,
      description: policy.description,
      content: policy.content,
      status: policy.status,
      hasPDF: policy.hasPDF,
      pdfProcessed: policy.pdfProcessed,
      aiSummary: policy.aiSummary,
      aiSummaryBrief: policy.aiSummaryBrief,
      aiSummaryStandard: policy.aiSummaryStandard,
      aiSummaryDetailed: policy.aiSummaryDetailed,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      publishedAt: policy.publishedAt,
    };
  }

  private async generateAIInsights(comparisonData: any): Promise<any> {
    try {
      const policy1Data = comparisonData.policy1;
      const policy2Data = comparisonData.policy2;

      // Perform intelligent content analysis directly
      const analysis = await this.analyzeContentIntelligently(policy1Data, policy2Data);
      
      return analysis;

    } catch (error) {
      this.logger.error(`Error generating AI insights: ${error.message}`);
      // Fallback to basic analysis if AI service fails
      return this.fallbackToBasicAnalysis(comparisonData.policy1, comparisonData.policy2);
    }
  }

  private async analyzeContentIntelligently(policy1: any, policy2: any): Promise<any> {
    // Extract and analyze policy content in depth
    const policy1Analysis = this.analyzePolicy(policy1);
    const policy2Analysis = this.analyzePolicy(policy2);

    this.logger.log(`Deep policy analysis: "${policy1.title}" vs "${policy2.title}"`);

    // Try to get AI-powered insights if available
    let aiEnhancedAnalysis = null;
    try {
      aiEnhancedAnalysis = await this.getAIEnhancedComparison(policy1Analysis, policy2Analysis);
    } catch (error) {
      this.logger.warn(`AI enhancement failed, falling back to rule-based analysis: ${error.message}`);
    }

    // Always perform detailed content analysis regardless of document type
    const detailedComparison = this.performDetailedContentAnalysis(policy1Analysis, policy2Analysis);
    
    // Merge AI insights with rule-based analysis
    if (aiEnhancedAnalysis) {
      return this.mergeAIWithRuleBasedAnalysis(policy1Analysis, policy2Analysis, detailedComparison, aiEnhancedAnalysis);
    }
    
    // For non-policy documents, provide content-based comparison anyway
    if (!policy1Analysis.isPolicyDocument || !policy2Analysis.isPolicyDocument) {
      return {
        summary: this.generateNonPolicyComparisonSummary(policy1Analysis, policy2Analysis, detailedComparison),
        keyDifferences: this.generateSpecificDifferences(policy1Analysis, policy2Analysis, detailedComparison),
        recommendations: this.generateContentBasedRecommendations(policy1Analysis, policy2Analysis, detailedComparison),
        coverageComparison: {
          policy1: this.generateDetailedAnalysis(policy1Analysis),
          policy2: this.generateDetailedAnalysis(policy2Analysis)
        },
        isRelevant: detailedComparison.hasUsefulComparison,
        relevanceScore: detailedComparison.contentSimilarityScore
      };
    }

    // For policy documents, perform comprehensive policy analysis
    return this.performComprehensivePolicyComparison(policy1Analysis, policy2Analysis, detailedComparison);
  }

  private async getAIEnhancedComparison(policy1: any, policy2: any): Promise<any> {
    const comparisonPrompt = `
Please analyze and compare these two policy documents:

POLICY 1: "${policy1.title}"
Content: ${this.extractAllContent(policy1).substring(0, 2000)}
Document Type: ${policy1.documentType}
Policy Type: ${policy1.policyType}

POLICY 2: "${policy2.title}"
Content: ${this.extractAllContent(policy2).substring(0, 2000)}
Document Type: ${policy2.documentType}
Policy Type: ${policy2.policyType}

Please provide:
1. A detailed comparison summary focusing on actual content differences
2. Key differences between the documents (specific, actionable points)
3. Practical recommendations for someone choosing between these options
4. Relevance assessment (0-100) based on how comparable these documents are

Focus on actual content, not generic policy language. Be specific about what each document offers.
`;

    try {
      const response = await this.aiService.askQuestion(
        comparisonPrompt,
        'system', // Use system user for internal analysis
        null, // No specific policy ID
        null, // No session ID
        [] // No history
      );

      return this.parseAIResponse(response.answer);
    } catch (error) {
      this.logger.error(`AI comparison failed: ${error.message}`);
      throw error;
    }
  }

  private parseAIResponse(aiResponse: string): any {
    // Extract structured information from AI response
    const sections = aiResponse.split(/\d+\./);
    
    return {
      aiSummary: sections[1]?.trim() || '',
      aiDifferences: this.extractListItems(sections[2] || ''),
      aiRecommendations: this.extractListItems(sections[3] || ''),
      aiRelevanceScore: this.extractRelevanceScore(aiResponse)
    };
  }

  private extractListItems(section: string): string[] {
    const items = section.split(/[-•*]/).filter(item => item.trim().length > 10);
    return items.map(item => item.trim()).slice(0, 5);
  }

  private extractRelevanceScore(text: string): number {
    const scoreMatch = text.match(/(\d+)%?(?:\s*(?:relevance|relevant|score|compatibility))/i);
    if (scoreMatch) {
      return Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
    }
    return 60; // Default moderate relevance
  }

  private mergeAIWithRuleBasedAnalysis(policy1: any, policy2: any, ruleBasedAnalysis: any, aiAnalysis: any): any {
    const relevanceScore = this.calculateRelevanceScore(policy1, policy2);
    
    // Combine AI insights with rule-based analysis
    const mergedSummary = aiAnalysis.aiSummary || 
      this.generateComparisonSummary(policy1, policy2, ruleBasedAnalysis.coverage || {}, ruleBasedAnalysis.financial || {});
    
    const mergedDifferences = [
      ...(aiAnalysis.aiDifferences || []),
      ...(ruleBasedAnalysis.differences || [])
    ].slice(0, 8);
    
    const mergedRecommendations = [
      ...(aiAnalysis.aiRecommendations || []),
      ...this.generateRecommendations(policy1, policy2, ruleBasedAnalysis.coverage || {}, ruleBasedAnalysis.financial || {})
    ].slice(0, 6);

    return {
      summary: mergedSummary,
      keyDifferences: mergedDifferences,
      recommendations: mergedRecommendations,
      coverageComparison: {
        policy1: this.generateDetailedAnalysis(policy1),
        policy2: this.generateDetailedAnalysis(policy2)
      },
      isRelevant: relevanceScore > 40, // More lenient threshold
      relevanceScore: Math.max(relevanceScore, aiAnalysis.aiRelevanceScore || 0)
    };
  }

  private async checkPolicyRelevance(policy1: any, policy2: any): Promise<{areRelated: boolean, explanation: string, score: number}> {
    try {
      // Simple keyword-based relevance check (can be enhanced with AI later)
      const policy1Text = `${policy1.title} ${policy1.description} ${policy1.content}`.toLowerCase();
      const policy2Text = `${policy2.title} ${policy2.description} ${policy2.content}`.toLowerCase();
      
      // Define policy domain keywords
      const domainKeywords = {
        insurance: ['insurance', 'coverage', 'premium', 'deductible', 'claim', 'policy', 'liability', 'protection'],
        hr: ['employee', 'hr', 'human resources', 'benefits', 'leave', 'vacation', 'salary', 'performance'],
        security: ['security', 'access', 'password', 'authentication', 'authorization', 'confidential', 'data protection'],
        legal: ['legal', 'compliance', 'regulation', 'law', 'contract', 'agreement', 'terms', 'conditions'],
        financial: ['financial', 'budget', 'expense', 'cost', 'money', 'payment', 'invoice', 'accounting'],
        technology: ['technology', 'software', 'system', 'network', 'computer', 'database', 'application', 'tech'],
        health: ['health', 'medical', 'healthcare', 'treatment', 'patient', 'clinic', 'hospital', 'medicine']
      };

      // Count keyword matches for each domain
      const policy1Domains: {[key: string]: number} = {};
      const policy2Domains: {[key: string]: number} = {};

      for (const [domain, keywords] of Object.entries(domainKeywords)) {
        policy1Domains[domain] = keywords.filter(keyword => policy1Text.includes(keyword)).length;
        policy2Domains[domain] = keywords.filter(keyword => policy2Text.includes(keyword)).length;
      }

      // Find primary domains for each policy
      const policy1PrimaryDomain = Object.entries(policy1Domains).reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const policy2PrimaryDomain = Object.entries(policy2Domains).reduce((a, b) => a[1] > b[1] ? a : b)[0];

      // Calculate similarity score based on shared keywords
      const commonWords = this.getCommonWords(policy1Text, policy2Text);
      const totalWords = new Set([...policy1Text.split(' '), ...policy2Text.split(' ')]).size;
      const similarityScore = (commonWords.length / totalWords) * 100;

      const areRelated = policy1PrimaryDomain === policy2PrimaryDomain || similarityScore > 15;
      
      let explanation = '';
      if (!areRelated) {
        explanation = `Policy 1 appears to be in the "${policy1PrimaryDomain}" domain while Policy 2 is in the "${policy2PrimaryDomain}" domain. `;
        explanation += `They share only ${Math.round(similarityScore)}% common context.`;
      } else {
        explanation = `Both policies are in the "${policy1PrimaryDomain}" domain with ${Math.round(similarityScore)}% shared context.`;
      }

      return {
        areRelated,
        explanation,
        score: Math.round(similarityScore)
      };
    } catch (error) {
      this.logger.error(`Error checking policy relevance: ${error.message}`);
      return {
        areRelated: true, // Default to allowing comparison if check fails
        explanation: 'Unable to determine policy relevance',
        score: 50
      };
    }
  }

  private getCommonWords(text1: string, text2: string): string[] {
    const words1 = new Set(text1.split(' ').filter(word => word.length > 3));
    const words2 = new Set(text2.split(' ').filter(word => word.length > 3));
    return Array.from(words1).filter(word => words2.has(word));
  }

  private extractAllContent(policy: any): string {
    // Prioritize actual PDF text content over everything else
    const parts = [];
    
    // First priority: Actual PDF text (this is the real document content)
    if (policy.pdfText && policy.pdfText.trim().length > 100) {
      parts.push(policy.pdfText);
      this.logger.log(`Using PDF text content for ${policy.title}: ${policy.pdfText.length} characters`);
    }
    
    // Second priority: AI summaries (these are generated from PDF content)
    if (policy.aiSummaryDetailed && policy.aiSummaryDetailed.trim().length > 50) {
      parts.push(policy.aiSummaryDetailed);
    } else if (policy.aiSummary && policy.aiSummary.trim().length > 50) {
      parts.push(policy.aiSummary);
    }
    
    // Third priority: User-entered content (fallback)
    if (policy.content && policy.content.trim().length > 20) {
      parts.push(policy.content);
    }
    
    // Always include title and description for context
    if (policy.title) parts.push(policy.title);
    if (policy.description) parts.push(policy.description);
    
    const fullContent = parts.filter(p => p.trim()).join(' ');
    
    if (fullContent.length < 100) {
      this.logger.warn(`Very limited content for ${policy.title}: only ${fullContent.length} characters available`);
    }
    
    return fullContent.toLowerCase();
  }

  private detectDocumentType(content: string): string {
    const patterns = {
      'technical guide': [
        'configure', 'configuration', 'setup', 'network', 'router', 'ip address', 
        'wireless', 'dhcp', 'ssid', 'packet tracer', 'linksys', 'static routing',
        'wan', 'lan', 'subnet', 'gateway', 'protocol', 'cisco', 'ccna'
      ],
      'resume/cv': [
        'experience', 'years', 'developer', 'skills', 'education', 'programming',
        'projects', 'technologies', 'mongodb', 'express', 'angular', 'node.js',
        'full stack', 'backend', 'frontend', 'cognizant', 'programmer analyst',
        'react', 'typescript', 'aws', 'api', 'database'
      ],
      'insurance policy': [
        'coverage', 'premium', 'deductible', 'claim', 'liability', 'beneficiary',
        'policyholder', 'underwriter', 'exclusions', 'riders', 'copay', 'coinsurance'
      ],
      'legal document': [
        'terms', 'conditions', 'agreement', 'contract', 'legal', 'law', 'regulation',
        'compliance', 'liability', 'jurisdiction', 'governing law'
      ],
      'health policy': [
        'health', 'medical', 'healthcare', 'treatment', 'patient', 'clinic',
        'hospital', 'medicine', 'doctor', 'prescription', 'diagnosis'
      ]
    };

    let bestMatch = 'unknown';
    let highestScore = 0;

    for (const [type, keywords] of Object.entries(patterns)) {
      const matches = keywords.filter(keyword => content.includes(keyword)).length;
      const score = (matches / keywords.length) * 100;
      
      if (score > highestScore && score > 20) { // At least 20% keyword match
        highestScore = score;
        bestMatch = type;
      }
    }

    return bestMatch;
  }

  private analyzePolicy(policy: any): any {
    const content = this.extractAllContent(policy);
    
    // Determine if this is actually a policy document
    const isPolicyDocument = this.isPolicyDocument(content);
    const documentType = this.detectDocumentType(content);
    const policyType = this.extractPolicyType(content);
    
    // Extract policy-specific information
    const coverage = this.extractCoverageInformation(content);
    const financial = this.extractFinancialInformation(content);
    const terms = this.extractTermsAndConditions(content);
    const exclusions = this.extractExclusions(content);
    const claimsProcess = this.extractClaimsInformation(content);
    
    return {
      title: policy.title,
      isPolicyDocument,
      documentType,
      policyType,
      coverage,
      financial,
      terms,
      exclusions,
      claimsProcess,
      contentLength: content.length,
      aiSummary: policy.aiSummaryDetailed || policy.aiSummary
    };
  }

  private isPolicyDocument(content: string): boolean {
    // More comprehensive and flexible policy detection
    const strongPolicyIndicators = [
      'coverage', 'premium', 'deductible', 'claim', 'policy', 'insured', 'beneficiary',
      'liability', 'protection', 'exclusions', 'policyholder', 'underwriter'
    ];
    
    const healthPolicyIndicators = [
      'health insurance', 'medical coverage', 'healthcare', 'health plan',
      'copay', 'coinsurance', 'out-of-pocket', 'network provider', 'provider network',
      'prescription', 'pharmacy', 'preventive care', 'emergency care', 'hospital',
      'medical services', 'health benefits', 'member', 'patient', 'doctor visit'
    ];
    
    const insuranceIndicators = [
      'insurance', 'insurance company', 'insurance plan', 'insurer', 'benefits',
      'covered services', 'coverage area', 'enrollment', 'plan documents',
      'summary of benefits', 'evidence of coverage', 'plan year', 'effective date'
    ];
    
    const financialIndicators = [
      'cost', 'fee', 'payment', 'billing', 'reimbursement', 'allowable amount',
      'maximum', 'limit', 'annual', 'monthly', 'percentage', 'dollar amount'
    ];
    
    // Count matches in each category
    const strongMatches = strongPolicyIndicators.filter(indicator => content.includes(indicator)).length;
    const healthMatches = healthPolicyIndicators.filter(indicator => content.includes(indicator)).length;
    const insuranceMatches = insuranceIndicators.filter(indicator => content.includes(indicator)).length;
    const financialMatches = financialIndicators.filter(indicator => content.includes(indicator)).length;
    
    // More flexible criteria:
    // - 2+ strong policy terms, OR
    // - 3+ health-specific terms, OR
    // - 2+ insurance terms + 2+ financial terms, OR
    // - 5+ total relevant terms
    const totalMatches = strongMatches + healthMatches + insuranceMatches + financialMatches;
    
    return strongMatches >= 2 || 
           healthMatches >= 3 || 
           (insuranceMatches >= 2 && financialMatches >= 2) ||
           totalMatches >= 5;
  }

  private extractPolicyType(content: string): string {
    const policyTypes = {
      'health': [
        'health', 'medical', 'healthcare', 'hospital', 'doctor', 'prescription', 'treatment',
        'cigna', 'aetna', 'blue cross', 'humana', 'kaiser', 'united healthcare',
        'preventive care', 'emergency care', 'specialist', 'primary care', 'physician',
        'copay', 'coinsurance', 'deductible', 'out-of-pocket', 'network', 'provider',
        'pharmacy', 'medication', 'medical services', 'health plan', 'member',
        'inpatient', 'outpatient', 'ambulatory', 'urgent care', 'telehealth'
      ],
      'auto': ['auto', 'vehicle', 'car', 'automotive', 'collision', 'comprehensive', 'liability coverage'],
      'home': ['home', 'property', 'dwelling', 'homeowner', 'residence', 'renters'],
      'life': ['life insurance', 'life policy', 'death benefit', 'term life', 'whole life', 'beneficiary'],
      'disability': ['disability', 'income protection', 'unable to work', 'short term disability', 'long term disability'],
      'travel': ['travel', 'trip', 'vacation', 'international coverage', 'trip cancellation']
    };

    let bestMatch = 'general';
    let maxScore = 0;

    for (const [type, keywords] of Object.entries(policyTypes)) {
      const matches = keywords.filter(keyword => content.includes(keyword)).length;
      const score = matches / keywords.length; // Normalized score
      
      if (matches >= 1 && score > maxScore) { // Lowered threshold for better detection
        maxScore = score;
        bestMatch = type;
      }
    }
    
    return bestMatch;
  }

  private extractCoverageInformation(content: string): string[] {
    const coverage = [];
    
    // Enhanced coverage patterns for real policy documents
    const coveragePatterns = [
      // Specific medical coverage
      /(?:covers?|coverage for|includes?|benefits? for)\s+([^.\n]{15,100})/gi,
      /(?:hospital|inpatient|outpatient|emergency|prescription|dental|vision|specialist|surgery|therapy)\s+(?:coverage|care|services?|benefits?)\s*:?\s*([^.\n]{10,80})/gi,
      
      // Insurance-specific coverage
      /(?:policy covers?|insured for|protection against)\s+([^.\n]{15,100})/gi,
      /(?:covered expenses?|eligible expenses?|reimbursable)\s*:?\s*([^.\n]{15,100})/gi,
      
      // Financial coverage limits
      /(?:up to|maximum of|limit of|not to exceed)\s*\$?[\d,]+\s*(?:per|annually|monthly|lifetime)?[^.\n]{0,50}/gi,
      /\$[\d,]+\s*(?:coverage|benefit|limit|maximum|annual|lifetime)[^.\n]{0,50}/gi,
      
      // Percentage coverage
      /(?:pays?|covers?|reimburses?)\s*\d+%[^.\n]{0,50}/gi,
      
      // Specific benefit items
      /(?:deductible|copay|coinsurance|out-of-pocket)\s*:?\s*[^.\n]{10,80}/gi,
      
      // Network and provider coverage
      /(?:in-network|out-of-network|preferred provider|network)\s+[^.\n]{10,80}/gi
    ];

    for (const pattern of coveragePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/^\w+\s*:?\s*/, '').trim();
          if (cleaned.length > 10 && cleaned.length < 150) {
            coverage.push(cleaned);
          }
        });
      }
    }

    // Look for numbered or bulleted coverage lists
    const listPatterns = [
      /(?:•|\*|\d+\.)\s*([^.\n]{20,100})/g,
      /(?:coverage includes?|benefits include?)\s*:?\s*\n?(.{50,500})/gi
    ];

    for (const pattern of listPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const items = match.split(/[,;\n]/).filter(item => item.trim().length > 15);
          coverage.push(...items.slice(0, 3));
        });
      }
    }

    return [...new Set(coverage)].slice(0, 15); // Remove duplicates, max 15 items
  }

  private extractFinancialInformation(content: string): any {
    const financial = {
      premiums: [],
      deductibles: [],
      limits: [],
      copays: [],
      coinsurance: [],
      outOfPocket: []
    };

    // Enhanced premium patterns
    const premiumPatterns = [
      /(?:premium|monthly premium|annual premium)\s*:?\s*\$[\d,]+(?:\.\d{2})?[^\n]{0,30}/gi,
      /monthly\s+(?:cost|fee|payment|premium)\s*:?\s*\$[\d,]+(?:\.\d{2})?[^\n]{0,30}/gi,
      /annual\s+(?:cost|fee|payment|premium)\s*:?\s*\$[\d,]+(?:\.\d{2})?[^\n]{0,30}/gi,
      /premium\s+rates?\s*:?\s*\$[\d,]+[^\n]{0,50}/gi
    ];

    // Enhanced deductible patterns
    const deductiblePatterns = [
      /(?:deductible|annual deductible|yearly deductible)\s*:?\s*\$[\d,]+(?:\.\d{2})?[^\n]{0,40}/gi,
      /(?:individual|family)\s+deductible\s*:?\s*\$[\d,]+[^\n]{0,40}/gi,
      /deductible\s+amount\s*:?\s*\$[\d,]+[^\n]{0,40}/gi
    ];

    // Enhanced coverage limits
    const limitPatterns = [
      /(?:maximum|limit|cap|benefit maximum|annual maximum|lifetime maximum)\s*:?\s*\$[\d,]+(?:\.\d{2})?[^\n]{0,50}/gi,
      /up\s+to\s+\$[\d,]+(?:\.\d{2})?[^\n]{0,50}/gi,
      /\$[\d,]+(?:\.\d{2})?\s+(?:maximum|limit|annual limit|per year|lifetime|per incident)[^\n]{0,50}/gi,
      /coverage\s+limit\s*:?\s*\$[\d,]+[^\n]{0,40}/gi
    ];

    // Enhanced copay patterns
    const copayPatterns = [
      /(?:copay|co-pay|copayment)\s*:?\s*\$[\d,]+(?:\.\d{2})?[^\n]{0,40}/gi,
      /office\s+visit\s*:?\s*\$[\d,]+[^\n]{0,40}/gi,
      /specialist\s+visit\s*:?\s*\$[\d,]+[^\n]{0,40}/gi,
      /emergency\s+room\s*:?\s*\$[\d,]+[^\n]{0,40}/gi
    ];

    // Coinsurance patterns
    const coinsurancePatterns = [
      /(?:coinsurance|co-insurance)\s*:?\s*\d+%[^\n]{0,40}/gi,
      /(?:you pay|patient pays?)\s*\d+%[^\n]{0,40}/gi,
      /\d+%\s*(?:coinsurance|after deductible|of covered expenses)/gi
    ];

    // Out-of-pocket patterns
    const outOfPocketPatterns = [
      /(?:out-of-pocket|out of pocket)\s+(?:maximum|limit)\s*:?\s*\$[\d,]+[^\n]{0,40}/gi,
      /maximum\s+out-of-pocket\s*:?\s*\$[\d,]+[^\n]{0,40}/gi,
      /annual\s+out-of-pocket\s+limit\s*:?\s*\$[\d,]+[^\n]{0,40}/gi
    ];

    // Process all patterns
    const allPatterns = [
      { patterns: premiumPatterns, key: 'premiums' },
      { patterns: deductiblePatterns, key: 'deductibles' },
      { patterns: limitPatterns, key: 'limits' },
      { patterns: copayPatterns, key: 'copays' },
      { patterns: coinsurancePatterns, key: 'coinsurance' },
      { patterns: outOfPocketPatterns, key: 'outOfPocket' }
    ];

    allPatterns.forEach(({ patterns, key }) => {
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.trim();
            if (cleaned.length > 5) {
              financial[key].push(cleaned);
            }
          });
        }
      });
    });

    // Remove duplicates and limit results
    Object.keys(financial).forEach(key => {
      financial[key] = [...new Set(financial[key])].slice(0, 5);
    });

    return financial;
  }

  private extractTermsAndConditions(content: string): string[] {
    const termPatterns = [
      /(?:terms?|conditions?)\s*:?\s*([^.]{15,100})/gi,
      /(?:requirements?|eligibility)\s*:?\s*([^.]{15,100})/gi,
      /(?:waiting period|effective date)\s*:?\s*([^.]{10,80})/gi
    ];

    const terms = [];
    for (const pattern of termPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        terms.push(...matches.slice(0, 3));
      }
    }

    return terms.slice(0, 8);
  }

  private extractExclusions(content: string): string[] {
    const exclusionPatterns = [
      /(?:not covered|excluded?|exclusions?)\s*:?\s*([^.]{15,100})/gi,
      /(?:does not cover|will not pay)\s*([^.]{15,100})/gi,
      /(?:limitations?|restrictions?)\s*:?\s*([^.]{15,100})/gi
    ];

    const exclusions = [];
    for (const pattern of exclusionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        exclusions.push(...matches.slice(0, 3));
      }
    }

    return exclusions.slice(0, 8);
  }

  private extractClaimsInformation(content: string): string[] {
    const claimPatterns = [
      /(?:claim|claims process|filing)\s*:?\s*([^.]{15,100})/gi,
      /(?:submit|file)\s+(?:a\s+)?claim\s*([^.]{10,80})/gi,
      /(?:reimbursement|payment)\s*:?\s*([^.]{15,100})/gi
    ];

    const claims = [];
    for (const pattern of claimPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        claims.push(...matches.slice(0, 3));
      }
    }

    return claims.slice(0, 6);
  }

  private performDeepPolicyComparison(policy1Analysis: any, policy2Analysis: any): any {
    // Compare coverage
    const coverageComparison = this.compareCoverage(policy1Analysis, policy2Analysis);
    
    // Compare financial aspects
    const financialComparison = this.compareFinancials(policy1Analysis, policy2Analysis);
    
    // Compare terms and exclusions
    const termsComparison = this.compareTerms(policy1Analysis, policy2Analysis);
    
    // Generate summary
    const summary = this.generateComparisonSummary(policy1Analysis, policy2Analysis, coverageComparison, financialComparison);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(policy1Analysis, policy2Analysis, coverageComparison, financialComparison);
    
    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore(policy1Analysis, policy2Analysis);

    return {
      summary,
      keyDifferences: [
        ...coverageComparison.differences,
        ...financialComparison.differences,
        ...termsComparison.differences
      ].slice(0, 8),
      recommendations,
      coverageComparison: {
        policy1: this.formatCoverageAnalysis(policy1Analysis),
        policy2: this.formatCoverageAnalysis(policy2Analysis)
      },
      isRelevant: relevanceScore > 40, // More realistic threshold
      relevanceScore
    };
  }

  private compareCoverage(policy1: any, policy2: any): any {
    const differences = [];
    
    if (policy1.coverage.length !== policy2.coverage.length) {
      differences.push(`Coverage breadth: ${policy1.title} has ${policy1.coverage.length} coverage areas vs ${policy2.title} with ${policy2.coverage.length} areas`);
    }
    
    // Compare specific coverage items
    const policy1CoverageText = policy1.coverage.join(' ').toLowerCase();
    const policy2CoverageText = policy2.coverage.join(' ').toLowerCase();
    
    const coverageKeywords = ['hospital', 'emergency', 'prescription', 'dental', 'vision', 'specialist', 'surgery'];
    for (const keyword of coverageKeywords) {
      const p1Has = policy1CoverageText.includes(keyword);
      const p2Has = policy2CoverageText.includes(keyword);
      
      if (p1Has !== p2Has) {
        differences.push(`${keyword.charAt(0).toUpperCase() + keyword.slice(1)} coverage: Available in ${p1Has ? policy1.title : policy2.title} only`);
      }
    }
    
    return { differences: differences.slice(0, 4) };
  }

  private compareFinancials(policy1: any, policy2: any): any {
    const differences = [];
    
    // Compare premium information with actual amounts
    if (policy1.financial.premiums.length > 0 && policy2.financial.premiums.length > 0) {
      differences.push(`Premium comparison: ${policy1.title} - ${policy1.financial.premiums[0]} vs ${policy2.title} - ${policy2.financial.premiums[0]}`);
    } else if (policy1.financial.premiums.length > 0) {
      differences.push(`Premium transparency: ${policy1.title} specifies premiums (${policy1.financial.premiums[0]}) while ${policy2.title} does not`);
    } else if (policy2.financial.premiums.length > 0) {
      differences.push(`Premium transparency: ${policy2.title} specifies premiums (${policy2.financial.premiums[0]}) while ${policy1.title} does not`);
    }
    
    // Compare deductibles with actual amounts
    if (policy1.financial.deductibles.length > 0 && policy2.financial.deductibles.length > 0) {
      differences.push(`Deductible comparison: ${policy1.title} - ${policy1.financial.deductibles[0]} vs ${policy2.title} - ${policy2.financial.deductibles[0]}`);
    } else if (policy1.financial.deductibles.length > 0) {
      differences.push(`Deductible details: ${policy1.title} specifies ${policy1.financial.deductibles[0]} while ${policy2.title} has no clear deductible information`);
    } else if (policy2.financial.deductibles.length > 0) {
      differences.push(`Deductible details: ${policy2.title} specifies ${policy2.financial.deductibles[0]} while ${policy1.title} has no clear deductible information`);
    }
    
    // Compare coverage limits with actual amounts
    if (policy1.financial.limits.length > 0 && policy2.financial.limits.length > 0) {
      differences.push(`Coverage limits: ${policy1.title} - ${policy1.financial.limits[0]} vs ${policy2.title} - ${policy1.financial.limits[0]}`);
    } else if (policy1.financial.limits.length > 0) {
      differences.push(`Coverage transparency: ${policy1.title} specifies limits (${policy1.financial.limits[0]}) while ${policy2.title} lacks clear limits`);
    } else if (policy2.financial.limits.length > 0) {
      differences.push(`Coverage transparency: ${policy2.title} specifies limits (${policy2.financial.limits[0]}) while ${policy1.title} lacks clear limits`);
    }
    
    // Compare copays and coinsurance
    if (policy1.financial.copays.length > 0 || policy2.financial.copays.length > 0) {
      const p1Copay = policy1.financial.copays[0] || 'not specified';
      const p2Copay = policy2.financial.copays[0] || 'not specified';
      differences.push(`Copay structure: ${policy1.title} (${p1Copay}) vs ${policy2.title} (${p2Copay})`);
    }
    
    if (policy1.financial.coinsurance.length > 0 || policy2.financial.coinsurance.length > 0) {
      const p1Coins = policy1.financial.coinsurance[0] || 'not specified';
      const p2Coins = policy2.financial.coinsurance[0] || 'not specified';
      differences.push(`Coinsurance: ${policy1.title} (${p1Coins}) vs ${policy2.title} (${p2Coins})`);
    }
    
    return { differences: differences.slice(0, 5) };
  }

  private compareTerms(policy1: any, policy2: any): any {
    const differences = [];
    
    if (policy1.exclusions.length !== policy2.exclusions.length) {
      differences.push(`Exclusions: ${policy1.title} lists ${policy1.exclusions.length} exclusions vs ${policy2.title} with ${policy2.exclusions.length} exclusions`);
    }
    
    if (policy1.claimsProcess.length !== policy2.claimsProcess.length) {
      differences.push(`Claims process: ${policy1.title} provides ${policy1.claimsProcess.length} claim details vs ${policy2.title} with ${policy2.claimsProcess.length} details`);
    }
    
    return { differences: differences.slice(0, 2) };
  }

  private generateComparisonSummary(policy1: any, policy2: any, coverageComp: any, financialComp: any): string {
    const relevanceScore = this.calculateRelevanceScore(policy1, policy2);
    const totalDifferences = coverageComp.differences.length + financialComp.differences.length;
    
    // Count actual extracted information
    const policy1FinancialItems = Object.values(policy1.financial).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0) as number;
    const policy2FinancialItems = Object.values(policy2.financial).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0) as number;
    
    const policy1DataQuality = policy1.coverage.length + policy1FinancialItems + policy1.exclusions.length;
    const policy2DataQuality = policy2.coverage.length + policy2FinancialItems + policy2.exclusions.length;
    
    // Create more detailed, actionable summaries
    if (relevanceScore >= 80) {
      const strongerPolicy = policy1DataQuality > policy2DataQuality ? policy1.title : policy2.title;
      const strongerDataPoints = Math.max(policy1DataQuality, policy2DataQuality);
      
      return `<div class="summary-excellent">
        <h3>🎯 Comprehensive Policy Analysis Complete</h3>
        <p>These <strong>${policy1.policyType}</strong> policies offer excellent comparison value with <span class="score-highlight">${relevanceScore}%</span> relevance score.</p>
        <p>Our AI analysis successfully extracted <strong>${strongerDataPoints}</strong> detailed data points including specific premiums, deductibles, coverage limits, and exclusions from actual PDF content.</p>
        <p><strong>"${strongerPolicy}"</strong> provides more comprehensive documentation, making this comparison highly reliable for decision-making in critical situations.</p>
      </div>`;
    } else if (relevanceScore >= 60) {
      const betterCoverage = policy1.coverage.length > policy2.coverage.length ? policy1.title : policy2.title;
      const betterFinancial = policy1FinancialItems > policy2FinancialItems ? policy1.title : policy2.title;
      
      return `<div class="summary-good">
        <h3>📊 Detailed Policy Comparison Available</h3>
        <p>Both policies show strong <span class="score-highlight">${relevanceScore}%</span> compatibility with <strong>${totalDifferences}</strong> key differences identified.</p>
        <ul>
          <li><strong>"${betterCoverage}"</strong> offers broader coverage documentation</li>
          <li><strong>"${betterFinancial}"</strong> provides more detailed financial information</li>
        </ul>
        <p>This analysis gives you actionable insights for emergency planning and coverage selection.</p>
      </div>`;
    } else if (relevanceScore >= 40) {
      const moreDetailed = policy1DataQuality > policy2DataQuality ? policy1.title : policy2.title;
      const dataGap = Math.abs(policy1DataQuality - policy2DataQuality);
      
      return `<div class="summary-moderate">
        <h3>⚖️ Moderate Policy Comparison with Actionable Insights</h3>
        <p><span class="score-highlight">${relevanceScore}%</span> relevance allows for meaningful comparison despite document differences.</p>
        <p><strong>"${moreDetailed}"</strong> provides <strong>${dataGap}</strong> more data points, offering clearer terms and conditions.</p>
        <p>While both serve insurance needs, the analysis reveals distinct approaches to coverage and claims processing.</p>
      </div>`;
    } else if (relevanceScore >= 20) {
      return `<div class="summary-limited">
        <h3>📋 Educational Comparison with Limited Decision Value</h3>
        <p><span class="score-highlight">${relevanceScore}%</span> relevance provides basic insights into document differences.</p>
        <p>While these may not be directly comparable policies, the analysis reveals <strong>${Math.max(policy1DataQuality, policy2DataQuality)}</strong> data points that help understand different documentation approaches and policy structures.</p>
      </div>`;
    } else {
      return `<div class="summary-minimal">
        <h3>📄 Document Analysis - Not Comparable as Policies</h3>
        <p><span class="score-highlight">${relevanceScore}%</span> relevance indicates these documents serve different purposes.</p>
        <p>Our analysis found limited policy-specific content but reveals document characteristics that may be informative for understanding their intended use cases.</p>
      </div>`;
    }
  }

  private generateRecommendations(policy1: any, policy2: any, coverageComp: any, financialComp: any): string[] {
    const recommendations = [];
    const relevanceScore = this.calculateRelevanceScore(policy1, policy2);
    
    // Financial analysis recommendations
    if (policy1.financial.premiums.length > 0 && policy2.financial.premiums.length > 0) {
      recommendations.push(`<div class="recommendation-item">
        <span class="rec-icon">💰</span>
        <strong>Premium Comparison</strong>: "${policy1.title}" shows ${policy1.financial.premiums[0]} while "${policy2.title}" shows ${policy2.financial.premiums[0]}. Consider total annual cost including deductibles.
      </div>`);
    } else if (policy1.financial.premiums.length > 0) {
      recommendations.push(`💰 **Premium Transparency**: ${policy1.title} clearly states premiums (${policy1.financial.premiums[0]}) - essential for budgeting emergencies. Request detailed pricing from ${policy2.title}.`);
    } else if (policy2.financial.premiums.length > 0) {
      recommendations.push(`💰 **Premium Transparency**: ${policy2.title} clearly states premiums (${policy2.financial.premiums[0]}) - essential for budgeting emergencies. Request detailed pricing from ${policy1.title}.`);
    }
    
    // Coverage depth recommendations
    if (policy1.coverage.length > policy2.coverage.length + 3) {
      recommendations.push(`🏥 **Coverage Advantage**: ${policy1.title} offers ${policy1.coverage.length} coverage areas vs ${policy2.coverage.length} in ${policy2.title}. Better protection in emergency situations requiring diverse medical services.`);
    } else if (policy2.coverage.length > policy1.coverage.length + 3) {
      recommendations.push(`🏥 **Coverage Advantage**: ${policy2.title} offers ${policy2.coverage.length} coverage areas vs ${policy1.coverage.length} in ${policy1.title}. Better protection in emergency situations requiring diverse medical services.`);
    }
    
    // Deductible recommendations
    if (policy1.financial.deductibles.length > 0 && policy2.financial.deductibles.length > 0) {
      recommendations.push(`🎯 **Deductible Analysis**: Compare ${policy1.financial.deductibles[0]} vs ${policy2.financial.deductibles[0]}. Lower deductibles mean faster coverage activation in critical situations.`);
    } else if (policy1.financial.deductibles.length > 0) {
      recommendations.push(`🎯 **Deductible Clarity**: ${policy1.title} specifies ${policy1.financial.deductibles[0]}. Clear deductible terms are crucial for emergency financial planning.`);
    } else if (policy2.financial.deductibles.length > 0) {
      recommendations.push(`🎯 **Deductible Clarity**: ${policy2.title} specifies ${policy2.financial.deductibles[0]}. Clear deductible terms are crucial for emergency financial planning.`);
    }
    
    // Exclusions recommendations
    if (policy1.exclusions.length > 0 || policy2.exclusions.length > 0) {
      const moreExclusions = policy1.exclusions.length > policy2.exclusions.length ? policy1.title : policy2.title;
      const fewerExclusions = policy1.exclusions.length < policy2.exclusions.length ? policy1.title : policy2.title;
      
      if (Math.abs(policy1.exclusions.length - policy2.exclusions.length) > 2) {
        recommendations.push(`⚠️ **Exclusions Impact**: ${moreExclusions} lists ${Math.max(policy1.exclusions.length, policy2.exclusions.length)} exclusions vs ${Math.min(policy1.exclusions.length, policy2.exclusions.length)} in ${fewerExclusions}. Review exclusions carefully - they determine coverage in critical situations.`);
      }
    }
    
    // Emergency readiness recommendations
    if (relevanceScore >= 70) {
      recommendations.push(`🚨 **Emergency Readiness**: Both policies provide sufficient detail for informed emergency decisions. Keep digital copies accessible and review claim procedures annually.`);
    } else if (relevanceScore >= 40) {
      recommendations.push(`🚨 **Emergency Planning**: Consider requesting additional documentation from your insurance provider to ensure coverage clarity during emergencies.`);
    }
    
    // Actionable next steps
    if (policy1.isPolicyDocument && policy2.isPolicyDocument) {
      recommendations.push(`📋 **Next Steps**: Contact providers directly to clarify any unclear terms, verify current rates, and understand claim procedures for your specific needs.`);
    } else {
      recommendations.push(`📋 **Document Review**: Ensure you're comparing actual policy documents rather than summaries for the most accurate decision-making.`);
    }
    
    return recommendations.slice(0, 6);
  }

  private calculateRelevanceScore(policy1: any, policy2: any): number {
    let score = 0;
    let details = [];
    
    // Content Availability Assessment (25 points)
    const hasPolicy1Content = policy1.contentLength > 500;
    const hasPolicy2Content = policy2.contentLength > 500;
    
    if (hasPolicy1Content && hasPolicy2Content) {
      score += 25;
      details.push('Both documents have substantial content for analysis');
    } else if (hasPolicy1Content || hasPolicy2Content) {
      score += 15;
      details.push('Adequate content available for comparison');
    } else {
      score += 5; // Still give some points for any content
      details.push('Limited content available - basic comparison possible');
    }
    
    // Document Type Compatibility (30 points)
    const bothArePolicies = policy1.isPolicyDocument && policy2.isPolicyDocument;
    const sameDocumentType = policy1.documentType === policy2.documentType;
    const samePolicyType = policy1.policyType === policy2.policyType;
    
    if (bothArePolicies && samePolicyType && policy1.policyType !== 'general') {
      score += 30;
      details.push(`Both are ${policy1.policyType} insurance policies - excellent compatibility`);
    } else if (bothArePolicies && (samePolicyType || sameDocumentType)) {
      score += 25;
      details.push('Both are policy documents with good compatibility');
    } else if (bothArePolicies) {
      score += 20;
      details.push('Both are policy documents - meaningful comparison possible');
    } else if (policy1.isPolicyDocument || policy2.isPolicyDocument) {
      score += 15;
      details.push('One policy document - partial comparison available');
    } else if (sameDocumentType) {
      score += 20;
      details.push(`Both are ${policy1.documentType} documents - comparable content`);
    } else {
      score += 10; // Give reasonable score even for different document types
      details.push('Different document types - content-based comparison available');
    }
    
    // Content Depth and Quality (25 points)
    const policy1DataPoints = this.countDataPoints(policy1);
    const policy2DataPoints = this.countDataPoints(policy2);
    const totalDataPoints = policy1DataPoints + policy2DataPoints;
    
    if (totalDataPoints >= 10) {
      score += 25;
      details.push('Rich data available for comprehensive analysis');
    } else if (totalDataPoints >= 6) {
      score += 20;
      details.push('Good amount of data for detailed comparison');
    } else if (totalDataPoints >= 3) {
      score += 15;
      details.push('Moderate data available for comparison');
    } else {
      score += 10;
      details.push('Basic data available for analysis');
    }
    
    // Comparative Value Assessment (20 points)
    const hasComparableFinancials = (policy1.financial && Object.keys(policy1.financial).length > 0) ||
                                   (policy2.financial && Object.keys(policy2.financial).length > 0);
    const hasComparableCoverage = policy1.coverage.length > 0 || policy2.coverage.length > 0;
    const hasComparableTerms = policy1.terms.length > 0 || policy2.terms.length > 0;
    
    if (hasComparableFinancials && hasComparableCoverage && hasComparableTerms) {
      score += 20;
      details.push('Multiple comparison dimensions available');
    } else if ((hasComparableFinancials && hasComparableCoverage) || 
               (hasComparableCoverage && hasComparableTerms) ||
               (hasComparableFinancials && hasComparableTerms)) {
      score += 15;
      details.push('Multiple aspects available for comparison');
    } else if (hasComparableFinancials || hasComparableCoverage || hasComparableTerms) {
      score += 10;
      details.push('Key aspects available for comparison');
    } else {
      score += 5; // Always give some points for content comparison
      details.push('Content-based comparison available');
    }
    
    const finalScore = Math.max(20, Math.min(score, 100)); // Ensure minimum 20% relevance for any comparison
    
    this.logger.log(`Relevance score for ${policy1.title} vs ${policy2.title}: ${finalScore}% - ${details.join(', ')}`);
    
    return finalScore;
  }

  private countDataPoints(policy: any): number {
    let count = 0;
    
    // Count coverage items
    count += policy.coverage?.length || 0;
    
    // Count financial data items
    if (policy.financial) {
      count += Object.values(policy.financial).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0) as number;
    }
    
    // Count terms and conditions
    count += policy.terms?.length || 0;
    
    // Count exclusions
    count += policy.exclusions?.length || 0;
    
    // Count claims information
    count += policy.claimsProcess?.length || 0;
    
    return count;
  }

  private performDetailedContentAnalysis(policy1: any, policy2: any): any {
    // Analyze content structure and extract key themes
    const policy1Content = this.extractAllContent(policy1);
    const policy2Content = this.extractAllContent(policy2);
    
    // Extract key topics and themes from both documents
    const policy1Topics = this.extractKeyTopics(policy1Content, policy1.title);
    const policy2Topics = this.extractKeyTopics(policy2Content, policy2.title);
    
    // Find shared and unique topics
    const sharedTopics = this.findSharedTopics(policy1Topics, policy2Topics);
    const uniqueToPolicy1 = policy1Topics.filter(topic => !sharedTopics.includes(topic));
    const uniqueToPolicy2 = policy2Topics.filter(topic => !sharedTopics.includes(topic));
    
    // Analyze content depth and structure
    const contentStructure = this.analyzeContentStructure(policy1Content, policy2Content);
    
    // Calculate meaningful similarity based on actual content overlap
    const contentSimilarityScore = this.calculateContentSimilarity(policy1Content, policy2Content, sharedTopics.length);
    
    return {
      policy1Topics,
      policy2Topics,
      sharedTopics,
      uniqueToPolicy1,
      uniqueToPolicy2,
      contentStructure,
      contentSimilarityScore,
      hasUsefulComparison: sharedTopics.length > 0 || contentSimilarityScore > 25
    };
  }

  private extractKeyTopics(content: string, title: string): string[] {
    const topics = [];
    
    // Extract meaningful phrases and concepts
    const topicPatterns = [
      // Technical concepts
      /(?:configure|configuration|setup|installation|implementation)\s+([a-zA-Z\s]{3,30})/gi,
      // Professional skills and technologies
      /(?:experience|expertise|skills?|proficient)\s+(?:in|with|using)\s+([a-zA-Z\s,]+)/gi,
      // Health and insurance terms
      /(?:coverage|treatment|service|benefit|plan)\s+(?:for|of|includes?)\s+([a-zA-Z\s]{5,40})/gi,
      // Specific systems or tools
      /(?:using|with|through)\s+([A-Z][a-zA-Z\s]{5,25})/g,
      // Key features or components
      /(?:includes?|features?|supports?|provides?)\s+([a-z][a-zA-Z\s]{10,50})/gi
    ];

    for (const pattern of topicPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/^(configure|configuration|setup|experience|expertise|skills?|coverage|treatment|using|with|includes?|features?|supports?|provides?)\s*/i, '').trim();
          if (cleaned.length > 5 && cleaned.length < 60) {
            topics.push(cleaned.toLowerCase());
          }
        });
      }
    }

    // Add title-based topics
    if (title) {
      const titleWords = title.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      topics.push(...titleWords);
    }

    // Remove duplicates and return most relevant topics
    return [...new Set(topics)].slice(0, 15);
  }

  private findSharedTopics(topics1: string[], topics2: string[]): string[] {
    const shared = [];
    
    for (const topic1 of topics1) {
      for (const topic2 of topics2) {
        // Direct match
        if (topic1 === topic2) {
          shared.push(topic1);
        }
        // Partial match for longer topics
        else if (topic1.length > 8 && topic2.length > 8) {
          const similarity = this.calculateStringSimilarity(topic1, topic2);
          if (similarity > 0.7) {
            shared.push(topic1);
          }
        }
      }
    }
    
    return [...new Set(shared)];
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private analyzeContentStructure(content1: string, content2: string): any {
    return {
      policy1Length: content1.length,
      policy2Length: content2.length,
      lengthRatio: content1.length / content2.length,
      policy1Sentences: content1.split(/[.!?]+/).length,
      policy2Sentences: content2.split(/[.!?]+/).length,
      averageSentenceLength1: content1.length / content1.split(/[.!?]+/).length,
      averageSentenceLength2: content2.length / content2.split(/[.!?]+/).length
    };
  }

  private calculateContentSimilarity(content1: string, content2: string, sharedTopicsCount: number): number {
    // Base similarity on shared topics
    let similarity = Math.min(sharedTopicsCount * 15, 70);
    
    // Adjust based on content length similarity
    const lengthRatio = Math.min(content1.length, content2.length) / Math.max(content1.length, content2.length);
    similarity += lengthRatio * 20;
    
    // Boost if both documents have substantial content
    if (content1.length > 500 && content2.length > 500) {
      similarity += 10;
    }
    
    return Math.round(Math.min(similarity, 100));
  }

  private generateNonPolicyComparisonSummary(policy1: any, policy2: any, comparison: any): string {
    const { sharedTopics, contentSimilarityScore, contentStructure } = comparison;
    
    if (contentSimilarityScore >= 70) {
      return `📋 **High Content Similarity**: "${policy1.title}" and "${policy2.title}" share ${sharedTopics.length} common topics and have ${contentSimilarityScore}% content overlap. Both documents focus on similar themes and can provide valuable comparison insights despite not being traditional policies.`;
    } else if (contentSimilarityScore >= 40) {
      return `🔍 **Moderate Content Relationship**: "${policy1.title}" and "${policy2.title}" have ${contentSimilarityScore}% content similarity with ${sharedTopics.length} shared topics. The documents cover related areas but serve different specific purposes, offering complementary perspectives on the subject matter.`;
    } else if (sharedTopics.length > 0) {
      return `⚡ **Limited but Meaningful Connection**: While "${policy1.title}" and "${policy2.title}" have only ${contentSimilarityScore}% overall similarity, they share ${sharedTopics.length} key topics: ${sharedTopics.slice(0, 3).join(', ')}. This provides a foundation for understanding their different approaches to related concepts.`;
    } else {
      return `📊 **Content-Based Analysis**: "${policy1.title}" (${Math.round(contentStructure.policy1Length/1000)}k characters) and "${policy2.title}" (${Math.round(contentStructure.policy2Length/1000)}k characters) address different subject areas. While they don't share common topics, the analysis reveals distinct document purposes and target audiences.`;
    }
  }

  private generateSpecificDifferences(policy1: any, policy2: any, comparison: any): string[] {
    const differences = [];
    const { uniqueToPolicy1, uniqueToPolicy2, sharedTopics, contentStructure } = comparison;
    
    // Content focus differences
    if (uniqueToPolicy1.length > 0) {
      differences.push(`"${policy1.title}" unique focus areas: ${uniqueToPolicy1.slice(0, 3).join(', ')}`);
    }
    if (uniqueToPolicy2.length > 0) {
      differences.push(`"${policy2.title}" unique focus areas: ${uniqueToPolicy2.slice(0, 3).join(', ')}`);
    }
    
    // Shared topics
    if (sharedTopics.length > 0) {
      differences.push(`Common ground: Both documents address ${sharedTopics.slice(0, 3).join(', ')}`);
    }
    
    // Content structure differences
    const lengthDiff = Math.abs(contentStructure.policy1Length - contentStructure.policy2Length);
    if (lengthDiff > 1000) {
      const longer = contentStructure.policy1Length > contentStructure.policy2Length ? policy1.title : policy2.title;
      differences.push(`Content depth: "${longer}" is significantly more comprehensive (${Math.round(lengthDiff/1000)}k more characters)`);
    }
    
    // Document complexity
    const complexityDiff = Math.abs(contentStructure.averageSentenceLength1 - contentStructure.averageSentenceLength2);
    if (complexityDiff > 20) {
      const moreComplex = contentStructure.averageSentenceLength1 > contentStructure.averageSentenceLength2 ? policy1.title : policy2.title;
      differences.push(`Writing style: "${moreComplex}" uses more complex sentence structures`);
    }
    
    return differences.slice(0, 6);
  }

  private generateContentBasedRecommendations(policy1: any, policy2: any, comparison: any): string[] {
    const recommendations = [];
    const { sharedTopics, contentSimilarityScore, uniqueToPolicy1, uniqueToPolicy2 } = comparison;
    
    if (contentSimilarityScore >= 60) {
      recommendations.push(`✅ Strong comparison value: These documents complement each other well`);
      recommendations.push(`🔍 Focus on: ${sharedTopics.slice(0, 2).join(' and ')} for detailed comparison`);
    } else if (contentSimilarityScore >= 30) {
      recommendations.push(`⚖️ Moderate comparison value: Useful for understanding different approaches`);
      if (sharedTopics.length > 0) {
        recommendations.push(`📌 Common areas: Compare how each handles ${sharedTopics[0]}`);
      }
    } else {
      recommendations.push(`📚 Educational value: Shows contrasting approaches to different problems`);
      recommendations.push(`🎯 Best used: For understanding scope differences rather than feature comparison`);
    }
    
    if (uniqueToPolicy1.length > 2) {
      recommendations.push(`💡 "${policy1.title}" offers unique insights into ${uniqueToPolicy1.slice(0, 2).join(' and ')}`);
    }
    if (uniqueToPolicy2.length > 2) {
      recommendations.push(`💡 "${policy2.title}" provides specialized coverage of ${uniqueToPolicy2.slice(0, 2).join(' and ')}`);
    }
    
    recommendations.push(`🔎 Consider: Review both documents for comprehensive understanding of the domain`);
    
    return recommendations.slice(0, 6);
  }

  private generateDetailedAnalysis(analysis: any): string[] {
    const details = [];
    
    if (analysis.documentType && analysis.documentType !== 'unknown') {
      details.push(`Document type: ${analysis.documentType}`);
    }
    
    if (analysis.coverage && analysis.coverage.length > 0) {
      details.push(`Key topics: ${analysis.coverage.slice(0, 3).join(', ')}`);
    } else {
      // Extract from the AI summary if available
      const summary = analysis.aiSummary || '';
      if (summary.length > 100) {
        const keyPhrases = summary.match(/\b[A-Z][a-z]+(?:\s+[a-z]+){1,3}\b/g) || [];
        if (keyPhrases.length > 0) {
          details.push(`Key concepts: ${keyPhrases.slice(0, 3).join(', ')}`);
        }
      }
    }
    
    if (analysis.financial && Object.values(analysis.financial).some((arr: any) => arr.length > 0)) {
      details.push(`Financial information: ${Object.entries(analysis.financial).filter(([k, v]: [string, any]) => v.length > 0).map(([k]) => k).join(', ')}`);
    }
    
    if (analysis.contentLength) {
      details.push(`Content depth: ${Math.round(analysis.contentLength / 1000)}k characters, ${analysis.isPolicyDocument ? 'policy structure' : 'general document'}`);
    }
    
    return details.length > 0 ? details : [`Content: ${analysis.title || 'Document analysis'} - specific details available`];
  }

  private performComprehensivePolicyComparison(policy1: any, policy2: any, comparison: any): any {
    // Use the existing deep policy comparison logic
    return this.performDeepPolicyComparison(policy1, policy2);
  }

  private formatCoverageAnalysis(policyAnalysis: any): string[] {
    const analysis = [];
    
    // Policy classification
    if (policyAnalysis.policyType !== 'general') {
      analysis.push(`🏷️ **Policy Classification**: ${policyAnalysis.policyType.charAt(0).toUpperCase() + policyAnalysis.policyType.slice(1)} Insurance Policy`);
    } else {
      analysis.push(`📄 **Document Type**: ${policyAnalysis.documentType || 'General document'}`);
    }
    
    // Coverage analysis
    if (policyAnalysis.coverage.length > 0) {
      analysis.push(`🏥 **Coverage Scope**: ${policyAnalysis.coverage.length} specific coverage areas identified from PDF analysis`);
      
      // Add specific coverage examples
      const topCoverage = policyAnalysis.coverage.slice(0, 4);
      topCoverage.forEach((coverage, index) => {
        const cleanCoverage = coverage.replace(/[^\w\s$,%]/g, '').trim();
        if (cleanCoverage.length > 15) {
          analysis.push(`   ${index + 1}. ${cleanCoverage.substring(0, 80)}${cleanCoverage.length > 80 ? '...' : ''}`);
        }
      });
    } else {
      analysis.push(`🏥 **Coverage Information**: Limited coverage details found in document`);
    }
    
    // Financial transparency
    const totalFinancialItems = Object.values(policyAnalysis.financial).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0) as number;
    if (totalFinancialItems > 0) {
      analysis.push(`💰 **Financial Transparency**: ${totalFinancialItems} financial details extracted`);
      
      if (policyAnalysis.financial.premiums.length > 0) {
        analysis.push(`   💳 Premium: ${policyAnalysis.financial.premiums[0].substring(0, 60)}`);
      }
      if (policyAnalysis.financial.deductibles.length > 0) {
        analysis.push(`   🎯 Deductible: ${policyAnalysis.financial.deductibles[0].substring(0, 60)}`);
      }
      if (policyAnalysis.financial.limits.length > 0) {
        analysis.push(`   📊 Coverage Limit: ${policyAnalysis.financial.limits[0].substring(0, 60)}`);
      }
      if (policyAnalysis.financial.copays.length > 0) {
        analysis.push(`   🏥 Copay: ${policyAnalysis.financial.copays[0].substring(0, 60)}`);
      }
    } else {
      analysis.push(`💰 **Financial Information**: No clear premium or deductible details found`);
    }
    
    // Risk and exclusions
    if (policyAnalysis.exclusions.length > 0) {
      analysis.push(`⚠️ **Risk Exclusions**: ${policyAnalysis.exclusions.length} exclusions identified - critical for emergency planning`);
      analysis.push(`   Review exclusions carefully as they limit coverage in specific situations`);
    } else {
      analysis.push(`⚠️ **Risk Information**: No explicit exclusions found in document`);
    }
    
    // Claims process
    if (policyAnalysis.claimsProcess.length > 0) {
      analysis.push(`📞 **Claims Support**: ${policyAnalysis.claimsProcess.length} claims-related procedures documented`);
    } else {
      analysis.push(`📞 **Claims Information**: Limited claims process documentation found`);
    }
    
    // Document quality assessment
    const qualityScore = policyAnalysis.coverage.length + totalFinancialItems + policyAnalysis.exclusions.length;
    if (qualityScore > 10) {
      analysis.push(`✅ **Documentation Quality**: Excellent (${qualityScore} data points) - suitable for detailed analysis`);
    } else if (qualityScore > 5) {
      analysis.push(`🟡 **Documentation Quality**: Good (${qualityScore} data points) - adequate for comparison`);
    } else {
      analysis.push(`🔴 **Documentation Quality**: Limited (${qualityScore} data points) - may need additional information`);
    }
    
    return analysis.length > 0 ? analysis : ['📄 Limited policy information available in document'];
  }

  private fallbackToBasicAnalysis(policy1: any, policy2: any): any {
    // Basic fallback analysis when AI service fails
    const policy1Text = `${policy1.title} ${policy1.description} ${policy1.content}`.toLowerCase();
    const policy2Text = `${policy2.title} ${policy2.description} ${policy2.content}`.toLowerCase();
    
    // Simple domain matching for relevance
    const domains = ['insurance', 'health', 'auto', 'life', 'property', 'legal', 'financial', 'technology', 'hr'];
    const policy1Domain = domains.find(domain => policy1Text.includes(domain)) || 'general';
    const policy2Domain = domains.find(domain => policy2Text.includes(domain)) || 'general';
    
    const areRelated = policy1Domain === policy2Domain;
    
    if (!areRelated) {
      return {
        summary: `These policies appear to cover different domains (${policy1Domain} vs ${policy2Domain}) and may not be directly comparable.`,
        keyDifferences: [
          'Policies cover different subject areas',
          'Direct comparison may not provide meaningful insights'
        ],
        recommendations: [
          'Consider selecting policies from the same domain for more meaningful comparison',
          'Review each policy individually for their specific benefits'
        ],
        coverageComparison: {
          policy1: ['Policy analysis not available - different domain'],
          policy2: ['Policy analysis not available - different domain']
        },
        isRelevant: false,
        relevanceScore: 25
      };
    }

    return {
      summary: `Both policies appear to be in the ${policy1Domain} domain. Detailed content analysis requires AI service.`,
      keyDifferences: [
        'Detailed comparison requires AI analysis of policy content',
        'Please try again or contact support if this issue persists'
      ],
      recommendations: [
        'AI analysis temporarily unavailable',
        'Manual review of both policies recommended'
      ],
      coverageComparison: {
        policy1: ['Detailed analysis not available'],
        policy2: ['Detailed analysis not available']
      },
      isRelevant: true,
      relevanceScore: 50
    };
  }


  private transformToResponseDto(document: PolicyComparisonDocument): PolicyComparisonResponseDto {
    return {
      _id: document._id.toString(),
      userId: document.userId.toString(),
      policyIds: document.policyIds.map(id => id.toString()),
      comparisonName: document.comparisonName,
      comparisonData: document.comparisonData,
      aiInsights: document.aiInsights,
      isDeleted: document.isDeleted,
      deletedAt: document.deletedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
