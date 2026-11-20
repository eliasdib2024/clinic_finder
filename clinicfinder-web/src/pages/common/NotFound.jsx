import { tx } from '../../lib/i18n';
import { Home, Search } from 'lucide-react';
import { Button, PulseLine } from '../../components/ui';
import { useAuth, homeFor } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks';

export default function NotFound() {
  useDocumentTitle(tx('Page not found'));
  const { user } = useAuth();
  return (
    <div className="not-found">
      <div style={{ maxWidth: 520 }}>
        <div className="big" aria-hidden>404</div>
        <PulseLine width={520} height={50} />
        <h1 style={{ fontSize: 26, marginTop: 12 }}>{tx('We couldn’t find that page')}</h1>
        <p className="muted" style={{ marginTop: 8 }}>{tx('The link may be outdated, or the page has moved.')}</p>
        <div className="row wrap" style={{ justifyContent: 'center', marginTop: 22 }}>
          <Button to={user ? homeFor(user.role) : '/'} icon={Home}>{user ? tx('Go to my dashboard') : tx('Go to home page')}</Button>
          <Button to="/find" variant="secondary" icon={Search}>{tx('Find a doctor')}</Button>
        </div>
      </div>
    </div>
  );
}
