import { getLocale, tx } from '../../lib/i18n';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sun, Sunset, CalendarX2 } from 'lucide-react';
import { getAvailability, getSlots } from '../../services/doctorService';
import { nextDays, parseISODate, formatTime, formatDate } from '../../lib/dates';
import { BOOKING_WINDOW_DAYS } from '../../lib/schedule';
import { Skeleton, EmptyState } from '../ui';

/**
 * 14-day date strip + morning/afternoon slots, from live availability.
 * value: { date, time } · onChange(value) · ignoreAppointmentId when rescheduling
 */
export function SlotPicker({ doctorId, value, onChange, ignoreAppointmentId, refreshKey }) {
  const days = useMemo(() => nextDays(BOOKING_WINDOW_DAYS), []);
  const [avail, setAvail] = useState(null);
  const [slots, setSlots] = useState(null);
  const date = value?.date;
  // Always read the latest value inside async callbacks (avoids overwriting a newer choice).
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    let live = true;
    setAvail(null);
    getAvailability(doctorId, BOOKING_WINDOW_DAYS, { ignoreAppointmentId }).then((m) => {
      if (!live) return;
      setAvail(m);
      const cur = valueRef.current?.date;
      if (!cur || !m[cur]) { const first = days.find((d) => m[d] > 0); if (first) onChange({ date: first, time: null }); }
    }).catch(() => live && setAvail({}));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, ignoreAppointmentId, refreshKey]);

  useEffect(() => {
    if (!date) { setSlots([]); return undefined; }
    let live = true;
    setSlots(null);
    getSlots(doctorId, date, { ignoreAppointmentId }).then((s) => {
      if (!live) return;
      setSlots(s);
      const cur = valueRef.current;
      if (cur?.date === date && cur?.time && !s.some((x) => x.time === cur.time)) onChange({ date, time: null });
    }).catch(() => live && setSlots([]));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, date, ignoreAppointmentId, refreshKey]);

  const noneAtAll = avail && Object.values(avail).every((n) => n === 0);
  const morning = slots?.filter((s) => s.period === 'morning') || [];
  const afternoon = slots?.filter((s) => s.period === 'afternoon') || [];

  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      <div className="date-strip" role="group" aria-label={tx('Choose a date')}>
        {days.map((d) => {
          const dt = parseISODate(d);
          const count = avail?.[d];
          return (
            <button key={d} type="button" className="date-pill" aria-pressed={date === d} disabled={!avail || !count}
              onClick={() => onChange({ date: d, time: null })} aria-label={tx('{0}, {1} free slots', {
              0: formatDate(d),
              1: count || 'no'
            })}>
              <span className="dw">{dt.toLocaleDateString(getLocale(), { weekday: 'short' })}</span>
              <span className="dn">{dt.getDate()}</span>
              <span className="dc">{!avail ? '·' : count ? tx('{0} free', {
                0: count
              }) : tx('Full')}</span>
            </button>
          );
        })}
      </div>

      {noneAtAll ? (
        <EmptyState icon={CalendarX2} title={tx('No open slots in the next 14 days')}>{tx(
          'This doctor’s calendar is full. Try another doctor in the same specialty.'
        )}</EmptyState>
      ) : slots === null ? (
        <div className="slots">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} h={40} r={11} />)}</div>
      ) : (
        <div key={date} className="stack enter-fade" style={{ '--gap': '16px' }}>
            {[['Morning', Sun, morning], ['Afternoon', Sunset, afternoon]].map(([label, Icon, list]) => list.length > 0 && (
              <div key={label} className="slot-group">
                <h5><Icon aria-hidden />{tx(label)} · {tx(list.length === 1 ? '{0} slot' : '{0} slots', { 0: list.length })}</h5>
                <div className="slots" role="group" aria-label={tx('{0} slots', {
                  0: label
                })}>
                  {list.map((s) => (
                    <button key={s.time} type="button" className="slot" aria-pressed={value?.time === s.time} onClick={() => onChange({ date, time: s.time })}>{formatTime(s.time)}</button>
                  ))}
                </div>
              </div>
            ))}
            {slots.length === 0 && date && <p className="muted small">{tx('No free slots on this day — pick another date.')}</p>}
        </div>
      )}
    </div>
  );
}
