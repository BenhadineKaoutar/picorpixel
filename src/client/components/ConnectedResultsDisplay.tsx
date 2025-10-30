import React, { useEffect, useState } from 'react';
import { ResultsDisplay } from './ResultsDisplay';
import { useGameSession, useLeaderboard } from '../hooks';
import { gameApi } from '../services';

interface ConnectedResultsDisplayProps {
  onPlayAgain?: () => void;
  onViewLeaderboard?: () => void;
  onShareToReddit?: () => void;
}

/**
 * Connected version of ResultsDisplay that fetches leaderboard data
 */
export const ConnectedResultsDisplay: React.FC<ConnectedResultsDisplayProps> = ({
  onPlayAgain,
  onViewLeaderboard,
  onShareToReddit,
}) => {
  const { gameResult } = useGameSession();
  const { leaderboard, fetchLeaderboard } = useLeaderboard();
  const [dailyAverage, setDailyAverage] = useState<number | undefined>();
  const [sessionScore, setSessionScore] = useState<any>(undefined);

  // Fetch fresh leaderboard data and daily average when results are shown
  useEffect(() => {
    fetchLeaderboard('daily');
    
    // Fetch daily average performance
    const fetchDailyAverage = async () => {
      try {
        const response = await gameApi.getDailyStats();
        setDailyAverage(response.averageScore);
      } catch (error) {
        console.error('Failed to fetch daily average:', error);
        // Don't show error to user, just don't display comparison
      }
    };
    
    fetchDailyAverage();
  }, [fetchLeaderboard]);

  // Extract session score from game result if available
  useEffect(() => {
    // Check if gameResult has sessionScore data (from enhanced API response)
    if (gameResult && (gameResult as any).sessionScore) {
      setSessionScore((gameResult as any).sessionScore);
    }
  }, [gameResult]);

  // Show loading if no game result
  if (!gameResult) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2D3561 100%)' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-xl font-bold">Loading results...</p>
        </div>
      </div>
    );
  }

  const handleShareToReddit = () => {
    // Create share text
    const shareText =
      `🎮 Just played PicOrPixel on Reddit!\n\n` +
      `📊 Score: ${gameResult.score}% (${gameResult.correctCount}/${gameResult.totalCount})\n` +
      `🏆 Ranked #${gameResult.rank} out of ${gameResult.totalPlayers} players\n\n` +
      `Can you beat my score? 🤔`;

    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          console.log('Share text copied to clipboard');
        })
        .catch((error) => {
          console.error('Failed to copy to clipboard:', error);
        });
    }

    // Call the provided callback
    if (onShareToReddit) {
      onShareToReddit();
    }
  };

  return (
    <ResultsDisplay
      gameResult={gameResult}
      leaderboard={leaderboard.slice(0, 5)} // Show top 5 players
      sessionScore={sessionScore}
      {...(dailyAverage !== undefined && { dailyAverage })}
      {...(onPlayAgain && { onPlayAgain })}
      {...(onViewLeaderboard && { onViewLeaderboard })}
      onShareToReddit={handleShareToReddit}
    />
  );
};
