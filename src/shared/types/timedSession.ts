// Enhanced types for timed game sessions

export interface TimedGameSession {
  id: string;
  challengeId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  timeLimit: number; // seconds
  images: string[]; // array of image IDs
  guesses: PlayerGuess[];
  finalScore?: SessionScore;
  status: 'active' | 'completed' | 'expired' | 'abandoned';
}

export interface PlayerGuess {
  imageId: string;
  guess: 'real' | 'ai';
  correctAnswer: 'real' | 'ai';
  isCorrect: boolean;
  timestamp: number;
  responseTime: number; // milliseconds from image display to guess
}

export interface SessionScore {
  totalCorrect: number;
  totalImages: number;
  accuracy: number; // percentage
  timeUsed: number; // seconds
  averageResponseTime: number; // milliseconds
  performanceRating: 'excellent' | 'good' | 'fair' | 'needs-practice';
  rank?: number; // compared to daily players
}

export type SessionState = 'playing' | 'feedback' | 'completed' | 'error';

export interface SessionFeedback {
  isCorrect: boolean;
  correctAnswer: 'real' | 'ai';
  currentScore: number;
  remainingImages: number;
  explanation?: string;
}

export interface SessionError {
  type: 'image_load' | 'network' | 'save' | 'timeout' | 'unknown';
  message: string;
  retryable: boolean;
  imageId?: string;
}
