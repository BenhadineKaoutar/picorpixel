import React, { useState } from 'react';
import { SplashScreen } from './SplashScreen';
import { HowToPlayModal } from './HowToPlayModal';
import { useDailyChallenge, useApiStatus } from '../hooks';

interface ConnectedSplashScreenProps {
  onPlay: (challengeId: string) => void;
  onLeaderboard?: () => void;
}

/**
 * Connected version of SplashScreen that fetches daily challenge data
 */
export const ConnectedSplashScreen: React.FC<ConnectedSplashScreenProps> = ({
  onPlay,
  onLeaderboard,
}) => {
  const { challenge, loading, error, refresh } = useDailyChallenge();
  const { isOnline, isConnected } = useApiStatus();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handlePlay = () => {
    if (challenge) {
      onPlay(challenge.id);
    }
  };

  const handleHowToPlay = () => {
    setShowHowToPlay(true);
  };

  const handleLeaderboard = () => {
    if (onLeaderboard) {
      onLeaderboard();
    }
  };

  const handleRetry = () => {
    refresh();
  };

  // Show full-screen loading page when initially loading
  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>

        <div className="text-center animate-pop-in relative z-10">
          {/* Pixel-style loading spinner */}
          <div className="relative mx-auto mb-8 w-20 h-20 sm:w-24 sm:h-24">
            <div className="absolute inset-0 border-4 border-white/30 rounded-lg"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-white border-r-white rounded-lg animate-spin"></div>
            <div className="absolute inset-2 border-4 border-white/20 rounded-lg"></div>
          </div>

          {/* Loading text with pixel styling */}
          <div className="pixel-card inline-block px-8 py-4 sm:px-10 sm:py-5 bg-white/95 backdrop-blur-sm">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
              Loading Game
            </h2>
            <div className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '0s' }}></span>
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '0.4s' }}></span>
            </div>
          </div>

          <p className="text-white/90 text-sm sm:text-base mt-6 font-semibold">
            🎮 Preparing your challenge...
          </p>
        </div>
      </div>
    );
  }

  // Show offline message if not connected
  if (!isOnline || !isConnected) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-4"
        style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
      >
        <div className="pixel-card p-8 max-w-md w-full text-center animate-pop-in">
          <div className="text-6xl mb-6">📡</div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>
            {!isOnline ? 'No Internet Connection' : 'Connection Issue'}
          </h2>
          <p className="text-gray-600 mb-6">
            {!isOnline
              ? 'Please check your internet connection and try again.'
              : 'Unable to connect to the game server. Please try again.'}
          </p>
          <button
            onClick={handleRetry}
            className="pixel-button w-full text-white font-bold py-3 px-6 rounded-lg"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show error message if there's an error
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-4"
        style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
      >
        <div className="pixel-card p-8 max-w-md w-full text-center animate-pop-in">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>
            Unable to Load Game
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="pixel-button w-full text-white font-bold py-3 px-6 rounded-lg"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SplashScreen
        dailyChallenge={challenge}
        onPlay={handlePlay}
        onHowToPlay={handleHowToPlay}
        onLeaderboard={handleLeaderboard}
      />
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </>
  );
};
