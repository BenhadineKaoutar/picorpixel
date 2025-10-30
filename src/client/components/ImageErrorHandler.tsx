import React, { useState, useEffect } from 'react';
import { ImageLoadError } from '../services/imagePreloader';
import { errorRecoveryService, RecoveryState } from '../services/errorRecoveryService';
import { LoadingState } from '../services/imageLoadingStateManager';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export interface ImageErrorHandlerProps {
  url: string;
  error: ImageLoadError;
  loadingState?: LoadingState;
  onRetry?: () => void;
  onSkip?: () => void;
  onRefresh?: () => void;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Comprehensive image error handler with recovery options
 */
export const ImageErrorHandler: React.FC<ImageErrorHandlerProps> = ({
  url,
  error,
  loadingState,
  onRetry,
  onSkip,
  onRefresh,
  className = '',
  showDetails = false,
  compact = false
}) => {
  const [recoveryState, setRecoveryState] = useState<RecoveryState | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const networkStatus = useNetworkStatus();

  // Get recovery state
  useEffect(() => {
    const state = errorRecoveryService.getRecoveryState(url);
    setRecoveryState(state);
  }, [url, error]);

  // Handle retry countdown
  useEffect(() => {
    if (recoveryState?.nextRetryAt) {
      const updateCountdown = () => {
        const remaining = Math.ceil((recoveryState.nextRetryAt!.getTime() - Date.now()) / 1000);
        setRetryCountdown(Math.max(0, remaining));
        
        if (remaining <= 0) {
          setRetryCountdown(0);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      
      return () => clearInterval(interval);
    } else {
      setRetryCountdown(0);
    }
  }, [recoveryState?.nextRetryAt]);

  const getErrorIcon = (): string => {
    switch (error.type) {
      case 'timeout': return '⏱️';
      case 'network': return '🔌';
      case 'offline': return '📡';
      case 'slow_connection': return '🐌';
      case 'cors': return '🔒';
      case 'server_error': return '🔧';
      case 'invalid_url': return '🖼️';
      default: return '⚠️';
    }
  };

  const getErrorTitle = (): string => {
    switch (error.type) {
      case 'timeout': return 'Loading Timeout';
      case 'network': return 'Network Error';
      case 'offline': return 'Offline';
      case 'slow_connection': return 'Slow Connection';
      case 'cors': return 'Access Restricted';
      case 'server_error': return 'Server Error';
      case 'invalid_url': return 'Invalid Image';
      default: return 'Loading Error';
    }
  };

  const getUserMessage = (): string => {
    if (loadingState?.userMessage) {
      return loadingState.userMessage;
    }
    
    if (recoveryState) {
      return errorRecoveryService.getUserErrorMessage(error, recoveryState.attempts);
    }
    
    return error.message;
  };

  const getRecoveryActions = () => {
    if (!recoveryState) return [];
    return errorRecoveryService.getRecoveryActions(error, recoveryState);
  };

  const handleAction = (action: 'retry' | 'skip' | 'refresh' | 'wait') => {
    switch (action) {
      case 'retry':
        onRetry?.();
        break;
      case 'skip':
        onSkip?.();
        errorRecoveryService.skipImage(url, 'user_request');
        break;
      case 'refresh':
        onRefresh?.();
        break;
      case 'wait':
        // Just wait, no action needed
        break;
    }
  };

  // Compact version for inline display
  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 text-sm ${className}`}>
        <span className="text-lg">{getErrorIcon()}</span>
        <span className="text-gray-600">{getUserMessage()}</span>
        
        {retryCountdown > 0 && (
          <span className="text-xs text-gray-500">
            ({retryCountdown}s)
          </span>
        )}
        
        {getRecoveryActions().map((action) => (
          <button
            key={action.action}
            onClick={() => handleAction(action.action)}
            disabled={action.action === 'wait' || (action.action === 'retry' && retryCountdown > 0)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              action.primary
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100'
            } disabled:cursor-not-allowed`}
          >
            {action.label}
            {action.action === 'retry' && retryCountdown > 0 && ` (${retryCountdown}s)`}
          </button>
        ))}
      </div>
    );
  }

  // Full error display
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        {/* Error Icon */}
        <div className="flex-shrink-0">
          <span className="text-3xl" role="img" aria-label="Error">
            {getErrorIcon()}
          </span>
        </div>

        {/* Error Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            {getErrorTitle()}
          </h3>
          
          <p className="text-sm text-red-700 mb-3">
            {getUserMessage()}
          </p>

          {/* Network Status Info */}
          {!networkStatus.isOnline && (
            <div className="bg-orange-100 border border-orange-200 rounded p-2 mb-3">
              <p className="text-sm text-orange-700">
                📡 You're currently offline. Images will load automatically when your connection is restored.
              </p>
            </div>
          )}

          {networkStatus.isSlowConnection && (
            <div className="bg-yellow-100 border border-yellow-200 rounded p-2 mb-3">
              <p className="text-sm text-yellow-700">
                🐌 Slow connection detected ({networkStatus.effectiveType}). Images may take longer to load.
              </p>
            </div>
          )}

          {/* Retry Countdown */}
          {retryCountdown > 0 && (
            <div className="bg-blue-100 border border-blue-200 rounded p-2 mb-3">
              <p className="text-sm text-blue-700">
                🔄 Automatic retry in {retryCountdown} seconds...
              </p>
            </div>
          )}

          {/* Recovery Actions */}
          <div className="flex flex-wrap gap-2 mb-3">
            {getRecoveryActions().map((action) => (
              <button
                key={action.action}
                onClick={() => handleAction(action.action)}
                disabled={action.action === 'wait' || (action.action === 'retry' && retryCountdown > 0)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  action.primary
                    ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100'
                } disabled:cursor-not-allowed`}
              >
                {action.label}
                {action.action === 'retry' && retryCountdown > 0 && ` (${retryCountdown}s)`}
              </button>
            ))}
          </div>

          {/* Technical Details */}
          {showDetails && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800 font-medium">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono space-y-2">
                <div>
                  <span className="font-semibold">URL:</span>
                  <div className="break-all">{url}</div>
                </div>
                <div>
                  <span className="font-semibold">Error Type:</span>
                  <div>{error.type}</div>
                </div>
                <div>
                  <span className="font-semibold">Message:</span>
                  <div>{error.message}</div>
                </div>
                {recoveryState && (
                  <>
                    <div>
                      <span className="font-semibold">Attempts:</span>
                      <div>{recoveryState.attempts}</div>
                    </div>
                    <div>
                      <span className="font-semibold">Retryable:</span>
                      <div>{recoveryState.canRetry ? 'Yes' : 'No'}</div>
                    </div>
                    {recoveryState.nextRetryAt && (
                      <div>
                        <span className="font-semibold">Next Retry:</span>
                        <div>{recoveryState.nextRetryAt.toLocaleTimeString()}</div>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <span className="font-semibold">Network:</span>
                  <div>
                    {networkStatus.isOnline ? 'Online' : 'Offline'} 
                    {networkStatus.effectiveType && ` (${networkStatus.effectiveType})`}
                  </div>
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Simplified error display for loading states
 */
export const ImageLoadingError: React.FC<{
  error: string;
  onRetry?: () => void;
  onSkip?: () => void;
  className?: string;
}> = ({ error, onRetry, onSkip, className = '' }) => {
  return (
    <div className={`text-center p-4 ${className}`}>
      <div className="text-4xl mb-2">⚠️</div>
      <p className="text-sm text-gray-600 mb-3">{error}</p>
      <div className="flex space-x-2 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        )}
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Skip Image
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Loading state indicator with timeout handling
 */
export const ImageLoadingIndicator: React.FC<{
  loadingState: LoadingState;
  onSkip?: () => void;
  onRetry?: () => void;
  className?: string;
}> = ({ loadingState, onSkip, onRetry, className = '' }) => {
  const { status, progress, userMessage, showSpinner, showProgress, allowSkip, allowRetry } = loadingState;

  if (status === 'loaded') {
    return null;
  }

  return (
    <div className={`text-center p-4 ${className}`}>
      {showSpinner && (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
      )}
      
      {showProgress && progress !== undefined && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      
      {userMessage && (
        <p className="text-sm text-gray-600 mb-3">{userMessage}</p>
      )}
      
      <div className="flex space-x-2 justify-center">
        {allowRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        )}
        {allowSkip && onSkip && (
          <button
            onClick={onSkip}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Skip Image
          </button>
        )}
      </div>
    </div>
  );
};