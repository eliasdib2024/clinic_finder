import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireOnboarding, GuestOnly, RoleRedirect } from './routes/guards';
import { PublicLayout } from './components/layout/PublicLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Each area is code-split so users only download their own interface.
const Landing = lazy(() => import('./pages/public/Landing'));
const VerifyPrescription = lazy(() => import('./pages/public/VerifyPrescription'));
const NotFound = lazy(() => import('./pages/common/NotFound'));
const FindDoctors = lazy(() => import('./pages/common/FindDoctors'));
const DoctorProfile = lazy(() => import('./pages/common/DoctorProfile'));
const Settings = lazy(() => import('./pages/common/Settings'));
const PrescriptionPage = lazy(() => import('./pages/common/PrescriptionPage'));

const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const Welcome = lazy(() => import('./pages/auth/Welcome'));

const PatientOverview = lazy(() => import('./pages/patient/Overview'));
const PatientAppointments = lazy(() => import('./pages/patient/Appointments'));
const PatientPrescriptions = lazy(() => import('./pages/patient/Prescriptions'));

const DoctorOverview = lazy(() => import('./pages/doctor/Overview'));
const DoctorAppointments = lazy(() => import('./pages/doctor/Appointments'));
const DoctorPatients = lazy(() => import('./pages/doctor/Patients'));
const DoctorPrescriptions = lazy(() => import('./pages/doctor/Prescriptions'));
const NewPrescription = lazy(() => import('./pages/doctor/NewPrescription'));
const DoctorSchedule = lazy(() => import('./pages/doctor/Schedule'));
const DoctorPracticeProfile = lazy(() => import('./pages/doctor/PracticeProfile'));

const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminVerifications = lazy(() => import('./pages/admin/Verifications'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminClinics = lazy(() => import('./pages/admin/Clinics'));
const AdminCatalog = lazy(() => import('./pages/admin/Catalog'));

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<RoleRedirect><Landing /></RoleRedirect>} />
        <Route path="find" element={<FindDoctors base="public" />} />
        <Route path="doctors/:id" element={<DoctorProfile base="public" />} />
        <Route path="verify" element={<VerifyPrescription />} />
        <Route path="verify/:code" element={<VerifyPrescription />} />
      </Route>

      <Route element={<GuestOnly><AuthLayout /></GuestOnly>}>
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Second step of patient sign-up: health profile. */}
      <Route element={<RequireOnboarding><AuthLayout onboarding /></RequireOnboarding>}>
        <Route path="welcome" element={<Welcome />} />
      </Route>

      <Route path="patient" element={<RequireAuth roles={['patient']}><DashboardLayout role="patient" /></RequireAuth>}>
        <Route index element={<PatientOverview />} />
        <Route path="search" element={<FindDoctors base="patient" />} />
        <Route path="doctors/:id" element={<DoctorProfile base="patient" />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="prescriptions" element={<PatientPrescriptions />} />
        <Route path="prescriptions/:id" element={<PrescriptionPage />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="doctor" element={<RequireAuth roles={['doctor']}><DashboardLayout role="doctor" /></RequireAuth>}>
        <Route index element={<DoctorOverview />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="prescriptions" element={<DoctorPrescriptions />} />
        <Route path="prescriptions/new" element={<NewPrescription />} />
        <Route path="prescriptions/:id" element={<PrescriptionPage />} />
        <Route path="schedule" element={<DoctorSchedule />} />
        <Route path="profile" element={<DoctorPracticeProfile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="admin" element={<RequireAuth roles={['admin']}><DashboardLayout role="admin" /></RequireAuth>}>
        <Route index element={<AdminOverview />} />
        <Route path="verifications" element={<AdminVerifications />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="clinics" element={<AdminClinics />} />
        <Route path="catalog" element={<AdminCatalog />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
