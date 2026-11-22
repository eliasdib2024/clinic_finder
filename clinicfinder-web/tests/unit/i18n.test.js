import { describe, it, expect, afterEach } from 'vitest';
import { tx, setCurrentLang, whenToken } from '../../src/lib/i18n';
import { formatTime, relativeDay, setNow } from '../../src/lib/dates';
import { currency } from '../../src/lib/format';
import FR from '../../src/lib/locales/fr';
import AR from '../../src/lib/locales/ar';

afterEach(() => { setCurrentLang('en'); setNow(null); });

describe('translations', () => {
  it('returns English when no language is set and falls back for unknown strings', () => {
    setCurrentLang('en');
    expect(tx('Save changes')).toBe('Save changes');
    setCurrentLang('fr');
    expect(tx('A string nobody translated')).toBe('A string nobody translated');
  });

  it('translates into French and Arabic with placeholders', () => {
    setCurrentLang('fr');
    expect(tx('Save changes')).toBe('Enregistrer les modifications');
    expect(tx('{0} doctors found', { 0: 12 })).toBe('12 médecins trouvés');
    setCurrentLang('ar');
    expect(tx('Save changes')).toBe('حفظ التغييرات');
    expect(tx('Book {0}', { 0: 'Dr. Lina Khoury' })).toBe('احجز \u2068Dr. Lina Khoury\u2069');
    // Latin names are bidi-isolated so trailing punctuation stays on the Arabic side.
    expect(tx('{0}, {1}.', { 0: 'مساء الخير', 1: 'Nadine' })).toBe('مساء الخير، \u2068Nadine\u2069.');
    // Arabic-script values are left untouched.
    expect(tx('Book {0}', { 0: 'د. لينا' })).toBe('احجز د. لينا');
  });

  it('translates variables that are known terms (specialties, cities)', () => {
    setCurrentLang('ar');
    expect(tx('Highly rated doctors who accept {0}.', { 0: 'NSSF' })).toContain('الضمان الاجتماعي');
    setCurrentLang('fr');
    expect(tx('{0} is required.', { 0: tx('Full name') })).toBe('Nom complet est obligatoire.');
  });

  it('renders stored date tokens in the reader’s language', () => {
    setCurrentLang('fr');
    const fr = tx('{0} confirmed your visit on {1}.', { 0: 'Dr. Haddad', 1: whenToken('2026-11-17', '14:30') });
    expect(fr).toMatch(/Dr\. Haddad a confirmé votre consultation du .*17 nov.* à 14:30\./);
    setCurrentLang('ar');
    const ar = tx('{0} confirmed your visit on {1}.', { 0: 'Dr. Haddad', 1: whenToken('2026-11-17', '14:30') });
    expect(ar).toContain('2:30 م');
  });

  it('formats times, relative days and currency per language', () => {
    setNow(new Date(2026, 10, 16, 9));
    setCurrentLang('en'); expect(formatTime('14:30')).toBe('2:30 PM'); expect(relativeDay('2026-11-17')).toBe('Tomorrow');
    setCurrentLang('fr'); expect(formatTime('14:30')).toBe('14:30'); expect(relativeDay('2026-11-17')).toBe('Demain'); expect(currency(80)).toMatch(/80\s?\$/);
    setCurrentLang('ar'); expect(formatTime('09:00')).toBe('9:00 ص'); expect(relativeDay('2026-11-19')).toBe('بعد 3 أيام');
  });

  it('keeps French and Arabic dictionaries aligned with matching placeholders', () => {
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    expect(Object.keys(FR).sort()).toEqual(Object.keys(AR).sort());
    for (const k of Object.keys(FR)) {
      expect(ph(FR[k]), `fr: ${k}`).toBe(ph(k));
      expect(ph(AR[k]), `ar: ${k}`).toBe(ph(k));
    }
    expect(Object.keys(FR).length).toBeGreaterThan(1300);
  });
});
