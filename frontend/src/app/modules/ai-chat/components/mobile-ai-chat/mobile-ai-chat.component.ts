import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { VoiceAIService, VoiceCommand } from '@core/services/voice-ai.service';
import { GestureAIService, GestureEvent, GestureAIResponse } from '@core/services/gesture-ai.service';
import { OfflineAIService, OfflineAIResponse } from '@core/services/offline-ai.service';
import { AIService } from '@core/services/ai.service';
import { Policy } from '@core/models/policy.model';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  isOffline?: boolean;
  confidence?: number;
  suggestions?: string[];
}

@Component({
  selector: 'app-mobile-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mobile-ai-chat" 
         [class.dark]="isDarkMode"
         [class.voice-mode]="isVoiceMode"
         [class.offline-mode]="isOfflineMode"
         #chatContainer>
      
      <!-- Header -->
      <div class="chat-header">
        <div class="header-left">
          <button class="back-btn" (click)="onBack()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <div class="header-info">
            <h3>AI Assistant</h3>
            <p class="status-text" [class.offline]="isOfflineMode">
              {{ isOfflineMode ? 'Offline Mode' : 'Online' }}
            </p>
          </div>
        </div>
        
        <div class="header-actions">
          <button class="action-btn" 
                  [class.active]="isVoiceMode"
                  (click)="toggleVoiceMode()"
                  [disabled]="isListening">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
          </button>
          
          <button class="action-btn" (click)="toggleOfflineMode()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div class="messages-container" #messagesContainer>
        <div class="messages" *ngIf="messages.length > 0; else emptyState">
          <div *ngFor="let message of messages" 
               class="message" 
               [class.user]="message.type === 'user'"
               [class.ai]="message.type === 'ai'"
               [class.system]="message.type === 'system'"
               [class.voice]="message.isVoice"
               [class.offline]="message.isOffline">
            
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              
              <div class="message-meta">
                <span class="timestamp">{{ message.timestamp | date:'short' }}</span>
                <span *ngIf="message.isVoice" class="voice-indicator">🎤</span>
                <span *ngIf="message.isOffline" class="offline-indicator">📱</span>
                <span *ngIf="message.confidence" class="confidence">
                  {{ (message.confidence * 100).toFixed(0) }}%
                </span>
              </div>
              
              <div *ngIf="message.suggestions && message.suggestions.length > 0" 
                   class="suggestions">
                <div *ngFor="let suggestion of message.suggestions" 
                     class="suggestion-chip"
                     (click)="useSuggestion(suggestion)">
                  {{ suggestion }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="empty-state">
            <div class="empty-icon">🤖</div>
            <h4>AI Assistant Ready</h4>
            <p>Ask me anything about your policy or use voice input</p>
            <div class="quick-actions">
              <button class="quick-action" (click)="sendQuickMessage('Summarize this policy')">
                📄 Summarize
              </button>
              <button class="quick-action" (click)="sendQuickMessage('What are the key terms?')">
                🔑 Key Terms
              </button>
              <button class="quick-action" (click)="sendQuickMessage('Check compliance')">
                ✅ Compliance
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
        <p>Listening... Speak now</p>
        <button class="stop-recording" (click)="stopVoiceInput()">Stop</button>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-container">
          <button class="voice-btn" 
                  [class.active]="isVoiceMode"
                  (click)="toggleVoiceMode()"
                  [disabled]="isListening">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
          </button>
          
          <input type="text" 
                 [(ngModel)]="currentMessage"
                 (keydown.enter)="sendMessage()"
                 placeholder="Type your message or use voice input..."
                 class="message-input"
                 [disabled]="isListening">
          
          <button class="send-btn" 
                  (click)="sendMessage()"
                  [disabled]="!currentMessage.trim() || isListening">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mobile-ai-chat {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--color-bg-primary);
      position: relative;
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border-primary);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .back-btn {
      padding: 0.5rem;
      border-radius: 0.5rem;
      background: transparent;
      border: none;
      color: var(--color-text-primary);
      cursor: pointer;
    }

    .header-info h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .status-text {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }

    .status-text.offline {
      color: #f59e0b;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      padding: 0.5rem;
      border-radius: 0.5rem;
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn.active {
      background: var(--color-primary);
      color: white;
    }

    .action-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .messages-container {
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

    .message.offline .message-content::after {
      content: '📱';
      position: absolute;
      right: -1.5rem;
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

    .voice-indicator,
    .offline-indicator {
      font-size: 0.875rem;
    }

    .confidence {
      background: rgba(0, 0, 0, 0.1);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    .suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .suggestion-chip {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .suggestion-chip:hover {
      background: var(--color-primary);
      color: white;
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

    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }

    .quick-action {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
      padding: 0.5rem 1rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .quick-action:hover {
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

    .voice-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
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
    .dark .mobile-ai-chat {
      background: var(--color-bg-primary);
    }

    .dark .chat-header {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
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
      .chat-header {
        padding: 0.75rem;
      }

      .messages-container {
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
export class MobileAIChatComponent implements OnInit, OnDestroy {
  @Input() policy: Policy | null = null;
  @Input() isDarkMode = false;
  @Output() back = new EventEmitter<void>();

  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  currentMessage = '';
  isVoiceMode = false;
  isListening = false;
  isOfflineMode = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private voiceAIService: VoiceAIService,
    private gestureAIService: GestureAIService,
    private offlineAIService: OfflineAIService,
    private aiService: AIService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.initializeGestures();
    this.addWelcomeMessage();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.gestureAIService.cleanup(this.chatContainer.nativeElement);
  }

  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.offlineAIService.offlineMode$.subscribe(offline => {
        this.isOfflineMode = offline;
      })
    );
  }

  private initializeGestures(): void {
    if (this.chatContainer) {
      this.gestureAIService.initializeGestureDetection(this.chatContainer.nativeElement);
      
      this.subscriptions.push(
        this.gestureAIService.gesture$.subscribe(gesture => {
          if (gesture) {
            this.handleGesture(gesture);
          }
        })
      );
    }
  }

  private addWelcomeMessage(): void {
    this.messages.push({
      id: 'welcome',
      type: 'system',
      content: `Welcome! I'm your AI assistant. I can help you understand your policy, answer questions, and provide insights. ${this.isOfflineMode ? 'Currently in offline mode.' : ''}`,
      timestamp: new Date()
    });
  }

  private handleGesture(gesture: GestureEvent): void {
    const response = this.gestureAIService.interpretGesture(gesture, 'ai_chat');
    
    switch (response.action) {
      case 'analyze':
        this.sendQuickMessage('Analyze this policy for compliance issues');
        break;
      case 'summarize':
        this.sendQuickMessage('Provide a brief summary of this policy');
        break;
      case 'highlight':
        this.sendQuickMessage('Highlight the most important sections');
        break;
      case 'search':
        this.sendQuickMessage('Search for key terms in this policy');
        break;
    }
  }

  toggleVoiceMode(): void {
    this.isVoiceMode = !this.isVoiceMode;
    
    if (this.isVoiceMode && !this.isListening) {
      this.startVoiceInput();
    }
  }

  toggleOfflineMode(): void {
    this.offlineAIService.setOfflineMode(!this.isOfflineMode);
  }

  startVoiceInput(): void {
    this.isListening = true;
    
    this.subscriptions.push(
      this.voiceAIService.startListening().subscribe({
        next: (command) => {
          this.handleVoiceCommand(command);
        },
        error: (error) => {
          console.error('Voice input error:', error);
          this.isListening = false;
        }
      })
    );
  }

  stopVoiceInput(): void {
    this.voiceAIService.stopListening();
    this.isListening = false;
  }

  private handleVoiceCommand(command: VoiceCommand): void {
    this.isListening = false;
    
    // Add user message
    this.addMessage({
      type: 'user',
      content: command.content,
      isVoice: true,
      confidence: command.confidence
    });

    // Process command
    switch (command.type) {
      case 'create_policy':
        this.processVoicePolicyCreation(command.content);
        break;
      case 'ai_chat':
        this.processAIChat(command.content);
        break;
      default:
        this.processAIChat(command.content);
    }
  }

  private processVoicePolicyCreation(content: string): void {
    this.subscriptions.push(
      this.voiceAIService.createPolicyFromVoice(content).subscribe({
        next: (draft) => {
          this.addMessage({
            type: 'ai',
            content: `I've created a policy draft based on your voice input: "${draft.title}". Here are some suggestions: ${draft.suggestions.join(', ')}`,
            isOffline: this.isOfflineMode,
            suggestions: draft.suggestions
          });
        },
        error: (error) => {
          this.addMessage({
            type: 'ai',
            content: 'I had trouble processing your voice input. Please try again or type your message.',
            isOffline: this.isOfflineMode
          });
        }
      })
    );
  }

  private processAIChat(content: string): void {
    if (this.isOfflineMode) {
      this.processOfflineChat(content);
    } else {
      this.processOnlineChat(content);
    }
  }

  private processOfflineChat(content: string): void {
    // Use offline AI capabilities
    this.subscriptions.push(
      this.offlineAIService.analyzeText(content).subscribe({
        next: (response) => {
          if (response.success) {
            this.addMessage({
              type: 'ai',
              content: `Offline analysis complete. Word count: ${response.result.wordCount}, Complexity: ${response.result.complexity}`,
              isOffline: true,
              confidence: response.confidence
            });
          }
        }
      })
    );
  }

  private processOnlineChat(content: string): void {
    // Use online AI service
    if (this.policy) {
      this.subscriptions.push(
        this.aiService.askQuestion(content, this.policy._id).subscribe({
          next: (response) => {
            this.addMessage({
              type: 'ai',
              content: response.answer,
              suggestions: response.suggestions
            });
          },
          error: (error) => {
            this.addMessage({
              type: 'ai',
              content: 'I encountered an error processing your request. Please try again.'
            });
          }
        })
      );
    }
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

  sendQuickMessage(message: string): void {
    this.currentMessage = message;
    this.sendMessage();
  }

  useSuggestion(suggestion: string): void {
    this.currentMessage = suggestion;
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

  onBack(): void {
    this.back.emit();
  }
}
