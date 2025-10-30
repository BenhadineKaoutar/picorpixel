import React, { useState, useEffect } from 'react';
import { GameResult, LeaderboardEntry } from '../../shared/types/game';
import { SessionScore } from '../../shared/types/timedSession';
import { ShareButton } from './ShareButton';

interface ResultsDisplayProps {
  gameResult: GameResult;
  leaderboard: LeaderboardEntry[];
  sessionScore?: SessionScore; // Enhanced session data with timing
  dailyAverage?: number; // Daily average performance for comparison
  onPlayAgain?: () => void;
  onViewLeaderboard?: () => void;
  onShareToReddit?: () => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  gameResult,
  leaderboard,
  sessionScore,
  dailyAverage,
  onPlayAgain,
  onViewLeaderboard,
  onShareToReddit
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);

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

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPerformanceRating = (rating?: string): { text: string; icon: string; color: string } => {
    switch (rating) {
      case 'excellent':
        return { text: 'Excellent', icon: '🌟', color: 'text-yellow-600' };
      case 'good':
        return { text: 'Good', icon: '👍', color: 'text-green-600' };
      case 'fair':
        return { text: 'Fair', icon: '👌', color: 'text-blue-600' };
      case 'needs-practice':
        return { text: 'Needs Practice', icon: '💪', color: 'text-orange-600' };
      default:
        return { text: 'Good', icon: '👍', color: 'text-green-600' };
    }
  };

  const getComparisonMessage = (userScore: number, average?: number): { message: string; color: string; icon: string } => {
    if (!average) return { message: '', color: '', icon: '' };
    
    const difference = userScore - average;
    if (difference > 15) {
      return { 
        message: `${Math.round(difference)}% above average!`, 
        color: 'text-green-600', 
        icon: '🚀' 
      };
    } else if (difference > 5) {
      return { 
        message: `${Math.round(difference)}% above average`, 
        color: 'text-green-600', 
        icon: '📈' 
      };
    } else if (difference > -5) {
      return { 
        message: 'Right on average', 
        color: 'text-blue-600', 
        icon: '🎯' 
      };
    } else if (difference > -15) {
      return { 
        message: `${Math.abs(Math.round(difference))}% below average`, 
        color: 'text-orange-600', 
        icon: '📊' 
      };
    } else {
      return { 
        message: `${Math.abs(Math.round(difference))}% below average`, 
        color: 'text-red-600', 
        icon: '📉' 
      };
    }
  };

  const performanceRating = getPerformanceRating(sessionScore?.performanceRating);
  const comparison = getComparisonMessage(gameResult.score, dailyAverage);

  // formatShareText function moved to ShareButton component

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 relative overflow-hidden">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 text-4xl animate-bounce">🎉</div>
          <div className="absolute top-1/3 right-1/4 text-4xl animate-bounce delay-100">🎊</div>
          <div className="absolute bottom-1/3 left-1/3 text-4xl animate-bounce delay-200">✨</div>
          <div className="absolute bottom-1/4 right-1/3 text-4xl animate-bounce delay-300">🏆</div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Game Complete!
          </h1>
          <p className="text-lg text-gray-600">
            {getScoreMessage(gameResult.score)}
          </p>
        </div>

        {/* Score Display */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6 text-center">
          <div className={`text-6xl md:text-8xl font-bold mb-4 transition-all duration-1000 ${
            animateScore ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          } ${getScoreColor(gameResult.score)}`}>
            {gameResult.score}%
          </div>
          
          {/* Performance Rating */}
          <div className={`text-xl font-semibold mb-6 ${performanceRating.color}`}>
            {performanceRating.icon} {performanceRating.text}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {gameResult.correctCount}
              </div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {gameResult.totalCount - gameResult.correctCount}
              </div>
              <div className="text-sm text-gray-600">Incorrect</div>
            </div>
          </div>

          {/* Timing and Performance Stats */}
          {sessionScore && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(sessionScore.timeUsed)}
                </div>
                <div className="text-sm text-gray-600">Completion Time</div>
                {sessionScore.timeUsed < 180 && (
                  <div className="text-xs text-green-600 mt-1">⚡ Speed Bonus!</div>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {(sessionScore.averageResponseTime / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600">Avg Response Time</div>
                {sessionScore.averageResponseTime < 5000 && (
                  <div className="text-xs text-purple-600 mt-1">🎯 Quick Thinking!</div>
                )}
              </div>
            </div>
          )}

          {/* Daily Average Comparison */}
          {dailyAverage && comparison.message && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-6">
              <div className="text-lg font-semibold text-gray-800 mb-2">
                Daily Performance Comparison
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">{comparison.icon}</span>
                <span className={`text-lg font-semibold ${comparison.color}`}>
                  {comparison.message}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Daily average: {Math.round(dailyAverage)}%
              </div>
            </div>
          )}

          {/* Ranking */}
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4">
            <div className="text-lg font-semibold text-gray-800 mb-1">
              Community Ranking
            </div>
            <div className="text-2xl font-bold text-blue-600">
              #{gameResult.rank}{getRankSuffix(gameResult.rank)}
            </div>
            <div className="text-sm text-gray-600">
              out of {gameResult.totalPlayers.toLocaleString()} players
            </div>
          </div>
        </div>

        {/* Achievements */}
        {gameResult.achievements && gameResult.achievements.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              🏆 New Achievements!
            </h3>
            <div className="space-y-3">
              {gameResult.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 animate-pulse"
                >
                  <div className="text-2xl">{achievement.icon}</div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {achievement.name}
                    </div>
                    <div className="text-sm text-gray-600">
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
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              🏅 Today's Top Players
            </h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-200' :
                    index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200' :
                    index === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200' :
                    'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-lg font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {entry.username}
                      </div>
                      <div className="text-sm text-gray-600">
                        {entry.gamesPlayed} games played
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-blue-600">
                      {entry.score}%
                    </div>
                    <div className="text-sm text-gray-600">
                      avg: {entry.averageScore}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Share Button */}
          <div className="w-full">
            <ShareButton
              result={gameResult}
              leaderboardData={{
                rank: gameResult.rank,
                totalPlayers: gameResult.totalPlayers,
                score: gameResult.score,
                period: 'daily'
              }}
              variant="primary"
              size="large"
              className="w-full"
              onShareSuccess={(shareType) => {
                console.log(`Successfully shared via ${shareType}`);
                // You could show a toast notification here
              }}
              onShareError={(error) => {
                console.error('Share error:', error);
                // You could show an error toast here
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Play Again Button */}
            {onPlayAgain && (
              <button
                onClick={onPlayAgain}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                           text-white font-bold py-4 px-6 rounded-lg text-lg
                           transform transition-all duration-200 hover:scale-105 active:scale-95
                           shadow-lg hover:shadow-xl"
              >
                🎮 Play Again
              </button>
            )}

            {/* View Leaderboard Button */}
            {onViewLeaderboard && (
              <button
                onClick={onViewLeaderboard}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700
                           text-white font-bold py-4 px-6 rounded-lg text-lg
                           transform transition-all duration-200 hover:scale-105 active:scale-95
                           shadow-lg hover:shadow-xl"
              >
                🏆 Full Leaderboard
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Thanks for playing PicOrPixel! Come back tomorrow for a new challenge.</p>
        </div>
      </div>
    </div>
  );
};
