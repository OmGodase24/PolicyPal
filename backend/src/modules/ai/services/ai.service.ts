import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import * as fs from 'fs';
import { UploadResponse, AnswerResponse } from '../dto/ai.dto';
import { Policy, PolicyDocument } from '../../policies/schemas/policy.schema';
import { ChatHistory, ChatHistoryDocument } from '../../policies/schemas/chat-history.schema';
import { SummaryLevel, SummaryLevelResponse, PolicySummaryInfo } from '../dto/summary-level.dto';
import { CacheInvalidationService } from '../../../common/services/cache-invalidation.service';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectModel(Policy.name) private readonly policyModel: Model<PolicyDocument>,
    @InjectModel(ChatHistory.name) private readonly chatHistoryModel: Model<ChatHistoryDocument>,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup temporary file ${filePath}: ${error.message}`);
    }
  }

  async uploadPolicyDocument(
    file: Express.Multer.File,
    userId: string,
    policyId?: string,
  ): Promise<UploadResponse> {
    try {
      this.logger.log(`🚀 Starting AI service upload for policy ${policyId} by user ${userId}`);
      this.logger.log(`📁 File: ${file.originalname}, Size: ${file.size}, Type: ${file.mimetype}`);
      
      // Create form data for multipart upload
      const formData = new FormData();
      
      // Use file buffer instead of file.path for better compatibility
      if (file.buffer) {
        formData.append('file', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        this.logger.log(`📦 Using file buffer (${file.buffer.length} bytes)`);
      } else if (file.path) {
        formData.append('file', fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        this.logger.log(`📁 Using file path: ${file.path}`);
      } else {
        throw new Error('File has no buffer or path');
      }
      
      if (userId) formData.append('user_id', userId);
      if (policyId) formData.append('policy_id', policyId);

      this.logger.log(`🌐 Calling AI service at: ${this.aiServiceUrl}/upload-policy`);
      this.logger.log(`📤 Form data fields: user_id=${userId}, policy_id=${policyId}`);

      // Send to AI service
      this.logger.log(`📤 Sending request to AI service...`);
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/upload-policy`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 300000, // 5 minutes for large files
        }),
      );

      this.logger.log(`✅ AI service response received:`, response.data);

      // Clean up temporary file if it exists
      if (file.path) {
        this.cleanupTempFile(file.path);
      }

      // Map AI service response to our interface
      return {
        documentId: response.data.document_id,
        filename: file.originalname,
        status: 'success',
        message: response.data.message,
        extracted_text: response.data.extracted_text,
        text_length: response.data.text_length,
        chunks_created: response.data.chunks_created
      };
    } catch (error) {
      this.logger.error(`❌ Failed to upload policy: ${error.message}`, error.stack);
      this.logger.error(`❌ Error details:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Clean up temporary file on error if it exists
      if (file.path) {
        this.cleanupTempFile(file.path);
      }
      
      throw new Error(`AI service upload failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async askQuestion(
    question: string,
    userId: string,
    policyId?: string,
    sessionId?: string,
    history?: Array<{ role: string; content: string; timestamp?: string }>,
    images?: string[],
  ): Promise<AnswerResponse> {
    try {
      // Merge server-side history (from DB) with provided history
      const mergedHistory = await this.buildServerSideHistory(userId, sessionId, history);

      // Prepend a system instruction to explicitly guide the model to use history effectively
      const systemInstruction = {
        role: 'system',
        content:
          'Use the provided history to resolve pronouns and continue the same topic. Do not restate the entire document each turn; answer concisely and reference earlier answers when relevant.'
      } as any;

      const requestData: any = {
        question,
        user_id: userId,
        policy_id: policyId,
      };
      if (sessionId) {
        requestData.session_id = sessionId;
      }
      if (mergedHistory && mergedHistory.length > 0) {
        requestData.history = [systemInstruction, ...mergedHistory];
      }
      if (images && images.length > 0) {
        requestData.images = images;
      }

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/ask-question`, requestData, {
          timeout: 120000, // 2 minutes for AI processing
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to ask question: ${error.message}`, error.stack);
      throw new Error(`AI service question failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  private async buildServerSideHistory(
    userId: string,
    sessionId?: string,
    provided?: Array<{ role: string; content: string; timestamp?: string }>,
  ): Promise<Array<{ role: string; content: string; timestamp?: string }>> {
    const maxTurns = 12; // slightly more than frontend fallback

    const providedSafe = Array.isArray(provided) ? provided.slice(-maxTurns) : [];

    if (!sessionId) {
      return providedSafe;
    }

    // Pull last N Q&A pairs from DB for this session
    const chats = await this.chatHistoryModel
      .find({ sessionId, userId })
      .sort({ createdAt: 1 })
      .limit(50)
      .exec();

    const dbHistory: Array<{ role: string; content: string; timestamp?: string }> = [];
    for (const ch of chats) {
      // Push user question
      if (ch.question) {
        dbHistory.push({ role: 'user', content: ch.question, timestamp: ch.createdAt?.toISOString?.() });
      }
      // Push assistant answer
      if (ch.answer) {
        dbHistory.push({ role: 'assistant', content: ch.answer, timestamp: ch.createdAt?.toISOString?.() });
      }
    }

    // Merge DB history with any provided (favor most recent)
    const merged = [...dbHistory, ...providedSafe];
    return merged.slice(-maxTurns);
  }

  async getUserPolicies(userId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/policies/${userId}`, {
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get user policies: ${error.message}`, error.stack);
      throw new Error(`AI service get policies failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getPublishedPolicies(userId: string): Promise<any[]> {
    try {
      this.logger.log(`Getting published policies for user: ${userId}`);
      
      // Get policies from our database first
      const policies = await this.policyModel.find({ createdBy: userId, status: 'publish' }).exec();
      this.logger.log(`Found ${policies.length} published policies for user ${userId}`);
      
      // Filter only published policies with PDFs and exclude expired ones
      const publishedPolicies = policies.filter(policy => {
        if (!policy.hasPDF) return false;
        
        // Check if policy is expired
        const lifecycleInfo = this.calculatePolicyLifecycle(policy);
        return !lifecycleInfo.isExpired;
      });
      this.logger.log(`Found ${publishedPolicies.length} published policies with PDFs (non-expired) for user ${userId}`);

      // Return policies directly without checking AI service
      // The AI service check was causing 404 errors for policies not yet uploaded
      const processedPolicies = publishedPolicies.map(policy => ({
        ...policy.toObject(),
        aiProcessed: false, // Will be processed when chat session starts
        aiDocumentId: null
      }));

      this.logger.log(`Returning ${processedPolicies.length} published policies for user ${userId}`);
      this.logger.log(`Policy details:`, processedPolicies.map(p => ({
        id: p._id,
        title: p.title,
        hasPDF: p.hasPDF,
        aiProcessed: p.aiProcessed
      })));
      
      return processedPolicies;
    } catch (error) {
      this.logger.error(`Failed to get published policies: ${error.message}`, error.stack);
      throw new Error(`Failed to get published policies: ${error.message}`);
    }
  }

  /**
   * Calculate policy lifecycle based on expiry date
   */
  private calculatePolicyLifecycle(policy: any): {
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

  async startChatSession(userId: string, policyId: string): Promise<any> {
    try {
      this.logger.log(`Starting chat session for user: ${userId}, policy: ${policyId}`);
      
      // Validate ObjectId format
      if (!policyId || !/^[0-9a-fA-F]{24}$/.test(policyId)) {
        this.logger.error(`Invalid policy ID format: ${policyId}`);
        throw new Error('Invalid policy ID format');
      }

      // Generate a unique session ID
      const sessionId = `chat_${userId}_${policyId}_${Date.now()}`;
      this.logger.log(`Generated session ID: ${sessionId}`);
      
      // Get policy details with better error handling
      const policy = await this.policyModel.findOne({ 
        _id: policyId, 
        createdBy: userId,
        status: 'publish' // Only allow chat for published policies
      }).exec();
      
      this.logger.log(`Policy lookup result: ${policy ? 'Found' : 'Not found'}`);
      
      if (!policy) {
        // Check if policy exists but doesn't belong to user
        const existingPolicy = await this.policyModel.findById(policyId).exec();
        this.logger.log(`Existing policy check: ${existingPolicy ? 'Exists' : 'Not exists'}`);
        
        if (!existingPolicy) {
          this.logger.error(`Policy ${policyId} not found in database`);
          throw new Error('Policy not found');
        } else if (existingPolicy.createdBy.toString() !== userId) {
          this.logger.error(`Policy ${policyId} belongs to user ${existingPolicy.createdBy}, not ${userId}`);
          throw new Error('Policy access denied - you can only chat about your own policies');
        } else if (existingPolicy.status !== 'publish') {
          this.logger.error(`Policy ${policyId} has status ${existingPolicy.status}, not 'publish'`);
          throw new Error('Policy must be published to start a chat session');
        }
      }

      // Get or generate policy summary
      let summary = '';
      try {
        // Force generation of a new AI summary instead of retrieving old one
        this.logger.log(`Generating new AI summary for policy: ${policyId}`);
        const summaryResponse = await this.getPolicySummary(userId, policyId);
        summary = summaryResponse.summary || summaryResponse.data?.summary || '';
        this.logger.log(`New AI summary generated: ${summary.substring(0, 100)}...`);
      } catch (error) {
        // If AI summary generation fails, throw error instead of falling back
        this.logger.error(`AI summary generation failed: ${error.message}`);
        throw new Error(`Failed to generate AI summary: ${error.message}`);
      }

      // Create chat session data
      const sessionData = {
        sessionId,
        policyId,
        userId,
        policyTitle: policy.title,
        policyDescription: policy.description,
        summary,
        startedAt: new Date(),
        messages: []
      };

      this.logger.log(`Chat session created successfully for policy: ${policy.title}`);
      return sessionData;
    } catch (error) {
      this.logger.error(`Failed to start chat session: ${error.message}`, error.stack);
      throw new Error(`Failed to start chat session: ${error.message}`);
    }
  }

  async getPolicySummary(userId: string, policyId: string): Promise<any> {
    try {
      this.logger.log(`Getting policy summary for user: ${userId}, policy: ${policyId}`);
      
      // Validate ObjectId format
      if (!policyId || !/^[0-9a-fA-F]{24}$/.test(policyId)) {
        this.logger.error(`Invalid policy ID format: ${policyId}`);
        throw new Error('Invalid policy ID format');
      }

      // Get policy details
      const policy = await this.policyModel.findOne({ 
        _id: policyId, 
        createdBy: userId,
        hasPDF: true
      }).exec();
      
      if (!policy) {
        this.logger.error(`Policy not found or no PDF: ${policyId}`);
        throw new Error('Policy not found or no PDF');
      }

      // Check if summary already exists to avoid unnecessary API calls
      if (policy.aiSummary && policy.aiSummary.trim().length > 0) {
        this.logger.log(`Found existing summary for policy: ${policyId}, returning saved summary`);
        return { summary: policy.aiSummary };
      }

      // Generate new summary only if none exists
      this.logger.log(`No existing summary found, generating new AI summary for policy: ${policyId}`);
      this.logger.log(`Calling AI service at: ${this.aiServiceUrl}/summarize-policy`);
      
      // Generate new summary using AI service
      const summaryRequest = {
        user_id: userId,
        policy_id: policyId
      };

      this.logger.log(`Summary request payload: ${JSON.stringify(summaryRequest)}`);

      try {
        const summaryResponse = await firstValueFrom(
          this.httpService.post(`${this.aiServiceUrl}/summarize-policy`, summaryRequest, {
            timeout: 30000,
          }),
        );

        this.logger.log(`AI service response received: ${JSON.stringify(summaryResponse.data)}`);

        if (summaryResponse.data && summaryResponse.data.summary) {
          // Update policy with new summary
          await this.policyModel.findByIdAndUpdate(policyId, {
            aiSummary: summaryResponse.data.summary,
            aiSummaryGeneratedAt: new Date()
          });

          this.logger.log(`Generated and stored new summary for policy: ${policyId}`);
          return { summary: summaryResponse.data.summary };
        } else {
          this.logger.error(`AI service returned invalid response: ${JSON.stringify(summaryResponse.data)}`);
          throw new Error('AI service returned invalid response');
        }
      } catch (httpError) {
        this.logger.error(`HTTP call to AI service failed: ${httpError.message}`);
        this.logger.error(`HTTP error details: ${JSON.stringify(httpError.response?.data)}`);
        throw new Error(`AI service HTTP call failed: ${httpError.message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to get policy summary: ${error.message}`, error.stack);
      throw new Error(`Failed to get policy summary: ${error.message}`);
    }
  }

  async processExistingPolicy(userId: string, policyId: string): Promise<any> {
    try {
      this.logger.log(`Processing existing policy with AI service: ${policyId}`);
      
      // Validate ObjectId format
      if (!policyId || !/^[0-9a-fA-F]{24}$/.test(policyId)) {
        this.logger.error(`Invalid policy ID format: ${policyId}`);
        throw new Error('Invalid policy ID format');
      }

      // Get policy details
      const policy = await this.policyModel.findOne({ 
        _id: policyId, 
        createdBy: userId,
        hasPDF: true
      }).exec();
      
      if (!policy) {
        this.logger.error(`Policy not found or no PDF: ${policyId}`);
        throw new Error('Policy not found or no PDF');
      }

      // Check if policy is already processed
      if (policy.pdfProcessed) {
        this.logger.log(`Policy ${policyId} is already processed`);
        return { message: 'Policy already processed', policyId };
      }

      // Check if we have stored PDF text
      if (!policy.pdfText || policy.pdfText.trim() === '') {
        this.logger.log(`Policy ${policyId} has no stored PDF text, needs PDF re-upload`);
        return { 
          message: 'Policy needs PDF re-upload for AI processing', 
          policyId,
          needsReupload: true 
        };
      }

      // Process the stored PDF text with AI service
      try {
        this.logger.log(`Processing stored PDF text for policy: ${policyId}`);
        
        // Create a mock file object with the stored text
        const mockFile: Express.Multer.File = {
          buffer: Buffer.from(policy.pdfText),
          originalname: policy.pdfFilename || 'stored_policy.pdf',
          mimetype: 'text/plain',
          fieldname: 'file',
          encoding: '7bit',
          size: Buffer.from(policy.pdfText).length,
          stream: null as any,
          destination: '',
          filename: policy.pdfFilename || 'stored_policy.pdf',
          path: ''
        };

        // Upload to AI service using stored text
        await this.uploadPolicyDocument(mockFile, userId, policyId);
        
        // Update policy to mark as processed
        await this.policyModel.findByIdAndUpdate(policyId, { pdfProcessed: true });
        
        this.logger.log(`Policy ${policyId} processed successfully with stored PDF text`);
        return { 
          message: 'Policy processed successfully with stored PDF text', 
          policyId,
          processed: true
        };
      } catch (error) {
        this.logger.error(`Failed to process policy ${policyId} with AI service: ${error.message}`);
        throw new Error(`Failed to process policy with AI service: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process existing policy: ${error.message}`, error.stack);
      throw new Error(`Failed to process existing policy: ${error.message}`);
    }
  }

  async processAllExistingPolicies(userId: string): Promise<any> {
    try {
      this.logger.log(`Processing all existing policies for user: ${userId}`);
      
      // Find all policies with PDFs that haven't been processed
      const policies = await this.policyModel.find({ 
        createdBy: userId,
        hasPDF: true,
        pdfProcessed: false
      }).exec();
      
      this.logger.log(`Found ${policies.length} policies with PDFs that need processing`);
      
      if (policies.length === 0) {
        return { 
          message: 'No policies need processing', 
          processedCount: 0,
          totalCount: 0
        };
      }

      // Process policies that have stored PDF text
      const results = [];
      let processedCount = 0;
      
      for (const policy of policies) {
        try {
          if (policy.pdfText && policy.pdfText.trim() !== '') {
            // Process this policy
            const result = await this.processExistingPolicy(userId, policy._id.toString());
            results.push(result);
            if (result.processed) {
              processedCount++;
            }
          } else {
            results.push({
              policyId: policy._id.toString(),
              message: 'No stored PDF text available',
              needsReupload: true
            });
          }
        } catch (error) {
          this.logger.error(`Failed to process policy ${policy._id}: ${error.message}`);
          results.push({
            policyId: policy._id.toString(),
            message: `Failed to process: ${error.message}`,
            error: true
          });
        }
      }
      
      this.logger.log(`Processed ${processedCount} out of ${policies.length} policies`);
      return { 
        message: `Processed ${processedCount} out of ${policies.length} policies`, 
        processedCount,
        totalCount: policies.length,
        results
      };
    } catch (error) {
      this.logger.error(`Failed to process all existing policies: ${error.message}`, error.stack);
      throw new Error(`Failed to process all existing policies: ${error.message}`);
    }
  }

  async getPolicy(documentId: string, userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/policy/${documentId}`, {
          params: { user_id: userId },
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      
      this.logger.error(`Failed to get policy: ${error.message}`, error.stack);
      throw new Error(`AI service get policy failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async deletePolicy(documentId: string, userId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.aiServiceUrl}/policy/${documentId}`, {
          params: { user_id: userId },
          timeout: 10000,
        }),
      );

      return response.data.success || false;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      
      this.logger.error(`Failed to delete policy: ${error.message}`, error.stack);
      throw new Error(`AI service delete policy failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getUserStats(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/stats/${userId}`, {
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get user stats: ${error.message}`, error.stack);
      throw new Error(`AI service get stats failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async summarizePolicy(policyId: string, userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/summarize-policy`, {
          policy_id: policyId,
          user_id: userId,
        }, {
          timeout: 30000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to summarize policy: ${error.message}`, error.stack);
      throw new Error(`AI service summarize failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async clearPolicySummary(policyId: string, userId: string): Promise<any> {
    try {
      this.logger.log(`Clearing AI summary for policy: ${policyId}`);
      
      // Verify policy ownership
      const policy = await this.policyModel.findOne({ 
        _id: policyId, 
        createdBy: userId 
      }).exec();
      
      if (!policy) {
        throw new Error('Policy not found or access denied');
      }
      
      // Clear the old summary
      await this.policyModel.findByIdAndUpdate(policyId, {
        $unset: { aiSummary: 1, aiSummaryGeneratedAt: 1 }
      });
      
      // Invalidate AI cache for this policy
      await this.cacheInvalidationService.invalidateAiCache(userId, policyId);
      
      this.logger.log(`AI summary cleared for policy: ${policyId}`);
      return { message: 'AI summary cleared successfully' };
    } catch (error) {
      this.logger.error(`Failed to clear AI summary: ${error.message}`);
      throw new Error(`Failed to clear AI summary: ${error.message}`);
    }
  }

  /**
   * Invalidate specific policy summary cache
   */
  async invalidatePolicySummaryCache(userId: string, policyId: string, level?: string): Promise<void> {
    try {
      if (level) {
        // Invalidate specific level cache
        await this.cacheInvalidationService.invalidateSpecificPolicy(userId, policyId);
      } else {
        // Invalidate all AI cache for this policy
        await this.cacheInvalidationService.invalidateAiCache(userId, policyId);
      }
      this.logger.log(`AI summary cache invalidated for policy: ${policyId}${level ? ` (level: ${level})` : ''}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate AI summary cache: ${error.message}`);
      // Don't throw error as this is not critical
    }
  }

  async comparePolicies(policyIds: string[], userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/compare-policies`, {
          policy_ids: policyIds,
          user_id: userId,
        }, {
          timeout: 30000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to compare policies: ${error.message}`, error.stack);
      throw new Error(`AI service compare failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getPolicyDocument(documentId: string, userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/policies/${documentId}`, {
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get policy document: ${error.message}`, error.stack);
      throw new Error(`AI service get document failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async deletePolicyDocument(documentId: string, userId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.aiServiceUrl}/policies/${documentId}`, {
          timeout: 10000,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete policy document: ${error.message}`, error.stack);
      throw new Error(`AI service delete document failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getStats(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/stats`, {
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get stats: ${error.message}`, error.stack);
      throw new Error(`AI service get stats failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/health`, {
          timeout: 5000,
        }),
      );

      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.error(`AI service health check failed: ${error.message}`);
      return false;
    }
  }

  // New method for multi-level summaries
  async getPolicySummaryByLevel(userId: string, policyId: string, level: SummaryLevel): Promise<SummaryLevelResponse> {
    try {
      this.logger.log(`Getting ${level} summary for user: ${userId}, policy: ${policyId}`);
      
      // Validate ObjectId format
      if (!policyId || !/^[0-9a-fA-F]{24}$/.test(policyId)) {
        this.logger.error(`Invalid policy ID format: ${policyId}`);
        throw new Error('Invalid policy ID format');
      }

      // Get policy details
      const policy = await this.policyModel.findOne({ 
        _id: policyId, 
        createdBy: userId,
        hasPDF: true
      }).exec();
      
      if (!policy) {
        this.logger.error(`Policy not found or no PDF: ${policyId}`);
        throw new Error('Policy not found or no PDF');
      }

      // Check if summary for this level already exists
      const existingSummary = this.getSummaryByLevel(policy, level);
      if (existingSummary && existingSummary.trim().length > 0) {
        this.logger.log(`Found existing ${level} summary for policy: ${policyId}, returning saved summary`);
        return { 
          summary: existingSummary, 
          level, 
          generatedAt: this.getSummaryGeneratedAtByLevel(policy, level),
          isNewGeneration: false 
        };
      }

      // Generate new summary for this level
      this.logger.log(`No existing ${level} summary found, generating new AI summary for policy: ${policyId}`);
      
      const summary = await this.generateSummaryByLevel(policy, level);
      
      // Update policy with new summary for this level
      const updateData = this.getUpdateDataForLevel(level, summary);
      await this.policyModel.updateOne(
        { _id: policyId },
        updateData
      ).exec();

      this.logger.log(`Successfully updated policy ${policyId} with new ${level} summary`);
      return { 
        summary, 
        level, 
        generatedAt: new Date(),
        isNewGeneration: true 
      };
    } catch (error) {
      this.logger.error(`Error in getPolicySummaryByLevel: ${error.message}`);
      throw error;
    }
  }

  // Get all summary levels info for a policy
  async getPolicySummaryInfo(userId: string, policyId: string): Promise<PolicySummaryInfo> {
    try {
      this.logger.log(`Getting summary info for user: ${userId}, policy: ${policyId}`);
      
      // Validate ObjectId format
      if (!policyId || !/^[0-9a-fA-F]{24}$/.test(policyId)) {
        this.logger.error(`Invalid policy ID format: ${policyId}`);
        throw new Error('Invalid policy ID format');
      }

      // Get policy details
      const policy = await this.policyModel.findOne({ 
        _id: policyId, 
        createdBy: userId,
        hasPDF: true
      }).exec();
      
      if (!policy) {
        this.logger.error(`Policy not found or no PDF: ${policyId}`);
        throw new Error('Policy not found or no PDF');
      }

      return {
        brief: {
          summary: policy.aiSummaryBrief || '',
          generatedAt: policy.aiSummaryBriefGeneratedAt || new Date(),
          exists: !!(policy.aiSummaryBrief && policy.aiSummaryBrief.trim().length > 0)
        },
        standard: {
          summary: policy.aiSummaryStandard || '',
          generatedAt: policy.aiSummaryStandardGeneratedAt || new Date(),
          exists: !!(policy.aiSummaryStandard && policy.aiSummaryStandard.trim().length > 0)
        },
        detailed: {
          summary: policy.aiSummaryDetailed || '',
          generatedAt: policy.aiSummaryDetailedGeneratedAt || new Date(),
          exists: !!(policy.aiSummaryDetailed && policy.aiSummaryDetailed.trim().length > 0)
        },
        currentLevel: (policy.currentSummaryLevel as SummaryLevel) || SummaryLevel.STANDARD
      };
    } catch (error) {
      this.logger.error(`Error in getPolicySummaryInfo: ${error.message}`);
      throw error;
    }
  }

  // Helper methods
  private getSummaryByLevel(policy: PolicyDocument, level: SummaryLevel): string {
    switch (level) {
      case SummaryLevel.BRIEF:
        return policy.aiSummaryBrief || '';
      case SummaryLevel.STANDARD:
        return policy.aiSummaryStandard || '';
      case SummaryLevel.DETAILED:
        return policy.aiSummaryDetailed || '';
      default:
        return '';
    }
  }

  private getSummaryGeneratedAtByLevel(policy: PolicyDocument, level: SummaryLevel): Date {
    switch (level) {
      case SummaryLevel.BRIEF:
        return policy.aiSummaryBriefGeneratedAt || new Date();
      case SummaryLevel.STANDARD:
        return policy.aiSummaryStandardGeneratedAt || new Date();
      case SummaryLevel.DETAILED:
        return policy.aiSummaryDetailedGeneratedAt || new Date();
      default:
        return new Date();
    }
  }

  private async generateSummaryByLevel(policy: PolicyDocument, level: SummaryLevel): Promise<string> {
    const prompts = {
      [SummaryLevel.BRIEF]: `Provide a brief 3-4 bullet point summary of this policy focusing only on key terms, coverage amounts, and deductibles. Keep it concise and easy to scan.`,
      [SummaryLevel.STANDARD]: `Provide a comprehensive summary of this policy covering main sections, key terms, coverage details, and important clauses. Include coverage limits, deductibles, and key exclusions.`,
      [SummaryLevel.DETAILED]: `Provide a detailed legal summary of this policy including all sections, terms, conditions, exclusions, coverage limits, deductibles, procedural requirements, and any special provisions. This should be comprehensive enough for legal review.`
    };

    this.logger.log(`Generating ${level} summary using AI service`);
    
    const summaryRequest = {
      user_id: policy.createdBy.toString(),
      policy_id: policy._id.toString(),
      prompt: prompts[level]
    };

    try {
      const summaryResponse = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/summarize-policy`, summaryRequest)
      );

      if (summaryResponse.data && summaryResponse.data.summary) {
        return summaryResponse.data.summary;
      } else {
        throw new Error('Invalid response from AI service');
      }
    } catch (error) {
      this.logger.error(`Error generating ${level} summary: ${error.message}`);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  private getUpdateDataForLevel(level: SummaryLevel, summary: string): any {
    const now = new Date();
    switch (level) {
      case SummaryLevel.BRIEF:
        return {
          aiSummaryBrief: summary,
          aiSummaryBriefGeneratedAt: now,
          currentSummaryLevel: level
        };
      case SummaryLevel.STANDARD:
        return {
          aiSummaryStandard: summary,
          aiSummaryStandardGeneratedAt: now,
          currentSummaryLevel: level
        };
      case SummaryLevel.DETAILED:
        return {
          aiSummaryDetailed: summary,
          aiSummaryDetailedGeneratedAt: now,
          currentSummaryLevel: level
        };
      default:
        return {};
    }
  }

  // Compliance Checking Methods
  async checkCompliance(
    policyId: string,
    userId: string,
    regulationFramework: string = 'insurance_standards'
  ): Promise<any> {
    try {
      this.logger.log(`🔍 Checking compliance for policy ${policyId} against ${regulationFramework}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/compliance/check`, {
          policy_id: policyId,
          user_id: userId,
          regulation_framework: regulationFramework
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to check compliance: ${error.message}`);
      throw new Error(`Compliance check failed: ${error.message}`);
    }
  }

  async getAvailableRegulations(): Promise<any> {
    try {
      this.logger.log(`📋 Getting available regulations from AI service`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/compliance/regulations`)
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get regulations: ${error.message}`);
      throw new Error(`Failed to get regulations: ${error.message}`);
    }
  }

  async checkComplianceFromFile(
    file: Express.Multer.File,
    policyId: string,
    userId: string,
    regulationFramework: string = 'insurance_standards'
  ): Promise<any> {
    try {
      this.logger.log(`🔍 Checking compliance from file for policy ${policyId} against ${regulationFramework}`);

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
      formData.append('policy_id', policyId);
      formData.append('user_id', userId);
      formData.append('regulation_framework', regulationFramework);

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/compliance/check-file`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to check compliance from file: ${error.message}`);
      throw new Error(`Compliance check from file failed: ${error.message}`);
    }
  }

  async refreshCompliance(
    policyId: string,
    userId: string,
    regulationFramework: string = 'insurance_standards'
  ): Promise<any> {
    try {
      this.logger.log(`🔄 Refreshing compliance for policy ${policyId} against ${regulationFramework}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/compliance/refresh`, {
          policy_id: policyId,
          user_id: userId,
          regulation_framework: regulationFramework
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to refresh compliance: ${error.message}`);
      throw error;
    }
  }

  async getComplianceHistory(
    policyId: string,
    userId: string
  ): Promise<any> {
    try {
      this.logger.log(`📊 Getting compliance history for policy ${policyId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/compliance/history/${policyId}?user_id=${userId}`)
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get compliance history: ${error.message}`);
      throw error;
    }
  }

  // Language Detection and Translation Methods
  async detectLanguage(text: string): Promise<any> {
    try {
      this.logger.log(`🔍 Detecting language for text: ${text.substring(0, 100)}...`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/detect-language`, {
          text: text
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to detect language: ${error.message}`);
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  async translateText(text: string, targetLanguage: string, sourceLanguage: string = 'auto'): Promise<any> {
    try {
      this.logger.log(`🌐 Translating text to ${targetLanguage} from ${sourceLanguage}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/translate`, {
          text: text,
          target_language: targetLanguage,
          source_language: sourceLanguage
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to translate text: ${error.message}`);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  async getSupportedLanguages(): Promise<any> {
    try {
      this.logger.log(`🌐 Getting supported languages`);

      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/supported-languages`)
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get supported languages: ${error.message}`);
      throw new Error(`Failed to get supported languages: ${error.message}`);
    }
  }
}