"use client";

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    showErrorDetails?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({
            error,
            errorInfo,
        });

        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error);
            console.error('Error info:', errorInfo);
        }

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);

        // In production, you might want to send to an error reporting service
        // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-destructive/5 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-lg font-semibold text-destructive mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        An unexpected error occurred. You can try refreshing this section or reloading the page.
                    </p>

                    <div className="flex gap-2">
                        <Button
                            onClick={this.handleRetry}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="default"
                            size="sm"
                        >
                            Refresh Page
                        </Button>
                    </div>

                    {this.props.showErrorDetails && process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mt-4 text-left w-full max-w-2xl">
                            <summary className="cursor-pointer text-sm font-medium text-destructive">
                                Error Details (Development)
                            </summary>
                            <pre className="mt-2 p-4 bg-secondary text-secondary-foreground text-xs rounded overflow-auto">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
} 