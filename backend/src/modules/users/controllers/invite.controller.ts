import { Controller, Post, Get, Body, Query, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { InviteService } from '../services/invite.service';
import { CreateInviteDto, ValidateInviteDto, UseInviteDto, InviteResponseDto, ValidateInviteResponseDto, InviteListDto } from '../dto/invite.dto';

@Controller('invites')
@UseGuards(JwtAuthGuard)
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInvite(@Body() createInviteDto: CreateInviteDto, @Request() req): Promise<InviteResponseDto> {
    const invitedBy = req.user.userId;
    return this.inviteService.createInvite(createInviteDto, invitedBy);
  }

  @Get('validate/:token')
  async validateInvite(@Param('token') token: string): Promise<ValidateInviteResponseDto> {
    return this.inviteService.validateInvite({ token });
  }

  @Post('use')
  @HttpCode(HttpStatus.CREATED)
  async useInvite(@Body() useInviteDto: UseInviteDto): Promise<{ success: boolean; message: string; user?: any }> {
    return this.inviteService.useInvite(useInviteDto);
  }

  @Get()
  async getInvites(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ): Promise<InviteListDto> {
    const invitedBy = req.user.userId;
    return this.inviteService.getInvites(invitedBy, parseInt(page), parseInt(limit));
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  async resendInvite(@Param('id') id: string, @Request() req): Promise<InviteResponseDto> {
    const invitedBy = req.user.userId;
    return this.inviteService.resendInvite(id, invitedBy);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelInvite(@Param('id') id: string, @Request() req): Promise<{ success: boolean; message: string }> {
    const invitedBy = req.user.userId;
    return this.inviteService.cancelInvite(id, invitedBy);
  }
}

// Public controller for invite validation and usage (no auth required)
@Controller('public/invites')
export class PublicInviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Get('validate/:token')
  async validateInvite(@Param('token') token: string): Promise<ValidateInviteResponseDto> {
    return this.inviteService.validateInvite({ token });
  }

  @Post('use')
  @HttpCode(HttpStatus.CREATED)
  async useInvite(@Body() useInviteDto: UseInviteDto): Promise<{ success: boolean; message: string; user?: any }> {
    return this.inviteService.useInvite(useInviteDto);
  }
}
