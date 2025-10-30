import React, { useState } from 'react';
import { LeaderboardEntry, UserStats } from '../../shared/types/game';
import { ShareButton } from './ShareButton';

interface LeaderboardViewProps {
  leaderboard: LeaderboardEntry[];
  userStats: UserStats | null;
  currentUserId?: string;
  onBack?: () => void;
  onPlayGame?: () => void;
  loading?: boolean;
}

type LeaderboardPeriod = 'daily' | 'weekly' | 'alltime';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  leaderboard,
  userStats,
  currentUserId,
  onBack,
  onPlayGame,
  loading = false
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('daily');
  const [showAchievements, setShowAchievements] = useState(false);

  const getRankSuffix = (rank: number) => {
    if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
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

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥🔥🔥';
    if (streak >= 14) return '🔥🔥';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⚡';
    return '📅';
  };

  const periodLabels = {
    daily: 'Today',
    weekly: 'This Week',
    alltime: 'All Time'
  };

  return (
    <div 
      className="min-h-screen p-4"
      style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
    >
      {/* Header */}
      <div className="pixel-card max-w-4xl mx-auto p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="pixel-button p-2 rounded-lg"
                style={{ backgroundColor: 'white', color: 'var(--color-primary)' }}
                title="Back"
              >
                ←
              </button>
            )}
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              🏆 Leaderboard
            </h1>
          </div>
          {onPlayGame && (
            <button
              onClick={onPlayGame}
              className="pixel-button text-white font-bold py-2 px-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              ▶ Play
            </button>
          )}
        </div>

        {/* Period Selector */}
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(periodLabels) as LeaderboardPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`pixel-button py-2 px-4 rounded-lg text-sm font-bold ${
                selectedPeriod === period ? '' : 'opacity-60'
              }`}
              style={{
                backgroundColor: selectedPeriod === period ? 'var(--color-accent)' : 'white',
                color: selectedPeriod === period ? 'white' : 'var(--color-dark)',
              }}
            >
              {periodLabels[period]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Personal Stats */}
          {userStats && (
            <div className="lg:col-span-1">
              <div className="pixel-card p-6 mb-4">
                <h2 className="text-xl font-bold text-center mb-4" style={{ color: 'var(--color-primary)' }}>
                  📊 Your Stats
                </h2>
                
                <div className="space-y-3">
                  {/* Games Played */}
                  <div className="text-center p-3 rounded-lg border-2 border-gray-800" style={{ backgroundColor: 'var(--color-accent)' }}>
                    <div className="text-2xl font-bold text-white">
                      {userStats.totalGamesPlayed}
                    </div>
                    <div className="text-sm text-white font-semibold">Games Played</div>
                  </div>

                  {/* Best Score */}
                  <div className="text-center p-3 rounded-lg border-2 border-gray-800" style={{ backgroundColor: 'var(--color-success)' }}>
                    <div className="text-2xl font-bold text-white">
                      {userStats.bestScore}%
                    </div>
                    <div className="text-sm text-white font-semibold">Best Score</div>
                  </div>

                  {/* Average Score */}
                  <div className="text-center p-3 rounded-lg border-2 border-gray-800" style={{ backgroundColor: 'var(--color-secondary)' }}>
                    <div className="text-2xl font-bold text-white">
                      {userStats.averageScore}%
                    </div>
                    <div className="text-sm text-white font-semibold">Average Score</div>
                  </div>

                  {/* Streak */}
                  <div className="text-center p-3 rounded-lg border-2 border-gray-800" style={{ backgroundColor: 'var(--color-warning)' }}>
                    <div className="text-2xl font-bold" style={{ color: 'var(--color-dark)' }}>
                      {getStreakEmoji(userStats.currentStreak)} {userStats.currentStreak}
                    </div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>
                      Current Streak
                      {userStats.longestStreak > userStats.currentStreak && (
                        <div className="text-xs opacity-75">
                          Best: {userStats.longestStreak} days
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Share Stats Button */}
                <div className="mt-4">
                  <ShareButton
                    leaderboardData={{
                      rank: leaderboard.find(entry => entry.userId === currentUserId)?.rank || 0,
                      totalPlayers: leaderboard.length,
                      score: userStats.bestScore,
                      period: selectedPeriod
                    }}
                    variant="secondary"
                    size="medium"
                    className="w-full"
                    onShareSuccess={(shareType) => {
                      console.log(`Successfully shared leaderboard via ${shareType}`);
                    }}
                    onShareError={(error) => {
                      console.error('Share error:', error);
                    }}
                  />
                </div>

                {/* Achievements Button */}
                {userStats.achievements.length > 0 && (
                  <button
                    onClick={() => setShowAchievements(!showAchievements)}
                    className="pixel-button w-full mt-4 text-white font-bold py-3 px-4 rounded-lg"
                    style={{ backgroundColor: 'var(--color-warning)', color: 'var(--color-dark)' }}
                  >
                    🏆 Achievements ({userStats.achievements.length})
                  </button>
                )}
              </div>

              {/* Achievements Panel */}
              {showAchievements && userStats.achievements.length > 0 && (
                <div className="pixel-card p-6">
                  <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-primary)' }}>
                    🏆 Your Achievements
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {userStats.achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-800"
                        style={{ backgroundColor: 'var(--color-warning)' }}
                      >
                        <div className="text-xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="font-bold text-sm" style={{ color: 'var(--color-dark)' }}>
                            {achievement.name}
                          </div>
                          <div className="text-xs opacity-75" style={{ color: 'var(--color-dark)' }}>
                            {achievement.description}
                          </div>
                          <div className="text-xs opacity-60" style={{ color: 'var(--color-dark)' }}>
                            {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard */}
          <div className={userStats ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="pixel-card p-6">
              <h2 className="text-xl font-bold text-center mb-6" style={{ color: 'var(--color-primary)' }}>
                🏅 {periodLabels[selectedPeriod]} Top Players
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading leaderboard...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No players yet for this period</p>
                  {onPlayGame && (
                    <button
                      onClick={onPlayGame}
                      className="pixel-button text-white font-bold py-2 px-4 rounded-lg"
                      style={{ backgroundColor: 'var(--color-secondary)' }}
                    >
                      Be the first to play!
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => {
                    const isCurrentUser = entry.userId === currentUserId;
                    const bgColor = isCurrentUser
                      ? 'var(--color-accent)'
                      : index === 0
                      ? 'var(--color-warning)'
                      : index === 1
                      ? '#E8E8E8'
                      : index === 2
                      ? '#FFD7BE'
                      : 'white';
                    
                    return (
                      <div
                        key={entry.userId}
                        className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-800"
                        style={{ backgroundColor: bgColor }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-xl font-bold min-w-[3rem] text-center">
                            {getRankIcon(entry.rank)}
                          </div>
                          <div>
                            <div className={`font-bold ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                              {entry.username}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs bg-white text-blue-600 px-2 py-1 rounded-full font-bold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className={`text-sm ${isCurrentUser ? 'text-white opacity-90' : 'text-gray-600'}`}>
                              {entry.gamesPlayed} games • avg: {entry.averageScore}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                            {entry.score}%
                          </div>
                          <div className={`text-sm ${isCurrentUser ? 'text-white opacity-90' : 'text-gray-600'}`}>
                            {entry.rank}{getRankSuffix(entry.rank)} place
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
