import React, { useState, useCallback } from 'react';
import { ImageUploadUtil } from '../utils/imageUpload';
import { 
  AdminImageUpload, 
  ImageUploadData, 
  StoredImageData,
  StorageStats 
} from '../../shared/types/admin';
import styles from './AdminImageManager.module.css';

interface AdminImageManagerProps {
  onImageUploaded?: (image: StoredImageData) => void;
  onError?: (error: string) => void;
}

export const AdminImageManager: React.FC<AdminImageManagerProps> = ({
  onImageUploaded,
  onError
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [importUrls, setImportUrls] = useState<string>('');
  const [metadata, setMetadata] = useState<AdminImageUpload>({
    url: '',
    isAIGenerated: false,
    difficulty: 'medium',
    source: 'uploaded',
    tags: [],
    description: ''
  });

  // Load storage stats on component mount
  React.useEffect(() => {
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    try {
      const response = await fetch('/api/admin/storage-stats');
      if (response.ok) {
        const data = await response.json();
        setStorageStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const handleFileSelect = useCallback((files: File[]) => {
    // Clean up previous preview URLs
    previewUrls.forEach(url => ImageUploadUtil.revokePreviewUrl(url));
    
    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    files.forEach(file => {
      const validation = ImageUploadUtil.validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });
    
    if (errors.length > 0) {
      onError?.(errors.join('\n'));
    }
    
    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => ImageUploadUtil.createPreviewUrl(file));
    
    setSelectedFiles(validFiles);
    setPreviewUrls(newPreviewUrls);
  }, [previewUrls, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    handleFileSelect(imageFiles);
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileSelect(files);
  }, [handleFileSelect]);

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress('Preparing files...');
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (!file) continue; // Skip if file is undefined
        
        setUploadProgress(`Uploading ${file.name} (${i + 1}/${selectedFiles.length})...`);
        
        // Convert file to base64
        const imageData: ImageUploadData = await ImageUploadUtil.fileToBase64(file);
        
        // Upload to server
        const response = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData,
            metadata: {
              ...metadata,
              url: `/api/images/${Date.now()}_${i}`, // Temporary URL, will be replaced by server
              source: 'uploaded'
            }
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Upload failed');
        }
        
        const result = await response.json();
        if (result.success && result.image) {
          onImageUploaded?.(result.image);
        }
      }
      
      // Clear selected files and previews
      previewUrls.forEach(url => ImageUploadUtil.revokePreviewUrl(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress('Upload completed!');
      
      // Reload storage stats
      await loadStorageStats();
      
      setTimeout(() => setUploadProgress(''), 3000);
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress('');
    } finally {
      setIsUploading(false);
    }
  };

  const importFromUrls = async () => {
    const urls = importUrls.split('\n').filter(url => url.trim());
    if (urls.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress('Importing images from URLs...');
    
    try {
      const response = await fetch('/api/admin/batch-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls,
          metadata: {
            ...metadata,
            source: 'imported'
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Import failed');
      }
      
      const result = await response.json();
      
      if (result.imported.length > 0) {
        result.imported.forEach((image: StoredImageData) => {
          onImageUploaded?.(image);
        });
        setUploadProgress(`Imported ${result.imported.length} images successfully!`);
      }
      
      if (result.errors.length > 0) {
        const errorMessages = result.errors.map((err: any) => `${err.url}: ${err.error}`).join('\n');
        onError?.(errorMessages);
      }
      
      setImportUrls('');
      await loadStorageStats();
      
      setTimeout(() => setUploadProgress(''), 3000);
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Import failed');
      setUploadProgress('');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.adminImageManager}>
      <h3>Image Management</h3>
      
      {/* Storage Stats */}
      {storageStats && (
        <div className={styles.storageStats}>
          <h4>Storage Statistics</h4>
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <span className="label">Total Images:</span>
              <span className="value">{storageStats.totalImages}</span>
            </div>
            <div className={styles.stat}>
              <span className="label">Total Size:</span>
              <span className="value">{ImageUploadUtil.formatFileSize(storageStats.totalSize)}</span>
            </div>
            <div className={styles.stat}>
              <span className="label">Average Size:</span>
              <span className="value">{ImageUploadUtil.formatFileSize(storageStats.averageSize)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Metadata Form */}
      <div className={styles.metadataForm}>
        <h4>Image Metadata</h4>
        <div className={styles.formRow}>
          <label>
            Difficulty:
            <select 
              value={metadata.difficulty} 
              onChange={(e) => setMetadata({...metadata, difficulty: e.target.value as 'easy' | 'medium' | 'hard'})}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label>
            AI Generated:
            <input 
              type="checkbox" 
              checked={metadata.isAIGenerated}
              onChange={(e) => setMetadata({...metadata, isAIGenerated: e.target.checked})}
            />
          </label>
        </div>
        <div className={styles.formRow}>
          <label>
            Tags (comma-separated):
            <input 
              type="text" 
              value={metadata.tags?.join(', ') || ''}
              onChange={(e) => setMetadata({...metadata, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)})}
              placeholder="nature, landscape, animals"
            />
          </label>
        </div>
        <div className={styles.formRow}>
          <label>
            Description:
            <textarea 
              value={metadata.description || ''}
              onChange={(e) => setMetadata({...metadata, description: e.target.value})}
              placeholder="Optional description of the image"
              rows={3}
            />
          </label>
        </div>
      </div>
      
      {/* File Upload */}
      <div className="upload-section">
        <h4>Upload Images</h4>
        <div 
          className={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
        >
          <p>Drag and drop images here, or click to select files</p>
          <input 
            type="file" 
            multiple 
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            id="file-input"
          />
          <label htmlFor="file-input" className={styles.fileInputLabel}>
            Select Files
          </label>
        </div>
        
        {/* File Previews */}
        {selectedFiles.length > 0 && (
          <div className="file-previews">
            <h5>Selected Files:</h5>
            <div className={styles.previewGrid}>
              {selectedFiles.map((file, index) => (
                <div key={index} className={styles.previewItem}>
                  <img src={previewUrls[index]} alt={file.name} />
                  <div className={styles.fileInfo}>
                    <span className={styles.filename}>{file.name}</span>
                    <span className="filesize">{ImageUploadUtil.formatFileSize(file.size)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={uploadFiles} 
              disabled={isUploading}
              className={styles.uploadButton}
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
            </button>
          </div>
        )}
      </div>
      
      {/* URL Import */}
      <div className="import-section">
        <h4>Import from URLs</h4>
        <textarea 
          value={importUrls}
          onChange={(e) => setImportUrls(e.target.value)}
          placeholder="Enter image URLs, one per line"
          rows={5}
          className={styles.urlInput}
        />
        <button 
          onClick={importFromUrls} 
          disabled={isUploading || !importUrls.trim()}
          className={styles.importButton}
        >
          {isUploading ? 'Importing...' : 'Import from URLs'}
        </button>
      </div>
      
      {/* Progress */}
      {uploadProgress && (
        <div className={styles.uploadProgress}>
          {uploadProgress}
        </div>
      )}
      

    </div>
  );
};
