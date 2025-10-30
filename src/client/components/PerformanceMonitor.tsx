import React, { useEffect, useState } from 'react';
import { performanceService } from '../services/performanceService';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

export interface PerformanceMonitorProps {
  showDebugInfo?: boolean;
  trackInteractions?: boolean;
  children: React.ReactNode;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDebugInfo = false,
  trackInteractions = true,
  children,
}) => {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const { 
    startInteraction, 
    endInteraction, 
    getPerformanceSummary,
    recordMetric 
  } = usePerformanceMonitoring({
    trackUserInteractions: trackInteractions,
  });

  // Update performance data periodically
  useEffect(() => {
    if (!showDebugInfo) return;

    const interval = setInterval(() => {
      const summary = getPerformanceSummary();
      setPerformanceData(summary);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [showDebugInfo, getPerformanceSummary]);

  // Track component interactions
  useEffect(() => {
    if (!trackInteractions) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action') || 
                    target.tagName.toLowerCase() || 
                    'click';
      
      startInteraction(action);
      
      // End interaction after a short delay to capture any immediate effects
      setTimeout(() => {
        endInteraction(action, {
          elementType: target.tagName,
          className: target.className,
          id: target.id,
        });
      }, 100);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      startInteraction(`keydown_${event.key}`);
      
      setTimeout(() => {
        endInteraction(`keydown_${event.key}`, {
          key: event.key,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        });
      }, 50);
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [trackInteractions, startInteraction, endInteraction]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordMetric('page_hidden', 1, 'count');
      } else {
        recordMetric('page_visible', 1, 'count');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recordMetric]);

  return (
    <>
      {children}
      {showDebugInfo && performanceData && (
        <PerformanceDebugPanel data={performanceData} />
      )}
    </>
  );
};

interface PerformanceDebugPanelProps {
  data: any;
}

const PerformanceDebugPanel: React.FC<PerformanceDebugPanelProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatValue = (value: number, unit?: string): string => {
    if (unit === 'bytes') {
      if (value > 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(2)} MB`;
      } else if (value > 1024) {
        return `${(value / 1024).toFixed(2)} KB`;
      }
      return `${value} B`;
    } else if (unit === 'ms') {
      return `${value.toFixed(2)} ms`;
    } else if (unit === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    return value.toString();
  };

  const getMetricColor = (name: string, value: any): string => {
    if (name.includes('error') || name.includes('slow')) {
      return 'text-red-600';
    } else if (name.includes('memory') && value.avg > 50 * 1024 * 1024) { // 50MB
      return 'text-orange-600';
    } else if (name.includes('api') && value.avg > 1000) { // 1 second
      return 'text-yellow-600';
    }
    return 'text-green-600';
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg hover:bg-gray-700"
        >
          📊 Perf
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-w-md max-h-96 overflow-auto">
      <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
        <h3 className="font-semibold text-sm">Performance Monitor</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="p-3 text-xs font-mono">
        {Object.entries(data).map(([name, stats]: [string, any]) => (
          <div key={name} className="mb-2">
            <div className="font-semibold text-gray-700 mb-1">
              {name.replace(/_/g, ' ')}
            </div>
            <div className={`grid grid-cols-2 gap-2 ${getMetricColor(name, stats)}`}>
              <div>Count: {stats.count}</div>
              <div>Avg: {formatValue(stats.avg, name.includes('memory') ? 'bytes' : 'ms')}</div>
              <div>Min: {formatValue(stats.min, name.includes('memory') ? 'bytes' : 'ms')}</div>
              <div>Max: {formatValue(stats.max, name.includes('memory') ? 'bytes' : 'ms')}</div>
            </div>
          </div>
        ))}
        
        {Object.keys(data).length === 0 && (
          <div className="text-gray-500 text-center py-4">
            No performance data yet
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitor;
