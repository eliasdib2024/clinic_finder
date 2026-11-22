import { tx } from '../../lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Copy, CalendarOff, Coffee, Save, Undo2, AlertTriangle } from 'lucide-react';
import { Button, ConfirmDialog, Field, Input, Select, Switch, Skeleton, ErrorState, Badge } from '../../components/ui';
import { useAsync, useDocumentTitle, useUnsavedGuard } from '../../hooks';
import { getMyDoctorProfile, updateMySchedule } from '../../services/doctorService';
import { useToast } from '../../context/ToastContext';
import { WEEKDAYS, SLOT_LENGTHS } from '../../lib/constants';
import { daySlots, weeklySlotCount, validateSchedule } from '../../lib/schedule';
import { timeToMinutes, todayISO, formatDate } from '../../lib/dates';

const RANGE = [6 * 60, 22 * 60];
const pct = (t) => `${((timeToMinutes(t) - RANGE[0]) / (RANGE[1] - RANGE[0])) * 100}%`;
const width = (a, b) => `${((timeToMinutes(b) - timeToMinutes(a)) / (RANGE[1] - RANGE[0])) * 100}%`;
const clone = (x) => JSON.parse(JSON.stringify(x));

export default function DoctorSchedule() {
  useDocumentTitle(tx('Availability'));
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => getMyDoctorProfile(), []);
  const [form, setForm] = useState(null);
  const [initial, setInitial] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [newBlock, setNewBlock] = useState({ date: '', note: '' });
  const [copyFrom, setCopyFrom] = useState('mon');

  useEffect(() => {
    if (data) {
      const f = { schedule: clone(data.schedule), slotLength: data.slotLength, autoConfirm: data.autoConfirm, blockedDates: clone(data.blockedDates || []) };
      setForm(f); setInitial(JSON.stringify(f));
    }
  }, [data]);

  const dirty = form && JSON.stringify(form) !== initial;
  const guard = useUnsavedGuard(dirty && !busy, navigate);
  const total = useMemo(() => (form ? weeklySlotCount(form.schedule, form.slotLength) : 0), [form]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !form) return <div className="stack"><Skeleton h={40} w={300} /><Skeleton h={420} r={22} /></div>;

  const setDay = (key, patch) => { setForm((f) => ({ ...f, schedule: { ...f.schedule, [key]: { ...f.schedule[key], ...patch } } })); setErrors((e) => ({ ...e, [key]: '' })); };
  const setBreak = (key, i, patch) => setDay(key, { breaks: form.schedule[key].breaks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const copyToWeekdays = () => {
    const src = form.schedule[copyFrom];
    const next = { ...form.schedule };
    for (const k of ['mon', 'tue', 'wed', 'thu', 'fri']) next[k] = clone(src);
    setForm((f) => ({ ...f, schedule: next }));
    toast.info(tx('Copied {0} to Monday–Friday', {
      0: WEEKDAYS.find((d) => d.key === copyFrom).label
    }), { body: tx('Review and save when ready.') });
  };
  const addBlock = () => {
    if (!newBlock.date) return;
    if (newBlock.date < todayISO()) { toast.error(tx('Pick a future date')); return; }
    if (form.blockedDates.some((b) => b.date === newBlock.date)) { toast.info(tx('That date is already blocked')); return; }
    setForm((f) => ({ ...f, blockedDates: [...f.blockedDates, { date: newBlock.date, note: newBlock.note.trim() }].sort((a, b) => a.date.localeCompare(b.date)) }));
    setNewBlock({ date: '', note: '' });
  };
  const save = async () => {
    const errs = validateSchedule(form.schedule);
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error(tx('Check your hours'), { body: Object.values(errs)[0] }); return; }
    setBusy(true);
    try {
      const { doctor, clashes } = await updateMySchedule(form);
      const f = { schedule: clone(doctor.schedule), slotLength: doctor.slotLength, autoConfirm: doctor.autoConfirm, blockedDates: clone(doctor.blockedDates) };
      setForm(f); setInitial(JSON.stringify(f));
      toast.success(tx('Availability saved'), { body: tx('Patients now see {0} weekly slots.', {
        0: weeklySlotCount(f.schedule, f.slotLength)
      }) });
      if (clashes) toast.warning(tx(clashes === 1 ? '1 booking falls on a blocked date' : '{0} bookings fall on a blocked date', { 0: clashes }), { body: tx('Existing bookings were kept — review them in Appointments.') });
    } catch (e) { toast.error(tx('Not saved'), { body: e.message }); } finally { setBusy(false); }
  };

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>{tx('Availability')}</h1><p>{tx(
          'Patients can only book slots inside these hours. Existing bookings are never removed by changes here.'
        )}</p></div>
      </div>
      <div className="split">
        <section className="panel panel-flush" aria-labelledby="wk-h">
          <div className="row between wrap" style={{ padding: '18px 20px', borderBottom: '1px solid var(--mist)' }}>
            <h2 id="wk-h" style={{ fontSize: 16 }}>{tx('Weekly hours')}</h2>
            <div className="row" style={{ '--gap': '8px' }}>
              <Select aria-label={tx('Day to copy')} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} options={WEEKDAYS.map((d) => ({ value: d.key, label: d.label }))} style={{ width: 140, height: 34 }} />
              <Button size="sm" variant="secondary" icon={Copy} onClick={copyToWeekdays}>{tx('Copy to weekdays')}</Button>
            </div>
          </div>
          {WEEKDAYS.map(({ key, label }) => {
            const d = form.schedule[key];
            const n = daySlots(d, form.slotLength).length;
            return (
              <div key={key} className={`day-row ${d.enabled ? '' : 'off'}`}>
                <div>
                  <Switch label={label} description={d.enabled ? tx('{0} slots', {
                    0: n
                  }) : tx('Day off')} checked={d.enabled} onChange={(c) => setDay(key, { enabled: c })} />
                </div>
                <div className="stack" style={{ '--gap': '10px' }}>
                  {d.enabled ? (
                    <>
                      <div className="times">
                        <input type="time" className="time-input" value={d.start} step={300} onChange={(e) => setDay(key, { start: e.target.value })} aria-label={tx('{0} start time', {
                          0: label
                        })} />
                        <span className="muted">{tx('to')}</span>
                        <input type="time" className="time-input" value={d.end} step={300} onChange={(e) => setDay(key, { end: e.target.value })} aria-label={tx('{0} end time', {
                          0: label
                        })} />
                      </div>
                      {d.breaks.map((b, i) => (
                        <div key={i} className="break-row">
                          <Coffee size={15} aria-hidden />{tx('Break')}<input type="time" className="time-input" value={b.start} step={300} onChange={(e) => setBreak(key, i, { start: e.target.value })} aria-label={tx('{0} break {1} start', {
                            0: label,
                            1: i + 1
                          })} />
                          –
                          <input type="time" className="time-input" value={b.end} step={300} onChange={(e) => setBreak(key, i, { end: e.target.value })} aria-label={tx('{0} break {1} end', {
                            0: label,
                            1: i + 1
                          })} />
                          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setDay(key, { breaks: d.breaks.filter((_, j) => j !== i) })} aria-label={tx('Remove {0} break {1}', {
                            0: label,
                            1: i + 1
                          })}><Trash2 size={16} /></button>
                        </div>
                      ))}
                      <div className="day-bar" aria-hidden>
                        {timeToMinutes(d.end) > timeToMinutes(d.start) && <i style={{ insetInlineStart: pct(d.start), width: width(d.start, d.end) }} />}
                        {d.breaks.map((b, i) => timeToMinutes(b.end) > timeToMinutes(b.start) && <i key={i} className="brk" style={{ insetInlineStart: pct(b.start), width: width(b.start, b.end) }} />)}
                      </div>
                      {errors[key] && <p className="field-error" role="alert"><AlertTriangle size={14} />{errors[key]}</p>}
                    </>
                  ) : <span className="small muted">{tx('Day off — no appointments.')}</span>}
                </div>
                <div>{d.enabled && d.breaks.length < 3 && <Button size="sm" variant="ghost" icon={Plus} onClick={() => setDay(key, { breaks: [...d.breaks, { start: '13:00', end: '14:00' }] })}>{tx('Break')}</Button>}</div>
              </div>
            );
          })}
        </section>

        <div className="stack" style={{ '--gap': '20px' }}>
          <section className="panel panel-pad stack" aria-live="polite">
            <div className="small muted">{tx('Bookable slots per week')}</div>
            <div className="slot-counter">{total}</div>
            <div className="small muted">{tx('{0} working days · {1}-minute visits', { 0: WEEKDAYS.filter((d) => form.schedule[d.key].enabled).length, 1: form.slotLength })}</div>
          </section>
          <section className="panel panel-pad stack">
            <h2 style={{ fontSize: 16 }}>{tx('Booking rules')}</h2>
            <Field label={tx('Appointment length')}><Select value={form.slotLength} onChange={(e) => setForm((f) => ({ ...f, slotLength: Number(e.target.value) }))} options={SLOT_LENGTHS.map((n) => ({ value: n, label: tx('{0} minutes', { 0: n }) }))} /></Field>
            <Switch label={tx('Auto-confirm bookings')} description={tx('New and rescheduled bookings are confirmed instantly.')} checked={form.autoConfirm} onChange={(c) => setForm((f) => ({ ...f, autoConfirm: c }))} />
          </section>
          <section className="panel panel-pad stack" aria-labelledby="blk-h">
            <h2 id="blk-h" style={{ fontSize: 16 }} className="row"><CalendarOff size={17} aria-hidden style={{ marginInlineEnd: 8 }} />{tx('Blocked dates')}</h2>
            <p className="small muted">{tx(
              'Holidays, conferences or personal days. No new bookings are offered on these dates.'
            )}</p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', '--gap': '8px' }}>
              <Input type="date" min={todayISO()} value={newBlock.date} onChange={(e) => setNewBlock((b) => ({ ...b, date: e.target.value }))} aria-label={tx('Date to block')} />
              <Input value={newBlock.note} onChange={(e) => setNewBlock((b) => ({ ...b, note: e.target.value }))} placeholder={tx('Note (optional)')} aria-label={tx('Note')} maxLength={60} />
            </div>
            <Button variant="secondary" icon={Plus} onClick={addBlock} disabled={!newBlock.date}>{tx('Block date')}</Button>
            {form.blockedDates.length === 0 ? <p className="tiny muted">{tx('No blocked dates.')}</p> : form.blockedDates.map((b) => (
              <div key={b.date} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--mist)' }}>
                <div><div className="small strong">{formatDate(b.date)}</div>{b.note && <div className="tiny muted">{tx(b.note)}</div>}</div>
                <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setForm((f) => ({ ...f, blockedDates: f.blockedDates.filter((x) => x.date !== b.date) }))} aria-label={tx('Unblock {0}', {
                  0: formatDate(b.date)
                })}><Trash2 size={16} /></button>
              </div>
            ))}
          </section>
        </div>
      </div>

      {dirty && (
        <div className="unsaved-bar" role="status">
          <span className="row" style={{ '--gap': '10px' }}><Badge tone="amber">{tx('Unsaved')}</Badge>{tx('You have unsaved changes to your availability.')}</span>
          <div className="row" style={{ '--gap': '8px' }}>
            <Button variant="secondary" size="sm" icon={Undo2} onClick={() => { setForm(JSON.parse(initial)); setErrors({}); }} disabled={busy}>{tx('Discard')}</Button>
            <Button size="sm" icon={Save} onClick={save} loading={busy}>{tx('Save changes')}</Button>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!guard.pending} onClose={guard.cancel} onConfirm={async () => guard.confirm()} title={tx('Leave without saving?')} confirmLabel={tx('Leave page')}
        description={tx('Your changes to availability will be lost.')} />
    </div>
  );
}
