// API Client utilities
export { apiClient, ApiClient, ApiError } from './apiClient';
export type { ApiClientConfig } from './apiClient';

// Game API service
export { gameApi, GameApiService } from './gameApi';

// Image loading and error handling services
export { imagePreloader, ImagePreloader } from './imagePreloader';
export type { ImageLoadResult, ImageLoadError, PreloadOptions } from './imagePreloader';

export { errorRecoveryService, ErrorRecoveryService } from './errorRecoveryService';
export type { RetryStrategy, RecoveryOptions, RecoveryState } from './errorRecoveryService';

export { imageLoadingStateManager, ImageLoadingStateManager } from './imageLoadingStateManager';
export type { LoadingState, LoadingStateManagerOptions } from './imageLoadingStateManager';

// Error and offline services
export { errorService, ErrorService } from './errorService';
export type { ErrorReport, ErrorHandlerOptions } from './errorService';

export { offlineService, OfflineService } from './offlineService';
export type { OfflineState, OfflineAction } from './offlineService';

// Performance service
export { performanceService } from './performanceService';

// Sharing service
export { sharingService } from './sharingService';

// Re-export API types for convenience
export type {
  DailyChallengeResponse,
  SubmitGuessRequest,
  SubmitGuessResponse,
  CompleteGameRequest,
  CompleteGameResponse,
  LeaderboardRequest,
  LeaderboardResponse,
  UserStatsResponse,
  ApiResponse,
  ErrorResponse,
} from '../../shared/types/api';
