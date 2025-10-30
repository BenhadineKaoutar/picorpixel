import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../../shared/types/api';
import { serverErrorService } from '../services/errorService';

export interface ApiRequest extends Request {
  startTime?: number;
  userId?: string;
}

/**
 * Error handling middleware for Express
 */
export const errorHandler = (
  error: Error,
  req: ApiRequest,
  res: Response,
  next: NextFunction
): void => {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Determine status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An internal server error occurred';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access denied';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (error.name === 'RateLimitError') {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests';
  } else if (error.message.includes('Redis')) {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    message = 'Database service temporarily unavailable';
  } else if (error.message.includes('timeout')) {
    statusCode = 504;
    errorCode = 'TIMEOUT';
    message = 'Request timeout';
  }

  // Log error
  serverErrorService.logApiError(error, req, statusCode, {
    errorCode,
    duration: req.startTime ? Date.now() - req.startTime : undefined,
  }).catch((logError) => {
    console.error('Failed to log error:', logError);
  });

  // Create error response
  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          stack: error.stack,
          originalMessage: error.message,
        },
      }),
    },
  };

  // Add retry-after header for rate limiting
  if (statusCode === 429) {
    res.set('Retry-After', '60'); // 60 seconds
    errorResponse.error.retryAfter = 60;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (
  req: ApiRequest,
  res: Response,
  next: NextFunction
): void => {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.name = 'NotFoundError';
  next(error);
};

/**
 * Request timing middleware
 */
export const requestTimer = (
  req: ApiRequest,
  res: Response,
  next: NextFunction
): void => {
  req.startTime = Date.now();
  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitor = (
  req: ApiRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    
    // Import performance service dynamically to avoid circular dependency
    import('../services/performanceService.js').then(({ serverPerformanceService }) => {
      // Record request performance
      serverPerformanceService.recordRequest({
        endpoint: req.path || req.url || 'unknown',
        method: req.method || 'GET',
        duration,
        statusCode: res.statusCode,
        memoryUsage: endMemory,
        userId: req.userId,
      }).catch((error) => {
        console.error('Failed to record request performance:', error);
      });
    }).catch((error) => {
      console.error('Failed to import performance service:', error);
    });
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      serverErrorService.logPerformanceWarning(
        `Slow request detected: ${req.method} ${req.path}`,
        {
          endpoint: req.path,
          method: req.method,
          duration,
          userId: req.userId,
          additionalContext: {
            statusCode: res.statusCode,
            contentLength: res.get('content-length'),
            memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          },
        }
      ).catch((error) => {
        console.error('Failed to log performance warning:', error);
      });
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Request validation middleware
 */
export const validateRequest = (
  requiredFields: string[] = [],
  optionalFields: string[] = []
) => {
  return (req: ApiRequest, res: Response, next: NextFunction): void => {
    try {
      const body = req.body || {};
      const missing: string[] = [];
      const invalid: string[] = [];

      // Check required fields
      for (const field of requiredFields) {
        if (!(field in body) || body[field] === undefined || body[field] === null) {
          missing.push(field);
        }
      }

      if (missing.length > 0) {
        const error = new Error(`Missing required fields: ${missing.join(', ')}`);
        error.name = 'ValidationError';
        return next(error);
      }

      // Validate field types (basic validation)
      const allFields = [...requiredFields, ...optionalFields];
      for (const field of allFields) {
        if (field in body) {
          const value = body[field];
          
          // Add specific validation rules here
          if (field.includes('Id') && typeof value !== 'string') {
            invalid.push(`${field} must be a string`);
          }
          if (field === 'guess' && typeof value !== 'boolean') {
            invalid.push(`${field} must be a boolean`);
          }
        }
      }

      if (invalid.length > 0) {
        const error = new Error(`Invalid field types: ${invalid.join(', ')}`);
        error.name = 'ValidationError';
        return next(error);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Rate limiting middleware (simple implementation)
 */
export const rateLimit = (
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) => {
  const requests = new Map<string, number[]>();

  return (req: ApiRequest, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Get or create request history for this client
    let clientRequests = requests.get(clientId) || [];
    
    // Remove old requests outside the window
    clientRequests = clientRequests.filter(timestamp => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (clientRequests.length >= maxRequests) {
      const error = new Error('Rate limit exceeded');
      error.name = 'RateLimitError';
      return next(error);
    }
    
    // Add current request
    clientRequests.push(now);
    requests.set(clientId, clientRequests);
    
    next();
  };
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (
  fn: (req: ApiRequest, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: ApiRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
