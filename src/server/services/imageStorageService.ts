import { redis } from '@devvit/web/server';
import { 
  AdminImageUpload, 
  StoredImage
} from '../../shared/types/admin';

export interface ImageUploadData {
  base64Data: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface StoredImageData extends StoredImage {
  base64Data: string;
  mimeType: string;
  fileSize: number;
}

export class ImageStorageService {
  private static readonly IMAGE_KEY_PREFIX = 'admin:image:';
  private static readonly IMAGE_DATA_PREFIX = 'admin:image_data:';
  private static readonly IMAGE_LIST_KEY = 'admin:images:list';
  private static readonly IMAGE_COUNTER_KEY = 'admin:image_counter';
  private static readonly MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB limit for Redis storage

  /**
   * Upload and store image data directly in Redis
   */
  static async uploadImage(
    imageData: ImageUploadData,
    metadata: AdminImageUpload,
    addedBy: string
  ): Promise<{ success: boolean; image?: StoredImageData; error?: string }> {
    try {
      // Validate image size
      if (imageData.size > this.MAX_IMAGE_SIZE) {
        return {
          success: false,
          error: `Image size (${Math.round(imageData.size / 1024)}KB) exceeds maximum allowed size (${Math.round(this.MAX_IMAGE_SIZE / 1024)}KB)`
        };
      }

      // Validate MIME type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(imageData.mimeType)) {
        return {
          success: false,
          error: `Unsupported image type: ${imageData.mimeType}. Allowed types: ${allowedTypes.join(', ')}`
        };
      }

      // Validate base64 data
      const validation = this.validateBase64Image(imageData.base64Data, imageData.mimeType);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid image data'
        };
      }

      // Generate unique ID for the image
      const imageId = await this.generateImageId();
      
      const storedImage: StoredImageData = {
        id: imageId,
        url: `/api/images/${imageId}`, // Internal URL for serving the image
        base64Data: imageData.base64Data,
        mimeType: imageData.mimeType,
        fileSize: imageData.size,
        isAIGenerated: metadata.isAIGenerated,
        difficulty: metadata.difficulty,
        source: metadata.source || 'uploaded',
        addedBy,
        addedAt: new Date(),
        tags: metadata.tags || [],
        validationStatus: 'valid',
        lastValidated: new Date(),
      };
      
      if (metadata.description) {
        storedImage.description = metadata.description;
      }

      // Store image metadata
      await redis.hSet(
        `${this.IMAGE_KEY_PREFIX}${imageId}`,
        {
          data: JSON.stringify({
            id: storedImage.id,
            url: storedImage.url,
            isAIGenerated: storedImage.isAIGenerated,
            difficulty: storedImage.difficulty,
            source: storedImage.source,
            addedBy: storedImage.addedBy,
            addedAt: storedImage.addedAt.toISOString(),
            tags: JSON.stringify(storedImage.tags),
            validationStatus: storedImage.validationStatus,
            lastValidated: storedImage.lastValidated.toISOString(),
            description: storedImage.description,
            mimeType: storedImage.mimeType,
            fileSize: storedImage.fileSize
          })
        }
      );

      // Store image binary data separately for better performance
      await redis.hSet(
        `${this.IMAGE_DATA_PREFIX}${imageId}`,
        {
          data: imageData.base64Data,
          mimeType: imageData.mimeType,
          filename: imageData.filename
        }
      );

      // Add to the images list
      await redis.hSet(this.IMAGE_LIST_KEY, { [imageId]: '1' });

      return {
        success: true,
        image: storedImage
      };

    } catch (error) {
      console.error('Failed to upload image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get image data for serving
   */
  static async getImageData(imageId: string): Promise<{
    data: string;
    mimeType: string;
    filename: string;
  } | null> {
    try {
      const imageData = await redis.hGetAll(`${this.IMAGE_DATA_PREFIX}${imageId}`);
      
      if (!imageData.data || !imageData.mimeType) {
        return null;
      }

      return {
        data: imageData.data,
        mimeType: imageData.mimeType,
        filename: imageData.filename || `image_${imageId}`
      };
    } catch (error) {
      console.error(`Failed to get image data for ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Get images with pagination and filtering
   */
  static async getImages(options: {
    limit?: number;
    offset?: number;
    status?: 'pending' | 'valid' | 'invalid';
  } = {}): Promise<{
    images: StoredImage[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // Get all image IDs
      const imageIdsHash = await redis.hGetAll(this.IMAGE_LIST_KEY);
      const imageIds = Object.keys(imageIdsHash);
      
      if (imageIds.length === 0) {
        return { images: [], total: 0, hasMore: false };
      }

      // Fetch all images
      const images: StoredImage[] = [];
      
      for (const imageId of imageIds) {
        try {
          const imageData = await redis.hGetAll(`${this.IMAGE_KEY_PREFIX}${imageId}`);
          if (imageData.data) {
            const parsedData = JSON.parse(imageData.data);
            const storedImage: StoredImage = {
              ...parsedData,
              addedAt: new Date(parsedData.addedAt),
              lastValidated: new Date(parsedData.lastValidated),
              tags: JSON.parse(parsedData.tags || '[]')
            };
            
            // Apply status filter if specified
            if (options.status && storedImage.validationStatus !== options.status) {
              continue;
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
        hasMore
      };

    } catch (error) {
      console.error('Failed to get images:', error);
      return { images: [], total: 0, hasMore: false };
    }
  }

  /**
   * Delete an image and its data
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
      await redis.del(`${this.IMAGE_DATA_PREFIX}${imageId}`);
      await redis.hDel(this.IMAGE_LIST_KEY, [imageId]);

      return { success: true, message: 'Image deleted successfully' };

    } catch (error) {
      console.error(`Failed to delete image ${imageId}:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get a random set of images for daily challenges
   */
  static async getRandomImagesForChallenge(count: number = 10): Promise<StoredImage[]> {
    try {
      const { images } = await this.getImages({ status: 'valid' });
      
      if (images.length === 0) {
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
   * Validate base64 image data
   */
  private static validateBase64Image(base64Data: string, mimeType: string): {
    valid: boolean;
    error?: string;
  } {
    try {
      // Check if base64 data is valid
      if (!base64Data || typeof base64Data !== 'string') {
        return { valid: false, error: 'Invalid base64 data' };
      }

      // Remove data URL prefix if present
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Validate base64 format
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(cleanBase64)) {
        return { valid: false, error: 'Invalid base64 format' };
      }

      // Check if base64 length is reasonable (not empty, not too small)
      if (cleanBase64.length < 100) {
        return { valid: false, error: 'Image data too small' };
      }

      // Validate MIME type matches expected image types
      const expectedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!expectedMimeTypes.includes(mimeType)) {
        return { valid: false, error: `Unsupported MIME type: ${mimeType}` };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Validation error' 
      };
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalImages: number;
    totalSize: number;
    averageSize: number;
    byType: Record<string, { count: number; size: number }>;
  }> {
    try {
      const { images } = await this.getImages();
      
      let totalSize = 0;
      const byType: Record<string, { count: number; size: number }> = {};

      for (const image of images) {
        // Get file size from metadata
        const imageData = await redis.hGetAll(`${this.IMAGE_KEY_PREFIX}${image.id}`);
        const metadata = JSON.parse(imageData.data || '{}');
        const fileSize = metadata.fileSize || 0;
        const mimeType = metadata.mimeType || 'unknown';

        totalSize += fileSize;

        if (!byType[mimeType]) {
          byType[mimeType] = { count: 0, size: 0 };
        }
        byType[mimeType].count++;
        byType[mimeType].size += fileSize;
      }

      return {
        totalImages: images.length,
        totalSize,
        averageSize: images.length > 0 ? Math.round(totalSize / images.length) : 0,
        byType
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        averageSize: 0,
        byType: {}
      };
    }
  }

  /**
   * Convert external URL to stored image (download and store)
   */
  static async importFromUrl(
    url: string,
    metadata: AdminImageUpload,
    addedBy: string
  ): Promise<{ success: boolean; image?: StoredImageData; error?: string }> {
    try {
      // Fetch the image from the URL
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'PicOrPixel-Bot/1.0',
          'Accept': 'image/*'
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch image: HTTP ${response.status}`
        };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return {
          success: false,
          error: 'URL does not point to an image'
        };
      }

      // Get image data as array buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Check size
      if (buffer.length > this.MAX_IMAGE_SIZE) {
        return {
          success: false,
          error: `Image size (${Math.round(buffer.length / 1024)}KB) exceeds maximum allowed size (${Math.round(this.MAX_IMAGE_SIZE / 1024)}KB)`
        };
      }

      // Convert to base64
      const base64Data = buffer.toString('base64');
      
      // Extract filename from URL
      const urlObj = new URL(url);
      const filename = urlObj.pathname.split('/').pop() || 'imported_image';

      const imageData: ImageUploadData = {
        base64Data,
        filename,
        mimeType: contentType,
        size: buffer.length
      };

      // Upload using the standard upload method
      return await this.uploadImage(imageData, metadata, addedBy);

    } catch (error) {
      console.error('Failed to import image from URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch import multiple images from URLs
   */
  static async batchImportFromUrls(
    urls: string[],
    metadata: AdminImageUpload,
    addedBy: string
  ): Promise<{
    success: boolean;
    imported: StoredImageData[];
    errors: Array<{ url: string; error: string }>;
  }> {
    const imported: StoredImageData[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const url of urls) {
      try {
        const result = await this.importFromUrl(url, metadata, addedBy);
        
        if (result.success && result.image) {
          imported.push(result.image);
        } else {
          errors.push({ url, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        errors.push({ 
          url, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return {
      success: imported.length > 0,
      imported,
      errors
    };
  }
}
