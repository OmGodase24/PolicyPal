import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { 
  PrivacyService, 
  PrivacyImpactAssessmentRequest,
  ConsentRecordRequest,
  DataSubjectRequestRequest
} from '../services/privacy.service';

@Controller('ai/privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post('impact-assessment')
  async conductPrivacyImpactAssessment(@Body() request: PrivacyImpactAssessmentRequest, @Request() req) {
    const piaRequest = {
      ...request,
      userId: req.user.id || req.user._id,
    };

    return await this.privacyService.conductPrivacyImpactAssessment(piaRequest);
  }

  @Post('generate-policy-template')
  async generatePrivacyPolicyTemplate(
    @Body() request: { dataCategories: string[]; processingPurposes: string[]; legalBasis: string[] }
  ) {
    return await this.privacyService.generatePrivacyPolicyTemplate(
      request.dataCategories,
      request.processingPurposes,
      request.legalBasis
    );
  }

  @Post('consent-record')
  async createConsentRecord(@Body() request: ConsentRecordRequest, @Request() req) {
    const consentRequest = {
      ...request,
      userId: req.user.id || req.user._id,
    };

    return await this.privacyService.createConsentRecord(consentRequest);
  }

  @Post('data-subject-request')
  async processDataSubjectRequest(@Body() request: DataSubjectRequestRequest, @Request() req) {
    const dsrRequest = {
      ...request,
      userId: req.user.id || req.user._id,
    };

    return await this.privacyService.processDataSubjectRequest(dsrRequest);
  }
}
