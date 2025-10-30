import React, { useEffect, useState } from 'react';
import { GameInterface } from './GameInterface';
import { SessionRecoveryDialog } from './SessionRecoveryDialog';
import { usePersistedGameSession } from '../hooks';
import { GameImage } from '../../shared/types/game';

interface PersistentGameInterfaceProps {
  challengeId: string;
  images: GameImage[];
  onGameComplete: () => void;
}

/**
 * Game interface with session persistence and recovery
 */
export const PersistentGameInterface: React.FC<PersistentGameInterfaceProps> = ({
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
    hasPersistedSession,
    canRecover,
    persistedSession,
    autoSaveEnabled,
    startGame,
    submitGuess,
    completeGame,
    recoverSession,
    discardPersistedSession,
    clearError,
    toggleAutoSave,
  } = usePersistedGameSession();

  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Check for persisted session when component mounts
  useEffect(() => {
    if (!gameStarted && challengeId) {
      // Check if there's a recoverable session
      if (canRecover && persistedSession) {
        setShowRecoveryDialog(true);
      } else {
        // Start fresh game
        startGame(challengeId, false);
        setGameStarted(true);
      }
    }
  }, [challengeId, canRecover, persistedSession, gameStarted, startGame]);

  // Handle game completion
  useEffect(() => {
    if (currentImageIndex >= images.length && !completed && !loading && gameStarted) {
      completeGame().then(() => {
        onGameComplete();
      }).catch((error) => {
        console.error('Failed to complete game:', error);
      });
    }
  }, [currentImageIndex, images.length, completed, loading, gameStarted, completeGame, onGameComplete]);

  const handleRecoverSession = () => {
    recoverSession();
    setShowRecoveryDialog(false);
    setGameStarted(true);
  };

  const handleDiscardSession = () => {
    discardPersistedSession();
    startGame(challengeId, false);
    setShowRecoveryDialog(false);
    setGameStarted(true);
  };

  const handleSelection = async (imageId: string, guess: boolean) => {
    try {
      await submitGuess(imageId, guess);
    } catch (error) {
      console.error('Failed to submit guess:', error);
      // Error is handled by the hook, just log it here
    }
  };

  // Show recovery dialog
  if (showRecoveryDialog && persistedSession) {
    return (
      <SessionRecoveryDialog
        persistedSession={persistedSession}
        onRecover={handleRecoverSession}
        onDiscard={handleDiscardSession}
      />
    );
  }

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
  if (images.length === 0 || !gameStarted || currentImageIndex < 0) {
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
    <div className="relative">
      {/* Auto-save indicator */}
      {autoSaveEnabled && (
        <div className="absolute top-4 right-4 z-10 bg-green-600 text-white px-2 py-1 rounded-full text-xs opacity-75">
          💾 Auto-save ON
        </div>
      )}

      <GameInterface
        images={images}
        currentImageIndex={currentImageIndex}
        score={score}
        onSelection={handleSelection}
        loading={loading}
      />
    </div>
  );
};
