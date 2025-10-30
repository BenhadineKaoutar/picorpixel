import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageLoadError, ImageLoadResult, imagePreloader } from '../services/imagePreloader';
import { errorRecoveryService, RecoveryState } from '../services/errorRecoveryService';
import { imageLoadingStateManager, LoadingState } from '../services/imageLoadingStateManager';
import { useNetworkStatus } from './useNetworkStatus';
// import { errorService } from '../services/errorService'; // Will be used for reporting
import { offlineService } from '../services/offlineService';

export interface ImageErrorHandlingOptions {
  maxRetries?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  autoRetry?: boolean;
  reportErrors?: boolean;
  showUserMessages?: boolean;
  onError?: (url: string, error: ImageLoadError) => void;
  onRecovery?: (url: string, result: ImageLoadResult) => void;
  onSkip?: (url: string, reason: string) => void;
}

export interface ImageErrorHandlingState {
  loadingState: LoadingState | null;
  recoveryState: RecoveryState | null;
  canRetry: boolean;
  canSkip: boolean;
  isRetrying: boolean;
  error: ImageLoadError | null;
  userMessage: string | null;
}

/**
 * Comprehensive hook for handling image loading errors with recovery
 */
export const useImageErrorHandling = (
  url: string | null,
  options: ImageErrorHandlingOptions = {}
) => {
  const {
    maxRetries = 3,
    baseRetryDelay = 1000,
    maxRetryDelay = 30000,
    autoRetry = true,
    reportErrors = true,
    showUserMessages = true,
    onError,
    onRecovery,
    onSkip
  } = options;

  const [state, setState] = useState<ImageErrorHandlingState>({
    loadingState: null,
    recoveryState: null,
    canRetry: false,
    canSkip: false,
    isRetrying: false,
    error: null,
    userMessage: null
  });

  const networkStatus = useNetworkStatus();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const offlineRetryQueueRef = useRef<Set<string>>(new Set());

  // Update state when URL changes
  useEffect(() => {
    if (!url) {
      setState({
        loadingState: null,
        recoveryState: null,
        canRetry: false,
        canSkip: false,
        isRetrying: false,
        error: null,
        userMessage: null
      });
      return;
    }

    // Get existing states
    const loadingState = imageLoadingStateManager.getState(url);
    const recoveryState = errorRecoveryService.getRecoveryState(url);

    setState(prev => ({
      ...prev,
      loadingState,
      recoveryState,
      canRetry: recoveryState?.canRetry || false,
      canSkip: loadingState?.allowSkip || false,
      error: loadingState?.error || null,
      userMessage: loadingState?.userMessage || null
    }));
  }, [url]);

  // Listen for loading state changes
  useEffect(() => {
    if (!url) return;

    const unsubscribe = imageLoadingStateManager.addStateChangeListener((changedUrl, loadingState) => {
      if (changedUrl === url) {
        const recoveryState = errorRecoveryService.getRecoveryState(url);
        
        setState(prev => ({
          ...prev,
          loadingState,
          recoveryState,
          canRetry: recoveryState?.canRetry || loadingState.allowRetry,
          canSkip: loadingState.allowSkip,
          error: loadingState.error || null,
          userMessage: loadingState.userMessage || null
        }));
      }
    });

    return unsubscribe;
  }, [url]);

  // Handle offline retry queue
  useEffect(() => {
    if (networkStatus.isOnline && offlineRetryQueueRef.current.size > 0) {
      const urlsToRetry = Array.from(offlineRetryQueueRef.current);
      offlineRetryQueueRef.current.clear();
      
      urlsToRetry.forEach(retryUrl => {
        if (retryUrl === url) {
          setTimeout(() => retryImage(), 1000); // Small delay to ensure connection is stable
        }
      });
    }
  }, [networkStatus.isOnline, url]);

  /**
   * Start loading an image with error handling
   */
  const startLoading = useCallback(async (): Promise<ImageLoadResult> => {
    if (!url) {
      throw new Error('No URL provided');
    }

    // Start loading state
    imageLoadingStateManager.startLoading(url);

    try {
      const result = await imagePreloader.loadSingleImage(url, {
        timeout: 5000,
        validateDimensions: true,
        offlineMode: !networkStatus.isOnline,
        ...(networkStatus.isSlowConnection && { slowConnectionTimeout: 15000 })
      });

      if (result.success) {
        // Mark as loaded
        imageLoadingStateManager.markLoaded(url, result);
        onRecovery?.(url, result);
        return result;
      } else {
        // Handle error
        await handleImageError(url, result.error!);
        throw new Error(result.error!.message);
      }
    } catch (error) {
      const imageError: ImageLoadError = {
        type: 'network',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      };
      
      await handleImageError(url, imageError);
      throw error;
    }
  }, [url, networkStatus.isOnline, networkStatus.isSlowConnection, onRecovery]);

  /**
   * Handle image loading error
   */
  const handleImageError = useCallback(async (imageUrl: string, error: ImageLoadError): Promise<void> => {
    // Mark error in loading state manager
    imageLoadingStateManager.markError(imageUrl, error);

    // Handle error recovery
    const recoveryState = errorRecoveryService.handleImageError(imageUrl, error, {
      retryStrategy: {
        maxRetries,
        baseDelay: baseRetryDelay,
        maxDelay: maxRetryDelay
      },
      reportErrors,
      showUserMessages
    });

    // Call error callback
    onError?.(imageUrl, error);

    // Handle offline errors
    if (error.type === 'offline') {
      offlineRetryQueueRef.current.add(imageUrl);
      
      // Queue for offline processing
      offlineService.queueOfflineAction('api_call', {
        url: imageUrl,
        method: 'GET',
        type: 'image_load'
      });
    }

    // Schedule auto-retry if enabled and possible
    if (autoRetry && recoveryState.canRetry && recoveryState.nextRetryAt) {
      const delay = recoveryState.nextRetryAt.getTime() - Date.now();
      
      retryTimeoutRef.current = setTimeout(async () => {
        try {
          setState(prev => ({ ...prev, isRetrying: true }));
          await retryImage();
        } catch (retryError) {
          console.error('Auto-retry failed:', retryError);
        } finally {
          setState(prev => ({ ...prev, isRetrying: false }));
        }
      }, Math.max(0, delay));
    }
  }, [maxRetries, baseRetryDelay, maxRetryDelay, autoRetry, reportErrors, showUserMessages, onError]);

  /**
   * Manually retry loading the image
   */
  const retryImage = useCallback(async (): Promise<ImageLoadResult | null> => {
    if (!url) return null;

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    try {
      setState(prev => ({ ...prev, isRetrying: true }));
      
      // Use manual retry from error recovery service
      await errorRecoveryService.manualRetry(url, async () => {
        await startLoading();
      });

      const result = await startLoading();
      return result;
    } catch (error) {
      console.error('Manual retry failed:', error);
      return null;
    } finally {
      setState(prev => ({ ...prev, isRetrying: false }));
    }
  }, [url, startLoading]);

  /**
   * Skip the current image
   */
  const skipImage = useCallback((reason: string = 'user_request'): void => {
    if (!url) return;

    // Clear any retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Mark as skipped in services
    imageLoadingStateManager.markSkipped(url, reason);
    errorRecoveryService.skipImage(url, reason as any);

    // Call skip callback
    onSkip?.(url, reason);
  }, [url, onSkip]);

  /**
   * Clear error state for the image
   */
  const clearError = useCallback((): void => {
    if (!url) return;

    imageLoadingStateManager.clearImageState(url);
    errorRecoveryService.clearRecoveryState(url);
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [url]);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((): string | null => {
    if (!state.error || !state.recoveryState) return null;
    
    return errorRecoveryService.getUserErrorMessage(state.error, state.recoveryState.attempts);
  }, [state.error, state.recoveryState]);

  /**
   * Get available recovery actions
   */
  const getRecoveryActions = useCallback(() => {
    if (!state.error || !state.recoveryState) return [];
    
    return errorRecoveryService.getRecoveryActions(state.error, state.recoveryState);
  }, [state.error, state.recoveryState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startLoading,
    retryImage,
    skipImage,
    clearError,
    getErrorMessage,
    getRecoveryActions,
    networkStatus
  };
};

/**
 * Hook for handling multiple images with error recovery
 */
export const useMultiImageErrorHandling = (
  urls: string[],
  options: ImageErrorHandlingOptions = {}
) => {
  const [states, setStates] = useState<Map<string, ImageErrorHandlingState>>(new Map());
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    loading: 0,
    loaded: 0,
    error: 0,
    skipped: 0
  });

  // Listen for global state changes
  useEffect(() => {
    const unsubscribe = imageLoadingStateManager.addGlobalStateListener((loadingStates) => {
      const newStates = new Map<string, ImageErrorHandlingState>();
      
      urls.forEach(url => {
        const loadingState = loadingStates.get(url);
        const recoveryState = errorRecoveryService.getRecoveryState(url);
        
        newStates.set(url, {
          loadingState: loadingState || null,
          recoveryState: recoveryState || null,
          canRetry: recoveryState?.canRetry || loadingState?.allowRetry || false,
          canSkip: loadingState?.allowSkip || false,
          isRetrying: false,
          error: loadingState?.error || null,
          userMessage: loadingState?.userMessage || null
        });
      });
      
      setStates(newStates);
      
      // Update global stats
      const stats = imageLoadingStateManager.getLoadingStats();
      setGlobalStats(stats);
    });

    return unsubscribe;
  }, [urls]);

  /**
   * Get error handling for specific URL
   */
  const getImageErrorHandling = useCallback((url: string) => {
    return useImageErrorHandling(url, options);
  }, [options]);

  /**
   * Retry all failed images
   */
  const retryAllFailed = useCallback(async (): Promise<void> => {
    const failedUrls = Array.from(states.entries())
      .filter(([_, state]) => state.error && state.canRetry)
      .map(([url, _]) => url);

    await Promise.allSettled(
      failedUrls.map(url => {
        const handler = getImageErrorHandling(url);
        return handler.retryImage();
      })
    );
  }, [states, getImageErrorHandling]);

  /**
   * Skip all failed images
   */
  const skipAllFailed = useCallback((): void => {
    const failedUrls = Array.from(states.entries())
      .filter(([_, state]) => state.error)
      .map(([url, _]) => url);

    failedUrls.forEach(url => {
      const handler = getImageErrorHandling(url);
      handler.skipImage('bulk_skip');
    });
  }, [states, getImageErrorHandling]);

  return {
    states,
    globalStats,
    getImageErrorHandling,
    retryAllFailed,
    skipAllFailed
  };
};