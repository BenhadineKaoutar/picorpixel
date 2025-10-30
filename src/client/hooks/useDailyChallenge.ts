import { useState, useEffect, useCallback } from 'react';
import { gameApi, ApiError } from '../services';
import { DailyChallenge } from '../../shared/types/game';
import { getImageUrl } from '../assets/images';

export interface DailyChallengeState {
  challenge: DailyChallenge | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

/**
 * Hook for managing daily challenge data
 */
export function useDailyChallenge() {
  const [state, setState] = useState<DailyChallengeState>({
    challenge: null,
    loading: false,
    error: null,
    lastFetched: null,
  });

  /**
   * Fetch daily challenge from API
   */
  const fetchChallenge = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await gameApi.getDailyChallenge();
      
      // Transform image URLs to use imported assets
      const transformedChallenge = response.challenge ? {
        ...response.challenge,
        images: response.challenge.images.map(img => ({
          ...img,
          url: getImageUrl(img.url) || img.url
        }))
      } : null;
      
      setState(prev => ({
        ...prev,
        challenge: transformedChallenge,
        loading: false,
        lastFetched: new Date(),
      }));
      return transformedChallenge;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to load daily challenge';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  /**
   * Refresh challenge data
   */
  const refresh = useCallback(() => {
    return fetchChallenge();
  }, [fetchChallenge]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  return {
    ...state,
    fetchChallenge,
    refresh,
    clearError,
  };
}
