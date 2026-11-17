import { getLocale, tx } from '../../lib/i18n';
import { useEffect, useState } from 'react';
import { MapPin, Video, Building2, Clock, MessageSquare, CalendarClock, AlertTriangle } from 'lucide-react';
import { Modal, Button, StatusBadge, Badge } from '../ui';
import { SlotPicker } from './SlotPicker';
import { rescheduleAppointment } from '../../services/appointmentService';
import { useToast } from '../../context/ToastContext';
import { parseISODate, formatTime, formatDate, dateTime, now, formatWhen } from '../../lib/dates';

export function DateBlock({ date }) {
  const d = parseISODate(date);
  return (
    <div className="date-block" aria-hidden>
      <div className="m">{d.toLocaleDateString(getLocale(), { month: 'short' })}</div>
      <div className="d">{d.getDate()}</div>
      <div className="w">{d.toLocaleDateString(getLocale(), { weekday: 'short' })}</div>
    </div>
  );
}

export function AppointmentMeta({ a, who = 'doctor' }) {
  return (
    <div className="appt-meta">
      <span><Clock aria-hidden />{formatTime(a.time)} · {a.duration}{' '}{tx('min')}</span>
      <span>{a.type === 'video' ? <><Video aria-hidden />{tx('Video')}</> : <><Building2 aria-hidden />{tx('In person')}</>}</span>
      {who === 'doctor' && a.doctor?.location && <span><MapPin aria-hidden /><bdi>{a.doctor.location}</bdi></span>}
    </div>
  );
}

/** Status note in the reader's language (rescheduling notes are rebuilt from the stored previous slot). */
export function noteText(a) {
  if (a.rescheduledFrom && a.statusNote?.startsWith('Rescheduled')) return tx('Rescheduled from {0}', { 0: formatWhen(a.rescheduledFrom.date, a.rescheduledFrom.time) });
  return tx(a.statusNote);
}

export function StatusNote({ a }) {
  if (!a.statusNote) return null;
  return <div className="note-box"><MessageSquare aria-hidden /><span>{noteText(a)}</span></div>;
}

export const hoursUntil = (a) => (dateTime(a.date, a.time) - now()) / 3600000;
export const isLate = (a) => hoursUntil(a) < 24;

export function RescheduleModal({ appt, open, onClose, onDone }) {
  const toast = useToast();
  const [slot, setSlot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => { if (open) setSlot(null); }, [open]);
  if (!appt) return null;
  const save = async () => {
    setBusy(true);
    try {
      const a = await rescheduleAppointment(appt.id, slot);
      toast.success(tx('Appointment rescheduled'), { body: a.status === 'pending' ? tx('Waiting for the doctor to confirm the new time.') : tx('Confirmed for {0} at {1}.', {
        0: formatDate(a.date),
        1: formatTime(a.time)
      }) });
      onDone(a); onClose();
    } catch (e) { toast.error(tx('Couldn’t reschedule'), { body: e.message }); setRefreshKey((k) => k + 1); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={() => !busy && onClose()} size="lg" title={tx('Reschedule appointment')}
      description={tx('{0} · currently {1} at {2}', {
        0: appt.doctor?.name,
        1: formatDate(appt.date),
        2: formatTime(appt.time)
      })}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>{tx('Keep current time')}</Button><Button onClick={save} loading={busy} disabled={!slot?.time} icon={CalendarClock}>{slot?.time ? tx('Move to {0}', {
        0: formatTime(slot.time)
      }) : tx('Choose a new time')}</Button></>} footerBordered>
      <div className="stack">
        {!appt.doctor?.autoConfirm && <div className="banner info"><AlertTriangle aria-hidden /><div>{tx(
          'The new time needs the doctor’s confirmation again. Your current slot is released when you confirm.'
        )}</div></div>}
        <SlotPicker doctorId={appt.doctorId} value={slot} onChange={setSlot} ignoreAppointmentId={appt.id} refreshKey={refreshKey} />
      </div>
    </Modal>
  );
}

export function AppointmentDetail({ a, open, onClose, who = 'doctor', actions }) {
  if (!a) return null;
  const other = who === 'doctor' ? a.doctor : a.patient;
  return (
    <Modal open={open} onClose={onClose} title={tx('Appointment details')} footer={actions}>
      <div className="stack">
        <div className="row between"><strong>{other?.name}</strong><StatusBadge status={a.status} /></div>
        <dl className="kv">
          <dt>{tx('Date')}</dt><dd>{formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd>
          <dt>{tx('Time')}</dt><dd>{formatTime(a.time)} ({a.duration}{' '}{tx('min)')}</dd>
          <dt>{tx('Visit')}</dt><dd>{a.type === 'video' ? tx('Video consultation') : tx('In person')}</dd>
          {who === 'doctor' && <><dt>{tx('Where')}</dt><dd><bdi>{a.doctor?.location}</bdi>{a.doctor?.address ? <div className="small muted"><bdi>{a.doctor.address}</bdi></div> : null}</dd><dt>{tx('Specialty')}</dt><dd>{a.doctor?.specialty}</dd></>}
          {who === 'patient' && <><dt>{tx('Phone')}</dt><dd>{a.patient?.phone}</dd><dt>{tx('Blood type')}</dt><dd>{a.patient?.bloodType || '—'}</dd><dt>{tx('Allergies')}</dt><dd>{a.patient?.allergies?.length ? a.patient.allergies.map((x) => <Badge key={x} tone="rose" className="" >{x}</Badge>) : tx('None reported')}</dd><dt>{tx('Insurance')}</dt><dd>{a.patient?.insurance || tx('Self-pay')}</dd></>}
          <dt>{tx('Reason')}</dt><dd>{tx(a.reason)}</dd>
          {a.statusNote && <><dt>{tx('Note')}</dt><dd>{noteText(a)}</dd></>}
          <dt>{tx('Reference')}</dt><dd className="tnum">{a.id.slice(-8).toUpperCase()}</dd>
        </dl>
        {a.history?.length > 0 && (
          <div>
            <div className="small strong" style={{ marginBottom: 8 }}>{tx('History')}</div>
            <ol className="stack" style={{ '--gap': '6px', listStyle: 'none', padding: 0, margin: 0 }}>
              {a.history.map((h, i) => <li key={i} className="small row" style={{ '--gap': '8px' }}><StatusBadge status={h.status} /><span className="muted">{new Date(h.at).toLocaleString(getLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>{h.note && <span>— {tx(h.note)}</span>}</li>)}
            </ol>
          </div>
        )}
      </div>
    </Modal>
  );
}
