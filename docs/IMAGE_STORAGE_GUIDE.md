# Redis-Based Image Storage Guide

This guide explains how to use the new Redis-based image storage system in PicOrPixel, which eliminates the need for external image hosting services.

## Overview

The new system stores images directly in Redis as base64-encoded data, providing:
- **Reliability**: No dependency on external hosting services
- **Performance**: Fast image serving from Redis
- **Control**: Complete control over image management
- **Security**: Images are stored within your Devvit app's Redis instance

## Key Components

### 1. ImageStorageService
Handles all Redis-based image operations:
- Upload images from files
- Import images from URLs
- Serve images to clients
- Manage storage statistics

### 2. AdminImageManager Component
React component for admin image management:
- Drag & drop file uploads
- URL import functionality
- Image previews
- Storage statistics

### 3. Image Upload Utilities
Client-side utilities for handling image files:
- File validation
- Base64 conversion
- Image resizing
- Preview generation

## Usage Examples

### 1. Upload Images via Admin Interface

```typescript
import { AdminImageManager } from '../components/AdminImageManager';

function AdminPanel() {
  const handleImageUploaded = (image: StoredImageData) => {
    console.log('Image uploaded:', image.id);
    // Refresh your image list
  };

  const handleError = (error: string) => {
    console.error('Upload error:', error);
    // Show error to user
  };

  return (
    <AdminImageManager 
      onImageUploaded={handleImageUploaded}
      onError={handleError}
    />
  );
}
```

### 2. Import Images from URLs

```typescript
// Server-side API call
const response = await fetch('/api/admin/import-from-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/image.jpg',
    metadata: {
      url: '', // Will be set by server
      isAIGenerated: false,
      difficulty: 'medium',
      source: 'imported',
      tags: ['nature', 'landscape'],
      description: 'Beautiful landscape photo'
    }
  })
});
```

### 3. Batch Import Multiple URLs

```typescript
const urls = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.png',
  'https://example.com/image3.webp'
];

const response = await fetch('/api/admin/batch-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls,
    metadata: {
      url: '',
      isAIGenerated: true,
      difficulty: 'hard',
      source: 'ai_generated',
      tags: ['ai', 'generated'],
      description: 'AI generated images for game'
    }
  })
});
```

### 4. Serve Images to Game

Images are automatically served via the `/api/images/:imageId` endpoint:

```typescript
// In your game component
function GameImage({ imageId }: { imageId: string }) {
  return (
    <img 
      src={`/api/images/${imageId}`}
      alt="Game image"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
```

### 5. Get Storage Statistics

```typescript
const response = await fetch('/api/admin/storage-stats');
const data = await response.json();

console.log('Total images:', data.stats.totalImages);
console.log('Total size:', data.stats.totalSize);
console.log('By type:', data.stats.byType);
```

## File Limitations

- **Maximum file size**: 4MB per image
- **Supported formats**: JPEG, PNG, WebP, GIF
- **Storage limit**: Depends on your Redis instance capacity

## Best Practices

### 1. Image Optimization
```typescript
// Resize large images before upload
const resizedFile = await ImageUploadUtil.resizeImage(
  originalFile, 
  1920, // max width
  1080, // max height
  0.8   // quality
);
```

### 2. Batch Operations
```typescript
// Import multiple images at once for better performance
const result = await ImageStorageService.batchImportFromUrls(urls, metadata, username);
```

### 3. Error Handling
```typescript
try {
  const result = await ImageStorageService.uploadImage(imageData, metadata, username);
  if (!result.success) {
    console.error('Upload failed:', result.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### 4. Memory Management
```typescript
// Clean up preview URLs when done
const previewUrl = ImageUploadUtil.createPreviewUrl(file);
// ... use preview URL
ImageUploadUtil.revokePreviewUrl(previewUrl);
```

## Migration from External Hosting

If you have existing images on external services, you can migrate them:

1. **Get list of external URLs** from your current AdminImageService
2. **Use batch import** to download and store them in Redis
3. **Update game logic** to use new internal URLs
4. **Clean up old external references**

```typescript
// Migration script example
const { images } = await AdminImageService.getImages();
const externalUrls = images.map(img => img.url);

const result = await ImageStorageService.batchImportFromUrls(
  externalUrls,
  { /* metadata */ },
  'migration_script'
);

console.log(`Migrated ${result.imported.length} images`);
```

## Troubleshooting

### Common Issues

1. **File too large**: Reduce image size or compress before upload
2. **Unsupported format**: Convert to JPEG, PNG, WebP, or GIF
3. **Redis memory limit**: Monitor storage stats and clean up unused images
4. **Network timeout**: Increase timeout for large batch imports

### Monitoring Storage

```typescript
// Check storage usage regularly
const stats = await ImageStorageService.getStorageStats();
if (stats.totalSize > MAX_STORAGE_SIZE) {
  // Implement cleanup strategy
}
```

## Security Considerations

- Images are stored in your app's Redis instance (secure)
- Admin authentication required for upload/import operations
- File validation prevents malicious uploads
- No external dependencies reduce attack surface

## Performance Tips

- Use appropriate image formats (WebP for photos, PNG for graphics)
- Implement client-side caching for frequently accessed images
- Monitor Redis memory usage
- Consider image compression for large collections

This new system provides a robust, self-contained solution for image management in your PicOrPixel game!
