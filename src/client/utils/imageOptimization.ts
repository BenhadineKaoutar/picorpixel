/**
 * Image optimization utilities for mobile performance
 */

export interface ImageLoadOptions {
  lazy?: boolean;
  placeholder?: string;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  sizes?: string;
  priority?: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Image optimization and loading utilities
 */
export class ImageOptimizer {
  private static loadedImages = new Set<string>();
  private static preloadQueue: string[] = [];
  private static isPreloading = false;

  /**
   * Generate optimized image URL with query parameters
   */
  static getOptimizedUrl(
    originalUrl: string, 
    options: ImageLoadOptions = {}
  ): string {
    const url = new URL(originalUrl, window.location.origin);
    
    // Add optimization parameters if supported by the image service
    if (options.quality && options.quality !== 100) {
      url.searchParams.set('q', options.quality.toString());
    }
    
    if (options.format && options.format !== 'auto') {
      url.searchParams.set('f', options.format);
    }
    
    return url.toString();
  }

  /**
   * Create a blur placeholder data URL
   */
  static createBlurPlaceholder(
    width: number = 40, 
    height: number = 40, 
    color: string = '#e5e7eb'
  ): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${color}"/>
        </svg>
      `)}`;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Create gradient blur effect
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, '#f3f4f6');
    gradient.addColorStop(1, color);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL('image/jpeg', 0.1);
  }

  /**
   * Preload an image and return a promise
   */
  static preloadImage(url: string, options: ImageLoadOptions = {}): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.loadedImages.has(url)) {
        const img = new Image();
        img.src = url;
        resolve(img);
        return;
      }

      const img = new Image();
      
      // Set up event listeners
      const handleLoad = () => {
        this.loadedImages.add(url);
        cleanup();
        resolve(img);
      };
      
      const handleError = () => {
        cleanup();
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      const cleanup = () => {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
      };
      
      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);
      
      // Set crossOrigin if needed
      if (this.isCrossOrigin(url)) {
        img.crossOrigin = 'anonymous';
      }
      
      // Start loading
      img.src = this.getOptimizedUrl(url, options);
    });
  }

  /**
   * Preload multiple images with priority queue
   */
  static async preloadImages(
    urls: string[], 
    options: ImageLoadOptions = {},
    maxConcurrent: number = 3
  ): Promise<HTMLImageElement[]> {
    const results: HTMLImageElement[] = [];
    const errors: Error[] = [];
    
    // Process images in batches
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(url => 
        this.preloadImage(url, options).catch(error => {
          errors.push(error);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as HTMLImageElement[]);
    }
    
    if (errors.length > 0) {
      console.warn(`Failed to preload ${errors.length} images:`, errors);
    }
    
    return results;
  }

  /**
   * Get image dimensions without loading the full image
   */
  static getImageDimensions(url: string): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to get dimensions for image: ${url}`));
      };
      
      img.src = url;
    });
  }

  /**
   * Check if URL is cross-origin
   */
  private static isCrossOrigin(url: string): boolean {
    try {
      const imageUrl = new URL(url, window.location.origin);
      return imageUrl.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Compress image using canvas (client-side)
   */
  static compressImage(
    file: File, 
    quality: number = 0.8, 
    maxWidth: number = 1920, 
    maxHeight: number = 1080
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create responsive image srcset
   */
  static createSrcSet(baseUrl: string, sizes: number[]): string {
    return sizes
      .map(size => `${this.getOptimizedUrl(baseUrl, { quality: 85 })} ${size}w`)
      .join(', ');
  }

  /**
   * Check if WebP is supported
   */
  static supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Get optimal image format based on browser support
   */
  static async getOptimalFormat(): Promise<'webp' | 'jpeg'> {
    const supportsWebP = await this.supportsWebP();
    return supportsWebP ? 'webp' : 'jpeg';
  }

  /**
   * Clear image cache
   */
  static clearCache(): void {
    this.loadedImages.clear();
    this.preloadQueue = [];
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    loadedCount: number;
    queueLength: number;
  } {
    return {
      loadedCount: this.loadedImages.size,
      queueLength: this.preloadQueue.length,
    };
  }
}

/**
 * Intersection Observer for lazy loading
 */
export class LazyImageObserver {
  private observer: IntersectionObserver | null = null;
  private images = new Map<Element, () => void>();

  constructor(options: IntersectionObserverInit = {}) {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: '50px',
          threshold: 0.1,
          ...options,
        }
      );
    }
  }

  /**
   * Observe an element for lazy loading
   */
  observe(element: Element, callback: () => void): void {
    if (!this.observer) {
      // Fallback: load immediately if IntersectionObserver not supported
      callback();
      return;
    }

    this.images.set(element, callback);
    this.observer.observe(element);
  }

  /**
   * Stop observing an element
   */
  unobserve(element: Element): void {
    if (this.observer) {
      this.observer.unobserve(element);
    }
    this.images.delete(element);
  }

  /**
   * Handle intersection changes
   */
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const callback = this.images.get(entry.target);
        if (callback) {
          callback();
          this.unobserve(entry.target);
        }
      }
    });
  }

  /**
   * Disconnect observer
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.images.clear();
  }
}

// Create global lazy image observer instance
export const lazyImageObserver = new LazyImageObserver();
