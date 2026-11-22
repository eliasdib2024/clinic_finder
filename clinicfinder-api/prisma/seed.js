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
// [name, clinic type, governorate, city, address, phone] – the clinics doctors can choose in their practice profile
const CLINICS = [
  ['Cedar Heights Medical Center', 'Medical center', 'Beirut', 'Achrafieh', 'Sassine Square, Mounir Bldg, 3rd floor', '+9611334210'],
  ['Hamra Polyclinic', 'Polyclinic', 'Beirut', 'Hamra', 'Makdessi Street, Nour Bldg, 2nd floor', '+9611745118'],
  ['Verdun Specialists Clinic', 'Private clinic', 'Beirut', 'Verdun', 'Rashid Karami Street, Plaza Tower, 6th floor', '+9611802446'],
  ['Baabda Valley Hospital', 'Hospital', 'Mount Lebanon', 'Baabda', 'Main Road, near the Municipality', '+9615921330'],
  ['Metn Family Health Center', 'Medical center', 'Mount Lebanon', 'Jdeideh', 'Fouad Chehab Avenue, Bldg 21', '+9611889504'],
  ['Jounieh Bay Medical Center', 'Medical center', 'Keserwan-Jbeil', 'Jounieh', 'Old Souk Road, Marina Bldg', '+9619638271'],
  ['Byblos Coast Clinic', 'Private clinic', 'Keserwan-Jbeil', 'Byblos', 'Port Street, Bldg 4, 1st floor', '+9619547902'],
  ['Al Mina Polyclinic', 'Polyclinic', 'North', 'Tripoli', 'Al Mina Corniche, Bldg 12', '+9616412775'],
  ['Batroun Seaside Clinic', 'Private clinic', 'North', 'Batroun', 'Phoenician Wall Street, Bldg 3', '+9616744129'],
  ['Halba Community Health Center', 'Medical center', 'Akkar', 'Halba', 'Serail Road, Bldg 8', '+9616692410'],
  ['Old Port Medical Center', 'Medical center', 'South', 'Sidon', 'Riad Al Solh Street, Bldg 30', '+9617731552'],
  ['Citrus Grove Hospital', 'Hospital', 'South', 'Tyre', 'Southern Boulevard, Km 2', '+9617349811'],
  ['Nabatieh Hills Clinic', 'Private clinic', 'Nabatieh', 'Nabatieh', 'Hassan Kamel Al Sabbah Street, Bldg 5', '+9617765204'],
  ['Vineyard Medical Center', 'Medical center', 'Bekaa', 'Zahle', 'Boulevard Street, Berdawni Bldg', '+9618812637'],
  ['Temple Road Polyclinic', 'Polyclinic', 'Baalbek-Hermel', 'Baalbek', 'Ras El Ain Road, Bldg 2', '+9618370945'],
];
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

async function seedClinics() {
  for (const [name, type, governorate, city, address, phone] of CLINICS) {
    const clinicType = await prisma.clinicType.findUnique({ where: { desc: type } });
    const place = await prisma.city.findFirst({ where: { name: city, governorate: { name: governorate } } });
    await prisma.clinic.upsert({
      where: { name }, update: {},
      create: { name, address, phone, clinicTypeId: clinicType.id, cityId: place.id },
    });
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
      emailVerified: true, emailVerifiedAt: new Date(), passwordHash: await hashPassword(password),
    },
  });
  console.log(`Administrator created: ${email}`);
}

try {
  await seedLookups();
  await seedClinics();
  await seedAdmin();
  const counts = {
    specialties: await prisma.specialty.count(), governorates: await prisma.governorate.count(), cities: await prisma.city.count(),
    insurances: await prisma.insurance.count(), clinics: await prisma.clinic.count(), bloodTypes: await prisma.bloodType.count(), statuses: await prisma.appointmentStatus.count(),
  };
  console.log('Seed complete:', counts);
} finally {
  await prisma.$disconnect();
}
