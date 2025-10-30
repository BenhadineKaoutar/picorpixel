import { redis } from '@devvit/web/server';

export interface ServerErrorReport {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorsByUser: Record<string, number>;
  recentErrors: ServerErrorReport[];
}

class ServerErrorService {
  private readonly ERROR_KEY_PREFIX = 'error:';
  private readonly METRICS_KEY = 'error_metrics';
  private readonly MAX_STORED_ERRORS = 1000;
  private readonly ERROR_RETENTION_DAYS = 7;

  /**
   * Log an error with comprehensive context
   */
  public async logError(
    error: Error | string,
    context: {
      level?: 'error' | 'warn' | 'info';
      userId?: string;
      endpoint?: string;
      method?: string;
      statusCode?: number;
      userAgent?: string;
      ip?: string;
      additionalContext?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const {
      level = 'error',
      userId,
      endpoint,
      method,
      statusCode,
      userAgent,
      ip,
      additionalContext = {},
    } = context;

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    const errorReport: ServerErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level,
      message: errorObj.message,
      stack: errorObj.stack,
      context: additionalContext,
      userId,
      endpoint,
      method,
      statusCode,
      userAgent,
      ip,
    };

    // Log to console
    this.logToConsole(errorReport);

    // Store in Redis
    await this.storeError(errorReport);

    // Update metrics
    await this.updateMetrics(errorReport);

    return errorReport.id;
  }

  /**
   * Log API error specifically
   */
  public async logApiError(
    error: Error,
    req: any,
    statusCode: number,
    additionalContext?: Record<string, any>
  ): Promise<string> {
    return this.logError(error, {
      level: 'error',
      endpoint: req.path || req.url,
      method: req.method,
      statusCode,
      userAgent: req.headers?.['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      additionalContext: {
        ...additionalContext,
        headers: this.sanitizeHeaders(req.headers),
        body: this.sanitizeBody(req.body),
        query: req.query,
        params: req.params,
      },
    });
  }

  /**
   * Log performance warning
   */
  public async logPerformanceWarning(
    message: string,
    context: {
      endpoint?: string;
      method?: string;
      duration?: number;
      userId?: string;
      additionalContext?: Record<string, any>;
    }
  ): Promise<string> {
    return this.logError(message, {
      level: 'warn',
      ...context,
      additionalContext: {
        ...context.additionalContext,
        type: 'performance',
      },
    });
  }

  /**
   * Get error metrics
   */
  public async getErrorMetrics(): Promise<ErrorMetrics> {
    try {
      const metricsData = await redis.get(this.METRICS_KEY);
      if (metricsData) {
        return JSON.parse(metricsData);
      }
    } catch (error) {
      console.error('Failed to retrieve error metrics:', error);
    }

    return {
      totalErrors: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      errorsByUser: {},
      recentErrors: [],
    };
  }

  /**
   * Get recent errors
   */
  public async getRecentErrors(limit: number = 50): Promise<ServerErrorReport[]> {
    try {
      const errorKeys = await redis.keys(`${this.ERROR_KEY_PREFIX}*`);
      const sortedKeys = errorKeys
        .sort((a, b) => {
          const timestampA = a.split(':')[1];
          const timestampB = b.split(':')[1];
          return timestampB.localeCompare(timestampA);
        })
        .slice(0, limit);

      const errors: ServerErrorReport[] = [];
      for (const key of sortedKeys) {
        const errorData = await redis.get(key);
        if (errorData) {
          errors.push(JSON.parse(errorData));
        }
      }

      return errors;
    } catch (error) {
      console.error('Failed to retrieve recent errors:', error);
      return [];
    }
  }

  /**
   * Get errors by user
   */
  public async getErrorsByUser(userId: string, limit: number = 20): Promise<ServerErrorReport[]> {
    try {
      const allErrors = await this.getRecentErrors(500); // Get more to filter
      return allErrors
        .filter(error => error.userId === userId)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to retrieve errors by user:', error);
      return [];
    }
  }

  /**
   * Clear old errors (cleanup job)
   */
  public async clearOldErrors(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.ERROR_RETENTION_DAYS);
      const cutoffTimestamp = cutoffDate.toISOString();

      const errorKeys = await redis.keys(`${this.ERROR_KEY_PREFIX}*`);
      let deletedCount = 0;

      for (const key of errorKeys) {
        const errorData = await redis.get(key);
        if (errorData) {
          const error: ServerErrorReport = JSON.parse(errorData);
          if (error.timestamp < cutoffTimestamp) {
            await redis.del(key);
            deletedCount++;
          }
        }
      }

      console.log(`Cleaned up ${deletedCount} old error records`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to clear old errors:', error);
      return 0;
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error to console with formatting
   */
  private logToConsole(errorReport: ServerErrorReport): void {
    const logMethod = errorReport.level === 'error' ? console.error : 
                     errorReport.level === 'warn' ? console.warn : console.log;

    logMethod(`[${errorReport.level.toUpperCase()}] ${errorReport.timestamp}`, {
      id: errorReport.id,
      message: errorReport.message,
      endpoint: errorReport.endpoint,
      method: errorReport.method,
      statusCode: errorReport.statusCode,
      userId: errorReport.userId,
      context: errorReport.context,
    });

    if (errorReport.stack && errorReport.level === 'error') {
      console.error('Stack trace:', errorReport.stack);
    }
  }

  /**
   * Store error in Redis
   */
  private async storeError(errorReport: ServerErrorReport): Promise<void> {
    try {
      const key = `${this.ERROR_KEY_PREFIX}${errorReport.timestamp}:${errorReport.id}`;
      await redis.set(key, JSON.stringify(errorReport));
    } catch (error) {
      console.error('Failed to store error in Redis:', error);
    }
  }

  /**
   * Update error metrics
   */
  private async updateMetrics(errorReport: ServerErrorReport): Promise<void> {
    try {
      const metrics = await this.getErrorMetrics();

      // Update counters
      metrics.totalErrors++;
      
      // Update error by type
      const errorType = this.categorizeError(errorReport);
      metrics.errorsByType[errorType] = (metrics.errorsByType[errorType] || 0) + 1;

      // Update error by endpoint
      if (errorReport.endpoint) {
        metrics.errorsByEndpoint[errorReport.endpoint] = 
          (metrics.errorsByEndpoint[errorReport.endpoint] || 0) + 1;
      }

      // Update error by user
      if (errorReport.userId) {
        metrics.errorsByUser[errorReport.userId] = 
          (metrics.errorsByUser[errorReport.userId] || 0) + 1;
      }

      // Update recent errors (keep last 100)
      metrics.recentErrors.unshift(errorReport);
      if (metrics.recentErrors.length > 100) {
        metrics.recentErrors = metrics.recentErrors.slice(0, 100);
      }

      // Store updated metrics
      await redis.set(this.METRICS_KEY, JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to update error metrics:', error);
    }
  }

  /**
   * Categorize error for metrics
   */
  private categorizeError(errorReport: ServerErrorReport): string {
    if (errorReport.statusCode) {
      if (errorReport.statusCode >= 500) return 'server_error';
      if (errorReport.statusCode >= 400) return 'client_error';
    }

    if (errorReport.context?.type) {
      return errorReport.context.type;
    }

    if (errorReport.message.toLowerCase().includes('redis')) return 'database_error';
    if (errorReport.message.toLowerCase().includes('network')) return 'network_error';
    if (errorReport.message.toLowerCase().includes('timeout')) return 'timeout_error';
    if (errorReport.message.toLowerCase().includes('validation')) return 'validation_error';

    return 'unknown_error';
  }

  /**
   * Sanitize request headers for logging
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    if (!headers) return {};

    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private sanitizeBody(body: any): any {
    if (!body) return body;

    if (typeof body === 'object') {
      const sanitized: any = {};
      const sensitiveFields = ['password', 'token', 'secret', 'key'];

      for (const [key, value] of Object.entries(body)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return body;
  }
}

// Create and export singleton instance
export const serverErrorService = new ServerErrorService();

// Export class for testing
export { ServerErrorService };
