import { Controller, Post, Body, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { DLPService, DLPScanRequest } from '../services/dlp.service';

@Controller('ai/dlp')
@UseGuards(JwtAuthGuard)
export class DLPController {
  constructor(private readonly dlpService: DLPService) {}

  @Post('scan')
  async scanPolicyContent(@Body() request: DLPScanRequest, @Request() req) {
    // Add user context to the request
    const scanRequest = {
      ...request,
      userId: req.user.id || req.user._id,
    };

    return await this.dlpService.scanPolicyContent(scanRequest);
  }
}
