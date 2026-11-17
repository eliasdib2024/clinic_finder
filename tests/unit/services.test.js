import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { configureMock, resetDb, getDb } from '../../src/services/db';
import * as auth from '../../src/services/authService';
import * as doctors from '../../src/services/doctorService';
import * as appts from '../../src/services/appointmentService';
import * as rx from '../../src/services/prescriptionService';
import * as admin from '../../src/services/adminService';
import * as users from '../../src/services/userService';
import { setNow, todayISO, addDays } from '../../src/lib/dates';

configureMock({ latency: 0 });

const asPatient = () => auth.login({ email: 'patient@clinicfinder.lb', password: 'Patient@123', remember: true });
const asDoctor = () => auth.login({ email: 'doctor@clinicfinder.lb', password: 'Doctor@123', remember: true });
const asAdmin = () => auth.login({ email: 'admin@clinicfinder.lb', password: 'Admin@123', remember: true });

async function firstFreeSlot(doctorId, skip = 0) {
  for (let i = 1; i < 14; i++) {
    const date = addDays(todayISO(), i);
    const slots = await doctors.getSlots(doctorId, date);
    if (slots.length > skip) return { date, time: slots[skip].time };
  }
  throw new Error('no slot');
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetDb(); });
afterAll(() => setNow(null));

describe('auth', () => {
  it('logs in demo accounts and rejects bad passwords', async () => {
    const { user } = await asPatient();
    expect(user.role).toBe('patient');
    expect(user.passwordHash).toBeUndefined();
    expect((await auth.me()).id).toBe(user.id);
    await auth.logout();
    expect(await auth.me()).toBeNull();
    await expect(auth.login({ email: 'patient@clinicfinder.lb', password: 'nope' })).rejects.toThrow(/Incorrect/);
  });

  it('registers a patient with validation', async () => {
    await expect(auth.signup({ role: 'patient', name: 'Test', email: 'bad', phone: '123', password: 'weak' })).rejects.toMatchObject({ status: 422 });
    const { user } = await auth.signup({ role: 'patient', name: 'Rami Test', email: 'rami@test.lb', phone: '03 123 456', password: 'Strong#Pass1', acceptTerms: true });
    expect(user.phone).toBe('+9613123456');
    await expect(auth.signup({ role: 'patient', name: 'Rami Test', email: 'rami@test.lb', phone: '03 123 456', password: 'Strong#Pass1', acceptTerms: true })).rejects.toMatchObject({ fields: { email: expect.stringMatching(/already/) } });
  });

  it('registers a doctor as pending verification, hidden from search', async () => {
    const { user } = await auth.signup({ role: 'doctor', name: 'Test Doc', email: 'doc@test.lb', phone: '71 222 333', password: 'Strong#Pass1', acceptTerms: true, specialtyId: 'cardiology', licenseNumber: '55555', governorate: 'north', city: 'Tripoli' });
    expect(user.name).toBe('Dr. Test Doc');
    const me = await doctors.getMyDoctorProfile();
    expect(me.verification.status).toBe('pending');
    const res = await doctors.searchDoctors({ q: 'Test Doc' });
    expect(res.total).toBe(0);
  });

  it('runs the forgot-password flow with a 6-digit code', async () => {
    const { demoCode } = await auth.forgotPassword('patient@clinicfinder.lb');
    expect(demoCode).toMatch(/^\d{6}$/);
    await expect(auth.verifyResetCode('patient@clinicfinder.lb', '000000')).rejects.toThrow();
    await auth.verifyResetCode('patient@clinicfinder.lb', demoCode);
    await auth.resetPassword('patient@clinicfinder.lb', demoCode, 'NewPass#2026');
    await expect(asPatient()).rejects.toThrow();
    await auth.login({ email: 'patient@clinicfinder.lb', password: 'NewPass#2026' });
  });
});

describe('search', () => {
  it('filters by specialty, governorate, fee, language and insurance', async () => {
    await asPatient();
    const all = await doctors.searchDoctors({ pageSize: 100 });
    expect(all.total).toBeGreaterThan(20);
    const cardio = await doctors.searchDoctors({ specialty: 'cardiology', pageSize: 100 });
    expect(cardio.items.every((d) => d.specialtyId === 'cardiology')).toBe(true);
    const beirut = await doctors.searchDoctors({ governorate: 'beirut', maxFee: 60, pageSize: 100 });
    expect(beirut.items.every((d) => d.governorate === 'beirut' && d.fee <= 60)).toBe(true);
    const armenian = await doctors.searchDoctors({ languages: ['hy'], pageSize: 100 });
    expect(armenian.items.every((d) => d.languages.includes('hy'))).toBe(true);
    const mine = await doctors.searchDoctors({ myInsurance: true, pageSize: 100 });
    expect(mine.items.every((d) => d.insurances.includes('axa-me'))).toBe(true);
    const cheap = await doctors.searchDoctors({ sort: 'fee-asc', pageSize: 100 });
    expect(cheap.items[0].fee).toBeLessThanOrEqual(cheap.items.at(-1).fee);
  });
});

describe('booking lifecycle', () => {
  it('books a pending appointment, prevents double booking and doctor confirms', async () => {
    await asPatient();
    const slot = await firstFreeSlot('d_2');
    const a = await appts.createAppointment({ doctorId: 'd_2', ...slot, type: 'in-person', reason: 'Check-up' });
    expect(a.status).toBe('pending');
    // slot is gone for everyone
    expect((await doctors.getSlots('d_2', slot.date)).map((s) => s.time)).not.toContain(slot.time);
    // same patient, same time, other doctor → blocked
    const other = getDb().doctors.find((d) => d.id === 'd_5');
    other.schedule = getDb().doctors.find((d) => d.id === 'd_2').schedule;
    other.slotLength = getDb().doctors.find((d) => d.id === 'd_2').slotLength;
    await expect(appts.createAppointment({ doctorId: 'd_5', ...slot, reason: 'Second' })).rejects.toThrow(/already have a booking/);
    // another patient cannot take the same doctor slot
    await auth.logout();
    await auth.login({ email: 'georges.abisaab@example.lb', password: 'Patient@123' });
    await expect(appts.createAppointment({ doctorId: 'd_2', ...slot, reason: 'Steal' })).rejects.toMatchObject({ status: 409 });
  });

  it('auto-confirm doctors create confirmed bookings', async () => {
    await asPatient();
    const auto = getDb().doctors.find((d) => d.autoConfirm && d.verification.status === 'approved');
    let a;
    for (let k = 0; !a && k < 6; k++) {
      const slot = await firstFreeSlot(auto.id, k);
      a = await appts.createAppointment({ doctorId: auto.id, ...slot, reason: 'Auto' }).catch(() => null);
    }
    expect(a.status).toBe('confirmed');
  });

  it('reschedules back to pending and cancels', async () => {
    await asPatient();
    const list = await appts.listMyAppointments({ scope: 'upcoming' });
    const confirmed = list.find((x) => x.status === 'confirmed' && x.doctorId === 'd_1');
    const slot = await firstFreeSlot('d_1', 3);
    const moved = await appts.rescheduleAppointment(confirmed.id, slot);
    expect(moved.status).toBe('pending');
    expect(moved.rescheduledFrom.date).toBe(confirmed.date);
    const cancelled = await appts.cancelAppointment(confirmed.id, 'Travelling');
    expect(cancelled.status).toBe('cancelled');
    await expect(appts.cancelAppointment(confirmed.id)).rejects.toThrow(/no longer change/);
    await expect(appts.rescheduleAppointment(confirmed.id, slot)).rejects.toMatchObject({ status: 409 });
  });

  it('doctor confirms, declines with a reason, and cannot complete future visits', async () => {
    await asDoctor();
    const pending = (await appts.listMyAppointments({ status: 'pending' })).filter((a) => a.date > todayISO());
    expect(pending.length).toBeGreaterThan(1);
    const ok = await appts.updateAppointmentStatus(pending[0].id, 'confirmed');
    expect(ok.status).toBe('confirmed');
    await expect(appts.updateAppointmentStatus(ok.id, 'completed')).rejects.toThrow(/before its date/);
    await expect(appts.updateAppointmentStatus(pending[1].id, 'declined', '')).rejects.toMatchObject({ status: 422 });
    const d = await appts.updateAppointmentStatus(pending[1].id, 'declined', 'Fully booked that week');
    expect(d.status).toBe('declined');
    await expect(appts.updateAppointmentStatus(d.id, 'confirmed')).rejects.toThrow(/no longer change/);
  });
});

describe('prescriptions', () => {
  it('doctor issues a prescription and links/completes a confirmed visit from today', async () => {
    await asDoctor();
    const today = (await appts.listMyAppointments({ date: todayISO() })).find((a) => a.status === 'confirmed');
    const p = await rx.createPrescription({ patientId: today.patientId, appointmentId: today.id, diagnosis: 'Essential hypertension', medications: [{ name: 'Bisoprolol 5 mg', dose: '1 tablet', frequency: 'Once daily', duration: '1 month' }] });
    expect(p.code).toMatch(/^RX-[A-Z0-9]{4}-\d{2}$/);
    expect(p.appointmentCompleted).toBe(true);
    await expect(rx.createPrescription({ patientId: today.patientId, appointmentId: today.id, diagnosis: 'Hypertension', medications: [{ name: 'X', dose: '1', frequency: 'a', duration: 'b' }] })).rejects.toMatchObject({ status: 409 });
    await expect(rx.createPrescription({ patientId: today.patientId, medications: [{ name: 'X' }] })).rejects.toMatchObject({ status: 422 });
    const v = await rx.verifyPrescription(p.code);
    expect(v.valid).toBe(true);
    // The public verification result never reveals the diagnosis.
    expect(JSON.stringify(v)).not.toMatch(/hypertension/i);
  });

  it('requires a diagnosis and validates the optional follow-up', async () => {
    await asDoctor();
    const pid = (await appts.listMyAppointments({})).find((a) => a.status === 'completed').patientId;
    const med = [{ name: 'Paracetamol 500 mg', dose: '1 tablet', frequency: 'As needed', duration: '5 days' }];
    await expect(rx.createPrescription({ patientId: pid, medications: med })).rejects.toMatchObject({ status: 422, fields: { diagnosis: expect.any(String) } });
    await expect(rx.createPrescription({ patientId: pid, diagnosis: 'Fever', medications: med, followUp: { date: todayISO() } })).rejects.toMatchObject({ fields: { followUpDate: expect.any(String) } });
    await expect(rx.createPrescription({ patientId: pid, diagnosis: 'Fever', medications: med, followUp: { date: addDays(todayISO(), 400) } })).rejects.toMatchObject({ fields: { followUpDate: expect.any(String) } });
    await expect(rx.createPrescription({ patientId: pid, diagnosis: 'Fever', medications: med, followUp: { note: 'Come back' } })).rejects.toMatchObject({ fields: { followUpDate: expect.any(String) } });
    const date = addDays(todayISO(), 14);
    const p = await rx.createPrescription({ patientId: pid, diagnosis: '  Viral fever ', medications: med, followUp: { date, note: ' Bring lab results ' } });
    expect(p.diagnosis).toBe('Viral fever');
    expect(p.followUp).toEqual({ date, note: 'Bring lab results' });
    const none = await rx.createPrescription({ patientId: pid, diagnosis: 'Viral fever', medications: med });
    expect(none.followUp).toBeNull();
    // Stored and returned when the prescription is opened again.
    expect((await rx.getPrescription(p.id)).followUp.date).toBe(date);
  });
});

describe('patient onboarding', () => {
  it('a new patient must complete the health profile before using the app', async () => {
    const { user } = await auth.signup({ role: 'patient', name: 'Maya Test', email: 'maya@test.lb', phone: '03 222 333', password: 'Strong#Pass1', acceptTerms: true });
    expect(user.patient.onboarding).toBe('pending');
    // Required: date of birth, governorate, a city in that governorate, and an explicit allergy answer.
    await expect(users.completeOnboarding({})).rejects.toMatchObject({ status: 422, fields: { dob: expect.any(String), governorate: expect.any(String), city: expect.any(String), allergies: expect.any(String) } });
    await expect(users.completeOnboarding({ dob: '1990-05-01', governorate: 'beirut', city: 'Tripoli', noKnownAllergies: true })).rejects.toMatchObject({ fields: { city: expect.any(String) } });
    await expect(users.completeOnboarding({ dob: '1990-05-01', governorate: 'beirut', city: 'Hamra', noKnownAllergies: true, insuranceId: 'globemed' })).rejects.toMatchObject({ fields: { insuranceNumber: expect.any(String) } });
    const done = await users.completeOnboarding({ dob: '1990-05-01', governorate: 'beirut', city: 'Hamra', bloodType: 'O+', allergies: ['Penicillin'], noKnownAllergies: true });
    expect(done.patient).toMatchObject({ onboarding: 'done', governorate: 'beirut', city: 'Hamra', bloodType: 'O+', allergies: ['Penicillin'], noKnownAllergies: false });
  });

  it('seeded patients are already onboarded', async () => {
    const { user } = await asPatient();
    expect(user.patient.onboarding).toBe('done');
    expect(user.patient.city).toBeTruthy();
  });
});

describe('doctor practice profile', () => {
  it('cannot change the name or set a picture; the name changes from Settings only', async () => {
    const { user } = await asDoctor();
    const d = await doctors.updateMyDoctorProfile({ name: 'Somebody Else', photo: 'data:image/png;base64,AAAA', bio: 'Updated biography for the test.' });
    expect(d.name).toBe(user.name);
    expect(d.photo).toBeUndefined();
    expect(d.bio).toBe('Updated biography for the test.');
    const u = await users.updateProfile({ name: 'Rami Haddad Jr' });
    expect(u.name).toMatch(/Rami Haddad Jr/);
  });
});

describe('availability', () => {
  it('changing the schedule changes bookable slots', async () => {
    await asDoctor();
    const me = await doctors.getMyDoctorProfile();
    const schedule = Object.fromEntries(Object.entries(me.schedule).map(([k, v]) => [k, { ...v, enabled: false }]));
    await doctors.updateMySchedule({ schedule, slotLength: 30, autoConfirm: true, blockedDates: [] });
    expect(await doctors.getAvailability('d_1')).toSatisfy((m) => Object.values(m).every((n) => n === 0));
    await expect(doctors.updateMySchedule({ schedule: { ...schedule, mon: { enabled: true, start: '12:00', end: '10:00', breaks: [] } }, slotLength: 30 })).rejects.toMatchObject({ status: 422 });
  });
});

describe('admin', () => {
  it('approves and rejects doctor applications', async () => {
    await asAdmin();
    const pending = await admin.listDoctorsByVerification('pending');
    expect(pending.length).toBe(3);
    await admin.setVerification(pending[0].id, 'approved');
    await expect(admin.setVerification(pending[1].id, 'rejected', 'no')).rejects.toMatchObject({ status: 422 });
    await admin.setVerification(pending[1].id, 'rejected', 'License number does not match the registry.');
    expect((await admin.listDoctorsByVerification('pending')).length).toBe(1);
  });

  it('suspending a user cancels future bookings and blocks login', async () => {
    await asAdmin();
    const { cancelled } = await admin.setUserStatus('u_patient', 'suspended', 'Test');
    expect(cancelled).toBeGreaterThan(0);
    await auth.logout();
    await expect(asPatient()).rejects.toThrow(/suspended/);
    await asAdmin();
    await admin.setUserStatus('u_patient', 'active');
    await asPatient();
  });

  it('enforces role permissions', async () => {
    await asPatient();
    await expect(admin.getStats()).rejects.toMatchObject({ status: 403 });
    await expect(appts.updateAppointmentStatus('a_1', 'confirmed')).rejects.toMatchObject({ status: 403 });
  });

  it('catalog and clinic changes validate and propagate', async () => {
    await asAdmin();
    const item = await admin.addCatalogItem('specialties', { name: 'Rheumatology' });
    await expect(admin.addCatalogItem('specialties', { name: 'rheumatology' })).rejects.toMatchObject({ status: 409 });
    await expect(admin.deleteCatalogItem('specialties', 'cardiology')).rejects.toMatchObject({ status: 409 });
    await admin.deleteCatalogItem('specialties', item.id);
    await expect(admin.createClinic({ name: 'X', type: 'nope' })).rejects.toMatchObject({ status: 422 });
    const c = await admin.createClinic({ name: 'Test Clinic', type: 'private', governorate: 'south', city: 'Tyre', address: 'Main street 1', phone: '07 123 456' });
    await admin.deleteClinic(c.id);
    await expect(admin.deleteClinic('c_1')).rejects.toMatchObject({ status: 409 });
  });

  it('user can update health details', async () => {
    await asPatient();
    const u = await users.updateHealth({ bloodType: 'A+', allergies: ['Penicillin', ' ', 'Latex'] });
    expect(u.patient.allergies).toEqual(['Penicillin', 'Latex']);
  });
});
