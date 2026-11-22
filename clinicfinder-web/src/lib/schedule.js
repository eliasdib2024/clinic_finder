import { tx } from './i18n';
// Slot engine — pure functions shared by the UI and the mock backend.
// A real backend must re-run the same rules authoritatively at booking time.
import { addDays, dateTime, now, timeToMinutes, minutesToTime, toISODate, weekdayKey, diffDays } from './dates';
import { WEEKDAYS } from './constants';

export const ACTIVE_STATUSES = ['pending', 'confirmed'];
export const MIN_LEAD_MINUTES = 15;
export const NEXT_AVAILABLE_DAYS = 21;
export const BOOKING_WINDOW_DAYS = 14;
export const DEFAULT_SLOT_LENGTH = 30;

const day = (enabled, start = '09:00', end = '17:00', breaks = [{ start: '13:00', end: '14:00' }]) => ({ enabled, start, end, breaks });

export const defaultSchedule = () => ({
  mon: day(true), tue: day(true), wed: day(true), thu: day(true), fri: day(true),
  sat: day(true, '09:00', '13:00', []), sun: day(false, '09:00', '13:00', []),
});

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

/** Is the date blocked by the doctor (holiday, conference...)? */
export const isBlocked = (doctor, iso) => (doctor.blockedDates || []).some((b) => (typeof b === 'string' ? b : b.date) === iso);

/** All theoretical slot start times for a weekday config, ignoring bookings. */
export const daySlots = (dayCfg, slotLength = DEFAULT_SLOT_LENGTH) => {
  if (!dayCfg || !dayCfg.enabled) return [];
  const start = timeToMinutes(dayCfg.start);
  const end = timeToMinutes(dayCfg.end);
  const len = Number(slotLength) || DEFAULT_SLOT_LENGTH;
  const breaks = (dayCfg.breaks || []).map((b) => [timeToMinutes(b.start), timeToMinutes(b.end)]);
  const out = [];
  for (let t = start; t + len <= end; t += len) {
    if (breaks.some(([bs, be]) => overlaps(t, t + len, bs, be))) continue;
    out.push(minutesToTime(t));
  }
  return out;
};

/**
 * Bookable slots for one doctor on one date.
 * @param doctor       { schedule, slotLength, blockedDates }
 * @param iso          'YYYY-MM-DD'
 * @param appointments appointments of this doctor (any status); only Pending/Confirmed block
 * @param opts.ignoreAppointmentId  exclude one booking (used when rescheduling it)
 * @returns [{ time, period: 'morning'|'afternoon' }]
 */
export function generateSlots(doctor, iso, appointments = [], opts = {}) {
  const current = opts.now || now();
  const today = toISODate(current);
  if (diffDays(iso, today) < 0) return [];
  if (isBlocked(doctor, iso)) return [];
  const cfg = doctor.schedule?.[weekdayKey(iso)];
  const len = Number(doctor.slotLength) || DEFAULT_SLOT_LENGTH;
  const taken = appointments
    .filter((a) => a.date === iso && ACTIVE_STATUSES.includes(a.status) && a.id !== opts.ignoreAppointmentId)
    .map((a) => [timeToMinutes(a.time), timeToMinutes(a.time) + (a.duration || len)]);
  const minStart = new Date(current.getTime() + MIN_LEAD_MINUTES * 60000);

  return daySlots(cfg, len)
    .filter((t) => {
      const s = timeToMinutes(t);
      if (taken.some(([as, ae]) => overlaps(s, s + len, as, ae))) return false;
      if (iso === today && dateTime(iso, t) <= minStart) return false;
      return true;
    })
    .map((time) => ({ time, period: timeToMinutes(time) < 12 * 60 ? 'morning' : 'afternoon' }));
}

/** Is a specific slot bookable right now? */
export const isSlotAvailable = (doctor, iso, time, appointments, opts) =>
  generateSlots(doctor, iso, appointments, opts).some((s) => s.time === time);

/** First free slot within `days` days (default 21). Returns { date, time } or null. */
export function nextAvailable(doctor, appointments = [], days = NEXT_AVAILABLE_DAYS, opts = {}) {
  const start = toISODate(opts.now || now());
  for (let i = 0; i < days; i++) {
    const iso = addDays(start, i);
    const slots = generateSlots(doctor, iso, appointments, opts);
    if (slots.length) return { date: iso, time: slots[0].time };
  }
  return null;
}

/** Map of date → number of free slots over the next `days` days. */
export function availabilityMap(doctor, appointments = [], days = BOOKING_WINDOW_DAYS, opts = {}) {
  const start = toISODate(opts.now || now());
  const out = {};
  for (let i = 0; i < days; i++) {
    const iso = addDays(start, i);
    out[iso] = generateSlots(doctor, iso, appointments, opts).length;
  }
  return out;
}

/** Theoretical weekly capacity — powers the live slot counter in the availability editor. */
export const weeklySlotCount = (schedule, slotLength) =>
  WEEKDAYS.reduce((sum, { key }) => sum + daySlots(schedule?.[key], slotLength).length, 0);

/** Validate a weekly schedule; returns { [dayKey]: message } */
export function validateSchedule(schedule) {
  const errors = {};
  for (const { key, label } of WEEKDAYS) {
    const d = schedule[key];
    if (!d?.enabled) continue;
    const s = timeToMinutes(d.start);
    const e = timeToMinutes(d.end);
    if (e <= s) { errors[key] = tx('{0}: end time must be after start time.', {
      0: label
    }); continue; }
    for (const b of d.breaks || []) {
      const bs = timeToMinutes(b.start);
      const be = timeToMinutes(b.end);
      if (be <= bs) { errors[key] = tx('{0}: a break ends before it starts.', {
        0: label
      }); break; }
      if (bs < s || be > e) { errors[key] = tx('{0}: breaks must be within working hours.', {
        0: label
      }); break; }
    }
  }
  return errors;
}
