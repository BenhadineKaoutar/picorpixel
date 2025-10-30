import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameImage } from '../../shared/types/game';
import { 
  KeyboardNavigationManager, 
  announceToScreenReader,
  prefersReducedMotion 
} from '../utils/accessibility';

interface AccessibleGameInterfaceProps {
  images: GameImage[];
  currentImageIndex: number;
  score: number;
  onSelection: (imageId: string, guess: boolean) => void;
  loading?: boolean;
}

/**
 * Accessible game interface with keyboard navigation and screen reader support
 */
export const AccessibleGameInterface: React.FC<AccessibleGameInterfaceProps> = ({
  images,
  currentImageIndex,
  score,
  onSelection,
  loading = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [, setFocusedButton] = useState<'real' | 'ai' | null>(null);
  const [hasAnnounced, setHasAnnounced] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const realButtonRef = useRef<HTMLButtonElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const keyboardManager = useRef<KeyboardNavigationManager | null>(null);

  const currentImage = images[currentImageIndex];
  const progress = ((currentImageIndex + 1) / images.length) * 100;
  const reducedMotion = prefersReducedMotion();

  // Initialize keyboard navigation
  useEffect(() => {
    if (containerRef.current) {
      keyboardManager.current = new KeyboardNavigationManager({
        enableArrowKeys: true,
        enableTabNavigation: true,
        enableEnterActivation: true,
        enableSpaceActivation: true,
        trapFocus: true,
        autoFocus: false,
      });

      keyboardManager.current.init(containerRef.current, 'button:not(:disabled)');
    }

    return () => {
      keyboardManager.current?.destroy();
    };
  }, []);

  // Announce image changes to screen reader
  useEffect(() => {
    if (currentImage && imageLoaded && !hasAnnounced) {
      const imageDescription = getImageDescription(currentImage);
      announceToScreenReader(
        `Image ${currentImageIndex + 1} of ${images.length}. ${imageDescription}. Choose Real Photo or AI Generated.`,
        'polite'
      );
      setHasAnnounced(true);
    }
  }, [currentImage, currentImageIndex, images.length, imageLoaded, hasAnnounced]);

  // Reset state when image changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setZoom(1);
    setHasAnnounced(false);
    setFocusedButton(null);
  }, [currentImageIndex]);

  // Update keyboard navigation when buttons change
  useEffect(() => {
    if (keyboardManager.current && containerRef.current) {
      keyboardManager.current.updateElements('button:not(:disabled)');
    }
  }, [loading, imageLoaded]);

  const getImageDescription = (image: GameImage): string => {
    const difficulty = image.difficulty;
    const difficultyText = difficulty === 'easy' ? 'simple' : 
                          difficulty === 'medium' ? 'moderate complexity' : 
                          'complex';
    
    return `An image with ${difficultyText} details. Examine carefully to determine if it's a real photograph or AI-generated.`;
  };

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
    announceToScreenReader('Error loading image. Please try refreshing the page.', 'assertive');
  }, []);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom * 1.5, 4);
    setZoom(newZoom);
    announceToScreenReader(`Zoomed in to ${Math.round(newZoom * 100)} percent`, 'polite');
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom / 1.5, 1);
    setZoom(newZoom);
    announceToScreenReader(`Zoomed out to ${Math.round(newZoom * 100)} percent`, 'polite');
  }, [zoom]);

  const handleSelection = useCallback((isAI: boolean) => {
    if (currentImage && !loading) {
      const choice = isAI ? 'AI Generated' : 'Real Photo';
      announceToScreenReader(`Selected ${choice}. Processing answer...`, 'polite');
      onSelection(currentImage.id, isAI);
    }
  }, [currentImage, loading, onSelection]);

  const handleButtonFocus = useCallback((buttonType: 'real' | 'ai') => {
    setFocusedButton(buttonType);
    const choice = buttonType === 'real' ? 'Real Photo' : 'AI Generated';
    announceToScreenReader(`Focused on ${choice} button`, 'polite');
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case '1':
        event.preventDefault();
        realButtonRef.current?.focus();
        handleSelection(false);
        break;
      case '2':
        event.preventDefault();
        aiButtonRef.current?.focus();
        handleSelection(true);
        break;
      case '+':
      case '=':
        event.preventDefault();
        handleZoomIn();
        break;
      case '-':
        event.preventDefault();
        handleZoomOut();
        break;
    }
  }, [handleSelection, handleZoomIn, handleZoomOut]);

  if (!currentImage) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen bg-gray-900"
        role="status"
        aria-live="polite"
        aria-label="Loading game"
      >
        <div className="text-center text-white">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"
            role="progressbar"
            aria-label="Loading"
          ></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-screen bg-gray-900"
      onKeyDown={handleKeyDown}
      role="application"
      aria-label="PicOrPixel Game Interface"
    >
      {/* Header with Progress and Score */}
      <header className="bg-white shadow-sm p-4" role="banner">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <span 
              className="text-sm font-medium text-gray-600"
              role="status"
              aria-label={`Image ${currentImageIndex + 1} of ${images.length}`}
            >
              Image {currentImageIndex + 1} of {images.length}
            </span>
            <span 
              className="text-sm font-medium text-blue-600"
              role="status"
              aria-label={`Current score: ${score} percent`}
            >
              Score: {score}%
            </span>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2" role="group" aria-label="Zoom controls">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Zoom out. Current zoom: ${Math.round(zoom * 100)} percent`}
              title="Zoom Out (- key)"
            >
              <span className="text-lg font-bold" aria-hidden="true">−</span>
            </button>
            <span 
              className="text-xs text-gray-600 min-w-[3rem] text-center"
              role="status"
              aria-live="polite"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Zoom in. Current zoom: ${Math.round(zoom * 100)} percent`}
              title="Zoom In (+ key)"
            >
              <span className="text-lg font-bold" aria-hidden="true">+</span>
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div 
          className="w-full bg-gray-200 rounded-full h-2"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Game progress: ${Math.round(progress)} percent complete`}
        >
          <div
            className={`bg-blue-600 h-2 rounded-full ${reducedMotion ? '' : 'transition-all duration-300'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </header>

      {/* Image Display Area */}
      <main className="flex-1 relative overflow-hidden bg-black" role="main">
        {!imageLoaded && !imageError && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            role="status"
            aria-live="polite"
            aria-label="Loading image"
          >
            <div className="text-center text-white">
              <div 
                className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"
                role="progressbar"
                aria-label="Loading image"
              ></div>
              <p>Loading image...</p>
            </div>
          </div>
        )}

        {imageError && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            role="alert"
            aria-live="assertive"
          >
            <div className="text-center text-white">
              <p className="mb-4" role="status">❌ Failed to load image</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Retry loading the image"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <img
          ref={imageRef}
          src={currentImage.url}
          alt={getImageDescription(currentImage)}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`absolute inset-0 w-full h-full object-contain ${
            reducedMotion ? '' : 'transition-transform duration-200'
          }`}
          style={{
            transform: `scale(${zoom})`,
            display: imageLoaded ? 'block' : 'none'
          }}
          draggable={false}
          role="img"
          aria-describedby="image-instructions"
        />

        {/* Hidden instructions for screen readers */}
        <div id="image-instructions" className="sr-only">
          Examine this image carefully. Use the zoom controls or keyboard shortcuts (+ to zoom in, - to zoom out) 
          to inspect details. Then choose whether you think this is a real photograph or an AI-generated image 
          using the buttons below or keyboard shortcuts (1 for Real Photo, 2 for AI Generated).
        </div>

        {/* Zoom indicator */}
        {zoom > 1 && (
          <div 
            className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm"
            role="status"
            aria-live="polite"
          >
            Zoom: {Math.round(zoom * 100)}%
          </div>
        )}
      </main>

      {/* Selection Buttons */}
      <footer className="bg-white p-4 shadow-lg" role="contentinfo">
        <div className="flex space-x-4 max-w-md mx-auto">
          <button
            ref={realButtonRef}
            onClick={() => handleSelection(false)}
            onFocus={() => handleButtonFocus('real')}
            disabled={loading || !imageLoaded}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                       text-white font-bold py-4 px-6 rounded-lg text-lg
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                       transform transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Select Real Photo (Press 1)"
            aria-describedby="real-photo-hint"
          >
            <span className="flex items-center justify-center space-x-2">
              <span className="text-xl" aria-hidden="true">📷</span>
              <span>Real Photo</span>
            </span>
          </button>
          
          <button
            ref={aiButtonRef}
            onClick={() => handleSelection(true)}
            onFocus={() => handleButtonFocus('ai')}
            disabled={loading || !imageLoaded}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                       text-white font-bold py-4 px-6 rounded-lg text-lg
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                       transform transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Select AI Generated (Press 2)"
            aria-describedby="ai-generated-hint"
          >
            <span className="flex items-center justify-center space-x-2">
              <span className="text-xl" aria-hidden="true">🤖</span>
              <span>AI Generated</span>
            </span>
          </button>
        </div>
        
        {/* Hidden hints for screen readers */}
        <div id="real-photo-hint" className="sr-only">
          Choose this if you believe the image is a genuine photograph taken with a camera.
        </div>
        <div id="ai-generated-hint" className="sr-only">
          Choose this if you believe the image was created by artificial intelligence.
        </div>
        
        {loading && (
          <div 
            className="text-center mt-2"
            role="status"
            aria-live="polite"
          >
            <p className="text-gray-600 text-sm">Processing your answer...</p>
          </div>
        )}

        {/* Keyboard shortcuts help */}
        <div className="text-center mt-3">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
              Keyboard Shortcuts
            </summary>
            <div className="mt-2 space-y-1">
              <p>1 - Select Real Photo</p>
              <p>2 - Select AI Generated</p>
              <p>+ - Zoom In</p>
              <p>- - Zoom Out</p>
              <p>Tab/Arrow Keys - Navigate</p>
              <p>Enter/Space - Activate</p>
            </div>
          </details>
        </div>
      </footer>
    </div>
  );
};
