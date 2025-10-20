import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserReward, UserRewardDocument } from '../schemas/user-reward.schema';
import { Badge, BadgeDocument } from '../schemas/badge.schema';
import { ActivityLog, ActivityLogDocument } from '../schemas/activity-log.schema';

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

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name);

  constructor(
    @InjectModel(UserReward.name) private userRewardModel: Model<UserRewardDocument>,
    @InjectModel(Badge.name) private badgeModel: Model<BadgeDocument>,
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLogDocument>,
  ) {}

  // Initialize user rewards when they first sign up
  async initializeUserRewards(userId: string): Promise<UserRewardDocument> {
    const existingReward = await this.userRewardModel.findOne({ userId: new Types.ObjectId(userId) });
    if (existingReward) {
      return existingReward;
    }

    const userReward = new this.userRewardModel({
      userId: new Types.ObjectId(userId),
      totalPoints: 0,
      level: 1,
      currentLevelPoints: 0,
      nextLevelPoints: 50,
      badges: [],
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: new Date(),
      activityCounts: new Map(),
      lastActivityDates: new Map(),
      unlockedFeatures: [],
      achievements: {
        policiesCreated: 0,
        policiesPublished: 0,
        complianceChecks: 0,
        aiInteractions: 0,
        policyComparisons: 0,
        dlpScans: 0,
        privacyAssessments: 0,
      },
    });

    return await userReward.save();
  }

  // Record user activity and award points/badges
  async recordActivity(userId: string, activity: ActivityData): Promise<RewardResponse> {
    try {
      // Get or create user reward record
      let userReward = await this.userRewardModel.findOne({ userId: new Types.ObjectId(userId) });
      if (!userReward) {
        userReward = await this.initializeUserRewards(userId);
      }

      // Update activity counts
      const currentCount = userReward.activityCounts.get(activity.type) || 0;
      userReward.activityCounts.set(activity.type, currentCount + 1);
      userReward.lastActivityDates.set(activity.type, new Date());

      // Update achievements
      this.updateAchievements(userReward, activity);

      // Add points
      userReward.totalPoints += activity.points;
      userReward.currentLevelPoints += activity.points;

      // Check for level up
      const levelUpResult = this.checkLevelUp(userReward);

      // Check for new badges
      const newBadges = await this.checkNewBadges(userReward, activity);

      // Check for feature unlocks
      const newFeatures = this.checkFeatureUnlocks(userReward, activity);

      // Update streak
      const streakUpdated = this.updateStreak(userReward);

      // Save updated reward
      await userReward.save();

      // Log the activity
      await this.logActivity(userId, activity, newBadges, newFeatures);

      return {
        success: true,
        pointsEarned: activity.points,
        newLevel: levelUpResult.newLevel,
        badgesEarned: newBadges,
        featuresUnlocked: newFeatures,
        streakUpdated,
        message: this.generateRewardMessage(activity, newBadges, newFeatures, levelUpResult),
      };
    } catch (error) {
      this.logger.error(`Error recording activity for user ${userId}:`, error);
      return {
        success: false,
        pointsEarned: 0,
        badgesEarned: [],
        featuresUnlocked: [],
        streakUpdated: false,
        message: 'Failed to record activity',
      };
    }
  }

  // Get user's reward status
  async getUserRewards(userId: string): Promise<UserRewardDocument | null> {
    return this.userRewardModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  // Get user's activity history
  async getUserActivityHistory(userId: string, limit: number = 20): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ activityDate: -1 })
      .limit(limit)
      .exec();
  }

  // Get all available badges
  async getAllBadges(): Promise<BadgeDocument[]> {
    return this.badgeModel.find({ isActive: true }).exec();
  }

  // Get user's progress towards next milestone
  async getProgressToNextMilestone(userId: string, activityType: string): Promise<{
    current: number;
    required: number;
    progress: number;
    nextBadge?: BadgeDocument;
  }> {
    const userReward = await this.getUserRewards(userId);
    if (!userReward) {
      return { current: 0, required: 0, progress: 0 };
    }

    const currentCount = userReward.activityCounts.get(activityType) || 0;
    
    // Find next badge for this activity type
    const nextBadge = await this.badgeModel.findOne({
      'requirement.activityType': activityType,
      'requirement.count': { $gt: currentCount },
      isActive: true,
    }).sort({ 'requirement.count': 1 });

    if (!nextBadge) {
      return { current: currentCount, required: 0, progress: 100 };
    }

    const required = nextBadge.requirement.count;
    const progress = Math.min((currentCount / required) * 100, 100);

    return {
      current: currentCount,
      required,
      progress,
      nextBadge,
    };
  }

  // Private helper methods
  private updateAchievements(userReward: UserRewardDocument, activity: ActivityData): void {
    switch (activity.type) {
      case 'policy_created':
        userReward.achievements.policiesCreated++;
        break;
      case 'policy_published':
        userReward.achievements.policiesPublished++;
        break;
      case 'compliance_check':
        userReward.achievements.complianceChecks++;
        break;
      case 'ai_interaction':
        userReward.achievements.aiInteractions++;
        break;
      case 'policy_comparison':
        userReward.achievements.policyComparisons++;
        break;
      case 'dlp_scan':
        userReward.achievements.dlpScans++;
        break;
      case 'privacy_assessment':
        userReward.achievements.privacyAssessments++;
        break;
    }
  }

  private checkLevelUp(userReward: UserRewardDocument): { leveledUp: boolean; newLevel?: number } {
    if (userReward.currentLevelPoints >= userReward.nextLevelPoints) {
      const oldLevel = userReward.level;
      userReward.level++;
      userReward.currentLevelPoints = userReward.currentLevelPoints - userReward.nextLevelPoints;
      userReward.nextLevelPoints = this.calculateNextLevelPoints(userReward.level);
      
      return { leveledUp: true, newLevel: userReward.level };
    }
    return { leveledUp: false };
  }

  private calculateNextLevelPoints(level: number): number {
    // Progressive level requirements: 50, 100, 150, 200, 250, etc.
    return level * 50;
  }

  private async checkNewBadges(userReward: UserRewardDocument, activity: ActivityData): Promise<string[]> {
    const newBadges: string[] = [];
    
    // Get all active badges
    const badges = await this.badgeModel.find({ isActive: true });
    
    for (const badge of badges) {
      // Skip if user already has this badge
      if (userReward.badges.includes(badge.id)) {
        continue;
      }

      // Check if badge requirement is met
      const currentCount = userReward.activityCounts.get(badge.requirement.activityType) || 0;
      
      if (currentCount >= badge.requirement.count) {
        userReward.badges.push(badge.id);
        newBadges.push(badge.id);
      }
    }

    return newBadges;
  }

  private checkFeatureUnlocks(userReward: UserRewardDocument, activity: ActivityData): string[] {
    const newFeatures: string[] = [];
    
    // Define feature unlock requirements
    const featureRequirements = {
      'compare_policies': { activityType: 'policy_created', count: 3 },
      'advanced_ai_insights': { activityType: 'compliance_check', count: 5 },
      'bulk_operations': { activityType: 'policy_published', count: 10 },
      'advanced_analytics': { activityType: 'ai_interaction', count: 20 },
    };

    for (const [feature, requirement] of Object.entries(featureRequirements)) {
      if (userReward.unlockedFeatures.includes(feature)) {
        continue;
      }

      const currentCount = userReward.activityCounts.get(requirement.activityType) || 0;
      if (currentCount >= requirement.count) {
        userReward.unlockedFeatures.push(feature);
        newFeatures.push(feature);
      }
    }

    return newFeatures;
  }

  private updateStreak(userReward: UserRewardDocument): boolean {
    const today = new Date();
    const lastActivity = userReward.lastActivityDate;
    
    if (!lastActivity) {
      userReward.lastActivityDate = today;
      userReward.currentStreak = 1;
      return true;
    }

    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      userReward.currentStreak++;
      userReward.lastActivityDate = today;
    } else if (daysDiff === 0) {
      // Same day, no change
      return false;
    } else {
      // Streak broken
      userReward.currentStreak = 1;
      userReward.lastActivityDate = today;
    }

    // Update longest streak
    if (userReward.currentStreak > userReward.longestStreak) {
      userReward.longestStreak = userReward.currentStreak;
    }

    return true;
  }

  private async logActivity(
    userId: string, 
    activity: ActivityData, 
    badgesEarned: string[], 
    featuresUnlocked: string[]
  ): Promise<void> {
    const activityLog = new this.activityLogModel({
      userId: new Types.ObjectId(userId),
      activityType: activity.type,
      activityName: activity.name,
      pointsEarned: activity.points,
      metadata: activity.metadata || {},
      badgesEarned,
      featuresUnlocked,
      activityDate: new Date(),
    });

    await activityLog.save();
  }

  private generateRewardMessage(
    activity: ActivityData, 
    badgesEarned: string[], 
    featuresUnlocked: string[], 
    levelUpResult: any
  ): string {
    let message = `+${activity.points} points for ${activity.name}`;
    
    if (levelUpResult.leveledUp) {
      message += ` 🎉 Level up! You're now level ${levelUpResult.newLevel}!`;
    }
    
    if (badgesEarned.length > 0) {
      message += ` 🏆 New badge${badgesEarned.length > 1 ? 's' : ''} earned!`;
    }
    
    if (featuresUnlocked.length > 0) {
      message += ` 🔓 New feature${featuresUnlocked.length > 1 ? 's' : ''} unlocked!`;
    }
    
    return message;
  }
}
