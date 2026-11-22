import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import { PageLoader } from '../components/shared/PageLoader';

// Order of the sign-up steps a signed-in user must finish before using the app:
//   1. confirm the email address (/verify-email)   2. patients only: health profile (/welcome)
export const needsEmailVerification = (user) => user?.emailVerified === false;   // undefined (demo backend) = not required
export const needsOnboarding = (user) => user?.role === 'patient' && user.patient?.onboarding === 'pending';

/** Where a signed-in user belongs right now: the next unfinished sign-up step, or their home. */
export const nextStepFor = (user) =>
  needsEmailVerification(user) ? '/verify-email' : needsOnboarding(user) ? '/welcome' : homeFor(user.role);

/** Only signed-in users with one of `roles`. Others go to /login (remembering where they were) or to their own area. */
export function RequireAuth({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  // The app stays locked until the email is confirmed and (new patients) the health profile is saved.
  if (needsEmailVerification(user) || needsOnboarding(user)) return <Navigate to={nextStepFor(user)} replace />;
  return children;
}

/** /verify-email — only for a signed-in user whose address is not confirmed yet. */
export function RequireEmailVerification({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!needsEmailVerification(user)) return <Navigate to={nextStepFor(user)} replace />;
  return children;
}

/** /welcome — only for a patient who still has to complete their health profile (after confirming the email). */
export function RequireOnboarding({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (needsEmailVerification(user) || !needsOnboarding(user)) return <Navigate to={nextStepFor(user)} replace />;
  return children;
}

/** Login / signup / reset: signed-in users are sent to their next step or home. */
export function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (user) return <Navigate to={nextStepFor(user)} replace />;
  return children;
}

/** "/" — signed-in users go to their next step or role home; guests see the landing page. */
export function RoleRedirect({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (user) return <Navigate to={nextStepFor(user)} replace />;
  return children;
}
