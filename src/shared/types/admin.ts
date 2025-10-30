// Admin panel types for image management

export interface AdminImageUpload {
  url: string;
  isAIGenerated: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  source: string; // e.g., "ImageBB", "Imgur"
  tags?: string[];
  description?: string;
}

export interface StoredImage {
  id: string;
  url: string; // External URL (ImageBB, etc.)
  isAIGenerated: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  source: string;
  addedBy: string; // Admin username
  addedAt: Date;
  tags: string[];
  validationStatus: 'pending' | 'valid' | 'invalid';
  lastValidated: Date;
  description?: string;
}

export interface ImageValidationResult {
  valid: boolean;
  accessible: boolean;
  format: string; // 'jpg', 'png', 'webp'
  dimensions: {width: number, height: number};
  fileSize?: number;
  errors?: string[];
}

export interface AdminUser {
  id: string;
  username: string;
  isModerator: boolean;
  canManageImages: boolean;
}

// API Request/Response types
export interface ValidateImageUrlRequest {
  url: string;
}

export interface ValidateImageUrlResponse {
  type: 'validate-image-url';
  result: ImageValidationResult;
}

export interface AddImageRequest {
  images: AdminImageUpload[];
}

export interface AddImageResponse {
  type: 'add-images';
  success: boolean;
  addedImages: StoredImage[];
  errors?: string[];
}

export interface GetImagesRequest {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'valid' | 'invalid';
}

export interface GetImagesResponse {
  type: 'get-images';
  images: StoredImage[];
  total: number;
  hasMore: boolean;
}

export interface DeleteImageRequest {
  imageId: string;
}

export interface DeleteImageResponse {
  type: 'delete-image';
  success: boolean;
  message: string;
}

export interface AdminAuthResponse {
  type: 'admin-auth';
  isAdmin: boolean;
  user?: AdminUser;
  permissions: {
    canManageImages: boolean;
    canViewStats: boolean;
    canModerateContent: boolean;
  };
}

// Image Storage types (Redis-based storage)
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

export interface UploadImageRequest {
  imageData: ImageUploadData;
  metadata: AdminImageUpload;
}

export interface UploadImageResponse {
  type: 'upload-image';
  success: boolean;
  image?: StoredImageData;
  error?: string;
}

export interface ImportFromUrlRequest {
  url: string;
  metadata: AdminImageUpload;
}

export interface ImportFromUrlResponse {
  type: 'import-image';
  success: boolean;
  image?: StoredImageData;
  error?: string;
}

export interface BatchImportRequest {
  urls: string[];
  metadata: AdminImageUpload;
}

export interface BatchImportResponse {
  type: 'batch-import';
  success: boolean;
  imported: StoredImageData[];
  errors: Array<{ url: string; error: string }>;
}

export interface StorageStats {
  totalImages: number;
  totalSize: number;
  averageSize: number;
  byType: Record<string, { count: number; size: number }>;
}

export interface StorageStatsResponse {
  type: 'storage-stats';
  stats: StorageStats;
}
