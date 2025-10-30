// Import images so Vite can bundle them properly
import sampleReal1 from '../public/sample-real-1.jpg';
import sampleReal2 from '../public/sample-real-2.jpg';
import sampleReal3 from '../public/sample-real-3.jpg';
import sampleAi1 from '../public/sample-ai-1.jpg';
import sampleAi2 from '../public/sample-ai-2.jpg';

export const challengeImages = {
  'sample-real-1.jpg': sampleReal1,
  'sample-real-2.jpg': sampleReal2,
  'sample-real-3.jpg': sampleReal3,
  'sample-ai-1.jpg': sampleAi1,
  'sample-ai-2.jpg': sampleAi2,
};

export function getImageUrl(filename: string): string {
  return challengeImages[filename as keyof typeof challengeImages] || '';
}
