import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import { PageLoader } from '../components/shared/PageLoader';

/** Only signed-in users with one of `roles`. Others go to /login (remembering where they were) or to their own area. */
export function RequireAuth({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  // A new patient must finish the health-profile step before using the app.
  if (needsOnboarding(user)) return <Navigate to="/welcome" replace />;
  return children;
}

export const needsOnboarding = (user) => user?.role === 'patient' && user.patient?.onboarding === 'pending';

/** /welcome — only for a patient who still has to complete their health profile. */
export function RequireOnboarding({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!needsOnboarding(user)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

/** Login / signup / reset: signed-in users are sent to their home. */
export function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (user) return <Navigate to={needsOnboarding(user) ? '/welcome' : homeFor(user.role)} replace />;
  return children;
}

/** "/" — signed-in users go to their role home; guests see the landing page. */
export function RoleRedirect({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
