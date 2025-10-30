import React, { useState, useRef, useEffect } from 'react';
import { GameImage } from '../../shared/types/game';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { OptimizedImage } from './OptimizedImage';

interface MobileGameInterfaceProps {
  images: GameImage[];
  currentImageIndex: number;
  score: number;
  onSelection: (imageId: string, guess: boolean) => void;
  loading?: boolean;
}

/**
 * Mobile-optimized game interface component
 */
export const MobileGameInterface: React.FC<MobileGameInterfaceProps> = ({
  images,
  currentImageIndex,
  score,
  onSelection,
  loading = false
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showZoomHint, setShowZoomHint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentImage = images[currentImageIndex];
  const progress = ((currentImageIndex + 1) / images.length) * 100;

  // Use optimized image preloader
  const imageUrls = images.map(img => img.url);
  const {
    currentImageLoaded,
    canSkipCurrent,
    loading: preloading,
    progress: preloadProgress,
    skipCurrentImage,
    retryImage,
    getCurrentImageResult
  } = useImagePreloader(imageUrls, currentImageIndex, {
    preloadCount: 3,
    timeout: 5000,
    autoRetry: true,
    maxRetries: 3
  });

  // Reset zoom and pan when image changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setShowZoomHint(false);
  }, [currentImageIndex]);

  // Show zoom hint after image loads
  useEffect(() => {
    if (currentImageLoaded && currentImageIndex === 0) {
      const timer = setTimeout(() => setShowZoomHint(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentImageLoaded, currentImageIndex]);

  // Hide zoom hint after a few seconds
  useEffect(() => {
    if (showZoomHint) {
      const timer = setTimeout(() => setShowZoomHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showZoomHint]);

  const handleImageRetry = () => {
    if (currentImage) {
      retryImage(currentImage.url);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 4));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 1));
    if (zoom <= 1.5) {
      setPan({ x: 0, y: 0 });
    }
  };

  // Touch handling for pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      if (touch) {
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoom > 1 && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        setPan({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y
        });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Double tap to zoom
  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleSelection = (isAI: boolean) => {
    if (currentImage && !loading && currentImageLoaded) {
      onSelection(currentImage.id, isAI);
    }
  };

  if (!currentImage) {
    return (
      <div className="game-interface-container">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-responsive-base">Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-interface-container">
      {/* Header with Progress and Score */}
      <div className="game-header">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <span className="text-responsive-sm font-medium text-gray-600">
              Image {currentImageIndex + 1} of {images.length}
            </span>
            <span className="text-responsive-sm font-bold text-blue-600">
              Score: {score}%
            </span>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center text-lg font-bold touch-manipulation"
              title="Zoom Out"
            >
              −
            </button>
            <span className="text-xs text-gray-600 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center text-lg font-bold touch-manipulation"
              title="Zoom In"
            >
              +
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="game-progress-bar">
          <div
            className="game-progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Image Display Area */}
      <div 
        ref={containerRef}
        className="game-image-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        {/* Loading State */}
        {!currentImageLoaded && (
          <div className="loading-overlay">
            <div className="text-center">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p className="text-responsive-base">Loading image...</p>
              {preloading && (
                <p className="text-sm opacity-75 mt-2">
                  {Math.round(preloadProgress)}% complete
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main Image */}
        <OptimizedImage
          src={currentImage.url}
          alt="Game image"
          loadResult={getCurrentImageResult()}
          onRetry={handleImageRetry}
          onSkip={skipCurrentImage}
          showControls={canSkipCurrent}
          className="game-image"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            display: currentImageLoaded ? 'block' : 'none'
          }}
        />

        {/* Zoom Hint */}
        {showZoomHint && zoom === 1 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                          bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm
                          animate-bounce-in pointer-events-none z-20">
            💡 Double tap to zoom
          </div>
        )}

        {/* Pan Hint */}
        {zoom > 1 && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm z-10">
            🔍 {Math.round(zoom * 100)}% • Drag to pan
          </div>
        )}
      </div>

      {/* Selection Buttons */}
      <div className="game-controls">
        <div className="game-buttons">
          <button
            onClick={() => handleSelection(false)}
            disabled={loading || !currentImageLoaded}
            className="game-button game-button-real focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">📷</span>
              <span>Real Photo</span>
            </div>
          </button>
          
          <button
            onClick={() => handleSelection(true)}
            disabled={loading || !currentImageLoaded}
            className="game-button game-button-ai focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">🤖</span>
              <span>AI Generated</span>
            </div>
          </button>
        </div>
        
        {loading && (
          <div className="text-center mt-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="loading-spinner w-4 h-4 border-2 border-gray-400 border-t-blue-600"></div>
              <p className="text-gray-600 text-sm">Processing your answer...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
