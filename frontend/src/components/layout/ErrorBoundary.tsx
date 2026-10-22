import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '../ui/Button';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('UI error', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="container-x py-24 text-center">
        <p className="kicker">Stop the presses</p>
        <h1 className="mt-3 text-4xl font-bold">Something went wrong on this page.</h1>
        <p className="mx-auto mt-4 max-w-md text-charcoal/75">{this.state.error.message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => this.setState({ error: null })}>Try again</Button>
          <Button variant="secondary" onClick={() => { window.location.href = '/'; }}>Go home</Button>
        </div>
      </div>
    );
  }
}
