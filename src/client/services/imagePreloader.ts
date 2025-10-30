/**
 * ImagePreloader - Optimized image loading system with timeout handling and error recovery
 * 
 * Features:
 * - 5-second timeout per image
 * - Image validation and error recovery
 * - Skip functionality for failed loads
 * - Preloading strategy for first 3 images
 */

export interface ImageLoadResult {
  url: string;
  success: boolean;
  error?: ImageLoadError;
  loadTime?: number;
  dimensions?: { width: number; height: number };
}

export interface ImageLoadError {
  type: 'timeout' | 'network' | 'invalid_url' | 'server_error' | 'cors' | 'offline' | 'slow_connection';
  message: string;
  retryable: boolean;
  retryAfter?: number; // Suggested retry delay in milliseconds
  originalError?: Error | undefined;
}

export interface PreloadOptions {
  timeout?: number; // Default 5000ms
  validateDimensions?: boolean;
  onProgress?: (loaded: number, total: number) => void;
  onImageLoad?: (result: ImageLoadResult) => void;
  offlineMode?: boolean; // Skip loading if offline
  slowConnectionTimeout?: number | undefined; // Extended timeout for slow connections
}

export class ImagePreloader {
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private static readonly MIN_DIMENSIONS = { width: 100, height: 100 };
  private loadingPromises = new Map<string, Promise<ImageLoadResult>>();
  private loadedImages = new Map<string, ImageLoadResult>();

  /**
   * Preload multiple images with progress tracking
   */
  async preloadImages(
    urls: string[], 
    options: PreloadOptions = {}
  ): Promise<ImageLoadResult[]> {
    const {
      timeout = ImagePreloader.DEFAULT_TIMEOUT,
      validateDimensions = true,
      onProgress,
      onImageLoad
    } = options;

    const results: ImageLoadResult[] = [];
    let loadedCount = 0;

    // Start loading all images concurrently
    const loadPromises = urls.map(async (url) => {
      try {
        const result = await this.loadSingleImage(url, { timeout, validateDimensions });
        
        // Update progress
        loadedCount++;
        onProgress?.(loadedCount, urls.length);
        onImageLoad?.(result);
        
        return result;
      } catch (error) {
        const errorResult: ImageLoadResult = {
          url,
          success: false,
          error: this.createImageLoadError(error)
        };
        
        loadedCount++;
        onProgress?.(loadedCount, urls.length);
        onImageLoad?.(errorResult);
        
        return errorResult;
      }
    });

    // Wait for all images to complete (success or failure)
    const allResults = await Promise.allSettled(loadPromises);
    
    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[index] = result.value;
      } else {
        const url = urls[index];
        if (url) {
          results[index] = {
            url,
            success: false,
            error: this.createImageLoadError(result.reason)
          };
        }
      }
    });

    return results;
  }

  /**
   * Load a single image with timeout and validation
   */
  async loadSingleImage(
    url: string, 
    options: { 
      timeout?: number; 
      validateDimensions?: boolean;
      offlineMode?: boolean;
      slowConnectionTimeout?: number;
    } = {}
  ): Promise<ImageLoadResult> {
    const { 
      timeout = ImagePreloader.DEFAULT_TIMEOUT, 
      validateDimensions = true,
      offlineMode = false,
      slowConnectionTimeout
    } = options;

    // Check if offline and skip if in offline mode
    if (offlineMode && !navigator.onLine) {
      return {
        url,
        success: false,
        error: {
          type: 'offline',
          message: 'Device is offline. Please check your internet connection.',
          retryable: true,
          retryAfter: 5000
        }
      };
    }

    // Adjust timeout for slow connections
    const effectiveTimeout = this.getEffectiveTimeout(timeout, slowConnectionTimeout);

    // Return cached result if available
    if (this.loadedImages.has(url)) {
      return this.loadedImages.get(url)!;
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Create new loading promise
    const loadPromise = this.createLoadPromise(url, effectiveTimeout, validateDimensions);
    this.loadingPromises.set(url, loadPromise);

    try {
      const result = await loadPromise;
      this.loadedImages.set(url, result);
      return result;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  /**
   * Validate if an image URL is accessible and valid
   */
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      const result = await this.loadSingleImage(url, { validateDimensions: true });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get image dimensions without fully loading the image
   */
  async getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    const result = await this.loadSingleImage(url, { validateDimensions: true });
    
    if (result.success && result.dimensions) {
      return result.dimensions;
    }
    
    throw new Error(result.error?.message || 'Failed to get image dimensions');
  }

  /**
   * Clear cached images to free memory
   */
  clearCache(): void {
    this.loadedImages.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get loading statistics
   */
  getStats(): { cached: number; loading: number } {
    return {
      cached: this.loadedImages.size,
      loading: this.loadingPromises.size
    };
  }

  /**
   * Get effective timeout based on connection quality
   */
  private getEffectiveTimeout(baseTimeout: number, slowConnectionTimeout?: number): number {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (!connection) return baseTimeout;

    // Extend timeout for slow connections
    if (slowConnectionTimeout && 
        (connection.effectiveType === 'slow-2g' || 
         connection.effectiveType === '2g' ||
         connection.downlink < 1.5)) {
      return slowConnectionTimeout;
    }

    return baseTimeout;
  }

  private async createLoadPromise(
    url: string, 
    timeout: number, 
    validateDimensions: boolean
  ): Promise<ImageLoadResult> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      const img = new Image();
      let resolved = false;

      const resolveOnce = (result: ImageLoadResult) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      // Set up timeout
      const timeoutId = setTimeout(() => {
        resolveOnce({
          url,
          success: false,
          error: {
            type: 'timeout',
            message: `Image loading timed out after ${timeout}ms`,
            retryable: true
          },
          loadTime: performance.now() - startTime
        });
      }, timeout);

      // Handle successful load
      img.onload = () => {
        clearTimeout(timeoutId);
        
        const loadTime = performance.now() - startTime;
        const dimensions = { width: img.naturalWidth, height: img.naturalHeight };

        // Validate dimensions if required
        if (validateDimensions) {
          if (dimensions.width < ImagePreloader.MIN_DIMENSIONS.width || 
              dimensions.height < ImagePreloader.MIN_DIMENSIONS.height) {
            resolveOnce({
              url,
              success: false,
              error: {
                type: 'invalid_url',
                message: `Image dimensions too small: ${dimensions.width}x${dimensions.height}`,
                retryable: false
              },
              loadTime,
              dimensions
            });
            return;
          }
        }

        resolveOnce({
          url,
          success: true,
          loadTime,
          dimensions
        });
      };

      // Handle load errors
      img.onerror = (event) => {
        clearTimeout(timeoutId);
        
        const loadTime = performance.now() - startTime;
        let errorType: ImageLoadError['type'] = 'network';
        let message = 'Failed to load image';
        let retryAfter = 1000; // Default retry delay

        // Check if offline
        if (!navigator.onLine) {
          errorType = 'offline';
          message = 'Device is offline. Please check your internet connection.';
          retryAfter = 5000;
        } else {
          // Try to determine error type
          if (event instanceof ErrorEvent) {
            if (event.message?.includes('CORS')) {
              errorType = 'cors';
              message = 'CORS error: Image not accessible from this domain';
              retryAfter = 0; // Don't retry CORS errors
            } else if (event.message?.includes('404') || event.message?.includes('Not Found')) {
              errorType = 'server_error';
              message = 'Image not found (404)';
              retryAfter = 0; // Don't retry 404 errors
            } else if (event.message?.includes('timeout')) {
              errorType = 'timeout';
              message = 'Image loading timed out';
              retryAfter = 2000;
            }
          }

          // Check for slow connection
          const connection = (navigator as any).connection;
          if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
            errorType = 'slow_connection';
            message = 'Slow connection detected. Image loading may take longer.';
            retryAfter = 5000;
          }
        }

        resolveOnce({
          url,
          success: false,
          error: {
            type: errorType,
            message,
            retryable: errorType === 'network' || errorType === 'timeout' || errorType === 'offline' || errorType === 'slow_connection',
            retryAfter,
            originalError: undefined
          },
          loadTime
        });
      };

      // Start loading
      try {
        img.crossOrigin = 'anonymous'; // Try to handle CORS
        img.src = url;
      } catch (error) {
        clearTimeout(timeoutId);
        resolveOnce({
          url,
          success: false,
          error: {
            type: 'invalid_url',
            message: `Invalid image URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
            retryable: false,
            originalError: error instanceof Error ? error : undefined
          },
          loadTime: performance.now() - startTime
        });
      }
    });
  }

  private createImageLoadError(error: unknown): ImageLoadError {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as ImageLoadError;
    }

    return {
      type: 'network',
      message: error instanceof Error ? error.message : 'Unknown image loading error',
      retryable: true,
      originalError: error instanceof Error ? error : undefined
    };
  }
}

// Export singleton instance
export const imagePreloader = new ImagePreloader();
