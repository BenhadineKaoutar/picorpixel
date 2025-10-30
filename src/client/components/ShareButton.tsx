import React, { useState } from 'react';
import { GameResult, Achievement } from '../../shared/types/game';
import { ClientSharingService } from '../services/sharingService';

interface ShareButtonProps {
  result?: GameResult;
  achievement?: Achievement;
  leaderboardData?: {
    rank: number;
    totalPlayers: number;
    score: number;
    period?: 'daily' | 'weekly' | 'alltime';
  };
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onShareSuccess?: (shareType: string) => void;
  onShareError?: (error: string) => void;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  result,
  achievement,
  leaderboardData,
  variant = 'primary',
  size = 'medium',
  className = '',
  onShareSuccess,
  onShareError,
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleShare = async (shareType: 'comment' | 'post' | 'copy' | 'native') => {
    setIsSharing(true);
    setShowOptions(false);

    try {
      let shareResponse = null;
      let template = null;

      // Determine what to share and get the template
      if (result) {
        if (shareType === 'copy' || shareType === 'native') {
          template = await ClientSharingService.getResultsTemplate(result, true);
        } else {
          shareResponse = await ClientSharingService.shareResults(result, { 
            shareType, 
            includeStats: true 
          });
        }
      } else if (achievement) {
        if (shareType === 'copy' || shareType === 'native') {
          template = await ClientSharingService.getAchievementTemplate(achievement);
        } else {
          shareResponse = await ClientSharingService.shareAchievement(achievement, { 
            shareType 
          });
        }
      } else if (leaderboardData) {
        template = await ClientSharingService.getLeaderboardTemplate(
          leaderboardData.rank,
          leaderboardData.totalPlayers,
          leaderboardData.score,
          leaderboardData.period
        );
      }

      // Handle different sharing methods
      if (shareType === 'copy') {
        if (template) {
          const success = await ClientSharingService.copyToClipboard(template.template.formatted);
          if (success) {
            onShareSuccess?.('clipboard');
          } else {
            throw new Error('Failed to copy to clipboard');
          }
        }
      } else if (shareType === 'native') {
        if (template) {
          const success = await ClientSharingService.nativeShare(
            template.template.title,
            template.template.content
          );
          if (success) {
            onShareSuccess?.('native');
          } else {
            // Fallback to copy if native sharing fails
            const copySuccess = await ClientSharingService.copyToClipboard(template.template.formatted);
            if (copySuccess) {
              onShareSuccess?.('clipboard');
            } else {
              throw new Error('Failed to share');
            }
          }
        }
      } else if (shareResponse) {
        if (shareResponse.success) {
          onShareSuccess?.(shareType);
        } else {
          throw new Error('Failed to share to Reddit');
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      onShareError?.(error instanceof Error ? error.message : 'Failed to share');
    } finally {
      setIsSharing(false);
    }
  };

  const getButtonText = () => {
    if (isSharing) return 'Sharing...';
    if (result) return 'Share Results';
    if (achievement) return 'Share Achievement';
    if (leaderboardData) return 'Share Ranking';
    return 'Share';
  };

  const getButtonIcon = () => {
    if (result) return '📊';
    if (achievement) return '🏆';
    if (leaderboardData) return '📈';
    return '📤';
  };

  const buttonClasses = `
    share-button
    share-button--${variant}
    share-button--${size}
    ${isSharing ? 'share-button--loading' : ''}
    ${className}
  `.trim();

  return (
    <div className="share-button-container">
      <button
        className={buttonClasses}
        onClick={() => setShowOptions(!showOptions)}
        disabled={isSharing}
        aria-label={getButtonText()}
      >
        <span className="share-button__icon">{getButtonIcon()}</span>
        <span className="share-button__text">{getButtonText()}</span>
        {!isSharing && (
          <span className="share-button__arrow">▼</span>
        )}
      </button>

      {showOptions && !isSharing && (
        <div className="share-options">
          <div className="share-options__backdrop" onClick={() => setShowOptions(false)} />
          <div className="share-options__menu">
            <button
              className="share-option"
              onClick={() => handleShare('comment')}
            >
              <span className="share-option__icon">💬</span>
              <span className="share-option__text">Share as Comment</span>
            </button>
            
            <button
              className="share-option"
              onClick={() => handleShare('post')}
            >
              <span className="share-option__icon">📝</span>
              <span className="share-option__text">Create New Post</span>
            </button>
            
            <button
              className="share-option"
              onClick={() => handleShare('copy')}
            >
              <span className="share-option__icon">📋</span>
              <span className="share-option__text">Copy to Clipboard</span>
            </button>
            
            {ClientSharingService.isSharingSupported() && (
              <button
                className="share-option"
                onClick={() => handleShare('native')}
              >
                <span className="share-option__icon">📱</span>
                <span className="share-option__text">Share via Device</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
