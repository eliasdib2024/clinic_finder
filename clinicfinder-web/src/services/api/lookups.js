// Reference data from GET /lookups, loaded once and kept in memory.
// The forms still use the app's own ids (e.g. 'cardiology', 'beirut' + 'Hamra', 'nssf');
// these helpers translate them to the database ids the API expects, by matching names.
import { http } from '../http';
import { getDb } from '../db';
import { GOVERNORATES } from '../../lib/constants';

let cache = null;
export const loadLookups = async () => (cache ??= await http.get('/lookups').catch((e) => { cache = null; throw e; }));

const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const appName = (list, id) => list.find((x) => x.id === id)?.name ?? id;

export async function specialtyIdFor(appSpecialtyId) {
  const { specialties } = await loadLookups();
  const name = appName(getDb().catalog.specialties, appSpecialtyId);
  return specialties.find((s) => same(s.name, name))?.id ?? null;
}

export async function cityIdFor(governorateSlug, cityName) {
  if (!governorateSlug || !cityName) return null;
  const { governorates } = await loadLookups();
  const gName = GOVERNORATES.find((g) => g.id === governorateSlug)?.name;
  const g = governorates.find((x) => same(x.name, gName));
  return g?.cities.find((c) => same(c.name, cityName))?.id ?? null;
}

export async function bloodTypeIdFor(name) {
  if (!name) return null;
  const { bloodTypes } = await loadLookups();
  return bloodTypes.find((b) => same(b.name, name))?.id ?? null;
}

export async function insuranceIdFor(appInsurerId) {
  if (!appInsurerId) return null;
  const { insurances } = await loadLookups();
  const name = appName(getDb().catalog.insurers, appInsurerId);
  return insurances.find((i) => same(i.name, name))?.id ?? null;
}

// Reverse direction (API → app ids), used when showing an API user in the app
export const appSpecialtyId = (name) => getDb().catalog.specialties.find((s) => same(s.name, name))?.id ?? '';
export const appInsurerId = (name) => (name ? getDb().catalog.insurers.find((i) => same(i.name, name))?.id ?? '' : '');
export const appGovernorateId = (name) => (name ? GOVERNORATES.find((g) => same(g.name, name))?.id ?? '' : '');

// ---- profile fields (Settings → Profile, practice profile) ----

const GENDER_NAMES = { f: 'Female', m: 'Male' };

/** 'f' | 'm' | '' → the API gender id (null = prefer not to say) */
export async function genderIdFor(appGender) {
  if (!appGender) return null;
  const { genders } = await loadLookups();
  return genders.find((g) => same(g.name, GENDER_NAMES[appGender]))?.id ?? null;
}

/** App clinic id (from the clinic list) → API clinic id, matched by name */
export async function clinicIdFor(appClinicId) {
  if (!appClinicId) return null;
  const { clinics } = await loadLookups();
  const name = getDb().clinics.find((c) => c.id === appClinicId)?.name;
  return clinics.find((c) => same(c.name, name))?.id ?? null;
}

/** App language ids ('ar', 'en'…) → API language ids */
export async function languageIdsFor(appIds = []) {
  const { languages } = await loadLookups();
  const names = appIds.map((id) => appName(getDb().catalog.languages, id));
  return names.map((n) => languages.find((l) => same(l.name, n))?.id).filter(Boolean);
}

/** App insurer ids ('nssf'…) → API insurance ids */
export async function insuranceIdsFor(appIds = []) {
  return (await Promise.all(appIds.map(insuranceIdFor))).filter(Boolean);
}

// Reverse direction, used by the bridge
export const appGender = (gender) => (gender ? Object.keys(GENDER_NAMES).find((k) => same(GENDER_NAMES[k], gender.name)) ?? '' : '');
export const appClinicId = (name) => (name ? getDb().clinics.find((c) => same(c.name, name))?.id ?? null : null);
export const appLanguageId = (name) => getDb().catalog.languages.find((l) => same(l.name, name))?.id;
