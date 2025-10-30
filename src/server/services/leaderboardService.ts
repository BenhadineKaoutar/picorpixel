// Leaderboard service for PicOrPixel
import { LeaderboardEntry, UserStats } from '../../shared/types/game.js';
import { LeaderboardData, UserStatsData, RedisUtils } from '../data/redis.js';
import { AuthService } from './authService.js';

export class LeaderboardService {
  // Get leaderboard for a specific period
  static async getLeaderboard(
    period: 'daily' | 'weekly' | 'alltime' = 'daily',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    try {
      switch (period) {
        case 'daily':
          return await this.getDailyLeaderboard(limit);
        case 'weekly':
          return await this.getWeeklyLeaderboard(limit);
        case 'alltime':
          return await this.getAllTimeLeaderboard(limit);
        default:
          return await this.getDailyLeaderboard(limit);
      }
    } catch (error) {
      console.error(`Error getting ${period} leaderboard:`, error);
      return [];
    }
  }

  // Get today's leaderboard
  private static async getDailyLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const today = RedisUtils.getTodayString();
    const topScores = await LeaderboardData.getTopScores(today, limit);
    
    const leaderboard: LeaderboardEntry[] = [];
    
    for (const scoreEntry of topScores) {
      // Check if user allows leaderboard participation
      const privacySettings = await AuthService.getUserPrivacySettings(scoreEntry.userId);
      if (!privacySettings.allowLeaderboard) {
        continue;
      }

      const userStats = await UserStatsData.get(scoreEntry.userId);
      const username = await this.getUsernameById(scoreEntry.userId);
      
      leaderboard.push({
        userId: scoreEntry.userId,
        username,
        score: scoreEntry.score,
        rank: scoreEntry.rank,
        gamesPlayed: userStats?.totalGamesPlayed || 1,
        averageScore: userStats?.averageScore || scoreEntry.score,
      });
    }
    
    return leaderboard;
  }

  // Get this week's leaderboard (aggregated from daily scores)
  private static async getWeeklyLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const weeklyScores = new Map<string, { totalScore: number; gamesPlayed: number }>();
    
    // Get scores for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0] || '';
      
      const dailyScores = await LeaderboardData.getTopScores(dateStr, 100); // Get more entries for aggregation
      
      for (const score of dailyScores) {
        const existing = weeklyScores.get(score.userId) || { totalScore: 0, gamesPlayed: 0 };
        existing.totalScore += score.score;
        existing.gamesPlayed += 1;
        weeklyScores.set(score.userId, existing);
      }
    }
    
    // Convert to array and sort by average score
    const weeklyEntries = Array.from(weeklyScores.entries()).map(([userId, data]) => ({
      userId,
      averageScore: data.totalScore / data.gamesPlayed,
      gamesPlayed: data.gamesPlayed,
    }));
    
    weeklyEntries.sort((a, b) => b.averageScore - a.averageScore);
    
    // Build leaderboard entries
    const leaderboard: LeaderboardEntry[] = [];
    
    for (let i = 0; i < Math.min(limit, weeklyEntries.length); i++) {
      const entry = weeklyEntries[i];
      if (entry) {
        // Check if user allows leaderboard participation
        const privacySettings = await AuthService.getUserPrivacySettings(entry.userId);
        if (!privacySettings.allowLeaderboard) {
          continue;
        }

        const username = await this.getUsernameById(entry.userId);
        
        leaderboard.push({
          userId: entry.userId,
          username,
          score: Math.round(entry.averageScore),
          rank: i + 1,
          gamesPlayed: entry.gamesPlayed,
          averageScore: entry.averageScore,
        });
      }
    }
    
    return leaderboard;
  }

  // Get all-time leaderboard based on user stats
  private static async getAllTimeLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    // Note: This is a simplified implementation
    // In a real app, you'd want to maintain a separate all-time leaderboard
    // or use a more efficient method to aggregate user stats
    
    // For now, we'll return the daily leaderboard as a placeholder
    // TODO: Implement proper all-time leaderboard aggregation
    return await this.getDailyLeaderboard(limit);
  }

  // Get user's current ranking and stats
  static async getUserRanking(
    userId: string,
    period: 'daily' | 'weekly' | 'alltime' = 'daily'
  ): Promise<{ rank: number; score: number; totalPlayers: number } | null> {
    try {
      switch (period) {
        case 'daily': {
          const today = RedisUtils.getTodayString();
          return await LeaderboardData.getUserRank(today, userId);
        }
        case 'weekly':
          // TODO: Implement weekly ranking calculation
          return null;
        case 'alltime':
          // TODO: Implement all-time ranking calculation
          return null;
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error getting user ranking for ${period}:`, error);
      return null;
    }
  }

  // Get user statistics
  static async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      return await UserStatsData.get(userId);
    } catch (error) {
      console.error(`Error getting user stats for ${userId}:`, error);
      return null;
    }
  }

  // Helper function to get username by user ID (respects privacy settings)
  private static async getUsernameById(userId: string): Promise<string> {
    try {
      return await AuthService.getDisplayName(userId);
    } catch (error) {
      console.error(`Error getting username for ${userId}:`, error);
      return 'Anonymous Player';
    }
  }

  // Get leaderboard summary for display
  static async getLeaderboardSummary(): Promise<{
    dailyLeader: LeaderboardEntry | null;
    totalPlayersToday: number;
    averageScoreToday: number;
  }> {
    try {
      const dailyLeaderboard = await this.getDailyLeaderboard(1);
      const today = RedisUtils.getTodayString();
      const allScores = await LeaderboardData.getTopScores(today, 100);
      
      const totalPlayersToday = allScores.length;
      const averageScoreToday = totalPlayersToday > 0 
        ? allScores.reduce((sum, entry) => sum + entry.score, 0) / totalPlayersToday 
        : 0;

      return {
        dailyLeader: dailyLeaderboard[0] || null,
        totalPlayersToday,
        averageScoreToday: Math.round(averageScoreToday),
      };
    } catch (error) {
      console.error('Error getting leaderboard summary:', error);
      return {
        dailyLeader: null,
        totalPlayersToday: 0,
        averageScoreToday: 0,
      };
    }
  }
}
