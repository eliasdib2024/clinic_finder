import { getLocale, tx } from '../../lib/i18n';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Inbox, CalendarCheck, Users, Video, CalendarClock, ShieldCheck, ArrowRight, Sun } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, ErrorState, SkeletonRows, StatusBadge, AnimatedNumber, VerificationBadge, Skeleton } from '../../components/ui';
import { useAppointmentActions } from '../../components/shared/useAppointmentActions';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useDocumentTitle } from '../../hooks';
import { listMyAppointments } from '../../services/appointmentService';
import { getMyDoctorProfile, getMyPatients } from '../../services/doctorService';
import { greeting, todayISO, formatTime, formatDate, relativeDay, timeToMinutes, now, addDays, parseISODate } from '../../lib/dates';
import { weeklySlotCount } from '../../lib/schedule';

function Timeline({ items, actions }) {
  const nowMin = now().getHours() * 60 + now().getMinutes();
  const rows = [];
  let placed = false;
  items.forEach((a) => {
    const start = timeToMinutes(a.time);
    if (!placed && start > nowMin) { rows.push({ now: true }); placed = true; }
    rows.push(a);
  });
  if (!placed && items.length) rows.push({ now: true });
  return (
    <div className="timeline">
      {rows.map((a, i) => a.now ? (
        <div key="now" className="now-line" aria-label={tx('Current time')}><span>{formatTime(`${String(now().getHours()).padStart(2, '0')}:${String(now().getMinutes()).padStart(2, '0')}`)}</span><i /></div>
      ) : (
        <div key={a.id} className="tl-item">
          <div className="tl-time">{formatTime(a.time)}</div>
          <div className="tl-rail"><span className={`tl-node ${timeToMinutes(a.time) + a.duration < nowMin ? 'past' : timeToMinutes(a.time) <= nowMin ? 'now' : ''}`} /></div>
          <div className="tl-card">
            <Avatar name={a.patient.name} size={38} />
            <div className="grow" style={{ minWidth: 160 }}>
              <div className="row wrap" style={{ '--gap': '8px' }}><strong>{a.patient.name}</strong><StatusBadge status={a.status} />{a.type === 'video' && <Badge tone="blue" icon={Video}>{tx('Video')}</Badge>}</div>
              <div className="small muted">{tx(a.reason)}{a.patient.allergies?.length ? <> · <span style={{ color: 'var(--rose)' }}>{tx('Allergic to {0}', { 0: a.patient.allergies.map((x) => tx(x)).join(', ') })}</span></> : null}</div>
            </div>
            <div className="row wrap" style={{ '--gap': '6px' }}>{actions(a, { compact: true })}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DoctorOverview() {
  useDocumentTitle(tx('Overview'));
  const { user } = useAuth();
  const today = todayISO();
  const all = useAsync(() => listMyAppointments({ scope: 'all' }), []);
  const profile = useAsync(() => getMyDoctorProfile(), []);
  const patients = useAsync(() => getMyPatients(), []);
  const { buttons, dialogs } = useAppointmentActions(() => all.reload());

  const list = all.data || [];
  const todays = list.filter((a) => a.date === today && ['pending', 'confirmed', 'completed', 'no-show'].includes(a.status)).sort((a, b) => a.time.localeCompare(b.time));
  const pending = list.filter((a) => a.status === 'pending' && a.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const confirmed = list.filter((a) => a.status === 'confirmed' && a.date >= today);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    const day = list.filter((a) => a.date === date && ['pending', 'confirmed'].includes(a.status));
    return { date, confirmed: day.filter((a) => a.status === 'confirmed').length, pending: day.filter((a) => a.status === 'pending').length };
  }), [list, today]);
  const d = profile.data;
  const lastName = user.name.replace(/^Dr\.\s*/, '').split(' ').slice(-1)[0];

  return (
    <div className="stack" style={{ '--gap': '24px' }}>
      <div className="row between wrap" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 className="hello">{tx('{0}, Dr. {1}.', { 0: greeting(), 1: lastName })}</h1>
          <p className="muted" style={{ marginTop: 6 }}>{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })} · {tx('{0} visits still on today’s list', { 0: todays.filter((a) => ['pending', 'confirmed'].includes(a.status)).length })}</p>
        </div>
        <div className="row wrap" style={{ '--gap': '8px' }}>
          <Button to="/doctor/schedule" variant="secondary" icon={CalendarClock}>{tx('Edit availability')}</Button>
          <Button to="/doctor/appointments" icon={CalendarDays}>{tx('All appointments')}</Button>
        </div>
      </div>

      <div className="grid grid-4" style={{ '--gap': '14px' }}>
        {[
          ['Today’s appointments', todays.length, CalendarDays, 'tone-teal'],
          ['Pending requests', pending.length, Inbox, 'tone-amber'],
          ['Confirmed upcoming', confirmed.length, CalendarCheck, 'tone-blue'],
          ['Patients', patients.data?.length || 0, Users, 'tone-emerald'],
        ].map(([label, value, Icon, tone]) => (
          <div key={label} className="panel kpi">
            <div className="kpi-top"><span className={`kpi-ic ${tone}`}><Icon aria-hidden /></span></div>
            <div><div className="kpi-value">{all.loading ? <Skeleton w={50} h={30} /> : <AnimatedNumber value={value} />}</div><div className="kpi-label">{tx(label)}</div></div>
          </div>
        ))}
      </div>

      <div className="split">
        <section className="panel" aria-labelledby="tl-h">
          <div className="panel-head"><h2 id="tl-h">{tx('Today’s timeline')}</h2><span className="small muted"><bdi>{d?.location?.name}</bdi></span></div>
          <div className="panel-body">
            {all.error ? <ErrorState error={all.error} onRetry={all.reload} /> : all.loading ? <SkeletonRows rows={4} /> : todays.length === 0 ? (
              <EmptyState icon={Sun} title={tx('No visits today')}>{tx('Enjoy the quiet — new bookings will appear here as they come in.')}</EmptyState>
            ) : <Timeline items={todays} actions={buttons} />}
          </div>
        </section>

        <div className="stack" style={{ '--gap': '20px' }}>
          <section className="panel" aria-labelledby="pq-h">
            <div className="panel-head"><h2 id="pq-h">{tx('Booking requests')}</h2>{pending.length > 0 && <Badge tone="amber">{tx('{0} waiting', { 0: pending.length })}</Badge>}</div>
            <div className="panel-body">
              {all.loading ? <SkeletonRows rows={3} /> : pending.length === 0 ? <p className="small muted">{tx('No requests waiting.')}{' '}{d?.autoConfirm ? tx('Auto-confirm is on, so new bookings are confirmed instantly.') : ''}</p> : pending.slice(0, 5).map((a) => (
                <div key={a.id} className="list-row" style={{ flexWrap: 'wrap' }}>
                  <Avatar name={a.patient.name} size={38} />
                  <div className="grow" style={{ minWidth: 140 }}><div className="strong small">{a.patient.name}</div><div className="tiny muted">{tx('{0}, {1}', { 0: relativeDay(a.date), 1: formatTime(a.time) })} · {a.type === 'video' ? tx('Video') : tx('In person')}</div><div className="tiny muted">{tx(a.reason)}</div></div>
                  <div className="row" style={{ '--gap': '6px' }}>{buttons(a)}</div>
                </div>
              ))}
              {pending.length > 5 && <Link to="/doctor/appointments?tab=pending" className="small strong">{tx('See all {0} requests', { 0: pending.length })}</Link>}
            </div>
          </section>

          <section className="panel" aria-labelledby="wk-h">
            <div className="panel-head"><h2 id="wk-h">{tx('Next 7 days')}</h2><div className="legend"><span><i style={{ background: 'var(--teal-400)' }} />{tx('Confirmed')}</span><span><i style={{ background: '#e0a43a' }} />{tx('Pending')}</span></div></div>
            <div className="panel-body">
              <div className="week-cal">
                {week.map((w) => (
                  <Link key={w.date} to={`/doctor/appointments?date=${w.date}`} className={`wk ${w.date === today ? 'is-today' : ''}`} aria-label={tx('{0}: {1} confirmed, {2} pending', {
                    0: formatDate(w.date),
                    1: w.confirmed,
                    2: w.pending
                  })}>
                    {parseISODate(w.date).toLocaleDateString(getLocale(), { weekday: 'short' })}
                    <strong>{parseISODate(w.date).getDate()}</strong>
                    <span className="bars">{Array.from({ length: Math.min(w.confirmed, 4) }, (_, i) => <i key={`c${i}`} />)}{Array.from({ length: Math.min(w.pending, 3) }, (_, i) => <i key={`p${i}`} className="p" />)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="panel panel-pad stack" style={{ '--gap': '12px' }} aria-label={tx('Profile status')}>
            <div className="row between"><strong>{tx('Profile status')}</strong>{d && <VerificationBadge status={d.verification.status} />}</div>
            {d && <>
              <div className="small muted">{tx(d.autoConfirm ? '{0} bookable slots per week · {1}-minute visits · auto-confirm on' : '{0} bookable slots per week · {1}-minute visits · auto-confirm off', { 0: weeklySlotCount(d.schedule, d.slotLength), 1: d.slotLength })}</div>
              <div className="row wrap" style={{ '--gap': '8px' }}>
                <Button to="/doctor/profile" variant="secondary" size="sm" icon={ShieldCheck}>{tx('Practice profile')}</Button>
                {d.verification.status === 'approved' && <Button to={`/doctors/${d.id}`} target="_blank" variant="ghost" size="sm" iconEnd={ArrowRight}>{tx('View public page')}</Button>}
              </div>
            </>}
            {!d && <Skeleton h={40} />}
          </section>
        </div>
      </div>
      {dialogs}
    </div>
  );
}
