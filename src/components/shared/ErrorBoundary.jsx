import { tx } from '../../lib/i18n';
import { Component } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/** Catches render errors so one broken widget never blanks the whole app. */
export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('ClinicFinder UI error:', error, info?.componentStack); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty" role="alert" style={{ minHeight: '50vh', justifyContent: 'center' }}>
        <div className="empty-icon" style={{ background: 'var(--rose-50)', color: 'var(--rose)' }}><AlertTriangle aria-hidden /></div>
        <h3>{tx('This page ran into a problem')}</h3>
        <p>{tx('Your data is safe. Try again, or go back to your dashboard.')}</p>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}><RotateCcw size={16} />{tx('Try again')}</button>
          <a className="btn btn-secondary" href={import.meta.env.VITE_ROUTER === "hash" ? "./#/" : "/"}><Home size={16} />{tx('Home')}</a>
        </div>
      </div>
    );
  }
}
