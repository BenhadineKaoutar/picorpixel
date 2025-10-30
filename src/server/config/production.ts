// Production configuration for PicOrPixel
export interface ProductionConfig {
  redis: {
    keyPrefix: string;
    ttl: {
      dailyChallenge: number;
      userSession: number;
      leaderboard: number;
      userStats: number;
      errorLogs: number;
    };
    maxConnections: number;
    retryAttempts: number;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    maxErrorsStored: number;
    errorRetentionDays: number;
    enablePerformanceLogging: boolean;
  };
  performance: {
    maxRequestTime: number;
    slowRequestThreshold: number;
    enableMetrics: boolean;
    metricsRetentionDays: number;
  };
  security: {
    rateLimitRequests: number;
    rateLimitWindow: number;
    maxPayloadSize: string;
    enableCors: boolean;
  };
}

export const productionConfig: ProductionConfig = {
  redis: {
    keyPrefix: 'picorpixel:prod:',
    ttl: {
      dailyChallenge: 48 * 60 * 60, // 48 hours (allows timezone overlap)
      userSession: 7 * 24 * 60 * 60, // 7 days
      leaderboard: 30 * 24 * 60 * 60, // 30 days
      userStats: 0, // No expiration for user stats
      errorLogs: 7 * 24 * 60 * 60, // 7 days
    },
    maxConnections: 10,
    retryAttempts: 3,
  },
  logging: {
    level: 'error', // Only log errors in production
    maxErrorsStored: 500, // Reduced for production
    errorRetentionDays: 7,
    enablePerformanceLogging: false, // Disable in production for performance
  },
  performance: {
    maxRequestTime: 30000, // 30 seconds (Devvit limit)
    slowRequestThreshold: 1000, // 1 second
    enableMetrics: true,
    metricsRetentionDays: 30,
  },
  security: {
    rateLimitRequests: 100, // Reduced for production
    rateLimitWindow: 60000, // 1 minute
    maxPayloadSize: '4mb', // Devvit limit
    enableCors: false, // Disable CORS in production
  },
};

export const developmentConfig: ProductionConfig = {
  redis: {
    keyPrefix: 'picorpixel:dev:',
    ttl: {
      dailyChallenge: 60 * 60, // 1 hour for faster testing
      userSession: 24 * 60 * 60, // 1 day
      leaderboard: 7 * 24 * 60 * 60, // 7 days
      userStats: 0, // No expiration
      errorLogs: 24 * 60 * 60, // 1 day
    },
    maxConnections: 5,
    retryAttempts: 2,
  },
  logging: {
    level: 'debug', // Verbose logging in development
    maxErrorsStored: 100,
    errorRetentionDays: 1,
    enablePerformanceLogging: true,
  },
  performance: {
    maxRequestTime: 30000,
    slowRequestThreshold: 500, // 500ms
    enableMetrics: true,
    metricsRetentionDays: 7,
  },
  security: {
    rateLimitRequests: 200, // More lenient for development
    rateLimitWindow: 60000,
    maxPayloadSize: '10mb', // Larger for development
    enableCors: true, // Enable CORS for development
  },
};

// Get configuration based on environment
export function getConfig(): ProductionConfig {
  return process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig;
}

// Environment-specific Redis key helpers
export class ConfiguredRedisKeys {
  private static config = getConfig();

  static getDailyChallengeKey(date: string): string {
    return `${this.config.redis.keyPrefix}challenge:${date}`;
  }

  static getUserSessionKey(userId: string, challengeId: string): string {
    return `${this.config.redis.keyPrefix}session:${userId}:${challengeId}`;
  }

  static getLeaderboardKey(period: string, date?: string): string {
    const suffix = date ? `:${date}` : '';
    return `${this.config.redis.keyPrefix}leaderboard:${period}${suffix}`;
  }

  static getUserStatsKey(userId: string): string {
    return `${this.config.redis.keyPrefix}user:stats:${userId}`;
  }

  static getErrorLogKey(errorId: string): string {
    return `${this.config.redis.keyPrefix}error:${errorId}`;
  }

  static getPerformanceMetricsKey(): string {
    return `${this.config.redis.keyPrefix}performance:metrics`;
  }

  static getPrefix(): string {
    return this.config.redis.keyPrefix;
  }
}
