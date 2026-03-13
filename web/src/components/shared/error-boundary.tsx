"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

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

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-500/30 bg-red-500/5 px-8 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/30">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="mt-5 text-sm font-semibold">Something went wrong</h3>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={this.handleRetry}>
            <RotateCcw className="mr-2 h-3 w-3" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
