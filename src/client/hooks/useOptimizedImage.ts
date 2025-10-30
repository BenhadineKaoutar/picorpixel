import { useState, useEffect, useRef, useCallback } from 'react';
import { ImageOptimizer, lazyImageObserver, ImageLoadOptions } from '../utils/imageOptimization';

export interface OptimizedImageState {
  src: string | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  placeholder: string;
}

export interface UseOptimizedImageOptions extends ImageLoadOptions {
  preload?: boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for optimized image loading with lazy loading, placeholders, and error handling
 */
export function useOptimizedImage(
  originalSrc: string | null,
  options: UseOptimizedImageOptions = {}
) {
  const {
    lazy = true,
    placeholder,
    quality = 85,
    format = 'auto',
    preload = false,
    fallbackSrc,
    onLoad,
    onError,
  } = options;

  const [state, setState] = useState<OptimizedImageState>({
    src: null,
    loading: false,
    error: null,
    loaded: false,
    placeholder: placeholder || ImageOptimizer.createBlurPlaceholder(),
  });

  const elementRef = useRef<HTMLElement | null>(null);
  const loadAttempts = useRef(0);
  const maxRetries = 3;

  /**
   * Load the image
   */
  const loadImage = useCallback(async () => {
    if (!originalSrc) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get optimal format if auto
      const optimalFormat = format === 'auto' 
        ? await ImageOptimizer.getOptimalFormat() 
        : format;

      const optimizedUrl = ImageOptimizer.getOptimizedUrl(originalSrc, {
        quality,
        format: optimalFormat,
      });

      // Preload the image
      await ImageOptimizer.preloadImage(optimizedUrl);

      setState(prev => ({
        ...prev,
        src: optimizedUrl,
        loading: false,
        loaded: true,
      }));

      onLoad?.();
    } catch (error) {
      loadAttempts.current += 1;
      const errorMessage = error instanceof Error ? error.message : 'Failed to load image';

      // Try fallback or retry
      if (loadAttempts.current < maxRetries && fallbackSrc) {
        try {
          await ImageOptimizer.preloadImage(fallbackSrc);
          setState(prev => ({
            ...prev,
            src: fallbackSrc,
            loading: false,
            loaded: true,
          }));
          onLoad?.();
          return;
        } catch (fallbackError) {
          // Continue to error handling
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      onError?.(errorMessage);
    }
  }, [originalSrc, quality, format, fallbackSrc, onLoad, onError]);

  /**
   * Set the element reference for lazy loading
   */
  const setRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;

    if (element && lazy && originalSrc) {
      // Use intersection observer for lazy loading
      lazyImageObserver.observe(element, loadImage);
    }
  }, [lazy, originalSrc, loadImage]);

  /**
   * Force load the image (bypass lazy loading)
   */
  const forceLoad = useCallback(() => {
    loadImage();
  }, [loadImage]);

  /**
   * Retry loading the image
   */
  const retry = useCallback(() => {
    loadAttempts.current = 0;
    setState(prev => ({ ...prev, error: null }));
    loadImage();
  }, [loadImage]);

  // Effect for non-lazy loading or preloading
  useEffect(() => {
    if (!originalSrc) {
      setState(prev => ({ ...prev, src: null, loaded: false, error: null }));
      return;
    }

    if (!lazy || preload) {
      loadImage();
    }
  }, [originalSrc, lazy, preload, loadImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        lazyImageObserver.unobserve(elementRef.current);
      }
    };
  }, []);

  return {
    ...state,
    setRef,
    forceLoad,
    retry,
  };
}

/**
 * Hook for preloading multiple images
 */
export function useImagePreloader(urls: string[], options: ImageLoadOptions = {}) {
  const [state, setState] = useState({
    loading: false,
    loaded: 0,
    total: urls.length,
    errors: [] as string[],
    completed: false,
  });

  const preload = useCallback(async () => {
    if (urls.length === 0) return;

    setState(prev => ({ ...prev, loading: true, errors: [], completed: false }));

    try {
      const results = await ImageOptimizer.preloadImages(urls, options);
      
      setState(prev => ({
        ...prev,
        loading: false,
        loaded: results.length,
        completed: true,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Preload failed';
      setState(prev => ({
        ...prev,
        loading: false,
        errors: [...prev.errors, errorMessage],
        completed: true,
      }));
    }
  }, [urls, options]);

  useEffect(() => {
    preload();
  }, [preload]);

  return {
    ...state,
    progress: state.total > 0 ? (state.loaded / state.total) * 100 : 0,
    preload,
  };
}
