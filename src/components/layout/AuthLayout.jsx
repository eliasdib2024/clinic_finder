import { tx } from '../../lib/i18n';
import { Suspense } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Brand } from './Brand';
import { LanguageMenu } from './LanguageMenu';
import { HeroVisual } from '../3d/HeroVisual';
import { PageLoader } from '../shared/PageLoader';

/** `onboarding`: the signed-in patient is finishing sign-up, so offer "Sign out" instead of "Back". */
export function AuthLayout({ onboarding = false }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="auth-shell">
      <aside className="auth-aside" aria-hidden="false">
        <div className="aside-canvas"><HeroVisual dark follow={false} /></div>
        <div style={{ position: 'relative' }}><Brand light /></div>
        <div className="aside-copy">
          <h2 className="display">{tx('Care that starts with an open slot.')}</h2>
          <p>{tx(
            'Verified doctors in all nine governorates, live availability, and prescriptions you can verify with a single code.'
          )}</p>
        </div>
      </aside>
      <div className="auth-main">
        <div className="row between">
          {onboarding
            ? <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}><LogOut size={16} aria-hidden />{tx('Sign out')}</button>
            : <Link to="/" className="btn btn-ghost btn-sm"><ArrowLeft size={16} aria-hidden />{tx('Back to ClinicFinder')}</Link>}
          <LanguageMenu />
        </div>
        <main id="main" className="auth-card">
          <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  );
}
