import React, { useEffect } from 'react';
import { GameImage } from '../../shared/types/game';
import { useSimpleGameSession } from '../hooks/useSimpleGameSession';
import { FeedbackDisplay } from './FeedbackDisplay';

interface SimpleGameInterfaceProps {
  challengeId: string;
  images: GameImage[];
  onGameComplete: (score: number, correct: number, total: number) => void;
}

export const SimpleGameInterface: React.FC<SimpleGameInterfaceProps> = ({
  challengeId,
  images,
  onGameComplete,
}) => {
  const [imageLoading, setImageLoading] = React.useState(true);
  
  const {
    currentImage,
    currentIndex,
    score,
    feedback,
    loading,
    error,
    gameComplete,
    remainingImages,
    guesses,
    startGame,
    submitGuess,
    nextImage,
  } = useSimpleGameSession();

  // Start game when component mounts
  useEffect(() => {
    startGame(challengeId, images);
  }, [challengeId]);

  // Handle game completion
  useEffect(() => {
    if (gameComplete) {
      const correctCount = guesses.filter(g => g.correct).length;
      onGameComplete(score, correctCount, guesses.length);
    }
  }, [gameComplete, score, guesses, onGameComplete]);

  const handleGuess = async (guess: 'real' | 'ai') => {
    if (loading || feedback || imageLoading) return;
    await submitGuess(guess);
  };

  const handleNext = () => {
    setImageLoading(true);
    nextImage();
  };

  // Reset image loading when current image changes
  useEffect(() => {
    setImageLoading(true);
  }, [currentImage?.id]);

  if (error) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen p-4"
        style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
      >
        <div className="pixel-card p-8 max-w-sm mx-4 text-center animate-pop-in">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-dark)' }}>
            Oops!
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="pixel-button w-full text-white px-6 py-3 rounded-lg font-bold"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            Reload Game
          </button>
        </div>
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
      >
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl font-bold">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col min-h-screen"
      style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
    >
      {/* Header */}
      <div className="p-2 sm:p-4">
        <div className="pixel-card max-w-4xl mx-auto p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase">Image</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                  {currentIndex + 1}/{images.length}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase">Score</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: 'var(--color-secondary)' }}>
                  {score}%
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-500 uppercase">Left</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                {remainingImages}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 border-2 border-gray-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${((currentIndex + 1) / images.length) * 100}%`,
                backgroundColor: 'var(--color-accent)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Image Display */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <div className="max-w-4xl w-full h-full flex items-center">
          <div className="pixel-card overflow-hidden bg-white w-full">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-white border-t-transparent mx-auto mb-3"></div>
                      <p className="text-white font-bold text-sm sm:text-base">Loading image...</p>
                    </div>
                  </div>
                )}
                <img
                  src={currentImage.url}
                  alt={`Challenge image ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                  style={{ opacity: imageLoading ? 0 : 1, transition: 'opacity 0.3s' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="p-2 sm:p-4 pb-4 sm:pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            <button
              onClick={() => handleGuess('real')}
              disabled={loading || !!feedback || imageLoading}
              className="pixel-button disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-bold py-4 sm:py-5 md:py-6 px-3 sm:px-4 md:px-6 rounded-lg text-sm sm:text-base md:text-lg
                       flex flex-col items-center justify-center gap-1 sm:gap-2"
              style={{ backgroundColor: (loading || feedback || imageLoading) ? '#9CA3AF' : 'var(--color-success)' }}
            >
              <span className="text-2xl sm:text-3xl md:text-4xl">📷</span>
              <span className="text-xs sm:text-sm md:text-base">Real Photo</span>
            </button>
            
            <button
              onClick={() => handleGuess('ai')}
              disabled={loading || !!feedback || imageLoading}
              className="pixel-button disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-bold py-4 sm:py-5 md:py-6 px-3 sm:px-4 md:px-6 rounded-lg text-sm sm:text-base md:text-lg
                       flex flex-col items-center justify-center gap-1 sm:gap-2"
              style={{ backgroundColor: (loading || feedback || imageLoading) ? '#9CA3AF' : 'var(--color-secondary)' }}
            >
              <span className="text-2xl sm:text-3xl md:text-4xl">🤖</span>
              <span className="text-xs sm:text-sm md:text-base">AI Generated</span>
            </button>
          </div>
          
          {loading && !feedback && (
            <div className="text-center mt-3 sm:mt-4">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent"></div>
                <span className="text-white font-semibold text-xs sm:text-sm">Checking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Modal */}
      {feedback && (
        <FeedbackDisplay
          feedback={{
            isCorrect: feedback.correct,
            correctAnswer: currentImage.isAIGenerated ? 'ai' : 'real',
            currentScore: score,
            remainingImages,
            explanation: feedback.explanation,
          }}
          onNext={handleNext}
          loading={loading}
        />
      )}
    </div>
  );
};
