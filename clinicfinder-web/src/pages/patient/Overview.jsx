import { getLocale, tx } from '../../lib/i18n';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, CalendarDays, FileText, Stethoscope, Settings, CalendarPlus, ArrowRight, Pill, HeartPulse, Droplet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Avatar, Button, EmptyState, Input, PulseLine, SkeletonRows, StatusBadge, AnimatedNumber, Skeleton } from '../../components/ui';
import { DoctorCard } from '../../components/shared/DoctorCard';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useCatalog } from '../../context/CatalogContext';
import { useAsync, useDocumentTitle } from '../../hooks';
import { listMyAppointments } from '../../services/appointmentService';
import { listMyPrescriptions } from '../../services/prescriptionService';
import { searchDoctors } from '../../services/doctorService';
import { greeting, formatDate, formatTime, relativeDay, todayISO, addDays, parseISODate } from '../../lib/dates';

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tip"><strong>{label}</strong>{tx(payload[0].value === 1 ? '{0} completed visit' : '{0} completed visits', { 0: payload[0].value })}</div>;
}

export default function PatientOverview() {
  useDocumentTitle(tx('Overview'));
  const rtl = useI18n().dir === 'rtl'; // chart is drawn LTR and mirrored for Arabic
  const { user } = useAuth();
  const { insurerName } = useCatalog();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const upcoming = useAsync(() => listMyAppointments({ scope: 'upcoming' }), []);
  const all = useAsync(() => listMyAppointments({ scope: 'all' }), []);
  const rx = useAsync(() => listMyPrescriptions(), []);
  const recos = useAsync(() => searchDoctors({ myInsurance: !!user.patient?.insuranceId, sort: 'recommended', pageSize: 3 }), []);

  const next = upcoming.data?.[0];
  const firstName = user.name.split(' ')[0];
  const doctorsSeen = useMemo(() => new Set((all.data || []).filter((a) => a.status === 'completed').map((a) => a.doctorId)).size, [all.data]);
  const chart = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => { const d = parseISODate(todayISO()); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString(getLocale(), { month: 'short' }), visits: 0 }; });
    (all.data || []).filter((a) => a.status === 'completed').forEach((a) => { const m = months.find((x) => a.date.startsWith(x.key)); if (m) m.visits += 1; });
    return months;
  }, [all.data]);
  const activeRx = (rx.data || []).filter((p) => p.date >= addDays(todayISO(), -90));

  return (
    <div className="stack" style={{ '--gap': '24px' }}>
      <div className="row between wrap" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 className="hello">{tx('{0}, {1}.', { 0: greeting(), 1: firstName })}</h1>
          <p className="muted" style={{ marginTop: 6 }}>{next ? tx('Your next visit is {0} at {1}.', {
            0: relativeDay(next.date).toLowerCase(),
            1: formatTime(next.time)
          }) : tx('You have no upcoming visits.')}</p>
        </div>
        <form className="row" style={{ '--gap': '8px', minWidth: 'min(100%, 420px)' }} onSubmit={(e) => { e.preventDefault(); navigate(`/patient/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); }} role="search">
          <div className="grow"><Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Search doctors or specialties')} aria-label={tx('Search doctors')} /></div>
          <Button type="submit">{tx('Search')}</Button>
        </form>
      </div>

      <div className="quick-actions">
        {[
          ['/patient/search', 'Book a visit', CalendarPlus, 'tone-teal'],
          ['/patient/appointments', 'My appointments', CalendarDays, 'tone-blue'],
          ['/patient/prescriptions', 'My prescriptions', FileText, 'tone-emerald'],
          ['/patient/settings?tab=health', 'Health & insurance', Settings, 'tone-amber'],
        ].map(([to, label, Icon, tone]) => <Link key={to} to={to} className="quick-action"><span className={`ic ${tone}`}><Icon aria-hidden /></span>{tx(label)}</Link>)}
      </div>

      <div className="split">
        <div className="stack" style={{ '--gap': '20px' }}>
          {upcoming.loading ? <Skeleton h={210} r={22} /> : next ? (
            <section className="next-appt" aria-label={tx('Next appointment')}>
              <div className="row between wrap">
                <h3>{tx('Next appointment')}</h3>
                <span className="badge" style={{ background: 'rgba(255,255,255,.14)', color: '#fff' }}>{next.status === 'confirmed' ? tx('Confirmed') : tx('Awaiting confirmation')}</span>
              </div>
              <div className="when">{tx('{0}, {1}', { 0: relativeDay(next.date), 1: formatTime(next.time) })}</div>
              <div style={{ opacity: 0.85 }}>{formatDate(next.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div className="row" style={{ marginTop: 18, '--gap': '12px' }}>
                <Avatar name={next.doctor.name} size={44} />
                <div className="grow"><div style={{ color: '#fff', fontWeight: 600 }}>{next.doctor.name}</div><div className="small" style={{ opacity: 0.8 }}>{tx(next.doctor.specialty)} · {next.type === 'video' ? tx('Video consultation') : <bdi>{next.doctor.location}</bdi>}</div></div>
                <Button to="/patient/appointments" variant="secondary" size="sm">{tx('Manage')}</Button>
              </div>
              <PulseLine width={800} height={40} />
            </section>
          ) : (
            <section className="panel"><EmptyState icon={CalendarDays} title={tx('No upcoming appointments')} action={<Button to="/patient/search" icon={Search}>{tx('Find a doctor')}</Button>}>{tx('Book a visit in a few clicks — most doctors have openings this week.')}</EmptyState></section>
          )}

          <section className="panel" aria-labelledby="up-h">
            <div className="panel-head"><h2 id="up-h">{tx('Upcoming')}</h2><Link to="/patient/appointments" className="small strong">{tx('View all')}</Link></div>
            <div className="panel-body">
              {upcoming.loading ? <SkeletonRows rows={3} /> : (upcoming.data || []).length <= 1 ? <p className="muted small">{next ? tx('Nothing else scheduled.') : tx('Nothing scheduled.')}</p> : upcoming.data.slice(1, 5).map((a) => (
                <div key={a.id} className="list-row">
                  <Avatar name={a.doctor.name} size={40} />
                  <div className="grow"><div className="strong">{a.doctor.name}</div><div className="small muted">{tx(a.doctor.specialty)} · {tx('{0}, {1}', { 0: relativeDay(a.date), 1: formatTime(a.time) })}</div></div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </section>

          <section className="panel" aria-labelledby="rec-h">
            <div className="panel-head"><h2 id="rec-h">{tx('Recommended for you')}</h2><Link to="/patient/search" className="small strong">{tx('Browse all')}</Link></div>
            <div className="panel-body">
              <p className="small muted" style={{ marginBottom: 14 }}>{user.patient?.insuranceId ? tx('Highly rated doctors who accept {0}.', {
                0: insurerName(user.patient.insuranceId)
              }) : tx('Highly rated doctors with availability soon.')}</p>
              {recos.loading ? <SkeletonRows rows={2} /> : <div className="doc-grid">{recos.data.items.map((d) => <DoctorCard key={d.id} doctor={d} to={`/patient/doctors/${d.id}`} myInsurance={user.patient?.insuranceId} />)}</div>}
            </div>
          </section>
        </div>

        <div className="stack" style={{ '--gap': '20px' }}>
          <div className="grid grid-2" style={{ '--gap': '12px' }}>
            <div className="panel kpi"><span className="kpi-ic tone-teal"><CalendarDays aria-hidden /></span><div><div className="kpi-value"><AnimatedNumber value={upcoming.data?.length || 0} /></div><div className="kpi-label">{tx('Upcoming')}</div></div></div>
            <div className="panel kpi"><span className="kpi-ic tone-blue"><Stethoscope aria-hidden /></span><div><div className="kpi-value"><AnimatedNumber value={doctorsSeen} /></div><div className="kpi-label">{tx('Doctors seen')}</div></div></div>
          </div>

          <section className="panel" aria-labelledby="rx-h">
            <div className="panel-head"><h2 id="rx-h">{tx('Recent prescriptions')}</h2><Link to="/patient/prescriptions" className="small strong">{tx('All')}</Link></div>
            <div className="panel-body">
              {rx.loading ? <SkeletonRows rows={2} /> : activeRx.length === 0 ? <p className="small muted">{tx('No prescriptions in the last 3 months.')}</p> : activeRx.slice(0, 3).map((p) => (
                <Link key={p.id} to={`/patient/prescriptions/${p.id}`} className="list-row" style={{ color: 'inherit' }}>
                  <span className="kpi-ic tone-emerald" style={{ width: 38, height: 38 }}><Pill size={18} aria-hidden /></span>
                  <div className="grow"><div className="strong small">{p.medications.map((m) => m.name.split(' ')[0]).join(', ')}</div><div className="tiny muted">{p.doctor.name} · {formatDate(p.date, { day: 'numeric', month: 'short' })}</div></div>
                  <ArrowRight size={16} className="muted" aria-hidden />
                </Link>
              ))}
            </div>
          </section>

          <section className="panel" aria-labelledby="hist-h">
            <div className="panel-head"><h2 id="hist-h">{tx('Visit history')}</h2><span className="small muted">{tx('Last 6 months')}</span></div>
            <div className="panel-body">
              <div style={{ height: 170 }} dir="ltr">
                <ResponsiveContainer>
                  <BarChart data={chart} margin={rtl ? { top: 6, right: -28, left: 4, bottom: 0 } : { top: 6, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--mist)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} reversed={rtl} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} orientation={rtl ? 'right' : 'left'} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--teal-50)' }} />
                    <Bar dataKey="visits" fill="var(--teal-500)" radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="panel panel-pad stack" style={{ '--gap': '12px' }} aria-label={tx('Health summary')}>
            <h2 style={{ fontSize: 16 }}>{tx('Health summary')}</h2>
            <div className="row" style={{ '--gap': '10px' }}><span className="kpi-ic tone-rose" style={{ width: 34, height: 34 }}><Droplet size={16} aria-hidden /></span><span className="grow small">{tx('Blood type')}</span><strong>{user.patient?.bloodType || '—'}</strong></div>
            <div className="row" style={{ '--gap': '10px' }}><span className="kpi-ic tone-amber" style={{ width: 34, height: 34 }}><HeartPulse size={16} aria-hidden /></span><span className="grow small">{tx('Allergies')}</span><strong className="small">{user.patient?.allergies?.map((x) => tx(x)).join(', ') || tx('None')}</strong></div>
            <Link to="/patient/settings?tab=health" className="small strong">{tx('Update health details')}</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
