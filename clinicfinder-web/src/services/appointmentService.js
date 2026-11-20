import { tx, whenToken } from '../lib/i18n';
// Appointments — booking, rescheduling and the status lifecycle (documentation §5.3).
// Every rule here must also be enforced by the real backend (§6.2).
import { ApiError, request, requireUser, newId, notify, logActivity } from './db';
import { appointmentView } from './serializers';
import { isSlotAvailable, ACTIVE_STATUSES, BOOKING_WINDOW_DAYS } from '../lib/schedule';
import { transitionError, STATUS_LABEL } from '../lib/lifecycle';
import { todayISO, diffDays, timeToMinutes, dateTime, now, formatDay, formatTime } from '../lib/dates';

// Date token: rendered in the reader's language when the message is displayed.
const when = (a) => whenToken(a.date, a.time);

const patientClash = (db, patientId, date, time, duration, ignoreId) => {
  const s = timeToMinutes(time);
  return db.appointments.find((a) => a.patientId === patientId && a.id !== ignoreId && a.date === date && ACTIVE_STATUSES.includes(a.status)
    && s < timeToMinutes(a.time) + (a.duration || 30) && timeToMinutes(a.time) < s + duration);
};

/** List the caller's appointments. scope: 'upcoming' | 'past' | 'cancelled' | 'all' */
export function listMyAppointments({ scope = 'all', status, date } = {}) {
  return request((db) => {
    const user = requireUser(db, ['patient', 'doctor']);
    let list;
    if (user.role === 'patient') list = db.appointments.filter((a) => a.patientId === user.id);
    else {
      const d = db.doctors.find((x) => x.userId === user.id);
      list = db.appointments.filter((a) => a.doctorId === d?.id);
    }
    const current = now();
    const isUpcoming = (a) => ACTIVE_STATUSES.includes(a.status) && dateTime(a.date, a.time).getTime() + (a.duration || 30) * 60000 > current.getTime() - 12 * 3600000;
    if (scope === 'upcoming') list = list.filter(isUpcoming);
    if (scope === 'past') list = list.filter((a) => !isUpcoming(a) && !['cancelled', 'declined'].includes(a.status));
    if (scope === 'cancelled') list = list.filter((a) => ['cancelled', 'declined'].includes(a.status));
    if (status) list = list.filter((a) => a.status === status);
    if (date) list = list.filter((a) => a.date === date);
    const asc = scope === 'upcoming' || !!date;
    return list.map((a) => appointmentView(db, a)).sort((a, b) => (asc ? 1 : -1) * (a.date + a.time).localeCompare(b.date + b.time));
  });
}

export function getAppointment(id) {
  return request((db) => {
    const user = requireUser(db);
    const a = db.appointments.find((x) => x.id === id);
    if (!a) throw new ApiError(tx('Appointment not found.'), 404);
    const doctor = db.doctors.find((d) => d.id === a.doctorId);
    if (user.role !== 'admin' && a.patientId !== user.id && doctor?.userId !== user.id) throw new ApiError(tx('You cannot view this appointment.'), 403);
    return appointmentView(db, a);
  });
}

/** Book: { doctorId, date, time, type: 'in-person'|'video', reason } */
export function createAppointment({ doctorId, date, time, type = 'in-person', reason = '' }) {
  return request((db) => {
    const user = requireUser(db, ['patient']);
    const d = db.doctors.find((x) => x.id === doctorId);
    if (!d || d.verification.status !== 'approved') throw new ApiError(tx('This doctor is not accepting bookings.'), 404);
    const docUser = db.users.find((u) => u.id === d.userId);
    if (docUser?.status !== 'active') throw new ApiError(tx('This doctor is not accepting bookings.'), 409);
    if (!date || !time) throw new ApiError(tx('Choose a date and time.'), 422);
    if (diffDays(date, todayISO()) >= BOOKING_WINDOW_DAYS) throw new ApiError(tx('Bookings open 14 days in advance.'), 422);
    if (type === 'video' && !d.videoConsult) throw new ApiError(tx('This doctor does not offer video consultations.'), 422);
    if (String(reason).trim().length < 3) throw new ApiError(tx('Tell the doctor briefly why you are booking.'), 422, { reason: tx('Please describe the reason for your visit.') });
    if (String(reason).length > 500) throw new ApiError(tx('Keep the reason under 500 characters.'), 422, { reason: tx('Keep it under 500 characters.') });

    const docAppts = db.appointments.filter((a) => a.doctorId === d.id);
    if (!isSlotAvailable(d, date, time, docAppts)) throw new ApiError(tx(
      'Sorry — that time was just taken or is no longer available. Please pick another slot.'
    ), 409);
    const clash = patientClash(db, user.id, date, time, d.slotLength);
    if (clash) throw new ApiError(tx('You already have a booking on {0}. Cancel or reschedule it first.', {
      0: when(clash)
    }), 409);

    const status = d.autoConfirm ? 'confirmed' : 'pending';
    const at = new Date().toISOString();
    const appt = {
      id: newId('a'), doctorId: d.id, patientId: user.id, date, time, duration: d.slotLength, type, reason: String(reason).trim(),
      status, statusNote: d.autoConfirm ? 'Automatically confirmed' : '', createdAt: at, updatedAt: at,
      history: [{ status: 'pending', at, by: user.id }].concat(d.autoConfirm ? [{ status: 'confirmed', at, by: 'system', note: 'Auto-confirm' }] : []),
    };
    db.appointments.push(appt);
    if (docUser.settings?.notifications?.newBooking !== false) {
      notify(db, docUser.id, {
        title: d.autoConfirm ? 'New confirmed booking' : 'New booking request',
        body: type === 'video' ? '{0} booked {1} (video).' : '{0} booked {1}.',
        link: d.autoConfirm ? '/doctor/appointments' : '/doctor/appointments?tab=pending',
        kind: 'info',

        vars: { 0: user.name, 1: when(appt) }
      });
    }
    notify(db, user.id, {
      title: d.autoConfirm ? 'Appointment confirmed' : 'Request sent',
      body: '{0} — {1}.',
      link: '/patient/appointments',
      kind: d.autoConfirm ? 'success' : 'info',

      vars: {
        0: docUser.name,
        1: when(appt)
      }
    });
    logActivity(db, '{0} booked {1}', 'booking', {
      0: user.name,
      1: docUser.name
    });
    return appointmentView(db, appt);
  });
}

/** Patient moves an active booking to a new slot. Returns to Pending unless auto-confirm. */
export function rescheduleAppointment(id, { date, time }) {
  return request((db) => {
    const user = requireUser(db, ['patient']);
    const a = db.appointments.find((x) => x.id === id && x.patientId === user.id);
    if (!a) throw new ApiError(tx('Appointment not found.'), 404);
    if (!ACTIVE_STATUSES.includes(a.status)) throw new ApiError(tx('A {0} appointment cannot be rescheduled.', {
      0: tx(STATUS_LABEL[a.status]).toLowerCase()
    }), 409);
    const d = db.doctors.find((x) => x.id === a.doctorId);
    if (a.date === date && a.time === time) throw new ApiError(tx('Pick a different time to reschedule.'), 422);
    if (diffDays(date, todayISO()) >= BOOKING_WINDOW_DAYS) throw new ApiError(tx('Bookings open 14 days in advance.'), 422);
    const docAppts = db.appointments.filter((x) => x.doctorId === d.id);
    if (!isSlotAvailable(d, date, time, docAppts, { ignoreAppointmentId: a.id })) throw new ApiError(tx('That time is no longer available. Please choose another.'), 409);
    const clash = patientClash(db, user.id, date, time, d.slotLength, a.id);
    if (clash) throw new ApiError(tx('You already have a booking on {0}.', {
      0: when(clash)
    }), 409);

    const at = new Date().toISOString();
    const from = { date: a.date, time: a.time };
    a.rescheduledFrom = from;
    a.date = date; a.time = time; a.duration = d.slotLength;
    a.status = d.autoConfirm ? 'confirmed' : 'pending';
    a.statusNote = `Rescheduled from ${when(from)}`;
    a.updatedAt = at;
    a.history.push({ status: a.status, at, by: user.id, note: a.statusNote });
    const docUser = db.users.find((u) => u.id === d.userId);
    notify(db, docUser.id, {
      title: 'Appointment rescheduled',
      body: '{0} moved their visit to {1}.',
      link: '/doctor/appointments',
      kind: 'warning',

      vars: {
        0: user.name,
        1: when(a)
      }
    });
    return appointmentView(db, a);
  });
}

/** Patient or doctor cancels an active appointment. */
export function cancelAppointment(id, reason = '') {
  return request((db) => {
    const user = requireUser(db, ['patient', 'doctor']);
    const a = db.appointments.find((x) => x.id === id);
    const d = a && db.doctors.find((x) => x.id === a.doctorId);
    if (!a || (a.patientId !== user.id && d.userId !== user.id)) throw new ApiError(tx('Appointment not found.'), 404);
    const err = transitionError(a, 'cancelled');
    if (err) throw new ApiError(err, 409);
    const byPatient = a.patientId === user.id;
    const at = new Date().toISOString();
    const late = dateTime(a.date, a.time) - now() < 24 * 3600000;
    a.status = 'cancelled';
    a.statusNote = reason ? reason : byPatient ? 'Cancelled by patient' : 'Cancelled by doctor';
    a.lateCancellation = byPatient && late;
    a.updatedAt = at;
    a.history.push({ status: 'cancelled', at, by: user.id, note: a.statusNote });
    const otherId = byPatient ? d.userId : a.patientId;
    notify(db, otherId, {
      title: 'Appointment cancelled',
      body: '{0} cancelled the visit on {1}.{2}',
      link: byPatient ? '/doctor/appointments' : '/patient/appointments?tab=cancelled',
      kind: 'warning',

      vars: {
        0: user.name,
        1: when(a),
        2: reason ? ` “${reason}”` : ''
      }
    });
    return appointmentView(db, a);
  });
}

/** Doctor changes status: confirmed | declined | completed | no-show (cancel via cancelAppointment). */
export function updateAppointmentStatus(id, status, note = '') {
  return request((db) => {
    const user = requireUser(db, ['doctor']);
    const d = db.doctors.find((x) => x.userId === user.id);
    const a = db.appointments.find((x) => x.id === id && x.doctorId === d?.id);
    if (!a) throw new ApiError(tx('Appointment not found.'), 404);
    if (!['confirmed', 'declined', 'completed', 'no-show'].includes(status)) throw new ApiError(tx('Unsupported status.'), 422);
    const err = transitionError(a, status);
    if (err) throw new ApiError(err, 409);
    if (status === 'declined' && String(note).trim().length < 3) throw new ApiError(tx('Add a short message for the patient.'), 422, { note: tx('Add a short message for the patient.') });
    const at = new Date().toISOString();
    a.status = status;
    a.statusNote = note || '';
    a.updatedAt = at;
    a.history.push({ status, at, by: user.id, note });
    const messages = {
      confirmed: ['Appointment confirmed', '{0} confirmed your visit on {1}.', 'success'],
      declined: ['Booking declined', '{0} declined your request for {1}: “{2}”', 'warning'],
      completed: ['Visit completed', 'Your visit with {0} is marked as completed.', 'info'],
      'no-show': ['Missed appointment', 'You were marked as a no-show for {1}.', 'warning'],
    };
    const [title, body, kind] = messages[status];
    notify(db, a.patientId, { title, body, vars: { 0: user.name, 1: when(a), 2: note }, link: status === 'declined' ? '/patient/appointments?tab=cancelled' : '/patient/appointments', kind });
    return appointmentView(db, a);
  });
}
