import { ImageUploadData } from '../../shared/types/admin';

export class ImageUploadUtil {
  /**
   * Convert a File object to base64 data for upload
   */
  static async fileToBase64(file: File): Promise<ImageUploadData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64Data = result.split(',')[1] || result;
        
        resolve({
          base64Data,
          filename: file.name,
          mimeType: file.type,
          size: file.size
        });
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size (4MB limit)
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${Math.round(file.size / 1024)}KB) exceeds maximum allowed size (${Math.round(maxSize / 1024)}KB)`
      };
    }

    return { valid: true };
  }

  /**
   * Create a preview URL for a file
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Clean up preview URL
   */
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Resize image if needed (client-side compression)
   */
  static async resizeImage(
    file: File, 
    maxWidth: number = 1920, 
    maxHeight: number = 1080, 
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for resizing'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Extract image dimensions from file
   */
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
        URL.revokeObjectURL(img.src);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create a drag and drop handler
   */
  static createDropHandler(
    onFiles: (files: File[]) => void,
    onError?: (error: string) => void
  ) {
    return {
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      onDragEnter: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      onDragLeave: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = Array.from(e.dataTransfer?.files || []);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
          onError?.('No image files found in drop');
          return;
        }
        
        if (imageFiles.length !== files.length) {
          onError?.('Some files were ignored (only image files are supported)');
        }
        
        onFiles(imageFiles);
      }
    };
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate a unique filename if needed
   */
  static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    
    return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
  }
}
