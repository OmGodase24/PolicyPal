import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface VoiceCommand {
  type: 'create_policy' | 'edit_policy' | 'search_policy' | 'ai_chat' | 'scan_document';
  content: string;
  confidence: number;
  timestamp: Date;
}

export interface VoicePolicyDraft {
  title: string;
  description: string;
  content: string;
  category: string;
  confidence: number;
  suggestions: string[];
}

export interface VoiceAIResponse {
  success: boolean;
  command: VoiceCommand;
  policyDraft?: VoicePolicyDraft;
  suggestions?: string[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceAIService {
  private apiUrl = `${environment.apiUrl}/ai/voice`;
  private recognition: any;
  private isListening = new BehaviorSubject<boolean>(false);
  private isSupported = new BehaviorSubject<boolean>(false);
  private interimResults = new BehaviorSubject<string>('');
  private recognitionError = new BehaviorSubject<string>('');
  private voiceCommandSubject = new BehaviorSubject<VoiceCommand | null>(null);

  constructor(private http: HttpClient) {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Enhanced configuration for better accuracy
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
      
      // Add grammar for policy-related commands
      this.setupVoiceGrammar();
      
      this.isSupported.next(true);
      this.setupRecognitionEvents();
    } else {
      this.isSupported.next(false);
    }
  }

  private setupVoiceGrammar(): void {
    try {
      const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
      if (SpeechGrammarList) {
        const grammar = `
          #JSGF V1.0;
          grammar policyCommands;
          public <command> = 
            (create | add | new) policy |
            (edit | update | modify) policy |
            (search | find | look for) policy |
            (delete | remove) policy |
            (show | display | list) policies |
            (analyze | review) policy |
            (compare | contrast) policies |
            (summarize | summary) policy |
            (explain | tell me about) policy |
            (what is | what are) coverage |
            (how much | what is the cost) |
            (when | what time) does it expire |
            (who | what person) is covered |
            (where | what location) is covered |
            (why | what reason) is excluded |
            (help | assistance | support);
        `;
        
        const speechRecognitionList = new SpeechGrammarList();
        speechRecognitionList.addFromString(grammar, 1);
        this.recognition.grammars = speechRecognitionList;
      }
    } catch (error) {
      console.warn('Voice grammar setup failed:', error);
    }
  }

  private setupRecognitionEvents(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening.next(true);
      this.interimResults.next('');
      this.recognitionError.next('');
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Emit interim results for real-time feedback
      if (interimTranscript) {
        this.interimResults.next(interimTranscript);
      }

      // Process final results
      if (finalTranscript) {
        this.processVoiceCommand(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening.next(false);
      this.handleRecognitionError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening.next(false);
    };
  }

  private handleRecognitionError(error: string): void {
    let errorMessage = 'Speech recognition error occurred.';
    
    switch (error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Microphone not available. Please check your microphone.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access denied. Please allow microphone access.';
        break;
      case 'network':
        errorMessage = 'Network error. Please check your connection.';
        break;
      case 'aborted':
        errorMessage = 'Speech recognition aborted.';
        break;
    }
    
    this.recognitionError.next(errorMessage);
  }

  get isListening$(): Observable<boolean> {
    return this.isListening.asObservable();
  }

  get isSupported$(): Observable<boolean> {
    return this.isSupported.asObservable();
  }

  get interimResults$(): Observable<string> {
    return this.interimResults.asObservable();
  }

  get recognitionError$(): Observable<string> {
    return this.recognitionError.asObservable();
  }

  get voiceCommand$(): Observable<VoiceCommand | null> {
    return this.voiceCommandSubject.asObservable();
  }

  startListening(): Observable<VoiceCommand> {
    return new Observable(observer => {
      if (!this.recognition) {
        observer.error('Speech recognition not supported');
        return;
      }

      if (this.isListening.value) {
        observer.error('Already listening');
        return;
      }

      this.recognition.start();
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening.value) {
      this.recognition.stop();
    }
  }

  // Text-to-Speech functionality
  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number; voice?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject('Text-to-speech not supported');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure speech parameters
      utterance.rate = options?.rate || 1;
      utterance.pitch = options?.pitch || 1;
      utterance.volume = options?.volume || 1;
      
      // Set voice if specified
      if (options?.voice) {
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(voice => voice.name === options.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);

      speechSynthesis.speak(utterance);
    });
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return speechSynthesis.getVoices();
  }

  stopSpeaking(): void {
    speechSynthesis.cancel();
  }

  // Enhanced voice command processing
  private processVoiceCommand(transcript: string): void {
    const command = this.classifyVoiceCommand(transcript);
    
    // Emit the command for components to handle
    this.voiceCommandSubject.next(command);
  }

  private classifyVoiceCommand(transcript: string): VoiceCommand {
    const lowerTranscript = transcript.toLowerCase();
    
    // Enhanced command classification
    let type: VoiceCommand['type'] = 'ai_chat';
    let confidence = 0.8;

    if (lowerTranscript.includes('create') || lowerTranscript.includes('add') || lowerTranscript.includes('new')) {
      type = 'create_policy';
      confidence = 0.9;
    } else if (lowerTranscript.includes('edit') || lowerTranscript.includes('update') || lowerTranscript.includes('modify')) {
      type = 'edit_policy';
      confidence = 0.9;
    } else if (lowerTranscript.includes('search') || lowerTranscript.includes('find') || lowerTranscript.includes('look for')) {
      type = 'search_policy';
      confidence = 0.9;
    } else if (lowerTranscript.includes('scan') || lowerTranscript.includes('document')) {
      type = 'scan_document';
      confidence = 0.8;
    }

    return {
      type,
      content: transcript,
      confidence,
      timestamp: new Date()
    };
  }

  private processVoiceCommand(transcript: string, confidence: number): Observable<VoiceCommand> {
    return this.http.post<VoiceAIResponse>(`${this.apiUrl}/process-command`, {
      transcript,
      confidence,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => response.command),
      catchError(() => {
        // Fallback to simple command detection
        return from([this.detectSimpleCommand(transcript, confidence)]);
      })
    );
  }

  private detectSimpleCommand(transcript: string, confidence: number): VoiceCommand {
    const lowerTranscript = transcript.toLowerCase();
    
    if (lowerTranscript.includes('create policy') || lowerTranscript.includes('new policy')) {
      return {
        type: 'create_policy',
        content: transcript,
        confidence,
        timestamp: new Date()
      };
    } else if (lowerTranscript.includes('edit policy') || lowerTranscript.includes('modify policy')) {
      return {
        type: 'edit_policy',
        content: transcript,
        confidence,
        timestamp: new Date()
      };
    } else if (lowerTranscript.includes('search') || lowerTranscript.includes('find policy')) {
      return {
        type: 'search_policy',
        content: transcript,
        confidence,
        timestamp: new Date()
      };
    } else if (lowerTranscript.includes('ai chat') || lowerTranscript.includes('ask ai')) {
      return {
        type: 'ai_chat',
        content: transcript,
        confidence,
        timestamp: new Date()
      };
    } else if (lowerTranscript.includes('scan document') || lowerTranscript.includes('scan paper')) {
      return {
        type: 'scan_document',
        content: transcript,
        confidence,
        timestamp: new Date()
      };
    } else {
      return {
        type: 'create_policy',
        content: transcript,
        confidence,
        timestamp: new Date()
      };
    }
  }

  createPolicyFromVoice(voiceContent: string): Observable<VoicePolicyDraft> {
    return this.http.post<VoiceAIResponse>(`${this.apiUrl}/create-policy`, {
      voiceContent,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => response.policyDraft!),
      catchError(() => {
        // Fallback to simple policy creation
        return from([this.createSimplePolicyDraft(voiceContent)]);
      })
    );
  }

  private createSimplePolicyDraft(voiceContent: string): VoicePolicyDraft {
    // Simple AI-powered policy draft creation
    const lines = voiceContent.split('.').filter(line => line.trim().length > 0);
    const title = lines[0]?.trim() || 'Voice-Created Policy';
    const description = lines[1]?.trim() || 'Policy created from voice input';
    const content = lines.slice(2).join('. ').trim() || voiceContent;

    return {
      title,
      description,
      content,
      category: 'General',
      confidence: 0.8,
      suggestions: [
        'Add specific terms and conditions',
        'Include coverage limits and exclusions',
        'Specify claim procedures',
        'Add contact information'
      ]
    };
  }

  getVoiceSuggestions(context: string): Observable<string[]> {
    return this.http.post<{suggestions: string[]}>(`${this.apiUrl}/suggestions`, {
      context,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => response.suggestions),
      catchError(() => from([[
        'Add coverage details',
        'Include exclusions',
        'Specify terms and conditions',
        'Add contact information'
      ]]))
    );
  }
}
