import React from 'react';
import { DailyChallenge } from '../../shared/types/game';

interface MobileSplashScreenProps {
  dailyChallenge: DailyChallenge | null;
  onPlay: () => void;
  onHowToPlay: () => void;
  onLeaderboard: () => void;
  loading?: boolean;
}

/**
 * Mobile-optimized splash screen component
 */
export const MobileSplashScreen: React.FC<MobileSplashScreenProps> = ({
  dailyChallenge,
  onPlay,
  onHowToPlay,
  onLeaderboard,
  loading = false
}) => {
  return (
    <div className="game-container splash-screen">
      {/* Game Logo/Branding */}
      <div className="text-center mb-8 px-4">
        <h1 className="splash-title text-gray-900 animate-bounce-in text-4xl md:text-5xl font-bold">
          Pic<span className="text-blue-600">Or</span>Pixel
        </h1>
        <p className="splash-subtitle text-gray-600 animate-slide-up text-lg">
          AI vs Reality
        </p>
      </div>

      {/* Today's Challenge Preview - Simplified */}
      {dailyChallenge && (
        <div className="w-full max-w-xs mx-4 mb-8 animate-slide-up">
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <p className="text-sm text-gray-600">
              {dailyChallenge.totalImages} images • {Math.ceil(dailyChallenge.totalImages * 0.5)} min
            </p>
            <div className="text-xs text-green-600 font-medium mt-1">
              Daily Challenge Ready
            </div>
          </div>
        </div>
      )}

      {/* Three Main Action Buttons */}
      <div className="flex flex-col space-y-4 w-full max-w-xs px-4">
        {/* Play Now Button */}
        <button
          onClick={onPlay}
          disabled={loading || !dailyChallenge}
          className="play-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 
                     disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed
                     text-white font-bold py-4 px-8 rounded-xl text-lg
                     transform transition-all duration-200 hover:scale-105 active:scale-95
                     shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="loading-spinner w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Loading...</span>
            </div>
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <span className="text-xl">🎮</span>
              <span>Play Now</span>
            </span>
          )}
        </button>

        {/* How to Play Button */}
        <button
          onClick={onHowToPlay}
          className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-8 rounded-xl text-lg
                     border-2 border-gray-200 hover:border-gray-300
                     transform transition-all duration-200 hover:scale-105 active:scale-95
                     shadow-md hover:shadow-lg"
        >
          <span className="flex items-center justify-center space-x-2">
            <span className="text-xl">❓</span>
            <span>How to Play</span>
          </span>
        </button>

        {/* Leaderboard Button */}
        <button
          onClick={onLeaderboard}
          className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-8 rounded-xl text-lg
                     border-2 border-gray-200 hover:border-gray-300
                     transform transition-all duration-200 hover:scale-105 active:scale-95
                     shadow-md hover:shadow-lg"
        >
          <span className="flex items-center justify-center space-x-2">
            <span className="text-xl">🏆</span>
            <span>Leaderboard</span>
          </span>
        </button>
      </div>

      {/* Minimal Footer */}
      <div className="text-center px-4 mt-8">
        <p className="text-xs text-gray-400">
          Daily challenges • Powered by Reddit
        </p>
      </div>
    </div>
  );
};
