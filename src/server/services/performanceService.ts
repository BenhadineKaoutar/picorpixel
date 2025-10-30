import { redis } from '@devvit/web/server';

export interface ServerPerformanceMetric {
  id: string;
  timestamp: number;
  type: 'request' | 'database' | 'memory' | 'custom';
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  context?: Record<string, any>;
}

export interface RequestPerformanceData {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  memoryUsage?: NodeJS.MemoryUsage;
  redisOperations?: number;
  userId?: string;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  slowestRequests: RequestPerformanceData[];
  errorRate: number;
  memoryUsage: {
    current: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
  };
  redisStats: {
    totalOperations: number;
    averageLatency: number;
    errorCount: number;
  };
}

class ServerPerformanceService {
  private metrics: ServerPerformanceMetric[] = [];
  private requestData: RequestPerformanceData[] = [];
  
  // private readonly METRICS_KEY = 'performance_metrics'; // Unused for now
  // private readonly REQUEST_DATA_KEY = 'request_performance'; // Unused for now
  private readonly MAX_STORED_REQUESTS = 1000;
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second
  private readonly MEMORY_WARNING_THRESHOLD = 500 * 1024 * 1024; // 500MB

  private peakMemoryUsage: NodeJS.MemoryUsage = process.memoryUsage();

  constructor() {
    this.startMemoryMonitoring();
    this.startRedisMonitoring();
  }

  /**
   * Record request performance
   */
  public async recordRequest(data: RequestPerformanceData): Promise<void> {
    // Record the request
    this.requestData.push(data);
    
    // Limit stored requests
    if (this.requestData.length > this.MAX_STORED_REQUESTS) {
      this.requestData = this.requestData.slice(-this.MAX_STORED_REQUESTS);
    }

    // Record performance metrics
    this.recordMetric('request_duration', data.duration, 'ms', {
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
    });

    // Log slow requests
    if (data.duration > this.SLOW_REQUEST_THRESHOLD) {
      console.warn(`Slow request detected: ${data.method} ${data.endpoint} - ${data.duration}ms`);
      
      this.recordMetric('slow_request', 1, 'count', {
        endpoint: data.endpoint,
        method: data.method,
        duration: data.duration,
      });
    }

    // Record memory usage if provided
    if (data.memoryUsage) {
      this.updatePeakMemoryUsage(data.memoryUsage);
      
      if (data.memoryUsage.heapUsed > this.MEMORY_WARNING_THRESHOLD) {
        console.warn(`High memory usage detected: ${Math.round(data.memoryUsage.heapUsed / 1024 / 1024)}MB`);
        
        this.recordMetric('high_memory_usage', data.memoryUsage.heapUsed, 'bytes', {
          endpoint: data.endpoint,
          method: data.method,
        });
      }
    }

    // Store in Redis for persistence
    await this.storeRequestData(data);
  }

  /**
   * Record custom performance metric
   */
  public recordMetric(
    name: string,
    value: number,
    unit: ServerPerformanceMetric['unit'] = 'ms',
    context?: Record<string, any>
  ): void {
    const metric: ServerPerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      type: 'custom',
      name,
      value,
      unit,
      context: context || {},
    };

    this.metrics.push(metric);
    
    // Limit stored metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Record database operation performance
   */
  public async recordDatabaseOperation(
    operation: string,
    duration: number,
    success: boolean,
    context?: Record<string, any>
  ): Promise<void> {
    this.recordMetric(`db_${operation}`, duration, 'ms', {
      ...context,
      success,
    });

    if (!success) {
      this.recordMetric('db_error', 1, 'count', {
        operation,
        ...context,
      });
    }

    // Store in Redis
    try {
      const key = `db_perf:${operation}:${Date.now()}`;
      await redis.set(key, JSON.stringify({ // Store performance data
        operation,
        duration,
        success,
        timestamp: Date.now(),
        context,
      }));
    } catch (error) {
      console.error('Failed to store database performance metric:', error);
    }
  }

  /**
   * Measure function execution time
   */
  public async measureFunction<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await fn();
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      this.recordMetric(`function_${name}`, duration, 'ms', context);
      
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      this.recordMetric(`function_${name}_error`, duration, 'ms', {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    } finally {
      const endMemory = process.memoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      
      if (Math.abs(memoryDelta) > 1024 * 1024) { // 1MB threshold
        this.recordMetric(`function_${name}_memory`, memoryDelta, 'bytes', context);
      }
    }
  }

  /**
   * Get performance statistics
   */
  public async getPerformanceStats(): Promise<PerformanceStats> {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Filter recent requests
    const recentRequests = this.requestData.filter(req => req.duration && req.duration > oneHourAgo);
    
    // Calculate statistics
    const totalRequests = recentRequests.length;
    const averageResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / totalRequests 
      : 0;
    
    const slowestRequests = [...recentRequests]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    const errorRequests = recentRequests.filter(req => req.statusCode >= 400);
    const errorRate = totalRequests > 0 ? (errorRequests.length / totalRequests) * 100 : 0;
    
    // Get Redis stats
    const redisStats = await this.getRedisStats();
    
    return {
      totalRequests,
      averageResponseTime,
      slowestRequests,
      errorRate,
      memoryUsage: {
        current: process.memoryUsage(),
        peak: this.peakMemoryUsage,
      },
      redisStats,
    };
  }

  /**
   * Get Redis performance statistics
   */
  private async getRedisStats(): Promise<PerformanceStats['redisStats']> {
    try {
      // Get Redis performance metrics from stored data
      // Note: Devvit Redis doesn't support keys() method, using fallback
      const operations = 0; // Placeholder - would need alternative implementation
      
      let totalLatency = 0;
      let errorCount = 0;
      
      // Sample recent operations for latency calculation
      // Note: Disabled due to Redis keys() limitation
      const sampleKeys: string[] = [];
      
      for (const key of sampleKeys) {
        try {
          const data = await redis.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            totalLatency += parsed.duration;
            if (!parsed.success) {
              errorCount++;
            }
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      return {
        totalOperations: operations,
        averageLatency: sampleSize > 0 ? totalLatency / sampleSize : 0,
        errorCount,
      };
    } catch (error) {
      console.error('Failed to get Redis stats:', error);
      return {
        totalOperations: 0,
        averageLatency: 0,
        errorCount: 0,
      };
    }
  }

  /**
   * Get recent slow requests
   */
  public getSlowRequests(limit: number = 50): RequestPerformanceData[] {
    return this.requestData
      .filter(req => req.duration > this.SLOW_REQUEST_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Clear performance data
   */
  public async clearPerformanceData(): Promise<void> {
    this.metrics = [];
    this.requestData = [];
    
    try {
      // Clear Redis performance data
      // Note: Devvit Redis doesn't support keys() method, skipping cleanup
    } catch (error) {
      console.error('Failed to clear Redis performance data:', error);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.updatePeakMemoryUsage(memUsage);
      
      // Record current memory usage
      this.recordMetric('memory_heap_used', memUsage.heapUsed, 'bytes');
      this.recordMetric('memory_heap_total', memUsage.heapTotal, 'bytes');
      this.recordMetric('memory_rss', memUsage.rss, 'bytes');
      
      // Warn about high memory usage
      if (memUsage.heapUsed > this.MEMORY_WARNING_THRESHOLD) {
        console.warn(`High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start Redis monitoring
   */
  private startRedisMonitoring(): void {
    // Monitor Redis operations by wrapping redis calls
    const originalGet = redis.get;
    const originalSet = redis.set;
    const originalDel = redis.del;
    
    redis.get = async (key: string) => {
      return this.measureFunction('redis_get', () => originalGet.call(redis, key), { key });
    };
    
    redis.set = async (key: string, value: string) => {
      return this.measureFunction('redis_set', () => originalSet.call(redis, key, value), { key });
    };
    
    redis.del = async (...keys: string[]) => {
      return this.measureFunction('redis_del', () => originalDel.call(redis, ...keys), { keyCount: keys.length });
    };
  }

  /**
   * Update peak memory usage
   */
  private updatePeakMemoryUsage(current: NodeJS.MemoryUsage): void {
    if (current.heapUsed > this.peakMemoryUsage.heapUsed) {
      this.peakMemoryUsage = { ...current };
    }
  }

  /**
   * Store request data in Redis
   */
  private async storeRequestData(data: RequestPerformanceData): Promise<void> {
    try {
      const key = `req_perf:${Date.now()}:${this.generateMetricId()}`;
      await redis.set(key, JSON.stringify(data)); // Store request data
    } catch (error) {
      console.error('Failed to store request performance data:', error);
    }
  }

  /**
   * Generate unique metric ID
   */
  private generateMetricId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export singleton instance
export const serverPerformanceService = new ServerPerformanceService();

// Export class for testing
export { ServerPerformanceService };
