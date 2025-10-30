import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
}

/**
 * Hook to monitor network status and connection quality
 */
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: 'unknown',
    effectiveType: 'unknown'
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      const isSlowConnection = connection ? 
        (connection.effectiveType === 'slow-2g' || 
         connection.effectiveType === '2g' ||
         connection.downlink < 1.5) : false;

      setNetworkStatus({
        isOnline: navigator.onLine,
        isSlowConnection,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown'
      });
    };

    const handleOnline = () => {
      updateNetworkStatus();
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false
      }));
    };

    const handleConnectionChange = () => {
      updateNetworkStatus();
    };

    // Initial status
    updateNetworkStatus();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
};
