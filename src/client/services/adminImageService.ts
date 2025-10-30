import {
  AdminImageUpload,
  StoredImage,
  ImageValidationResult,
  ValidateImageUrlResponse,
  AddImageResponse,
  GetImagesResponse,
  DeleteImageResponse,
  GetImagesRequest,
} from '../../shared/types/admin';

class AdminImageService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/admin${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data;
  }

  async validateImageUrl(url: string): Promise<ImageValidationResult> {
    const response = await this.makeRequest<ValidateImageUrlResponse>('/validate-image-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });

    return response.result;
  }

  async addImages(images: AdminImageUpload[]): Promise<AddImageResponse> {
    return this.makeRequest<AddImageResponse>('/add-images', {
      method: 'POST',
      body: JSON.stringify({ images }),
    });
  }

  async getImages(params: GetImagesRequest = {}): Promise<GetImagesResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    if (params.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    const endpoint = `/images${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<GetImagesResponse>(endpoint, {
      method: 'GET',
    });
  }

  async deleteImage(imageId: string): Promise<DeleteImageResponse> {
    return this.makeRequest<DeleteImageResponse>(`/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  async updateImage(imageId: string, updates: Partial<AdminImageUpload>): Promise<StoredImage> {
    return this.makeRequest<StoredImage>(`/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async revalidateImage(imageId: string): Promise<ImageValidationResult> {
    const response = await this.makeRequest<ValidateImageUrlResponse>(`/images/${imageId}/revalidate`, {
      method: 'POST',
    });

    return response.result;
  }
}

export const adminImageService = new AdminImageService();
