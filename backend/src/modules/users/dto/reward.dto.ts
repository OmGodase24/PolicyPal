import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsObject } from 'class-validator';

export class ActivityDataDto {
  @ApiProperty({ description: 'Type of activity', example: 'policy_created' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Name of the activity', example: 'Created Policy' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Points earned for this activity', example: 10 })
  @IsNumber()
  points: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class RewardResponseDto {
  @ApiProperty({ description: 'Whether the reward was processed successfully' })
  success: boolean;

  @ApiProperty({ description: 'Points earned from this activity' })
  pointsEarned: number;

  @ApiProperty({ description: 'New level reached (if any)', required: false })
  newLevel?: number;

  @ApiProperty({ description: 'Badges earned from this activity' })
  badgesEarned: string[];

  @ApiProperty({ description: 'Features unlocked from this activity' })
  featuresUnlocked: string[];

  @ApiProperty({ description: 'Whether the streak was updated' })
  streakUpdated: boolean;

  @ApiProperty({ description: 'Reward message' })
  message: string;
}

export class UserRewardDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Total points earned' })
  totalPoints: number;

  @ApiProperty({ description: 'Current level' })
  level: number;

  @ApiProperty({ description: 'Points in current level' })
  currentLevelPoints: number;

  @ApiProperty({ description: 'Points needed for next level' })
  nextLevelPoints: number;

  @ApiProperty({ description: 'Badges earned' })
  badges: string[];

  @ApiProperty({ description: 'Current streak' })
  currentStreak: number;

  @ApiProperty({ description: 'Longest streak achieved' })
  longestStreak: number;

  @ApiProperty({ description: 'Last activity date' })
  lastActivityDate: Date;

  @ApiProperty({ description: 'Activity counts by type' })
  activityCounts: Record<string, number>;

  @ApiProperty({ description: 'Unlocked features' })
  unlockedFeatures: string[];

  @ApiProperty({ description: 'Achievement statistics' })
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

export class BadgeDto {
  @ApiProperty({ description: 'Badge ID' })
  id: string;

  @ApiProperty({ description: 'Badge name' })
  name: string;

  @ApiProperty({ description: 'Badge description' })
  description: string;

  @ApiProperty({ description: 'Badge icon' })
  icon: string;

  @ApiProperty({ description: 'Badge category' })
  category: string;

  @ApiProperty({ description: 'Points reward for earning this badge' })
  pointsReward: number;

  @ApiProperty({ description: 'Features unlocked by this badge' })
  unlocksFeatures: string[];

  @ApiProperty({ description: 'Whether the badge is hidden until unlocked' })
  isHidden: boolean;
}

export class ActivityLogDto {
  @ApiProperty({ description: 'Activity type' })
  activityType: string;

  @ApiProperty({ description: 'Activity name' })
  activityName: string;

  @ApiProperty({ description: 'Points earned' })
  pointsEarned: number;

  @ApiProperty({ description: 'Activity metadata' })
  metadata: any;

  @ApiProperty({ description: 'Badges earned' })
  badgesEarned: string[];

  @ApiProperty({ description: 'Features unlocked' })
  featuresUnlocked: string[];

  @ApiProperty({ description: 'Activity date' })
  activityDate: Date;
}

export class ProgressToMilestoneDto {
  @ApiProperty({ description: 'Current count' })
  current: number;

  @ApiProperty({ description: 'Required count' })
  required: number;

  @ApiProperty({ description: 'Progress percentage' })
  progress: number;

  @ApiProperty({ description: 'Next badge information', required: false })
  nextBadge?: BadgeDto;
}

export class LeaderboardEntryDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User name' })
  userName: string;

  @ApiProperty({ description: 'Total points' })
  totalPoints: number;

  @ApiProperty({ description: 'Current level' })
  level: number;

  @ApiProperty({ description: 'Number of badges' })
  badgeCount: number;

  @ApiProperty({ description: 'Current streak' })
  currentStreak: number;
}

export class LeaderboardDto {
  @ApiProperty({ description: 'Leaderboard entries' })
  entries: LeaderboardEntryDto[];

  @ApiProperty({ description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ description: 'Current user rank', required: false })
  userRank?: number;
}
