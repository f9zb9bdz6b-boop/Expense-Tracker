import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      window.location.href = window.location.origin + window.location.pathname;
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center shadow-lg space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred while loading the view.'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                Reset Cache
              </Button>
              <Button size="sm" onClick={this.handleReload} className="bg-primary text-primary-foreground">
                Reload App
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
