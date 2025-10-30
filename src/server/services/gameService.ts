// Game service layer for PicOrPixel business logic
import { 
  DailyChallenge, 
  GameImage, 
  GameSession, 
  GameResult, 
  ImageGuess,
  Achievement
} from '../../shared/types/game.js';
import { AdminImageService } from './adminImageService.js';
import { AuthService } from './authService.js';
import { redis } from '@devvit/web/server';

export class GameService {
  // Generate a daily challenge with images from AdminImageService
  async getDailyChallenge(): Promise<DailyChallenge | null> {
    const today = new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10);
    const cacheKey = `challenge:${today}`;
    
    try {
      // Try to get cached challenge
      const cachedChallenge = await redis.get(cacheKey);
      
      if (cachedChallenge) {
        const challenge = JSON.parse(cachedChallenge);
        return challenge;
      }
      
      // Generate new challenge from Redis images
      const images = await AdminImageService.getRandomImagesForChallenge(8);
      
      let gameImages: GameImage[];
      
      if (images.length > 0) {
        // Use admin-managed images from Redis - get full image data with base64
        console.log(`Using ${images.length} admin images from Redis for daily challenge`);
        
        gameImages = await Promise.all(
          images.map(async (adminImage) => {
            try {
              // Get full image data from Redis (same method as admin panel)
              const fullImageData = await AdminImageService.getImageData(adminImage.id);
              
              if (fullImageData && fullImageData.url) {
                return {
                  id: adminImage.id,
                  url: fullImageData.url, // This includes the full base64 data from Redis
                  isAIGenerated: adminImage.isAIGenerated,
                  difficulty: adminImage.difficulty,
                  source: adminImage.source || 'Admin Upload',
                  explanation: adminImage.description || ''
                };
              }
            } catch (error) {
              console.error(`Failed to load full image data for ${adminImage.id}:`, error);
            }
            
            // If we can't get the full image data, generate a test SVG
            const imageNumber = parseInt(adminImage.id.replace(/\D/g, '')) || 1;
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
            const color = colors[imageNumber % colors.length];
            
            const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="400" fill="${color}"/>
              <text x="200" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="white">
                ${adminImage.isAIGenerated ? 'AI Generated' : 'Real Photo'}
              </text>
              <text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="white">
                Test Image ${imageNumber}
              </text>
              <text x="200" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="white">
                ${adminImage.id}
              </text>
            </svg>`;
            
            const base64Svg = Buffer.from(svg, 'utf-8').toString('base64');
            
            return {
              id: adminImage.id,
              url: `data:image/svg+xml;base64,${base64Svg}`,
              isAIGenerated: adminImage.isAIGenerated,
              difficulty: adminImage.difficulty,
              source: adminImage.source || 'Admin Upload',
              explanation: adminImage.description || ''
            };
          })
        );
      } else {
        // If no images in Redis, create some test SVG images
        console.warn('NO admin images available in Redis, creating test SVG images');
        gameImages = [];
        
        for (let i = 1; i <= 5; i++) {
          const isAI = i % 2 === 0;
          const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
          const color = colors[i - 1];
          
          const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="400" fill="${color}"/>
            <text x="200" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="white">
              ${isAI ? 'AI Generated' : 'Real Photo'}
            </text>
            <text x="200" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="white">
              Test Image ${i}
            </text>
            <text x="200" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="white">
              No Redis Images Available
            </text>
          </svg>`;
          
          const base64Svg = Buffer.from(svg, 'utf-8').toString('base64');
          
          gameImages.push({
            id: `${today}-${i}`,
            url: `data:image/svg+xml;base64,${base64Svg}`,
            isAIGenerated: isAI,
            difficulty: i <= 2 ? 'easy' : i <= 4 ? 'medium' : 'hard',
            source: 'Test Data',
            explanation: `This is a test ${isAI ? 'AI generated' : 'real photo'} image created because no images were found in Redis.`
          });
        }
      }

      // Shuffle the images to randomize order
      const shuffledImages = this.shuffleArray([...gameImages]);

      const challenge: DailyChallenge = {
        id: today,
        date: today,
        images: shuffledImages,
        totalImages: shuffledImages.length,
      };
      
      // Cache the challenge for 24 hours
      await redis.set(cacheKey, JSON.stringify(challenge), { 
        expiration: new Date(Date.now() + 86400000) 
      });
      
      return challenge;
    } catch (error) {
      console.error('Error generating daily challenge:', error);
      return null;
    }
  }

  // Create a daily challenge from selected images (for admin use)
  static async createDailyChallenge(challengeId: string, selectedImages: any[]): Promise<DailyChallenge> {
    const gameImages: GameImage[] = selectedImages.map((img) => ({
      id: img.id,
      url: img.url || '', // Ensure url is never undefined
      isAIGenerated: img.isAIGenerated,
      difficulty: img.difficulty,
      source: img.source || 'Admin Upload',
      explanation: img.description || ''
    }));

    const challenge: DailyChallenge = {
      id: challengeId,
      date: challengeId,
      images: gameImages,
      totalImages: gameImages.length
    };

    // Cache the challenge
    const cacheKey = `challenge:${challengeId}`;
    await redis.set(cacheKey, JSON.stringify(challenge), { 
      expiration: new Date(Date.now() + 86400000) 
    });

    return challenge;
  }

  // Start a new game session
  static async startGameSession(userId: string, challengeId: string): Promise<GameSession | null> {
    try {
      const sessionKey = `session:${userId}:${challengeId}`;
      
      // Check if session already exists
      const existingSession = await redis.hGetAll(sessionKey);
      if (existingSession && Object.keys(existingSession).length > 0) {
        return {
          id: existingSession.id || `session-${userId}-${challengeId}`,
          userId,
          username: existingSession.username || 'anonymous',
          challengeId,
          startTime: new Date(existingSession.startTime || Date.now()),
          completed: existingSession.completed === 'true',
          guesses: JSON.parse(existingSession.guesses || '[]')
        };
      }

      // Get username from authentication
      let username = 'anonymous';
      try {
        const authResult = await AuthService.authenticateUser();
        if (authResult.success && authResult.user) {
          username = authResult.user.username;
        }
      } catch (authError) {
        console.warn('Authentication failed, using anonymous username:', authError);
      }

      // Create new session
      const session: GameSession = {
        id: `session-${userId}-${challengeId}-${Date.now()}`,
        userId,
        username,
        challengeId,
        startTime: new Date(),
        completed: false,
        guesses: []
      };

      // Store session in Redis
      await redis.hSet(sessionKey, {
        id: session.id,
        userId: session.userId,
        username: session.username,
        challengeId: session.challengeId,
        startTime: session.startTime.toISOString(),
        completed: 'false',
        guesses: JSON.stringify(session.guesses)
      });

      // Set TTL to 24 hours
      await redis.expire(sessionKey, 24 * 60 * 60);

      return session;
    } catch (error) {
      console.error('Error starting game session:', error);
      return null;
    }
  }

  // Submit a guess for an image
  static async submitGuess(
    userId: string, 
    challengeId: string, 
    imageId: string, 
    guess: boolean
  ): Promise<{ correct: boolean; explanation?: string } | null> {
    try {
      // Get the challenge to verify the correct answer
      const cacheKey = `challenge:${challengeId}`;
      const cachedChallenge = await redis.get(cacheKey);
      
      if (!cachedChallenge) {
        return null;
      }

      const challenge: DailyChallenge = JSON.parse(cachedChallenge);
      const image = challenge.images.find(img => img.id === imageId);
      
      if (!image) {
        return null;
      }

      const correct = guess === image.isAIGenerated;
      
      // Create guess record
      const imageGuess: ImageGuess = {
        imageId,
        guess,
        correct,
        timestamp: new Date(),
      };

      // Add guess to session
      const sessionKey = `session:${userId}:${challengeId}`;
      const sessionData = await redis.hGetAll(sessionKey);
      
      if (sessionData && Object.keys(sessionData).length > 0) {
        const existingGuesses = JSON.parse(sessionData.guesses || '[]');
        existingGuesses.push(imageGuess);
        
        await redis.hSet(sessionKey, {
          guesses: JSON.stringify(existingGuesses)
        });
      }

      return {
        correct,
        ...(image.explanation && { explanation: image.explanation }),
      };
    } catch (error) {
      console.error('Error submitting guess:', error);
      return null;
    }
  }

  // Complete a game session and calculate results
  static async completeGame(userId: string, challengeId: string): Promise<GameResult | null> {
    try {
      const sessionKey = `session:${userId}:${challengeId}`;
      const sessionData = await redis.hGetAll(sessionKey);
      
      if (!sessionData || Object.keys(sessionData).length === 0 || sessionData.completed === 'true') {
        return null;
      }

      const guesses: ImageGuess[] = JSON.parse(sessionData.guesses || '[]');
      
      // Calculate score
      const correctGuesses = guesses.filter(g => g.correct).length;
      const totalGuesses = guesses.length;
      const score = totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;

      // Mark session as completed
      await redis.hSet(sessionKey, {
        completed: 'true',
        score: score.toString(),
        completedAt: new Date().toISOString()
      });

      // Add to leaderboard
      const leaderboardKey = `leaderboard:${challengeId}`;
      await redis.zAdd(leaderboardKey, {
        member: `${userId}:${sessionData.username || 'anonymous'}`,
        score: score
      });

      return {
        sessionId: sessionData.id || `session-${userId}-${challengeId}`,
        score,
        correctCount: correctGuesses,
        totalCount: totalGuesses,
        rank: 1, // TODO: Calculate actual rank
        totalPlayers: 1, // TODO: Calculate actual total players
        achievements: [], // TODO: Implement achievements
      };
    } catch (error) {
      console.error('Error completing game:', error);
      return null;
    }
  }

  // Utility function to shuffle array
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp!;
    }
    return shuffled;
  }
}
