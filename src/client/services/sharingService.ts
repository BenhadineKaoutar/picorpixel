// Client-side sharing service for Reddit integration
import { GameResult, Achievement } from '../../shared/types/game';
import { 
  ShareResultsRequest, 
  ShareAchievementRequest,
  ShareResultsResponse,
  ShareAchievementResponse,
  ShareTemplateResponse
} from '../../shared/types/api';
import { apiClient } from './apiClient';

export interface ShareOptions {
  shareType?: 'comment' | 'post';
  includeStats?: boolean;
}

export class ClientSharingService {
  // Share game results to Reddit
  static async shareResults(
    result: GameResult, 
    options: ShareOptions = {}
  ): Promise<ShareResultsResponse | null> {
    try {
      const request: ShareResultsRequest = {
        result,
        shareType: options.shareType || 'comment',
        includeStats: options.includeStats ?? true,
      };

      const response = await apiClient.post<ShareResultsResponse>('/api/share-results', request);
      return response;
    } catch (error) {
      console.error('Error sharing results:', error);
      return null;
    }
  }

  // Share achievement to Reddit
  static async shareAchievement(
    achievement: Achievement,
    options: ShareOptions = {}
  ): Promise<ShareAchievementResponse | null> {
    try {
      const request: ShareAchievementRequest = {
        achievement,
        shareType: options.shareType || 'comment',
      };

      const response = await apiClient.post<ShareAchievementResponse>('/api/share-achievement', request);
      return response;
    } catch (error) {
      console.error('Error sharing achievement:', error);
      return null;
    }
  }

  // Get sharing template without actually sharing
  static async getResultsTemplate(
    result: GameResult,
    includeStats: boolean = true
  ): Promise<ShareTemplateResponse | null> {
    try {
      const params = new URLSearchParams({
        type: 'results',
        result: JSON.stringify(result),
        includeStats: includeStats.toString(),
      });

      const response = await apiClient.get<ShareTemplateResponse>(`/api/share-template?${params}`);
      return response;
    } catch (error) {
      console.error('Error getting results template:', error);
      return null;
    }
  }

  // Get achievement sharing template
  static async getAchievementTemplate(
    achievement: Achievement
  ): Promise<ShareTemplateResponse | null> {
    try {
      const params = new URLSearchParams({
        type: 'achievement',
        achievement: JSON.stringify(achievement),
      });

      const response = await apiClient.get<ShareTemplateResponse>(`/api/share-template?${params}`);
      return response;
    } catch (error) {
      console.error('Error getting achievement template:', error);
      return null;
    }
  }

  // Get leaderboard sharing template
  static async getLeaderboardTemplate(
    rank: number,
    totalPlayers: number,
    score: number,
    period: 'daily' | 'weekly' | 'alltime' = 'daily'
  ): Promise<ShareTemplateResponse | null> {
    try {
      const params = new URLSearchParams({
        type: 'leaderboard',
        rank: rank.toString(),
        totalPlayers: totalPlayers.toString(),
        score: score.toString(),
        period,
      });

      const response = await apiClient.get<ShareTemplateResponse>(`/api/share-template?${params}`);
      return response;
    } catch (error) {
      console.error('Error getting leaderboard template:', error);
      return null;
    }
  }

  // Copy sharing content to clipboard
  static async copyToClipboard(content: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        return true;
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  // Open Reddit sharing URL in new tab
  static openSharingUrl(sharingUrl: string): void {
    try {
      window.open(sharingUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening sharing URL:', error);
    }
  }

  // Generate social media sharing URLs
  static generateSocialUrls(content: string, title: string = 'PicOrPixel Results') {
    const encodedContent = encodeURIComponent(content);
    const encodedTitle = encodeURIComponent(title);
    const gameUrl = encodeURIComponent(window.location.origin);

    return {
      twitter: `https://twitter.com/intent/tweet?text=${encodedContent}&url=${gameUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${gameUrl}&quote=${encodedContent}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${gameUrl}&title=${encodedTitle}&summary=${encodedContent}`,
      reddit: `https://www.reddit.com/submit?title=${encodedTitle}&text=${encodedContent}`,
    };
  }

  // Format score for sharing
  static formatScoreForSharing(score: number): string {
    if (score === 100) return '🎯 Perfect Score!';
    if (score >= 90) return '🔥 Excellent!';
    if (score >= 80) return '⭐ Great job!';
    if (score >= 70) return '👍 Well done!';
    if (score >= 60) return '👌 Good effort!';
    return '🎮 Keep practicing!';
  }

  // Check if sharing is supported
  static isSharingSupported(): boolean {
    return 'navigator' in window && 'share' in navigator;
  }

  // Use native sharing API if available
  static async nativeShare(
    title: string,
    text: string,
    url?: string
  ): Promise<boolean> {
    try {
      if (!this.isSharingSupported()) {
        return false;
      }

      await navigator.share({
        title,
        text,
        url: url || window.location.href,
      });

      return true;
    } catch (error) {
      // User cancelled or sharing failed
      console.log('Native sharing cancelled or failed:', error);
      return false;
    }
  }
}
