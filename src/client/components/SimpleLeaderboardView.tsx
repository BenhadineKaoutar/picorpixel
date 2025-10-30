import React, { useEffect, useState } from 'react';
import { gameApi } from '../services';
import { LeaderboardEntry } from '../../shared/types/game';

interface SimpleLeaderboardViewProps {
  onBack?: () => void;
  onPlayGame?: () => void;
}

export const SimpleLeaderboardView: React.FC<SimpleLeaderboardViewProps> = ({
  onBack,
  onPlayGame,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'alltime'>('daily');

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await gameApi.getLeaderboard({ period, limit: 100 });
      setLeaderboard(response.leaderboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-light)' }}
      >
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Unable to Load Leaderboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-2">
            <button
              onClick={loadLeaderboard}
              className="flex-1 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              Try Again
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-light)' }}
    >
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-2xl"
                  title="Back"
                >
                  ←
                </button>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">🏆 Leaderboard</h1>
            </div>
            {onPlayGame && (
              <button
                onClick={onPlayGame}
                className="text-white font-bold py-2 px-4 rounded-lg
                           transform transition-all duration-200 hover:scale-105 hover:opacity-90"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              >
                🎮 Play Now
              </button>
            )}
          </div>

          {/* Period Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['daily', 'weekly', 'alltime'] as const).map((periodOption) => (
              <button
                key={periodOption}
                onClick={() => setPeriod(periodOption)}
                disabled={loading}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                  period === periodOption
                    ? 'bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={period === periodOption ? { color: 'var(--color-secondary)' } : {}}
              >
                {periodOption === 'daily' ? 'Today' : periodOption === 'weekly' ? 'This Week' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading leaderboard...</p>
            </div>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Players Yet</h3>
            <p className="text-gray-600 mb-4">Be the first to play and claim the top spot!</p>
            {onPlayGame && (
              <button
                onClick={onPlayGame}
                className="text-white font-bold py-3 px-6 rounded-lg
                           transform transition-all duration-200 hover:scale-105 hover:opacity-90"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              >
                Start Playing
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.userId}
                className={`bg-white rounded-lg shadow-sm p-4 flex items-center space-x-4
                           transform transition-all duration-200 hover:scale-102 hover:shadow-md
                           ${index < 3 ? 'border-2 border-yellow-400' : ''}`}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-16 text-center">
                  <div className="text-2xl font-bold">
                    {getRankIcon(entry.rank)}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {entry.username}
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.gamesPlayed} {entry.gamesPlayed === 1 ? 'game' : 'games'} played
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-secondary)' }}>
                    {entry.score}%
                  </div>
                  <div className="text-xs text-gray-500">
                    Avg: {entry.averageScore}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
