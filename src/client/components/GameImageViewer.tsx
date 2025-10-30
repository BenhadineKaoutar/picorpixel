import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { GameImage } from '../../shared/types/game';

interface GameImageViewerProps {
  images: GameImage[];
  currentIndex: number;
  onImageLoad?: () => void;
  onImageError?: (error: string) => void;
  className?: string;
}

/**
 * Optimized game image viewer with preloading and zoom capabilities
 */
export const GameImageViewer: React.FC<GameImageViewerProps> = ({
  images,
  currentIndex,
  onImageLoad,
  onImageError,
  className = '',
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showZoomHint, setShowZoomHint] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const currentImage = images[currentIndex];
  
  // Use optimized image preloader for all images
  const imageUrls = images.map(img => img.url);
  const {
    currentImageLoaded,
    canSkipCurrent,
    loading: preloading,
    progress: preloadProgress,
    skipCurrentImage,
    retryImage,
    getCurrentImageResult
  } = useImagePreloader(imageUrls, currentIndex, {
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
  }, [currentIndex]);

  // Show zoom hint for first image
  useEffect(() => {
    if (currentIndex === 0) {
      const timer = setTimeout(() => setShowZoomHint(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  // Hide zoom hint after showing
  useEffect(() => {
    if (showZoomHint) {
      const timer = setTimeout(() => setShowZoomHint(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showZoomHint]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(prev / 1.5, 1);
      if (newZoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  // Touch handling for pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      if (touch) {
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      }
    }
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
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
  }, [isDragging, zoom, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse handling for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, zoom, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!currentImage) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center text-white">
          <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className}`}>
      {/* Image Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="w-full h-full transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
        >
          <OptimizedImage
            src={currentImage.url}
            alt={`Game image ${currentIndex + 1}`}
            className="w-full h-full object-contain"
            loadResult={getCurrentImageResult()}
            onLoad={onImageLoad || (() => {})}
            onError={onImageError || (() => {})}
            onRetry={() => retryImage(currentImage.url)}
            onSkip={skipCurrentImage}
            showControls={canSkipCurrent}
            style={{
              display: currentImageLoaded ? 'block' : 'none'
            }}
            errorFallback={
              <div className="flex flex-col items-center justify-center h-full text-white">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-lg mb-4">Failed to load image</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => retryImage(currentImage.url)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Retry
                  </button>
                  {canSkipCurrent && (
                    <button
                      onClick={skipCurrentImage}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Skip
                    </button>
                  )}
                </div>
              </div>
            }
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 4}
          className="w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center
                     disabled:opacity-30 disabled:cursor-not-allowed hover:bg-opacity-70 transition-all"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className="w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center
                     disabled:opacity-30 disabled:cursor-not-allowed hover:bg-opacity-70 transition-all"
          title="Zoom Out"
        >
          −
        </button>
      </div>

      {/* Zoom Level Indicator */}
      {zoom > 1 && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm z-10">
          🔍 {Math.round(zoom * 100)}%
          {zoom > 1 && <span className="ml-2 text-xs opacity-75">• Drag to pan</span>}
        </div>
      )}

      {/* Zoom Hint */}
      {showZoomHint && zoom === 1 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                        bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm
                        animate-bounce pointer-events-none z-20">
          💡 Double tap to zoom in
        </div>
      )}

      {/* Loading indicator when image is not ready */}
      {!currentImageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-30">
          <div className="text-center text-white">
            <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg">Loading image...</p>
            {preloading && (
              <p className="text-sm opacity-75 mt-2">
                {Math.round(preloadProgress)}% complete
              </p>
            )}
          </div>
        </div>
      )}

      {/* Preload Progress (for debugging) */}
      {process.env.NODE_ENV === 'development' && preloading && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs z-10">
          Preloading: {Math.round(preloadProgress)}%
        </div>
      )}
    </div>
  );
};
