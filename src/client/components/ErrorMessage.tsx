import React from 'react';
import { ApiError } from '../services/apiClient';

export interface ErrorMessageProps {
  error: Error | ApiError | string;
  onRetry?: (() => void) | undefined;
  onDismiss?: (() => void) | undefined;
  showDetails?: boolean | undefined;
  className?: string | undefined;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = '',
}) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  const isApiError = errorObj instanceof ApiError;

  const getErrorIcon = () => {
    if (isApiError) {
      if (errorObj.isNetworkError) return '🔌';
      if (errorObj.isTimeout) return '⏱️';
      if (errorObj.isRateLimited) return '🚦';
      if (errorObj.isServerError) return '🔧';
    }
    return '⚠️';
  };

  const getErrorTitle = () => {
    if (isApiError) {
      if (errorObj.isNetworkError) return 'Connection Problem';
      if (errorObj.isTimeout) return 'Request Timeout';
      if (errorObj.isRateLimited) return 'Too Many Requests';
      if (errorObj.isServerError) return 'Server Error';
      if (errorObj.status === 401) return 'Authentication Required';
      if (errorObj.status === 403) return 'Access Denied';
      if (errorObj.status === 404) return 'Not Found';
    }
    return 'Error';
  };

  const getUserFriendlyMessage = () => {
    if (isApiError) {
      if (errorObj.isNetworkError) {
        return 'Unable to connect to the game server. Please check your internet connection and try again.';
      }
      if (errorObj.isTimeout) {
        return 'The request took too long to complete. This might be due to a slow connection.';
      }
      if (errorObj.isRateLimited) {
        const retryAfter = errorObj.retryAfter;
        return `You're making requests too quickly. ${retryAfter ? `Please wait ${retryAfter} seconds before trying again.` : 'Please wait a moment before trying again.'}`;
      }
      if (errorObj.isServerError) {
        return 'The game server is experiencing issues. Our team has been notified and is working on a fix.';
      }
      if (errorObj.status === 401) {
        return 'Your session has expired. Please refresh the page to continue playing.';
      }
      if (errorObj.status === 403) {
        return 'You don\'t have permission to perform this action.';
      }
      if (errorObj.status === 404) {
        return 'The requested content could not be found. It may have been moved or deleted.';
      }
    }
    
    return errorObj.message || 'An unexpected error occurred. Please try again.';
  };

  const getRetryText = () => {
    if (isApiError) {
      if (errorObj.isNetworkError) return 'Check Connection';
      if (errorObj.isTimeout) return 'Try Again';
      if (errorObj.isRateLimited) return 'Wait & Retry';
      if (errorObj.isServerError) return 'Retry';
      if (errorObj.status === 401) return 'Refresh Page';
    }
    return 'Try Again';
  };

  const shouldShowRetry = () => {
    if (!onRetry) return false;
    if (isApiError && errorObj.status === 401) return false; // Don't show retry for auth errors
    return true;
  };

  return (
    <div className={`pixel-card p-6 animate-pop-in ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-gray-800"
            style={{ backgroundColor: 'var(--color-danger)' }}
          >
            <span className="text-2xl" role="img" aria-label="Error">
              {getErrorIcon()}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-dark)' }}>
            {getErrorTitle()}
          </h3>
          <div className="text-sm text-gray-600 mb-4">
            <p>{getUserFriendlyMessage()}</p>
          </div>
          
          {showDetails && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                Technical Details
              </summary>
              <div className="mt-2 p-2 bg-red-100 rounded text-xs font-mono">
                <div className="font-semibold">Error:</div>
                <div className="mb-2">{errorObj.message}</div>
                {isApiError && (
                  <>
                    <div className="font-semibold">Status:</div>
                    <div className="mb-2">{errorObj.status}</div>
                    {errorObj.response && (
                      <>
                        <div className="font-semibold">Response:</div>
                        <div>{JSON.stringify(errorObj.response, null, 2)}</div>
                      </>
                    )}
                  </>
                )}
              </div>
            </details>
          )}
          
          <div className="flex gap-3">
            {shouldShowRetry() && (
              <button
                onClick={onRetry}
                className="pixel-button text-white font-bold py-2 px-4 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              >
                {getRetryText()}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="pixel-button font-bold py-2 px-4 rounded-lg text-sm"
                style={{ 
                  backgroundColor: 'white',
                  color: 'var(--color-dark)'
                }}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        {onDismiss && !shouldShowRetry() && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// Specialized error message for offline state
export const OfflineMessage: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className = '' }) => {
  return (
    <div className={`pixel-card p-4 animate-pop-in ${className}`} style={{ backgroundColor: 'var(--color-warning)' }}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <span className="text-3xl" role="img" aria-label="Offline">
            📡
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-dark)' }}>
            You're Offline
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-dark)', opacity: 0.8 }}>
            No internet connection detected.
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="pixel-button text-white font-bold py-2 px-4 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

// Loading state with error fallback
export const LoadingWithError: React.FC<{
  loading: boolean;
  error?: Error | ApiError | string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingText?: string;
}> = ({ loading, error, onRetry, children, loadingText = 'Loading...' }) => {
  if (error) {
    return (
      <ErrorMessage
        error={error}
        onRetry={onRetry}
        showDetails={process.env.NODE_ENV === 'development'}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{loadingText}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
