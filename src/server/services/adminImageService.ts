import { redis } from '@devvit/web/server';
import { AdminImageUpload, StoredImage, ImageValidationResult } from '../../shared/types/admin';

export class AdminImageService {
  private static readonly IMAGE_KEY_PREFIX = 'admin:image:';
  private static readonly IMAGE_LIST_KEY = 'admin:images:list';
  private static readonly IMAGE_COUNTER_KEY = 'admin:image_counter';

  /**
   * Validate an image URL by checking accessibility and format
   */
  static async validateImageUrl(url: string): Promise<ImageValidationResult> {
    try {
      // Basic URL validation
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          valid: false,
          accessible: false,
          format: 'unknown',
          dimensions: { width: 0, height: 0 },
          errors: ['Only HTTP and HTTPS URLs are allowed'],
        };
      }

      // Check if URL is from supported image hosting services
      const supportedHosts = [
        'i.ibb.co',
        'i.imgur.com',
        'imgur.com',
        'cdn.discordapp.com',
        'media.discordapp.net',
        'i.postimg.cc',
        'postimg.cc',
        'via.placeholder.com',
        'picsum.photos',
        'images.unsplash.com',
        'source.unsplash.com',
      ];

      const hostname = urlObj.hostname.toLowerCase();
      const isFromSupportedHost = supportedHosts.some(
        (host) => hostname === host || hostname.endsWith('.' + host)
      );

      if (!isFromSupportedHost) {
        console.warn(`Image URL from unsupported host: ${hostname}`);
        // Don't reject, but warn - allow for flexibility
      }

      // Try to fetch the image to validate accessibility
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'PicOrPixel-Bot/1.0',
          'Accept': 'image/*',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        return {
          valid: false,
          accessible: false,
          format: 'unknown',
          dimensions: { width: 0, height: 0 },
          errors: [`HTTP ${response.status}: ${response.statusText}`],
        };
      }

      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');

      // Check if it's an image
      if (!contentType.startsWith('image/')) {
        return {
          valid: false,
          accessible: true,
          format: 'unknown',
          dimensions: { width: 0, height: 0 },
          errors: ['URL does not point to an image'],
        };
      }

      // Extract format from content type
      const format = contentType.split('/')[1]?.split(';')[0] || 'unknown';

      // Validate image format
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      if (!supportedFormats.includes(format.toLowerCase())) {
        return {
          valid: false,
          accessible: true,
          format,
          dimensions: { width: 0, height: 0 },
          errors: [
            `Unsupported image format: ${format}. Supported formats: ${supportedFormats.join(', ')}`,
          ],
        };
      }

      // Check file size (if available)
      const fileSize = contentLength ? parseInt(contentLength) : undefined;
      const maxSize = 10 * 1024 * 1024; // 10MB limit

      if (fileSize && fileSize > maxSize) {
        return {
          valid: false,
          accessible: true,
          format,
          dimensions: { width: 0, height: 0 },
          errors: ['Image file size exceeds 10MB limit'],
        };
      }

      // For better validation, try to get actual image dimensions
      let dimensions = { width: 800, height: 600 }; // Default placeholder

      try {
        // For some services, we can extract dimensions from URL patterns
        dimensions = this.extractDimensionsFromUrl(url) || dimensions;
      } catch (error) {
        // Ignore dimension extraction errors
        console.debug('Could not extract dimensions from URL:', error);
      }

      const result: ImageValidationResult = {
        valid: true,
        accessible: true,
        format,
        dimensions,
      };

      if (fileSize !== undefined) {
        result.fileSize = fileSize;
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          valid: false,
          accessible: false,
          format: 'unknown',
          dimensions: { width: 0, height: 0 },
          errors: ['Request timeout - image URL took too long to respond'],
        };
      }

      return {
        valid: false,
        accessible: false,
        format: 'unknown',
        dimensions: { width: 0, height: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      };
    }
  }

  /**
   * Validate base64 image data
   */
  static async validateBase64Image(base64Data: string): Promise<ImageValidationResult> {
    try {
      // Check if it's a valid data URL
      if (!base64Data.startsWith('data:image/')) {
        return {
          valid: false,
          accessible: false,
          format: 'unknown',
          dimensions: { width: 0, height: 0 },
          errors: ['Invalid base64 image format'],
        };
      }

      // Extract MIME type and data
      const [header, data] = base64Data.split(',');
      if (!header || !data) {
        return {
          valid: false,
          accessible: false,
          format: 'unknown',
          dimensions: { width: 0, height: 0 },
          errors: ['Invalid base64 data structure'],
        };
      }

      // Extract format from MIME type
      const mimeMatch = header.match(/data:image\/([^;]+)/);
      const format: string = mimeMatch?.[1] || 'unknown';

      // Validate image format
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      if (!supportedFormats.includes(format.toLowerCase())) {
        return {
          valid: false,
          accessible: true,
          format,
          dimensions: { width: 0, height: 0 },
          errors: [
            `Unsupported image format: ${format}. Supported formats: ${supportedFormats.join(', ')}`,
          ],
        };
      }

      // Calculate file size from base64 data
      const fileSize = Math.round((data.length * 3) / 4); // Approximate size in bytes
      const maxSize = 5 * 1024 * 1024; // 5MB limit for direct uploads

      if (fileSize > maxSize) {
        return {
          valid: false,
          accessible: true,
          format,
          dimensions: { width: 0, height: 0 },
          errors: ['Image file size exceeds 5MB limit'],
        };
      }

      // For base64 images, we can't easily get dimensions without decoding
      // We'll use placeholder dimensions for now
      const dimensions = { width: 800, height: 600 };

      return {
        valid: true,
        accessible: true,
        format,
        dimensions,
        fileSize,
      };
    } catch (error) {
      return {
        valid: false,
        accessible: false,
        format: 'unknown',
        dimensions: { width: 0, height: 0 },
        errors: [error instanceof Error ? error.message : 'Base64 validation error'],
      };
    }
  }

  /**
   * Extract dimensions from URL patterns (for services that include dimensions in URL)
   */
  private static extractDimensionsFromUrl(url: string): { width: number; height: number } | null {
    try {
      const urlObj = new URL(url);

      // via.placeholder.com pattern: https://via.placeholder.com/400x300
      if (urlObj.hostname === 'via.placeholder.com') {
        const match = urlObj.pathname.match(/\/(\d+)x(\d+)/);
        if (match && match[1] && match[2]) {
          return { width: parseInt(match[1]), height: parseInt(match[2]) };
        }
        const singleMatch = urlObj.pathname.match(/\/(\d+)/);
        if (singleMatch && singleMatch[1]) {
          const size = parseInt(singleMatch[1]);
          return { width: size, height: size };
        }
      }

      // picsum.photos pattern: https://picsum.photos/400/300
      if (urlObj.hostname === 'picsum.photos') {
        const match = urlObj.pathname.match(/\/(\d+)\/(\d+)/);
        if (match && match[1] && match[2]) {
          return { width: parseInt(match[1]), height: parseInt(match[2]) };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Add new images to the admin collection (now supports base64 data)
   */
  static async addImages(
    images: AdminImageUpload[],
    addedBy: string
  ): Promise<{
    success: boolean;
    addedImages: StoredImage[];
    errors: string[];
  }> {
    const addedImages: StoredImage[] = [];
    const errors: string[] = [];

    for (const imageData of images) {
      try {
        // Check if this is base64 data or URL
        const isBase64 = imageData.url.startsWith('data:image/');

        let validation: ImageValidationResult;

        if (isBase64) {
          // Validate base64 image data
          validation = await this.validateBase64Image(imageData.url);
        } else {
          // Validate URL (legacy support)
          validation = await this.validateImageUrl(imageData.url);
        }

        if (!validation.valid) {
          errors.push(`Image validation failed: ${validation.errors?.[0] || 'Invalid image'}`);
          continue;
        }

        // Generate unique ID for the image
        const imageId = await this.generateImageId();

        const storedImage: StoredImage = {
          id: imageId,
          url: imageData.url, // Store base64 data or URL
          isAIGenerated: imageData.isAIGenerated,
          difficulty: imageData.difficulty,
          source: imageData.source,
          addedBy,
          addedAt: new Date(),
          tags: imageData.tags || [],
          validationStatus: 'valid',
          lastValidated: new Date(),
        };

        if (imageData.description) {
          storedImage.description = imageData.description;
        }

        // Store in Redis with base64 data
        await redis.hSet(`${this.IMAGE_KEY_PREFIX}${imageId}`, {
          data: JSON.stringify(storedImage),
          base64Data: isBase64 ? imageData.url : '', // Store base64 separately for efficiency
          mimeType: `image/${validation.format || 'jpeg'}`,
          fileSize: validation.fileSize?.toString() || '0',
        });

        // Add to the images list (using hash set approach)
        await redis.hSet(this.IMAGE_LIST_KEY, { [imageId]: '1' });

        addedImages.push(storedImage);
      } catch (error) {
        errors.push(
          `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      success: addedImages.length > 0,
      addedImages,
      errors,
    };
  }

  /**
   * Get images with pagination and filtering
   */
  static async getImages(
    options: {
      limit?: number;
      offset?: number;
      status?: 'pending' | 'valid' | 'invalid';
    } = {}
  ): Promise<{
    images: StoredImage[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // Get all image IDs (using hash keys)
      const imageIdsHash = await redis.hGetAll(this.IMAGE_LIST_KEY);
      const imageIds = Object.keys(imageIdsHash);

      if (imageIds.length === 0) {
        return { images: [], total: 0, hasMore: false };
      }

      // Fetch all images (without base64 data for performance)
      const images: StoredImage[] = [];

      for (const imageId of imageIds) {
        try {
          const imageData = await redis.hGet(`${this.IMAGE_KEY_PREFIX}${imageId}`, 'data');
          if (imageData) {
            const storedImage: StoredImage = JSON.parse(imageData);

            // Apply status filter if specified
            if (options.status && storedImage.validationStatus !== options.status) {
              continue;
            }

            // For listing, replace base64 data with a placeholder to reduce response size
            if (storedImage.url.startsWith('data:image/')) {
              storedImage.url = `data:image/placeholder;base64,${imageId}`; // Use imageId as placeholder
            }

            images.push(storedImage);
          }
        } catch (error) {
          console.error(`Failed to parse image data for ${imageId}:`, error);
        }
      }

      // Sort by addedAt (newest first)
      images.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      const paginatedImages = images.slice(offset, offset + limit);
      const hasMore = offset + limit < images.length;

      return {
        images: paginatedImages,
        total: images.length,
        hasMore,
      };
    } catch (error) {
      console.error('Failed to get images:', error);
      return { images: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get full image data including base64 (for individual image requests)
   */
  static async getImageData(imageId: string): Promise<StoredImage | null> {
    try {
      const imageData = await redis.hGet(`${this.IMAGE_KEY_PREFIX}${imageId}`, 'data');

      if (!imageData) {
        return null;
      }

      return JSON.parse(imageData);
    } catch (error) {
      console.error(`Failed to get image data for ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Delete an image
   */
  static async deleteImage(imageId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if image exists
      const imageData = await redis.hGet(`${this.IMAGE_KEY_PREFIX}${imageId}`, 'data');

      if (!imageData) {
        return { success: false, message: 'Image not found' };
      }

      // Remove from Redis
      await redis.del(`${this.IMAGE_KEY_PREFIX}${imageId}`);
      await redis.hDel(this.IMAGE_LIST_KEY, [imageId]);

      return { success: true, message: 'Image deleted successfully' };
    } catch (error) {
      console.error(`Failed to delete image ${imageId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing image
   */
  static async updateImage(
    imageId: string,
    updates: Partial<AdminImageUpload>
  ): Promise<StoredImage | null> {
    try {
      const imageData = await redis.hGet(`${this.IMAGE_KEY_PREFIX}${imageId}`, 'data');

      if (!imageData) {
        return null;
      }

      const storedImage: StoredImage = JSON.parse(imageData);

      // Apply updates
      if (updates.url !== undefined) storedImage.url = updates.url;
      if (updates.isAIGenerated !== undefined) storedImage.isAIGenerated = updates.isAIGenerated;
      if (updates.difficulty !== undefined) storedImage.difficulty = updates.difficulty;
      if (updates.source !== undefined) storedImage.source = updates.source;
      if (updates.tags !== undefined) storedImage.tags = updates.tags;
      if (updates.description !== undefined) storedImage.description = updates.description;

      // If URL changed, revalidate
      if (updates.url && updates.url !== storedImage.url) {
        const validation = await this.validateImageUrl(updates.url);
        storedImage.validationStatus = validation.valid ? 'valid' : 'invalid';
        storedImage.lastValidated = new Date();
      }

      // Save updated image
      await redis.hSet(`${this.IMAGE_KEY_PREFIX}${imageId}`, {
        data: JSON.stringify(storedImage),
      });

      return storedImage;
    } catch (error) {
      console.error(`Failed to update image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Get a random set of images for daily challenges (with full base64 data)
   */
  static async getRandomImagesForChallenge(count: number = 10): Promise<StoredImage[]> {
    try {
      // Get all image IDs directly (bypassing the optimized getImages method)
      const imageIdsHash = await redis.hGetAll(this.IMAGE_LIST_KEY);
      const imageIds = Object.keys(imageIdsHash);

      console.log(`Found ${imageIds.length} image IDs in Redis: ${imageIds.join(', ')}`);

      if (imageIds.length === 0) {
        console.log('No images found in Redis for daily challenge');
        return [];
      }

      // Fetch all images with full data
      const images: StoredImage[] = [];

      for (const imageId of imageIds) {
        try {
          const imageData = await redis.hGet(`${this.IMAGE_KEY_PREFIX}${imageId}`, 'data');
          if (imageData) {
            const storedImage: StoredImage = JSON.parse(imageData);

            // Only include valid images
            if (storedImage.validationStatus === 'valid') {
              images.push(storedImage); // Keep original base64 data for game use
            }
          }
        } catch (error) {
          console.error(`Failed to parse image data for ${imageId}:`, error);
        }
      }

      console.log(`Found ${images.length} valid images for daily challenge`);

      if (images.length === 0) {
        console.log('No valid images available for daily challenge');
        return [];
      }

      // Shuffle and take the requested count
      const shuffled = [...images].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(count, shuffled.length));
    } catch (error) {
      console.error('Failed to get random images for challenge:', error);
      return [];
    }
  }



  /**
   * Generate a unique image ID
   */
  private static async generateImageId(): Promise<string> {
    const counter = await redis.incrBy(this.IMAGE_COUNTER_KEY, 1);
    return `img_${Date.now()}_${counter}`;
  }

  /**
   * Revalidate an existing image
   */
  static async revalidateImage(imageId: string): Promise<ImageValidationResult | null> {
    try {
      const imageData = await redis.hGet(`${this.IMAGE_KEY_PREFIX}${imageId}`, 'data');

      if (!imageData) {
        return null;
      }

      const storedImage: StoredImage = JSON.parse(imageData);
      const validation = await this.validateImageUrl(storedImage.url);

      // Update validation status
      storedImage.validationStatus = validation.valid ? 'valid' : 'invalid';
      storedImage.lastValidated = new Date();

      await redis.hSet(`${this.IMAGE_KEY_PREFIX}${imageId}`, {
        data: JSON.stringify(storedImage),
      });

      return validation;
    } catch (error) {
      console.error(`Failed to revalidate image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Get statistics about the image collection
   */
  static async getImageStats(): Promise<{
    total: number;
    byStatus: Record<'valid' | 'invalid' | 'pending', number>;
    byDifficulty: Record<'easy' | 'medium' | 'hard', number>;
    byType: Record<'ai' | 'real', number>;
  }> {
    try {
      const { images } = await this.getImages();

      const stats = {
        total: images.length,
        byStatus: { valid: 0, invalid: 0, pending: 0 },
        byDifficulty: { easy: 0, medium: 0, hard: 0 },
        byType: { ai: 0, real: 0 },
      };

      images.forEach((image) => {
        stats.byStatus[image.validationStatus]++;
        stats.byDifficulty[image.difficulty]++;
        stats.byType[image.isAIGenerated ? 'ai' : 'real']++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get image stats:', error);
      return {
        total: 0,
        byStatus: { valid: 0, invalid: 0, pending: 0 },
        byDifficulty: { easy: 0, medium: 0, hard: 0 },
        byType: { ai: 0, real: 0 },
      };
    }
  }

  /**
   * Bulk revalidate all images
   */
  static async revalidateAllImages(): Promise<{
    processed: number;
    updated: number;
    errors: string[];
  }> {
    try {
      const { images } = await this.getImages();
      let processed = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const image of images) {
        try {
          processed++;
          const validation = await this.validateImageUrl(image.url);

          const newStatus = validation.valid ? 'valid' : 'invalid';
          if (newStatus !== image.validationStatus) {
            await this.updateImageValidationStatus(image.id, newStatus);
            updated++;
          }
        } catch (error) {
          errors.push(`${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { processed, updated, errors };
    } catch (error) {
      console.error('Failed to revalidate all images:', error);
      return {
        processed: 0,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Update image validation status
   */
  private static async updateImageValidationStatus(
    imageId: string,
    status: 'valid' | 'invalid' | 'pending'
  ): Promise<void> {
    try {
      const imageData = await redis.hGet(`${this.IMAGE_KEY_PREFIX}${imageId}`, 'data');

      if (!imageData) {
        return;
      }

      const storedImage: StoredImage = JSON.parse(imageData);
      storedImage.validationStatus = status;
      storedImage.lastValidated = new Date();

      await redis.hSet(`${this.IMAGE_KEY_PREFIX}${imageId}`, {
        data: JSON.stringify(storedImage),
      });
    } catch (error) {
      console.error(`Failed to update validation status for image ${imageId}:`, error);
    }
  }

  /**
   * Clean up invalid images (remove images that have been invalid for too long)
   */
  static async cleanupInvalidImages(daysOld: number = 7): Promise<{
    removed: number;
    errors: string[];
  }> {
    try {
      const { images } = await this.getImages({ status: 'invalid' });
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      let removed = 0;
      const errors: string[] = [];

      for (const image of images) {
        try {
          if (new Date(image.lastValidated) < cutoffDate) {
            const result = await this.deleteImage(image.id);
            if (result.success) {
              removed++;
            } else {
              errors.push(`${image.id}: ${result.message}`);
            }
          }
        } catch (error) {
          errors.push(`${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { removed, errors };
    } catch (error) {
      console.error('Failed to cleanup invalid images:', error);
      return {
        removed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Search images by tags or description
   */
  static async searchImages(query: string): Promise<StoredImage[]> {
    try {
      const { images } = await this.getImages();
      const searchTerm = query.toLowerCase();

      return images.filter((image) => {
        const matchesTags = image.tags.some((tag) => tag.toLowerCase().includes(searchTerm));
        const matchesDescription = image.description?.toLowerCase().includes(searchTerm) || false;
        const matchesSource = image.source.toLowerCase().includes(searchTerm);

        return matchesTags || matchesDescription || matchesSource;
      });
    } catch (error) {
      console.error('Failed to search images:', error);
      return [];
    }
  }
}
