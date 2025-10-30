// Redis data access layer for PicOrPixel game
import { redis } from '@devvit/web/server';
import { 
  DailyChallenge, 
  GameSession, 
  UserStats,
  Achievement,
  ImageGuess
} from '../../shared/types/game.js';

// Redis key patterns
const KEYS = {
  challenge: (date: string) => `challenge:${date}`,
  session: (userId: string, challengeId: string) => `session:${userId}:${challengeId}`,
  leaderboard: (date: string) => `leaderboard:daily:${date}`,
  userStats: (userId: string) => `user:stats:${userId}`,
  userSessions: (userId: string) => `user:sessions:${userId}`,
} as const;

// Daily Challenge operations
export class DailyChallengeData {
  static async get(date: string): Promise<DailyChallenge | null> {
    try {
      const key = KEYS.challenge(date);
      const data = await redis.hGetAll(key);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        id: data.id || '',
        date: data.date || '',
        images: JSON.parse(data.images || '[]'),
        totalImages: parseInt(data.totalImages || '0'),
      };
    } catch (error) {
      console.error(`Error getting daily challenge for ${date}:`, error);
      return null;
    }
  }

  static async set(challenge: DailyChallenge): Promise<boolean> {
    try {
      const key = KEYS.challenge(challenge.date);
      const data = {
        id: challenge.id,
        date: challenge.date,
        images: JSON.stringify(challenge.images),
        totalImages: challenge.totalImages.toString(),
        createdAt: new Date().toISOString(),
      };

      await redis.hSet(key, data);
      // Set TTL to 48 hours to handle timezone differences
      await redis.expire(key, 48 * 60 * 60);
      
      return true;
    } catch (error) {
      console.error(`Error setting daily challenge for ${challenge.date}:`, error);
      return false;
    }
  }

  static async exists(date: string): Promise<boolean> {
    try {
      const key = KEYS.challenge(date);
      const exists = await redis.exists(key);
      return exists > 0;
    } catch (error) {
      console.error(`Error checking if challenge exists for ${date}:`, error);
      return false;
    }
  }
}

// Game Session operations
export class GameSessionData {
  static async create(session: Omit<GameSession, 'guesses'>): Promise<boolean> {
    try {
      const key = KEYS.session(session.userId, session.challengeId);
      const data = {
        id: session.id,
        userId: session.userId,
        username: session.username,
        challengeId: session.challengeId,
        startTime: session.startTime.toISOString(),
        guesses: JSON.stringify([]),
        completed: session.completed.toString(),
        score: session.score?.toString() || '',
      };

      await redis.hSet(key, data);
      // Set TTL to 7 days
      await redis.expire(key, 7 * 24 * 60 * 60);
      
      return true;
    } catch (error) {
      console.error(`Error creating session ${session.id}:`, error);
      return false;
    }
  }

  static async get(userId: string, challengeId: string): Promise<GameSession | null> {
    try {
      const key = KEYS.session(userId, challengeId);
      const data = await redis.hGetAll(key);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      const session: GameSession = {
        id: data.id || '',
        userId: data.userId || '',
        username: data.username || 'anonymous',
        challengeId: data.challengeId || '',
        startTime: new Date(data.startTime || Date.now()),
        guesses: JSON.parse(data.guesses || '[]'),
        completed: data.completed === 'true',
      };
      
      if (data.score) {
        session.score = parseInt(data.score);
      }
      
      return session;
    } catch (error) {
      console.error(`Error getting session for user ${userId}, challenge ${challengeId}:`, error);
      return null;
    }
  }

  static async addGuess(userId: string, challengeId: string, guess: ImageGuess): Promise<boolean> {
    try {
      const session = await this.get(userId, challengeId);
      if (!session) {
        return false;
      }

      session.guesses.push(guess);
      
      const key = KEYS.session(userId, challengeId);
      await redis.hSet(key, {
        guesses: JSON.stringify(session.guesses),
      });
      
      return true;
    } catch (error) {
      console.error(`Error adding guess for user ${userId}, challenge ${challengeId}:`, error);
      return false;
    }
  }

  static async complete(userId: string, challengeId: string, score: number): Promise<boolean> {
    try {
      const key = KEYS.session(userId, challengeId);
      await redis.hSet(key, {
        completed: 'true',
        score: score.toString(),
      });
      
      return true;
    } catch (error) {
      console.error(`Error completing session for user ${userId}, challenge ${challengeId}:`, error);
      return false;
    }
  }
}

// Leaderboard operations
export class LeaderboardData {
  static async addScore(date: string, userId: string, score: number, username?: string): Promise<boolean> {
    try {
      const key = KEYS.leaderboard(date);
      await redis.zAdd(key, { member: userId, score });
      
      // Store username mapping for leaderboard display
      if (username) {
        const usernameKey = `leaderboard:usernames:${date}`;
        await redis.hSet(usernameKey, { [userId]: username });
        await redis.expire(usernameKey, 30 * 24 * 60 * 60);
      }
      
      // Set TTL to 30 days
      await redis.expire(key, 30 * 24 * 60 * 60);
      
      return true;
    } catch (error) {
      console.error(`Error adding score to leaderboard for ${date}:`, error);
      return false;
    }
  }

  // Get username for a user on a specific date
  static async getUsername(date: string, userId: string): Promise<string | null> {
    try {
      const usernameKey = `leaderboard:usernames:${date}`;
      const username = await redis.hGet(usernameKey, userId);
      return username || null;
    } catch (error) {
      console.error(`Error getting username for ${userId} on ${date}:`, error);
      return null;
    }
  }

  static async getTopScores(date: string, limit: number = 10): Promise<Array<{ userId: string; score: number; rank: number }>> {
    try {
      const key = KEYS.leaderboard(date);
      // Use zRange with reverse order to get highest scores first
      const results = await redis.zRange(key, 0, limit - 1, { by: 'rank', reverse: true });
      
      return results.map((result, index) => ({
        userId: result.member,
        score: result.score,
        rank: index + 1,
      }));
    } catch (error) {
      console.error(`Error getting top scores for ${date}:`, error);
      return [];
    }
  }

  static async getUserRank(date: string, userId: string): Promise<{ rank: number; score: number; totalPlayers: number } | null> {
    try {
      const key = KEYS.leaderboard(date);
      const [rank, score, totalPlayers] = await Promise.all([
        redis.zRank(key, userId),
        redis.zScore(key, userId),
        redis.zCard(key),
      ]);

      if (rank === null || score === null) {
        return null;
      }

      // For leaderboard, we want reverse rank (highest score = rank 1)
      // So we calculate: totalPlayers - rank
      return {
        rank: (rank !== null && rank !== undefined) ? totalPlayers - rank : totalPlayers,
        score: score || 0,
        totalPlayers,
      };
    } catch (error) {
      console.error(`Error getting user rank for ${userId} on ${date}:`, error);
      return null;
    }
  }
}

// User Statistics operations
export class UserStatsData {
  static async get(userId: string): Promise<UserStats | null> {
    try {
      const key = KEYS.userStats(userId);
      const data = await redis.hGetAll(key);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        userId: data.userId || '',
        totalGamesPlayed: parseInt(data.totalGamesPlayed || '0'),
        averageScore: parseFloat(data.averageScore || '0'),
        bestScore: parseInt(data.bestScore || '0'),
        currentStreak: parseInt(data.currentStreak || '0'),
        longestStreak: parseInt(data.longestStreak || '0'),
        achievements: JSON.parse(data.achievements || '[]'),
        scoreHistory: JSON.parse(data.scoreHistory || '[]'),
      };
    } catch (error) {
      console.error(`Error getting user stats for ${userId}:`, error);
      return null;
    }
  }

  static async updateAfterGame(userId: string, score: number, challengeId: string, date: string): Promise<boolean> {
    try {
      const key = KEYS.userStats(userId);
      const currentStats = await this.get(userId);
      
      const newStats: UserStats = currentStats || {
        userId,
        totalGamesPlayed: 0,
        averageScore: 0,
        bestScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        achievements: [],
        scoreHistory: [],
      };

      // Update basic stats
      newStats.totalGamesPlayed += 1;
      newStats.bestScore = Math.max(newStats.bestScore, score);
      
      // Calculate new average
      const totalScore = (newStats.averageScore * (newStats.totalGamesPlayed - 1)) + score;
      newStats.averageScore = totalScore / newStats.totalGamesPlayed;

      // Update streak (assuming daily play)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const lastGameDate = newStats.scoreHistory.length > 0 
        ? newStats.scoreHistory[newStats.scoreHistory.length - 1]?.date 
        : null;

      if (lastGameDate === yesterdayStr) {
        newStats.currentStreak += 1;
      } else if (lastGameDate !== date) {
        newStats.currentStreak = 1;
      }
      
      newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);

      // Add to score history
      newStats.scoreHistory.push({
        date,
        score,
        challengeId,
      });

      // Keep only last 30 days of history
      if (newStats.scoreHistory.length > 30) {
        newStats.scoreHistory = newStats.scoreHistory.slice(-30);
      }

      // Save updated stats
      const data = {
        userId: newStats.userId,
        totalGamesPlayed: newStats.totalGamesPlayed.toString(),
        averageScore: newStats.averageScore.toString(),
        bestScore: newStats.bestScore.toString(),
        currentStreak: newStats.currentStreak.toString(),
        longestStreak: newStats.longestStreak.toString(),
        achievements: JSON.stringify(newStats.achievements),
        scoreHistory: JSON.stringify(newStats.scoreHistory),
      };

      await redis.hSet(key, data);
      
      return true;
    } catch (error) {
      console.error(`Error updating user stats for ${userId}:`, error);
      return false;
    }
  }

  static async addAchievement(userId: string, achievement: Achievement): Promise<boolean> {
    try {
      const stats = await this.get(userId);
      if (!stats) {
        return false;
      }

      // Check if achievement already exists
      const existingAchievement = stats.achievements.find(a => a.id === achievement.id);
      if (existingAchievement) {
        return true; // Already has this achievement
      }

      stats.achievements.push(achievement);
      
      const key = KEYS.userStats(userId);
      await redis.hSet(key, {
        achievements: JSON.stringify(stats.achievements),
      });
      
      return true;
    } catch (error) {
      console.error(`Error adding achievement for user ${userId}:`, error);
      return false;
    }
  }
}

// Utility functions for Redis operations
export class RedisUtils {
  static async healthCheck(): Promise<boolean> {
    try {
      // Use a simple set/get operation instead of ping
      await redis.set('health-check', 'ok');
      const result = await redis.get('health-check');
      return result === 'ok';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  static async clearUserData(userId: string): Promise<boolean> {
    try {
      const userStatsKey = KEYS.userStats(userId);
      
      // Delete user stats
      await redis.del(userStatsKey);
      
      // Note: Redis pattern deletion would require scanning keys
      // For now, we'll just delete the stats key
      // In production, you might want to implement a more comprehensive cleanup
      
      return true;
    } catch (error) {
      console.error(`Error clearing user data for ${userId}:`, error);
      return false;
    }
  }

  static getTodayString(): string {
    return new Date().toISOString().split('T')[0] || '';
  }

  static getYesterdayString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0] || '';
  }
}
