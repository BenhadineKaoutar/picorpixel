import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Store error in localStorage for debugging
      const errorReport = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      const existingErrors = JSON.parse(localStorage.getItem('picorpixel_errors') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      localStorage.setItem('picorpixel_errors', JSON.stringify(existingErrors));
    } catch (storageError) {
      console.error('Failed to store error report:', storageError);
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportBug = () => {
    const errorDetails = {
      message: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || 'No stack trace',
      componentStack: this.state.errorInfo?.componentStack || 'No component stack',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const subject = encodeURIComponent('PicOrPixel Bug Report');
    const body = encodeURIComponent(`
Error Details:
${JSON.stringify(errorDetails, null, 2)}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    // Open Reddit message or email client
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              The game encountered an unexpected error. Don't worry, your progress is safe!
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-32">
                  <div className="text-red-600 font-semibold">{this.state.error.message}</div>
                  {this.state.error.stack && (
                    <pre className="mt-1 text-gray-700 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col space-y-2">
              <button
                onClick={this.handleRetry}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Reload Game
              </button>
              <button
                onClick={this.handleReportBug}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Report Bug
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Throw error to be caught by ErrorBoundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, clearError };
};
