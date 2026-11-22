// Reference data for Lebanon and shared enums.
// Catalog lists (specialties, insurers, languages) are seeded from here and then
// owned by the admin-editable catalog in the store.

// Support contact. SUPPORT_EMAIL is the real inbox; links show SUPPORT_EMAIL_DISPLAY but open SUPPORT_EMAIL.
// Override in .env with VITE_SUPPORT_EMAIL / VITE_SUPPORT_EMAIL_DISPLAY.
export const SUPPORT_EMAIL = import.meta.env?.VITE_SUPPORT_EMAIL || 'mauriceyaacoub22@gmail.com';
export const SUPPORT_EMAIL_DISPLAY = import.meta.env?.VITE_SUPPORT_EMAIL_DISPLAY || 'support@clinicfinder.lb';

export const GOVERNORATES = [
  { id: 'beirut', name: 'Beirut', cities: ['Achrafieh', 'Hamra', 'Verdun', 'Ras Beirut', 'Mar Mikhael', 'Mazraa'] },
  { id: 'mount-lebanon', name: 'Mount Lebanon', cities: ['Baabda', 'Hazmieh', 'Jdeideh', 'Antelias', 'Dbayeh', 'Broummana', 'Aley', 'Beiteddine'] },
  { id: 'keserwan-jbeil', name: 'Keserwan-Jbeil', cities: ['Jounieh', 'Kaslik', 'Zouk Mosbeh', 'Ajaltoun', 'Byblos'] },
  { id: 'north', name: 'North', cities: ['Tripoli', 'Zgharta', 'Batroun', 'Amioun', 'Bcharre', 'Minieh'] },
  { id: 'akkar', name: 'Akkar', cities: ['Halba', 'Qobayat', 'Bebnine', 'Andaket'] },
  { id: 'south', name: 'South', cities: ['Sidon', 'Tyre', 'Jezzine', 'Damour'] },
  { id: 'nabatieh', name: 'Nabatieh', cities: ['Nabatieh', 'Marjayoun', 'Bint Jbeil', 'Hasbaya'] },
  { id: 'bekaa', name: 'Bekaa', cities: ['Zahle', 'Chtaura', 'Bar Elias', 'Jeb Jannine', 'Rashaya'] },
  { id: 'baalbek-hermel', name: 'Baalbek-Hermel', cities: ['Baalbek', 'Hermel', 'Ras Baalbek'] },
];

// English name (translate at display with tx()).
export const governorateName = (id) => GOVERNORATES.find((g) => g.id === id)?.name ?? id;
export const citiesOf = (id) => GOVERNORATES.find((g) => g.id === id)?.cities ?? [];

// icon = lucide-react icon name (resolved in components/shared/SpecialtyIcon)
export const DEFAULT_SPECIALTIES = [
  { id: 'general-practice', name: 'General Practice', icon: 'Stethoscope' },
  { id: 'cardiology', name: 'Cardiology', icon: 'HeartPulse' },
  { id: 'dermatology', name: 'Dermatology', icon: 'Sparkles' },
  { id: 'pediatrics', name: 'Pediatrics', icon: 'Baby' },
  { id: 'gynecology', name: 'Gynecology & Obstetrics', icon: 'Flower2' },
  { id: 'orthopedics', name: 'Orthopedics', icon: 'Bone' },
  { id: 'ophthalmology', name: 'Ophthalmology', icon: 'Eye' },
  { id: 'ent', name: 'Ear, Nose & Throat', icon: 'Ear' },
  { id: 'neurology', name: 'Neurology', icon: 'Brain' },
  { id: 'psychiatry', name: 'Psychiatry', icon: 'MessageCircleHeart' },
  { id: 'endocrinology', name: 'Endocrinology', icon: 'Droplets' },
  { id: 'gastroenterology', name: 'Gastroenterology', icon: 'Soup' },
  { id: 'dentistry', name: 'Dentistry', icon: 'Smile' },
  { id: 'urology', name: 'Urology', icon: 'Activity' },
];

export const DEFAULT_INSURERS = [
  { id: 'nssf', name: 'NSSF' },
  { id: 'coop', name: 'COOP' },
  { id: 'allianz-sna', name: 'Allianz SNA' },
  { id: 'axa-me', name: 'AXA Middle East' },
  { id: 'bankers', name: 'Bankers Assurance' },
  { id: 'globemed', name: 'GlobeMed' },
  { id: 'mednet', name: 'MedNet' },
  { id: 'fidelity', name: 'Fidelity Assurance' },
];

export const DEFAULT_LANGUAGES = [
  { id: 'ar', name: 'Arabic' },
  { id: 'en', name: 'English' },
  { id: 'fr', name: 'French' },
  { id: 'hy', name: 'Armenian' },
];

export const CLINIC_TYPES = [
  { id: 'private', name: 'Private clinic' },
  { id: 'medical-center', name: 'Medical center' },
  { id: 'hospital', name: 'Hospital' },
  { id: 'polyclinic', name: 'Polyclinic' },
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ROLES = { PATIENT: 'patient', DOCTOR: 'doctor', ADMIN: 'admin' };

export const USER_STATUS = { ACTIVE: 'active', SUSPENDED: 'suspended', DEACTIVATED: 'deactivated' };

export const VERIFICATION = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };

export const WEEKDAYS = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

export const SLOT_LENGTHS = [15, 20, 30, 45, 60];

// Common medications with an allergen group used for conflict warnings.
export const MEDICATIONS = [
  { name: 'Amoxicillin 500 mg', group: 'penicillin' },
  { name: 'Amoxicillin + Clavulanic acid 1 g', group: 'penicillin' },
  { name: 'Penicillin V 500 mg', group: 'penicillin' },
  { name: 'Azithromycin 500 mg', group: 'macrolide' },
  { name: 'Clarithromycin 500 mg', group: 'macrolide' },
  { name: 'Cefuroxime 500 mg', group: 'cephalosporin' },
  { name: 'Ciprofloxacin 500 mg', group: 'fluoroquinolone' },
  { name: 'Doxycycline 100 mg', group: 'tetracycline' },
  { name: 'Sulfamethoxazole + Trimethoprim', group: 'sulfa' },
  { name: 'Paracetamol 500 mg', group: 'paracetamol' },
  { name: 'Ibuprofen 400 mg', group: 'nsaid' },
  { name: 'Diclofenac 50 mg', group: 'nsaid' },
  { name: 'Naproxen 500 mg', group: 'nsaid' },
  { name: 'Aspirin 100 mg', group: 'nsaid' },
  { name: 'Celecoxib 200 mg', group: 'nsaid' },
  { name: 'Tramadol 50 mg', group: 'opioid' },
  { name: 'Codeine + Paracetamol', group: 'opioid' },
  { name: 'Omeprazole 20 mg', group: 'ppi' },
  { name: 'Esomeprazole 40 mg', group: 'ppi' },
  { name: 'Pantoprazole 40 mg', group: 'ppi' },
  { name: 'Metformin 850 mg', group: 'biguanide' },
  { name: 'Gliclazide 60 mg', group: 'sulfonylurea' },
  { name: 'Atorvastatin 20 mg', group: 'statin' },
  { name: 'Rosuvastatin 10 mg', group: 'statin' },
  { name: 'Amlodipine 5 mg', group: 'ccb' },
  { name: 'Lisinopril 10 mg', group: 'ace-inhibitor' },
  { name: 'Ramipril 5 mg', group: 'ace-inhibitor' },
  { name: 'Losartan 50 mg', group: 'arb' },
  { name: 'Bisoprolol 5 mg', group: 'beta-blocker' },
  { name: 'Furosemide 40 mg', group: 'diuretic' },
  { name: 'Hydrochlorothiazide 25 mg', group: 'sulfa' },
  { name: 'Clopidogrel 75 mg', group: 'antiplatelet' },
  { name: 'Levothyroxine 50 mcg', group: 'thyroid' },
  { name: 'Salbutamol inhaler 100 mcg', group: 'bronchodilator' },
  { name: 'Fluticasone nasal spray', group: 'corticosteroid' },
  { name: 'Prednisolone 5 mg', group: 'corticosteroid' },
  { name: 'Cetirizine 10 mg', group: 'antihistamine' },
  { name: 'Loratadine 10 mg', group: 'antihistamine' },
  { name: 'Sertraline 50 mg', group: 'ssri' },
  { name: 'Escitalopram 10 mg', group: 'ssri' },
  { name: 'Vitamin D3 50,000 IU', group: 'vitamin' },
  { name: 'Ferrous sulfate 325 mg', group: 'iron' },
  { name: 'Folic acid 5 mg', group: 'vitamin' },
  { name: 'Metronidazole 500 mg', group: 'nitroimidazole' },
  { name: 'Tamsulosin 0.4 mg', group: 'alpha-blocker' },
  { name: 'Isotretinoin 20 mg', group: 'retinoid' },
  { name: 'Latanoprost eye drops', group: 'prostaglandin' },
];

// Allergy keywords → allergen groups.
export const ALLERGY_GROUPS = {
  penicillin: ['penicillin', 'amoxicillin', 'ampicillin', 'beta-lactam'],
  cephalosporin: ['cephalosporin', 'cef'],
  sulfa: ['sulfa', 'sulfonamide', 'sulphonamide'],
  nsaid: ['nsaid', 'aspirin', 'ibuprofen', 'diclofenac', 'naproxen'],
  macrolide: ['macrolide', 'azithromycin', 'erythromycin', 'clarithromycin'],
  opioid: ['opioid', 'codeine', 'morphine', 'tramadol'],
  fluoroquinolone: ['quinolone', 'ciprofloxacin', 'levofloxacin'],
  tetracycline: ['tetracycline', 'doxycycline'],
  paracetamol: ['paracetamol', 'acetaminophen'],
  'ace-inhibitor': ['ace inhibitor', 'lisinopril', 'ramipril'],
  statin: ['statin'],
};

export const FREQUENCIES = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 8 hours', 'Every 12 hours', 'At bedtime', 'As needed', 'Once weekly',
];

export const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '3 months', 'Ongoing'];
