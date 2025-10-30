import { Storage, STORAGE_KEYS, EXPIRATION_TIMES } from './storage';
import { ImageGuess, DailyChallenge } from '../../shared/types/game';

/**
 * Persisted game session data
 */
export interface PersistedGameSession {
  challengeId: string;
  challengeDate: string;
  currentImageIndex: number;
  guesses: ImageGuess[];
  score: number;
  startTime: Date;
  lastActivity: Date;
}

/**
 * Session manager for handling game state persistence and recovery
 */
export class SessionManager {
  /**
   * Save current game session to localStorage
   */
  static saveSession(session: PersistedGameSession): boolean {
    return Storage.setItem(
      STORAGE_KEYS.CURRENT_SESSION,
      session,
      EXPIRATION_TIMES.SESSION
    );
  }

  /**
   * Load saved game session from localStorage
   */
  static loadSession(): PersistedGameSession | null {
    const session = Storage.getItem<PersistedGameSession>(STORAGE_KEYS.CURRENT_SESSION);
    
    if (!session) {
      return null;
    }

    // Convert date strings back to Date objects
    return {
      ...session,
      startTime: new Date(session.startTime),
      lastActivity: new Date(session.lastActivity),
      guesses: session.guesses.map(guess => ({
        ...guess,
        timestamp: new Date(guess.timestamp),
      })),
    };
  }

  /**
   * Clear saved session
   */
  static clearSession(): boolean {
    return Storage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  }

  /**
   * Check if there's a valid saved session for the current challenge
   */
  static hasValidSession(currentChallengeId: string): boolean {
    const session = this.loadSession();
    
    if (!session) {
      return false;
    }

    // Check if session is for the current challenge
    if (session.challengeId !== currentChallengeId) {
      this.clearSession();
      return false;
    }

    // Check if session is from today (challenges are daily)
    const today = new Date().toDateString();
    const sessionDate = new Date(session.challengeDate).toDateString();
    
    if (sessionDate !== today) {
      this.clearSession();
      return false;
    }

    // Check if session hasn't expired (24 hours)
    const now = Date.now();
    const sessionAge = now - new Date(session.lastActivity).getTime();
    
    if (sessionAge > EXPIRATION_TIMES.SESSION) {
      this.clearSession();
      return false;
    }

    return true;
  }

  /**
   * Update session with new progress
   */
  static updateSession(
    challengeId: string,
    currentImageIndex: number,
    guesses: ImageGuess[],
    score: number
  ): boolean {
    const existingSession = this.loadSession();
    
    const session: PersistedGameSession = {
      challengeId,
      challengeDate: new Date().toISOString(),
      currentImageIndex,
      guesses,
      score,
      startTime: existingSession?.startTime || new Date(),
      lastActivity: new Date(),
    };

    return this.saveSession(session);
  }

  /**
   * Cache daily challenge data
   */
  static cacheDailyChallenge(challenge: DailyChallenge): boolean {
    return Storage.setItem(
      STORAGE_KEYS.DAILY_CHALLENGE_CACHE,
      challenge,
      EXPIRATION_TIMES.DAILY_CHALLENGE
    );
  }

  /**
   * Get cached daily challenge
   */
  static getCachedDailyChallenge(): DailyChallenge | null {
    const cached = Storage.getItem<DailyChallenge>(STORAGE_KEYS.DAILY_CHALLENGE_CACHE);
    
    if (!cached) {
      return null;
    }

    // Check if cached challenge is for today
    const today = new Date().toDateString();
    const challengeDate = new Date(cached.date).toDateString();
    
    if (challengeDate !== today) {
      Storage.removeItem(STORAGE_KEYS.DAILY_CHALLENGE_CACHE);
      return null;
    }

    return cached;
  }

  /**
   * Clear all cached data
   */
  static clearAllCache(): boolean {
    try {
      Storage.removeItem(STORAGE_KEYS.DAILY_CHALLENGE_CACHE);
      Storage.removeItem(STORAGE_KEYS.LEADERBOARD_CACHE);
      Storage.removeItem(STORAGE_KEYS.USER_STATS_CACHE);
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions and cache
   */
  static cleanup(): void {
    try {
      // Remove expired session
      const session = Storage.getItem<PersistedGameSession>(STORAGE_KEYS.CURRENT_SESSION);
      if (session) {
        const now = Date.now();
        const sessionAge = now - new Date(session.lastActivity).getTime();
        
        if (sessionAge > EXPIRATION_TIMES.SESSION) {
          Storage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
        }
      }

      // Remove expired daily challenge cache
      const challenge = Storage.getItem<DailyChallenge>(STORAGE_KEYS.DAILY_CHALLENGE_CACHE);
      if (challenge) {
        const today = new Date().toDateString();
        const challengeDate = new Date(challenge.date).toDateString();
        
        if (challengeDate !== today) {
          Storage.removeItem(STORAGE_KEYS.DAILY_CHALLENGE_CACHE);
        }
      }

      // Clear old cache entries (anything older than 7 days)
      const oldKeys = Storage.getKeysWithPrefix('picorpixel_');
      oldKeys.forEach(key => {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed.timestamp && Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
              Storage.removeItem(key);
            }
          }
        } catch {
          // Remove corrupted entries
          Storage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to cleanup storage:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  static getStorageStats(): {
    totalKeys: number;
    gameKeys: number;
    estimatedSize: number;
  } {
    try {
      const allKeys = Object.keys(localStorage);
      const gameKeys = allKeys.filter(key => key.startsWith('picorpixel_'));
      
      let estimatedSize = 0;
      gameKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          estimatedSize += key.length + value.length;
        }
      });

      return {
        totalKeys: allKeys.length,
        gameKeys: gameKeys.length,
        estimatedSize,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalKeys: 0,
        gameKeys: 0,
        estimatedSize: 0,
      };
    }
  }
}
