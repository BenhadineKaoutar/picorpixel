import React, { useState, useRef, useEffect } from 'react';
import { GameImage } from '../../shared/types/game';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { OptimizedImage } from './OptimizedImage';
import { FeedbackDisplay } from './FeedbackDisplay';

interface GameInterfaceProps {
  images: GameImage[];
  currentImageIndex: number;
  score: number;
  onSelection: (imageId: string, guess: boolean) => void;
  loading?: boolean;
  feedback?: {
    correct: boolean;
    explanation?: string;
  } | null;
  onNextImage?: () => void;
}

export const GameInterface: React.FC<GameInterfaceProps> = ({
  images,
  currentImageIndex,
  score,
  onSelection,
  loading = false,
  feedback = null,
  onNextImage
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
  }, [currentImageIndex]);

  const handleImageRetry = () => {
    if (currentImage) {
      retryImage(currentImage.url);
    }
  };

  const handleImageSkip = () => {
    skipCurrentImage();
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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

  const handleSelection = (isAI: boolean) => {
    if (currentImage && !loading && currentImageLoaded) {
      onSelection(currentImage.id, isAI);
    }
  };

  if (!currentImage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header with Progress and Score */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600">
              Image {currentImageIndex + 1} of {images.length}
            </span>
            <span className="text-sm font-medium text-blue-600">
              Score: {score}%
            </span>
            {preloading && (
              <span className="text-xs text-gray-500">
                Preloading... {Math.round(preloadProgress)}%
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {canSkipCurrent && (
              <button
                onClick={handleImageSkip}
                className="px-3 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                title="Skip this image"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1 || !currentImageLoaded}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out"
            >
              🔍-
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 4 || !currentImageLoaded}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              🔍+
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Image Display Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-black cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <OptimizedImage
          src={currentImage.url}
          alt="Game image"
          loadResult={getCurrentImageResult()}
          onRetry={handleImageRetry}
          onSkip={handleImageSkip}
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            display: currentImageLoaded ? 'block' : 'none'
          }}
          showControls={true}
        />

        {/* Zoom indicator */}
        {zoom > 1 && currentImageLoaded && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      {/* Selection Buttons */}
      <div className="bg-white p-4 shadow-lg">
        {!feedback && (
          <div className="flex space-x-4 max-w-md mx-auto">
            <button
              onClick={() => handleSelection(false)}
              disabled={loading || !currentImageLoaded}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                         text-white font-bold py-4 px-6 rounded-lg text-lg
                         transform transition-all duration-200 hover:scale-105 active:scale-95
                         touch-manipulation"
            >
              📷 Real Photo
            </button>
            <button
              onClick={() => handleSelection(true)}
              disabled={loading || !currentImageLoaded}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                         text-white font-bold py-4 px-6 rounded-lg text-lg
                         transform transition-all duration-200 hover:scale-105 active:scale-95
                         touch-manipulation"
            >
              🤖 AI Generated
            </button>
          </div>
        )}

        {/* Feedback Display */}
        {feedback && (
          <FeedbackDisplay
            feedback={{
              isCorrect: feedback.correct,
              correctAnswer: currentImage.isAIGenerated ? 'ai' : 'real',
              currentScore: score,
              remainingImages: images.length - currentImageIndex - 1,
              explanation: feedback.explanation || `This image was ${currentImage.isAIGenerated ? 'AI generated' : 'a real photo'}.`,
            }}
            onNext={onNextImage || (() => {})}
            loading={loading}
          />
        )}
        
        {loading && !feedback && (
          <div className="text-center mt-2">
            <p className="text-gray-600 text-sm">Processing your answer...</p>
          </div>
        )}

        {!currentImageLoaded && !loading && !feedback && (
          <div className="text-center mt-2">
            <p className="text-gray-600 text-sm">
              {preloading ? 'Loading image...' : 'Image not available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
