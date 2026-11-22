// Localization core.
// Most UI text uses the English source string as its key: tx('Save changes') looks the string up in
// the active language's dictionary (src/lib/locales/*.js) and falls back to English when missing.
// Placeholders use {name}: tx('Book {0}', { 0: doctor.name }).
// A few navigation/landing strings use the short ids in DICT below.
import FR from './locales/fr';
import AR from './locales/ar';

export const LANGS = [
  { id: 'en', label: 'English', short: 'EN', dir: 'ltr' },
  { id: 'fr', label: 'Français', short: 'FR', dir: 'ltr' },
  { id: 'ar', label: 'العربية', short: 'ع', dir: 'rtl' },
];

const SOURCES = { fr: FR, ar: AR };
const LOCALES = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-LB-u-nu-latn' };

let current = (() => { try { return localStorage.getItem('clinicfinder_lang') || 'en'; } catch { return 'en'; } })();
export const getLang = () => current;
export const setCurrentLang = (l) => { current = SOURCES[l] || l === 'en' ? l : 'en'; };
/** BCP-47 locale for Intl formatting of the active language (Latin digits for Arabic, as used in Lebanon). */
export const getLocale = () => LOCALES[current] || 'en-GB';

// Values like "@@when:2026-11-17T14:30@@" are formatted in the reader's language at display time,
// so a stored notification shows dates in whoever reads it's language.
let whenFormatter = (date, time) => `${date} ${time}`;
export const registerWhenFormatter = (fn) => { whenFormatter = fn; };
export const whenToken = (date, time) => `@@when:${date}T${time}@@`;
export const dateToken = (date) => `@@date:${date}@@`;
const renderVar = (v) => {
  if (typeof v !== 'string') return String(v);
  const tokens = v
    .replace(/@@when:(\d{4}-\d\d-\d\d)T(\d\d:\d\d)@@/g, (m, d, t) => whenFormatter(d, t))
    // Date-only token, e.g. a follow-up day: "@@date:2026-12-24@@".
    .replace(/@@date:(\d{4}-\d\d-\d\d)@@/g, (m, d) => new Date(`${d}T12:00:00`).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }));
  // Variables that are themselves known UI terms (a specialty, a status…) are translated too.
  const out = SOURCES[current]?.[tokens] ?? tokens;
  // In Arabic, isolate Latin-script values (names, clinics) so neighbouring punctuation
  // stays on the correct side: "مساء الخير، Nadine." instead of ".Nadine".
  return current === 'ar' && /[A-Za-z]/.test(out) ? `\u2068${out}\u2069` : out;
};
const interpolate = (str, vars) => {
  const out = vars ? str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? renderVar(vars[k]) : m)) : str;
  return out.includes('@@when:') || out.includes('@@date:') ? renderVar(out) : out;
};

/** Translate an English source string (or a DICT id) into the active language. */
// Developer aid: localStorage.clinicfinder_pseudo = '1' wraps every translated string in ⟦…⟧,
// so any text still shown without brackets is not going through the translation layer.
const PSEUDO = (() => { try { return localStorage.getItem('clinicfinder_pseudo') === '1'; } catch { return false; } })();

export function tx(source, vars) {
  if (source === null || source === undefined || source === '') return source;
  if (typeof source !== 'string') return source;
  if (PSEUDO && current === 'en') return source.startsWith('⟦') ? source : `⟦${interpolate(source, vars)}⟧`;
  const legacy = DICT[current]?.[source] ?? DICT.en[source];
  if (legacy !== undefined) return interpolate(legacy, vars);
  const hit = current === 'en' ? undefined : SOURCES[current]?.[source];
  return interpolate(hit ?? source, vars);
}

/** Is there a translation for this string in the active language? (used by the translation audit) */
export const hasTranslation = (source) => current === 'en' || SOURCES[current]?.[source] !== undefined || DICT[current]?.[source] !== undefined;

export const DICT = {
  en: {
    'nav.findDoctor': 'Find a doctor', 'nav.specialties': 'Specialties', 'nav.howItWorks': 'How it works', 'nav.forDoctors': 'For doctors', 'nav.verify': 'Verify a prescription',
    'nav.signIn': 'Sign in', 'nav.signUp': 'Create account', 'nav.dashboard': 'Go to dashboard',
    'nav.overview': 'Overview', 'nav.search': 'Find a doctor', 'nav.appointments': 'Appointments', 'nav.prescriptions': 'Prescriptions', 'nav.settings': 'Settings',
    'nav.patients': 'Patients', 'nav.schedule': 'Availability', 'nav.profile': 'Practice profile', 'nav.newRx': 'New prescription',
    'nav.verifications': 'Verifications', 'nav.users': 'Users', 'nav.clinics': 'Clinics', 'nav.catalog': 'Catalog', 'nav.signOut': 'Sign out', 'nav.notifications': 'Notifications',
    'hero.title': 'The right doctor in Lebanon, a few taps away.',
    'hero.lede': 'Search verified doctors across all nine governorates by specialty, price, language and insurance — then book a real, open slot and keep your prescriptions in one place.',
    'hero.searchLabel': 'Doctor or specialty', 'hero.searchPh': 'e.g. cardiologist, Dr. Haddad', 'hero.where': 'Where', 'hero.anywhere': 'All of Lebanon', 'hero.when': 'When', 'hero.anytime': 'Any time', 'hero.today': 'Today', 'hero.week': 'This week', 'hero.search': 'Search',
    'common.save': 'Save changes', 'common.cancel': 'Cancel', 'common.language': 'Language',
  },
  fr: {
    'nav.findDoctor': 'Trouver un médecin', 'nav.specialties': 'Spécialités', 'nav.howItWorks': 'Comment ça marche', 'nav.forDoctors': 'Médecins', 'nav.verify': 'Vérifier une ordonnance',
    'nav.signIn': 'Se connecter', 'nav.signUp': 'Créer un compte', 'nav.dashboard': 'Mon espace',
    'nav.overview': 'Accueil', 'nav.search': 'Trouver un médecin', 'nav.appointments': 'Rendez-vous', 'nav.prescriptions': 'Ordonnances', 'nav.settings': 'Paramètres',
    'nav.patients': 'Patients', 'nav.schedule': 'Disponibilités', 'nav.profile': 'Profil du cabinet', 'nav.newRx': 'Nouvelle ordonnance',
    'nav.verifications': 'Vérifications', 'nav.users': 'Utilisateurs', 'nav.clinics': 'Cliniques', 'nav.catalog': 'Catalogue', 'nav.signOut': 'Se déconnecter', 'nav.notifications': 'Notifications',
    'hero.title': 'Le bon médecin au Liban, en quelques clics.',
    'hero.lede': 'Cherchez des médecins vérifiés dans les neuf mohafazats par spécialité, tarif, langue et assurance — réservez un vrai créneau libre et gardez vos ordonnances au même endroit.',
    'hero.searchLabel': 'Médecin ou spécialité', 'hero.searchPh': 'ex. cardiologue, Dr Haddad', 'hero.where': 'Où', 'hero.anywhere': 'Tout le Liban', 'hero.when': 'Quand', 'hero.anytime': 'N’importe quand', 'hero.today': 'Aujourd’hui', 'hero.week': 'Cette semaine', 'hero.search': 'Rechercher',
    'common.save': 'Enregistrer', 'common.cancel': 'Annuler', 'common.language': 'Langue',
  },
  ar: {
    'nav.findDoctor': 'ابحث عن طبيب', 'nav.specialties': 'الاختصاصات', 'nav.howItWorks': 'كيف يعمل', 'nav.forDoctors': 'للأطباء', 'nav.verify': 'التحقق من وصفة',
    'nav.signIn': 'تسجيل الدخول', 'nav.signUp': 'إنشاء حساب', 'nav.dashboard': 'لوحتي',
    'nav.overview': 'الرئيسية', 'nav.search': 'ابحث عن طبيب', 'nav.appointments': 'المواعيد', 'nav.prescriptions': 'الوصفات', 'nav.settings': 'الإعدادات',
    'nav.patients': 'المرضى', 'nav.schedule': 'أوقات العمل', 'nav.profile': 'ملف العيادة', 'nav.newRx': 'وصفة جديدة',
    'nav.verifications': 'التحقق', 'nav.users': 'المستخدمون', 'nav.clinics': 'العيادات', 'nav.catalog': 'القوائم', 'nav.signOut': 'تسجيل الخروج', 'nav.notifications': 'الإشعارات',
    'hero.title': 'الطبيب المناسب في لبنان، بنقرات قليلة.',
    'hero.lede': 'ابحث عن أطباء موثّقين في المحافظات التسع حسب الاختصاص والسعر واللغة والتأمين، ثم احجز موعدًا متاحًا فعلًا واحتفظ بوصفاتك في مكان واحد.',
    'hero.searchLabel': 'طبيب أو اختصاص', 'hero.searchPh': 'مثلاً: طبيب قلب، د. حداد', 'hero.where': 'أين', 'hero.anywhere': 'كل لبنان', 'hero.when': 'متى', 'hero.anytime': 'أي وقت', 'hero.today': 'اليوم', 'hero.week': 'هذا الأسبوع', 'hero.search': 'بحث',
    'common.save': 'حفظ التغييرات', 'common.cancel': 'إلغاء', 'common.language': 'اللغة',
  },
};
