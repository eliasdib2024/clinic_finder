import { describe, it, expect, afterEach } from 'vitest';
import { generateSlots, nextAvailable, daySlots, weeklySlotCount, validateSchedule, defaultSchedule, availabilityMap } from '../../src/lib/schedule';
import { setNow, addDays } from '../../src/lib/dates';

// Monday 16 Nov 2026, 08:00 local
const MONDAY = new Date(2026, 10, 16, 8, 0);
const doctor = (over = {}) => ({ schedule: defaultSchedule(), slotLength: 30, blockedDates: [], ...over });

afterEach(() => setNow(null));

describe('slot engine', () => {
  it('generates slots stepping by slot length and skips breaks', () => {
    const slots = daySlots({ enabled: true, start: '09:00', end: '12:00', breaks: [{ start: '10:00', end: '10:30' }] }, 30);
    expect(slots).toEqual(['09:00', '09:30', '10:30', '11:00', '11:30']);
  });

  it('respects a custom slot length and never overruns the end time', () => {
    expect(daySlots({ enabled: true, start: '09:00', end: '10:10', breaks: [] }, 20)).toEqual(['09:00', '09:20', '09:40']);
  });

  it('returns no slots on disabled days and blocked dates', () => {
    setNow(MONDAY);
    const sunday = addDays('2026-11-16', 6);
    expect(generateSlots(doctor(), sunday)).toEqual([]);
    expect(generateSlots(doctor({ blockedDates: [{ date: '2026-11-17' }] }), '2026-11-17')).toEqual([]);
  });

  it('removes slots taken by pending or confirmed appointments only', () => {
    setNow(MONDAY);
    const appts = [
      { id: 'a', date: '2026-11-17', time: '09:00', status: 'pending', duration: 30 },
      { id: 'b', date: '2026-11-17', time: '09:30', status: 'confirmed', duration: 30 },
      { id: 'c', date: '2026-11-17', time: '10:00', status: 'cancelled', duration: 30 },
    ];
    const times = generateSlots(doctor(), '2026-11-17', appts).map((s) => s.time);
    expect(times).not.toContain('09:00');
    expect(times).not.toContain('09:30');
    expect(times).toContain('10:00');
    // ignoring an appointment frees its own slot (rescheduling)
    expect(generateSlots(doctor(), '2026-11-17', appts, { ignoreAppointmentId: 'a' }).map((s) => s.time)).toContain('09:00');
  });

  it('only offers today slots more than 15 minutes ahead', () => {
    setNow(new Date(2026, 10, 16, 10, 50));
    const times = generateSlots(doctor(), '2026-11-16').map((s) => s.time);
    expect(times).not.toContain('11:00');
    expect(times[0]).toBe('11:30');
  });

  it('never returns slots for past dates', () => {
    setNow(MONDAY);
    expect(generateSlots(doctor(), '2026-11-15')).toEqual([]);
  });

  it('labels morning and afternoon periods', () => {
    setNow(MONDAY);
    const slots = generateSlots(doctor(), '2026-11-17');
    expect(slots.find((s) => s.time === '09:00').period).toBe('morning');
    expect(slots.find((s) => s.time === '14:00').period).toBe('afternoon');
  });

  it('finds the next available slot within 21 days', () => {
    setNow(MONDAY);
    const onlyFriday = doctor({ schedule: { ...Object.fromEntries(Object.entries(defaultSchedule()).map(([k, v]) => [k, { ...v, enabled: k === 'fri' }])) } });
    expect(nextAvailable(onlyFriday)).toEqual({ date: '2026-11-20', time: '09:00' });
    const closed = doctor({ schedule: Object.fromEntries(Object.entries(defaultSchedule()).map(([k, v]) => [k, { ...v, enabled: false }])) });
    expect(nextAvailable(closed)).toBeNull();
  });

  it('builds a 14-day availability map', () => {
    setNow(MONDAY);
    const map = availabilityMap(doctor());
    expect(Object.keys(map)).toHaveLength(14);
    expect(map['2026-11-22']).toBe(0); // Sunday off
  });

  it('counts weekly capacity and validates schedules', () => {
    const s = defaultSchedule();
    // weekdays 09-17 minus 13-14 break = 14 slots x5, saturday 09-13 = 8
    expect(weeklySlotCount(s, 30)).toBe(78);
    const bad = { ...s, mon: { enabled: true, start: '12:00', end: '09:00', breaks: [] } };
    expect(validateSchedule(bad).mon).toMatch(/end time/);
    expect(validateSchedule(s)).toEqual({});
  });
});
