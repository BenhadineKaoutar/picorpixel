import React, { useState, useEffect, useRef } from 'react';
import { GameImage } from '../../shared/types/game';
import { OptimizedImage } from './OptimizedImage';
import { useImagePreloader } from '../hooks/useImagePreloader';

interface ImageDisplayProps {
  image: GameImage;
  imageIndex: number;
  totalImages: number;
  onImageLoaded: () => void;
  onImageError: (error: string) => void;
  onSkipImage: () => void;
  className?: string;
  showLoadingTimeout?: boolean;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  image,
  imageIndex,
  totalImages,
  onImageLoaded,
  onImageError,
  onSkipImage,
  className = '',
  showLoadingTimeout = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showSkipOption, setShowSkipOption] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use image preloader for current image
  const { getCurrentImageResult, retryImage } = useImagePreloader(
    [image.url],
    0,
    {
      timeout: 3000, // 3-second timeout as per requirements
      preloadCount: 1,
      autoRetry: false,
    }
  );

  // Handle image transitions with smooth fade effect
  useEffect(() => {
    setIsVisible(false);
    setImageLoaded(false);
    setImageError(null);
    setShowSkipOption(false);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Start fade-in transition after a brief delay
    const fadeTimer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    // Set up 3-second timeout for loading
    if (showLoadingTimeout) {
      timeoutRef.current = setTimeout(() => {
        if (!imageLoaded) {
          setShowSkipOption(true);
        }
      }, 3000);
    }

    return () => {
      clearTimeout(fadeTimer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [image.id, showLoadingTimeout]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(null);
    setShowSkipOption(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    onImageLoaded();
  };

  const handleImageError = (error: string) => {
    setImageError(error);
    setImageLoaded(false);
    setShowSkipOption(true);
    onImageError(error);
  };
  const handleRetry = () => {
    setImageError(null);
    setShowSkipOption(false);
    retryImage(image.url);
  };

  const handleSkip = () => {
    setShowSkipOption(false);
    onSkipImage();
  };

  const loadResult = getCurrentImageResult();

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-black ${className}`}
    >
      {/* Image container with smooth transitions */}
      <div 
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <OptimizedImage
          src={image.url}
          alt={`Challenge image ${imageIndex + 1} of ${totalImages}`}
          loadResult={loadResult}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onRetry={handleRetry}
          onSkip={handleSkip}
          showControls={showSkipOption}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Loading overlay */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading image...</p>
            <p className="text-sm text-gray-300 mt-2">
              Image {imageIndex + 1} of {totalImages}
            </p>
            {showSkipOption && (
              <button
                onClick={handleSkip}
                className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg
                           transition-colors duration-200"
              >
                Skip Image
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error overlay */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="text-center text-white max-w-sm mx-4">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2">Image Loading Failed</h3>
            <p className="text-gray-300 mb-4">{imageError}</p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                           transition-colors duration-200"
              >
                Retry
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg
                           transition-colors duration-200"
              >
                Skip Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image progress indicator */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
        {imageIndex + 1} / {totalImages}
      </div>
    </div>
  );
};
