import React, { useState, useEffect } from 'react';
import { GameResult, LeaderboardEntry } from '../../shared/types/game';

interface MobileResultsDisplayProps {
  gameResult: GameResult;
  leaderboard: LeaderboardEntry[];
  onPlayAgain?: () => void;
  onViewLeaderboard?: () => void;
  onShareToReddit?: () => void;
}

/**
 * Mobile-optimized results display component
 */
export const MobileResultsDisplay: React.FC<MobileResultsDisplayProps> = ({
  gameResult,
  leaderboard,
  onPlayAgain,
  onViewLeaderboard,
  onShareToReddit
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    // Trigger animations on mount
    const timer1 = setTimeout(() => setAnimateScore(true), 300);
    const timer2 = setTimeout(() => {
      if (gameResult.score >= 80 || gameResult.achievements?.length) {
        setShowCelebration(true);
      }
    }, 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [gameResult.score, gameResult.achievements]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 95) return "🏆 AI Detection Master!";
    if (score >= 85) return "🎯 Excellent Eye!";
    if (score >= 70) return "👍 Good Job!";
    if (score >= 50) return "🤔 Not Bad!";
    return "🎯 Keep Practicing!";
  };

  const getRankSuffix = (rank: number) => {
    if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const handleShareToReddit = async () => {
    const shareText = `🎮 Just played PicOrPixel on Reddit!\n\n` +
      `📊 Score: ${gameResult.score}% (${gameResult.correctCount}/${gameResult.totalCount})\n` +
      `🏆 Ranked #${gameResult.rank} out of ${gameResult.totalPlayers} players\n\n` +
      `Can you beat my score? 🤔`;

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }

    // Call the provided callback
    if (onShareToReddit) {
      onShareToReddit();
    }
  };

  return (
    <div className="results-container relative overflow-hidden">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-1/4 left-1/4 text-3xl animate-bounce">🎉</div>
          <div className="absolute top-1/3 right-1/4 text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎊</div>
          <div className="absolute bottom-1/3 left-1/3 text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</div>
          <div className="absolute bottom-1/4 right-1/3 text-3xl animate-bounce" style={{ animationDelay: '0.3s' }}>🏆</div>
        </div>
      )}

      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center animate-slide-up">
          <h1 className="text-responsive-3xl font-bold text-gray-900 mb-2">
            Game Complete!
          </h1>
          <p className="text-responsive-lg text-gray-600">
            {getScoreMessage(gameResult.score)}
          </p>
        </div>

        {/* Score Display */}
        <div className="results-card">
          <div className={`results-score transition-all duration-1000 ${
            animateScore ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          } ${getScoreColor(gameResult.score)}`}>
            {gameResult.score}%
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {gameResult.correctCount}
              </div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {gameResult.totalCount - gameResult.correctCount}
              </div>
              <div className="text-sm text-gray-600">Incorrect</div>
            </div>
          </div>

          {/* Ranking */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800 mb-1">
                Community Ranking
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                #{gameResult.rank}{getRankSuffix(gameResult.rank)}
              </div>
              <div className="text-sm text-gray-600">
                out of {gameResult.totalPlayers.toLocaleString()} players
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {gameResult.achievements && gameResult.achievements.length > 0 && (
          <div className="results-card animate-bounce-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              🏆 New Achievements!
            </h3>
            <div className="space-y-3">
              {gameResult.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center space-x-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200"
                >
                  <div className="text-2xl flex-shrink-0">{achievement.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm">
                      {achievement.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {achievement.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Players Preview */}
        {leaderboard.length > 0 && (
          <div className="results-card">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              🏅 Today's Top Players
            </h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 3).map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-200' :
                    index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200' :
                    'bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-xl font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-800 text-sm truncate">
                        {entry.username}
                      </div>
                      <div className="text-xs text-gray-600">
                        {entry.gamesPlayed} games
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg text-blue-600">
                      {entry.score}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4 safe-area-padding">
          {/* Share Button */}
          {onShareToReddit && (
            <button
              onClick={handleShareToReddit}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600
                         text-white font-bold py-4 px-6 rounded-xl text-responsive-lg
                         transform transition-all duration-200 hover:scale-105 active:scale-95
                         shadow-lg hover:shadow-xl touch-manipulation
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">📱</span>
                <span>{shareSuccess ? 'Copied to Clipboard!' : 'Share Results to Reddit'}</span>
              </div>
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Play Again Button */}
            {onPlayAgain && (
              <button
                onClick={onPlayAgain}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                           text-white font-bold py-4 px-6 rounded-xl text-responsive-lg
                           transform transition-all duration-200 hover:scale-105 active:scale-95
                           shadow-lg hover:shadow-xl touch-manipulation
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xl">🎮</span>
                  <span>Play Again</span>
                </div>
              </button>
            )}

            {/* View Leaderboard Button */}
            {onViewLeaderboard && (
              <button
                onClick={onViewLeaderboard}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700
                           text-white font-bold py-4 px-6 rounded-xl text-responsive-lg
                           transform transition-all duration-200 hover:scale-105 active:scale-95
                           shadow-lg hover:shadow-xl touch-manipulation
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xl">🏆</span>
                  <span>Leaderboard</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center px-4 pb-4">
          <p className="text-xs text-gray-500">
            Thanks for playing PicOrPixel! Come back tomorrow for a new challenge.
          </p>
        </div>
      </div>
    </div>
  );
};
