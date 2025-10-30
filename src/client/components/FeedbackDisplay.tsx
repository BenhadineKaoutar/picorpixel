import React from 'react';
import { SessionFeedback } from '../../shared/types/timedSession';

export interface FeedbackDisplayProps {
  feedback: SessionFeedback;
  onNext: () => void;
  loading?: boolean;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  feedback,
  onNext,
  loading = false,
}) => {
  const { isCorrect, correctAnswer, currentScore, remainingImages } = feedback;

  const handleNext = () => {
    if (loading) return;
    onNext();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNext();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="pixel-card p-4 sm:p-6 max-w-md w-full animate-pop-in">
        {/* Result Icon and Message */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="text-5xl sm:text-6xl md:text-7xl mb-3 sm:mb-4">
            {isCorrect ? '✓' : '✗'}
          </div>
          
          <h2 
            className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3"
            style={{ color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)' }}
          >
            {isCorrect ? 'Correct!' : 'Wrong!'}
          </h2>
          
          <div className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg mb-2 sm:mb-3"
               style={{ 
                 backgroundColor: isCorrect ? '#95E1D3' : '#FF6B6B',
                 color: 'white'
               }}>
            <p className="text-sm sm:text-base md:text-lg font-bold">
              This was {correctAnswer === 'ai' ? 'AI Generated 🤖' : 'a Real Photo 📷'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="text-center p-3 sm:p-4 rounded-lg border-2 border-gray-800 bg-white">
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-secondary)' }}>
              {currentScore}%
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase mt-1">
              Score
            </div>
          </div>
          
          <div className="text-center p-3 sm:p-4 rounded-lg border-2 border-gray-800 bg-white">
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {remainingImages}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase mt-1">
              Left
            </div>
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="pixel-button w-full py-4 sm:py-5 px-4 sm:px-6 rounded-lg text-white font-bold text-base sm:text-lg md:text-xl
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: loading ? '#9CA3AF' : 'var(--color-primary)',
          }}
          aria-label={remainingImages > 0 ? 'Continue to next image' : 'View final results'}
          role="button"
          tabIndex={loading ? -1 : 0}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
              <span className="text-sm sm:text-base">Loading...</span>
            </div>
          ) : (
            <span className="flex items-center justify-center gap-2 sm:gap-3">
              <span>{remainingImages > 0 ? 'Next Image' : 'View Results'}</span>
              <span className="text-xl sm:text-2xl">{remainingImages > 0 ? '→' : '★'}</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
