import { ALLERGY_GROUPS, MEDICATIONS } from './constants';

const groupOf = (medName) => {
  const m = MEDICATIONS.find((x) => x.name.toLowerCase() === String(medName).toLowerCase());
  return m?.group;
};

/** Returns the patient allergies that conflict with a medication name. */
export function allergyConflicts(medName, allergies = []) {
  if (!medName) return [];
  const name = medName.toLowerCase();
  const group = groupOf(medName);
  return allergies.filter((raw) => {
    const a = raw.toLowerCase().trim();
    if (!a) return false;
    if (name.includes(a)) return true;
    for (const [g, words] of Object.entries(ALLERGY_GROUPS)) {
      if (words.some((w) => a.includes(w))) {
        if (group === g) return true;
        if (words.some((w) => name.includes(w))) return true;
      }
    }
    return false;
  });
}
