// Base components
export { SplashScreen } from './SplashScreen';
export { GameInterface } from './GameInterface';
export { ResultsDisplay } from './ResultsDisplay';
export { LeaderboardView } from './LeaderboardView';

// Connected components (API-integrated)
export { ConnectedSplashScreen } from './ConnectedSplashScreen';
export { ConnectedGameInterface } from './ConnectedGameInterface';
export { ConnectedResultsDisplay } from './ConnectedResultsDisplay';
export { ConnectedLeaderboardView } from './ConnectedLeaderboardView';

// Utility components
export { SessionRecoveryDialog } from './SessionRecoveryDialog';

// Enhanced components with persistence
export { PersistentGameInterface } from './PersistentGameInterface';

// Mobile-optimized components
export { MobileSplashScreen } from './MobileSplashScreen';
export { MobileGameInterface } from './MobileGameInterface';
export { MobileResultsDisplay } from './MobileResultsDisplay';

// Optimized image components
export { OptimizedImage } from './OptimizedImage';
export { GameImageViewer } from './GameImageViewer';

// Accessible components
export { AccessibleSplashScreen } from './AccessibleSplashScreen';
export { AccessibleGameInterface } from './AccessibleGameInterface';

// Sharing components
export { ShareButton } from './ShareButton';

// Error handling components
export { ErrorBoundary, useErrorHandler } from './ErrorBoundary';
export { ErrorMessage, OfflineMessage, LoadingWithError } from './ErrorMessage';
export { ImageErrorHandler, ImageLoadingError, ImageLoadingIndicator } from './ImageErrorHandler';
export type { ImageErrorHandlerProps } from './ImageErrorHandler';

// Performance monitoring components
export { PerformanceMonitor } from './PerformanceMonitor';

// Modal components
export { HowToPlayModal } from './HowToPlayModal';

// Admin components
export { AdminPanel } from './AdminPanel';

// Timed session components
export { SessionTimer } from './SessionTimer';
export type { SessionTimerProps } from './SessionTimer';
export { ImageDisplay } from './ImageDisplay';
export { TimedGameInterface } from './TimedGameInterface';
export { ActionButtons } from './ActionButtons';
export type { ActionButtonsProps } from './ActionButtons';
export { FeedbackDisplay } from './FeedbackDisplay';
export type { FeedbackDisplayProps } from './FeedbackDisplay';

// Simple game interface
export { SimpleGameInterface } from './SimpleGameInterface';
export { SimpleLeaderboardView } from './SimpleLeaderboardView';
