import React, { useEffect } from 'react';
import { GameInterface } from './GameInterface';
import { useGameSession } from '../hooks';
import { GameImage } from '../../shared/types/game';

interface ConnectedGameInterfaceProps {
  challengeId: string;
  images: GameImage[];
  onGameComplete: () => void;
}

/**
 * Connected version of GameInterface that manages game session state
 */
export const ConnectedGameInterface: React.FC<ConnectedGameInterfaceProps> = ({
  challengeId,
  images,
  onGameComplete,
}) => {
  const {
    currentImageIndex,
    score,
    loading,
    error,
    completed,
    feedback,
    startGame,
    submitGuess,
    completeGame,
    clearError,
    nextImage,
  } = useGameSession();

  // Start game when component mounts
  useEffect(() => {
    startGame(challengeId);
  }, [challengeId, startGame]);

  // Handle game completion - only auto-complete if we've moved past the last image without feedback
  useEffect(() => {
    if (currentImageIndex >= images.length && !completed && !loading && !feedback) {
      completeGame().then(() => {
        onGameComplete();
      }).catch((error) => {
        console.error('Failed to complete game:', error);
      });
    }
  }, [currentImageIndex, images.length, completed, loading, feedback, completeGame, onGameComplete]);

  const handleSelection = async (imageId: string, guess: boolean) => {
    try {
      await submitGuess(imageId, guess);
    } catch (error) {
      console.error('Failed to submit guess:', error);
      // Error is handled by the hook, just log it here
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex + 1 >= images.length) {
      // Complete the game if this was the last image
      completeGame().then(() => {
        onGameComplete();
      }).catch((error) => {
        console.error('Failed to complete game:', error);
      });
    } else {
      // Move to next image
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
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Game Error
            </h2>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
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

  // Show loading if no images or game not started
  if (images.length === 0 || currentImageIndex < 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Starting game...</p>
        </div>
      </div>
    );
  }

  return (
    <GameInterface
      images={images}
      currentImageIndex={currentImageIndex}
      score={score}
      onSelection={handleSelection}
      loading={loading}
      feedback={feedback}
      onNextImage={handleNextImage}
    />
  );
};
