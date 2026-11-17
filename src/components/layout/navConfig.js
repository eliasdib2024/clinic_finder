import { LayoutDashboard, Search, CalendarDays, FileText, Settings, Users, CalendarClock, UserRound, ShieldCheck, Building2, Library, FilePlus2 } from 'lucide-react';

export const NAV = {
  patient: [
    { to: '/patient', key: 'nav.overview', icon: LayoutDashboard, end: true },
    { to: '/patient/search', key: 'nav.search', icon: Search, match: ['/patient/doctors'] },
    { to: '/patient/appointments', key: 'nav.appointments', icon: CalendarDays },
    { to: '/patient/prescriptions', key: 'nav.prescriptions', icon: FileText },
    { section: 'Account' },
    { to: '/patient/settings', key: 'nav.settings', icon: Settings },
  ],
  doctor: [
    { to: '/doctor', key: 'nav.overview', icon: LayoutDashboard, end: true },
    { to: '/doctor/appointments', key: 'nav.appointments', icon: CalendarDays, badge: 'pending' },
    { to: '/doctor/patients', key: 'nav.patients', icon: Users },
    { to: '/doctor/prescriptions', key: 'nav.prescriptions', icon: FileText, end: true, match: ['/doctor/prescriptions/'] , exclude: ['/doctor/prescriptions/new'] },
    { to: '/doctor/prescriptions/new', key: 'nav.newRx', icon: FilePlus2 },
    { section: 'Practice' },
    { to: '/doctor/schedule', key: 'nav.schedule', icon: CalendarClock },
    { to: '/doctor/profile', key: 'nav.profile', icon: UserRound },
    { to: '/doctor/settings', key: 'nav.settings', icon: Settings },
  ],
  admin: [
    { to: '/admin', key: 'nav.overview', icon: LayoutDashboard, end: true },
    { to: '/admin/verifications', key: 'nav.verifications', icon: ShieldCheck, badge: 'verifications' },
    { to: '/admin/users', key: 'nav.users', icon: Users },
    { to: '/admin/clinics', key: 'nav.clinics', icon: Building2 },
    { to: '/admin/catalog', key: 'nav.catalog', icon: Library },
    { section: 'Account' },
    { to: '/admin/settings', key: 'nav.settings', icon: Settings },
  ],
};

export function isActive(item, pathname) {
  if (item.exclude?.some((p) => pathname.startsWith(p))) return false;
  if (item.end) return pathname === item.to || item.match?.some((p) => pathname.startsWith(p));
  return pathname.startsWith(item.to) || item.match?.some((p) => pathname.startsWith(p));
}
