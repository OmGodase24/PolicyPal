import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Policy } from '../../../../core/models/policy.model';
import { PolicyService } from '../../../../core/services/policy.service';
import { AIService } from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RewardService } from '../../../../core/services/reward.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe]
})
export class AIAssistantComponent implements OnInit {
  publishedPolicies: Policy[] = [];
  loading = false;
  selectedPolicy: Policy | null = null;

  constructor(
    private policyService: PolicyService,
    private aiService: AIService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private rewardService: RewardService,
    private router: Router,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadPublishedPolicies();
  }

  loadPublishedPolicies(): void {
    this.loading = true;
    console.log('🔍 Loading published policies...');
    this.aiService.getPublishedPolicies().subscribe({
      next: (response: any) => {
        console.log('📡 AI Service Response:', response);
        console.log('📡 Response type:', typeof response);
        console.log('📡 Response keys:', Object.keys(response));
        
        if (response && response.data) {
          this.publishedPolicies = response.data;
          console.log('✅ Policies loaded from response.data:', this.publishedPolicies);
        } else if (Array.isArray(response)) {
          // Direct array response
          this.publishedPolicies = response;
          console.log('✅ Policies loaded from direct array:', this.publishedPolicies);
        } else {
          console.log('❌ No policies in response data, trying fallback...');
          // Fallback to policy service
          this.loadPoliciesFallback();
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading published policies:', error);
        console.log('🔄 Trying fallback to policy service...');
        // Fallback to policy service
        this.loadPoliciesFallback();
      }
    });
  }

  private loadPoliciesFallback(): void {
    console.log('🔄 Loading policies using fallback method...');
    this.policyService.getAllPolicies('publish').subscribe({
      next: (policies: Policy[]) => {
        console.log('📋 Raw policies from policy service:', policies);
        // Filter only policies with PDFs and exclude expired policies
        const validPolicies = this.policyService.getValidPoliciesForAI(policies);
        this.publishedPolicies = validPolicies.filter(policy => policy.hasPDF);
        console.log('✅ Fallback policies loaded (expired filtered):', this.publishedPolicies);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('❌ Fallback also failed:', error);
        this.notificationService.showError('Failed to load published policies');
        this.loading = false;
        this.publishedPolicies = [];
      }
    });
  }

  selectPolicy(policy: Policy): void {
    // Only allow selection if no policy is currently selected
    if (this.selectedPolicy && this.selectedPolicy._id !== policy._id) {
      // Don't allow selecting different policy unless Change Selection is clicked
      return;
    }
    this.selectedPolicy = policy;
  }

  startChatSession(): void {
    if (!this.selectedPolicy) {
      this.notificationService.showError('Please select a policy first');
      return;
    }

    this.loading = true;
    this.aiService.startChatSession(this.selectedPolicy._id).subscribe({
      next: (session: any) => {
        this.loading = false;
        console.log('✅ Chat session created:', session);
        
        // Record reward: AI chat session started
        this.rewardService.recordActivity({
          type: 'ai_interaction',
          name: 'AI Chat Session Started',
          points: 5,
          metadata: {
            policyId: this.selectedPolicy!._id,
            policyTitle: this.selectedPolicy!.title,
            action: 'chat_session_started'
          }
        }).subscribe({
          next: (response) => {
            console.log('🎖️ AI interaction reward recorded:', response);
          },
          error: (error) => {
            console.error('❌ Failed to record AI interaction reward:', error);
          }
        });
        
        // Get current user's name
        const currentUser = this.authService.getCurrentUser();
        const username = currentUser?.firstName || currentUser?.email || null;
        
        // Navigate to AI chat interface with session data
        this.router.navigate(['/ai-chat', this.selectedPolicy!._id], {
          state: { 
            session: session.data || session,
            policy: this.selectedPolicy,
            username: username
          }
        });
      },
      error: (error: any) => {
        console.error('Error starting chat session:', error);
        this.notificationService.showError('Failed to start chat session');
        this.loading = false;
      }
    });
  }

  getPolicyStatusClass(policy: Policy): string {
    if (policy.aiProcessed) {
      return 'status-processed';
    } else if (policy.hasPDF && policy.pdfProcessed) {
      return 'status-uploaded';
    } else if (policy.hasPDF) {
      return 'status-processing';
    } else {
      return 'status-no-pdf';
    }
  }

  getPolicyStatusText(policy: Policy): string {
    if (policy.aiProcessed) {
      return this.languageService.translate('aiAssistant.aiReady');
    } else if (policy.hasPDF && policy.pdfProcessed) {
      return this.languageService.translate('aiAssistant.pdfProcessed');
    } else if (policy.hasPDF) {
      return this.languageService.translate('aiAssistant.processingPDF');
    } else {
      return this.languageService.translate('aiAssistant.noPDF');
    }
  }
}