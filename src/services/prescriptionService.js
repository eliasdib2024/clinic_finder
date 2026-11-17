import { tx, dateToken } from '../lib/i18n';
// Digital prescriptions with RX-XXXX-NN verification codes.
import { ApiError, request, requireUser, newId, notify } from './db';
import { prescriptionView } from './serializers';
import { rxCode, RX_RE } from '../lib/format';
import { todayISO, diffDays } from '../lib/dates';

export function listMyPrescriptions({ q = '' } = {}) {
  return request((db) => {
    const user = requireUser(db, ['patient', 'doctor']);
    let list;
    if (user.role === 'patient') list = db.prescriptions.filter((p) => p.patientId === user.id);
    else {
      const d = db.doctors.find((x) => x.userId === user.id);
      list = db.prescriptions.filter((p) => p.doctorId === d?.id);
    }
    let out = list.map((p) => prescriptionView(db, p));
    const s = q.trim().toLowerCase();
    if (s) out = out.filter((p) => [p.code, p.doctor?.name, p.patient?.name, p.diagnosis, ...p.medications.map((m) => m.name)].some((x) => x?.toLowerCase().includes(s)));
    return out.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  });
}

export function getPrescription(id) {
  return request((db) => {
    const user = requireUser(db);
    const p = db.prescriptions.find((x) => x.id === id);
    if (!p) throw new ApiError(tx('Prescription not found.'), 404);
    const d = db.doctors.find((x) => x.id === p.doctorId);
    if (user.role !== 'admin' && p.patientId !== user.id && d?.userId !== user.id) throw new ApiError(tx('You cannot view this prescription.'), 403);
    return prescriptionView(db, p);
  });
}

/** Public verification by code — returns minimal, non-sensitive details. */
export function verifyPrescription(code) {
  return request((db) => {
    const c = String(code || '').trim().toUpperCase();
    if (!RX_RE.test(c)) throw new ApiError(tx('Codes look like RX-AB12-34.'), 422);
    const p = db.prescriptions.find((x) => x.code === c);
    if (!p) throw new ApiError(tx('No prescription matches this code.'), 404);
    const v = prescriptionView(db, p);
    const parts = (v.patient?.name || '').split(' ');
    return {
      code: v.code, date: v.date, valid: true,
      doctor: { name: v.doctor.name, specialty: v.doctor.specialty, licenseNumber: v.doctor.licenseNumber },
      patientInitials: parts.map((x) => `${x[0]}.`).join(' '),
      medicationCount: v.medications.length,
    };
  });
}

/**
 * Doctor issues a prescription:
 * { patientId, appointmentId?, diagnosis, medications[], notes, followUp?: { date, note } }
 * The diagnosis is required; a follow-up is optional and must be a future date within a year.
 */
export function createPrescription({ patientId, appointmentId = null, diagnosis = '', medications = [], notes = '', followUp = null }) {
  return request((db) => {
    const user = requireUser(db, ['doctor']);
    const d = db.doctors.find((x) => x.userId === user.id);
    if (d.verification.status !== 'approved') throw new ApiError(tx('Your profile must be verified before you can issue prescriptions.'), 403);
    const patient = db.users.find((u) => u.id === patientId && u.role === 'patient');
    if (!patient) throw new ApiError(tx('Select a patient.'), 422, { patientId: tx('Select a patient.') });
    if (!db.appointments.some((a) => a.doctorId === d.id && a.patientId === patientId)) throw new ApiError(tx('You can only prescribe for your own patients.'), 403);

    const meds = medications.map((m) => ({ name: String(m.name || '').trim(), dose: String(m.dose || '').trim(), frequency: String(m.frequency || '').trim(), duration: String(m.duration || '').trim(), notes: String(m.notes || '').trim() }))
      .filter((m) => m.name || m.dose || m.frequency || m.duration);
    if (!meds.length) throw new ApiError(tx('Add at least one medication.'), 422, { medications: tx('Add at least one medication.') });
    const rowErrors = {};
    meds.forEach((m, i) => {
      if (!m.name) rowErrors[`medications.${i}.name`] = tx('Medication is required.');
      if (!m.dose) rowErrors[`medications.${i}.dose`] = tx('Dose is required.');
      if (!m.frequency) rowErrors[`medications.${i}.frequency`] = tx('Frequency is required.');
      if (!m.duration) rowErrors[`medications.${i}.duration`] = tx('Duration is required.');
    });
    if (Object.keys(rowErrors).length) throw new ApiError(tx('Complete every medication row.'), 422, rowErrors);

    const dx = String(diagnosis || '').trim();
    if (dx.length < 3) throw new ApiError(tx('Enter the diagnosis.'), 422, { diagnosis: tx('Enter the diagnosis.') });
    if (dx.length > 200) throw new ApiError(tx('Keep the diagnosis under 200 characters.'), 422, { diagnosis: tx('Keep the diagnosis under 200 characters.') });
    let fu = null;
    if (followUp && (followUp.date || followUp.note)) {
      if (!followUp.date) throw new ApiError(tx('Choose a follow-up date.'), 422, { followUpDate: tx('Choose a follow-up date.') });
      if (followUp.date <= todayISO()) throw new ApiError(tx('The follow-up must be after today.'), 422, { followUpDate: tx('The follow-up must be after today.') });
      if (diffDays(followUp.date, todayISO()) > 365) throw new ApiError(tx('Choose a follow-up within the next year.'), 422, { followUpDate: tx('Choose a follow-up within the next year.') });
      fu = { date: followUp.date, note: String(followUp.note || '').trim().slice(0, 300) };
    }

    let appt = null;
    if (appointmentId) {
      appt = db.appointments.find((a) => a.id === appointmentId && a.doctorId === d.id && a.patientId === patientId);
      if (!appt) throw new ApiError(tx('The linked appointment does not belong to this patient.'), 422);
      if (db.prescriptions.some((p) => p.appointmentId === appointmentId)) throw new ApiError(tx('A prescription already exists for this appointment.'), 409);
    }

    let code;
    do { code = rxCode(); } while (db.prescriptions.some((p) => p.code === code));
    const at = new Date().toISOString();
    const rx = { id: newId('rx'), code, doctorId: d.id, patientId, appointmentId, date: todayISO(), diagnosis: dx, followUp: fu, medications: meds, notes: String(notes).trim(), createdAt: at };
    db.prescriptions.push(rx);

    // Linking to a confirmed visit that has taken place marks it completed (§3.3).
    let completed = false;
    if (appt && appt.status === 'confirmed' && diffDays(appt.date, todayISO()) <= 0) {
      appt.status = 'completed'; appt.updatedAt = at; appt.statusNote = 'Completed — prescription issued';
      appt.history.push({ status: 'completed', at, by: user.id, note: 'Prescription issued' });
      completed = true;
    }
    notify(db, patientId, {
      title: 'New prescription',
      body: fu ? '{0} issued prescription {1} and asked to see you again on {2}.' : '{0} issued prescription {1}.',
      link: `/patient/prescriptions/${rx.id}`,
      kind: 'info',

      vars: {
        0: user.name,
        1: code,
        ...(fu ? { 2: dateToken(fu.date) } : {}),
      }
    });
    return { ...prescriptionView(db, rx), appointmentCompleted: completed };
  });
}
