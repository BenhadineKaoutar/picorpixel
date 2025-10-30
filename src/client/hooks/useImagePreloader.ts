import { useState, useEffect, useCallback, useRef } from 'react';
import { imagePreloader, ImageLoadResult, PreloadOptions } from '../services/imagePreloader';
import { useNetworkStatus } from './useNetworkStatus';

export interface UseImagePreloaderOptions extends PreloadOptions {
  preloadCount?: number; // Number of images to preload ahead (default: 3)
  autoRetry?: boolean; // Auto retry failed images (default: true)
  maxRetries?: number; // Maximum retry attempts (default: 3)
}

export interface ImagePreloaderState {
  loading: boolean;
  progress: number;
  loadedCount: number;
  totalCount: number;
  results: ImageLoadResult[];
  errors: ImageLoadResult[];
  currentImageLoaded: boolean;
  canSkipCurrent: boolean;
}

export const useImagePreloader = (
  imageUrls: string[],
  currentIndex: number = 0,
  options: UseImagePreloaderOptions = {}
) => {
  const {
    preloadCount = 3,
    autoRetry = true,
    maxRetries = 3,
    timeout = 5000,
    onProgress,
    onImageLoad,
    ...preloadOptions
  } = options;

  const networkStatus = useNetworkStatus();

  const [state, setState] = useState<ImagePreloaderState>({
    loading: false,
    progress: 0,
    loadedCount: 0,
    totalCount: imageUrls.length,
    results: [],
    errors: [],
    currentImageLoaded: false,
    canSkipCurrent: false
  });

  const [offlineRetryQueue, setOfflineRetryQueue] = useState<Set<string>>(new Set());

  const retryCountRef = useRef<Map<string, number>>(new Map());
  const skipRequestedRef = useRef<Set<string>>(new Set());

  // Reset state when image URLs change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      totalCount: imageUrls.length,
      results: [],
      errors: [],
      loadedCount: 0,
      progress: 0
    }));
    retryCountRef.current.clear();
    skipRequestedRef.current.clear();
  }, [imageUrls]);

  // Preload images starting from current index
  const preloadImages = useCallback(async (startIndex: number = currentIndex) => {
    if (imageUrls.length === 0) return;

    setState(prev => ({ ...prev, loading: true }));

    // Determine which images to preload
    const imagesToPreload = imageUrls.slice(startIndex, startIndex + preloadCount);
    
    try {
      // Adjust timeout for slow connections
      const effectiveTimeout = networkStatus.isSlowConnection ? timeout * 2 : timeout;
      const slowConnectionTimeout = networkStatus.isSlowConnection ? timeout * 3 : undefined;

      await imagePreloader.preloadImages(imagesToPreload, {
        ...preloadOptions,
        timeout: effectiveTimeout,
        offlineMode: !networkStatus.isOnline,
        slowConnectionTimeout,
        onProgress: (loaded, total) => {
          const overallProgress = ((startIndex + loaded) / imageUrls.length) * 100;
          setState(prev => ({
            ...prev,
            progress: overallProgress,
            loadedCount: startIndex + loaded
          }));
          onProgress?.(loaded, total);
        },
        onImageLoad: (result) => {
          setState(prev => {
            const newResults = [...prev.results];
            const newErrors = [...prev.errors];
            
            if (result.success) {
              newResults.push(result);
            } else {
              newErrors.push(result);
              
              // Auto retry if enabled and not exceeded max retries
              if (autoRetry && result.error?.retryable) {
                const retryCount = retryCountRef.current.get(result.url) || 0;
                if (retryCount < maxRetries && !skipRequestedRef.current.has(result.url)) {
                  retryCountRef.current.set(result.url, retryCount + 1);
                  
                  // Handle offline errors differently
                  if (result.error.type === 'offline') {
                    setOfflineRetryQueue(prev => new Set(prev).add(result.url));
                  } else {
                    // Schedule retry with exponential backoff or suggested delay
                    const retryDelay = result.error.retryAfter || Math.pow(2, retryCount) * 1000;
                    setTimeout(() => {
                      retryImage(result.url);
                    }, retryDelay);
                  }
                }
              }
            }

            return {
              ...prev,
              results: newResults,
              errors: newErrors
            };
          });
          onImageLoad?.(result);
        }
      });

      setState(prev => ({ ...prev, loading: false }));
      
    } catch (error) {
      console.error('Failed to preload images:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [imageUrls, preloadCount, timeout, autoRetry, maxRetries, onProgress, onImageLoad, preloadOptions]);

  // Retry a specific image
  const retryImage = useCallback(async (url: string) => {
    try {
      const result = await imagePreloader.loadSingleImage(url, { timeout });
      
      setState(prev => {
        const newResults = prev.results.filter(r => r.url !== url);
        const newErrors = prev.errors.filter(r => r.url !== url);
        
        if (result.success) {
          newResults.push(result);
        } else {
          newErrors.push(result);
        }

        return {
          ...prev,
          results: newResults,
          errors: newErrors
        };
      });
    } catch (error) {
      console.error(`Failed to retry image ${url}:`, error);
    }
  }, [timeout]);

  // Skip current image
  const skipCurrentImage = useCallback(() => {
    const currentUrl = imageUrls[currentIndex];
    if (currentUrl) {
      skipRequestedRef.current.add(currentUrl);
      setState(prev => ({
        ...prev,
        canSkipCurrent: false,
        currentImageLoaded: true // Treat as loaded so game can continue
      }));
    }
  }, [imageUrls, currentIndex]);

  // Check if current image is loaded
  useEffect(() => {
    const currentUrl = imageUrls[currentIndex];
    if (!currentUrl) {
      setState(prev => ({ ...prev, currentImageLoaded: false, canSkipCurrent: false }));
      return;
    }

    const isLoaded = state.results.some(r => r.url === currentUrl && r.success);
    const hasError = state.errors.some(r => r.url === currentUrl);
    const isSkipped = skipRequestedRef.current.has(currentUrl);

    setState(prev => ({
      ...prev,
      currentImageLoaded: isLoaded || isSkipped,
      canSkipCurrent: hasError && !isSkipped
    }));
  }, [imageUrls, currentIndex, state.results, state.errors]);

  // Auto-preload when current index changes
  useEffect(() => {
    if (imageUrls.length > 0) {
      preloadImages(currentIndex);
    }
  }, [currentIndex, preloadImages]);

  // Handle offline retry queue when coming back online
  useEffect(() => {
    if (networkStatus.isOnline && offlineRetryQueue.size > 0) {
      // Retry all queued images when back online
      const urlsToRetry = Array.from(offlineRetryQueue);
      setOfflineRetryQueue(new Set());
      
      urlsToRetry.forEach(url => {
        setTimeout(() => retryImage(url), 1000); // Small delay to ensure connection is stable
      });
    }
  }, [networkStatus.isOnline, offlineRetryQueue, retryImage]);

  // Get result for specific image
  const getImageResult = useCallback((url: string): ImageLoadResult | null => {
    return state.results.find(r => r.url === url) || 
           state.errors.find(r => r.url === url) || 
           null;
  }, [state.results, state.errors]);

  // Get current image result
  const getCurrentImageResult = useCallback((): ImageLoadResult | null => {
    const currentUrl = imageUrls[currentIndex];
    return currentUrl ? getImageResult(currentUrl) : null;
  }, [imageUrls, currentIndex, getImageResult]);

  return {
    ...state,
    preloadImages,
    retryImage,
    skipCurrentImage,
    getImageResult,
    getCurrentImageResult,
    clearCache: imagePreloader.clearCache,
    getStats: imagePreloader.getStats
  };
};
