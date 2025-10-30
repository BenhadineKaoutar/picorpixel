// Legacy counter hook (can be removed once PicOrPixel is fully implemented)
export { useCounter } from './useCounter';

// API status hook
export { useApiStatus } from './useApiStatus';
export type { ApiStatus } from './useApiStatus';

// Game-specific hooks
export { useDailyChallenge } from './useDailyChallenge';
export type { DailyChallengeState } from './useDailyChallenge';

export { useGameSession } from './useGameSession';
export type { GameSessionState } from './useGameSession';

export { useLeaderboard } from './useLeaderboard';
export type { LeaderboardState, LeaderboardPeriod } from './useLeaderboard';

export { usePersistedGameSession } from './usePersistedGameSession';
export type { PersistedGameSessionState } from './usePersistedGameSession';

export { useOptimizedImage } from './useOptimizedImage';
export type { OptimizedImageState, UseOptimizedImageOptions } from './useOptimizedImage';

// Image loading and error handling hooks
export { useImagePreloader } from './useImagePreloader';
export type { UseImagePreloaderOptions, ImagePreloaderState } from './useImagePreloader';

export { useNetworkStatus } from './useNetworkStatus';
export type { NetworkStatus } from './useNetworkStatus';

export { useImageErrorHandling, useMultiImageErrorHandling } from './useImageErrorHandling';
export type { ImageErrorHandlingOptions, ImageErrorHandlingState } from './useImageErrorHandling';

// Performance monitoring hook
export { usePerformanceMonitoring } from './usePerformanceMonitoring';
