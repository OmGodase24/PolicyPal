import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatHistoryService } from '../services/chat-history.service';
import { CreateChatHistoryDto, ChatHistoryResponseDto } from '../dto/chat-history.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Chat History')
@Controller('chat-history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatHistoryController {
  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat session entry' })
  @ApiResponse({
    status: 201,
    description: 'Chat session created successfully',
    type: ChatHistoryResponseDto,
  })
  async createChatSession(
    @Body() createChatDto: CreateChatHistoryDto,
    @CurrentUser() user: any,
    @Query('sessionId') sessionId: string,
  ): Promise<ChatHistoryResponseDto> {
    return this.chatHistoryService.createChatSession(createChatDto, user.userId, sessionId);
  }

  @Get('policy/:policyId')
  @ApiOperation({ summary: 'Get chat history for a specific policy' })
  @ApiParam({ name: 'policyId', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
    type: [ChatHistoryResponseDto],
  })
  async getChatHistoryByPolicy(
    @Param('policyId') policyId: string,
    @CurrentUser() user: any,
  ): Promise<ChatHistoryResponseDto[]> {
    return this.chatHistoryService.getChatHistoryByPolicy(policyId, user.userId);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get chat history for a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Chat session retrieved successfully',
    type: [ChatHistoryResponseDto],
  })
  async getChatHistoryBySession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
  ): Promise<ChatHistoryResponseDto[]> {
    return this.chatHistoryService.getChatHistoryBySession(sessionId, user.userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all chat sessions for current user' })
  @ApiResponse({
    status: 200,
    description: 'Chat sessions retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          policyId: { type: 'string' },
          sessionId: { type: 'string' },
          lastMessage: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getUserChatSessions(@CurrentUser() user: any) {
    return this.chatHistoryService.getUserChatSessions(user.userId);
  }

  @Delete('session/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a chat session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 204, description: 'Chat session deleted successfully' })
  async deleteChatSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.chatHistoryService.deleteChatSession(sessionId, user.userId);
  }

  // Export endpoints
  @Get('export/session/:sessionId')
  @ApiOperation({ summary: 'Export chat session as JSON' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Chat session exported successfully',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        policyId: { type: 'string' },
        policyTitle: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        lastMessage: { type: 'string', format: 'date-time' },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['user', 'ai'] },
              content: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              confidence: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async exportChatSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatHistoryService.exportChatSession(sessionId, user.userId);
  }

  @Get('export/all')
  @ApiOperation({ summary: 'Export all chat sessions as JSON' })
  @ApiResponse({
    status: 200,
    description: 'All chat sessions exported successfully',
    schema: {
      type: 'object',
      properties: {
        exportDate: { type: 'string', format: 'date-time' },
        totalSessions: { type: 'number' },
        sessions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              policyId: { type: 'string' },
              policyTitle: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              lastMessage: { type: 'string', format: 'date-time' },
              messageCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async exportAllChatSessions(@CurrentUser() user: any) {
    return this.chatHistoryService.exportAllChatSessions(user.userId);
  }

  @Get('export/session/:sessionId/pdf')
  @ApiOperation({ summary: 'Export chat session as PDF' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Chat session exported as PDF successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async exportChatSessionAsPDF(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.chatHistoryService.exportChatSessionAsPDF(sessionId, user.userId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="chat-session-${sessionId}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    
    res.send(pdfBuffer);
  }

  @Get('export/session/:sessionId/csv')
  @ApiOperation({ summary: 'Export chat session as CSV' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Chat session exported as CSV successfully',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
        },
      },
    },
  })
  async exportChatSessionAsCSV(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const csvData = await this.chatHistoryService.exportChatSessionAsCSV(sessionId, user.userId);
    
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="chat-session-${sessionId}.csv"`,
    });
    
    res.send(csvData);
  }
}