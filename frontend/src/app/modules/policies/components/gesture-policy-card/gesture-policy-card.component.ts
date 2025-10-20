import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Policy } from '@core/models/policy.model';
import { PolicyService } from '@core/services/policy.service';
import { GestureAIService, GestureEvent } from '@core/services/gesture-ai.service';
import { MobilePDFAIService } from '@core/services/mobile-pdf-ai.service';

@Component({
  selector: 'app-gesture-policy-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gesture-policy-card" 
         [class.dark]="isDarkMode"
         #cardElement
         (click)="onCardClick()">
      
      <!-- Policy Header -->
      <div class="policy-header">
        <div class="policy-title-section">
          <h3 class="policy-title">{{ policy.title }}</h3>
          <div class="policy-status">
            <span [class]="getStatusBadgeClasses(policy.status)" class="status-badge">
              {{ policy.status | titlecase }}
            </span>
          </div>
        </div>
        <div class="gesture-indicator" *ngIf="showGestureHint">
          <i class="fas fa-hand-paper"></i>
          <span>Use gestures</span>
        </div>
      </div>

      <!-- Policy Description -->
      <div class="policy-description">
        <p>{{ policy.description }}</p>
      </div>

      <!-- Policy Metadata -->
      <div class="policy-metadata">
        <div class="metadata-item">
          <i class="fas fa-file-pdf"></i>
          <span>{{ policy.hasPDF ? 'PDF Available' : 'No PDF' }}</span>
        </div>
        
        <div class="metadata-item">
          <i class="fas fa-calendar"></i>
          <span>{{ policy.updatedAt | date:'MMM d' }}</span>
        </div>

        <div class="metadata-item" *ngIf="policy.expiryDate">
          <i class="fas fa-clock"></i>
          <span [class]="getExpiryDateClass(policy)">
            Expires {{ policy.expiryDate | date:'MMM d, y' }}
          </span>
        </div>

        <div class="metadata-item" *ngIf="policy.aiProcessed">
          <i class="fas fa-robot"></i>
          <span>AI Ready</span>
        </div>
      </div>

      <!-- AI Summary Preview -->
      <div class="ai-summary-preview" *ngIf="policy.aiSummary">
        <div class="summary-header">
          <i class="fas fa-robot"></i>
          <span class="summary-label">AI Summary</span>
        </div>
        <p class="summary-text">{{ policy.aiSummary | slice:0:120 }}{{ policy.aiSummary.length > 120 ? '...' : '' }}</p>
      </div>

      <!-- Gesture Actions -->
      <div class="gesture-actions" *ngIf="showGestureActions">
        <div class="gesture-action" [class.active]="gestureAction === 'analyze'">
          <i class="fas fa-search"></i>
          <span>Swipe Left to Analyze</span>
        </div>
        <div class="gesture-action" [class.active]="gestureAction === 'summarize'">
          <i class="fas fa-file-alt"></i>
          <span>Swipe Right to Summarize</span>
        </div>
        <div class="gesture-action" [class.active]="gestureAction === 'highlight'">
          <i class="fas fa-highlighter"></i>
          <span>Swipe Up to Highlight</span>
        </div>
        <div class="gesture-action" [class.active]="gestureAction === 'search'">
          <i class="fas fa-search"></i>
          <span>Swipe Down to Search</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="policy-actions">
        <button 
          class="action-btn primary"
          (click)="onViewClick($event)"
          [disabled]="!policy.hasPDF && !policy.content">
          <i class="fas fa-eye"></i>
          View
        </button>

        <button 
          class="action-btn secondary"
          (click)="onAIChatClick($event)"
          [disabled]="!policy.aiProcessed">
          <i class="fas fa-comments"></i>
          AI Chat
        </button>

        <button 
          class="action-btn secondary"
          (click)="onCompareClick($event)"
          [disabled]="!policy.aiProcessed">
          <i class="fas fa-balance-scale"></i>
          Compare
        </button>
      </div>

      <!-- Gesture Feedback -->
      <div class="gesture-feedback" *ngIf="gestureFeedback">
        <div class="feedback-content">
          <i class="fas" [ngClass]="gestureFeedback.icon"></i>
          <span>{{ gestureFeedback.message }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gesture-policy-card {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 20px;
      margin: 8px 0;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      min-height: 200px;
    }

    .gesture-policy-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--color-primary);
    }

    .gesture-policy-card:active {
      transform: translateY(0);
    }

    .policy-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .policy-title-section {
      flex: 1;
      min-width: 0;
    }

    .policy-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 8px 0;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .policy-status {
      display: flex;
      align-items: center;
    }

    .status-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-publish {
      background: #d1fae5;
      color: #065f46;
    }

    .status-draft {
      background: #fef3c7;
      color: #92400e;
    }

    .gesture-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--color-text-secondary);
      background: var(--color-bg-secondary);
      padding: 4px 8px;
      border-radius: 12px;
    }

    .policy-description {
      margin-bottom: 12px;
    }

    .policy-description p {
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.4;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .policy-metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--color-text-tertiary);
    }

    .expiry-date {
      font-weight: 500;
    }

    .expiry-date.expired {
      color: #dc2626;
    }

    .expiry-date.expiring-soon {
      color: #d97706;
    }

    .expiry-date.active {
      color: #059669;
    }

    .ai-summary-preview {
      background: var(--color-bg-secondary);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .summary-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .summary-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-primary);
    }

    .summary-text {
      font-size: 13px;
      color: var(--color-text-secondary);
      line-height: 1.4;
      margin: 0;
    }

    .gesture-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
      padding: 12px;
      background: var(--color-bg-secondary);
      border-radius: 8px;
    }

    .gesture-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px;
      border-radius: 6px;
      font-size: 11px;
      color: var(--color-text-secondary);
      transition: all 0.2s;
    }

    .gesture-action.active {
      background: var(--color-primary);
      color: white;
    }

    .gesture-action i {
      font-size: 10px;
    }

    .policy-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
      flex: 1;
      justify-content: center;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn.primary {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .action-btn.primary:hover:not(:disabled) {
      background: #2563eb;
      transform: translateY(-1px);
    }

    .action-btn.secondary {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border-color: var(--color-border-primary);
    }

    .action-btn.secondary:hover:not(:disabled) {
      background: var(--color-bg-tertiary);
      border-color: var(--color-primary);
    }

    .gesture-feedback {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--color-primary);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10;
      animation: fadeInOut 2s ease-in-out;
    }

    .feedback-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Dark mode */
    .dark .gesture-policy-card {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    .dark .gesture-policy-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .dark .ai-summary-preview {
      background: var(--color-bg-secondary);
    }

    .dark .gesture-actions {
      background: var(--color-bg-secondary);
    }

    .dark .status-publish {
      background: #065f46;
      color: #a7f3d0;
    }

    .dark .status-draft {
      background: #92400e;
      color: #fcd34d;
    }

    /* Animations */
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }

    /* Responsive */
    @media (max-width: 480px) {
      .gesture-policy-card {
        padding: 12px;
        margin: 6px 0;
      }

      .policy-title {
        font-size: 15px;
      }

      .policy-description p {
        font-size: 13px;
      }

      .action-btn {
        padding: 6px 10px;
        font-size: 11px;
      }

      .gesture-actions {
        grid-template-columns: 1fr;
        gap: 6px;
      }
    }
  `]
})
export class GesturePolicyCardComponent implements OnInit, OnDestroy {
  @Input() policy!: Policy;
  @Input() isDarkMode = false;
  @Input() showGestureHint = true;
  @Output() viewPolicy = new EventEmitter<Policy>();
  @Output() startAIChat = new EventEmitter<Policy>();
  @Output() comparePolicy = new EventEmitter<Policy>();
  @Output() analyzePolicy = new EventEmitter<Policy>();
  @Output() summarizePolicy = new EventEmitter<Policy>();
  @Output() highlightPolicy = new EventEmitter<Policy>();
  @Output() searchPolicy = new EventEmitter<Policy>();

  @ViewChild('cardElement') cardElement!: ElementRef;

  gestureAction: string | null = null;
  gestureFeedback: { icon: string; message: string } | null = null;
  showGestureActions = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private policyService: PolicyService,
    private gestureAIService: GestureAIService,
    private mobilePDFAIService: MobilePDFAIService
  ) {}

  ngOnInit(): void {
    this.initializeGestures();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.cardElement) {
      this.gestureAIService.cleanup(this.cardElement.nativeElement);
    }
  }

  private initializeGestures(): void {
    if (this.cardElement) {
      this.gestureAIService.initializeGestureDetection(this.cardElement.nativeElement);
    }
  }

  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.gestureAIService.gesture$.subscribe(gesture => {
        if (gesture) {
          this.handleGesture(gesture);
        }
      })
    );
  }

  private handleGesture(gesture: GestureEvent): void {
    const response = this.gestureAIService.interpretGesture(gesture, 'policy_analysis');
    
    this.gestureAction = response.action;
    this.showGestureActions = true;

    // Show feedback
    this.gestureFeedback = {
      icon: this.getGestureIcon(response.action),
      message: response.suggestions?.[0] || 'Gesture recognized'
    };

    // Execute action
    switch (response.action) {
      case 'analyze':
        this.analyzePolicy.emit(this.policy);
        break;
      case 'summarize':
        this.summarizePolicy.emit(this.policy);
        break;
      case 'highlight':
        this.highlightPolicy.emit(this.policy);
        break;
      case 'search':
        this.searchPolicy.emit(this.policy);
        break;
    }

    // Hide feedback after 2 seconds
    setTimeout(() => {
      this.gestureFeedback = null;
      this.gestureAction = null;
      this.showGestureActions = false;
    }, 2000);
  }

  private getGestureIcon(action: string): string {
    switch (action) {
      case 'analyze': return 'fa-search';
      case 'summarize': return 'fa-file-alt';
      case 'highlight': return 'fa-highlighter';
      case 'search': return 'fa-search';
      default: return 'fa-hand-paper';
    }
  }

  onCardClick(): void {
    this.viewPolicy.emit(this.policy);
  }

  onViewClick(event: Event): void {
    event.stopPropagation();
    this.viewPolicy.emit(this.policy);
  }

  onAIChatClick(event: Event): void {
    event.stopPropagation();
    this.startAIChat.emit(this.policy);
  }

  onCompareClick(event: Event): void {
    event.stopPropagation();
    this.comparePolicy.emit(this.policy);
  }

  getStatusBadgeClasses(status: string): string {
    switch (status) {
      case 'publish':
        return 'status-badge status-publish';
      case 'draft':
        return 'status-badge status-draft';
      default:
        return 'status-badge status-draft';
    }
  }

  getExpiryDateClass(policy: Policy): string {
    if (!policy.expiryDate) return '';
    
    const lifecycleInfo = this.policyService.calculatePolicyLifecycle(policy);
    
    if (lifecycleInfo.isExpired) {
      return 'expiry-date expired';
    } else if (lifecycleInfo.isExpiringSoon) {
      return 'expiry-date expiring-soon';
    } else {
      return 'expiry-date active';
    }
  }
}
