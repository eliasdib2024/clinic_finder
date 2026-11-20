import { tx } from '../../lib/i18n';
import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, Search, Stethoscope, ShieldCheck, HelpCircle, LayoutGrid, LogIn, UserPlus, LayoutDashboard } from 'lucide-react';
import { Brand } from './Brand';
import { LanguageMenu } from './LanguageMenu';
import { Button, Drawer } from '../ui';
import { useI18n } from '../../context/I18nContext';
import { useAuth, homeFor } from '../../context/AuthContext';
import { PageLoader } from '../shared/PageLoader';
import { ErrorBoundary } from '../shared/ErrorBoundary';

export function PublicLayout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { pathname, hash } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    setOpen(false);
    if (hash) { const el = document.getElementById(hash.slice(1)); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60); }
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  const links = [
    { to: '/find', label: t('nav.findDoctor'), icon: Search },
    { to: '/#specialties', label: t('nav.specialties'), icon: LayoutGrid },
    { to: '/#how', label: t('nav.howItWorks'), icon: HelpCircle },
    { to: '/#doctors', label: t('nav.forDoctors'), icon: Stethoscope },
    { to: '/verify', label: t('nav.verify'), icon: ShieldCheck },
  ];

  return (
    <>
      <a href="#main" className="skip-link">{tx('Skip to content')}</a>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container site-nav">
          <Brand />
          <nav className="site-links" aria-label={tx('Primary')}>
            {links.map((l) => <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive && !l.to.includes('#') ? 'active' : '')}>{l.label}</NavLink>)}
          </nav>
          <div className="site-actions">
            <LanguageMenu />
            {user ? (
              <Button to={homeFor(user.role)} icon={LayoutDashboard} className="desktop-only">{t('nav.dashboard')}</Button>
            ) : (
              <>
                <Button to="/login" variant="ghost" className="desktop-only">{t('nav.signIn')}</Button>
                <Button to="/signup" className="desktop-only">{t('nav.signUp')}</Button>
              </>
            )}
            <button className="icon-btn mobile-only" onClick={() => setOpen(true)} aria-label={tx('Open menu')}><MenuIcon /></button>
          </div>
        </div>
      </header>
      <Drawer open={open} onClose={() => setOpen(false)} title={<Brand />} width="min(340px, 88vw)">
        <nav className="mobile-nav" aria-label={tx('Mobile')}>
          {links.map((l) => { const I = l.icon; return <Link key={l.to} to={l.to} onClick={() => setOpen(false)}><I aria-hidden />{l.label}</Link>; })}
        </nav>
        <div className="stack" style={{ marginTop: 24, '--gap': '10px' }}>
          {user ? <Button to={homeFor(user.role)} block icon={LayoutDashboard}>{t('nav.dashboard')}</Button> : (
            <><Button to="/signup" block icon={UserPlus}>{t('nav.signUp')}</Button><Button to="/login" block variant="secondary" icon={LogIn}>{t('nav.signIn')}</Button></>
          )}
        </div>
      </Drawer>
      <main id="main" tabIndex={-1}>
        <ErrorBoundary resetKey={pathname}><Suspense fallback={<PageLoader />}><Outlet /></Suspense></ErrorBoundary>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Brand />
              <p className="muted small" style={{ marginTop: 14, maxWidth: 320 }}>{tx(
                'Find doctors and clinics across Lebanon, book appointments online and keep verifiable digital prescriptions.'
              )}</p>
            </div>
            <div><h4>{tx('Patients')}</h4><ul><li><Link to="/find">{tx('Find a doctor')}</Link></li><li><Link to="/#specialties">{tx('Browse specialties')}</Link></li><li><Link to="/verify">{tx('Verify a prescription')}</Link></li><li><Link to="/signup">{tx('Create an account')}</Link></li></ul></div>
            <div><h4>{tx('Doctors')}</h4><ul><li><Link to="/signup?role=doctor">{tx('Join as a doctor')}</Link></li><li><Link to="/#doctors">{tx('Why ClinicFinder')}</Link></li><li><Link to="/login">{tx('Doctor sign in')}</Link></li></ul></div>
            <div><h4>{tx('Contact')}</h4><ul><li><a href="mailto:support@clinicfinder.lb">{tx('support@clinicfinder.lb')}</a></li><li><a href="tel:+9611456789">+961 1 456 789</a></li><li><span className="muted small">{tx('Achrafieh, Beirut')}</span></li></ul></div>
          </div>
          <div className="footer-bottom">
            <span>{tx(
              '© 2026 ClinicFinder. Demo build — all doctors, clinics and patients are fictional.'
            )}</span>
            <span>{tx('For medical emergencies, call 140 (Lebanese Red Cross).')}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
