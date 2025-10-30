import { ApiError } from './apiClient';

export interface ErrorReport {
  id: string;
  timestamp: string;
  type: 'api' | 'network' | 'runtime' | 'validation' | 'unknown';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userAgent: string;
  url: string;
  userId?: string;
}

export interface ErrorHandlerOptions {
  showUserMessage?: boolean;
  logToConsole?: boolean;
  storeLocally?: boolean;
  reportToServer?: boolean;
  context?: Record<string, any>;
}

class ErrorService {
  private readonly MAX_STORED_ERRORS = 50;
  private readonly STORAGE_KEY = 'picorpixel_error_reports';
  private errorListeners: Set<(error: ErrorReport) => void> = new Set();

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers for unhandled errors
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(
        new Error(event.message),
        {
          type: 'runtime',
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        }
      );
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          type: 'runtime',
          context: { unhandledPromise: true },
        }
      );
    });
  }

  /**
   * Handle an error with comprehensive logging and reporting
   */
  public handleError(
    error: Error | ApiError | string,
    options: ErrorHandlerOptions = {}
  ): ErrorReport {
    const {
      showUserMessage = false,
      logToConsole = true,
      storeLocally = true,
      reportToServer = false,
      context = {},
    } = options;

    // Normalize error to Error object
    const normalizedError = this.normalizeError(error);
    
    // Determine error type
    const errorType = this.determineErrorType(normalizedError);
    
    // Create error report
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      type: errorType,
      message: normalizedError.message,
      stack: normalizedError.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console if enabled
    if (logToConsole) {
      console.error('ErrorService:', errorReport);
    }

    // Store locally if enabled
    if (storeLocally) {
      this.storeErrorLocally(errorReport);
    }

    // Report to server if enabled
    if (reportToServer) {
      this.reportErrorToServer(errorReport).catch((reportError) => {
        console.error('Failed to report error to server:', reportError);
      });
    }

    // Show user message if enabled
    if (showUserMessage) {
      this.showUserErrorMessage(errorReport);
    }

    // Notify listeners
    this.notifyErrorListeners(errorReport);

    return errorReport;
  }

  /**
   * Handle API errors specifically
   */
  public handleApiError(
    error: ApiError,
    context?: Record<string, any>
  ): ErrorReport {
    const userMessage = this.getApiErrorUserMessage(error);
    
    return this.handleError(error, {
      showUserMessage: true,
      storeLocally: true,
      reportToServer: error.isServerError,
      context: {
        ...context,
        apiError: {
          status: error.status,
          isNetworkError: error.isNetworkError,
          isTimeout: error.isTimeout,
          isRateLimited: error.isRateLimited,
          isServerError: error.isServerError,
          retryAfter: error.retryAfter,
        },
        userMessage,
      },
    });
  }

  /**
   * Handle network connectivity errors
   */
  public handleNetworkError(
    error: Error,
    context?: Record<string, any>
  ): ErrorReport {
    return this.handleError(error, {
      showUserMessage: true,
      storeLocally: true,
      reportToServer: false, // Don't try to report network errors to server
      context: {
        ...context,
        networkStatus: navigator.onLine ? 'online' : 'offline',
        connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      },
    });
  }

  /**
   * Handle validation errors
   */
  public handleValidationError(
    message: string,
    context?: Record<string, any>
  ): ErrorReport {
    return this.handleError(new Error(message), {
      showUserMessage: true,
      logToConsole: true,
      storeLocally: false, // Don't store validation errors
      reportToServer: false,
      context: { ...context, type: 'validation' },
    });
  }

  /**
   * Get stored error reports
   */
  public getStoredErrors(): ErrorReport[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve stored errors:', error);
      return [];
    }
  }

  /**
   * Clear stored error reports
   */
  public clearStoredErrors(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear stored errors:', error);
    }
  }

  /**
   * Add error listener
   */
  public addErrorListener(listener: (error: ErrorReport) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Get user-friendly error message for API errors
   */
  private getApiErrorUserMessage(error: ApiError): string {
    if (error.isNetworkError) {
      return 'Unable to connect to the game server. Please check your internet connection.';
    }

    if (error.isTimeout) {
      return 'The request took too long to complete. Please try again.';
    }

    if (error.isRateLimited) {
      const retryAfter = error.retryAfter ? ` Please wait ${error.retryAfter} seconds before trying again.` : '';
      return `Too many requests. Please slow down.${retryAfter}`;
    }

    if (error.isServerError) {
      return 'The game server is experiencing issues. Please try again in a few moments.';
    }

    if (error.status === 401) {
      return 'Authentication required. Please refresh the page and try again.';
    }

    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }

    if (error.status === 404) {
      return 'The requested resource was not found.';
    }

    return error.message || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Normalize different error types to Error object
   */
  private normalizeError(error: Error | ApiError | string): Error {
    if (typeof error === 'string') {
      return new Error(error);
    }
    return error;
  }

  /**
   * Determine error type based on error properties
   */
  private determineErrorType(error: Error): ErrorReport['type'] {
    if (error instanceof ApiError) {
      return error.isNetworkError ? 'network' : 'api';
    }

    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'network';
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'validation';
    }

    return 'runtime';
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store error report locally
   */
  private storeErrorLocally(errorReport: ErrorReport): void {
    try {
      const existingErrors = this.getStoredErrors();
      existingErrors.push(errorReport);

      // Keep only the most recent errors
      if (existingErrors.length > this.MAX_STORED_ERRORS) {
        existingErrors.splice(0, existingErrors.length - this.MAX_STORED_ERRORS);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingErrors));
    } catch (error) {
      console.error('Failed to store error locally:', error);
    }
  }

  /**
   * Report error to server
   */
  private async reportErrorToServer(errorReport: ErrorReport): Promise<void> {
    try {
      // Only report in production or when explicitly enabled
      if (process.env.NODE_ENV !== 'production') {
        return;
      }

      await fetch('/api/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    } catch (error) {
      // Silently fail - don't create infinite error loops
      console.debug('Failed to report error to server:', error);
    }
  }

  /**
   * Show user-friendly error message
   */
  private showUserErrorMessage(errorReport: ErrorReport): void {
    // This could be enhanced to show toast notifications or modal dialogs
    // For now, we'll just log to console in a user-friendly way
    console.warn(`Game Error: ${errorReport.message}`);
  }

  /**
   * Notify error listeners
   */
  private notifyErrorListeners(errorReport: ErrorReport): void {
    this.errorListeners.forEach((listener) => {
      try {
        listener(errorReport);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }
}

// Create and export singleton instance
export const errorService = new ErrorService();

// Export class for testing
export { ErrorService };
