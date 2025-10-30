// Authentication service for Reddit user integration
import { reddit, context } from '@devvit/web/server';
import { redis } from '@devvit/web/server';

export interface RedditUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified: boolean;
  isModerator: boolean;
  createdAt: Date;
  karma: {
    post: number;
    comment: number;
  };
}

export interface UserPrivacySettings {
  shareUsername: boolean;
  shareStats: boolean;
  shareAchievements: boolean;
  allowLeaderboard: boolean;
}

export interface UserContext {
  userId: string;
  username: string;
  subredditName?: string;
  postId?: string | undefined;
  isAuthenticated: boolean;
}

export interface AuthenticationResult {
  success: boolean;
  user?: RedditUser;
  error?: string;
}

export class AuthService {
  // Get current Reddit user information with enhanced error handling
  static async getCurrentUser(): Promise<RedditUser | null> {
    try {
      // Check for development mode first
      const isDevelopmentMode =
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'dev' ||
        !process.env.NODE_ENV ||
        context.subredditName?.includes('_dev') ||
        context.subredditName?.includes('test');

      console.log('Auth check - Development mode:', isDevelopmentMode, 'Context:', {
        userId: context.userId,
        subredditName: context.subredditName,
        NODE_ENV: process.env.NODE_ENV,
      });

      // In development mode, always create an admin user
      if (isDevelopmentMode) {
        console.log('Development mode: creating admin user for No-Bedroom-1453');
        return {
          id: context.userId || 'dev-user',
          username: 'No-Bedroom-1453',
          displayName: 'No-Bedroom-1453',
          isVerified: false,
          isModerator: true, // Grant admin access in development
          createdAt: new Date(),
          karma: { post: 0, comment: 0 },
        };
      }

      const username = await reddit.getCurrentUsername();
      if (!username) {
        console.log('No username found in Reddit context');
        return null;
      }

      // Get user details from Reddit API
      let user;
      try {
        if (context.userId) {
          user = await reddit.getUserById(context.userId);
        } else {
          // Fallback: try to get user by username
          user = await reddit.getUserByUsername(username);
        }
      } catch (userError) {
        console.error('Error fetching user details:', userError);
        // Create minimal user object from available data
        user = {
          id: context.userId || username,
          username: username,
          createdAt: new Date(),
          linkKarma: 0,
          commentKarma: 0,
        };
      }

      if (!user) {
        console.error('Could not retrieve user details');
        return null;
      }

      // Check if user is a moderator of the current subreddit
      let isModerator = false;
      try {
        if (context.subredditName && context.subredditId) {
          const subreddit = await reddit.getSubredditByName(context.subredditName);
          if (subreddit) {
            const moderators = await subreddit.getModerators();
            // Convert moderators to array if it's not already
            // Handle moderators listing - convert to array for checking
            let modArray: any[] = [];
            try {
              if (Array.isArray(moderators)) {
                modArray = moderators;
              } else if (moderators && (moderators as any).items) {
                // If it's a Listing object with items property
                modArray = (moderators as any).items;
              } else {
                // Try to convert to array
                modArray = moderators ? Object.values(moderators) : [];
              }
              isModerator = modArray.some((mod: any) => mod && mod.username === user.username);
            } catch (conversionError) {
              console.error('Error converting moderators to array:', conversionError);
              isModerator = false;
            }
          }
        }
      } catch (error) {
        console.error('Error checking moderator status:', error);
      }

      // Always check admin list and development mode (moved outside try-catch)
      const adminUsernames = ['HP', 'No-Bedroom-1453']; // Add your Reddit username here
      const isAdminUser = adminUsernames.includes(user.username);
      if (isAdminUser) {
        console.log(`Admin user detected: ${user.username}`);
        isModerator = true;
      }

      // For development/testing: allow any user to be admin
      // Check multiple ways to detect development environment
      const isDevelopment =
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'dev' ||
        !process.env.NODE_ENV || // Default to development if not set
        context.subredditName?.includes('_dev') || // Devvit creates _dev subreddits
        context.subredditName?.includes('test');

      if (isDevelopment) {
        console.log(`Development mode detected: granting admin access to user ${user.username}`);
        console.log(
          `Environment: NODE_ENV=${process.env.NODE_ENV}, subreddit=${context.subredditName}`
        );
        isModerator = true;
      }

      // Always log the current username for admin setup
      console.log(
        `Current user attempting admin access: "${user.username}" (isModerator: ${isModerator})`
      );
      console.log(`Admin usernames list: ${JSON.stringify(adminUsernames)}`);

      return {
        id: user.id,
        username: user.username,
        displayName: user.username, // Reddit doesn't have separate display names
        isVerified: false, // Would need to check verification status
        isModerator,
        createdAt: user.createdAt,
        karma: {
          post: user.linkKarma || 0,
          comment: user.commentKarma || 0,
        },
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Authenticate user and return comprehensive result
  static async authenticateUser(): Promise<AuthenticationResult> {
    try {
      const user = await this.getCurrentUser();

      if (!user) {
        return {
          success: false,
          error: 'Failed to retrieve user information from Reddit',
        };
      }

      // Cache user information for session management
      await this.cacheUserSession(user);

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown authentication error',
      };
    }
  }

  // Cache user session information
  static async cacheUserSession(user: RedditUser): Promise<void> {
    try {
      const sessionKey = `user:session:${user.id}`;
      const sessionData = {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        isModerator: user.isModerator.toString(),
        lastActive: new Date().toISOString(),
      };

      await redis.hSet(sessionKey, sessionData);
      // Set TTL to 24 hours
      await redis.expire(sessionKey, 24 * 60 * 60);
    } catch (error) {
      console.error('Error caching user session:', error);
    }
  }

  // Get cached user session
  static async getCachedUserSession(userId: string): Promise<RedditUser | null> {
    try {
      const sessionKey = `user:session:${userId}`;
      const sessionData = await redis.hGetAll(sessionKey);

      if (!sessionData || Object.keys(sessionData).length === 0) {
        return null;
      }

      return {
        id: sessionData.id || userId,
        username: sessionData.username || 'anonymous',
        displayName: sessionData.displayName || sessionData.username || 'Anonymous',
        isVerified: false,
        isModerator: sessionData.isModerator === 'true',
        createdAt: new Date(),
        karma: { post: 0, comment: 0 },
      };
    } catch (error) {
      console.error('Error getting cached user session:', error);
      return null;
    }
  }

  // Get user ID for internal use
  static async getCurrentUserId(): Promise<string> {
    try {
      const username = await reddit.getCurrentUsername();
      return username || 'anonymous';
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return 'anonymous';
    }
  }

  // Get display name for user (respects privacy settings)
  static async getDisplayName(userId: string): Promise<string> {
    try {
      const privacySettings = await this.getUserPrivacySettings(userId);

      if (!privacySettings.shareUsername) {
        return 'Anonymous Player';
      }

      // For current user, we can get the username directly
      if (userId === (await this.getCurrentUserId())) {
        const username = await reddit.getCurrentUsername();
        return username || 'Anonymous Player';
      }

      // For other users, we might have cached their display names
      const cachedName = await redis.get(`user:display:${userId}`);
      return cachedName || 'Anonymous Player';
    } catch (error) {
      console.error('Error getting display name:', error);
      return 'Anonymous Player';
    }
  }

  // Cache user display name for leaderboards
  static async cacheUserDisplayName(userId: string, displayName: string): Promise<void> {
    try {
      await redis.set(`user:display:${userId}`, displayName, {
        expiration: new Date(Date.now() + 86400 * 1000),
      }); // 24 hour cache
    } catch (error) {
      console.error('Error caching user display name:', error);
    }
  }

  // Get user privacy settings
  static async getUserPrivacySettings(userId: string): Promise<UserPrivacySettings> {
    try {
      const settingsKey = `user:privacy:${userId}`;
      const settings = await redis.hGetAll(settingsKey);

      return {
        shareUsername: settings.shareUsername !== 'false', // Default to true
        shareStats: settings.shareStats !== 'false', // Default to true
        shareAchievements: settings.shareAchievements !== 'false', // Default to true
        allowLeaderboard: settings.allowLeaderboard !== 'false', // Default to true
      };
    } catch (error) {
      console.error('Error getting user privacy settings:', error);
      // Return default settings (all sharing enabled)
      return {
        shareUsername: true,
        shareStats: true,
        shareAchievements: true,
        allowLeaderboard: true,
      };
    }
  }

  // Update user privacy settings
  static async updateUserPrivacySettings(
    userId: string,
    settings: Partial<UserPrivacySettings>
  ): Promise<boolean> {
    try {
      const settingsKey = `user:privacy:${userId}`;
      const updates: Record<string, string> = {};

      if (settings.shareUsername !== undefined) {
        updates.shareUsername = settings.shareUsername.toString();
      }
      if (settings.shareStats !== undefined) {
        updates.shareStats = settings.shareStats.toString();
      }
      if (settings.shareAchievements !== undefined) {
        updates.shareAchievements = settings.shareAchievements.toString();
      }
      if (settings.allowLeaderboard !== undefined) {
        updates.allowLeaderboard = settings.allowLeaderboard.toString();
      }

      if (Object.keys(updates).length > 0) {
        await redis.hSet(settingsKey, updates);
      }

      return true;
    } catch (error) {
      console.error('Error updating user privacy settings:', error);
      return false;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const username = await reddit.getCurrentUsername();
      return !!username;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Get user context information with authentication status
  static async getUserContext(): Promise<UserContext> {
    try {
      const username = await reddit.getCurrentUsername();
      const isAuthenticated = !!username;

      return {
        userId: context.userId || username || 'anonymous',
        username: username || 'anonymous',
        subredditName: context.subredditName,
        postId: context.postId ? context.postId : undefined,
        isAuthenticated,
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {
        userId: 'anonymous',
        username: 'anonymous',
        subredditName: context.subredditName,
        postId: context.postId ? context.postId : undefined,
        isAuthenticated: false,
      };
    }
  }

  // Validate current session and refresh if needed
  static async validateSession(): Promise<boolean> {
    try {
      const username = await reddit.getCurrentUsername();
      if (!username) {
        return false;
      }

      // Check if we have a cached session
      const userId = context.userId || username;
      const cachedSession = await this.getCachedUserSession(userId);

      if (!cachedSession) {
        // Refresh session by re-authenticating
        const authResult = await this.authenticateUser();
        return authResult.success;
      }

      // Update last active timestamp
      const sessionKey = `user:session:${userId}`;
      await redis.hSet(sessionKey, { lastActive: new Date().toISOString() });

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  // Handle authentication failures gracefully
  static async handleAuthFailure(
    error: Error
  ): Promise<{ fallbackUser: RedditUser | null; shouldRetry: boolean }> {
    console.error('Authentication failure:', error);

    // Check if this is a temporary network issue
    const isNetworkError =
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('connection');

    // Try to get cached user data as fallback
    let fallbackUser: RedditUser | null = null;
    try {
      const userId = context.userId;
      if (userId) {
        fallbackUser = await this.getCachedUserSession(userId);
      }
    } catch (cacheError) {
      console.error('Error getting fallback user data:', cacheError);
    }

    return {
      fallbackUser,
      shouldRetry: isNetworkError,
    };
  }

  // Initialize user on first visit
  static async initializeUser(): Promise<RedditUser | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return null;
      }

      // Cache the user's display name for leaderboards
      await this.cacheUserDisplayName(user.id, user.username);

      // Set default privacy settings if they don't exist
      const existingSettings = await redis.exists(`user:privacy:${user.id}`);
      if (!existingSettings) {
        await this.updateUserPrivacySettings(user.id, {
          shareUsername: true,
          shareStats: true,
          shareAchievements: true,
          allowLeaderboard: true,
        });
      }

      return user;
    } catch (error) {
      console.error('Error initializing user:', error);
      return null;
    }
  }
}
