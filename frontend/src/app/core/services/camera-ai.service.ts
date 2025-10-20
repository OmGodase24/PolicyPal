import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CameraScanResult {
  success: boolean;
  text: string;
  confidence: number;
  documentType: 'policy' | 'contract' | 'form' | 'other';
  extractedData: {
    title?: string;
    policyNumber?: string;
    dates?: string[];
    amounts?: string[];
    parties?: string[];
  };
  suggestions: string[];
  error?: string;
}

export interface CameraSettings {
  quality: 'low' | 'medium' | 'high';
  flash: boolean;
  autoFocus: boolean;
  stabilization: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CameraAIService {
  private apiUrl = `${environment.apiUrl}/ai/camera`;
  private isSupported = new BehaviorSubject<boolean>(false);
  private isScanning = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.checkCameraSupport();
  }

  get isSupported$(): Observable<boolean> {
    return this.isSupported.asObservable();
  }

  get isScanning$(): Observable<boolean> {
    return this.isScanning.asObservable();
  }

  private checkCameraSupport(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      this.isSupported.next(true);
    } else {
      this.isSupported.next(false);
    }
  }

  async captureImage(settings: CameraSettings = {
    quality: 'high',
    flash: false,
    autoFocus: true,
    stabilization: true
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        reject('Camera not supported');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();

          video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            context?.drawImage(video, 0, 0);
            
            // Stop the camera stream
            stream.getTracks().forEach(track => track.stop());
            
            // Convert to base64
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            resolve(imageData);
          };

          video.onerror = () => {
            stream.getTracks().forEach(track => track.stop());
            reject('Failed to capture image');
          };
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  scanDocument(imageData: string): Observable<CameraScanResult> {
    this.isScanning.next(true);
    
    return this.http.post<CameraScanResult>(`${this.apiUrl}/scan-document`, {
      imageData,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => {
        this.isScanning.next(false);
        return response;
      }),
      catchError(error => {
        this.isScanning.next(false);
        return from([{
          success: false,
          text: '',
          confidence: 0,
          documentType: 'other' as const,
          extractedData: {},
          suggestions: [],
          error: error.message || 'Failed to scan document'
        }]);
      })
    );
  }

  async scanDocumentWithCamera(settings?: CameraSettings): Promise<CameraScanResult> {
    try {
      const imageData = await this.captureImage(settings);
      return this.scanDocument(imageData).toPromise() || {
        success: false,
        text: '',
        confidence: 0,
        documentType: 'other',
        extractedData: {},
        suggestions: [],
        error: 'Failed to process image'
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        confidence: 0,
        documentType: 'other',
        extractedData: {},
        suggestions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  enhanceImage(imageData: string): Observable<string> {
    return this.http.post<{enhancedImage: string}>(`${this.apiUrl}/enhance-image`, {
      imageData,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => response.enhancedImage),
      catchError(() => from([imageData])) // Return original if enhancement fails
    );
  }

  detectDocumentEdges(imageData: string): Observable<{corners: number[][], confidence: number}> {
    return this.http.post<{corners: number[][], confidence: number}>(`${this.apiUrl}/detect-edges`, {
      imageData,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => response),
      catchError(() => from([{corners: [], confidence: 0}]))
    );
  }

  extractTextFromImage(imageData: string): Observable<{text: string, confidence: number}> {
    return this.http.post<{text: string, confidence: number}>(`${this.apiUrl}/extract-text`, {
      imageData,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => response),
      catchError(() => from([{text: '', confidence: 0}]))
    );
  }

  analyzeDocumentStructure(imageData: string): Observable<{
    sections: Array<{title: string, content: string, confidence: number}>;
    tables: Array<{data: string[][], confidence: number}>;
    signatures: Array<{location: number[], confidence: number}>;
  }> {
    return this.http.post<{
      sections: Array<{title: string, content: string, confidence: number}>;
      tables: Array<{data: string[][], confidence: number}>;
      signatures: Array<{location: number[], confidence: number}>;
    }>(`${this.apiUrl}/analyze-structure`, {
      imageData,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => response),
      catchError(() => from([{
        sections: [],
        tables: [],
        signatures: []
      }]))
    );
  }

  validateDocumentQuality(imageData: string): Observable<{
    isBlurry: boolean;
    isDark: boolean;
    hasGlare: boolean;
    qualityScore: number;
    suggestions: string[];
  }> {
    return this.http.post<{
      isBlurry: boolean;
      isDark: boolean;
      hasGlare: boolean;
      qualityScore: number;
      suggestions: string[];
    }>(`${this.apiUrl}/validate-quality`, {
      imageData,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => response),
      catchError(() => from([{
        isBlurry: false,
        isDark: false,
        hasGlare: false,
        qualityScore: 0.5,
        suggestions: ['Ensure good lighting', 'Hold camera steady', 'Avoid glare']
      }]))
    );
  }
}
