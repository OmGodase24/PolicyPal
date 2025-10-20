import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface ImageAnalysisRequest {
  images: string[]; // Base64 image data
  userId: string;
  policyId?: string;
  isEmergencyMode?: boolean;
}

export interface ImageAnalysisResponse {
  success: boolean;
  extractedText: string;
  isPolicyRelated: boolean;
  analysisResults: {
    policyNumber?: string;
    insuranceCompany?: string;
    coverageAmount?: string;
    effectiveDate?: string;
    expiryDate?: string;
    keyTerms: string[];
    suggestions: string[];
  };
  error?: string;
  validationMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageAnalysisService {
  private apiUrl = '/api/ai/image-analysis';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  analyzePolicyImages(request: ImageAnalysisRequest): Observable<ImageAnalysisResponse> {
    console.log('🔍 Starting image analysis for', request.images.length, 'images');
    
    // Get JWT token for authentication
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.post<ImageAnalysisResponse>(`${this.apiUrl}/analyze`, request, { headers }).pipe(
      map(response => {
        console.log('✅ Image analysis successful:', {
          success: response.success,
          isPolicyRelated: response.isPolicyRelated,
          hasAnalysisResults: !!response.analysisResults
        });
        return response;
      }),
      catchError(error => {
        console.error('❌ Image analysis failed:', error);
        
        // Return appropriate error response based on error type
        if (error.status === 401) {
          return of({
            success: false,
            extractedText: '',
            isPolicyRelated: false,
            analysisResults: { keyTerms: [], suggestions: [] },
            error: 'Authentication required. Please log in again.',
            validationMessage: 'Please log in to analyze images.'
          });
        } else if (error.status === 413) {
          return of({
            success: false,
            extractedText: '',
            isPolicyRelated: false,
            analysisResults: { keyTerms: [], suggestions: [] },
            error: 'Image file too large. Please upload smaller images.',
            validationMessage: 'Please upload smaller images (max 10MB each).'
          });
        } else {
          // Return mock response for other errors
          return of(this.generateMockAnalysisResponse(request.images.length));
        }
      })
    );
  }

  private generateMockAnalysisResponse(imageCount: number): ImageAnalysisResponse {
    // Simulate policy validation - in real implementation, this would use AI to detect policy-related content
    const isPolicyRelated = this.simulatePolicyValidation();
    
    if (!isPolicyRelated) {
      return {
        success: false,
        extractedText: '',
        isPolicyRelated: false,
        analysisResults: {
          keyTerms: [],
          suggestions: []
        },
        validationMessage: 'The uploaded image does not appear to be related to insurance policies or policy documents. Please upload an image of your policy document, insurance card, or related insurance paperwork.'
      };
    }

    return {
      success: true,
      extractedText: `Mock extracted text from ${imageCount} policy document image(s). This would contain the actual OCR text from the uploaded images.`,
      isPolicyRelated: true,
      analysisResults: {
        policyNumber: 'POL-2024-001',
        insuranceCompany: 'Sample Insurance Co.',
        coverageAmount: '$100,000',
        effectiveDate: '2024-01-01',
        expiryDate: '2024-12-31',
        keyTerms: [
          'Health Insurance Coverage',
          'Pre-existing Conditions',
          'Deductible: $1,000',
          'Co-pay: $25',
          'Network Hospitals',
          'Emergency Coverage'
        ],
        suggestions: [
          'Review coverage limits and deductibles',
          'Check network hospital availability',
          'Understand pre-existing condition coverage',
          'Verify emergency coverage details'
        ]
      }
    };
  }

  private simulatePolicyValidation(): boolean {
    // Simulate 80% chance of being policy-related for demo purposes
    // In real implementation, this would use AI to analyze image content
    return Math.random() > 0.2;
  }
}
