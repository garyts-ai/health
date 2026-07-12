"use client";

import { Component, type ReactNode } from "react";

type SectionErrorBoundaryProps = { label: string; children: ReactNode };
type SectionErrorBoundaryState = { hasError: boolean };

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // Keep provider details out of the UI; the surrounding route can still render.
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="district-error-state" role="alert">
      <strong>{this.props.label} is temporarily unavailable.</strong>
      <p>Other dashboard sections remain available. Try refreshing this section.</p>
      <button type="button" onClick={() => this.setState({ hasError: false })}>Try again</button>
    </div>;
  }
}
