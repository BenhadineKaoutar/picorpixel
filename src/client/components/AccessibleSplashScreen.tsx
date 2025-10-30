import React, { useEffect, useRef } from 'react';
import { DailyChallenge } from '../../shared/types/game';
import { 
  KeyboardNavigationManager, 
  announceToScreenReader,
  prefersReducedMotion
} from '../utils/accessibility';

interface AccessibleSplashScreenProps {
  dailyChallenge: DailyChallenge | null;
  onPlay: () => void;
  loading?: boolean;
}

/**
 * Accessible splash screen with keyboard navigation and screen reader support
 */
export const AccessibleSplashScreen: React.FC<AccessibleSplashScreenProps> = ({
  dailyChallenge,
  onPlay,
  loading = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const keyboardManager = useRef<KeyboardNavigationManager | null>(null);
  const reducedMotion = prefersReducedMotion();

  // Initialize keyboard navigation
  useEffect(() => {
    if (containerRef.current) {
      keyboardManager.current = new KeyboardNavigationManager({
        enableArrowKeys: true,
        enableTabNavigation: true,
        enableEnterActivation: true,
        enableSpaceActivation: true,
        autoFocus: true,
      });

      keyboardManager.current.init(containerRef.current, 'button:not(:disabled), details');
    }

    return () => {
      keyboardManager.current?.destroy();
    };
  }, []);

  // Announce page load to screen reader
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dailyChallenge) {
        announceToScreenReader(
          `Welcome to PicOrPixel! Today's challenge has ${dailyChallenge.totalImages} images. Press the Play Now button to start.`,
          'polite'
        );
      } else if (!loading) {
        announceToScreenReader(
          'Welcome to PicOrPixel! Loading today\'s challenge...',
          'polite'
        );
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [dailyChallenge, loading]);

  // Focus play button when challenge loads
  useEffect(() => {
    if (dailyChallenge && !loading && playButtonRef.current) {
      const timer = setTimeout(() => {
        playButtonRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [dailyChallenge, loading]);

  const handlePlay = () => {
    announceToScreenReader('Starting game...', 'polite');
    onPlay();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (event.target === playButtonRef.current) {
        event.preventDefault();
        handlePlay();
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4"
      onKeyDown={handleKeyDown}
      role="main"
      aria-label="PicOrPixel Game Home"
    >
      {/* Skip to content link for screen readers */}
      <a 
        href="#play-button" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                   bg-blue-600 text-white px-4 py-2 rounded z-50
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to Play Button
      </a>

      {/* Game Logo/Branding */}
      <header className="text-center mb-8">
        <h1 className={`text-4xl md:text-6xl font-bold text-gray-900 mb-2 ${
          reducedMotion ? '' : 'animate-bounce-in'
        }`}>
          Pic<span className="text-blue-600">Or</span>Pixel
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-md mx-auto">
          Can you tell AI-generated images from real photos?
        </p>
      </header>

      {/* Daily Challenge Preview */}
      {dailyChallenge && (
        <section 
          className={`bg-white rounded-lg shadow-lg p-6 mb-8 max-w-sm w-full ${
            reducedMotion ? '' : 'animate-slide-up'
          }`}
          aria-labelledby="challenge-heading"
          role="region"
        >
          <h2 id="challenge-heading" className="text-xl font-semibold text-gray-800 mb-3 text-center">
            Today's Challenge
          </h2>
          
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg" aria-hidden="true">📅</span>
              <span>
                <span className="sr-only">Date: </span>
                {new Date(dailyChallenge.date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg" aria-hidden="true">🖼️</span>
              <span>
                <span className="sr-only">Number of images: </span>
                {dailyChallenge.totalImages} images
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-gray-700 mb-2">
              Test your skills with today's curated selection of images
            </p>
            <div className="flex justify-center space-x-2" role="list" aria-label="Image types">
              <span 
                className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                role="listitem"
              >
                <span aria-hidden="true">📷</span> Real Photos
              </span>
              <span 
                className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs"
                role="listitem"
              >
                <span aria-hidden="true">🤖</span> AI Generated
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Play Button */}
      <div className="mb-8">
        <button
          ref={playButtonRef}
          id="play-button"
          onClick={handlePlay}
          disabled={loading || !dailyChallenge}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 
                     disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed
                     text-white font-bold py-4 px-8 rounded-full text-xl md:text-2xl
                     transform transition-all duration-200 hover:scale-105 active:scale-95
                     shadow-lg hover:shadow-xl min-w-[200px]
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-describedby="play-button-description"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-3">
              <span 
                className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"
                role="progressbar"
                aria-label="Loading"
              ></span>
              <span>Loading...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <span className="text-xl" aria-hidden="true">🎮</span>
              <span>Play Now</span>
            </span>
          )}
        </button>
        
        <div id="play-button-description" className="sr-only">
          {loading 
            ? 'Loading today\'s challenge. Please wait.'
            : dailyChallenge 
              ? `Start playing today's challenge with ${dailyChallenge.totalImages} images.`
              : 'Play button will be available once today\'s challenge loads.'
          }
        </div>
      </div>

      {/* Game Instructions */}
      <section className="mt-8 text-center max-w-lg" aria-labelledby="instructions-heading">
        <h3 id="instructions-heading" className="text-lg font-semibold text-gray-800 mb-3">
          How to Play
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600" role="list">
          <div className="flex flex-col items-center" role="listitem">
            <div 
              className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2"
              aria-hidden="true"
            >
              👀
            </div>
            <p>
              <strong>Step 1:</strong> Look at each image carefully
            </p>
          </div>
          <div className="flex flex-col items-center" role="listitem">
            <div 
              className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2"
              aria-hidden="true"
            >
              🤔
            </div>
            <p>
              <strong>Step 2:</strong> Decide: Real photo or AI?
            </p>
          </div>
          <div className="flex flex-col items-center" role="listitem">
            <div 
              className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2"
              aria-hidden="true"
            >
              🏆
            </div>
            <p>
              <strong>Step 3:</strong> Compete on the leaderboard
            </p>
          </div>
        </div>
      </section>

      {/* Accessibility Information */}
      <details className="mt-6 max-w-lg w-full">
        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-2">
          <span className="font-medium">Accessibility Features</span>
        </summary>
        <div className="mt-2 text-xs text-gray-500 space-y-2 p-2 bg-gray-50 rounded">
          <p>• Full keyboard navigation support</p>
          <p>• Screen reader compatible</p>
          <p>• High contrast mode support</p>
          <p>• Reduced motion respect</p>
          <p>• Zoom and pan controls</p>
          <p>• Keyboard shortcuts available</p>
        </div>
      </details>

      {/* Footer */}
      <footer className="mt-8 text-xs text-gray-500 text-center">
        <p>New challenge every day • Powered by Reddit</p>
        <p className="mt-1">
          <span className="sr-only">Accessibility: </span>
          Use Tab to navigate, Enter or Space to activate buttons
        </p>
      </footer>
    </div>
  );
};
