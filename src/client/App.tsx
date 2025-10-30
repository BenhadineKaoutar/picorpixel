import React, { useState } from 'react';
import { 
  ConnectedSplashScreen,
  ConnectedLeaderboardView
} from './components';
import { SimpleGameInterface } from './components/SimpleGameInterface';
import { SimpleResultsDisplay } from './components/SimpleResultsDisplay';
import { useApiStatus } from './hooks/useApiStatus';
import { useDailyChallenge } from './hooks';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineMessage } from './components/ErrorMessage';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { AdminPanel } from './components/AdminPanel';

import { errorService } from './services/errorService';
import { offlineService } from './services/offlineService';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import { useAdminAuth } from './hooks/useAdminAuth';

type GameState = 'splash' | 'playing' | 'results' | 'leaderboard';

// Simple wrapper for the playing state
const GamePlayingWrapper = ({ 
  challengeId, 
  onGameComplete 
}: { 
  challengeId: string; 
  onGameComplete: (score: number, correct: number, total: number) => void;
}) => {
  const { challenge } = useDailyChallenge();
  const dailyChallenge = challenge;

  // Show loading if no challenge
  if (!dailyChallenge) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <SimpleGameInterface
      challengeId={challengeId}
      images={dailyChallenge.images}
      onGameComplete={onGameComplete}
    />
  );
};

export const App = () => {
  const [gameState, setGameState] = useState<GameState>('splash');
  const [challengeId, setChallengeId] = useState<string>('');
  const [gameResults, setGameResults] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  useApiStatus(); // Initialize API status monitoring
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const { isAdmin } = useAdminAuth();
  
  // Performance monitoring
  const { startInteraction, endInteraction, recordMetric } = usePerformanceMonitoring();

  // Listen for offline state changes
  React.useEffect(() => {
    const unsubscribe = offlineService.addStateChangeListener((state) => {
      setShowOfflineMessage(!state.isOnline);
    });

    return unsubscribe;
  }, []);

  // Setup error reporting
  React.useEffect(() => {
    const unsubscribe = errorService.addErrorListener((error) => {
      // Could show toast notifications here
      console.debug('Error reported:', error);
    });

    return unsubscribe;
  }, []);

  // Track game state changes
  React.useEffect(() => {
    recordMetric(`game_state_${gameState}`, 1, 'count');
  }, [gameState, recordMetric]);

  const handlePlay = (id: string) => {
    startInteraction('start_game');
    setChallengeId(id);
    setGameState('playing');
    setTimeout(() => endInteraction('start_game'), 100);
  };

  const handleGameComplete = (score: number, correct: number, total: number) => {
    startInteraction('complete_game');
    setGameResults({ score, correct, total });
    setGameState('results');
    setTimeout(() => endInteraction('complete_game'), 100);
  };

  const handlePlayAgain = () => {
    startInteraction('play_again');
    setChallengeId('');
    setGameState('splash');
    setTimeout(() => endInteraction('play_again'), 100);
  };

  const handleViewLeaderboard = () => {
    startInteraction('view_leaderboard');
    setGameState('leaderboard');
    setTimeout(() => endInteraction('view_leaderboard'), 100);
  };

  const handleBackToSplash = () => {
    startInteraction('back_to_splash');
    setGameState('splash');
    setTimeout(() => endInteraction('back_to_splash'), 100);
  };

  const renderGameContent = () => {
    switch (gameState) {
      case 'splash':
        return <ConnectedSplashScreen onPlay={handlePlay} onLeaderboard={handleViewLeaderboard} />;
      
      case 'playing':
        return (
          <GamePlayingWrapper
            challengeId={challengeId}
            onGameComplete={handleGameComplete}
          />
        );
      
      case 'results':
        return gameResults ? (
          <SimpleResultsDisplay
            score={gameResults.score}
            correctCount={gameResults.correct}
            totalCount={gameResults.total}
            onPlayAgain={handlePlayAgain}
            onViewLeaderboard={handleViewLeaderboard}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading results...</p>
            </div>
          </div>
        );
      
      case 'leaderboard':
        return (
          <ConnectedLeaderboardView
            onBack={handleBackToSplash}
            onPlayGame={handlePlayAgain}
          />
        );
      
      default:
        return <ConnectedSplashScreen onPlay={handlePlay} />;
    }
  };

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        errorService.handleError(error, {
          context: {
            errorInfo,
            gameState,
            challengeId,
            component: 'App',
          },
        });
      }}
    >
      <PerformanceMonitor 
        showDebugInfo={process.env.NODE_ENV === 'development'}
        trackInteractions={true}
      >
        <div className="min-h-screen">
          {/* Admin Panel Trigger - Styled to match theme */}
          <button
            onClick={() => setShowAdminPanel(true)}
            className="fixed top-3 right-3 sm:top-4 sm:right-4 z-40 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-lg sm:text-xl
                       flex items-center justify-center
                       transition-all duration-200 hover:scale-110 active:scale-95
                       border-2 border-gray-800 shadow-md hover:shadow-lg"
            style={{ backgroundColor: 'var(--color-secondary)' }}
            title="Admin Panel"
            aria-label="Open Admin Panel"
          >
            ⚙️
          </button>

          {/* Admin Panel */}
          {showAdminPanel && (
            <AdminPanel onClose={() => setShowAdminPanel(false)} />
          )}

          {/* Offline notification */}
          {showOfflineMessage && (
            <div className="fixed top-0 left-0 right-0 z-50 p-4">
              <OfflineMessage
                onRetry={() => window.location.reload()}
                className="max-w-md mx-auto"
              />
            </div>
          )}

          {/* Main game content */}
          <div className={showOfflineMessage ? 'pt-20' : ''}>
            {renderGameContent()}
          </div>


        </div>
      </PerformanceMonitor>
    </ErrorBoundary>
  );
};
