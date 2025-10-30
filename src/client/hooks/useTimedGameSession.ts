import { useState, useCallback, useEffect, useRef } from 'react';
import { TimedGameSession, PlayerGuess, SessionScore, SessionState, SessionFeedback, SessionError } from '../../shared/types/timedSession';
import { GameImage } from '../../shared/types/game';

export interface TimedGameSessionHookState {
  // Session data
  session: TimedGameSession | null;
  sessionState: SessionState;
  currentImageIndex: number;
  
  // Timer state
  timeRemaining: number; // seconds
  isTimerActive: boolean;
  
  // UI state
  feedback: SessionFeedback | null;
  error: SessionError | null;
  loading: boolean;
  
  // Progress tracking
  score: number;
  totalImages: number;
  imagesCompleted: number;
}

export interface TimedGameSessionActions {
  // Session management
  startSession: (challengeId: string, images: GameImage[], timeLimit?: number) => void;
  endSession: () => Promise<SessionScore | null>;
  resetSession: () => void;
  
  // Game actions
  submitGuess: (imageId: string, guess: 'real' | 'ai') => Promise<void>;
  nextImage: () => void;
  skipImage: () => void;
  
  // Timer actions
  pauseTimer: () => void;
  resumeTimer: () => void;
  
  // Error handling
  clearError: () => void;
  retryLastAction: () => Promise<void>;
}

const DEFAULT_TIME_LIMIT = 300; // 5 minutes in seconds

export function useTimedGameSession(): TimedGameSessionHookState & TimedGameSessionActions {
  const [state, setState] = useState<TimedGameSessionHookState>({
    session: null,
    sessionState: 'playing',
    currentImageIndex: 0,
    timeRemaining: DEFAULT_TIME_LIMIT,
    isTimerActive: false,
    feedback: null,
    error: null,
    loading: false,
    score: 0,
    totalImages: 0,
    imagesCompleted: 0,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const imageDisplayStartTime = useRef<number>(0);
  const lastActionRef = useRef<(() => Promise<void>) | null>(null);

  // Timer effect
  useEffect(() => {
    if (state.isTimerActive && state.timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setState(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;
          
          // Auto-end session when time expires
          if (newTimeRemaining <= 0) {
            return {
              ...prev,
              timeRemaining: 0,
              isTimerActive: false,
              sessionState: 'completed',
            };
          }
          
          return {
            ...prev,
            timeRemaining: newTimeRemaining,
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isTimerActive, state.timeRemaining]);

  // Auto-end session when time expires
  useEffect(() => {
    if (state.timeRemaining <= 0 && state.session && state.sessionState !== 'completed') {
      endSession();
    }
  }, [state.timeRemaining, state.session, state.sessionState]);

  const startSession = useCallback((challengeId: string, images: GameImage[], timeLimit = DEFAULT_TIME_LIMIT) => {
    const now = Date.now();
    
    const newSession: TimedGameSession = {
      id: `session_${now}`,
      challengeId,
      userId: 'current_user', // This would come from auth context
      startTime: now,
      timeLimit,
      images: images.map(img => img.id),
      guesses: [],
      status: 'active',
    };

    setState({
      session: newSession,
      sessionState: 'playing',
      currentImageIndex: 0,
      timeRemaining: timeLimit,
      isTimerActive: true,
      feedback: null,
      error: null,
      loading: false,
      score: 0,
      totalImages: images.length,
      imagesCompleted: 0,
    });

    imageDisplayStartTime.current = now;
  }, []);

  const submitGuess = useCallback(async (imageId: string, guess: 'real' | 'ai') => {
    if (!state.session || state.sessionState !== 'playing') {
      throw new Error('No active session or not in playing state');
    }

    const action = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const now = Date.now();
        const responseTime = now - imageDisplayStartTime.current;
        
        // Simulate API call to validate guess
        // In real implementation, this would call the server
        const correctAnswer: 'real' | 'ai' = Math.random() > 0.5 ? 'real' : 'ai'; // Mock
        const isCorrect = guess === correctAnswer;

        const newGuess: PlayerGuess = {
          imageId,
          guess,
          correctAnswer,
          isCorrect,
          timestamp: now,
          responseTime,
        };

        setState(prev => {
          if (!prev.session) return prev;

          const updatedGuesses = [...prev.session.guesses, newGuess];
          const correctCount = updatedGuesses.filter(g => g.isCorrect).length;
          const newScore = Math.round((correctCount / updatedGuesses.length) * 100);
          const remainingImages = prev.totalImages - updatedGuesses.length;

          const feedback: SessionFeedback = {
            isCorrect,
            correctAnswer,
            currentScore: newScore,
            remainingImages,
            explanation: `This image was ${correctAnswer === 'ai' ? 'AI generated' : 'a real photo'}.`,
          };

          return {
            ...prev,
            session: {
              ...prev.session,
              guesses: updatedGuesses,
            },
            sessionState: 'feedback',
            score: newScore,
            imagesCompleted: updatedGuesses.length,
            feedback,
            loading: false,
          };
        });
      } catch (error) {
        const sessionError: SessionError = {
          type: 'network',
          message: error instanceof Error ? error.message : 'Failed to submit guess',
          retryable: true,
          imageId,
        };

        setState(prev => ({
          ...prev,
          loading: false,
          error: sessionError,
        }));
        throw error;
      }
    };

    lastActionRef.current = action;
    await action();
  }, [state.session, state.sessionState]);

  const nextImage = useCallback(() => {
    setState(prev => {
      if (!prev.session || prev.sessionState !== 'feedback') {
        return prev;
      }

      const nextIndex = prev.currentImageIndex + 1;
      
      // Check if we've completed all images
      if (nextIndex >= prev.totalImages) {
        return {
          ...prev,
          sessionState: 'completed',
          feedback: null,
        };
      }

      // Move to next image
      imageDisplayStartTime.current = Date.now();
      
      return {
        ...prev,
        currentImageIndex: nextIndex,
        sessionState: 'playing',
        feedback: null,
      };
    });
  }, []);

  const skipImage = useCallback(() => {
    setState(prev => {
      if (!prev.session || prev.sessionState !== 'playing') {
        return prev;
      }

      const nextIndex = prev.currentImageIndex + 1;
      
      // Check if we've completed all images
      if (nextIndex >= prev.totalImages) {
        return {
          ...prev,
          sessionState: 'completed',
        };
      }

      // Move to next image without recording a guess
      imageDisplayStartTime.current = Date.now();
      
      return {
        ...prev,
        currentImageIndex: nextIndex,
      };
    });
  }, []);

  const endSession = useCallback(async (): Promise<SessionScore | null> => {
    if (!state.session) {
      return null;
    }

    setState(prev => ({ ...prev, loading: true, isTimerActive: false }));

    try {
      const now = Date.now();
      const timeUsed = Math.round((now - state.session.startTime) / 1000);
      const correctCount = state.session.guesses.filter(g => g.isCorrect).length;
      const totalCount = state.session.guesses.length;
      const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      
      const averageResponseTime = totalCount > 0 
        ? Math.round(state.session.guesses.reduce((sum, g) => sum + g.responseTime, 0) / totalCount)
        : 0;

      let performanceRating: SessionScore['performanceRating'] = 'needs-practice';
      if (accuracy >= 90) performanceRating = 'excellent';
      else if (accuracy >= 75) performanceRating = 'good';
      else if (accuracy >= 60) performanceRating = 'fair';

      const finalScore: SessionScore = {
        totalCorrect: correctCount,
        totalImages: totalCount,
        accuracy,
        timeUsed,
        averageResponseTime,
        performanceRating,
      };

      setState(prev => ({
        ...prev,
        session: prev.session ? {
          ...prev.session,
          endTime: now,
          finalScore,
          status: 'completed',
        } : null,
        sessionState: 'completed',
        loading: false,
      }));

      return finalScore;
    } catch (error) {
      const sessionError: SessionError = {
        type: 'save',
        message: 'Failed to save session results',
        retryable: true,
      };

      setState(prev => ({
        ...prev,
        loading: false,
        error: sessionError,
      }));
      
      return null;
    }
  }, [state.session]);

  const resetSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState({
      session: null,
      sessionState: 'playing',
      currentImageIndex: 0,
      timeRemaining: DEFAULT_TIME_LIMIT,
      isTimerActive: false,
      feedback: null,
      error: null,
      loading: false,
      score: 0,
      totalImages: 0,
      imagesCompleted: 0,
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setState(prev => ({ ...prev, isTimerActive: false }));
  }, []);

  const resumeTimer = useCallback(() => {
    setState(prev => ({ ...prev, isTimerActive: true }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const retryLastAction = useCallback(async () => {
    if (lastActionRef.current) {
      await lastActionRef.current();
    }
  }, []);

  return {
    ...state,
    startSession,
    endSession,
    resetSession,
    submitGuess,
    nextImage,
    skipImage,
    pauseTimer,
    resumeTimer,
    clearError,
    retryLastAction,
  };
}
