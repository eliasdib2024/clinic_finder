import { describe, it, expect } from 'vitest';
import { email, lebanesePhone, normalizeLebanesePhone, password, passwordStrength, licenseNumber, confirmPassword, validate, required } from '../../src/lib/validators';
import { transitionError, canTransition } from '../../src/lib/lifecycle';
import { allergyConflicts } from '../../src/lib/allergies';
import { rxCode, RX_RE } from '../../src/lib/format';
import { setNow } from '../../src/lib/dates';

describe('validators', () => {
  it('validates email', () => {
    expect(email('a@b.lb')).toBe('');
    expect(email('nope')).not.toBe('');
    expect(email('')).toMatch(/required/);
  });

  it('accepts Lebanese mobile and landline formats', () => {
    for (const n of ['03 123 456', '+961 3 123 456', '71123456', '+96170123456', '0096181123456', '01 345 678', '+961 1 345 678', '09-223344'])
      expect(lebanesePhone(n), n).toBe('');
    expect(normalizeLebanesePhone('03 123 456')).toBe('+9613123456');
    expect(normalizeLebanesePhone('76 555 444')).toBe('+96176555444');
  });

  it('rejects non-Lebanese numbers', () => {
    for (const n of ['+1 415 555 0101', '12345', '72123456', '0312345', 'abc']) expect(lebanesePhone(n), n).not.toBe('');
    expect(lebanesePhone('', { optional: true })).toBe('');
  });

  it('enforces the password policy and scores strength', () => {
    expect(password('Patient@123')).toBe('');
    expect(password('weak')).toMatch(/uppercase/);
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('abc').score).toBeLessThan(2);
    expect(passwordStrength('Very$trongPass2026').score).toBe(4);
    expect(confirmPassword('a', 'b')).toMatch(/match/);
  });

  it('validates license numbers and schemas', () => {
    expect(licenseNumber('12345')).toBe('');
    expect(licenseNumber('12a')).not.toBe('');
    expect(validate({ name: '' }, { name: (v) => required(v, 'Name') })).toEqual({ name: 'Name is required.' });
  });
});

describe('appointment lifecycle', () => {
  it('allows only documented transitions', () => {
    setNow(new Date(2026, 10, 16, 9));
    const p = { status: 'pending', date: '2026-11-16' };
    expect(canTransition(p, 'confirmed')).toBe(true);
    expect(canTransition(p, 'declined')).toBe(true);
    expect(canTransition(p, 'completed')).toBe(false);
    const c = { status: 'confirmed', date: '2026-11-16' };
    expect(canTransition(c, 'completed')).toBe(true);
    expect(canTransition(c, 'no-show')).toBe(true);
    for (const s of ['completed', 'cancelled', 'declined', 'no-show']) expect(transitionError({ status: s, date: '2026-11-16' }, 'confirmed')).toMatch(/no longer/);
    setNow(null);
  });

  it('blocks completed/no-show before the appointment date', () => {
    setNow(new Date(2026, 10, 16, 9));
    expect(transitionError({ status: 'confirmed', date: '2026-11-20' }, 'completed')).toMatch(/before its date/);
    setNow(null);
  });
});

describe('helpers', () => {
  it('detects allergy conflicts by group and name', () => {
    expect(allergyConflicts('Amoxicillin 500 mg', ['Penicillin'])).toEqual(['Penicillin']);
    expect(allergyConflicts('Ibuprofen 400 mg', ['Aspirin'])).toEqual(['Aspirin']);
    expect(allergyConflicts('Paracetamol 500 mg', ['Penicillin'])).toEqual([]);
  });

  it('generates RX codes in the documented format', () => {
    for (let i = 0; i < 50; i++) expect(rxCode()).toMatch(RX_RE);
  });
});
