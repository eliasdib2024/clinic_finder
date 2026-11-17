// Demo data — every person, clinic and phone number here is fictional.
import { DEFAULT_INSURERS, DEFAULT_LANGUAGES, DEFAULT_SPECIALTIES, GOVERNORATES } from '../lib/constants';
import { addDays, todayISO, timeToMinutes } from '../lib/dates';
import { daySlots, defaultSchedule } from '../lib/schedule';
import { weekdayKey } from '../lib/dates';
import { hashPassword } from '../lib/hash';

// Deterministic PRNG so the demo looks the same on every reset.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLINICS = [
  ['Cedar Heights Medical Center', 'medical-center', 'beirut', 'Achrafieh', 'Sassine Square, Mounir Bldg, 3rd floor', '01 334 210'],
  ['Hamra Polyclinic', 'polyclinic', 'beirut', 'Hamra', 'Makdessi Street, Nour Bldg, 2nd floor', '01 745 118'],
  ['Verdun Specialists Clinic', 'private', 'beirut', 'Verdun', 'Rashid Karami Street, Plaza Tower, 6th floor', '01 802 446'],
  ['Baabda Valley Hospital', 'hospital', 'mount-lebanon', 'Baabda', 'Main Road, near the Municipality', '05 921 330'],
  ['Metn Family Health Center', 'medical-center', 'mount-lebanon', 'Jdeideh', 'Fouad Chehab Avenue, Bldg 21', '01 889 504'],
  ['Jounieh Bay Medical Center', 'medical-center', 'keserwan-jbeil', 'Jounieh', 'Old Souk Road, Marina Bldg', '09 638 271'],
  ['Byblos Coast Clinic', 'private', 'keserwan-jbeil', 'Byblos', 'Port Street, Bldg 4, 1st floor', '09 547 902'],
  ['Al Mina Polyclinic', 'polyclinic', 'north', 'Tripoli', 'Al Mina Corniche, Bldg 12', '06 412 775'],
  ['Batroun Seaside Clinic', 'private', 'north', 'Batroun', 'Phoenician Wall Street, Bldg 3', '06 744 129'],
  ['Halba Community Health Center', 'medical-center', 'akkar', 'Halba', 'Serail Road, Bldg 8', '06 692 410'],
  ['Old Port Medical Center', 'medical-center', 'south', 'Sidon', 'Riad Al Solh Street, Bldg 30', '07 731 552'],
  ['Citrus Grove Hospital', 'hospital', 'south', 'Tyre', 'Southern Boulevard, Km 2', '07 349 811'],
  ['Nabatieh Hills Clinic', 'private', 'nabatieh', 'Nabatieh', 'Hassan Kamel Al Sabbah Street, Bldg 5', '07 765 204'],
  ['Vineyard Medical Center', 'medical-center', 'bekaa', 'Zahle', 'Boulevard Street, Berdawni Bldg', '08 812 637'],
  ['Temple Road Polyclinic', 'polyclinic', 'baalbek-hermel', 'Baalbek', 'Ras El Ain Road, Bldg 2', '08 370 945'],
];

// [first, last, gender, specialty, governorate, city, clinicIndex|null, fee, languages, insurers, experience, verification]
const DOCTORS = [
  ['Rami', 'Haddad', 'm', 'cardiology', 'beirut', 'Achrafieh', 0, 80, ['ar', 'en', 'fr'], ['nssf', 'axa-me', 'globemed', 'allianz-sna', 'bankers'], 16],
  ['Lina', 'Khoury', 'f', 'dermatology', 'beirut', 'Hamra', 1, 70, ['ar', 'en', 'fr'], ['axa-me', 'globemed', 'mednet'], 11],
  ['Karim', 'Nassar', 'm', 'general-practice', 'beirut', 'Verdun', 2, 40, ['ar', 'en'], ['nssf', 'coop', 'axa-me', 'globemed', 'fidelity'], 9],
  ['Maya', 'Saade', 'f', 'pediatrics', 'mount-lebanon', 'Jdeideh', 4, 50, ['ar', 'en', 'fr'], ['nssf', 'allianz-sna', 'globemed', 'mednet'], 13],
  ['Hadi', 'Mansour', 'm', 'orthopedics', 'mount-lebanon', 'Baabda', 3, 90, ['ar', 'en'], ['nssf', 'bankers', 'axa-me'], 18],
  ['Nour', 'El Khatib', 'f', 'gynecology', 'beirut', 'Achrafieh', 0, 75, ['ar', 'fr', 'en'], ['axa-me', 'allianz-sna', 'globemed', 'bankers'], 14],
  ['Serge', 'Kassabian', 'm', 'ophthalmology', 'mount-lebanon', 'Antelias', null, 65, ['ar', 'en', 'hy'], ['nssf', 'axa-me', 'mednet'], 20],
  ['Rania', 'Fares', 'f', 'ent', 'keserwan-jbeil', 'Jounieh', 5, 60, ['ar', 'fr'], ['nssf', 'coop', 'globemed'], 8],
  ['Elie', 'Tannous', 'm', 'neurology', 'keserwan-jbeil', 'Kaslik', null, 100, ['ar', 'en', 'fr'], ['axa-me', 'bankers', 'allianz-sna'], 22],
  ['Dima', 'Salameh', 'f', 'psychiatry', 'beirut', 'Mar Mikhael', null, 90, ['ar', 'en'], ['globemed', 'mednet'], 10],
  ['Bassel', 'Abi Nader', 'm', 'endocrinology', 'beirut', 'Ras Beirut', 2, 85, ['ar', 'en', 'fr'], ['nssf', 'axa-me', 'fidelity'], 15],
  ['Joelle', 'Bitar', 'f', 'gastroenterology', 'mount-lebanon', 'Hazmieh', 3, 85, ['ar', 'fr', 'en'], ['allianz-sna', 'globemed', 'bankers'], 12],
  ['Walid', 'Daher', 'm', 'dentistry', 'north', 'Tripoli', 7, 45, ['ar', 'en'], ['coop', 'mednet', 'globemed'], 17],
  ['Hala', 'Karam', 'f', 'general-practice', 'north', 'Batroun', 8, 35, ['ar', 'fr'], ['nssf', 'coop', 'fidelity'], 7],
  ['Tarek', 'Chahine', 'm', 'urology', 'north', 'Zgharta', null, 80, ['ar', 'en'], ['nssf', 'axa-me', 'bankers'], 19],
  ['Mira', 'Matta', 'f', 'cardiology', 'south', 'Sidon', 10, 70, ['ar', 'en'], ['nssf', 'coop', 'globemed', 'mednet'], 12],
  ['Youssef', 'Hamdan', 'm', 'pediatrics', 'south', 'Tyre', 11, 40, ['ar', 'en'], ['nssf', 'coop', 'mednet'], 10],
  ['Samar', 'Zein', 'f', 'dermatology', 'nabatieh', 'Nabatieh', 12, 50, ['ar', 'en'], ['nssf', 'globemed'], 6],
  ['Antoine', 'Ghanem', 'm', 'orthopedics', 'bekaa', 'Zahle', 13, 70, ['ar', 'fr', 'en'], ['nssf', 'allianz-sna', 'bankers', 'fidelity'], 21],
  ['Rima', 'Younes', 'f', 'general-practice', 'baalbek-hermel', 'Baalbek', 14, 30, ['ar'], ['nssf', 'coop'], 9],
  ['Omar', 'Hammoud', 'm', 'general-practice', 'akkar', 'Halba', 9, 30, ['ar', 'en'], ['nssf', 'coop', 'mednet'], 8],
  ['Grace', 'Najjar', 'f', 'ophthalmology', 'keserwan-jbeil', 'Byblos', 6, 60, ['ar', 'en', 'fr'], ['axa-me', 'globemed', 'fidelity'], 11],
  ['Ziad', 'Kassab', 'm', 'ent', 'bekaa', 'Chtaura', null, 55, ['ar', 'en'], ['nssf', 'bankers'], 14],
  ['Layal', 'Moussa', 'f', 'endocrinology', 'mount-lebanon', 'Dbayeh', null, 80, ['ar', 'en', 'fr'], ['axa-me', 'allianz-sna', 'globemed'], 9],
  ['Nabil', 'Azar', 'm', 'gastroenterology', 'south', 'Sidon', 10, 75, ['ar', 'en'], ['nssf', 'globemed', 'mednet'], 16],
  ['Christine', 'Haddad', 'f', 'psychiatry', 'keserwan-jbeil', 'Zouk Mosbeh', null, 85, ['ar', 'fr', 'en'], ['allianz-sna', 'axa-me'], 13],
  ['Fouad', 'Sabbagh', 'm', 'dentistry', 'beirut', 'Mazraa', null, 50, ['ar', 'en'], ['globemed', 'mednet', 'fidelity'], 10],
  ['Aline', 'Boghossian', 'f', 'neurology', 'beirut', 'Hamra', 1, 95, ['ar', 'en', 'hy', 'fr'], ['axa-me', 'bankers', 'globemed'], 17],
  ['Hussein', 'Fakih', 'm', 'urology', 'nabatieh', 'Marjayoun', null, 60, ['ar', 'en'], ['nssf', 'coop'], 12],
  ['Rita', 'Abboud', 'f', 'gynecology', 'north', 'Tripoli', 7, 55, ['ar', 'fr', 'en'], ['nssf', 'coop', 'globemed', 'fidelity'], 15],
  // Verification queue
  ['Jad', 'Moussawi', 'm', 'neurology', 'mount-lebanon', 'Aley', null, 80, ['ar', 'en'], ['nssf', 'globemed'], 6, { status: 'pending', resubmitted: false }],
  ['Carla', 'Matar', 'f', 'pediatrics', 'keserwan-jbeil', 'Ajaltoun', null, 45, ['ar', 'fr', 'en'], ['allianz-sna', 'mednet'], 5, { status: 'pending', resubmitted: true, reason: 'Please upload a clearer license number — it did not match the registry.' }],
  ['Fadi', 'Hamadeh', 'm', 'orthopedics', 'bekaa', 'Bar Elias', null, 60, ['ar'], ['nssf'], 4, { status: 'rejected', reason: 'The license number could not be matched with the Order of Physicians registry.' }],
  ['Sana', 'Itani', 'f', 'dermatology', 'south', 'Damour', null, 55, ['ar', 'en'], ['nssf', 'axa-me'], 7, { status: 'pending', resubmitted: false }],
];

const BIO = {
  'general-practice': 'Family physician focused on preventive care, chronic disease follow-up and same-week consultations for the whole family.',
  cardiology: 'Consultant cardiologist specialising in hypertension, heart rhythm disorders and cardiac imaging, with a strong focus on prevention.',
  dermatology: 'Medical and aesthetic dermatologist treating acne, eczema, psoriasis and skin cancer screening, using evidence-based protocols.',
  pediatrics: 'Paediatrician caring for newborns to teenagers — growth follow-up, vaccinations and common childhood illnesses, in a calm, child-friendly clinic.',
  gynecology: 'Obstetrician-gynaecologist offering pregnancy follow-up, fertility counselling and women’s health check-ups.',
  orthopedics: 'Orthopaedic surgeon treating sports injuries, joint pain and spine conditions, with an emphasis on non-surgical options first.',
  ophthalmology: 'Ophthalmologist experienced in cataract, glaucoma and refractive surgery assessments and paediatric eye exams.',
  ent: 'ENT specialist treating sinusitis, hearing loss, allergies and voice disorders, with in-clinic endoscopy.',
  neurology: 'Neurologist managing migraines, epilepsy, neuropathy and memory disorders, with EEG and EMG interpretation.',
  psychiatry: 'Psychiatrist supporting adults with anxiety, depression, sleep and stress-related conditions through a confidential, collaborative approach.',
  endocrinology: 'Endocrinologist treating diabetes, thyroid and hormonal disorders, with structured lifestyle and nutrition plans.',
  gastroenterology: 'Gastroenterologist managing reflux, IBS, liver conditions and performing endoscopic screening.',
  dentistry: 'Dentist offering check-ups, fillings, root canal treatment and cosmetic dentistry in a modern, gentle setting.',
  urology: 'Urologist treating kidney stones, prostate conditions and urinary disorders using minimally invasive techniques.',
};

const SCHOOLS = [
  'Lebanese University — Faculty of Medical Sciences', 'Saint Joseph University — Faculty of Medicine',
  'American University of Beirut — Faculty of Medicine', 'University of Balamand — Faculty of Medicine',
  'Lebanese American University — School of Medicine', 'Beirut Arab University — Faculty of Medicine',
];
const FELLOWSHIPS = ['Residency — Université Paris Cité', 'Fellowship — McGill University, Montréal', 'Fellowship — University of Lyon', 'Residency — University of Michigan', 'Fellowship — King’s College London'];

const PATIENTS = [
  ['Nadine', 'Khalil', 'f', 'O+', ['Penicillin'], 'axa-me', '1991-04-12', '71 482 913'],
  ['Georges', 'Abi Saab', 'm', 'A+', [], 'nssf', '1968-09-03', '03 551 207'],
  ['Hiba', 'Darwish', 'f', 'B+', ['Aspirin'], 'globemed', '1985-01-22', '76 309 448'],
  ['Omar', 'Itani', 'm', 'O-', [], 'coop', '1979-06-30', '70 812 660'],
  ['Sarah', 'Bou Khalil', 'f', 'A-', ['Sulfa drugs'], 'allianz-sna', '1996-11-08', '81 224 509'],
  ['Tony', 'Hanna', 'm', 'AB+', [], 'bankers', '1972-03-17', '03 905 142'],
  ['Lara', 'Fakhoury', 'f', 'O+', ['Latex'], 'mednet', '2001-07-25', '78 417 336'],
  ['Ali', 'Hammoud', 'm', 'B-', ['Codeine'], 'nssf', '1988-12-02', '71 650 984'],
  ['Joseph', 'Karam', 'm', 'A+', [], 'fidelity', '1959-02-14', '03 278 615'],
  ['Rana', 'Saleh', 'f', 'O+', [], 'globemed', '1993-05-19', '76 553 017'],
  ['Khaled', 'Ayoub', 'm', 'A+', ['Penicillin'], 'nssf', '1983-08-27', '70 362 841'],
  ['Christelle', 'Nehme', 'f', 'AB-', [], 'axa-me', '1999-10-05', '81 709 226'],
  ['Bilal', 'Srour', 'm', 'O+', [], 'coop', '1976-04-01', '03 816 470'],
  ['Yara', 'Tabet', 'f', 'B+', ['Ibuprofen'], 'allianz-sna', '2004-01-30', '78 235 691'],
];

const REASONS = {
  'general-practice': ['Annual check-up', 'Persistent cough', 'Fever and fatigue', 'Blood test review'],
  cardiology: ['Chest tightness when climbing stairs', 'Blood pressure follow-up', 'Palpitations', 'ECG review'],
  dermatology: ['Acne treatment follow-up', 'Mole check', 'Eczema flare-up', 'Hair loss'],
  pediatrics: ['Vaccination appointment', 'Ear infection', 'Growth check', 'Fever in child'],
  gynecology: ['Routine check-up', 'Pregnancy follow-up', 'Ultrasound'],
  orthopedics: ['Knee pain after running', 'Lower back pain', 'Shoulder injury'],
  ophthalmology: ['Blurry vision', 'Eye exam', 'Dry eyes'],
  ent: ['Recurring sinusitis', 'Hearing check', 'Sore throat'],
  neurology: ['Frequent migraines', 'Numbness in hands', 'Dizziness'],
  psychiatry: ['Anxiety and sleep issues', 'Follow-up session', 'Stress management'],
  endocrinology: ['Thyroid follow-up', 'Diabetes control', 'Hormone test review'],
  gastroenterology: ['Acid reflux', 'Stomach pain', 'Colonoscopy consultation'],
  dentistry: ['Dental cleaning', 'Tooth pain', 'Filling'],
  urology: ['Kidney stone follow-up', 'Prostate check', 'Urinary discomfort'],
};

// Diagnosis written on seeded prescriptions, matching each medication template.
const RX_DIAGNOSES = {
  cardiology: 'Essential hypertension',
  'general-practice': 'Acute pharyngitis',
  dermatology: 'Acne vulgaris',
  default: 'Vitamin D deficiency',
};

const RX_TEMPLATES = {
  cardiology: [{ name: 'Bisoprolol 5 mg', dose: '1 tablet', frequency: 'Once daily', duration: '3 months' }, { name: 'Atorvastatin 20 mg', dose: '1 tablet', frequency: 'At bedtime', duration: '3 months' }],
  'general-practice': [{ name: 'Azithromycin 500 mg', dose: '1 tablet', frequency: 'Once daily', duration: '3 days' }, { name: 'Paracetamol 500 mg', dose: '2 tablets', frequency: 'As needed', duration: '5 days', notes: 'Max 6 tablets per day' }],
  dermatology: [{ name: 'Doxycycline 100 mg', dose: '1 capsule', frequency: 'Once daily', duration: '1 month', notes: 'Take with food' }],
  default: [{ name: 'Vitamin D3 50,000 IU', dose: '1 capsule', frequency: 'Once weekly', duration: '1 month' }],
};

export function buildSeed() {
  const rand = mulberry32(961);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const today = todayISO();
  const nowIso = new Date().toISOString();
  const ago = (days, h = 10) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, 0, 0, 0); return d.toISOString(); };

  const db = {
    version: 3,
    users: [], doctors: [], clinics: [], appointments: [], prescriptions: [], notifications: [], activity: [],
    sessions: {}, resetCodes: {},
    catalog: { specialties: DEFAULT_SPECIALTIES.map((x) => ({ ...x })), insurers: DEFAULT_INSURERS.map((x) => ({ ...x })), languages: DEFAULT_LANGUAGES.map((x) => ({ ...x })) },
  };

  const settings = (language = 'en') => ({ language, notifications: { email: true, sms: true, reminders: true, newBooking: true, marketing: false } });

  db.users.push({ id: 'u_admin', role: 'admin', name: 'Maurice Admin', email: 'admin@clinicfinder.lb', phone: '+9611456789', status: 'active', passwordHash: hashPassword('Admin@123'), createdAt: ago(200), settings: settings() });

  CLINICS.forEach(([name, type, governorate, city, address, phone], i) => {
    db.clinics.push({ id: `c_${i + 1}`, name, type, governorate, city, address, phone, createdAt: ago(300 - i) });
  });

  PATIENTS.forEach(([first, last, gender, bloodType, allergies, insuranceId, dob, phone], i) => {
    const id = i === 0 ? 'u_patient' : `u_p${i}`;
    db.users.push({
      id, role: 'patient', name: `${first} ${last}`, gender,
      email: i === 0 ? 'patient@clinicfinder.lb' : `${first}.${last}`.toLowerCase().replace(/\s+/g, '') + '@example.lb',
      phone: `+961${phone.replace(/\s/g, '').replace(/^0/, '')}`, status: i === 12 ? 'suspended' : 'active',
      passwordHash: hashPassword('Patient@123'), createdAt: ago(150 - i * 7), settings: settings(),
      patient: {
        bloodType, allergies, noKnownAllergies: !allergies.length, insuranceId, insuranceNumber: `${insuranceId.toUpperCase().slice(0, 3)}-${100000 + Math.floor(rand() * 899999)}`, dob, emergencyContact: '',
        ...(() => { const g = GOVERNORATES[i % GOVERNORATES.length]; return { governorate: g.id, city: g.cities[i % g.cities.length] }; })(),
        onboarding: 'done',
      },
    });
  });

  DOCTORS.forEach(([first, last, gender, specialtyId, governorate, city, clinicIdx, fee, languages, insurances, experience, verif], i) => {
    const userId = i === 0 ? 'u_doctor' : `u_d${i}`;
    const id = i === 0 ? 'd_1' : `d_${i + 1}`;
    db.users.push({
      id: userId, role: 'doctor', name: `Dr. ${first} ${last}`, gender,
      email: i === 0 ? 'doctor@clinicfinder.lb' : `${first}.${last}`.toLowerCase().replace(/\s+/g, '') + '@clinicfinder.lb',
      phone: `+961${pick(['3', '71', '76', '70', '81'])}${String(100000 + Math.floor(rand() * 899999))}`,
      status: 'active', passwordHash: hashPassword('Doctor@123'), createdAt: ago(240 - i * 5), settings: settings(i % 4 === 1 ? 'fr' : 'en'),
    });

    const schedule = defaultSchedule();
    const variant = i % 5;
    if (variant === 1) { schedule.sat.enabled = false; schedule.wed = { enabled: true, start: '14:00', end: '19:00', breaks: [] }; }
    if (variant === 2) { for (const k of ['mon', 'tue', 'wed', 'thu', 'fri']) schedule[k] = { enabled: true, start: '10:00', end: '18:00', breaks: [{ start: '13:30', end: '14:30' }] }; }
    if (variant === 3) { schedule.fri.enabled = false; schedule.sat = { enabled: true, start: '09:00', end: '14:00', breaks: [] }; }
    if (variant === 4) { schedule.tue.enabled = false; schedule.thu = { enabled: true, start: '15:00', end: '20:00', breaks: [] }; }
    if (i === 0) schedule.sun = { enabled: true, start: '10:00', end: '14:00', breaks: [] }; // Sunday morning clinic

    const v = verif || { status: 'approved' };
    const school = pick(SCHOOLS);
    db.doctors.push({
      id, userId, specialtyId, licenseNumber: String(10000 + Math.floor(rand() * 89999)),
      governorate, city, clinicId: clinicIdx === null ? null : `c_${clinicIdx + 1}`,
      practice: clinicIdx === null ? { name: `Dr. ${last} Clinic`, address: `${city} main road, ${pick(['Ground', '1st', '2nd', '3rd'])} floor`, phone: `0${pick(['1', '4', '5', '6', '7', '8', '9'])} ${300 + Math.floor(rand() * 600)} ${100 + Math.floor(rand() * 899)}` } : null,
      fee, languages, insurances, experience,
      education: [
        { degree: 'Doctor of Medicine (MD)', institution: school, year: 2026 - experience - 4 },
        { degree: rand() > 0.4 ? 'Specialty residency' : 'Clinical fellowship', institution: pick(FELLOWSHIPS), year: 2026 - experience },
      ],
      bio: BIO[specialtyId],
      rating: Math.round((4.2 + rand() * 0.8) * 10) / 10, reviewsCount: 12 + Math.floor(rand() * 240),
      schedule, slotLength: i === 0 ? 30 : pick([20, 30, 30, 30, 45]), autoConfirm: i % 3 === 2,
      videoConsult: i % 4 !== 3,
      blockedDates: i === 0 ? [{ date: addDays(today, 9), note: 'Medical conference' }] : [],
      verification: {
        status: v.status, reason: v.reason || '', resubmitted: !!v.resubmitted,
        submittedAt: v.status === 'approved' ? ago(220 - i) : ago(3 - (i % 3)), reviewedAt: v.status === 'approved' ? ago(218 - i) : v.status === 'rejected' ? ago(1) : null,
      },
      createdAt: ago(240 - i * 5),
    });
  });

  // ---------- appointments ----------
  const doctorById = Object.fromEntries(db.doctors.map((d) => [d.id, d]));
  const specialtyOf = (doctorId) => doctorById[doctorId].specialtyId;
  const busy = new Set();
  const patientBusy = new Set();
  let apptSeq = 1;

  const addAppt = (doctorId, patientId, offset, time, status, extra = {}) => {
    const date = addDays(today, offset);
    const key = `${doctorId}|${date}|${time}`;
    const pkey = `${patientId}|${date}|${time}`;
    if (busy.has(key) || patientBusy.has(pkey)) return null;
    busy.add(key); patientBusy.add(pkey);
    const d = doctorById[doctorId];
    const createdAt = ago(Math.max(1, -offset + 3 + Math.floor(rand() * 5)));
    const appt = {
      id: `a_${apptSeq++}`, doctorId, patientId, date, time, duration: d.slotLength,
      type: extra.type || (d.videoConsult && rand() > 0.8 ? 'video' : 'in-person'),
      reason: extra.reason || pick(REASONS[specialtyOf(doctorId)] || ['Consultation']),
      status, statusNote: extra.statusNote || '', createdAt, updatedAt: createdAt,
      history: [{ status: 'pending', at: createdAt, by: patientId }].concat(status !== 'pending' ? [{ status, at: createdAt, by: status === 'cancelled' ? patientId : d.userId, note: extra.statusNote || '' }] : []),
    };
    db.appointments.push(appt);
    return appt;
  };

  const validTime = (doctorId, offset, preferred) => {
    const d = doctorById[doctorId];
    const slots = daySlots(d.schedule[weekdayKey(addDays(today, offset))], d.slotLength);
    if (!slots.length) return null;
    if (preferred && slots.includes(preferred)) return preferred;
    return pick(slots);
  };
  const nearestOpen = (doctorId, offset, dir = 1) => {
    for (let k = 0; k < 7; k++) { const o = offset + k * dir; if (validTime(doctorId, o)) return o; }
    return offset;
  };

  // Demo doctor (d_1) — today’s timeline, requests and history
  const D1 = 'd_1';
  // Today: spread five visits across the day's slots so the timeline is always populated.
  const todaySlots = daySlots(doctorById[D1].schedule[weekdayKey(today)], doctorById[D1].slotLength);
  const spread = [0.0, 0.2, 0.4, 0.65, 0.9].map((f) => todaySlots[Math.min(todaySlots.length - 1, Math.floor(f * todaySlots.length))]);
  [['u_p1', 'confirmed'], ['u_p2', 'confirmed'], ['u_p3', 'pending'], ['u_p5', 'confirmed'], ['u_p9', 'confirmed']]
    .forEach(([p, s], k) => spread[k] && addAppt(D1, p, 0, spread[k], s));
  addAppt(D1, 'u_p4', nearestOpen(D1, 1), validTime(D1, nearestOpen(D1, 1), '10:00'), 'pending', { reason: 'Shortness of breath at night' });
  addAppt(D1, 'u_p6', nearestOpen(D1, 3), validTime(D1, nearestOpen(D1, 3), '11:00'), 'pending', { type: 'video', reason: 'Second opinion on echocardiogram' });
  addAppt(D1, 'u_p10', nearestOpen(D1, 4), validTime(D1, nearestOpen(D1, 4), '09:30'), 'pending');
  const nadineNext = addAppt(D1, 'u_patient', nearestOpen(D1, 2), validTime(D1, nearestOpen(D1, 2), '14:30'), 'confirmed', { reason: 'Follow-up — ECG and blood pressure review' });
  addAppt(D1, 'u_p7', nearestOpen(D1, 6), validTime(D1, nearestOpen(D1, 6), '16:00'), 'confirmed');
  const d1Past = [];
  [[-3, 'u_p1'], [-6, 'u_p2'], [-8, 'u_p11'], [-12, 'u_p3'], [-15, 'u_p8'], [-19, 'u_p9'], [-24, 'u_p4'], [-29, 'u_p6']].forEach(([o, p], k) => {
    const off = nearestOpen(D1, o, -1);
    const status = k === 4 ? 'no-show' : k === 6 ? 'cancelled' : 'completed';
    const a = addAppt(D1, p, off, validTime(D1, off), status, status === 'cancelled' ? { statusNote: 'Patient travelling' } : {});
    if (a && status === 'completed') d1Past.push(a);
  });
  addAppt(D1, 'u_p12', nearestOpen(D1, -2, -1), validTime(D1, nearestOpen(D1, -2, -1)), 'declined', { statusNote: 'Please book with a general practitioner first for this concern.' });
  const nadinePast = addAppt(D1, 'u_patient', nearestOpen(D1, -35, -1), validTime(D1, nearestOpen(D1, -35, -1), '10:00'), 'completed', { reason: 'Palpitations and chest tightness' });

  // Demo patient elsewhere
  const derm = 'd_2';
  addAppt(derm, 'u_patient', nearestOpen(derm, 5), validTime(derm, nearestOpen(derm, 5), '11:00'), 'pending', { reason: 'Mole check' });
  const gp = 'd_3';
  const nadineGp = addAppt(gp, 'u_patient', nearestOpen(gp, -20, -1), validTime(gp, nearestOpen(gp, -20, -1), '09:30'), 'completed', { reason: 'Persistent cough and fever' });
  addAppt('d_8', 'u_patient', nearestOpen('d_8', -10, -1), validTime('d_8', nearestOpen('d_8', -10, -1)), 'cancelled', { reason: 'Recurring sinusitis', statusNote: 'Cancelled by patient' });

  // Background activity for other approved doctors
  const approved = db.doctors.filter((d) => d.verification.status === 'approved' && d.id !== D1);
  const patientIds = db.users.filter((u) => u.role === 'patient' && u.status === 'active').map((u) => u.id);
  for (const d of approved) {
    const n = 6 + Math.floor(rand() * 10);
    for (let k = 0; k < n; k++) {
      const offset = Math.floor(rand() * 44) - 30;
      const time = validTime(d.id, offset);
      if (!time) continue;
      let status;
      if (offset < 0) status = rand() < 0.78 ? 'completed' : rand() < 0.5 ? 'cancelled' : 'no-show';
      else if (offset === 0) status = 'confirmed';
      else status = d.autoConfirm || rand() < 0.55 ? 'confirmed' : 'pending';
      addAppt(d.id, pick(patientIds), offset, time, status);
    }
  }

  // ---------- prescriptions ----------
  let rxSeq = 1;
  const usedCodes = new Set();
  const code = () => {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c;
    do { c = `RX-${Array.from({ length: 4 }, () => A[Math.floor(rand() * A.length)]).join('')}-${String(Math.floor(rand() * 100)).padStart(2, '0')}`; } while (usedCodes.has(c));
    usedCodes.add(c); return c;
  };
  const addRx = (appt, meds, notes = '', { diagnosis, followUp = null } = {}) => {
    if (!appt) return;
    const key = RX_TEMPLATES[specialtyOf(appt.doctorId)] === meds ? specialtyOf(appt.doctorId) : 'default';
    db.prescriptions.push({
      id: `rx_${rxSeq++}`, code: code(), doctorId: appt.doctorId, patientId: appt.patientId, appointmentId: appt.id, date: appt.date,
      diagnosis: diagnosis || RX_DIAGNOSES[key] || RX_DIAGNOSES.default, followUp, medications: meds, notes, createdAt: `${appt.date}T12:00:00.000Z`,
    });
  };
  addRx(nadinePast, RX_TEMPLATES.cardiology, 'Recheck blood pressure at home twice a week.', {
    diagnosis: 'Essential hypertension with palpitations',
    followUp: nadinePast && { date: addDays(nadinePast.date, 37), note: 'Bring your home blood-pressure log and a recent lipid profile.' },
  });
  addRx(nadineGp, [{ name: 'Azithromycin 500 mg', dose: '1 tablet', frequency: 'Once daily', duration: '3 days', notes: 'Penicillin allergy — macrolide chosen' }, { name: 'Paracetamol 500 mg', dose: '2 tablets', frequency: 'As needed', duration: '5 days', notes: 'Max 6 tablets per day' }], 'Plenty of fluids and rest.', { diagnosis: 'Acute bacterial pharyngitis' });
  d1Past.slice(0, 5).forEach((a) => addRx(a, RX_TEMPLATES.cardiology, '', { diagnosis: RX_DIAGNOSES.cardiology }));
  db.appointments.filter((a) => a.status === 'completed' && a.doctorId !== D1 && rand() < 0.35)
    .forEach((a) => addRx(a, RX_TEMPLATES[specialtyOf(a.doctorId)] || RX_TEMPLATES.default));

  // ---------- notifications & activity ----------
  const n = (userId, title, body, vars, link, kind, daysAgo, read = false) => db.notifications.push({ id: `ntf_${db.notifications.length + 1}`, userId, title, body, vars, link, kind, read, createdAt: ago(daysAgo, 9) });
  const when = (a) => `@@when:${a.date}T${a.time}@@`;
  if (nadineNext) n('u_patient', 'Appointment confirmed', '{0} confirmed your visit on {1}.', { 0: 'Dr. Rami Haddad', 1: when(nadineNext) }, '/patient/appointments', 'success', 1);
  n('u_patient', 'New prescription', '{0} issued a digital prescription.', { 0: 'Dr. Karim Nassar' }, '/patient/prescriptions', 'info', 20, true);
  n('u_doctor', 'New booking request', '{0} requested an appointment.', { 0: 'Omar Itani' }, '/doctor/appointments?tab=pending', 'info', 0);
  n('u_doctor', 'New booking request', '{0} requested a video consultation.', { 0: 'Tony Hanna' }, '/doctor/appointments?tab=pending', 'info', 1);
  n('u_doctor', 'Profile verified', 'Your profile is verified and visible to patients.', null, '/doctor/profile', 'success', 200, true);
  n('u_admin', 'Verification resubmitted', '{0} re-submitted their application.', { 0: 'Dr. Carla Matar' }, '/admin/verifications', 'warning', 0);
  n('u_admin', 'New doctor application', '{0} applied for verification.', { 0: 'Dr. Sana Itani' }, '/admin/verifications', 'info', 1);

  [
    ['{0} re-submitted their verification', 'Dr. Carla Matar', 'verification', 0], ['{0} signed up as a doctor', 'Dr. Sana Itani', 'signup', 1],
    ['{0}’s application was rejected', 'Dr. Fadi Hamadeh', 'verification', 1], ['{0} booked {1}', ['Yara Tabet', 'Dr. Maya Saade'], 'booking', 1],
    ['{0} was suspended by an administrator', 'Bilal Srour', 'user', 2], ['Clinic “{0}” was updated', 'Temple Road Polyclinic', 'clinic', 3],
    ['{0} signed up as a doctor', 'Dr. Jad Moussawi', 'signup', 3], ['Catalog entry renamed to “{0}”', 'Gynecology & Obstetrics', 'catalog', 6],
  ].forEach(([text, v, kind, d]) => db.activity.push({ id: `act_${db.activity.length + 1}`, text, vars: Array.isArray(v) ? { 0: v[0], 1: v[1] } : { 0: v }, kind, at: ago(d, 11 - db.activity.length % 5) }));

  db.seededAt = nowIso;
  return db;
}
