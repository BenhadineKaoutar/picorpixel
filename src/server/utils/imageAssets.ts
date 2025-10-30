// Image assets as base64 data URLs
// Place your actual base64-encoded images here

export const imageAssets = {
  'sample-real-1.jpg': '', // Add your base64 string here
  'sample-real-2.jpg': '', // Add your base64 string here
  'sample-real-3.jpg': '', // Add your base64 string here
  'sample-ai-1.jpg': '',   // Add your base64 string here
  'sample-ai-2.jpg': '',   // Add your base64 string here
};

export function getImageDataUrl(filename: string): string {
  const base64 = imageAssets[filename as keyof typeof imageAssets];
  if (!base64) {
    console.warn(`Image not found: ${filename}`);
    return '';
  }
  return `data:image/jpeg;base64,${base64}`;
}
