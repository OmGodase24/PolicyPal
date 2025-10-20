import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ActivityData {
  type: string;
  name: string;
  points: number;
  metadata?: any;
}

export interface RewardResponse {
  success: boolean;
  pointsEarned: number;
  newLevel?: number;
  badgesEarned: string[];
  featuresUnlocked: string[];
  streakUpdated: boolean;
  message: string;
}

export interface UserReward {
  userId: string;
  totalPoints: number;
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  badges: string[];
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  activityCounts: Record<string, number>;
  unlockedFeatures: string[];
  achievements: {
    policiesCreated: number;
    policiesPublished: number;
    complianceChecks: number;
    aiInteractions: number;
    policyComparisons: number;
    dlpScans: number;
    privacyAssessments: number;
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  pointsReward: number;
  unlocksFeatures: string[];
  isHidden: boolean;
}

export interface ActivityLog {
  activityType: string;
  activityName: string;
  pointsEarned: number;
  metadata: any;
  badgesEarned: string[];
  featuresUnlocked: string[];
  activityDate: string;
}

export interface ProgressToMilestone {
  current: number;
  required: number;
  progress: number;
  nextBadge?: Badge;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalPoints: number;
  level: number;
  badgeCount: number;
  currentStreak: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  totalUsers: number;
  userRank?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RewardService {
  private apiUrl = `${environment.apiUrl}/rewards`;

  constructor(private http: HttpClient) {}

  recordActivity(activity: ActivityData): Observable<RewardResponse> {
    return this.http.post<RewardResponse>(`${this.apiUrl}/activity`, activity);
  }

  getUserRewards(): Observable<UserReward> {
    return this.http.get<UserReward>(`${this.apiUrl}/status`);
  }

  getUserActivityHistory(limit: number = 20): Observable<ActivityLog[]> {
    return this.http.get<ActivityLog[]>(`${this.apiUrl}/activity-history?limit=${limit}`);
  }

  getAllBadges(): Observable<Badge[]> {
    return this.http.get<Badge[]>(`${this.apiUrl}/badges`);
  }

  getProgressToNextMilestone(activityType: string): Observable<ProgressToMilestone> {
    return this.http.get<ProgressToMilestone>(`${this.apiUrl}/progress/${activityType}`);
  }

  getLeaderboard(): Observable<Leaderboard> {
    return this.http.get<Leaderboard>(`${this.apiUrl}/leaderboard`);
  }

  // Helper method to get level name
  getLevelName(level: number): string {
    if (level <= 5) return 'Beginner';
    if (level <= 10) return 'Intermediate';
    if (level <= 20) return 'Expert';
    if (level <= 30) return 'Master';
    return 'Legend';
  }

  // Helper method to get level color
  getLevelColor(level: number): string {
    if (level <= 5) return 'text-green-600';
    if (level <= 10) return 'text-blue-600';
    if (level <= 20) return 'text-purple-600';
    if (level <= 30) return 'text-orange-600';
    return 'text-red-600';
  }

  // Helper method to get level icon
  getLevelIcon(level: number): string {
    if (level <= 5) return '🌱';
    if (level <= 10) return '⭐';
    if (level <= 20) return '🏆';
    if (level <= 30) return '👑';
    return '💎';
  }

  // Helper method to calculate progress percentage
  calculateProgress(current: number, required: number): number {
    if (required === 0) return 100;
    return Math.min((current / required) * 100, 100);
  }

  // Helper method to format points
  formatPoints(points: number): string {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  }
}
