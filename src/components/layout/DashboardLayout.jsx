import { tx } from '../../lib/i18n';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu as MenuIcon, LogOut, Settings, ChevronDown, UserRound, ShieldAlert } from 'lucide-react';
import { Brand } from './Brand';
import { NAV, isActive } from './navConfig';
import { NotificationsMenu } from './NotificationsMenu';
import { LanguageMenu } from './LanguageMenu';
import { Avatar, Drawer, Menu } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { listMyAppointments } from '../../services/appointmentService';
import { listDoctorsByVerification } from '../../services/adminService';
import { getMyDoctorProfile } from '../../services/doctorService';
import { PageLoader } from '../shared/PageLoader';
import { ErrorBoundary } from '../shared/ErrorBoundary';

function SideNav({ role, counts, onNavigate, inDrawer }) {
  const { pathname } = useLocation();
  const { t } = useI18n();
  return (
    <nav className={`sidebar ${inDrawer ? 'in-drawer' : 'desktop'}`} aria-label={tx('Main navigation')}>
      {!inDrawer && <Brand to={`/${role}`} />}
      <div className="side-nav">
        {NAV[role].map((item, i) => {
          if (item.section) return <div key={`s${i}`} className="side-label">{tx(item.section)}</div>;
          const active = isActive(item, pathname);
          const Icon = item.icon;
          const count = item.badge ? counts[item.badge] : 0;
          return (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={() => `side-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
              {/* The sliding highlight (shared layoutId) is desktop-only. Inside the phone drawer it would
                  re-animate while the drawer is closing, and AnimatePresence would never finish removing
                  the drawer's invisible overlay, which then blocked every tap. */}
              {active && (inDrawer
                ? <span className="side-bg" aria-hidden />
                : <motion.span layoutId="side-bg" className="side-bg" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />)}
              <Icon aria-hidden />{t(item.key)}
              {count > 0 && <span className="pill" aria-label={tx('{0} waiting', {
                0: count
              })}>{count}</span>}
            </NavLink>
          );
        })}
      </div>
      <div className="side-foot">
        <div className="side-card">
          <strong>{tx('Demo environment')}</strong>{tx(
          'Data is stored in this browser only. Clear it from Settings to start fresh.'
        )}</div>
      </div>
    </nav>
  );
}

export function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [counts, setCounts] = useState({});
  const [verification, setVerification] = useState(null);

  useEffect(() => { setDrawer(false); }, [location.pathname]);
  useEffect(() => {
    if (role === 'doctor') {
      listMyAppointments({ status: 'pending' }).then((l) => setCounts({ pending: l.length })).catch(() => {});
      getMyDoctorProfile().then((d) => setVerification(d.verification)).catch(() => {});
    }
    if (role === 'admin') listDoctorsByVerification('pending').then((l) => setCounts({ verifications: l.length })).catch(() => {});
  }, [role, location.pathname, location.search]);

  const signOut = async () => { await logout(); toast.info(tx('Signed out'), { body: tx('See you soon.') }); navigate('/login', { replace: true }); };
  const current = NAV[role].find((i) => !i.section && isActive(i, location.pathname));

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">{tx('Skip to content')}</a>
      <SideNav role={role} counts={counts} />
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={<Brand to={`/${role}`} />} side="left" width="min(300px, 86vw)">
        <SideNav role={role} counts={counts} inDrawer onNavigate={() => setDrawer(false)} />
      </Drawer>
      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setDrawer(true)} aria-label={tx('Open navigation')}><MenuIcon /></button>
          <span className="topbar-title">{current ? t(current.key) : ''}</span>
          <div className="topbar-actions">
            <LanguageMenu />
            <NotificationsMenu />
            <Menu trigger={({ toggle, props }) => (
              <button className="user-chip" onClick={toggle} {...props} aria-label={tx('Account menu')}>
                <Avatar name={user.name} size={32} />
                <span className="who"><strong>{user.name}</strong><span>{tx({ patient: 'Patient', doctor: 'Doctor', admin: 'Administrator' }[user.role])}</span></span>
                <ChevronDown size={16} className="muted" aria-hidden />
              </button>
            )}>
              <div style={{ padding: '10px 12px 8px' }}>
                <div className="strong">{user.name}</div>
                <div className="small muted">{user.email}</div>
              </div>
              <div className="menu-sep" />
              {role === 'doctor' && <button className="menu-item" role="menuitem" data-close onClick={() => navigate('/doctor/profile')}><UserRound />{tx('Practice profile')}</button>}
              <button className="menu-item" role="menuitem" data-close onClick={() => navigate(`/${role}/settings`)}><Settings />{t('nav.settings')}</button>
              <div className="menu-sep" />
              <button className="menu-item danger" role="menuitem" data-close onClick={signOut}><LogOut />{t('nav.signOut')}</button>
            </Menu>
          </div>
        </header>
        {role === 'doctor' && verification && verification.status !== 'approved' && (
          <div className="no-print" style={{ padding: '16px 28px 0' }}>
            <div className={`banner ${verification.status === 'rejected' ? 'danger' : 'warning'}`}>
              <ShieldAlert aria-hidden />
              <div className="grow">
                {verification.status === 'pending'
                  ? <><strong>{tx('Your profile is under review')}</strong>{tx(
                  'Patients can’t find or book you until an administrator verifies your license. You can complete your profile and availability meanwhile.'
                )}</>
                  : <><strong>{tx('Verification was rejected')}</strong>{tx(verification.reason)} <NavLink to="/doctor/profile">{tx('Review and re-submit')}</NavLink></>}
              </div>
            </div>
          </div>
        )}
        <main id="main" className="page" tabIndex={-1}>
          {/* CSS entrance keyed by path: always finishes fully visible, even when the user navigates mid-animation. */}
          <div key={location.pathname} className="enter-up">
            <ErrorBoundary resetKey={location.pathname}><Suspense fallback={<PageLoader />}><Outlet /></Suspense></ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
