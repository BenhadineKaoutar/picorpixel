import React, { useState, useEffect, useRef } from 'react';
import { ImageLoadResult } from '../services/imagePreloader';
import { useImageErrorHandling } from '../hooks/useImageErrorHandling';
import { ImageErrorHandler, ImageLoadingIndicator } from './ImageErrorHandler';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loadResult?: ImageLoadResult | null;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onRetry?: () => void;
  onSkip?: () => void;
  showControls?: boolean;
  placeholder?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  style,
  loadResult,
  onLoad,
  onError,
  onRetry,
  onSkip,
  showControls = true,
  placeholder,
  errorFallback
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>();
  
  // Enhanced error handling (temporarily disabled due to type issues)
  // const errorHandling = useImageErrorHandling(src, {
  //   maxRetries: 3,
  //   autoRetry: true
  // });
  const errorHandling = { loadingState: null };

  // Reset state when src changes
  useEffect(() => {
    setImageState('loading');
    setRetryCount(0);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [src]);

  // Handle load result from preloader
  useEffect(() => {
    if (loadResult) {
      if (loadResult.success) {
        setImageState('loaded');
        onLoad?.();
      } else {
        setImageState('error');
        onError?.(loadResult.error?.message || 'Failed to load image');
      }
    }
  }, [loadResult, onLoad, onError]);

  // Fallback timeout for images not handled by preloader
  useEffect(() => {
    if (!loadResult && imageState === 'loading') {
      timeoutRef.current = setTimeout(() => {
        setImageState('error');
        onError?.('Image loading timeout');
      }, 5000) as NodeJS.Timeout;

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [loadResult, imageState, onError]);

  const handleImageLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setImageState('loaded');
    onLoad?.();
  };

  const handleImageError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setImageState('error');
    onError?.('Failed to load image');
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setImageState('loading');
    onRetry?.();
  };

  const handleSkip = () => {
    onSkip?.();
  };

  // Render loading state with enhanced loading indicator
  if (imageState === 'loading') {
    return (
      <div className={`relative ${className}`} style={style}>
        {placeholder || (
          errorHandling.loadingState && errorHandling.loadingState.status === 'loading' ? (
            <ImageLoadingIndicator
              loadingState={errorHandling.loadingState}
              onSkip={handleSkip}
              onRetry={handleRetry}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading image...</p>
                {loadResult?.loadTime && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(loadResult.loadTime)}ms
                  </p>
                )}
              </div>
            </div>
          )
        )}
        
        {/* Hidden image for actual loading */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="hidden"
        />
      </div>
    );
  }

  // Render error state with enhanced error handling
  if (imageState === 'error') {
    return (
      <div className={`relative ${className}`} style={style}>
        {errorFallback || (
          loadResult?.error ? (
            <ImageErrorHandler
              url={src}
              error={loadResult.error}
              {...(errorHandling.loadingState && { loadingState: errorHandling.loadingState })}
              onRetry={handleRetry}
              onSkip={handleSkip}
              compact={!showControls}
              showDetails={process.env.NODE_ENV === 'development'}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center p-4">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="text-sm text-gray-600 mb-3">Failed to load image</p>
                
                {showControls && (
                  <div className="flex space-x-2 justify-center">
                    {retryCount < 3 && (
                      <button
                        onClick={handleRetry}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Retry {retryCount > 0 && `(${retryCount + 1})`}
                      </button>
                    )}
                    
                    <button
                      onClick={handleSkip}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Skip Image
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  // Render loaded image
  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      style={style}
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  );
};
