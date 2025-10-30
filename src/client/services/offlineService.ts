import { errorService } from './errorService';

export interface OfflineState {
  isOnline: boolean;
  lastOnlineTime?: Date;
  offlineDuration?: number;
  connectionType?: string;
  effectiveType?: string;
}

export interface OfflineAction {
  id: string;
  timestamp: Date;
  type: 'api_call' | 'user_action' | 'game_state';
  data: any;
  retryCount: number;
  maxRetries: number;
}

class OfflineService {
  private isOnline: boolean = navigator.onLine;
  private lastOnlineTime?: Date;
  private offlineActions: OfflineAction[] = [];
  private onlineListeners: Set<() => void> = new Set();
  private offlineListeners: Set<() => void> = new Set();
  private stateChangeListeners: Set<(state: OfflineState) => void> = new Set();
  
  private readonly STORAGE_KEY = 'picorpixel_offline_actions';
  private readonly MAX_OFFLINE_ACTIONS = 100;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    this.setupEventListeners();
    this.loadOfflineActions();
    this.updateConnectionInfo();
  }

  /**
   * Setup event listeners for online/offline detection
   */
  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for connection changes
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', this.handleConnectionChange);
    }
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    const wasOffline = !this.isOnline;
    this.isOnline = true;
    this.updateConnectionInfo();

    if (wasOffline) {
      console.log('Connection restored');
      this.notifyOnlineListeners();
      this.notifyStateChangeListeners();
      this.processOfflineActions();
    }
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    const wasOnline = this.isOnline;
    this.isOnline = false;
    this.lastOnlineTime = new Date();
    this.updateConnectionInfo();

    if (wasOnline) {
      console.log('Connection lost');
      errorService.handleNetworkError(
        new Error('Internet connection lost'),
        { context: 'offline_detection' }
      );
      this.notifyOfflineListeners();
      this.notifyStateChangeListeners();
    }
  };

  /**
   * Handle connection change
   */
  private handleConnectionChange = (): void => {
    this.updateConnectionInfo();
    this.notifyStateChangeListeners();
  };

  /**
   * Update connection information
   */
  private updateConnectionInfo(): void {
    // This will be used for connection quality assessment
  }

  /**
   * Get current offline state
   */
  public getOfflineState(): OfflineState {
    const connection = (navigator as any).connection;
    
    return {
      isOnline: this.isOnline,
      lastOnlineTime: this.lastOnlineTime,
      offlineDuration: this.lastOnlineTime ? Date.now() - this.lastOnlineTime.getTime() : undefined,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
    };
  }

  /**
   * Check if currently online
   */
  public get online(): boolean {
    return this.isOnline;
  }

  /**
   * Queue action for offline processing
   */
  public queueOfflineAction(
    type: OfflineAction['type'],
    data: any,
    maxRetries: number = 3
  ): string {
    const action: OfflineAction = {
      id: this.generateActionId(),
      timestamp: new Date(),
      type,
      data,
      retryCount: 0,
      maxRetries,
    };

    this.offlineActions.push(action);
    this.saveOfflineActions();

    // Limit stored actions
    if (this.offlineActions.length > this.MAX_OFFLINE_ACTIONS) {
      this.offlineActions.splice(0, this.offlineActions.length - this.MAX_OFFLINE_ACTIONS);
      this.saveOfflineActions();
    }

    return action.id;
  }

  /**
   * Process queued offline actions when back online
   */
  private async processOfflineActions(): Promise<void> {
    if (!this.isOnline || this.offlineActions.length === 0) {
      return;
    }

    console.log(`Processing ${this.offlineActions.length} offline actions`);

    const actionsToProcess = [...this.offlineActions];
    this.offlineActions = [];
    this.saveOfflineActions();

    for (const action of actionsToProcess) {
      try {
        await this.processOfflineAction(action);
      } catch (error) {
        console.error('Failed to process offline action:', error);
        
        // Retry if not exceeded max retries
        if (action.retryCount < action.maxRetries) {
          action.retryCount++;
          this.offlineActions.push(action);
        } else {
          errorService.handleError(
            error instanceof Error ? error : new Error('Failed to process offline action'),
            {
              context: {
                action,
                reason: 'max_retries_exceeded',
              },
            }
          );
        }
      }
    }

    if (this.offlineActions.length > 0) {
      this.saveOfflineActions();
      // Retry remaining actions after delay
      setTimeout(() => this.processOfflineActions(), this.RETRY_DELAY);
    }
  }

  /**
   * Process individual offline action
   */
  private async processOfflineAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'api_call':
        await this.processOfflineApiCall(action);
        break;
      case 'user_action':
        await this.processOfflineUserAction(action);
        break;
      case 'game_state':
        await this.processOfflineGameState(action);
        break;
      default:
        console.warn('Unknown offline action type:', action.type);
    }
  }

  /**
   * Process offline API call
   */
  private async processOfflineApiCall(action: OfflineAction): Promise<void> {
    const { url, method, body, headers } = action.data;
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    console.log('Successfully processed offline API call:', action.id);
  }

  /**
   * Process offline user action
   */
  private async processOfflineUserAction(action: OfflineAction): Promise<void> {
    // Handle user actions that were queued while offline
    console.log('Processing offline user action:', action.data);
    
    // This could include things like:
    // - Game guesses that were made offline
    // - Settings changes
    // - Achievement unlocks
    
    // For now, just log the action
    console.log('Offline user action processed:', action.id);
  }

  /**
   * Process offline game state
   */
  private async processOfflineGameState(action: OfflineAction): Promise<void> {
    // Handle game state changes that occurred offline
    console.log('Processing offline game state:', action.data);
    
    // This could include:
    // - Progress updates
    // - Score changes
    // - Session data
    
    console.log('Offline game state processed:', action.id);
  }

  /**
   * Add online listener
   */
  public addOnlineListener(listener: () => void): () => void {
    this.onlineListeners.add(listener);
    return () => this.onlineListeners.delete(listener);
  }

  /**
   * Add offline listener
   */
  public addOfflineListener(listener: () => void): () => void {
    this.offlineListeners.add(listener);
    return () => this.offlineListeners.delete(listener);
  }

  /**
   * Add state change listener
   */
  public addStateChangeListener(listener: (state: OfflineState) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Get pending offline actions count
   */
  public getPendingActionsCount(): number {
    return this.offlineActions.length;
  }

  /**
   * Clear all offline actions
   */
  public clearOfflineActions(): void {
    this.offlineActions = [];
    this.saveOfflineActions();
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save offline actions to localStorage
   */
  private saveOfflineActions(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.offlineActions));
    } catch (error) {
      console.error('Failed to save offline actions:', error);
    }
  }

  /**
   * Load offline actions from localStorage
   */
  private loadOfflineActions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.offlineActions = JSON.parse(stored).map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load offline actions:', error);
      this.offlineActions = [];
    }
  }

  /**
   * Notify online listeners
   */
  private notifyOnlineListeners(): void {
    this.onlineListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('Error in online listener:', error);
      }
    });
  }

  /**
   * Notify offline listeners
   */
  private notifyOfflineListeners(): void {
    this.offlineListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('Error in offline listener:', error);
      }
    });
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChangeListeners(): void {
    const state = this.getOfflineState();
    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  /**
   * Cleanup event listeners
   */
  public destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if ('connection' in navigator) {
      (navigator as any).connection?.removeEventListener('change', this.handleConnectionChange);
    }
  }
}

// Create and export singleton instance
export const offlineService = new OfflineService();

// Export class for testing
export { OfflineService };
