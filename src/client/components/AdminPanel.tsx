import React, { useState, useEffect } from 'react';
import { AdminImageUpload, StoredImage, ImageValidationResult } from '../../shared/types/admin';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { adminImageService } from '../services/adminImageService';
import { ErrorMessage } from './ErrorMessage';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { isAdmin, loading: authLoading, permissions } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'challenges'>('upload');
  const [images, setImages] = useState<StoredImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single image upload form
  const [singleImage, setSingleImage] = useState<AdminImageUpload>({
    url: '',
    isAIGenerated: false,
    difficulty: 'medium',
    source: 'Direct Upload',
    tags: [],
    description: '',
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Batch file upload state
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  
  // Image preview loading state
  const [loadingPreviews, setLoadingPreviews] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Record<string, string>>({});

  // Challenge management state
  const [challengeSettings, setChallengeSettings] = useState({
    imageCount: 8,
    difficulty: 'mixed' as 'mixed' | 'easy' | 'medium' | 'hard',
    balance: 'balanced' as 'balanced' | 'more-ai' | 'more-real'
  });

  // Image selection for custom challenges
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showImageSelector, setShowImageSelector] = useState(false);

  const [batchSettings, setBatchSettings] = useState({
    isAIGenerated: false,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    source: 'Direct Upload',
    tags: [] as string[],
  });

  // Image validation
  const [validationResult, setValidationResult] = useState<ImageValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  const loadImagePreview = async (imageId: string) => {
    if (loadedImages[imageId] || loadingPreviews.has(imageId)) {
      return; // Already loaded or loading
    }

    setLoadingPreviews(prev => new Set(prev).add(imageId));

    try {
      const response = await fetch(`/api/admin/images/${imageId}/data`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      setLoadedImages(prev => ({ ...prev, [imageId]: data.image.url }));
    } catch (error) {
      console.error('Failed to load image preview:', error);
    } finally {
      setLoadingPreviews(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const generateNewChallenge = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/generate-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(challengeSettings),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      alert('New daily challenge generated successfully!');
    } catch (error) {
      console.error('Failed to generate challenge:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate challenge');
    } finally {
      setLoading(false);
    }
  };



  const deleteCurrentChallenge = async () => {
    console.log('Delete challenge button clicked');
    if (!confirm('Are you sure you want to delete the current daily challenge? This will force a new one to be generated.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/daily-challenge', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      alert('Daily challenge deleted successfully! The next game will use a fresh challenge.');
    } catch (error) {
      console.error('Failed to delete challenge:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete challenge');
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to delete challenge'));
    } finally {
      setLoading(false);
    }
  };

  const createCustomChallenge = async () => {
    if (selectedImages.size === 0) {
      setError('Please select at least one image for the custom challenge');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/create-custom-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedImageIds: Array.from(selectedImages)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      alert(`Custom daily challenge created with ${selectedImages.size} images!`);
      setSelectedImages(new Set());
      setShowImageSelector(false);
    } catch (error) {
      console.error('Failed to create custom challenge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create custom challenge';
      setError(errorMessage);
      alert('Error: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const previewCurrentChallenge = async () => {
    try {
      console.log('Preview challenge button clicked');
      const response = await fetch('/api/admin/preview-challenge');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      // Open challenge preview in a new window or show in modal
      console.log('Current challenge:', data.challenge);
      alert(`Current challenge has ${data.challenge.images.length} images. Check console for details.`);
    } catch (error) {
      console.error('Failed to preview challenge:', error);
      setError(error instanceof Error ? error.message : 'Failed to preview challenge');
    }
  };

  useEffect(() => {
    if (isAdmin && permissions.canManageImages) {
      loadImages();
    }
  }, [isAdmin, permissions.canManageImages]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await adminImageService.getImages({ limit: 50 });
      setImages(response.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !validationResult?.valid) return;

    try {
      setLoading(true);
      setError(null);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;

        const imageData = {
          ...singleImage,
          url: base64Data, // Store base64 data as URL
          source: 'Direct Upload',
        };

        const response = await adminImageService.addImages([imageData]);

        if (response.success) {
          // Reset form
          setSingleImage({
            url: '',
            isAIGenerated: false,
            difficulty: 'medium',
            source: 'Direct Upload',
            tags: [],
            description: '',
          });
          setSelectedFile(null);
          setFilePreview(null);
          setValidationResult(null);
          // Reset file input
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.value = '';

          await loadImages();
        } else {
          setError(response.errors?.[0] || 'Failed to add image');
        }
        setLoading(false);
      };

      reader.onerror = () => {
        setError('Failed to process image file');
        setLoading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add image');
      setLoading(false);
    }
  };

  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (batchFiles.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      // Process files one by one to convert to base64
      const images: AdminImageUpload[] = [];

      for (const file of batchFiles) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        images.push({
          url: base64Data,
          ...batchSettings,
          source: 'Direct Upload',
        });
      }

      const response = await adminImageService.addImages(images);

      if (response.success) {
        setBatchFiles([]);
        // Reset file input
        const fileInput = document.querySelector(
          'input[type="file"][multiple]'
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        await loadImages();
      } else {
        setError(response.errors?.join(', ') || 'Failed to add images');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add images');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      setLoading(true);
      await adminImageService.deleteImage(imageId);
      await loadImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  const handleTagInput = (value: string, setter: (tags: string[]) => void) => {
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    setter(tags);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFilePreview(null);
      setValidationResult(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setValidationResult({
        valid: false,
        accessible: false,
        format: 'unknown',
        dimensions: { width: 0, height: 0 },
        errors: ['Please select a valid image file'],
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setValidationResult({
        valid: false,
        accessible: false,
        format: file.type,
        dimensions: { width: 0, height: 0 },
        errors: ['File size must be less than 5MB'],
      });
      return;
    }

    setSelectedFile(file);
    setValidating(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFilePreview(result);

        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setValidationResult({
            valid: true,
            accessible: true,
            format: file.type,
            dimensions: { width: img.width, height: img.height },
            errors: [],
          });
          setValidating(false);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setValidationResult({
        valid: false,
        accessible: false,
        format: file.type,
        dimensions: { width: 0, height: 0 },
        errors: ['Failed to process image file'],
      });
      setValidating(false);
    }
  };

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) return false;
      if (file.size > 5 * 1024 * 1024) return false; // 5MB limit
      return true;
    });
    setBatchFiles(validFiles);
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || !permissions.canManageImages) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin panel.</p>
          <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
            <p className="font-medium mb-2">Troubleshooting:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Admin access requires Reddit moderator privileges</li>
              <li>In development mode, all users should have access</li>
              <li>Check the browser console for detailed error information</li>
            </ul>
          </div>
          <button
            onClick={() => {
              console.log('Admin Panel Debug Info:', {
                isAdmin,
                permissions,
                error,
              });
              onClose();
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Close (Check Console for Debug Info)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Admin Panel - Image Management</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload Images
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'manage'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Images ({images.length})
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'challenges'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Daily Challenges
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <ErrorMessage error={error} onDismiss={() => setError(null)} className="mb-4" />
          )}

          {activeTab === 'upload' && (
            <div className="space-y-8">
              {/* Single Image Upload */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Add Single Image</h3>
                <form onSubmit={handleSingleImageSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Upload Image File *
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        {validating && (
                          <p className="text-sm text-blue-600 mt-1">Processing image...</p>
                        )}
                        {validationResult && (
                          <div
                            className={`text-sm mt-1 ${validationResult.valid ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {validationResult.valid ? (
                              <span>
                                ✓ Valid image ({validationResult.format},{' '}
                                {validationResult.dimensions.width}×
                                {validationResult.dimensions.height})
                              </span>
                            ) : (
                              <span>✗ {validationResult.errors?.[0] || 'Invalid image'}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type *
                          </label>
                          <select
                            value={singleImage.isAIGenerated ? 'ai' : 'real'}
                            onChange={(e) =>
                              setSingleImage({
                                ...singleImage,
                                isAIGenerated: e.target.value === 'ai',
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="real">Real Photo</option>
                            <option value="ai">AI Generated</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Difficulty *
                          </label>
                          <select
                            value={singleImage.difficulty}
                            onChange={(e) =>
                              setSingleImage({
                                ...singleImage,
                                difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Source
                        </label>
                        <input
                          type="text"
                          value="Direct Upload"
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tags (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={singleImage.tags?.join(', ') || ''}
                          onChange={(e) =>
                            handleTagInput(e.target.value, (tags) =>
                              setSingleImage({ ...singleImage, tags })
                            )
                          }
                          placeholder="nature, landscape, portrait"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={singleImage.description || ''}
                          onChange={(e) =>
                            setSingleImage({ ...singleImage, description: e.target.value })
                          }
                          placeholder="Optional description or explanation"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Image Preview */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preview
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-gray-500">
                            <div className="text-4xl mb-2">📁</div>
                            <p>Select an image file to see preview</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedFile || !validationResult?.valid}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md"
                  >
                    {loading ? 'Uploading Image...' : 'Upload Image'}
                  </button>
                </form>
              </div>

              {/* Batch Upload */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Batch Upload</h3>
                <form onSubmit={handleBatchUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Multiple Images
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleBatchFileSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {batchFiles.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {batchFiles.length} file(s) selected
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={batchSettings.isAIGenerated ? 'ai' : 'real'}
                        onChange={(e) =>
                          setBatchSettings({
                            ...batchSettings,
                            isAIGenerated: e.target.value === 'ai',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="real">Real Photo</option>
                        <option value="ai">AI Generated</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Difficulty
                      </label>
                      <select
                        value={batchSettings.difficulty}
                        onChange={(e) =>
                          setBatchSettings({
                            ...batchSettings,
                            difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                      <input
                        type="text"
                        value="Direct Upload"
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                      <input
                        type="text"
                        value={batchSettings.tags.join(', ')}
                        onChange={(e) =>
                          handleTagInput(e.target.value, (tags) =>
                            setBatchSettings({ ...batchSettings, tags })
                          )
                        }
                        placeholder="tag1, tag2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || batchFiles.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md"
                  >
                    {loading ? 'Uploading Images...' : `Upload ${batchFiles.length} Images`}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Manage Images</h3>
                <button
                  onClick={loadImages}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="border rounded-lg p-4">
                    <div className="aspect-video bg-gray-100 rounded-md mb-3 overflow-hidden">
                      {image.url.startsWith('data:image/placeholder') ? (
                        loadedImages[image.id] ? (
                          <img
                            src={loadedImages[image.id]}
                            alt="Managed image"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <div className="text-center text-gray-500">
                              <div className="text-2xl mb-1">🖼️</div>
                              <p className="text-xs">Stored Image</p>
                              {loadingPreviews.has(image.id) ? (
                                <div className="mt-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => loadImagePreview(image.id)}
                                  className="mt-1 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                >
                                  Load Preview
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      ) : (
                        <img
                          src={image.url}
                          alt="Managed image"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Type:</span>
                        <span
                          className={image.isAIGenerated ? 'text-purple-600' : 'text-green-600'}
                        >
                          {image.isAIGenerated ? 'AI Generated' : 'Real Photo'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="font-medium">Difficulty:</span>
                        <span className="capitalize">{image.difficulty}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="font-medium">Source:</span>
                        <span>{image.source}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        <span
                          className={`capitalize ${
                            image.validationStatus === 'valid'
                              ? 'text-green-600'
                              : image.validationStatus === 'invalid'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                          }`}
                        >
                          {image.validationStatus}
                        </span>
                      </div>

                      {image.tags.length > 0 && (
                        <div>
                          <span className="font-medium">Tags:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {image.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Added by {image.addedBy} on {new Date(image.addedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      disabled={loading}
                      className="w-full mt-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {images.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📷</div>
                  <p>No images found. Add some images using the Upload tab.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'challenges' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Daily Challenge Management</h3>
                <button
                  onClick={generateNewChallenge}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
                >
                  {loading ? 'Generating...' : 'Generate New Challenge'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Challenge Preview */}
                <div className="border rounded-lg p-6">
                  <h4 className="text-md font-semibold mb-4">Today's Challenge Preview</h4>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-600 mb-2">Challenge ID: {new Date().toISOString().split('T')[0]}</p>
                      <p className="text-sm text-gray-600">Status: Active</p>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Preview button clicked');
                          previewCurrentChallenge();
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                      >
                        Preview Current Challenge
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Delete button clicked');
                          deleteCurrentChallenge();
                        }}
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md"
                      >
                        {loading ? 'Deleting...' : 'Delete Current Challenge'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Challenge Settings */}
                <div className="border rounded-lg p-6">
                  <h4 className="text-md font-semibold mb-4">Challenge Settings</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Images
                      </label>
                      <select
                        value={challengeSettings.imageCount}
                        onChange={(e) => setChallengeSettings({...challengeSettings, imageCount: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={5}>5 Images</option>
                        <option value={8}>8 Images</option>
                        <option value={10}>10 Images</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Difficulty Mix
                      </label>
                      <select
                        value={challengeSettings.difficulty}
                        onChange={(e) => setChallengeSettings({...challengeSettings, difficulty: e.target.value as 'mixed' | 'easy' | 'medium' | 'hard'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="mixed">Mixed Difficulty</option>
                        <option value="easy">Easy Only</option>
                        <option value="medium">Medium Only</option>
                        <option value="hard">Hard Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        AI/Real Balance
                      </label>
                      <select
                        value={challengeSettings.balance}
                        onChange={(e) => setChallengeSettings({...challengeSettings, balance: e.target.value as 'balanced' | 'more-ai' | 'more-real'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="balanced">50/50 Balance</option>
                        <option value="more-ai">More AI Images</option>
                        <option value="more-real">More Real Photos</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Challenge Creation */}
              <div className="mt-6 border rounded-lg p-6">
                <h4 className="text-md font-semibold mb-4">Create Custom Challenge</h4>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select specific images to create a custom daily challenge instead of using random selection.
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowImageSelector(!showImageSelector)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      {showImageSelector ? 'Hide Image Selector' : 'Select Images'}
                    </button>
                    
                    {selectedImages.size > 0 && (
                      <button
                        onClick={createCustomChallenge}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
                      >
                        {loading ? 'Creating...' : `Create Challenge (${selectedImages.size} images)`}
                      </button>
                    )}
                    
                    {selectedImages.size > 0 && (
                      <button
                        onClick={() => setSelectedImages(new Set())}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  {showImageSelector && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h5 className="font-medium mb-3">Select Images for Challenge:</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                        {images.map((image) => (
                          <div
                            key={image.id}
                            className={`border rounded-lg p-2 cursor-pointer transition-all ${
                              selectedImages.has(image.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onClick={() => toggleImageSelection(image.id)}
                          >
                            <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                              {image.url.startsWith('data:image/placeholder') ? (
                                loadedImages[image.id] ? (
                                  <img
                                    src={loadedImages[image.id]}
                                    alt="Challenge image"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                    <div className="text-center text-gray-500">
                                      <div className="text-lg mb-1">🖼️</div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          loadImagePreview(image.id);
                                        }}
                                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                      >
                                        Load
                                      </button>
                                    </div>
                                  </div>
                                )
                              ) : (
                                <img
                                  src={image.url}
                                  alt="Challenge image"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            
                            <div className="text-xs">
                              <div className={`font-medium ${image.isAIGenerated ? 'text-purple-600' : 'text-green-600'}`}>
                                {image.isAIGenerated ? 'AI' : 'Real'}
                              </div>
                              <div className="text-gray-500 capitalize">{image.difficulty}</div>
                            </div>
                            
                            {selectedImages.has(image.id) && (
                              <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                ✓
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Challenge Statistics */}
              <div className="mt-6 border rounded-lg p-6">
                <h4 className="text-md font-semibold mb-4">Challenge Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{images.length}</div>
                    <div className="text-sm text-gray-600">Total Images</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {images.filter(img => !img.isAIGenerated).length}
                    </div>
                    <div className="text-sm text-gray-600">Real Photos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {images.filter(img => img.isAIGenerated).length}
                    </div>
                    <div className="text-sm text-gray-600">AI Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {images.filter(img => img.validationStatus === 'valid').length}
                    </div>
                    <div className="text-sm text-gray-600">Valid Images</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
