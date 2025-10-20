import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { AIService } from '@core/services/ai.service';
import { AuthService } from '@core/services/auth.service';
import { PolicyService } from '@core/services/policy.service';
import { NotificationService } from '@core/services/notification.service';
import { ChatHistoryService } from '@core/services/chat-history.service';
import { UserPreferencesService } from '@core/services/user-preferences.service';
import { AiHtmlRenderService } from '@core/services/ai-html-render.service';
import { ImageAnalysisService } from '@core/services/image-analysis.service';
import { Policy } from '@core/models/policy.model';
import { CreateChatHistoryRequest } from '@core/models/chat-history.model';
import { SummaryLevel, PolicySummaryInfo } from '@core/models/summary-level.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  htmlContent?: any; // SafeHtml for rendered content
  timestamp: Date;
  confidence?: number;
  sources?: Array<any>;
  showSources?: boolean;
  images?: string[]; // Base64 image data
  isImageMessage?: boolean; // Flag for image-only messages
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss']
})
export class AIChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessagesElement') chatMessagesElement!: ElementRef;
  
  chatForm: FormGroup;
  chatMessages: ChatMessage[] = [];
  policy: Policy | null = null;
  sessionId: string = '';
  username: string | null = null;
  sessionSummary: string | null = null;
  policySummary: string | null = null;
  summaryLoaded = false;
  sending = false;
  showReprocessButton = false;
  
  // Summary level management
  summaryLevel: SummaryLevel = SummaryLevel.STANDARD;
  summaryInfo: PolicySummaryInfo | null = null;
  
  // Suggested questions feature
  showSuggestions: boolean = true;
  suggestedQuestions: string[] = [];
  
  // Image upload feature
  selectedImages: string[] = [];
  maxImages: number = 3;
  isEmergencyMode: boolean = false; // When user doesn't have PDF
  showImageUpload: boolean = false;
  hasMainPolicy: boolean = false; // Whether user has main policy (PDF or emergency image)
  
  // Expose SummaryLevel enum to template
  SummaryLevel = SummaryLevel;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private aiService: AIService,
    private policyService: PolicyService,
    private chatHistoryService: ChatHistoryService,
    private userPreferencesService: UserPreferencesService,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private aiHtmlRenderService: AiHtmlRenderService,
    private imageAnalysisService: ImageAnalysisService
  ) {
    this.chatForm = this.fb.group({
      message: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('🚀 AI Chat Component Initializing...');
    
    // Initialize suggested questions
    this.initializeSuggestedQuestions();
    
    // Try to get data from navigation state first
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      console.log('📡 Navigation state received:', state);
      
      this.policy = state.policy;
      this.username = state.username || null;
      this.sessionId = state.session?.sessionId || this.generateSessionId();
      this.sessionSummary = state.session?.summary || null;
      
      console.log('✅ Data extracted from navigation state:');
      console.log('  - Policy:', this.policy);
      console.log('  - Username:', this.username);
      console.log('  - Session ID:', this.sessionId);
      console.log('  - Session Summary:', this.sessionSummary);
      
      // Load policy summary if we have a policy
      if (this.policy) {
        this.hasMainPolicy = true; // User has main policy (PDF)
        this.loadPolicySummary();
        // Check if policy has AI processing issues
        this.checkPolicyAIStatus();
        // Show notification for AI chat session start
        this.notificationService.showInfo(`🤖 AI Chat session started for "${this.policy.title}"`);
      }
    } else {
      console.log('⚠️ No navigation state, trying to get data from current route...');
      // Try to get data from current route if no navigation state
      this.getDataFromCurrentRoute();
    }

    // Welcome message is now handled by the welcome section in the template
    // No need to add duplicate welcome messages to chat
  }

  private getDataFromCurrentRoute(): void {
    // Get policy ID from route params
    this.route.params.subscribe(params => {
      const policyId = params['policyId'];
      console.log('🔍 Policy ID from route:', policyId);
      
      if (policyId) {
        // Get policy data from service
        this.policyService.getPolicy(policyId).subscribe({
          next: (policy: Policy) => {
            console.log('📋 Policy loaded from service:', policy);
            this.policy = policy;
            
            // Get current user
            const currentUser = this.authService.getCurrentUser();
            this.username = currentUser?.firstName || currentUser?.email || null;
            console.log('👤 Username set to:', this.username);
            
            // Generate session ID if not provided
            if (!this.sessionId) {
              this.sessionId = this.generateSessionId();
              console.log('🆔 Generated session ID:', this.sessionId);
            }
            
            // Load policy summary
            this.hasMainPolicy = true; // User has main policy (PDF)
            this.loadPolicySummary();
            
            // Load existing chat history for this session
            this.loadExistingChatHistory();
          },
          error: (error: any) => {
            console.error('❌ Error loading policy:', error);
            this.notificationService.showError('Failed to load policy data');
          }
        });
      }
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    if (this.chatMessagesElement) {
      this.chatMessagesElement.nativeElement.scrollTop = this.chatMessagesElement.nativeElement.scrollHeight;
    }
  }

  addMessage(content: string, isUser: boolean, timestamp?: Date): void {
    const htmlContent = this.aiHtmlRenderService.formatChatMessage(content, isUser);
    
    this.chatMessages.push({
      id: Date.now().toString(),
      type: isUser ? 'user' : 'ai',
      content,
      htmlContent,
      timestamp: timestamp || new Date()
    });

    // Hide suggestions after first user message
    if (isUser && this.showSuggestions) {
      this.showSuggestions = false;
    }
  }

  sendMessage(): void {
    const messageText = this.chatForm.get('message')?.value;
    const hasImages = this.selectedImages.length > 0;
    
    if ((!messageText && !hasImages) || this.sending) {
      return;
    }

    // Use the actual message text, not a fallback
    const userMessage = messageText || (hasImages ? 'Uploaded images for analysis' : '');
    console.log('💬 Sending message:', userMessage, 'with', this.selectedImages.length, 'images');
    
    // Add user message to chat with images
    const messageWithImages: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
      images: hasImages ? [...this.selectedImages] : undefined,
      isImageMessage: hasImages && !messageText
    };
    
    console.log('📷 User message with images:', {
      hasImages,
      imageCount: this.selectedImages.length,
      messageImages: messageWithImages.images?.length,
      selectedImages: this.selectedImages
    });
    
    // Test image data validity
    if (messageWithImages.images && messageWithImages.images.length > 0) {
      messageWithImages.images.forEach((imageData, index) => {
        console.log(`🧪 Testing image ${index + 1} data validity...`);
        this.testImageData(imageData);
      });
    }
    
    this.chatMessages.push(messageWithImages);
    
    // Clear input and images
    this.chatForm.get('message')?.setValue('');
    this.selectedImages = [];
    this.isEmergencyMode = false;
    this.maxImages = 3;
    
    this.sending = true;
    
    // Prepare question request with session context
    // Build lightweight recent history for context (last 10 turns)
    const recentHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }> =
      this.chatMessages.slice(-10).map(m => ({
        role: (m.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp as any).toISOString()
      }));

    // Collect all images from recent messages for context
    const recentImages: string[] = [];
    this.chatMessages.slice(-10).forEach(message => {
      if (message.images && message.images.length > 0) {
        recentImages.push(...message.images);
      }
    });

    const questionRequest = {
      question: userMessage,
      policyId: this.policy?._id || '',
      sessionId: this.sessionId || undefined,
      history: recentHistory,
      images: recentImages.length > 0 ? recentImages : undefined
    };
    
    console.log('📤 Question request:', questionRequest);
    
    // Send to AI service
    this.aiService.askQuestion(questionRequest).subscribe({
      next: (response: any) => {
        console.log('🤖 AI response received:', response);
        this.sending = false;
        
        let aiMessage = '';
        if (response && response.answer) {
          aiMessage = response.answer;
        } else if (response && response.data && response.data.answer) {
          aiMessage = response.data.answer;
        } else {
          aiMessage = 'Sorry, I encountered an error while processing your question. Please try again.';
        }
        
        // Determine confidence and sources
        const rawConfidence = (response?.confidence ?? response?.data?.confidence) as number | undefined;
        const sources = (response?.sources ?? response?.data?.sources) as Array<any> | undefined;
        let derivedConfidence = this.deriveConfidence(rawConfidence, sources);
        
        // Debug logging to understand the response structure
        console.log('🔍 Confidence Debug:', {
          rawConfidence,
          sources,
          sourcesLength: sources?.length,
          derivedConfidence,
          responseStructure: {
            hasConfidence: 'confidence' in response,
            hasDataConfidence: response?.data && 'confidence' in response.data,
            hasSources: 'sources' in response,
            hasDataSources: response?.data && 'sources' in response.data
          }
        });
        
        // Check if the response indicates no relevant chunks were found
        const noInfo = aiMessage.includes('Sorry, I encountered an error') || 
            aiMessage.includes('No relevant information found') ||
            aiMessage.includes('I don\'t have enough information') ||
            aiMessage.includes('I couldn\'t find any relevant information') ||
            aiMessage.includes('couldn\'t find any relevant information') ||
            aiMessage.includes('no relevant information') ||
            aiMessage.includes('no relevant chunks') ||
            aiMessage.includes('0 chunks');
        if (noInfo) {
          this.showReprocessButton = true;
          derivedConfidence = 0.2; // Force Low
        }
        
        // Add AI response to chat with confidence and sources
        const htmlContent = this.aiHtmlRenderService.formatChatMessage(aiMessage, false);
        
        this.chatMessages.push({
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiMessage,
          htmlContent,
          timestamp: new Date(),
          confidence: derivedConfidence,
          sources: sources || [],
          showSources: false,
        });
        
        // Save the Q&A pair to chat history
        this.saveChatMessage(userMessage, aiMessage, derivedConfidence ?? 0);
      },
      error: (error: any) => {
        console.error('❌ Error getting AI response:', error);
        this.sending = false;
        
        let errorMessage = 'Sorry, I encountered an error while processing your question.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        // Show reprocess button on error
        this.showReprocessButton = true;
        
        // Add error message to chat
        this.addMessage(errorMessage, false);
        
        // Save the Q&A pair to chat history even for errors
        this.saveChatMessage(userMessage, errorMessage, 0);
      }
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadExistingChatHistory(): void {
    if (!this.policy?._id) return;
    
    // Prevent loading chat history multiple times
    if (this.chatMessages.length > 0) {
      console.log('📚 Chat history already loaded, skipping...');
      return;
    }
    
    console.log('📚 Loading existing chat history for policy:', this.policy._id);
    
    this.chatHistoryService.getChatHistoryByPolicy(this.policy._id).subscribe({
      next: (chatHistory) => {
        console.log('📚 Loaded chat history:', chatHistory);
        
        // Clear existing messages
        this.chatMessages = [];
        
        // Sort chat history by createdAt in ascending order (oldest first)
        const sortedHistory = [...chatHistory].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        console.log('📚 Sorted chat history (oldest first):', sortedHistory);
        
        // Add messages to chat in chronological order with original timestamps
        sortedHistory.forEach(chat => {
          // Add user question with original timestamp
          this.addMessage(chat.question, true, new Date(chat.createdAt));
          // Add AI answer with original timestamp (or slightly after)
          const aiTimestamp = new Date(chat.createdAt);
          aiTimestamp.setSeconds(aiTimestamp.getSeconds() + 1); // 1 second after user message
          this.addMessage(chat.answer, false, aiTimestamp);
        });
        
        console.log('✅ Chat history loaded, total messages:', this.chatMessages.length);
      },
      error: (error) => {
        console.error('❌ Failed to load chat history:', error);
        // Don't show error to user as it's not critical
      }
    });
  }

  private saveChatMessage(question: string, answer: string, confidence: number): void {
    if (!this.policy?._id || !this.sessionId) {
      console.warn('⚠️ Cannot save chat message: missing policy ID or session ID');
      return;
    }

    const chatData: CreateChatHistoryRequest = {
      policyId: this.policy._id,
      question: question,
      answer: answer,
      confidence: confidence
    };

    console.log('💾 Saving chat message:', chatData);

    this.chatHistoryService.createChatSession(chatData, this.sessionId).subscribe({
      next: (savedChat) => {
        console.log('✅ Chat message saved successfully:', savedChat);
      },
      error: (error) => {
        console.error('❌ Failed to save chat message:', error);
        // Don't show error to user as it doesn't affect the chat experience
      }
    });
  }

  private loadPolicySummary(): void {
    if (!this.policy?._id) return;
    
    console.log('🔍 Loading policy summary for:', this.policy._id);
    
    // First load summary info to get available levels
    this.aiService.getPolicySummaryInfo(this.policy._id).subscribe({
      next: (summaryInfo: PolicySummaryInfo) => {
        this.summaryInfo = summaryInfo;
        // Use user's preferred level or policy's current level
        this.summaryLevel = this.userPreferencesService.getDefaultSummaryLevel() || summaryInfo.currentLevel;
        
        // Load summary for the current level
        this.loadSummaryForLevel();
      },
      error: (error: any) => {
        console.error('❌ Error loading summary info:', error);
        // Fallback to user preference or legacy summary
        this.summaryLevel = this.userPreferencesService.getDefaultSummaryLevel();
        this.loadLegacySummary();
      }
    });
  }

  private loadSummaryForLevel(): void {
    if (!this.policy?._id) return;
    
    console.log('🔍 Loading', this.summaryLevel, 'summary for:', this.policy._id);
    this.aiService.getPolicySummaryByLevel(this.policy._id, this.summaryLevel).subscribe({
      next: (response: any) => {
        this.policySummary = response.summary || response.data?.summary || null;
        this.summaryLoaded = true;
        console.log('✅ Policy summary loaded:', this.policySummary);
        
        // Add welcome message with summary
        this.addWelcomeMessage();
      },
      error: (error: any) => {
        console.error('❌ Error loading policy summary:', error);
        this.summaryLoaded = true;
        this.policySummary = null;
        
        // Add welcome message without summary
        this.addWelcomeMessage();
      }
    });
  }

  private loadLegacySummary(): void {
    if (!this.policy?._id) return;
    
    console.log('🔍 Loading legacy summary for:', this.policy._id);
    this.aiService.getPolicySummary(this.policy._id).subscribe({
      next: (response: any) => {
        this.policySummary = response.summary || response.data?.summary || null;
        this.summaryLoaded = true;
        console.log('✅ Legacy policy summary loaded:', this.policySummary);
        
        // Add welcome message with summary
        this.addWelcomeMessage();
      },
      error: (error: any) => {
        console.error('❌ Error loading legacy policy summary:', error);
        this.summaryLoaded = true;
        this.policySummary = null;
        
        // Add welcome message without summary
        this.addWelcomeMessage();
      }
    });
  }

  private addWelcomeMessage(): void {
    // Don't add welcome message to chat since it's already shown in the welcome section
    // The welcome section already displays the policy summary, so we don't need to duplicate it
  }

  // Summary level management methods
  onSummaryLevelChange(): void {
    if (!this.policy?._id) return;
    
    // Save user preference
    this.userPreferencesService.setDefaultSummaryLevel(this.summaryLevel);
    
    console.log('🔄 Changing summary level to:', this.summaryLevel);
    this.loadSummaryForLevel();
  }

  getSummaryLevelLabel(level: SummaryLevel): string {
    switch (level) {
      case SummaryLevel.BRIEF:
        return 'Brief';
      case SummaryLevel.STANDARD:
        return 'Standard';
      case SummaryLevel.DETAILED:
        return 'Detailed';
      default:
        return 'Standard';
    }
  }

  getSummaryLevelDescription(level: SummaryLevel): string {
    switch (level) {
      case SummaryLevel.BRIEF:
        return 'Key terms, coverage amounts, and deductibles';
      case SummaryLevel.STANDARD:
        return 'Main sections, key terms, and important clauses';
      case SummaryLevel.DETAILED:
        return 'Comprehensive legal summary for detailed review';
      default:
        return 'Standard summary level';
    }
  }

  endChatSession(): void {
    this.router.navigate(['/ai-assistant']);
  }

  // Suggested Questions Methods
  initializeSuggestedQuestions(): void {
    this.suggestedQuestions = [
      'What benefits does this policy provide?',
      'What is the claim process?',
      'Are pre-existing conditions covered?',
      'What are the coverage limits and deductibles?',
      'How do I file a claim?',
      'What services are covered under this policy?',
      'Are there any exclusions I should know about?',
      'How do I contact customer support?'
    ];
  }

  onSuggestedQuestionClick(question: string): void {
    // Set the question in the form
    this.chatForm.patchValue({ message: question });
    
    // Hide suggestions immediately
    this.showSuggestions = false;
    
    // Auto-send the question
    this.sendMessage();
  }

  onSuggestedQuestionHover(question: string): void {
    // Optional: Add hover effects or preview
    console.log('Hovering over:', question);
  }

  resetContext(): void {
    if (!this.policy?._id) return;
    // Create a new sessionId and clear chat view only (history remains in DB by design)
    this.sessionId = this.generateSessionId();
    this.chatMessages = [];
    this.notificationService.showInfo('Context reset. New session started.');
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  checkPolicyAIStatus(): void {
    if (!this.policy?._id) return;
    
    // Check if policy has AI processing issues by looking at the policy data
    if (this.policy.hasPDF && !this.policy.aiProcessed) {
      console.log('⚠️ Policy has PDF but AI processing is not complete');
      this.showReprocessButton = true;
    } else if (this.policy.hasPDF && this.policy.aiProcessed) {
      // Even if AI is processed, test if chunks are actually available
      this.testChunkAvailability();
    }
  }

  testChunkAvailability(): void {
    if (!this.policy?._id) return;
    
    // Send a simple test question to check if chunks are available
    const testQuestion = "test";
    const questionRequest = {
      question: testQuestion,
      policyId: this.policy._id
    };
    
    this.aiService.askQuestion(questionRequest).subscribe({
      next: (response: any) => {
        let aiMessage = '';
        if (response && response.answer) {
          aiMessage = response.answer;
        } else if (response && response.data && response.data.answer) {
          aiMessage = response.data.answer;
        }
        
        // Check if the response indicates no chunks are available
        if (aiMessage.includes('I couldn\'t find any relevant information') ||
            aiMessage.includes('couldn\'t find any relevant information') ||
            aiMessage.includes('no relevant information') ||
            aiMessage.includes('no relevant chunks') ||
            aiMessage.includes('0 chunks')) {
          console.log('⚠️ No chunks available for this policy');
          this.showReprocessButton = true;
        }
      },
      error: (error: any) => {
        console.log('⚠️ Error testing chunk availability:', error);
        this.showReprocessButton = true;
      }
    });
  }

  reprocessPolicy(): void {
    if (!this.policy?._id) return;
    
    this.sending = true;
    this.aiService.reprocessPolicy(this.policy._id).subscribe({
      next: (response: any) => {
        console.log('✅ Policy reprocessing started:', response);
        this.sending = false;
        this.showReprocessButton = false;
        this.notificationService.showSuccess('Policy reprocessing started. Please wait a few minutes and try asking questions again.');
      },
      error: (error: any) => {
        console.error('❌ Error reprocessing policy:', error);
        this.sending = false;
        this.notificationService.showError('Failed to reprocess policy. Please try again later.');
      }
    });
  }

  // Confidence helpers
  private deriveConfidence(raw: number | undefined, sources: Array<any> | undefined): number {
    // ALWAYS use the raw confidence from the AI service backend
    // The AI service calculates confidence based on multiple factors and is authoritative
    if (typeof raw === 'number' && !isNaN(raw)) {
      return Math.max(0, Math.min(1, raw));
    }
    
    // Fallback only if AI service didn't provide confidence (shouldn't happen)
    console.warn('⚠️ AI service did not provide confidence score, using fallback');
    
    // If we have sources, derive confidence from them as last resort
    if (Array.isArray(sources) && sources.length > 0) {
      const scores: number[] = sources
        .map((s: any) => s.similarity_score ?? s.relevance_score)
        .filter((x: any) => typeof x === 'number' && x > 0);
      
      if (scores.length) {
        const top = Math.max(...scores);
        return Math.max(0, Math.min(1, top));
      }
      
      return 0.5; // Medium confidence as fallback
    }
    
    // Absolute last resort
    return 0.3;
  }

  getConfidenceLabel(score?: number): 'High' | 'Medium' | 'Low' | undefined {
    if (score === undefined) return undefined;
    if (score >= 0.75) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  }

  toggleSources(msg: ChatMessage): void {
    if (msg.type !== 'ai') return;
    msg.showSources = !msg.showSources;
  }

  // Image Upload Methods
  onImageSelected(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = this.maxImages - this.selectedImages.length;
    
    // Check if user is trying to upload more than allowed
    if (remainingSlots <= 0) {
      this.notificationService.showWarning(`🚫 Maximum ${this.maxImages} images allowed! Please remove some images first to add new ones.`);
      event.target.value = ''; // Clear the input
      return;
    }
    
    // Check if user is trying to upload more files than remaining slots
    if (files.length > remainingSlots) {
      this.notificationService.showWarning(`🚫 You can only add ${remainingSlots} more image(s). You currently have ${this.selectedImages.length}/${this.maxImages} images. Please select fewer files.`);
      event.target.value = ''; // Clear the input
      return;
    }
    
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file: unknown) => {
      const fileObj = file as File;
      
      // Validate file type
      if (!fileObj.type.startsWith('image/')) {
        this.notificationService.showWarning(`File ${fileObj.name} is not an image. Please select image files only.`);
        return;
      }
      
      // Validate file size (5MB limit for better performance)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (fileObj.size > maxSize) {
        this.notificationService.showWarning(`File ${fileObj.name} is too large. Please select images smaller than 5MB.`);
        return;
      }
      
      // Validate file size (minimum 1KB)
      if (fileObj.size < 1024) {
        this.notificationService.showWarning(`File ${fileObj.name} appears to be corrupted or too small.`);
        return;
      }
      
      // Try compression first, fallback to CSP-safe method
      console.log('🖼️ Starting image processing for:', fileObj.name, 'Size:', fileObj.size);
      
      this.compressImage(fileObj).then(compressedData => {
        console.log('✅ Image compression successful:', compressedData.substring(0, 50) + '...');
        this.selectedImages.push(compressedData);
        this.notificationService.showInfo(`Image ${fileObj.name} added successfully.`);
      }).catch(error => {
        console.error('❌ Image compression failed, trying CSP-safe method:', error);
        // Fallback to CSP-safe compression
        this.compressImageCSP(fileObj).then(compressedData => {
          console.log('✅ CSP-safe compression successful:', compressedData.substring(0, 50) + '...');
          this.selectedImages.push(compressedData);
          this.notificationService.showInfo(`Image ${fileObj.name} added successfully (CSP-safe).`);
        }).catch(cspError => {
          console.error('❌ CSP-safe compression failed, using original file:', cspError);
          // Final fallback to direct file reading without compression
          this.addImageDirectly(fileObj);
        });
      });
    });

    // Reset file input
    event.target.value = '';
  }

  removeImage(index: number): void {
    this.selectedImages.splice(index, 1);
    if (this.selectedImages.length === 0) {
      this.showImageUpload = false;
    }
  }

  toggleImageUpload(): void {
    this.showImageUpload = !this.showImageUpload;
  }

  sendImageMessage(): void {
    if (this.selectedImages.length === 0) return;

    // Create image-only message
    const imageMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: this.isEmergencyMode ? 'Emergency: Uploaded main policy document image' : 'Uploaded additional policy information images',
      timestamp: new Date(),
      images: [...this.selectedImages],
      isImageMessage: true
    };

    this.chatMessages.push(imageMessage);
    
    // Process images with AI
    this.processImagesWithAI(this.selectedImages);
    
    // Clear selected images
    this.selectedImages = [];
    this.showImageUpload = false;
    this.isEmergencyMode = false;
  }

  private processImagesWithAI(images: string[]): void {
    this.sending = true;
    
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?._id || 'unknown';
    
    const request = {
      images: images,
      userId: userId,
      policyId: this.policy?._id,
      isEmergencyMode: this.isEmergencyMode
    };
    
    this.imageAnalysisService.analyzePolicyImages(request).subscribe({
      next: (response) => {
        console.log('📊 Image analysis response received:', response);
        
        if (response.success && response.isPolicyRelated) {
          // Valid policy image - process normally
          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: this.generateImageAnalysisResponse(response),
            timestamp: new Date(),
            confidence: 0.8
          };
          
          this.chatMessages.push(aiResponse);
          this.notificationService.showSuccess('Images analyzed successfully!');
        } else if (!response.isPolicyRelated) {
          // Image is not policy-related
          const validationResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: this.generateValidationErrorResponse(response),
            timestamp: new Date(),
            confidence: 0.9
          };
          
          this.chatMessages.push(validationResponse);
          this.notificationService.showWarning('Please upload policy-related images only.');
        } else if (response.error) {
          // Specific error occurred
          const errorResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: this.generateErrorResponse(response),
            timestamp: new Date(),
            confidence: 0.9
          };
          
          this.chatMessages.push(errorResponse);
          this.notificationService.showError(response.error);
        } else {
          // Generic failure
          this.addMessage('Sorry, I couldn\'t analyze the uploaded images. Please try again.', false);
          this.notificationService.showError('Image analysis failed. Please try again.');
        }
        this.sending = false;
      },
      error: (error) => {
        console.error('❌ Image analysis service error:', error);
        
        let errorMessage = 'Sorry, I encountered an error while analyzing the images.';
        if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else if (error.status === 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        }
        
        this.addMessage(errorMessage, false);
        this.notificationService.showError(errorMessage);
        this.sending = false;
      }
    });
  }

  private generateImageAnalysisResponse(response: any): string {
    const { analysisResults, extractedText } = response;
    
    let analysisText = '';
    
    if (this.isEmergencyMode) {
      analysisText = `📄 **Main Policy Document Analysis Complete!**\n\n`;
      analysisText += `I've analyzed your main policy document image. This will be the primary source for our conversation.\n\n`;
    } else {
      analysisText = `📄 **Additional Policy Information Analyzed!**\n\n`;
      analysisText += `I've analyzed the additional policy information you provided. This supplements the main policy context.\n\n`;
    }
    
    if (analysisResults.policyNumber) {
      analysisText += `**Policy Number:** ${analysisResults.policyNumber}\n`;
    }
    if (analysisResults.insuranceCompany) {
      analysisText += `**Insurance Company:** ${analysisResults.insuranceCompany}\n`;
    }
    if (analysisResults.coverageAmount) {
      analysisText += `**Coverage Amount:** ${analysisResults.coverageAmount}\n`;
    }
    if (analysisResults.effectiveDate) {
      analysisText += `**Effective Date:** ${analysisResults.effectiveDate}\n`;
    }
    if (analysisResults.expiryDate) {
      analysisText += `**Expiry Date:** ${analysisResults.expiryDate}\n`;
    }
    
    if (analysisResults.keyTerms && analysisResults.keyTerms.length > 0) {
      analysisText += `\n**Key Information Found:**\n`;
      analysisResults.keyTerms.forEach((term: string) => {
        analysisText += `• ${term}\n`;
      });
    }
    
    if (analysisResults.suggestions && analysisResults.suggestions.length > 0) {
      analysisText += `\n**Suggestions:**\n`;
      analysisResults.suggestions.forEach((suggestion: string) => {
        analysisText += `• ${suggestion}\n`;
      });
    }
    
    if (this.isEmergencyMode) {
      analysisText += `\nI now have your main policy document! You can ask me any questions about coverage details, terms, conditions, or other aspects of your policy.`;
    } else {
      analysisText += `\nThis additional information has been added to our conversation context. You can ask me questions about both the main policy and this supplementary information.`;
    }
    
    return analysisText;
  }

  private generateValidationErrorResponse(response: any): string {
    const { validationMessage } = response;
    
    let errorText = `🚫 **Image Validation Failed**\n\n`;
    errorText += `**${validationMessage}**\n\n`;
    
    errorText += `**What I'm looking for:**\n`;
    errorText += `• Policy documents or insurance cards\n`;
    errorText += `• Coverage details or benefit summaries\n`;
    errorText += `• Insurance-related paperwork\n`;
    errorText += `• Policy amendments or endorsements\n\n`;
    
    errorText += `**Please try again with:**\n`;
    errorText += `• A clear photo of your policy document\n`;
    errorText += `• Your insurance card\n`;
    errorText += `• Any insurance-related paperwork\n\n`;
    
    errorText += `I can only help with insurance and policy-related documents. Please upload an appropriate image to continue our conversation.`;
    
    return errorText;
  }

  private generateErrorResponse(response: any): string {
    const { error, validationMessage } = response;
    
    let errorText = `⚠️ **Image Analysis Error**\n\n`;
    
    if (validationMessage) {
      errorText += `**${validationMessage}**\n\n`;
    } else if (error) {
      errorText += `**${error}**\n\n`;
    }
    
    errorText += `**What you can do:**\n`;
    errorText += `• Check your internet connection\n`;
    errorText += `• Try uploading the images again\n`;
    errorText += `• Make sure images are clear and readable\n`;
    errorText += `• Contact support if the problem persists\n\n`;
    
    errorText += `I'm here to help once the technical issue is resolved!`;
    
    return errorText;
  }

  enableEmergencyMode(): void {
    this.isEmergencyMode = true;
    this.maxImages = 1;
    this.showImageUpload = true;
    this.hasMainPolicy = true; // Emergency image becomes main policy
  }

  getImageUploadButtonText(): string {
    if (this.isEmergencyMode) {
      return '📷 Upload Main Policy Image (Emergency)';
    }
    return `📷 Add Additional Info (${this.selectedImages.length}/${this.maxImages})`;
  }

  canAddMoreImages(): boolean {
    return this.selectedImages.length < this.maxImages;
  }

  getImageLimitMessage(): string {
    if (this.selectedImages.length >= this.maxImages) {
      return `🚫 Maximum ${this.maxImages} images reached! Remove some to add new ones.`;
    }
    const remaining = this.maxImages - this.selectedImages.length;
    return `📷 You can add ${remaining} more image(s) (${this.selectedImages.length}/${this.maxImages})`;
  }

  clearSelectedImages(): void {
    this.selectedImages = [];
    this.isEmergencyMode = false;
    this.maxImages = 3;
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if we're in a CSP-restricted environment
      if (this.isCSPRestricted()) {
        console.log('CSP detected, using CSP-safe compression');
        this.compressImageCSP(file).then(resolve).catch(reject);
        return;
      }

      // First try simple file size-based compression
      if (file.size <= 1024 * 1024) { // If file is already small (1MB or less)
        this.fallbackToOriginalFile(file).then(resolve).catch(reject);
        return;
      }

      // For larger files, try canvas compression with CSP-safe approach
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Use FileReader instead of blob URL to avoid CSP issues
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        // Set crossOrigin to avoid CORS issues
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // Calculate new dimensions (max 800px width/height)
            const maxSize = 800;
            let { width, height } = img;
            
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with compression (0.8 quality)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressedDataUrl);
          } catch (error) {
            console.error('Canvas compression error:', error);
            // Fallback to original data URL if compression fails
            resolve(dataUrl);
          }
        };
        
        img.onerror = () => {
          console.error('Image load error, using original file');
          // Fallback to original file if image loading fails
          this.fallbackToOriginalFile(file).then(resolve).catch(reject);
        };
        
        img.src = dataUrl;
      };
      
      reader.onerror = () => {
        console.error('FileReader error, using original file');
        // Fallback to original file if FileReader fails
        this.fallbackToOriginalFile(file).then(resolve).catch(reject);
      };
      
      reader.readAsDataURL(file);
    });
  }

  private fallbackToOriginalFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('🔄 Using fallback file reading for:', file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('✅ Fallback file reading successful:', (e.target?.result as string).substring(0, 50) + '...');
        resolve(e.target?.result as string);
      };
      reader.onerror = (error) => {
        console.error('❌ Fallback file reading failed:', error);
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }

  private addImageDirectly(file: File): void {
    console.log('🔄 Using direct file reading for:', file.name);
    const reader = new FileReader();
    reader.onload = (e: any) => {
      console.log('✅ Direct file reading successful:', e.target.result.substring(0, 50) + '...');
      this.selectedImages.push(e.target.result);
      this.notificationService.showInfo(`Image ${file.name} added successfully (uncompressed).`);
    };
    reader.onerror = (error) => {
      console.error('❌ Direct file reading failed:', error);
      this.notificationService.showError(`Failed to read file ${file.name}. Please try again.`);
    };
    reader.readAsDataURL(file);
  }

  // Alternative CSP-safe compression method that doesn't use canvas
  private compressImageCSP(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // For CSP-safe compression, we'll just use the original file
      // but with a smaller size limit check
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        this.notificationService.showWarning(`Image ${file.name} is too large. Please select a smaller image.`);
        reject(new Error('File too large'));
        return;
      }
      
      // Use direct file reading without compression
      this.fallbackToOriginalFile(file).then(resolve).catch(reject);
    });
  }

  private isCSPRestricted(): boolean {
    try {
      // Try to create a blob URL to test CSP restrictions
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testUrl = URL.createObjectURL(testBlob);
      URL.revokeObjectURL(testUrl);
      return false; // No CSP restrictions detected
    } catch (error) {
      console.log('CSP restrictions detected:', error);
      return true; // CSP restrictions detected
    }
  }

  viewImageFullscreen(imageSrc: string): void {
    // Create fullscreen image viewer
    const fullscreenDiv = document.createElement('div');
    fullscreenDiv.className = 'fullscreen-image-viewer';
    fullscreenDiv.innerHTML = `
      <div class="fullscreen-overlay">
        <div class="fullscreen-content">
          <button class="close-fullscreen-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
          <img src="${imageSrc}" alt="Policy document" class="fullscreen-image">
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .fullscreen-image-viewer {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(5px);
      }
      .dark .fullscreen-image-viewer {
        background: rgba(0, 0, 0, 0.95);
      }
      .fullscreen-overlay {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }
      .fullscreen-content {
        position: relative;
        max-width: 90%;
        max-height: 90%;
      }
      .close-fullscreen-btn {
        position: absolute;
        top: -40px;
        right: 0;
        background: var(--color-bg-primary, #fff);
        color: var(--color-text-primary, #000);
        border: 2px solid var(--color-border-primary, #ddd);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 24px;
        cursor: pointer;
        z-index: 10000;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .close-fullscreen-btn:hover {
        background: var(--color-primary, #007bff);
        color: white;
        border-color: var(--color-primary, #007bff);
        transform: scale(1.1);
      }
      .dark .close-fullscreen-btn {
        background: var(--color-bg-secondary, #2d2d2d);
        color: var(--color-text-primary, #fff);
        border-color: var(--color-border-primary, #555);
      }
      .dark .close-fullscreen-btn:hover {
        background: var(--color-primary, #007bff);
        color: white;
        border-color: var(--color-primary, #007bff);
      }
      .fullscreen-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(fullscreenDiv);
    
    // Remove on click outside
    fullscreenDiv.addEventListener('click', (e) => {
      if (e.target === fullscreenDiv) {
        fullscreenDiv.remove();
        style.remove();
      }
    });
  }

  onImageError(event: any): void {
    console.error('❌ Image load error:', event);
    console.error('❌ Image src:', event.target.src);
  }

  onImageLoad(event: any): void {
    console.log('✅ Image loaded successfully:', event.target.src.substring(0, 50) + '...');
  }

  // Test method to validate image data
  testImageData(imageData: string): void {
    console.log('🧪 Testing image data validity...');
    const testImg = new Image();
    testImg.onload = () => {
      console.log('✅ Image data is valid and loadable');
      console.log('📏 Image dimensions:', testImg.width, 'x', testImg.height);
    };
    testImg.onerror = (error) => {
      console.error('❌ Image data is invalid or corrupted:', error);
    };
    testImg.src = imageData;
  }
}