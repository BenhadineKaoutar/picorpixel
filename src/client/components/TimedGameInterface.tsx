import React from 'react';
import { GameImage } from '../../shared/types/game';
import { useTimedGameSessionContext } from '../contexts/TimedGameSessionContext';
import { SessionTimer } from './SessionTimer';
import { ImageDisplay } from './ImageDisplay';
import { ActionButtons } from './ActionButtons';
import { FeedbackDisplay } from './FeedbackDisplay';

interface TimedGameInterfaceProps {
  images: GameImage[];
  onGameComplete: () => void;
}

export const TimedGameInterface: React.FC<TimedGameInterfaceProps> = ({
  images,
  onGameComplete,
}) => {
  const {
    session,
    sessionState,
    currentImageIndex,
    timeRemaining,
    isTimerActive,
    feedback,
    error,
    loading,
    score,
    totalImages,
    imagesCompleted,
    submitGuess,
    nextImage,
    skipImage,
    clearError,
    endSession,
  } = useTimedGameSessionContext();

  const currentImage = images[currentImageIndex];

  // Handle session completion when time expires or all images completed
  React.useEffect(() => {
    if (sessionState === 'completed' || timeRemaining <= 0) {
      endSession().then(() => {
        onGameComplete();
      }).catch((error) => {
        console.error('Failed to end session:', error);
      });
    }
  }, [sessionState, timeRemaining, endSession, onGameComplete]);

  const handleImageLoaded = () => {
    // Image loaded successfully, ready for interaction
  };

  const handleImageError = (error: string) => {
    console.error('Image loading error:', error);
  };

  const handleSkipImage = () => {
    skipImage();
  };

  const handleGuess = async (guess: 'real' | 'ai') => {
    if (!currentImage || loading || sessionState !== 'playing') {
      return;
    }

    try {
      await submitGuess(currentImage.id, guess);
    } catch (error) {
      console.error('Failed to submit guess:', error);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex + 1 >= totalImages) {
      // Complete the session if this was the last image
      endSession().then(() => {
        onGameComplete();
      }).catch((error) => {
        console.error('Failed to complete session:', error);
      });
    } else {
      nextImage();
    }
  };

  // Show error overlay if there's an error
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Session Error</h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <div className="flex space-x-2">
              <button
                onClick={clearError}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Continue
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading if no current image
  if (!currentImage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading game session...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header with Timer and Progress */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <SessionTimer
              timeRemaining={timeRemaining}
              isActive={isTimerActive}
              showWarning={timeRemaining <= 60}
            />
            <span className="text-sm font-medium text-gray-600">
              Score: {score}%
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {imagesCompleted} / {totalImages} completed
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(imagesCompleted / totalImages) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Single Image Display Area */}
      <div className="flex-1 relative">
        <ImageDisplay
          image={currentImage}
          imageIndex={currentImageIndex}
          totalImages={totalImages}
          onImageLoaded={handleImageLoaded}
          onImageError={handleImageError}
          onSkipImage={handleSkipImage}
          className="w-full h-full"
        />
      </div>

      {/* Action Buttons and Feedback */}
      <div className="bg-white p-4 shadow-lg">
        {sessionState === 'playing' && (
          <ActionButtons
            onGuess={handleGuess}
            disabled={loading}
            loading={loading}
          />
        )}

        {/* Feedback Display */}
        {sessionState === 'feedback' && feedback && (
          <FeedbackDisplay
            feedback={feedback}
            onNext={handleNextImage}
            loading={loading}
          />
        )}
        
        {loading && (
          <div className="text-center mt-2">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 text-sm">Processing your answer...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
