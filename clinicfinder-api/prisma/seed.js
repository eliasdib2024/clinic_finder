// seed.js – reference data + the first administrator.  Run with:  npm run db:seed
// Safe to run many times: existing rows are kept (upsert), nothing is duplicated.
// Names match the frontend lists (src/lib/constants.js) so both sides agree.
import { prisma } from '../src/config/prisma.js';
import { config } from '../src/config/env.js';
import { hashPassword } from '../src/utils/password.js';

const GOVERNORATES = {
  Beirut: ['Achrafieh', 'Hamra', 'Verdun', 'Ras Beirut', 'Mar Mikhael', 'Mazraa'],
  'Mount Lebanon': ['Baabda', 'Hazmieh', 'Jdeideh', 'Antelias', 'Dbayeh', 'Broummana', 'Aley', 'Beiteddine'],
  'Keserwan-Jbeil': ['Jounieh', 'Kaslik', 'Zouk Mosbeh', 'Ajaltoun', 'Byblos'],
  North: ['Tripoli', 'Zgharta', 'Batroun', 'Amioun', 'Bcharre', 'Minieh'],
  Akkar: ['Halba', 'Qobayat', 'Bebnine', 'Andaket'],
  South: ['Sidon', 'Tyre', 'Jezzine', 'Damour'],
  Nabatieh: ['Nabatieh', 'Marjayoun', 'Bint Jbeil', 'Hasbaya'],
  Bekaa: ['Zahle', 'Chtaura', 'Bar Elias', 'Jeb Jannine', 'Rashaya'],
  'Baalbek-Hermel': ['Baalbek', 'Hermel', 'Ras Baalbek'],
};

const SPECIALTIES = [
  ['General Practice', 'Stethoscope'], ['Cardiology', 'HeartPulse'], ['Dermatology', 'Sparkles'],
  ['Pediatrics', 'Baby'], ['Gynecology & Obstetrics', 'Flower2'], ['Orthopedics', 'Bone'],
  ['Ophthalmology', 'Eye'], ['Ear, Nose & Throat', 'Ear'], ['Neurology', 'Brain'],
  ['Psychiatry', 'MessageCircleHeart'], ['Endocrinology', 'Droplets'], ['Gastroenterology', 'Soup'],
  ['Dentistry', 'Smile'], ['Urology', 'Activity'],
];
const INSURANCES = ['NSSF', 'COOP', 'Allianz SNA', 'AXA Middle East', 'Bankers Assurance', 'GlobeMed', 'MedNet', 'Fidelity Assurance'];
const LANGUAGES = ['Arabic', 'English', 'French', 'Armenian'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Female', 'Male'];
const CLINIC_TYPES = ['Private clinic', 'Medical center', 'Hospital', 'Polyclinic'];
const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show'];
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 8 hours', 'Every 12 hours', 'At bedtime', 'As needed', 'Once weekly'];

// upsert every name of a simple lookup table
const upsertNames = (model, field, names) =>
  Promise.all(names.map((name) => model.upsert({ where: { [field]: name }, update: {}, create: { [field]: name } })));

async function seedLookups() {
  for (const [name, icon] of SPECIALTIES) {
    await prisma.specialty.upsert({ where: { name }, update: { icon }, create: { name, icon } });
  }
  await upsertNames(prisma.insurance, 'name', INSURANCES);
  await upsertNames(prisma.language, 'name', LANGUAGES);
  await upsertNames(prisma.bloodType, 'name', BLOOD_TYPES);
  await upsertNames(prisma.gender, 'desc', GENDERS);
  await upsertNames(prisma.clinicType, 'desc', CLINIC_TYPES);
  await upsertNames(prisma.appointmentStatus, 'name', APPOINTMENT_STATUSES);
  await upsertNames(prisma.frequency, 'desc', FREQUENCIES);

  for (const [governorate, cities] of Object.entries(GOVERNORATES)) {
    const g = await prisma.governorate.upsert({ where: { name: governorate }, update: {}, create: { name: governorate } });
    for (const name of cities) {
      await prisma.city.upsert({
        where: { governorateId_name: { governorateId: g.id, name } }, update: {}, create: { governorateId: g.id, name },
      });
    }
  }
}

// The first administrator. Admins cannot sign up: this is how the first one gets an account.
async function seedAdmin() {
  const { name, email, password, phone } = config.admin;
  if (!email || !password) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set in .env – no administrator created.');
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log(`Administrator ${email} already exists – left unchanged.`);
    return;
  }
  await prisma.user.create({
    data: {
      fullName: name, email: email.toLowerCase(), phone, role: 'admin', status: 'active',
      emailVerified: true, passwordHash: await hashPassword(password),
    },
  });
  console.log(`Administrator created: ${email}`);
}

try {
  await seedLookups();
  await seedAdmin();
  const counts = {
    specialties: await prisma.specialty.count(), governorates: await prisma.governorate.count(), cities: await prisma.city.count(),
    insurances: await prisma.insurance.count(), bloodTypes: await prisma.bloodType.count(), statuses: await prisma.appointmentStatus.count(),
  };
  console.log('Seed complete:', counts);
} finally {
  await prisma.$disconnect();
}
