// Core game data models for PicOrPixel

export interface DailyChallenge {
  id: string;
  date: string;
  images: GameImage[];
  totalImages: number;
}

export interface GameImage {
  id: string;
  url: string;
  isAIGenerated: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  source?: string;
  explanation?: string;
}

export interface GameSession {
  id: string;
  userId: string;
  username: string; // Reddit username for display purposes
  challengeId: string;
  startTime: Date;
  guesses: ImageGuess[];
  completed: boolean;
  score?: number;
}

export interface ImageGuess {
  imageId: string;
  guess: boolean;
  correct: boolean;
  timestamp: Date;
}

export interface GameResult {
  sessionId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  rank: number;
  totalPlayers: number;
  achievements?: Achievement[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  gamesPlayed: number;
  averageScore: number;
}

export interface UserStats {
  userId: string;
  totalGamesPlayed: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  scoreHistory: ScoreEntry[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: Date;
  icon: string;
}

export interface ScoreEntry {
  date: string;
  score: number;
  challengeId: string;
}

// Error response format
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryAfter?: number;
  };
}
