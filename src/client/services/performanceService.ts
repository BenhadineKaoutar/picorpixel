export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'navigation' | 'resource' | 'measure' | 'custom';
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  context?: Record<string, any>;
}

export interface PerformanceReport {
  sessionId: string;
  timestamp: number;
  metrics: PerformanceMetric[];
  userAgent: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

class PerformanceService {
  private sessionId: string;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring: boolean = false;
  
  private readonly MAX_METRICS = 1000;
  private readonly REPORT_INTERVAL = 30000; // 30 seconds
  private readonly STORAGE_KEY = 'picorpixel_performance';

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPerformanceObservers();
    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Collect initial navigation metrics
    this.collectNavigationMetrics();
    
    // Setup periodic reporting
    setInterval(() => {
      this.reportMetrics();
    }, this.REPORT_INTERVAL);

    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Record custom performance metric
   */
  public recordMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'] = 'ms',
    context?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: performance.now(),
      type: 'custom',
      name,
      value,
      unit,
      context,
    };

    this.addMetric(metric);
  }

  /**
   * Measure function execution time
   */
  public measureFunction<T>(
    name: string,
    fn: () => T,
    context?: Record<string, any>
  ): T {
    const startTime = performance.now();
    const result = fn();
    const duration = performance.now() - startTime;
    
    this.recordMetric(`function_${name}`, duration, 'ms', context);
    
    return result;
  }

  /**
   * Measure async function execution time
   */
  public async measureAsyncFunction<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;
    
    this.recordMetric(`async_function_${name}`, duration, 'ms', context);
    
    return result;
  }

  /**
   * Start performance mark
   */
  public startMark(name: string): void {
    performance.mark(`${name}_start`);
  }

  /**
   * End performance mark and record measure
   */
  public endMark(name: string, context?: Record<string, any>): number {
    const endMarkName = `${name}_end`;
    const measureName = `measure_${name}`;
    
    performance.mark(endMarkName);
    performance.measure(measureName, `${name}_start`, endMarkName);
    
    const measure = performance.getEntriesByName(measureName)[0] as PerformanceEntry;
    const duration = measure.duration;
    
    this.recordMetric(name, duration, 'ms', context);
    
    // Clean up marks
    performance.clearMarks(`${name}_start`);
    performance.clearMarks(endMarkName);
    performance.clearMeasures(measureName);
    
    return duration;
  }

  /**
   * Record API call performance
   */
  public recordApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    size?: number
  ): void {
    this.recordMetric(`api_${method.toLowerCase()}_${endpoint}`, duration, 'ms', {
      endpoint,
      method,
      status,
      size,
    });

    // Record API success/error rates
    this.recordMetric(`api_status_${status >= 200 && status < 300 ? 'success' : 'error'}`, 1, 'count', {
      endpoint,
      method,
      status,
    });
  }

  /**
   * Record user interaction performance
   */
  public recordUserInteraction(
    action: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    this.recordMetric(`interaction_${action}`, duration, 'ms', context);
  }

  /**
   * Record memory usage
   */
  public recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      this.recordMetric('memory_used', memory.usedJSHeapSize, 'bytes');
      this.recordMetric('memory_total', memory.totalJSHeapSize, 'bytes');
      this.recordMetric('memory_limit', memory.jsHeapSizeLimit, 'bytes');
      
      const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      this.recordMetric('memory_usage_percentage', usage, 'percentage');
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    // Group metrics by name
    const metricsByName = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate statistics for each metric
    for (const [name, values] of Object.entries(metricsByName)) {
      if (values.length > 0) {
        summary[name] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          median: this.calculateMedian(values),
        };
      }
    }

    return summary;
  }

  /**
   * Clear stored metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Setup performance observers
   */
  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Observe navigation timing
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processNavigationEntry(entry as PerformanceNavigationTiming);
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);
    } catch (error) {
      console.warn('Failed to setup navigation observer:', error);
    }

    // Observe resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processResourceEntry(entry as PerformanceResourceTiming);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Failed to setup resource observer:', error);
    }

    // Observe paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPaintEntry(entry);
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn('Failed to setup paint observer:', error);
    }

    // Observe largest contentful paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processLCPEntry(entry);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('Failed to setup LCP observer:', error);
    }

    // Observe layout shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processCLSEntry(entry);
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('Failed to setup CLS observer:', error);
    }
  }

  /**
   * Collect initial navigation metrics
   */
  private collectNavigationMetrics(): void {
    if (!performance.timing) return;

    const timing = performance.timing;
    const navigationStart = timing.navigationStart;

    // Page load metrics
    this.recordMetric('page_load_time', timing.loadEventEnd - navigationStart, 'ms');
    this.recordMetric('dom_content_loaded', timing.domContentLoadedEventEnd - navigationStart, 'ms');
    this.recordMetric('dom_interactive', timing.domInteractive - navigationStart, 'ms');
    this.recordMetric('dns_lookup', timing.domainLookupEnd - timing.domainLookupStart, 'ms');
    this.recordMetric('tcp_connect', timing.connectEnd - timing.connectStart, 'ms');
    this.recordMetric('server_response', timing.responseEnd - timing.requestStart, 'ms');
  }

  /**
   * Process navigation timing entry
   */
  private processNavigationEntry(entry: PerformanceNavigationTiming): void {
    this.recordMetric('navigation_type', entry.type === 'navigate' ? 0 : 1, 'count');
    this.recordMetric('redirect_count', entry.redirectCount, 'count');
  }

  /**
   * Process resource timing entry
   */
  private processResourceEntry(entry: PerformanceResourceTiming): void {
    const resourceType = this.getResourceType(entry.name);
    
    this.recordMetric(`resource_${resourceType}_duration`, entry.duration, 'ms', {
      name: entry.name,
      size: entry.transferSize,
    });

    if (entry.transferSize > 0) {
      this.recordMetric(`resource_${resourceType}_size`, entry.transferSize, 'bytes', {
        name: entry.name,
      });
    }
  }

  /**
   * Process paint timing entry
   */
  private processPaintEntry(entry: PerformanceEntry): void {
    this.recordMetric(entry.name.replace('-', '_'), entry.startTime, 'ms');
  }

  /**
   * Process largest contentful paint entry
   */
  private processLCPEntry(entry: PerformanceEntry): void {
    this.recordMetric('largest_contentful_paint', entry.startTime, 'ms');
  }

  /**
   * Process cumulative layout shift entry
   */
  private processCLSEntry(entry: any): void {
    if (!entry.hadRecentInput) {
      this.recordMetric('cumulative_layout_shift', entry.value, 'count');
    }
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('/api/')) return 'api';
    if (url.match(/\.(js|mjs)$/)) return 'script';
    if (url.match(/\.(css)$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    return 'other';
  }

  /**
   * Add metric to collection
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Limit stored metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Report metrics to server
   */
  private async reportMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      const report: PerformanceReport = {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        metrics: [...this.metrics],
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        connection: this.getConnectionInfo(),
      };

      // Store locally as backup
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(report));

      // Send to server (fire and forget)
      fetch('/api/performance-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      }).catch((error) => {
        console.debug('Failed to send performance report:', error);
      });

      // Clear reported metrics
      this.metrics = [];
    } catch (error) {
      console.error('Failed to report performance metrics:', error);
    }
  }

  /**
   * Get connection information
   */
  private getConnectionInfo(): PerformanceReport['connection'] {
    const connection = (navigator as any).connection;
    if (!connection) return undefined;

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    };
  }

  /**
   * Calculate median value
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique metric ID
   */
  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export singleton instance
export const performanceService = new PerformanceService();

// Export class for testing
export { PerformanceService };
