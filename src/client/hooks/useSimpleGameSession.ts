import { useState } from 'react';
import { gameApi } from '../services';
import { GameImage } from '../../shared/types/game';

interface GameSessionState {
  challengeId: string | null;
  images: GameImage[];
  currentIndex: number;
  score: number;
  guesses: Array<{ imageId: string; correct: boolean }>;
  feedback: {
    correct: boolean;
    explanation: string;
  } | null;
  loading: boolean;
  error: string | null;
  gameComplete: boolean;
}

export function useSimpleGameSession() {
  const [state, setState] = useState<GameSessionState>({
    challengeId: null,
    images: [],
    currentIndex: 0,
    score: 0,
    guesses: [],
    feedback: null,
    loading: false,
    error: null,
    gameComplete: false,
  });

  const startGame = (challengeId: string, images: GameImage[]) => {
    setState({
      challengeId,
      images,
      currentIndex: 0,
      score: 0,
      guesses: [],
      feedback: null,
      loading: false,
      error: null,
      gameComplete: false,
    });
  };

  const submitGuess = async (guess: 'real' | 'ai') => {
    const currentImage = state.images[state.currentIndex];
    if (!currentImage || !state.challengeId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await gameApi.submitGuess({
        imageId: currentImage.id,
        guess: guess === 'ai',
        challengeId: state.challengeId!,
      });

      const newGuesses = [...state.guesses, { imageId: currentImage.id, correct: response.correct }];
      const correctCount = newGuesses.filter(g => g.correct).length;
      const newScore = Math.round((correctCount / newGuesses.length) * 100);

      setState(prev => ({
        ...prev,
        guesses: newGuesses,
        score: newScore,
        feedback: {
          correct: response.correct,
          explanation: response.explanation || '',
        },
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to submit guess',
      }));
    }
  };

  const nextImage = async () => {
    const nextIndex = state.currentIndex + 1;
    
    if (nextIndex >= state.images.length) {
      // Game complete - save results to server
      setState(prev => ({ ...prev, loading: true }));
      
      try {
        if (state.challengeId) {
          await gameApi.completeGame({
            challengeId: state.challengeId,
          });
        }
        
        setState(prev => ({
          ...prev,
          gameComplete: true,
          feedback: null,
          loading: false,
        }));
      } catch (error) {
        console.error('Failed to complete game:', error);
        // Still mark as complete even if save fails
        setState(prev => ({
          ...prev,
          gameComplete: true,
          feedback: null,
          loading: false,
        }));
      }
    } else {
      // Move to next image
      setState(prev => ({
        ...prev,
        currentIndex: nextIndex,
        feedback: null,
      }));
    }
  };

  const resetGame = () => {
    setState({
      challengeId: null,
      images: [],
      currentIndex: 0,
      score: 0,
      guesses: [],
      feedback: null,
      loading: false,
      error: null,
      gameComplete: false,
    });
  };

  return {
    ...state,
    currentImage: state.images[state.currentIndex] || null,
    remainingImages: state.images.length - state.currentIndex - 1,
    startGame,
    submitGuess,
    nextImage,
    resetGame,
  };
}
