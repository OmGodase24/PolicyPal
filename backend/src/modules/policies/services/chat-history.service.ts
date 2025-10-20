import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatHistory, ChatHistoryDocument } from '../schemas/chat-history.schema';
import { CreateChatHistoryDto, ChatHistoryResponseDto } from '../dto/chat-history.dto';
import { PoliciesService } from './policies.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ChatHistoryService {
  constructor(
    @InjectModel(ChatHistory.name) private chatHistoryModel: Model<ChatHistoryDocument>,
    private readonly policiesService: PoliciesService,
  ) {}

  async createChatSession(
    createChatDto: CreateChatHistoryDto,
    userId: string,
    sessionId: string,
  ): Promise<ChatHistoryResponseDto> {
    // Verify user can use AI for this policy
    const canUseAI = await this.policiesService.canUseAI(createChatDto.policyId, userId);
    if (!canUseAI) {
      throw new ForbiddenException('You cannot use AI for this policy');
    }

    const chatHistory = new this.chatHistoryModel({
      ...createChatDto,
      userId,
      sessionId,
    });

    const savedChat = await chatHistory.save();
    return this.transformToResponseDto(savedChat);
  }

  async getChatHistoryByPolicy(policyId: string, userId: string): Promise<ChatHistoryResponseDto[]> {
    // Verify user owns the policy
    const policy = await this.policiesService.findOne(policyId, userId);
    
    const chatHistory = await this.chatHistoryModel
      .find({ policyId, userId })
      .sort({ createdAt: -1 })
      .exec();

    return chatHistory.map(chat => this.transformToResponseDto(chat));
  }

  async getChatHistoryBySession(sessionId: string, userId: string): Promise<ChatHistoryResponseDto[]> {
    const chatHistory = await this.chatHistoryModel
      .find({ sessionId, userId })
      .sort({ createdAt: 1 })
      .exec();

    return chatHistory.map(chat => this.transformToResponseDto(chat));
  }

  async getUserChatSessions(userId: string): Promise<any[]> {
    const sessions = await this.chatHistoryModel.aggregate([
      { $match: { userId: userId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { policyId: '$policyId', sessionId: '$sessionId' },
          lastMessage: { $first: '$createdAt' },
          messageCount: { $sum: 1 },
          averageConfidence: { $avg: '$confidence' },
          firstMessage: { $last: '$createdAt' },
        },
      },
      { $sort: { lastMessage: -1 } },
    ]);

    return sessions.map(session => ({
      policyId: session._id.policyId.toString(),
      sessionId: session._id.sessionId,
      lastMessage: session.lastMessage,
      messageCount: session.messageCount,
      confidence: session.averageConfidence,
      createdAt: session.firstMessage,
      duration: Math.round((session.lastMessage.getTime() - session.firstMessage.getTime()) / (1000 * 60)), // in minutes
    }));
  }

  async deleteChatSession(sessionId: string, userId: string): Promise<void> {
    const result = await this.chatHistoryModel.deleteMany({ sessionId, userId });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Chat session not found');
    }
  }

  private transformToResponseDto(chat: ChatHistoryDocument): ChatHistoryResponseDto {
    return {
      _id: chat._id.toString(),
      policyId: chat.policyId.toString(),
      userId: chat.userId.toString(),
      sessionId: chat.sessionId,
      question: chat.question,
      answer: chat.answer,
      confidence: chat.confidence,
      sources: chat.sources,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  // Export methods
  async exportChatSession(sessionId: string, userId: string): Promise<any> {
    const chatHistory = await this.getChatHistoryBySession(sessionId, userId);
    if (chatHistory.length === 0) {
      throw new NotFoundException('Chat session not found');
    }

    const policy = await this.policiesService.findOne(chatHistory[0].policyId, userId);
    
    // Create conversation pairs (Q&A) instead of separate messages
    const conversation = chatHistory.map(chat => ({
      question: {
        content: chat.question,
        timestamp: chat.createdAt,
        formattedTime: new Date(chat.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      },
      answer: {
        content: chat.answer,
        timestamp: chat.createdAt,
        confidence: chat.confidence,
        formattedTime: new Date(chat.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }
    }));

    const sessionDuration = chatHistory.length > 1 ? 
      Math.round((new Date(chatHistory[chatHistory.length - 1].createdAt).getTime() - 
                  new Date(chatHistory[0].createdAt).getTime()) / (1000 * 60)) : 0;

    return {
      documentInfo: {
        title: `AI Chat Session Report - ${policy?.title || 'Unknown Policy'}`,
        sessionId,
        policyId: chatHistory[0].policyId,
        policyTitle: policy?.title || 'Unknown Policy',
        sessionDate: chatHistory[0].createdAt,
        lastActivity: chatHistory[chatHistory.length - 1].createdAt,
        totalExchanges: chatHistory.length,
        sessionDuration: sessionDuration,
        averageConfidence: chatHistory.reduce((sum, chat) => sum + (chat.confidence || 0), 0) / chatHistory.length
      },
      conversation: conversation,
      metadata: {
        exportDate: new Date(),
        exportFormat: 'json',
        generatedBy: 'PolicyPal AI Assistant System',
        version: '1.0'
      }
    };
  }

  async exportAllChatSessions(userId: string): Promise<any> {
    const sessions = await this.getUserChatSessions(userId);
    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const policy = await this.policiesService.findOne(session.policyId, userId);
        return {
          sessionId: session.sessionId,
          policyId: session.policyId,
          policyTitle: policy?.title || 'Unknown Policy',
          createdAt: session.lastMessage,
          lastMessage: session.lastMessage,
          messageCount: 0, // This would need to be calculated
        };
      })
    );

    return {
      exportDate: new Date(),
      totalSessions: sessions.length,
      sessions: sessionsWithDetails,
    };
  }

  async exportChatSessionAsPDF(sessionId: string, userId: string): Promise<Buffer> {
    const exportData = await this.exportChatSession(sessionId, userId);
    
    // Generate a proper PDF using PDFKit
    return await this.generateBusinessPDF(exportData);
  }

  private async generateBusinessPDF(exportData: any): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      doc.on('error', reject);

      // Helper functions
      const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      };

      const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} minutes`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
      };

      // Header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#2563eb')
         .text('POLICYPAL', 50, 50, { align: 'center' });
      
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('AI CHAT SESSION REPORT', 50, 80, { align: 'center' });

      // Line separator
      doc.moveTo(50, 110)
         .lineTo(545, 110)
         .stroke('#e5e7eb');

      let yPosition = 130;

      // Document Information Section
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('DOCUMENT INFORMATION', 50, yPosition);
      
      yPosition += 25;

      const docInfo = [
        `Policy Title: ${exportData.documentInfo.policyTitle}`,
        `Session ID: ${exportData.documentInfo.sessionId}`,
        `Policy ID: ${exportData.documentInfo.policyId}`,
        `Session Date: ${formatDate(exportData.documentInfo.sessionDate)}`,
        `Last Activity: ${formatDate(exportData.documentInfo.lastActivity)}`,
        `Total Messages: ${exportData.documentInfo.totalExchanges}`,
        `Session Duration: ${exportData.documentInfo.sessionDuration ? formatDuration(exportData.documentInfo.sessionDuration) : 'N/A'}`,
        `Average Confidence: ${exportData.documentInfo.averageConfidence ? (exportData.documentInfo.averageConfidence * 100).toFixed(1) + '%' : 'N/A'}`
      ];

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#374151');

      docInfo.forEach(info => {
        doc.text(info, 50, yPosition);
        yPosition += 15;
      });

      yPosition += 10;

      // Export Details Section
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('EXPORT DETAILS', 50, yPosition);
      
      yPosition += 25;

      const exportInfo = [
        `Export Date: ${formatDate(exportData.metadata.exportDate)}`,
        `Export Format: ${exportData.metadata.exportFormat.toUpperCase()}`,
        `Generated By: PolicyPal AI Assistant System`
      ];

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#374151');

      exportInfo.forEach(info => {
        doc.text(info, 50, yPosition);
        yPosition += 15;
      });

      yPosition += 20;

      // Conversation Log Section
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('CONVERSATION LOG', 50, yPosition);
      
      yPosition += 25;

      // Add conversations
      exportData.conversation.forEach((exchange: any, index: number) => {
        const questionTime = formatTime(exchange.question.timestamp);
        const answerTime = formatTime(exchange.answer.timestamp);
        const confidence = exchange.answer.confidence ? ` (Confidence: ${(exchange.answer.confidence * 100).toFixed(1)}%)` : '';

        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        // Question
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#dc2626')
           .text(`${index + 1}. [${questionTime}] USER:`, 50, yPosition);
        
        yPosition += 15;

        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#374151')
           .text(exchange.question.content, 70, yPosition, { 
             width: 475,
             align: 'left'
           });
        
        yPosition += Math.ceil(doc.heightOfString(exchange.question.content, { width: 475 }) / 12) * 12 + 10;

        // Answer
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#059669')
           .text(`[${answerTime}] AI ASSISTANT${confidence}:`, 50, yPosition);
        
        yPosition += 15;

        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#374151')
           .text(exchange.answer.content, 70, yPosition, { 
             width: 475,
             align: 'left'
           });
        
        yPosition += Math.ceil(doc.heightOfString(exchange.answer.content, { width: 475 }) / 12) * 12 + 20;
      });

      // Footer
      const pageHeight = doc.page.height;
      const footerY = pageHeight - 100;

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text('This document was automatically generated by PolicyPal AI Assistant System.', 50, footerY, { align: 'center' });
      
      doc.text(`Generated on: ${formatDate(exportData.metadata.exportDate)} | Document ID: ${exportData.documentInfo.sessionId} | Version: 1.0`, 50, footerY + 15, { align: 'center' });

      // Finalize the PDF
      doc.end();
    });
  }

  async exportChatSessionAsCSV(sessionId: string, userId: string): Promise<string> {
    const exportData = await this.exportChatSession(sessionId, userId);
    
    const csvHeader = 'Exchange #,Type,Timestamp,Formatted Time,Content,Confidence\n';
    const csvRows = exportData.conversation.map((exchange, index) => {
      const exchangeNum = index + 1;
      const questionRow = `${exchangeNum},Question,"${exchange.question.timestamp}","${exchange.question.formattedTime}","${exchange.question.content.replace(/"/g, '""')}",""`;
      const answerRow = `${exchangeNum},Answer,"${exchange.answer.timestamp}","${exchange.answer.formattedTime}","${exchange.answer.content.replace(/"/g, '""')}","${exchange.answer.confidence || ''}"`;
      return `${questionRow}\n${answerRow}`;
    }).join('\n');
    
    return csvHeader + csvRows;
  }
}
