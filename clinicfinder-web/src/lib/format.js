import { getLang } from './i18n';

// USD by default. French shows "80 $", Arabic keeps "$80" with Latin digits (common usage in Lebanon).
export const currency = (n, cur = 'USD') =>
  new Intl.NumberFormat(getLang() === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(Number(n) || 0);

export const initials = (name = '') =>
  name.replace(/^Dr\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const cx = (...parts) => parts.filter(Boolean).join(' ');

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Prescription verification code: RX-XXXX-NN */
export function rxCode(rand = Math.random) {
  let mid = '';
  for (let i = 0; i < 4; i++) mid += ALPHA[Math.floor(rand() * ALPHA.length)];
  const nn = String(Math.floor(rand() * 100)).padStart(2, '0');
  return `RX-${mid}-${nn}`;
}
export const RX_RE = /^RX-[A-Z0-9]{4}-\d{2}$/;

export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Deterministic gradient for avatars
const HUES = [172, 186, 199, 160, 210, 150, 192, 220];
export const hueFor = (s = '') => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];

export const truncate = (s = '', n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
