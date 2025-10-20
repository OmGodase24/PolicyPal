import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PoliciesRepository } from '../repositories/policies.repository';
import { CreatePolicyDto } from '../dto/create-policy.dto';
import { UpdatePolicyDto } from '../dto/update-policy.dto';
import { PolicyResponseDto } from '../dto/policy-response.dto';
import { PolicyDocument } from '../schemas/policy.schema';
import { PublishPolicyDto } from '../dto/publish-policy.dto';
import { AIService } from '../../ai/services/ai.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationType, NotificationPriority } from '../../notifications/schemas/notification.schema';
import { CacheInvalidationService } from '../../../common/services/cache-invalidation.service';

@Injectable()
export class PoliciesService {
  constructor(
    private readonly policiesRepository: PoliciesRepository,
    private readonly aiService: AIService,
    private readonly notificationsService: NotificationsService,
    private readonly cacheInvalidationService: CacheInvalidationService
  ) {}

  async create(createPolicyDto: CreatePolicyDto, userId: string): Promise<PolicyResponseDto> {
    // PDF is mandatory for all policies - this method should not be used directly
    // Use createWithPDF instead for all policy creation
    throw new BadRequestException('PDF is mandatory for policy creation. Please use the PDF upload endpoint.');
  }

  async createWithPDF(createPolicyDto: CreatePolicyDto, pdf: Express.Multer.File, userId: string): Promise<PolicyResponseDto> {
    // Debug logging
    console.log('Service received createPolicyDto:', createPolicyDto);
    console.log('Service received pdf:', pdf?.originalname);
    console.log('PDF file object in service:', {
      originalname: pdf?.originalname,
      mimetype: pdf?.mimetype,
      size: pdf?.size,
      buffer: pdf?.buffer ? 'Buffer exists' : 'No buffer',
      path: pdf?.path || 'No path'
    });
    
    // PDF is mandatory for all policies
    if (!pdf) {
      throw new BadRequestException('PDF is required to create a policy');
    }

    // Create policy with PDF metadata and binary data - respect user's status choice
    const policyWithPDF = {
      ...createPolicyDto,
      hasPDF: true,
      pdfProcessed: false,
      pdfFilename: pdf.originalname,
      pdfSize: pdf.size,
      pdfData: pdf.buffer, // Store PDF binary data
    };
    
    console.log('Service created policyWithPDF:', policyWithPDF);

    const policy = await this.policiesRepository.create(policyWithPDF, userId);
    console.log('Policy created in repository:', policy);
    
    // Process PDF with AI service (text extraction + embeddings)
    let pdfText: string = '';
    try {
      // Upload to AI service first (it will extract text and create embeddings)
      console.log('🚀 Calling AI service to process PDF...');
      const aiResponse = await this.aiService.uploadPolicyDocument(pdf, userId, policy._id.toString());
      
      if (aiResponse && aiResponse.documentId) {
        // AI service succeeded, use the extracted text from AI service
        if (aiResponse.extracted_text) {
          pdfText = aiResponse.extracted_text;
          console.log(`✅ Using text extracted by AI service: ${pdfText.length} characters`);
        } else {
          // Fallback: try to extract text locally
          try {
            pdfText = await this.extractPDFText(pdf);
          } catch (extractError) {
            console.warn('⚠️ Local PDF extraction failed, but AI service succeeded:', extractError.message);
            // Use a placeholder since AI service has the text in embeddings
            pdfText = 'Text extracted by AI service (available in embeddings)';
          }
        }
        
        // Store PDF text and mark as processed
        await this.policiesRepository.update(policy._id.toString(), { 
          pdfText: pdfText,
          pdfProcessed: true
        });
        
        policy.pdfProcessed = true;
        policy.pdfText = pdfText;
        console.log('✅ PDF processed successfully with AI service');
      } else {
        throw new Error('AI service did not return expected response');
      }
    } catch (error) {
      console.error('❌ AI service processing failed:', error.message);
      
      // Fallback: try to extract text locally
      try {
        pdfText = await this.extractPDFText(pdf);
        await this.policiesRepository.update(policy._id.toString(), { 
          pdfText: pdfText,
          pdfProcessed: false
        });
        policy.pdfProcessed = false;
        policy.pdfText = pdfText;
        console.log('⚠️ Policy created with local text extraction, but AI processing failed - can be retried later');
      } catch (extractError) {
        console.error('❌ Both AI service and local extraction failed:', extractError.message);
        // Don't fail the policy creation, but mark as not processed
        policy.pdfProcessed = false;
        console.log('⚠️ Policy created but PDF processing failed - can be retried later');
      }
    }

    // If user wanted to publish directly, publish it
    if (policyWithPDF.status === 'publish') {
      console.log('Publishing policy directly as requested');
      const updateData = {
        status: 'publish' as 'draft' | 'publish',
        publishedAt: new Date()
      };
      const updatedPolicy = await this.policiesRepository.update(policy._id.toString(), updateData);
      policy.status = updatedPolicy.status;
      policy.publishedAt = updatedPolicy.publishedAt;
      console.log('Policy published successfully:', updatedPolicy);
    } else {
      console.log('Policy created as draft as requested');
    }
    
    // Send notification for policy creation
    try {
      await this.notificationsService.createNotification({
        userId: userId,
        type: NotificationType.POLICY_CREATED,
        title: 'Policy Created Successfully',
        message: `Your policy "${policy.title}" has been created and ${policy.status === 'publish' ? 'published' : 'saved as draft'}.`,
        priority: NotificationPriority.MEDIUM,
        policyId: policy._id.toString(),
        metadata: {
          policyTitle: policy.title,
          status: policy.status,
          hasPDF: policy.hasPDF,
          pdfProcessed: policy.pdfProcessed
        }
      });
    } catch (error) {
      console.error('Failed to send policy creation notification:', error);
      // Don't fail the policy creation if notification fails
    }

    console.log('Final policy before return:', policy);
    
    // Invalidate user's policy cache after creating a new policy
    await this.cacheInvalidationService.invalidatePolicyCache(userId);
    
    return this.transformToResponseDto(policy);
  }

  // Removed public findAll - users can only see their own policies
  // async findAll(): Promise<PolicyResponseDto[]> {
  //   const policies = await this.policiesRepository.findAll();
  //   return policies.map(policy => this.transformToResponseDto(policy));
  // }

  async findOne(id: string, userId: string): Promise<PolicyResponseDto> {
    const policy = await this.policiesRepository.findById(id);
    if (!policy) {
      throw new NotFoundException('Policy not found');
    }
    
    // Check if user owns the policy (handle both ObjectId and populated user object)
    const policyUserId = typeof policy.createdBy === 'object' && policy.createdBy._id 
      ? policy.createdBy._id.toString() 
      : policy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) {
      throw new ForbiddenException('You can only view your own policies');
    }
    
    return this.transformToResponseDto(policy);
  }

  async findByUserId(userId: string): Promise<PolicyResponseDto[]> {
    const policies = await this.policiesRepository.findByUserId(userId);
    return policies.map(policy => this.transformToResponseDto(policy));
  }

  async update(id: string, updatePolicyDto: UpdatePolicyDto, userId: string): Promise<PolicyResponseDto> {
    const existingPolicy = await this.policiesRepository.findById(id);
    if (!existingPolicy) {
      throw new NotFoundException('Policy not found');
    }

    // Check if user owns the policy (handle both ObjectId and populated user object)
    const policyUserId = typeof existingPolicy.createdBy === 'object' && existingPolicy.createdBy._id 
      ? existingPolicy.createdBy._id.toString() 
      : existingPolicy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) {
      throw new ForbiddenException('You can only update your own policies');
    }

    // Check if policy can be edited (only draft policies)
    if (existingPolicy.status !== 'draft') {
      throw new ForbiddenException('Only draft policies can be edited');
    }

    // Check if trying to edit expiry date when it's already been edited
    // Only consider it an edit if the expiry date is actually different from the existing one
    if (updatePolicyDto.expiryDate !== undefined && existingPolicy.expiryDateEdited) {
      const existingExpiryDate = existingPolicy.expiryDate ? new Date(existingPolicy.expiryDate).getTime() : null;
      const newExpiryDate = updatePolicyDto.expiryDate ? new Date(updatePolicyDto.expiryDate).getTime() : null;
      
      // Only throw error if the dates are actually different
      if (existingExpiryDate !== newExpiryDate) {
        throw new ForbiddenException('Expiry date can only be edited once. It has already been modified.');
      }
    }

    // Check if policy is expired (expired policies cannot be edited)
    const lifecycleInfo = this.calculatePolicyLifecycle(existingPolicy);
    if (lifecycleInfo.isExpired) {
      throw new ForbiddenException('Expired policies cannot be edited. Only viewing and deletion are allowed.');
    }

    // Prepare update data with expiry date editing flag
    const updateData: any = { ...updatePolicyDto };
    if (updatePolicyDto.expiryDate !== undefined && !existingPolicy.expiryDateEdited) {
      const existingExpiryDate = existingPolicy.expiryDate ? new Date(existingPolicy.expiryDate).getTime() : null;
      const newExpiryDate = updatePolicyDto.expiryDate ? new Date(updatePolicyDto.expiryDate).getTime() : null;
      
      // Only mark as edited if the dates are actually different
      if (existingExpiryDate !== newExpiryDate) {
        updateData.expiryDateEdited = true;
      }
    }

    const policy = await this.policiesRepository.update(id, updateData);
    
    // Invalidate user's policy cache after updating a policy
    await this.cacheInvalidationService.invalidatePolicyCache(userId, id);
    
    return this.transformToResponseDto(policy);
  }

  async updatePDF(id: string, pdf: Express.Multer.File, userId: string): Promise<PolicyResponseDto> {
    const existingPolicy = await this.policiesRepository.findById(id);
    if (!existingPolicy) {
      throw new NotFoundException('Policy not found');
    }

    // Check if user owns the policy
    const policyUserId = typeof existingPolicy.createdBy === 'object' && existingPolicy.createdBy._id 
      ? existingPolicy.createdBy._id.toString() 
      : existingPolicy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) {
      throw new ForbiddenException('You can only update your own policies');
    }

    // Check if policy can be edited (only draft policies)
    if (existingPolicy.status !== 'draft') {
      throw new ForbiddenException('Only draft policies can have their PDF updated');
    }

    // Check if policy is expired (expired policies cannot be edited)
    const lifecycleInfo = this.calculatePolicyLifecycle(existingPolicy);
    if (lifecycleInfo.isExpired) {
      throw new ForbiddenException('Expired policies cannot be edited. Only viewing and deletion are allowed.');
    }

    // Update PDF metadata and binary data
    const updateData = {
      hasPDF: true,
      pdfProcessed: false, // Reset processing status for new PDF
      pdfFilename: pdf.originalname,
      pdfSize: pdf.size,
      pdfData: pdf.buffer, // Store PDF binary data
    };

    const policy = await this.policiesRepository.update(id, updateData);
    
    // Process new PDF with AI service (text extraction + embeddings)
    try {
      await this.aiService.uploadPolicyDocument(pdf, userId, id);
      
      // Update policy to mark PDF as processed
      await this.policiesRepository.update(id, { pdfProcessed: true });
      policy.pdfProcessed = true;
      console.log('PDF updated and processed successfully with AI service');
    } catch (error) {
      // Log error but don't fail the PDF update
      console.error('Failed to process PDF with AI service:', error);
      // PDF is updated but processing failed - user can retry later
    }
    
    // Invalidate user's policy and AI cache after updating PDF
    await this.cacheInvalidationService.invalidatePolicyCache(userId, id);
    await this.cacheInvalidationService.invalidateAiCache(userId, id);
    
    return this.transformToResponseDto(policy);
  }

  async removePDF(id: string, userId: string): Promise<PolicyResponseDto> {
    const existingPolicy = await this.policiesRepository.findById(id);
    if (!existingPolicy) {
      throw new NotFoundException('Policy not found');
    }

    // Check if user owns the policy
    const policyUserId = typeof existingPolicy.createdBy === 'object' && existingPolicy.createdBy._id 
      ? existingPolicy.createdBy._id.toString() 
      : existingPolicy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) {
      throw new ForbiddenException('You can only update your own policies');
    }

    // Check if policy can be edited (only draft policies)
    if (existingPolicy.status !== 'draft') {
      throw new ForbiddenException('Only draft policies can have their PDF removed');
    }

    // Remove PDF metadata
    const updateData = {
      hasPDF: false,
      pdfProcessed: false,
      pdfFilename: undefined,
      pdfSize: undefined,
    };

    const policy = await this.policiesRepository.update(id, updateData);
    
    // Remove PDF from AI service if it was processed
    if (existingPolicy.pdfProcessed) {
      try {
        // Note: We need to get the document ID from the AI service
        // For now, we'll just log that we need to implement this
        console.log('PDF removed from policy, should also remove from AI service');
        // TODO: Implement AI service PDF removal when we have document ID mapping
      } catch (error) {
        console.error('Failed to remove PDF from AI service:', error);
        // Don't fail the operation if AI service cleanup fails
      }
    }
    
    // Invalidate user's policy and AI cache after removing PDF
    await this.cacheInvalidationService.invalidatePolicyCache(userId, id);
    await this.cacheInvalidationService.invalidateAiCache(userId, id);
    
    return this.transformToResponseDto(policy);
  }

  async getPolicyPDF(id: string, userId: string): Promise<Buffer> {
    console.log('🔍 getPolicyPDF called for:', { id, userId });
    
    const policy = await this.policiesRepository.findById(id);
    if (!policy) {
      console.log('❌ Policy not found');
      throw new NotFoundException('Policy not found');
    }

    console.log('📋 Policy found:', {
      id: policy._id,
      title: policy.title,
      hasPDF: policy.hasPDF,
      pdfData: policy.pdfData ? 'Buffer exists' : 'No buffer',
      pdfDataLength: policy.pdfData?.length || 0
    });

    // Check if user owns the policy
    const policyUserId = typeof policy.createdBy === 'object' && policy.createdBy._id 
      ? policy.createdBy._id.toString() 
      : policy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) {
      console.log('❌ User does not own policy');
      throw new ForbiddenException('You can only access your own policies');
    }

    // Check if policy has PDF
    if (!policy.hasPDF) {
      console.log('❌ Policy has no PDF');
      throw new NotFoundException('This policy does not have a PDF document');
    }

    // Check if PDF data is stored (for policies created before pdfData field was added)
    if (!policy.pdfData) {
      console.log('❌ PDF data not available');
      throw new NotFoundException('PDF data is not available for this policy. This policy was created before PDF storage was implemented. Please re-upload the PDF to enable preview functionality.');
    }

    console.log('✅ Returning PDF data:', {
      length: policy.pdfData.length,
      isBuffer: Buffer.isBuffer(policy.pdfData)
    });

    // Validate PDF data integrity
    const pdfHeader = policy.pdfData.slice(0, 4).toString('hex');
    console.log('📄 PDF header (first 4 bytes):', pdfHeader);
    
    // Check if it starts with PDF signature (%PDF)
    if (pdfHeader !== '25504446') {
      console.log('❌ Invalid PDF header - not a valid PDF file');
      console.log('📄 First 20 bytes as string:', policy.pdfData.slice(0, 20).toString());
      throw new BadRequestException('Invalid PDF data - file appears to be corrupted');
    }

    console.log('✅ PDF header validation passed');

    return policy.pdfData;
  }

  async remove(id: string, userId: string): Promise<void> {
    const existingPolicy = await this.policiesRepository.findById(id);
    if (!existingPolicy) {
      throw new NotFoundException('Policy not found');
    }

    // Debug logging to see what's happening
    console.log('=== DEBUG POLICY OWNERSHIP ===');
    console.log('Policy ID:', id);
    console.log('Policy createdBy (raw):', existingPolicy.createdBy);
    console.log('Policy createdBy (toString):', existingPolicy.createdBy.toString());
    console.log('Policy createdBy (type):', typeof existingPolicy.createdBy);
    console.log('User ID from token:', userId);
    console.log('User ID type:', typeof userId);
    console.log('IDs match?', existingPolicy.createdBy.toString() === userId);
    console.log('Policy document full:', JSON.stringify(existingPolicy, null, 2));
    console.log('=== END DEBUG ===');

    // Check if user owns the policy (handle both ObjectId and populated user object)
    const policyUserId = typeof existingPolicy.createdBy === 'object' && existingPolicy.createdBy._id 
      ? existingPolicy.createdBy._id.toString() 
      : existingPolicy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) {
      throw new ForbiddenException('You can only delete your own policies');
    }

    await this.policiesRepository.delete(id);
    
    // Invalidate user's policy and AI cache after deleting a policy
    await this.cacheInvalidationService.invalidatePolicyCache(userId, id);
    await this.cacheInvalidationService.invalidateAiCache(userId, id);
  }

  // Removed public status filter - users can only see their own policies
  // async findByStatus(status: string): Promise<PolicyResponseDto[]> {
  //   const policies = await this.policiesRepository.findByStatus(status);
  //   return policies.map(policy => this.transformToResponseDto(policy));
  // }

  async findByUserIdAndStatus(userId: string, status: string): Promise<PolicyResponseDto[]> {
    const policies = await this.policiesRepository.findByUserIdAndStatus(userId, status);
    return policies.map(policy => this.transformToResponseDto(policy));
  }

  async publishPolicy(id: string, publishDto: PublishPolicyDto, userId: string): Promise<PolicyResponseDto> {
    if (!publishDto.confirmPublish) {
      throw new BadRequestException('Publishing must be confirmed');
    }

    const existingPolicy = await this.policiesRepository.findById(id);
    if (!existingPolicy) {
      throw new NotFoundException('Policy not found');
    }

    // Check if user owns the policy
    const policyUserId = typeof existingPolicy.createdBy === 'object' && existingPolicy.createdBy._id 
      ? existingPolicy.createdBy._id.toString() 
      : existingPolicy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) {
      throw new ForbiddenException('You can only publish your own policies');
    }

    // Check if policy is already published
    if (existingPolicy.status === 'publish') {
      throw new BadRequestException('Policy is already published');
    }

    // Check if policy has PDF and is processed - PDF is mandatory for publishing
    if (!existingPolicy.hasPDF) {
      throw new BadRequestException('Policy must have a PDF uploaded before publishing');
    }

    if (!existingPolicy.pdfProcessed) {
      throw new BadRequestException('Policy PDF must be processed before publishing. Please wait for processing to complete.');
    }

             const updateData = {
           status: 'publish' as 'draft' | 'publish',
           publishedAt: new Date()
         };

    const policy = await this.policiesRepository.update(id, updateData);
    
    // Send notification for policy publication
    try {
      await this.notificationsService.createNotification({
        userId: userId,
        type: NotificationType.POLICY_PUBLISHED,
        title: 'Policy Published Successfully',
        message: `Your policy "${policy.title}" has been published and is now live.`,
        priority: NotificationPriority.MEDIUM,
        policyId: policy._id.toString(),
        metadata: {
          policyTitle: policy.title,
          publishedAt: policy.publishedAt
        }
      });
    } catch (error) {
      console.error('Failed to send policy publication notification:', error);
      // Don't fail the policy publication if notification fails
    }
    
    // Invalidate user's policy and AI cache after publishing a policy
    await this.cacheInvalidationService.invalidatePolicyCache(userId, id);
    await this.cacheInvalidationService.invalidateAiCache(userId, id);
    
    return this.transformToResponseDto(policy);
  }

  async canEditPolicy(policyId: string, userId: string): Promise<boolean> {
    const policy = await this.policiesRepository.findById(policyId);
    if (!policy) return false;

    // Check ownership
    const policyUserId = typeof policy.createdBy === 'object' && policy.createdBy._id 
      ? policy.createdBy._id.toString() 
      : policy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) return false;

    // Only draft policies can be edited
    return policy.status === 'draft';
  }

  async canUseAI(policyId: string, userId: string): Promise<boolean> {
    const policy = await this.policiesRepository.findById(policyId);
    if (!policy) return false;

    // Check ownership
    const policyUserId = typeof policy.createdBy === 'object' && policy.createdBy._id 
      ? policy.createdBy._id.toString() 
      : policy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) return false;

    // Only published policies with processed PDFs can use AI
    return policy.status === 'publish' && policy.hasPDF && policy.pdfProcessed;
  }

  async retryPDFProcessing(id: string, userId: string): Promise<PolicyResponseDto> {
    const existingPolicy = await this.policiesRepository.findById(id);
    if (!existingPolicy) {
      throw new NotFoundException('Policy not found');
    }

    // Check if user owns the policy
    const policyUserId = typeof existingPolicy.createdBy === 'object' && existingPolicy.createdBy._id 
      ? existingPolicy.createdBy._id.toString() 
      : existingPolicy.createdBy.toString();
    const requestUserId = userId.toString();
    
    if (policyUserId !== requestUserId) {
      throw new ForbiddenException('You can only update your own policies');
    }

    // Check if policy can be edited (only draft policies)
    if (existingPolicy.status !== 'draft') {
      throw new ForbiddenException('Only draft policies can have their PDF processing retried');
    }

    // Check if policy has PDF
    if (!existingPolicy.hasPDF) {
      throw new BadRequestException('Policy does not have a PDF to process');
    }

    // Check if PDF is already processed
    if (existingPolicy.pdfProcessed) {
      throw new BadRequestException('PDF is already processed');
    }

    // Mark PDF as processing
    await this.policiesRepository.update(id, { pdfProcessed: false });

    // Note: In a real implementation, you would need to get the original PDF file
    // and reprocess it. For now, we'll just mark it as not processed
    // TODO: Implement PDF reprocessing when we have file storage
    
    const policy = await this.policiesRepository.findById(id);
    return this.transformToResponseDto(policy!);
  }

  private async extractPDFText(pdf: Express.Multer.File): Promise<string> {
    try {
      // Import pdf-parse dynamically to avoid issues with NestJS
      const pdfParse = require('pdf-parse');
      
      // Parse the PDF buffer
      const data = await pdfParse(pdf.buffer);
      
      if (data && data.text) {
        console.log(`Successfully extracted ${data.text.length} characters from PDF: ${pdf.originalname}`);
        return data.text;
      } else {
        console.warn(`No text extracted from PDF: ${pdf.originalname}`);
        return '';
      }
    } catch (error) {
      console.error(`Failed to extract text from PDF ${pdf.originalname}:`, error);
      // Return empty string instead of throwing error to not fail policy creation
      return '';
    }
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

  /**
   * Get policies by lifecycle state
   */
  async findByUserIdAndLifecycle(userId: string, lifecycle: 'active' | 'expiring-soon' | 'expired'): Promise<PolicyResponseDto[]> {
    const policies = await this.policiesRepository.findByUserId(userId);
    const filteredPolicies = policies.filter(policy => {
      const lifecycleInfo = this.calculatePolicyLifecycle(policy);
      return lifecycleInfo.lifecycle === lifecycle;
    });
    return filteredPolicies.map(policy => this.transformToResponseDto(policy));
  }

  /**
   * Get lifecycle statistics for dashboard
   */
  async getLifecycleStats(userId: string): Promise<{
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
    draft: number;
  }> {
    const policies = await this.policiesRepository.findByUserId(userId);
    
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let draft = 0;

    policies.forEach(policy => {
      if (policy.status === 'draft') {
        draft++;
      } else {
        const lifecycleInfo = this.calculatePolicyLifecycle(policy);
        switch (lifecycleInfo.lifecycle) {
          case 'active':
            active++;
            break;
          case 'expiring-soon':
            expiringSoon++;
            break;
          case 'expired':
            expired++;
            break;
        }
      }
    });

    return {
      total: policies.length,
      active,
      expiringSoon,
      expired,
      draft
    };
  }

  private transformToResponseDto(policy: PolicyDocument): PolicyResponseDto {
    return {
      _id: policy._id.toString(),
      title: policy.title,
      description: policy.description,
      content: policy.content,
      createdBy: typeof policy.createdBy === 'object' && policy.createdBy._id 
        ? policy.createdBy._id.toString() 
        : policy.createdBy.toString(),
      status: policy.status,
      tags: policy.tags,
      publishedAt: policy.publishedAt,
      expiryDate: policy.expiryDate,
      expiryDateEdited: policy.expiryDateEdited,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      // PDF-related fields
      hasPDF: policy.hasPDF,
      pdfProcessed: policy.pdfProcessed,
      pdfFilename: policy.pdfFilename,
      pdfSize: policy.pdfSize,
      pdfText: policy.pdfText,
      // AI-related fields
      aiSummary: policy.aiSummary,
      aiSummaryGeneratedAt: policy.aiSummaryGeneratedAt,
      aiSummaryBrief: policy.aiSummaryBrief,
      aiSummaryBriefGeneratedAt: policy.aiSummaryBriefGeneratedAt,
      aiSummaryStandard: policy.aiSummaryStandard,
      aiSummaryStandardGeneratedAt: policy.aiSummaryStandardGeneratedAt,
      aiSummaryDetailed: policy.aiSummaryDetailed,
      aiSummaryDetailedGeneratedAt: policy.aiSummaryDetailedGeneratedAt,
      currentSummaryLevel: policy.currentSummaryLevel,
    };
  }
}