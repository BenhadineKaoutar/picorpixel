// Production middleware for enhanced error handling and monitoring
import { Request, Response, NextFunction } from 'express';
import { getConfig, ConfiguredRedisKeys } from '../config/production.js';
import { redis } from '@devvit/web/server';

const config = getConfig();

/**
 * Production error logger that respects configuration
 */
export function productionErrorLogger(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only log if error level is enabled
  if (config.logging.level === 'error' || config.logging.level === 'debug') {
    const errorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
    };

    // Store error in Redis with TTL
    redis.setex(
      ConfiguredRedisKeys.getErrorLogKey(errorReport.id),
      config.redis.ttl.errorLogs,
      JSON.stringify(errorReport)
    ).catch(console.error);

    // In production, only log critical information
    if (process.env.NODE_ENV === 'production') {
      console.error(`[${errorReport.timestamp}] ${error.message} - ${req.method} ${req.path}`);
    } else {
      console.error('Error details:', errorReport);
    }
  }

  next(error);
}

/**
 * Request size limiter for production
 */
export function requestSizeLimiter(req: Request, res: Response, next: NextFunction): void {
  const contentLength = req.get('Content-Length');
  
  if (contentLength) {
    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
    const maxSizeMB = parseInt(config.security.maxPayloadSize.replace('mb', ''));
    
    if (sizeInMB > maxSizeMB) {
      res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request payload too large. Maximum size is ${config.security.maxPayloadSize}`,
        },
      });
      return;
    }
  }
  
  next();
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  if (!config.performance.enableMetrics) {
    return next();
  }

  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > config.performance.slowRequestThreshold) {
      const slowRequestReport = {
        endpoint: req.path,
        method: req.method,
        duration,
        timestamp: new Date().toISOString(),
        statusCode: res.statusCode,
      };
      
      // Store slow request data
      redis.lpush(
        `${ConfiguredRedisKeys.getPrefix()}slow_requests`,
        JSON.stringify(slowRequestReport)
      ).then(() => {
        // Keep only last 100 slow requests
        return redis.ltrim(`${ConfiguredRedisKeys.getPrefix()}slow_requests`, 0, 99);
      }).catch(console.error);
      
      if (config.logging.level === 'debug') {
        console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }
    }
    
    // Update performance metrics
    const metricsKey = ConfiguredRedisKeys.getPerformanceMetricsKey();
    redis.hincrby(metricsKey, 'total_requests', 1).catch(console.error);
    redis.hincrby(metricsKey, `status_${res.statusCode}`, 1).catch(console.error);
    redis.hincrby(metricsKey, 'total_response_time', duration).catch(console.error);
    
    // Set TTL for metrics
    redis.expire(metricsKey, config.performance.metricsRetentionDays * 24 * 60 * 60).catch(console.error);
  });
  
  next();
}

/**
 * Security headers for production
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy for Reddit integration
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://reddit.com https://*.reddit.com"
  );
  
  next();
}

/**
 * Health check endpoint for production monitoring
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    // Check Redis connectivity
    const redisCheck = await redis.ping();
    
    // Get basic metrics
    const metricsKey = ConfiguredRedisKeys.getPerformanceMetricsKey();
    const metrics = await redis.hgetall(metricsKey);
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      redis: redisCheck === 'PONG' ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      ...(config.performance.enableMetrics && {
        metrics: {
          totalRequests: parseInt(metrics.total_requests || '0'),
          averageResponseTime: metrics.total_requests 
            ? Math.round(parseInt(metrics.total_response_time || '0') / parseInt(metrics.total_requests))
            : 0,
        },
      }),
    };
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    // Cleanup operations
    setTimeout(() => {
      console.log('Graceful shutdown completed');
      process.exit(0);
    }, 5000); // 5 second grace period
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
