/**
 * Utilities for localStorage management with error handling
 */

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number | undefined;
}

/**
 * Safe localStorage wrapper with error handling
 */
export class Storage {
  private static isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set item in localStorage with optional expiration
   */
  static setItem<T>(key: string, value: T, expirationMs?: number): boolean {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available');
      return false;
    }

    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
      };
      
      if (expirationMs) {
        item.expiresAt = Date.now() + expirationMs;
      }

      localStorage.setItem(key, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  /**
   * Get item from localStorage with expiration check
   */
  static getItem<T>(key: string): T | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) {
        return null;
      }

      const item: StorageItem<T> = JSON.parse(itemStr);

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      this.removeItem(key); // Remove corrupted data
      return null;
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  }

  /**
   * Clear all items with a specific prefix
   */
  static clearPrefix(prefix: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage prefix:', error);
      return false;
    }
  }

  /**
   * Get all keys with a specific prefix
   */
  static getKeysWithPrefix(prefix: string): string[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      return Object.keys(localStorage).filter(key => key.startsWith(prefix));
    } catch (error) {
      console.error('Failed to get keys from localStorage:', error);
      return [];
    }
  }
}

/**
 * Storage keys for the PicOrPixel game
 */
export const STORAGE_KEYS = {
  // Game session data
  CURRENT_SESSION: 'picorpixel_current_session',
  GAME_PROGRESS: 'picorpixel_game_progress',
  
  // User preferences
  USER_PREFERENCES: 'picorpixel_user_prefs',
  
  // Cache data
  DAILY_CHALLENGE_CACHE: 'picorpixel_daily_challenge',
  LEADERBOARD_CACHE: 'picorpixel_leaderboard',
  USER_STATS_CACHE: 'picorpixel_user_stats',
  
  // Session management
  SESSION_EXPIRY: 'picorpixel_session_expiry',
} as const;

/**
 * Default expiration times (in milliseconds)
 */
export const EXPIRATION_TIMES = {
  SESSION: 24 * 60 * 60 * 1000, // 24 hours
  DAILY_CHALLENGE: 25 * 60 * 60 * 1000, // 25 hours (to handle timezone differences)
  LEADERBOARD: 5 * 60 * 1000, // 5 minutes
  USER_STATS: 10 * 60 * 1000, // 10 minutes
} as const;
