import { PulseLine } from '../ui';
import { tx } from '../../lib/i18n';

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div style={{ width: 220, textAlign: 'center' }}>
        <PulseLine width={220} height={48} />
        <span className="small muted">{tx(label)}…</span>
      </div>
    </div>
  );
}
