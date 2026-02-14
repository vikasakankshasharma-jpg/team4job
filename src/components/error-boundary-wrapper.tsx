"use client";

import React from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundaryWrapper extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        Sentry.captureException(error, { extra: errorInfo as any });
    }

    resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-background rounded-lg border border-border">
                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        We apologize for the inconvenience. The error has been logged automatically.
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => window.location.reload()} variant="outline">
                            Reload Page
                        </Button>
                        <Button onClick={this.resetError}>Try Again</Button>
                    </div>
                    {process.env.NODE_ENV === "development" && this.state.error && (
                        <div className="mt-8 p-4 bg-muted rounded text-left overflow-auto max-w-2xl max-h-64 text-xs font-mono">
                            {this.state.error.toString()}
                            <br />
                            {this.state.error.stack}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
                    <h2 className="text-lg font-bold">An unexpected error occurred</h2>
                    <Button onClick={() => resetError()}>Try Again</Button>
                </div>
            )}>
                {this.props.children}
            </Sentry.ErrorBoundary>
        );
    }
}

export default ErrorBoundaryWrapper;
