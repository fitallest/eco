import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-8 font-mono">
          <h1 className="text-3xl text-red-500 mb-4">Something went wrong.</h1>
          <div className="bg-gray-800 p-4 rounded border border-red-900 mb-4">
            <h2 className="text-xl text-red-400 mb-2">Error:</h2>
            <pre className="whitespace-pre-wrap text-sm text-red-200">
              {this.state.error && this.state.error.toString()}
            </pre>
          </div>
          <div className="bg-gray-800 p-4 rounded border border-gray-700">
             <h2 className="text-xl text-gray-400 mb-2">Component Stack:</h2>
             <pre className="whitespace-pre-wrap text-xs text-gray-500">
               {this.state.errorInfo && this.state.errorInfo.componentStack}
             </pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
