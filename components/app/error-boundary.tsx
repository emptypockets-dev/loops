"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** What the user was looking at, e.g. "your inbox". */
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Non-blocking error treatment for each screen section. Your data is safe in
 * Convex; the section offers a retry instead of taking the page down.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Section error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-8 text-center"
        >
          <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">Couldn&apos;t load {this.props.label ?? "this section"}.</p>
            <p className="text-sm text-muted-foreground">
              Your data is safe. This is a display hiccup, not a lost loop.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
