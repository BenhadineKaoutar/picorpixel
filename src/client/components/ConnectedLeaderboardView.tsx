import React, { useEffect } from 'react';
import { LeaderboardView } from './LeaderboardView';
import { useLeaderboard, LeaderboardPeriod } from '../hooks';

interface ConnectedLeaderboardViewProps {
  currentUserId?: string;
  onBack?: () => void;
  onPlayGame?: () => void;
  initialPeriod?: LeaderboardPeriod;
}

/**
 * Connected version of LeaderboardView that manages leaderboard data
 */
export const ConnectedLeaderboardView: React.FC<ConnectedLeaderboardViewProps> = ({
  currentUserId,
  onBack,
  onPlayGame,
  initialPeriod = 'daily',
}) => {
  const { leaderboard, userStats, loading, error, refresh, clearError } =
    useLeaderboard(initialPeriod);

  // Clear error when component mounts
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  // Show error overlay if there's a persistent error
  if (error && !loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
      >
        <div className="pixel-card p-8 max-w-md w-full text-center animate-pop-in">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>
            Unable to Load Leaderboard
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={refresh}
              className="pixel-button flex-1 text-white font-bold py-3 px-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              Try Again
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="pixel-button flex-1 font-bold py-3 px-4 rounded-lg"
                style={{ backgroundColor: 'white', color: 'var(--color-dark)' }}
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Simply pass through to LeaderboardView which now handles its own styling
  return (
    <LeaderboardView
      leaderboard={leaderboard}
      userStats={userStats}
      {...(currentUserId && { currentUserId })}
      {...(onBack && { onBack })}
      {...(onPlayGame && { onPlayGame })}
      loading={loading}
    />
  );
};
