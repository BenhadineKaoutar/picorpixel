import React from 'react';
import { DailyChallenge } from '../../shared/types/game';

const splashGraphic = '/pixel.png';

interface SplashScreenProps {
  dailyChallenge: DailyChallenge | null;
  onPlay: () => void;
  onHowToPlay: () => void;
  onLeaderboard: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  dailyChallenge,
  onPlay,
  onHowToPlay,
  onLeaderboard,
}) => {
  return (
    <div
      className="relative flex flex-col items-center justify-between min-h-screen p-4 sm:p-6 md:p-8"
      style={{
        background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)',
      }}
    >
      {/* Logo Section */}
      <div className="flex-1 flex items-center justify-center w-full max-w-[160px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-xs pt-4 sm:pt-8">
        <div className="animate-pop-in w-full px-2">
          <img
            src={splashGraphic}
            alt="PicOrPixel"
            className="w-full h-auto drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}
          />
        </div>
      </div>

      {/* Menu Section */}
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md space-y-3 sm:space-y-4 pb-4 sm:pb-8">
        {/* Play Now Button */}
        <button
          onClick={onPlay}
          disabled={!dailyChallenge}
          className="pixel-button w-full font-bold text-lg sm:text-xl md:text-2xl py-4 sm:py-5 md:py-6 px-6 sm:px-8 rounded-lg
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: !dailyChallenge ? '#9CA3AF' : '#FF6B9D',
            color: 'white',
          }}
        >
          <span className="flex items-center justify-center gap-2 sm:gap-3">
            <span>▶</span>
            <span>Play Now</span>
          </span>
        </button>

        {/* Secondary Buttons */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={onHowToPlay}
            className="pixel-button font-bold text-sm sm:text-base py-3 sm:py-4 px-4 sm:px-6 rounded-lg"
            style={{
              backgroundColor: 'white',
              color: 'var(--color-primary)',
            }}
          >
            <span className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-xl sm:text-2xl">?</span>
              <span className="text-xs sm:text-base">How to Play</span>
            </span>
          </button>

          <button
            onClick={onLeaderboard}
            className="pixel-button font-bold text-sm sm:text-base py-3 sm:py-4 px-4 sm:px-6 rounded-lg"
            style={{
              backgroundColor: '#FFE66D',
              color: 'var(--color-dark)',
            }}
          >
            <span className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-xl sm:text-2xl">★</span>
              <span className="text-xs sm:text-base">Leaderboard</span>
            </span>
          </button>
        </div>

        {/* Footer Info */}
        {dailyChallenge && (
          <div className="text-center pt-2 sm:pt-4">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <p className="text-xs sm:text-sm font-semibold text-white">
                Daily Challenge • {dailyChallenge.images.length} Images
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
