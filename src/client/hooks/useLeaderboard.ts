import { useState, useEffect, useCallback } from 'react';
import { gameApi, ApiError } from '../services';
import { LeaderboardEntry, UserStats } from '../../shared/types/game';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'alltime';

export interface LeaderboardState {
  leaderboard: LeaderboardEntry[];
  userStats: UserStats | null;
  period: LeaderboardPeriod;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  summary: {
    dailyLeader: LeaderboardEntry | null;
    totalPlayersToday: number;
    averageScoreToday: number;
  } | null;
}

/**
 * Hook for managing leaderboard and user stats data
 */
export function useLeaderboard(initialPeriod: LeaderboardPeriod = 'daily') {
  const [state, setState] = useState<LeaderboardState>({
    leaderboard: [],
    userStats: null,
    period: initialPeriod,
    loading: false,
    error: null,
    lastFetched: null,
    summary: null,
  });

  /**
   * Fetch leaderboard data for the specified period
   */
  const fetchLeaderboard = useCallback(async (period: LeaderboardPeriod) => {
    setState(prev => ({ ...prev, loading: true, error: null, period }));

    try {
      const response = await gameApi.getLeaderboard({ period, limit: 100 });
      
      setState(prev => ({
        ...prev,
        leaderboard: response.leaderboard,
        summary: response.summary,
        loading: false,
        lastFetched: new Date(),
      }));
      
      return response.leaderboard;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to load leaderboard';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  /**
   * Fetch user statistics
   */
  const fetchUserStats = useCallback(async () => {
    try {
      const response = await gameApi.getUserStats();
      
      setState(prev => ({
        ...prev,
        userStats: response.stats,
      }));
      
      return response.stats;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to load user stats';
      
      console.warn('Failed to fetch user stats:', errorMessage);
      // Don't set error state for user stats failures as they're not critical
      return null;
    }
  }, []);

  /**
   * Fetch both leaderboard and user stats
   */
  const fetchAll = useCallback(async (period?: LeaderboardPeriod) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const targetPeriod = period || initialPeriod;
      const [leaderboard, userStats] = await Promise.allSettled([
        fetchLeaderboard(targetPeriod),
        fetchUserStats(),
      ]);

      // Handle leaderboard result
      if (leaderboard.status === 'rejected') {
        throw leaderboard.reason;
      }

      // User stats failure is not critical, just log it
      if (userStats.status === 'rejected') {
        console.warn('Failed to fetch user stats:', userStats.reason);
      }

      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to load data';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [fetchLeaderboard, fetchUserStats, initialPeriod]);

  /**
   * Change leaderboard period
   */
  const changePeriod = useCallback((period: LeaderboardPeriod) => {
    fetchLeaderboard(period);
  }, [fetchLeaderboard]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(() => {
    return fetchAll();
  }, [fetchAll]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    ...state,
    fetchLeaderboard,
    fetchUserStats,
    fetchAll,
    changePeriod,
    refresh,
    clearError,
  };
}
