import { useEffect, useCallback, useRef } from 'react';
import { performanceService } from '../services/performanceService';

export interface UsePerformanceMonitoringOptions {
  trackUserInteractions?: boolean;
  trackApiCalls?: boolean;
  trackMemoryUsage?: boolean;
  reportInterval?: number;
}

export const usePerformanceMonitoring = (
  options: UsePerformanceMonitoringOptions = {}
) => {
  const {
    trackUserInteractions = true,
    trackApiCalls = true,
    trackMemoryUsage = true,
    reportInterval = 30000, // 30 seconds
  } = options;

  const interactionStartTimes = useRef<Map<string, number>>(new Map());

  /**
   * Start measuring a performance mark
   */
  const startMeasure = useCallback((name: string) => {
    performanceService.startMark(name);
  }, []);

  /**
   * End measuring a performance mark
   */
  const endMeasure = useCallback((name: string, context?: Record<string, any>) => {
    return performanceService.endMark(name, context);
  }, []);

  /**
   * Record a custom metric
   */
  const recordMetric = useCallback((
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' | 'percentage' = 'ms',
    context?: Record<string, any>
  ) => {
    performanceService.recordMetric(name, value, unit, context);
  }, []);

  /**
   * Measure function execution time
   */
  const measureFunction = useCallback(<T>(
    name: string,
    fn: () => T,
    context?: Record<string, any>
  ): T => {
    return performanceService.measureFunction(name, fn, context);
  }, []);

  /**
   * Measure async function execution time
   */
  const measureAsyncFunction = useCallback(async <T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    return performanceService.measureAsyncFunction(name, fn, context);
  }, []);

  /**
   * Track user interaction start
   */
  const startInteraction = useCallback((action: string) => {
    if (!trackUserInteractions) return;
    
    const startTime = performance.now();
    interactionStartTimes.current.set(action, startTime);
  }, [trackUserInteractions]);

  /**
   * Track user interaction end
   */
  const endInteraction = useCallback((action: string, context?: Record<string, any>) => {
    if (!trackUserInteractions) return;
    
    const startTime = interactionStartTimes.current.get(action);
    if (startTime) {
      const duration = performance.now() - startTime;
      performanceService.recordUserInteraction(action, duration, context);
      interactionStartTimes.current.delete(action);
    }
  }, [trackUserInteractions]);

  /**
   * Track API call performance
   */
  const trackApiCall = useCallback((
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    size?: number
  ) => {
    if (!trackApiCalls) return;
    
    performanceService.recordApiCall(endpoint, method, duration, status, size);
  }, [trackApiCalls]);

  /**
   * Get current performance summary
   */
  const getPerformanceSummary = useCallback(() => {
    return performanceService.getPerformanceSummary();
  }, []);

  /**
   * Clear performance metrics
   */
  const clearMetrics = useCallback(() => {
    performanceService.clearMetrics();
  }, []);

  // Setup memory usage tracking
  useEffect(() => {
    if (!trackMemoryUsage) return;

    const interval = setInterval(() => {
      performanceService.recordMemoryUsage();
    }, reportInterval);

    return () => clearInterval(interval);
  }, [trackMemoryUsage, reportInterval]);

  // Setup component mount/unmount tracking
  useEffect(() => {
    const componentName = 'usePerformanceMonitoring';
    startMeasure(`${componentName}_mount`);

    return () => {
      endMeasure(`${componentName}_mount`);
    };
  }, [startMeasure, endMeasure]);

  return {
    startMeasure,
    endMeasure,
    recordMetric,
    measureFunction,
    measureAsyncFunction,
    startInteraction,
    endInteraction,
    trackApiCall,
    getPerformanceSummary,
    clearMetrics,
  };
};

/**
 * Hook for tracking component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderCount = useRef(0);
  const { recordMetric, startMeasure, endMeasure } = usePerformanceMonitoring();

  useEffect(() => {
    renderCount.current++;
    recordMetric(`${componentName}_render_count`, renderCount.current, 'count');
  });

  useEffect(() => {
    startMeasure(`${componentName}_mount`);
    
    return () => {
      endMeasure(`${componentName}_mount`);
    };
  }, [componentName, startMeasure, endMeasure]);

  const measureRender = useCallback((renderType: string = 'render') => {
    const markName = `${componentName}_${renderType}`;
    startMeasure(markName);
    
    // Use setTimeout to measure after render completes
    setTimeout(() => {
      endMeasure(markName);
    }, 0);
  }, [componentName, startMeasure, endMeasure]);

  return {
    measureRender,
    renderCount: renderCount.current,
  };
};

/**
 * Hook for tracking API call performance
 */
export const useApiPerformance = () => {
  const { trackApiCall } = usePerformanceMonitoring();

  const wrapApiCall = useCallback(async <T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    let status = 0;
    let size = 0;

    try {
      const result = await apiCall();
      status = 200; // Assume success if no error thrown
      
      // Try to estimate response size
      if (result && typeof result === 'object') {
        size = JSON.stringify(result).length;
      }
      
      return result;
    } catch (error) {
      // Try to extract status from error
      if (error && typeof error === 'object' && 'status' in error) {
        status = (error as any).status;
      } else {
        status = 0; // Network error
      }
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      trackApiCall(endpoint, method, duration, status, size);
    }
  }, [trackApiCall]);

  return {
    wrapApiCall,
  };
};
