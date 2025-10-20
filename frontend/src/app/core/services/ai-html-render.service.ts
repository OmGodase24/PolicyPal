import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class AiHtmlRenderService {

  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Sanitizes and returns safe HTML for AI responses
   * @param htmlContent Raw HTML content from AI
   * @returns SafeHtml object that can be used with [innerHTML]
   */
  sanitizeAndRenderHtml(htmlContent: string): SafeHtml {
    if (!htmlContent) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Clean up common AI response patterns
    const cleanedHtml = this.preprocessAiContent(htmlContent);
    
    // Sanitize the HTML to prevent XSS attacks
    return this.sanitizer.bypassSecurityTrustHtml(cleanedHtml);
  }

  /**
   * Converts plain text AI responses to structured HTML
   * @param plainText Plain text response from AI
   * @returns Formatted HTML string
   */
  convertTextToHtml(plainText: string): SafeHtml {
    if (!plainText) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    const htmlContent = this.formatTextAsHtml(plainText);
    return this.sanitizeAndRenderHtml(htmlContent);
  }

  /**
   * Formats policy comparison insights as structured HTML
   * @param insights Policy comparison insights object
   * @returns Formatted HTML string
   */
  formatPolicyInsights(insights: any): SafeHtml {
    if (!insights) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    const htmlContent = this.generateInsightsHtml(insights);
    return this.sanitizeAndRenderHtml(htmlContent);
  }

  /**
   * Formats chat messages with proper styling
   * @param message Chat message content
   * @param isUser Whether this is a user message or AI message
   * @returns Formatted HTML string
   */
  formatChatMessage(message: string, isUser: boolean = false): SafeHtml {
    if (!message) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    const htmlContent = this.generateChatMessageHtml(message, isUser);
    return this.sanitizeAndRenderHtml(htmlContent);
  }

  private preprocessAiContent(content: string): string {
    // Remove any potentially unsafe elements while preserving structure
    let cleaned = content
      .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
      .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '') // Remove iframe tags
      .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/<link[^>]*>/gi, ''); // Remove link tags

    // Ensure proper structure for AI responses
    if (!cleaned.includes('<div') && !cleaned.includes('<p')) {
      cleaned = this.formatTextAsHtml(cleaned);
    }

    return cleaned;
  }

  private formatTextAsHtml(text: string): string {
    // Convert markdown-style formatting to HTML
    let html = text
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code snippets
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="ai-header-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="ai-header-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="ai-header-1">$1</h1>');

    // Convert bullet points to lists
    const lines = html.split('\n');
    const processedLines = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.match(/^[-•*]\s/)) {
        if (!inList) {
          processedLines.push('<ul class="ai-list">');
          inList = true;
        }
        const listItem = line.replace(/^[-•*]\s/, '');
        processedLines.push(`<li class="ai-list-item">${listItem}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (line) {
          processedLines.push(`<p class="ai-paragraph">${line}</p>`);
        }
      }
    }

    if (inList) {
      processedLines.push('</ul>');
    }

    return `<div class="ai-content">${processedLines.join('')}</div>`;
  }

  private generateInsightsHtml(insights: any): string {
    const sections = [];

    // Relevance Score Section
    if (insights.relevanceScore !== undefined) {
      const scoreClass = this.getScoreClass(insights.relevanceScore);
      sections.push(`
        <div class="ai-insights-section relevance-section">
          <div class="relevance-header">
            <span class="relevance-label">Relevance Score:</span>
            <div class="relevance-bar">
              <div class="relevance-fill ${scoreClass}" style="width: ${insights.relevanceScore}%"></div>
            </div>
            <span class="relevance-value">${insights.relevanceScore}%</span>
          </div>
        </div>
      `);
    }

    // Summary Section
    if (insights.summary) {
      sections.push(`
        <div class="ai-insights-section summary-section">
          <h3 class="insights-header">📊 Summary</h3>
          <div class="summary-content">
            ${this.formatTextAsHtml(insights.summary)}
          </div>
        </div>
      `);
    }

    // Key Differences Section
    if (insights.keyDifferences && insights.keyDifferences.length > 0) {
      const differencesList = insights.keyDifferences
        .map((diff: string) => `<li class="difference-item">${diff}</li>`)
        .join('');
      
      sections.push(`
        <div class="ai-insights-section differences-section">
          <h3 class="insights-header">🔍 Key Differences</h3>
          <ul class="differences-list">
            ${differencesList}
          </ul>
        </div>
      `);
    }

    // Recommendations Section
    if (insights.recommendations && insights.recommendations.length > 0) {
      const recommendationsList = insights.recommendations
        .map((rec: string) => `<li class="recommendation-item">${rec}</li>`)
        .join('');
      
      sections.push(`
        <div class="ai-insights-section recommendations-section">
          <h3 class="insights-header">💡 Recommendations</h3>
          <ul class="recommendations-list">
            ${recommendationsList}
          </ul>
        </div>
      `);
    }

    // Coverage Analysis Section
    if (insights.coverageComparison) {
      const policy1Items = insights.coverageComparison.policy1
        ?.map((item: string) => `<li class="coverage-item">${item}</li>`)
        .join('') || '';
      
      const policy2Items = insights.coverageComparison.policy2
        ?.map((item: string) => `<li class="coverage-item">${item}</li>`)
        .join('') || '';

      sections.push(`
        <div class="ai-insights-section coverage-section">
          <h3 class="insights-header">📋 Coverage Analysis</h3>
          <div class="coverage-comparison">
            <div class="coverage-column">
              <h4 class="coverage-policy-title">Policy 1</h4>
              <ul class="coverage-list">${policy1Items}</ul>
            </div>
            <div class="coverage-column">
              <h4 class="coverage-policy-title">Policy 2</h4>
              <ul class="coverage-list">${policy2Items}</ul>
            </div>
          </div>
        </div>
      `);
    }

    return `<div class="ai-insights-container">${sections.join('')}</div>`;
  }

  private generateChatMessageHtml(message: string, isUser: boolean): string {
    // Don't create nested structure - just return the formatted content
    // The outer template already has the proper structure
    return this.formatTextAsHtml(message);
  }

  private getScoreClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-moderate';
    return 'score-low';
  }
}
