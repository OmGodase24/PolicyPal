import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RewardService, UserReward, Badge, ActivityLog, ProgressToMilestone } from '@core/services/reward.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-reward-dashboard',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="reward-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <h2 class="dashboard-title">
          <i class="fas fa-trophy text-yellow-500 mr-2"></i>
          {{ 'rewards.title' | translate }}
        </h2>
        <p class="dashboard-subtitle">{{ 'rewards.subtitle' | translate }}</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="text-center mt-4 text-gray-600">Loading...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!isLoading && userReward" class="dashboard-content">
        <!-- User Stats Overview -->
        <div class="stats-overview">
          <div class="stat-card level-card">
            <div class="stat-icon">{{ getLevelIcon(userReward.level) }}</div>
            <div class="stat-content">
              <h3 class="stat-title">{{ 'rewards.level' | translate }} {{ userReward.level }}</h3>
              <p class="stat-subtitle">{{ getLevelName(userReward.level) }}</p>
              <div class="level-progress">
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    [style.width.%]="calculateProgress(userReward.currentLevelPoints, userReward.nextLevelPoints)">
                  </div>
                </div>
                <p class="progress-text">
                  {{ userReward.currentLevelPoints }}/{{ userReward.nextLevelPoints }} {{ 'rewards.points' | translate }}
                </p>
              </div>
            </div>
          </div>

          <div class="stat-card points-card">
            <div class="stat-icon">⭐</div>
            <div class="stat-content">
              <h3 class="stat-title">{{ formatPoints(userReward.totalPoints) }}</h3>
              <p class="stat-subtitle">{{ 'rewards.points' | translate }}</p>
            </div>
          </div>

          <div class="stat-card streak-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-content">
              <h3 class="stat-title">{{ userReward.currentStreak }}</h3>
              <p class="stat-subtitle">{{ 'rewards.streak' | translate }}</p>
              <p class="stat-detail">{{ 'rewards.best' | translate }}: {{ userReward.longestStreak }} {{ 'rewards.days' | translate }}</p>
            </div>
          </div>

          <div class="stat-card badges-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-content">
              <h3 class="stat-title">{{ userReward.badges.length }}</h3>
              <p class="stat-subtitle">{{ 'rewards.badgesEarned' | translate }}</p>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="main-content-grid">
          <!-- Recent Activity -->
          <div class="activity-section">
            <h3 class="section-title">
              <i class="fas fa-history mr-2"></i>
              {{ 'rewards.recentActivity' | translate }}
            </h3>
            <div class="activity-list" *ngIf="recentActivity.length > 0; else noActivity">
              <div class="activity-item" *ngFor="let activity of recentActivity">
                <div class="activity-icon">{{ getActivityIcon(activity.activityType) }}</div>
                <div class="activity-content">
                  <p class="activity-name">{{ getTranslatedActivityName(activity.activityName) }}</p>
                  <p class="activity-meta">
                    +{{ activity.pointsEarned }} {{ 'rewards.pointsLower' | translate }} • {{ formatDate(activity.activityDate) }}
                  </p>
                  <div *ngIf="activity.badgesEarned.length > 0" class="activity-badges">
                    <span class="badge-earned" *ngFor="let badge of activity.badgesEarned">
                      🏆 {{ getBadgeName(badge) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="view-more-container" *ngIf="allActivity.length > 5">
                <button class="btn btn-outline-primary" (click)="showAllActivity()">
                  <i class="fas fa-eye mr-2"></i>
                  {{ 'rewards.viewMore' | translate }} ({{ allActivity.length - 5 }} {{ 'rewards.more' | translate }})
                </button>
              </div>
            </div>
            <ng-template #noActivity>
              <div class="no-activity">
                <i class="fas fa-inbox text-gray-400 text-4xl mb-4"></i>
                <p class="text-gray-600">{{ 'rewards.noActivity' | translate }}</p>
              </div>
            </ng-template>
          </div>

          <!-- Progress to Next Milestones -->
          <div class="milestones-section">
            <h3 class="section-title">
              <i class="fas fa-target mr-2"></i>
              {{ 'rewards.nextMilestones' | translate }}
            </h3>
            <div class="milestones-grid">
              <div class="milestone-card" *ngFor="let milestone of milestones">
                <div class="milestone-header">
                  <h4 class="milestone-title">{{ milestone.name }}</h4>
                  <span class="milestone-progress">{{ milestone.progress }}%</span>
                </div>
                <div class="milestone-bar">
                  <div 
                    class="milestone-fill" 
                    [style.width.%]="milestone.progress">
                  </div>
                </div>
                <p class="milestone-detail">
                  {{ milestone.current }}/{{ milestone.required }} {{ milestone.type }}
                </p>
              </div>
            </div>
          </div>

          <!-- Badges Section -->
          <div class="badges-section">
            <h3 class="section-title">
              <i class="fas fa-medal mr-2"></i>
              {{ 'rewards.yourBadges' | translate }}
            </h3>
            <div class="badges-grid" *ngIf="userBadges.length > 0; else noBadges">
              <div class="badge-item" *ngFor="let badge of userBadges">
                <div class="badge-icon">{{ badge.icon }}</div>
                <div class="badge-content">
                  <h4 class="badge-name">{{ getBadgeName(badge.id) }}</h4>
                  <p class="badge-description">{{ getBadgeDescription(badge.id) }}</p>
                  <span class="badge-points">+{{ badge.pointsReward }} {{ 'rewards.pointsLower' | translate }}</span>
                </div>
              </div>
            </div>
            <ng-template #noBadges>
              <div class="no-badges">
                <i class="fas fa-trophy text-gray-400 text-4xl mb-4"></i>
                <p class="text-gray-600">{{ 'rewards.noBadges' | translate }}</p>
                <p class="text-sm text-gray-500">{{ 'rewards.earnFirstBadge' | translate }}</p>
              </div>
            </ng-template>
          </div>

          <!-- Unlocked Features -->
          <div class="features-section" *ngIf="userReward.unlockedFeatures.length > 0">
            <h3 class="section-title">
              <i class="fas fa-unlock mr-2"></i>
              {{ 'rewards.unlockedFeatures' | translate }}
            </h3>
            <div class="features-grid">
              <div class="feature-item" *ngFor="let feature of userReward.unlockedFeatures">
                <i class="fas fa-check-circle text-green-500 mr-2"></i>
                <span class="feature-name">{{ getFeatureName(feature) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading && !userReward" class="error-container">
        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <p class="text-red-600">Failed to load reward data</p>
        <button (click)="loadRewardData()" class="btn btn-primary mt-4">
          Try Again
        </button>
      </div>

      <!-- All Activity Modal -->
      <div *ngIf="showAllActivityModal" class="modal-overlay" (click)="closeAllActivityModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">
              <i class="fas fa-history mr-2"></i>
              {{ 'rewards.recentActivity' | translate }}
            </h3>
            <button class="modal-close" (click)="closeAllActivityModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="activity-list" *ngIf="allActivity.length > 0; else noActivityModal">
              <div class="activity-item" *ngFor="let activity of allActivity">
                <div class="activity-icon">{{ getActivityIcon(activity.activityType) }}</div>
                <div class="activity-content">
                  <p class="activity-name">{{ getTranslatedActivityName(activity.activityName) }}</p>
                  <p class="activity-meta">
                    +{{ activity.pointsEarned }} {{ 'rewards.pointsLower' | translate }} • {{ formatDate(activity.activityDate) }}
                  </p>
                  <div *ngIf="activity.badgesEarned.length > 0" class="activity-badges">
                    <span class="badge-earned" *ngFor="let badge of activity.badgesEarned">
                      🏆 {{ getBadgeName(badge) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <ng-template #noActivityModal>
              <div class="no-activity">
                <i class="fas fa-inbox text-gray-400 text-4xl mb-4"></i>
                <p class="text-gray-600">{{ 'rewards.noActivity' | translate }}</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reward-dashboard {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1440px;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .dashboard-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .dashboard-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .dashboard-subtitle {
      color: var(--color-text-secondary);
      margin: 0;
    }

    .stats-overview {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 0.5rem;
      align-items: stretch;
    }

    /* Main layout uses grid areas for clarity on wide screens */
    .main-content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      grid-template-areas:
        'activity milestones milestones'
        'badges badges features';
      gap: 1.5rem;
      align-items: start;
    }

    .activity-section { grid-area: activity; }
    .milestones-section { grid-area: milestones; }
    .badges-section { grid-area: badges; }
    .features-section { grid-area: features; }

    .stat-card,
    .activity-section,
    .milestones-section,
    .badges-section,
    .features-section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 1.25rem 1.25rem 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
      transition: box-shadow 0.25s ease, transform 0.25s ease;
      min-width: 0;
      box-sizing: border-box;
    }

    .section-title { margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }

    .activity-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .activity-item { display: flex; gap: 0.75rem; padding: 0.75rem; background: var(--color-bg-tertiary); border: 1px solid var(--color-border-primary); border-radius: 10px; }
    .activity-content { flex: 1; min-width: 0; }
    .activity-name { margin: 0 0 0.25rem 0; font-weight: 500; color: var(--color-text-primary); word-break: break-word; }
    .activity-meta { margin: 0; font-size: 0.875rem; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .milestones-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
    .milestone-card { padding: 1rem; background: var(--color-bg-tertiary); border: 1px solid var(--color-border-primary); border-radius: 10px; }

    .badges-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; }
    .badge-item { display: flex; gap: 0.75rem; align-items: center; padding: 1rem; background: var(--color-bg-tertiary); border: 1px solid var(--color-border-primary); border-radius: 10px; min-width: 0; }
    .badge-content { flex: 1; min-width: 0; }
    .badge-name { margin: 0 0 0.25rem 0; font-weight: 500; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .badge-description { margin: 0 0 0.25rem 0; font-size: 0.875rem; color: var(--color-text-secondary); word-break: break-word; }

    .features-grid { display: grid; grid-template-columns: 1fr; gap: 0.5rem; }
    .feature-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--color-success-light); border: 1px solid var(--color-success); border-radius: 10px; }
    .feature-name { color: var(--color-success); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .stat-card {
      text-align: center;
    }

    .stat-card:hover,
    .activity-section:hover,
    .milestones-section:hover,
    .badges-section:hover,
    .features-section:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .level-card { border: 2px solid var(--color-primary); }
    .points-card { border: 2px solid var(--color-warning); }
    .streak-card { border: 2px solid var(--color-danger); }
    .badges-card { border: 2px solid var(--color-primary); }

    .stat-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      line-height: 1;
    }

    .stat-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 0.25rem 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .stat-subtitle {
      color: var(--color-text-secondary);
      margin: 0 0 0.5rem 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .stat-detail {
      font-size: 0.875rem;
      color: var(--color-text-tertiary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .level-progress { margin-top: 1rem; }

    .progress-bar {
      width: 100%;
      background: var(--color-border-primary);
      border-radius: 9999px;
      height: 0.5rem;
      margin-bottom: 0.5rem;
      overflow: hidden;
    }

    .progress-fill {
      background: var(--color-primary);
      height: 0.5rem;
      border-radius: 9999px;
      transition: all 0.3s ease;
    }

    .progress-text {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .activity-badges { margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }

    .badge-earned {
      display: inline-block;
      background: var(--color-warning-light);
      color: var(--color-warning);
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .no-activity,
    .no-badges { text-align: center; padding: 2rem; color: var(--color-text-secondary); }

    .milestone-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .milestone-title { font-weight: 500; color: var(--color-text-primary); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .milestone-progress { font-size: 0.875rem; font-weight: 600; color: var(--color-primary); }

    .milestone-bar { width: 100%; background: var(--color-border-primary); border-radius: 9999px; height: 0.5rem; margin-bottom: 0.5rem; overflow: hidden; }
    .milestone-fill { background: var(--color-primary); height: 0.5rem; border-radius: 9999px; transition: all 0.3s ease; }

    .milestone-detail { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .loading-container,
    .error-container { text-align: center; padding: 3rem; color: var(--color-text-secondary); }

    .btn { padding: 0.5rem 1rem; border-radius: 8px; font-weight: 500; transition: all 0.2s ease; border: none; cursor: pointer; }
    .btn-primary { background: var(--color-primary); color: white; }
    .btn-primary:hover { background: var(--color-primary-hover); }

    .view-more-container { text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border-primary); }

    .btn-outline-primary { background-color: transparent; color: var(--color-primary); border: 1px solid var(--color-primary); }
    .btn-outline-primary:hover { background-color: var(--color-primary); color: white; }

    /* Modal Styles */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }

    .modal-content { background: var(--color-bg-primary); border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); max-width: 600px; width: 100%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }

    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; border-bottom: 1px solid var(--color-border-primary); background: var(--color-bg-secondary); }

    .modal-title { font-size: 1.25rem; font-weight: 600; color: var(--color-text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem; }

    .modal-close { background: none; border: none; color: var(--color-text-secondary); font-size: 1.5rem; cursor: pointer; padding: 0.5rem; border-radius: 4px; transition: all 0.2s ease; }
    .modal-close:hover { background: var(--color-bg-tertiary); color: var(--color-text-primary); }

    .modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
    .modal-body .activity-list { max-height: 400px; overflow-y: auto; }

    /* Responsive Design */
    @media (max-width: 1400px) {
      .main-content-grid { grid-template-columns: 1.6fr 1fr; gap: 1.25rem; }
      .stats-overview { gap: 1.25rem; }
    }

    /* Responsive: two-column stats on tablets; single-column stacking for main sections */
    @media (max-width: 1200px) {
      .stats-overview { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
      .main-content-grid { grid-template-columns: 1fr; grid-template-areas: 'activity' 'milestones' 'badges' 'features'; }
    }

    @media (max-width: 1024px) {
      .reward-dashboard { padding: 1.25rem; }
      .main-content-grid { grid-template-columns: 1fr; gap: 1.25rem; }
      .milestones-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .badges-grid { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
      .features-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .stats-overview { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    }

    @media (max-width: 600px) {
      .reward-dashboard { padding: 1rem; gap: 1rem; }
      .stat-card { padding: 0.875rem; }
      .stat-title { font-size: 1.125rem; }
      .stat-subtitle { font-size: 0.875rem; }
      .activity-section, .milestones-section, .badges-section, .features-section { padding: 0.875rem; }
      .milestones-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .badges-grid { grid-template-columns: 1fr; }
      .features-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 400px) {
      .features-grid { grid-template-columns: 1fr; }
    }

    /* Dark mode uses CSS variables */
  `]
})
export class RewardDashboardComponent implements OnInit, OnDestroy {
  userReward: UserReward | null = null;
  recentActivity: ActivityLog[] = [];
  allActivity: ActivityLog[] = [];
  userBadges: Badge[] = [];
  milestones: any[] = [];
  isLoading = true;
  error = '';
  showAllActivityModal = false;

  private subscriptions: Subscription[] = [];

  constructor(private rewardService: RewardService, private languageService: LanguageService) {}

  ngOnInit(): void {
    this.loadRewardData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadRewardData(): void {
    this.isLoading = true;
    this.error = '';

    this.subscriptions.push(
      this.rewardService.getUserRewards().subscribe({
        next: (reward) => {
          this.userReward = reward;
          if (reward) {
            this.loadRecentActivity();
            this.loadUserBadges();
            this.loadMilestones();
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Failed to load reward data';
          this.isLoading = false;
        }
      })
    );
  }

  private loadRecentActivity(): void {
    this.subscriptions.push(
      this.rewardService.getUserActivityHistory(50).subscribe({
        next: (activity) => {
          this.allActivity = activity;
          this.recentActivity = activity.slice(0, 5);
        },
        error: (error) => {}
      })
    );
  }

  private loadUserBadges(): void {
    if (!this.userReward) return;

    this.subscriptions.push(
      this.rewardService.getAllBadges().subscribe({
        next: (badges) => {
          this.userBadges = badges.filter(badge => 
            this.userReward?.badges.includes(badge.id)
          );
        },
        error: (error) => {}
      })
    );
  }

  private loadMilestones(): void {
    if (!this.userReward) return;

    const milestoneTypes = [
      'policy_created',
      'policy_published',
      'compliance_check',
      'ai_interaction',
      'policy_comparison',
      'dlp_scan',
      'privacy_assessment'
    ];

    this.milestones = [];
    milestoneTypes.forEach(type => {
      this.subscriptions.push(
        this.rewardService.getProgressToNextMilestone(type).subscribe({
          next: (progress) => {
            if (progress.required > 0) {
              this.milestones.push({
                name: this.getMilestoneName(type),
                type: this.getActivityTypeName(type),
                current: progress.current,
                required: progress.required,
                progress: progress.progress,
                nextBadge: progress.nextBadge
              });
            }
          },
          error: (error) => {}
        })
      );
    });
  }

  getLevelName(level: number): string {
    return this.rewardService.getLevelName(level);
  }

  getLevelIcon(level: number): string {
    return this.rewardService.getLevelIcon(level);
  }

  calculateProgress(current: number, required: number): number {
    return this.rewardService.calculateProgress(current, required);
  }

  formatPoints(points: number): string {
    return this.rewardService.formatPoints(points);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActivityIcon(activityType: string): string {
    const icons: Record<string, string> = {
      'policy_created': '📝',
      'policy_published': '🚀',
      'compliance_check': '🔐',
      'ai_interaction': '🤖',
      'policy_comparison': '📊',
      'dlp_scan': '🔍',
      'privacy_assessment': '🔒'
    };
    return icons[activityType] || '⭐';
  }

  private mapActivityKey(activityType: string): string {
    const map: Record<string, string> = {
      'policy_created': 'policyCreated',
      'policy_published': 'policyPublished',
      'compliance_check': 'complianceCheck',
      'ai_interaction': 'aiInteraction',
      'policy_comparison': 'policyComparison',
      'dlp_scan': 'dlpScan',
      'privacy_assessment': 'privacyAssessment'
    };
    return map[activityType] || activityType;
  }

  getMilestoneName(activityType: string): string {
    const map: Record<string, string> = {
      'policy_created': 'policyCreator',
      'policy_published': 'policyPublisher',
      'compliance_check': 'compliancePro',
      'ai_interaction': 'aiExplorer',
      'policy_comparison': 'policyAnalyst',
      'dlp_scan': 'dlpScanner',
      'privacy_assessment': 'privacyAssessor'
    };
    const key = map[activityType] || activityType;
    return this.languageService.translate(`rewards.milestones.${key}`);
  }

  getActivityTypeName(activityType: string): string {
    const key = this.mapActivityKey(activityType);
    return this.languageService.translate(`rewards.activities.${key}`);
  }

  getFeatureName(feature: string): string {
    const map: Record<string, string> = {
      'compare_policies': 'comparePolicies',
      'advanced_ai_insights': 'advancedAiInsights',
      'bulk_operations': 'bulkOperations',
      'advanced_analytics': 'advancedAnalytics'
    };
    const key = map[feature] || feature;
    return this.languageService.translate(`rewards.features.${key}`);
  }

  getBadgeName(badgeId: string): string {
    const map: Record<string, string> = {
      'privacy_assessor_3': 'privacyAssessor',
      'privacy_assessor_10': 'privacyChampion',
      'first_publish': 'firstPublish',
      'policy_publisher_3': 'policyPublisher',
      'privacy_champion_10': 'privacyChampion',
      'compliance_pro_5': 'compliancePro',
      'compliance_pro_15': 'compliancePro',
      'first_policy': 'firstPolicy',
      'policy_analyst_3': 'policyAnalyst',
      'policy_creator_5': 'policyCreator'
    };
    const key = map[badgeId] || badgeId;
    return this.languageService.translate(`rewards.badges.${key}`);
  }

  getBadgeDescription(badgeId: string): string {
    const map: Record<string, string> = {
      'privacy_assessor_3': 'privacyAssessorDescription',
      'privacy_assessor_10': 'privacyChampionDescription',
      'first_publish': 'firstPublishDescription',
      'policy_publisher_3': 'policyPublisherDescription',
      'privacy_champion_10': 'privacyChampionDescription',
      'compliance_pro_5': 'complianceProDescription',
      'compliance_pro_15': 'complianceProDescription',
      'first_policy': 'firstPolicyDescription',
      'policy_analyst_3': 'policyAnalystDescription',
      'policy_creator_5': 'policyCreatorDescription'
    };
    const key = map[badgeId] || badgeId;
    return this.languageService.translate(`rewards.badges.${key}`);
  }

  getTranslatedActivityName(name: string): string {
    // Map backend activity names to translation keys when possible
    const map: Record<string, string> = {
      'AI Chat Session Started': 'aiInteraction',
      'Policy Comparison Created': 'policyComparison',
      'Full Compliance Report Viewed': 'complianceCheck',
      'Compliance Check Initiated': 'complianceCheck',
      'publish_policy': 'policyPublished',
      'privacy_assessment': 'privacyAssessment',
      'dlp_scan': 'dlpScan'
    };
    const key = map[name];
    if (key) {
      return this.languageService.translate(`rewards.activities.${key}`);
    }
    return name;
  }

  showAllActivity(): void {
    this.showAllActivityModal = true;
  }

  closeAllActivityModal(): void {
    this.showAllActivityModal = false;
  }
}
