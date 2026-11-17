import { tx } from '../../lib/i18n';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarClock, XCircle, FileText, RotateCw, Info, Search, AlertTriangle, History, Ban } from 'lucide-react';
import { Avatar, Button, ConfirmDialog, EmptyState, ErrorState, SkeletonRows, StatusBadge, Tabs } from '../../components/ui';
import { DateBlock, AppointmentMeta, StatusNote, RescheduleModal, AppointmentDetail, isLate, hoursUntil } from '../../components/shared/AppointmentBits';
import { useAsync, useDocumentTitle } from '../../hooks';
import { listMyAppointments, cancelAppointment } from '../../services/appointmentService';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime, dateTime, now } from '../../lib/dates';

export default function PatientAppointments() {
  useDocumentTitle(tx('My appointments'));
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'upcoming';
  const { data, loading, error, reload } = useAsync(() => listMyAppointments({ scope: 'all' }), []);
  const [reschedule, setReschedule] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [detail, setDetail] = useState(null);

  const groups = useMemo(() => {
    const list = data || [];
    const t = now().getTime();
    const isUp = (a) => ['pending', 'confirmed'].includes(a.status) && dateTime(a.date, a.time).getTime() + a.duration * 60000 > t - 12 * 3600000;
    return {
      upcoming: list.filter(isUp).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
      past: list.filter((a) => !isUp(a) && !['cancelled', 'declined'].includes(a.status)),
      cancelled: list.filter((a) => ['cancelled', 'declined'].includes(a.status)),
    };
  }, [data]);

  const items = groups[tab] || [];
  const doCancel = async () => {
    const a = await cancelAppointment(cancel.id);
    toast.success(tx('Appointment cancelled'), { body: tx('{0} was notified.', {
      0: a.doctor.name
    }) });
    reload();
  };

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>{tx('My appointments')}</h1><p>{tx(
          'Reschedule, cancel or book again — changes are shared with your doctor instantly.'
        )}</p></div>
        <Button to="/patient/search" icon={Search}>{tx('Book a new visit')}</Button>
      </div>
      <Tabs label={tx('Appointment lists')} value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} tabs={[
        { id: 'upcoming', label: 'Upcoming', count: groups.upcoming.length, icon: CalendarDays },
        { id: 'past', label: 'Past', count: groups.past.length, icon: History },
        { id: 'cancelled', label: 'Cancelled', count: groups.cancelled.length, icon: Ban },
      ]} />
      <section className="panel panel-flush" aria-live="polite">
        {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <div style={{ padding: 20 }}><SkeletonRows rows={4} /></div> : items.length === 0 ? (
          <EmptyState icon={CalendarDays} title={tab === 'upcoming' ? tx('No upcoming appointments') : tab === 'past' ? tx('No past visits yet') : tx('Nothing cancelled')}
            action={tab === 'upcoming' && <Button to="/patient/search" icon={Search}>{tx('Find a doctor')}</Button>}>
            {tab === 'upcoming' ? tx(
              'When you book, your visits appear here with options to reschedule or cancel.'
            ) : tab === 'past' ? tx('Completed visits and their prescriptions will show up here.') : tx('Cancelled and declined bookings are kept here for your records.')}
          </EmptyState>
        ) : items.map((a) => (
          <article key={a.id} className="appt-card">
            <DateBlock date={a.date} />
            <div style={{ minWidth: 0 }}>
              <div className="row wrap" style={{ '--gap': '10px' }}>
                <Avatar name={a.doctor.name} size={28} />
                <Link to={`/patient/doctors/${a.doctorId}`} className="strong" style={{ color: 'var(--ink)' }}>{a.doctor.name}</Link>
                <StatusBadge status={a.status} />
                {a.lateCancellation && <span className="badge tone-amber">{tx('Late cancellation')}</span>}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>{tx(a.doctor.specialty)} · {tx(a.reason)}</div>
              <AppointmentMeta a={a} />
              {(a.status !== 'confirmed' || a.statusNote?.startsWith('Rescheduled')) && <StatusNote a={a} />}
            </div>
            <div className="appt-actions">
              <Button variant="ghost" size="sm" icon={Info} onClick={() => setDetail(a)}>{tx('Details')}</Button>
              {tab === 'upcoming' && <>
                <Button variant="secondary" size="sm" icon={CalendarClock} onClick={() => setReschedule(a)}>{tx('Reschedule')}</Button>
                <Button variant="danger-soft" size="sm" icon={XCircle} onClick={() => setCancel(a)}>{tx('Cancel')}</Button>
              </>}
              {a.prescriptionId && <Button variant="soft" size="sm" icon={FileText} to={`/patient/prescriptions/${a.prescriptionId}`}>{tx('Prescription')}</Button>}
              {tab !== 'upcoming' && <Button variant="secondary" size="sm" icon={RotateCw} to={`/patient/doctors/${a.doctorId}`}>{tx('Book again')}</Button>}
            </div>
          </article>
        ))}
      </section>

      <RescheduleModal appt={reschedule} open={!!reschedule} onClose={() => setReschedule(null)} onDone={() => reload()} />
      <ConfirmDialog open={!!cancel} onClose={() => setCancel(null)} onConfirm={doCancel} title={tx('Cancel this appointment?')} confirmLabel={tx('Cancel appointment')}
        description={cancel ? tx('{0} · {1} at {2}. The slot will be released to other patients.', {
          0: cancel.doctor.name,
          1: formatDate(cancel.date),
          2: formatTime(cancel.time)
        }) : ''}>
        {cancel && isLate(cancel) && hoursUntil(cancel) > -1 && (
          <div className="banner warning"><AlertTriangle aria-hidden /><div><strong>{tx('Late cancellation')}</strong>{tx(
            'This visit is less than 24 hours away. Some clinics may charge a fee for late cancellations — consider rescheduling instead.'
          )}</div></div>
        )}
      </ConfirmDialog>
      <AppointmentDetail a={detail} open={!!detail} onClose={() => setDetail(null)} who="doctor" />
    </div>
  );
}
