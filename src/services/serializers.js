// Shape store records into API-style responses (what a REST backend would return).
import { governorateName } from '../lib/constants';
import { nextAvailable } from '../lib/schedule';
import { tx } from '../lib/i18n';

export const publicUser = (u) => {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
};

export const nameOf = (list, id) => list.find((x) => x.id === id)?.name ?? id;

export function doctorView(db, d, { withNext = true, apptsByDoctor } = {}) {
  const user = db.users.find((u) => u.id === d.userId) || {};
  const clinic = d.clinicId ? db.clinics.find((c) => c.id === d.clinicId) : null;
  const spec = db.catalog.specialties.find((s) => s.id === d.specialtyId);
  const appts = apptsByDoctor ? apptsByDoctor[d.id] || [] : db.appointments.filter((a) => a.doctorId === d.id);
  // Doctor pictures were removed: drop any stored by an older version.
  const { photo: _legacyPhoto, ...doc } = d; // eslint-disable-line no-unused-vars
  return {
    ...doc,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    userStatus: user.status,
    specialty: tx(spec?.name ?? 'General Practice'),
    specialtyIcon: spec?.icon ?? 'Stethoscope',
    governorateName: tx(governorateName(d.governorate)),
    clinic: clinic || null,
    location: clinic
      ? { name: clinic.name, address: clinic.address, city: tx(clinic.city), phone: clinic.phone, type: clinic.type }
      : { name: d.practice?.name || tx('Private practice'), address: d.practice?.address || '', city: tx(d.city), phone: d.practice?.phone || user.phone, type: 'private' },
    languageNames: d.languages.map((id) => tx(nameOf(db.catalog.languages, id))),
    insuranceNames: d.insurances.map((id) => tx(nameOf(db.catalog.insurers, id))),
    nextAvailable: withNext ? nextAvailable(d, appts) : undefined,
  };
}

export function appointmentView(db, a) {
  const doctor = db.doctors.find((d) => d.id === a.doctorId);
  const docUser = doctor && db.users.find((u) => u.id === doctor.userId);
  const patient = db.users.find((u) => u.id === a.patientId);
  const clinic = doctor?.clinicId ? db.clinics.find((c) => c.id === doctor.clinicId) : null;
  const rx = db.prescriptions.find((p) => p.appointmentId === a.id);
  return {
    ...a,
    doctor: doctor && {
      id: doctor.id, name: docUser?.name, fee: doctor.fee, autoConfirm: doctor.autoConfirm,
      specialty: tx(nameOf(db.catalog.specialties, doctor.specialtyId)), specialtyId: doctor.specialtyId,
      location: clinic ? `${clinic.name}, ${tx(clinic.city)}` : `${doctor.practice?.name || tx('Private practice')}, ${tx(doctor.city)}`,
      address: clinic ? clinic.address : doctor.practice?.address,
    },
    patient: patient && {
      id: patient.id, name: patient.name, phone: patient.phone, email: patient.email,
      bloodType: patient.patient?.bloodType, allergies: patient.patient?.allergies || [],
      insurance: patient.patient?.insuranceId ? tx(nameOf(db.catalog.insurers, patient.patient.insuranceId)) : null,
      dob: patient.patient?.dob,
    },
    prescriptionId: rx?.id || null,
  };
}

export function prescriptionView(db, p) {
  const doctor = db.doctors.find((d) => d.id === p.doctorId);
  const docUser = doctor && db.users.find((u) => u.id === doctor.userId);
  const patient = db.users.find((u) => u.id === p.patientId);
  const clinic = doctor?.clinicId ? db.clinics.find((c) => c.id === doctor.clinicId) : null;
  return {
    ...p,
    doctor: doctor && {
      id: doctor.id, name: docUser?.name, specialty: tx(nameOf(db.catalog.specialties, doctor.specialtyId)),
      licenseNumber: doctor.licenseNumber, phone: clinic?.phone || doctor.practice?.phone || docUser?.phone,
      clinic: clinic ? clinic.name : doctor.practice?.name, address: clinic ? `${clinic.address}, ${tx(clinic.city)}` : `${doctor.practice?.address || ''}, ${tx(doctor.city)}`,
    },
    patient: patient && {
      id: patient.id, name: patient.name, dob: patient.patient?.dob, gender: patient.gender,
      allergies: patient.patient?.allergies || [], bloodType: patient.patient?.bloodType,
      insurance: patient.patient?.insuranceId ? tx(nameOf(db.catalog.insurers, patient.patient.insuranceId)) : null,
    },
  };
}
