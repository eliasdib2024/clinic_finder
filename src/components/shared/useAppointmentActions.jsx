import { tx } from '../../lib/i18n';
// Doctor-side appointment actions with confirmations and toasts, shared by the overview and the appointments page.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, CheckCheck, UserX, FilePlus2, Ban } from 'lucide-react';
import { Button, ConfirmDialog } from '../ui';
import { updateAppointmentStatus, cancelAppointment } from '../../services/appointmentService';
import { canTransition } from '../../lib/lifecycle';
import { useToast } from '../../context/ToastContext';
import { formatDay, formatTime } from '../../lib/dates';

export function useAppointmentActions(onChanged) {
  const toast = useToast();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);
  const [dialog, setDialog] = useState(null); // { kind, appt }

  const run = async (appt, status, note) => {
    setBusyId(appt.id);
    try {
      const a = status === 'cancelled' ? await cancelAppointment(appt.id, note) : await updateAppointmentStatus(appt.id, status, note);
      const msg = { confirmed: 'Appointment confirmed', declined: 'Request declined', completed: 'Marked as completed', 'no-show': 'Marked as no-show', cancelled: 'Appointment cancelled' }[status];
      toast.success(msg, { body: `${a.patient.name} · ${formatDay(a.date)}, ${formatTime(a.time)}` });
      onChanged?.(a);
      return a;
    } catch (e) {
      toast.error(tx('Action not completed'), { body: e.message });
      throw e;
    } finally { setBusyId(null); }
  };

  const buttons = (a, { compact } = {}) => {
    const size = 'sm';
    const busy = busyId === a.id;
    const out = [];
    if (a.status === 'pending') {
      out.push(<Button key="ok" size={size} icon={Check} loading={busy} onClick={() => run(a, 'confirmed').catch(() => {})}>{tx('Accept')}</Button>);
      out.push(<Button key="no" size={size} variant="danger-soft" icon={X} disabled={busy} onClick={() => setDialog({ kind: 'decline', appt: a })}>{tx('Decline')}</Button>);
    }
    if (a.status === 'confirmed') {
      const done = canTransition(a, 'completed');
      if (done) {
        out.push(<Button key="done" size={size} variant="soft" icon={CheckCheck} loading={busy} onClick={() => run(a, 'completed').catch(() => {})}>{compact ? tx('Done') : tx('Mark completed')}</Button>);
        out.push(<Button key="rx" size={size} variant="secondary" icon={FilePlus2} disabled={busy} onClick={() => navigate(`/doctor/prescriptions/new?patient=${a.patientId}&appointment=${a.id}`)}>{tx('Prescribe')}</Button>);
        out.push(<Button key="ns" size={size} variant="ghost" icon={UserX} disabled={busy} onClick={() => setDialog({ kind: 'noshow', appt: a })}>{tx('No-show')}</Button>);
      } else {
        out.push(<Button key="cx" size={size} variant="ghost" icon={Ban} disabled={busy} onClick={() => setDialog({ kind: 'cancel', appt: a })}>{tx('Cancel')}</Button>);
      }
    }
    return out;
  };

  const dialogs = (
    <>
      <ConfirmDialog open={dialog?.kind === 'decline'} onClose={() => setDialog(null)} title={tx('Decline this request?')} confirmLabel={tx('Decline request')}
        description={dialog?.appt ? tx('{0} asked for {1} at {2}. Your message is sent to the patient.', {
          0: dialog.appt.patient.name,
          1: formatDay(dialog.appt.date),
          2: formatTime(dialog.appt.time)
        }) : ''}
        withReason reasonLabel={tx('Message to the patient')} reasonPlaceholder={tx('e.g. I’m fully booked that day — please choose another slot next week.')}
        onConfirm={(reason) => run(dialog.appt, 'declined', reason)} />
      <ConfirmDialog open={dialog?.kind === 'noshow'} onClose={() => setDialog(null)} title={tx('Mark as no-show?')} confirmLabel={tx('Mark no-show')}
        description={dialog?.appt ? tx('{0} didn’t attend on {1} at {2}. This can’t be undone.', {
          0: dialog.appt.patient.name,
          1: formatDay(dialog.appt.date),
          2: formatTime(dialog.appt.time)
        }) : ''}
        onConfirm={() => run(dialog.appt, 'no-show')} />
      <ConfirmDialog open={dialog?.kind === 'cancel'} onClose={() => setDialog(null)} title={tx('Cancel this appointment?')} confirmLabel={tx('Cancel appointment')}
        description={dialog?.appt ? tx('The patient is notified and the slot is released.') : ''}
        withReason reasonLabel={tx('Message to the patient')} reasonPlaceholder={tx('e.g. I have to travel for a conference — sorry for the inconvenience.')}
        onConfirm={(reason) => run(dialog.appt, 'cancelled', reason)} />
    </>
  );

  return { buttons, dialogs, run };
}
