import { useState, useEffect } from 'react';

interface ChallengeImageResult {
  loading: boolean;
  error: string | null;
  imageUrl: string | null;
}

export const useChallengeImage = (imageUrl: string) => {
  const [result, setResult] = useState<ChallengeImageResult>({
    loading: true,
    error: null,
    imageUrl: null
  });

  useEffect(() => {
    const loadImage = async () => {
      setResult({ loading: true, error: null, imageUrl: null });

      try {
        // Handle base64 images directly (this is now the primary method)
        if (imageUrl.startsWith('data:image/')) {
          setResult({ loading: false, error: null, imageUrl: imageUrl });
          return;
        }

        // Handle external URLs directly
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          setResult({ loading: false, error: null, imageUrl: imageUrl });
          return;
        }

        // For any other case, use the URL directly
        setResult({ loading: false, error: null, imageUrl: imageUrl });
      } catch (error) {
        setResult({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load image',
          imageUrl: null
        });
      }
    };

    loadImage();
  }, [imageUrl]);

  return result;
};
