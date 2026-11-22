// serializers.js – turn database rows into the JSON the API returns.
// Never returns passwordHash, reset codes or verification tokens.
const day = (d) => (d ? d.toISOString().slice(0, 10) : null);
const ref = (row) => (row ? { id: row.id, name: row.name } : null);
const governorateOf = (city) => (city?.governorate ? { id: city.governorate.id, name: city.governorate.name } : null);

export function toPatientDto(p) {
  if (!p) return null;
  return {
    id: p.id,
    dob: day(p.dob),
    governorate: governorateOf(p.city),
    city: ref(p.city),
    bloodType: ref(p.bloodType),
    insurance: ref(p.insurance),
    insuranceNumber: p.insuranceNumber,
    emergencyContact: p.emergencyContact,
    allergies: (p.allergies ?? []).map((a) => a.name),
    noKnownAllergies: p.noKnownAllergies,
    onboarding: p.onboarding,
  };
}

export function toDoctorDto(d) {
  if (!d) return null;
  return {
    id: d.id,
    licenseNumber: d.license,
    specialty: d.specialty ? { id: d.specialty.id, name: d.specialty.name, icon: d.specialty.icon } : null,
    governorate: governorateOf(d.city),
    city: ref(d.city),
    clinic: d.clinic ? {
      id: d.clinic.id, name: d.clinic.name, address: d.clinic.address, phone: d.clinic.phone,
      city: ref(d.clinic.city), governorate: governorateOf(d.clinic.city),
    } : null,                                    // null = own practice (practiceName/Address/Phone below)
    practiceName: d.practiceName,
    practiceAddress: d.practiceAddress,
    practicePhone: d.practicePhone,
    fee: Number(d.fee),
    experience: d.experience,
    bio: d.bio,
    videoConsult: d.videoConsult,
    languages: (d.languages ?? []).map((l) => ref(l.language)),
    insurances: (d.insurances ?? []).map((i) => ref(i.insurance)),
    education: (d.educations ?? []).map(({ id, degree, institution, year }) => ({ id, degree, institution, year })),
    verification: {
      status: d.verificationStatus,
      reason: d.verificationReason,
      resubmitted: d.verificationResubmitted,
      note: d.verificationNote,
      submittedAt: d.verificationSubmittedAt,
      reviewedAt: d.verificationReviewedAt,
    },
  };
}

export function toUserDto(u) {
  if (!u) return null;
  return {
    id: u.id,
    role: u.role,
    name: u.fullName,
    email: u.email,
    phone: u.phone,
    gender: u.gender ? { id: u.gender.id, name: u.gender.desc } : null,
    status: u.status,
    statusReason: u.statusReason,
    emailVerified: u.emailVerified,
    language: u.language,
    notifications: {
      email: u.notifyEmail, sms: u.notifySms, reminders: u.notifyReminders,
      newBooking: u.notifyNewBooking, marketing: u.notifyMarketing,
    },
    createdAt: u.createdAt,
    ...(u.role === 'patient' && { patient: toPatientDto(u.patient) }),
    ...(u.role === 'doctor' && { doctor: toDoctorDto(u.doctor) }),
  };
}

// Admin view of a doctor application
export function toDoctorApplicationDto(d) {
  return {
    ...toDoctorDto(d),
    user: d.user && {
      id: d.user.id, name: d.user.fullName, email: d.user.email, emailVerified: d.user.emailVerified,
      phone: d.user.phone, status: d.user.status, createdAt: d.user.createdAt,
    },
    reviewedBy: d.reviewedBy ? { id: d.reviewedBy.id, name: d.reviewedBy.fullName } : null,
  };
}

export const page = (items, total, { page, pageSize }) => ({
  items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)),
});
