import { apiClient, ApiError } from './apiClient';
import {
  DailyChallengeResponse,
  SubmitGuessRequest,
  SubmitGuessResponse,
  CompleteGameRequest,
  CompleteGameResponse,
  LeaderboardRequest,
  LeaderboardResponse,
  UserStatsResponse,
} from '../../shared/types/api';

/**
 * Game API service for PicOrPixel
 * Provides typed methods for all game-related API calls
 */
class GameApiService {
  /**
   * Get the current daily challenge
   */
  public async getDailyChallenge(): Promise<DailyChallengeResponse> {
    try {
      return await apiClient.get<DailyChallengeResponse>('/daily-challenge');
    } catch (error) {
      if (error instanceof ApiError) {
        // Add context for daily challenge errors
        throw new ApiError(
          `Failed to load daily challenge: ${error.message}`,
          error.status,
          error.response
        );
      }
      throw error;
    }
  }

  /**
   * Submit a guess for an image
   */
  public async submitGuess(request: SubmitGuessRequest): Promise<SubmitGuessResponse> {
    try {
      return await apiClient.post<SubmitGuessResponse>('/submit-guess', request);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `Failed to submit guess: ${error.message}`,
          error.status,
          error.response
        );
      }
      throw error;
    }
  }

  /**
   * Complete the current game session
   */
  public async completeGame(request: CompleteGameRequest): Promise<CompleteGameResponse> {
    try {
      return await apiClient.post<CompleteGameResponse>('/complete-game', request);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `Failed to complete game: ${error.message}`,
          error.status,
          error.response
        );
      }
      throw error;
    }
  }

  /**
   * Get leaderboard data
   */
  public async getLeaderboard(request: LeaderboardRequest = {}): Promise<LeaderboardResponse> {
    try {
      const params = new URLSearchParams();
      
      if (request.period) {
        params.append('period', request.period);
      }
      
      if (request.limit) {
        params.append('limit', request.limit.toString());
      }

      const url = `/leaderboard${params.toString() ? `?${params.toString()}` : ''}`;
      return await apiClient.get<LeaderboardResponse>(url);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `Failed to load leaderboard: ${error.message}`,
          error.status,
          error.response
        );
      }
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStats(): Promise<UserStatsResponse> {
    try {
      return await apiClient.get<UserStatsResponse>('/user-stats');
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `Failed to load user stats: ${error.message}`,
          error.status,
          error.response
        );
      }
      throw error;
    }
  }

  /**
   * Get daily statistics including average performance
   */
  public async getDailyStats(): Promise<{ averageScore: number; totalPlayers: number; gamesPlayed: number }> {
    try {
      return await apiClient.get<{ averageScore: number; totalPlayers: number; gamesPlayed: number }>('/daily-stats');
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(
          `Failed to load daily stats: ${error.message}`,
          error.status,
          error.response
        );
      }
      throw error;
    }
  }

  /**
   * Check API health/connectivity
   */
  public async checkHealth(): Promise<boolean> {
    try {
      // Try to get user stats as a lightweight health check
      await this.getUserStats();
      return true;
    } catch (error) {
      console.warn('API health check failed:', error);
      return false;
    }
  }
}

// Create and export default instance
export const gameApi = new GameApiService();

// Export class for custom instances
export { GameApiService };
