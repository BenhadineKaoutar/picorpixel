import { ImageLoadResult, ImageLoadError } from './imagePreloader';
import { errorRecoveryService, RecoveryState } from './errorRecoveryService';

export interface LoadingState {
  url: string;
  status: 'idle' | 'loading' | 'loaded' | 'error' | 'skipped' | 'retrying';
  progress?: number;
  startTime: Date;
  loadTime?: number;
  error?: ImageLoadError;
  recoveryState?: RecoveryState;
  userMessage?: string;
  showSpinner: boolean;
  showProgress: boolean;
  allowSkip: boolean;
  allowRetry: boolean;
}

export interface LoadingStateManagerOptions {
  maxLoadingTime: number; // Maximum time to show loading state (ms)
  showProgressAfter: number; // Show progress indicator after this time (ms)
  allowSkipAfter: number; // Allow skip after this time (ms)
  persistentLoadingThreshold: number; // Threshold for "persistent loading" detection (ms)
}

/**
 * Manages image loading states to prevent persistent loading indicators
 * and provide clear user feedback about loading progress and errors
 */
class ImageLoadingStateManager {
  private readonly DEFAULT_OPTIONS: LoadingStateManagerOptions = {
    maxLoadingTime: 30000, // 30 seconds
    showProgressAfter: 2000, // 2 seconds
    allowSkipAfter: 5000, // 5 seconds
    persistentLoadingThreshold: 10000 // 10 seconds
  };

  private loadingStates = new Map<string, LoadingState>();
  private stateChangeListeners = new Set<(url: string, state: LoadingState) => void>();
  private globalStateListeners = new Set<(states: Map<string, LoadingState>) => void>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  constructor(private options: Partial<LoadingStateManagerOptions> = {}) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Start loading state for an image
   */
  public startLoading(url: string): LoadingState {
    // Clear any existing state
    this.clearImageState(url);

    const state: LoadingState = {
      url,
      status: 'loading',
      startTime: new Date(),
      showSpinner: true,
      showProgress: false,
      allowSkip: false,
      allowRetry: false,
      userMessage: 'Loading image...'
    };

    this.loadingStates.set(url, state);
    this.scheduleStateUpdates(url);
    this.notifyStateChange(url, state);

    return state;
  }

  /**
   * Update loading progress
   */
  public updateProgress(url: string, progress: number): void {
    const state = this.loadingStates.get(url);
    if (!state || state.status !== 'loading') return;

    state.progress = Math.max(0, Math.min(100, progress));
    
    // Update user message based on progress
    if (progress > 0) {
      state.userMessage = `Loading image... ${Math.round(progress)}%`;
    }

    this.loadingStates.set(url, state);
    this.notifyStateChange(url, state);
  }

  /**
   * Mark image as successfully loaded
   */
  public markLoaded(url: string, result: ImageLoadResult): LoadingState {
    const state = this.loadingStates.get(url);
    if (!state) {
      // Create a new state for already loaded image
      const newState: LoadingState = {
        url,
        status: 'loaded',
        startTime: new Date(),
        loadTime: result.loadTime || 0,
        showSpinner: false,
        showProgress: false,
        allowSkip: false,
        allowRetry: false
      };
      this.loadingStates.set(url, newState);
      return newState;
    }

    state.status = 'loaded';
    state.loadTime = result.loadTime || (Date.now() - state.startTime.getTime());
    state.showSpinner = false;
    state.showProgress = false;
    state.allowSkip = false;
    state.allowRetry = false;
    delete state.userMessage;

    this.clearImageTimeouts(url);
    this.loadingStates.set(url, state);
    this.notifyStateChange(url, state);

    return state;
  }

  /**
   * Mark image as failed with error handling
   */
  public markError(url: string, error: ImageLoadError): LoadingState {
    const state = this.loadingStates.get(url) || this.createDefaultState(url);
    
    // Handle error recovery
    const recoveryState = errorRecoveryService.handleImageError(url, error, {
      showUserMessages: false, // We'll handle messages here
      reportErrors: true
    });

    state.status = recoveryState.canRetry ? 'retrying' : 'error';
    state.error = error;
    state.recoveryState = recoveryState;
    state.showSpinner = recoveryState.canRetry;
    state.showProgress = false;
    state.allowSkip = true;
    state.allowRetry = !recoveryState.canRetry; // Allow manual retry if auto-retry is not possible
    state.userMessage = this.getErrorMessage(error, recoveryState);

    this.clearImageTimeouts(url);
    this.loadingStates.set(url, state);
    this.notifyStateChange(url, state);

    // Schedule auto-retry if applicable
    if (recoveryState.canRetry && recoveryState.nextRetryAt) {
      this.scheduleRetry(url, recoveryState.nextRetryAt);
    }

    return state;
  }

  /**
   * Mark image as skipped
   */
  public markSkipped(url: string, reason: string): LoadingState {
    const state = this.loadingStates.get(url) || this.createDefaultState(url);
    
    state.status = 'skipped';
    state.showSpinner = false;
    state.showProgress = false;
    state.allowSkip = false;
    state.allowRetry = true;
    state.userMessage = `Image skipped: ${reason}`;

    this.clearImageTimeouts(url);
    this.loadingStates.set(url, state);
    this.notifyStateChange(url, state);

    return state;
  }

  /**
   * Retry loading an image
   */
  public retryLoading(url: string): LoadingState {
    const state = this.loadingStates.get(url);
    if (!state) {
      return this.startLoading(url);
    }

    state.status = 'loading';
    state.startTime = new Date();
    delete state.progress;
    delete state.error;
    delete state.recoveryState;
    state.showSpinner = true;
    state.showProgress = false;
    state.allowSkip = false;
    state.allowRetry = false;
    state.userMessage = 'Retrying...';

    this.clearImageTimeouts(url);
    this.scheduleStateUpdates(url);
    this.loadingStates.set(url, state);
    this.notifyStateChange(url, state);

    return state;
  }

  /**
   * Get current state for an image
   */
  public getState(url: string): LoadingState | null {
    return this.loadingStates.get(url) || null;
  }

  /**
   * Get all loading states
   */
  public getAllStates(): Map<string, LoadingState> {
    return new Map(this.loadingStates);
  }

  /**
   * Check if any images are currently loading
   */
  public hasLoadingImages(): boolean {
    return Array.from(this.loadingStates.values()).some(
      state => state.status === 'loading' || state.status === 'retrying'
    );
  }

  /**
   * Get loading statistics
   */
  public getLoadingStats(): {
    total: number;
    loading: number;
    loaded: number;
    error: number;
    skipped: number;
    retrying: number;
  } {
    const states = Array.from(this.loadingStates.values());
    
    return {
      total: states.length,
      loading: states.filter(s => s.status === 'loading').length,
      loaded: states.filter(s => s.status === 'loaded').length,
      error: states.filter(s => s.status === 'error').length,
      skipped: states.filter(s => s.status === 'skipped').length,
      retrying: states.filter(s => s.status === 'retrying').length,
    };
  }

  /**
   * Add state change listener
   */
  public addStateChangeListener(listener: (url: string, state: LoadingState) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Add global state listener
   */
  public addGlobalStateListener(listener: (states: Map<string, LoadingState>) => void): () => void {
    this.globalStateListeners.add(listener);
    return () => this.globalStateListeners.delete(listener);
  }

  /**
   * Clear state for specific image
   */
  public clearImageState(url: string): void {
    this.clearImageTimeouts(url);
    this.loadingStates.delete(url);
  }

  /**
   * Clear all states
   */
  public clearAllStates(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    this.loadingStates.clear();
    this.notifyGlobalStateChange();
  }

  /**
   * Schedule state updates based on timing thresholds
   */
  private scheduleStateUpdates(url: string): void {
    const state = this.loadingStates.get(url);
    if (!state) return;

    // Show progress indicator after delay
    const progressTimeout = setTimeout(() => {
      const currentState = this.loadingStates.get(url);
      if (currentState && currentState.status === 'loading') {
        currentState.showProgress = true;
        currentState.userMessage = 'Loading is taking longer than expected...';
        this.loadingStates.set(url, currentState);
        this.notifyStateChange(url, currentState);
      }
    }, this.options.showProgressAfter);

    // Allow skip after delay
    const skipTimeout = setTimeout(() => {
      const currentState = this.loadingStates.get(url);
      if (currentState && currentState.status === 'loading') {
        currentState.allowSkip = true;
        currentState.userMessage = 'Taking too long? You can skip this image.';
        this.loadingStates.set(url, currentState);
        this.notifyStateChange(url, currentState);
      }
    }, this.options.allowSkipAfter);

    // Detect persistent loading
    const persistentTimeout = setTimeout(() => {
      const currentState = this.loadingStates.get(url);
      if (currentState && currentState.status === 'loading') {
        currentState.userMessage = 'This image seems to be stuck loading. Try skipping or refreshing.';
        currentState.allowRetry = true;
        this.loadingStates.set(url, currentState);
        this.notifyStateChange(url, currentState);
      }
    }, this.options.persistentLoadingThreshold);

    // Force timeout after maximum loading time
    const maxTimeout = setTimeout(() => {
      const currentState = this.loadingStates.get(url);
      if (currentState && currentState.status === 'loading') {
        this.markError(url, {
          type: 'timeout',
          message: `Image loading timed out after ${this.options.maxLoadingTime}ms`,
          retryable: true,
          retryAfter: 2000
        });
      }
    }, this.options.maxLoadingTime);

    // Store timeouts for cleanup
    this.timeouts.set(`${url}_progress`, progressTimeout);
    this.timeouts.set(`${url}_skip`, skipTimeout);
    this.timeouts.set(`${url}_persistent`, persistentTimeout);
    this.timeouts.set(`${url}_max`, maxTimeout);
  }

  /**
   * Schedule retry for an image
   */
  private scheduleRetry(url: string, retryAt: Date): void {
    const delay = retryAt.getTime() - Date.now();
    
    const retryTimeout = setTimeout(() => {
      const state = this.loadingStates.get(url);
      if (state && state.status === 'retrying') {
        // Trigger retry by updating state
        state.userMessage = 'Retrying automatically...';
        this.loadingStates.set(url, state);
        this.notifyStateChange(url, state);
      }
    }, Math.max(0, delay));

    this.timeouts.set(`${url}_retry`, retryTimeout);
  }

  /**
   * Clear timeouts for an image
   */
  private clearImageTimeouts(url: string): void {
    const timeoutKeys = [`${url}_progress`, `${url}_skip`, `${url}_persistent`, `${url}_max`, `${url}_retry`];
    
    timeoutKeys.forEach(key => {
      const timeout = this.timeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.timeouts.delete(key);
      }
    });
  }

  /**
   * Create default state for an image
   */
  private createDefaultState(url: string): LoadingState {
    return {
      url,
      status: 'idle',
      startTime: new Date(),
      showSpinner: false,
      showProgress: false,
      allowSkip: false,
      allowRetry: false
    };
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: ImageLoadError, recoveryState: RecoveryState): string {
    const baseMessage = errorRecoveryService.getUserErrorMessage(error, recoveryState.attempts);
    
    if (recoveryState.canRetry && recoveryState.nextRetryAt) {
      const retryIn = Math.ceil((recoveryState.nextRetryAt.getTime() - Date.now()) / 1000);
      return `${baseMessage} Retrying in ${retryIn} seconds...`;
    }
    
    return baseMessage;
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(url: string, state: LoadingState): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(url, state);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
    
    this.notifyGlobalStateChange();
  }

  /**
   * Notify global state change listeners
   */
  private notifyGlobalStateChange(): void {
    this.globalStateListeners.forEach(listener => {
      try {
        listener(new Map(this.loadingStates));
      } catch (error) {
        console.error('Error in global state listener:', error);
      }
    });
  }
}

// Create and export singleton instance
export const imageLoadingStateManager = new ImageLoadingStateManager();

// Export class for testing
export { ImageLoadingStateManager };