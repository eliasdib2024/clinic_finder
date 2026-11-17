// Date helpers. All calendar dates are local "YYYY-MM-DD" strings and times are "HH:MM".
import { tx, getLocale, getLang, registerWhenFormatter } from './i18n';

let clockOverride = null;
/** Current time. Tests can freeze it with setNow(). */
export const now = () => (clockOverride ? new Date(clockOverride) : new Date());
export const setNow = (d) => { clockOverride = d ? new Date(d).getTime() : null; };

const pad = (n) => String(n).padStart(2, '0');

export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISODate(now());

export const parseISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso, n) => {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

export const diffDays = (a, b) => Math.round((parseISODate(a) - parseISODate(b)) / 86400000);

export const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const minutesToTime = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

const KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const weekdayKey = (iso) => KEYS[parseISODate(iso).getDay()];

export const dateTime = (iso, time = '00:00') => {
  const d = parseISODate(iso);
  const mins = timeToMinutes(time);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
};

export const isPast = (iso, time) => dateTime(iso, time) < now();

export const formatDate = (iso, opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, locale = getLocale()) =>
  parseISODate(iso).toLocaleDateString(locale, opts);

export const formatDay = (iso, locale = getLocale()) => formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short' }, locale);

export const formatTime = (t) => {
  const mins = timeToMinutes(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (getLang() === 'fr') return `${pad(h)}:${pad(m)}`;
  if (getLang() === 'ar') return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? 'م' : 'ص'}`;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)} ${suffix}`;
};

/** Short weekday / month names in the active language. */
export const weekdayShort = (iso) => parseISODate(iso).toLocaleDateString(getLocale(), { weekday: 'short' });
export const monthShort = (iso) => parseISODate(iso).toLocaleDateString(getLocale(), { month: 'short' });

export const relativeDay = (iso) => {
  const d = diffDays(iso, todayISO());
  if (d === 0) return tx('Today');
  if (d === 1) return tx('Tomorrow');
  if (d === -1) return tx('Yesterday');
  if (d > 1 && d < 7) return tx('In {n} days', { n: d });
  if (d < -1 && d > -7) return tx('{n} days ago', { n: -d });
  return formatDate(iso, { day: 'numeric', month: 'short' });
};

export const timeAgo = (ts) => {
  const s = Math.floor((now() - new Date(ts)) / 1000);
  if (s < 60) return tx('just now');
  const m = Math.floor(s / 60);
  if (m < 60) return tx('{n} min ago', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return tx('{n} h ago', { n: h });
  const d = Math.floor(h / 24);
  if (d < 30) return tx('{n} d ago', { n: d });
  return new Date(ts).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
};

export const greeting = () => {
  const h = now().getHours();
  if (h < 12) return tx('Good morning');
  if (h < 18) return tx('Good afternoon');
  return tx('Good evening');
};

export const nextDays = (count, from = todayISO()) => Array.from({ length: count }, (_, i) => addDays(from, i));

/** "Tue 17 Nov at 2:30 PM" in the active language. */
export const formatWhen = (date, time) => tx('{0} at {1}', { 0: formatDay(date), 1: formatTime(time) });
registerWhenFormatter(formatWhen);
