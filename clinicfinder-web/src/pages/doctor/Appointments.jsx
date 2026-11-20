import { tx } from '../../lib/i18n';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays, Info, CalendarRange, Search } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, ErrorState, Input, SkeletonRows, StatusBadge, Tabs } from '../../components/ui';
import { DateBlock, AppointmentMeta, StatusNote, AppointmentDetail } from '../../components/shared/AppointmentBits';
import { useAppointmentActions } from '../../components/shared/useAppointmentActions';
import { useAsync, useDebounce, useDocumentTitle } from '../../hooks';
import { listMyAppointments } from '../../services/appointmentService';
import { addDays, todayISO, formatDate, relativeDay } from '../../lib/dates';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled / declined' },
  { id: 'no-show', label: 'No-show' },
];
const match = (tab, a) => tab === 'all' || (tab === 'cancelled' ? ['cancelled', 'declined'].includes(a.status) : a.status === tab);

export default function DoctorAppointments() {
  useDocumentTitle(tx('Appointments'));
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'all';
  const date = params.get('date') || '';
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 200);
  const [detail, setDetail] = useState(null);
  const { data, loading, error, reload } = useAsync(() => listMyAppointments({ scope: 'all' }), []);
  const { buttons, dialogs } = useAppointmentActions(() => reload());

  const setParam = (k, v) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };
  const base = useMemo(() => (data || []).filter((a) => (!date || a.date === date) && (!dq || a.patient.name.toLowerCase().includes(dq.toLowerCase()) || a.reason.toLowerCase().includes(dq.toLowerCase()))), [data, date, dq]);
  const counts = Object.fromEntries(TABS.map((t) => [t.id, base.filter((a) => match(t.id, a)).length]));
  const items = base.filter((a) => match(tab, a)).sort((a, b) => {
    const k = (x) => x.date + x.time;
    if (date || tab === 'pending' || tab === 'confirmed') return k(a).localeCompare(k(b));
    const today = todayISO();
    const fa = a.date >= today; const fb = b.date >= today;
    if (fa !== fb) return fa ? -1 : 1;
    return fa ? k(a).localeCompare(k(b)) : k(b).localeCompare(k(a));
  });

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>{tx('Appointments')}</h1><p>{tx('Confirm requests, record outcomes and keep your day on track.')}</p></div>
      </div>
      <div className="row between wrap" style={{ '--gap': '12px' }}>
        <div className="date-stepper" role="group" aria-label={tx('Choose date')}>
          <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setParam('date', addDays(date || todayISO(), -1))} aria-label={tx('Previous day')}><ChevronLeft /></button>
          <input type="date" value={date} onChange={(e) => setParam('date', e.target.value)} aria-label={tx('Date')} />
          <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setParam('date', addDays(date || todayISO(), 1))} aria-label={tx('Next day')}><ChevronRight /></button>
        </div>
        <div className="row wrap" style={{ '--gap': '8px' }}>
          <Button size="sm" variant={date === todayISO() ? 'soft' : 'secondary'} icon={CalendarDays} onClick={() => setParam('date', todayISO())}>{tx('Today')}</Button>
          <Button size="sm" variant={!date ? 'soft' : 'secondary'} icon={CalendarRange} onClick={() => setParam('date', '')}>{tx('All dates')}</Button>
          <div style={{ width: 240 }}><Input icon={Search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Search patient or reason')} aria-label={tx('Search appointments')} /></div>
        </div>
      </div>
      {date && <p className="small muted" style={{ marginTop: -8 }}>{tx('Showing {0} ({1})', { 0: formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' }), 1: relativeDay(date) })}</p>}
      <Tabs label={tx('Status')} value={tab} onChange={(t) => setParam('tab', t === 'all' ? '' : t)} tabs={TABS.map((t) => ({ ...t, count: data ? counts[t.id] : undefined }))} />
      <section className="panel panel-flush" aria-live="polite">
        {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <div style={{ padding: 20 }}><SkeletonRows rows={5} /></div> : items.length === 0 ? (
          <EmptyState icon={CalendarDays} title={tx('No appointments here')}>{date ? tx(
            'Nothing on this date for the selected status. Try another day or “All dates”.'
          ) : tx('Appointments matching this status will appear here.')}</EmptyState>
        ) : items.map((a) => (
          <article key={a.id} className="appt-card">
            <DateBlock date={a.date} />
            <div style={{ minWidth: 0 }}>
              <div className="row wrap" style={{ '--gap': '10px' }}>
                <Avatar name={a.patient.name} size={28} />
                <strong>{a.patient.name}</strong>
                <StatusBadge status={a.status} />
                {a.patient.allergies?.length > 0 && <Badge tone="rose">{tx('Allergies:')}{' '}{a.patient.allergies.map((x) => tx(x)).join(', ')}</Badge>}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>{tx(a.reason)}</div>
              <AppointmentMeta a={a} who="patient" />
              <StatusNote a={a} />
            </div>
            <div className="appt-actions">
              {buttons(a)}
              <Button variant="ghost" size="sm" icon={Info} onClick={() => setDetail(a)}>{tx('Details')}</Button>
            </div>
          </article>
        ))}
      </section>
      {dialogs}
      <AppointmentDetail a={detail} open={!!detail} onClose={() => setDetail(null)} who="patient" />
    </div>
  );
}
