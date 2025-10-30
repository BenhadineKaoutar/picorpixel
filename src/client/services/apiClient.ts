import { ApiResponse, ErrorResponse } from '../../shared/types/api';
import { errorService } from './errorService';
import { offlineService } from './offlineService';
import { performanceService } from './performanceService';

// Configuration for API client
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableOfflineDetection?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  baseUrl: '/api',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  enableOfflineDetection: true,
};

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 100, // Max requests per window
  windowMs: 60000, // 1 minute window
};

// Request queue for rate limiting
// QueuedRequest interface for future rate limiting implementation
// interface QueuedRequest {
//   timestamp: number;
//   resolve: (value: any) => void;
//   reject: (error: any) => void;
//   requestFn: () => Promise<any>;
// }

class ApiClient {
  private config: Required<ApiClientConfig>;
  // Request queue for future rate limiting implementation
  // private requestQueue: QueuedRequest[] = [];
  private requestTimestamps: number[] = [];
  private isOnline: boolean = navigator.onLine;
  private offlineCallbacks: Set<() => void> = new Set();
  private onlineCallbacks: Set<() => void> = new Set();

  constructor(config: ApiClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableOfflineDetection) {
      this.setupOfflineDetection();
    }
  }

  /**
   * Setup offline/online detection
   */
  private setupOfflineDetection(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onlineCallbacks.forEach((callback) => callback());
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.offlineCallbacks.forEach((callback) => callback());
    });
  }

  /**
   * Register callback for offline state
   */
  public onOffline(callback: () => void): () => void {
    this.offlineCallbacks.add(callback);
    return () => this.offlineCallbacks.delete(callback);
  }

  /**
   * Register callback for online state
   */
  public onOnline(callback: () => void): () => void {
    this.onlineCallbacks.add(callback);
    return () => this.onlineCallbacks.delete(callback);
  }

  /**
   * Check if client is online
   */
  public get online(): boolean {
    return this.isOnline;
  }

  /**
   * Rate limiting check
   */
  private canMakeRequest(): boolean {
    const now = Date.now();

    // Remove timestamps outside the current window
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_CONFIG.windowMs
    );

    return this.requestTimestamps.length < RATE_LIMIT_CONFIG.maxRequests;
  }

  /**
   * Add request timestamp for rate limiting
   */
  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay
   */
  private getRetryDelay(attempt: number): number {
    return this.config.retryDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Server errors (5xx) are retryable
    if (error.status >= 500) {
      return true;
    }

    // Rate limit errors are retryable
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<ErrorResponse> {
    try {
      const errorData = await response.json();
      return errorData as ErrorResponse;
    } catch {
      return {
        error: {
          code: `HTTP_${response.status}`,
          message: response.statusText || 'Unknown error occurred',
        },
      };
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    attempt: number = 1
  ): Promise<T> {
    const startTime = performance.now();
    // Check if offline
    if (!this.isOnline) {
      const error = new ApiError('No internet connection. Please check your network and try again.', 0);
      errorService.handleNetworkError(error, { url, method: options.method || 'GET' });
      
      // Queue for offline processing if it's a POST request
      if (options.method === 'POST' && options.body) {
        offlineService.queueOfflineAction('api_call', {
          url: `${this.config.baseUrl}${url}`,
          method: options.method,
          body: JSON.parse(options.body as string),
          headers: options.headers,
        });
      }
      
      throw error;
    }

    // Rate limiting check
    if (!this.canMakeRequest()) {
      const error = new ApiError('Rate limit exceeded. Please wait before making more requests.', 429);
      errorService.handleApiError(error, { url, attempt });
      throw error;
    }

    try {
      // Record request for rate limiting
      this.recordRequest();

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      // Make the request
      const response = await fetch(`${this.config.baseUrl}${url}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle non-ok responses
      if (!response.ok) {
        const errorResponse = await this.parseErrorResponse(response);
        const apiError = new ApiError(errorResponse.error.message, response.status, errorResponse);

        // Record failed API call performance
        const duration = performance.now() - startTime;
        performanceService.recordApiCall(url, options.method || 'GET', duration, response.status);
        
        // Log API error
        errorService.handleApiError(apiError, { url, method: options.method || 'GET', attempt });

        // Check if we should retry
        if (
          attempt < this.config.maxRetries &&
          this.isRetryableError({ status: response.status })
        ) {
          const delay = this.getRetryDelay(attempt);
          await this.sleep(delay);
          return this.makeRequest<T>(url, options, attempt + 1);
        }

        throw apiError;
      }

      // Parse successful response
      const data = await response.json();
      
      // Record successful API call performance
      const duration = performance.now() - startTime;
      const responseSize = JSON.stringify(data).length;
      performanceService.recordApiCall(url, options.method || 'GET', duration, response.status, responseSize);
      
      return data as T;
    } catch (error) {
      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        const duration = performance.now() - startTime;
        performanceService.recordApiCall(url, options.method || 'GET', duration, 408);
        
        const timeoutError = new ApiError('Request timeout. Please try again.', 408);
        errorService.handleApiError(timeoutError, { url, method: options.method || 'GET', attempt });
        throw timeoutError;
      }

      // Handle network errors with retry
      if (attempt < this.config.maxRetries && this.isRetryableError(error)) {
        const delay = this.getRetryDelay(attempt);
        await this.sleep(delay);
        return this.makeRequest<T>(url, options, attempt + 1);
      }

      // Re-throw ApiError as-is (already logged)
      if (error instanceof ApiError) {
        throw error;
      }

      // Record network error performance
      const duration = performance.now() - startTime;
      performanceService.recordApiCall(url, options.method || 'GET', duration, 0);
      
      // Wrap and log other errors
      const networkError = new ApiError(error instanceof Error ? error.message : 'Network error occurred', 0);
      errorService.handleNetworkError(networkError, { url, method: options.method || 'GET', attempt });
      throw networkError;
    }
  }

  /**
   * GET request
   */
  public async get<T extends ApiResponse>(url: string): Promise<T> {
    return this.makeRequest<T>(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  public async post<T extends ApiResponse>(url: string, data?: any): Promise<T> {
    const options: RequestInit = {
      method: 'POST',
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    return this.makeRequest<T>(url, options);
  }

  /**
   * PUT request
   */
  public async put<T extends ApiResponse>(url: string, data?: any): Promise<T> {
    const options: RequestInit = {
      method: 'PUT',
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    return this.makeRequest<T>(url, options);
  }

  /**
   * DELETE request
   */
  public async delete<T extends ApiResponse>(url: string): Promise<T> {
    return this.makeRequest<T>(url, { method: 'DELETE' });
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly response?: ErrorResponse | undefined;

  constructor(message: string, status: number, response?: ErrorResponse | undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }

  /**
   * Check if error is a network error
   */
  public get isNetworkError(): boolean {
    return this.status === 0;
  }

  /**
   * Check if error is a timeout
   */
  public get isTimeout(): boolean {
    return this.status === 408;
  }

  /**
   * Check if error is rate limited
   */
  public get isRateLimited(): boolean {
    return this.status === 429;
  }

  /**
   * Check if error is server error
   */
  public get isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Get retry after time from response
   */
  public get retryAfter(): number | undefined {
    return this.response?.error.retryAfter;
  }
}

// Create and export default instance
export const apiClient = new ApiClient();

// Export class for custom instances
export { ApiClient };
