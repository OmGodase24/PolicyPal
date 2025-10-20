import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RewardService } from '../services/reward.service';
import { 
  ActivityDataDto, 
  RewardResponseDto, 
  UserRewardDto, 
  BadgeDto, 
  ActivityLogDto, 
  ProgressToMilestoneDto,
  LeaderboardDto 
} from '../dto/reward.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Rewards')
@Controller('rewards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Post('activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record user activity and award points/badges' })
  @ApiResponse({ status: 200, description: 'Activity recorded successfully', type: RewardResponseDto })
  async recordActivity(
    @Body() activityData: ActivityDataDto,
    @Request() req
  ): Promise<RewardResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    return this.rewardService.recordActivity(userId, activityData);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get user reward status' })
  @ApiResponse({ status: 200, description: 'User reward status retrieved', type: UserRewardDto })
  async getUserRewards(@Request() req): Promise<UserRewardDto> {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    console.log('🎖️ Getting user rewards for user:', userId);
    
    // Get or create user reward record
    let userReward = await this.rewardService.getUserRewards(userId);
    if (!userReward) {
      console.log('🎖️ No existing reward record found, initializing...');
      // Auto-initialize user rewards if they don't exist
      userReward = await this.rewardService.initializeUserRewards(userId);
      console.log('🎖️ User reward record initialized:', userReward._id);
    } else {
      console.log('🎖️ Found existing reward record:', userReward._id);
    }
    
    // Transform UserRewardDocument to UserRewardDto
    return {
      userId: userReward.userId.toString(),
      totalPoints: userReward.totalPoints,
      level: userReward.level,
      currentLevelPoints: userReward.currentLevelPoints,
      nextLevelPoints: userReward.nextLevelPoints,
      badges: userReward.badges,
      currentStreak: userReward.currentStreak,
      longestStreak: userReward.longestStreak,
      lastActivityDate: userReward.lastActivityDate,
      activityCounts: Object.fromEntries(userReward.activityCounts),
      unlockedFeatures: userReward.unlockedFeatures,
      achievements: userReward.achievements,
    };
  }

  @Get('activity-history')
  @ApiOperation({ summary: 'Get user activity history' })
  @ApiResponse({ status: 200, description: 'Activity history retrieved', type: [ActivityLogDto] })
  async getUserActivityHistory(
    @Request() req,
    @Query('limit') limit: number = 20
  ): Promise<ActivityLogDto[]> {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    return this.rewardService.getUserActivityHistory(userId, limit);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Get all available badges' })
  @ApiResponse({ status: 200, description: 'Badges retrieved', type: [BadgeDto] })
  async getAllBadges(): Promise<BadgeDto[]> {
    return this.rewardService.getAllBadges();
  }

  @Get('progress/:activityType')
  @ApiOperation({ summary: 'Get progress towards next milestone for specific activity' })
  @ApiResponse({ status: 200, description: 'Progress retrieved', type: ProgressToMilestoneDto })
  async getProgressToNextMilestone(
    @Param('activityType') activityType: string,
    @Request() req
  ): Promise<ProgressToMilestoneDto> {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    return this.rewardService.getProgressToNextMilestone(userId, activityType);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved', type: LeaderboardDto })
  async getLeaderboard(@Request() req): Promise<LeaderboardDto> {
    // This would need to be implemented in the service
    // For now, return a placeholder
    return {
      entries: [],
      totalUsers: 0,
      userRank: 0
    };
  }
}
