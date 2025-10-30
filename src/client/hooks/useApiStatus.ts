import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { gameApi } from '../services/gameApi';

export interface ApiStatus {
  isOnline: boolean;
  isConnected: boolean;
  lastChecked: Date | null;
  error: string | null;
}

/**
 * Hook for monitoring API connectivity and online status
 */
export function useApiStatus() {
  const [status, setStatus] = useState<ApiStatus>({
    isOnline: apiClient.online,
    isConnected: false,
    lastChecked: null,
    error: null,
  });

  /**
   * Check API connectivity
   */
  const checkConnectivity = useCallback(async () => {
    try {
      const isConnected = await gameApi.checkHealth();
      setStatus(prev => ({
        ...prev,
        isConnected,
        lastChecked: new Date(),
        error: isConnected ? null : 'API is not responding',
      }));
      return isConnected;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        lastChecked: new Date(),
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  /**
   * Handle online status change
   */
  const handleOnline = useCallback(() => {
    setStatus(prev => ({ ...prev, isOnline: true, error: null }));
    // Check connectivity when coming back online
    checkConnectivity();
  }, [checkConnectivity]);

  /**
   * Handle offline status change
   */
  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      isConnected: false,
      error: 'No internet connection',
    }));
  }, []);

  useEffect(() => {
    // Set up online/offline listeners
    const unsubscribeOnline = apiClient.onOnline(handleOnline);
    const unsubscribeOffline = apiClient.onOffline(handleOffline);

    // Initial connectivity check
    checkConnectivity();

    // Periodic connectivity check (every 30 seconds)
    const intervalId = setInterval(checkConnectivity, 30000);

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      clearInterval(intervalId);
    };
  }, [handleOnline, handleOffline, checkConnectivity]);

  return {
    ...status,
    checkConnectivity,
    refresh: checkConnectivity,
  };
}
