import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MobilePDFAIService, VoiceProfile } from '@core/services/mobile-pdf-ai.service';
import { AIService } from '@core/services/ai.service';
import { VoiceAIService } from '@core/services/voice-ai.service';
import { Policy } from '@core/models/policy.model';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  confidence?: number;
  followUpQuestions?: string[];
  relatedSections?: Array<{
    section: string;
    relevance: number;
    excerpt: string;
  }>;
}

@Component({
  selector: 'app-voice-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="voice-ai-chat" [class.dark]="isDarkMode">
      
      <!-- Voice Profile Status -->
      <div class="voice-profile-status" *ngIf="voiceProfile">
        <div class="profile-info">
          <i class="fas fa-microphone-alt"></i>
          <span>Voice Profile Active</span>
          <button class="delete-voice" (click)="deleteVoiceProfile()" title="Delete Voice Profile">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <!-- Voice Setup (if no profile) -->
      <div class="voice-setup" *ngIf="!voiceProfile && !isSettingUpVoice">
        <div class="setup-content">
          <h4>🎤 Set Up Your Voice Profile</h4>
          <p>Create a personalized voice profile for better AI understanding</p>
          <button class="setup-btn" (click)="startVoiceSetup()">
            <i class="fas fa-microphone"></i>
            Record Voice Sample
          </button>
        </div>
      </div>

      <!-- Voice Recording Setup -->
      <div class="voice-recording-setup" *ngIf="isSettingUpVoice">
        <div class="recording-content">
          <h4>🎤 Record Your Voice Sample</h4>
          <p>Please read the following text clearly:</p>
          <div class="sample-text">
            "Hello, I am setting up my voice profile for PolicyPal. 
            I want to ask questions about my insurance policies and get detailed answers. 
            Please help me understand my coverage, exclusions, and claim procedures."
          </div>
          
          <div class="recording-controls">
            <button 
              class="record-btn" 
              [class.recording]="isRecording"
              (click)="toggleRecording()"
              [disabled]="isProcessing">
              <i class="fas" [ngClass]="isRecording ? 'fa-stop' : 'fa-microphone'"></i>
              {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
            </button>
            
            <div class="recording-timer" *ngIf="isRecording">
              {{ recordingTime }}s
            </div>
          </div>

          <div class="setup-actions">
            <button class="cancel-btn" (click)="cancelVoiceSetup()">Cancel</button>
            <button 
              class="save-btn" 
              (click)="saveVoiceProfile()"
              [disabled]="!hasRecordedVoice || isProcessing">
              Save Voice Profile
            </button>
          </div>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="chat-messages" #messagesContainer>
        <div class="messages" *ngIf="messages.length > 0; else emptyState">
          <div *ngFor="let message of messages" 
               class="message" 
               [class.user]="message.type === 'user'"
               [class.ai]="message.type === 'ai'"
               [class.system]="message.type === 'system'"
               [class.voice]="message.isVoice">
            
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              
              <div class="message-meta">
                <span class="timestamp">{{ message.timestamp | date:'short' }}</span>
                <span *ngIf="message.isVoice" class="voice-indicator">🎤</span>
                <span *ngIf="message.confidence" class="confidence">
                  {{ (message.confidence * 100).toFixed(0) }}% confidence
                </span>
              </div>

              <!-- Follow-up Questions -->
              <div *ngIf="message.followUpQuestions && message.followUpQuestions.length > 0" 
                   class="follow-up-questions">
                <h5>Related Questions:</h5>
                <div class="question-chips">
                  <button *ngFor="let question of message.followUpQuestions" 
                          class="question-chip"
                          (click)="askFollowUpQuestion(question)">
                    {{ question }}
                  </button>
                </div>
              </div>

              <!-- Related Sections -->
              <div *ngIf="message.relatedSections && message.relatedSections.length > 0" 
                   class="related-sections">
                <h5>Related Policy Sections:</h5>
                <div class="section-list">
                  <div *ngFor="let section of message.relatedSections" 
                       class="section-item"
                       [class.high-relevance]="section.relevance > 0.8">
                    <div class="section-name">{{ section.section }}</div>
                    <div class="section-excerpt">{{ section.excerpt }}</div>
                    <div class="relevance-score">{{ (section.relevance * 100).toFixed(0) }}% relevant</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="empty-state">
            <div class="empty-icon">🤖</div>
            <h4>AI Policy Assistant</h4>
            <p>Ask me anything about your {{ policy?.title || 'policy' }}</p>
            <div class="quick-questions">
              <button class="quick-question" (click)="askQuickQuestion('What is covered under this policy?')">
                What's covered?
              </button>
              <button class="quick-question" (click)="askQuickQuestion('What are the exclusions?')">
                What's excluded?
              </button>
              <button class="quick-question" (click)="askQuickQuestion('How do I file a claim?')">
                How to claim?
              </button>
              <button class="quick-question" (click)="askQuickQuestion('What is the coverage amount?')">
                Coverage amount?
              </button>
            </div>
          </div>
        </ng-template>
      </div>

      <!-- Voice Recording Indicator -->
      <div class="voice-recording" *ngIf="isListening">
        <div class="recording-animation">
          <div class="pulse"></div>
          <div class="pulse"></div>
          <div class="pulse"></div>
        </div>
        <p>Listening... Ask your question</p>
        <button class="stop-recording" (click)="stopVoiceInput()">Stop</button>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-container">
          <button class="voice-btn" 
                  [class.active]="isVoiceMode"
                  (click)="toggleVoiceMode()"
                  [disabled]="isListening || !voiceProfile">
            <i class="fas fa-microphone"></i>
          </button>
          
          <input type="text" 
                 [(ngModel)]="currentMessage"
                 (keydown.enter)="sendMessage()"
                 placeholder="Ask about your policy..."
                 class="message-input"
                 [disabled]="isListening">
          
          <button class="send-btn" 
                  (click)="sendMessage()"
                  [disabled]="!currentMessage.trim() || isListening">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .voice-ai-chat {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--color-bg-primary);
    }

    .voice-profile-status {
      background: #10b981;
      color: white;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .profile-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .delete-voice {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
    }

    .voice-setup {
      background: var(--color-bg-secondary);
      padding: 2rem;
      text-align: center;
    }

    .setup-content h4 {
      margin: 0 0 0.5rem 0;
      color: var(--color-text-primary);
    }

    .setup-content p {
      margin: 0 0 1.5rem 0;
      color: var(--color-text-secondary);
    }

    .setup-btn {
      background: var(--color-primary);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 auto;
    }

    .voice-recording-setup {
      background: var(--color-bg-secondary);
      padding: 2rem;
    }

    .recording-content h4 {
      margin: 0 0 1rem 0;
      color: var(--color-text-primary);
    }

    .sample-text {
      background: var(--color-bg-primary);
      padding: 1rem;
      border-radius: 0.5rem;
      margin: 1rem 0;
      font-style: italic;
      color: var(--color-text-secondary);
    }

    .recording-controls {
      text-align: center;
      margin: 1.5rem 0;
    }

    .record-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 auto;
      font-size: 1.1rem;
    }

    .record-btn.recording {
      background: #dc2626;
      animation: pulse 1s infinite;
    }

    .recording-timer {
      margin-top: 0.5rem;
      font-size: 1.2rem;
      font-weight: bold;
      color: var(--color-text-primary);
    }

    .setup-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .cancel-btn, .save-btn {
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
    }

    .cancel-btn {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
    }

    .save-btn {
      background: var(--color-primary);
      color: white;
      border: none;
    }

    .save-btn:disabled {
      background: var(--color-text-tertiary);
      cursor: not-allowed;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .messages {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .message {
      max-width: 85%;
      animation: slideIn 0.3s ease-out;
    }

    .message.user {
      align-self: flex-end;
    }

    .message.ai {
      align-self: flex-start;
    }

    .message.system {
      align-self: center;
      max-width: 100%;
    }

    .message-content {
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      position: relative;
    }

    .message.user .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      border-bottom-right-radius: 0.25rem;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    /* Override any inner content styling */
    .message.user .message-content * {
      background: transparent !important;
      color: inherit !important;
    }

    .message.user .message-content div,
    .message.user .message-content p,
    .message.user .message-content span {
      background: transparent !important;
      color: inherit !important;
    }

    .message.ai .message-content {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border-bottom-left-radius: 0.25rem;
    }

    .message.system .message-content {
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
      text-align: center;
      font-size: 0.875rem;
    }

    .message.voice .message-content::before {
      content: '🎤';
      position: absolute;
      left: -1.5rem;
      top: 50%;
      transform: translateY(-50%);
    }

    .message-text {
      line-height: 1.5;
      word-wrap: break-word;
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      opacity: 0.7;
    }

    .voice-indicator {
      font-size: 0.875rem;
    }

    .confidence {
      background: rgba(0, 0, 0, 0.1);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    .follow-up-questions {
      margin-top: 1rem;
    }

    .follow-up-questions h5 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .question-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .question-chip {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .question-chip:hover {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .related-sections {
      margin-top: 1rem;
    }

    .related-sections h5 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--color-text-secondary;
    }

    .section-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .section-item {
      background: var(--color-bg-tertiary);
      padding: 0.75rem;
      border-radius: 0.5rem;
      border-left: 3px solid var(--color-border-primary);
    }

    .section-item.high-relevance {
      border-left-color: var(--color-primary);
      background: rgba(59, 130, 246, 0.1);
    }

    .section-name {
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: 0.25rem;
    }

    .section-excerpt {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.25rem;
    }

    .relevance-score {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 2rem;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state h4 {
      margin: 0 0 0.5rem 0;
      color: var(--color-text-primary);
    }

    .empty-state p {
      margin: 0 0 1.5rem 0;
      color: var(--color-text-secondary);
    }

    .quick-questions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }

    .quick-question {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
      padding: 0.5rem 1rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .quick-question:hover {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .voice-recording {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--color-bg-secondary);
      border: 2px solid var(--color-primary);
      border-radius: 1rem;
      padding: 2rem;
      text-align: center;
      z-index: 20;
    }

    .recording-animation {
      display: flex;
      justify-content: center;
      gap: 0.25rem;
      margin-bottom: 1rem;
    }

    .pulse {
      width: 0.5rem;
      height: 0.5rem;
      background: var(--color-primary);
      border-radius: 50%;
      animation: pulse 1s infinite;
    }

    .pulse:nth-child(2) {
      animation-delay: 0.2s;
    }

    .pulse:nth-child(3) {
      animation-delay: 0.4s;
    }

    .stop-recording {
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      margin-top: 0.5rem;
    }

    .input-area {
      padding: 1rem;
      background: var(--color-bg-secondary);
      border-top: 1px solid var(--color-border-primary);
    }

    .input-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 1.5rem;
      padding: 0.5rem 1rem;
    }

    .voice-btn {
      padding: 0.5rem;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .voice-btn.active {
      background: var(--color-primary);
      color: white;
    }

    .voice-btn:hover:not(:disabled) {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .voice-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .message-input {
      flex: 1;
      border: none;
      background: transparent;
      color: var(--color-text-primary);
      font-size: 1rem;
      outline: none;
    }

    .message-input::placeholder {
      color: var(--color-text-tertiary);
    }

    .send-btn {
      padding: 0.5rem;
      border-radius: 50%;
      background: var(--color-primary);
      border: none;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .send-btn:disabled {
      background: var(--color-text-tertiary);
      cursor: not-allowed;
    }

    .send-btn:hover:not(:disabled) {
      background: #2563eb;
    }

    /* Dark mode */
    .dark .voice-ai-chat {
      background: var(--color-bg-primary);
    }

    .dark .voice-setup {
      background: var(--color-bg-secondary);
    }

    .dark .voice-recording-setup {
      background: var(--color-bg-secondary);
    }

    .dark .message.user .message-content {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
      color: white !important;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.4);
    }

    /* Override any inner content styling in dark mode */
    .dark .message.user .message-content * {
      background: transparent !important;
      color: inherit !important;
    }

    .dark .message.user .message-content div,
    .dark .message.user .message-content p,
    .dark .message.user .message-content span {
      background: transparent !important;
      color: inherit !important;
    }

    .dark .message.ai .message-content {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }

    .dark .message.system .message-content {
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
    }

    .dark .input-area {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .input-container {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    /* Animations */
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(1rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.2);
      }
    }

    /* Responsive */
    @media (max-width: 480px) {
      .voice-setup, .voice-recording-setup {
        padding: 1rem;
      }

      .chat-messages {
        padding: 0.75rem;
      }

      .input-area {
        padding: 0.75rem;
      }

      .message {
        max-width: 90%;
      }
    }
  `]
})
export class VoiceAIChatComponent implements OnInit, OnDestroy {
  @Input() policy: Policy | null = null;
  @Input() isDarkMode = false;
  @Output() back = new EventEmitter<void>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  currentMessage = '';
  isVoiceMode = false;
  isListening = false;
  isSettingUpVoice = false;
  isRecording = false;
  hasRecordedVoice = false;
  isProcessing = false;
  recordingTime = 0;
  voiceProfile: VoiceProfile | null = null;

  private subscriptions: Subscription[] = [];
  private recordingInterval: any = null;

  constructor(
    private mobilePDFAIService: MobilePDFAIService,
    private aiService: AIService,
    private voiceAIService: VoiceAIService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.loadVoiceProfile();
    this.addWelcomeMessage();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
  }

  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.mobilePDFAIService.voiceProfile$.subscribe(profile => {
        this.voiceProfile = profile;
      }),
      this.mobilePDFAIService.isProcessing$.subscribe(processing => {
        this.isProcessing = processing;
      })
    );
  }

  private async loadVoiceProfile(): Promise<void> {
    if (this.policy?.userId) {
      this.voiceProfile = await this.mobilePDFAIService.getVoiceProfile(this.policy.userId);
    }
  }

  private addWelcomeMessage(): void {
    this.messages.push({
      id: 'welcome',
      type: 'system',
      content: `Welcome! I'm your AI Policy Assistant. I can help you understand every detail of your ${this.policy?.title || 'policy'}. Ask me anything!`,
      timestamp: new Date()
    });
  }

  startVoiceSetup(): void {
    this.isSettingUpVoice = true;
    this.hasRecordedVoice = false;
  }

  cancelVoiceSetup(): void {
    this.isSettingUpVoice = false;
    this.isRecording = false;
    this.hasRecordedVoice = false;
    this.recordingTime = 0;
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
  }

  toggleRecording(): void {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  private startRecording(): void {
    this.isRecording = true;
    this.recordingTime = 0;
    this.recordingInterval = setInterval(() => {
      this.recordingTime++;
    }, 1000);

    // Simulate voice recording
    setTimeout(() => {
      this.hasRecordedVoice = true;
    }, 3000);
  }

  private stopRecording(): void {
    this.isRecording = false;
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
  }

  async saveVoiceProfile(): Promise<void> {
    if (!this.policy?.userId || !this.hasRecordedVoice) return;

    this.isProcessing = true;
    
    try {
      const result = await this.mobilePDFAIService.createVoiceProfile(
        this.policy.userId,
        'recorded_voice_data' // In real implementation, this would be actual voice data
      );

      if (result.success) {
        this.isSettingUpVoice = false;
        this.addMessage({
          type: 'system',
          content: 'Voice profile created successfully! You can now use voice commands.'
        });
      } else {
        this.addMessage({
          type: 'system',
          content: 'Failed to create voice profile. Please try again.'
        });
      }
    } catch (error) {
      this.addMessage({
        type: 'system',
        content: 'Error creating voice profile. Please try again.'
      });
    } finally {
      this.isProcessing = false;
    }
  }

  async deleteVoiceProfile(): Promise<void> {
    if (!this.policy?.userId) return;

    const success = await this.mobilePDFAIService.deleteVoiceProfile(this.policy.userId);
    if (success) {
      this.addMessage({
        type: 'system',
        content: 'Voice profile deleted successfully.'
      });
    }
  }

  toggleVoiceMode(): void {
    this.isVoiceMode = !this.isVoiceMode;
    
    if (this.isVoiceMode && !this.isListening && this.voiceProfile) {
      this.startVoiceInput();
    }
  }

  startVoiceInput(): void {
    if (this.isListening || !this.voiceProfile) return;

    this.isListening = true;
    this.isVoiceMode = true;
    
    // Use the enhanced voice service for real speech recognition
    this.voiceAIService.startListening().subscribe({
      next: (command) => {
        this.handleVoiceCommand(command);
      },
      error: (error) => {
        console.error('Voice input error:', error);
        this.isListening = false;
        this.addMessage({
          type: 'system',
          content: 'Voice input failed. Please try again.',
          timestamp: new Date()
        });
      }
    });
  }

  private handleVoiceCommand(command: any): void {
    this.addMessage({
      type: 'user',
      content: command.content,
      timestamp: command.timestamp,
      isVoice: true,
      confidence: command.confidence
    });

    // Process the command based on type
    switch (command.type) {
      case 'ai_chat':
        this.processAIChatCommand(command.content);
        break;
      case 'create_policy':
        this.processCreatePolicyCommand(command.content);
        break;
      case 'search_policy':
        this.processSearchPolicyCommand(command.content);
        break;
      default:
        this.processAIChatCommand(command.content);
    }
  }

  private processAIChatCommand(content: string): void {
    // Send to AI service for processing
    this.mobilePDFAIService.askQuestionWithVoice(
      content,
      this.policy._id,
      this.policy.userId,
      this.voiceProfile?.voiceData
    ).subscribe({
      next: (response) => {
        this.addMessage({
          type: 'ai',
          content: response.answer,
          timestamp: new Date(),
          confidence: response.confidence
        });

        // Speak the AI response using text-to-speech
        if (response.answer) {
          this.voiceAIService.speak(response.answer, {
            rate: 0.9,
            pitch: 1.0,
            volume: 0.8
          }).catch(error => {
            console.warn('Text-to-speech failed:', error);
          });
        }
      },
      error: (error) => {
        this.addMessage({
          type: 'system',
          content: 'Sorry, I encountered an error processing your request.',
          timestamp: new Date()
        });
      }
    });
  }

  private processCreatePolicyCommand(content: string): void {
    this.addMessage({
      type: 'system',
      content: 'Creating policy from voice input...',
      timestamp: new Date()
    });

    // Implement policy creation logic
    this.voiceAIService.createPolicyFromVoice(content).subscribe({
      next: (draft) => {
        this.addMessage({
          type: 'ai',
          content: `Policy draft created: "${draft.title}". ${draft.description}`,
          timestamp: new Date()
        });
      },
      error: (error) => {
        this.addMessage({
          type: 'system',
          content: 'Failed to create policy draft. Please try again.',
          timestamp: new Date()
        });
      }
    });
  }

  private processSearchPolicyCommand(content: string): void {
    this.addMessage({
      type: 'system',
      content: 'Searching policies...',
      timestamp: new Date()
    });

    // Implement policy search logic
    // This would integrate with your existing policy search functionality
  }

  stopVoiceInput(): void {
    this.isListening = false;
    this.voiceAIService.stopListening();
  }

  private processAIChat(question: string): void {
    if (!this.policy) return;

    this.subscriptions.push(
      this.mobilePDFAIService.askQuestionWithVoice(
        question,
        this.policy._id,
        this.policy.userId,
        this.voiceProfile?.voiceData
      ).subscribe({
        next: (response) => {
          this.addMessage({
            type: 'ai',
            content: response.answer,
            confidence: response.confidence,
            followUpQuestions: response.followUpQuestions,
            relatedSections: response.relatedSections
          });
        },
        error: (error) => {
          this.addMessage({
            type: 'ai',
            content: 'I apologize, but I encountered an error processing your question. Please try again.'
          });
        }
      })
    );
  }

  sendMessage(): void {
    if (!this.currentMessage.trim()) return;

    this.addMessage({
      type: 'user',
      content: this.currentMessage
    });

    this.processAIChat(this.currentMessage);
    this.currentMessage = '';
  }

  askQuickQuestion(question: string): void {
    this.currentMessage = question;
    this.sendMessage();
  }

  askFollowUpQuestion(question: string): void {
    this.currentMessage = question;
    this.sendMessage();
  }

  private addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };

    this.messages.push(newMessage);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
