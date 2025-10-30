import { ImageLoadError } from './imagePreloader';
import { errorService } from './errorService';

export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number; // Exponential backoff multiplier
  jitter: boolean; // Add random jitter to prevent thundering herd
}

export interface RecoveryOptions {
  retryStrategy?: Partial<RetryStrategy>;
  skipAfterMaxRetries?: boolean;
  reportErrors?: boolean;
  showUserMessages?: boolean;
  context?: Record<string, any>;
}

export interface RecoveryState {
  url: string;
  attempts: number;
  lastAttempt: Date;
  nextRetryAt?: Date;
  canRetry: boolean;
  shouldSkip: boolean;
  error?: ImageLoadError;
}

/**
 * Service for handling image loading error recovery with exponential backoff
 */
class ErrorRecoveryService {
  private readonly DEFAULT_RETRY_STRATEGY: RetryStrategy = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true
  };

  private recoveryStates = new Map<string, RecoveryState>();
  private retryTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Handle image loading error and determine recovery strategy
   */
  public handleImageError(
    url: string,
    error: ImageLoadError,
    options: RecoveryOptions = {}
  ): RecoveryState {
    const {
      retryStrategy = {},
      skipAfterMaxRetries = true,
      reportErrors = true,
      showUserMessages = false,
      context = {}
    } = options;

    const strategy = { ...this.DEFAULT_RETRY_STRATEGY, ...retryStrategy };
    const existingState = this.recoveryStates.get(url);
    const attempts = existingState ? existingState.attempts + 1 : 1;

    // Create or update recovery state
    const recoveryState: RecoveryState = {
      url,
      attempts,
      lastAttempt: new Date(),
      canRetry: this.canRetry(error, attempts, strategy),
      shouldSkip: false,
      error
    };

    // Calculate next retry time if retryable
    if (recoveryState.canRetry) {
      const delay = this.calculateRetryDelay(attempts, strategy, error);
      recoveryState.nextRetryAt = new Date(Date.now() + delay);
    } else if (skipAfterMaxRetries && attempts >= strategy.maxRetries) {
      recoveryState.shouldSkip = true;
    }

    this.recoveryStates.set(url, recoveryState);

    // Report error if enabled
    if (reportErrors) {
      this.reportImageError(url, error, recoveryState, context);
    }

    // Show user message if enabled
    if (showUserMessages) {
      this.showUserErrorMessage(url, error, recoveryState);
    }

    return recoveryState;
  }

  /**
   * Schedule automatic retry for an image
   */
  public scheduleRetry(
    url: string,
    retryCallback: () => Promise<void>,
    _options: RecoveryOptions = {}
  ): boolean {
    const state = this.recoveryStates.get(url);
    if (!state || !state.canRetry || !state.nextRetryAt) {
      return false;
    }

    // Clear existing timeout
    const existingTimeout = this.retryTimeouts.get(url);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const delay = state.nextRetryAt.getTime() - Date.now();
    
    const timeout = setTimeout(async () => {
      try {
        await retryCallback();
        this.clearRecoveryState(url);
      } catch (error) {
        console.error(`Retry failed for ${url}:`, error);
        // The retry callback should handle the error and call handleImageError again
      } finally {
        this.retryTimeouts.delete(url);
      }
    }, Math.max(0, delay));

    this.retryTimeouts.set(url, timeout);
    return true;
  }

  /**
   * Manually retry an image (user-initiated)
   */
  public async manualRetry(
    url: string,
    retryCallback: () => Promise<void>,
    _options: RecoveryOptions = {}
  ): Promise<void> {
    // Clear any scheduled retry
    const existingTimeout = this.retryTimeouts.get(url);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.retryTimeouts.delete(url);
    }

    // Reset attempts for manual retry
    const state = this.recoveryStates.get(url);
    if (state) {
      state.attempts = 0;
      state.canRetry = true;
      state.shouldSkip = false;
    }

    try {
      await retryCallback();
      this.clearRecoveryState(url);
    } catch (error) {
      console.error(`Manual retry failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Skip an image (user-initiated or automatic)
   */
  public skipImage(url: string, reason: 'user_request' | 'max_retries' | 'non_retryable'): void {
    const state = this.recoveryStates.get(url);
    if (state) {
      state.shouldSkip = true;
      state.canRetry = false;
    }

    // Clear any scheduled retry
    const existingTimeout = this.retryTimeouts.get(url);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.retryTimeouts.delete(url);
    }

    // Report skip event
    errorService.handleError(
      new Error(`Image skipped: ${reason}`),
      {
        context: {
          url,
          reason,
          recoveryState: state
        }
      }
    );
  }

  /**
   * Get recovery state for an image
   */
  public getRecoveryState(url: string): RecoveryState | null {
    return this.recoveryStates.get(url) || null;
  }

  /**
   * Get user-friendly error message
   */
  public getUserErrorMessage(error: ImageLoadError, attempts: number): string {
    switch (error.type) {
      case 'timeout':
        return attempts === 1 
          ? 'Image is taking longer than expected to load. This might be due to a slow connection.'
          : `Image loading timed out after ${attempts} attempts. Your connection might be slow.`;
      
      case 'network':
        return attempts === 1
          ? 'Unable to load image due to network issues. Please check your connection.'
          : `Network error after ${attempts} attempts. Please check your internet connection.`;
      
      case 'offline':
        return 'You appear to be offline. The image will load automatically when your connection is restored.';
      
      case 'slow_connection':
        return 'Slow connection detected. Images may take longer to load than usual.';
      
      case 'cors':
        return 'This image cannot be displayed due to security restrictions.';
      
      case 'server_error':
        return 'The image server is not responding. This issue has been reported.';
      
      case 'invalid_url':
        return 'This image appears to be corrupted or in an unsupported format.';
      
      default:
        return attempts === 1
          ? 'Failed to load image. Retrying automatically...'
          : `Failed to load image after ${attempts} attempts.`;
    }
  }

  /**
   * Get recovery action suggestions
   */
  public getRecoveryActions(error: ImageLoadError, state: RecoveryState): Array<{
    label: string;
    action: 'retry' | 'skip' | 'refresh' | 'wait';
    primary?: boolean;
  }> {
    const actions: Array<{ label: string; action: 'retry' | 'skip' | 'refresh' | 'wait'; primary?: boolean }> = [];

    if (state.canRetry) {
      if (error.type === 'offline') {
        actions.push({ label: 'Wait for Connection', action: 'wait', primary: true });
      } else if (error.type === 'slow_connection') {
        actions.push({ label: 'Keep Waiting', action: 'wait', primary: true });
        actions.push({ label: 'Try Again', action: 'retry' });
      } else {
        actions.push({ label: 'Try Again', action: 'retry', primary: true });
      }
    }

    if (error.type === 'cors' || error.type === 'invalid_url' || state.attempts >= 3) {
      actions.push({ label: 'Skip Image', action: 'skip', primary: !state.canRetry });
    }

    if (error.type === 'server_error' || error.type === 'network') {
      actions.push({ label: 'Refresh Page', action: 'refresh' });
    }

    return actions;
  }

  /**
   * Clear recovery state for an image
   */
  public clearRecoveryState(url: string): void {
    this.recoveryStates.delete(url);
    
    const timeout = this.retryTimeouts.get(url);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(url);
    }
  }

  /**
   * Clear all recovery states
   */
  public clearAllRecoveryStates(): void {
    this.recoveryStates.clear();
    
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  /**
   * Get statistics about recovery attempts
   */
  public getRecoveryStats(): {
    totalImages: number;
    retrying: number;
    skipped: number;
    recovered: number;
  } {
    const states = Array.from(this.recoveryStates.values());
    
    return {
      totalImages: states.length,
      retrying: states.filter(s => s.canRetry).length,
      skipped: states.filter(s => s.shouldSkip).length,
      recovered: 0 // This would need to be tracked separately
    };
  }

  /**
   * Determine if an error is retryable
   */
  private canRetry(error: ImageLoadError, attempts: number, strategy: RetryStrategy): boolean {
    // Don't retry if max attempts reached
    if (attempts >= strategy.maxRetries) {
      return false;
    }

    // Don't retry non-retryable errors
    if (!error.retryable) {
      return false;
    }

    // Special handling for specific error types
    switch (error.type) {
      case 'cors':
      case 'invalid_url':
        return false; // Never retry these
      
      case 'offline':
        return true; // Always retryable when back online
      
      case 'slow_connection':
        return attempts < 2; // Only retry once for slow connections
      
      default:
        return true;
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(
    attempts: number,
    strategy: RetryStrategy,
    error: ImageLoadError
  ): number {
    // Use error-specific retry delay if provided
    if (error.retryAfter) {
      return error.retryAfter;
    }

    // Calculate exponential backoff
    let delay = strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempts - 1);
    
    // Cap at maximum delay
    delay = Math.min(delay, strategy.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (strategy.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    // Special handling for offline errors - wait for online event instead
    if (error.type === 'offline') {
      return 0; // Will be handled by offline service
    }

    return Math.max(0, Math.round(delay));
  }

  /**
   * Report image error to error service
   */
  private reportImageError(
    url: string,
    error: ImageLoadError,
    state: RecoveryState,
    context: Record<string, any>
  ): void {
    errorService.handleError(
      new Error(`Image loading failed: ${error.message}`),
      {
        context: {
          ...context,
          imageUrl: url,
          errorType: error.type,
          attempts: state.attempts,
          retryable: error.retryable,
          recoveryState: state
        },
        reportToServer: error.type === 'server_error' || state.attempts >= 3
      }
    );
  }

  /**
   * Show user-friendly error message
   */
  private showUserErrorMessage(
    url: string,
    error: ImageLoadError,
    state: RecoveryState
  ): void {
    const message = this.getUserErrorMessage(error, state.attempts);
    
    // This could be enhanced to show toast notifications
    console.warn(`Image Error (${url}): ${message}`);
  }
}

// Create and export singleton instance
export const errorRecoveryService = new ErrorRecoveryService();

// Export class for testing
export { ErrorRecoveryService };