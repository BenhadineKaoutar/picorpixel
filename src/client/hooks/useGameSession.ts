import { useState, useCallback } from 'react';
import { gameApi, ApiError } from '../services';
import { GameResult, ImageGuess } from '../../shared/types/game';

export interface GameSessionState {
  challengeId: string | null;
  currentImageIndex: number;
  guesses: ImageGuess[];
  score: number;
  loading: boolean;
  error: string | null;
  gameResult: GameResult | null;
  completed: boolean;
  feedback: {
    correct: boolean;
    explanation?: string;
  } | null;
}

/**
 * Hook for managing game session state and interactions
 */
export function useGameSession() {
  const [state, setState] = useState<GameSessionState>({
    challengeId: null,
    currentImageIndex: 0,
    guesses: [],
    score: 0,
    loading: false,
    error: null,
    gameResult: null,
    completed: false,
    feedback: null,
  });

  /**
   * Start a new game session
   */
  const startGame = useCallback((challengeId: string) => {
    setState({
      challengeId,
      currentImageIndex: 0,
      guesses: [],
      score: 0,
      loading: false,
      error: null,
      gameResult: null,
      completed: false,
      feedback: null,
    });
  }, []);

  /**
   * Submit a guess for the current image
   */
  const submitGuess = async (imageId: string, guess: boolean) => {
    if (!state.challengeId) {
      throw new Error('No active game session');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await gameApi.submitGuess({
        imageId,
        guess,
        challengeId: state.challengeId,
      });

      const newGuess: ImageGuess = {
        imageId,
        guess,
        correct: response.correct,
        timestamp: new Date(),
      };

      setState(prev => {
        const newGuesses = [...prev.guesses, newGuess];
        const correctCount = newGuesses.filter(g => g.correct).length;
        const newScore = Math.round((correctCount / newGuesses.length) * 100);

        return {
          ...prev,
          guesses: newGuesses,
          score: newScore,
          loading: false,
          feedback: {
            correct: response.correct,
            ...(response.explanation && { explanation: response.explanation }),
          },
        };
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to submit guess';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  /**
   * Complete the current game session
   */
  const completeGame = useCallback(async () => {
    if (!state.challengeId) {
      throw new Error('No active game session');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await gameApi.completeGame({
        challengeId: state.challengeId,
      });

      setState(prev => ({
        ...prev,
        gameResult: {
          ...response.result,
          // Include sessionScore if provided by the API
          ...(response.sessionScore && { sessionScore: response.sessionScore })
        },
        completed: true,
        loading: false,
      }));

      return response.result;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to complete game';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [state.challengeId]);

  /**
   * Reset game session
   */
  const resetGame = useCallback(() => {
    setState({
      challengeId: null,
      currentImageIndex: 0,
      guesses: [],
      score: 0,
      loading: false,
      error: null,
      gameResult: null,
      completed: false,
      feedback: null,
    });
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Proceed to next image after viewing feedback
   */
  const nextImage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentImageIndex: prev.currentImageIndex + 1,
      feedback: null,
    }));
  }, []);

  return {
    ...state,
    startGame,
    submitGuess,
    completeGame,
    resetGame,
    clearError,
    nextImage,
  };
}
