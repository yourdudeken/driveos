import { Component, type ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
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

    componentDidCatch(error: Error, info: { componentStack?: string }) {
        logger.error('React component error', { componentStack: info.componentStack }, error);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex items-center justify-center min-h-screen bg-black text-white p-8">
                    <div className="max-w-md text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                            <span className="text-2xl">!</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                        <p className="text-gray-500 mb-6">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition-colors"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
