// Reddit sharing service for PicOrPixel
import { reddit, context } from '@devvit/web/server';
import { GameResult, Achievement } from '../../shared/types/game.js';
import { AuthService } from './authService.js';

export interface ShareTemplate {
  title: string;
  content: string;
  formatted: string;
}

export class SharingService {
  // Generate a formatted result sharing template
  static generateResultTemplate(
    result: GameResult,
    username?: string,
    includeStats: boolean = true
  ): ShareTemplate {
    const displayName = username || 'A player';
    const scoreEmoji = this.getScoreEmoji(result.score);
    const rankSuffix = this.getRankSuffix(result.rank);
    
    const title = `PicOrPixel Daily Challenge Results ${scoreEmoji}`;
    
    let content = `${displayName} scored ${result.score}% on today's PicOrPixel challenge!\n\n`;
    content += `📊 **Results:**\n`;
    content += `• Score: ${result.correctCount}/${result.totalCount} correct (${result.score}%)\n`;
    
    if (includeStats) {
      content += `• Rank: ${result.rank}${rankSuffix} out of ${result.totalPlayers} players\n`;
    }
    
    if (result.achievements && result.achievements.length > 0) {
      content += `\n🏆 **Achievements Unlocked:**\n`;
      result.achievements.forEach(achievement => {
        content += `• ${achievement.icon} ${achievement.name}: ${achievement.description}\n`;
      });
    }
    
    content += `\n🎯 Can you beat this score? Play PicOrPixel and test your AI detection skills!`;
    
    const formatted = this.formatForReddit(content);
    
    return {
      title,
      content,
      formatted,
    };
  }

  // Generate achievement sharing template
  static generateAchievementTemplate(
    achievement: Achievement,
    username?: string
  ): ShareTemplate {
    const displayName = username || 'A player';
    
    const title = `New PicOrPixel Achievement Unlocked! ${achievement.icon}`;
    
    let content = `${displayName} just unlocked a new achievement in PicOrPixel!\n\n`;
    content += `🏆 **${achievement.name}** ${achievement.icon}\n`;
    content += `${achievement.description}\n\n`;
    content += `🎯 Think you can earn this achievement too? Play PicOrPixel and find out!`;
    
    const formatted = this.formatForReddit(content);
    
    return {
      title,
      content,
      formatted,
    };
  }

  // Generate leaderboard sharing template
  static generateLeaderboardTemplate(
    rank: number,
    totalPlayers: number,
    score: number,
    period: 'daily' | 'weekly' | 'alltime' = 'daily',
    username?: string
  ): ShareTemplate {
    const displayName = username || 'A player';
    const rankSuffix = this.getRankSuffix(rank);
    const periodText = period === 'daily' ? 'today' : `this ${period}`;
    const emoji = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '🏆';
    
    const title = `PicOrPixel Leaderboard Update ${emoji}`;
    
    let content = `${displayName} is crushing it on the PicOrPixel leaderboard!\n\n`;
    content += `📈 **Leaderboard Position:**\n`;
    content += `• Rank: ${rank}${rankSuffix} out of ${totalPlayers} players ${periodText}\n`;
    content += `• Score: ${score}%\n\n`;
    
    if (rank <= 10) {
      content += `🔥 Top 10 performance! `;
    }
    
    content += `🎯 Can you climb higher? Play PicOrPixel and challenge the leaderboard!`;
    
    const formatted = this.formatForReddit(content);
    
    return {
      title,
      content,
      formatted,
    };
  }

  // Share results as a Reddit comment
  static async shareAsComment(
    template: ShareTemplate,
    postId?: string
  ): Promise<{ success: boolean; commentId?: string; error?: string }> {
    try {
      const targetPostId = postId || context.postId;
      
      if (!targetPostId) {
        return {
          success: false,
          error: 'No post ID available for sharing'
        };
      }

      // Check if user is authenticated
      const isAuthenticated = await AuthService.isAuthenticated();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Submit comment to Reddit
      const comment = await reddit.submitComment({
        id: targetPostId as `t3_${string}`,
        text: template.formatted,
      });

      return {
        success: true,
        commentId: comment.id,
      };
    } catch (error) {
      console.error('Error sharing as comment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share comment'
      };
    }
  }

  // Create a new post with results (for moderators or special cases)
  static async shareAsPost(
    template: ShareTemplate,
    subredditName?: string
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const targetSubreddit = subredditName || context.subredditName;
      
      if (!targetSubreddit) {
        return {
          success: false,
          error: 'No subreddit available for sharing'
        };
      }

      // Check if user is authenticated
      const isAuthenticated = await AuthService.isAuthenticated();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Submit post to Reddit
      const post = await reddit.submitPost({
        title: template.title,
        text: template.formatted,
        subredditName: targetSubreddit,
      });

      return {
        success: true,
        postId: post.id,
      };
    } catch (error) {
      console.error('Error sharing as post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share post'
      };
    }
  }

  // Get appropriate emoji for score
  private static getScoreEmoji(score: number): string {
    if (score === 100) return '🎯';
    if (score >= 90) return '🔥';
    if (score >= 80) return '⭐';
    if (score >= 70) return '👍';
    if (score >= 60) return '👌';
    return '🎮';
  }

  // Get ordinal suffix for rank
  private static getRankSuffix(rank: number): string {
    const lastDigit = rank % 10;
    const lastTwoDigits = rank % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }
    
    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // Format content for Reddit markdown
  private static formatForReddit(content: string): string {
    // Reddit uses markdown, so we can enhance the formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '**$1**') // Keep bold formatting
      .replace(/•/g, '*') // Convert bullets to markdown list items
      .replace(/\n\n/g, '\n\n') // Preserve paragraph breaks
      .trim();
  }

  // Generate sharing URL for external sharing
  static generateSharingUrl(
    template: ShareTemplate,
    subredditName?: string
  ): string {
    const targetSubreddit = subredditName || context.subredditName || 'PicOrPixel';
    const encodedTitle = encodeURIComponent(template.title);
    const encodedText = encodeURIComponent(template.formatted);
    
    return `https://www.reddit.com/r/${targetSubreddit}/submit?title=${encodedTitle}&text=${encodedText}`;
  }

  // Get sharing statistics
  static async getSharingStats(): Promise<{
    totalShares: number;
    sharesThisWeek: number;
    popularTemplates: string[];
  }> {
    try {
      // This would be implemented with proper analytics
      // For now, return placeholder data
      return {
        totalShares: 0,
        sharesThisWeek: 0,
        popularTemplates: ['results', 'achievements', 'leaderboard'],
      };
    } catch (error) {
      console.error('Error getting sharing stats:', error);
      return {
        totalShares: 0,
        sharesThisWeek: 0,
        popularTemplates: [],
      };
    }
  }
}
