import { tx } from './i18n';
// Form validators. Each returns an error message string, or '' when valid.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const required = (v, label = 'This field') =>
  (v === undefined || v === null || String(v).trim() === '' ? tx('{0} is required.', { 0: tx(label) }) : '');

export const email = (v) => {
  if (!v || !String(v).trim()) return tx('Email is required.');
  return EMAIL_RE.test(String(v).trim()) ? '' : tx('Enter a valid email address.');
};

/** Normalise a Lebanese phone number to +961XXXXXXX(X). Returns null if invalid. */
export function normalizeLebanesePhone(input) {
  if (!input) return null;
  let d = String(input).replace(/[\s\-().]/g, '');
  if (d.startsWith('+961')) d = d.slice(4);
  else if (d.startsWith('00961')) d = d.slice(5);
  else if (d.startsWith('961') && d.length >= 10) d = d.slice(3);
  if (!/^\d+$/.test(d)) return null;
  // Mobile: 70 71 76 78 79 81 + 6 digits (8 digits total), or 03 + 6 digits
  if (/^(70|71|76|78|79|81)\d{6}$/.test(d)) return `+961${d}`;
  if (/^0?3\d{6}$/.test(d)) return `+9613${d.slice(-6)}`;
  // Landlines: area codes 01 04 05 06 07 08 09 + 6 digits
  if (/^0?[1456789]\d{6}$/.test(d)) return `+961${d.replace(/^0/, '')}`;
  return null;
}

export const lebanesePhone = (v, { optional = false } = {}) => {
  if (!v || !String(v).trim()) return optional ? '' : tx('Phone number is required.');
  return normalizeLebanesePhone(v) ? '' : tx('Enter a valid Lebanese number, e.g. 03 123 456 or +961 71 123 456.');
};

export const formatLebanesePhone = (v) => {
  const n = normalizeLebanesePhone(v);
  if (!n) return v || '';
  const d = n.slice(4);
  if (d.length === 8) return `+961 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `+961 ${d.slice(0, 1)} ${d.slice(1, 4)} ${d.slice(4)}`;
};

export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: 'One number', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'One symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Score 0–4 and label for the strength meter. */
export function passwordStrength(p = '') {
  if (!p) return { score: 0, label: '', passed: [] };
  const passed = PASSWORD_RULES.filter((r) => r.test(p)).map((r) => r.id);
  let score = Math.max(0, passed.length - 1);
  if (p.length >= 12 && passed.length === 5) score = 4;
  else score = Math.min(score, 3);
  if (/^(.)\1+$/.test(p) || /password|123456|qwerty/i.test(p)) score = Math.min(score, 1);
  const label = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
  return { score, label, passed };
}

export const password = (p) => {
  if (!p) return tx('Password is required.');
  const failed = PASSWORD_RULES.filter((r) => !r.test(p));
  return failed.length ? tx('Password needs: {0}.', {
    0: failed.map((r) => tx(r.label).toLowerCase()).join(', ')
  }) : '';
};

export const confirmPassword = (p, c) => (!c ? tx('Please confirm your password.') : p !== c ? tx('Passwords do not match.') : '');

/** Lebanese Order of Physicians registration number (demo format: 4–6 digits). */
export const licenseNumber = (v) => {
  if (!v || !String(v).trim()) return tx('License number is required.');
  return /^\d{4,6}$/.test(String(v).trim()) ? '' : tx('Enter your Order of Physicians number (4–6 digits).');
};

export const fee = (v) => {
  const n = Number(v);
  if (v === '' || v === null || Number.isNaN(n)) return tx('Enter a consultation fee.');
  if (n < 0 || n > 1000) return tx('Fee must be between $0 and $1,000.');
  return '';
};

export const minLength = (v, n, label = 'This field') => (String(v || '').trim().length < n ? tx('{0} must be at least {1} characters.', { 0: tx(label), 1: n }) : '');

export const code6 = (v) => (/^\d{6}$/.test(v || '') ? '' : tx('Enter the 6-digit code.'));

/** Run a schema { field: (value, values) => msg } and return { field: msg } for failures. */
export function validate(values, schema) {
  const errors = {};
  for (const [key, fn] of Object.entries(schema)) {
    const msg = fn(values[key], values);
    if (msg) errors[key] = msg;
  }
  return errors;
}
