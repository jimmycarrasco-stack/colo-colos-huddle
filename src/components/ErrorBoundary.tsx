import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Optionally log error to a backend later
    console.error('Chat ErrorBoundary caught:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    // Simple reload helps in PWA contexts
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-3">
          <h2 className="text-xl font-semibold">Something went wrong loading Chat</h2>
          <p className="text-sm text-muted-foreground">Please try again.</p>
          <button onClick={this.handleRetry} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
