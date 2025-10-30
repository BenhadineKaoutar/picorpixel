import { useState, useEffect, useCallback } from 'react';
import { useGameSession } from './useGameSession';
import { SessionManager, PersistedGameSession } from '../utils/sessionManager';
import { ImageGuess } from '../../shared/types/game';

export interface PersistedGameSessionState {
  hasPersistedSession: boolean;
  canRecover: boolean;
  persistedSession: PersistedGameSession | null;
  autoSaveEnabled: boolean;
}

/**
 * Enhanced game session hook with persistence and recovery
 */
export function usePersistedGameSession() {
  const gameSession = useGameSession();
  
  const [persistedState, setPersistedState] = useState<PersistedGameSessionState>({
    hasPersistedSession: false,
    canRecover: false,
    persistedSession: null,
    autoSaveEnabled: true,
  });

  /**
   * Check for existing persisted session
   */
  const checkPersistedSession = useCallback((challengeId: string) => {
    const hasValid = SessionManager.hasValidSession(challengeId);
    const persisted = hasValid ? SessionManager.loadSession() : null;
    
    setPersistedState(prev => ({
      ...prev,
      hasPersistedSession: hasValid,
      canRecover: hasValid && persisted !== null,
      persistedSession: persisted,
    }));

    return { hasValid, persisted };
  }, []);

  /**
   * Start a new game with optional session recovery
   */
  const startGame = useCallback((challengeId: string, recoverSession: boolean = false) => {
    const { hasValid, persisted } = checkPersistedSession(challengeId);
    
    if (recoverSession && hasValid && persisted) {
      // Recover from persisted session
      gameSession.startGame(challengeId);
      
      // Restore session state (this would need to be implemented in the base hook)
      // For now, we'll just start fresh and let the user know about the recovery
      console.log('Recovering session:', persisted);
      
      setPersistedState(prev => ({
        ...prev,
        hasPersistedSession: false,
        canRecover: false,
        persistedSession: null,
      }));
    } else {
      // Start fresh game
      gameSession.startGame(challengeId);
      SessionManager.clearSession();
      
      setPersistedState(prev => ({
        ...prev,
        hasPersistedSession: false,
        canRecover: false,
        persistedSession: null,
      }));
    }
  }, [gameSession, checkPersistedSession]);

  /**
   * Submit guess with auto-save
   */
  const submitGuess = useCallback(async (imageId: string, guess: boolean) => {
    const result = await gameSession.submitGuess(imageId, guess);
    
    // Auto-save progress if enabled
    if (persistedState.autoSaveEnabled && gameSession.challengeId) {
      SessionManager.updateSession(
        gameSession.challengeId,
        gameSession.currentImageIndex + 1, // Next image index
        [...gameSession.guesses, {
          imageId,
          guess,
          correct: result.correct,
          timestamp: new Date(),
        }],
        gameSession.score
      );
    }
    
    return result;
  }, [gameSession, persistedState.autoSaveEnabled]);

  /**
   * Complete game and clear session
   */
  const completeGame = useCallback(async () => {
    const result = await gameSession.completeGame();
    
    // Clear persisted session on completion
    SessionManager.clearSession();
    
    setPersistedState(prev => ({
      ...prev,
      hasPersistedSession: false,
      canRecover: false,
      persistedSession: null,
    }));
    
    return result;
  }, [gameSession]);

  /**
   * Recover from persisted session
   */
  const recoverSession = useCallback(() => {
    if (persistedState.persistedSession && gameSession.challengeId) {
      startGame(gameSession.challengeId, true);
    }
  }, [persistedState.persistedSession, gameSession.challengeId, startGame]);

  /**
   * Discard persisted session
   */
  const discardPersistedSession = useCallback(() => {
    SessionManager.clearSession();
    setPersistedState(prev => ({
      ...prev,
      hasPersistedSession: false,
      canRecover: false,
      persistedSession: null,
    }));
  }, []);

  /**
   * Toggle auto-save
   */
  const toggleAutoSave = useCallback((enabled: boolean) => {
    setPersistedState(prev => ({
      ...prev,
      autoSaveEnabled: enabled,
    }));
  }, []);

  /**
   * Manual save current progress
   */
  const saveProgress = useCallback(() => {
    if (gameSession.challengeId) {
      const success = SessionManager.updateSession(
        gameSession.challengeId,
        gameSession.currentImageIndex,
        gameSession.guesses,
        gameSession.score
      );
      
      if (success) {
        setPersistedState(prev => ({
          ...prev,
          hasPersistedSession: true,
        }));
      }
      
      return success;
    }
    return false;
  }, [gameSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Perform cleanup when component unmounts
      SessionManager.cleanup();
    };
  }, []);

  // Auto-cleanup on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clean up expired sessions when page becomes visible
        SessionManager.cleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    // Base game session state
    ...gameSession,
    
    // Persistence state
    ...persistedState,
    
    // Enhanced methods
    startGame,
    submitGuess,
    completeGame,
    
    // Persistence methods
    checkPersistedSession,
    recoverSession,
    discardPersistedSession,
    toggleAutoSave,
    saveProgress,
  };
}
