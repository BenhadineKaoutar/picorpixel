import React from 'react';

interface SimpleResultsDisplayProps {
  score: number;
  correctCount: number;
  totalCount: number;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
}

export const SimpleResultsDisplay: React.FC<SimpleResultsDisplayProps> = ({
  score,
  correctCount,
  totalCount,
  onPlayAgain,
  onViewLeaderboard,
}) => {
  const getPerformanceMessage = () => {
    if (score >= 90) return { emoji: '🏆', text: 'Amazing!', color: '#FFE66D' };
    if (score >= 75) return { emoji: '🌟', text: 'Great Job!', color: '#95E1D3' };
    if (score >= 60) return { emoji: '👍', text: 'Good Work!', color: '#4ECDC4' };
    if (score >= 40) return { emoji: '💪', text: 'Keep Trying!', color: '#FF6B9D' };
    return { emoji: '🎯', text: 'Practice More!', color: '#2D3561' };
  };

  const performance = getPerformanceMessage();

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6"
      style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
    >
      <div className="pixel-card max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg w-full p-4 sm:p-6 md:p-8 animate-pop-in">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-6xl sm:text-7xl md:text-8xl mb-3 sm:mb-4">{performance.emoji}</div>
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2"
            style={{ color: performance.color }}
          >
            {performance.text}
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Challenge Complete!
          </p>
        </div>

        {/* Score Display */}
        <div className="mb-6 sm:mb-8">
          <div 
            className="text-center p-6 sm:p-8 rounded-lg border-3 border-gray-800 mb-3 sm:mb-4"
            style={{ backgroundColor: performance.color }}
          >
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2">
              {score}%
            </div>
            <div className="text-white text-base sm:text-lg font-semibold">
              Final Score
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 rounded-lg border-2 border-gray-800 bg-white">
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--color-success)' }}>
                {correctCount}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase mt-1">
                Correct
              </div>
            </div>
            
            <div className="text-center p-3 sm:p-4 rounded-lg border-2 border-gray-800 bg-white">
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--color-danger)' }}>
                {totalCount - correctCount}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase mt-1">
                Wrong
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={onPlayAgain}
            className="pixel-button w-full text-white font-bold py-4 sm:py-5 px-4 sm:px-6 rounded-lg text-lg sm:text-xl"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            <span className="flex items-center justify-center gap-2 sm:gap-3">
              <span>▶</span>
              <span>Play Again</span>
            </span>
          </button>

          <button
            onClick={onViewLeaderboard}
            className="pixel-button w-full font-bold py-4 sm:py-5 px-4 sm:px-6 rounded-lg text-lg sm:text-xl"
            style={{ 
              backgroundColor: 'var(--color-warning)',
              color: 'var(--color-dark)'
            }}
          >
            <span className="flex items-center justify-center gap-2 sm:gap-3">
              <span>★</span>
              <span>View Leaderboard</span>
            </span>
          </button>
        </div>

        {/* Encouragement Message */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            {score >= 75 
              ? "You're getting really good at spotting AI!" 
              : "Keep practicing to improve your AI detection skills!"}
          </p>
        </div>
      </div>
    </div>
  );
};
