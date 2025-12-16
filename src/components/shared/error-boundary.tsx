import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/src/components/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-400 max-w-md mb-6">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            variant="primary"
            onClick={this.handleReset}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-friendly error display component
export interface ErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
  compact?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  compact = false,
}) => {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-sm">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        <span className="text-red-200 flex-1">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <p className="text-sm text-red-200 mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3 h-3" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

// API Error specific display
export interface ApiErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
}

export const ApiErrorDisplay: React.FC<ApiErrorDisplayProps> = ({
  error,
  onRetry,
}) => {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;
  const isApiKeyError = message.toLowerCase().includes('api key');

  return (
    <div className="p-4 bg-red-900/10 border border-red-800/50 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-300 mb-1">
            {isApiKeyError ? 'API Configuration Error' : 'Request Failed'}
          </h4>
          <p className="text-xs text-red-200/70 mb-3">{message}</p>
          {isApiKeyError && (
            <p className="text-xs text-gray-400 mb-3">
              Make sure you have set the <code className="bg-gray-800 px-1 rounded">VITE_GEMINI_API_KEY</code> in your{' '}
              <code className="bg-gray-800 px-1 rounded">.env.local</code> file.
            </p>
          )}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              leftIcon={<RefreshCw className="w-3 h-3" />}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
