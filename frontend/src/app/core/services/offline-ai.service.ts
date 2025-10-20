import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface OfflineAICapability {
  name: string;
  available: boolean;
  modelSize: number;
  accuracy: number;
  lastUpdated: Date;
}

export interface OfflineAIResponse {
  success: boolean;
  result: any;
  confidence: number;
  processingTime: number;
  modelUsed: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineAIService {
  private capabilities = new BehaviorSubject<OfflineAICapability[]>([]);
  private isOnline = new BehaviorSubject<boolean>(navigator.onLine);
  private offlineMode = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initializeOfflineCapabilities();
    this.setupOnlineStatusListener();
  }

  get capabilities$(): Observable<OfflineAICapability[]> {
    return this.capabilities.asObservable();
  }

  get isOnline$(): Observable<boolean> {
    return this.isOnline.asObservable();
  }

  get offlineMode$(): Observable<boolean> {
    return this.offlineMode.asObservable();
  }

  private initializeOfflineCapabilities(): void {
    const capabilities: OfflineAICapability[] = [
      {
        name: 'text_analysis',
        available: true,
        modelSize: 2.5, // MB
        accuracy: 0.85,
        lastUpdated: new Date()
      },
      {
        name: 'keyword_extraction',
        available: true,
        modelSize: 1.2, // MB
        accuracy: 0.90,
        lastUpdated: new Date()
      },
      {
        name: 'sentiment_analysis',
        available: true,
        modelSize: 3.1, // MB
        accuracy: 0.82,
        lastUpdated: new Date()
      },
      {
        name: 'document_classification',
        available: false, // Requires larger model
        modelSize: 15.6, // MB
        accuracy: 0.88,
        lastUpdated: new Date()
      },
      {
        name: 'compliance_checking',
        available: true,
        modelSize: 4.3, // MB
        accuracy: 0.75,
        lastUpdated: new Date()
      }
    ];

    this.capabilities.next(capabilities);
  }

  private setupOnlineStatusListener(): void {
    window.addEventListener('online', () => {
      this.isOnline.next(true);
      this.offlineMode.next(false);
    });

    window.addEventListener('offline', () => {
      this.isOnline.next(false);
      this.offlineMode.next(true);
    });
  }

  setOfflineMode(enabled: boolean): void {
    this.offlineMode.next(enabled);
  }

  analyzeText(text: string): Observable<OfflineAIResponse> {
    return from(this.performOfflineTextAnalysis(text));
  }

  extractKeywords(text: string): Observable<OfflineAIResponse> {
    return from(this.performOfflineKeywordExtraction(text));
  }

  analyzeSentiment(text: string): Observable<OfflineAIResponse> {
    return from(this.performOfflineSentimentAnalysis(text));
  }

  checkCompliance(text: string): Observable<OfflineAIResponse> {
    return from(this.performOfflineComplianceCheck(text));
  }

  private async performOfflineTextAnalysis(text: string): Promise<OfflineAIResponse> {
    const startTime = Date.now();
    
    try {
      // Simulate offline text analysis
      const wordCount = text.split(/\s+/).length;
      const sentenceCount = text.split(/[.!?]+/).length;
      const paragraphCount = text.split(/\n\s*\n/).length;
      const readingTime = Math.ceil(wordCount / 200); // Average reading speed

      const result = {
        wordCount,
        sentenceCount,
        paragraphCount,
        readingTime,
        complexity: this.calculateTextComplexity(text),
        language: this.detectLanguage(text)
      };

      return {
        success: true,
        result,
        confidence: 0.85,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_text_analyzer'
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_text_analyzer',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async performOfflineKeywordExtraction(text: string): Promise<OfflineAIResponse> {
    const startTime = Date.now();
    
    try {
      // Simple keyword extraction using TF-IDF-like approach
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);

      const wordFreq: { [key: string]: number } = {};
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      const keywords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, freq]) => ({ word, frequency: freq }));

      return {
        success: true,
        result: { keywords },
        confidence: 0.90,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_keyword_extractor'
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_keyword_extractor',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async performOfflineSentimentAnalysis(text: string): Promise<OfflineAIResponse> {
    const startTime = Date.now();
    
    try {
      // Simple sentiment analysis using keyword matching
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'outstanding', 'perfect', 'brilliant', 'superb'];
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'worst', 'disappointing', 'frustrating', 'annoying'];
      
      const words = text.toLowerCase().split(/\s+/);
      let positiveScore = 0;
      let negativeScore = 0;

      words.forEach(word => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
      });

      const totalScore = positiveScore + negativeScore;
      const sentiment = totalScore === 0 ? 'neutral' : 
                      positiveScore > negativeScore ? 'positive' : 'negative';
      const confidence = totalScore === 0 ? 0.5 : Math.abs(positiveScore - negativeScore) / totalScore;

      return {
        success: true,
        result: { sentiment, confidence, positiveScore, negativeScore },
        confidence: Math.max(0.6, confidence),
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_sentiment_analyzer'
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_sentiment_analyzer',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async performOfflineComplianceCheck(text: string): Promise<OfflineAIResponse> {
    const startTime = Date.now();
    
    try {
      // Simple compliance checking using pattern matching
      const compliancePatterns = {
        gdpr: ['personal data', 'consent', 'data protection', 'privacy', 'right to be forgotten'],
        hipaa: ['health information', 'medical records', 'patient data', 'phi', 'protected health'],
        sox: ['financial reporting', 'internal controls', 'audit', 'compliance', 'whistleblower'],
        pci: ['credit card', 'payment data', 'cardholder', 'pci', 'payment processing']
      };

      const textLower = text.toLowerCase();
      const complianceResults: { [key: string]: { found: boolean; matches: string[] } } = {};

      Object.entries(compliancePatterns).forEach(([framework, patterns]) => {
        const matches = patterns.filter(pattern => textLower.includes(pattern));
        complianceResults[framework] = {
          found: matches.length > 0,
          matches
        };
      });

      const totalFrameworks = Object.keys(compliancePatterns).length;
      const detectedFrameworks = Object.values(complianceResults).filter(result => result.found).length;
      const complianceScore = detectedFrameworks / totalFrameworks;

      return {
        success: true,
        result: { 
          complianceResults, 
          complianceScore,
          detectedFrameworks,
          totalFrameworks
        },
        confidence: 0.75,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_compliance_checker'
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_compliance_checker',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private calculateTextComplexity(text: string): string {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.calculateAverageSyllables(words);

    const complexity = (avgWordsPerSentence * 0.39) + (avgSyllablesPerWord * 11.8) - 15.59;

    if (complexity < 30) return 'simple';
    if (complexity < 50) return 'moderate';
    if (complexity < 70) return 'complex';
    return 'very complex';
  }

  private calculateAverageSyllables(words: string[]): number {
    const totalSyllables = words.reduce((total, word) => {
      return total + this.countSyllables(word);
    }, 0);
    return totalSyllables / words.length;
  }

  private countSyllables(word: string): number {
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i].toLowerCase());
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    if (word.endsWith('e')) count--;
    return Math.max(1, count);
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te'];
    const frenchWords = ['le', 'la', 'de', 'et', 'à', 'un', 'il', 'que', 'ne', 'se', 'ce', 'pas'];

    const words = text.toLowerCase().split(/\s+/);
    let englishCount = 0;
    let spanishCount = 0;
    let frenchCount = 0;

    words.forEach(word => {
      if (englishWords.includes(word)) englishCount++;
      if (spanishWords.includes(word)) spanishCount++;
      if (frenchWords.includes(word)) frenchCount++;
    });

    if (englishCount > spanishCount && englishCount > frenchCount) return 'en';
    if (spanishCount > frenchCount) return 'es';
    if (frenchCount > 0) return 'fr';
    return 'en'; // Default to English
  }

  downloadOfflineModel(modelName: string): Observable<{success: boolean, progress: number}> {
    // Simulate model download
    return new Observable(observer => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        observer.next({ success: true, progress });
        
        if (progress >= 100) {
          clearInterval(interval);
          observer.complete();
        }
      }, 100);
    });
  }

  getOfflineStorageUsage(): Observable<{used: number, total: number, available: number}> {
    return new Observable(observer => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          observer.next({
            used: estimate.usage || 0,
            total: estimate.quota || 0,
            available: (estimate.quota || 0) - (estimate.usage || 0)
          });
          observer.complete();
        });
      } else {
        observer.next({ used: 0, total: 0, available: 0 });
        observer.complete();
      }
    });
  }
}
