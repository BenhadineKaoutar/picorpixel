import { DailyChallenge, GameResult, LeaderboardEntry, UserStats, ErrorResponse, Achievement } from './game';
import { 
  AdminAuthResponse, 
  ValidateImageUrlResponse, 
  AddImageResponse, 
  GetImagesResponse, 
  DeleteImageResponse 
} from './admin';

// Re-export ErrorResponse from game types
export type { ErrorResponse } from './game';

// Legacy API types (can be removed once PicOrPixel is fully implemented)
export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

// PicOrPixel API types
export interface DailyChallengeResponse {
  type: 'daily-challenge';
  challenge: DailyChallenge;
}

export interface SubmitGuessRequest {
  imageId: string;
  guess: boolean;
  challengeId: string;
}

export interface SubmitGuessResponse {
  type: 'submit-guess';
  correct: boolean;
  explanation?: string;
}

export interface CompleteGameRequest {
  challengeId: string;
}

export interface CompleteGameResponse {
  type: 'complete-game';
  result: GameResult;
}

export interface LeaderboardRequest {
  period?: 'daily' | 'weekly' | 'alltime';
  limit?: number;
}

export interface LeaderboardResponse {
  type: 'leaderboard';
  leaderboard: LeaderboardEntry[];
  period: 'daily' | 'weekly' | 'alltime';
  summary: {
    dailyLeader: LeaderboardEntry | null;
    totalPlayersToday: number;
    averageScoreToday: number;
  };
}

export interface UserStatsResponse {
  type: 'user-stats';
  stats: UserStats | null;
  currentRanking: {
    rank: number;
    score: number;
    totalPlayers: number;
  } | null;
}

// Reddit integration and sharing API types
export interface UserSessionResponse {
  type: 'user-session';
  user: {
    id: string;
    username: string;
    displayName: string;
    isAuthenticated: boolean;
  };
  context: {
    userId: string;
    username: string;
    subredditName?: string;
    postId?: string;
    isAuthenticated: boolean;
  };
}

export interface UserProfileResponse {
  type: 'user-profile';
  user: {
    id: string;
    username: string;
    displayName?: string;
    isVerified: boolean;
    karma: {
      post: number;
      comment: number;
    };
  };
  privacySettings: {
    shareUsername: boolean;
    shareStats: boolean;
    shareAchievements: boolean;
    allowLeaderboard: boolean;
  };
  context: {
    userId?: string;
    username?: string;
    subredditName?: string;
    postId?: string;
  };
}

export interface ShareResultsRequest {
  result: GameResult;
  shareType?: 'comment' | 'post';
  includeStats?: boolean;
}

export interface ShareResultsResponse {
  type: 'share-results';
  success: boolean;
  template: {
    title: string;
    content: string;
    formatted: string;
  };
  shareResult: {
    success: boolean;
    commentId?: string;
    postId?: string;
    error?: string;
  };
}

export interface ShareAchievementRequest {
  achievement: Achievement;
  shareType?: 'comment' | 'post';
}

export interface ShareAchievementResponse {
  type: 'share-achievement';
  success: boolean;
  template: {
    title: string;
    content: string;
    formatted: string;
  };
  shareResult: {
    success: boolean;
    commentId?: string;
    postId?: string;
    error?: string;
  };
}

export interface ShareTemplateResponse {
  type: 'share-template';
  template: {
    title: string;
    content: string;
    formatted: string;
  };
  sharingUrl: string;
}

export interface PrivacyUpdateRequest {
  shareUsername?: boolean;
  shareStats?: boolean;
  shareAchievements?: boolean;
  allowLeaderboard?: boolean;
}

export interface PrivacyUpdateResponse {
  type: 'privacy-update';
  success: boolean;
  message: string;
}

// Union type for all possible API responses
export type ApiResponse = 
  | InitResponse 
  | IncrementResponse 
  | DecrementResponse
  | DailyChallengeResponse
  | SubmitGuessResponse
  | CompleteGameResponse
  | LeaderboardResponse
  | UserStatsResponse
  | UserSessionResponse
  | UserProfileResponse
  | ShareResultsResponse
  | ShareAchievementResponse
  | ShareTemplateResponse
  | PrivacyUpdateResponse
  | AdminAuthResponse
  | ValidateImageUrlResponse
  | AddImageResponse
  | GetImagesResponse
  | DeleteImageResponse
  | ErrorResponse;
